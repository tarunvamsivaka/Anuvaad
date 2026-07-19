"""Add Phase 1C searchable persistence models

Revision ID: 008_phase_1c
Revises: 007_phase_1b
Create Date: 2026-07-19 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "008_phase_1c"
down_revision = "007_phase_1b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "searchable_materializations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("import_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("index_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_current", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["import_id"], ["repository_imports.id"]),
        sa.ForeignKeyConstraint(["index_run_id"], ["index_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("index_run_id"),
    )
    op.create_index("ix_searchable_materializations_import_id", "searchable_materializations", ["import_id"])
    op.create_index(
        "uq_searchable_materializations_current_import",
        "searchable_materializations",
        ["import_id"],
        unique=True,
        postgresql_where=sa.text("is_current"),
    )

    op.create_table(
        "structural_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("materialization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("language", sa.Text(), nullable=False),
        sa.Column("module_identity", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["materialization_id"], ["searchable_materializations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_structural_files_materialization_id", "structural_files", ["materialization_id"])
    op.create_index("uq_structural_files_materialization_path", "structural_files", ["materialization_id", "file_path"], unique=True)

    op.create_table(
        "structural_symbols",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("structural_file_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("symbol_name", sa.Text(), nullable=False),
        sa.Column("symbol_kind", sa.Text(), nullable=False),
        sa.Column("location_start", sa.Integer(), nullable=False),
        sa.Column("location_end", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["structural_file_id"], ["structural_files.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_structural_symbols_structural_file_id", "structural_symbols", ["structural_file_id"])
    op.create_index("uq_structural_symbols_file_location", "structural_symbols", ["structural_file_id", "symbol_name", "symbol_kind", "location_start", "location_end"], unique=True)

    op.create_table(
        "structural_imports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_file_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("declared_import", sa.Text(), nullable=False),
        sa.Column("resolved_target_file_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["resolved_target_file_id"], ["structural_files.id"]),
        sa.ForeignKeyConstraint(["source_file_id"], ["structural_files.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_structural_imports_source_file_id", "structural_imports", ["source_file_id"])
    op.create_index("ix_structural_imports_resolved_target_file_id", "structural_imports", ["resolved_target_file_id"])
    op.create_index("uq_structural_imports_source_declared", "structural_imports", ["source_file_id", "declared_import"], unique=True)

    op.create_table(
        "repository_linked_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("translation_history_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("import_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_state_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["import_id"], ["repository_imports.id"]),
        sa.ForeignKeyConstraint(["source_state_id"], ["source_states.id"]),
        sa.ForeignKeyConstraint(["translation_history_id"], ["translation_history.id"]),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("translation_history_id"),
    )
    op.create_index("ix_repository_linked_history_workspace_id", "repository_linked_history", ["workspace_id"])
    op.create_index("ix_repository_linked_history_translation_history_id", "repository_linked_history", ["translation_history_id"])
    op.create_index("ix_repository_linked_history_import_id", "repository_linked_history", ["import_id"])
    op.create_index("ix_repository_linked_history_source_state_id", "repository_linked_history", ["source_state_id"])


def downgrade() -> None:
    op.drop_index("ix_repository_linked_history_source_state_id", table_name="repository_linked_history")
    op.drop_index("ix_repository_linked_history_import_id", table_name="repository_linked_history")
    op.drop_index("ix_repository_linked_history_translation_history_id", table_name="repository_linked_history")
    op.drop_index("ix_repository_linked_history_workspace_id", table_name="repository_linked_history")
    op.drop_table("repository_linked_history")

    op.drop_index("uq_structural_imports_source_declared", table_name="structural_imports")
    op.drop_index("ix_structural_imports_resolved_target_file_id", table_name="structural_imports")
    op.drop_index("ix_structural_imports_source_file_id", table_name="structural_imports")
    op.drop_table("structural_imports")

    op.drop_index("uq_structural_symbols_file_location", table_name="structural_symbols")
    op.drop_index("ix_structural_symbols_structural_file_id", table_name="structural_symbols")
    op.drop_table("structural_symbols")

    op.drop_index("uq_structural_files_materialization_path", table_name="structural_files")
    op.drop_index("ix_structural_files_materialization_id", table_name="structural_files")
    op.drop_table("structural_files")

    op.drop_index("uq_searchable_materializations_current_import", table_name="searchable_materializations")
    op.drop_index("ix_searchable_materializations_import_id", table_name="searchable_materializations")
    op.drop_table("searchable_materializations")
