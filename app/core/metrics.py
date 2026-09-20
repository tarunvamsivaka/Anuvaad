"""
app/core/metrics.py

Arch#2.4: MetricsCollector extracted from config.py into its own module.
This resolves the circular import config -> cache -> config by giving the
MetricsCollector a home that does not need to import config at module level.

H-5: Redis metric writes are fire-and-forget via asyncio.ensure_future so
they never block the request path. In-memory counters are still updated
synchronously so snapshot() always has fresh local data.
"""

import asyncio
import sys
import time
from collections import deque


def get_memory_watermark_mb() -> float:
    """Return process high-water mark memory usage in MB.

    Uses /proc/self/status (VmHWM/VmRSS) on Linux containers,
    resource.getrusage on Unix, ctypes Win32 API on Windows, or 0.0 fallback.
    """
    # 1. Linux /proc/self/status (most accurate for Linux / Docker / Render containers)
    try:
        with open("/proc/self/status") as f:
            for line in f:
                if line.startswith("VmHWM:"):
                    parts = line.split()
                    if len(parts) >= 2:
                        return round(float(parts[1]) / 1024.0, 2)
                elif line.startswith("VmRSS:"):
                    parts = line.split()
                    if len(parts) >= 2:
                        return round(float(parts[1]) / 1024.0, 2)
    except (FileNotFoundError, PermissionError, ValueError, OSError):
        pass

    # 2. Unix resource module
    try:
        import resource

        rusage = resource.getrusage(resource.RUSAGE_SELF)
        max_rss = rusage.ru_maxrss
        if sys.platform == "darwin":
            return round(max_rss / (1024.0 * 1024.0), 2)
        return round(max_rss / 1024.0, 2)
    except (ImportError, AttributeError, ValueError, OSError):
        pass

    # 3. Windows ctypes
    try:
        import ctypes
        from ctypes import wintypes

        class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
            _fields_ = [
                ("cb", wintypes.DWORD),
                ("PageFaultCount", wintypes.DWORD),
                ("PeakWorkingSetSize", ctypes.c_size_t),
                ("WorkingSetSize", ctypes.c_size_t),
                ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                ("PagefileUsage", ctypes.c_size_t),
                ("PeakPagefileUsage", ctypes.c_size_t),
            ]

        psapi = ctypes.WinDLL("psapi")
        kernel32 = ctypes.WinDLL("kernel32")
        get_proc_mem = psapi.GetProcessMemoryInfo
        get_proc_mem.argtypes = [wintypes.HANDLE, ctypes.POINTER(PROCESS_MEMORY_COUNTERS), wintypes.DWORD]
        get_proc_mem.restype = wintypes.BOOL

        counters = PROCESS_MEMORY_COUNTERS()
        counters.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS)
        handle = kernel32.GetCurrentProcess()
        if get_proc_mem(handle, ctypes.byref(counters), counters.cb):
            return round(counters.PeakWorkingSetSize / (1024.0 * 1024.0), 2)
    except Exception:
        pass

    return 0.0


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
        self._peak_memory_watermark: float = 0.0

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

    @staticmethod
    async def _redis_set_max_memory(val: float) -> None:
        """Persist peak memory watermark to Redis across process restarts."""
        from app.core.cache import cache

        if cache.client:
            try:
                current = await cache.client.get("metrics:peak_memory_watermark_mb")
                if current is None or val > float(current):
                    await cache.client.set("metrics:peak_memory_watermark_mb", str(val))
            except Exception:
                pass

    @staticmethod
    async def _redis_push_snapshot(snap: dict) -> None:
        """Persist a capped history of telemetry checkpoints in Redis."""
        import json

        from app.core.cache import cache

        if cache.client:
            try:
                entry = json.dumps(
                    {
                        "timestamp": int(time.time()),
                        "uptime_seconds": snap.get("uptime_seconds", 0),
                        "memory_watermark_mb": snap.get("memory_watermark_mb", 0.0),
                        "historical_peak_memory_watermark_mb": snap.get("historical_peak_memory_watermark_mb", 0.0),
                        "cache_hit_ratio": snap.get("cache_hit_ratio", 0.0),
                        "total_requests": sum(snap.get("total_requests", {}).values()),
                        "total_errors": sum(snap.get("total_errors", {}).values()),
                    }
                )
                await cache.client.lpush("metrics:history", entry)
                await cache.client.ltrim("metrics:history", 0, 49)
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

    @property
    def cache_hit_ratio(self) -> float:
        total = self.cache_hits + self.cache_misses
        return round(self.cache_hits / total, 4) if total > 0 else 0.0

    @property
    def average_latency_ms(self) -> dict[str, float]:
        return {ep: round(sum(dq) / len(dq), 2) if dq else 0.0 for ep, dq in self._latencies.items()}

    @property
    def uptime_seconds(self) -> int:
        return int(time.time() - self.start_time)

    async def snapshot(self) -> dict:
        """Return current metrics snapshot.

        BUG#8 FIX: Always returns a dict — no implicit None return path.
        Redis failure falls through to the guaranteed in-memory return.
        """
        from app.core.cache import cache  # lazy import

        mem_watermark = get_memory_watermark_mb()
        self._peak_memory_watermark = max(self._peak_memory_watermark, mem_watermark)
        _fire_and_forget(self._redis_set_max_memory(self._peak_memory_watermark))

        historical_peak = self._peak_memory_watermark

        if cache.client:
            try:
                stored_peak = await cache.client.get("metrics:peak_memory_watermark_mb")
                if stored_peak:
                    historical_peak = max(historical_peak, float(stored_peak))

                redis_requests = await cache.client.hgetall("metrics:total_requests")
                redis_errors = await cache.client.hgetall("metrics:total_errors")
                redis_model_calls = await cache.client.hgetall("metrics:model_calls")
                redis_model_errors = await cache.client.hgetall("metrics:model_errors")
                raw_hits = await cache.client.get("metrics:cache_hits")
                raw_misses = await cache.client.get("metrics:cache_misses")
                hits = int(raw_hits) if raw_hits else self.cache_hits
                misses = int(raw_misses) if raw_misses else self.cache_misses
                total_cache = hits + misses
                hit_ratio = round(hits / total_cache, 4) if total_cache > 0 else 0.0
                return {
                    "uptime_seconds": self.uptime_seconds,
                    "python_version": sys.version,
                    "total_requests": {k: int(v) for k, v in redis_requests.items()} or dict(self.total_requests),
                    "total_errors": {k: int(v) for k, v in redis_errors.items()} or dict(self.total_errors),
                    "model_calls": {k: int(v) for k, v in redis_model_calls.items()} or dict(self.model_calls),
                    "model_errors": {k: int(v) for k, v in redis_model_errors.items()} or dict(self.model_errors),
                    "cache_hits": hits,
                    "cache_misses": misses,
                    "cache_hit_ratio": hit_ratio,
                    "memory_watermark_mb": mem_watermark,
                    "historical_peak_memory_watermark_mb": historical_peak,
                    "average_latency_ms": self.average_latency_ms,
                }
            except Exception as e:
                import logging

                logging.getLogger("anuvaad").error(f"Failed to snapshot Redis metrics: {e}")

        # BUG#8 FIX: guaranteed return — no implicit None
        return {
            "uptime_seconds": self.uptime_seconds,
            "python_version": sys.version,
            "total_requests": dict(self.total_requests),
            "total_errors": dict(self.total_errors),
            "model_calls": dict(self.model_calls),
            "model_errors": dict(self.model_errors),
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_ratio": self.cache_hit_ratio,
            "memory_watermark_mb": mem_watermark,
            "historical_peak_memory_watermark_mb": historical_peak,
            "average_latency_ms": self.average_latency_ms,
        }

    async def get_telemetry_history(self, limit: int = 10) -> list[dict]:
        """Fetch historical telemetry checkpoints from Redis if available."""
        import json

        from app.core.cache import cache

        history: list[dict] = []
        if cache.client:
            try:
                entries = await cache.client.lrange("metrics:history", 0, limit - 1)
                for item in entries:
                    if isinstance(item, bytes):
                        item = item.decode("utf-8")
                    history.append(json.loads(item))
            except Exception:
                pass
        return history

    async def record_telemetry_checkpoint(self) -> dict:
        """Capture and persist a telemetry checkpoint into historical ring buffer."""
        snap = await self.snapshot()
        _fire_and_forget(self._redis_push_snapshot(snap))
        return snap


# Module-level singleton — imported by config.py and all callers via `from app.core.metrics import metrics`
metrics = MetricsCollector()
