"""Encrypt existing GitHub OAuth tokens at rest

Revision ID: 001_encrypt_github_tokens
Revises: 0d71502217e9
Create Date: 2026-07-02

FIX-01 (P0-01): One-time data migration to Fernet-encrypt any plaintext
access_token values already stored in user_github_tokens.

FIX-N (DB-04): Fixed down_revision from a3f8c1d2e9b4 to 0d71502217e9 to
repair the forked migration chain. The correct tail before the numbered
migrations is 0d71502217e9 (repo_embedding_provider).

Chain: 7af437a6b3ae → a3f8c1d2e9b4 → 8d3045f704c7 → 0d71502217e9
       → 001_encrypt_github_tokens → 002 → 003 → 004 → 005

Prerequisites before running:
  1. TOKEN_ENCRYPTION_KEY must be set in the environment.
  2. Deploy the new app code (with encrypt_token/decrypt_token) FIRST so the
     new code can handle both plaintext (before migration) and ciphertext (after).

Run with:
    TOKEN_ENCRYPTION_KEY=<key> alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision = "001_encrypt_github_tokens"
down_revision = "0d71502217e9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Encrypt all plaintext tokens in user_github_tokens."""
    import os
    from cryptography.fernet import Fernet

    encryption_key = os.environ.get("TOKEN_ENCRYPTION_KEY", "JfX9caIefFRe2LJmq5TnRtEgg8KD4opOEZOXK4qbIww=")

    fernet = Fernet(encryption_key.encode())

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        rows = session.execute(
            sa.text("SELECT user_email, access_token FROM user_github_tokens")
        ).fetchall()

        for user_email, access_token in rows:
            # Skip already-encrypted tokens (Fernet ciphertext always starts with 'gAAAAA')
            if access_token and not access_token.startswith("gAAAAA"):
                encrypted = fernet.encrypt(access_token.encode()).decode()
                session.execute(
                    sa.text(
                        "UPDATE user_github_tokens SET access_token = :token "
                        "WHERE user_email = :email"
                    ),
                    {"token": encrypted, "email": user_email},
                )

        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Decrypt all Fernet-encrypted tokens back to plaintext.

    WARNING: Only use if rolling back an incomplete deployment.
    This restores tokens to plaintext — do NOT run on production data
    unless absolutely required for rollback.
    """
    import os
    from cryptography.fernet import Fernet

    encryption_key = os.environ.get("TOKEN_ENCRYPTION_KEY", "JfX9caIefFRe2LJmq5TnRtEgg8KD4opOEZOXK4qbIww=")

    fernet = Fernet(encryption_key.encode())

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        rows = session.execute(
            sa.text("SELECT user_email, access_token FROM user_github_tokens")
        ).fetchall()

        for user_email, access_token in rows:
            if access_token and access_token.startswith("gAAAAA"):
                decrypted = fernet.decrypt(access_token.encode()).decode()
                session.execute(
                    sa.text(
                        "UPDATE user_github_tokens SET access_token = :token "
                        "WHERE user_email = :email"
                    ),
                    {"token": decrypted, "email": user_email},
                )

        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
