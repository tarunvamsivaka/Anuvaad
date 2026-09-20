import uuid
from datetime import UTC
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import RepoEmbedding

logger = structlog.get_logger(__name__)


async def insert_repo_embeddings(
    db: AsyncSession,
    repository_name: str,
    chunks: list[dict[str, Any]],
    indexed_by: str | None = None,
) -> int:
    """Inserts a list of repository chunks with their embeddings into the database.

    chunks should be a list of dictionaries containing:
    - file_path: str
    - chunk_index: int
    - content: str
    - embedding: List[float]
    - provider: str (optional)
    - indexed_by: str (optional)
    """
    if not chunks:
        return 0

    from app.services.embedding import pad_embedding_to_1536

    try:
        records = [
            RepoEmbedding(
                id=uuid.uuid4(),
                repository_name=repository_name,
                file_path=chunk["file_path"],
                chunk_index=chunk["chunk_index"],
                content=chunk["content"],
                embedding=pad_embedding_to_1536(chunk["embedding"])
                if isinstance(chunk.get("embedding"), list)
                else chunk.get("embedding"),
                provider=chunk.get("provider", "hf"),
                indexed_by=indexed_by or chunk.get("indexed_by"),
            )
            for chunk in chunks
        ]

        db.add_all(records)
        await db.commit()
        logger.info(f"Successfully inserted {len(records)} embeddings for {repository_name}")
        return len(records)
    except Exception as e:
        await db.rollback()
        logger.error(f"Database error inserting embeddings for {repository_name}: {e}")
        raise


def _is_sqlite_session(session) -> bool:
    try:
        bind = getattr(session, "bind", None)
        if bind is None and hasattr(session, "get_bind"):
            bind_res = session.get_bind()
            if not hasattr(bind_res, "__await__"):
                bind = bind_res
        if bind is not None:
            dialect = getattr(bind, "dialect", None)
            return getattr(dialect, "name", None) == "sqlite"
    except Exception:
        pass
    return False


async def search_repo_embeddings(
    db: AsyncSession,
    repository_name: str,
    query_embedding: list[float],
    top_k: int = 5,
    provider: str = "hf",
    user_email: str | None = None,
) -> list[Any]:
    """Search for similar code chunks using cosine distance.

    FIX-audit-7: `provider` is now an explicit parameter instead of being
    inferred from the embedding dimension (`len > 1000`). The caller must pass
    the same provider string that was used during indexing so the WHERE filter
    matches the correct embedding rows.

    SEC-REPO-03: `user_email` optionally scopes results to repos indexed by
    that user. When provided, only embeddings whose `indexed_by` column matches
    the requesting user are returned, preventing cross-user data access for
    private repositories. If the RepoEmbedding model does not yet have an
    `indexed_by` column (pre-migration), the filter is skipped gracefully.

    Args:
        db: Async SQLAlchemy session.
        repository_name: "owner/repo" identifier.
        query_embedding: Vector to search against.
        top_k: Maximum number of results to return.
        provider: "openai" | "hf" — must match what was used at index time.
        user_email: If provided, scope results to this user's indexed repos.
    """
    import json

    from sqlalchemy import func, select

    try:
        if _is_sqlite_session(db):
            query_str = json.dumps(query_embedding) if isinstance(query_embedding, list) else str(query_embedding)
            dist_expr = func.cosine_distance(RepoEmbedding.embedding, query_str)
        else:
            dist_expr = RepoEmbedding.embedding.cosine_distance(query_embedding)

        similarity_expr = (1.0 - dist_expr).label("similarity")

        stmt = (
            select(
                RepoEmbedding.file_path,
                RepoEmbedding.content,
                similarity_expr,
            )
            .where(RepoEmbedding.repository_name == repository_name)
            .where(RepoEmbedding.provider == provider)
        )

        # SEC-REPO-03: Apply user_email scoping if the column exists on the model.
        # This is a graceful forward-compat check: if indexed_by was added in a
        # later migration, the filter is applied; on older schemas it is skipped.
        if user_email and hasattr(RepoEmbedding, "indexed_by"):
            stmt = stmt.where(RepoEmbedding.indexed_by == user_email)

        stmt = stmt.order_by(dist_expr.asc()).limit(top_k)

        if not _is_sqlite_session(db):
            from sqlalchemy import text as sa_text

            from app.core.config import IVFFLAT_PROBES

            try:
                await db.execute(sa_text(f"SET LOCAL ivfflat.probes = {IVFFLAT_PROBES};"))
            except Exception:
                pass

        result = await db.execute(stmt)
        return result.all()
    except Exception as e:
        logger.error(f"Search query failed for {repository_name}: {e}")
        return []


async def prune_stale_vectors(
    session: AsyncSession | int | None = None,
    days: int = 30,
    db: AsyncSession | None = None,
) -> int:
    """Prune LLMSemanticCache records older than *days* days (default 30).

    Deletes LLMSemanticCache embedding rows whose created_at or last_accessed
    timestamp is older than `days` days. Returns count of deleted rows.
    """
    from datetime import datetime, timedelta

    from sqlalchemy import delete, or_

    from app.models.db_models import LLMSemanticCache

    session_to_use: AsyncSession | None = None
    days_val: int = days

    if isinstance(session, AsyncSession):
        session_to_use = session
    elif isinstance(session, int):
        days_val = session
        session_to_use = db
    elif db is not None:
        session_to_use = db

    cutoff = datetime.now(UTC) - timedelta(days=days_val)

    async def _execute(s: AsyncSession) -> int:
        conditions = [LLMSemanticCache.created_at < cutoff]
        if hasattr(LLMSemanticCache, "last_accessed"):
            conditions.append(LLMSemanticCache.last_accessed < cutoff)

        stmt = delete(LLMSemanticCache).where(or_(*conditions))
        result = await s.execute(stmt)
        count = result.rowcount if result.rowcount is not None and result.rowcount >= 0 else 0
        await s.commit()
        return count

    if session_to_use is not None:
        try:
            return await _execute(session_to_use)
        except Exception as e:
            logger.error(f"vectors.prune_stale_vectors({days_val}): {e}")
            await session_to_use.rollback()
            return 0
    else:
        from app.core.database_session import AsyncSessionLocal

        async with AsyncSessionLocal() as s:
            try:
                return await _execute(s)
            except Exception as e:
                logger.error(f"vectors.prune_stale_vectors({days_val}): {e}")
                await s.rollback()
                return 0
