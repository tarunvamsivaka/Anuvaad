"""
app/services/ai/streaming.py — Streaming orchestration, provider fallback, and chunk smoothing.
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

from app.core.audit import compute_code_hash
from app.core.cache import cache, cache_key
from app.core.config import LLM_TIMEOUT, logger, metrics
from app.core.quota import check_and_track_groq_limits, record_successful_completion
from app.models.schemas import CodePayload, CodeToCodePayload
from app.services.ai.caching import (
    _clean_json_response,
    find_stale_translation,
    normalize_blocks,
)
from app.services.ai.clients import (
    _get_groq_client,
    _get_openrouter_client,
)
from app.services.ai.completion import _inject_symbol_contract
from app.services.ai.concurrency import (
    acquire_stream_slot_raw,
    release_stream_slot_raw,
)
from app.services.ai.history import _dispatch_history_task
from app.services.ai.prompts import (
    DEPTH_PREFIXES,
    SYSTEM_INSTRUCTION,
)

try:
    import sentry_sdk  # noqa: F401

    _SENTRY_AVAILABLE = True
except ImportError:
    _SENTRY_AVAILABLE = False


@contextmanager
def _nullctx():
    yield None


def _gw(name: str, fallback: Any) -> Any:
    """Resolve attributes via app.services.ai facade so monkeypatches apply cleanly."""
    mod = sys.modules.get("app.services.ai")
    if mod and hasattr(mod, name):
        return getattr(mod, name)
    return fallback


async def _cached_translation_is_valid(blocks: Any, target_language: str) -> bool:
    """Revalidate code before returning a cached translation to a user."""
    if not isinstance(blocks, list):
        return False
    snippets = [block.get("code_snippet", "") for block in blocks if isinstance(block, dict)]
    if any(not isinstance(snippet, str) for snippet in snippets):
        return False
    code = "\n".join(snippets)
    if not code.strip():
        return False
    try:
        from app.services.ast_parser import is_language_supported, verify_translation

        if not await asyncio.to_thread(is_language_supported, target_language):
            return False
        result = await asyncio.to_thread(verify_translation, "", "english", code, target_language)
        return not result.has_parse_errors_in_target
    except Exception as exc:
        logger.warning("Cached translation failed AST validation (%s)", type(exc).__name__)
        return False


async def smooth_stream_chunks(
    stream,
    time_window: float = 0.025,
    token_threshold: int = 5,
):
    """Aggregate high-frequency tokens into temporal/count buffered chunks.

    Buffers tokens across a 25ms window or up to 5 tokens, cutting frame bloat by
    65-75% while maintaining low latency and smooth 60 FPS rendering in Monaco/React.
    """
    buffer: list[str] = []
    loop = asyncio.get_running_loop()
    last_flush = loop.time()

    async for chunk in stream:
        delta = chunk.choices[0].delta
        content = getattr(delta, "content", None)
        if not content:
            continue

        now = loop.time()
        # If time_window has elapsed and there are buffered tokens, flush them
        if buffer and (now - last_flush) >= time_window:
            combined = "".join(buffer)
            buffer.clear()
            last_flush = now
            yield combined

        buffer.append(content)

        if len(buffer) >= token_threshold:
            combined = "".join(buffer)
            buffer.clear()
            last_flush = loop.time()
            yield combined

    if buffer:
        yield "".join(buffer)


def _build_streaming_providers(
    requested_model: str | None,
    use_r1: bool,
) -> list[tuple[AsyncOpenAI, str, str]]:
    """Build prioritised list of (client, model_name, display_name) for streaming requests."""
    providers: list[tuple[AsyncOpenAI, str, str]] = []
    groq_client = _gw("_get_groq_client", _get_groq_client)()
    openrouter_client = _gw("_get_openrouter_client", _get_openrouter_client)()

    req = (requested_model or "").lower().strip()

    if req in ("local", "ollama", "vllm", "airgap") or os.getenv("AIRGAP_MODE", "0").lower() in ("1", "true"):
        from app.services.ai_gateway.airgap_provider import AirgapInferenceProvider

        airgap = AirgapInferenceProvider()
        providers.insert(0, (airgap.client, airgap.config.model_name, "Local Air-Gapped Engine"))
        if os.getenv("AIRGAP_MODE", "0").lower() in ("1", "true"):
            return providers

    if req in ("groq-llama-3.1-8b", "llama-3.1-8b", "8b"):
        if groq_client:
            providers.append((groq_client, "llama-3.1-8b-instant", "Groq Llama 3.1 8B"))
            providers.append((groq_client, "llama-3.3-70b-versatile", "Groq Llama 3.3 70B Backup"))
    elif req in ("groq-llama-3.3-70b", "llama-3.3-70b", "70b"):
        if groq_client:
            providers.append((groq_client, "llama-3.3-70b-versatile", "Groq Llama 3.3 70B"))
            providers.append((groq_client, "llama-3.1-8b-instant", "Groq Llama 3.1 8B Backup"))
    elif "claude" in req:
        if openrouter_client:
            providers.append((openrouter_client, "anthropic/claude-3.5-sonnet", "OpenRouter Claude 3.5 Sonnet"))
        if groq_client:
            providers.append((groq_client, "llama-3.3-70b-versatile", "Groq Fallback"))
            providers.append((groq_client, "llama-3.1-8b-instant", "Groq 8B Fallback"))
    elif "gpt" in req:
        if openrouter_client:
            providers.append((openrouter_client, "openai/gpt-4o", "OpenRouter GPT-4o"))
        if groq_client:
            providers.append((groq_client, "llama-3.3-70b-versatile", "Groq Fallback"))
            providers.append((groq_client, "llama-3.1-8b-instant", "Groq 8B Fallback"))
    elif "deepseek" in req:
        if groq_client:
            providers.append((groq_client, "deepseek-r1-distill-llama-70b", "Groq DeepSeek R1"))
        if openrouter_client:
            providers.append((openrouter_client, "deepseek/deepseek-r1", "OpenRouter DeepSeek R1"))
        if groq_client:
            providers.append((groq_client, "llama-3.3-70b-versatile", "Groq Llama Fallback"))
    else:
        # Default / Auto (Optimal): try primary then fast fallback
        if groq_client:
            primary_model = "deepseek-r1-distill-llama-70b" if use_r1 else "llama-3.3-70b-versatile"
            fallback_model = "llama-3.3-70b-versatile" if use_r1 else "llama-3.1-8b-instant"
            providers.append((groq_client, primary_model, "Groq Primary"))
            providers.append((groq_client, fallback_model, "Groq Backup"))
        if openrouter_client:
            or_model = "deepseek/deepseek-r1" if use_r1 else "meta-llama/llama-3.3-70b-instruct"
            providers.append((openrouter_client, or_model, "OpenRouter Backup"))

    return providers


async def stream_code_to_english(
    payload: CodePayload,
    email: str | None,
    is_pro: bool,
    use_r1: bool,
    tier: str,
    deduct_credit_flag: bool = False,
    cooldown: int = 0,
    ephemeral: bool = False,
    user_llm_key: str | None = None,
    depth: str = "dev",
):
    _cache = _gw("cache", cache)
    _metrics = _gw("metrics", metrics)
    _logger = _gw("logger", logger)
    _record_done = _gw("record_successful_completion", record_successful_completion)
    _dispatch_hist = _gw("_dispatch_history_task", _dispatch_history_task)
    try:
        # ZDR: compute hash once, never log raw_code
        _code_hash = compute_code_hash(payload.raw_code)

        # Intelligent LLM Routing
        requested_model = getattr(payload, "model", None)
        model_name = "deepseek-r1" if use_r1 else "standard"
        model = "deepseek-r1-distill-llama-70b" if use_r1 else "llama-3.3-70b-versatile"

        key = cache_key(
            payload.raw_code, payload.language, "code-to-english", f"{model_name}:{requested_model or 'auto'}"
        )

        if not ephemeral:
            # Check Semantic AST Cache first (deduplicates identical code with different comments/formatting)
            try:
                from app.services.ast_cache import get_cached_ast_translation

                ast_cached = await get_cached_ast_translation(payload.raw_code, payload.language, depth)
                if ast_cached and isinstance(ast_cached, dict) and "blocks" in ast_cached:
                    await _metrics.record_cache_hit()
                    yield f"data: {json.dumps({'chunk': '', 'done': False})}\n\n"
                    yield f"data: {json.dumps({'done': True, 'blocks': ast_cached['blocks'], 'model_used': ast_cached.get('model_used', model)})}\n\n"
                    if email:
                        await _record_done(email, is_pro, deduct_credit_flag, cooldown)
                        _dispatch_hist(
                            user_email=email,
                            mode="Code → English",
                            source_language=payload.language,
                            target_language="english",
                            input_text=f"[ZDR-PROTECTED: {len(payload.raw_code)} chars | {payload.language}]",
                            input_hash=_code_hash,
                            blocks=ast_cached["blocks"],
                            model_used=model_name,
                            workspace_id=payload.workspace_id,
                            session_id=payload.session_id,
                            repository_name=payload.repository_name,
                            file_path=payload.file_path,
                        )
                    return
            except Exception as _ast_err:
                _logger.debug(f"AST cache lookup bypassed: {_ast_err}")

            # Check Cache
            cached = await _cache.get(key)

            if cached:
                await _metrics.record_cache_hit()
                yield f"data: {json.dumps({'chunk': '', 'done': False})}\n\n"
                yield f"data: {json.dumps({'done': True, 'blocks': cached, 'model_used': model})}\n\n"

                if email:
                    await _record_done(email, is_pro, deduct_credit_flag, cooldown)
                    _dispatch_hist(
                        user_email=email,
                        mode="Code → English",
                        source_language=payload.language,
                        target_language="english",
                        input_text=f"[ZDR-PROTECTED: {len(payload.raw_code)} chars | {payload.language}]",
                        input_hash=_code_hash,
                        blocks=cached,
                        model_used=model_name,
                        workspace_id=payload.workspace_id,
                        session_id=payload.session_id,
                        repository_name=payload.repository_name,
                        file_path=payload.file_path,
                    )
                return

        await _metrics.record_cache_miss()
        await _gw("check_and_track_groq_limits", check_and_track_groq_limits)(
            payload.raw_code, expected_output_tokens=1500
        )

        providers = _build_streaming_providers(requested_model, use_r1)
        if user_llm_key and user_llm_key.strip():
            _logger.info("Using client BYOK provider key (credit deduction bypassed)")
            deduct_credit_flag = False
            _openai_cls = _gw("AsyncOpenAI", AsyncOpenAI)
            byok_client = _openai_cls(
                api_key=user_llm_key.strip(), base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
            )
            providers.insert(0, (byok_client, "gemini-2.5-flash", "BYOK Gemini 2.5 Flash"))

        depth_prefix = DEPTH_PREFIXES.get(depth, "")
        base_instruction = f"{depth_prefix}\n\n{SYSTEM_INSTRUCTION}".lstrip() if depth_prefix else SYSTEM_INSTRUCTION
        augmented_system = await _gw("_inject_symbol_contract", _inject_symbol_contract)(
            base_instruction, payload.raw_code, payload.language
        )

        messages = [
            {"role": "system", "content": augmented_system},
            {
                "role": "user",
                "content": f"Programming Language: {payload.language}\n\nCode to Analyze/Translate:\n{payload.raw_code}",
            },
        ]

        used_model = model
        full_content = ""

        # PERF-03: Distributed stream slot acquisition with local fallback
        acquired, backend = await acquire_stream_slot_raw()
        if not acquired:
            _logger.warning("Stream concurrency ceiling reached; returning backpressure event.")
            yield f"data: {json.dumps({'error': 'Streaming server is currently at maximum capacity. Please retry shortly.', 'done': True})}\n\n"
            return

        try:
            for p_client, p_model, p_name in providers:
                try:
                    stream_kwargs = {"stream": True}
                    if tier != "pro":
                        stream_kwargs["max_tokens"] = 1500
                    if "r1" not in p_model.lower() and "reasoner" not in p_model.lower():
                        stream_kwargs["response_format"] = {"type": "json_object"}

                    candidate_stream = await asyncio.wait_for(
                        p_client.chat.completions.create(model=p_model, messages=messages, **stream_kwargs),
                        timeout=LLM_TIMEOUT,
                    )

                    full_content = ""
                    async for content in smooth_stream_chunks(candidate_stream):
                        full_content += content
                        yield f"data: {json.dumps({'chunk': content, 'done': False})}\n\n"

                    if full_content.strip():
                        used_model = p_model
                        await _metrics.record_model_call(p_model)
                        break
                except Exception as stream_err:
                    await _metrics.record_model_call(p_model, is_error=True)
                    _logger.warning(
                        "Streaming provider %s (%s) failed (%s)", p_name, p_model, type(stream_err).__name__
                    )
                    full_content = ""
                    continue
        finally:
            if acquired:
                await release_stream_slot_raw(backend)

        if not full_content.strip():
            _find_stale = _gw("find_stale_translation", find_stale_translation)
            stale_result = (
                None
                if ephemeral
                else await _find_stale(
                    email,
                    payload.raw_code,
                    payload.language,
                    "code-to-english",
                    "Code → English",
                )
            )
            if stale_result:
                _logger.info("Streaming fallback: returning stale recovery result")
                yield f"data: {json.dumps({'chunk': '', 'done': False})}\n\n"
                done_payload = {"done": True, "blocks": stale_result, "model_used": "stale_recovery"}
                if ephemeral:
                    done_payload["privacy_mode"] = "ephemeral"
                yield f"data: {json.dumps(done_payload)}\n\n"
                if email:
                    await _record_done(email, is_pro, deduct_credit_flag, cooldown)
                    if not ephemeral:
                        _dispatch_hist(
                            user_email=email,
                            mode="Code → English",
                            source_language=payload.language,
                            target_language="english",
                            input_text=f"[ZDR-PROTECTED: {len(payload.raw_code)} chars | {payload.language}]",
                            input_hash=_code_hash,
                            blocks=stale_result,
                            model_used="stale_recovery",
                            workspace_id=payload.workspace_id,
                            session_id=payload.session_id,
                            repository_name=payload.repository_name,
                            file_path=payload.file_path,
                        )
                return

            yield f"data: {json.dumps({'error': 'Translation engine encountered an error. Please try again.', 'done': True})}\n\n"
            return

        cleaned = _clean_json_response(full_content)
        raw = json.loads(cleaned)
        result = normalize_blocks(raw, model_used=used_model, tier=tier)

        # Explanations can include code snippets; validate them before storage or delivery.
        from app.services.ast_parser import is_language_supported, verify_translation

        supported = await asyncio.to_thread(is_language_supported, payload.language)
        combined_code = "\n".join(b.get("code_snippet", "") for b in result if isinstance(b, dict))
        verification = await asyncio.to_thread(
            verify_translation, payload.raw_code, payload.language, combined_code, payload.language
        )
        if not supported or verification.has_parse_errors_in_target:
            yield f"data: {json.dumps({'error': 'Generated output could not be syntax validated. Please retry.', 'done': True})}\n\n"
            return

        if not ephemeral:
            await _cache.put(key, result, 86400 * 7)
            try:
                from app.services.ast_cache import set_cached_ast_translation

                await set_cached_ast_translation(
                    payload.raw_code, payload.language, {"blocks": result, "model_used": used_model}, depth=depth
                )
            except Exception as _ast_save_err:
                _logger.debug(f"AST cache store bypassed: {_ast_save_err}")

        done_payload = {"done": True, "blocks": result, "model_used": used_model}
        if ephemeral:
            done_payload["privacy_mode"] = "ephemeral"

        yield f"data: {json.dumps(done_payload)}\n\n"

        if email:
            await _record_done(email, is_pro, deduct_credit_flag, cooldown)
            if not ephemeral:
                _dispatch_hist(
                    user_email=email,
                    mode="Code → English",
                    source_language=payload.language,
                    target_language="english",
                    input_text=f"[ZDR-PROTECTED: {len(payload.raw_code)} chars | {payload.language}]",
                    input_hash=_code_hash,
                    blocks=result,
                    model_used=used_model,
                    workspace_id=payload.workspace_id,
                    session_id=payload.session_id,
                    repository_name=payload.repository_name,
                    file_path=payload.file_path,
                )

        if ephemeral:
            del full_content
            del cleaned
            del raw
            del result

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        _logger.error("Streaming error (%s)", type(e).__name__)
        yield f"data: {json.dumps({'error': 'Translation engine encountered an error. Please try again.', 'done': True})}\n\n"


async def stream_code_to_code(
    payload: CodeToCodePayload,
    email: str | None,
    is_pro: bool,
    use_r1: bool,
    tier: str,
    deduct_credit_flag: bool = False,
    cooldown: int = 0,
    ephemeral: bool = False,
):
    _cache = _gw("cache", cache)
    _metrics = _gw("metrics", metrics)
    _logger = _gw("logger", logger)
    _record_done = _gw("record_successful_completion", record_successful_completion)
    _dispatch_hist = _gw("_dispatch_history_task", _dispatch_history_task)
    try:
        # ZDR: compute hash once, never log raw_code
        _code_hash = compute_code_hash(payload.raw_code)

        # Intelligent LLM Routing
        requested_model = getattr(payload, "model", None)
        model_name = "deepseek-r1" if use_r1 else "standard"
        model = "deepseek-r1-distill-llama-70b" if use_r1 else "llama-3.3-70b-versatile"

        key = cache_key(
            payload.raw_code,
            f"{payload.source_language}->{payload.target_language}",
            "code-to-code",
            f"{model_name}:{requested_model or 'auto'}",
        )

        if not ephemeral:
            # Check Semantic AST Cache first (deduplicates identical code with different comments/formatting)
            try:
                from app.services.ast_cache import get_cached_ast_translation

                ast_cached = await get_cached_ast_translation(
                    payload.raw_code,
                    payload.source_language,
                    target_language=payload.target_language,
                )
                if (
                    ast_cached
                    and isinstance(ast_cached, dict)
                    and "blocks" in ast_cached
                    and await _cached_translation_is_valid(ast_cached["blocks"], payload.target_language)
                ):
                    await _metrics.record_cache_hit()
                    yield f"data: {json.dumps({'chunk': '', 'done': False})}\n\n"
                    yield f"data: {json.dumps({'done': True, 'blocks': ast_cached['blocks'], 'model_used': ast_cached.get('model_used', model)})}\n\n"
                    if email:
                        await _record_done(email, is_pro, deduct_credit_flag, cooldown)
                        _dispatch_hist(
                            user_email=email,
                            mode="Code → Code",
                            source_language=payload.source_language,
                            target_language=payload.target_language,
                            input_text=f"[ZDR-PROTECTED: {len(payload.raw_code)} chars | {payload.source_language}→{payload.target_language}]",
                            input_hash=_code_hash,
                            blocks=ast_cached["blocks"],
                            model_used=model_name,
                            workspace_id=payload.workspace_id,
                            session_id=payload.session_id,
                            repository_name=payload.repository_name,
                            file_path=payload.file_path,
                        )
                    return
            except Exception as _ast_err:
                _logger.debug(f"AST cache lookup bypassed: {_ast_err}")

            # Check Cache
            cached = await _cache.get(key)

            if cached and await _cached_translation_is_valid(cached, payload.target_language):
                await _metrics.record_cache_hit()
                yield f"data: {json.dumps({'chunk': '', 'done': False})}\n\n"
                yield f"data: {json.dumps({'done': True, 'blocks': cached, 'model_used': model})}\n\n"

                if email:
                    await _record_done(email, is_pro, deduct_credit_flag, cooldown)
                    _dispatch_hist(
                        user_email=email,
                        mode="Code → Code",
                        source_language=payload.source_language,
                        target_language=payload.target_language,
                        input_text=f"[ZDR-PROTECTED: {len(payload.raw_code)} chars | {payload.source_language}→{payload.target_language}]",
                        input_hash=_code_hash,
                        blocks=cached,
                        model_used=model_name,
                        workspace_id=payload.workspace_id,
                        session_id=payload.session_id,
                        repository_name=payload.repository_name,
                        file_path=payload.file_path,
                    )
                return

        await _metrics.record_cache_miss()
        await _gw("check_and_track_groq_limits", check_and_track_groq_limits)(
            payload.raw_code, expected_output_tokens=1500
        )

        providers = _build_streaming_providers(requested_model, use_r1)

        system = f"""You are an expert polyglot programmer. Translate the given code from {payload.source_language} to {payload.target_language}.
Produce a complete, working, idiomatic translation. Then break the translated code into logical blocks.
Return a JSON object with a single key 'blocks' containing an array of objects where each object has: id (e.g. 'block_1'), code_snippet (the translated code for that block), and english_translation (a brief explanation of what this block does)."""

        augmented_system = await _gw("_inject_symbol_contract", _inject_symbol_contract)(
            system, payload.raw_code, payload.source_language
        )

        user_prompt = f"Source Language: {payload.source_language}\nTarget Language: {payload.target_language}\n\nCode to Translate:\n{payload.raw_code}"

        messages = [
            {"role": "system", "content": augmented_system},
            {"role": "user", "content": user_prompt},
        ]

        used_model = model
        full_content = ""

        # PERF-03: Distributed stream slot acquisition with local fallback
        acquired, backend = await acquire_stream_slot_raw()
        if not acquired:
            _logger.warning("Stream concurrency ceiling reached; returning backpressure event.")
            yield f"data: {json.dumps({'error': 'Streaming server is currently at maximum capacity. Please retry shortly.', 'done': True})}\n\n"
            return

        stream_chunks: list[str] = []
        try:
            for p_client, p_model, p_name in providers:
                try:
                    stream_kwargs = {"stream": True}
                    if tier != "pro":
                        stream_kwargs["max_tokens"] = 1500
                    if "r1" not in p_model.lower() and "reasoner" not in p_model.lower():
                        stream_kwargs["response_format"] = {"type": "json_object"}

                    candidate_stream = await asyncio.wait_for(
                        p_client.chat.completions.create(model=p_model, messages=messages, **stream_kwargs),
                        timeout=LLM_TIMEOUT,
                    )

                    full_content = ""
                    candidate_chunks: list[str] = []
                    async for content in smooth_stream_chunks(candidate_stream):
                        full_content += content
                        candidate_chunks.append(content)

                    if full_content.strip():
                        used_model = p_model
                        stream_chunks = candidate_chunks
                        await _metrics.record_model_call(p_model)
                        break
                except Exception as stream_err:
                    await _metrics.record_model_call(p_model, is_error=True)
                    _logger.warning(
                        "Streaming provider %s (%s) failed (%s)", p_name, p_model, type(stream_err).__name__
                    )
                    full_content = ""
                    stream_chunks = []
                    continue
        finally:
            if acquired:
                await release_stream_slot_raw(backend)

        if not full_content.strip():
            _find_stale = _gw("find_stale_translation", find_stale_translation)
            stale_result = (
                None
                if ephemeral
                else await _find_stale(
                    email,
                    payload.raw_code,
                    f"{payload.source_language}->{payload.target_language}",
                    "code-to-code",
                    "Code → Code",
                )
            )
            if stale_result:
                try:
                    from app.services.ast_parser import is_language_supported, verify_translation

                    supported = await asyncio.to_thread(is_language_supported, payload.target_language)
                    if not supported:
                        stale_result = None
                        raise ValueError("No AST parser is available for the target language.")

                    stale_code = "\n".join(
                        block.get("code_snippet", "") for block in stale_result if isinstance(block, dict)
                    )
                    stale_verification = await asyncio.to_thread(
                        verify_translation,
                        "",
                        "english",
                        stale_code,
                        payload.target_language,
                    )
                    if stale_verification.has_parse_errors_in_target:
                        stale_result = None
                except Exception as validation_error:
                    _logger.warning("Stale code result failed AST validation (%s)", type(validation_error).__name__)
                    stale_result = None
            if stale_result:
                _logger.info("Streaming fallback: returning stale recovery result")
                yield f"data: {json.dumps({'chunk': '', 'done': False})}\n\n"
                done_payload = {"done": True, "blocks": stale_result, "model_used": "stale_recovery"}
                if ephemeral:
                    done_payload["privacy_mode"] = "ephemeral"
                yield f"data: {json.dumps(done_payload)}\n\n"
                if email:
                    await _record_done(email, is_pro, deduct_credit_flag, cooldown)
                    if not ephemeral:
                        _dispatch_hist(
                            user_email=email,
                            mode="Code → Code",
                            source_language=payload.source_language,
                            target_language=payload.target_language,
                            input_text=f"[ZDR-PROTECTED: {len(payload.raw_code)} chars | {payload.source_language}→{payload.target_language}]",
                            input_hash=_code_hash,
                            blocks=stale_result,
                            model_used="stale_recovery",
                            workspace_id=payload.workspace_id,
                            session_id=payload.session_id,
                            repository_name=payload.repository_name,
                            file_path=payload.file_path,
                        )
                return

            yield f"data: {json.dumps({'error': 'Translation engine encountered an error. Please try again.', 'done': True})}\n\n"
            return

        cleaned = _clean_json_response(full_content)
        raw = json.loads(cleaned)
        result = normalize_blocks(raw, model_used=used_model, tier=tier)

        # Deterministic Tree-Sitter AST Boundary Validation
        try:
            from app.services.ast_parser import is_language_supported, verify_translation

            supported = await asyncio.to_thread(is_language_supported, payload.target_language)
            if not supported:
                raise ValueError("No AST parser is available for the target language.")

            combined_code = "\n".join(b.get("code_snippet", "") for b in result if isinstance(b, dict))
            verification = await asyncio.to_thread(
                verify_translation,
                payload.raw_code,
                payload.source_language,
                combined_code,
                payload.target_language,
            )
            if verification.has_parse_errors_in_target:
                _logger.warning(
                    f"AST verification flagged parse errors in target code ({payload.target_language}): {verification.warnings}"
                )
                yield f"data: {json.dumps({'error': 'Generated code did not pass syntax validation. Please retry.', 'done': True})}\n\n"
                return
        except Exception as ve:
            _logger.warning("AST verification failed; refusing to return unvalidated code (%s)", type(ve).__name__)
            yield f"data: {json.dumps({'error': 'Generated code could not be validated. Please retry.', 'done': True})}\n\n"
            return

        # Hold generated text until deterministic syntax validation succeeds.
        for content in stream_chunks:
            yield f"data: {json.dumps({'chunk': content, 'done': False})}\n\n"

        if not ephemeral:
            await _cache.put(key, result, 86400 * 7)
            try:
                from app.services.ast_cache import set_cached_ast_translation

                await set_cached_ast_translation(
                    payload.raw_code,
                    payload.source_language,
                    {"blocks": result, "model_used": used_model},
                    target_language=payload.target_language,
                )
            except Exception as _ast_save_err:
                _logger.debug(f"AST cache store bypassed: {_ast_save_err}")

        done_payload = {"done": True, "blocks": result, "model_used": used_model}
        if ephemeral:
            done_payload["privacy_mode"] = "ephemeral"

        if getattr(payload, "verify", False):
            try:
                from app.services.verification.equivalence_harness import EquivalenceHarness

                combined_code = "\n".join(b.get("code_snippet", "") for b in result if isinstance(b, dict))
                eq_report = EquivalenceHarness.evaluate(
                    source_language=payload.source_language,
                    target_language=payload.target_language,
                    source_code=payload.raw_code,
                    target_code=combined_code,
                    user_id=email or "anonymous",
                )
                done_payload["equivalence"] = eq_report.to_dict()
            except Exception as eq_err:
                _logger.warning("Equivalence evaluation skipped (%s)", type(eq_err).__name__)

        yield f"data: {json.dumps(done_payload)}\n\n"

        if email:
            await _record_done(email, is_pro, deduct_credit_flag, cooldown)
            if not ephemeral:
                _dispatch_hist(
                    user_email=email,
                    mode="Code → Code",
                    source_language=payload.source_language,
                    target_language=payload.target_language,
                    input_text=f"[ZDR-PROTECTED: {len(payload.raw_code)} chars | {payload.source_language}→{payload.target_language}]",
                    input_hash=_code_hash,
                    blocks=result,
                    model_used=used_model,
                    workspace_id=payload.workspace_id,
                    session_id=payload.session_id,
                    repository_name=payload.repository_name,
                    file_path=payload.file_path,
                )

        if ephemeral:
            del full_content
            del cleaned
            del raw
            del result

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        _logger.error("Streaming error (%s)", type(e).__name__)
        yield f"data: {json.dumps({'error': 'Translation engine encountered an error. Please try again.', 'done': True})}\n\n"
