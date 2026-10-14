import asyncio
import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from app.core.audit import generate_audit_receipt
from app.core.auth import get_optional_user_email_from_request
from app.core.cache import cache, cache_key
from app.core.config import logger, metrics
from app.core.quota import (
    enforce_quotas_and_protection,
    record_successful_completion,
)
from app.core.rate_limit import rate_limiter
from app.models.schemas import (
    EnglishUpdatePayload,
    GeneratePayload,
    SyncEnglishToCodePayload,
)
from app.services.ai import (
    SYNC_SYSTEM_INSTRUCTION,
    SYSTEM_INSTRUCTION,
    find_stale_translation,
    get_completion,
    normalize_blocks,
)

from .dependencies import dispatch_history as _dispatch_history
from .dependencies import sanitise_input, validate_code_input

router = APIRouter()


async def _require_valid_generated_code(code: str, language: str) -> None:
    """Reject generated code unless Tree-sitter can validate its syntax."""
    try:
        from app.services.ast_parser import is_language_supported, verify_translation

        supported = await asyncio.to_thread(is_language_supported, language)
        if not supported:
            raise HTTPException(status_code=422, detail="Syntax validation is unavailable for this language.")
        verification = await asyncio.to_thread(verify_translation, "", "english", code, language)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Generated code validation failed for %s: %s", language, exc)
        raise HTTPException(status_code=422, detail="Generated code could not be validated. Please retry.") from exc

    if verification.has_parse_errors_in_target:
        logger.warning("Generated code did not pass syntax validation for %s", language)
        raise HTTPException(status_code=422, detail="Generated code did not pass syntax validation. Please retry.")


@router.post("/generate-from-english")
async def function_generate_from_english(
    request: Request,
    payload: GeneratePayload,
    background_tasks: BackgroundTasks,
    email: str | None = Depends(get_optional_user_email_from_request),
):
    validate_code_input(payload.prompt)
    payload.prompt = sanitise_input(payload.prompt, mode="generate-from-english", email=email)

    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
        request, email, len(payload.prompt)
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro
    privacy_mode = request.headers.get("X-Anuvaad-Privacy-Mode", "").lower()
    is_ephemeral = privacy_mode == "ephemeral"

    audit_receipt = generate_audit_receipt(email or "anonymous", payload.prompt)
    response_headers = {
        "X-Anuvaad-Audit-Digest": audit_receipt["audit_digest"],
    }
    if is_ephemeral:
        response_headers["X-Anuvaad-Privacy"] = "ephemeral; application-history-and-cache-skipped"

    model_name = "deepseek-reasoner" if use_r1 else "standard"
    key = cache_key(payload.prompt, payload.language, "generate-from-english", model_name)

    if not is_ephemeral:
        cached = await cache.get(key)
        if cached:
            cached_code = "\n".join(block.get("code_snippet", "") for block in cached if isinstance(block, dict))
            try:
                await _require_valid_generated_code(cached_code, payload.language)
            except HTTPException as validation_error:
                if "did not pass syntax validation" not in str(validation_error.detail):
                    raise
                logger.warning("Discarding cached code that failed syntax validation for %s", payload.language)
                await cache.delete(key)
                cached = None

        if cached:
            await metrics.record_cache_hit()
            if email:
                await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
                _dispatch_history(
                    background_tasks,
                    user_email=email,
                    mode="English → Code",
                    source_language="english",
                    target_language=payload.language,
                    input_text=f"[ZDR-PROTECTED: {len(payload.prompt)} chars | english → {payload.language}]",
                    input_hash=audit_receipt["sha256_input_hash"],
                    blocks=cached,
                    model_used=model_name,
                    workspace_id=payload.workspace_id,
                    session_id=payload.session_id,
                    repository_name=payload.repository_name,
                    file_path=payload.file_path,
                )
            return JSONResponse(content=cached, headers=response_headers)

    await metrics.record_cache_miss()

    user_prompt = f"Programming Language: {payload.language}\n\nUser Request:\n{payload.prompt}\n\nFirst, generate the complete, working code to satisfy this request. Then, analyze your generated code and break it down into logical blocks using the system instructions."

    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            mode="explanation",
            response_format="json_object",
            use_r1=use_r1,
            source_language="",  # English text is the source — no AST contract
            ephemeral=is_ephemeral,
        )
        raw = json.loads(response_text)
        result = normalize_blocks(raw, model_used=model_used, tier=tier)
        generated_code = "\n".join(block.get("code_snippet", "") for block in result if isinstance(block, dict))
        await _require_valid_generated_code(generated_code, payload.language)

        if not is_ephemeral:
            await cache.put(key, result, 86400 * 7)

        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
            if not is_ephemeral:
                _dispatch_history(
                    background_tasks,
                    user_email=email,
                    mode="English → Code",
                    source_language="english",
                    target_language=payload.language,
                    input_text=f"[ZDR-PROTECTED: {len(payload.prompt)} chars | english → {payload.language}]",
                    input_hash=audit_receipt["sha256_input_hash"],
                    blocks=result,
                    model_used=model_used,
                    workspace_id=payload.workspace_id,
                    session_id=payload.session_id,
                    repository_name=payload.repository_name,
                    file_path=payload.file_path,
                )

        if is_ephemeral:
            del user_prompt
            del response_text
            del raw

        return JSONResponse(content=result, headers=response_headers)
    except Exception as e:
        logger.error("Generate from English failed", error_type=type(e).__name__)
        if is_ephemeral:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=503, detail="Code generation is temporarily unavailable. Please retry."
            ) from e
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
                _dispatch_history(
                    background_tasks,
                    user_email=email,
                    mode="English → Code",
                    source_language="english",
                    target_language=payload.language,
                    input_text=f"[ZDR-PROTECTED: {len(payload.prompt)} chars | english → {payload.language}]",
                    input_hash=audit_receipt["sha256_input_hash"],
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
        raise HTTPException(status_code=500, detail="Code generation failed. Please try again.")


@router.post("/english-to-code", dependencies=[Depends(rate_limiter(10, 60))])
async def function_update_to_code(
    request: Request,
    payload: EnglishUpdatePayload,
    email: str | None = Depends(get_optional_user_email_from_request),
):
    # SEC-06: Sanitise all free-text fields before sending to LLM
    payload.modified_english = sanitise_input(payload.modified_english, mode="english-to-code", email=email)
    if payload.full_context:
        payload.full_context = sanitise_input(payload.full_context, mode="english-to-code/context", email=email)
    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
        request, email, len(payload.modified_english)
    )
    is_ephemeral = request.headers.get("X-Anuvaad-Privacy-Mode", "").lower() == "ephemeral"
    user_prompt = f"You are an expert programmer. The user is modifying a specific part of their code based on an English instruction. Here is the full context of the code: {payload.full_context}. The user wants to change the block identified as {payload.block_id} to do the following: '{payload.modified_english}'. Generate ONLY the new raw programming syntax required to fulfill this specific instruction. Do not include markdown formatting, backticks, or explanations. Return strictly the raw code."

    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction="You are an expert programmer. Only output raw code without markdown formatting.",
            mode="translation",
            response_format="text",
            ephemeral=is_ephemeral,
        )
        await _require_valid_generated_code(response_text.strip(), payload.language)
        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)

        audit_receipt = generate_audit_receipt(email or "anonymous", payload.modified_english)
        response_headers = {"X-Anuvaad-Audit-Digest": audit_receipt["audit_digest"]}
        if is_ephemeral:
            response_headers["X-Anuvaad-Privacy"] = "ephemeral; application-history-and-cache-skipped"
        return JSONResponse(
            content={
                "status": "success",
                "updated_code": response_text.strip(),
                "model_used": model_used,
            },
            headers=response_headers,
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error("Code update failed (%s)", type(e).__name__)
        raise HTTPException(status_code=500, detail="Code update failed. Please try again.")


@router.post("/sync-english-to-code")
async def function_sync_english_to_code(
    request: Request,
    payload: SyncEnglishToCodePayload,
    background_tasks: BackgroundTasks,
    email: str | None = Depends(get_optional_user_email_from_request),
):
    # SEC-07: Sanitise every block's english_translation before sending to LLM
    for block in payload.blocks:
        block.english_translation = sanitise_input(block.english_translation, mode="sync-english-to-code", email=email)

    char_count = sum(len(b.code_snippet) for b in payload.blocks)
    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(request, email, char_count)

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro
    privacy_mode = request.headers.get("X-Anuvaad-Privacy-Mode", "").lower()
    is_ephemeral = privacy_mode == "ephemeral"

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
            source_language=payload.language,  # inject contract for the target language
            ephemeral=is_ephemeral,
        )

        raw = json.loads(response_text)
        updated_code = raw.get("updated_code", "")
        raw_blocks = raw.get("blocks", [])

        normalized_blocks = normalize_blocks(raw_blocks, model_used=model_used, tier=tier)

        # Sprint 1 wiring: verify structural coherence of the generated code
        verification_meta: dict = {}
        try:
            from app.services.ast_parser import verify_translation as _verify

            source_code = json.dumps(blocks_formatted)
            vr = await asyncio.to_thread(_verify, source_code, "english", updated_code, payload.language)
            verification_meta = {
                "structural_similarity": round(vr.structural_similarity, 3),
                "has_parse_errors": vr.has_parse_errors_in_target,
                "warnings": vr.warnings,
            }
            if vr.has_parse_errors_in_target:
                logger.warning(
                    "Parse errors detected in sync-english-to-code output",
                    language=payload.language,
                    score=vr.structural_similarity,
                )
                raise HTTPException(
                    status_code=422,
                    detail="Generated code did not pass syntax validation. Please retry.",
                )
        except Exception as _ve:
            if isinstance(_ve, HTTPException):
                raise
            logger.warning("Generated code validation failed in sync: %s", _ve)
            raise HTTPException(
                status_code=422,
                detail="Generated code could not be validated. Please retry.",
            ) from _ve

        audit_receipt = generate_audit_receipt(email or "anonymous", updated_code or user_prompt)
        response_headers = {
            "X-Anuvaad-Audit-Digest": audit_receipt["audit_digest"],
        }
        if is_ephemeral:
            response_headers["X-Anuvaad-Privacy"] = "ephemeral; application-history-and-cache-skipped"

        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
            if not is_ephemeral:
                _dispatch_history(
                    background_tasks,
                    user_email=email,
                    mode="Two-Way Sync",
                    source_language=payload.language,
                    target_language="english",
                    input_text=(f"[ZDR-PROTECTED: {len(updated_code)} chars | {payload.language}→english]"),
                    input_hash=audit_receipt["audit_digest"],
                    blocks=normalized_blocks,
                    model_used=model_used,
                    workspace_id=payload.workspace_id,
                    session_id=payload.session_id,
                    repository_name=payload.repository_name,
                    file_path=payload.file_path,
                )

        return JSONResponse(
            content={
                "status": "success",
                "updated_code": updated_code,
                "blocks": normalized_blocks,
                "model_used": model_used,
                "verification": verification_meta,
            },
            headers=response_headers,
        )
    except Exception as e:
        logger.error("Sync English to Code failed (%s)", type(e).__name__)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Synchronization failed. Please try again.")
