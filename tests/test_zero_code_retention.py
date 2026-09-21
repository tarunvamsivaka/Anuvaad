"""
Tests for Zero Code Retention (RAM-Only Ephemeral Mode).

Implementation Phase: Master 8-Week Phased Implementation — Week 2 (Phase 1B).
Validates:
1. 'X-Anuvaad-Privacy-Mode: ephemeral' returns 'X-Anuvaad-Privacy: ephemeral; zero-retention' header
2. Ephemeral mode skips writing to Redis cache
3. Ephemeral mode skips enqueuing translation history to Celery/PostgreSQL
4. Normal mode retains caching and history persistence
"""

from unittest.mock import patch

from fastapi.testclient import TestClient


def test_ephemeral_header_attached_to_stream(client: TestClient):
    """Streaming response returns X-Anuvaad-Privacy header when ephemeral mode is requested."""
    resp = client.post(
        "/api/v1/code-to-english",
        json={"raw_code": "val x = 42", "language": "scala"},
        headers={"X-Anuvaad-Privacy-Mode": "ephemeral"},
    )
    assert resp.status_code == 200
    assert resp.headers.get("X-Anuvaad-Privacy") == "ephemeral; zero-retention"


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
        assert resp.headers.get("X-Anuvaad-Privacy") == "ephemeral; zero-retention"
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
    """When stale translation recovery occurs, ephemeral mode strictly suppresses history dispatch."""
    stale_sample = [{"id": "block_1", "code_snippet": "val secret = 1", "english_translation": "Sets secret to 1"}]
    with (
        patch("app.routers.translate.code_to_english.get_completion", side_effect=Exception("LLM down")),
        patch("app.routers.translate.code_to_english.find_stale_translation", return_value=stale_sample),
        patch("app.routers.translate.code_to_english._dispatch_history") as mock_dispatch,
    ):
        resp = client.post(
            "/api/v1/code-to-english/sync",
            json={"raw_code": "val secret = 1", "language": "scala"},
            headers={"X-Anuvaad-Privacy-Mode": "ephemeral"},
        )
        assert resp.status_code == 200
        assert resp.headers.get("X-Anuvaad-Privacy") == "ephemeral; zero-retention"
        mock_dispatch.assert_not_called()
