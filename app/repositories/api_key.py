"""
app/repositories/api_key.py

Typed repository for api_keys table.
Phase 5 (Arch#2.1): Typed SQLAlchemy queries replacing ad-hoc supabase_request() calls
that were previously scattered inside app/routers/history.py.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone

from sqlalchemy import select, update, delete
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


async def list_for_user(
    email: str,
    workspace_id: str | None = None,
) -> list[dict]:
    """Return API key summaries belonging to *email*, optionally filtered by workspace."""
    async with AsyncSessionLocal() as session:
        try:
            stmt = (
                select(
                    ApiKey.id,
                    ApiKey.name,
                    ApiKey.key_prefix,
                    ApiKey.created_at,
                    ApiKey.last_used_at,
                )
                .where(ApiKey.user_email == email)
                .order_by(ApiKey.created_at.desc())
            )
            if workspace_id:
                stmt = stmt.where(ApiKey.workspace_id == workspace_id)
            else:
                stmt = stmt.where(ApiKey.workspace_id.is_(None))

            result = await session.execute(stmt)
            return [row._asdict() for row in result.all()]
        except Exception as e:
            logger.error(f"api_key.list_for_user({email}): {e}")
            return []


async def create(
    email: str,
    name: str,
    workspace_id: str | None = None,
) -> dict:
    """Generate a new API key, persist its hash, return the row + one-time plaintext key."""
    raw_key = f"ak_{secrets.token_urlsafe(24)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    async with AsyncSessionLocal() as session:
        try:
            row = ApiKey(
                user_email=email,
                name=name,
                key_prefix=raw_key[:8] + "...",
                api_key_hash=key_hash,
                workspace_id=workspace_id,
                created_at=datetime.now(timezone.utc),
            )
            session.add(row)
            await session.commit()
            await session.refresh(row)
            data = {c.key: getattr(row, c.key) for c in row.__mapper__.columns}
            return {**data, "raw_key": raw_key}
        except Exception as e:
            logger.error(f"api_key.create({email}): {e}")
            await session.rollback()
            raise


async def get_by_id(key_id: str, email: str) -> dict | None:
    """Return the API key row if it belongs to *email*, else None."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(ApiKey)
                .where(ApiKey.id == key_id)
                .where(ApiKey.user_email == email)
            )
            row = result.scalars().first()
            if row is None:
                return None
            return {c.key: getattr(row, c.key) for c in row.__mapper__.columns}
        except Exception as e:
            logger.error(f"api_key.get_by_id({key_id}): {e}")
            return None


async def delete_by_id(key_id: str, email: str) -> bool:
    """Delete the key owned by *email*. Returns True if a row was deleted."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                delete(ApiKey)
                .where(ApiKey.id == key_id)
                .where(ApiKey.user_email == email)
            )
            await session.commit()
            return (result.rowcount or 0) > 0
        except Exception as e:
            logger.error(f"api_key.delete_by_id({key_id}): {e}")
            await session.rollback()
            return False
