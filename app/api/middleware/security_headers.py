"""
app/api/middleware/security_headers.py

Adds hardened HTTP security headers to every response.
Extracted from app/main.py to keep the entry-point lean.
"""

import os

from fastapi import Request

_IS_PRODUCTION = os.getenv("ENV", "development").lower() == "production"


async def security_headers_middleware(request: Request, call_next):
    """Attach security headers (X-Frame-Options, CSP, HSTS, etc.) to every response.

    SEC-HDR-01: Added Strict-Transport-Security so HSTS is enforced even when
    the FastAPI backend is accessed directly, bypassing nginx.
    """
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
    # SEC-HDR-01: HSTS — 2 years, include subdomains, preload-eligible.
    # Only set in production to avoid breaking local HTTP development.
    if _IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return response
