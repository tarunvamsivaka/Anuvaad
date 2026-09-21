import asyncio
import json
import os

try:
    import sentry_sdk

    _SENTRY_AVAILABLE = True
except ImportError:
    _SENTRY_AVAILABLE = False

from contextlib import contextmanager

from fastapi import HTTPException
from openai import AsyncOpenAI

from app.core.cache import cache, cache_key
from app.core.config import (
    FRONTEND_URL,
    LLM_TIMEOUT,
    OPENROUTER_API_KEY,
    logger,
    metrics,
)
from app.core.quota import check_and_track_groq_limits, record_successful_completion
from app.models.schemas import CodePayload, CodeToCodePayload
from app.queue.tasks import save_translation_history_task


@contextmanager
def _nullctx():
    """No-op context manager used when Sentry is not configured."""
    yield None


# ── LLM CLIENT SINGLETONS (BACK-02) ──
# Created once at startup in lifespan, reused for all requests.
# Eliminates per-request DNS + TLS handshake overhead.
_groq_client: AsyncOpenAI | None = None
# FIX-24 (P1-03): OpenRouter as second provider for automatic fallback.
_openrouter_client: AsyncOpenAI | None = None


def init_clients(groq_key: str) -> None:
    """Initialize module-level LLM client singletons. Call from app lifespan."""
    global _groq_client, _openrouter_client
    _groq_client = AsyncOpenAI(
        api_key=groq_key,
        base_url="https://api.groq.com/openai/v1",
    )
    # FIX-24: Initialize OpenRouter client if the key is configured.
    if OPENROUTER_API_KEY:
        _openrouter_client = AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                # N-MED-05: Use FRONTEND_URL from config instead of a hardcoded Vercel URL.
                # This automatically reflects the correct domain across all environments.
                "HTTP-Referer": FRONTEND_URL,
                "X-Title": "Anuvaad",
            },
        )
        logger.info("LLM client singletons initialized (Groq + OpenRouter fallback)")
    else:
        logger.info("LLM client singleton initialized (Groq only — OPENROUTER_API_KEY not set)")


async def close_clients() -> None:
    """Gracefully close all LLM clients. Call from app lifespan shutdown."""
    global _groq_client, _openrouter_client
    if _groq_client:
        await _groq_client.close()
        _groq_client = None
    if _openrouter_client:
        await _openrouter_client.close()
        _openrouter_client = None
    logger.info("LLM client singletons closed")


def _get_groq_client() -> AsyncOpenAI:
    """Return the shared Groq client, or create a fallback if not yet initialized."""
    if _groq_client is not None:
        return _groq_client
    # Fallback: create on-the-fly (development mode or if lifespan wasn't used)
    key = os.getenv("GROQ_API_KEY", "")
    return AsyncOpenAI(api_key=key, base_url="https://api.groq.com/openai/v1")


def _get_openrouter_client() -> AsyncOpenAI | None:
    """Return the shared OpenRouter fallback client, or None if not configured."""
    if _openrouter_client is not None:
        return _openrouter_client
    key = OPENROUTER_API_KEY or os.getenv("OPENROUTER_API_KEY", "")
    if not key:
        return None
    return AsyncOpenAI(
        api_key=key,
        base_url="https://openrouter.ai/api/v1",
        default_headers={
            # N-MED-05: Use FRONTEND_URL from config (consistent with init_clients).
            "HTTP-Referer": FRONTEND_URL,
            "X-Title": "Anuvaad",
        },
    )


SYSTEM_INSTRUCTION = """
You are an expert code translator and analyzer. Your job is to break down the provided code into small, precise logical blocks and explain EXACTLY what each block does at the code level.

CRITICAL RULES:
1. Break the code into SMALL blocks of 1–8 lines each. Every meaningful statement or group of tightly-related statements should be its own block.
2. For each block, explain EXACTLY what that specific code does — reference the actual variable names, function names, operators, values, and data types used.
3. Do NOT summarize the entire program in one block. Do NOT give vague high-level descriptions like "This program calculates fibonacci numbers." Instead, explain each piece: "Defines a function called `fibonacci` that takes an integer parameter `n`."
4. Include ALL lines of the code. Every import, variable declaration, function definition, loop, conditional, return statement, comment, and expression must be covered in a block.
5. Use precise technical language. For example:
   - GOOD: "Declares a variable `count` and initializes it to `0`."
   - GOOD: "Calls `requests.get(url)` and stores the HTTP response object in `response`."
   - GOOD: "Iterates over each element `item` in the list `data` using a for loop."
   - BAD: "This section handles the data processing." (too vague)
   - BAD: "The program fetches data from the internet." (too high-level)
6. For HTML/CSS/markup languages, explain each tag, selector, property, or rule individually.
7. For SQL, explain each clause (SELECT, FROM, WHERE, JOIN, etc.) as its own block.

OUTPUT FORMAT — Return a JSON object with a single key 'blocks' containing an array of objects. Each object must have:
- "id": a unique block identifier like "block_1", "block_2", etc.
- "code_snippet": the exact code lines for this block (copied verbatim from the input, preserving indentation)
- "english_translation": a precise, plain-English explanation of what this specific code does

Example for Python code `import os\\npath = os.getcwd()\\nprint(path)`:
{
  "blocks": [
    {"id": "block_1", "code_snippet": "import os", "english_translation": "Imports the `os` module from the Python standard library, which provides functions for interacting with the operating system."},
    {"id": "block_2", "code_snippet": "path = os.getcwd()", "english_translation": "Calls `os.getcwd()` to get the current working directory path as a string, and stores it in the variable `path`."},
    {"id": "block_3", "code_snippet": "print(path)", "english_translation": "Prints the value of `path` (the current working directory) to the console."}
  ]
}
"""

SYNC_SYSTEM_INSTRUCTION = """
You are an expert code synchronizer. You are given a program broken down into logical blocks. The user has modified some of the English translations/explanations of these blocks.

Your task is to:
1. Synthesize the new, updated program code by modifying the code snippets of the blocks whose explanations were changed, ensuring the changes align with the modified English explanations.
2. Keep the overall syntax, logic, and unmodified code segments completely intact and structurally sound.
3. Return a JSON object with two keys:
   - "updated_code": a single string representing the complete, unified, syntactically correct program code.
   - "blocks": an array of objects representing the updated logical blocks of the program, preserving the original block structures as much as possible. Each object must have:
     - "id": the block ID (preserve IDs from the input where applicable)
     - "code_snippet": the updated/current code lines for this block
     - "english_translation": a precise, updated plain-English explanation of what this block does (keep it clean and precise)

Ensure that "updated_code" represents a valid, complete program in the requested programming language (no placeholders, no missing statements, fully functional).
Ensure the JSON output is strictly formatted.

Example:
If a block has:
"id": "block_3"
"code_snippet": "print(path)"
"english_translation": "Prints the value of path in uppercase to the console."
You should update the code_snippet to "print(path.upper())" or language equivalent, and compile the final "updated_code" with this change.
"""


def _clean_json_response(text: str) -> str:
    """Strip reasoning tags (<think>...</think>) and markdown code fences (```json...```)."""
    import re

    text = text.strip()
    # Strip DeepSeek R1 / Reasoning model <think>...</think> tags if present
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    text = text.removesuffix("```")
    return text.strip()


def normalize_blocks(raw_result, model_used: str = "", tier: str = "free") -> list:
    """Ensure LLM response is a list of {id, code_snippet, english_translation, model_used, tier} dicts."""
    if isinstance(raw_result, dict):
        for key in (
            "blocks",
            "result",
            "data",
            "translations",
            "code_blocks",
            "response",
        ):
            if key in raw_result and isinstance(raw_result[key], list):
                raw_result = raw_result[key]
                break
        else:
            raw_result = [raw_result]

    if not isinstance(raw_result, list):
        raise ValueError(f"Expected list, got {type(raw_result).__name__}")

    normalized = []
    for i, block in enumerate(raw_result):
        if not isinstance(block, dict):
            continue
        translation = (
            block.get("english_translation")
            or block.get("explanation")
            or block.get("description")
            or block.get("translation")
            or block.get("text")
            or block.get("english")
            or block.get("comment")
            or ""
        )
        code = block.get("code_snippet") or block.get("code") or block.get("snippet") or ""
        block_id = block.get("id") or block.get("block_id") or f"block_{i + 1}"

        normalized.append(
            {
                "id": str(block_id),
                "code_snippet": str(code),
                "english_translation": str(translation),
                "model_used": model_used,
                "tier": tier,
            }
        )

    normalized = [b for b in normalized if b["english_translation"].strip() or b["code_snippet"].strip()]

    if not normalized:
        raise ValueError("API returned no usable translation blocks")

    return normalized


async def find_stale_translation(
    email: str | None, input_text: str, language: str, endpoint: str, mode: str
) -> list | None:
    """Attempts to retrieve a stale translation from cache or DB if LLM providers are down.
    Arch#4.6: All 4 cache keys are checked in parallel via asyncio.gather instead of
    4 sequential Redis round-trips (saves ~3× round-trip latency on cache miss).
    """
    models_to_try = [
        "deepseek-reasoner",
        "standard",
        "llama-3.3-70b-versatile",
        "deepseek-chat",
    ]
    keys = [cache_key(input_text, language, endpoint, m) for m in models_to_try]
    results = await asyncio.gather(*[cache.get(k) for k in keys])
    for m, cached in zip(models_to_try, results, strict=False):
        if cached:
            logger.info(f"Stale recovery: found cached translation for model {m}")
            return cached

    if email:
        input_preview = input_text[:80]
        # M-02: Use ORM repository instead of raw supabase_request_list()
        from app.repositories import translation as translation_repo

        rows = await translation_repo.get_history(email, limit=10)
        rows = [r for r in rows if r.get("input_preview") == input_preview and r.get("mode") == mode]
        if rows:
            for row in rows:
                if isinstance(row, dict) and "blocks" in row and row["blocks"]:
                    logger.info("Stale recovery: found blocks in DB history")
                    try:
                        blocks = row["blocks"]
                        if isinstance(blocks, str):
                            blocks = json.loads(blocks)
                        if isinstance(blocks, list) and len(blocks) > 0:
                            return blocks
                    except Exception:
                        pass
    return None


def _inject_symbol_contract(system_instruction: str, code: str, language: str) -> str:
    """Augment the LLM system prompt with an AST-derived symbol contract.

    Extracts function names, class names, and top-level exports from the source
    code and appends a structured JSON block to the system prompt instructing
    the model to preserve these exact names in its translation output.

    This is the key Sprint 1 wiring: the Tree-sitter AST anchor service feeds
    into every LLM call for supported languages (Python, Go, TypeScript/JS).

    Returns the original system_instruction unchanged if:
    - `language` is empty or unsupported (graceful degradation)
    - `build_symbol_contract()` returns {} (no symbols extracted)
    - Any exception occurs during AST analysis
    """
    if not code or not language:
        return system_instruction

    # Extract actual code snippet if prompt was passed instead of raw code
    actual_code = code
    if "Code to Analyze/Translate:\n" in actual_code:
        actual_code = actual_code.split("Code to Analyze/Translate:\n", 1)[1]
    elif "```" in actual_code:
        parts = actual_code.split("```")
        if len(parts) >= 3:
            first_block = parts[1]
            lines = first_block.splitlines()
            if lines and lines[0].strip().isalpha():
                actual_code = "\n".join(lines[1:])
            else:
                actual_code = first_block

    try:
        import json as _json

        from app.services.ast_parser import build_symbol_contract

        contract = build_symbol_contract(actual_code, language)
        if not contract:
            return system_instruction  # Unsupported language — skip silently

        func_names = [f["name"] for f in contract.get("functions", []) if f.get("name")]
        class_names = [c["name"] for c in contract.get("classes", []) if c.get("name")]

        if not func_names and not class_names:
            return system_instruction  # Nothing to constrain

        contract_block = (
            "\n\n--- SYMBOL CONTRACT (AST-ANCHORED) ---\n"
            "The translated code MUST preserve these exact function and class names.\n"
            "Renaming, omitting, or merging any listed symbol is a critical hallucination.\n"
            f"{_json.dumps({'functions': func_names, 'classes': class_names}, separators=(',', ':'))}\n"
            "--- END SYMBOL CONTRACT ---"
        )
        logger.debug(
            f"Symbol contract injected for {language!r}: {len(func_names)} functions, {len(class_names)} classes"
        )
        return system_instruction + contract_block
    except Exception as e:
        logger.debug(f"_inject_symbol_contract skipped ({language!r}): {e}")
        return system_instruction  # Never block the LLM call


async def get_completion(
    prompt: str,
    system_instruction: str,
    mode: str,
    response_format: str = "json_object",
    use_r1: bool = False,
    max_tokens: int = 1500,
    source_language: str = "",
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

    await check_and_track_groq_limits(prompt, expected_output_tokens=max_tokens)

    groq_client = _get_groq_client()

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
    # supported source languages. This constrains the LLM to preserve function
    # and class names from the original code — reducing hallucinations.
    # source_language="" → graceful skip (code-to-code w/o lang, sync paths, etc.)
    augmented_system = _inject_symbol_contract(system_instruction, prompt, source_language)

    messages = [
        {"role": "system", "content": augmented_system},
        {"role": "user", "content": prompt},
    ]

    kwargs = {"max_tokens": max_tokens}
    if response_format == "json_object" and not use_r1:
        kwargs["response_format"] = {"type": "json_object"}

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
        await metrics.record_model_call(primary["model"])
        return _clean_json_response(response.choices[0].message.content), primary["name"]
    except Exception as e:
        await metrics.record_model_call(primary["model"], is_error=True)
        logger.warning(f"Error on {primary['name']}, falling back to {fallback['name']}. Error: {e}")
        fallback_kwargs = {"max_tokens": max_tokens}
        if response_format == "json_object":
            fallback_kwargs["response_format"] = {"type": "json_object"}

        try:
            with (
                sentry_sdk.start_span(
                    op="llm.completion",
                    name=f"LLM fallback: {fallback['name']}",
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
            await metrics.record_model_call(fallback["model"])
            return _clean_json_response(response.choices[0].message.content), fallback["name"]
        except TimeoutError:
            await metrics.record_model_call(fallback["model"], is_error=True)
            logger.error(f"LLM API Timeout after {LLM_TIMEOUT}s on fallback {fallback['name']}")
        except Exception as fallback_e:
            await metrics.record_model_call(fallback["model"], is_error=True)
            logger.error(f"Fallback {fallback['name']} Error: {fallback_e!s}")

        # FIX-24 (P1-03): Third-level fallback — OpenRouter (external, different infra).
        openrouter_client = _get_openrouter_client()
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
                await metrics.record_model_call("openrouter-llama")
                logger.warning("OpenRouter third-level fallback succeeded")
                return _clean_json_response(response.choices[0].message.content), "OpenRouter Llama 3.3"
            except Exception as or_e:
                await metrics.record_model_call("openrouter-llama", is_error=True)
                logger.error(f"OpenRouter fallback Error: {or_e!s}")

        stale_result = await find_stale_translation(None, prompt, "code", mode, mode)
        if stale_result:
            logger.info("get_completion fallback: returning stale recovery result")
            return json.dumps({"blocks": stale_result}), "stale_recovery"

        raise HTTPException(
            status_code=500,
            detail="Translation failed on all providers. Please try again.",
        )


_stream_semaphore: asyncio.Semaphore | None = None
_stream_semaphore_loop: asyncio.AbstractEventLoop | None = None


def get_stream_semaphore() -> asyncio.Semaphore:
    """Return the per-process concurrency semaphore for streaming requests."""
    global _stream_semaphore, _stream_semaphore_loop
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if _stream_semaphore is None or _stream_semaphore_loop != current_loop:
        from app.core.config import WORKER_CONCURRENT_STREAMS

        _stream_semaphore = asyncio.Semaphore(WORKER_CONCURRENT_STREAMS)
        _stream_semaphore_loop = current_loop
    return _stream_semaphore


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
    groq_client = _get_groq_client()
    openrouter_client = _get_openrouter_client()

    req = (requested_model or "").lower().strip()

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
):
    try:
        # Intelligent LLM Routing
        requested_model = getattr(payload, "model", None)
        model_name = "deepseek-r1" if use_r1 else "standard"
        model = "deepseek-r1-distill-llama-70b" if use_r1 else "llama-3.3-70b-versatile"

        key = cache_key(
            payload.raw_code, payload.language, "code-to-english", f"{model_name}:{requested_model or 'auto'}"
        )

        # Check Cache
        cached = await cache.get(key)

        if cached:
            await metrics.record_cache_hit()
            yield f"data: {json.dumps({'chunk': '', 'done': False})}\n\n"
            yield f"data: {json.dumps({'done': True, 'blocks': cached, 'model_used': model})}\n\n"

            if email:
                await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
                save_translation_history_task.delay(
                    user_email=email,
                    mode="Code → English",
                    source_language=payload.language,
                    target_language="english",
                    input_text=payload.raw_code,
                    blocks=cached,
                    model_used=model_name,
                    workspace_id=payload.workspace_id,
                    session_id=payload.session_id,
                    repository_name=payload.repository_name,
                    file_path=payload.file_path,
                )
            return

        await metrics.record_cache_miss()
        await check_and_track_groq_limits(payload.raw_code, expected_output_tokens=1500)

        providers = _build_streaming_providers(requested_model, use_r1)

        messages = [
            {"role": "system", "content": SYSTEM_INSTRUCTION},
            {
                "role": "user",
                "content": f"Programming Language: {payload.language}\n\nCode to Analyze/Translate:\n{payload.raw_code}",
            },
        ]

        used_model = model
        full_content = ""

        sem = get_stream_semaphore()
        from app.core.config import STREAM_ACQUIRE_TIMEOUT

        acquired = False
        try:
            await asyncio.wait_for(sem.acquire(), timeout=STREAM_ACQUIRE_TIMEOUT)
            acquired = True
        except TimeoutError:
            logger.warning("Stream concurrency ceiling reached; returning backpressure event.")
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
                        await metrics.record_model_call(p_model)
                        break
                except Exception as stream_err:
                    await metrics.record_model_call(p_model, is_error=True)
                    logger.warning(f"Streaming provider {p_name} ({p_model}) failed: {stream_err}")
                    full_content = ""
                    continue
        finally:
            if acquired:
                sem.release()

        if not full_content.strip():
            stale_result = await find_stale_translation(
                email,
                payload.raw_code,
                payload.language,
                "code-to-english",
                "Code → English",
            )
            if stale_result:
                logger.info("Streaming fallback: returning stale recovery result")
                yield f"data: {json.dumps({'chunk': '', 'done': False})}\n\n"
                yield f"data: {json.dumps({'done': True, 'blocks': stale_result, 'model_used': 'stale_recovery'})}\n\n"
                if email:
                    await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
                    save_translation_history_task.delay(
                        user_email=email,
                        mode="Code → English",
                        source_language=payload.language,
                        target_language="english",
                        input_text=payload.raw_code,
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

        await cache.put(key, result, 86400 * 7)

        yield f"data: {json.dumps({'done': True, 'blocks': result, 'model_used': used_model})}\n\n"

        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
            save_translation_history_task.delay(
                user_email=email,
                mode="Code → English",
                source_language=payload.language,
                target_language="english",
                input_text=payload.raw_code,
                blocks=result,
                model_used=used_model,
                workspace_id=payload.workspace_id,
                session_id=payload.session_id,
                repository_name=payload.repository_name,
                file_path=payload.file_path,
            )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Streaming error: {e!s}")
        yield f"data: {json.dumps({'error': 'Translation engine encountered an error. Please try again.', 'done': True})}\n\n"


async def stream_code_to_code(
    payload: CodeToCodePayload,
    email: str | None,
    is_pro: bool,
    use_r1: bool,
    tier: str,
    deduct_credit_flag: bool = False,
    cooldown: int = 0,
):
    try:
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

        # Check Cache
        cached = await cache.get(key)

        if cached:
            await metrics.record_cache_hit()
            yield f"data: {json.dumps({'chunk': '', 'done': False})}\n\n"
            yield f"data: {json.dumps({'done': True, 'blocks': cached, 'model_used': model})}\n\n"

            if email:
                await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
                save_translation_history_task.delay(
                    user_email=email,
                    mode="Code → Code",
                    source_language=payload.source_language,
                    target_language=payload.target_language,
                    input_text=payload.raw_code,
                    blocks=cached,
                    model_used=model_name,
                    workspace_id=payload.workspace_id,
                    session_id=payload.session_id,
                    repository_name=payload.repository_name,
                    file_path=payload.file_path,
                )
            return

        await metrics.record_cache_miss()
        await check_and_track_groq_limits(payload.raw_code, expected_output_tokens=1500)

        providers = _build_streaming_providers(requested_model, use_r1)

        system = f"""You are an expert polyglot programmer. Translate the given code from {payload.source_language} to {payload.target_language}.
Produce a complete, working, idiomatic translation. Then break the translated code into logical blocks.
Return a JSON object with a single key 'blocks' containing an array of objects where each object has: id (e.g. 'block_1'), code_snippet (the translated code for that block), and english_translation (a brief explanation of what this block does)."""

        user_prompt = f"Source Language: {payload.source_language}\nTarget Language: {payload.target_language}\n\nCode to Translate:\n{payload.raw_code}"

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ]

        used_model = model
        full_content = ""

        sem = get_stream_semaphore()
        from app.core.config import STREAM_ACQUIRE_TIMEOUT

        acquired = False
        try:
            await asyncio.wait_for(sem.acquire(), timeout=STREAM_ACQUIRE_TIMEOUT)
            acquired = True
        except TimeoutError:
            logger.warning("Stream concurrency ceiling reached; returning backpressure event.")
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
                        await metrics.record_model_call(p_model)
                        break
                except Exception as stream_err:
                    await metrics.record_model_call(p_model, is_error=True)
                    logger.warning(f"Streaming provider {p_name} ({p_model}) failed: {stream_err}")
                    full_content = ""
                    continue
        finally:
            if acquired:
                sem.release()

        if not full_content.strip():
            stale_result = await find_stale_translation(
                email,
                payload.raw_code,
                f"{payload.source_language}->{payload.target_language}",
                "code-to-code",
                "Code → Code",
            )
            if stale_result:
                logger.info("Streaming fallback: returning stale recovery result")
                yield f"data: {json.dumps({'chunk': '', 'done': False})}\n\n"
                yield f"data: {json.dumps({'done': True, 'blocks': stale_result, 'model_used': 'stale_recovery'})}\n\n"
                if email:
                    await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
                    save_translation_history_task.delay(
                        user_email=email,
                        mode="Code → Code",
                        source_language=payload.source_language,
                        target_language=payload.target_language,
                        input_text=payload.raw_code,
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

        await cache.put(key, result, 86400 * 7)

        yield f"data: {json.dumps({'done': True, 'blocks': result, 'model_used': used_model})}\n\n"

        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
            save_translation_history_task.delay(
                user_email=email,
                mode="Code → Code",
                source_language=payload.source_language,
                target_language=payload.target_language,
                input_text=payload.raw_code,
                blocks=result,
                model_used=used_model,
                workspace_id=payload.workspace_id,
                session_id=payload.session_id,
                repository_name=payload.repository_name,
                file_path=payload.file_path,
            )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Streaming error: {e!s}")
        yield f"data: {json.dumps({'error': 'Translation engine encountered an error. Please try again.', 'done': True})}\n\n"
