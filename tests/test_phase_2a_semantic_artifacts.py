from unittest.mock import AsyncMock, MagicMock

from alembic import command
from sqlalchemy import inspect
from uuid import uuid4

import pytest

from app.repositories.repository_domain import RepositoryDomainRepository
from app.schemas.repository_domain import SemanticArtifactCreate
from tests.test_migrations import _alembic_config, migration_engine


def _result(value=None):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    result.scalars.return_value = []
    return result


def _artifact_data():
    return SemanticArtifactCreate(
        file_path="src/main.py", chunk_index=0, content="print('ok')",
        content_hash="sha256", embedding=[0.0] * 1536, embedding_model="text-embedding-3-small",
    )


@pytest.mark.asyncio
async def test_semantic_artifact_creation_rejects_another_workspaces_materialization():
    session = AsyncMock()
    session.add = MagicMock()
    repository = RepositoryDomainRepository(session)
    repository._owned_materialization = AsyncMock(return_value=None)

    row = await repository.create_semantic_artifact(uuid4(), uuid4(), _artifact_data())

    assert row is None
    session.add.assert_not_called()


@pytest.mark.asyncio
async def test_semantic_artifact_lookup_joins_through_workspace_ownership():
    artifact = MagicMock()
    session = AsyncMock()
    session.execute.return_value = _result(artifact)
    repository = RepositoryDomainRepository(session)

    assert await repository.get_semantic_artifact(uuid4(), uuid4()) is artifact
    statement = str(session.execute.await_args.args[0])
    assert "repository_imports.workspace_id" in statement


def test_phase_2a_upgrade_and_downgrade(migration_engine):
    config = _alembic_config()
    command.upgrade(config, "008_phase_1c")
    assert "semantic_artifacts" not in inspect(migration_engine).get_table_names()
    command.upgrade(config, "009_phase_2a")
    columns = {column["name"] for column in inspect(migration_engine).get_columns("semantic_artifacts")}
    assert columns == {"id", "materialization_id", "file_path", "chunk_index", "content", "content_hash", "embedding", "embedding_model", "created_at"}
    command.downgrade(config, "008_phase_1c")
    assert "semantic_artifacts" not in inspect(migration_engine).get_table_names()


def test_phase_2a_migration_declares_workspace_transitive_ownership():
    migration = __import__("importlib").import_module("alembic.versions.009_phase_2a_semantic_artifacts")
    source = __import__("inspect").getsource(migration)
    assert '"semantic_artifacts"' in source
    assert '"materialization_id"' in source
    assert '"workspace_id"' not in source
    assert 'Vector(dim=1536)' in source


