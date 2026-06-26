"""
app/repositories/translation.py

Typed repository for translation_history table.
Phase 5 (Arch#2.1): Typed SQLAlchemy queries replacing supabase_request() strings.
"""
from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import select, delete, func
from app.core.database_session import AsyncSessionLocal
from app.models.db_models import TranslationHistory
from app.core.config import logger, HISTORY_LIMIT_PRO, HISTORY_LIMIT_FREE


async def get_history(email: str, workspace_id: str | None = None, limit: int = 20, offset: int = 0) -> list[dict]:
    """Return paginated translation history for *email*, newest first."""
    async with AsyncSessionLocal() as session:
        try:
            query = select(TranslationHistory)
            if workspace_id:
                query = query.where(TranslationHistory.workspace_id == workspace_id)
            else:
                query = query.where(TranslationHistory.user_email == email).where(TranslationHistory.workspace_id.is_(None))
                
            result = await session.execute(
                query.order_by(TranslationHistory.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
            rows = result.scalars().all()
            return [{c.key: getattr(r, c.key) for c in r.__mapper__.columns} for r in rows]
        except Exception as e:
            logger.error(f"translation.get_history({email}): {e}")
            return []


async def get_count_since(email: str, workspace_id: str | None = None, since: datetime | None = None) -> int:
    """Return the number of translations for *email* since *since* (server-side COUNT).
    If *since* is None, returns the total count.
    """
    async with AsyncSessionLocal() as session:
        try:
            query = select(func.count()).select_from(TranslationHistory)
            if workspace_id:
                query = query.where(TranslationHistory.workspace_id == workspace_id)
            else:
                query = query.where(TranslationHistory.user_email == email).where(TranslationHistory.workspace_id.is_(None))
                
            if since:
                query = query.where(TranslationHistory.created_at >= since)
                
            result = await session.execute(query)
            return result.scalar() or 0
        except Exception as e:
            logger.error(f"translation.get_count_since({email}): {e}")
            return 0


async def save(
    email: str,
    mode: str,
    source_language: str,
    target_language: str | None,
    input_preview: str,
    blocks: list,
    model_used: str,
    workspace_id: str | None = None,
    session_id: str | None = None,
    is_public: bool = False,
) -> dict | None:
    """Insert a new translation_history row and return it."""
    async with AsyncSessionLocal() as session:
        try:
            row = TranslationHistory(
                user_email=email,
                mode=mode,
                source_language=source_language,
                target_language=target_language,
                input_preview=input_preview,
                blocks=blocks,
                model_used=model_used,
                workspace_id=workspace_id,
                session_id=session_id,
                is_public=is_public,
                created_at=datetime.now(timezone.utc),
            )
            session.add(row)
            await session.commit()
            await session.refresh(row)
            return {c.key: getattr(row, c.key) for c in row.__mapper__.columns}
        except Exception as e:
            logger.error(f"translation.save({email}): {e}")
            await session.rollback()
            return None


async def prune_oldest(email: str, is_pro: bool) -> None:
    """Delete oldest history rows beyond the per-tier limit.

    Arch#2.8: Limits come from config constants (HISTORY_LIMIT_PRO / FREE).
    """
    keep = HISTORY_LIMIT_PRO if is_pro else HISTORY_LIMIT_FREE
    async with AsyncSessionLocal() as session:
        try:
            # Find the cutoff row id
            cutoff = await session.execute(
                select(TranslationHistory.id)
                .where(TranslationHistory.user_email == email)
                .order_by(TranslationHistory.created_at.desc())
                .offset(keep)
                .limit(1)
            )
            cutoff_id = cutoff.scalar()
            if cutoff_id is None:
                return  # fewer rows than the limit — nothing to prune

            # Delete all rows older than the cutoff
            await session.execute(
                delete(TranslationHistory)
                .where(TranslationHistory.user_email == email)
                .where(TranslationHistory.created_at <
                       select(TranslationHistory.created_at)
                       .where(TranslationHistory.id == cutoff_id)
                       .scalar_subquery())
            )
            await session.commit()
        except Exception as e:
            logger.error(f"translation.prune_oldest({email}): {e}")
            await session.rollback()
