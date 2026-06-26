import asyncio
import weakref
import os
import sys
import time
import logging
import httpx
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

# ── LOGGING SYSTEM (BACK-08: structured JSON in prod, pretty in dev) ──
try:
    import structlog

    _is_prod_env = os.getenv("ENV", "development").lower() == "production"
    def _add_logger_name(logger, method_name, event_dict):
        event_dict["logger"] = getattr(logger, "name", "anuvaad")
        return event_dict

    _processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        _add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer() if _is_prod_env
        else structlog.dev.ConsoleRenderer(colors=True),
    ]
    structlog.configure(
        processors=_processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    logger = structlog.get_logger("anuvaad")
except ImportError:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    logger = logging.getLogger("anuvaad")


# ── CONFIG CONSTANTS ──
ENV = os.getenv("ENV", "development").lower()
_is_production = ENV == "production"
IS_PRODUCTION = _is_production
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
LLM_TIMEOUT = 60
FREE_TIER_DAILY_LIMIT = 10
GIST_MAX_SIZE = 50 * 1024

# ── FILE UPLOAD LIMITS ──
FREE_MAX_FILE_SIZE = 50 * 1024    # 50 KB
PRO_MAX_FILE_SIZE  = 200 * 1024   # 200 KB

# ── HISTORY PRUNING LIMITS (Arch#2.8: single source of truth) ──
HISTORY_LIMIT_PRO  = int(os.getenv("HISTORY_LIMIT_PRO",  "1000"))
HISTORY_LIMIT_FREE = int(os.getenv("HISTORY_LIMIT_FREE", "100"))

# ── EXTENSION → LANGUAGE MAP (Arch#2.9: single definition, shared by upload.py & dependencies.py) ──
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


# ── API KEY & SUPABASE SECRETS ──
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
METRICS_USERNAME = os.getenv("METRICS_USERNAME", "")
METRICS_PASSWORD = os.getenv("METRICS_PASSWORD", "")

# ── PRE-PARSED EMAIL SETS (H-7: parsed once at startup, O(1) lookups) ──
ADMIN_EMAILS: frozenset[str] = frozenset(
    e.strip().lower() for e in os.getenv("ADMIN_USERS", "").split(",") if e.strip()
)
TRUSTED_EMAILS: frozenset[str] = frozenset(
    e.strip().lower() for e in os.getenv("TRUSTED_USERS", "").split(",") if e.strip()
)


# ── GLOBAL HTTP CLIENT (with asyncio.Lock for thread-safe init) ──

_client_locks = weakref.WeakKeyDictionary()
_client_instances = weakref.WeakKeyDictionary()
_fallback_lock: asyncio.Lock | None = None
_fallback_client: httpx.AsyncClient | None = None


def _get_client_lock() -> asyncio.Lock:
    """Return a thread-safe asyncio.Lock for the current running event loop."""
    global _fallback_lock
    try:
        loop = asyncio.get_running_loop()
        if loop not in _client_locks:
            _client_locks[loop] = asyncio.Lock()
        return _client_locks[loop]
    except RuntimeError:
        if _fallback_lock is None:
            _fallback_lock = asyncio.Lock()
        return _fallback_lock


async def get_http_client() -> httpx.AsyncClient:
    """Return the shared httpx.AsyncClient singleton for the running loop. Thread-safe."""
    global _fallback_client
    try:
        loop = asyncio.get_running_loop()
        async with _get_client_lock():
            if loop not in _client_instances or _client_instances[loop].is_closed:
                _client_instances[loop] = httpx.AsyncClient(
                    limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
                    timeout=httpx.Timeout(30.0),
                )
            return _client_instances[loop]
    except RuntimeError:
        async with _get_client_lock():
            if _fallback_client is None or _fallback_client.is_closed:
                _fallback_client = httpx.AsyncClient(
                    limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
                    timeout=httpx.Timeout(30.0),
                )
            return _fallback_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Teardown: close any active HTTP clients
    for client in list(_client_instances.values()):
        if not client.is_closed:
            await client.aclose()
    global _fallback_client
    if _fallback_client is not None and not _fallback_client.is_closed:
        await _fallback_client.aclose()


# Arch#2.4: MetricsCollector extracted to app/core/metrics.py (breaks config->cache circular import).
# Re-exported here for backward-compat — all existing `from app.core.config import metrics` still work.
from app.core.metrics import MetricsCollector, metrics  # noqa: F401
