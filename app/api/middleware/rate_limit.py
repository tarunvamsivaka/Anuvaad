"""
app/api/middleware/rate_limit.py

Per-IP and per-token sliding-window rate limiting middleware.
Extracted from app/main.py.

SEC-08:  Localhost bypass is only active outside production.
SEC-RL-01 (H2): IP bucket is ALWAYS counted first. Token bucket is applied on
             top as a supplemental per-user cap only when a bearer token is
             present. An unverified / rotated bearer token no longer escapes
             the IP limit by jumping to the higher token bucket.
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
    """Enforce sliding-window rate limits per IP and optionally per token.

    SEC-RL-01: The IP bucket is ALWAYS incremented and checked first.
    Authenticated requests (with a Bearer token) additionally get a higher-cap
    per-token bucket checked on top of the IP bucket.

    This prevents clients from escaping the IP limit by supplying arbitrary
    (unverified) bearer tokens — a previously exploitable bypass.
    """
    if not request.url.path.startswith("/api/"):
        return await call_next(request)

    if request.method == "OPTIONS":
        return await call_next(request)

    client_ip = get_client_ip(request)
    # SEC-08: Only bypass rate limiting for localhost in non-production environments.
    if client_ip == "127.0.0.1" and not IS_PRODUCTION:
        return await call_next(request)

    # ── Step 1: ALWAYS enforce the IP bucket ─────────────────────────────────
    ip_key = f"rate_limit:{client_ip}"
    ip_count = await cache.incr_rate_limit(ip_key, RATE_LIMIT_WINDOW)

    if ip_count > RATE_LIMIT_IP_MAX:
        return JSONResponse(
            status_code=429,
            content={
                "detail": f"Rate limit exceeded. Max {RATE_LIMIT_IP_MAX} requests per {RATE_LIMIT_WINDOW}s.",
                "limit_type": "rpm_limit",
                "retry_after_seconds": RATE_LIMIT_WINDOW,
                "tier_limit": RATE_LIMIT_IP_MAX,
            },
            headers={
                "X-RateLimit-Limit": str(RATE_LIMIT_IP_MAX),
                "X-RateLimit-Remaining": "0",
                "Retry-After": str(RATE_LIMIT_WINDOW),
            },
        )

    # ── Step 2: Supplemental per-token bucket for authenticated users ─────────
    # We hash the raw token as a bucket key. The token is NOT verified here —
    # auth verification happens in route dependencies. This bucket merely gives
    # authenticated users a higher per-session allowance on top of the IP cap.
    auth_header = request.headers.get("Authorization")
    token_hash = None
    if auth_header and auth_header.startswith("Bearer "):
        raw_token = auth_header[len("Bearer ") :].strip()
        if raw_token:
            token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    if token_hash:
        token_key = f"rate_limit:token:{token_hash}"
        token_count = await cache.incr_rate_limit(token_key, RATE_LIMIT_WINDOW)
        if token_count > RATE_LIMIT_USER_MAX:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded. Max {RATE_LIMIT_USER_MAX} requests per {RATE_LIMIT_WINDOW}s.",
                    "limit_type": "user_daily_limit",
                    "retry_after_seconds": RATE_LIMIT_WINDOW,
                    "tier_limit": RATE_LIMIT_USER_MAX,
                },
                headers={
                    "X-RateLimit-Limit": str(RATE_LIMIT_USER_MAX),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": str(RATE_LIMIT_WINDOW),
                },
            )
        effective_limit = RATE_LIMIT_USER_MAX
        effective_remaining = max(0, RATE_LIMIT_USER_MAX - token_count)
    else:
        effective_limit = RATE_LIMIT_IP_MAX
        effective_remaining = max(0, RATE_LIMIT_IP_MAX - ip_count)

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(effective_limit)
    response.headers["X-RateLimit-Remaining"] = str(effective_remaining)
    return response
