import asyncio
import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

from app.core.audit import generate_audit_receipt
from app.core.auth import (
    get_optional_user_email_from_request,
)
from app.core.auth import (
    get_user_email as get_current_user,
)
from app.core.cache import cache, cache_key
from app.core.config import logger, metrics
from app.core.quota import (
    enforce_quotas_and_protection,
    record_successful_completion,
)
from app.core.rate_limit import rate_limiter
from app.models.schemas import CodePayload
from app.services.ai import (
    SYSTEM_INSTRUCTION,
    find_stale_translation,
    get_completion,
    normalize_blocks,
    stream_code_to_english,
)

from .dependencies import dispatch_history as _dispatch_history
from .dependencies import sanitise_input, validate_code_input

router = APIRouter()


@router.get("/import-gist", dependencies=[Depends(rate_limiter(10, 60))])
async def import_gist_code_to_english(
    url: str,
    file_path: str | None = None,
    user_email: str = Depends(get_current_user),
):
    """Fetch a public GitHub Gist / repository file with authentication and rate-limiting."""
    from app.routers.utility import import_gist

    return await import_gist(url=url, file_path=file_path, user_email=user_email)


@router.post("/code-to-english", response_class=StreamingResponse, dependencies=[Depends(rate_limiter(10, 60))])
async def function_translate_to_english_stream(
    request: Request,
    payload: CodePayload,
    email: str | None = Depends(get_optional_user_email_from_request),
):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(payload.raw_code, mode="code-to-english", email=email)

    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
        request, email, len(payload.raw_code)
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro
    privacy_mode = request.headers.get("X-Anuvaad-Privacy-Mode", "").lower()
    is_ephemeral = privacy_mode == "ephemeral"

    audit_receipt = generate_audit_receipt(email or "anonymous", payload.raw_code)

    headers = {
        "Content-Type": "text/event-stream",
        "X-Anuvaad-Audit-Digest": audit_receipt["audit_digest"],
    }
    if is_ephemeral:
        headers["X-Anuvaad-Privacy"] = "ephemeral; zero-retention"

    return StreamingResponse(
        stream_code_to_english(
            payload, email, is_pro, use_r1, tier, deduct_credit_flag, cooldown, ephemeral=is_ephemeral
        ),
        media_type="text/event-stream",
        headers=headers,
    )


@router.post("/code-to-english/sync")
async def function_translate_to_english(
    request: Request,
    payload: CodePayload,
    background_tasks: BackgroundTasks,
    email: str | None = Depends(get_optional_user_email_from_request),
):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(payload.raw_code, mode="code-to-english/sync", email=email)

    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
        request, email, len(payload.raw_code)
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro
    privacy_mode = request.headers.get("X-Anuvaad-Privacy-Mode", "").lower()
    is_ephemeral = privacy_mode == "ephemeral"

    model_name = "deepseek-reasoner" if use_r1 else "standard"
    key = cache_key(payload.raw_code, payload.language, "code-to-english", model_name)

    audit_receipt = generate_audit_receipt(email or "anonymous", payload.raw_code)
    response_headers = {
        "X-Anuvaad-Audit-Digest": audit_receipt["audit_digest"],
    }
    if is_ephemeral:
        response_headers["X-Anuvaad-Privacy"] = "ephemeral; zero-retention"

    if not is_ephemeral:
        cached = await cache.get(key)
        if cached:
            await metrics.record_cache_hit()
            if email:
                await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
                _dispatch_history(
                    background_tasks,
                    user_email=email,
                    mode="Code → English",
                    source_language=payload.language,
                    target_language="english",
                    input_text=f"[ZDR-PROTECTED: {len(payload.raw_code)} chars | {payload.language}]",
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

    user_prompt = f"Programming Language: {payload.language}\n\nCode to Analyze/Translate:\n{payload.raw_code}"

    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            mode="explanation",
            response_format="json_object",
            use_r1=use_r1,
            source_language=payload.language,
        )
        raw = json.loads(response_text)
        result = normalize_blocks(raw, model_used=model_used, tier=tier)

        if not is_ephemeral:
            await cache.put(key, result, 86400 * 7)

        # Extract source symbols for diagnostics and structured inspection (non-blocking thread)
        try:
            from app.services.ast_parser import extract_symbols as _extract

            source_symbols = await asyncio.to_thread(_extract, payload.raw_code, payload.language)
            logger.debug(f"Code-to-English source symbols extracted: {len(source_symbols)}")
        except Exception as _ve:
            logger.debug(f"Source AST symbol extraction skipped: {_ve}")

        if email:
            await record_successful_completion(email, is_pro, deduct_credit_flag, cooldown)
            if not is_ephemeral:
                _dispatch_history(
                    background_tasks,
                    user_email=email,
                    mode="Code → English",
                    source_language=payload.language,
                    target_language="english",
                    input_text=f"[ZDR-PROTECTED: {len(payload.raw_code)} chars | {payload.language}]",
                    input_hash=audit_receipt["sha256_input_hash"],
                    blocks=result,
                    model_used=model_used,
                    workspace_id=payload.workspace_id,
                    session_id=payload.session_id,
                    repository_name=payload.repository_name,
                    file_path=payload.file_path,
                )

        if is_ephemeral:
            # Memory dereferencing sweep for RAM-only ephemeral privacy
            del user_prompt
            del response_text
            del raw

        return JSONResponse(
            content=result,
            headers=response_headers,
        )
    except Exception as e:
        logger.error(f"Code to English failed: {e!s}")
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
                if not is_ephemeral:
                    _dispatch_history(
                        background_tasks,
                        user_email=email,
                        mode="Code → English",
                        source_language=payload.language,
                        target_language="english",
                        input_text=f"[ZDR-PROTECTED: {len(payload.raw_code)} chars | {payload.language}]",
                        input_hash=audit_receipt["sha256_input_hash"],
                        blocks=stale_result,
                        model_used=model_name,
                        workspace_id=payload.workspace_id,
                        session_id=payload.session_id,
                        repository_name=payload.repository_name,
                        file_path=payload.file_path,
                    )
            if is_ephemeral:
                return JSONResponse(
                    content=stale_result,
                    headers={"X-Anuvaad-Privacy": "ephemeral; zero-retention"},
                )
            return stale_result

        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail="Translation engine returned an error. Please try again.",
        )
