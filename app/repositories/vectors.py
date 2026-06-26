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
                embedding=chunk["embedding"]
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
