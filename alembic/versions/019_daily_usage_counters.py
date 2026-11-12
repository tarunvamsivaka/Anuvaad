"""Add durable per-user daily translation usage counters."""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

revision: str = "019_daily_usage_counters"
down_revision: Union[str, Sequence[str], None] = "018_public_translation_count"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "daily_usages",
        sa.Column("user_email", sa.Text(), nullable=False),
        sa.Column("usage_date", sa.Date(), nullable=False),
        sa.Column("usage_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("usage_count >= 0", name="ck_daily_usages_nonnegative"),
        sa.PrimaryKeyConstraint("user_email", "usage_date", name="pk_daily_usages"),
    )
    # Recover today's opt-in history counts. Any still-live Redis counters from
    # the pre-migration release are adopted with a floor on the user's next use.
    op.execute(
        """
        INSERT INTO daily_usages (user_email, usage_date, usage_count)
        SELECT lower(btrim(user_email)), (created_at AT TIME ZONE 'UTC')::date, COUNT(*)
        FROM translation_history
        WHERE user_email IS NOT NULL
          AND created_at >= ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date AT TIME ZONE 'UTC')
        GROUP BY lower(btrim(user_email)), (created_at AT TIME ZONE 'UTC')::date
        ON CONFLICT (user_email, usage_date) DO UPDATE
        SET usage_count = GREATEST(daily_usages.usage_count, EXCLUDED.usage_count)
        """
    )


def downgrade() -> None:
    op.drop_table("daily_usages")
