"""
app/routers/repo_search.py

GitHub repository RAG endpoints: index, status, and semantic search.

FIX-audit-4: OPENAI_API_KEY is resolved once at module load (not per request)
              and a warning is emitted at startup if it is absent.
FIX-audit-7: Embedding provider is passed explicitly to search_repo_embeddings()
              instead of relying on a dimension-length heuristic.
"""
import os
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func

from app.core.auth import get_user_email
from app.core.database_session import AsyncSessionLocal
from app.models.db_models import RepoEmbedding
from app.queue.tasks import process_github_repo_task
from app.repositories.vectors import search_repo_embeddings
from app.services.embedding import generate_embeddings_openai, generate_embeddings_hf

logger = logging.getLogger("anuvaad")

# ── Resolve embedding provider once at startup ──────────────────────────────
# FIX-audit-4: Fail-fast visibility — log a startup warning when OPENAI_API_KEY
# is absent so operators know the cheaper HuggingFace model will be used.
_OPENAI_API_KEY: str | None = os.environ.get("OPENAI_API_KEY")
_EMBEDDING_PROVIDER: str = "openai" if _OPENAI_API_KEY else "hf"
if not _OPENAI_API_KEY:
    logger.warning(
        "OPENAI_API_KEY is not set — repo search will use HuggingFace embeddings "
        "(384-dim). Set OPENAI_API_KEY to use OpenAI text-embedding-3-small (1536-dim)."
    )

router = APIRouter(prefix="/repo", tags=["repo-search"])


class IndexRepoPayload(BaseModel):
    repo_name: str = Field(..., description="Format: owner/repo")


class SearchRepoPayload(BaseModel):
    repo_name: str
    query: str
    top_k: int = 5


@router.post("/index")
async def index_repo(
    payload: IndexRepoPayload,
    user_email: str = Depends(get_user_email),
):
    """Trigger background indexing of a GitHub repository.

    FIX-30: get_user_email() raises HTTP 401 on missing/invalid auth;
    the caller-side guard is no longer needed.
    """
    # Enqueue background task
    process_github_repo_task.delay(payload.repo_name)
    return {"message": f"Started indexing {payload.repo_name}", "status": "accepted"}


@router.get("/{owner}/{repo}/status")
async def repo_status(
    owner: str,
    repo: str,
    user_email: str = Depends(get_user_email),
):
    """Get indexing status for a repository."""
    repo_name = f"{owner}/{repo}"

    async with AsyncSessionLocal() as session:
        stmt = (
            select(func.count(RepoEmbedding.id))
            .where(RepoEmbedding.repository_name == repo_name)
        )
        result = await session.execute(stmt)
        count = result.scalar() or 0

    return {"repo_name": repo_name, "indexed_chunks": count}


@router.post("/search")
async def search_repo(
    payload: SearchRepoPayload,
    user_email: str = Depends(get_user_email),
):
    """Semantic search over an indexed repository.

    FIX-audit-7: Uses the module-level _EMBEDDING_PROVIDER constant so the
    provider is always consistent between indexing and querying.
    """
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Generate query embedding using the same provider that was used at index time
    try:
        if _EMBEDDING_PROVIDER == "openai":
            embeddings = await generate_embeddings_openai([payload.query])
        else:
            embeddings = await generate_embeddings_hf([payload.query])

        if not embeddings or not embeddings[0]:
            raise ValueError("Embedding generation returned an empty result")

        query_embedding = embeddings[0]
    except Exception as e:
        logger.error(f"Embedding error for query '{payload.query[:50]}': {e}")
        raise HTTPException(status_code=500, detail="Failed to generate query embedding")

    # FIX-audit-7: Pass provider explicitly — no dimension-length heuristic
    async with AsyncSessionLocal() as session:
        results = await search_repo_embeddings(
            session,
            payload.repo_name,
            query_embedding,
            payload.top_k,
            provider=_EMBEDDING_PROVIDER,
        )

    return {
        "repo_name": payload.repo_name,
        "query": payload.query,
        "provider": _EMBEDDING_PROVIDER,
        "results": [
            {
                "file_path": r.file_path,
                "content": r.content,
                "similarity": r.similarity,
            }
            for r in results
        ],
    }
