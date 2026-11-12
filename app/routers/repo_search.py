"""Workspace-scoped GitHub repository indexing and semantic search."""

import logging
import os
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select

from app.core.auth import get_user_email
from app.core.database_session import AsyncSessionLocal
from app.core.rate_limit import rate_limiter
from app.models.db_models import (
    DesiredIndexState,
    IndexRun,
    RepositoryImport,
    SearchableMaterialization,
    SemanticArtifact,
)
from app.queue.tasks import run_repository_indexing_task
from app.repositories.repository_domain import RepositoryDomainRepository
from app.schemas.retrieval import SemanticRetrievalRequest
from app.services.embedding import generate_embeddings_openai
from app.services.retrieval import SemanticRetrievalService

logger = logging.getLogger("anuvaad")
_REPO_NAME_RE = re.compile(r"^[a-zA-Z0-9_.-]{1,100}/[a-zA-Z0-9_.-]{1,100}$")
_EMBEDDING_MODEL = "text-embedding-3-small"
router = APIRouter(prefix="/repo", tags=["repo-search"])


def _validate_repo_name(value: str) -> str:
    if not _REPO_NAME_RE.fullmatch(value) or any(part in {".", ".."} for part in value.split("/")):
        raise ValueError("repo_name must be in 'owner/repo' format")
    return value


class IndexRepoPayload(BaseModel):
    repo_name: str = Field(min_length=3, max_length=201, description="Format: owner/repo")
    workspace_id: uuid.UUID

    @field_validator("repo_name")
    @classmethod
    def validate_repo_name_format(cls, value: str) -> str:
        return _validate_repo_name(value)


class SearchRepoPayload(BaseModel):
    repo_name: str = Field(min_length=3, max_length=201, description="Format: owner/repo")
    query: str = Field(min_length=1, max_length=8_000)
    top_k: int = Field(default=5, ge=1, le=100)
    workspace_id: uuid.UUID

    @field_validator("repo_name")
    @classmethod
    def validate_repo_name_format(cls, value: str) -> str:
        return _validate_repo_name(value)


async def _verify_workspace_access(workspace_id: uuid.UUID, user_email: str) -> None:
    from app.models.db_models import Workspace
    from app.repositories.workspace import get_member

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Workspace).where(Workspace.id == workspace_id))
        workspace = result.scalar_one_or_none()
        if workspace is None:
            raise HTTPException(status_code=404, detail="Workspace not found")
        if workspace.owner_email != user_email and not await get_member(str(workspace_id), user_email):
            raise HTTPException(status_code=403, detail="You do not have access to this workspace.")


async def _require_cloud_consent(user_email: str, operation: str) -> None:
    if os.getenv("TESTING") == "true":
        return
    from app.repositories.privacy import get_preferences

    if not (await get_preferences(user_email))["cloud_processing"]:
        raise HTTPException(status_code=403, detail=f"Repository {operation} requires cloud-processing consent.")


async def _find_import(session, workspace_id: uuid.UUID, repo_name: str):
    result = await session.execute(
        select(RepositoryImport).where(
            RepositoryImport.workspace_id == workspace_id,
            RepositoryImport.provider == "github",
            RepositoryImport.provider_repo_id == repo_name,
        )
    )
    return result.scalar_one_or_none()


@router.post("/index", dependencies=[Depends(rate_limiter(3, 60))])
async def index_repo(payload: IndexRepoPayload, user_email: str = Depends(get_user_email)):
    await _require_cloud_consent(user_email, "indexing")
    await _verify_workspace_access(payload.workspace_id, user_email)

    from app.repositories.github_token import get_github_token

    if not await get_github_token(user_email):
        raise HTTPException(
            status_code=403,
            detail="GitHub account not connected. Please connect your GitHub account first.",
        )

    run_repository_indexing_task.delay(str(payload.workspace_id), payload.repo_name, user_email)
    return {
        "message": f"Started indexing {payload.repo_name}",
        "status": "accepted",
        "repository_name": payload.repo_name,
        "workspace_id": str(payload.workspace_id),
    }


@router.get("/{owner}/{repo}/status")
async def repo_status(
    owner: str,
    repo: str,
    workspace_id: uuid.UUID = Query(...),
    user_email: str = Depends(get_user_email),
):
    try:
        repo_name = _validate_repo_name(f"{owner}/{repo}")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid owner or repo name format") from exc
    await _verify_workspace_access(workspace_id, user_email)
    async with AsyncSessionLocal() as session:
        import_ = await _find_import(session, workspace_id, repo_name)
        if import_ is None:
            return {"repo_name": repo_name, "status": "not_indexed", "indexed_chunks": 0}
        count_result = await session.execute(
            select(func.count(SemanticArtifact.id))
            .join(SearchableMaterialization)
            .where(
                SearchableMaterialization.import_id == import_.id,
                SearchableMaterialization.is_current.is_(True),
            )
        )
        run_result = await session.execute(
            select(IndexRun.status, IndexRun.error_diagnostics, IndexRun.completed_at)
            .join(DesiredIndexState, IndexRun.desired_state_id == DesiredIndexState.id)
            .where(DesiredIndexState.import_id == import_.id)
            .order_by(IndexRun.created_at.desc())
            .limit(1)
        )
        run = run_result.first()
    return {
        "repo_name": repo_name,
        "workspace_id": str(workspace_id),
        "status": run.status if run else "queued",
        "indexed_chunks": count_result.scalar_one() or 0,
        "error": run.error_diagnostics if run and run.status == "failed" else None,
        "completed_at": run.completed_at.isoformat() if run and run.completed_at else None,
    }


@router.post("/search", dependencies=[Depends(rate_limiter(10, 60))])
async def search_repo(payload: SearchRepoPayload, user_email: str = Depends(get_user_email)):
    await _require_cloud_consent(user_email, "search")
    await _verify_workspace_access(payload.workspace_id, user_email)
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=503, detail="Repository search embeddings are not configured")

    async with AsyncSessionLocal() as session:
        import_ = await _find_import(session, payload.workspace_id, payload.repo_name)
        if import_ is None:
            return {"repo_name": payload.repo_name, "query": payload.query, "results": []}
        try:
            vectors = await generate_embeddings_openai([payload.query])
        except Exception as exc:
            logger.error("Repository search embedding failed (%s)", type(exc).__name__)
            raise HTTPException(status_code=503, detail="Failed to generate query embedding") from exc
        if not vectors or len(vectors[0]) != 1536:
            raise HTTPException(status_code=503, detail="Failed to generate query embedding")

        repository = RepositoryDomainRepository(session)
        service = SemanticRetrievalService(repository)
        try:
            results = await service.retrieve(
                payload.workspace_id,
                SemanticRetrievalRequest(
                    query_embedding=vectors[0],
                    embedding_model=_EMBEDDING_MODEL,
                    top_k=payload.top_k,
                    repository_import_ids=[import_.id],
                ),
            )
        except Exception as exc:
            logger.error("Repository semantic search failed (%s)", type(exc).__name__)
            raise HTTPException(status_code=503, detail="Repository search is temporarily unavailable") from exc

    return {
        "repo_name": payload.repo_name,
        "workspace_id": str(payload.workspace_id),
        "query": payload.query,
        "provider": _EMBEDDING_MODEL,
        "results": [
            {
                "file_path": match.file_path,
                "content": match.content,
                "similarity": match.similarity,
            }
            for match in results.matches
        ],
    }
