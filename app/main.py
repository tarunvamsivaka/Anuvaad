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

import os
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

# Apply third-party runtime compatibility shims before importing routers.
import app.compat  # noqa: F401
from app.api.middleware import register_all
from app.core.auth import get_user_email_from_request
from app.core.cache import cache
from app.core.config import (
    AUDIT_HMAC_KEY,
    DATABASE_URL,
    ENABLE_BILLING,
    ENV,
    FRONTEND_URL,
    GROQ_API_KEY,
    HISTORY_ENCRYPTION_KEYS,
    IS_PRODUCTION,
    SENTRY_DSN,
    SUPABASE_JWT_SECRET,
    SUPABASE_URL,
    TOKEN_ENCRYPTION_KEY,
    logger,
)
from app.core.config import lifespan as _base_lifespan
from app.core.telemetry import setup_tracing

# ── Routers ──
from app.routers.billing import router as billing_router
from app.routers.demo import router as demo_router
from app.routers.github import router as github_router
from app.routers.history import router as history_router
from app.routers.modernize import router as modernize_router
from app.routers.onboarding import router as onboarding_router  # FIX-35 (P3-08)
from app.routers.repo_search import router as repo_search_router
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
    ("AUDIT_HMAC_KEY", AUDIT_HMAC_KEY),
    ("HISTORY_ENCRYPTION_KEYS", HISTORY_ENCRYPTION_KEYS),
    ("FRONTEND_URL", FRONTEND_URL),
]


def _validate_audit_hmac_key_isolation() -> None:
    """SEC-04: Verify AUDIT_HMAC_KEY is set and does not reuse JWT or Fernet keys.

    Key reuse between audit HMAC receipts and authentication/encryption keys
    is a cryptographic violation — a compromised auth key would also compromise
    the audit receipt guarantee.
    """
    if not AUDIT_HMAC_KEY:
        return  # Covered by _CRITICAL_VARS check in production

    if SUPABASE_JWT_SECRET and AUDIT_HMAC_KEY == SUPABASE_JWT_SECRET:
        msg = (
            "SEC-04: AUDIT_HMAC_KEY must not reuse SUPABASE_JWT_SECRET. "
            'Generate a dedicated secret: python -c "import secrets; print(secrets.token_hex(32))"'
        )
        if ENV == "production":
            raise RuntimeError(msg)
        logger.warning(f"[dev] {msg}")

    if TOKEN_ENCRYPTION_KEY and AUDIT_HMAC_KEY == TOKEN_ENCRYPTION_KEY:
        msg = (
            "SEC-04: AUDIT_HMAC_KEY must not reuse TOKEN_ENCRYPTION_KEY. "
            'Generate a dedicated secret: python -c "import secrets; print(secrets.token_hex(32))"'
        )
        if ENV == "production":
            raise RuntimeError(msg)
        logger.warning(f"[dev] {msg}")


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

    if os.getenv("GROQ_API_KEY") and not os.getenv("OPENROUTER_API_KEY"):
        logger.info("AI routing uses Groq; OpenRouter fallback is not configured")


# ── Lifespan ──


async def _verify_alembic_head() -> None:
    """Raise RuntimeError if database is not at the Alembic migration head (DEP-04)."""
    from alembic.config import Config
    from alembic.runtime.migration import MigrationContext
    from alembic.script import ScriptDirectory

    from app.core.database_session import _is_sqlite, engine

    if _is_sqlite:
        return  # Skip for in-memory test database

    alembic_cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(alembic_cfg)
    head_revisions = {s.revision for s in script.get_revisions("heads")}

    async with engine.connect() as conn:
        current_heads = set(await conn.run_sync(lambda c: MigrationContext.configure(c).get_current_heads()))

    if current_heads != head_revisions:
        raise RuntimeError(
            f"Database schema is behind migration head. "
            f"Current: {current_heads}, Expected: {head_revisions}. "
            f"Run: alembic upgrade head"
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize singletons on startup; clean up gracefully on shutdown."""
    # Validate env vars before accepting any traffic
    validate_production_env()
    # SEC-04: Verify audit HMAC key is not reusing auth/encryption secrets
    _validate_audit_hmac_key_isolation()
    if IS_PRODUCTION:
        await _verify_alembic_head()
    # BACK-02: Initialize LLM client singletons once (avoids per-request DNS + TLS)
    ai_service.init_clients(GROQ_API_KEY or "dummy_key_to_allow_startup")
    async with _base_lifespan(app):
        yield
        # Phase 1: Gracefully drain in-process background tasks before HTTP client pool teardown
        from app.queue.tasks import drain_background_tasks

        await drain_background_tasks(timeout=10.0)
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
        "Translate code to plain English, English to code, and between supported programming languages.\n\n"
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

# ── OpenTelemetry — Sprint 8 ──
# Gracefully no-ops when OTEL packages not installed or OTEL_EXPORTER_OTLP_ENDPOINT unset.
setup_tracing(app)


# ── Sentry ──
def sentry_before_send(event: dict, hint: dict) -> dict | None:
    """Remove user content and identifiers before an event leaves this process."""
    event.pop("user", None)
    event.pop("extra", None)
    event.pop("breadcrumbs", None)
    if "request" in event and isinstance(event["request"], dict):
        req = event["request"]
        if "data" in req:
            req["data"] = "[REDACTED_FOR_ZDR]"
        req.pop("query_string", None)
        if isinstance(req.get("url"), str):
            req["url"] = req["url"].split("?", 1)[0]
        if "headers" in req and isinstance(req["headers"], dict):
            for h in list(req["headers"].keys()):
                h_lower = h.lower()
                if h_lower in ("authorization", "x-user-llm-key", "cookie", "x-api-key", "set-cookie"):
                    req["headers"][h] = "[REDACTED]"
    exception_data = event.get("exception")
    for exception in exception_data.get("values", []) if isinstance(exception_data, dict) else []:
        if isinstance(exception, dict) and exception.get("value"):
            exception["value"] = "[REDACTED_FOR_ZDR]"
        if isinstance(exception, dict):
            stacktrace = exception.get("stacktrace")
            frames = stacktrace.get("frames", []) if isinstance(stacktrace, dict) else []
            for frame in frames:
                if isinstance(frame, dict):
                    frame.pop("vars", None)
    threads = event.get("threads")
    if isinstance(threads, dict):
        for thread in threads.get("values", []):
            stacktrace = thread.get("stacktrace") if isinstance(thread, dict) else None
            frames = stacktrace.get("frames", []) if isinstance(stacktrace, dict) else []
            for frame in frames:
                if isinstance(frame, dict):
                    frame.pop("vars", None)
    if event.get("message"):
        event["message"] = "[REDACTED_FOR_ZDR]"
    if isinstance(event.get("logentry"), dict) and event["logentry"].get("message"):
        event["logentry"]["message"] = "[REDACTED_FOR_ZDR]"
    # Keep transaction timing but drop arbitrary span attributes that can carry
    # request parameters, query text, provider payloads, or database bind values.
    spans = event.get("spans")
    if isinstance(spans, list):
        for span in spans:
            if isinstance(span, dict):
                span.pop("data", None)
                span.pop("tags", None)
                span.pop("description", None)
    return event


if SENTRY_DSN and SENTRY_DSN.startswith(("http://", "https://")):
    try:
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            traces_sample_rate=0.1,
            environment=ENV,
            send_default_pii=False,
            before_send=sentry_before_send,
            before_send_transaction=sentry_before_send,
        )
        logger.info("Sentry initialized with ZDR scrubbing")
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
    sentry_sdk.capture_exception(exc)
    logger.error("Unhandled server error", error_type=type(exc).__name__)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ── Routers — versioned (/api/v1/) + legacy aliases (/api/) ──
# API-01: All new clients should use /api/v1/.
# Legacy /api/ routes are kept for backward compatibility during migration.
# Sunset date: 2027-01-01


app.include_router(translate_router, prefix="/api/v1")
app.include_router(history_router, prefix="/api/v1")
app.include_router(workspace_router, prefix="/api/v1")
if ENABLE_BILLING or os.getenv("TESTING") == "true":
    app.include_router(billing_router, prefix="/api/v1")
app.include_router(github_router, prefix="/api/v1")
app.include_router(repo_search_router, prefix="/api/v1")
app.include_router(utility_router, prefix="/api/v1")
app.include_router(demo_router, prefix="/api/v1")
app.include_router(onboarding_router, prefix="/api/v1")  # FIX-35 (P3-08)
app.include_router(modernize_router, prefix="/api/v1")

# Legacy aliases — api_deprecation_middleware emits Deprecation header
app.include_router(translate_router, prefix="/api", include_in_schema=False)
app.include_router(history_router, prefix="/api", include_in_schema=False)
app.include_router(workspace_router, prefix="/api", include_in_schema=False)
if ENABLE_BILLING or os.getenv("TESTING") == "true":
    app.include_router(billing_router, prefix="/api", include_in_schema=False)
app.include_router(github_router, prefix="/api", include_in_schema=False)
app.include_router(repo_search_router, prefix="/api", include_in_schema=False)
app.include_router(utility_router, prefix="/api", include_in_schema=False)
app.include_router(demo_router, prefix="/api", include_in_schema=False)
app.include_router(modernize_router, prefix="/api", include_in_schema=False)


# Root health probe fallback for platform load balancers (Render, K8s, Keep-Alive)
@app.api_route("/health", methods=["GET", "HEAD"], include_in_schema=False)
async def root_health_probe(request: Request):
    from app.routers.utility import health_check

    return await health_check(request)


@app.api_route("/health/live", methods=["GET", "HEAD"], include_in_schema=False)
async def root_health_live(request: Request):
    from app.routers.utility import health_live

    return await health_live(request)


@app.api_route("/health/ready", methods=["GET", "HEAD"], include_in_schema=False)
async def root_health_ready(request: Request):
    from app.routers.utility import health_ready

    return await health_ready(request)


@app.get("/metrics", include_in_schema=False)
async def root_metrics(request: Request):
    from app.routers.utility import get_metrics_json

    return await get_metrics_json(request)


logger.info("Anuvaad API Initialized")
