import os
import time
import hashlib
import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials
from app.core.config import (
    ENV,
    IS_PRODUCTION,
    FRONTEND_URL,
    GROQ_API_KEY,
    SENTRY_DSN,
    logger,
    lifespan as _base_lifespan,
    metrics,
)
from app.core.cache import cache
from app.core.auth import get_user_email, get_client_ip
from app.routers.translate import router as translate_router
from app.routers.history import router as history_router
from app.routers.workspace import router as workspace_router
from app.routers.billing import router as billing_router
from app.routers.github import router as github_router
from app.routers.utility import router as utility_router
from app.routers.demo import router as demo_router
from app.services import ai as ai_service
from contextlib import asynccontextmanager



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize singletons on startup, clean up on shutdown."""
    # BACK-02: Initialize LLM client singletons (Groq only)
    ai_service.init_clients(GROQ_API_KEY)
    # Delegate to the base lifespan for HTTP client management
    async with _base_lifespan(app):
        yield
    # BACK-02: Close LLM clients gracefully
    await ai_service.close_clients()


app = FastAPI(title="Anuvaad API", lifespan=lifespan)

# ── CORS CONFIGURATION ──
# Additional custom origins can be added via CORS_ORIGINS env var (comma-separated)
_extra_origins = [
    o.strip().rstrip("/")
    for o in os.getenv("CORS_ORIGINS", "").split(",")
    if o.strip()
]
_allowed_origins = list({
    FRONTEND_URL,
    "https://getanuvaad.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    *_extra_origins,
})

# C-2: Pre-compute as frozenset for O(1) CSRF lookups in the middleware
_allowed_origins_set: frozenset[str] = frozenset(_allowed_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── SENTRY INITIALIZATION ──
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,
        environment=ENV,
    )
    logger.info("Sentry initialized")
else:
    logger.info("Sentry not configured")

# ── MIDDLEWARES ──

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
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


@app.middleware("http")
async def csrf_origin_middleware(request: Request, call_next):
    # C-2: Use pre-computed frozenset for O(1) origin lookup instead of building list per request
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


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    path = request.url.path
    if not path.startswith("/api/") or request.method == "OPTIONS":
        return await call_next(request)

    endpoint = path.replace("/api/", "").replace("/", "_").rstrip("_") or "root"
    start = time.time()
    is_error = False

    try:
        response = await call_next(request)
        if response.status_code >= 400:
            is_error = True
        return response
    except Exception:
        is_error = True
        raise
    finally:
        latency_ms = (time.time() - start) * 1000
        await metrics.record_request(endpoint, latency_ms, is_error)


RATE_LIMIT_WINDOW = 60
RATE_LIMIT_IP_MAX = int(os.getenv("RATE_LIMIT_IP_MAX", "50"))
RATE_LIMIT_USER_MAX = int(os.getenv("RATE_LIMIT_USER_MAX", "200"))

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if not request.url.path.startswith("/api/"):
        return await call_next(request)

    if request.method == "OPTIONS":
        return await call_next(request)

    client_ip = get_client_ip(request)
    # SEC-08: Only bypass rate limiting for localhost in non-production environments.
    # In production all traffic (including internal) must go through rate limiting.
    if client_ip == "127.0.0.1" and not IS_PRODUCTION:
        return await call_next(request)

    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        parts = auth_header.split(" ")
        if len(parts) > 1:
            token = parts[1]

    if token:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        redis_key = f"rate_limit:token:{token_hash}"
        limit = RATE_LIMIT_USER_MAX
    else:
        redis_key = f"rate_limit:{client_ip}"
        limit = RATE_LIMIT_IP_MAX

    current_count = await cache.incr_rate_limit(redis_key, RATE_LIMIT_WINDOW)

    if current_count > limit:
        return JSONResponse(
            status_code=429,
            content={
                "detail": f"Rate limit exceeded. Max {limit} requests per {RATE_LIMIT_WINDOW}s."
            },
            headers={
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "Retry-After": str(RATE_LIMIT_WINDOW),
            },
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(
        max(0, limit - current_count)
    )
    return response

# ── EXCEPTION HANDLERS ──

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
            email = await get_user_email(creds)
            if email:
                sentry_sdk.set_user({"email": email})
        except Exception:
            pass

    sentry_sdk.capture_exception(exc)
    logger.error(f"Unhandled server error: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# ── ROUTERS — versioned (/api/v1/) + legacy aliases (/api/) ──
# API-01: All new clients should use /api/v1/.
# Legacy /api/ routes are kept for backward compatibility during migration.

app.include_router(translate_router,  prefix="/api/v1")
app.include_router(history_router,    prefix="/api/v1")
app.include_router(workspace_router,  prefix="/api/v1")
app.include_router(billing_router,    prefix="/api/v1")
app.include_router(github_router,     prefix="/api/v1")
app.include_router(utility_router,    prefix="/api/v1")
app.include_router(demo_router,       prefix="/api/v1")

# Legacy aliases — emit Deprecation header so clients can migrate
app.include_router(translate_router,  prefix="/api")
app.include_router(history_router,    prefix="/api")
app.include_router(workspace_router,  prefix="/api")
app.include_router(billing_router,    prefix="/api")
app.include_router(utility_router,    prefix="/api")
app.include_router(demo_router,       prefix="/api")


@app.middleware("http")
async def api_deprecation_middleware(request: Request, call_next):
    """Attach Deprecation header to all unversioned /api/ responses (API-01)."""
    response = await call_next(request)
    path = request.url.path
    # Mark as deprecated only if NOT a versioned route
    if path.startswith("/api/") and not path.startswith("/api/v"):
        response.headers["Deprecation"] = "true"
        response.headers["Link"] = (
            f'<{str(request.url).replace("/api/", "/api/v1/", 1)}>; rel="successor-version"'
        )
    return response


logger.info("Anuvaad API Modular Application Initialized")
