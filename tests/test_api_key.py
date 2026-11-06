from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.repositories import api_key

# INFRASTRUCTURE NOTE (B-13): These tests use mocked AsyncSessionLocal because
# the CI test suite runs against SQLite (no live PostgreSQL). The mocking approach
# is intentional and complete for unit-testing the repository layer in isolation.


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.add = MagicMock()

    ctx_manager = MagicMock()
    ctx_manager.__aenter__.return_value = session
    ctx_manager.__aexit__.return_value = None

    return session, ctx_manager


@pytest.mark.asyncio
@patch("app.repositories.api_key.AsyncSessionLocal")
@patch("app.repositories.api_key.logger")
async def test_get_by_raw_key_exception_handling(mock_logger, mock_local, mock_session):
    session, ctx_manager = mock_session
    mock_local.return_value = ctx_manager

    # Simulate an exception during the database execution
    session.execute.side_effect = Exception("Database connection failed")

    result = await api_key.get_by_raw_key("ak_test_key_123")

    assert result is None
    mock_logger.error.assert_called_once()
    assert "api_key.get_by_raw_key" in mock_logger.error.call_args[0][0]
