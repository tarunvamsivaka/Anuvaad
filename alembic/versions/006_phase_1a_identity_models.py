"""Add Phase 1A identity models

Revision ID: 006_phase_1a
Revises: 005_remove_duplicate_columns
Create Date: 2026-07-16 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006_phase_1a'
down_revision = '005_remove_duplicate_columns'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # RepositoryImport
    op.create_table('repository_imports',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.Text(), nullable=False),
        sa.Column('provider_repo_id', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_repo_imports_workspace_provider', 'repository_imports', ['workspace_id', 'provider', 'provider_repo_id'], unique=True)
    op.create_index(op.f('ix_repository_imports_workspace_id'), 'repository_imports', ['workspace_id'], unique=False)

    # SourceState
    op.create_table('source_states',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('import_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('revision_sha', sa.Text(), nullable=False),
        sa.Column('snapshot_hash', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['import_id'], ['repository_imports.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_source_states_import_id'), 'source_states', ['import_id'], unique=False)

    # IndexConfiguration
    op.create_table('index_configurations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('config_hash', sa.Text(), nullable=False),
        sa.Column('chunk_size', sa.Integer(), nullable=False),
        sa.Column('admission_policy_version', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_index_configurations_config_hash'), 'index_configurations', ['config_hash'], unique=True)

def downgrade() -> None:
    op.drop_index(op.f('ix_index_configurations_config_hash'), table_name='index_configurations')
    op.drop_table('index_configurations')

    op.drop_index(op.f('ix_source_states_import_id'), table_name='source_states')
    op.drop_table('source_states')

    op.drop_index(op.f('ix_repository_imports_workspace_id'), table_name='repository_imports')
    op.drop_index('ix_repo_imports_workspace_provider', table_name='repository_imports')
    op.drop_table('repository_imports')
