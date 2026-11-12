"""Add consent preferences and encrypted history storage.

Revision ID: 017_privacy_history
Revises: 016_share_link_expiry
"""

import sqlalchemy as sa

from alembic import op

revision = "017_privacy_history"
down_revision = "016_share_link_expiry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_subscriptions", sa.Column("cloud_processing_consent_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "user_subscriptions", sa.Column("code_history_opt_in", sa.Boolean(), nullable=False, server_default=sa.false())
    )
    op.add_column("translation_history", sa.Column("encrypted_blocks", sa.Text(), nullable=True))
    op.add_column("translation_history", sa.Column("history_key_version", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("translation_history", "history_key_version")
    op.drop_column("translation_history", "encrypted_blocks")
    op.drop_column("user_subscriptions", "code_history_opt_in")
    op.drop_column("user_subscriptions", "cloud_processing_consent_at")
