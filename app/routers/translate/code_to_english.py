from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.core.auth import get_user_email as get_current_user
from app.core.auth import get_user_email_from_request
from app.core.quota import enforce_quotas_and_protection
from app.core.rate_limit import rate_limiter
from app.models.schemas import CodePayload
from app.services.ai import (
    process_code_to_english_sync,
    stream_code_to_english,
)

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
    email: str | None = Depends(get_user_email_from_request),
):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(payload.raw_code, mode="code-to-english", email=email)

    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
        request, email, len(payload.raw_code)
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro

    return StreamingResponse(
        stream_code_to_english(payload, email, is_pro, use_r1, tier, deduct_credit_flag, cooldown),
        media_type="text/event-stream",
    )


@router.post("/code-to-english/sync")
async def function_translate_to_english(
    request: Request,
    payload: CodePayload,
    email: str | None = Depends(get_user_email_from_request),
):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(payload.raw_code, mode="code-to-english/sync", email=email)

    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
        request, email, len(payload.raw_code)
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro

    return await process_code_to_english_sync(
        payload=payload,
        email=email,
        is_pro=is_pro,
        use_r1=use_r1,
        tier=tier,
        deduct_credit_flag=deduct_credit_flag,
        cooldown=cooldown,
    )
