from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.db_models import SearchableMaterialization
from app.repositories.repository_domain import RepositoryDomainRepository
from app.schemas.repository_domain import (
    RepositoryImportCreate,
    SearchableMaterializationCreate,
    SourceStateCreate,
    StructuralImportCreate,
    StructuralSymbolCreate,
)


def _result(value=None):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _session(*results):
    session = AsyncMock()
    session.add = MagicMock()
    session.execute.side_effect = list(results)
    return session


@pytest.mark.asyncio
async def test_create_import_persists_the_workspace_owned_model():
    session = _session()
    repository = RepositoryDomainRepository(session)
    workspace_id = uuid4()

    row = await repository.create_import(
        workspace_id,
        RepositoryImportCreate(provider="github", provider_repo_id="owner/repository"),
    )

    assert row.workspace_id == workspace_id
    assert row.provider == "github"
    session.add.assert_called_once_with(row)
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(row)


@pytest.mark.asyncio
async def test_source_state_creation_rejects_an_import_outside_the_workspace():
    session = _session(_result())
    repository = RepositoryDomainRepository(session)

    row = await repository.create_source_state(
        uuid4(), uuid4(), SourceStateCreate(revision_sha="abc123")
    )

    assert row is None
    session.add.assert_not_called()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_materialization_lookup_scopes_its_query_to_the_workspace():
    materialization = MagicMock(spec=SearchableMaterialization)
    session = _session(_result(materialization))
    repository = RepositoryDomainRepository(session)

    actual = await repository.get_materialization(uuid4(), uuid4())

    assert actual is materialization
    statement = str(session.execute.await_args.args[0])
    assert "repository_imports.workspace_id" in statement


@pytest.mark.asyncio
async def test_materialization_creation_requires_a_run_for_the_same_workspace_import():
    session = _session()
    repository = RepositoryDomainRepository(session)
    workspace_id, import_id = uuid4(), uuid4()
    repository._owns_import = AsyncMock(return_value=True)
    repository.get_index_run = AsyncMock(
        return_value=MagicMock(desired_state_id=uuid4(), status="complete")
    )
    repository.get_desired_state = AsyncMock(return_value=MagicMock(import_id=uuid4()))

    row = await repository.create_materialization(
        workspace_id,
        import_id,
        SearchableMaterializationCreate(index_run_id=uuid4()),
    )

    assert row is None
    session.add.assert_not_called()


@pytest.mark.asyncio
async def test_materialization_creation_rejects_a_non_complete_run():
    session = _session()
    repository = RepositoryDomainRepository(session)
    workspace_id, import_id = uuid4(), uuid4()
    repository._owns_import = AsyncMock(return_value=True)
    repository.get_index_run = AsyncMock(
        return_value=MagicMock(desired_state_id=uuid4(), status="failed")
    )

    row = await repository.create_materialization(
        workspace_id,
        import_id,
        SearchableMaterializationCreate(index_run_id=uuid4()),
    )

    assert row is None
    repository.get_desired_state.assert_not_awaited()
    session.add.assert_not_called()


@pytest.mark.asyncio
async def test_resolved_import_target_must_belong_to_the_same_workspace():
    session = _session(_result(uuid4()), _result())
    repository = RepositoryDomainRepository(session)

    row = await repository.create_structural_import(
        uuid4(),
        uuid4(),
        StructuralImportCreate(declared_import="package.module", resolved_target_file_id=uuid4()),
    )

    assert row is None
    session.add.assert_not_called()


@pytest.mark.asyncio
async def test_resolved_import_target_must_belong_to_the_source_materialization():
    session = _session(_result(uuid4()), _result(uuid4()))
    repository = RepositoryDomainRepository(session)

    row = await repository.create_structural_import(
        uuid4(),
        uuid4(),
        StructuralImportCreate(declared_import="package.module", resolved_target_file_id=uuid4()),
    )

    assert row is None
    session.add.assert_not_called()


def test_structural_symbol_schema_requires_an_ordered_location_range():
    with pytest.raises(ValueError, match="location_end"):
        StructuralSymbolCreate(
            symbol_name="handler",
            symbol_kind="function",
            location_start=10,
            location_end=9,
        )
