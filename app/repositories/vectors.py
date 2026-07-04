import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from app.models.db_models import RepoEmbedding
import uuid

logger = structlog.get_logger(__name__)

async def insert_repo_embeddings(
    db: AsyncSession,
    repository_name: str,
    chunks: List[Dict[str, Any]]
) -> int:
    """
    Inserts a list of repository chunks with their embeddings into the database.
    chunks should be a list of dictionaries containing:
    - file_path: str
    - chunk_index: int
    - content: str
    - embedding: List[float]
    - provider: str (optional)
    """
    if not chunks:
        return 0

    try:
        # In a massive production system, we'd use `bulk_insert_mappings`.
        # For simplicity and given typical repo sizes, adding objects works fine.
        records = [
            RepoEmbedding(
                id=uuid.uuid4(),
                repository_name=repository_name,
                file_path=chunk["file_path"],
                chunk_index=chunk["chunk_index"],
                content=chunk["content"],
                embedding=chunk["embedding"],
                provider=chunk.get("provider", "hf")
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

async def search_repo_embeddings(
    db: AsyncSession,
    repository_name: str,
    query_embedding: List[float],
    top_k: int = 5,
    provider: str = "hf",
) -> List[Any]:
    """Search for similar code chunks using cosine distance.

    FIX-audit-7: `provider` is now an explicit parameter instead of being
    inferred from the embedding dimension (`len > 1000`). The caller must pass
    the same provider string that was used during indexing so the WHERE filter
    matches the correct embedding rows.

    Args:
        db: Async SQLAlchemy session.
        repository_name: "owner/repo" identifier.
        query_embedding: Vector to search against.
        top_k: Maximum number of results to return.
        provider: "openai" | "hf" — must match what was used at index time.
    """
    from sqlalchemy import select

    try:
        # Use cosine distance operator '<=>' (pgvector)
        stmt = (
            select(
                RepoEmbedding.file_path,
                RepoEmbedding.content,
                RepoEmbedding.embedding.cosine_distance(query_embedding).label("similarity"),
            )
            .where(RepoEmbedding.repository_name == repository_name)
            .where(RepoEmbedding.provider == provider)
            .order_by("similarity")
            .limit(top_k)
        )

        result = await db.execute(stmt)
        return result.all()
    except Exception as e:
        logger.error(f"Search query failed for {repository_name}: {e}")
        return []
