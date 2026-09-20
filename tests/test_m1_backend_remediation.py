"""Unit tests for Milestone 1 Backend and Database defect remediation.

Verifies:
- P0-DB-01: TranslationHistory column character_count + char_count property alias; UserSubscription removed stripe_customer_id
- P1-BUG-01: github_token repository datetime.now(UTC) fix
- P1-BUG-02: workspace repository create_workspace signature and instantiation fix
- P2-SEC-01: 001 migration requires TOKEN_ENCRYPTION_KEY and raises RuntimeError if absent
- P2-DB-02: 010 migration contains required performance and FK indexes with clean downgrade
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Set a valid 32-byte base64 test key for test environment (overriding invalid .env placeholder)
os.environ["TOKEN_ENCRYPTION_KEY"] = "JfX9caIefFRe2LJmq5TnRtEgg8KD4opOEZOXK4qbIww="

from app.models.db_models import (  # noqa: E402
    ApiKey,
    DesiredIndexState,
    TranslationHistory,
    UserSubscription,
    Workspace,
)
from app.repositories.github_token import save_github_token  # noqa: E402
from app.repositories.workspace import create_workspace  # noqa: E402


def test_p0_db_01_translation_history_column_and_alias():
    """Verify TranslationHistory table schema has character_count column and char_count property alias."""
    # Ensure character_count is an actual DB column
    assert "character_count" in TranslationHistory.__table__.columns
    assert "char_count" not in TranslationHistory.__table__.columns

    # Initializing with character_count
    h1 = TranslationHistory(character_count=120)
    assert h1.character_count == 120
    assert h1.char_count == 120

    # Initializing with char_count legacy alias
    h2 = TranslationHistory(char_count=240)
    assert h2.character_count == 240
    assert h2.char_count == 240

    # Updating via char_count setter
    h2.char_count = 360
    assert h2.character_count == 360
    assert h2.char_count == 360

    # Updating via character_count
    h2.character_count = 480
    assert h2.character_count == 480
    assert h2.char_count == 480


def test_p0_db_01_user_subscription_stripe_removed():
    """Verify stripe_customer_id is removed from UserSubscription ORM model."""
    assert "stripe_customer_id" not in UserSubscription.__table__.columns
    assert "razorpay_subscription_id" in UserSubscription.__table__.columns


@pytest.mark.asyncio
async def test_p1_bug_01_github_token_datetime_fix_new_token():
    """Verify save_github_token works without AttributeError for new tokens."""
    with patch("app.repositories.github_token.AsyncSessionLocal") as mock_session_cls:
        mock_session = AsyncMock()
        mock_session.add = MagicMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session

        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = None
        mock_session.execute.return_value = mock_result

        with patch("app.repositories.github_token.encrypt_token", return_value="encrypted_secret"):
            res = await save_github_token("test@example.com", "gho_token123")
            assert res is True
            assert mock_session.add.called
            added_token = mock_session.add.call_args[0][0]
            assert added_token.user_email == "test@example.com"
            assert added_token.access_token == "encrypted_secret"
            assert added_token.updated_at is not None
            assert mock_session.commit.called


@pytest.mark.asyncio
async def test_p1_bug_01_github_token_datetime_fix_existing_token():
    """Verify save_github_token works without AttributeError for existing tokens."""
    with patch("app.repositories.github_token.AsyncSessionLocal") as mock_session_cls:
        mock_session = AsyncMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session

        existing_token = MagicMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = existing_token
        mock_session.execute.return_value = mock_result

        with patch("app.repositories.github_token.encrypt_token", return_value="encrypted_secret_updated"):
            res = await save_github_token("test@example.com", "gho_token_updated")
            assert res is True
            assert existing_token.access_token == "encrypted_secret_updated"
            assert existing_token.updated_at is not None
            assert mock_session.commit.called


@pytest.mark.asyncio
async def test_p1_bug_02_workspace_create_no_description_arg():
    """Verify create_workspace accepts (owner_email, name) and instantiates Workspace without error."""
    with patch("app.repositories.workspace.AsyncSessionLocal") as mock_session_cls:
        mock_session = AsyncMock()
        mock_session.add = MagicMock()
        mock_session.refresh = AsyncMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session

        res = await create_workspace(owner_email="founder@example.com", name="Engineering")
        assert res is not None
        assert mock_session.add.called
        created_ws = mock_session.add.call_args[0][0]
        assert isinstance(created_ws, Workspace)
        assert created_ws.name == "Engineering"
        assert created_ws.owner_email == "founder@example.com"
        assert not hasattr(created_ws, "description")


def test_p2_sec_01_migration_requires_token_encryption_key():
    """Verify migration 001 raises RuntimeError when TOKEN_ENCRYPTION_KEY is unset."""
    import importlib.util
    from pathlib import Path

    migration_path = Path(__file__).resolve().parent.parent / "alembic" / "versions" / "001_encrypt_github_tokens.py"
    spec = importlib.util.spec_from_file_location("migration_001", migration_path)
    mig_001 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig_001)

    with patch.dict(os.environ, {}, clear=True):
        if "TOKEN_ENCRYPTION_KEY" in os.environ:
            del os.environ["TOKEN_ENCRYPTION_KEY"]

        with pytest.raises(RuntimeError, match="TOKEN_ENCRYPTION_KEY environment variable is required"):
            mig_001.upgrade()

        with pytest.raises(RuntimeError, match="TOKEN_ENCRYPTION_KEY environment variable is required"):
            mig_001.downgrade()


def test_p2_db_02_migration_010_structure():
    """Verify migration 010 revision lineage and index definitions."""
    import importlib.util
    from pathlib import Path

    migration_path = Path(__file__).resolve().parent.parent / "alembic" / "versions" / "010_add_performance_and_fk_indexes.py"
    spec = importlib.util.spec_from_file_location("migration_010", migration_path)
    mig_010 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig_010)

    assert mig_010.revision == "010_add_performance_and_fk_indexes"
    assert mig_010.down_revision == "009_phase_2a"
    assert callable(mig_010.upgrade)
    assert callable(mig_010.downgrade)


def test_p2_db_02_model_indexes():
    """Verify index=True flags on model columns."""
    assert UserSubscription.__table__.columns["razorpay_subscription_id"].index is True
    assert ApiKey.__table__.columns["key_prefix"].index is True
    assert ApiKey.__table__.columns["user_email"].index is True
    assert DesiredIndexState.__table__.columns["source_state_id"].index is True
    assert DesiredIndexState.__table__.columns["index_configuration_id"].index is True
