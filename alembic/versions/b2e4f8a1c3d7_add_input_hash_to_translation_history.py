"""add_input_hash_to_translation_history

ZDR Compliance Migration (AGENTS.md Rule #1):
Adds `input_hash` column (HMAC-SHA256 of raw input code) to translation_history.
Retroactively redacts any existing `input_text` rows that contain raw source code
(i.e., rows that do NOT already start with the [ZDR-PROTECTED] marker).

Revision ID: b2e4f8a1c3d7
Revises: 8d3045f704c7
Create Date: 2026-09-28
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2e4f8a1c3d7"
down_revision: Union[str, Sequence[str], None] = "013_halfvec_and_ivfflat"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add input_hash column and retroactively redact raw code from input_text.

    ZDR Invariant: input_text must never contain raw source code in storage.
    Any existing rows with raw code are replaced with a safe redaction marker.
    """
    # 1. Add the input_hash column (nullable so existing rows aren't blocked)
    op.add_column(
        "translation_history",
        sa.Column(
            "input_hash",
            sa.String(64),
            nullable=True,
            comment="HMAC-SHA256 of raw input code (ZDR audit receipt)",
        ),
    )

    # 2. Retroactively redact any existing raw code from input_text.
    #    The [ZDR-PROTECTED: ...] marker is the safe format set by all new writes.
    #    We only touch rows that don't already have the marker.
    op.execute(
        """
        UPDATE translation_history
        SET input_text = '[ZDR-REDACTED: migrated ' || LENGTH(input_text)::TEXT || ' chars on 2026-09-28]'
        WHERE input_text IS NOT NULL
          AND input_text NOT LIKE '[ZDR-%'
        """
    )


def downgrade() -> None:
    """Remove input_hash column. Note: retroactively redacted input_text is NOT restored."""
    op.drop_column("translation_history", "input_hash")
