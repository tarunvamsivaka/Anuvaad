"""Reusable workspace-scoped semantic artifact retrieval service."""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError

from app.repositories.repository_domain import RepositoryDomainRepository
from app.schemas.retrieval import SemanticRetrievalRequest, SemanticRetrievalResult

logger = logging.getLogger("anuvaad.retrieval")


class SemanticRetrievalError(RuntimeError):
    """Raised when a semantic retrieval query cannot be completed."""


class SemanticRetrievalService:
    """Retrieves ranked artifacts without coupling retrieval to an AI workflow."""

    def __init__(self, repository: RepositoryDomainRepository) -> None:
        self._repository = repository

    async def retrieve(self, workspace_id: UUID, request: SemanticRetrievalRequest) -> SemanticRetrievalResult:
        """Return at most ``top_k`` current, workspace-owned semantic artifacts."""
        try:
            matches = await self._repository.search_current_semantic_artifacts(workspace_id, request)
        except SQLAlchemyError as exc:
            logger.exception(
                "semantic_retrieval_failed",
                extra={"workspace_id": str(workspace_id), "top_k": request.top_k},
            )
            raise SemanticRetrievalError("semantic retrieval failed") from exc

        logger.info(
            "semantic_retrieval_completed",
            extra={
                "workspace_id": str(workspace_id),
                "match_count": len(matches),
                "top_k": request.top_k,
                "repository_filter_count": len(request.repository_import_ids or []),
                "materialization_filter_count": len(request.materialization_ids or []),
            },
        )
        return SemanticRetrievalResult(matches=matches)
