"""Grant anonymous access to the aggregate translation count RPC.

Revision ID: 018_public_translation_count
Revises: 017_privacy_history
"""

from collections.abc import Sequence
from typing import Union

from alembic import op

revision: str = "018_public_translation_count"
down_revision: Union[str, Sequence[str], None] = "017_privacy_history"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The RPC is SECURITY DEFINER, has an empty search_path, and returns only
    # an aggregate count. The public landing page uses the anon role.
    op.execute("GRANT EXECUTE ON FUNCTION public.get_total_translations_count() TO anon;")


def downgrade() -> None:
    op.execute("REVOKE EXECUTE ON FUNCTION public.get_total_translations_count() FROM anon;")
