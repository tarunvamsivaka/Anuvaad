from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.repositories.repository_domain import RepositoryDomainRepository
from app.schemas.retrieval import SemanticArtifactMatch, SemanticRetrievalRequest
from app.services.retrieval import SemanticRetrievalError, SemanticRetrievalService


def _request(**overrides) -> SemanticRetrievalRequest:
    values = {
        "query_embedding": [0.1] * 1536,
        "embedding_model": "text-embedding-3-small",
        **overrides,
    }
    return SemanticRetrievalRequest(**values)


def _match() -> SemanticArtifactMatch:
    return SemanticArtifactMatch(
        artifact_id=uuid4(),
        repository_import_id=uuid4(),
        materialization_id=uuid4(),
        file_path="src/example.py",
        chunk_index=0,
        content="def example(): pass",
        content_hash="hash",
        embedding_model="text-embedding-3-small",
        similarity=0.9,
    )


def test_retrieval_request_rejects_non_finite_vectors():
    with pytest.raises(ValidationError, match="finite"):
        _request(query_embedding=[float("nan")] * 1536)


@pytest.mark.asyncio
async def test_retrieval_service_returns_ranked_matches_from_repository():
    repository = MagicMock()
    repository.search_current_semantic_artifacts = AsyncMock(return_value=[_match()])
    service = SemanticRetrievalService(repository)

    result = await service.retrieve(uuid4(), _request(top_k=3, similarity_threshold=0.6))

    assert result.matches[0].similarity == 0.9
    assert len(result.matches) == 1
    repository.search_current_semantic_artifacts.assert_awaited_once()


@pytest.mark.asyncio
async def test_retrieval_service_normalizes_database_failures():
    repository = MagicMock()
    repository.search_current_semantic_artifacts = AsyncMock(side_effect=SQLAlchemyError("database unavailable"))

    with pytest.raises(SemanticRetrievalError, match="retrieval failed"):
        await SemanticRetrievalService(repository).retrieve(uuid4(), _request())


@pytest.mark.asyncio
async def test_repository_query_enforces_current_workspace_ownership_and_filters():
    session = AsyncMock()
    result = MagicMock()
    result.all.return_value = []
    session.execute.return_value = result
    repository = RepositoryDomainRepository(session)
    import_id, materialization_id = uuid4(), uuid4()

    matches = await repository.search_current_semantic_artifacts(
        uuid4(),
        _request(repository_import_ids=[import_id], materialization_ids=[materialization_id]),
    )

    assert matches == []
    statement = str(session.execute.await_args.args[0])
    assert "repository_imports.workspace_id" in statement
    assert "searchable_materializations.is_current IS true" in statement
    assert "semantic_artifacts.embedding_model" in statement
    assert "LIMIT" in statement


@pytest.mark.asyncio
async def test_repository_query_maps_artifact_rows():
    artifact = MagicMock(
        id=uuid4(),
        materialization_id=uuid4(),
        file_path="a.py",
        chunk_index=2,
        content="content",
        content_hash="hash",
        embedding_model="text-embedding-3-small",
    )
    session = AsyncMock()
    result = MagicMock()
    result.all.return_value = [(artifact, uuid4(), 0.82)]
    session.execute.return_value = result

    matches = await RepositoryDomainRepository(session).search_current_semantic_artifacts(uuid4(), _request())

    assert matches[0].file_path == "a.py"
    assert matches[0].similarity == 0.82
