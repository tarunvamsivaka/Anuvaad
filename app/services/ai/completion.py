"""
app/services/ai/completion.py — Non-streaming completion routines and symbol contracts.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from contextlib import contextmanager
from typing import Any

from fastapi import HTTPException

from app.core.config import LLM_TIMEOUT, logger, metrics
from app.core.quota import check_and_track_groq_limits
from app.services.ai.caching import (
    _clean_json_response,
    find_stale_translation,
)
from app.services.ai.clients import (
    _get_groq_client,
    _get_openrouter_client,
)
from app.services.ai.prompts import (
    SYSTEM_INSTRUCTION,
)

try:
    import sentry_sdk

    _SENTRY_AVAILABLE = True
except ImportError:
    _SENTRY_AVAILABLE = False


@contextmanager
def _nullctx():
    yield None


def _gw(name: str, fallback: Any) -> Any:
    mod = sys.modules.get("app.services.ai")
    if mod and hasattr(mod, name):
        return getattr(mod, name)
    return fallback


async def _inject_symbol_contract(system_instruction: str, code: str, language: str) -> str:
    """
    Sprint 1 wiring: parse code with AST parser to extract function/class symbols.
    Appends an AST Symbol Preservation contract to the system prompt.
    Fails safely — if parsing raises or yields no symbols, returns instruction unchanged.
    """
    if not language or language.lower() not in ("python", "go", "typescript", "javascript"):
        return system_instruction

    try:
        from app.services.ast_parser import analyze, is_language_supported

        if not await asyncio.to_thread(is_language_supported, language):
            return system_instruction

        summary = await asyncio.to_thread(analyze, code, language)
        if not summary or (not summary.functions and not summary.classes):
            return system_instruction

        fn_names = [f.name for f in summary.functions]
        cls_names = [c.name for c in summary.classes]

        lines = [
            "\n\n[AST SYMBOL CONTRACT — STRICT PRESERVATION REQUIRED]",
            "The source code defines the following symbols that MUST be preserved:",
        ]
        if fn_names:
            lines.append(f"- Functions/methods: {', '.join(fn_names)}")
        if cls_names:
            lines.append(f"- Classes/interfaces: {', '.join(cls_names)}")
        lines.append(
            "In your translation, you must accurately account for every symbol above. "
            "Do NOT rename, omit, or hallucinate symbols not present in the source."
        )

        return system_instruction + "\n".join(lines)
    except Exception as e:
        logger.warning(f"AST symbol injection skipped: {e}")
        return system_instruction


async def get_completion(
    prompt: str,
    system_instruction: str = SYSTEM_INSTRUCTION,
    mode: str = "code-to-english",
    use_r1: bool = False,
    response_format: str | None = None,
    max_tokens: int = 1500,
    source_language: str = "",
    explanation_depth: str = "dev",
    ephemeral: bool = False,
) -> tuple[str, str]:
    """
    Router for Groq models.
    If use_r1=True, routes to deepseek-r1-distill-llama-70b via Groq.
    Otherwise uses llama-3.3-70b-versatile with llama-3.1-8b-instant fallback.

    source_language: if provided, the AST symbol contract for the source code
        will be injected into the system prompt to constrain the LLM output.
        Supported: python, go, typescript, javascript. Others silently skipped.
    """
    groq_api_key = os.getenv("GROQ_API_KEY")

    if not groq_api_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    await _gw("check_and_track_groq_limits", check_and_track_groq_limits)(prompt, expected_output_tokens=max_tokens)

    groq_client = _gw("_get_groq_client", _get_groq_client)()

    if use_r1:
        primary = {
            "client": groq_client,
            "model": "deepseek-r1-distill-llama-70b",
            "name": "Groq DeepSeek R1",
        }
        fallback = {
            "client": groq_client,
            "model": "llama-3.3-70b-versatile",
            "name": "Groq Llama 3.3 (fallback)",
        }
    else:
        primary = {
            "client": groq_client,
            "model": "llama-3.3-70b-versatile",
            "name": "Groq Llama 3.3",
        }
        fallback = {
            "client": groq_client,
            "model": "llama-3.1-8b-instant",
            "name": "Groq Llama 3.1 8B (fallback)",
        }

    # Sprint 1 wiring: inject AST symbol contract into system prompt for
    # supported source languages.
    augmented_system = await _inject_symbol_contract(system_instruction, prompt, source_language)

    messages = [
        {"role": "system", "content": augmented_system},
        {"role": "user", "content": prompt},
    ]

    kwargs = {"max_tokens": max_tokens}
    if response_format == "json_object" and not use_r1:
        kwargs["response_format"] = {"type": "json_object"}

    metrics_obj = _gw("metrics", metrics)

    try:
        with (
            sentry_sdk.start_span(
                op="llm.completion",
                name=f"LLM: {primary['name']}",
            )
            if _SENTRY_AVAILABLE
            else _nullctx()
        ) as span:
            if _SENTRY_AVAILABLE and span:
                span.set_tag("llm.provider", primary["name"])
                span.set_tag("llm.model", primary["model"])
                span.set_tag("llm.mode", mode)
            response = await asyncio.wait_for(
                primary["client"].chat.completions.create(model=primary["model"], messages=messages, **kwargs),
                timeout=LLM_TIMEOUT,
            )
        await metrics_obj.record_model_call(primary["model"])
        return _clean_json_response(response.choices[0].message.content), primary["name"]
    except TimeoutError:
        await metrics_obj.record_model_call(primary["model"], is_error=True)
        logger.error(f"LLM API Timeout after {LLM_TIMEOUT}s on primary {primary['name']}")
    except Exception as primary_e:
        await metrics_obj.record_model_call(primary["model"], is_error=True)
        logger.error("Primary %s failed (%s)", primary["name"], type(primary_e).__name__)

    # Fallback to secondary model
    logger.info("Falling back to %s", fallback["name"])
    fallback_kwargs = {"max_tokens": max_tokens}
    if response_format == "json_object":
        fallback_kwargs["response_format"] = {"type": "json_object"}

    try:
        with (
            sentry_sdk.start_span(
                op="llm.completion",
                name=f"LLM: {fallback['name']}",
            )
            if _SENTRY_AVAILABLE
            else _nullctx()
        ) as span:
            if _SENTRY_AVAILABLE and span:
                span.set_tag("llm.provider", fallback["name"])
                span.set_tag("llm.model", fallback["model"])
                span.set_tag("llm.mode", mode)
                span.set_tag("llm.is_fallback", True)
            response = await asyncio.wait_for(
                fallback["client"].chat.completions.create(
                    model=fallback["model"], messages=messages, **fallback_kwargs
                ),
                timeout=LLM_TIMEOUT,
            )
        await metrics_obj.record_model_call(fallback["model"])
        return _clean_json_response(response.choices[0].message.content), fallback["name"]
    except TimeoutError:
        await metrics_obj.record_model_call(fallback["model"], is_error=True)
        logger.error(f"LLM API Timeout after {LLM_TIMEOUT}s on fallback {fallback['name']}")
    except Exception as fallback_e:
        await metrics_obj.record_model_call(fallback["model"], is_error=True)
        logger.error("Fallback %s failed (%s)", fallback["name"], type(fallback_e).__name__)

    # FIX-24 (P1-03): Third-level fallback — OpenRouter (external, different infra).
    openrouter_client = _gw("_get_openrouter_client", _get_openrouter_client)()
    if openrouter_client:
        or_model = "meta-llama/llama-3.3-70b-instruct"
        or_kwargs = {"max_tokens": max_tokens}
        if response_format == "json_object":
            or_kwargs["response_format"] = {"type": "json_object"}
        try:
            with (
                sentry_sdk.start_span(
                    op="llm.completion",
                    name="LLM third-level fallback: OpenRouter",
                )
                if _SENTRY_AVAILABLE
                else _nullctx()
            ) as span:
                if _SENTRY_AVAILABLE and span:
                    span.set_tag("llm.provider", "openrouter")
                    span.set_tag("llm.model", or_model)
                    span.set_tag("llm.mode", mode)
                    span.set_tag("llm.is_fallback", True)
                response = await asyncio.wait_for(
                    openrouter_client.chat.completions.create(model=or_model, messages=messages, **or_kwargs),
                    timeout=LLM_TIMEOUT,
                )
            await metrics_obj.record_model_call("openrouter-llama")
            logger.warning("OpenRouter third-level fallback succeeded")
            return _clean_json_response(response.choices[0].message.content), "OpenRouter Llama 3.3"
        except Exception as or_e:
            await metrics_obj.record_model_call("openrouter-llama", is_error=True)
            logger.error("OpenRouter fallback failed (%s)", type(or_e).__name__)

    if not ephemeral:
        find_stale_fn = _gw("find_stale_translation", find_stale_translation)
        stale_result = await find_stale_fn(None, prompt, "code", mode, mode)
        if stale_result:
            logger.info("get_completion fallback: returning stale recovery result")
            return json.dumps({"blocks": stale_result}), "stale_recovery"

    raise HTTPException(
        status_code=500,
        detail="Translation failed on all providers. Please try again.",
    )
