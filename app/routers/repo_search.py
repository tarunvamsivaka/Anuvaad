"""
app/routers/repo_search.py

GitHub repository RAG endpoints: index, status, and semantic search.

FIX-audit-4: OPENAI_API_KEY is resolved once at module load (not per request)
              and a warning is emitted at startup if it is absent.
FIX-audit-7: Embedding provider is passed explicitly to search_repo_embeddings()
              instead of relying on a dimension-length heuristic.
SEC-REPO-01: repo_name format validated (owner/repo pattern) before enqueueing.
SEC-REPO-02: /repo/index now verifies the user has a connected GitHub token
             before enqueueing a task, preventing resource abuse / DoS.
SEC-REPO-03: /repo/search scoped to user_email — users cannot search embeddings
             from repositories indexed by other users.
"""

import logging
import os
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select

from app.core.auth import get_user_email
from app.core.database_session import AsyncSessionLocal
from app.core.rate_limit import rate_limiter
from app.models.db_models import RepoEmbedding
from app.queue.tasks import process_github_repo_task
from app.repositories.vectors import search_repo_embeddings
from app.services.embedding import (
    generate_embeddings_hf,
    generate_embeddings_openai,
    pad_embedding_to_1536,
)

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

# SEC-REPO-01: Strict repo_name pattern — must be owner/repo with safe characters only.
_REPO_NAME_RE = re.compile(r"^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$")

router = APIRouter(prefix="/repo", tags=["repo-search"])


class IndexRepoPayload(BaseModel):
    # SEC-REPO-01: pattern enforced at the schema level in addition to regex check
    repo_name: str = Field(..., description="Format: owner/repo")

    @field_validator("repo_name")
    @classmethod
    def validate_repo_name_format(cls, v: str) -> str:
        """SEC-REPO-01: Prevent path traversal and injection via crafted repo names."""
        if not v or not _REPO_NAME_RE.match(v):
            raise ValueError(
                "repo_name must be in 'owner/repo' format using only alphanumeric "
                "characters, hyphens, dots, and underscores."
            )
        return v


class SearchRepoPayload(BaseModel):
    repo_name: str = Field(..., description="Format: owner/repo")
    query: str
    top_k: int = 5

    @field_validator("repo_name")
    @classmethod
    def validate_repo_name_format(cls, v: str) -> str:
        """SEC-REPO-01: Prevent path traversal and injection via crafted repo names."""
        if not v or not _REPO_NAME_RE.match(v):
            raise ValueError(
                "repo_name must be in 'owner/repo' format using only alphanumeric "
                "characters, hyphens, dots, and underscores."
            )
        return v


@router.post("/index", dependencies=[Depends(rate_limiter(3, 60))])
async def index_repo(
    payload: IndexRepoPayload,
    user_email: str = Depends(get_user_email),
):
    """Trigger background indexing of a GitHub repository.

    FIX-30: get_user_email() raises HTTP 401 on missing/invalid auth;
    the caller-side guard is no longer needed.
    SEC-REPO-01: repo_name format is validated by the IndexRepoPayload schema.
    SEC-REPO-02: Verifies the user has a connected GitHub token before enqueueing
                 to prevent unauthenticated users from spamming the task queue.
    """
    # SEC-REPO-02: Verify the user has a connected GitHub token before enqueueing
    from app.repositories.github_token import get_github_token

    token = await get_github_token(user_email)
    if not token:
        raise HTTPException(
            status_code=403,
            detail="GitHub account not connected. Please connect your GitHub account first.",
        )

    # Enqueue background task
    process_github_repo_task.delay(payload.repo_name, user_email=user_email)
    return {"message": f"Started indexing {payload.repo_name}", "status": "accepted"}


@router.get("/{owner}/{repo}/status")
async def repo_status(
    owner: str,
    repo: str,
    user_email: str = Depends(get_user_email),
):
    """Get indexing status for a repository."""
    # Validate owner/repo path parameters
    if not _REPO_NAME_RE.match(f"{owner}/{repo}"):
        raise HTTPException(status_code=400, detail="Invalid owner or repo name format")

    repo_name = f"{owner}/{repo}"

    async with AsyncSessionLocal() as session:
        stmt = select(func.count(RepoEmbedding.id)).where(RepoEmbedding.repository_name == repo_name)
        result = await session.execute(stmt)
        count = result.scalar() or 0

    return {"repo_name": repo_name, "indexed_chunks": count}


@router.post("/search", dependencies=[Depends(rate_limiter(10, 60))])
async def search_repo(
    payload: SearchRepoPayload,
    user_email: str = Depends(get_user_email),
):
    """Semantic search over an indexed repository.

    FIX-audit-7: Uses the module-level _EMBEDDING_PROVIDER constant so the
    provider is always consistent between indexing and querying.
    SEC-REPO-03: Results are scoped to repositories indexed by the requesting user.
                 This prevents cross-user leakage of private repository code that
                 may have been indexed by another user's GitHub token.
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

        query_embedding = pad_embedding_to_1536(embeddings[0])
    except Exception as e:
        logger.error(f"Embedding error for query '{payload.query[:50]}': {e}")
        raise HTTPException(status_code=500, detail="Failed to generate query embedding")

    # FIX-audit-7: Pass provider explicitly — no dimension-length heuristic
    # SEC-REPO-03: Pass user_email to scope search results to this user's repos
    async with AsyncSessionLocal() as session:
        results = await search_repo_embeddings(
            session,
            payload.repo_name,
            query_embedding,
            payload.top_k,
            provider=_EMBEDDING_PROVIDER,
            user_email=user_email,
        )

    return {
        "repo_name": payload.repo_name,
        "query": payload.query,
        "provider": _EMBEDDING_PROVIDER,
        "results": [
            {
                "file_path": r.file_path,
                "content": r.content,
                "similarity": float(r.similarity) if r.similarity is not None else 0.0,
            }
            for r in results
        ],
    }
