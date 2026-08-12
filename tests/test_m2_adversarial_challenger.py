"""
tests/test_m2_adversarial_challenger.py

Adversarial stress-testing suite for Milestone 2:
1. Stress test compute_quota_policy() and Groq token/character caps under extreme inputs
   (0, 4000, 4001, 50000, 50001 chars, EMERGENCY mode overrides).
2. Stress test structured HTTP 429 payloads to ensure Retry-After headers and JSON body
   parameters are valid numbers and types.
3. Test model failover under simulated Groq API rate limits (429), server errors (500/503),
   timeouts, and client exceptions to verify llama-3.1-8b-instant fallback behavior.
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, Request

from app.core.quota import (
    check_and_track_groq_limits,
    enforce_quotas_and_protection,
    raise_quota_429,
)
from app.domain.quota.policy import compute_quota_policy
from app.models.schemas import CodePayload
from app.services.ai import get_completion, stream_code_to_english


class TestQuotaPolicyExtremeInputs:
    """Stress test compute_quota_policy() across all tiers and protection modes."""

    def test_guest_quota_policy_modes(self):
        # NORMAL
        p_normal = compute_quota_policy(is_pro=False, is_admin=False, is_guest=True, mode="NORMAL")
        assert p_normal.daily_limit == 5
        assert p_normal.char_limit == 4000
        assert p_normal.cooldown == 5

        # CAUTION (0.8x)
        p_caution = compute_quota_policy(is_pro=False, is_admin=False, is_guest=True, mode="CAUTION")
        assert p_caution.daily_limit == 4
        assert p_caution.char_limit == 3200
        assert p_caution.cooldown == 10

        # RESTRICTED (0.5x)
        p_restr = compute_quota_policy(is_pro=False, is_admin=False, is_guest=True, mode="RESTRICTED")
        assert p_restr.daily_limit == 2
        assert p_restr.char_limit == 2000
        assert p_restr.cooldown == 20

        # EMERGENCY (0.2x, char_cap=300)
        p_emerg = compute_quota_policy(is_pro=False, is_admin=False, is_guest=True, mode="EMERGENCY")
        assert p_emerg.daily_limit == 1
        assert p_emerg.char_limit == 300
        assert p_emerg.cooldown == 30

    def test_free_quota_policy_modes(self):
        # NORMAL
        p_normal = compute_quota_policy(is_pro=False, is_admin=False, is_guest=False, mode="NORMAL")
        assert p_normal.daily_limit == 25
        assert p_normal.char_limit == 4000
        # conftest.py sets LIMIT_FREE_COOLDOWN=0 to prevent test slowdowns;
        # policy correctly reflects that env var override.
        assert p_normal.cooldown == 0

        # CAUTION (0.8x)
        p_caution = compute_quota_policy(is_pro=False, is_admin=False, is_guest=False, mode="CAUTION")
        assert p_caution.daily_limit == 20
        assert p_caution.char_limit == 3200
        assert p_caution.cooldown == 10

        # RESTRICTED (0.5x)
        p_restr = compute_quota_policy(is_pro=False, is_admin=False, is_guest=False, mode="RESTRICTED")
        assert p_restr.daily_limit == 12
        assert p_restr.char_limit == 2000
        assert p_restr.cooldown == 20

        # EMERGENCY (0.2x, char_cap=300)
        p_emerg = compute_quota_policy(is_pro=False, is_admin=False, is_guest=False, mode="EMERGENCY")
        assert p_emerg.daily_limit == 5
        assert p_emerg.char_limit == 300
        assert p_emerg.cooldown == 30

    def test_pro_quota_policy_modes(self):
        # NORMAL
        p_normal = compute_quota_policy(is_pro=True, is_admin=False, mode="NORMAL")
        assert p_normal.daily_limit == -1
        assert p_normal.char_limit == 50000
        assert p_normal.cooldown == 0

        # RESTRICTED (char_cap=25000, cooldown=2)
        p_restr = compute_quota_policy(is_pro=True, is_admin=False, mode="RESTRICTED")
        assert p_restr.daily_limit == -1
        assert p_restr.char_limit == 25000
        assert p_restr.cooldown == 2

        # EMERGENCY (char_cap=10000, cooldown=5)
        p_emerg = compute_quota_policy(is_pro=True, is_admin=False, mode="EMERGENCY")
        assert p_emerg.daily_limit == -1
        assert p_emerg.char_limit == 10000
        assert p_emerg.cooldown == 5

    def test_admin_quota_policy_unrestricted(self):
        for mode in ["NORMAL", "CAUTION", "RESTRICTED", "EMERGENCY"]:
            p = compute_quota_policy(is_pro=False, is_admin=True, mode=mode)
            assert p.daily_limit == -1
            assert p.char_limit == -1
            assert p.cooldown == 0


class TestCharacterBoundaryEnforcement:
    """Stress test character count boundaries in enforce_quotas_and_protection()."""

    @pytest.mark.asyncio
    async def test_zero_characters_input(self):
        req = MagicMock(spec=Request)
        req.client.host = "127.0.0.1"
        req.headers = {}
        with patch("app.core.quota.cache.incr_rate_limit", new_callable=AsyncMock, return_value=1):
            is_pro, daily_limit, deduct, cooldown = await enforce_quotas_and_protection(req, email=None, char_count=0)
            assert is_pro is False
            assert daily_limit == 5

    @pytest.mark.asyncio
    async def test_guest_4000_pass_4001_fail(self):
        req = MagicMock(spec=Request)
        req.client.host = "127.0.0.1"
        req.headers = {}

        with patch("app.core.quota.cache.incr_rate_limit", new_callable=AsyncMock, return_value=1):
            # 4000 chars -> pass
            await enforce_quotas_and_protection(req, email=None, char_count=4000)

            # 4001 chars -> HTTP 413
            with pytest.raises(HTTPException) as exc_info:
                await enforce_quotas_and_protection(req, email=None, char_count=4001)
            assert exc_info.value.status_code == 413

    @pytest.mark.asyncio
    async def test_pro_50000_pass_50001_fail(self):
        req = MagicMock(spec=Request)
        req.headers = {}

        with patch("app.core.quota.get_user_pro_status", new_callable=AsyncMock, return_value=True):
            # 50000 chars -> pass
            await enforce_quotas_and_protection(req, email="pro@example.com", char_count=50000)

            # 50001 chars -> HTTP 413 (absolute hard max)
            with pytest.raises(HTTPException) as exc_info:
                await enforce_quotas_and_protection(req, email="pro@example.com", char_count=50001)
            assert exc_info.value.status_code == 413

    @pytest.mark.asyncio
    async def test_emergency_mode_char_cap_overrides(self):
        req = MagicMock(spec=Request)
        req.client.host = "127.0.0.1"
        req.headers = {}

        with (
            patch("app.core.quota.get_active_protection_mode", new_callable=AsyncMock, return_value="EMERGENCY"),
            patch("app.core.quota.cache.incr_rate_limit", new_callable=AsyncMock, return_value=1),
        ):
            # Guest in EMERGENCY mode: 300 chars max
            await enforce_quotas_and_protection(req, email=None, char_count=300)

            with pytest.raises(HTTPException) as exc_info:
                await enforce_quotas_and_protection(req, email=None, char_count=301)
            assert exc_info.value.status_code == 413


class TestStructured429Payloads:
    """Stress test structured HTTP 429 payloads, numbers, types, and headers."""

    def test_raise_quota_429_types_and_fields(self):
        with pytest.raises(HTTPException) as exc_info:
            raise_quota_429(
                detail="Custom rate limit",
                limit_type="custom_limit",
                retry_after_seconds=120,
                tier_limit=10,
            )

        exc = exc_info.value
        assert exc.status_code == 429

        # Headers check
        assert "Retry-After" in exc.headers
        assert exc.headers["Retry-After"] == "120"
        assert isinstance(exc.headers["Retry-After"], str)

        # JSON body check
        data = exc.detail
        assert isinstance(data, dict)
        assert data["detail"] == "Custom rate limit"
        assert isinstance(data["detail"], str)

        assert data["limit_type"] == "custom_limit"
        assert isinstance(data["limit_type"], str)

        assert data["retry_after_seconds"] == 120
        assert isinstance(data["retry_after_seconds"], int)

        assert data["tier_limit"] == 10
        assert isinstance(data["tier_limit"], int)

    @pytest.mark.asyncio
    async def test_tpm_limit_429_payload_verification(self):
        with patch.dict(os.environ, {"GROQ_MAX_TPM": "5000"}):
            with pytest.raises(HTTPException) as exc_info:
                await check_and_track_groq_limits("x" * 25000, expected_output_tokens=1500)

            exc = exc_info.value
            assert exc.status_code == 429
            data = exc.detail
            assert data["limit_type"] == "tpm_limit"
            assert isinstance(data["retry_after_seconds"], int)
            assert data["retry_after_seconds"] >= 1
            assert data["tier_limit"] == 5000
            assert exc.headers["Retry-After"] == str(data["retry_after_seconds"])


class TestModelFailoverResilience:
    """Stress test model failover under 429, 500, 503, timeouts, and exceptions."""

    @pytest.mark.asyncio
    async def test_failover_on_429_rate_limit(self):
        mock_primary = AsyncMock()
        mock_primary.chat.completions.create.side_effect = Exception("429 Too Many Requests")

        mock_fallback_resp = MagicMock()
        mock_fallback_resp.choices = [
            MagicMock(message=MagicMock(content='{"blocks":[{"id":"b1","code_snippet":"a=1","english_translation":"Sets a"}]}'))
        ]
        mock_fallback = AsyncMock()
        mock_fallback.chat.completions.create.return_value = mock_fallback_resp

        with (
            patch.dict(os.environ, {"GROQ_API_KEY": "test_groq_key"}),
            patch("app.services.ai.check_and_track_groq_limits", new_callable=AsyncMock),
            patch("app.services.ai._get_groq_client", return_value=mock_primary),
        ):
            mock_primary.chat.completions.create.side_effect = [
                Exception("429 Rate Limit Exceeded on llama-3.3-70b-versatile"),
                mock_fallback_resp,
            ]

            res_text, model_name = await get_completion(
                prompt="a = 1",
                system_instruction="Analyze",
                mode="explanation",
            )
            assert "fallback" in model_name.lower() or "8b" in model_name.lower()
            assert "b1" in res_text

    @pytest.mark.asyncio
    async def test_failover_on_500_503_server_error(self):
        mock_fallback_resp = MagicMock()
        mock_fallback_resp.choices = [
            MagicMock(message=MagicMock(content='{"blocks":[{"id":"b1","code_snippet":"b=2","english_translation":"Sets b"}]}'))
        ]
        mock_primary = AsyncMock()

        with (
            patch.dict(os.environ, {"GROQ_API_KEY": "test_groq_key"}),
            patch("app.services.ai.check_and_track_groq_limits", new_callable=AsyncMock),
            patch("app.services.ai._get_groq_client", return_value=mock_primary),
        ):
            # Primary fails with 503 Service Unavailable, fallback succeeds
            mock_primary.chat.completions.create.side_effect = [
                Exception("503 Service Unavailable"),
                mock_fallback_resp,
            ]

            res_text, model_name = await get_completion(
                prompt="b = 2",
                system_instruction="Analyze",
                mode="explanation",
            )
            assert "fallback" in model_name.lower() or "8b" in model_name.lower()
            assert "b1" in res_text

    @pytest.mark.asyncio
    async def test_failover_on_timeout(self):
        mock_fallback_resp = MagicMock()
        mock_fallback_resp.choices = [
            MagicMock(message=MagicMock(content='{"blocks":[{"id":"b1","code_snippet":"c=3","english_translation":"Sets c"}]}'))
        ]
        mock_primary = AsyncMock()

        with (
            patch.dict(os.environ, {"GROQ_API_KEY": "test_groq_key"}),
            patch("app.services.ai.check_and_track_groq_limits", new_callable=AsyncMock),
            patch("app.services.ai._get_groq_client", return_value=mock_primary),
        ):
            mock_primary.chat.completions.create.side_effect = [
                TimeoutError("Groq API call timed out"),
                mock_fallback_resp,
            ]

            res_text, model_name = await get_completion(
                prompt="c = 3",
                system_instruction="Analyze",
                mode="explanation",
            )
            assert "fallback" in model_name.lower() or "8b" in model_name.lower()
            assert "b1" in res_text

    @pytest.mark.asyncio
    async def test_streaming_failover_on_primary_429(self):
        payload = CodePayload(raw_code="x = 10", language="python")

        mock_fallback_chunk = MagicMock()
        mock_fallback_chunk.choices = [
            MagicMock(
                delta=MagicMock(
                    content='{"blocks":[{"id":"b1","code_snippet":"x = 10","english_translation":"Sets x to 10"}]}'
                )
            )
        ]

        async def async_chunk_gen():
            yield mock_fallback_chunk

        mock_primary = AsyncMock()
        mock_primary.chat.completions.create.side_effect = [
            Exception("429 Groq Rate Limit"),
            async_chunk_gen(),
        ]

        with (
            patch.dict(os.environ, {"GROQ_API_KEY": "test_groq_key"}),
            patch("app.services.ai.cache.get", new_callable=AsyncMock, return_value=None),
            patch("app.services.ai.check_and_track_groq_limits", new_callable=AsyncMock),
            patch("app.services.ai._get_groq_client", return_value=mock_primary),
            patch("app.services.ai.cache.put", new_callable=AsyncMock),
        ):
            events = []
            async for ev in stream_code_to_english(
                payload=payload,
                email=None,
                is_pro=False,
                use_r1=False,
                tier="free",
            ):
                events.append(ev)

            # Check that streaming succeeded and returned done: True with blocks
            done_event = [e for e in events if '"done": true' in e.lower() or '"done": True' in e]
            assert len(done_event) > 0
            assert "llama-3.1-8b-instant" in done_event[-1]
