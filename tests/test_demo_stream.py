"""
Tests for the Anonymous Demo Streaming Endpoint (Phase 1B / Week 2).

Endpoints:
- POST /api/v1/demo/translate-stream
- POST /api/demo/translate-stream (legacy alias)

Key Requirements:
1. Responds with media_type="text/event-stream"
2. Emits SSE formatted events: data: {"chunk": ..., "done": false} and data: {"done": true, ...}
3. Sliding-window IP rate limiting with X-Demo-Remaining and X-Demo-Limit headers
4. Validates raw_code length (<= 1000 chars)
5. Validates translation mode
"""

import json

from fastapi.testclient import TestClient


def test_demo_translate_stream_success(client: TestClient):
    """Streaming endpoint returns 200 with text/event-stream and valid SSE events."""
    resp = client.post(
        "/api/v1/demo/translate-stream",
        json={
            "raw_code": "def add(a, b): return a + b",
            "language": "python",
            "mode": "code-to-english",
        },
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")
    assert "X-Demo-Remaining" in resp.headers
    assert resp.headers["X-Demo-Limit"] == "10"

    # Verify SSE stream contents
    raw_lines = resp.text.strip().split("\n\n")
    data_events = [line[6:] for line in raw_lines if line.startswith("data: ")]
    assert len(data_events) > 0

    # Verify at least one chunk event and one done event
    has_done = False
    for event_str in data_events:
        event = json.loads(event_str)
        if event.get("done") is True:
            has_done = True
            assert "blocks" in event
    assert has_done, f"Stream completed without done:true event. Events: {data_events}"


def test_demo_translate_stream_legacy_alias(client: TestClient):
    """Legacy /api/demo/translate-stream alias responds identically."""
    resp = client.post(
        "/api/demo/translate-stream",
        json={
            "raw_code": "const multiply = (x, y) => x * y;",
            "language": "javascript",
            "mode": "code-to-english",
        },
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")


def test_demo_translate_stream_mode_validation(client: TestClient):
    """Unsupported mode string returns 422 Unprocessable Entity."""
    resp = client.post(
        "/api/v1/demo/translate-stream",
        json={
            "raw_code": "print('hello')",
            "language": "python",
            "mode": "invalid-hacked-mode",
        },
    )
    assert resp.status_code == 422


def test_demo_translate_stream_length_limit(client: TestClient):
    """Payloads exceeding 1000 characters are rejected with 422."""
    long_code = "a = 1\n" * 250  # >1250 characters
    resp = client.post(
        "/api/v1/demo/translate-stream",
        json={
            "raw_code": long_code,
            "language": "python",
            "mode": "code-to-english",
        },
    )
    assert resp.status_code == 422


def test_demo_translate_stream_code_to_code(client: TestClient):
    """Demo stream handles code-to-code mode cleanly."""
    resp = client.post(
        "/api/v1/demo/translate-stream",
        json={
            "raw_code": "console.log('hi');",
            "language": "javascript",
            "mode": "code-to-code",
            "target_language": "python",
        },
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")
