import json
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.core.config import logger, metrics
from app.core.rate_limit import rate_limiter
from app.core.cache import cache, cache_key
from app.core.auth import get_user_email
from app.core.quota import enforce_quotas_and_protection, record_successful_completion
from app.queue.tasks import save_translation_history_task
from app.models.schemas import GeneratePayload, EnglishUpdatePayload, SyncEnglishToCodePayload
from app.services.ai import (
    get_completion,
    normalize_blocks,
    find_stale_translation,
    SYSTEM_INSTRUCTION,
    SYNC_SYSTEM_INSTRUCTION,
)
from .dependencies import sanitise_input, validate_code_input

router = APIRouter()

@router.post("/generate-from-english")
async def function_generate_from_english(
    request: Request,
    payload: GeneratePayload,
    email: str | None = Depends(get_user_email),
):
    validate_code_input(payload.prompt)
    payload.prompt = sanitise_input(
        payload.prompt, mode="generate-from-english", email=email
    )

    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
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
        await metrics.record_cache_hit()
        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
            save_translation_history_task.delay(
                user_email=email,
                mode="English → Code",
                source_language="english",
                target_language=payload.language,
                input_text=payload.prompt,
                blocks=cached,
                model_used=model_name,
                workspace_id=payload.workspace_id,
                session_id=payload.session_id,
                repository_name=payload.repository_name,
                file_path=payload.file_path,
            )
        return cached

    await metrics.record_cache_miss()

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
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
            save_translation_history_task.delay(
                user_email=email,
                mode="English → Code",
                source_language="english",
                target_language=payload.language,
                input_text=payload.prompt,
                blocks=result,
                model_used=model_used,
                workspace_id=payload.workspace_id,
                session_id=payload.session_id,
                repository_name=payload.repository_name,
                file_path=payload.file_path,
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
                await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
                save_translation_history_task.delay(
                    user_email=email,
                    mode="English → Code",
                    source_language="english",
                    target_language=payload.language,
                    input_text=payload.prompt,
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
            status_code=500, detail="Code generation failed. Please try again."
        )


@router.post(
    "/english-to-code",
    dependencies=[Depends(rate_limiter(10, 60))]
)
async def function_update_to_code(
    request: Request,
    payload: EnglishUpdatePayload,
    email: str | None = Depends(get_user_email),
):
    # SEC-06: Sanitise all free-text fields before sending to LLM
    payload.modified_english = sanitise_input(
        payload.modified_english, mode="english-to-code", email=email
    )
    if payload.full_context:
        payload.full_context = sanitise_input(
            payload.full_context, mode="english-to-code/context", email=email
        )
    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
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
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
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
    email: str | None = Depends(get_user_email),
):
    # SEC-07: Sanitise every block's english_translation before sending to LLM
    for block in payload.blocks:
        block.english_translation = sanitise_input(
            block.english_translation, mode="sync-english-to-code", email=email
        )

    char_count = sum(len(b.code_snippet) for b in payload.blocks)
    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
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
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
            save_translation_history_task.delay(
                user_email=email,
                mode="Two-Way Sync",
                source_language=payload.language,
                target_language="english",
                input_text=updated_code,
                blocks=normalized_blocks,
                model_used=model_used,
                workspace_id=payload.workspace_id,
                session_id=payload.session_id,
                repository_name=payload.repository_name,
                file_path=payload.file_path,
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
