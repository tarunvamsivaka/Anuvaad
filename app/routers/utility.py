import os
import re
import sys
import base64
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from app.core.config import (
    GROQ_API_KEY,
    DEEPSEEK_API_KEY,
    RAZORPAY_KEY_ID,
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    METRICS_USERNAME,
    METRICS_PASSWORD,
    FREE_TIER_DAILY_LIMIT,
    IS_PRODUCTION,
    ENV,
    logger,
    metrics,
)
from app.core.cache import cache
from app.core.auth import get_user_email, get_user_pro_status
from app.core.quota import get_today_usage_count, get_active_protection_mode

router = APIRouter(prefix="/api", tags=["utility"])

# ── GITHUB GIST IMPORT ──
GIST_MAX_SIZE = 50 * 1024  # 50 KB
GIST_URL_PATTERN = re.compile(r"^https://gist\.github\.com/([^/]+)/([a-f0-9]+)$")

GIST_LANGUAGE_MAP = {
    "python": "python",
    "javascript": "javascript",
    "typescript": "typescript",
    "java": "java",
    "c++": "cpp",
    "c": "c",
    "c#": "csharp",
    "go": "go",
    "rust": "rust",
    "swift": "swift",
    "kotlin": "kotlin",
    "dart": "dart",
    "php": "php",
    "ruby": "ruby",
    "perl": "perl",
    "lua": "lua",
    "r": "r",
    "matlab": "matlab",
    "sql": "sql",
    "shell": "bash",
    "powershell": "powershell",
    "dockerfile": "dockerfile",
    "yaml": "yaml",
    "scala": "scala",
    "haskell": "haskell",
    "elixir": "elixir",
    "clojure": "clojure",
    "html": "html",
    "css": "css",
    "json": "json",
    "xml": "xml",
    "markdown": "markdown",
    "objective-c": "objective-c",
    "graphql": "graphql",
}


@router.get("/health")
async def health_check():
    redis_ok = False
    if cache.client:
        try:
            await cache.ping()
            redis_ok = True
        except Exception:
            pass
    return {
        "status": "healthy",
        "service": "anuvaad-api",
        "llm_configured": bool(GROQ_API_KEY) or bool(DEEPSEEK_API_KEY),
        "razorpay_configured": bool(
            RAZORPAY_KEY_ID and not RAZORPAY_KEY_ID.startswith("rzp_test_your")
        ),
        "redis_connected": redis_ok,
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_SERVICE_KEY),
    }


@router.get("/import-gist")
async def import_gist(url: str):
    """Fetch a public GitHub Gist's first file and return its content for translation."""
    match = GIST_URL_PATTERN.match(url.strip())
    if not match:
        raise HTTPException(
            status_code=400,
            detail="Invalid Gist URL. Expected format: https://gist.github.com/username/gist_id",
        )

    username = match.group(1)
    gist_id = match.group(2)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://api.github.com/gists/{gist_id}",
                headers={
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "Anuvaad-App",
                },
            )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504, detail="GitHub API request timed out. Please try again."
        )
    except httpx.RequestError as e:
        logger.error(f"Gist fetch network error: {e}")
        raise HTTPException(status_code=502, detail="Could not reach GitHub API.")

    if resp.status_code == 404:
        raise HTTPException(
            status_code=404, detail="Gist not found. It may be private or deleted."
        )
    if resp.status_code == 403:
        raise HTTPException(
            status_code=400, detail="Gist is private or GitHub rate limit exceeded."
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502, detail=f"GitHub API returned status {resp.status_code}"
        )

    gist_data = resp.json()

    if not gist_data.get("public", True):
        raise HTTPException(
            status_code=400,
            detail="This Gist is private. Only public Gists can be imported.",
        )

    files = gist_data.get("files", {})
    if not files:
        raise HTTPException(status_code=400, detail="This Gist has no files.")

    first_filename = next(iter(files))
    file_data = files[first_filename]
    content = file_data.get("content", "")

    if len(content.encode("utf-8")) > GIST_MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Gist content exceeds the {GIST_MAX_SIZE // 1024}KB limit. Please use a smaller file.",
        )

    raw_language = (file_data.get("language") or "").lower()
    detected_language = GIST_LANGUAGE_MAP.get(raw_language, "python")

    return {
        "filename": first_filename,
        "language": detected_language,
        "content": content,
        "char_count": len(content),
        "username": username,
    }


def _check_metrics_auth(request: Request) -> bool:
    """Validate HTTP Basic Auth for the metrics endpoints."""
    if not METRICS_USERNAME or not METRICS_PASSWORD:
        return True
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Basic "):
        return False
    try:
        decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
        username, password = decoded.split(":", 1)
        return username == METRICS_USERNAME and password == METRICS_PASSWORD
    except Exception:
        return False


@router.get("/metrics")
async def get_metrics_json(request: Request):
    """Return all metrics as JSON. Protected by HTTP Basic Auth."""
    if not _check_metrics_auth(request):
        return JSONResponse(
            status_code=401,
            content={"detail": "Unauthorized"},
            headers={"WWW-Authenticate": 'Basic realm="metrics"'},
        )
    return metrics.snapshot()


@router.get("/metrics/prometheus")
async def get_metrics_prometheus(request: Request):
    """Return metrics in Prometheus text exposition format."""
    if not _check_metrics_auth(request):
        return PlainTextResponse(
            "Unauthorized",
            status_code=401,
            headers={"WWW-Authenticate": 'Basic realm="metrics"'},
        )
    snap = metrics.snapshot()
    lines: list[str] = []

    lines.append("# HELP anuvaad_uptime_seconds Seconds since process start")
    lines.append("# TYPE anuvaad_uptime_seconds gauge")
    lines.append(f"anuvaad_uptime_seconds {snap['uptime_seconds']}")

    lines.append("# HELP anuvaad_requests_total Total requests per endpoint")
    lines.append("# TYPE anuvaad_requests_total counter")
    for ep, count in snap["total_requests"].items():
        lines.append(f'anuvaad_requests_total{{endpoint="{ep}"}} {count}')

    lines.append("# HELP anuvaad_errors_total Total errors per endpoint")
    lines.append("# TYPE anuvaad_errors_total counter")
    for ep, count in snap["total_errors"].items():
        lines.append(f'anuvaad_errors_total{{endpoint="{ep}"}} {count}')

    lines.append("# HELP anuvaad_model_calls_total Total calls per model")
    lines.append("# TYPE anuvaad_model_calls_total counter")
    for model, count in snap["model_calls"].items():
        lines.append(f'anuvaad_model_calls_total{{model="{model}"}} {count}')

    lines.append("# HELP anuvaad_model_errors_total Total errors per model")
    lines.append("# TYPE anuvaad_model_errors_total counter")
    for model, count in snap["model_errors"].items():
        lines.append(f'anuvaad_model_errors_total{{model="{model}"}} {count}')

    lines.append("# HELP anuvaad_cache_hits_total Total cache hits")
    lines.append("# TYPE anuvaad_cache_hits_total counter")
    lines.append(f"anuvaad_cache_hits_total {snap['cache_hits']}")
    lines.append("# HELP anuvaad_cache_misses_total Total cache misses")
    lines.append("# TYPE anuvaad_cache_misses_total counter")
    lines.append(f"anuvaad_cache_misses_total {snap['cache_misses']}")

    lines.append("# HELP anuvaad_avg_latency_ms Rolling average latency per endpoint")
    lines.append("# TYPE anuvaad_avg_latency_ms gauge")
    for ep, lat in snap["average_latency_ms"].items():
        lines.append(f'anuvaad_avg_latency_ms{{endpoint="{ep}"}} {lat}')

    lines.append("")
    return PlainTextResponse(
        "\n".join(lines), media_type="text/plain; version=0.0.4; charset=utf-8"
    )


@router.get("/cache-stats")
async def get_cache_stats():
    """Return stats for the cache."""
    stats = cache.fallback.stats()
    stats["cache_type"] = "redis" if cache.client else "lru"
    stats["redis_connected"] = bool(cache.client)
    return stats


@router.get("/usage")
async def get_usage(email: str | None = Depends(get_user_email)):
    """Return today's translation count and limit for the authenticated user."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    count = await get_today_usage_count(email)
    is_pro = await get_user_pro_status(email)
    return {
        "translations_today": count,
        "daily_limit": None if is_pro else FREE_TIER_DAILY_LIMIT,
        "is_pro": is_pro,
    }


@router.get("/sentry-test")
async def sentry_test():
    """Test endpoint to trigger a deliberate error for Sentry verification"""
    if IS_PRODUCTION:
        raise HTTPException(status_code=404, detail="Not found")
    raise ZeroDivisionError("Deliberate error for Sentry verification")
