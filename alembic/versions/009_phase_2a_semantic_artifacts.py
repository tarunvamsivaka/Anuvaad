"""Add Phase 2A tenant-scoped semantic artifact persistence.

Revision ID: 009_phase_2a
Revises: 008_phase_1c
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector.sqlalchemy

revision = "009_phase_2a"
down_revision = "008_phase_1c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "semantic_artifacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("materialization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column("embedding", pgvector.sqlalchemy.Vector(dim=1536), nullable=False),
        sa.Column("embedding_model", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["materialization_id"], ["searchable_materializations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("materialization_id", "file_path", "chunk_index", name="uq_semantic_artifacts_materialization_path_chunk"),
    )
    op.execute("ALTER TABLE semantic_artifacts ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector")
    op.create_index("ix_semantic_artifacts_materialization_id", "semantic_artifacts", ["materialization_id"])


def downgrade() -> None:
    op.drop_index("ix_semantic_artifacts_materialization_id", table_name="semantic_artifacts")
    op.drop_table("semantic_artifacts")

