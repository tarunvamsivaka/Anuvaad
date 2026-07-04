"""
app/core/config.py — Application settings.

Single responsibility: load and expose configuration constants.
  • Logging setup  → app/core/logging.py
  • HTTP client    → app/core/http_client.py
  • Metrics        → app/core/metrics.py

Backward-compatible re-exports are kept at the bottom so that any existing
`from app.core.config import logger / get_http_client / metrics` still works.
"""
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

# ── ENVIRONMENT ──
ENV: str = os.getenv("ENV", "development").lower()
_is_production: bool = ENV == "production"
IS_PRODUCTION: bool = _is_production

# ── FRONTEND ──
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

# ── LLM ──
LLM_TIMEOUT: int = 60

# ── QUOTAS / TIER LIMITS ──
FREE_TIER_DAILY_LIMIT: int = 10

# ── UPLOAD LIMITS ──
FREE_MAX_FILE_SIZE: int = 50 * 1024   # 50 KB
PRO_MAX_FILE_SIZE: int = 200 * 1024   # 200 KB

# ── HISTORY PRUNING LIMITS (single source of truth — Arch#2.8) ──
HISTORY_LIMIT_PRO: int = int(os.getenv("HISTORY_LIMIT_PRO", "1000"))
HISTORY_LIMIT_FREE: int = int(os.getenv("HISTORY_LIMIT_FREE", "100"))

# ── GIST ──
GIST_MAX_SIZE: int = 50 * 1024

# ── EXTENSION → LANGUAGE MAP (Arch#2.9: single definition) ──
EXTENSION_TO_LANGUAGE: dict[str, str] = {
    ".py":   "python",
    ".js":   "javascript",
    ".ts":   "typescript",
    ".jsx":  "javascript",
    ".tsx":  "typescript",
    ".java": "java",
    ".cpp":  "cpp",
    ".cc":   "cpp",
    ".cxx":  "cpp",
    ".rs":   "rust",
    ".go":   "go",
    ".c":    "c",
    ".cs":   "csharp",
    ".rb":   "ruby",
    ".php":  "php",
    ".kt":   "kotlin",
    ".swift":"swift",
    ".r":    "r",
    ".sh":   "bash",
    ".sql":  "sql",
    ".html": "html",
    ".css":  "css",
}
ALLOWED_EXTENSIONS: frozenset[str] = frozenset(EXTENSION_TO_LANGUAGE.keys())

# ── API KEYS & SERVICE CREDENTIALS ──
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
DATABASE_URL: str = os.getenv("DATABASE_URL", "")

# PERF-01: Supabase PgBouncer connection pooler URL (port 6543 vs 5432).
# Use this URL for SQLAlchemy in production to cap connections across all Gunicorn workers.
# Get from: Supabase Dashboard → Project Settings → Database → Connection Pooling → URI
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
#
# If not set, falls back to DATABASE_URL (direct connection — fine for dev/single-worker).
DATABASE_POOL_URL: str = os.getenv("DATABASE_POOL_URL", "") or DATABASE_URL

RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")
METRICS_USERNAME: str = os.getenv("METRICS_USERNAME", "")
METRICS_PASSWORD: str = os.getenv("METRICS_PASSWORD", "")

# ── SECURITY — ENCRYPTION & JWT ──
# FIX-01 (P0-01): Fernet key used to encrypt GitHub OAuth tokens at rest.
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
TOKEN_ENCRYPTION_KEY: str = os.getenv("TOKEN_ENCRYPTION_KEY", "")

# FIX-04 (P0-04): Supabase JWT secret for local JWT verification (zero HTTP round-trips).
# Found in: Supabase Dashboard → Settings → API → JWT Settings → JWT Secret
SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")


# ── PRE-PARSED EMAIL SETS (H-7: parsed once at startup, O(1) lookups) ──
ADMIN_EMAILS: frozenset[str] = frozenset(
    e.strip().lower() for e in os.getenv("ADMIN_USERS", "").split(",") if e.strip()
)
TRUSTED_EMAILS: frozenset[str] = frozenset(
    e.strip().lower() for e in os.getenv("TRUSTED_USERS", "").split(",") if e.strip()
)


# ── LIFESPAN (HTTP client teardown — delegates to http_client module) ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Base lifespan: close HTTP client pool on shutdown."""
    yield
    from app.core.http_client import close_all_clients
    await close_all_clients()


# ── BACKWARD-COMPATIBLE RE-EXPORTS ──
# All existing `from app.core.config import logger / get_http_client / metrics` still work.

from app.core.http_client import get_http_client  # noqa: F401, E402
from app.core.logging import get_logger, logger  # noqa: F401, E402
from app.core.metrics import MetricsCollector, metrics  # noqa: F401, E402
