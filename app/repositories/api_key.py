"""
app/repositories/api_key.py

Typed repository for api_keys table.
Phase 5 (Arch#2.1).
"""
from __future__ import annotations

from sqlalchemy import select, update
from app.core.database_session import AsyncSessionLocal
from app.models.db_models import ApiKey
from app.core.config import logger


async def get_by_hash(key_hash: str) -> dict | None:
    """Look up an API key by its SHA-256 hash.  Returns the full row or None."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(ApiKey).where(ApiKey.api_key_hash == key_hash)
            )
            row = result.scalars().first()
            if row is None:
                return None
            return {c.key: getattr(row, c.key) for c in row.__mapper__.columns}
        except Exception as e:
            logger.error(f"api_key.get_by_hash: {e}")
            return None


async def update_last_used(key_hash: str) -> None:
    """Stamp the last_used_at timestamp for the given key hash."""
    from datetime import datetime, timezone
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(
                update(ApiKey)
                .where(ApiKey.api_key_hash == key_hash)
                .values(last_used_at=datetime.now(timezone.utc))
            )
            await session.commit()
        except Exception as e:
            logger.error(f"api_key.update_last_used: {e}")
            await session.rollback()
