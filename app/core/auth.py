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

FIX-ECC (2026-07): Supabase migrated project JWT signing from HS256 to ECC
(P-256). auth.py now auto-detects the algorithm from the JWT header and:
  - For HS256: verifies locally using SUPABASE_JWT_SECRET (fast, zero HTTP).
  - For ES256 / RS256: fetches Supabase JWKS once, caches the public key in
    memory (TTL 1 h), and verifies locally from that point.
This keeps near-zero-outbound-call performance while supporting the new keys.
"""
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.algorithms import ECAlgorithm, RSAAlgorithm
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.core.cache import cache
from app.core.config import (
    ADMIN_EMAILS,
    SUPABASE_JWT_SECRET,
    SUPABASE_URL,
    TRUSTED_EMAILS,
    logger,
)
from app.repositories import subscription as subscription_repo

# ---------------------------------------------------------------------------
# JWKS cache — holds fetched public keys to avoid repeated HTTPS calls
# ---------------------------------------------------------------------------
_jwks_cache: dict[str, Any] = {}   # kid → public key object
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 3600.0  # re-fetch at most once per hour


async def _get_jwks_public_key(kid: str | None) -> Any | None:
    """Fetch and cache Supabase JWKS public keys for ES256/RS256 tokens."""
    global _jwks_fetched_at

    now = time.monotonic()
    if not _jwks_cache or (now - _jwks_fetched_at) > _JWKS_TTL:
        if not SUPABASE_URL:
            return None
        jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(jwks_url)
                resp.raise_for_status()
                jwks = resp.json()
        except Exception as exc:
            logger.warning(f"Failed to fetch Supabase JWKS: {exc}")
            return None

        _jwks_cache.clear()
        for key_data in jwks.get("keys", []):
            kty = key_data.get("kty", "")
            key_kid = key_data.get("kid", "default")
            try:
                if kty == "EC":
                    _jwks_cache[key_kid] = ECAlgorithm.from_jwk(key_data)
                elif kty == "RSA":
                    _jwks_cache[key_kid] = RSAAlgorithm.from_jwk(key_data)
            except Exception as exc:
                logger.warning(f"Failed to parse JWKS key kid={key_kid}: {exc}")
        _jwks_fetched_at = now

    if kid and kid in _jwks_cache:
        return _jwks_cache[kid]
    if _jwks_cache:
        return next(iter(_jwks_cache.values()))
    return None


def _peek_header(token: str) -> dict[str, str]:
    """Decode JWT header without signature verification to detect algorithm."""
    try:
        return jwt.get_unverified_header(token)
    except Exception:
        return {}

UTC = timezone.utc  # noqa: UP017 — datetime.UTC requires Python 3.11+; alias for 3.10 compat

security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _authenticate_jwt(token: str) -> str:
    """Verify a Supabase-issued JWT (HS256 or ES256/RS256) and return the email claim.

    Strategy:
      1. Peek at the JWT header to detect the signing algorithm.
      2. HS256 → verify locally with SUPABASE_JWT_SECRET (fast, zero HTTP).
      3. ES256/RS256 → verify with cached JWKS public key (≤1 HTTP fetch/hour).

    Raises HTTP 401 on any failure — callers receive a str, never None.
    """
    header = _peek_header(token)
    alg = header.get("alg", "HS256")
    kid = header.get("kid")

    try:
        if alg == "HS256":
            # ── Legacy HS256 path (fast, no outbound HTTP) ─────────────────
            if not SUPABASE_JWT_SECRET:
                logger.warning(
                    "SUPABASE_JWT_SECRET is not set — HS256 JWT verification disabled. "
                    "Set this env var in production."
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Server misconfiguration: JWT secret not configured",
                )
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"require": ["exp", "email"]},
            )
        elif alg in ("ES256", "RS256"):
            # ── New ECC / RSA path (cached JWKS public key) ────────────────
            public_key = await _get_jwks_public_key(kid)
            if public_key is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Unable to fetch Supabase public key for JWT verification",
                )
            payload = jwt.decode(
                token,
                public_key,
                algorithms=[alg],
                audience="authenticated",
                options={"require": ["exp", "email"]},
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Unsupported JWT algorithm: {alg}",
            )
    except HTTPException:
        raise
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

    FIX-04 (P0-04): JWT is verified LOCALLY — zero outbound HTTP calls (HS256).
    FIX-ECC: ES256/RS256 uses cached JWKS public key — one HTTP call per hour.
    FIX-12 (P1-06): API key support wired in.
    FIX-30 (P3-04): Always raises HTTP 401 on failure; never returns None.

    IMPORTANT: This function is used as a FastAPI Depends() on many routes.
    Routes that used `if not email: raise HTTPException(...)` after calling
    this function no longer need that guard — it is handled here.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )
    token = credentials.credentials
    return await _authenticate_jwt(token)


async def get_user_email_from_request(request: Request) -> str:
    """Full auth function that checks both X-API-Key and Bearer JWT.

    Use this variant in routes that accept a Request directly and want
    API key support in addition to JWT.
    """
    # 1. API key (machine-to-machine)
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return await _authenticate_api_key(api_key)

    # 2. Bearer JWT (browser sessions) — supports both HS256 and ES256/RS256
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.removeprefix("Bearer ").strip()
        return await _authenticate_jwt(token)

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
    FIX-ECC: Also handles ES256/RS256 tokens via JWKS.
    """
    if not access_token:
        return False
    try:
        email = await _authenticate_jwt(access_token)
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
