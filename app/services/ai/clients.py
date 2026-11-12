"""
app/services/ai/clients.py — LLM client singletons and lifecycle management.
"""

from __future__ import annotations

import os
import sys

from openai import AsyncOpenAI

from app.core.config import FRONTEND_URL, logger

_cerebras_client: AsyncOpenAI | None = None
_gemini_client: AsyncOpenAI | None = None
_deepseek_client: AsyncOpenAI | None = None
_groq_client: AsyncOpenAI | None = None
_openrouter_client: AsyncOpenAI | None = None


def init_clients(groq_key: str) -> None:
    """Initialize module-level LLM client singletons. Call from app lifespan."""
    global _cerebras_client, _gemini_client, _deepseek_client, _groq_client, _openrouter_client

    from app.core.config import (
        CEREBRAS_API_KEY,
        DEEPSEEK_API_KEY,
        GEMINI_API_KEY,
        GROQ_API_KEY,
        OPENROUTER_API_KEY,
    )

    def _create_client(key: str, base_url: str, headers: dict | None = None) -> AsyncOpenAI:
        return AsyncOpenAI(api_key=key, base_url=base_url, default_headers=headers or {})

    # Tier 1: Cerebras
    if CEREBRAS_API_KEY:
        _cerebras_client = _create_client(CEREBRAS_API_KEY, "https://api.cerebras.ai/v1")

    # Tier 2: Gemini
    if GEMINI_API_KEY:
        _gemini_client = _create_client(GEMINI_API_KEY, "https://generativelanguage.googleapis.com/v1beta/openai/")

    # Tier 3: DeepSeek
    if DEEPSEEK_API_KEY:
        _deepseek_client = _create_client(DEEPSEEK_API_KEY, "https://api.deepseek.com")

    # Supplementary: Groq
    if groq_key or GROQ_API_KEY:
        _groq_client = _create_client(groq_key or GROQ_API_KEY, "https://api.groq.com/openai/v1")

    # Tier 4: OpenRouter
    if OPENROUTER_API_KEY:
        _openrouter_client = _create_client(
            OPENROUTER_API_KEY,
            "https://openrouter.ai/api/v1",
            headers={"HTTP-Referer": FRONTEND_URL, "X-Title": "Anuvaad"},
        )

    # Sync package-level attributes in app.services.ai if imported
    ai_pkg = sys.modules.get("app.services.ai")
    if ai_pkg:
        ai_pkg._cerebras_client = _cerebras_client
        ai_pkg._gemini_client = _gemini_client
        ai_pkg._deepseek_client = _deepseek_client
        ai_pkg._groq_client = _groq_client
        ai_pkg._openrouter_client = _openrouter_client

    logger.info(
        f"LLM clients initialized: "
        f"{'Cerebras ' if _cerebras_client else ''}"
        f"{'Gemini ' if _gemini_client else ''}"
        f"{'DeepSeek ' if _deepseek_client else ''}"
        f"{'Groq ' if _groq_client else ''}"
        f"{'OpenRouter' if _openrouter_client else ''}"
    )


async def close_clients() -> None:
    """Gracefully close all LLM clients. Call from app lifespan shutdown."""
    global _cerebras_client, _gemini_client, _deepseek_client, _groq_client, _openrouter_client
    for client_name, client in [
        ("_cerebras_client", _cerebras_client),
        ("_gemini_client", _gemini_client),
        ("_deepseek_client", _deepseek_client),
        ("_groq_client", _groq_client),
        ("_openrouter_client", _openrouter_client),
    ]:
        if client:
            try:
                await client.close()
            except Exception as e:
                logger.warning(f"Error closing {client_name}: {e}")

    _cerebras_client = _gemini_client = _deepseek_client = _groq_client = _openrouter_client = None
    ai_pkg = sys.modules.get("app.services.ai")
    if ai_pkg:
        ai_pkg._cerebras_client = ai_pkg._gemini_client = ai_pkg._deepseek_client = ai_pkg._groq_client = (
            ai_pkg._openrouter_client
        ) = None
    logger.info("LLM client singletons closed")


def _get_cerebras_client() -> AsyncOpenAI | None:
    ai_pkg = sys.modules.get("app.services.ai")
    if ai_pkg and hasattr(ai_pkg, "_cerebras_client") and ai_pkg._cerebras_client is not None:
        return ai_pkg._cerebras_client
    return _cerebras_client


def _get_gemini_client() -> AsyncOpenAI | None:
    ai_pkg = sys.modules.get("app.services.ai")
    if ai_pkg and hasattr(ai_pkg, "_gemini_client") and ai_pkg._gemini_client is not None:
        return ai_pkg._gemini_client
    return _gemini_client


def _get_deepseek_client() -> AsyncOpenAI | None:
    ai_pkg = sys.modules.get("app.services.ai")
    if ai_pkg and hasattr(ai_pkg, "_deepseek_client") and ai_pkg._deepseek_client is not None:
        return ai_pkg._deepseek_client
    return _deepseek_client


def _get_groq_client() -> AsyncOpenAI:
    ai_pkg = sys.modules.get("app.services.ai")
    if ai_pkg and hasattr(ai_pkg, "_groq_client") and ai_pkg._groq_client is not None:
        return ai_pkg._groq_client
    if _groq_client is not None:
        return _groq_client
    key = os.getenv("GROQ_API_KEY", "")
    return AsyncOpenAI(api_key=key, base_url="https://api.groq.com/openai/v1")


def _get_openrouter_client() -> AsyncOpenAI | None:
    ai_pkg = sys.modules.get("app.services.ai")
    if ai_pkg and hasattr(ai_pkg, "_openrouter_client") and ai_pkg._openrouter_client is not None:
        return ai_pkg._openrouter_client
    return _openrouter_client
