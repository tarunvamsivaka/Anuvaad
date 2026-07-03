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
    top_k: int = 5
) -> List[Any]:
    """
    Search for similar code chunks using cosine distance.
    """
    from sqlalchemy import select

    try:
        # Get the dimension of the query to ensure we only compare with same-dim embeddings
        # Assuming provider determines dimension. If query_embedding length is 1536, only match provider='openai'
        provider = "openai" if len(query_embedding) > 1000 else "hf"

        # Use cosine distance operator '<=>' for pgvector
        stmt = (
            select(
                RepoEmbedding.file_path,
                RepoEmbedding.content,
                RepoEmbedding.embedding.cosine_distance(query_embedding).label("similarity")
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
