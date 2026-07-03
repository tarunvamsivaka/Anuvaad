"""Migrate API key hashing from SHA-256 to Argon2id

Revision ID: 003_argon2_api_key_hashing
Revises: 002_add_critical_indexes
Create Date: 2026-07-02

FIX-27 (P2-06): SHA-256 is fast — too fast for brute-forcing API keys.
Argon2id (OWASP recommended) adds memory + CPU cost, making brute-force
economically infeasible even with hardware-accelerated hash crackers.

Migration strategy (rolling, zero-downtime):
1. Add `key_hash_algo` column (default: 'sha256').
2. On next use of each key, the app upgrades its hash to argon2id transparently.
3. After a safe migration window, old SHA-256 rows can be invalidated.

NOTE: This migration only adds the column. The hash upgrade logic lives in
app/repositories/api_key.py — keys are upgraded lazily on first use.
"""
from alembic import op
import sqlalchemy as sa


revision = "003_argon2_api_key_hashing"
down_revision = "002_add_critical_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add key_hash_algo column to api_keys table."""
    op.add_column(
        "api_keys",
        sa.Column(
            "key_hash_algo",
            sa.Text,
            nullable=False,
            server_default="sha256",
        ),
    )


def downgrade() -> None:
    """Remove key_hash_algo column."""
    op.drop_column("api_keys", "key_hash_algo")
