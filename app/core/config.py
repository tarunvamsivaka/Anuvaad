import os
import logging
import httpx
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from fastapi import FastAPI

load_dotenv()

# ── LOGGING SYSTEM ──
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
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


# ── GLOBAL HTTP CLIENT ──
_global_http_client: httpx.AsyncClient = None

def get_http_client() -> httpx.AsyncClient:
    global _global_http_client
    if _global_http_client is None:
        _global_http_client = httpx.AsyncClient(
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
            timeout=httpx.Timeout(30.0),
        )
    return _global_http_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    global _global_http_client
    if _global_http_client is not None:
        await _global_http_client.aclose()
        logger.info("Closed global HTTP client")


import time
import sys
from collections import deque

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

