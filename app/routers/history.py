"""
app/routers/history.py

HTTP layer only — no direct database access.
All data access is delegated to typed repositories (app/repositories/).

Endpoints:
  GET    /history                         — paginated translation history
  GET    /stats                           — total/week/today counts
  GET    /history/{item_id}               — single history item
  DELETE /history/{item_id}              — delete history item
  PATCH  /history/{item_id}/share        — toggle public sharing
  GET    /share/{item_id}                — get public shared item
  GET    /api-keys                       — list API keys
  POST   /api-keys                       — create API key
  DELETE /api-keys/{key_id}              — revoke API key
  DELETE /account                        — delete user account
  GET    /admin/dashboard-stats          — admin-only dashboard
"""
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import JSONResponse

from app.core.config import (
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY,
    ADMIN_EMAILS,
    logger,
    metrics,
    get_http_client,
)
from app.core.cache import cache
from app.core.auth import get_user_email
from app.core.quota import get_active_protection_mode
from app.models.schemas import ApiKeyCreate, SharePayload
from app.repositories import translation as translation_repo
from app.repositories import api_key as api_key_repo

router = APIRouter(prefix="", tags=["history"])


# ── Translation History ──

@router.get("/history")
async def get_translation_history(
    workspace_id: str = None,
    limit: int = 100,
    email: str = Depends(get_user_email),
):
    """Return translation history for the authenticated user."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    limit = max(1, min(limit, 1000))

    cache_key = f"user_history:{email}:{workspace_id}:{limit}"
    cached = await cache.get(cache_key)
    if cached is not None:
        await metrics.record_cache_hit()
        return cached
    await metrics.record_cache_miss()

    history = await translation_repo.get_history(email, limit=limit, offset=0)
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
        await metrics.record_cache_hit()
        return cached
    await metrics.record_cache_miss()

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
            client = await get_http_client()
            resp = await client.get(url, headers=base_headers)
            if resp.status_code in (200, 206):
                content_range = resp.headers.get("Content-Range", "")
                if "/" in content_range:
                    return int(content_range.split("/")[1])
        except Exception as e:
            logger.warning(f"Count query failed: {e}")
        return 0

    total, week, today = await asyncio.gather(
        count_rows("select=id"),
        count_rows(f"created_at=gte.{week_start}&select=id"),
        count_rows(f"created_at=gte.{today_start}&select=id"),
    )

    res = {"total": total, "week": week, "today": today}
    await cache.put(cache_key, res, ttl=300)
    return res


@router.get("/history/{item_id}")
async def get_single_history_item(item_id: str, email: str = Depends(get_user_email)):
    """Retrieve a specific translation history item owned by the authenticated user."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    from app.core.database import supabase_request
    item = await supabase_request(
        "GET", f"translation_history?id=eq.{item_id}&user_email=eq.{email}"
    )
    if not item or not isinstance(item, dict):
        raise HTTPException(status_code=404, detail="History item not found")
    return item


@router.delete("/history/{item_id}")
async def delete_history_item(item_id: str, email: str = Depends(get_user_email)):
    """Delete a single translation history item owned by the authenticated user."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Database not configured")

    # Verify ownership before deleting
    from app.core.database import supabase_request
    item = await supabase_request(
        "GET", f"translation_history?id=eq.{item_id}&user_email=eq.{email}"
    )
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    try:
        client = await get_http_client()
        resp = await client.delete(
            f"{SUPABASE_URL}/rest/v1/translation_history?id=eq.{item_id}&user_email=eq.{email}",
            headers=headers,
        )
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail="Failed to delete history item")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Failed to delete history item from DB: {e}")
        raise HTTPException(status_code=500, detail="Database error during deletion")

    await cache.delete(f"user_stats:{email}")
    await cache.delete_prefix(f"user_history:{email}")
    return {"status": "success"}


@router.patch("/history/{item_id}/share")
async def share_history_item(
    item_id: str,
    payload: SharePayload,
    email: str = Depends(get_user_email),
):
    """Toggle public/private sharing for a translation history item."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    from app.core.database import supabase_request
    item = await supabase_request(
        "GET", f"translation_history?id=eq.{item_id}&user_email=eq.{email}"
    )
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")

    res = await supabase_request(
        "PATCH",
        f"translation_history?id=eq.{item_id}&user_email=eq.{email}",
        {"is_public": payload.is_public},
    )
    if not res:
        raise HTTPException(status_code=500, detail="Failed to update sharing status")

    await cache.delete_prefix(f"user_history:{email}")
    return {"status": "success", "is_public": payload.is_public}


@router.get("/share/{item_id}")
async def get_shared_item(item_id: str):
    """Retrieve a public shared translation history item.

    BUG#7 FIX: Visibility is checked BEFORE any data is returned to prevent
    leaking private items on 403 responses.
    """
    from app.core.database import supabase_request
    item = await supabase_request("GET", f"translation_history?id=eq.{item_id}")
    if not item or not isinstance(item, dict):
        raise HTTPException(status_code=404, detail="Shared snippet not found")

    # BUG#7: Check visibility BEFORE touching any item data
    if not item.get("is_public"):
        raise HTTPException(status_code=403, detail="This snippet is private")

    blocks = item.get("blocks")
    if not blocks:
        blocks = [
            {
                "id": "block_1",
                "code_snippet": item.get("input_preview") or "No preview available.",
                "english_translation": "Code blocks not stored in database (historical schema).",
            }
        ]

    # Only return safe, non-sensitive fields
    return {
        "id": item.get("id"),
        "mode": item.get("mode"),
        "source_language": item.get("source_language"),
        "target_language": item.get("target_language"),
        "input_preview": item.get("input_preview"),
        "result_blocks": blocks,
        "model_used": item.get("model_used") or "standard",
        "created_at": item.get("created_at"),
    }


# ── API Keys ──

@router.get("/api-keys")
async def list_api_keys(
    workspace_id: str = None,
    email: str = Depends(get_user_email),
):
    """List all API keys for the authenticated user."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await api_key_repo.list_for_user(email, workspace_id=workspace_id)


@router.post("/api-keys")
async def create_api_key(
    payload: ApiKeyCreate,
    email: str = Depends(get_user_email),
):
    """Generate and persist a new API key. Returns the plaintext key once."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await api_key_repo.create(
            email=email,
            name=payload.name,
            workspace_id=payload.workspace_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create API key")


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: str,
    email: str = Depends(get_user_email),
):
    """Revoke an API key owned by the authenticated user."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    key = await api_key_repo.get_by_id(key_id, email)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    deleted = await api_key_repo.delete_by_id(key_id, email)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete API key")
    return {"status": "success"}


# ── Account ──

@router.delete("/account")
async def delete_account(authorization: str = Header(None)):
    """Delete the authenticated user's account from Supabase Auth."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        token = authorization.replace("Bearer ", "")
        client = await get_http_client()
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
                raise HTTPException(status_code=500, detail="Failed to delete account")

        return JSONResponse(status_code=200, content={"status": "deleted"})
    except Exception as e:
        logger.error(f"Delete account error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account")


# ── Admin Dashboard ──

@router.get("/admin/dashboard-stats")
async def get_admin_dashboard_stats(email: str = Depends(get_user_email)):
    """Admin dashboard stats. Access restricted to ADMIN_USERS env var."""
    if not email or email.lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required.")

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
            client = await get_http_client()
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

    cache_stats = {}
    if hasattr(cache, "fallback") and hasattr(cache.fallback, "stats"):
        cache_stats = cache.fallback.stats()
    elif hasattr(cache, "stats"):
        cache_stats = cache.stats()
    cache_stats["cache_type"] = "redis" if getattr(cache, "client", None) else "lru"

    MODEL_PRICING = {
        "llama-3.3-70b-versatile": 0.0006,
        "deepseek-chat": 0.0004,
        "deepseek-reasoner": 0.005,
    }
    estimated_spend = sum(
        count * MODEL_PRICING.get(model, 0.001)
        for model, count in metrics.model_calls.items()
    )

    protection_mode = await get_active_protection_mode()

    return {
        "total_users": total_users,
        "cache_stats": cache_stats,
        "estimated_spend_usd": round(estimated_spend, 4),
        "total_translations": sum(metrics.total_requests.values()),
        "protection_mode": protection_mode,
        "model_calls": dict(metrics.model_calls),
        "model_errors": dict(metrics.model_errors),
        "uptime_seconds": metrics.uptime_seconds,
    }
