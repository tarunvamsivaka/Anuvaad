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
os.environ.setdefault("RAZORPAY_KEY_ID", "rzp_test_real_key_for_ci")
os.environ.setdefault("RAZORPAY_KEY_SECRET", "test_secret_for_ci")
os.environ["RAZORPAY_WEBHOOK_SECRET"] = "test_webhook_secret_for_ci"
os.environ["ADMIN_USERS"] = "admin@anuvaad.dev"
os.environ["TRUSTED_USERS"] = "trusted@anuvaad.dev"
os.environ["LIMIT_FREE_COOLDOWN"] = "0"
os.environ.setdefault("RATE_LIMIT_IP_MAX", "15")
# BACK-01: Signal test mode via env var (replaces sys.modules inspection in quota.py)
os.environ["TESTING"] = "true"

import app.core.cache as cache_module  # noqa: E402

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
        model = kwargs.get("model", "")
        if isinstance(fmt, dict) and fmt.get("type") == "json_object":
            is_json = True
        elif fmt == "json_object":
            is_json = True
        elif "deepseek" in model or "reasoner" in model:
            is_json = True

        if self.mock_client.error_mode == "timeout":
            import asyncio

            raise asyncio.TimeoutError()
        elif self.mock_client.error_mode:
            content = "this is not valid json {{{"
        elif self.mock_client.empty_mode:
            content = json.dumps(
                [{"id": "b1", "code_snippet": "", "english_translation": ""}]
            )
        elif self.mock_client.multi_mode:
            if not is_json:
                content = "def add(a, b):\n    return a + b"
            else:
                content = json.dumps(
                    [
                        {
                            "id": "block_1",
                            "code_snippet": "def add(a, b):",
                            "english_translation": "Defines a function named add that takes two parameters.",
                        },
                        {
                            "id": "block_2",
                            "code_snippet": "    return a + b",
                            "english_translation": "Returns the sum of a and b.",
                        },
                    ]
                )
        else:
            if not is_json:
                content = "print('updated')"
            else:
                content = json.dumps(
                    [
                        {
                            "id": "block_1",
                            "code_snippet": "print('hello')",
                            "english_translation": "Prints hello to the console.",
                        }
                    ]
                )

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

    async def close(self):
        """No-op close for test compatibility with lifespan teardown."""
        pass


class MockAsyncOpenAIError(MockAsyncOpenAI):
    error_mode = True


class MockAsyncOpenAIEmpty(MockAsyncOpenAI):
    empty_mode = True


class MockAsyncOpenAIMulti(MockAsyncOpenAI):
    multi_mode = True


class MockRedisCache:
    def __init__(self, initial_rate_limits=None):
        from app.core.cache import LRUCache

        self.fallback = LRUCache(max_size=500)
        self.client = True
        self._store = {}
        self._rate_limits = initial_rate_limits or {}

    async def get(self, key: str):
        if key in self._store:
            import json

            val = self._store[key]
            if isinstance(val, str):
                try:
                    return json.loads(val)
                except json.JSONDecodeError:
                    return val
            return val
        return None

    async def put(self, key: str, value: any, ttl: int = 86400):
        import json

        self._store[key] = json.dumps(value)

    async def delete(self, key: str):
        self._store.pop(key, None)

    async def delete_prefix(self, prefix: str):
        keys_to_del = [k for k in self._store if k.startswith(prefix)]
        for k in keys_to_del:
            del self._store[k]

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
    Yield a TestClient whose LLM clients are monkey-patched via the
    ai module singleton accessors so tests run offline and instantly.
    """
    import main as app_module
    import app.services.ai as ai_module

    fake_redis = MockRedisCache()
    mock_groq = MockAsyncOpenAI()

    async def fake_get_user_email():
        return "testuser@example.com"

    async def fake_get_user_pro_status(email):
        return False

    # Patch init_clients so the lifespan installs our mocks instead of real clients
    def fake_init_clients(groq_key):
        ai_module._groq_client = mock_groq

    with patch.object(app_module, "cache", fake_redis), \
         patch.object(cache_module, "cache_override", fake_redis), \
         patch.object(ai_module, "init_clients", fake_init_clients), \
         patch("app.core.auth.get_user_pro_status", new=fake_get_user_pro_status):
        app_module.app.dependency_overrides[app_module.get_user_email] = (
            fake_get_user_email
        )
        from fastapi.testclient import TestClient

        with TestClient(app_module.app) as tc:
            yield tc
        app_module.app.dependency_overrides.pop(app_module.get_user_email, None)


@pytest.fixture()
def client_rate_limited():
    import main as app_module
    import app.services.ai as ai_module

    fake_redis_async = MockRedisCache(
        {"rate_limit:testclient": app_module.RATE_LIMIT_MAX}
    )
    mock_groq = MockAsyncOpenAI()

    async def fake_get_user_email():
        return "testuser@example.com"

    async def fake_get_user_pro_status(email):
        return False

    def fake_init_clients(groq_key):
        ai_module._groq_client = mock_groq

    with patch.object(app_module, "cache", fake_redis_async), \
         patch.object(cache_module, "cache_override", fake_redis_async), \
         patch.object(ai_module, "init_clients", fake_init_clients), \
         patch("app.core.auth.get_user_pro_status", new=fake_get_user_pro_status):
        app_module.app.dependency_overrides[app_module.get_user_email] = (
            fake_get_user_email
        )
        from fastapi.testclient import TestClient

        with TestClient(app_module.app) as tc:
            yield tc
        app_module.app.dependency_overrides.pop(app_module.get_user_email, None)


@pytest.fixture()
def client_multi_block():
    import main as app_module
    import app.services.ai as ai_module

    fake_redis = MockRedisCache()
    mock_groq = MockAsyncOpenAIMulti()

    async def fake_get_user_email():
        return "testuser@example.com"

    async def fake_get_user_pro_status(email):
        return False

    def fake_init_clients(groq_key):
        ai_module._groq_client = mock_groq

    with patch.object(app_module, "cache", fake_redis), \
         patch.object(cache_module, "cache_override", fake_redis), \
         patch.object(ai_module, "init_clients", fake_init_clients), \
         patch("app.core.auth.get_user_pro_status", new=fake_get_user_pro_status):
        app_module.app.dependency_overrides[app_module.get_user_email] = (
            fake_get_user_email
        )
        from fastapi.testclient import TestClient

        with TestClient(app_module.app) as tc:
            yield tc
        app_module.app.dependency_overrides.pop(app_module.get_user_email, None)


@pytest.fixture()
def client_ai_error():
    import main as app_module
    import app.services.ai as ai_module

    fake_redis = MockRedisCache()
    mock_groq = MockAsyncOpenAIError()

    async def fake_get_user_email():
        return "testuser@example.com"

    async def fake_get_user_pro_status(email):
        return False

    def fake_init_clients(groq_key):
        ai_module._groq_client = mock_groq

    with patch.object(app_module, "cache", fake_redis), \
         patch.object(cache_module, "cache_override", fake_redis), \
         patch.object(ai_module, "init_clients", fake_init_clients), \
         patch("app.core.auth.get_user_pro_status", new=fake_get_user_pro_status):
        app_module.app.dependency_overrides[app_module.get_user_email] = (
            fake_get_user_email
        )
        from fastapi.testclient import TestClient

        with TestClient(app_module.app) as tc:
            yield tc
        app_module.app.dependency_overrides.pop(app_module.get_user_email, None)


@pytest.fixture()
def client_empty_blocks():
    import main as app_module
    import app.services.ai as ai_module

    fake_redis = MockRedisCache()
    mock_groq = MockAsyncOpenAIEmpty()

    async def fake_get_user_email():
        return "testuser@example.com"

    async def fake_get_user_pro_status(email):
        return False

    def fake_init_clients(groq_key):
        ai_module._groq_client = mock_groq

    with patch.object(app_module, "cache", fake_redis), \
         patch.object(cache_module, "cache_override", fake_redis), \
         patch.object(ai_module, "init_clients", fake_init_clients), \
         patch("app.core.auth.get_user_pro_status", new=fake_get_user_pro_status):
        app_module.app.dependency_overrides[app_module.get_user_email] = (
            fake_get_user_email
        )
        from fastapi.testclient import TestClient

        with TestClient(app_module.app) as tc:
            yield tc
        app_module.app.dependency_overrides.pop(app_module.get_user_email, None)


@pytest.fixture()
def client_no_redis():
    import main as app_module
    import app.services.ai as ai_module

    fake_redis = MockRedisCache()
    fake_redis.client = None
    mock_groq = MockAsyncOpenAI()

    async def fake_get_user_email():
        return "testuser@example.com"

    async def fake_get_user_pro_status(email):
        return False

    def fake_init_clients(groq_key):
        ai_module._groq_client = mock_groq

    with patch.object(app_module, "cache", fake_redis), \
         patch.object(cache_module, "cache_override", fake_redis), \
         patch.object(ai_module, "init_clients", fake_init_clients), \
         patch("app.core.auth.get_user_pro_status", new=fake_get_user_pro_status):
        app_module.app.dependency_overrides[app_module.get_user_email] = (
            fake_get_user_email
        )
        from fastapi.testclient import TestClient

        with TestClient(app_module.app) as tc:
            yield tc
        app_module.app.dependency_overrides.pop(app_module.get_user_email, None)


@pytest.fixture()
def client_with_auth():
    import main as app_module
    import app.services.ai as ai_module

    fake_redis = MockRedisCache()
    mock_groq = MockAsyncOpenAI()

    async def fake_get_user_email():
        return "testuser@example.com"

    async def fake_get_user_pro_status(email):
        return False

    def fake_init_clients(groq_key):
        ai_module._groq_client = mock_groq

    with patch.object(app_module, "cache", fake_redis), \
         patch.object(cache_module, "cache_override", fake_redis), \
         patch.object(ai_module, "init_clients", fake_init_clients), \
         patch("app.core.auth.get_user_pro_status", new=fake_get_user_pro_status):
        app_module.app.dependency_overrides[app_module.get_user_email] = (
            fake_get_user_email
        )
        from fastapi.testclient import TestClient

        with TestClient(app_module.app) as tc:
            yield tc
        app_module.app.dependency_overrides.pop(app_module.get_user_email, None)


@pytest.fixture()
def client_no_auth():
    import main as app_module
    import app.services.ai as ai_module

    fake_redis = MockRedisCache()
    mock_groq = MockAsyncOpenAI()

    async def fake_get_user_email_none():
        return None

    async def fake_get_user_pro_status(email):
        return False

    def fake_init_clients(groq_key):
        ai_module._groq_client = mock_groq

    with patch.object(app_module, "cache", fake_redis), \
         patch.object(cache_module, "cache_override", fake_redis), \
         patch.object(ai_module, "init_clients", fake_init_clients), \
         patch("app.core.auth.get_user_pro_status", new=fake_get_user_pro_status):
        app_module.app.dependency_overrides[app_module.get_user_email] = (
            fake_get_user_email_none
        )
        from fastapi.testclient import TestClient

        with TestClient(app_module.app) as tc:
            yield tc
        app_module.app.dependency_overrides.pop(app_module.get_user_email, None)


@pytest.fixture()
def mock_openai_clients(monkeypatch):
    import app.services.ai as ai_module

    groq_mock = MockAsyncOpenAI()

    monkeypatch.setattr(ai_module, "_groq_client", groq_mock)
    return {"groq": groq_mock}


@pytest.fixture(autouse=True)
def mock_supabase_and_quota(monkeypatch):
    from unittest.mock import AsyncMock
    import app.core.database as db_module
    import app.core.quota as quota_module

    m1 = AsyncMock(return_value=0)
    m2 = AsyncMock(return_value=0)
    m3 = AsyncMock(return_value=True)
    m6 = AsyncMock(return_value={})
    m7 = AsyncMock(return_value=[])

    monkeypatch.setattr(quota_module, "get_today_usage_count", m1)
    monkeypatch.setattr(db_module, "supabase_request", m6)
    monkeypatch.setattr(db_module, "supabase_request_list", m7)

    with patch("app.core.quota.get_user_credits", m2), \
         patch("app.core.quota.deduct_credit", m3):
        yield


@pytest.fixture(autouse=True)
def mock_celery_tasks():
    """Prevent Celery tasks from connecting to Redis broker during tests.

    All task dispatch calls (.delay, .apply_async) are replaced with no-ops
    so tests run without a live Redis instance. This fixes CI failures on all
    Python versions where Redis is not provisioned.
    """
    try:
        import app.queue.tasks as tasks_module
    except ImportError:
        yield
        return

    _task_names = [
        "save_translation_history_task",
        "send_transactional_email_task",
        "process_billing_webhook_task",
        "prune_translation_history_task",
        "process_large_file_task",
        "process_github_repo_task",
    ]

    active_patches = []
    for name in _task_names:
        task = getattr(tasks_module, name, None)
        if task is None:
            continue
        p_delay = patch.object(task, "delay", MagicMock(return_value=None))
        p_async = patch.object(task, "apply_async", MagicMock(return_value=None))
        p_delay.start()
        p_async.start()
        active_patches.extend([p_delay, p_async])

    yield

    for p in active_patches:
        p.stop()

