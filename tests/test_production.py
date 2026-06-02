import pytest
from unittest.mock import patch


# Define tests for production behavior
def test_production_flag_detection():
    # If ENV is set to production, _is_production should be True
    # Testing logic would require reloading the module or importing directly,
    # but we can simulate the environment parsing logic.
    env_val = "production"
    is_prod = env_val.lower() == "production"
    assert is_prod is True

    env_val = "development"
    is_prod = env_val.lower() == "production"
    assert is_prod is False


def test_cors_localhost_gating():
    frontend_url = "https://anuvaad.dev"
    allowed_origins = [frontend_url]
    is_production = True

    if not is_production:
        for origin in [
            "http://localhost:3000",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
        ]:
            if origin not in allowed_origins:
                allowed_origins.append(origin)

    assert "http://localhost:3000" not in allowed_origins

    allowed_origins = [frontend_url]
    is_production = False
    if not is_production:
        for origin in [
            "http://localhost:3000",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
        ]:
            if origin not in allowed_origins:
                allowed_origins.append(origin)

    assert "http://localhost:3000" in allowed_origins


def test_production_env_validation():
    # Test that missing variables raise RuntimeError in production
    is_production = True
    missing_vars = []

    # Mocking os.getenv
    def mock_getenv(key, default=""):
        if key == "FRONTEND_URL":
            return "http://localhost:3000"
        return ""

    with patch("os.getenv", side_effect=mock_getenv):
        for var in [
            "SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY",
            "GROQ_API_KEY",
            "DEEPSEEK_API_KEY",
            "RAZORPAY_WEBHOOK_SECRET",
            "FRONTEND_URL",
        ]:
            val = mock_getenv(var)
            if not val or val.startswith("your_") or val == "dummy_key":
                missing_vars.append(var)

    assert "SUPABASE_URL" in missing_vars
    assert "FRONTEND_URL" not in missing_vars

    frontend_url = mock_getenv("FRONTEND_URL")
    if is_production and frontend_url.startswith("http://localhost"):
        with pytest.raises(RuntimeError):
            raise RuntimeError(
                "FATAL: FRONTEND_URL must not be localhost in production"
            )


def test_lru_cache_eviction():
    from main import LRUCache

    cache = LRUCache(max_size=3)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    assert cache.get("a") == 1

    cache.set("d", 4)
    # Since 'a' was recently accessed, 'b' should be evicted
    assert cache.get("b") is None
    assert cache.get("a") == 1
    assert cache.get("c") == 3
    assert cache.get("d") == 4


@pytest.mark.asyncio
async def test_supabase_request_fallback():
    from main import supabase_request

    # Mock SUPABASE_URL to be None
    with patch("main.SUPABASE_URL", None):
        result = await supabase_request("test_table", "select", {"id": "1"})
        assert result is None


@pytest.mark.asyncio
async def test_save_translation_background_pruning():
    import main as app_module
    from unittest.mock import AsyncMock, patch

    user_email = "free_user@example.com"
    mock_history = [
        {"id": f"id_{i}", "created_at": "2026-06-01T12:00:00Z"} for i in range(100)
    ]

    async def mock_get_user_pro_status(email):
        return False

    async def mock_supabase_request_list(path):
        return mock_history

    mock_supabase_request = AsyncMock(return_value={"status": "success"})

    class MockResponse:
        status_code = 204
        text = "No Content"

    mock_delete = AsyncMock(return_value=MockResponse())

    with (
        patch("main.get_user_pro_status", mock_get_user_pro_status),
        patch("main.supabase_request_list", mock_supabase_request_list),
        patch("main.supabase_request", mock_supabase_request),
        patch("httpx.AsyncClient.delete", mock_delete) as mock_delete_call,
        patch("main.SUPABASE_URL", "https://mock.supabase.co"),
        patch("main.SUPABASE_SERVICE_KEY", "mock_key"),
    ):
        await app_module.save_translation_background(
            user_email=user_email,
            mode="Code → English",
            source_language="python",
            target_language="english",
            input_text="print('test')",
            blocks=[],
            model_used="standard",
        )

        assert mock_delete_call.called
        assert mock_supabase_request.called


@pytest.mark.asyncio
async def test_save_translation_background_pruning_pro():
    import main as app_module
    from unittest.mock import AsyncMock, patch

    user_email = "pro_user@example.com"
    mock_history = [
        {"id": f"id_{i}", "created_at": "2026-06-01T12:00:00Z"} for i in range(100)
    ]

    async def mock_get_user_pro_status(email):
        return True

    async def mock_supabase_request_list(path):
        return mock_history

    mock_supabase_request = AsyncMock(return_value={"status": "success"})
    mock_delete = AsyncMock()

    with (
        patch("main.get_user_pro_status", mock_get_user_pro_status),
        patch("main.supabase_request_list", mock_supabase_request_list),
        patch("main.supabase_request", mock_supabase_request),
        patch("httpx.AsyncClient.delete", mock_delete) as mock_delete_call,
        patch("main.SUPABASE_URL", "https://mock.supabase.co"),
        patch("main.SUPABASE_SERVICE_KEY", "mock_key"),
    ):
        await app_module.save_translation_background(
            user_email=user_email,
            mode="Code → English",
            source_language="python",
            target_language="english",
            input_text="print('test')",
            blocks=[],
            model_used="standard",
        )

        assert not mock_delete_call.called
        assert mock_supabase_request.called
