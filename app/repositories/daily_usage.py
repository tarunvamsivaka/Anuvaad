"""Persistent atomic daily usage counters."""

from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import case, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import database_session
from app.models.db_models import DailyUsage


def _dialect_insert(session: AsyncSession):
    bind = session.get_bind()
    if bind.dialect.name == "sqlite":
        from sqlalchemy.dialects.sqlite import insert
    else:
        from sqlalchemy.dialects.postgresql import insert
    return insert


async def increment_in_session(
    session: AsyncSession,
    user_email: str,
    usage_date: date,
    minimum_count: int = 0,
) -> int:
    """Atomically reserve one daily use and return the committed count."""
    insert = _dialect_insert(session)
    now = datetime.now(UTC)
    next_count = max(1, int(minimum_count) + 1)
    statement = insert(DailyUsage).values(
        user_email=user_email,
        usage_date=usage_date,
        usage_count=next_count,
        updated_at=now,
    )
    statement = statement.on_conflict_do_update(
        index_elements=[DailyUsage.user_email, DailyUsage.usage_date],
        set_={
            "usage_count": case(
                (DailyUsage.usage_count + 1 < next_count, next_count),
                else_=DailyUsage.usage_count + 1,
            ),
            "updated_at": now,
        },
    ).returning(DailyUsage.usage_count)
    result = await session.execute(statement)
    count = result.scalar_one()
    await session.commit()
    return int(count)


async def increment_daily_usage(user_email: str, usage_date: date, minimum_count: int = 0) -> int:
    async with database_session.AsyncSessionLocal() as session:
        try:
            return await increment_in_session(session, user_email, usage_date, minimum_count)
        except Exception:
            await session.rollback()
            raise


async def get_daily_usage(user_email: str, usage_date: date) -> int:
    async with database_session.AsyncSessionLocal() as session:
        result = await session.execute(
            select(DailyUsage.usage_count).where(
                DailyUsage.user_email == user_email,
                DailyUsage.usage_date == usage_date,
            )
        )
        count = result.scalar_one_or_none()
        return int(count or 0)


async def prune_before(usage_date: date) -> int:
    """Delete counters outside the current UTC quota window."""
    async with database_session.AsyncSessionLocal() as session:
        try:
            result = await session.execute(delete(DailyUsage).where(DailyUsage.usage_date < usage_date))
            await session.commit()
            return int(result.rowcount or 0)
        except Exception:
            await session.rollback()
            raise
