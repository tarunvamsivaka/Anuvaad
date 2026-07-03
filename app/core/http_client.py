"""
app/core/http_client.py

Shared asyncio-safe httpx.AsyncClient singleton.
Extracted from app/core/config.py.

Usage:
    from app.core.http_client import get_http_client

    client = await get_http_client()
    resp = await client.get("https://...")

Lifecycle:
    The shared client is created on first use and closed during the app
    lifespan teardown via `close_all_clients()`.
    `app/core/config.py` re-exports both for backward compatibility.
"""
import asyncio
import weakref
import httpx

from app.core.logging import logger

# WeakKeyDictionary keyed on the running event loop — avoids cross-loop usage
_client_locks: weakref.WeakKeyDictionary = weakref.WeakKeyDictionary()
_client_instances: weakref.WeakKeyDictionary = weakref.WeakKeyDictionary()

# Fallback for contexts where there is no running loop (e.g., tests)
_fallback_lock: asyncio.Lock | None = None
_fallback_client: httpx.AsyncClient | None = None

_CLIENT_LIMITS = httpx.Limits(max_connections=100, max_keepalive_connections=20)
_CLIENT_TIMEOUT = httpx.Timeout(30.0)


def _get_client_lock() -> asyncio.Lock:
    """Return the asyncio.Lock for the current running event loop (thread-safe)."""
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
    """Return the shared httpx.AsyncClient singleton for the running event loop.

    Thread-safe: uses per-loop asyncio.Lock to prevent duplicate initialization.
    Falls back to a global singleton when called outside an event loop context.

    FIX-25 (P1-10 / A10): follow_redirects=False prevents SSRF attacks where
    an attacker supplies a URL that redirects to an internal service. httpx
    follows redirects by default — we disable it globally so callers must
    explicitly opt-in with follow_redirects=True when redirects are required.
    """
    global _fallback_client
    try:
        loop = asyncio.get_running_loop()
        async with _get_client_lock():
            if loop not in _client_instances or _client_instances[loop].is_closed:
                _client_instances[loop] = httpx.AsyncClient(
                    limits=_CLIENT_LIMITS,
                    timeout=_CLIENT_TIMEOUT,
                    follow_redirects=False,  # FIX-25: SSRF protection
                )
            return _client_instances[loop]
    except RuntimeError:
        async with _get_client_lock():
            if _fallback_client is None or _fallback_client.is_closed:
                _fallback_client = httpx.AsyncClient(
                    limits=_CLIENT_LIMITS,
                    timeout=_CLIENT_TIMEOUT,
                    follow_redirects=False,  # FIX-25: SSRF protection
                )
            return _fallback_client


async def close_all_clients() -> None:
    """Close all active HTTP client instances. Call during app lifespan teardown."""
    for client in list(_client_instances.values()):
        if not client.is_closed:
            await client.aclose()
    global _fallback_client
    if _fallback_client is not None and not _fallback_client.is_closed:
        await _fallback_client.aclose()
    logger.info("HTTP client singletons closed")


__all__ = ["get_http_client", "close_all_clients"]
