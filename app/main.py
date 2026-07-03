"""
app/main.py — Application entry-point.

Responsibilities (and ONLY these):
  1. Define the lifespan context (init / teardown LLM clients)
  2. Create the FastAPI application
  3. Register middleware via app.api.middleware.register_all()
  4. Initialize Sentry
  5. Mount all routers
  6. Register the global exception handler

All middleware logic lives in app/api/middleware/.
All configuration lives in app/core/config.py.
"""
import sentry_sdk
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials

from app.core.config import ENV, SENTRY_DSN, GROQ_API_KEY, logger
from app.core.auth import get_user_email
from app.api.middleware import register_all
from app.services import ai as ai_service

# ── Routers ──
from app.routers.translate import router as translate_router
from app.routers.history import router as history_router
from app.routers.workspace import router as workspace_router
from app.routers.billing import router as billing_router
from app.routers.github import router as github_router
from app.routers.repo_search import router as repo_search_router
from app.routers.utility import router as utility_router
from app.routers.demo import router as demo_router
from app.routers.onboarding import router as onboarding_router  # FIX-35 (P3-08)
from app.core.config import lifespan as _base_lifespan


# ── Lifespan ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize singletons on startup; clean up gracefully on shutdown."""
    # BACK-02: Initialize LLM client singletons once (avoids per-request DNS + TLS)
    ai_service.init_clients(GROQ_API_KEY)
    async with _base_lifespan(app):
        yield
    # BACK-02: Graceful client shutdown
    await ai_service.close_clients()


# ── Application ──

app = FastAPI(title="Anuvaad API", lifespan=lifespan)

# Register all HTTP middleware (CORS, security headers, CSRF, metrics, rate-limit, deprecation)
register_all(app)

# ── Sentry ──
if SENTRY_DSN:
    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1, environment=ENV)
    logger.info("Sentry initialized")
else:
    logger.info("Sentry not configured")


# ── Global Exception Handler ──

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


# ── Routers — versioned (/api/v1/) + legacy aliases (/api/) ──
# API-01: All new clients should use /api/v1/.
# Legacy /api/ routes are kept for backward compatibility during migration.
# Sunset date: 2027-01-01

app.include_router(translate_router,    prefix="/api/v1")
app.include_router(history_router,      prefix="/api/v1")
app.include_router(workspace_router,    prefix="/api/v1")
app.include_router(billing_router,      prefix="/api/v1")
app.include_router(github_router,       prefix="/api/v1")
app.include_router(repo_search_router,  prefix="/api/v1")
app.include_router(utility_router,      prefix="/api/v1")
app.include_router(demo_router,         prefix="/api/v1")
app.include_router(onboarding_router,   prefix="/api/v1")  # FIX-35 (P3-08)

# Legacy aliases — api_deprecation_middleware emits Deprecation header
app.include_router(translate_router,  prefix="/api")
app.include_router(history_router,    prefix="/api")
app.include_router(workspace_router,  prefix="/api")
app.include_router(billing_router,    prefix="/api")
app.include_router(utility_router,    prefix="/api")
app.include_router(demo_router,       prefix="/api")

logger.info("Anuvaad API Initialized")

# ── Backward-compatible re-exports ──
# Some tests import from app.main directly (e.g. `app_main_module.IS_PRODUCTION`).
# These re-exports keep those tests working after the refactor moved these symbols
# to their canonical homes.
from app.core.config import IS_PRODUCTION  # noqa: F401, E402
from app.api.middleware.csrf import _allowed_origins_set  # noqa: F401, E402

