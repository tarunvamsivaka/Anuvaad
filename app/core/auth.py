import hashlib
import os
from datetime import datetime, timezone
from fastapi import Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import (
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    ADMIN_EMAILS,
    TRUSTED_EMAILS,
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
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    # C-1: Cache token → email to reduce Supabase round-trips
    cache_key_token = f"token_email:{token_hash}"
    cached_email = await cache.get(cache_key_token)
    if cached_email is not None:
        # ""-sentinel means "token was invalid, don't retry"
        return cached_email if cached_email else None

    # 1. Check if it's an API Key (starts with 'ak_')
    if token.startswith("ak_"):
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
            email = api_key_data.get("user_email") or ""
            await cache.put(cache_key_token, email, ttl=60)
            return email or None
        await cache.put(cache_key_token, "", ttl=60)  # cache negative result
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
            email = user_data.get("email") or ""
            await cache.put(cache_key_token, email, ttl=60)
            return email or None
    except Exception as e:
        logger.error(f"JWT verification error: {e}")
    await cache.put(cache_key_token, "", ttl=30)  # short TTL on errors
    return None


async def get_user_pro_status(email: str) -> bool:
    """Check if a user has an active Pro subscription or whitelist status."""
    if not email:
        return False

    # H-7: Use ADMIN_EMAILS/TRUSTED_EMAILS frozensets parsed once at startup (O(1) lookup)
    if email.lower() in ADMIN_EMAILS or email.lower() in TRUSTED_EMAILS:
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

    await cache.put(cache_key, is_pro, ttl=30)  # 30s TTL — fast post-payment visibility
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
    """Safely extract the originating client IP.

    BUG#10 FIX: Naively trusting X-Forwarded-For allows IP spoofing.
    We now only trust that header when the direct connection arrives from
    a known proxy/load-balancer IP listed in TRUSTED_PROXIES env var.

    TRUSTED_PROXIES should list your load-balancer IPs, e.g.:
    TRUSTED_PROXIES=10.0.0.1,10.0.0.2

    If TRUSTED_PROXIES is not set, we fall through to the socket IP.
    """
    trusted_proxies: frozenset[str] = frozenset(
        ip.strip()
        for ip in os.getenv("TRUSTED_PROXIES", "").split(",")
        if ip.strip()
    )
    direct_ip = request.client.host if request.client else "unknown"
    if trusted_proxies and direct_ip in trusted_proxies:
        x_forwarded_for = request.headers.get("x-forwarded-for", "")
        if x_forwarded_for:
            # The rightmost IP before our proxy is the true client IP
            # (the proxy appends its own IP last; the leftmost can be spoofed)
            ips = [ip.strip() for ip in x_forwarded_for.split(",")]
            return ips[-1] if ips else direct_ip
    return direct_ip
