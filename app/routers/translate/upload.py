import json
import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from app.core.auth import get_user_email, get_user_pro_status, is_token_pro
from app.core.cache import cache, cache_key
from app.core.config import (
    ALLOWED_EXTENSIONS,
    EXTENSION_TO_LANGUAGE,
    FREE_MAX_FILE_SIZE,
    PRO_MAX_FILE_SIZE,
    logger,
    metrics,
)
from app.core.quota import enforce_quotas_and_protection, record_successful_completion
from app.queue.tasks import save_translation_history_task
from app.services.ai import (
    SYSTEM_INSTRUCTION,
    find_stale_translation,
    get_completion,
    normalize_blocks,
)

from .dependencies import (
    sanitise_input,
    validate_code_input,
)

router = APIRouter()

@router.post("/upload-file")
async def upload_file_translate(
    request: Request,
    file: UploadFile = File(...),
    mode: str = Form("code-to-english"),
    language: str = Form(""),
    target_language: str = Form(""),
    access_token: str = Form(""),
    session_id: str | None = Form(None),
    repository_name: str | None = Form(None),
    file_path: str | None = Form(None),
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

    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
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
        await metrics.record_cache_hit()
        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
            save_translation_history_task.delay(
                user_email=email,
                mode=f"File Upload ({mode})",
                source_language=detected_language,
                target_language=target_language or "english",
                input_text=raw_code,
                blocks=cached,
                model_used=model_name,
                workspace_id=None,
                session_id=session_id,
                repository_name=repository_name,
                file_path=file_path,
            )
        return cached

    await metrics.record_cache_miss()

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
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
            save_translation_history_task.delay(
                user_email=email,
                mode=f"File Upload ({mode})",
                source_language=detected_language,
                target_language=target_language or "english",
                input_text=raw_code,
                blocks=result,
                model_used=model_name,
                workspace_id=None,
                session_id=session_id,
                repository_name=repository_name,
                file_path=file_path,
            )
        return result

    except Exception as e:
        logger.error(f"Upload translation failed: {str(e)}")
        stale_result = await find_stale_translation(
            email, raw_code, detected_language, mode, f"File Upload ({mode})"
        )
        if stale_result:
            if email:
                await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
                save_translation_history_task.delay(
                    user_email=email,
                    mode=f"File Upload ({mode})",
                    source_language=detected_language,
                    target_language=target_language or "english",
                    input_text=raw_code,
                    blocks=stale_result,
                    model_used=model_name,
                    workspace_id=None,
                    session_id=session_id,
                    repository_name=repository_name,
                    file_path=file_path,
                )
            return stale_result

        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500, detail="Translation failed. Please try again."
        )
