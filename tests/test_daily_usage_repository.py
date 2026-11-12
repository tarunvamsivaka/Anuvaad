"""Durable quota counter regression tests."""

import asyncio
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.db_models import DailyUsage
from app.repositories.daily_usage import increment_in_session


@pytest.mark.asyncio
async def test_daily_usage_upsert_is_atomic_under_concurrency(tmp_path):
    database_path = tmp_path / "daily-usage.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}", connect_args={"timeout": 30})
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    user_email = "concurrent-quota@example.com"
    usage_date = datetime.now(UTC).date()

    async with engine.begin() as connection:
        await connection.run_sync(DailyUsage.__table__.create)

    async def reserve_one():
        async with session_factory() as session:
            return await increment_in_session(session, user_email, usage_date)

    try:
        counts = await asyncio.gather(*(reserve_one() for _ in range(10)))
        assert sorted(counts) == list(range(1, 11))

        async with session_factory() as session:
            adopted_count = await increment_in_session(session, user_email, usage_date, minimum_count=15)
        assert adopted_count == 16
    finally:
        await engine.dispose()
