import asyncio
import os
import sys
import time
import logging
import httpx
from collections import deque
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

# ── LOGGING SYSTEM (BACK-08: structured JSON in prod, pretty in dev) ──
try:
    import structlog

    _is_prod_env = os.getenv("ENV", "development").lower() == "production"
    _processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
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

# ── API KEY & SUPABASE SECRETS ──
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
METRICS_USERNAME = os.getenv("METRICS_USERNAME", "")
METRICS_PASSWORD = os.getenv("METRICS_PASSWORD", "")


# ── GLOBAL HTTP CLIENT (with asyncio.Lock for thread-safe init) ──
import weakref

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




class MetricsCollector:
    """In-memory metrics for API observability. Resets on process restart."""

    def __init__(self):
        self.start_time = time.time()
        self.total_requests: dict[str, int] = {}
        self.total_errors: dict[str, int] = {}
        self.model_calls: dict[str, int] = {}
        self.model_errors: dict[str, int] = {}
        self.cache_hits: int = 0
        self.cache_misses: int = 0
        self._latencies: dict[str, deque] = {}

    def record_request(self, endpoint: str, latency_ms: float, is_error: bool = False):
        self.total_requests[endpoint] = self.total_requests.get(endpoint, 0) + 1
        if is_error:
            self.total_errors[endpoint] = self.total_errors.get(endpoint, 0) + 1
        if endpoint not in self._latencies:
            self._latencies[endpoint] = deque(maxlen=100)
        self._latencies[endpoint].append(latency_ms)

    def record_model_call(self, model_name: str, is_error: bool = False):
        self.model_calls[model_name] = self.model_calls.get(model_name, 0) + 1
        if is_error:
            self.model_errors[model_name] = self.model_errors.get(model_name, 0) + 1

    def record_cache_hit(self):
        self.cache_hits += 1

    def record_cache_miss(self):
        self.cache_misses += 1

    @property
    def average_latency_ms(self) -> dict[str, float]:
        return {
            ep: round(sum(dq) / len(dq), 2) if dq else 0.0
            for ep, dq in self._latencies.items()
        }

    @property
    def uptime_seconds(self) -> int:
        return int(time.time() - self.start_time)

    def snapshot(self) -> dict:
        return {
            "uptime_seconds": self.uptime_seconds,
            "python_version": sys.version,
            "total_requests": dict(self.total_requests),
            "total_errors": dict(self.total_errors),
            "model_calls": dict(self.model_calls),
            "model_errors": dict(self.model_errors),
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "average_latency_ms": self.average_latency_ms,
        }


metrics = MetricsCollector()

