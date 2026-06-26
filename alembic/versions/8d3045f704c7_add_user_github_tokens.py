"""Add user_github_tokens

Revision ID: 8d3045f704c7
Revises: a3f8c1d2e9b4
Create Date: 2026-06-26 21:46:12.762810

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8d3045f704c7'
down_revision: Union[str, Sequence[str], None] = 'a3f8c1d2e9b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('user_github_tokens',
    sa.Column('user_email', sa.Text(), nullable=False),
    sa.Column('access_token', sa.Text(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('user_email')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('user_github_tokens')
