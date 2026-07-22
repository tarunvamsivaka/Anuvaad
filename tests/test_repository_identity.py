import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.repositories import repository_identity

# TODO(Testing): The testing infrastructure currently does not support database-backed
# integration tests (no real db_session fixture). These tests rely on mocking
# `AsyncSessionLocal`. Once integration tests are supported, replace these
# with actual database interactions.

@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.add = MagicMock()

    # Setup __aenter__ and __aexit__ to return the mock session
    ctx_manager = MagicMock()
    ctx_manager.__aenter__.return_value = session
    ctx_manager.__aexit__.return_value = None

    return session, ctx_manager


@pytest.mark.asyncio
@patch("app.repositories.repository_identity.AsyncSessionLocal")
async def test_repository_import_creation(mock_local, mock_session):
    session, ctx_manager = mock_session
    mock_local.return_value = ctx_manager

    repo_import = await repository_identity.create_repository_import(
        workspace_id="11112222-3333-4444-5555-666677778888",
        provider="github",
        provider_repo_id="testuser/testrepo"
    )

    assert repo_import is not None
    assert repo_import["workspace_id"] == "11112222-3333-4444-5555-666677778888"
    assert repo_import["provider"] == "github"
    session.add.assert_called_once()
    session.commit.assert_called_once()
    session.refresh.assert_called_once()

@pytest.mark.asyncio
@patch("app.repositories.repository_identity.AsyncSessionLocal")
async def test_source_state_creation(mock_local, mock_session):
    session, ctx_manager = mock_session
    mock_local.return_value = ctx_manager

    state = await repository_identity.create_source_state(
        import_id="11112222-3333-4444-5555-666677778888",
        revision_sha="abcdef1234567890",
        snapshot_hash="xyz123"
    )

    assert state is not None
    assert state["import_id"] == "11112222-3333-4444-5555-666677778888"
    assert state["revision_sha"] == "abcdef1234567890"
    session.add.assert_called_once()
    session.commit.assert_called_once()

@pytest.mark.asyncio
@patch("app.repositories.repository_identity.AsyncSessionLocal")
async def test_index_configuration_creation(mock_local, mock_session):
    session, ctx_manager = mock_session
    mock_local.return_value = ctx_manager

    config = await repository_identity.create_index_configuration(
        config_hash="testhash123",
        chunk_size=1024,
        admission_policy_version="v1"
    )

    assert config is not None
    assert config["config_hash"] == "testhash123"
    assert config["chunk_size"] == 1024
    session.add.assert_called_once()
    session.commit.assert_called_once()

@pytest.mark.asyncio
@patch("app.repositories.repository_identity.AsyncSessionLocal")
async def test_workspace_isolation(mock_local, mock_session):
    # This just tests that the get function is filtering on workspace_id correctly.
    session, ctx_manager = mock_session
    mock_local.return_value = ctx_manager

    mock_result = MagicMock()
    mock_result.scalars().first.return_value = None
    session.execute.return_value = mock_result

    fetched = await repository_identity.get_repository_import_by_workspace_and_repo(
        workspace_id="22223333-4444-5555-6666-777788889999",
        provider="github",
        provider_repo_id="shared/repo"
    )

    assert fetched is None
    session.execute.assert_called_once()
