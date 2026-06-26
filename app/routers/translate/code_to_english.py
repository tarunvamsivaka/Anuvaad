import json
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.core.config import logger, metrics
from app.core.rate_limit import rate_limiter
from app.core.cache import cache, cache_key
from app.core.auth import get_user_email
from app.core.quota import enforce_quotas_and_protection, record_successful_completion
from app.queue.tasks import save_translation_history_task
from app.models.schemas import CodePayload
from app.services.ai import (
    get_completion,
    stream_code_to_english,
    normalize_blocks,
    find_stale_translation,
    SYSTEM_INSTRUCTION,
)
from .dependencies import sanitise_input, validate_code_input

router = APIRouter()

@router.post(
    "/code-to-english",
    response_class=StreamingResponse,
    dependencies=[Depends(rate_limiter(10, 60))]
)
async def function_translate_to_english_stream(
    request: Request,
    payload: CodePayload,
    email: str | None = Depends(get_user_email),
):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(
        payload.raw_code, mode="code-to-english", email=email
    )

    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
        request, email, len(payload.raw_code)
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro

    return StreamingResponse(
        stream_code_to_english(
            payload, email, is_pro, use_r1, tier, deduct_credit_flag, cooldown
        ),
        media_type="text/event-stream",
    )


@router.post("/code-to-english/sync")
async def function_translate_to_english(
    request: Request,
    payload: CodePayload,
    email: str | None = Depends(get_user_email),
):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(
        payload.raw_code, mode="code-to-english/sync", email=email
    )

    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
        request, email, len(payload.raw_code)
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro

    model_name = "deepseek-reasoner" if use_r1 else "standard"
    key = cache_key(payload.raw_code, payload.language, "code-to-english", model_name)

    cached = await cache.get(key)
    if cached:
        await metrics.record_cache_hit()
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
        return cached

    await metrics.record_cache_miss()

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
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
            save_translation_history_task.delay(
                user_email=email,
                mode="Code → English",
                source_language=payload.language,
                target_language="english",
                input_text=payload.raw_code,
                blocks=result,
                model_used=model_used,
                workspace_id=payload.workspace_id,
                session_id=payload.session_id,
                repository_name=payload.repository_name,
                file_path=payload.file_path,
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
                await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
                save_translation_history_task.delay(
                    user_email=email,
                    mode="Code → English",
                    source_language=payload.language,
                    target_language="english",
                    input_text=payload.raw_code,
                    blocks=stale_result,
                    model_used=model_name,
                    workspace_id=payload.workspace_id,
                    session_id=payload.session_id,
                    repository_name=payload.repository_name,
                    file_path=payload.file_path,
                )
            return stale_result

        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail="Translation engine returned an error. Please try again.",
        )
