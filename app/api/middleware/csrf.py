"""
app/api/middleware/csrf.py

CSRF / Origin validation middleware.
Extracted from app/main.py.

C-2: Pre-computes the allowed origins as a frozenset for O(1) lookups.
The frozenset is built once at import time and shared across all requests.
"""
import os
from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.config import IS_PRODUCTION, FRONTEND_URL

# Build the full set of allowed origins once at import time
_extra_origins: list[str] = [
    o.strip().rstrip("/")
    for o in os.getenv("CORS_ORIGINS", "").split(",")
    if o.strip()
]

#: Exposed so app/main.py can also pass it to CORSMiddleware
# FIX-09 (P3-05): Localhost origins are only included in non-production environments.
# In production (IS_PRODUCTION=True), only the verified frontend URL is allowed.
allowed_origins: list[str] = list({
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
})

# C-2: O(1) lookup frozenset (used inside the middleware below)
_allowed_origins_set: frozenset[str] = frozenset(allowed_origins)


async def csrf_origin_middleware(request: Request, call_next):
    """Reject state-mutating requests from unknown origins in production."""
    if IS_PRODUCTION and request.method in ("POST", "PATCH", "DELETE"):
        if not request.url.path.startswith("/api/webhook/"):
            origin = request.headers.get("Origin")
            referer = request.headers.get("Referer")

            authorized = False
            if origin:
                if origin.rstrip("/") in _allowed_origins_set:
                    authorized = True
            elif referer:
                authorized = any(referer.startswith(o) for o in _allowed_origins_set)

            if not authorized:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Forbidden: CSRF Origin validation failed."},
                )
    return await call_next(request)
