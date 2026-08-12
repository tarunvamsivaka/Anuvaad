"""
Tests for the streaming translation endpoint.

Verifies SSE content type, event structure, and cache-hit fast path.
"""

import json
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

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
        res = client.post("/api/code-to-english", json={"raw_code": "x = 1", "language": "python"})
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
        res = client.post("/api/code-to-english", json={"raw_code": "y = 2", "language": "python"})
        assert res.status_code == 200
        raw_text = res.text
        events = [line[6:] for line in raw_text.strip().split("\n\n") if line.startswith("data: ")]

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
        cache_key = app_module.cache_key("z = 3", "python", "code-to-english", "standard")
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

        app_module.app.dependency_overrides[app_module.get_user_email] = fake_get_user_email
        import app.core.cache as cache_module

        try:
            with (
                patch.object(app_module, "cache", fake_redis),
                patch.object(cache_module, "cache_override", fake_redis),
                patch.object(app_module, "AsyncOpenAI", TrackingMock),
            ):
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
        events = [line[6:] for line in raw_text.strip().split("\n\n") if line.startswith("data: ")]

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


class TestStreamingModelFailover:
    """Unit tests for stream_code_to_english and stream_code_to_code model failover."""

    @pytest.mark.asyncio
    async def test_stream_code_to_english_failover_on_429(self):
        """Verify stream_code_to_english fails over from llama-3.3-70b-versatile to llama-3.1-8b-instant on 429."""
        from app.models.schemas import CodePayload
        from app.services.ai import stream_code_to_english

        class MockChunk:
            def __init__(self, content):
                self.choices = [MagicMock(delta=MagicMock(content=content))]

        async def mock_stream(content):
            yield MockChunk(content)

        async def fake_create(**kwargs):
            model = kwargs.get("model", "")
            if model == "llama-3.3-70b-versatile":
                raise Exception("429 RateLimitError on llama-3.3-70b-versatile")
            elif model == "llama-3.1-8b-instant":
                valid_json = json.dumps([
                    {
                        "id": "block_1",
                        "code_snippet": "def add(a, b): return a + b",
                        "english_translation": "Returns sum of a and b",
                    }
                ])
                return mock_stream(valid_json)
            raise Exception(f"Unexpected model: {model}")

        mock_groq_client = MagicMock()
        mock_groq_client.chat.completions.create = AsyncMock(side_effect=fake_create)

        payload = CodePayload(raw_code="def add(a, b): return a + b", language="python")

        with (
            patch("app.services.ai.check_and_track_groq_limits", new_callable=AsyncMock),
            patch("app.services.ai._get_groq_client", return_value=mock_groq_client),
            patch("app.services.ai._get_openrouter_client", return_value=None),
            patch("app.services.ai.cache.get", new_callable=AsyncMock, return_value=None),
            patch("app.services.ai.cache.put", new_callable=AsyncMock),
        ):
            sse_lines = []
            async for line in stream_code_to_english(
                payload=payload,
                email="user@example.com",
                is_pro=False,
                use_r1=False,
                tier="free",
            ):
                sse_lines.append(line)

        # Parse SSE events
        done_event = None
        for line in sse_lines:
            line_str = line.strip()
            if line_str.startswith("data: "):
                data = json.loads(line_str[6:])
                if data.get("done") is True:
                    done_event = data
                    break

        assert done_event is not None
        assert done_event.get("model_used") == "llama-3.1-8b-instant"
        assert "blocks" in done_event
        assert done_event["blocks"][0]["code_snippet"] == "def add(a, b): return a + b"

    @pytest.mark.asyncio
    async def test_stream_code_to_code_failover_on_api_error(self):
        """Verify stream_code_to_code fails over from llama-3.3-70b-versatile to llama-3.1-8b-instant on API error."""
        from app.models.schemas import CodeToCodePayload
        from app.services.ai import stream_code_to_code

        class MockChunk:
            def __init__(self, content):
                self.choices = [MagicMock(delta=MagicMock(content=content))]

        async def mock_stream(content):
            yield MockChunk(content)

        async def fake_create(**kwargs):
            model = kwargs.get("model", "")
            if model == "llama-3.3-70b-versatile":
                raise Exception("500 Internal Server Error on primary LLM")
            elif model == "llama-3.1-8b-instant":
                valid_json = json.dumps([
                    {
                        "id": "block_1",
                        "code_snippet": "const add = (a, b) => a + b;",
                        "english_translation": "Adds a and b in JavaScript",
                    }
                ])
                return mock_stream(valid_json)
            raise Exception(f"Unexpected model: {model}")

        mock_groq_client = MagicMock()
        mock_groq_client.chat.completions.create = AsyncMock(side_effect=fake_create)

        payload = CodeToCodePayload(
            raw_code="def add(a, b): return a + b",
            source_language="python",
            target_language="javascript",
        )

        with (
            patch("app.services.ai.check_and_track_groq_limits", new_callable=AsyncMock),
            patch("app.services.ai._get_groq_client", return_value=mock_groq_client),
            patch("app.services.ai._get_openrouter_client", return_value=None),
            patch("app.services.ai.cache.get", new_callable=AsyncMock, return_value=None),
            patch("app.services.ai.cache.put", new_callable=AsyncMock),
        ):
            sse_lines = []
            async for line in stream_code_to_code(
                payload=payload,
                email="user@example.com",
                is_pro=False,
                use_r1=False,
                tier="free",
            ):
                sse_lines.append(line)

        # Parse SSE events
        done_event = None
        for line in sse_lines:
            line_str = line.strip()
            if line_str.startswith("data: "):
                data = json.loads(line_str[6:])
                if data.get("done") is True:
                    done_event = data
                    break

        assert done_event is not None
        assert done_event.get("model_used") == "llama-3.1-8b-instant"
        assert "blocks" in done_event
        assert done_event["blocks"][0]["code_snippet"] == "const add = (a, b) => a + b;"

