"""Empirical Adversarial Stress Test Suite for Milestone 1 Backend & Database Remediation.

Executed by Challenger 1 to rigorously stress-test:
1. TranslationHistory character_count column, char_count getter/setter, edge cases, large numbers, SQL compilation.
2. UserSubscription schema without stripe_customer_id and with indexed razorpay_subscription_id.
3. github_token repository: datetime timezone handling, unicode/long tokens, corrupted ciphertext recovery, DB error rollback.
4. workspace repository: parameter validation, instantiation without description, unicode names, DB error rollback.
5. Migration 001: Missing key, empty key, invalid key, double encryption prevention, rollback on failure.
6. Migration 010: Lineage, index coverage, symmetric downgrade, model index synchronization.
"""

import os
from datetime import timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.dialects import postgresql

# Configure environment for testing
VALID_FERNET_KEY = Fernet.generate_key().decode()
os.environ["TOKEN_ENCRYPTION_KEY"] = VALID_FERNET_KEY

UTC = timezone.utc  # noqa: UP017

from app.models.db_models import (  # noqa: E402
    ApiKey,
    DesiredIndexState,
    TranslationHistory,
    UserGithubToken,
    UserSubscription,
    Workspace,
)
from app.repositories.github_token import (  # noqa: E402
    delete_github_token,
    get_github_token,
    save_github_token,
)
from app.repositories.workspace import (  # noqa: E402
    add_member,
    create_workspace,
    delete_workspace,
    get_workspaces,
    remove_member,
)

# ==============================================================================
# Vector 1: TranslationHistory and UserSubscription Model Stress Tests
# ==============================================================================


class TestTranslationHistoryAdversarial:
    """Stress-test TranslationHistory column definitions, properties, and SQL compilation."""

    def test_schema_column_correctness(self):
        """Ensure character_count is in columns and char_count is purely a Python property."""
        cols = TranslationHistory.__table__.columns
        assert "character_count" in cols
        assert cols["character_count"].type.python_type is int
        assert "char_count" not in cols

    @pytest.mark.parametrize(
        "input_val,expected_out",
        [
            (0, 0),
            (1, 1),
            (-100, -100),
            (2147483647, 2147483647),  # Max 32-bit signed int
            (10**9, 10**9),
            (None, 0),  # char_count property returns 0 when character_count is None
        ],
    )
    def test_instantiation_with_character_count(self, input_val, expected_out):
        h = TranslationHistory(character_count=input_val)
        assert h.character_count == input_val
        assert h.char_count == expected_out

    @pytest.mark.parametrize(
        "input_val,expected_out",
        [
            (0, 0),
            (42, 42),
            (-500, -500),
            (2147483647, 2147483647),
            (None, 0),
        ],
    )
    def test_instantiation_with_legacy_char_count_alias(self, input_val, expected_out):
        h = TranslationHistory(char_count=input_val)
        assert h.character_count == input_val
        assert h.char_count == expected_out

    def test_default_instantiation(self):
        """Test default instantiation with no count parameters."""
        h = TranslationHistory()
        # In memory before DB insert, default is not set by DB unless flushed or defaulted
        assert h.char_count == 0  # Property safely coalesces None to 0

    def test_dynamic_property_mutations(self):
        """Test repeated bidirectional mutations between character_count and char_count."""
        h = TranslationHistory(character_count=10)
        assert h.char_count == 10

        # Mutate via property setter
        h.char_count = 500
        assert h.character_count == 500
        assert h.char_count == 500

        # Mutate to None via property setter
        h.char_count = None
        assert h.character_count is None
        assert h.char_count == 0

        # Mutate via direct attribute
        h.character_count = 999
        assert h.char_count == 999

        # Mutate to None via direct attribute
        h.character_count = None
        assert h.char_count == 0

    def test_sql_query_compilation_target_column(self):
        """Verify that ORM queries emit 'character_count' and not 'char_count' in PostgreSQL dialect."""
        stmt = select(TranslationHistory).where(TranslationHistory.character_count > 100)
        compiled_sql = str(stmt.compile(dialect=postgresql.dialect()))
        assert "translation_history.character_count" in compiled_sql
        assert "translation_history.char_count" not in compiled_sql


class TestUserSubscriptionAdversarial:
    """Stress-test UserSubscription schema changes (P0-DB-01)."""

    def test_stripe_customer_id_absence(self):
        """Ensure stripe_customer_id is completely absent from columns."""
        cols = UserSubscription.__table__.columns
        assert "stripe_customer_id" not in cols
        assert "razorpay_subscription_id" in cols
        assert cols["razorpay_subscription_id"].index is True

    def test_instantiation_rejects_stripe_customer_id(self):
        """Instantiating with removed column should raise TypeError."""
        with pytest.raises(TypeError, match="stripe_customer_id"):
            UserSubscription(user_email="test@example.com", stripe_customer_id="cus_123")


# ==============================================================================
# Vector 2: github_token Repository Robustness and Datetime Tests
# ==============================================================================


class TestGithubTokenRepositoryAdversarial:
    """Stress-test save_github_token, get_github_token, and delete_github_token."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "token_payload",
        [
            "ghp_standardToken1234567890abcdef",
            "github_pat_11AAAAAAA_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
            "token_with_utf8_🚀_unicode_ñ_বাংলা_漢字",
            "X" * 4096,  # 4KB token stress
            "",  # Empty token string
        ],
    )
    async def test_save_github_token_various_payloads(self, token_payload):
        """Verify save_github_token works across various token lengths, formats, and charsets."""
        with patch("app.repositories.github_token.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session.add = MagicMock()
            mock_session_cls.return_value.__aenter__.return_value = mock_session

            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = None
            mock_session.execute.return_value = mock_result

            ok = await save_github_token("dev@example.com", token_payload)
            assert ok is True
            assert mock_session.add.called
            added = mock_session.add.call_args[0][0]
            assert isinstance(added, UserGithubToken)
            assert added.user_email == "dev@example.com"
            assert added.updated_at is not None
            assert added.updated_at.tzinfo == UTC
            assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_save_github_token_db_exception_rollback(self):
        """Verify save_github_token rolls back session and returns False on DB failure."""
        with patch("app.repositories.github_token.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session.commit.side_effect = Exception("DB Connection Lost")
            mock_session_cls.return_value.__aenter__.return_value = mock_session

            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = None
            mock_session.execute.return_value = mock_result

            ok = await save_github_token("dev@example.com", "ghp_secret")
            assert ok is False
            assert mock_session.rollback.called

    @pytest.mark.asyncio
    async def test_get_github_token_decryption_recovery(self):
        """Verify get_github_token safely recovers when encrypted token is corrupted."""
        with patch("app.repositories.github_token.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session_cls.return_value.__aenter__.return_value = mock_session

            # Corrupted Fernet token (starts with gAAAAA but payload is garbled)
            corrupted_row = MagicMock()
            corrupted_row.access_token = "gAAAAABcorruptedTokenPayloadThatFailsFernetDecrypt=="
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = corrupted_row
            mock_session.execute.return_value = mock_result

            token = await get_github_token("dev@example.com")
            # Should gracefully return None instead of raising unhandled exception
            assert token is None

    @pytest.mark.asyncio
    async def test_delete_github_token_db_exception_rollback(self):
        """Verify delete_github_token rolls back and returns False on failure."""
        with patch("app.repositories.github_token.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session.commit.side_effect = Exception("DB Disk Full")
            mock_session_cls.return_value.__aenter__.return_value = mock_session

            ok = await delete_github_token("dev@example.com")
            assert ok is False
            assert mock_session.rollback.called


# ==============================================================================
# Vector 3: workspace Repository Robustness
# ==============================================================================


class TestWorkspaceRepositoryAdversarial:
    """Stress-test create_workspace and workspace member operations."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "ws_name",
        [
            "Engineering",
            "🚀 Team Alpha 2026",
            "W" * 500,  # Long name
            "   Whitespace Padded   ",
            "Workspace-with-symbols-!@#$%^&*()_+=<>?",
        ],
    )
    async def test_create_workspace_names(self, ws_name):
        """Verify create_workspace works with various workspace names."""
        with patch("app.repositories.workspace.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session.add = MagicMock()
            mock_session.refresh = AsyncMock()
            mock_session_cls.return_value.__aenter__.return_value = mock_session

            res = await create_workspace("owner@example.com", ws_name)
            assert res is not None
            assert mock_session.add.called
            added = mock_session.add.call_args[0][0]
            assert isinstance(added, Workspace)
            assert added.name == ws_name
            assert added.owner_email == "owner@example.com"
            assert not hasattr(added, "description")

    @pytest.mark.asyncio
    async def test_create_workspace_db_failure_rollback(self):
        """Verify create_workspace returns None and rolls back on exception."""
        with patch("app.repositories.workspace.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session.commit.side_effect = Exception("Unique constraint violation")
            mock_session_cls.return_value.__aenter__.return_value = mock_session

            res = await create_workspace("owner@example.com", "Failed WS")
            assert res is None
            assert mock_session.rollback.called

    @pytest.mark.asyncio
    async def test_get_workspaces_graceful_error_handling(self):
        """Verify get_workspaces returns empty list on DB failure without crashing."""
        with patch("app.repositories.workspace.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session.execute.side_effect = Exception("Connection Timeout")
            mock_session_cls.return_value.__aenter__.return_value = mock_session

            res = await get_workspaces("user@example.com")
            assert res == []

    @pytest.mark.asyncio
    async def test_member_lifecycle_error_handling(self):
        """Verify member operations handle exceptions gracefully with rollback."""
        with patch("app.repositories.workspace.AsyncSessionLocal") as mock_session_cls:
            mock_session = AsyncMock()
            mock_session.commit.side_effect = Exception("DB Error")
            mock_session_cls.return_value.__aenter__.return_value = mock_session

            assert await add_member("ws-uuid", "user@example.com") is False
            assert await remove_member("ws-uuid", "user@example.com") is False
            assert await delete_workspace("ws-uuid", "owner@example.com") is False


# ==============================================================================
# Vector 4: Migration 001 Security and Logic Adversarial Tests
# ==============================================================================


class TestMigration001Adversarial:
    """Stress-test migration 001 token encryption logic under adversarial conditions."""

    def _load_migration_001(self):
        import importlib.util
        from pathlib import Path

        mig_path = Path(__file__).resolve().parent.parent / "alembic" / "versions" / "001_encrypt_github_tokens.py"
        spec = importlib.util.spec_from_file_location("mig_001_adv", mig_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_missing_and_empty_key_rejections(self):
        """Verify both upgrade and downgrade reject None and empty string keys."""
        mig_001 = self._load_migration_001()

        for invalid_key in [None, ""]:
            with patch.dict(
                os.environ, {"TOKEN_ENCRYPTION_KEY": invalid_key} if invalid_key is not None else {}, clear=True
            ):
                if "TOKEN_ENCRYPTION_KEY" in os.environ and invalid_key is None:
                    del os.environ["TOKEN_ENCRYPTION_KEY"]

                with pytest.raises(RuntimeError, match="TOKEN_ENCRYPTION_KEY environment variable is required"):
                    mig_001.upgrade()

                with pytest.raises(RuntimeError, match="TOKEN_ENCRYPTION_KEY environment variable is required"):
                    mig_001.downgrade()

    def test_invalid_fernet_key_format(self):
        """Verify invalid Fernet key string raises ValueError upon Fernet initialization."""
        mig_001 = self._load_migration_001()
        with patch.dict(os.environ, {"TOKEN_ENCRYPTION_KEY": "not-a-valid-base64-fernet-key"}):
            with pytest.raises((ValueError, Exception)):  # Fernet constructor raises ValueError
                mig_001.upgrade()

    def test_upgrade_skips_already_encrypted_tokens(self):
        """Verify upgrade does NOT re-encrypt tokens that already begin with 'gAAAAA'."""
        mig_001 = self._load_migration_001()
        fernet = Fernet(VALID_FERNET_KEY.encode())
        already_encrypted = fernet.encrypt(b"token_already_safe").decode()

        mock_bind = MagicMock()
        mock_session = MagicMock()
        mock_session.execute.return_value.fetchall.return_value = [
            ("user1@example.com", "plaintext_token_123"),
            ("user2@example.com", already_encrypted),
            ("user3@example.com", None),
            ("user4@example.com", ""),
        ]

        with patch.dict(os.environ, {"TOKEN_ENCRYPTION_KEY": VALID_FERNET_KEY}):
            with patch("alembic.op.get_bind", return_value=mock_bind):
                with patch.object(mig_001, "Session", return_value=mock_session):
                    mig_001.upgrade()

                    # Check updates executed
                    update_calls = [
                        call
                        for call in mock_session.execute.call_args_list
                        if len(call[0]) > 1 and "token" in call[0][1]
                    ]
                    # Exactly 1 row should be updated (user1)
                    assert len(update_calls) == 1
                    updated_payload = update_calls[0][0][1]
                    assert updated_payload["email"] == "user1@example.com"
                    # The updated token must be encrypted and decryptable
                    decrypted = fernet.decrypt(updated_payload["token"].encode()).decode()
                    assert decrypted == "plaintext_token_123"
                    assert mock_session.commit.called


# ==============================================================================
# Vector 5: Migration 010 Index Lineage and Model Consistency
# ==============================================================================


class TestMigration010Adversarial:
    """Stress-test migration 010 index declarations and model sync."""

    def _load_migration_010(self):
        import importlib.util
        from pathlib import Path

        mig_path = (
            Path(__file__).resolve().parent.parent / "alembic" / "versions" / "010_add_performance_and_fk_indexes.py"
        )
        spec = importlib.util.spec_from_file_location("mig_010_adv", mig_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_migration_010_lineage_and_operations(self):
        """Verify migration 010 revision, down_revision, and operations."""
        mig_010 = self._load_migration_010()
        assert mig_010.revision == "010_add_performance_and_fk_indexes"
        assert mig_010.down_revision == "009_phase_2a"

        # Mock op to trace upgrade and downgrade calls
        with patch("alembic.op.create_index") as mock_create_index:
            mig_010.upgrade()
            assert mock_create_index.call_count == 5
            created_indexes = {call[0][0] for call in mock_create_index.call_args_list}
            expected_indexes = {
                "ix_user_subscriptions_razorpay_sub",
                "ix_api_keys_key_prefix",
                "ix_api_keys_user_email",
                "ix_desired_index_states_source_state",
                "ix_desired_index_states_index_config",
            }
            assert created_indexes == expected_indexes

        with patch("alembic.op.drop_index") as mock_drop_index:
            mig_010.downgrade()
            assert mock_drop_index.call_count == 5
            dropped_indexes = {call[0][0] for call in mock_drop_index.call_args_list}
            assert dropped_indexes == expected_indexes

    def test_all_model_indexes_match_migration(self):
        """Verify that ORM models have matching index=True attributes."""
        assert UserSubscription.__table__.columns["razorpay_subscription_id"].index is True
        assert ApiKey.__table__.columns["key_prefix"].index is True
        assert ApiKey.__table__.columns["user_email"].index is True
        assert DesiredIndexState.__table__.columns["source_state_id"].index is True
        assert DesiredIndexState.__table__.columns["index_configuration_id"].index is True
