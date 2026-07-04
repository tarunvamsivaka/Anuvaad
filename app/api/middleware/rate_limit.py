"""
app/api/middleware/rate_limit.py

Per-IP and per-token sliding-window rate limiting middleware.
Extracted from app/main.py.

SEC-08: Localhost bypass is only active outside production.
"""
import hashlib
import os

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.auth import get_client_ip
from app.core.cache import cache
from app.core.config import IS_PRODUCTION

RATE_LIMIT_WINDOW = 60
RATE_LIMIT_IP_MAX: int = int(os.getenv("RATE_LIMIT_IP_MAX", "50"))
RATE_LIMIT_USER_MAX: int = int(os.getenv("RATE_LIMIT_USER_MAX", "200"))


async def rate_limit_middleware(request: Request, call_next):
    """Enforce sliding-window rate limits per IP (unauthenticated) or per token (authenticated)."""
    if not request.url.path.startswith("/api/"):
        return await call_next(request)

    if request.method == "OPTIONS":
        return await call_next(request)

    client_ip = get_client_ip(request)
    # SEC-08: Only bypass rate limiting for localhost in non-production environments.
    if client_ip == "127.0.0.1" and not IS_PRODUCTION:
        return await call_next(request)

    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        parts = auth_header.split(" ")
        if len(parts) > 1:
            token = parts[1]

    if token:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        redis_key = f"rate_limit:token:{token_hash}"
        limit = RATE_LIMIT_USER_MAX
    else:
        redis_key = f"rate_limit:{client_ip}"
        limit = RATE_LIMIT_IP_MAX

    current_count = await cache.incr_rate_limit(redis_key, RATE_LIMIT_WINDOW)

    if current_count > limit:
        return JSONResponse(
            status_code=429,
            content={
                "detail": f"Rate limit exceeded. Max {limit} requests per {RATE_LIMIT_WINDOW}s."
            },
            headers={
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "Retry-After": str(RATE_LIMIT_WINDOW),
            },
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(max(0, limit - current_count))
    return response
