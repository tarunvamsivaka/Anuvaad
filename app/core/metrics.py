"""
app/core/metrics.py

Arch#2.4: MetricsCollector extracted from config.py into its own module.
This resolves the circular import config -> cache -> config by giving the
MetricsCollector a home that does not need to import config at module level.

H-5: Redis metric writes are fire-and-forget via asyncio.ensure_future so
they never block the request path. In-memory counters are still updated
synchronously so snapshot() always has fresh local data.
"""
import sys
import time
import asyncio
from collections import deque


def _fire_and_forget(coro) -> None:
    """Schedule a coroutine as a background task, ignoring all exceptions.
    H-5: Prevents Redis write latency from adding to p50/p95 response time.
    """
    try:
        loop = asyncio.get_running_loop()
        task = loop.create_task(coro)
        task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)
    except RuntimeError:
        pass  # No running event loop (startup/test) — skip fire-and-forget safely


class MetricsCollector:
    """In-memory metrics for API observability. Resets on process restart.

    Arch#2.4: Moved here from config.py to break the config->cache circular import.
    H-5: Redis writes are fire-and-forget to avoid blocking request handlers.
    """

    def __init__(self):
        self.start_time = time.time()
        self.total_requests: dict[str, int] = {}
        self.total_errors: dict[str, int] = {}
        self.model_calls: dict[str, int] = {}
        self.model_errors: dict[str, int] = {}
        self.cache_hits: int = 0
        self.cache_misses: int = 0
        self._latencies: dict[str, deque] = {}

    # ---- Internal Redis helpers (always fire-and-forget) ----------------

    @staticmethod
    async def _redis_hincrby(key: str, field: str, amount: int = 1) -> None:
        from app.core.cache import cache  # lazy import avoids circular at module init
        if cache.client:
            try:
                await cache.client.hincrby(key, field, amount)
            except Exception:
                pass

    @staticmethod
    async def _redis_incr(key: str) -> None:
        from app.core.cache import cache
        if cache.client:
            try:
                await cache.client.incr(key)
            except Exception:
                pass

    # ---- Public recording API -------------------------------------------

    async def record_request(self, endpoint: str, latency_ms: float, is_error: bool = False):
        """H-5: Redis writes are fire-and-forget; in-memory update is synchronous."""
        _fire_and_forget(self._redis_hincrby("metrics:total_requests", endpoint))
        if is_error:
            _fire_and_forget(self._redis_hincrby("metrics:total_errors", endpoint))

        self.total_requests[endpoint] = self.total_requests.get(endpoint, 0) + 1
        if is_error:
            self.total_errors[endpoint] = self.total_errors.get(endpoint, 0) + 1
        if endpoint not in self._latencies:
            self._latencies[endpoint] = deque(maxlen=100)
        self._latencies[endpoint].append(latency_ms)

    async def record_model_call(self, model_name: str, is_error: bool = False):
        _fire_and_forget(self._redis_hincrby("metrics:model_calls", model_name))
        if is_error:
            _fire_and_forget(self._redis_hincrby("metrics:model_errors", model_name))
        self.model_calls[model_name] = self.model_calls.get(model_name, 0) + 1
        if is_error:
            self.model_errors[model_name] = self.model_errors.get(model_name, 0) + 1

    async def record_cache_hit(self):
        _fire_and_forget(self._redis_incr("metrics:cache_hits"))
        self.cache_hits += 1

    async def record_cache_miss(self):
        _fire_and_forget(self._redis_incr("metrics:cache_misses"))
        self.cache_misses += 1

    # ---- Properties -----------------------------------------------------

    @property
    def average_latency_ms(self) -> dict[str, float]:
        return {
            ep: round(sum(dq) / len(dq), 2) if dq else 0.0
            for ep, dq in self._latencies.items()
        }

    @property
    def uptime_seconds(self) -> int:
        return int(time.time() - self.start_time)

    async def snapshot(self) -> dict:
        """Return current metrics snapshot.

        BUG#8 FIX: Always returns a dict — no implicit None return path.
        Redis failure falls through to the guaranteed in-memory return.
        """
        from app.core.cache import cache  # lazy import
        if cache.client:
            try:
                redis_requests     = await cache.client.hgetall("metrics:total_requests")
                redis_errors       = await cache.client.hgetall("metrics:total_errors")
                redis_model_calls  = await cache.client.hgetall("metrics:model_calls")
                redis_model_errors = await cache.client.hgetall("metrics:model_errors")
                redis_cache_hits   = await cache.client.get("metrics:cache_hits") or 0
                redis_cache_misses = await cache.client.get("metrics:cache_misses") or 0
                return {
                    "uptime_seconds":     self.uptime_seconds,
                    "python_version":     sys.version,
                    "total_requests":     {k: int(v) for k, v in redis_requests.items()}     or dict(self.total_requests),
                    "total_errors":       {k: int(v) for k, v in redis_errors.items()}       or dict(self.total_errors),
                    "model_calls":        {k: int(v) for k, v in redis_model_calls.items()}  or dict(self.model_calls),
                    "model_errors":       {k: int(v) for k, v in redis_model_errors.items()} or dict(self.model_errors),
                    "cache_hits":         int(redis_cache_hits)   or self.cache_hits,
                    "cache_misses":       int(redis_cache_misses) or self.cache_misses,
                    "average_latency_ms": self.average_latency_ms,
                }
            except Exception as e:
                import logging
                logging.getLogger("anuvaad").error(f"Failed to snapshot Redis metrics: {e}")

        # BUG#8 FIX: guaranteed return — no implicit None
        return {
            "uptime_seconds":     self.uptime_seconds,
            "python_version":     sys.version,
            "total_requests":     dict(self.total_requests),
            "total_errors":       dict(self.total_errors),
            "model_calls":        dict(self.model_calls),
            "model_errors":       dict(self.model_errors),
            "cache_hits":         self.cache_hits,
            "cache_misses":       self.cache_misses,
            "average_latency_ms": self.average_latency_ms,
        }


# Module-level singleton — imported by config.py and all callers via `from app.core.metrics import metrics`
metrics = MetricsCollector()
