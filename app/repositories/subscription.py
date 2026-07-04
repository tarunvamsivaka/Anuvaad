"""
app/repositories/subscription.py

Typed repository for user_subscriptions table.
Phase 5 (Arch#2.1): Replaces string-based supabase_request() calls for
subscription data with proper SQLAlchemy queries.
"""
from __future__ import annotations

from sqlalchemy import select, update

from app.core.config import logger
from app.core.database_session import AsyncSessionLocal
from app.models.db_models import UserSubscription


async def get_subscription(email: str) -> dict | None:
    """Return the user_subscriptions row for *email*, or None if not found."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(UserSubscription).where(UserSubscription.user_email == email)
            )
            row = result.scalars().first()
            if row is None:
                return None
            return {c.key: getattr(row, c.key) for c in row.__mapper__.columns}
        except Exception as e:
            logger.error(f"subscription.get_subscription({email}): {e}")
            return None


async def get_credits(email: str) -> int:
    """Return current credit balance for *email*, or 0 if no subscription row."""
    sub = await get_subscription(email)
    if sub is None:
        return 0
    return sub.get("credits") or 0


async def atomic_deduct_credit(email: str) -> bool:
    """Atomically decrement credits by 1, only if credits > 0.

    BUG#1+#5 definitive fix (Phase 5): single atomic SQL UPDATE with WHERE guard.
    """
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
            logger.error(f"subscription.atomic_deduct_credit({email}): {e}")
            await session.rollback()
            return False


async def upsert_subscription(email: str, data: dict) -> bool:
    """Insert or update a subscription row.

    Checks for an existing row first; uses UPDATE if found, INSERT otherwise.
    Prevents UNIQUE constraint violations on repeated billing events (BUG#2).
    """
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(UserSubscription).where(UserSubscription.user_email == email)
            )
            existing = result.scalars().first()
            if existing:
                stmt = (
                    update(UserSubscription)
                    .where(UserSubscription.user_email == email)
                    .values(**data)
                )
                await session.execute(stmt)
            else:
                session.add(UserSubscription(user_email=email, **data))
            await session.commit()
            return True
        except Exception as e:
            logger.error(f"subscription.upsert_subscription({email}): {e}")
            await session.rollback()
            return False


async def is_pro(email: str) -> bool:
    """Return True if the user has an active Pro subscription."""
    sub = await get_subscription(email)
    return bool(sub and sub.get("is_pro"))


async def get_pro_status(email: str) -> bool:
    """Alias for is_pro() — preferred name for explicit call-sites."""
    return await is_pro(email)


async def add_credits(email: str, amount: int) -> bool:
    """Atomically add *amount* credits to the user's subscription.

    Upserts the row if it doesn't exist (prevents UNIQUE constraint errors).
    """
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(UserSubscription).where(UserSubscription.user_email == email)
            )
            existing = result.scalars().first()
            if existing:
                stmt = (
                    update(UserSubscription)
                    .where(UserSubscription.user_email == email)
                    .values(credits=UserSubscription.credits + amount)
                )
                await session.execute(stmt)
            else:
                session.add(UserSubscription(
                    user_email=email,
                    credits=amount,
                    is_pro=False,
                    onboarded=False,
                ))
            await session.commit()
            return True
        except Exception as e:
            logger.error(f"subscription.add_credits({email}, {amount}): {e}")
            await session.rollback()
            return False


async def mark_onboarded(email: str) -> bool:
    """FIX-35 (P3-08): Mark the user's onboarding as complete."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(UserSubscription).where(UserSubscription.user_email == email)
            )
            existing = result.scalars().first()
            if existing:
                await session.execute(
                    update(UserSubscription)
                    .where(UserSubscription.user_email == email)
                    .values(onboarded=True)
                )
            else:
                session.add(UserSubscription(
                    user_email=email,
                    is_pro=False,
                    credits=0,
                    onboarded=True,
                ))
            await session.commit()
            return True
        except Exception as e:
            logger.error(f"subscription.mark_onboarded({email}): {e}")
            await session.rollback()
            return False


async def update_by_razorpay_id(razorpay_subscription_id: str, data: dict) -> bool:
    """H-04: Update a subscription row identified by Razorpay subscription ID.

    Used by billing webhook tasks (subscription.charged / subscription.cancelled)
    which identify the subscription by Razorpay ID rather than email.
    Returns True if a row was matched and updated.
    """
    async with AsyncSessionLocal() as session:
        try:
            stmt = (
                update(UserSubscription)
                .where(UserSubscription.razorpay_subscription_id == razorpay_subscription_id)
                .values(**data)
            )
            result = await session.execute(stmt)
            await session.commit()
            return (result.rowcount or 0) > 0
        except Exception as e:
            logger.error(f"subscription.update_by_razorpay_id({razorpay_subscription_id}): {e}")
            await session.rollback()
            return False


async def delete_by_email(email: str) -> bool:
    """M-01: Hard-delete subscription row (used during account deletion).

    Call after all other user data has been removed.
    Returns True if a row existed and was deleted.
    """
    from sqlalchemy import delete as sa_delete
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                sa_delete(UserSubscription)
                .where(UserSubscription.user_email == email)
                .returning(UserSubscription.user_email)
            )
            deleted = result.fetchone()
            await session.commit()
            return deleted is not None
        except Exception as e:
            logger.error(f"subscription.delete_by_email({email}): {e}")
            await session.rollback()
            return False
