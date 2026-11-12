"""Tests for Audit 4 Security Remediation (SEC-01).

Validates:
1. Singleton module-level _jwks_async_lock initialization.
2. High-concurrency ES256 JWKS fetch deduplication under burst requests.
"""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from jwt.algorithms import ECAlgorithm

from app.core import auth


@pytest.mark.asyncio
async def test_jwks_lock_singleton():
    """Verify that _jwks_async_lock is initialized at module level as a singleton and _get_jwks_lock is removed."""
    assert hasattr(auth, "_jwks_async_lock")
    assert isinstance(auth._jwks_async_lock, asyncio.Lock)
    assert not hasattr(auth, "_get_jwks_lock")


@pytest.mark.asyncio
async def test_jwks_lock_concurrency_deduplication():
    """Verify that 50 concurrent requests trigger exactly ONE remote JWKS fetch."""
    # Generate an ephemeral test EC private/public key
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    jwk_dict = ECAlgorithm.to_jwk(public_key)
    if isinstance(jwk_dict, str):
        import json

        jwk_dict = json.loads(jwk_dict)
    jwk_dict["kid"] = "audit4-test-kid"
    jwk_dict["kty"] = "EC"

    mock_jwks_payload = {"keys": [jwk_dict]}

    # Reset cache to simulate cold-start cache miss
    auth._jwks_cache.clear()
    auth._jwks_fetched_at = 0.0

    fetch_counter = 0

    class MockResponse:
        def __init__(self):
            self.status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
            return mock_jwks_payload

    async def mock_get(url, *args, **kwargs):
        nonlocal fetch_counter
        fetch_counter += 1
        # Add a tiny async yield to encourage concurrency interleave
        await asyncio.sleep(0.01)
        return MockResponse()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=mock_get)
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with (
        patch("app.core.auth.SUPABASE_URL", "https://test-project.supabase.co"),
        patch("httpx.AsyncClient", return_value=mock_client),
    ):
        # Fire 50 concurrent requests simultaneously
        tasks = [auth._get_jwks_public_key("audit4-test-kid") for _ in range(50)]
        results = await asyncio.gather(*tasks)

        # All 50 callers must receive the parsed key
        assert len(results) == 50
        for key in results:
            assert key is not None

        # Crucial invariant: exactly 1 remote fetch executed
        assert fetch_counter == 1, f"Expected 1 remote JWKS fetch, got {fetch_counter}"


@pytest.mark.asyncio
async def test_sec04_audit_hmac_key_isolation_in_production(monkeypatch):
    """SEC-04: Production startup must fail if AUDIT_HMAC_KEY reuses JWT or encryption keys."""
    import app.main as app_main

    monkeypatch.setattr(app_main, "ENV", "production")
    monkeypatch.setattr(app_main, "AUDIT_HMAC_KEY", "shared_secret_value")
    monkeypatch.setattr(app_main, "SUPABASE_JWT_SECRET", "shared_secret_value")
    monkeypatch.setattr(app_main, "TOKEN_ENCRYPTION_KEY", "distinct_fernet_key")

    with pytest.raises(RuntimeError, match="SEC-04"):
        app_main._validate_audit_hmac_key_isolation()


@pytest.mark.asyncio
async def test_sec10_argon2_verify_offloaded_to_worker_thread(monkeypatch):
    """SEC-10: _argon2_verify must execute off the asyncio event loop thread."""
    import threading

    from app.repositories import api_key as repository

    loop_thread_id = threading.get_ident()
    verify_thread_ids: list[int] = []

    def spy_argon2_verify(raw_key: str, stored_hash: str) -> bool:
        verify_thread_ids.append(threading.get_ident())
        return False

    class EmptyScalars:
        def first(self):
            return None

        def all(self):
            return []

    class EmptyResult:
        def scalars(self):
            return EmptyScalars()

    class DummySession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def execute(self, *args, **kwargs):
            return EmptyResult()

    monkeypatch.setattr(repository, "_argon2_verify", spy_argon2_verify)
    monkeypatch.setattr(repository, "_get_dummy_argon2_hash", lambda: "$argon2id$dummy")
    monkeypatch.setattr(repository, "AsyncSessionLocal", lambda: DummySession())

    result = await repository.get_by_raw_key("ak_test_1234567890abcdef")
    assert result is None
    assert len(verify_thread_ids) == 1
    assert verify_thread_ids[0] != loop_thread_id, "Argon2id verification blocked the event loop thread!"


def test_dep03_sqlite_blocked_in_production():
    """DEP-03: Importing database_session in production with SQLite raises RuntimeError."""
    import os
    import subprocess
    import sys

    env = os.environ.copy()
    env["ENV"] = "production"
    env["DATABASE_URL"] = "sqlite+aiosqlite:///./forbidden.db"
    env.setdefault("SUPABASE_JWT_SECRET", "ci_jwt_secret_minimum_32_bytes_length")
    env.setdefault("AUDIT_HMAC_KEY", "ci_audit_hmac_secret_distinct_value")
    proc = subprocess.run(
        [sys.executable, "-c", "import app.core.database_session"],
        env=env,
        capture_output=True,
        text=True,
    )
    assert proc.returncode != 0
    assert "SQLite is not permitted in production" in (proc.stderr + proc.stdout)
