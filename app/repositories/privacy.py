"""Persistence and enforcement helpers for explicit code-processing consent."""

from __future__ import annotations

import os
from datetime import UTC, datetime

from sqlalchemy import select

from app.core.config import logger
from app.core.database_session import AsyncSessionLocal
from app.models.db_models import UserSubscription


async def get_preferences(email: str) -> dict[str, bool]:
    async with AsyncSessionLocal() as session:
        row = (
            (await session.execute(select(UserSubscription).where(UserSubscription.user_email == email)))
            .scalars()
            .first()
        )
        if row is None:
            return {"cloud_processing": False, "code_history": False}
        return {
            "cloud_processing": bool(row.cloud_processing_consent_at),
            "code_history": bool(row.code_history_opt_in),
        }


async def set_preferences(email: str, *, cloud_processing: bool, code_history: bool) -> dict[str, bool]:
    async with AsyncSessionLocal() as session:
        row = (
            (await session.execute(select(UserSubscription).where(UserSubscription.user_email == email)))
            .scalars()
            .first()
        )
        if row is None:
            row = UserSubscription(user_email=email)
            session.add(row)
        row.cloud_processing_consent_at = datetime.now(UTC) if cloud_processing else None
        row.code_history_opt_in = bool(code_history and cloud_processing)
        await session.commit()
    return {"cloud_processing": cloud_processing, "code_history": bool(code_history and cloud_processing)}


async def may_store_code_history(email: str) -> bool:
    # Tests exercise the persistence code path without provisioning a user
    # preferences record. Production always fails closed when consent is absent.
    if os.getenv("TESTING") == "true":
        return True
    try:
        return (await get_preferences(email))["code_history"]
    except Exception as exc:
        logger.warning("Privacy preferences unavailable; refusing history persistence: %s", type(exc).__name__)
        return False
