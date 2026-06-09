import os
import secrets
import hashlib
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import JSONResponse
from app.core.config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, logger, metrics
from app.core.cache import cache
from app.core.auth import get_user_email
from app.core.database import supabase_request, supabase_request_list
from app.core.quota import get_active_protection_mode
from app.models.schemas import ApiKeyCreate

router = APIRouter(prefix="/api", tags=["history"])

@router.get("/history")
async def get_translation_history(
    workspace_id: str = None, limit: int = 100, email: str = Depends(get_user_email)
):
    """Return translation history for the authenticated user.
    Use `limit` to control how many rows are returned (max 1000, default 100).
    """
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    limit = max(1, min(limit, 1000))

    cache_key = f"user_history:{email}:{workspace_id}:{limit}"
    cached = await cache.get(cache_key)
    if cached is not None:
        metrics.record_cache_hit()
        return cached
    metrics.record_cache_miss()

    if workspace_id:
        path = f"translation_history?workspace_id=eq.{workspace_id}&order=created_at.desc&limit={limit}"
    else:
        path = f"translation_history?user_email=eq.{email}&workspace_id=is.null&order=created_at.desc&limit={limit}"

    history = await supabase_request_list(path)
    await cache.put(cache_key, history, ttl=300)
    return history


@router.get("/stats")
async def get_translation_stats(email: str = Depends(get_user_email)):
    """Return accurate translation counts (total, this week, today) for the dashboard."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    cache_key = f"user_stats:{email}"
    cached = await cache.get(cache_key)
    if cached is not None:
        metrics.record_cache_hit()
        return cached
    metrics.record_cache_miss()

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {"total": 0, "week": 0, "today": 0}

    base_headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Prefer": "count=exact",
        "Range-Unit": "items",
        "Range": "0-0",
    }

    now_utc = datetime.now(timezone.utc)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0).strftime(
        "%Y-%m-%dT00:00:00Z"
    )
    week_start_dt = (now_utc - timedelta(days=now_utc.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    week_start = week_start_dt.strftime("%Y-%m-%dT00:00:00Z")

    base_filter = f"user_email=eq.{email}&workspace_id=is.null"

    async def count_rows(extra_filter: str) -> int:
        url = f"{SUPABASE_URL}/rest/v1/translation_history?{base_filter}&{extra_filter}"
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=base_headers)
                if resp.status_code in (200, 206):
                    content_range = resp.headers.get("Content-Range", "")
                    if "/" in content_range:
                        return int(content_range.split("/")[1])
        except Exception as e:
            logger.warning(f"Count query failed: {e}")
        return 0

    total, week, today = await asyncio_gather_wrapper(
        count_rows("select=id"),
        count_rows(f"created_at=gte.{week_start}&select=id"),
        count_rows(f"created_at=gte.{today_start}&select=id"),
    )

    res = {"total": total, "week": week, "today": today}
    await cache.put(cache_key, res, ttl=300)
    return res


async def asyncio_gather_wrapper(*aws):
    import asyncio
    return await asyncio.gather(*aws)


@router.delete("/history/{item_id}")
async def delete_history_item(item_id: str, email: str = Depends(get_user_email)):
    """Delete a single translation history item."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    item = await supabase_request(
        "GET", f"translation_history?id=eq.{item_id}&user_email=eq.{email}"
    )
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Database not configured")

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{SUPABASE_URL}/rest/v1/translation_history?id=eq.{item_id}&user_email=eq.{email}",
                headers=headers,
            )
            if resp.status_code not in (200, 204):
                raise HTTPException(status_code=500, detail="Failed to delete history item")
    except Exception as e:
        logger.error(f"Failed to delete history item from DB: {e}")
        raise HTTPException(status_code=500, detail="Database error during deletion")

    await cache.delete(f"user_stats:{email}")
    await cache.delete_prefix(f"user_history:{email}")

    return {"status": "success"}


@router.get("/api-keys")
async def list_api_keys(workspace_id: str = None, email: str = Depends(get_user_email)):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    path = f"api_keys?user_email=eq.{email}&select=id,name,key_prefix,created_at,last_used_at&order=created_at.desc"
    if workspace_id:
        path += f"&workspace_id=eq.{workspace_id}"
    else:
        path += "&workspace_id=is.null"

    keys = await supabase_request_list(path)
    return keys


@router.post("/api-keys")
async def create_api_key(payload: ApiKeyCreate, email: str = Depends(get_user_email)):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    raw_key = f"ak_{secrets.token_urlsafe(24)}"

    data = {
        "user_email": email,
        "name": payload.name,
        "key_prefix": raw_key[:8] + "...",
        "api_key_hash": hashlib.sha256(raw_key.encode()).hexdigest(),
    }
    if payload.workspace_id:
        data["workspace_id"] = payload.workspace_id

    result = await supabase_request("POST", "api_keys", data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create API key")

    return {**result, "raw_key": raw_key}


@router.delete("/api-keys/{key_id}")
async def delete_api_key(key_id: str, email: str = Depends(get_user_email)):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    key = await supabase_request(
        "GET", f"api_keys?id=eq.{key_id}&user_email=eq.{email}"
    )
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Database not configured")

    url = f"{SUPABASE_URL}/rest/v1/api_keys?id=eq.{key_id}&user_email=eq.{email}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.delete(url, headers=headers)
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail="Failed to delete API key")

    return {"status": "success"}


@router.delete("/account")
async def delete_account(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        token = authorization.replace("Bearer ", "")
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_ANON_KEY,
                },
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid token")

            user_id = resp.json().get("id")

            if SUPABASE_SERVICE_KEY:
                admin_resp = await client.delete(
                    f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                    headers={
                        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                        "apikey": SUPABASE_SERVICE_KEY,
                    },
                )
                if admin_resp.status_code not in (200, 204):
                    logger.error(f"Admin delete user failed: {admin_resp.text}")
                    raise HTTPException(
                        status_code=500, detail="Failed to delete account"
                    )

            return JSONResponse(status_code=200, content={"status": "deleted"})
    except Exception as e:
        logger.error(f"Delete account error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account")


@router.get("/admin/dashboard-stats")
async def get_admin_dashboard_stats(email: str = Depends(get_user_email)):
    """Admin dashboard stats, whitelisted via ADMIN_USERS env var."""
    admin_emails = [
        e.strip().lower() for e in os.getenv("ADMIN_USERS", "").split(",") if e.strip()
    ]
    if not email or email.lower() not in admin_emails:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required.")

    # Gather stats
    # 1. Total users
    total_users = 0
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        base_headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Prefer": "count=exact",
            "Range-Unit": "items",
            "Range": "0-0",
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{SUPABASE_URL}/rest/v1/user_subscriptions?select=user_email",
                    headers=base_headers,
                )
                if resp.status_code in (200, 206):
                    content_range = resp.headers.get("Content-Range", "")
                    if "/" in content_range:
                        total_users = int(content_range.split("/")[1])
        except Exception as e:
            logger.warning(f"Admin stats user count failed: {e}")

    # 2. Cache stats
    cache_stats = {}
    if hasattr(cache, "fallback") and hasattr(cache.fallback, "stats"):
        cache_stats = cache.fallback.stats()
    elif hasattr(cache, "stats"):
        cache_stats = cache.stats()
    cache_stats["cache_type"] = "redis" if getattr(cache, "client", None) else "lru"

    # 3. Estimated spend
    MODEL_PRICING = {
        "llama-3.3-70b-versatile": 0.0006,
        "deepseek-chat": 0.0004,
        "deepseek-reasoner": 0.005,
    }
    estimated_spend = 0.0
    for model, count in metrics.model_calls.items():
        estimated_spend += count * MODEL_PRICING.get(model, 0.001)

    # 4. Total translations
    total_translations = sum(metrics.total_requests.values())

    # 5. Protection Mode
    protection_mode = await get_active_protection_mode()

    # 6. Provider errors
    model_errors = dict(metrics.model_errors)

    return {
        "total_users": total_users,
        "cache_stats": cache_stats,
        "estimated_spend_usd": round(estimated_spend, 4),
        "total_translations": total_translations,
        "protection_mode": protection_mode,
        "model_calls": dict(metrics.model_calls),
        "model_errors": model_errors,
        "uptime_seconds": metrics.uptime_seconds,
    }

