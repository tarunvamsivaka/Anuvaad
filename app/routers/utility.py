import os
import re
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
    GIST_MAX_SIZE,
    logger,
    metrics,
    get_http_client,
)
from app.core.cache import cache
from app.core.auth import get_user_email, get_user_pro_status
from app.core.quota import get_today_usage_count

router = APIRouter(prefix="", tags=["utility"])

# ── GITHUB GIST IMPORT ──
# GIST_MAX_SIZE imported from app.core.config (merged duplicate — was 50*1024 here and in config.py)
GIST_URL_PATTERN = re.compile(r"^https://gist\.github\.com/([^/]+)/([a-zA-Z0-9]+)/?$")
GITHUB_RAW_PATTERN = re.compile(r"^https://raw\.githubusercontent\.com/([^/]+)/([^/]+)/([^/]+)/(.+)$")
GITHUB_BLOB_PATTERN = re.compile(r"^https://github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)$")
GITHUB_REPO_PATTERN = re.compile(r"^https://github\.com/([^/]+)/([^/]+)/?$")

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


def get_language_from_filename(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    ext_map = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".jsx": "javascript",
        ".java": "java",
        ".cpp": "cpp",
        ".cc": "cpp",
        ".h": "cpp",
        ".hpp": "cpp",
        ".c": "c",
        ".cs": "csharp",
        ".go": "go",
        ".rs": "rust",
        ".swift": "swift",
        ".kt": "kotlin",
        ".kts": "kotlin",
        ".dart": "dart",
        ".php": "php",
        ".rb": "ruby",
        ".pl": "perl",
        ".lua": "lua",
        ".r": "r",
        ".m": "matlab",
        ".sql": "sql",
        ".graphql": "graphql",
        ".sh": "bash",
        ".bash": "bash",
        ".ps1": "powershell",
        ".dockerfile": "dockerfile",
        "dockerfile": "dockerfile",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".scala": "scala",
        ".hs": "haskell",
        ".ex": "elixir",
        ".exs": "elixir",
        ".clj": "clojure",
        ".html": "html",
        ".css": "css",
        ".json": "json",
        ".xml": "xml",
        ".md": "markdown",
    }
    return ext_map.get(ext, "python")


async def fetch_raw_content(client: httpx.AsyncClient, url: str) -> str:
    try:
        resp = await client.get(
            url,
            headers={
                "User-Agent": "Anuvaad-App",
            },
            timeout=10.0,
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504, detail="Request to fetch file timed out. Please try again."
        )
    except httpx.RequestError as e:
        logger.error(f"GitHub fetch network error: {e}")
        raise HTTPException(status_code=502, detail="Could not reach GitHub.")

    if resp.status_code == 404:
        raise HTTPException(
            status_code=404, detail="File not found on GitHub."
        )
    if resp.status_code == 403:
        raise HTTPException(
            status_code=403, detail="GitHub API rate limit exceeded or file is private."
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502, detail=f"GitHub returned status {resp.status_code}"
        )
    return resp.text


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
    """Fetch a public GitHub Gist, Raw file, Repository file, or Repository's default file and return its content."""
    clean_url = url.strip()

    # 1. Gist URL
    gist_match = GIST_URL_PATTERN.match(clean_url)
    if gist_match:
        username = gist_match.group(1)
        gist_id = gist_match.group(2)
        try:
            client = await get_http_client()
            resp = await client.get(
                f"https://api.github.com/gists/{gist_id}",
                headers={
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "Anuvaad-App",
                },
                timeout=10.0,
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
                status_code=403, detail="Gist is private or GitHub rate limit exceeded."
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

    # 2. Raw File URL
    raw_match = GITHUB_RAW_PATTERN.match(clean_url)
    if raw_match:
        owner = raw_match.group(1)
        repo = raw_match.group(2)
        branch = raw_match.group(3)
        path = raw_match.group(4)
        filename = path.split("/")[-1]

        client = await get_http_client()
        content = await fetch_raw_content(client, clean_url)

        if len(content.encode("utf-8")) > GIST_MAX_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File content exceeds the {GIST_MAX_SIZE // 1024}KB limit. Please use a smaller file.",
            )

        detected_language = get_language_from_filename(filename)
        return {
            "filename": filename,
            "language": detected_language,
            "content": content,
            "char_count": len(content),
            "username": owner,
        }

    # 3. Blob File URL
    blob_match = GITHUB_BLOB_PATTERN.match(clean_url)
    if blob_match:
        owner = blob_match.group(1)
        repo = blob_match.group(2)
        branch = blob_match.group(3)
        path = blob_match.group(4)
        filename = path.split("/")[-1]
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"

        client = await get_http_client()
        content = await fetch_raw_content(client, raw_url)

        if len(content.encode("utf-8")) > GIST_MAX_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File content exceeds the {GIST_MAX_SIZE // 1024}KB limit. Please use a smaller file.",
            )

        detected_language = get_language_from_filename(filename)
        return {
            "filename": filename,
            "language": detected_language,
            "content": content,
            "char_count": len(content),
            "username": owner,
        }

    # 4. Repo Root URL
    repo_match = GITHUB_REPO_PATTERN.match(clean_url)
    if repo_match:
        owner = repo_match.group(1)
        repo = repo_match.group(2)

        try:
            client = await get_http_client()
            resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/contents",
                headers={
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "Anuvaad-App",
                },
                timeout=10.0,
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=504, detail="GitHub API request timed out. Please try again."
            )
        except httpx.RequestError as e:
            logger.error(f"GitHub contents fetch network error: {e}")
            raise HTTPException(status_code=502, detail="Could not reach GitHub API.")

        if resp.status_code == 404:
            raise HTTPException(
                status_code=404, detail="Repository not found or is private."
            )
        if resp.status_code == 403:
            raise HTTPException(
                status_code=403, detail="GitHub API rate limit exceeded or repository is private."
            )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502, detail=f"GitHub API returned status {resp.status_code}"
            )

        contents = resp.json()
        if not isinstance(contents, list):
            raise HTTPException(status_code=400, detail="Could not read repository contents.")

        files = [item for item in contents if item.get("type") == "file"]
        if not files:
            raise HTTPException(status_code=400, detail="No files found in the repository root.")

        # Priority 1: Common entry points
        preferred_names = ["main.py", "app.py", "index.js", "index.ts", "main.go", "main.rs", "index.html"]
        selected_file = None
        for name in preferred_names:
            for f in files:
                if f.get("name") == name:
                    selected_file = f
                    break
            if selected_file:
                break

        # Priority 2: Any code file with supported extensions
        if not selected_file:
            supported_extensions = [
                ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".cpp", ".cc", ".c", ".cs",
                ".go", ".rs", ".swift", ".kt", ".dart", ".php", ".rb", ".sql", ".sh", ".html", ".css"
            ]
            for f in files:
                ext = os.path.splitext(f.get("name", ""))[1].lower()
                if ext in supported_extensions:
                    selected_file = f
                    break

        # Priority 3: README.md
        if not selected_file:
            for f in files:
                if f.get("name", "").lower() == "readme.md":
                    selected_file = f
                    break

        # Priority 4: First file in the list
        if not selected_file:
            selected_file = files[0]

        download_url = selected_file.get("download_url")
        filename = selected_file.get("name", "code.txt")
        if not download_url:
            raise HTTPException(status_code=400, detail="Could not get download URL for selected file.")

        client = await get_http_client()
        content = await fetch_raw_content(client, download_url)

        if len(content.encode("utf-8")) > GIST_MAX_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File content exceeds the {GIST_MAX_SIZE // 1024}KB limit. Please use a smaller file.",
            )

        detected_language = get_language_from_filename(filename)
        return {
            "filename": filename,
            "language": detected_language,
            "content": content,
            "char_count": len(content),
            "username": owner,
        }

    raise HTTPException(
        status_code=400,
        detail="Invalid URL. Expected a GitHub Gist, Raw file, or Repository/File URL.",
    )


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
    return await metrics.snapshot()


@router.get("/metrics/prometheus")
async def get_metrics_prometheus(request: Request):
    """Return metrics in Prometheus text exposition format."""
    if not _check_metrics_auth(request):
        return PlainTextResponse(
            "Unauthorized",
            status_code=401,
            headers={"WWW-Authenticate": 'Basic realm="metrics"'},
        )
    snap = await metrics.snapshot()
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
