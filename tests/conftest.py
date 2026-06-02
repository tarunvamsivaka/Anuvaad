"""
Shared pytest fixtures for Anuvaad test suite.

Provides:
- A FastAPI TestClient with the AsyncOpenAI class monkey-patched
  so no real API calls to Groq/DeepSeek are made during CI.
- Helpers to seed / clear the in-memory caches and rate store.
- Auth-mocked clients for testing protected endpoints.
"""

import json
import os
import razorpay
from unittest.mock import patch, MagicMock
import pytest
import httpx

_original_json = httpx.Response.json

def _patched_json(self, **kwargs):
    try:
        return _original_json(self, **kwargs)
    except json.JSONDecodeError:
        if self.text.startswith("data: "):
            lines = self.text.strip().split("\n\n")
            for line in reversed(lines):
                if line.startswith("data: "):
                    try:
                        parsed = json.loads(line[6:])
                        if parsed.get("done"):
                            if "blocks" in parsed:
                                return parsed["blocks"]
                            if "error" in parsed:
                                return {"detail": parsed["error"]}
                    except Exception:
                        pass
        raise

httpx.Response.json = _patched_json

# ── Ensure env vars are set BEFORE importing main ──
os.environ.setdefault("GROQ_API_KEY", "test_key_for_ci")
os.environ.setdefault("DEEPSEEK_API_KEY", "test_key_for_ci")
os.environ.setdefault("RAZORPAY_KEY_ID", "rzp_test_real_key_for_ci")
os.environ.setdefault("RAZORPAY_KEY_SECRET", "test_secret_for_ci")
os.environ["RAZORPAY_WEBHOOK_SECRET"] = "test_webhook_secret_for_ci"

# ── Patch Razorpay Webhook Verification ──

# Create a mock utility with verify methods that do nothing (signifying success)
mock_utility = MagicMock()
mock_utility.verify_webhook_signature.return_value = True
mock_utility.verify_subscription_payment_signature.return_value = True
mock_utility.verify_payment_signature.return_value = True

# Patch Client so that its utility is mocked
original_init = razorpay.Client.__init__
def patched_init(self, *args, **kwargs):
    original_init(self, *args, **kwargs)
    self.utility = mock_utility

razorpay.Client.__init__ = patched_init

# ── Fake AsyncOpenAI classes ──
class MockDelta:
    def __init__(self, content):
        self.content = content

class MockChoiceStreaming:
    def __init__(self, content):
        self.delta = MockDelta(content)

class MockChunk:
    def __init__(self, content):
        self.choices = [MockChoiceStreaming(content)]

class MockMessage:
    def __init__(self, content):
        self.content = content

class MockChoice:
    def __init__(self, content):
        self.message = MockMessage(content)

class MockResponse:
    def __init__(self, content):
        self.choices = [MockChoice(content)]

class MockCompletions:
    def __init__(self, mock_client):
        self.mock_client = mock_client

    async def create(self, **kwargs):
        is_stream = kwargs.get("stream", False)
        fmt = kwargs.get("response_format", {})
        is_json = False
        if isinstance(fmt, dict) and fmt.get("type") == "json_object":
            is_json = True
        elif fmt == "json_object":
            is_json = True

        if self.mock_client.error_mode == "timeout":
            import asyncio
            raise asyncio.TimeoutError()
        elif self.mock_client.error_mode:
            content = "this is not valid json {{{"
        elif self.mock_client.empty_mode:
            content = json.dumps([{"id": "b1", "code_snippet": "", "english_translation": ""}])
        elif self.mock_client.multi_mode:
            if not is_json:
                content = "def add(a, b):\n    return a + b"
            else:
                content = json.dumps([
                    {"id": "block_1", "code_snippet": "def add(a, b):", "english_translation": "Defines a function named add that takes two parameters."},
                    {"id": "block_2", "code_snippet": "    return a + b", "english_translation": "Returns the sum of a and b."}
                ])
        else:
            if not is_json:
                content = "print('updated')"
            else:
                content = json.dumps([{
                    "id": "block_1",
                    "code_snippet": "print('hello')",
                    "english_translation": "Prints hello to the console."
                }])

        if is_stream:
            async def stream_generator():
                yield MockChunk(content)
            return stream_generator()
        else:
            return MockResponse(content)

class MockChat:
    def __init__(self, mock_client):
        self.completions = MockCompletions(mock_client)

class MockAsyncOpenAI:
    error_mode = False
    empty_mode = False
    multi_mode = False

    def __init__(self, *args, **kwargs):
        self.chat = MockChat(self)

class MockAsyncOpenAIError(MockAsyncOpenAI):
    error_mode = True

class MockAsyncOpenAIEmpty(MockAsyncOpenAI):
    empty_mode = True

class MockAsyncOpenAIMulti(MockAsyncOpenAI):
    multi_mode = True


class MockRedisCache:
    def __init__(self, initial_rate_limits=None):
        import main as app_module
        self.fallback = app_module.LRUCache(max_size=500)
        self.client = True
        self._store = {}
        self._rate_limits = initial_rate_limits or {}

    async def get(self, key: str):
        if key in self._store:
            import json
            val = self._store[key]
            if isinstance(val, str):
                return json.loads(val)
            return val
        return None

    async def put(self, key: str, value: any, ttl: int = 86400):
        import json
        self._store[key] = json.dumps(value)

    async def incr_rate_limit(self, key: str, window: int) -> int:
        val = self._rate_limits.get(key, 0)
        val += 1
        self._rate_limits[key] = val
        return val

    async def ping(self):
        return True



@pytest.fixture()
def client():
    """
    Yield a TestClient whose AsyncOpenAI is monkey-patched
    so tests run offline and instantly.
    """
    import main as app_module

    fake_redis = MockRedisCache()

    with patch.object(app_module, 'cache', fake_redis):
        with patch.object(app_module, 'AsyncOpenAI', MockAsyncOpenAI):
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc


@pytest.fixture()
def client_rate_limited():
    import main as app_module

    fake_redis_async = MockRedisCache({"rate_limit:testclient": app_module.RATE_LIMIT_MAX})

    with patch.object(app_module, 'cache', fake_redis_async):
        with patch.object(app_module, 'AsyncOpenAI', MockAsyncOpenAI):
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc


@pytest.fixture()
def client_multi_block():
    import main as app_module

    fake_redis = MockRedisCache()

    with patch.object(app_module, 'cache', fake_redis):
        with patch.object(app_module, 'AsyncOpenAI', MockAsyncOpenAIMulti):
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc


@pytest.fixture()
def client_ai_error():
    import main as app_module

    fake_redis = MockRedisCache()

    with patch.object(app_module, 'cache', fake_redis):
        with patch.object(app_module, 'AsyncOpenAI', MockAsyncOpenAIError):
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc


@pytest.fixture()
def client_empty_blocks():
    import main as app_module

    fake_redis = MockRedisCache()

    with patch.object(app_module, 'cache', fake_redis):
        with patch.object(app_module, 'AsyncOpenAI', MockAsyncOpenAIEmpty):
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc


@pytest.fixture()
def client_no_redis():
    import main as app_module

    fake_redis = MockRedisCache()
    fake_redis.client = None

    with patch.object(app_module, 'cache', fake_redis):
        with patch.object(app_module, 'AsyncOpenAI', MockAsyncOpenAI):
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc


@pytest.fixture()
def client_with_auth():
    import main as app_module

    fake_redis = MockRedisCache()

    async def fake_get_user_email(*args, **kwargs):
        return "testuser@example.com"

    with patch.object(app_module, 'cache', fake_redis):
        with patch.object(app_module, 'AsyncOpenAI', MockAsyncOpenAI):
            app_module.app.dependency_overrides[app_module.get_user_email] = fake_get_user_email
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc
            app_module.app.dependency_overrides.pop(app_module.get_user_email, None)


@pytest.fixture()
def client_no_auth():
    import main as app_module

    fake_redis = MockRedisCache()

    async def fake_get_user_email_none(*args, **kwargs):
        return None

    with patch.object(app_module, 'cache', fake_redis):
        with patch.object(app_module, 'AsyncOpenAI', MockAsyncOpenAI):
            app_module.app.dependency_overrides[app_module.get_user_email] = fake_get_user_email_none
            from fastapi.testclient import TestClient
            with TestClient(app_module.app) as tc:
                yield tc
            app_module.app.dependency_overrides.pop(app_module.get_user_email, None)

@pytest.fixture()
def mock_openai_clients(monkeypatch):
    from unittest.mock import AsyncMock, MagicMock
    import main as app_module
    
    groq_mock = MagicMock()
    groq_mock.chat.completions.create = AsyncMock()
    
    deepseek_mock = MagicMock()
    deepseek_mock.chat.completions.create = AsyncMock()
    
    def fake_async_openai(*args, **kwargs):
        base_url = kwargs.get("base_url", "")
        if "groq.com" in base_url:
            return groq_mock
        elif "deepseek.com" in base_url:
            return deepseek_mock
        return MagicMock()
        
    monkeypatch.setattr(app_module, "AsyncOpenAI", fake_async_openai)
    return {"groq": groq_mock, "deepseek": deepseek_mock}
