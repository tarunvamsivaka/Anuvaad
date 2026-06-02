"""
Tests for the get_completion() AI router in main.py.

Verifies model selection based on mode, R1 pro routing,
and fallback behaviour when a provider returns a rate limit error.
"""

import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import openai
import main as app_module


# ── Helpers ──

class FakeMessage:
    def __init__(self, content: str):
        self.content = content

class FakeChoice:
    def __init__(self, content: str):
        self.message = FakeMessage(content)

class FakeResponse:
    def __init__(self, content: str):
        self.choices = [FakeChoice(content)]


def _ok_response(content: str = '[{"id":"b1","code_snippet":"x","english_translation":"desc"}]'):
    """Return a coroutine that resolves to a FakeResponse."""
    return FakeResponse(content)


def _build_clients():
    """Create two independent mock clients for Groq and DeepSeek."""
    groq_mock = MagicMock()
    groq_mock.chat.completions.create = AsyncMock(return_value=_ok_response())

    deepseek_mock = MagicMock()
    deepseek_mock.chat.completions.create = AsyncMock(return_value=_ok_response())

    call_log = []  # (base_url, client_instance) pairs

    def fake_async_openai(*args, **kwargs):
        base_url = kwargs.get("base_url", "")
        if "groq.com" in base_url:
            call_log.append(("groq", kwargs))
            return groq_mock
        elif "deepseek.com" in base_url:
            call_log.append(("deepseek", kwargs))
            return deepseek_mock
        return MagicMock()

    return groq_mock, deepseek_mock, fake_async_openai, call_log


class TestModelRouting:
    """Verify the router picks the correct primary model for each mode."""

    @pytest.mark.asyncio
    async def test_groq_is_called_for_explanation_mode(self):
        """In explanation mode, Groq (llama-3.3-70b-versatile) should be the primary."""
        groq, deepseek, factory, _ = _build_clients()

        with patch.object(app_module, "AsyncOpenAI", factory):
            result, model_name = await app_module.get_completion(
                prompt="explain this code",
                system_instruction="You are a code explainer.",
                mode="explanation",
            )

        # Groq should have been called
        groq.chat.completions.create.assert_awaited_once()
        call_kwargs = groq.chat.completions.create.call_args
        assert call_kwargs.kwargs["model"] == "llama-3.3-70b-versatile"

        # DeepSeek should NOT have been called (no fallback needed)
        deepseek.chat.completions.create.assert_not_awaited()
        assert model_name == "Llama 3.3"

    @pytest.mark.asyncio
    async def test_deepseek_is_called_for_translation_mode(self):
        """In translation mode, DeepSeek (deepseek-chat) should be the primary."""
        groq, deepseek, factory, _ = _build_clients()

        with patch.object(app_module, "AsyncOpenAI", factory):
            result, model_name = await app_module.get_completion(
                prompt="translate this code to javascript",
                system_instruction="You are a translator.",
                mode="translation",
            )

        deepseek.chat.completions.create.assert_awaited_once()
        call_kwargs = deepseek.chat.completions.create.call_args
        assert call_kwargs.kwargs["model"] == "deepseek-chat"

        groq.chat.completions.create.assert_not_awaited()
        assert model_name == "DeepSeek V3"


class TestFallbackBehaviour:
    """Verify that when the primary model fails, the router falls back."""

    @pytest.mark.asyncio
    async def test_on_groq_429_falls_back_to_deepseek(self):
        """When Groq raises RateLimitError, DeepSeek should be used as fallback."""
        groq, deepseek, factory, _ = _build_clients()

        # Make Groq raise a rate limit error
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.headers = {}
        groq.chat.completions.create = AsyncMock(
            side_effect=openai.RateLimitError(
                message="Rate limit exceeded",
                response=mock_response,
                body=None,
            )
        )

        with patch.object(app_module, "AsyncOpenAI", factory):
            result, model_name = await app_module.get_completion(
                prompt="explain this",
                system_instruction="You are helpful.",
                mode="explanation",
            )

        # Groq was called and failed
        groq.chat.completions.create.assert_awaited_once()
        # DeepSeek was called as fallback
        deepseek.chat.completions.create.assert_awaited_once()
        assert model_name == "DeepSeek V3"

    @pytest.mark.asyncio
    async def test_on_deepseek_429_falls_back_to_groq(self):
        """When DeepSeek raises RateLimitError, Groq should be used as fallback."""
        groq, deepseek, factory, _ = _build_clients()

        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.headers = {}
        deepseek.chat.completions.create = AsyncMock(
            side_effect=openai.RateLimitError(
                message="Rate limit exceeded",
                response=mock_response,
                body=None,
            )
        )

        with patch.object(app_module, "AsyncOpenAI", factory):
            result, model_name = await app_module.get_completion(
                prompt="translate code",
                system_instruction="You are a translator.",
                mode="translation",
            )

        # DeepSeek was called first and failed
        deepseek.chat.completions.create.assert_awaited_once()
        # Groq was called as fallback
        groq.chat.completions.create.assert_awaited_once()
        assert model_name == "Llama 3.3"


class TestProUserRouting:
    """Verify Pro users get the DeepSeek R1 (reasoner) model."""

    @pytest.mark.asyncio
    async def test_pro_user_gets_deepseek_reasoner_model(self):
        """When use_r1=True, the primary model should be deepseek-reasoner."""
        groq, deepseek, factory, _ = _build_clients()

        with patch.object(app_module, "AsyncOpenAI", factory):
            result, model_name = await app_module.get_completion(
                prompt="explain this code",
                system_instruction="You are a code explainer.",
                mode="explanation",
                use_r1=True,
            )

        deepseek.chat.completions.create.assert_awaited_once()
        call_kwargs = deepseek.chat.completions.create.call_args
        assert call_kwargs.kwargs["model"] == "deepseek-reasoner"
        assert model_name == "DeepSeek R1"

        # Groq should not have been called (no fallback needed)
        groq.chat.completions.create.assert_not_awaited()
