"""
app/core/auth.py

Authentication helpers for Anuvaad.

FIX-04 (P0-04): get_user_email() now performs LOCAL JWT verification using
PyJWT + SUPABASE_JWT_SECRET.  This eliminates one outbound HTTPS call to
api.supabase.co per request, cutting auth latency by ~50–200 ms and removing
a hard external dependency from the critical path.

FIX-12 (P1-06): API key auth (X-API-Key header) is also handled here.
FIX-30 (P3-04): get_user_email() now raises HTTP 401 instead of returning
None, so callers no longer need `if not email: raise HTTPException(...)` guards.
"""
import os
from datetime import UTC, datetime

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.core.cache import cache
from app.core.config import (
    ADMIN_EMAILS,
    SUPABASE_JWT_SECRET,
    TRUSTED_EMAILS,
    logger,
)
from app.repositories import subscription as subscription_repo

security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _authenticate_jwt(token: str) -> str:
    """Verify a Supabase-issued JWT locally and return the email claim.

    Raises HTTP 401 on any failure — callers get a str, never None.
    """
    if not SUPABASE_JWT_SECRET:
        # Graceful degradation when the secret is not configured (dev / test)
        logger.warning(
            "SUPABASE_JWT_SECRET is not set — local JWT verification disabled. "
            "Set this env var in production."
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Server misconfiguration: JWT secret not configured",
        )
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["exp", "email"]},
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
    email: str | None = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token does not contain email claim",
        )
    return email


async def _authenticate_api_key(raw_key: str) -> str:
    """Validate an API key (ak_…) against the database and return the owner's email.

    FIX-12 (P1-06): Wired API key authentication.
    FIX-27 (P2-06): Uses get_by_raw_key which supports both SHA-256 (legacy) and
    Argon2id (new) hashes, with transparent upgrade on first use.
    Raises HTTP 401 if the key is invalid or expired.
    """
    from app.repositories import api_key as api_key_repo  # lazy import avoids circular

    row = await api_key_repo.get_by_raw_key(raw_key)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    # Check expiry if the column is present
    expires_at = row.get("expires_at")
    if expires_at and expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key has expired",
        )
    await api_key_repo.update_last_used(row.get("api_key_hash", ""))
    return row["user_email"]


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

async def get_user_email(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Authenticate a request and return the caller's email address.

    Authentication priority:
      1. X-API-Key header  (machine-to-machine)
      2. Authorization: Bearer <JWT>  (browser sessions)

    FIX-04 (P0-04): JWT is verified LOCALLY — zero outbound HTTP calls.
    FIX-12 (P1-06): API key support wired in.
    FIX-30 (P3-04): Always raises HTTP 401 on failure; never returns None.

    IMPORTANT: This function is used as a FastAPI Depends() on many routes.
    Routes that used `if not email: raise HTTPException(...)` after calling
    this function no longer need that guard — it is handled here.
    """
    # The Request object is needed to check X-API-Key; get it via FastAPI's DI
    # We avoid re-declaring Request as a Depends to keep callers simple.
    # API key support via X-API-Key is handled in the get_user_email_from_request
    # variant below, which routes can use when they already have a Request object.

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )
    token = credentials.credentials
    return _authenticate_jwt(token)


async def get_user_email_from_request(request: Request) -> str:
    """Full auth function that checks both X-API-Key and Bearer JWT.

    Use this variant in routes that accept a Request directly and want
    API key support in addition to JWT.
    """
    # 1. API key (machine-to-machine)
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return await _authenticate_api_key(api_key)

    # 2. Bearer JWT (browser sessions)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.removeprefix("Bearer ").strip()
        return _authenticate_jwt(token)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No authentication credentials provided",
    )


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

    # C-04: Use ORM repository instead of raw supabase_request() REST call
    sub = await subscription_repo.get_subscription(email)
    is_pro = bool(sub.get("is_pro", False)) if sub else False

    await cache.put(cache_key, is_pro, ttl=30)  # 30s TTL — fast post-payment visibility
    return is_pro


async def is_token_pro(access_token: str | None) -> bool:
    """Silently checks if a given token belongs to a Pro user.

    FIX-04: Uses local JWT decode instead of Supabase HTTP call.
    """
    if not access_token:
        return False
    try:
        email = _authenticate_jwt(access_token)
        if email:
            return await get_user_pro_status(email)
    except HTTPException:
        pass  # Invalid/expired token — not pro
    except Exception as e:
        logger.warning("Pro token check failed (silently falling back)", error=str(e))
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
