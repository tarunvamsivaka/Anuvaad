"""
Tests for the anonymous demo translate endpoint (Phase 5.2).

Endpoint: POST /api/demo/translate
- No authentication required
- Rate limited to 3 requests per IP per 24h
- Returns pre-cached sample translation blocks
"""
from fastapi.testclient import TestClient


def test_demo_translate_javascript(client: TestClient):
    """Demo endpoint returns blocks for a known language."""
    resp = client.post(
        "/api/demo/translate",
        json={"language": "javascript", "mode": "code-to-english"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["demo"] is True
    assert data["language"] == "javascript"
    assert isinstance(data["blocks"], list)
    assert len(data["blocks"]) > 0
    block = data["blocks"][0]
    assert "code_snippet" in block
    assert "english_translation" in block
    assert len(block["english_translation"]) > 20  # substantive explanation


def test_demo_translate_python(client: TestClient):
    """Demo endpoint works for Python."""
    resp = client.post(
        "/api/demo/translate",
        json={"language": "python", "mode": "code-to-english"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["demo"] is True
    assert "blocks" in data


def test_demo_translate_typescript(client: TestClient):
    """Demo endpoint works for TypeScript."""
    resp = client.post(
        "/api/demo/translate",
        json={"language": "typescript", "mode": "code-to-english"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["demo"] is True
    assert "blocks" in data


def test_demo_translate_unsupported_language_falls_back(client: TestClient):
    """Unknown language falls back to JavaScript demo sample."""
    resp = client.post(
        "/api/demo/translate",
        json={"language": "cobol", "mode": "code-to-english"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["demo"] is True
    assert isinstance(data["blocks"], list)
    assert len(data["blocks"]) > 0


def test_demo_translate_invalid_mode_rejected(client: TestClient):
    """Mode must be code-to-english or code-to-code."""
    resp = client.post(
        "/api/demo/translate",
        json={"language": "python", "mode": "hacked-mode"},
    )
    assert resp.status_code == 422  # Pydantic validation error


def test_demo_translate_response_headers(client: TestClient):
    """Response includes rate limit headers."""
    resp = client.post(
        "/api/demo/translate",
        json={"language": "go", "mode": "code-to-english"},
    )
    assert resp.status_code == 200
    assert "X-Demo-Remaining" in resp.headers
    assert "X-Demo-Limit" in resp.headers
    assert resp.headers["X-Demo-Limit"] == "3"


def test_demo_translate_model_used_is_demo(client: TestClient):
    """model_used field is 'demo' (no real LLM call)."""
    resp = client.post(
        "/api/demo/translate",
        json={"language": "rust", "mode": "code-to-english"},
    )
    assert resp.status_code == 200
    assert resp.json()["model_used"] == "demo"


def test_demo_translate_remaining_decrements(client: TestClient):
    """remaining_demo_requests decreases with each call."""
    r1 = client.post("/api/demo/translate", json={"language": "go"})
    r2 = client.post("/api/demo/translate", json={"language": "go"})
    assert r1.status_code == 200
    assert r2.status_code == 200
    rem1 = r1.json()["remaining_demo_requests"]
    rem2 = r2.json()["remaining_demo_requests"]
    assert rem2 <= rem1
