"""
Launch resilience and abuse protection tests for Anuvaad.
Covers auth gating, tier quotas, cooldowns, billing flag, protection modes, and admin stats.
"""

import os
import pytest
from unittest.mock import patch
import main as app_module


class TestAuthGating:
    """Verify that unauthenticated users are blocked from AI endpoints."""

    def test_anonymous_user_blocked_from_code_to_english(self, client_no_auth):
        res = client_no_auth.post(
            "/api/code-to-english", json={"raw_code": "print(1)", "language": "python"}
        )
        assert res.status_code == 401
        assert "authentication required" in res.json()["detail"].lower()

    def test_anonymous_user_blocked_from_generate_code(self, client_no_auth):
        res = client_no_auth.post(
            "/api/generate-from-english",
            json={"prompt": "write a function", "language": "python"},
        )
        assert res.status_code == 401

    def test_anonymous_user_blocked_from_code_to_code(self, client_no_auth):
        res = client_no_auth.post(
            "/api/code-to-code",
            json={
                "raw_code": "print(1)",
                "source_language": "python",
                "target_language": "javascript",
            },
        )
        assert res.status_code == 401


class TestUserTiersAndQuotas:
    """Verify Free, Pro, and Admin quota enforcement."""

    @pytest.mark.asyncio
    async def test_free_user_char_limit(self, client):
        # Free user character limit is 10,000. Try 10,005 characters -> 413
        res = client.post(
            "/api/code-to-english", json={"raw_code": "x" * 10005, "language": "python"}
        )
        assert res.status_code == 413
        assert "exceeds the current limit" in res.json()["detail"]

    @pytest.mark.asyncio
    async def test_pro_user_char_limit_allowed(self, client):
        # Mock get_user_pro_status to return True
        with patch("main.get_user_pro_status", return_value=True):
            res = client.post(
                "/api/code-to-english",
                json={"raw_code": "x" * 10005, "language": "python"},
            )
            # Pro user allows up to 50K. 10005 chars should be 200 (allowed)
            assert res.status_code == 200

    @pytest.mark.asyncio
    async def test_admin_bypass_limits(self, client):
        # Admin is in ADMIN_USERS. Mock email to return admin address
        async def fake_admin_email():
            return "admin@anuvaad.dev"

        app_module.app.dependency_overrides[app_module.get_user_email] = (
            fake_admin_email
        )
        try:
            # Send huge code (e.g. 40,000 chars)
            res = client.post(
                "/api/code-to-english",
                json={"raw_code": "x" * 40000, "language": "python"},
            )
            # Admin bypasses limits and should succeed
            assert res.status_code == 200
        finally:
            app_module.app.dependency_overrides.pop(app_module.get_user_email, None)


class TestCooldownEnforcement:
    """Verify per-user cooldown rate limits."""

    @pytest.mark.asyncio
    async def test_cooldown_raises_429(self, client):
        # Simulate active cooldown in cache and set cooldown env limit to 5
        with patch.dict(os.environ, {"LIMIT_FREE_COOLDOWN": "5"}):
            with patch.object(
                app_module.cache,
                "get",
                side_effect=lambda k: True if "cooldown:" in k else None,
            ):
                res = client.post(
                    "/api/code-to-english",
                    json={"raw_code": "print(1)", "language": "python"},
                )
                assert res.status_code == 429
                assert "cooldown active" in res.json()["detail"].lower()


class TestBillingGating:
    """Verify billing endpoints return 503 when ENABLE_BILLING=false."""

    def test_billing_disabled_by_default(self, client):
        original_billing = os.environ.get("ENABLE_BILLING")
        os.environ["ENABLE_BILLING"] = "false"
        try:
            res1 = client.post(
                "/api/create-checkout-session",
                json={
                    "user_email": "testuser@example.com",
                    "access_token": "valid_token_here_long_enough",
                },
            )
            assert res1.status_code == 503
            assert (
                "billing and payment registration are temporarily paused"
                in res1.json()["detail"].lower()
            )

            res2 = client.post(
                "/api/create-portal-session",
                json={"access_token": "valid_token_here_long_enough"},
            )
            assert res2.status_code == 503

            res3 = client.post(
                "/api/create-credit-checkout",
                json={"access_token": "valid_token_here_long_enough"},
            )
            assert res3.status_code == 503
        finally:
            if original_billing is not None:
                os.environ["ENABLE_BILLING"] = original_billing


class TestAdminDashboardStats:
    """Verify GET /api/admin/dashboard-stats permissions and metrics."""

    def test_stats_accessible_to_whitelisted_admin(self, client):
        async def fake_admin_email():
            return "admin@anuvaad.dev"

        app_module.app.dependency_overrides[app_module.get_user_email] = (
            fake_admin_email
        )
        try:
            res = client.get("/api/admin/dashboard-stats")
            assert res.status_code == 200
            data = res.json()
            assert "total_users" in data
            assert "cache_stats" in data
            assert "estimated_spend_usd" in data
            assert "protection_mode" in data
        finally:
            app_module.app.dependency_overrides.pop(app_module.get_user_email, None)

    def test_stats_forbidden_for_regular_user(self, client):
        async def fake_regular_email():
            return "regular@example.com"

        app_module.app.dependency_overrides[app_module.get_user_email] = (
            fake_regular_email
        )
        try:
            res = client.get("/api/admin/dashboard-stats")
            assert res.status_code == 403
            assert "admin access required" in res.json()["detail"].lower()
        finally:
            app_module.app.dependency_overrides.pop(app_module.get_user_email, None)


class TestProtectionModes:
    """Verify Protection Mode limits and scaling."""

    @pytest.mark.asyncio
    async def test_emergency_mode_limits(self, client):
        # Force EMERGENCY mode via manual override
        with patch.dict(os.environ, {"PROTECTION_MODE": "EMERGENCY"}):
            # Check limits for a free user. Emergency should restrict chars to 300
            res = client.post(
                "/api/code-to-english",
                json={"raw_code": "x" * 305, "language": "python"},
            )
            assert res.status_code == 413
            assert "exceeds the current limit" in res.json()["detail"]


class TestStaleRecoveryFallback:
    """Verify that if LLMs fail, the API recovers using stale cache/DB history."""

    @pytest.mark.asyncio
    async def test_stale_cache_recovery_on_failure(self, client):
        # Seed cache for standard model
        key = app_module.cache_key("print(42)", "python", "code-to-english", "standard")
        mock_blocks = [
            {
                "id": "block_1",
                "code_snippet": "print(42)",
                "english_translation": "Prints 42",
            }
        ]
        await app_module.cache.put(key, mock_blocks)

        # Mock get_completion to throw an exception
        with patch("main.get_completion", side_effect=Exception("API limit exceeded")):
            res = client.post(
                "/api/code-to-english/sync",
                json={"raw_code": "print(42)", "language": "python"},
            )
            assert res.status_code == 200
            assert res.json() == mock_blocks
