"""
Tests for the streaming translation endpoint.

Verifies SSE content type, event structure, and cache-hit fast path.
"""

import json
import os
import sys
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestStreamingEndpoint:
    """Tests for POST /api/code-to-english (streaming SSE endpoint)."""

    def test_streaming_returns_text_event_stream_content_type(self, client):
        """The streaming endpoint must respond with text/event-stream."""
        res = client.post(
            "/api/code-to-english",
            json={"raw_code": "print('hello')", "language": "python"},
        )
        assert res.status_code == 200
        content_type = res.headers.get("content-type", "")
        assert "text/event-stream" in content_type

    def test_stream_contains_done_true_event(self, client):
        """The SSE stream should contain at least one event with done:true."""
        res = client.post(
            "/api/code-to-english", json={"raw_code": "x = 1", "language": "python"}
        )
        assert res.status_code == 200
        # The response body contains SSE lines: "data: {...}\n\n"
        raw_text = res.text
        events = [
            line[6:]  # strip "data: " prefix
            for line in raw_text.strip().split("\n\n")
            if line.startswith("data: ")
        ]

        # At least one event must exist
        assert len(events) > 0

        # Find a done:true event
        done_found = False
        for event_str in events:
            try:
                event = json.loads(event_str)
                if event.get("done") is True:
                    done_found = True
                    break
            except json.JSONDecodeError:
                continue
        assert done_found, f"No done:true event found in stream. Events: {events}"

    def test_stream_done_event_contains_blocks(self, client):
        """The final done:true SSE event should contain a 'blocks' array."""
        res = client.post(
            "/api/code-to-english", json={"raw_code": "y = 2", "language": "python"}
        )
        assert res.status_code == 200
        raw_text = res.text
        events = [
            line[6:]
            for line in raw_text.strip().split("\n\n")
            if line.startswith("data: ")
        ]

        done_event = None
        for event_str in events:
            try:
                event = json.loads(event_str)
                if event.get("done") is True:
                    done_event = event
                    break
            except json.JSONDecodeError:
                continue

        assert done_event is not None
        assert "blocks" in done_event
        assert isinstance(done_event["blocks"], list)
        assert len(done_event["blocks"]) > 0

    def test_cache_hit_returns_instantly_without_calling_model(self):
        """When the translation is already cached, the model should not be called."""
        import main as app_module
        from tests.conftest import MockAsyncOpenAI, MockRedisCache

        fake_redis = MockRedisCache()

        # Pre-seed the cache with a known response
        import asyncio

        cached_blocks = [
            {
                "id": "b1",
                "code_snippet": "z = 3",
                "english_translation": "Assigns 3 to z",
            }
        ]
        cache_key = app_module.cache_key(
            "z = 3", "python", "code-to-english", "standard"
        )
        asyncio.run(fake_redis.put(cache_key, cached_blocks))

        # Track whether AsyncOpenAI was instantiated
        calls = []
        OriginalMock = MockAsyncOpenAI

        class TrackingMock(OriginalMock):
            def __init__(self, *args, **kwargs):
                calls.append(kwargs)
                super().__init__(*args, **kwargs)

        async def fake_get_user_email():
            return "testuser@example.com"

        app_module.app.dependency_overrides[app_module.get_user_email] = (
            fake_get_user_email
        )
        import app.core.cache as cache_module
        try:
            with patch.object(app_module, "cache", fake_redis), \
                 patch.object(cache_module, "cache_override", fake_redis), \
                 patch.object(app_module, "AsyncOpenAI", TrackingMock):
                    from fastapi.testclient import TestClient

                    with TestClient(app_module.app) as tc:
                        res = tc.post(
                            "/api/code-to-english",
                            json={"raw_code": "z = 3", "language": "python"},
                        )
        finally:
            app_module.app.dependency_overrides.pop(app_module.get_user_email, None)

        assert res.status_code == 200

        # Parse the SSE to find the done event
        raw_text = res.text
        events = [
            line[6:]
            for line in raw_text.strip().split("\n\n")
            if line.startswith("data: ")
        ]

        done_event = None
        for event_str in events:
            try:
                event = json.loads(event_str)
                if event.get("done") is True:
                    done_event = event
                    break
            except json.JSONDecodeError:
                continue

        assert done_event is not None
        assert done_event["blocks"] == cached_blocks

        # The LLM client should NOT have been instantiated for a cache hit
        assert len(calls) == 0, f"Model was called {len(calls)} times despite cache hit"
