import os
import json
import asyncio
from openai import AsyncOpenAI
from fastapi import HTTPException, BackgroundTasks
from app.core.config import (
    LLM_TIMEOUT,
    GROQ_API_KEY,
    DEEPSEEK_API_KEY,
    logger,
    metrics,
)
from app.core.cache import cache, cache_key
from app.core.database import supabase_request_list
from app.core.quota import record_successful_completion, save_translation_background
from app.models.schemas import CodePayload, CodeToCodePayload

# ── LLM CLIENT SINGLETONS (BACK-02) ──
# Created once at startup in lifespan, reused for all requests.
# Eliminates per-request DNS + TLS handshake overhead.
_groq_client: AsyncOpenAI | None = None
_deepseek_client: AsyncOpenAI | None = None


def init_clients(groq_key: str, deepseek_key: str) -> None:
    """Initialize module-level LLM client singletons. Call from app lifespan."""
    global _groq_client, _deepseek_client
    _groq_client = AsyncOpenAI(
        api_key=groq_key,
        base_url="https://api.groq.com/openai/v1",
    )
    _deepseek_client = AsyncOpenAI(
        api_key=deepseek_key,
        base_url="https://api.deepseek.com/v1",
    )
    logger.info("LLM client singletons initialized (Groq + DeepSeek)")


async def close_clients() -> None:
    """Gracefully close all LLM clients. Call from app lifespan shutdown."""
    global _groq_client, _deepseek_client
    if _groq_client:
        await _groq_client.close()
        _groq_client = None
    if _deepseek_client:
        await _deepseek_client.close()
        _deepseek_client = None
    logger.info("LLM client singletons closed")


def _get_groq_client() -> AsyncOpenAI:
    """Return the shared Groq client, or create a fallback if not yet initialized."""
    if _groq_client is not None:
        return _groq_client
    # Fallback: create on-the-fly (development mode or if lifespan wasn't used)
    key = os.getenv("GROQ_API_KEY", "")
    return AsyncOpenAI(api_key=key, base_url="https://api.groq.com/openai/v1")


def _get_deepseek_client() -> AsyncOpenAI:
    """Return the shared DeepSeek client, or create a fallback if not yet initialized."""
    if _deepseek_client is not None:
        return _deepseek_client
    key = os.getenv("DEEPSEEK_API_KEY", "")
    return AsyncOpenAI(api_key=key, base_url="https://api.deepseek.com/v1")


def get_async_openai_class():
    """Legacy compatibility shim — returns the AsyncOpenAI class (not an instance)."""
    return AsyncOpenAI

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
    """Strip markdown backticks from LLMs that don't enforce strict JSON mode."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
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
        code = (
            block.get("code_snippet") or block.get("code") or block.get("snippet") or ""
        )
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

    normalized = [
        b
        for b in normalized
        if b["english_translation"].strip() or b["code_snippet"].strip()
    ]

    if not normalized:
        raise ValueError("API returned no usable translation blocks")

    return normalized


async def find_stale_translation(
    email: str | None, input_text: str, language: str, endpoint: str, mode: str
) -> list | None:
    """Attempts to retrieve a stale translation from cache or Supabase DB history if LLM providers are down."""
    models_to_try = [
        "deepseek-reasoner",
        "standard",
        "llama-3.3-70b-versatile",
        "deepseek-chat",
    ]
    for m in models_to_try:
        key = cache_key(input_text, language, endpoint, m)
        cached = await cache.get(key)
        if cached:
            logger.info(f"Stale recovery: found cached translation for model {m}")
            return cached

    if email:
        input_preview = input_text[:80]
        path = f"translation_history?user_email=eq.{email}&input_preview=eq.{input_preview}&mode=eq.{mode}&select=*"
        rows = await supabase_request_list(path)
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


async def get_completion(
    prompt: str,
    system_instruction: str,
    mode: str,
    response_format: str = "json_object",
    use_r1: bool = False,
) -> tuple[str, str]:
    """
    Router for Groq and DeepSeek models.
    If use_r1=True, routes to DeepSeek R1 (deepseek-reasoner).
    mode='explanation' -> Groq (fallback DeepSeek)
    mode='translation' -> DeepSeek (fallback Groq)
    """
    groq_api_key = os.getenv("GROQ_API_KEY")
    deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")

    if not groq_api_key or not deepseek_api_key:
        raise HTTPException(status_code=500, detail="LLM API keys not configured")

    # BACK-02: Use singleton clients instead of creating per-request
    groq_client = _get_groq_client()
    deepseek_client = _get_deepseek_client()

    if use_r1:
        primary = {
            "client": deepseek_client,
            "model": "deepseek-reasoner",
            "name": "DeepSeek R1",
        }
        fallback = {
            "client": groq_client,
            "model": "llama-3.3-70b-versatile",
            "name": "Llama 3.3",
        }
    else:
        groq_model = "llama-3.3-70b-versatile"
        deepseek_model = "deepseek-chat"
        if mode == "explanation":
            primary = {"client": groq_client, "model": groq_model, "name": "Llama 3.3"}
            fallback = {
                "client": deepseek_client,
                "model": deepseek_model,
                "name": "DeepSeek V3",
            }
        else:  # "translation"
            primary = {
                "client": deepseek_client,
                "model": deepseek_model,
                "name": "DeepSeek V3",
            }
            fallback = {"client": groq_client, "model": groq_model, "name": "Llama 3.3"}

    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": prompt},
    ]

    kwargs = {}
    if response_format == "json_object" and primary["model"] != "deepseek-reasoner":
        kwargs["response_format"] = {"type": "json_object"}

    try:
        response = await asyncio.wait_for(
            primary["client"].chat.completions.create(
                model=primary["model"], messages=messages, **kwargs
            ),
            timeout=LLM_TIMEOUT,
        )
        metrics.record_model_call(primary["model"])
        return _clean_json_response(response.choices[0].message.content), primary[
            "name"
        ]
    except Exception as e:
        metrics.record_model_call(primary["model"], is_error=True)
        logger.warning(
            f"Error on {primary['name']}, falling back to {fallback['name']}. Error: {e}"
        )
        fallback_kwargs = {}
        if response_format == "json_object":
            fallback_kwargs["response_format"] = {"type": "json_object"}

        try:
            response = await asyncio.wait_for(
                fallback["client"].chat.completions.create(
                    model=fallback["model"], messages=messages, **fallback_kwargs
                ),
                timeout=LLM_TIMEOUT,
            )
            metrics.record_model_call(fallback["model"])
            return _clean_json_response(response.choices[0].message.content), fallback[
                "name"
            ]
        except asyncio.TimeoutError:
            metrics.record_model_call(fallback["model"], is_error=True)
            logger.error(
                f"LLM API Timeout after {LLM_TIMEOUT}s on fallback {fallback['name']}"
            )
            raise HTTPException(
                status_code=504,
                detail=f"Translation timed out after {LLM_TIMEOUT}s. Please try again.",
            )
        except Exception as fallback_e:
            metrics.record_model_call(fallback["model"], is_error=True)
            logger.error(f"Fallback {fallback['name']} Error: {str(fallback_e)}")
            raise HTTPException(
                status_code=500,
                detail="Translation failed on both models. Please try again.",
            )


async def stream_code_to_english(
    payload: CodePayload,
    email: str | None,
    is_pro: bool,
    use_r1: bool,
    tier: str,
    background_tasks: BackgroundTasks,
    deduct_credit_flag: bool = False,
):
    model_name = "deepseek-reasoner" if use_r1 else "standard"
    model = "deepseek-reasoner" if use_r1 else "llama-3.3-70b-versatile"
    key = cache_key(payload.raw_code, payload.language, "code-to-english", model_name)

    # Check Cache
    cached = await cache.get(key)

    if cached:
        metrics.record_cache_hit()
        yield f"data: {json.dumps({'chunk': '', 'done': False})}\n\n"
        yield f"data: {json.dumps({'done': True, 'blocks': cached, 'model_used': model})}\n\n"

        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag)
            background_tasks.add_task(
                save_translation_background,
                email,
                "Code → English",
                payload.language,
                "english",
                payload.raw_code,
                cached,
                model_name,
                payload.workspace_id,
                payload.session_id,
                payload.repository_name,
                payload.file_path,
            )
        return

    metrics.record_cache_miss()
    # BACK-02: Use singleton clients instead of creating per-request
    groq_client = _get_groq_client()
    deepseek_client = _get_deepseek_client()

    if use_r1:
        client = deepseek_client
        model = "deepseek-reasoner"
    else:
        client = groq_client
        model = "llama-3.3-70b-versatile"

    messages = [
        {"role": "system", "content": SYSTEM_INSTRUCTION},
        {
            "role": "user",
            "content": f"Programming Language: {payload.language}\n\nCode to Analyze/Translate:\n{payload.raw_code}",
        },
    ]

    kwargs = {"stream": True}
    if model != "deepseek-reasoner":
        kwargs["response_format"] = {"type": "json_object"}

    try:
        stream = await client.chat.completions.create(
            model=model, messages=messages, **kwargs
        )

        full_content = ""
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                full_content += content
                yield f"data: {json.dumps({'chunk': content, 'done': False})}\n\n"

        cleaned = _clean_json_response(full_content)
        raw = json.loads(cleaned)
        result = normalize_blocks(raw, model_used=model, tier=tier)

        await cache.put(key, result)

        yield f"data: {json.dumps({'done': True, 'blocks': result, 'model_used': model})}\n\n"

        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag)
            background_tasks.add_task(
                save_translation_background,
                email,
                "Code → English",
                payload.language,
                "english",
                payload.raw_code,
                result,
                model,
                payload.workspace_id,
                payload.session_id,
                payload.repository_name,
                payload.file_path,
            )

    except Exception as e:
        logger.error(f"Streaming error: {str(e)}")
        yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"


async def stream_code_to_code(
    payload: CodeToCodePayload,
    email: str | None,
    is_pro: bool,
    use_r1: bool,
    tier: str,
    background_tasks: BackgroundTasks,
    deduct_credit_flag: bool = False,
):
    model_name = "deepseek-reasoner" if use_r1 else "standard"
    model = "deepseek-reasoner" if use_r1 else "llama-3.3-70b-versatile"
    key = cache_key(
        payload.raw_code,
        f"{payload.source_language}->{payload.target_language}",
        "code-to-code",
        model_name,
    )

    # Check Cache
    cached = await cache.get(key)

    if cached:
        metrics.record_cache_hit()
        yield f"data: {json.dumps({'chunk': '', 'done': False})}\n\n"
        yield f"data: {json.dumps({'done': True, 'blocks': cached, 'model_used': model})}\n\n"

        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag)
            background_tasks.add_task(
                save_translation_background,
                email,
                "Code → Code",
                payload.source_language,
                payload.target_language,
                payload.raw_code,
                cached,
                model_name,
                payload.workspace_id,
                payload.session_id,
                payload.repository_name,
                payload.file_path,
            )
        return

    metrics.record_cache_miss()
    # BACK-02: Use singleton clients instead of creating per-request
    groq_client = _get_groq_client()
    deepseek_client = _get_deepseek_client()

    if use_r1:
        client = deepseek_client
        model = "deepseek-reasoner"
    else:
        client = groq_client
        model = "llama-3.3-70b-versatile"

    system = f"""You are an expert polyglot programmer. Translate the given code from {payload.source_language} to {payload.target_language}.
Produce a complete, working, idiomatic translation. Then break the translated code into logical blocks.
Return a JSON object with a single key 'blocks' containing an array of objects where each object has: id (e.g. 'block_1'), code_snippet (the translated code for that block), and english_translation (a brief explanation of what this block does)."""

    user_prompt = f"Source Language: {payload.source_language}\nTarget Language: {payload.target_language}\n\nCode to Translate:\n{payload.raw_code}"

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_prompt},
    ]

    kwargs = {"stream": True}
    if model != "deepseek-reasoner":
        kwargs["response_format"] = {"type": "json_object"}

    try:
        stream = await client.chat.completions.create(
            model=model, messages=messages, **kwargs
        )

        full_content = ""
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                full_content += content
                yield f"data: {json.dumps({'chunk': content, 'done': False})}\n\n"

        cleaned = _clean_json_response(full_content)
        raw = json.loads(cleaned)
        result = normalize_blocks(raw, model_used=model, tier=tier)

        await cache.put(key, result, 86400 * 7)

        yield f"data: {json.dumps({'done': True, 'blocks': result, 'model_used': model})}\n\n"

        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag)
            background_tasks.add_task(
                save_translation_background,
                email,
                "Code → Code",
                payload.source_language,
                payload.target_language,
                payload.raw_code,
                result,
                model,
                payload.workspace_id,
                payload.session_id,
                payload.repository_name,
                payload.file_path,
            )

    except Exception as e:
        logger.error(f"Streaming error: {str(e)}")
        yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

