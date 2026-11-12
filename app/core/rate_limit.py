import hashlib
import hmac

from fastapi import HTTPException, Request

from app.core.auth import get_client_ip, get_optional_user_email_from_request, security
from app.core.cache import cache
from app.core.config import AUDIT_HMAC_KEY


def hash_rate_limit_identity(identity: str) -> str:
    """Return a keyed pseudonym so cache keys do not expose account emails."""
    normalized_identity = identity.strip().lower().encode()
    # HMAC creates Redis bucket pseudonyms; it is not password storage or verification.
    return hmac.new(
        AUDIT_HMAC_KEY.encode(),
        b"rate-limit:user:" + normalized_identity,
        hashlib.sha256,
    ).hexdigest()


def rate_limiter(calls: int, window: int):
    async def _rate_limit_dependency(request: Request):
        # B-01: Use get_client_ip() so TRUST_PROXY_HOPS is honoured on Render.
        # request.client.host is the raw socket IP (always Render's proxy IP in
        # production), which buckets ALL users together under one rate-limit key.
        client_ip = get_client_ip(request)
        credentials = await security(request)
        user_email = await get_optional_user_email_from_request(request, credentials=credentials)

        if user_email:
            identity_hash = hash_rate_limit_identity(user_email)
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
