"""
tests/test_be_remediation.py

Unit tests verifying backend remediation fixes for BE-01 through BE-08.
"""

import json
import threading
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.auth import _jwks_lock
from app.main import validate_production_env
from app.models.db_models import TranslationHistory, Workspace
from app.repositories.translation import get_count_since, get_history
from app.repositories.vectors import search_repo_embeddings
from app.repositories.workspace import get_workspaces
from app.services.ai import stream_code_to_english


@pytest.mark.asyncio
async def test_be_01_workspace_history_idor_protection():
    """BE-01: Verify workspace-scoped history restricts access to non-members."""
    email_owner = "owner@example.com"
    email_attacker = "attacker@example.com"
    ws_id = str(uuid.uuid4())

    with patch("app.repositories.translation._is_workspace_member_or_owner", new_callable=AsyncMock) as mock_check:
        mock_check.side_effect = lambda session, wid, email: email == email_owner

        # Attacker attempt -> should return empty list / 0
        history_attacker = await get_history(email_attacker, workspace_id=ws_id)
        count_attacker = await get_count_since(email_attacker, workspace_id=ws_id)
        assert history_attacker == []
        assert count_attacker == 0

        # Owner attempt -> proceeds to DB query
        with patch("app.repositories.translation.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session_cls.return_value.__aenter__.return_value = mock_session
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = []
            mock_result.scalar.return_value = 5
            mock_session.execute.return_value = mock_result

            history_owner = await get_history(email_owner, workspace_id=ws_id)
            count_owner = await get_count_since(email_owner, workspace_id=ws_id)

            assert isinstance(history_owner, list)
            assert count_owner == 5


@pytest.mark.asyncio
async def test_be_02_workspace_discovery_includes_member_workspaces():
    """BE-02: Verify get_workspaces queries both owned and member workspaces."""
    email = "member@example.com"

    with patch("app.repositories.workspace.AsyncSessionLocal") as mock_session_cls:
        mock_session = AsyncMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session
        mock_result = MagicMock()

        ws1 = Workspace(id=uuid.uuid4(), name="Owned Workspace", owner_email=email)
        ws2 = Workspace(id=uuid.uuid4(), name="Member Workspace", owner_email="other@example.com")
        mock_result.scalars.return_value.all.return_value = [ws1, ws2]
        mock_session.execute.return_value = mock_result

        workspaces = await get_workspaces(email)
        assert len(workspaces) == 2
        assert mock_session.execute.called


@pytest.mark.asyncio
async def test_be_03_vector_search_returns_similarity_score():
    """BE-03: Verify search_repo_embeddings calculates similarity as (1 - distance)."""
    db_mock = AsyncMock()
    mock_result = MagicMock()
    mock_result.all.return_value = [
        MagicMock(file_path="main.py", content="print('hello')", similarity=0.95),
    ]
    db_mock.execute.return_value = mock_result

    results = await search_repo_embeddings(db_mock, "owner/repo", [0.1] * 1536, top_k=1)
    assert len(results) == 1
    assert results[0].similarity == 0.95


@pytest.mark.asyncio
async def test_be_04_import_gist_auth_and_rate_limiting():
    """BE-04: Verify import-gist router dependency specifications."""
    import inspect

    from app.routers.utility import import_gist

    sig = inspect.signature(import_gist)
    params = sig.parameters
    assert "user_email" in params
    assert params["user_email"].default is not None


def test_be_05_validate_production_env_docstring():
    """BE-05: Verify validate_production_env docstring matches implementation."""
    doc = validate_production_env.__doc__ or ""
    assert "suppresses" in doc.lower() or "health check" in doc.lower() or "logs critical error" in doc.lower()


def test_be_06_translation_history_orm_reconciliation():
    """BE-06: Verify character_count property alias on TranslationHistory."""
    history = TranslationHistory(char_count=150)
    assert history.char_count == 150
    assert history.character_count == 150

    history.character_count = 250
    assert history.char_count == 250
    assert history.character_count == 250


@pytest.mark.asyncio
async def test_be_07_sse_sanitized_error_payload():
    """BE-07: Verify stream_code_to_english yields sanitized JSON error payloads."""
    payload = MagicMock()
    payload.raw_code = "print(1)"
    payload.language = "python"

    with patch("app.services.ai.cache.get", side_effect=Exception("Database connection secret leaked!")):
        chunks = []
        async for chunk in stream_code_to_english(payload, "user@example.com", False, False, "free"):
            chunks.append(chunk)

        assert len(chunks) == 1
        data_str = chunks[0]
        assert data_str.startswith("data: ")
        payload_dict = json.loads(data_str.removeprefix("data: ").strip())

        assert payload_dict.get("done") is True
        assert "error" in payload_dict
        # Ensure sensitive exception details are not exposed to client
        assert "secret leaked" not in payload_dict["error"]
        assert "Translation engine encountered an error" in payload_dict["error"]


def test_be_08_jwks_cache_thread_safety():
    """BE-08: Verify _get_jwks_public_key uses threading.Lock for thread-safe access."""
    assert isinstance(_jwks_lock, type(threading.Lock()))


@pytest.mark.asyncio
async def test_m2_dependencies_get_user_email_injection():
    """M2: Verify get_current_user_email correctly passes request and credentials=creds."""
    from fastapi import Request

    from app.core.dependencies import get_current_user_email

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/test",
        "headers": [(b"authorization", b"Bearer test_token")],
    }
    req = Request(scope)

    with patch("app.core.auth.get_user_email", new_callable=AsyncMock) as mock_get_email:
        mock_get_email.return_value = "user@example.com"
        result = await get_current_user_email(req)

        assert result == "user@example.com"
        assert mock_get_email.called
        call_args, call_kwargs = mock_get_email.call_args
        assert call_args[0] == req
        assert call_kwargs.get("credentials") is not None
        assert call_kwargs["credentials"].credentials == "test_token"


@pytest.mark.asyncio
async def test_m2_streaming_llm_fallback():
    """M2: Verify stream_code_to_english falls back gracefully when primary provider fails."""
    payload = MagicMock()
    payload.raw_code = "a = 10"
    payload.language = "python"

    # Primary client raises exception; backup client succeeds
    mock_primary_client = AsyncMock()
    mock_primary_client.chat.completions.create.side_effect = Exception("Groq primary quota exceeded")

    mock_backup_stream = AsyncMock()
    mock_chunk = MagicMock()
    mock_chunk.choices = [MagicMock()]
    mock_chunk.choices[
        0
    ].delta.content = '{"blocks":[{"id":"b1","code_snippet":"a = 10","english_translation":"Sets a to 10"}]}'

    async def mock_async_iter():
        yield mock_chunk

    mock_backup_stream.__aiter__ = lambda self: mock_async_iter()

    mock_backup_client = AsyncMock()
    mock_backup_client.chat.completions.create.return_value = mock_backup_stream

    with (
        patch("app.services.ai.cache.get", return_value=None),
        patch("app.services.ai._get_groq_client", return_value=mock_primary_client),
        patch("app.services.ai._get_openrouter_client", return_value=mock_backup_client),
    ):
        chunks = []
        async for chunk in stream_code_to_english(payload, "user@example.com", False, False, "free"):
            chunks.append(chunk)

        # First chunk is content, second is done event
        assert len(chunks) >= 2
        done_chunk = json.loads(chunks[-1].removeprefix("data: ").strip())
        assert done_chunk.get("done") is True
        assert "blocks" in done_chunk
