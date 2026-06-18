"""Add repo_embeddings table

Revision ID: a3f8c1d2e9b4
Revises: 7af437a6b3ae
Create Date: 2026-06-18 00:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy


# revision identifiers, used by Alembic.
revision: str = 'a3f8c1d2e9b4'
down_revision: Union[str, Sequence[str], None] = '7af437a6b3ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create repo_embeddings table for Phase 4 vector-graph engine."""
    op.create_table(
        'repo_embeddings',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('repository_name', sa.Text(), nullable=False),
        sa.Column('file_path', sa.Text(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=384), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_repo_embeddings_repository_name'),
        'repo_embeddings',
        ['repository_name'],
        unique=False,
    )


def downgrade() -> None:
    """Drop repo_embeddings table."""
    op.drop_index(op.f('ix_repo_embeddings_repository_name'), table_name='repo_embeddings')
    op.drop_table('repo_embeddings')
