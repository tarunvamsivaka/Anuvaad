"""
Shared pytest fixtures for Anuvaad test suite.

Provides:
- A FastAPI TestClient with the Gemini SDK monkey-patched
  so no real API calls are made during CI.
- Helpers to seed / clear the in-memory caches and rate store.
- Auth-mocked clients for testing protected endpoints.
"""

import json
import os
import time
from unittest.mock import patch, PropertyMock, AsyncMock, MagicMock
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


class _FakeModelsMultiBlock:
    """Returns multi-block response for testing multi-block normalization."""

    def __init__(self):
        self._default = json.dumps([
            {
                "id": "block_1",
                "code_snippet": "def add(a, b):",
                "english_translation": "Defines a function named add that takes two parameters."
            },
            {
                "id": "block_2",
                "code_snippet": "    return a + b",
                "english_translation": "Returns the sum of a and b."
            }
        ])

    def generate_content(self, *, model, contents, config=None):
        if config and getattr(config, "response_mime_type", None) == "text/plain":
            return _FakeGeminiResponse("def add(a, b):\n    return a + b")
        return _FakeGeminiResponse(self._default)


class _FakeModelsError:
    """Returns invalid JSON to test error handling."""

    def generate_content(self, *, model, contents, config=None):
        return _FakeGeminiResponse("this is not valid json {{{")


class _FakeModelsEmptyBlocks:
    """Returns response with no usable blocks."""

    def generate_content(self, *, model, contents, config=None):
        return _FakeGeminiResponse(json.dumps([
            {"id": "b1", "code_snippet": "", "english_translation": ""}
        ]))


class _FakeModelsTimeout:
    """Simulates a timeout by raising asyncio.TimeoutError."""
    import asyncio

    def generate_content(self, *, model, contents, config=None):
        import time
        time.sleep(999)  # This will never complete; the timeout wrapper catches it


@pytest.fixture()
def client():
    """
    Yield a TestClient whose Gemini SDK is monkey-patched
    so tests run offline and instantly.
    """
    import main as app_module
    from google.genai import Client as GenaiClient
    import fakeredis

    fake_models = _FakeModels()

    # Clear fake redis before each test
    fake_redis = fakeredis.FakeAsyncRedis()

    with patch.object(app_module, 'redis_client', fake_redis):
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
    import fakeredis

    fake_models = _FakeModels()

    # Create a shared fakeredis server so sync setup + async usage share state
    server = fakeredis.FakeServer()
    fake_redis_sync = fakeredis.FakeRedis(server=server)
    fake_redis_sync.set("rate_limit:testclient", str(app_module.RATE_LIMIT_MAX))

    fake_redis_async = fakeredis.FakeAsyncRedis(server=server, decode_responses=True)

    with patch.object(app_module, 'redis_client', fake_redis_async):
        with patch.object(type(app_module.client), 'models', new_callable=PropertyMock, return_value=fake_models):
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc


@pytest.fixture()
def client_multi_block():
    """Client that returns multi-block Gemini responses."""
    import main as app_module
    import fakeredis

    fake_models = _FakeModelsMultiBlock()
    fake_redis = fakeredis.FakeAsyncRedis()

    with patch.object(app_module, 'redis_client', fake_redis):
        with patch.object(type(app_module.client), 'models', new_callable=PropertyMock, return_value=fake_models):
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc


@pytest.fixture()
def client_gemini_error():
    """Client that simulates Gemini returning invalid JSON."""
    import main as app_module
    import fakeredis

    fake_models = _FakeModelsError()
    fake_redis = fakeredis.FakeAsyncRedis()

    with patch.object(app_module, 'redis_client', fake_redis):
        with patch.object(type(app_module.client), 'models', new_callable=PropertyMock, return_value=fake_models):
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc


@pytest.fixture()
def client_empty_blocks():
    """Client that simulates Gemini returning empty blocks."""
    import main as app_module
    import fakeredis

    fake_models = _FakeModelsEmptyBlocks()
    fake_redis = fakeredis.FakeAsyncRedis()

    with patch.object(app_module, 'redis_client', fake_redis):
        with patch.object(type(app_module.client), 'models', new_callable=PropertyMock, return_value=fake_models):
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc


@pytest.fixture()
def client_no_redis():
    """Client with redis_client set to None (simulates Redis down)."""
    import main as app_module

    fake_models = _FakeModels()

    with patch.object(app_module, 'redis_client', None):
        with patch.object(type(app_module.client), 'models', new_callable=PropertyMock, return_value=fake_models):
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc


@pytest.fixture()
def client_with_auth():
    """
    Client with get_user_email patched to return a test email.
    Useful for testing workspace and other auth-protected endpoints.
    """
    import main as app_module
    import fakeredis

    fake_models = _FakeModels()
    fake_redis = fakeredis.FakeAsyncRedis()

    async def fake_get_user_email(*args, **kwargs):
        return "testuser@example.com"

    with patch.object(app_module, 'redis_client', fake_redis):
        with patch.object(type(app_module.client), 'models', new_callable=PropertyMock, return_value=fake_models):
            app_module.app.dependency_overrides[app_module.get_user_email] = fake_get_user_email
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc
            app_module.app.dependency_overrides.pop(app_module.get_user_email, None)


@pytest.fixture()
def client_no_auth():
    """
    Client with get_user_email patched to return None (unauthenticated).
    Useful for testing that protected endpoints reject unauthenticated requests.
    """
    import main as app_module
    import fakeredis

    fake_models = _FakeModels()
    fake_redis = fakeredis.FakeAsyncRedis()

    async def fake_get_user_email_none(*args, **kwargs):
        return None

    with patch.object(app_module, 'redis_client', fake_redis):
        with patch.object(type(app_module.client), 'models', new_callable=PropertyMock, return_value=fake_models):
            app_module.app.dependency_overrides[app_module.get_user_email] = fake_get_user_email_none
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc
            app_module.app.dependency_overrides.pop(app_module.get_user_email, None)

