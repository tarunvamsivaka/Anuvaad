"""
app/repositories/api_key.py

Typed repository for api_keys table.
Phase 5 (Arch#2.1): Typed SQLAlchemy queries replacing ad-hoc supabase_request() calls
that were previously scattered inside app/routers/history.py.

FIX-27 (P2-06): New API keys are hashed with Argon2id (OWASP recommended).
Existing SHA-256 keys are upgraded transparently on first successful use.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone

from sqlalchemy import select, update, delete
from app.core.database_session import AsyncSessionLocal
from app.models.db_models import ApiKey
from app.core.config import logger


def _sha256_hash(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def _argon2_hash(raw_key: str) -> str:
    """Hash an API key with Argon2id (OWASP-recommended KDF)."""
    from argon2 import PasswordHasher
    ph = PasswordHasher(
        time_cost=2,          # iterations
        memory_cost=65536,    # 64 MiB
        parallelism=2,        # threads
        hash_len=32,
        salt_len=16,
    )
    return ph.hash(raw_key)


def _argon2_verify(raw_key: str, stored_hash: str) -> bool:
    """Verify a raw key against an Argon2id hash."""
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError, InvalidHashError
    ph = PasswordHasher()
    try:
        return ph.verify(stored_hash, raw_key)
    except (VerifyMismatchError, InvalidHashError):
        return False


async def get_by_hash(key_hash: str) -> dict | None:
    """Look up an API key by its SHA-256 hash.

    FIX-27: This function now also handles Argon2id hashes — but since Argon2id
    hashes are not deterministic, the raw key must be passed to verify.
    Use get_by_raw_key() for Argon2id lookups.
    Returns the full row or None.
    """
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


async def get_by_raw_key(raw_key: str) -> dict | None:
    """Authenticate a raw API key against stored hash (SHA-256 or Argon2id).

    FIX-27 (P2-06): Supports both SHA-256 (legacy) and Argon2id (new) hashes.
    On successful auth with a SHA-256 key, transparently upgrades to Argon2id.
    """
    async with AsyncSessionLocal() as session:
        try:
            # 1. Try SHA-256 fast path (legacy keys)
            sha_hash = _sha256_hash(raw_key)
            result = await session.execute(
                select(ApiKey).where(ApiKey.api_key_hash == sha_hash)
            )
            row = result.scalars().first()

            if row:
                # FIX-27: Upgrade SHA-256 hash to Argon2id transparently
                new_hash = _argon2_hash(raw_key)
                await session.execute(
                    update(ApiKey)
                    .where(ApiKey.id == row.id)
                    .values(api_key_hash=new_hash, key_hash_algo="argon2id")
                )
                await session.commit()
                await session.refresh(row)
                return {c.key: getattr(row, c.key) for c in row.__mapper__.columns}

            # 2. Argon2id path: must check all argon2id keys with prefix match
            # We only load keys with the same 8-char prefix for efficiency
            prefix = raw_key[:8] + "..."
            result = await session.execute(
                select(ApiKey).where(
                    ApiKey.key_prefix == prefix,
                    ApiKey.key_hash_algo == "argon2id",
                )
            )
            candidates = result.scalars().all()
            for candidate in candidates:
                if _argon2_verify(raw_key, candidate.api_key_hash):
                    return {c.key: getattr(candidate, c.key) for c in candidate.__mapper__.columns}

            return None
        except Exception as e:
            logger.error(f"api_key.get_by_raw_key: {e}")
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
    """Generate a new API key, persist its Argon2id hash, return the row + one-time plaintext key.

    FIX-27 (P2-06): New keys are hashed with Argon2id instead of SHA-256.
    """
    raw_key = f"ak_{secrets.token_urlsafe(24)}"
    key_hash = _argon2_hash(raw_key)  # FIX-27: Argon2id for new keys

    async with AsyncSessionLocal() as session:
        try:
            row = ApiKey(
                user_email=email,
                name=name,
                key_prefix=raw_key[:8] + "...",
                api_key_hash=key_hash,
                key_hash_algo="argon2id",  # FIX-27
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


async def delete_all_for_user(email: str) -> int:
    """M-01: Hard-delete all API keys for a user (used during account deletion).

    Removes all api_keys rows for the user so no orphaned tokens remain
    after the Supabase Auth account is deleted.
    Returns the number of rows deleted.
    """
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                delete(ApiKey)
                .where(ApiKey.user_email == email)
                .returning(ApiKey.id)
            )
            deleted_rows = result.fetchall()
            await session.commit()
            return len(deleted_rows)
        except Exception as e:
            logger.error(f"api_key.delete_all_for_user({email}): {e}")
            await session.rollback()
            return 0
