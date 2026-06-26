from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse
from app.core.auth import get_user_email
from app.core.quota import enforce_quotas_and_protection
from app.core.rate_limit import rate_limiter
from app.models.schemas import CodeToCodePayload
from app.services.ai import stream_code_to_code
from .dependencies import sanitise_input, validate_code_input

router = APIRouter()

@router.post(
    "/code-to-code",
    response_class=StreamingResponse,
    dependencies=[Depends(rate_limiter(10, 60))]
)
async def function_code_to_code(
    request: Request,
    payload: CodeToCodePayload,
    email: str | None = Depends(get_user_email),
):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(
        payload.raw_code, mode="code-to-code", email=email
    )

    is_pro, daily_limit, deduct_credit_flag, cooldown = await enforce_quotas_and_protection(
        request, email, len(payload.raw_code)
    )

    tier = "pro" if is_pro else "free"
    use_r1 = is_pro

    return StreamingResponse(
        stream_code_to_code(
            payload, email, is_pro, use_r1, tier, deduct_credit_flag, cooldown
        ),
        media_type="text/event-stream",
    )
