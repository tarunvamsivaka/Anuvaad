"""
app/main.py — Application entry-point.

Responsibilities (and ONLY these):
  1. Define the lifespan context (init / teardown LLM clients)
  2. Create the FastAPI application
  3. Register middleware via app.api.middleware.register_all()
  4. Initialize Sentry
  5. Mount all routers
  6. Register global exception handlers
"""

from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials

from app.api.middleware import register_all
from app.core.auth import get_user_email
from app.core.config import (
    DATABASE_URL,
    ENV,
    FRONTEND_URL,
    GROQ_API_KEY,
    IS_PRODUCTION,
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
    ("GROQ_API_KEY", GROQ_API_KEY),
    ("DATABASE_URL", DATABASE_URL),
    ("SUPABASE_URL", SUPABASE_URL),
    ("SUPABASE_JWT_SECRET", SUPABASE_JWT_SECRET),
    ("TOKEN_ENCRYPTION_KEY", TOKEN_ENCRYPTION_KEY),
    ("FRONTEND_URL", FRONTEND_URL),
]


def validate_production_env() -> None:
    """Validate that all critical environment variables are present.

    In production (ENV=production): fail fast before accepting traffic when a
    required value is missing.  A process with incomplete configuration must
    never become a healthy-looking, partially functional deployment.

    In development / test: logs a WARNING per missing var (no hard stop).
    """
    missing = [name for name, value in _CRITICAL_VARS if not value]
    if not missing:
        logger.info("Environment validation passed — all critical vars are set")
        return

    msg = f"Missing critical environment variables: {', '.join(missing)}"
    if ENV == "production":
        logger.critical(
            f"CRITICAL STARTUP FAILURE: {msg}. "
            "Set them in the deployment secret store before restarting the application."
        )
        raise RuntimeError(msg)
    for name in missing:
        logger.warning(f"[dev] Environment variable '{name}' is not set. This will cause a hard failure in production.")


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

# N-MED-03: Rich OpenAPI metadata for startup product presentation.
# /docs and /redoc are disabled in production to prevent exposing the full
# API surface to the public. They remain accessible in development.
_is_production = IS_PRODUCTION
_docs_url = "/docs" if not _is_production else None
_redoc_url = "/redoc" if not _is_production else None

app = FastAPI(
    title="Anuvaad API",
    version="3.0.0",
    description=(
        "**Anuvaad** — AI-powered code translation platform.\n\n"
        "Translate code to plain English, English to code, and between 35+ languages.\n\n"
        "All new clients should use the `/api/v1/` prefix. "
        "Legacy `/api/` routes are deprecated and will be removed on **2027-01-01**."
    ),
    contact={
        "name": "Anuvaad Support",
        "url": FRONTEND_URL,
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=[
        {"name": "translation", "description": "Core code translation endpoints (SSE streaming + sync)"},
        {"name": "history", "description": "Translation history, API keys, and account management"},
        {"name": "workspace", "description": "Collaborative translation workspaces"},
        {"name": "billing", "description": "Subscription and credit management"},
        {"name": "github", "description": "GitHub OAuth and repository integration"},
        {"name": "utility", "description": "Health check, metrics, and utility endpoints"},
    ],
    docs_url=_docs_url,
    redoc_url=_redoc_url,
    lifespan=lifespan,
)

# Register all HTTP middleware (CORS, security headers, CSRF, metrics, rate-limit, deprecation)
register_all(app)

# ── Sentry ──
if SENTRY_DSN and SENTRY_DSN.startswith(("http://", "https://")):
    try:
        sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1, environment=ENV)
        logger.info("Sentry initialized")
    except Exception as e:
        logger.warning(f"Sentry initialization skipped: {e}")
else:
    logger.info("Sentry not configured")


# ── Global Exception Handlers ──


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    headers = exc.headers or {}
    if exc.status_code == 429 and isinstance(exc.detail, dict):
        if "retry_after_seconds" in exc.detail:
            headers = dict(headers)
            headers["Retry-After"] = str(exc.detail["retry_after_seconds"])
        return JSONResponse(status_code=429, content=exc.detail, headers=headers)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=headers)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
            # Pass both request and credentials as required by the dependency signature
            email = await get_user_email(request, creds)
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

app.include_router(translate_router, prefix="/api/v1")
app.include_router(history_router, prefix="/api/v1")
app.include_router(workspace_router, prefix="/api/v1")
app.include_router(billing_router, prefix="/api/v1")
app.include_router(github_router, prefix="/api/v1")
app.include_router(repo_search_router, prefix="/api/v1")
app.include_router(utility_router, prefix="/api/v1")
app.include_router(demo_router, prefix="/api/v1")
app.include_router(onboarding_router, prefix="/api/v1")  # FIX-35 (P3-08)

# Legacy aliases — api_deprecation_middleware emits Deprecation header
app.include_router(translate_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(workspace_router, prefix="/api")
app.include_router(billing_router, prefix="/api")
app.include_router(utility_router, prefix="/api")
app.include_router(demo_router, prefix="/api")

logger.info("Anuvaad API Initialized")
