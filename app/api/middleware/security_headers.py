"""
app/api/middleware/security_headers.py

Adds hardened HTTP security headers to every response.
Extracted from app/main.py to keep the entry-point lean.
"""
from fastapi import Request


async def security_headers_middleware(request: Request, call_next):
    """Attach security headers (X-Frame-Options, CSP, etc.) to every response."""
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; frame-ancestors 'none';"
    )
    return response
