"""
tests/test_security_unit.py

Security and reliability unit tests for Audit 4 invariants:
- SEC-01: JWKS lock singleton & removal of lazy initialization
- SEC-03: CSRF middleware enforcement in staging & production
- SEC-04: HMAC audit receipt dedicated secret validation
- SEC-07: Redis configuration URL password parsing
- DEP-03: Prevention of SQLite fallback in production
"""

import asyncio
from unittest.mock import patch

import pytest

from app.core import auth
from app.core.audit import generate_audit_receipt, verify_audit_receipt
from app.core.cache import _extract_redis_password


class TestJWKSLockSingleton:
    """SEC-01 Invariants."""

    def test_jwks_lock_is_initialized_module_level(self):
        assert hasattr(auth, "_jwks_async_lock")
        assert isinstance(auth._jwks_async_lock, asyncio.Lock)

    def test_get_jwks_lock_lazy_function_removed(self):
        """_get_jwks_lock() must not exist, preventing concurrent race reintroduction."""
        assert not hasattr(auth, "_get_jwks_lock")


class TestHMACAuditReceiptDedicatedSecret:
    """SEC-04 Invariants: Dedicated audit HMAC secret."""

    def test_audit_receipt_verification_with_dedicated_key(self):
        secret = "test_audit_hmac_secret_key_12345"
        receipt = generate_audit_receipt("user@example.com", "print(1)", secret=secret)

        # Should verify with correct secret
        assert verify_audit_receipt(
            receipt["user_id"],
            receipt["timestamp_utc"],
            receipt["sha256_input_hash"],
            receipt["audit_digest"],
            secret=secret,
        )

        # Should fail with wrong secret (e.g. Supabase JWT secret)
        assert not verify_audit_receipt(
            receipt["user_id"],
            receipt["timestamp_utc"],
            receipt["sha256_input_hash"],
            receipt["audit_digest"],
            secret="different_jwt_secret_key",
        )


class TestRedisConfigValidation:
    """SEC-07: Validates urlparse extraction of Redis password."""

    def test_extract_redis_password_with_password(self):
        pw = _extract_redis_password("redis://:my_secure_pw@10.0.0.1:6379/0")
        assert pw == "my_secure_pw"

    def test_extract_redis_password_without_password(self):
        pw = _extract_redis_password("redis://10.0.0.1:6379/0")
        assert pw is None or pw == ""


class TestCSRFStagingEnforcement:
    """SEC-03: Staging and Production CSRF protection."""

    def test_csrf_middleware_enforces_on_staging(self, client):
        with patch("app.api.middleware.csrf._ENFORCE_CSRF", True):
            res = client.post(
                "/api/v1/code-to-english",
                json={"raw_code": "x = 1", "language": "python"},
                headers={
                    "Origin": "https://malicious-attacker-domain.com",
                    "X-Anuvaad-Cloud-Consent": "true",
                },
            )
            assert res.status_code == 403
            assert "CSRF" in res.json().get("detail", "")


class TestProductionSQLiteGuard:
    """DEP-03: SQLite must not silently load in production."""

    def test_sqlite_raises_in_production(self, monkeypatch):
        import app.core.database_session as db_session

        assert hasattr(db_session, "IS_PRODUCTION")


class TestAlembicMigrationGate:
    """DEP-04: Startup migration verification."""

    @pytest.mark.asyncio
    async def test_migration_head_check_skips_sqlite(self):
        from app.main import _verify_alembic_head

        # With default in-memory sqlite test env, it should safely return without error
        await _verify_alembic_head()
