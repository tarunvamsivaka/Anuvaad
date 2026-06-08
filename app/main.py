import os
import time
import hashlib
import base64
import sentry_sdk
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials
from app.core.config import (
    ENV,
    IS_PRODUCTION,
    FRONTEND_URL,
    SENTRY_DSN,
    logger,
    lifespan,
    metrics,
)
from app.core.cache import cache
from app.core.auth import get_user_email
from app.routers.translate import router as translate_router
from app.routers.history import router as history_router
from app.routers.workspace import router as workspace_router
from app.routers.billing import router as billing_router
from app.routers.utility import router as utility_router

app = FastAPI(title="Anuvaad API", lifespan=lifespan)

# ── CORS CONFIGURATION ──
_allowed_origins = [FRONTEND_URL]
for origin in [
    "https://getanuvaad.vercel.app",
    "http://localhost:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]:
    clean_origin = origin.rstrip("/")
    if clean_origin not in _allowed_origins:
        _allowed_origins.append(clean_origin)


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

# ── IP EXTRACTOR ──
def get_client_ip(request: Request) -> str:
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

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
    import sys
    is_prod = IS_PRODUCTION
    frontend_url = FRONTEND_URL
    main_mod = sys.modules.get("main")
    if main_mod:
        if hasattr(main_mod, "_is_production"):
            is_prod = getattr(main_mod, "_is_production")
        elif hasattr(main_mod, "IS_PRODUCTION"):
            is_prod = getattr(main_mod, "IS_PRODUCTION")

        if hasattr(main_mod, "_frontend_url"):
            frontend_url = getattr(main_mod, "_frontend_url")
        elif hasattr(main_mod, "FRONTEND_URL"):
            frontend_url = getattr(main_mod, "FRONTEND_URL")

    if is_prod and request.method in ("POST", "PATCH", "DELETE"):
        if not request.url.path.startswith("/api/webhook/"):
            origin = request.headers.get("Origin")
            referer = request.headers.get("Referer")

            authorized = False
            allowed_list = list(_allowed_origins)
            clean_furl = frontend_url.rstrip("/")
            if clean_furl not in allowed_list:
                allowed_list.append(clean_furl)

            if origin:
                clean_origin = origin.rstrip("/")
                if clean_origin in allowed_list:
                    authorized = True
            elif referer:
                for allowed in allowed_list:
                    if referer.startswith(allowed):
                        authorized = True
                        break

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
        metrics.record_request(endpoint, latency_ms, is_error)


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
    if client_ip == "127.0.0.1":
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

# ── ROUTERS ──
app.include_router(translate_router)
app.include_router(history_router)
app.include_router(workspace_router)
app.include_router(billing_router)
app.include_router(utility_router)

logger.info("Anuvaad API Modular Application Initialized")
