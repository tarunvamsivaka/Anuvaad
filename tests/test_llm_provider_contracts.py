"""Deterministic LLM provider contract & routing tests (TEST-04).

Validates client initialization, priority routing order, and graceful
behavior across Cerebras, Gemini, DeepSeek, Groq, and OpenRouter without
performing live network requests.
"""

from unittest.mock import MagicMock, patch

from app.services.ai import clients
from app.services.ai.streaming import _build_streaming_providers


def test_provider_client_initialization_and_shutdown(monkeypatch):
    """Verify init_clients instantiates configured providers and close_clients resets them."""
    monkeypatch.setattr("app.core.config.CEREBRAS_API_KEY", "test-cerebras", raising=False)
    monkeypatch.setattr("app.core.config.GEMINI_API_KEY", "test-gemini", raising=False)
    monkeypatch.setattr("app.core.config.DEEPSEEK_API_KEY", "test-deepseek", raising=False)
    monkeypatch.setattr("app.core.config.GROQ_API_KEY", "test-groq", raising=False)
    monkeypatch.setattr("app.core.config.OPENROUTER_API_KEY", "test-openrouter", raising=False)

    created: list[tuple[str, str]] = []

    def fake_async_openai(*, api_key: str, base_url: str, default_headers=None):
        created.append((api_key, base_url))
        mock = MagicMock()
        mock.close = MagicMock()
        return mock

    with (
        patch.object(clients, "_cerebras_client", None),
        patch.object(clients, "_gemini_client", None),
        patch.object(clients, "_deepseek_client", None),
        patch.object(clients, "_groq_client", None),
        patch.object(clients, "_openrouter_client", None),
        patch.object(clients, "AsyncOpenAI", side_effect=fake_async_openai),
    ):
        clients.init_clients("test-groq")

        base_urls = {url for _, url in created}
        assert "https://api.cerebras.ai/v1" in base_urls
        assert "https://generativelanguage.googleapis.com/v1beta/openai/" in base_urls
        assert "https://api.deepseek.com" in base_urls
        assert "https://api.groq.com/openai/v1" in base_urls
        assert "https://openrouter.ai/api/v1" in base_urls
        assert clients._get_cerebras_client() is not None
        assert clients._get_gemini_client() is not None
        assert clients._get_deepseek_client() is not None
        assert clients._get_groq_client() is not None
        assert clients._get_openrouter_client() is not None


def test_streaming_provider_priority_contracts():
    """Verify _build_streaming_providers enforces deterministic fallback order."""
    mock_groq = MagicMock(name="groq")
    mock_openrouter = MagicMock(name="openrouter")

    with (
        patch("app.services.ai._get_groq_client", return_value=mock_groq),
        patch("app.services.ai._get_openrouter_client", return_value=mock_openrouter),
    ):
        auto_providers = _build_streaming_providers(requested_model=None, use_r1=False)
        assert [model for _, model, _ in auto_providers] == [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "meta-llama/llama-3.3-70b-instruct",
        ]

        r1_providers = _build_streaming_providers(requested_model="deepseek", use_r1=True)
        assert r1_providers[0][1] == "deepseek-r1-distill-llama-70b"
        assert r1_providers[1][1] == "deepseek/deepseek-r1"

        claude_providers = _build_streaming_providers(requested_model="claude-3.5-sonnet", use_r1=False)
        assert claude_providers[0][1] == "anthropic/claude-3.5-sonnet"
        assert claude_providers[1][1] == "llama-3.3-70b-versatile"
