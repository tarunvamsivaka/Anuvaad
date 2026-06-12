import hashlib
import httpx
from datetime import datetime, timezone
from fastapi import Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import (
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    logger,
    get_http_client,
)
from app.core.database import supabase_request
from app.core.cache import cache

security = HTTPBearer(auto_error=False)


async def get_user_email(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str | None:
    if not credentials:
        return None
    token = credentials.credentials
    # 1. Check if it's an API Key (starts with 'ak_')
    if token.startswith("ak_"):
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        api_key_data = await supabase_request(
            "GET", f"api_keys?api_key_hash=eq.{token_hash}&select=user_email"
        )
        if api_key_data and isinstance(api_key_data, dict):
            # Update last_used_at
            await supabase_request(
                "PATCH",
                f"api_keys?api_key_hash=eq.{token_hash}",
                {"last_used_at": datetime.now(timezone.utc).isoformat()},
            )
            email = api_key_data.get("user_email")
            return email
        return None

    # 2. Otherwise assume it's a Supabase JWT
    try:
        client = await get_http_client()
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY},
        )
        if resp.status_code == 200:
            user_data = resp.json()
            email = user_data.get("email")
            return email
    except Exception as e:
        logger.error(f"JWT verification error: {e}")
    return None


async def get_user_pro_status(email: str) -> bool:
    """Check if a user has an active Pro subscription or whitelist status.
    ARCH-01: sys.modules DI anti-pattern removed. Tests should monkeypatch
    this function directly via conftest.py instead.
    """
    if not email:
        return False

    import os
    admin_emails = [
        e.strip().lower() for e in os.getenv("ADMIN_USERS", "").split(",") if e.strip()
    ]
    trusted_emails = [
        e.strip().lower()
        for e in os.getenv("TRUSTED_USERS", "").split(",")
        if e.strip()
    ]
    if email.lower() in admin_emails or email.lower() in trusted_emails:
        return True

    cache_key = f"user_pro_status:{email}"
    cached = await cache.get(cache_key)
    if cached is not None:
        return bool(cached)

    sub = await supabase_request(
        "GET", f"user_subscriptions?user_email=eq.{email}&select=is_pro"
    )
    is_pro = False
    if sub and isinstance(sub, dict):
        is_pro = bool(sub.get("is_pro", False))

    await cache.put(cache_key, is_pro, ttl=30)  # 30s TTL — FRONT-08: fast post-payment visibility
    return is_pro


async def is_token_pro(access_token: str | None) -> bool:
    """Silently checks if a given token belongs to a Pro user."""
    if not access_token:
        return False
    try:
        # BACK-04: Use shared HTTP client singleton instead of creating a new one per call
        client = await get_http_client()
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": SUPABASE_ANON_KEY,
            },
        )
        if resp.status_code == 200:
            email = resp.json().get("email")
            if email:
                return await get_user_pro_status(email)
    except Exception as e:
        logger.warning(f"Pro token check failed (silently falling back): {e}")
    return False


def get_client_ip(request: Request) -> str:
    """Extract client IP from X-Forwarded-For header if behind a reverse proxy, fallback to client host."""
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
