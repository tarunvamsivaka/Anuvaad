"""
app/api/middleware/metrics_mw.py

Records per-endpoint latency and error-rate metrics for every /api/ request.
Extracted from app/main.py.
"""
import time

from fastapi import Request

from app.core.config import metrics


async def metrics_middleware(request: Request, call_next):
    """Track latency and error counts for all /api/ endpoints."""
    path = request.url.path
    if not path.startswith("/api/") or request.method == "OPTIONS":
        return await call_next(request)

    endpoint = path.replace("/api/", "").replace("/", "_").rstrip("_") or "root"
    start = time.time()
    is_error = False

    try:
        response = await call_next(request)
        if response.status_code >= 400:
            is_error = True
        return response
    except Exception:
        is_error = True
        raise
    finally:
        latency_ms = (time.time() - start) * 1000
        await metrics.record_request(endpoint, latency_ms, is_error)
