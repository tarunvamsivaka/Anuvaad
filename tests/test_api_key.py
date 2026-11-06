from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.repositories import api_key


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
@patch("app.repositories.api_key.AsyncSessionLocal")
async def test_get_by_raw_key_exception_handling(mock_local, mock_session):
    session, ctx_manager = mock_session
    mock_local.return_value = ctx_manager

    # Make session.execute raise an exception
    session.execute.side_effect = Exception("DB Connection Error")

    # Call the function
    result = await api_key.get_by_raw_key("dummy_key_1234567890")

    # Verify the result is None and exception was caught
    assert result is None
    session.execute.assert_called_once()
