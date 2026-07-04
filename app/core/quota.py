import asyncio
import os
import uuid
from datetime import datetime, timezone

UTC = timezone.utc  # datetime.UTC requires Python 3.11+; alias for 3.10 compat

from fastapi import HTTPException, Request

from app.core.auth import get_user_pro_status
from app.core.cache import cache
from app.core.config import (
    ADMIN_EMAILS,
    SUPABASE_SERVICE_KEY,
    SUPABASE_URL,
    get_http_client,
    logger,
)
from app.domain.quota.policy import compute_quota_policy
from app.repositories import subscription as subscription_repo
from app.repositories import translation as translation_repo
from app.services.email import email_service

# ── History pruning limits (Arch#2.8: unified constants, no more conflicting values) ──
HISTORY_LIMIT_PRO = int(os.getenv("HISTORY_LIMIT_PRO", "1000"))
HISTORY_LIMIT_FREE = int(os.getenv("HISTORY_LIMIT_FREE", "100"))


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

        # ── Storage Allocation & Pruning (H-01: ORM replaces O(N) REST scans) ──
        is_pro = await get_user_pro_status(user_email)
        # Arch#2.8: Use unified constants (was hardcoded 1000/100 here AND 50 in prune_translation_history_task)
        limit = HISTORY_LIMIT_PRO if is_pro else HISTORY_LIMIT_FREE

        # COUNT(*) via ORM — single DB query, no REST, works in test env
        current_count = await translation_repo.get_count_since(user_email)

        pruned_count = 0
        if current_count >= limit:
            # prune_oldest() uses 2 SQL statements (SELECT cutoff + DELETE); no O(N) REST loop
            await translation_repo.prune_oldest(user_email, is_pro)
            pruned_count = (current_count + 1) - limit
            logger.info(
                f"Pruned {pruned_count} oldest translation history rows for {user_email} (limit={limit})."
            )

        # Save new record via ORM (replaces supabase_request POST + get_history_columns guard)
        await translation_repo.save(
            email=user_email,
            mode=mode,
            source_language=source_language,
            target_language=target_language,
            input_preview=input_text[:80],
            blocks=blocks,
            model_used=model_used,
            workspace_id=workspace_id,
            session_id=session_id,
        )

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
    """Count how many translations a user has made today (UTC).
    H-2: Uses Prefer: count=exact HEAD-style request instead of fetching all rows.
    Results are cached for 60 seconds to reduce DB load.
    """
    if not email:
        return 0

    # Check cache first
    usage_cache_key = f"today_usage:{email}"
    cached = await cache.get(usage_cache_key)
    if cached is not None:
        return int(cached)

    from app.core import config
    url = config.SUPABASE_URL
    key = config.SUPABASE_SERVICE_KEY

    if not url or not key:
        return 0

    today_start = datetime.now(UTC).strftime("%Y-%m-%dT00:00:00Z")

    try:
        http_client = await get_http_client()
        resp = await http_client.get(
            f"{url}/rest/v1/translation_history?user_email=eq.{email}&created_at=gte.{today_start}&select=id",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Prefer": "count=exact",
                "Range-Unit": "items",
                "Range": "0-0",
            },
        )
        if resp.status_code in (200, 206):
            content_range = resp.headers.get("Content-Range", "")
            if "/" in content_range:
                count = int(content_range.split("/")[1])
                await cache.put(usage_cache_key, count, ttl=60)
                return count
    except Exception as e:
        logger.warning(f"Usage count REST query failed, falling back to ORM: {e}")

    # H-02: Fallback uses ORM COUNT(*) — correct and no REST dependency
    since = datetime.fromisoformat(today_start.replace("Z", "+00:00"))
    count = await translation_repo.get_count_since(email, since=since)
    await cache.put(usage_cache_key, count, ttl=60)
    return count


async def get_user_credits(email: str) -> int:
    """Get the number of translation credits for a user.

    C-03: Uses ORM repository instead of raw supabase_request() REST call.
    """
    if not email:
        return 0
    return await subscription_repo.get_credits(email)


async def deduct_credit(email: str) -> bool:
    """Atomically deduct one translation credit from a user.

    BUG#1+#5 FIX: Replaced the old two-step read-then-write (TOCTOU race) with
    a single atomic SQL UPDATE that uses a WHERE credits > 0 guard.

    Uses SQLAlchemy column arithmetic so it emits:
        UPDATE user_subscriptions
        SET credits = credits - 1
        WHERE user_email = :email AND credits > 0
    Returns False (no credit deducted) if no rows were matched.
    """
    from sqlalchemy import update

    from app.core.database import TABLE_MODEL_MAP
    from app.core.database_session import (
        AsyncSessionLocal,  # M-05: direct import, no re-export chain
    )

    model = TABLE_MODEL_MAP.get("user_subscriptions")
    if not model:
        logger.error("deduct_credit: user_subscriptions model not found")
        return False

    credits_col = getattr(model, "credits", None)
    email_col = getattr(model, "user_email", None)
    if credits_col is None or email_col is None:
        logger.error("deduct_credit: credits or user_email column not found on model")
        return False

    async with AsyncSessionLocal() as session:
        try:
            stmt = (
                update(model)
                .where(email_col == email)
                .where(credits_col > 0)
                .values(credits=credits_col - 1)
            )
            result = await session.execute(stmt)
            await session.commit()
            # rowcount > 0 means the WHERE matched (credits were > 0 and decremented)
            return (result.rowcount or 0) > 0
        except Exception as e:
            logger.error(f"deduct_credit failed for {email}: {e}")
            await session.rollback()
            return False



async def get_lifetime_translations(email: str) -> int:
    """Fetch the lifetime translation count for the user from Supabase."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return 0
    ck = f"lifetime_translations:{email}"
    cached = await cache.get(ck)
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
                await cache.put(ck, count, ttl=60)
                return count
    except Exception as e:
        logger.warning(f"Lifetime count query failed: {e}")
    return 0


async def increment_platform_daily_usage() -> int:
    today_str = datetime.now(UTC).strftime("%Y-%m-%d")
    key = f"platform_daily_usage:{today_str}"
    count = await cache.incr_rate_limit(key, 86400)
    return count


async def get_platform_daily_usage() -> int:
    today_str = datetime.now(UTC).strftime("%Y-%m-%d")
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
    """Returns (daily_limit, char_limit, cooldown_seconds) based on tier and protection mode.

    Delegates the pure limit calculation to domain/quota/policy.py (QuotaPolicy),
    which is the single source of truth.  No logic duplication.
    """
    mode = await get_active_protection_mode()
    is_admin = email.lower() in ADMIN_EMAILS
    policy = compute_quota_policy(is_pro=is_pro, is_admin=is_admin, mode=mode)
    return policy.daily_limit, policy.char_limit, policy.cooldown


async def enforce_quotas_and_protection(
    request: Request, email: str | None, char_count: int
) -> tuple[bool, int, bool, int]:
    """
    Enforces the sequential quota and protection checks.

    H-1: Parallelizes independent DB calls with asyncio.gather.
    M-7/Arch#4.3: Returns cooldown as 4th element so callers don't re-fetch.
    Delegates limit computation to QuotaPolicy (single source of truth).

    Returns: (is_pro, daily_limit, deduct_credit_flag, cooldown)
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

    # H-1: Parallel I/O — pro status check and protection mode are independent
    is_pro, mode = await asyncio.gather(
        get_user_pro_status(email),
        get_active_protection_mode(),
    )

    # Delegate pure limit computation to the domain policy object
    is_admin = email.lower() in ADMIN_EMAILS
    policy = compute_quota_policy(is_pro=is_pro, is_admin=is_admin, mode=mode)
    daily_limit, char_limit, cooldown = policy.daily_limit, policy.char_limit, policy.cooldown

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
    if not is_pro and not is_admin:
        today_usage = await get_today_usage_count(email)
        if today_usage >= daily_limit:
            deduct_credit_flag = True
            credits = await get_user_credits(email)
            if credits <= 0:
                raise HTTPException(
                    status_code=429,
                    detail=f"Daily translation limit reached ({daily_limit} translations/day). Upgrade to Pro for unlimited access.",
                )

    return is_pro, daily_limit, deduct_credit_flag, cooldown


async def enforce_workspace_quota(
    workspace_id: str,
    owner_email: str,
    is_pro: bool,
) -> None:
    """FIX-21 (P2-02): Enforce workspace-level daily translation quota.

    Workspace requests share the owner's daily quota bucket. A free-tier owner
    cannot bypass their daily limit by routing through a workspace.

    If the owner is Pro (unlimited), this check is skipped.
    """
    if is_pro:
        return  # Pro workspaces have no daily limit

    # Reuse user quota limits for workspace owner
    mode = await get_active_protection_mode()
    is_admin = owner_email.lower() in ADMIN_EMAILS
    policy = compute_quota_policy(is_pro=False, is_admin=is_admin, mode=mode)
    daily_limit = policy.daily_limit

    # Count workspace-scoped translations today
    from app.repositories import translation as translation_repo
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    workspace_today = await translation_repo.get_count_since(
        owner_email,
        workspace_id=workspace_id,
        since=today_start,
    )
    if workspace_today >= daily_limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Workspace daily limit reached ({daily_limit} translations/day). "
                "Upgrade the workspace owner to Pro for unlimited access."
            ),
        )


async def check_free_tier_limit(
    email: str | None, is_pro: bool, request: Request
) -> None:
    await enforce_quotas_and_protection(request, email, 0)


async def record_successful_completion(
    email: str, is_pro: bool, deduct_credit_flag: bool, cooldown: int = 0
):
    """Record a successful translation completion.

    M-7/Arch#4.3: Accepts cooldown as parameter (passed from enforce_quotas_and_protection)
    instead of calling get_user_limits_and_cooldown again (eliminated one redundant DB call).
    """
    if not email:
        return

    await increment_platform_daily_usage()

    if deduct_credit_flag:
        await deduct_credit(email)

    if cooldown > 0:
        cooldown_key = f"cooldown:{email}"
        await cache.put(cooldown_key, True, ttl=cooldown)
