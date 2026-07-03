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
import base64
import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.responses import JSONResponse

from app.core.config import (
    ADMIN_EMAILS,
    logger,
    metrics,
)
from app.core.cache import cache
from app.core.auth import get_user_email
from app.core.quota import get_active_protection_mode
# FIX-31 (P3-01): Use named constants instead of inline magic numbers
from app.core.constants import DEFAULT_HISTORY_PAGE_SIZE, MAX_HISTORY_PAGE_SIZE
from app.models.schemas import ApiKeyCreate, SharePayload
from app.repositories import translation as translation_repo
from app.repositories import api_key as api_key_repo

router = APIRouter(prefix="", tags=["history"])


# ── Cursor helpers (FIX-13 / P1-07) ──────────────────────────────────────────

def _encode_cursor(item: dict) -> str:
    """Encode the last item's (id, created_at) into an opaque base64 cursor."""
    payload = {
        "id": str(item.get("id", "")),
        "created_at": (
            item["created_at"].isoformat()
            if isinstance(item.get("created_at"), datetime)
            else str(item.get("created_at", ""))
        ),
    }
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def _decode_cursor(cursor: str) -> tuple[str | None, str | None]:
    """Decode a cursor string back into (id, created_at_iso)."""
    try:
        payload = json.loads(base64.urlsafe_b64decode(cursor.encode()))
        return payload.get("id"), payload.get("created_at")
    except Exception:
        return None, None


# ── Translation History ──

@router.get("/history")
async def get_translation_history(
    workspace_id: str | None = None,
    # FIX-31 (P3-01): Use named constants instead of magic numbers
    limit: int = Query(default=DEFAULT_HISTORY_PAGE_SIZE, ge=1, le=MAX_HISTORY_PAGE_SIZE),
    cursor: str | None = Query(default=None),        # FIX-13: opaque keyset cursor
    email: str = Depends(get_user_email),
):
    """Return paginated translation history for the authenticated user.

    FIX-13 (P1-07): Replaced limit/offset with keyset (cursor) pagination.
    This is O(1) at any page depth vs. O(N) for OFFSET.
    FIX-30 (P3-04): Removed redundant `if not email` guard.
    """
    after_id, after_created_at = _decode_cursor(cursor) if cursor else (None, None)

    # Fetch one extra to detect whether there is a next page
    rows = await translation_repo.get_history(
        email,
        workspace_id=workspace_id,
        limit=limit + 1,
        offset=0,
        after_id=after_id,
        after_created_at=after_created_at,
    )

    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = _encode_cursor(items[-1]) if has_more and items else None

    return {
        "items": items,
        "next_cursor": next_cursor,
        "has_more": has_more,
    }


@router.get("/stats")
async def get_translation_stats(
    workspace_id: str | None = None,
    email: str = Depends(get_user_email),
):
    """Return accurate translation counts (total, this week, today) for the dashboard.

    FIX-30 (P3-04): Removed redundant `if not email` guard.
    """
    cache_key = f"user_stats:{email}:{workspace_id}"
    cached = await cache.get(cache_key)
    if cached is not None:
        await metrics.record_cache_hit()
        return cached
    await metrics.record_cache_miss()

    now_utc = datetime.now(timezone.utc)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start_dt = (now_utc - timedelta(days=now_utc.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    total, week, today = await asyncio.gather(
        translation_repo.get_count_since(email, workspace_id=workspace_id, since=None),
        translation_repo.get_count_since(email, workspace_id=workspace_id, since=week_start_dt),
        translation_repo.get_count_since(email, workspace_id=workspace_id, since=today_start),
    )

    res = {"total": total, "week": week, "today": today}
    await cache.put(cache_key, res, ttl=300)
    return res


@router.get("/history/{item_id}")
async def get_single_history_item(item_id: str, email: str = Depends(get_user_email)):
    """Retrieve a specific translation history item owned by the authenticated user.

    FIX-26 (P2-01): Migrated from supabase_request() to ORM translation_repo.
    FIX-30 (P3-04): Removed redundant `if not email` guard.
    """
    item = await translation_repo.get_by_id(item_id, email=email)
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")
    return item


@router.delete("/history/{item_id}")
async def delete_history_item(item_id: str, email: str = Depends(get_user_email)):
    """Delete a single translation history item owned by the authenticated user.

    FIX-26 (P2-01): Migrated from supabase_request()/httpx to ORM translation_repo.
    FIX-30 (P3-04): Removed redundant `if not email` guard.
    """
    deleted = await translation_repo.delete_by_id(item_id, email)
    if not deleted:
        raise HTTPException(status_code=404, detail="History item not found or not owned")

    await cache.delete(f"user_stats:{email}")
    await cache.delete_prefix(f"user_history:{email}")
    return {"status": "success"}


@router.patch("/history/{item_id}/share")
async def share_history_item(
    item_id: str,
    payload: SharePayload,
    email: str = Depends(get_user_email),
):
    """Toggle public/private sharing for a translation history item.

    FIX-26 (P2-01): Migrated from supabase_request() to ORM translation_repo.
    FIX-30 (P3-04): Removed redundant `if not email` guard.
    """
    updated = await translation_repo.update_share_status(item_id, email, payload.is_public)
    if not updated:
        raise HTTPException(status_code=404, detail="History item not found or not owned")

    await cache.delete_prefix(f"user_history:{email}")
    return {"status": "success", "is_public": payload.is_public}


@router.get("/share/{item_id}")
async def get_shared_item(item_id: str):
    """Retrieve a public shared translation history item.

    FIX-26 (P2-01): Migrated from supabase_request() to ORM translation_repo.get_by_id().
    BUG#7 FIX: Visibility is checked BEFORE any data is returned to prevent
    leaking private items on 403 responses.
    """
    item = await translation_repo.get_by_id(item_id, email=None)  # no auth — public endpoint
    if not item:
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
    workspace_id: str | None = None,
    email: str = Depends(get_user_email),
):
    """List all API keys for the authenticated user.

    FIX-30 (P3-04): Removed redundant `if not email` guard.
    """
    return await api_key_repo.list_for_user(email, workspace_id=workspace_id)


@router.post("/api-keys")
async def create_api_key(
    payload: ApiKeyCreate,
    email: str = Depends(get_user_email),
):
    """Generate and persist a new API key. Returns the plaintext key once.

    FIX-30 (P3-04): Removed redundant `if not email` guard.
    """
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
    """Revoke an API key owned by the authenticated user.

    FIX-30 (P3-04): Removed redundant `if not email` guard.
    """
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
