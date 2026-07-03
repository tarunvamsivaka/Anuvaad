"""Remove duplicate columns and dead Stripe column

Revision ID: 005_remove_duplicate_columns
Revises: 004_add_fk_constraints
Create Date: 2026-07-02

FIX-29 (P2-02 + P3-02):

1. translation_history has both `char_count` (legacy) and `character_count` (newer).
   Both store the same value. Keep `character_count`; drop `char_count`.
   Before dropping, backfill any rows where character_count is NULL but char_count is set.

2. user_subscriptions.stripe_customer_id was added for a Stripe integration that was
   never completed (project uses Razorpay). The column is always NULL and dead code.
   Remove it.
"""
from alembic import op
import sqlalchemy as sa


revision = "005_remove_duplicate_columns"
down_revision = "004_add_fk_constraints"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Backfill character_count from char_count where missing
    op.execute("""
        UPDATE translation_history
        SET character_count = COALESCE(character_count, char_count)
        WHERE character_count IS NULL AND char_count IS NOT NULL
    """)

    # 2. Drop the duplicate char_count column
    # Use IF EXISTS to be idempotent (column may not exist in fresh DB)
    op.execute("ALTER TABLE translation_history DROP COLUMN IF EXISTS char_count")

    # 3. Drop the dead Stripe column
    op.execute("ALTER TABLE user_subscriptions DROP COLUMN IF EXISTS stripe_customer_id")


def downgrade() -> None:
    op.add_column(
        "translation_history",
        sa.Column("char_count", sa.Integer, nullable=True),
    )
    op.add_column(
        "user_subscriptions",
        sa.Column("stripe_customer_id", sa.Text, nullable=True),
    )
