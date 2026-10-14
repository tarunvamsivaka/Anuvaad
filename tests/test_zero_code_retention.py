"""
Tests for Zero Code Retention (RAM-Only Ephemeral Mode).

Implementation Phase: Master 8-Week Phased Implementation — Week 2 (Phase 1B).
Validates:
1. 'X-Anuvaad-Privacy-Mode: ephemeral' returns an application-history/cache exclusion header
2. Ephemeral mode skips writing to Redis cache
3. Ephemeral mode skips enqueuing translation history to Celery/PostgreSQL
4. Normal mode retains caching and history persistence
"""

from datetime import UTC
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


def test_ephemeral_header_attached_to_stream(client: TestClient):
    """Streaming response returns X-Anuvaad-Privacy header when ephemeral mode is requested."""
    resp = client.post(
        "/api/v1/code-to-english",
        json={"raw_code": "val x = 42", "language": "scala"},
        headers={"X-Anuvaad-Privacy-Mode": "ephemeral"},
    )
    assert resp.status_code == 200
    assert resp.headers.get("X-Anuvaad-Privacy") == "ephemeral; application-history-and-cache-skipped"


def test_ephemeral_sync_bypasses_cache_and_history(client: TestClient):
    """Sync endpoint does not cache code or persist history when ephemeral header is present."""
    with (
        patch("app.routers.translate.code_to_english.cache.put") as mock_cache_put,
        patch("app.routers.translate.code_to_english._dispatch_history") as mock_dispatch,
    ):
        resp = client.post(
            "/api/v1/code-to-english/sync",
            json={"raw_code": "let secret_token = 'sk_live_xyz';", "language": "javascript"},
            headers={"X-Anuvaad-Privacy-Mode": "ephemeral"},
        )

        assert resp.status_code == 200
        assert resp.headers.get("X-Anuvaad-Privacy") == "ephemeral; application-history-and-cache-skipped"
        # Translation result should never be cached in Redis
        translation_cached = any(
            "code-to-english" in str(call_args) or "secret_token" in str(call_args)
            for call_args in mock_cache_put.call_args_list
        )
        assert not translation_cached, "Translation code or result was cached in Redis in ephemeral mode!"
        mock_dispatch.assert_not_called()


def test_non_ephemeral_invokes_history_and_cache(client: TestClient):
    """Normal requests without ephemeral header invoke history and caching."""
    with patch("app.routers.translate.code_to_english.cache.put") as mock_cache_put:
        resp = client.post(
            "/api/v1/code-to-english/sync",
            json={"raw_code": "def standard(): pass", "language": "python"},
        )
        assert resp.status_code == 200
        assert "X-Anuvaad-Privacy" not in resp.headers
        mock_cache_put.assert_called()


def test_ephemeral_stale_recovery_skips_history(client: TestClient):
    """An ephemeral request must not read and return a saved fallback after provider failure."""
    stale_sample = [{"id": "block_1", "code_snippet": "val secret = 1", "english_translation": "Sets secret to 1"}]
    with (
        patch("app.routers.translate.code_to_english.get_completion", side_effect=Exception("LLM down")),
        patch("app.routers.translate.code_to_english.find_stale_translation", return_value=stale_sample) as mock_stale,
        patch("app.routers.translate.code_to_english._dispatch_history") as mock_dispatch,
    ):
        resp = client.post(
            "/api/v1/code-to-english/sync",
            json={"raw_code": "val secret = 1", "language": "scala"},
            headers={"X-Anuvaad-Privacy-Mode": "ephemeral"},
        )
        assert resp.status_code == 503
        assert "temporarily unavailable" in resp.json()["detail"]
        assert "X-Anuvaad-Privacy" not in resp.headers
        mock_stale.assert_not_called()
        mock_dispatch.assert_not_called()


def test_ephemeral_generation_does_not_read_saved_fallback(client: TestClient):
    with (
        patch("app.routers.translate.english_to_code.get_completion", side_effect=Exception("provider failed")),
        patch("app.routers.translate.english_to_code.find_stale_translation") as mock_stale,
    ):
        resp = client.post(
            "/api/v1/generate-from-english",
            json={"prompt": "write a function that adds two numbers", "language": "python"},
            headers={"X-Anuvaad-Privacy-Mode": "ephemeral"},
        )
    assert resp.status_code == 503
    mock_stale.assert_not_called()


@pytest.mark.asyncio
async def test_ai_service_ephemeral_failure_does_not_read_stale_translation():
    from fastapi import HTTPException

    from app.services.ai import get_completion

    client = AsyncMock()
    client.chat.completions.create.side_effect = RuntimeError("provider unavailable")
    with (
        patch("app.services.ai.check_and_track_groq_limits", new_callable=AsyncMock),
        patch("app.services.ai._get_groq_client", return_value=client),
        patch("app.services.ai._get_openrouter_client", return_value=None),
        patch("app.services.ai.metrics.record_model_call", new_callable=AsyncMock),
        patch("app.services.ai.find_stale_translation", new_callable=AsyncMock) as mock_stale,
    ):
        with pytest.raises(HTTPException):
            await get_completion("private prompt", "system", "translation", ephemeral=True)

    mock_stale.assert_not_awaited()


def test_audit_digest_header_returned_on_all_modes(client: TestClient):
    """Every translation returns a deterministic HMAC-SHA256 audit digest header."""
    from app.core.audit import AUDIT_DIGEST_HEADER

    # 1. Code to English stream
    resp_stream = client.post(
        "/api/v1/code-to-english",
        json={"raw_code": "def hello(): return 'world'", "language": "python"},
    )
    assert resp_stream.status_code == 200
    digest_stream = resp_stream.headers.get(AUDIT_DIGEST_HEADER)
    assert digest_stream is not None and len(digest_stream) == 64

    # 2. Code to English sync
    resp_sync = client.post(
        "/api/v1/code-to-english/sync",
        json={"raw_code": "def hello(): return 'world'", "language": "python"},
    )
    assert resp_sync.status_code == 200
    digest_sync = resp_sync.headers.get(AUDIT_DIGEST_HEADER)
    assert digest_sync is not None and len(digest_sync) == 64

    # 3. Code to Code stream
    resp_c2c = client.post(
        "/api/v1/code-to-code",
        json={"raw_code": "def hello(): return 'world'", "source_language": "python", "target_language": "go"},
    )
    assert resp_c2c.status_code == 200
    digest_c2c = resp_c2c.headers.get(AUDIT_DIGEST_HEADER)
    assert digest_c2c is not None and len(digest_c2c) == 64


def test_code_to_code_ephemeral_headers(client: TestClient):
    """Code to code returns both privacy and audit digest headers when ephemeral."""
    resp = client.post(
        "/api/v1/code-to-code",
        json={"raw_code": "fmt.Println(123)", "source_language": "go", "target_language": "python"},
        headers={"X-Anuvaad-Privacy-Mode": "ephemeral"},
    )
    assert resp.status_code == 200
    assert resp.headers.get("X-Anuvaad-Privacy") == "ephemeral; application-history-and-cache-skipped"
    assert "X-Anuvaad-Audit-Digest" in resp.headers


def test_deterministic_audit_receipt_generation():
    """Verify deterministic HMAC-SHA256 receipt generation contract."""
    from datetime import datetime

    from app.core.audit import compute_audit_digest, compute_code_hash, generate_audit_receipt

    test_time = datetime(2026, 9, 26, 12, 0, 0, tzinfo=UTC)
    code = "def sample(): return 42"
    secret = "test-secret-key-12345"
    receipt = generate_audit_receipt(user_id="alice@example.com", code=code, timestamp=test_time, secret=secret)

    assert receipt["user_id"] == "alice@example.com"
    assert receipt["retention_policy"] == "RAM_ONLY_EPHEMERAL"
    assert receipt["sha256_input_hash"] == compute_code_hash(code)

    expected_digest = compute_audit_digest(
        secret=secret,
        user_id="alice@example.com",
        timestamp_utc=test_time.isoformat(),
        code_hash=compute_code_hash(code),
    )
    assert receipt["audit_digest"] == expected_digest
