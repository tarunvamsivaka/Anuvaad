"""
Integration tests for FastAPI endpoints: /healthz, /translate, /ast/validate, /verify-receipt.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_healthz_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/healthz")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "Anuvaad" in data["service"]


@pytest.mark.asyncio
async def test_translate_endpoint_with_zdr_receipt():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "source_code": "def multiply(x, y):\n    return x * y",
            "source_language": "python",
            "target_language": "typescript",
            "user_id": "usr_test_integration",
            "strict_ast_verification": True,
        }
        response = await client.post("/api/v1/translate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["source_language"] == "python"
        assert data["target_language"] == "typescript"
        assert "zdr_receipt" in data
        assert data["zdr_receipt"]["audit_digest"] is not None
        assert data["ast_valid"] is True

        # Now verify the receipt against /verify-receipt
        verify_resp = await client.post("/api/v1/verify-receipt", json=data["zdr_receipt"])
        assert verify_resp.status_code == 200
        assert verify_resp.json()["verified"] is True


@pytest.mark.asyncio
async def test_ast_validate_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "code": "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello\")\n}",
            "language": "go",
        }
        response = await client.post("/api/v1/ast/validate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["is_valid"] is True


@pytest.mark.asyncio
async def test_translate_stream_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "source_code": "def hello(): return 'world'",
            "source_language": "python",
            "target_language": "typescript",
            "user_id": "usr_stream_test",
        }
        response = await client.post("/api/v1/translate-stream", json=payload)
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        body_text = response.text
        assert "data: " in body_text
        assert "zdr_receipt" in body_text


@pytest.mark.asyncio
async def test_repo_fetch_github_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/repo/fetch-github",
            params={"repo_url": "facebook/react"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["repository_name"] == "facebook/react"
        assert len(data["topological_order"]) > 0
