"""
app/api/middleware/deprecation.py

Attaches `Deprecation: true` and `Link` headers to all unversioned /api/ responses.
API-01: Signals to clients that they should migrate to /api/v1/.
Extracted from app/main.py.
"""
from fastapi import Request


async def api_deprecation_middleware(request: Request, call_next):
    """Attach Deprecation header to all unversioned /api/ responses (API-01)."""
    response = await call_next(request)
    path = request.url.path
    # Mark as deprecated only if NOT a versioned route
    if path.startswith("/api/") and not path.startswith("/api/v"):
        response.headers["Deprecation"] = "true"
        response.headers["Sunset"] = "Fri, 01 Jan 2027 00:00:00 GMT"
        response.headers["Link"] = (
            f'<{str(request.url).replace("/api/", "/api/v1/", 1)}>; rel="successor-version"'
        )
    return response
