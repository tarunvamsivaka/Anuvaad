"""
Tests for the get_completion() AI router in ai.py.

Verifies model selection based on use_r1.
"""

import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.services.ai as ai_module


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


def _ok_response(
    content: str = '[{"id":"b1","code_snippet":"x","english_translation":"desc"}]',
):
    """Return a FakeResponse."""
    return FakeResponse(content)


def _build_clients():
    """Create independent mock client for Groq."""
    groq_mock = MagicMock()
    groq_mock.chat.completions.create = AsyncMock(return_value=_ok_response())
    return groq_mock


class TestModelRouting:
    """Verify the router picks the correct primary model for each mode."""

    @pytest.mark.asyncio
    async def test_groq_default(self):
        """By default, Groq (llama-3.3-70b-versatile) should be used."""
        groq = _build_clients()

        with patch.object(ai_module, "_groq_client", groq):
            result, model_name = await ai_module.get_completion(
                prompt="explain this code",
                system_instruction="You are a code explainer.",
                mode="explanation",
            )

        # Groq should have been called
        groq.chat.completions.create.assert_awaited_once()
        call_kwargs = groq.chat.completions.create.call_args
        assert call_kwargs.kwargs["model"] == "llama-3.3-70b-versatile"
        assert model_name == "Groq Llama 3.3"

    @pytest.mark.asyncio
    async def test_groq_r1_distill(self):
        """When use_r1=True, deepseek-r1-distill-llama-70b should be used."""
        groq = _build_clients()

        with patch.object(ai_module, "_groq_client", groq):
            result, model_name = await ai_module.get_completion(
                prompt="explain this code",
                system_instruction="You are a code explainer.",
                mode="explanation",
                use_r1=True,
            )

        groq.chat.completions.create.assert_awaited_once()
        call_kwargs = groq.chat.completions.create.call_args
        assert call_kwargs.kwargs["model"] == "deepseek-r1-distill-llama-70b"
        assert model_name == "Groq DeepSeek R1"
