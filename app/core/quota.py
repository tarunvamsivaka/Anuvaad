import os
import uuid
from datetime import datetime, timezone
from fastapi import Request, HTTPException
from app.core.config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    logger,
    get_http_client,
)
from app.core.database import supabase_request, supabase_request_list
from app.core.cache import cache
from app.core.auth import get_user_pro_status
from app.services.email import email_service


async def save_translation_background(
    user_email: str,
    mode: str,
    source_language: str,
    target_language: str,
    input_text: str,
    blocks: list,
    model_used: str,
    workspace_id: str | None = None,
    session_id: str | None = None,
    repository_name: str | None = None,
    file_path: str | None = None,
):
    import sys
    import inspect
    main_mod = sys.modules.get("main")
    if main_mod:
        main_func = getattr(main_mod, "save_translation_background", None)
        if main_func and main_func is not save_translation_background:
            res = main_func(user_email, mode, source_language, target_language, input_text, blocks, model_used, workspace_id, session_id, repository_name, file_path)
            if inspect.isawaitable(res):
                return await res
            return res

    if not user_email:
        return
    try:
        input_preview = input_text[:80]
        char_count = len(input_text)
        block_count = len(blocks)
        new_id = str(uuid.uuid4())

        data = {
            "id": new_id,
            "user_email": user_email,
            "mode": mode,
            "source_language": source_language,
            "target_language": target_language,
            "input_preview": input_preview,
            "char_count": char_count,
            "block_count": block_count,
            "model_used": model_used,
        }

        # Legacy fields for backward compatibility with older schemas
        data["title"] = input_preview
        data["character_count"] = char_count

        if workspace_id:
            data["workspace_id"] = workspace_id
        if session_id:
            data["session_id"] = session_id
        if repository_name:
            data["repository_name"] = repository_name
        if file_path:
            data["file_path"] = file_path

        # ── Storage Allocation & Pruning ──
        is_pro = await get_user_pro_status(user_email)
        limit = 1000 if is_pro else 100

        # Fetch current history records ordered by creation date (oldest first)
        all_rows = await supabase_request_list(
            f"translation_history?user_email=eq.{user_email}&select=id,created_at&order=created_at.asc"
        )

        current_count = len(all_rows)
        pruned_count = 0

        # Use module-level SUPABASE config (patch app.core.quota.SUPABASE_URL in tests)
        url_config = SUPABASE_URL
        key_config = SUPABASE_SERVICE_KEY

        if current_count >= limit:
            pruned_count = (current_count + 1) - limit
            to_delete_ids = [
                row["id"]
                for row in all_rows[:pruned_count]
                if isinstance(row, dict) and "id" in row
            ]

            if to_delete_ids and url_config and key_config:
                headers = {
                    "apikey": key_config,
                    "Authorization": f"Bearer {key_config}",
                }
                ids_param = ",".join(to_delete_ids)
                url = f"{url_config}/rest/v1/translation_history?id=in.({ids_param})"
                try:
                    http_client = await get_http_client()
                    resp = await http_client.delete(url, headers=headers)
                    if resp.status_code not in (200, 204):
                        logger.warning(
                            f"Failed to prune old translation history items: {resp.status_code} {resp.text}"
                        )
                    else:
                        logger.info(
                            f"Pruned {len(to_delete_ids)} oldest translation history rows for {user_email} to enforce limit of {limit}."
                        )
                except Exception as prune_err:
                    logger.warning(f"Prune delete failed: {prune_err}")
        # Dynamically query allowed database columns to prevent PGRST204 column mismatches
        from app.core.database import get_history_columns
        allowed_cols = await get_history_columns()

        # Build insert payload containing blocks only if the column exists in the schema
        insert_data = {**data}
        if "blocks" in allowed_cols:
            insert_data["blocks"] = blocks

        # Filter to strictly present database columns
        filtered_payload = {k: v for k, v in insert_data.items() if k in allowed_cols}
        await supabase_request("POST", "translation_history", filtered_payload)

        # Invalidate stats and history caches
        await cache.delete(f"user_stats:{user_email}")
        await cache.delete_prefix(f"user_history:{user_email}")

        # ── Welcome email for first-time users + Milestone email check ──
        try:
            total_count = current_count + 1 - pruned_count
            if total_count == 1:
                email_service.send_welcome(user_email)
            elif total_count in (10, 100, 500):
                email_service.send_translation_milestone(user_email, total_count)
        except Exception as milestone_err:
            logger.warning(f"Welcome/milestone email check failed: {milestone_err}")
    except Exception as e:
        logger.warning(f"Failed to save translation history in background: {e}")


async def get_today_usage_count(email: str) -> int:
    """Count how many translations a user has made today (UTC)."""
    import sys
    import inspect
    main_mod = sys.modules.get("main")
    if main_mod:
        main_func = getattr(main_mod, "get_today_usage_count", None)
        if main_func and main_func is not get_today_usage_count:
            res = main_func(email)
            if inspect.isawaitable(res):
                return await res
            return res

    # Resolve SUPABASE config dynamically for test mocking compatibility
    url = SUPABASE_URL
    key = SUPABASE_SERVICE_KEY
    if main_mod:
        url = getattr(main_mod, "SUPABASE_URL", url)
        key = getattr(main_mod, "SUPABASE_SERVICE_KEY", key)

    if not email or not url or not key:
        return 0
    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00Z")
    path = f"translation_history?user_email=eq.{email}&created_at=gte.{today_start}&select=id"
    rows = await supabase_request_list(path)
    return len(rows)


async def get_user_credits(email: str) -> int:
    """Get the number of translation credits for a user."""
    if not email:
        return 0
    sub = await supabase_request(
        "GET", f"user_subscriptions?user_email=eq.{email}&select=credits"
    )
    if sub and isinstance(sub, dict):
        return sub.get("credits") or 0
    return 0


async def deduct_credit(email: str) -> bool:
    """Deduct one translation credit from a user. Returns True if successful."""
    if not email:
        return False
    sub = await supabase_request(
        "GET", f"user_subscriptions?user_email=eq.{email}&select=credits"
    )
    if not sub or not isinstance(sub, dict):
        return False
    current = sub.get("credits") or 0
    if current <= 0:
        return False
    result = await supabase_request(
        "PATCH",
        f"user_subscriptions?user_email=eq.{email}&credits=eq.{current}",
        {"credits": current - 1},
    )
    return result is not None


async def get_lifetime_translations(email: str) -> int:
    """Fetch the lifetime translation count for the user from Supabase."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return 0
    cache_key = f"lifetime_translations:{email}"
    cached = await cache.get(cache_key)
    if cached is not None:
        return int(cached)

    base_headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Prefer": "count=exact",
        "Range-Unit": "items",
        "Range": "0-0",
    }
    url = f"{SUPABASE_URL}/rest/v1/translation_history?user_email=eq.{email}&select=id"
    try:
        http_client = await get_http_client()
        resp = await http_client.get(url, headers=base_headers)
        if resp.status_code in (200, 206):
            content_range = resp.headers.get("Content-Range", "")
            if "/" in content_range:
                count = int(content_range.split("/")[1])
                await cache.put(cache_key, count, ttl=60)  # cache for 1 minute
                return count
    except Exception as e:
        logger.warning(f"Lifetime count query failed: {e}")
    return 0


async def increment_platform_daily_usage() -> int:
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = f"platform_daily_usage:{today_str}"
    count = await cache.incr_rate_limit(key, 86400)
    return count


async def get_platform_daily_usage() -> int:
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = f"platform_daily_usage:{today_str}"
    val = await cache.get(key)
    return int(val) if val is not None else 0


async def get_active_protection_mode() -> str:
    override = os.getenv("PROTECTION_MODE")
    if override:
        override = override.upper()
        if override in ("NORMAL", "CAUTION", "RESTRICTED", "EMERGENCY"):
            return override

    if os.getenv("EMERGENCY_MODE_FLAG", "false").lower() == "true":
        return "EMERGENCY"

    cap = os.getenv("PLATFORM_DAILY_CAP_TRANSLATIONS")
    if not cap:
        return "NORMAL"

    try:
        cap = int(cap)
        if cap <= 0:
            return "NORMAL"

        usage = await get_platform_daily_usage()
        ratio = usage / cap

        if ratio >= 0.95:
            return "EMERGENCY"
        elif ratio >= 0.80:
            return "RESTRICTED"
        elif ratio >= 0.60:
            return "CAUTION"
    except Exception as e:
        logger.error(f"Error calculating protection mode: {e}")

    return "NORMAL"


async def get_user_limits_and_cooldown(
    email: str, is_pro: bool
) -> tuple[int, int, int]:
    """Returns (daily_limit, char_limit, cooldown_seconds) based on category and mode."""
    import sys
    import inspect
    main_mod = sys.modules.get("main")
    if main_mod:
        main_func = getattr(main_mod, "get_user_limits_and_cooldown", None)
        if main_func and main_func is not get_user_limits_and_cooldown:
            res = main_func(email, is_pro)
            if inspect.isawaitable(res):
                return await res
            return res

    mode = await get_active_protection_mode()

    admin_emails = [
        e.strip().lower() for e in os.getenv("ADMIN_USERS", "").split(",") if e.strip()
    ]
    if email.lower() in admin_emails:
        return (999999, 999999, 0)

    if is_pro:
        daily_limit = int(os.getenv("LIMIT_PRO_DAILY", "999999"))
        char_limit = int(os.getenv("LIMIT_PRO_CHARS", "50000"))
        cooldown = 0

        if mode == "RESTRICTED":
            char_limit = min(char_limit, 25000)
            cooldown = 2
        elif mode == "EMERGENCY":
            char_limit = min(char_limit, 10000)
            cooldown = 5
        return daily_limit, char_limit, cooldown

    daily_limit = int(os.getenv("LIMIT_FREE_DAILY", "10"))
    char_limit = int(os.getenv("LIMIT_FREE_CHARS", "10000"))
    cooldown = int(os.getenv("LIMIT_FREE_COOLDOWN", "5"))

    if mode == "CAUTION":
        daily_limit = max(1, int(daily_limit * 0.8))  # 20% reduction
        char_limit = max(100, int(char_limit * 0.8))
        cooldown = 10
    elif mode == "RESTRICTED":
        daily_limit = max(1, int(daily_limit * 0.5))  # 50% reduction
        char_limit = max(100, int(char_limit * 0.5))
        cooldown = 20
    elif mode == "EMERGENCY":
        daily_limit = max(1, int(daily_limit * 0.2))  # 80% reduction
        char_limit = min(300, max(100, int(char_limit * 0.2)))  # only small requests
        cooldown = 30

    return daily_limit, char_limit, cooldown


async def enforce_quotas_and_protection(
    request: Request, email: str | None, char_count: int
) -> tuple[bool, int, bool]:
    """
    Enforces the sequential quota and protection checks.
    """
    if char_count > 50000:
        raise HTTPException(
            status_code=413,
            detail="Request payload exceeds absolute maximum size of 50,000 characters.",
        )

    if not email:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Anonymous users cannot access AI translation tools.",
        )

    is_pro = await get_user_pro_status(email)

    daily_limit, char_limit, cooldown = await get_user_limits_and_cooldown(
        email, is_pro
    )

    if char_count > char_limit:
        raise HTTPException(
            status_code=413,
            detail=f"Input size ({char_count} chars) exceeds the current limit of {char_limit} chars for your tier and protection mode.",
        )

    if cooldown > 0:
        cooldown_key = f"cooldown:{email}"
        cooldown_active = await cache.get(cooldown_key)
        if cooldown_active:
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {cooldown} seconds between requests. Cooldown active.",
            )

    deduct_credit_flag = False
    if not is_pro:
        today_usage = await get_today_usage_count(email)
        if today_usage >= daily_limit:
            deduct_credit_flag = True
            credits = await get_user_credits(email)
            if credits <= 0:
                raise HTTPException(
                    status_code=429,
                    detail=f"Daily translation limit reached ({daily_limit} translations/day). Upgrade to Pro for unlimited access.",
                )

    return is_pro, daily_limit, deduct_credit_flag


async def check_free_tier_limit(
    email: str | None, is_pro: bool, request: Request
) -> None:
    await enforce_quotas_and_protection(request, email, 0)


async def record_successful_completion(
    email: str, is_pro: bool, deduct_credit_flag: bool
):
    if not email:
        return

    await increment_platform_daily_usage()

    if deduct_credit_flag:
        await deduct_credit(email)

    _, _, cooldown = await get_user_limits_and_cooldown(email, is_pro)
    if cooldown > 0:
        cooldown_key = f"cooldown:{email}"
        await cache.put(cooldown_key, True, ttl=cooldown)
