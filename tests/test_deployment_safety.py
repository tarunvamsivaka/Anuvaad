"""Release-gate regression tests for privacy and disabled enterprise surfaces."""

import pytest

from app.main import app
from app.services.ai_gateway.airgap_provider import AirgapInferenceProvider, LocalModelConfig


def test_unverified_sso_routes_are_absent_from_the_deployed_application():
    assert not any(getattr(route, "path", "").startswith("/api/v1/sso/") for route in app.routes)


@pytest.mark.parametrize(
    "url",
    [
        "https://api.example.com/v1",
        "http://8.8.8.8/v1",
        "http://169.254.169.254/latest/meta-data",
        "http://metadata.google.internal/computeMetadata/v1",
    ],
)
def test_airgap_rejects_public_and_metadata_destinations(url: str):
    with pytest.raises(ValueError):
        AirgapInferenceProvider(LocalModelConfig(base_url=url))


def test_airgap_accepts_private_endpoint():
    provider = AirgapInferenceProvider(LocalModelConfig(base_url="http://10.10.0.8:8080/v1"))
    assert provider.config.base_url.startswith("http://10.")


def test_history_encryption_round_trip(monkeypatch):
    monkeypatch.setenv("HISTORY_ENCRYPTION_KEYS", "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
    from app.core.history_encryption import decrypt_blocks, encrypt_blocks

    blocks = [{"id": "one", "code_snippet": "print('safe')", "english_translation": "Prints safe."}]
    ciphertext = encrypt_blocks(blocks)
    assert "print('safe')" not in ciphertext
    assert decrypt_blocks(ciphertext) == blocks


@pytest.mark.asyncio
async def test_health_checks_are_exempt_from_rate_limiting():
    """Verify health check and metrics endpoints bypass IP rate limiting (fixes Render 429 server failure)."""
    from unittest.mock import AsyncMock, MagicMock
    from fastapi import Request
    from app.api.middleware.rate_limit import rate_limit_middleware

    for path in ["/api/health", "/api/v1/health", "/api/health/live", "/api/health/ready", "/api/metrics"]:
        scope = {
            "type": "http",
            "method": "GET",
            "path": path,
            "headers": [(b"host", b"testserver")],
        }
        request = Request(scope)
        call_next = AsyncMock(return_value=MagicMock(status_code=200))

        # Even with no auth, call_next should be called directly without 429
        response = await rate_limit_middleware(request, call_next)
        assert call_next.called, f"call_next not called for {path}"
        assert response.status_code == 200, f"Expected 200 for {path}, got {response.status_code}"


def test_audit_hmac_and_history_encryption_fallbacks(monkeypatch):
    """Verify that when only TOKEN_ENCRYPTION_KEY is configured, AUDIT_HMAC_KEY and HISTORY_ENCRYPTION_KEYS have secure fallbacks."""
    import importlib
    import app.core.config as config_mod

    sample_fernet_key = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
    monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", sample_fernet_key)
    monkeypatch.delenv("AUDIT_HMAC_KEY", raising=False)
    monkeypatch.delenv("HISTORY_ENCRYPTION_KEYS", raising=False)

    importlib.reload(config_mod)

    assert config_mod.HISTORY_ENCRYPTION_KEYS == sample_fernet_key
    assert config_mod.AUDIT_HMAC_KEY
    assert config_mod.AUDIT_HMAC_KEY != sample_fernet_key  # Must NOT reuse the same raw key
    assert len(config_mod.AUDIT_HMAC_KEY) == 64  # SHA-256 hex digest


def test_token_encryption_key_derives_from_jwt_secret_when_missing(monkeypatch):
    """Verify that when TOKEN_ENCRYPTION_KEY is unset, a deterministic Fernet key is derived from SUPABASE_JWT_SECRET."""
    import importlib
    from cryptography.fernet import Fernet
    import app.core.config as config_mod

    monkeypatch.delenv("TOKEN_ENCRYPTION_KEY", raising=False)
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "super-secret-supabase-jwt-token-1234567890")
    monkeypatch.delenv("AUDIT_HMAC_KEY", raising=False)
    monkeypatch.delenv("HISTORY_ENCRYPTION_KEYS", raising=False)

    importlib.reload(config_mod)

    assert config_mod.TOKEN_ENCRYPTION_KEY
    # Verify it is a valid Fernet key
    fernet = Fernet(config_mod.TOKEN_ENCRYPTION_KEY.encode())
    encrypted = fernet.encrypt(b"test data")
    assert fernet.decrypt(encrypted) == b"test data"
    assert config_mod.HISTORY_ENCRYPTION_KEYS == config_mod.TOKEN_ENCRYPTION_KEY
    assert config_mod.AUDIT_HMAC_KEY


@pytest.mark.asyncio
async def test_alembic_head_check_is_non_blocking_on_mismatch(monkeypatch):
    """Verify that database schema mismatch does not throw RuntimeError on startup."""
    import app.main as app_main
    from unittest.mock import AsyncMock, MagicMock

    monkeypatch.setattr("app.core.database_session._is_sqlite", False)

    mock_conn = AsyncMock()
    mock_conn.run_sync = AsyncMock(return_value=["001_old_rev"])
    mock_connect_cm = AsyncMock()
    mock_connect_cm.__aenter__.return_value = mock_conn
    mock_connect_cm.__aexit__.return_value = None

    mock_engine = MagicMock()
    mock_engine.connect.return_value = mock_connect_cm

    monkeypatch.setattr("app.core.database_session.engine", mock_engine)

    # Should complete cleanly without raising RuntimeError
    await app_main._verify_alembic_head()

