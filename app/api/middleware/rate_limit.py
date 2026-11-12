"""Global rate limiting using verified user identity or the client IP."""

import hashlib
import os

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.auth import get_client_ip, get_optional_user_email_from_request, security
from app.core.cache import cache
from app.core.config import IS_PRODUCTION

RATE_LIMIT_WINDOW = 60
RATE_LIMIT_IP_MAX = int(os.getenv("RATE_LIMIT_IP_MAX", "50"))
RATE_LIMIT_USER_MAX = int(os.getenv("RATE_LIMIT_USER_MAX", "200"))


async def rate_limit_middleware(request: Request, call_next):
    """Apply the anonymous IP cap or the authenticated user cap per minute.

    The user allowance is selected only after JWT/API-key validation. Invalid
    credentials remain in the stricter IP bucket and cannot raise their cap by
    rotating arbitrary bearer tokens.
    """
    if not request.url.path.startswith("/api/") or request.method == "OPTIONS":
        return await call_next(request)
    # Providers authenticate these callbacks with signed payloads; shared
    # egress IPs and retry storms must not consume interactive client buckets.
    if "/webhook/" in request.url.path:
        return await call_next(request)

    client_ip = get_client_ip(request)
    credentials = await security(request)
    user_email = await get_optional_user_email_from_request(request, credentials=credentials)
    if client_ip == "127.0.0.1" and not IS_PRODUCTION and not user_email:
        return await call_next(request)
    if user_email:
        request.state.authenticated_email = user_email
        identity = hashlib.sha256(user_email.strip().lower().encode()).hexdigest()
        bucket_key = f"rate_limit:user:{identity}"
        limit = RATE_LIMIT_USER_MAX
        limit_type = "user_daily_limit"
    else:
        bucket_key = f"rate_limit:{client_ip}"
        limit = RATE_LIMIT_IP_MAX
        limit_type = "rpm_limit"

    count = await cache.incr_rate_limit(bucket_key, RATE_LIMIT_WINDOW)
    if count > limit:
        return JSONResponse(
            status_code=429,
            content={
                "detail": f"Rate limit exceeded. Max {limit} requests per {RATE_LIMIT_WINDOW}s.",
                "limit_type": limit_type,
                "retry_after_seconds": RATE_LIMIT_WINDOW,
                "tier_limit": limit,
            },
            headers={
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "Retry-After": str(RATE_LIMIT_WINDOW),
            },
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(max(0, limit - count))
    return response
