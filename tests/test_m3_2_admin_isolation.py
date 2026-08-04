"""
tests/test_m3_2_admin_isolation.py

Empirical test module for Milestone 3 (P2 Architectural Cleanup):
Verifies get_admin_dashboard_stats() and get_total_user_count() do not make
any external HTTP requests to Supabase REST.
"""

from unittest.mock import patch

import httpx
import pytest

from app.core.auth import get_user_email
from app.main import app
from app.repositories import subscription as subscription_repo
from app.routers.history import get_admin_dashboard_stats


@pytest.mark.asyncio
async def test_get_total_user_count_no_external_http():
    """Verify get_total_user_count() uses SQLAlchemy ORM and makes 0 HTTP calls."""
    http_calls = []

    original_send = httpx.AsyncClient.send

    async def mock_send(self, request, *args, **kwargs):
        http_calls.append(str(request.url))
        return await original_send(self, request, *args, **kwargs)

    with patch.object(httpx.AsyncClient, "send", mock_send):
        user_count = await subscription_repo.get_total_user_count()

    # Verify no HTTP calls were made to Supabase REST or external API
    supabase_rest_calls = [url for url in http_calls if "supabase.co/rest" in url]
    assert len(supabase_rest_calls) == 0, f"Unexpected Supabase REST HTTP calls: {supabase_rest_calls}"
    assert isinstance(user_count, int)


@pytest.mark.asyncio
async def test_get_admin_dashboard_stats_no_supabase_rest_http():
    """Verify get_admin_dashboard_stats() directly makes 0 Supabase REST HTTP calls."""
    http_calls = []

    original_send = httpx.AsyncClient.send

    async def mock_send(self, request, *args, **kwargs):
        http_calls.append(str(request.url))
        return await original_send(self, request, *args, **kwargs)

    with patch.object(httpx.AsyncClient, "send", mock_send):
        stats = await get_admin_dashboard_stats(email="admin@anuvaad.dev")

    # Assert response structure
    assert "total_users" in stats
    assert "cache_stats" in stats
    assert "estimated_spend_usd" in stats
    assert "total_translations" in stats
    assert "protection_mode" in stats
    assert "model_calls" in stats
    assert "model_errors" in stats
    assert "uptime_seconds" in stats

    # Assert zero calls to Supabase REST
    supabase_rest_calls = [url for url in http_calls if "supabase.co/rest" in url]
    assert len(supabase_rest_calls) == 0, f"Unexpected Supabase REST HTTP calls: {supabase_rest_calls}"


def test_admin_dashboard_endpoint_no_supabase_rest_http(client):
    """Verify GET /api/admin/dashboard-stats endpoint makes 0 Supabase REST HTTP calls."""

    async def fake_admin_email():
        return "admin@anuvaad.dev"

    app.dependency_overrides[get_user_email] = fake_admin_email

    http_calls = []

    original_send = httpx.AsyncClient.send

    async def mock_send(self, request, *args, **kwargs):
        http_calls.append(str(request.url))
        return await original_send(self, request, *args, **kwargs)

    try:
        with patch.object(httpx.AsyncClient, "send", mock_send):
            res = client.get("/api/admin/dashboard-stats")

        assert res.status_code == 200
        data = res.json()
        assert "total_users" in data
        assert isinstance(data["total_users"], int)

        supabase_rest_calls = [url for url in http_calls if "supabase.co/rest" in url]
        assert len(supabase_rest_calls) == 0, f"Unexpected Supabase REST HTTP calls: {supabase_rest_calls}"
    finally:
        app.dependency_overrides.pop(get_user_email, None)
