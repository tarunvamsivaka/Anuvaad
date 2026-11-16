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
from openai import AsyncOpenAI

from app.core.config import LLM_TIMEOUT, logger, metrics
from app.core.quota import check_and_track_groq_limits
from app.services.ai.caching import (
    _clean_json_response,
    find_stale_translation,
)
from app.services.ai.clients import (
    _get_cerebras_client,
    _get_deepseek_client,
    _get_gemini_client,
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
    user_llm_key: str | None = None,
) -> tuple[str, str]:
    """Router for multi-tier LLM models.

    Iterates through candidate providers (BYOK -> Cerebras -> Gemini -> DeepSeek -> Groq -> OpenRouter)
    until a successful completion is returned, providing resilient fault-tolerance.
    """
    candidates: list[dict] = []

    # 1. BYOK Key if supplied
    if user_llm_key and user_llm_key.strip():
        k = user_llm_key.strip()
        if k.startswith("gsk_"):
            candidates.append({
                "client": AsyncOpenAI(api_key=k, base_url="https://api.groq.com/openai/v1"),
                "model": "llama-3.3-70b-versatile",
                "name": "BYOK Groq Llama 3.3",
            })
            candidates.append({
                "client": AsyncOpenAI(api_key=k, base_url="https://api.groq.com/openai/v1"),
                "model": "llama-3.1-8b-instant",
                "name": "BYOK Groq Llama 3.1 8B",
            })
        elif k.startswith("sk-") and not k.startswith("AIzaSy"):
            candidates.append({
                "client": AsyncOpenAI(api_key=k, base_url="https://api.openai.com/v1"),
                "model": "gpt-4o-mini",
                "name": "BYOK OpenAI",
            })
        else:
            candidates.append({
                "client": AsyncOpenAI(api_key=k, base_url="https://generativelanguage.googleapis.com/v1beta/openai/"),
                "model": "gemini-2.0-flash",
                "name": "BYOK Gemini 2.0 Flash",
            })
            candidates.append({
                "client": AsyncOpenAI(api_key=k, base_url="https://generativelanguage.googleapis.com/v1beta/openai/"),
                "model": "gemini-1.5-flash",
                "name": "BYOK Gemini 1.5 Flash",
            })

    # 2. Groq Primary & Fallback (Standard Free Tier)
    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key or not candidates:
        await _gw("check_and_track_groq_limits", check_and_track_groq_limits)(prompt, expected_output_tokens=max_tokens)
        groq_client = _gw("_get_groq_client", _get_groq_client)()
        if use_r1:
            candidates.append({
                "client": groq_client,
                "model": "deepseek-r1-distill-llama-70b",
                "name": "Groq DeepSeek R1",
            })
            candidates.append({
                "client": groq_client,
                "model": "llama-3.3-70b-versatile",
                "name": "Groq Llama 3.3 (fallback)",
            })
        else:
            candidates.append({
                "client": groq_client,
                "model": "llama-3.3-70b-versatile",
                "name": "Groq Llama 3.3",
            })
            candidates.append({
                "client": groq_client,
                "model": "llama-3.1-8b-instant",
                "name": "Groq Llama 3.1 8B (fallback)",
            })

    # 3. Gemini Fallback
    gemini_client = _gw("_get_gemini_client", _get_gemini_client)()
    if gemini_client:
        candidates.append({
            "client": gemini_client,
            "model": "gemini-2.0-flash",
            "name": "Google Gemini 2.0 Flash",
        })
        candidates.append({
            "client": gemini_client,
            "model": "gemini-1.5-flash",
            "name": "Google Gemini 1.5 Flash",
        })

    # 4. Cerebras Fallback
    cerebras_client = _gw("_get_cerebras_client", _get_cerebras_client)()
    if cerebras_client:
        candidates.append({
            "client": cerebras_client,
            "model": "llama3.3-70b",
            "name": "Cerebras Llama 3.3 70B",
        })

    # 5. DeepSeek Fallback
    deepseek_client = _gw("_get_deepseek_client", _get_deepseek_client)()
    if deepseek_client:
        candidates.append({
            "client": deepseek_client,
            "model": "deepseek-reasoner" if use_r1 else "deepseek-chat",
            "name": "DeepSeek API",
        })

    # 6. OpenRouter Fallback
    openrouter_client = _gw("_get_openrouter_client", _get_openrouter_client)()
    if openrouter_client:
        candidates.append({
            "client": openrouter_client,
            "model": "meta-llama/llama-3.3-70b-instruct",
            "name": "OpenRouter",
        })

    if not candidates:
        raise HTTPException(status_code=500, detail="No LLM providers configured.")

    # Sprint 1 wiring: inject AST symbol contract into system prompt for supported source languages
    augmented_system = await _inject_symbol_contract(system_instruction, prompt, source_language)

    messages = [
        {"role": "system", "content": augmented_system},
        {"role": "user", "content": prompt},
    ]

    kwargs = {"max_tokens": max_tokens}
    if response_format == "json_object" and not use_r1:
        kwargs["response_format"] = {"type": "json_object"}

    metrics_obj = _gw("metrics", metrics)

    for cand in candidates:
        try:
            with (
                sentry_sdk.start_span(
                    op="llm.completion",
                    name=f"LLM: {cand['name']}",
                )
                if _SENTRY_AVAILABLE
                else _nullctx()
            ) as span:
                if _SENTRY_AVAILABLE and span:
                    span.set_tag("llm.provider", cand["name"])
                    span.set_tag("llm.model", cand["model"])
                    span.set_tag("llm.mode", mode)
                response = await asyncio.wait_for(
                    cand["client"].chat.completions.create(model=cand["model"], messages=messages, **kwargs),
                    timeout=LLM_TIMEOUT,
                )
            await metrics_obj.record_model_call(cand["model"])
            return _clean_json_response(response.choices[0].message.content), cand["name"]
        except TimeoutError:
            await metrics_obj.record_model_call(cand["model"], is_error=True)
            logger.error("LLM API Timeout after %ss on %s", LLM_TIMEOUT, cand["name"])
        except Exception as cand_e:
            await metrics_obj.record_model_call(cand["model"], is_error=True)
            logger.warning("Provider %s failed (%s)", cand["name"], type(cand_e).__name__)

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
