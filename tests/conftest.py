"""
Shared pytest fixtures for Anuvaad test suite.

Provides:
- A FastAPI TestClient with the Gemini SDK monkey-patched
  so no real API calls are made during CI.
- Helpers to seed / clear the in-memory caches and rate store.
"""

import json
import os
import time
from unittest.mock import patch, PropertyMock
import pytest

# ── Ensure env vars are set BEFORE importing main ──
os.environ.setdefault("GEMINI_API_KEY", "test_key_for_ci")
os.environ.setdefault("STRIPE_SECRET_KEY", "")


# ── Fake Gemini response object ──
class _FakeGeminiResponse:
    """Mimics the minimal surface of google.genai response."""
    def __init__(self, text: str):
        self.text = text


class _FakeModels:
    """Replaces client.models so generate_content never hits the network."""

    def __init__(self):
        self._default = json.dumps([
            {
                "id": "block_1",
                "code_snippet": "print('hello')",
                "english_translation": "Prints hello to the console."
            }
        ])

    def generate_content(self, *, model, contents, config=None):
        # If the config asks for text/plain, return raw code (english-to-code)
        if config and getattr(config, "response_mime_type", None) == "text/plain":
            return _FakeGeminiResponse("print('updated')")
        return _FakeGeminiResponse(self._default)


@pytest.fixture()
def client():
    """
    Yield a TestClient whose Gemini SDK is monkey-patched
    so tests run offline and instantly.
    """
    import main as app_module
    from google.genai import Client as GenaiClient

    fake_models = _FakeModels()

    # Clear rate-limiter and cache between tests
    app_module._rate_store.clear()
    app_module._translation_cache._cache.clear()

    # Use unittest.mock.patch to override the read-only 'models' property
    with patch.object(type(app_module.client), 'models', new_callable=PropertyMock, return_value=fake_models):
        from fastapi.testclient import TestClient
        with TestClient(app_module.app) as tc:
            yield tc


@pytest.fixture()
def client_rate_limited():
    """
    Yield a TestClient whose rate store is pre-filled
    to the limit so the next request triggers 429.
    """
    import main as app_module

    fake_models = _FakeModels()

    app_module._rate_store.clear()
    app_module._translation_cache._cache.clear()

    # Pre-fill rate store for testclient's IP
    now = time.time()
    app_module._rate_store["testclient"] = [now] * app_module.RATE_LIMIT_MAX

    with patch.object(type(app_module.client), 'models', new_callable=PropertyMock, return_value=fake_models):
        from fastapi.testclient import TestClient
        with TestClient(app_module.app) as tc:
            yield tc

    app_module._rate_store.clear()
