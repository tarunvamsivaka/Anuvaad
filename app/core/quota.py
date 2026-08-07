import os
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, Request

from app.core.auth import get_client_ip, get_user_pro_status
from app.core.cache import cache
from app.core.config import (
    ADMIN_EMAILS,
    logger,
)
from app.domain.quota.policy import compute_quota_policy
from app.repositories import subscription as subscription_repo
from app.repositories import translation as translation_repo
from app.services.email import email_service

UTC = timezone.utc  # noqa: UP017 — datetime.UTC requires Python 3.11+; alias for 3.10 compat

# ── History pruning limits (Arch#2.8: unified constants, no more conflicting values) ──
HISTORY_LIMIT_PRO = int(os.getenv("HISTORY_LIMIT_PRO", "1000"))
HISTORY_LIMIT_FREE = int(os.getenv("HISTORY_LIMIT_FREE", "100"))


def raise_quota_429(
    detail: str,
    limit_type: str,
    retry_after_seconds: int = 86400,
    tier_limit: int = 5,
):
    """Raise a standardized HTTP 429 rate limit / quota exception."""
    raise HTTPException(
        status_code=429,
        detail={
            "detail": detail,
            "limit_type": limit_type,
            "retry_after_seconds": retry_after_seconds,
            "tier_limit": tier_limit,
        },
        headers={"Retry-After": str(retry_after_seconds)},
    )


def estimate_tokens(text: str) -> int:
    """Estimate token count for a text string using 4 chars per token heuristic."""
    if not text:
        return 0
    return max(1, len(text) // 4)


async def check_and_track_groq_limits(prompt_text: str, expected_output_tokens: int = 1500) -> None:
    """Track and enforce Groq Free Tier TPM (100k) and RPM (6k) sliding window limits."""
    now = datetime.now(UTC)
    minute_str = now.strftime("%Y%m%d%H%M")

    rpm_key = f"groq_rpm:{minute_str}"
    tpm_key = f"groq_tpm:{minute_str}"

    estimated_input = estimate_tokens(prompt_text)
    total_estimated = estimated_input + expected_output_tokens

    current_rpm = await cache.incr_rate_limit(rpm_key, window=120)
    current_tpm = await cache.incr_rate_limit_by(tpm_key, amount=total_estimated, window=120)

    max_rpm = int(os.getenv("GROQ_MAX_RPM", "6000"))
    max_tpm = int(os.getenv("GROQ_MAX_TPM", "100000"))
    seconds_remaining = max(1, 60 - now.second)

    if current_rpm > max_rpm:
        raise_quota_429(
            detail=f"Groq API request limit reached ({max_rpm:,} RPM). Please try again shortly.",
            limit_type="rpm_limit",
            retry_after_seconds=seconds_remaining,
            tier_limit=max_rpm,
        )

    if current_tpm > max_tpm:
        raise_quota_429(
            detail=f"Groq API token limit reached ({max_tpm:,} TPM). Please wait before submitting more code.",
            limit_type="tpm_limit",
            retry_after_seconds=seconds_remaining,
            tier_limit=max_tpm,
        )


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
            logger.info(f"Pruned {pruned_count} oldest translation history rows for {user_email} (limit={limit}).")

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
    H-02: Uses ORM COUNT(*) — correct and no REST dependency.
    """
    if not email:
        return 0

    today_str = datetime.now(UTC).strftime("%Y-%m-%d")
    usage_cache_key = f"user_daily_usage:{email}:{today_str}"

    cached = await cache.get(usage_cache_key)
    if cached is not None:
        return int(cached)

    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    count = await translation_repo.get_count_since(email, since=today_start)
    await cache.put(usage_cache_key, count, ttl=86400)
    return count


async def increment_today_usage_count(email: str) -> int:
    """Atomically increment daily usage count. Prevents TOCTOU race (FIX-J)."""
    if not email:
        return 0
    today_str = datetime.now(UTC).strftime("%Y-%m-%d")
    key = f"user_daily_usage:{email}:{today_str}"

    cached = await cache.get(key)
    if cached is None:
        today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        count = await translation_repo.get_count_since(email, since=today_start)
        await cache.put(key, count, ttl=86400)

    return await cache.incr_rate_limit(key, 86400)


async def get_user_credits(email: str) -> int:
    """Get the number of translation credits for a user.

    C-03: Uses ORM repository instead of raw supabase_request() REST call.
    """
    if not email:
        return 0
    return await subscription_repo.get_credits(email)


async def deduct_credit(email: str) -> bool:
    """Atomically deduct one translation credit from a user."""
    from sqlalchemy import update

    from app.core.database_session import AsyncSessionLocal
    from app.models.db_models import UserSubscription

    async with AsyncSessionLocal() as session:
        try:
            stmt = (
                update(UserSubscription)
                .where(UserSubscription.user_email == email)
                .where(UserSubscription.credits > 0)
                .values(credits=UserSubscription.credits - 1)
            )
            result = await session.execute(stmt)
            await session.commit()
            return (result.rowcount or 0) > 0
        except Exception as e:
            logger.error(f"deduct_credit failed for {email}: {e}")
            await session.rollback()
            return False


async def get_lifetime_translations(email: str) -> int:
    """Fetch the lifetime translation count for the user."""
    if not email:
        return 0
    ck = f"lifetime_translations:{email}"
    cached = await cache.get(ck)
    if cached is not None:
        return int(cached)

    count = await translation_repo.get_count_since(email)
    await cache.put(ck, count, ttl=60)
    return count


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


async def get_user_limits_and_cooldown(email: str, is_pro: bool) -> tuple[int, int, int]:
    """Returns (daily_limit, char_limit, cooldown_seconds) based on tier and protection mode."""
    mode = await get_active_protection_mode()
    is_admin = email.lower() in ADMIN_EMAILS if email else False
    policy = compute_quota_policy(is_pro=is_pro, is_admin=is_admin, is_guest=not bool(email), mode=mode)
    return policy.daily_limit, policy.char_limit, policy.cooldown


async def enforce_quotas_and_protection(
    request: Request, email: str | None, char_count: int
) -> tuple[bool, int, bool, int]:
    """
    Enforces the sequential quota and protection checks for guest, free, and pro users.

    Returns: (is_pro, daily_limit, deduct_credit_flag, cooldown)
    """
    if char_count > 50000:
        raise HTTPException(
            status_code=413,
            detail="Request payload exceeds absolute maximum size of 50,000 characters.",
        )

    mode = await get_active_protection_mode()

    # ── Guest rate limiting (5 translations/day per client IP) ──
    if not email:
        client_ip = get_client_ip(request)
        policy = compute_quota_policy(is_pro=False, is_admin=False, is_guest=True, mode=mode)

        if policy.char_limit != -1 and char_count > policy.char_limit:
            raise HTTPException(
                status_code=413,
                detail=f"Input size ({char_count} chars) exceeds the guest limit of {policy.char_limit} chars.",
            )

        today_str = datetime.now(UTC).strftime("%Y-%m-%d")
        guest_key = f"guest_daily_usage:{client_ip}:{today_str}"
        guest_usage = await cache.incr_rate_limit(guest_key, 86400)

        if guest_usage > policy.daily_limit:
            raise_quota_429(
                detail=f"Daily translation limit reached for guest tier ({policy.daily_limit}/{policy.daily_limit}).",
                limit_type="guest_daily_limit",
                retry_after_seconds=86400,
                tier_limit=policy.daily_limit,
            )

        return False, policy.daily_limit, False, policy.cooldown

    # ── Signed-in User ──
    is_pro = await get_user_pro_status(email)
    is_admin = email.lower() in ADMIN_EMAILS
    policy = compute_quota_policy(is_pro=is_pro, is_admin=is_admin, mode=mode)
    daily_limit, char_limit, cooldown = policy.daily_limit, policy.char_limit, policy.cooldown

    if char_limit != -1 and char_count > char_limit:
        raise HTTPException(
            status_code=413,
            detail=f"Input size ({char_count} chars) exceeds the current limit of {char_limit} chars for your tier and protection mode.",
        )

    if cooldown > 0:
        cooldown_key = f"cooldown:{email}"
        cooldown_active = await cache.get(cooldown_key)
        if cooldown_active:
            raise_quota_429(
                detail=f"Please wait {cooldown} seconds between requests. Cooldown active.",
                limit_type="user_daily_limit",
                retry_after_seconds=cooldown,
                tier_limit=daily_limit,
            )

    deduct_credit_flag = False
    if not is_pro and not is_admin and daily_limit != -1:
        today_usage = await increment_today_usage_count(email)
        if today_usage > daily_limit:
            deduct_credit_flag = True
            credits = await get_user_credits(email)
            if credits <= 0:
                raise_quota_429(
                    detail=f"Daily translation limit reached for user tier ({daily_limit}/{daily_limit}). Upgrade to Pro for unlimited access.",
                    limit_type="user_daily_limit",
                    retry_after_seconds=86400,
                    tier_limit=daily_limit,
                )

    return is_pro, daily_limit, deduct_credit_flag, cooldown


async def enforce_workspace_quota(
    workspace_id: str,
    owner_email: str,
    is_pro: bool,
) -> None:
    """Enforce workspace-level daily translation quota."""
    if is_pro:
        return

    mode = await get_active_protection_mode()
    is_admin = owner_email.lower() in ADMIN_EMAILS
    policy = compute_quota_policy(is_pro=False, is_admin=is_admin, mode=mode)
    daily_limit = policy.daily_limit

    from app.repositories import translation as translation_repo

    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    workspace_today = await translation_repo.get_count_since(
        owner_email,
        workspace_id=workspace_id,
        since=today_start,
    )
    if workspace_today >= daily_limit:
        raise_quota_429(
            detail=f"Workspace daily limit reached ({daily_limit} translations/day). Upgrade the workspace owner to Pro for unlimited access.",
            limit_type="user_daily_limit",
            retry_after_seconds=86400,
            tier_limit=daily_limit,
        )


async def check_free_tier_limit(email: str | None, is_pro: bool, request: Request) -> None:
    await enforce_quotas_and_protection(request, email, 0)


async def record_successful_completion(email: str | None, is_pro: bool, deduct_credit_flag: bool, cooldown: int = 0):
    """Record a successful translation completion."""
    await increment_platform_daily_usage()
    if not email:
        return

    if deduct_credit_flag:
        await deduct_credit(email)

    if cooldown > 0:
        cooldown_key = f"cooldown:{email}"
        await cache.put(cooldown_key, True, ttl=cooldown)
