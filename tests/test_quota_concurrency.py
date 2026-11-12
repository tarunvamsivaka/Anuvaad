"""Tests for Audit 4 Daily Quota Enforcement and Write-Through Caching (PERF-02).

Validates:
1. Dynamic UTC midnight TTL calculation to eliminate 86,400s stale cache drift.
2. Atomic write-through synchronization between database usage and Redis cache.
3. Fail-closed recovery when cache is evicted or disagrees with authoritative database.
4. Concurrency safety preventing quota bypass under burst traffic.
"""

import asyncio
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from app.core import quota
from app.core.cache import cache
from app.domain.quota.policy import compute_quota_policy


@pytest.fixture(autouse=True)
def restore_real_quota_implementations():
    """Undo conftest's autouse mock so we test real quota implementation."""
    quota.increment_today_usage_count = quota._unmocked_increment_today_usage_count
    quota.get_today_usage_count = quota._unmocked_get_today_usage_count
    yield


@pytest.mark.asyncio
async def test_seconds_until_midnight_utc():
    """Verify TTL calculation is dynamically bounded to UTC midnight."""
    ttl = quota._seconds_until_midnight_utc()
    assert 60 <= ttl <= 86400

    # Specific fixed-time check
    fixed_time = datetime(2026, 11, 3, 23, 50, 0, tzinfo=UTC)
    with patch("app.core.quota.datetime") as mock_datetime:
        mock_datetime.now.return_value = fixed_time
        mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)
        ttl_10m = quota._seconds_until_midnight_utc()
        # 10 minutes remaining = 600 seconds
        assert ttl_10m == 600


@pytest.mark.asyncio
async def test_quota_write_through_cache_reseeding():
    """Verify cache misses reseed from the authoritative daily usage row."""
    test_user = "user_reseed_test@example.com"
    today_str = datetime.now(UTC).strftime("%Y-%m-%d")
    cache_key = f"user_daily_usage:{test_user}:{today_str}"

    # Clear cache
    await cache.delete(cache_key)

    with patch("app.core.quota.daily_usage_repo.get_daily_usage", new_callable=AsyncMock, return_value=3):
        count = await quota.get_today_usage_count(test_user)
        assert count == 3
        assert int(await cache.get(cache_key)) == 3

    with patch("app.core.quota.daily_usage_repo.increment_daily_usage", new_callable=AsyncMock, return_value=4):
        new_count = await quota.increment_today_usage_count(test_user)
        assert new_count == 4
        assert int(await cache.get(cache_key)) == 4


@pytest.mark.asyncio
async def test_quota_fail_closed_prevents_bypass_on_cache_eviction():
    """Verify that if cache is cleared when DB has reached limit, user is blocked (429)."""
    test_user = "free_user_limit@example.com"
    today_str = datetime.now(UTC).strftime("%Y-%m-%d")
    cache_key = f"user_daily_usage:{test_user}:{today_str}"

    policy = compute_quota_policy(is_pro=False, is_admin=False)
    limit = policy.daily_limit

    # Cache is cleared / evicted
    await cache.delete(cache_key)

    # The durable daily counter reports the user has already used the limit.
    with (
        patch("app.core.quota.daily_usage_repo.increment_daily_usage", new_callable=AsyncMock) as mock_db,
        patch("app.core.quota.get_user_pro_status", new_callable=AsyncMock) as mock_pro,
        patch("app.core.quota.get_user_credits", new_callable=AsyncMock) as mock_credits,
    ):
        mock_db.return_value = limit + 1
        mock_pro.return_value = False
        mock_credits.return_value = 0

        class DummyRequest:
            headers = {}
            client = None

        req = DummyRequest()

        # Enforce quota check should raise 429 and not grant free translation
        with pytest.raises(HTTPException) as exc_info:
            await quota.enforce_quotas_and_protection(req, email=test_user, char_count=100)

        assert exc_info.value.status_code == 429
        assert "Daily translation limit reached" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_quota_database_failure_fails_closed():
    with patch(
        "app.core.quota.daily_usage_repo.increment_daily_usage",
        new_callable=AsyncMock,
        side_effect=RuntimeError("database unavailable"),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await quota.increment_today_usage_count("db-down-quota@example.com")

    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_concurrent_quota_enforcement_at_limit_boundary():
    """Burst 10 concurrent requests when (limit - 1) quota used; only 1 must succeed."""
    test_user = "concurrent_quota_user@example.com"

    policy = compute_quota_policy(is_pro=False, is_admin=False)
    limit = policy.daily_limit

    # Simulate the database's atomic upsert using a lock-protected counter.
    db_count = limit - 1
    counter_lock = asyncio.Lock()

    class DummyRequest:
        headers = {}
        client = None

    req = DummyRequest()

    with (
        patch("app.core.quota.daily_usage_repo.increment_daily_usage", new_callable=AsyncMock) as mock_db,
        patch("app.core.quota.get_user_pro_status", new_callable=AsyncMock) as mock_pro,
        patch("app.core.quota.get_user_credits", new_callable=AsyncMock) as mock_credits,
    ):

        async def atomic_db_increment(user_email, usage_date, minimum_count=0):
            nonlocal db_count
            async with counter_lock:
                db_count += 1
                return db_count

        mock_db.side_effect = atomic_db_increment
        mock_pro.return_value = False
        mock_credits.return_value = 0

        async def run_check():
            try:
                await quota.enforce_quotas_and_protection(req, email=test_user, char_count=100)
                return "ALLOWED"
            except HTTPException as e:
                if e.status_code == 429:
                    return "REJECTED_429"
                raise

        # Launch 10 concurrent calls
        results = await asyncio.gather(*[run_check() for _ in range(10)])

        allowed_count = results.count("ALLOWED")
        rejected_count = results.count("REJECTED_429")

        # Exactly 1 allowed to hit limit, remaining 9 blocked with 429
        assert allowed_count == 1, f"Expected 1 allowed, got {allowed_count}"
        assert rejected_count == 9, f"Expected 9 rejected, got {rejected_count}"
        usage_key = f"user_daily_usage:{test_user}:{datetime.now(UTC).date().isoformat()}"
        assert int(await cache.get(usage_key)) == limit + 9
