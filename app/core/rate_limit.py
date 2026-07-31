import hashlib

from fastapi import HTTPException, Request

from app.core.auth import get_client_ip
from app.core.cache import cache


def rate_limiter(calls: int, window: int):
    async def _rate_limit_dependency(request: Request):
        # B-01: Use get_client_ip() so TRUST_PROXY_HOPS is honoured on Render.
        # request.client.host is the raw socket IP (always Render's proxy IP in
        # production), which buckets ALL users together under one rate-limit key.
        client_ip = get_client_ip(request)
        auth_header = request.headers.get("Authorization")

        token = None
        if auth_header and auth_header.startswith("Bearer "):
            parts = auth_header.split(" ")
            if len(parts) > 1:
                token = parts[1]

        if token:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            redis_key = f"rate_limit:specific:{request.url.path}:{token_hash}"
        else:
            redis_key = f"rate_limit:specific:{request.url.path}:{client_ip}"

        current_count = await cache.incr_rate_limit(redis_key, window)

        if current_count > calls:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for this endpoint. Max {calls} requests per {window}s.",
                headers={"Retry-After": str(window)}
            )

    return _rate_limit_dependency
