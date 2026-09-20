"""Add indexed_by column to repo_embeddings table.

SEC-REPO-03: Tracks which user indexed each repository so searches can be
scoped per-user to prevent cross-user leakage of private repository content.

Revision ID: 011_add_indexed_by_to_repo_embeddings
Revises: 010_add_performance_and_fk_indexes
Create Date: 2026-09-20
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "011_add_indexed_by_to_repo_embeddings"
down_revision = "010_add_performance_and_fk_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add indexed_by (nullable TEXT) column to repo_embeddings.

    Nullable so existing rows are not broken. New indexing runs should
    populate this column to enable per-user search scoping.
    """
    op.add_column(
        "repo_embeddings",
        sa.Column("indexed_by", sa.Text(), nullable=True),
    )
    # Index for fast per-user lookups in search queries
    op.create_index(
        "ix_repo_embeddings_indexed_by",
        "repo_embeddings",
        ["indexed_by"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_repo_embeddings_indexed_by", table_name="repo_embeddings")
    op.drop_column("repo_embeddings", "indexed_by")
