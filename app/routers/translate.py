import os
import json
import re
from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from app.core.config import logger, metrics
from app.core.cache import cache, cache_key
from app.core.auth import get_user_email, get_user_pro_status, is_token_pro
from app.core.quota import enforce_quotas_and_protection, record_successful_completion, save_translation_background
from app.models.schemas import CodePayload, EnglishUpdatePayload, GeneratePayload, CodeToCodePayload, SyncEnglishToCodePayload
from app.services.ai import (
    get_completion,
    stream_code_to_english,
    stream_code_to_code,
    normalize_blocks,
    find_stale_translation,
    SYSTEM_INSTRUCTION,
    SYNC_SYSTEM_INSTRUCTION,
)

router = APIRouter(prefix="/api", tags=["translate"])

# ── INPUT SANITISATION & VALIDATION ──
def sanitise_input(raw_code: str, mode: str, email: str | None = None) -> str:
    """Detects and neutralises prompt injection patterns hidden in comments."""
    if not raw_code:
        return raw_code

    def replacer(match):
        if email:
            logger.warning(f"Prompt injection detected from {email} in mode {mode}")
        else:
            logger.warning(f"Prompt injection detected from anonymous user in mode {mode}")
        return "[REDACTED INJECTION ATTEMPT]"

    pattern_line = r"(?i)(//|#)[^\n]*?(ignore previous|system prompt|you are now|act as|jailbreak|\bdan\b|disregard instructions)[^\n]*"
    raw_code = re.sub(pattern_line, replacer, raw_code)

    pattern_block = r"(?is)(/\*|<!--|'''|\"\"\").*?(ignore previous|system prompt|you are now|act as|jailbreak|\bdan\b|disregard instructions).*?(?:\*/|-->|'''|\"\"\")"
    raw_code = re.sub(pattern_block, replacer, raw_code)

    return raw_code


def validate_code_input(raw_code: str):
    if len(raw_code) > 50000:
        raise HTTPException(
            status_code=422,
            detail="Input exceeds the maximum allowed length of 50,000 characters.",
        )

    if len(raw_code) == 0:
        return

    printable_count = sum(1 for c in raw_code if c.isprintable() or c.isspace())
    if (printable_count / len(raw_code)) < 0.1:
        raise HTTPException(
            status_code=422,
            detail="Input contains too many non-printable characters. Binary uploads are not supported.",
        )

    lines = raw_code.splitlines()
    if lines:
        ignore_count = sum(
            1 for line in lines if re.match(r"^\s*(//|#)\s*ignore", line, re.IGNORECASE)
        )
        if ignore_count / len(lines) > 0.5:
            raise HTTPException(
                status_code=422,
                detail="Input rejected: Too many ignored lines detected.",
            )


ALLOWED_EXTENSIONS = {".py", ".js", ".ts", ".java", ".cpp", ".rs", ".go", ".c", ".cs"}
EXTENSION_TO_LANGUAGE = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".java": "java",
    ".cpp": "cpp",
    ".rs": "rust",
    ".go": "go",
    ".c": "c",
    ".cs": "csharp",
}
FREE_MAX_FILE_SIZE = 50 * 1024
PRO_MAX_FILE_SIZE = 200 * 1024


@router.post("/upload-file")
async def upload_file_translate(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    mode: str = Form("code-to-english"),
    language: str = Form(""),
    target_language: str = Form(""),
    access_token: str = Form(""),
    email: str | None = Depends(get_user_email),
):
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    is_pro = False
    if email:
        is_pro = await get_user_pro_status(email)
    if not is_pro and access_token:
        is_pro = await is_token_pro(access_token)

    contents = await file.read()
    try:
        raw_code = contents.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=422, detail="File is not valid UTF-8 text.")

    if not raw_code.strip():
        raise HTTPException(status_code=422, detail="File is empty.")

    is_pro, daily_limit, deduct_credit_flag = await enforce_quotas_and_protection(
        request, email, len(raw_code)
    )

    max_size = PRO_MAX_FILE_SIZE if is_pro else FREE_MAX_FILE_SIZE
    tier = "pro" if is_pro else "free"
    use_r1 = is_pro

    if len(contents) > max_size:
        limit_kb = max_size // 1024
        raise HTTPException(
            status_code=422,
            detail=f"File too large ({len(contents) // 1024}KB). Maximum is {limit_kb}KB for {tier} users.",
        )

    detected_language = language or EXTENSION_TO_LANGUAGE.get(ext, "python")

    validate_code_input(raw_code)
    raw_code = sanitise_input(raw_code, mode="upload-file", email=email)

    model_name = "deepseek-reasoner" if use_r1 else "standard"
    key = cache_key(raw_code, detected_language, mode, model_name)

    cached = await cache.get(key)
    if cached:
        metrics.record_cache_hit()
        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag)
            background_tasks.add_task(
                save_translation_background,
                email,
                f"File Upload ({mode})",
                detected_language,
                target_language or "english",
                raw_code,
                cached,
                model_name,
                None,
            )
        return cached

    metrics.record_cache_miss()

    if mode == "code-to-code" and target_language:
        system = f"""You are an expert polyglot programmer. Translate the given code from {detected_language} to {target_language}.
Produce a complete, working, idiomatic translation. Then break the translated code into logical blocks.
Return a JSON object with a single key 'blocks' containing an array of objects where each object has: id (e.g. 'block_1'), code_snippet (the translated code for that block), and english_translation (a brief explanation of what this block does)."""
        user_prompt = f"Source Language: {detected_language}\nTarget Language: {target_language}\n\nCode to Translate:\n{raw_code}"
        completion_mode = "translation"
    else:
        system = SYSTEM_INSTRUCTION
        user_prompt = f"Programming Language: {detected_language}\n\nCode to Analyze/Translate:\n{raw_code}"
        completion_mode = "explanation"

    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction=system,
            mode=completion_mode,
            response_format="json_object",
            use_r1=use_r1,
        )
        raw = json.loads(response_text)
        result = normalize_blocks(raw, model_used=model_used, tier=tier)
        await cache.put(key, result, 86400 * 7)

        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag)
            background_tasks.add_task(
                save_translation_background,
                email,
                f"File Upload ({mode})",
                detected_language,
                target_language or "english",
                raw_code,
                result,
                model_name,
                None,
            )
        return result

    except Exception as e:
        logger.error(f"Upload translation failed: {str(e)}")
        stale_result = await find_stale_translation(
            email, raw_code, detected_language, mode, f"File Upload ({mode})"
        )
        if stale_result:
            if email:
                await record_successful_completion(email, is_pro, deduct_credit_flag)
                background_tasks.add_task(
                    save_translation_background,
                    email,
                    f"File Upload ({mode})",
                    detected_language,
                    target_language or "english",
                    raw_code,
                    stale_result,
                    model_name,
                    None,
                )
            return stale_result

        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500, detail="Translation failed. Please try again."
        )


@router.post("/code-to-english")
async def function_translate_to_english_stream(
    request: Request,
    payload: CodePayload,
    background_tasks: BackgroundTasks,
    email: str | None = Depends(get_user_email),
):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(
        payload.raw_code, mode="code-to-english", email=email
    )

    is_pro, daily_limit, deduct_credit_flag = await enforce_quotas_and_protection(
        request, email, len(payload.raw_code)
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro

    return StreamingResponse(
        stream_code_to_english(
            payload, email, is_pro, use_r1, tier, background_tasks, deduct_credit_flag
        ),
        media_type="text/event-stream",
    )


@router.post("/code-to-english/sync")
async def function_translate_to_english(
    request: Request,
    payload: CodePayload,
    background_tasks: BackgroundTasks,
    email: str | None = Depends(get_user_email),
):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(
        payload.raw_code, mode="code-to-english/sync", email=email
    )

    is_pro, daily_limit, deduct_credit_flag = await enforce_quotas_and_protection(
        request, email, len(payload.raw_code)
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro

    model_name = "deepseek-reasoner" if use_r1 else "standard"
    key = cache_key(payload.raw_code, payload.language, "code-to-english", model_name)

    cached = await cache.get(key)
    if cached:
        metrics.record_cache_hit()
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
            )
        return cached

    metrics.record_cache_miss()

    user_prompt = f"Programming Language: {payload.language}\n\nCode to Analyze/Translate:\n{payload.raw_code}"

    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            mode="explanation",
            response_format="json_object",
            use_r1=use_r1,
        )
        raw = json.loads(response_text)
        result = normalize_blocks(raw, model_used=model_used, tier=tier)

        await cache.put(key, result, 86400 * 7)

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
                model_used,
                payload.workspace_id,
            )

        return result
    except Exception as e:
        logger.error(f"Code to English failed: {str(e)}")
        stale_result = await find_stale_translation(
            email,
            payload.raw_code,
            payload.language,
            "code-to-english",
            "Code → English",
        )
        if stale_result:
            if email:
                await record_successful_completion(email, is_pro, deduct_credit_flag)
                background_tasks.add_task(
                    save_translation_background,
                    email,
                    "Code → English",
                    payload.language,
                    "english",
                    payload.raw_code,
                    stale_result,
                    model_name,
                    payload.workspace_id,
                )
            return stale_result

        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail="Translation engine returned an error. Please try again.",
        )


@router.post("/generate-from-english")
async def function_generate_from_english(
    request: Request,
    payload: GeneratePayload,
    background_tasks: BackgroundTasks,
    email: str | None = Depends(get_user_email),
):
    validate_code_input(payload.prompt)
    payload.prompt = sanitise_input(
        payload.prompt, mode="generate-from-english", email=email
    )

    is_pro, daily_limit, deduct_credit_flag = await enforce_quotas_and_protection(
        request, email, len(payload.prompt)
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro

    model_name = "deepseek-reasoner" if use_r1 else "standard"
    key = cache_key(
        payload.prompt, payload.language, "generate-from-english", model_name
    )

    cached = await cache.get(key)
    if cached:
        metrics.record_cache_hit()
        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag)
            background_tasks.add_task(
                save_translation_background,
                email,
                "English → Code",
                "english",
                payload.language,
                payload.prompt,
                cached,
                model_name,
                payload.workspace_id,
            )
        return cached

    metrics.record_cache_miss()

    user_prompt = f"Programming Language: {payload.language}\n\nUser Request:\n{payload.prompt}\n\nFirst, generate the complete, working code to satisfy this request. Then, analyze your generated code and break it down into logical blocks using the system instructions."

    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            mode="explanation",
            response_format="json_object",
            use_r1=use_r1,
        )
        raw = json.loads(response_text)
        result = normalize_blocks(raw, model_used=model_used, tier=tier)

        await cache.put(key, result, 86400 * 7)

        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag)
            background_tasks.add_task(
                save_translation_background,
                email,
                "English → Code",
                "english",
                payload.language,
                payload.prompt,
                result,
                model_used,
                payload.workspace_id,
            )

        return result
    except Exception as e:
        logger.error(f"Generate from English failed: {str(e)}")
        stale_result = await find_stale_translation(
            email,
            payload.prompt,
            payload.language,
            "generate-from-english",
            "English → Code",
        )
        if stale_result:
            if email:
                await record_successful_completion(email, is_pro, deduct_credit_flag)
                background_tasks.add_task(
                    save_translation_background,
                    email,
                    "English → Code",
                    "english",
                    payload.language,
                    payload.prompt,
                    stale_result,
                    model_name,
                    payload.workspace_id,
                )
            return stale_result

        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500, detail="Code generation failed. Please try again."
        )


@router.post("/english-to-code")
async def function_update_to_code(
    request: Request,
    payload: EnglishUpdatePayload,
    email: str | None = Depends(get_user_email),
):
    is_pro, daily_limit, deduct_credit_flag = await enforce_quotas_and_protection(
        request, email, len(payload.modified_english)
    )
    user_prompt = f"You are an expert programmer. The user is modifying a specific part of their code based on an English instruction. Here is the full context of the code: {payload.full_context}. The user wants to change the block identified as {payload.block_id} to do the following: '{payload.modified_english}'. Generate ONLY the new raw programming syntax required to fulfill this specific instruction. Do not include markdown formatting, backticks, or explanations. Return strictly the raw code."

    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction="You are an expert programmer. Only output raw code without markdown formatting.",
            mode="translation",
            response_format="text",
        )
        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag)
        return {
            "status": "success",
            "updated_code": response_text.strip(),
            "model_used": model_used,
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"LLM API Error: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Code update failed. Please try again."
        )


@router.post("/sync-english-to-code")
async def function_sync_english_to_code(
    request: Request,
    payload: SyncEnglishToCodePayload,
    background_tasks: BackgroundTasks,
    email: str | None = Depends(get_user_email),
):
    char_count = sum(len(b.code_snippet) for b in payload.blocks)
    is_pro, daily_limit, deduct_credit_flag = await enforce_quotas_and_protection(
        request, email, char_count
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro

    blocks_formatted = []
    for b in payload.blocks:
        blocks_formatted.append(
            {
                "id": b.id,
                "code_snippet": b.code_snippet,
                "english_translation": b.english_translation,
            }
        )

    instructions_suffix = (
        f"\n\n[CORPORATE STANDARDS / CUSTOM INSTRUCTIONS: {payload.custom_instructions}]"
        if payload.custom_instructions
        else ""
    )
    user_prompt = f"Programming Language: {payload.language}\n\nBlocks to Sync:\n{json.dumps(blocks_formatted, indent=2)}{instructions_suffix}"

    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction=SYNC_SYSTEM_INSTRUCTION,
            mode="translation",
            response_format="json_object",
            use_r1=use_r1,
        )

        raw = json.loads(response_text)
        updated_code = raw.get("updated_code", "")
        raw_blocks = raw.get("blocks", [])

        normalized_blocks = normalize_blocks(
            raw_blocks, model_used=model_used, tier=tier
        )

        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag)
            background_tasks.add_task(
                save_translation_background,
                email,
                "Two-Way Sync",
                payload.language,
                "english",
                updated_code,
                normalized_blocks,
                model_used,
                payload.workspace_id,
            )

        return {
            "status": "success",
            "updated_code": updated_code,
            "blocks": normalized_blocks,
            "model_used": model_used,
        }
    except Exception as e:
        logger.error(f"Sync English to Code failed: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500, detail="Synchronization failed. Please try again."
        )


@router.post("/code-to-code")
async def function_code_to_code(
    request: Request,
    payload: CodeToCodePayload,
    background_tasks: BackgroundTasks,
    email: str | None = Depends(get_user_email),
):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(
        payload.raw_code, mode="code-to-code", email=email
    )

    is_pro, daily_limit, deduct_credit_flag = await enforce_quotas_and_protection(
        request, email, len(payload.raw_code)
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro

    return StreamingResponse(
        stream_code_to_code(
            payload, email, is_pro, use_r1, tier, background_tasks, deduct_credit_flag
        ),
        media_type="text/event-stream",
    )
