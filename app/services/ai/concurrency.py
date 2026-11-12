"""
app/services/ai/concurrency.py — Distributed & Process-Local Stream Concurrency Control (PERF-03).

Provides atomic stream slot acquisition across multiple Gunicorn workers and
containers when Redis is available, with graceful degradation to per-process
asyncio.Semaphore.
"""

from __future__ import annotations

import asyncio
import time
from contextlib import asynccontextmanager

import app.core.config as _config
from app.core.cache import cache
from app.core.config import logger

_stream_semaphore: asyncio.Semaphore | None = None
_stream_semaphore_loop: asyncio.AbstractEventLoop | None = None

_LUA_ACQUIRE_STREAM = """
local key = KEYS[1]
local max_slots = tonumber(ARGV[1])
local lease_ttl = tonumber(ARGV[2])

local current = tonumber(redis.call('GET', key) or '0')
if current < max_slots then
    local new_val = redis.call('INCR', key)
    redis.call('EXPIRE', key, lease_ttl)
    return 1
else
    return 0
end
"""

_LUA_RELEASE_STREAM = """
local key = KEYS[1]
local current = tonumber(redis.call('GET', key) or '0')
if current > 0 then
    redis.call('DECR', key)
end
return 1
"""

_REDIS_CONCURRENCY_KEY = "stream:concurrency:active_count"
_LEASE_TTL_SECONDS = 120


def get_stream_semaphore() -> asyncio.Semaphore:
    """Return the per-process concurrency semaphore for streaming requests."""
    global _stream_semaphore, _stream_semaphore_loop
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if _stream_semaphore is None or _stream_semaphore_loop != current_loop:
        _stream_semaphore = asyncio.Semaphore(_config.WORKER_CONCURRENT_STREAMS)
        _stream_semaphore_loop = current_loop
    return _stream_semaphore


async def acquire_stream_slot_raw() -> tuple[bool, str]:
    """Acquires a concurrency slot using Redis if available, or local semaphore.

    Returns (acquired: bool, backend: "redis" | "local" | "none")
    """
    deadline = time.monotonic() + _config.STREAM_ACQUIRE_TIMEOUT

    # Try distributed Redis coordination
    if hasattr(cache, "client") and getattr(cache, "_backend", None) == "redis":
        try:
            while time.monotonic() < deadline:
                res = await cache.client.eval(
                    _LUA_ACQUIRE_STREAM,
                    1,
                    _REDIS_CONCURRENCY_KEY,
                    _config.MAX_CONCURRENT_STREAMS,
                    _LEASE_TTL_SECONDS,
                )
                if res == 1:
                    return True, "redis"
                await asyncio.sleep(0.05)
            # Timeout reached under Redis
            return False, "redis"
        except Exception as e:
            logger.debug(f"Redis stream concurrency coordination error: {e}")

    # Fallback: per-process semaphore
    sem = get_stream_semaphore()
    try:
        remaining = max(0.1, deadline - time.monotonic())
        await asyncio.wait_for(sem.acquire(), timeout=remaining)
        return True, "local"
    except TimeoutError:
        return False, "local"


async def release_stream_slot_raw(backend: str) -> None:
    """Safely releases an acquired stream slot."""
    if backend == "redis":
        try:
            if hasattr(cache, "client"):
                await cache.client.eval(_LUA_RELEASE_STREAM, 1, _REDIS_CONCURRENCY_KEY)
        except Exception as e:
            logger.warning(f"Failed to release Redis stream slot: {e}")
    elif backend == "local":
        sem = get_stream_semaphore()
        try:
            sem.release()
        except ValueError:
            pass


@asynccontextmanager
async def acquire_stream_slot():
    acquired, backend = await acquire_stream_slot_raw()
    if not acquired:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=429,
            detail="Streaming translation server is currently at capacity. Please retry shortly.",
            headers={"Retry-After": "2"},
        )
    try:
        yield
    finally:
        await release_stream_slot_raw(backend)
