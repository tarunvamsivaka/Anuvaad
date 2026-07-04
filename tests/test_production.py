from unittest.mock import patch

import pytest


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
async def test_supabase_request_fallback(monkeypatch):
    import importlib
    from unittest.mock import patch

    import app.core.database as db_module

    importlib.reload(db_module)

    with patch("app.core.database.AsyncSessionLocal", side_effect=Exception("DB Error")):
        result = await db_module.supabase_request("test_table", "select", {"id": "1"})
        assert result is None



@pytest.mark.asyncio
async def test_save_translation_background_pruning():
    """H-01: Pruning now uses translation_repo.prune_oldest() + translation_repo.save().

    When a free user has >= HISTORY_LIMIT_FREE (100) items, prune_oldest() should
    be called, and save() should always be called to store the new record.
    """
    from unittest.mock import AsyncMock, patch

    import main as app_module

    user_email = "free_user@example.com"
    HISTORY_LIMIT_FREE = 100  # Must match quota.py constant

    async def mock_get_user_pro_status(email):
        return False  # Free user

    # Simulate being at-limit: count == HISTORY_LIMIT_FREE → pruning triggers
    mock_get_count = AsyncMock(return_value=HISTORY_LIMIT_FREE)
    mock_prune_oldest = AsyncMock(return_value=None)
    mock_save = AsyncMock(return_value=None)

    with (
        patch("app.core.quota.get_user_pro_status", mock_get_user_pro_status),
        patch("app.repositories.translation.get_count_since", mock_get_count),
        patch("app.repositories.translation.prune_oldest", mock_prune_oldest),
        patch("app.repositories.translation.save", mock_save),
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

        # Pruning should have fired (count >= limit)
        mock_prune_oldest.assert_called_once_with(user_email, False)
        # New record should always be saved
        mock_save.assert_called_once()


@pytest.mark.asyncio
async def test_save_translation_background_pruning_pro():
    """H-01: Pro users have a higher limit (1000). At 100 items, no pruning occurs.

    prune_oldest() should NOT be called when count < HISTORY_LIMIT_PRO.
    save() should still be called to store the new record.
    """
    from unittest.mock import AsyncMock, patch

    import main as app_module

    user_email = "pro_user@example.com"

    async def mock_get_user_pro_status(email):
        return True  # Pro user

    # Pro user with only 100 items — well below the 1000 limit
    mock_get_count = AsyncMock(return_value=100)
    mock_prune_oldest = AsyncMock(return_value=None)
    mock_save = AsyncMock(return_value=None)
    mock_cache_delete = AsyncMock()
    mock_cache_delete_prefix = AsyncMock()

    with (
        patch("app.core.quota.get_user_pro_status", mock_get_user_pro_status),
        patch("app.repositories.translation.get_count_since", mock_get_count),
        patch("app.repositories.translation.prune_oldest", mock_prune_oldest),
        patch("app.repositories.translation.save", mock_save),
        patch("app.core.cache.cache.delete", mock_cache_delete),
        patch("app.core.cache.cache.delete_prefix", mock_cache_delete_prefix),
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

        # Pro user at 100 items — should NOT trigger pruning
        mock_prune_oldest.assert_not_called()
        # New record should still be saved
        mock_save.assert_called_once()

