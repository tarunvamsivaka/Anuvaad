import asyncio
import hashlib

from fastapi import HTTPException, Request

from app.core.auth import get_client_ip, get_optional_user_email_from_request, security
from app.core.cache import cache
from app.core.config import AUDIT_HMAC_KEY


def hash_rate_limit_identity(identity: str) -> str:
    """Return a keyed pseudonym so cache keys do not expose account emails."""
    normalized_identity = identity.strip().lower().encode()
    # scrypt prevents recovery of account emails from leaked Redis key names.
    return hashlib.scrypt(
        normalized_identity,
        salt=b"rate-limit:user:" + AUDIT_HMAC_KEY.encode(),
        n=2**12,
        r=8,
        p=1,
        dklen=32,
        maxmem=16 * 1024 * 1024,
    ).hex()


def rate_limiter(calls: int, window: int):
    async def _rate_limit_dependency(request: Request):
        # B-01: Use get_client_ip() so TRUST_PROXY_HOPS is honoured on Render.
        # request.client.host is the raw socket IP (always Render's proxy IP in
        # production), which buckets ALL users together under one rate-limit key.
        client_ip = get_client_ip(request)
        credentials = await security(request)
        user_email = await get_optional_user_email_from_request(request, credentials=credentials)

        if user_email:
            identity_hash = await asyncio.to_thread(hash_rate_limit_identity, user_email)
            redis_key = f"rate_limit:specific:{request.url.path}:user:{identity_hash}"
        else:
            redis_key = f"rate_limit:specific:{request.url.path}:{client_ip}"

        current_count = await cache.incr_rate_limit(redis_key, window)

        if current_count > calls:
            raise HTTPException(
                status_code=429,
                detail={
                    "detail": f"Rate limit exceeded for this endpoint. Max {calls} requests per {window}s.",
                    "limit_type": "rpm_limit",
                    "retry_after_seconds": window,
                    "tier_limit": calls,
                },
                headers={"Retry-After": str(window)},
            )

    return _rate_limit_dependency
