"""
app/api/middleware/csrf.py

CSRF / Origin validation middleware.
Extracted from app/main.py.

C-2:      Pre-computes the allowed origins as a frozenset for O(1) lookups.
          The frozenset is built once at import time and shared across all requests.
SEC-CSRF-02 (M2): Referer fallback now uses exact URL-parsed origin comparison
          instead of `startswith`, preventing `https://getanuvaad.vercel.app.evil.com`
          from passing the check.
"""

import os
from urllib.parse import urlparse

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import FRONTEND_URL, IS_PRODUCTION

# Build the full set of allowed origins once at import time
_extra_origins: list[str] = [o.strip().rstrip("/") for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

#: Exposed so app/main.py can also pass it to CORSMiddleware
# FIX-09 (P3-05): Localhost origins are only included in non-production environments.
# In production (IS_PRODUCTION=True), only the verified frontend URL is allowed.
allowed_origins: list[str] = list(
    {
        FRONTEND_URL,
        "https://getanuvaad.vercel.app",
        *(_extra_origins),
        # Development / staging origins — excluded in production
        *(
            {
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
                "http://localhost:3002",
                "http://127.0.0.1:3002",
                "http://localhost:5500",
                "http://127.0.0.1:5500",
            }
            if not IS_PRODUCTION
            else set()
        ),
    }
)

# C-2: O(1) lookup frozenset (used inside the middleware below)
_allowed_origins_set: frozenset[str] = frozenset(allowed_origins)

# Explicit webhook path prefixes that are exempt from CSRF checks.
# Webhooks authenticate via HMAC signatures, not browser origins.
# Using an explicit allowlist instead of a substring check (previously
# `"/webhook" in path`) prevents crafted paths like `/api/fake/webhook`
# from bypassing CSRF validation.
_WEBHOOK_PREFIXES: tuple[str, ...] = (
    "/api/v1/billing/webhook",
    "/api/billing/webhook",
    "/api/v1/webhooks/",
    "/api/webhooks/",
    "/api/v1/github/webhook",
    "/api/github/webhook",
)


def _extract_origin(url_string: str) -> str | None:
    """Parse a URL and return its scheme+host+port as an origin string.

    Returns None if the URL cannot be parsed or has no hostname.
    This is used for exact-match comparison of Referer headers, replacing
    the previous startswith() check that allowed subdomain spoofing.

    Examples:
        _extract_origin("https://getanuvaad.vercel.app/some/path") -> "https://getanuvaad.vercel.app"
        _extract_origin("https://getanuvaad.vercel.app.evil.com/x") -> "https://getanuvaad.vercel.app.evil.com"
    """
    try:
        parsed = urlparse(url_string)
        if not parsed.scheme or not parsed.hostname:
            return None
        # Include port only when non-standard
        if parsed.port and (
            (parsed.scheme == "https" and parsed.port != 443)
            or (parsed.scheme == "http" and parsed.port != 80)
        ):
            return f"{parsed.scheme}://{parsed.hostname}:{parsed.port}"
        return f"{parsed.scheme}://{parsed.hostname}"
    except Exception:
        return None


async def csrf_origin_middleware(request: Request, call_next):
    """Reject state-mutating requests from unknown origins in production.

    SEC-CSRF-01: Covers all non-safe HTTP methods (POST, PUT, PATCH, DELETE).
    SEC-CSRF-02: Referer fallback now uses exact URL-parsed origin comparison
                 instead of startswith(), preventing subdomain spoofing.
    """
    if IS_PRODUCTION and request.method in ("POST", "PUT", "PATCH", "DELETE"):
        # Server-to-server webhooks authenticate via HMAC signatures; exempt them.
        # Using an explicit prefix allowlist instead of a substring check.
        path = request.url.path
        is_webhook = any(path.startswith(prefix) for prefix in _WEBHOOK_PREFIXES)
        if not is_webhook:
            origin = request.headers.get("Origin")
            referer = request.headers.get("Referer")

            authorized = False
            if origin:
                # Origin header: direct exact match (browsers always send the exact origin)
                if origin.rstrip("/") in _allowed_origins_set:
                    authorized = True
            elif referer:
                # SEC-CSRF-02: Parse the Referer URL and compare origin components exactly.
                # Prevents "https://allowed.example.com.evil.com/..." from passing.
                referer_origin = _extract_origin(referer)
                if referer_origin and referer_origin in _allowed_origins_set:
                    authorized = True

            if not authorized:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Forbidden: CSRF Origin validation failed."},
                )
    return await call_next(request)
