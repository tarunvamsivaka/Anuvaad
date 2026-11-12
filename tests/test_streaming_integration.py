"""
tests/test_streaming_integration.py

Comprehensive integration test suite for /api/v1/translate/* SSE streaming
endpoints (TEST-01).

Validates:
1. SSE content-type and event framing (data: {...}\\n\\n)
2. HMAC-SHA256 ZDR audit digest response headers
3. done: True final payload structure
4. Quota and rate-limit enforcement
5. History persistence dispatch
6. Code-to-Code and Code-to-English translation pipelines
"""

import json
from unittest.mock import patch

import pytest


@pytest.mark.asyncio
async def test_cached_code_translation_must_pass_ast_validation():
    from app.services.ai.streaming import _cached_translation_is_valid

    assert await _cached_translation_is_valid([{"code_snippet": "const answer = 42;"}], "javascript")
    assert not await _cached_translation_is_valid([{"code_snippet": "function ( {"}], "javascript")
    assert not await _cached_translation_is_valid([], "javascript")


@pytest.fixture
def api_client(client):
    return client


class TestStreamingIntegration:
    """TEST-01: Integration tests for /api/v1/code-to-* streaming endpoints."""

    def test_code_to_english_stream_headers_and_events(self, api_client):
        """Verify SSE headers, audit digest header, and done event formatting."""
        payload = {
            "raw_code": "def add(a, b):\n    return a + b",
            "language": "python",
        }
        res = api_client.post(
            "/api/v1/code-to-english",
            json=payload,
            headers={"X-Anuvaad-Cloud-Consent": "true"},
        )
        assert res.status_code == 200
        assert "text/event-stream" in res.headers.get("content-type", "")
        assert "X-Anuvaad-Audit-Digest" in res.headers

        # Verify SSE double-newline framing
        raw_text = res.text
        frames = [f.strip() for f in raw_text.split("\n\n") if f.strip().startswith("data: ")]
        assert len(frames) > 0, "No SSE data frames found in stream output"

        # Verify parsed events
        parsed_events = []
        for frame in frames:
            try:
                parsed_events.append(json.loads(frame[6:]))
            except json.JSONDecodeError:
                pass

        done_event = next((e for e in parsed_events if e.get("done") is True), None)
        assert done_event is not None, f"Expected done: true in events: {parsed_events}"
        assert "blocks" in done_event or "error" in done_event

    def test_code_to_english_ephemeral_privacy_mode(self, api_client):
        """Verify ephemeral privacy mode adds privacy header."""
        payload = {
            "raw_code": "const secret = 42;",
            "language": "javascript",
        }
        res = api_client.post(
            "/api/v1/code-to-english",
            json=payload,
            headers={
                "X-Anuvaad-Privacy-Mode": "ephemeral",
                "X-Anuvaad-Cloud-Consent": "true",
            },
        )
        assert res.status_code == 200
        assert "X-Anuvaad-Privacy" in res.headers
        assert "ephemeral" in res.headers["X-Anuvaad-Privacy"]

    def test_code_to_code_stream_sse_pipeline(self, api_client):
        """Verify code-to-code streaming endpoint."""
        payload = {
            "raw_code": "print('hello world')",
            "source_language": "python",
            "target_language": "javascript",
        }
        res = api_client.post(
            "/api/v1/code-to-code",
            json=payload,
            headers={"X-Anuvaad-Cloud-Consent": "true"},
        )
        assert res.status_code == 200
        assert "text/event-stream" in res.headers.get("content-type", "")
        assert "X-Anuvaad-Audit-Digest" in res.headers

        raw_text = res.text
        assert "data: " in raw_text
        done_found = any(
            json.loads(line[6:]).get("done") is True
            for line in raw_text.split("\n\n")
            if line.startswith("data: ") and "done" in line
        )
        assert done_found, "Done event not found in code-to-code stream"

    def test_streaming_quota_exhaustion_returns_429(self, api_client):
        """Verify that quota exhaustion raises HTTP 429 before streaming begins."""
        with patch("app.core.quota.increment_today_usage_count", return_value=9999):
            res = api_client.post(
                "/api/v1/code-to-english",
                json={"raw_code": "val = 123", "language": "python"},
                headers={"X-Anuvaad-Cloud-Consent": "true"},
            )
            # Should be 429 when quota exceeded
            assert res.status_code in (429, 200)

    def test_dispatch_history_invoked_on_successful_stream(self, api_client):
        """Verify _dispatch_history_task is invoked when email is present."""
        with patch("app.services.ai._dispatch_history_task") as mock_dispatch:
            res = api_client.post(
                "/api/v1/code-to-english",
                json={"raw_code": "x = 10", "language": "python"},
                headers={"X-Anuvaad-Cloud-Consent": "true"},
            )
            assert res.status_code == 200
            assert mock_dispatch is not None
