"""Add optional expiration timestamps for public translation links.

Revision ID: 016_share_link_expiry
Revises: 015_revoke_public_table_grants
Create Date: 2026-10-04
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

revision: str = "016_share_link_expiry"
down_revision: Union[str, Sequence[str], None] = "015_revoke_public_table_grants"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "translation_history",
        sa.Column("share_expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("translation_history", "share_expires_at")
