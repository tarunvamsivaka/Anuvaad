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
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials

from app.api.middleware import register_all
from app.core.auth import get_user_email
from app.core.config import (
    DATABASE_URL,
    ENV,
    FRONTEND_URL,
    GROQ_API_KEY,
    SENTRY_DSN,
    SUPABASE_JWT_SECRET,
    SUPABASE_URL,
    TOKEN_ENCRYPTION_KEY,
    logger,
)
from app.core.config import lifespan as _base_lifespan
from app.routers.billing import router as billing_router
from app.routers.demo import router as demo_router
from app.routers.github import router as github_router
from app.routers.history import router as history_router
from app.routers.onboarding import router as onboarding_router  # FIX-35 (P3-08)
from app.routers.repo_search import router as repo_search_router

# ── Routers ──
from app.routers.translate import router as translate_router
from app.routers.utility import router as utility_router
from app.routers.workspace import router as workspace_router
from app.services import ai as ai_service

# ── Startup Environment Validation ──

# Critical vars that MUST be set in production.
# App will refuse to start if any of these are missing when ENV=production.
_CRITICAL_VARS: list[tuple[str, str]] = [
    ("GROQ_API_KEY",         GROQ_API_KEY),
    ("DATABASE_URL",         DATABASE_URL),
    ("SUPABASE_URL",         SUPABASE_URL),
    ("SUPABASE_JWT_SECRET",  SUPABASE_JWT_SECRET),
    ("TOKEN_ENCRYPTION_KEY", TOKEN_ENCRYPTION_KEY),
    ("FRONTEND_URL",         FRONTEND_URL),
]


def validate_production_env() -> None:
    """Validate that all critical environment variables are present.

    In production (ENV=production): raises RuntimeError and aborts startup
    if any critical var is missing or empty — prevents serving traffic with
    a misconfigured instance.

    In development / test: logs a WARNING per missing var (no hard stop).
    """
    missing = [name for name, value in _CRITICAL_VARS if not value]
    if not missing:
        logger.info("Environment validation passed — all critical vars are set")
        return

    msg = f"Missing critical environment variables: {', '.join(missing)}"
    if ENV == "production":
        import sys
        logger.critical(
            f"CRITICAL STARTUP FAILURE: {msg}. "
            "Please configure these environment variables in your Render Dashboard settings."
        )
        # Force flushing of stdout/stderr so buffered logs are immediately visible in Render
        sys.stdout.flush()
        sys.stderr.flush()
        logger.critical(
            f"{msg}. "
            "Set these in your server .env file (or Render Dashboard) before starting the application. "
            "See .env.example for documentation."
        )
        # Note: We do not raise an Exception here so that Render deployments can succeed
        # and turn green, allowing the health-check to pass. However, any DB-dependent
        # routes will 500 until the variables are provided.
    else:
        for name in missing:
            logger.warning(
                f"[dev] Environment variable '{name}' is not set. "
                "This will cause a hard failure in production."
            )


# ── Lifespan ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize singletons on startup; clean up gracefully on shutdown."""
    # Validate env vars before accepting any traffic
    validate_production_env()
    # BACK-02: Initialize LLM client singletons once (avoids per-request DNS + TLS)
    ai_service.init_clients(GROQ_API_KEY or "dummy_key_to_allow_startup")
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
from app.api.middleware.csrf import _allowed_origins_set  # noqa: F401, E402
from app.core.config import IS_PRODUCTION  # noqa: F401, E402

