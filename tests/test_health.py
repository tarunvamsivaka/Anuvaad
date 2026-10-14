import time
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_live_fast_response():
    # Warm up client / ASGI lifespan
    client.get("/health/live")

    start = time.perf_counter()
    resp = client.get("/health/live")
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "alive"
    # Liveness probe on warm app must execute fast (<50ms in in-memory test runner)
    assert elapsed_ms < 50.0


def test_health_ready_healthy():
    with (
        patch("app.core.cache.cache.client", True),
        patch("app.core.cache.cache.ping", new_callable=AsyncMock) as mock_ping,
    ):
        mock_ping.return_value = True
        resp = client.get("/health/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ready"
        assert data["redis_connected"] is True


def test_health_ready_redis_failure():
    with (
        patch("app.core.cache.cache.client", True),
        patch("app.core.cache.cache.ping", new_callable=AsyncMock) as mock_ping,
    ):
        mock_ping.side_effect = ConnectionError("Redis down")
        resp = client.get("/health/ready")
        assert resp.status_code == 503
        data = resp.json()
        assert data["status"] == "not_ready"
        assert data["redis_connected"] is False
