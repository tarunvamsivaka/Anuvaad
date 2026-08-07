"""
tests/test_zero_budget.py

Unit and integration tests for Requirement R1: Zero-Budget AI Quota & Resilience Architecture.
Covers:
- Groq Free Tier Guardrails (4000 char input cap, 1500 max_tokens output cap, token estimation, TPM/RPM tracking)
- Graceful Quota Failover (fallback model llama-3.1-8b-instant on 429 errors without 500 exceptions)
- Client IP Guest Rate Limiting (5 translations/day per IP, tracked via guest_daily_usage:<ip>:<date>)
- Standardized HTTP 429 JSON response payload (detail, limit_type, retry_after_seconds, tier_limit, Retry-After header)
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, Request

from app.core.quota import (
    check_and_track_groq_limits,
    enforce_quotas_and_protection,
    estimate_tokens,
)
from app.domain.quota.policy import compute_quota_policy
from app.services.ai import get_completion


class TestPolicyDefaults:
    """Verify QuotaPolicy calculations for Free and Guest tiers."""

    def test_free_tier_policy_defaults(self):
        with patch.dict(os.environ, {"LIMIT_FREE_COOLDOWN": "5"}):
            policy = compute_quota_policy(is_pro=False, is_admin=False, is_guest=False, mode="NORMAL")
            assert policy.daily_limit == 25
            assert policy.char_limit == 4000
            assert policy.cooldown == 5

    def test_guest_tier_policy_defaults(self):
        policy = compute_quota_policy(is_pro=False, is_admin=False, is_guest=True, mode="NORMAL")
        assert policy.daily_limit == 5
        assert policy.char_limit == 4000
        assert policy.cooldown == 5

    def test_protection_mode_overrides_on_guest(self):
        policy = compute_quota_policy(is_pro=False, is_admin=False, is_guest=True, mode="RESTRICTED")
        assert policy.daily_limit == 2
        assert policy.char_limit == 2000
        assert policy.cooldown == 20

    def test_emergency_mode_char_cap(self):
        policy = compute_quota_policy(is_pro=False, is_admin=False, is_guest=False, mode="EMERGENCY")
        assert policy.char_limit <= 300
        assert policy.cooldown == 30


class TestTokenEstimationAndGroqLimits:
    """Verify token estimation and RPM/TPM tracking."""

    def test_estimate_tokens_heuristic(self):
        assert estimate_tokens("") == 0
        assert estimate_tokens("hello") == 1
        assert estimate_tokens("a" * 400) == 100

    @pytest.mark.asyncio
    async def test_groq_tpm_limit_exceeded_raises_structured_429(self):
        with patch.dict(os.environ, {"GROQ_MAX_TPM": "100"}):
            with pytest.raises(HTTPException) as exc_info:
                await check_and_track_groq_limits("x" * 1000, expected_output_tokens=1500)

            exc = exc_info.value
            assert exc.status_code == 429
            assert isinstance(exc.detail, dict)
            assert exc.detail["limit_type"] == "tpm_limit"
            assert exc.detail["tier_limit"] == 100
            assert "Retry-After" in exc.headers

    @pytest.mark.asyncio
    async def test_groq_rpm_limit_exceeded_raises_structured_429(self):
        with patch.dict(os.environ, {"GROQ_MAX_RPM": "1"}):
            with patch("app.core.quota.cache.incr_rate_limit", new_callable=AsyncMock, return_value=2):
                with pytest.raises(HTTPException) as exc_info:
                    await check_and_track_groq_limits("print('hello')", expected_output_tokens=10)

                exc = exc_info.value
                assert exc.status_code == 429
                assert isinstance(exc.detail, dict)
                assert exc.detail["limit_type"] == "rpm_limit"


class TestGuestAndUserRateLimiting:
    """Verify Client IP Guest rate limiting and User Daily Quota."""

    @pytest.mark.asyncio
    async def test_guest_translation_within_limit(self):
        req = MagicMock(spec=Request)
        req.client.host = "192.168.1.50"
        req.headers = {}

        with patch("app.core.quota.cache.incr_rate_limit", new_callable=AsyncMock, return_value=3):
            is_pro, daily_limit, deduct_credit, cooldown = await enforce_quotas_and_protection(
                req, email=None, char_count=100
            )
            assert is_pro is False
            assert daily_limit == 5
            assert deduct_credit is False

    @pytest.mark.asyncio
    async def test_guest_translation_limit_exceeded_raises_structured_429(self):
        req = MagicMock(spec=Request)
        req.client.host = "192.168.1.50"
        req.headers = {}

        with patch("app.core.quota.cache.incr_rate_limit", new_callable=AsyncMock, return_value=6):
            with pytest.raises(HTTPException) as exc_info:
                await enforce_quotas_and_protection(req, email=None, char_count=100)

            exc = exc_info.value
            assert exc.status_code == 429
            assert isinstance(exc.detail, dict)
            assert exc.detail["limit_type"] == "guest_daily_limit"
            assert exc.detail["tier_limit"] == 5
            assert exc.headers["Retry-After"] == "86400"

    @pytest.mark.asyncio
    async def test_signed_in_user_daily_limit_exceeded_raises_structured_429(self):
        req = MagicMock(spec=Request)
        req.headers = {}

        with (
            patch("app.core.quota.get_user_pro_status", new_callable=AsyncMock, return_value=False),
            patch("app.core.quota.increment_today_usage_count", new_callable=AsyncMock, return_value=26),
            patch("app.core.quota.get_user_credits", new_callable=AsyncMock, return_value=0),
        ):
            with pytest.raises(HTTPException) as exc_info:
                await enforce_quotas_and_protection(req, email="freeuser@example.com", char_count=100)

            exc = exc_info.value
            assert exc.status_code == 429
            assert isinstance(exc.detail, dict)
            assert exc.detail["limit_type"] == "user_daily_limit"
            assert exc.detail["tier_limit"] == 25
            assert exc.headers["Retry-After"] == "86400"


class TestModelFailover:
    """Verify model fallback from primary to llama-3.1-8b-instant on 429 error."""

    @pytest.mark.asyncio
    async def test_primary_429_triggers_llama_3_1_8b_instant_fallback(self):
        mock_primary_client = AsyncMock()
        mock_primary_client.chat.completions.create.side_effect = Exception("429 Rate limit exceeded")

        mock_fallback_response = MagicMock()
        mock_fallback_response.choices = [
            MagicMock(
                message=MagicMock(
                    content='{"blocks":[{"id":"b1","code_snippet":"x=1","english_translation":"Sets x to 1"}]}'
                )
            )
        ]

        mock_fallback_client = AsyncMock()
        mock_fallback_client.chat.completions.create.return_value = mock_fallback_response

        with (
            patch.dict(os.environ, {"GROQ_API_KEY": "test_key"}),
            patch("app.services.ai.check_and_track_groq_limits", new_callable=AsyncMock),
            patch("app.services.ai._get_groq_client", return_value=mock_primary_client),
        ):
            # Pass groq_client for primary and fallback
            mock_primary_client.chat.completions.create.side_effect = [
                Exception("429 RateLimitError on llama-3.3-70b-versatile"),
                mock_fallback_response,
            ]

            res_text, model_name = await get_completion(
                prompt="x = 1",
                system_instruction="Analyze code",
                mode="explanation",
                response_format="json_object",
                use_r1=False,
            )

            assert "Groq Llama 3.1 8B" in model_name or "fallback" in model_name.lower()
            assert "b1" in res_text
