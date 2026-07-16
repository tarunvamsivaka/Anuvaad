"""Add Phase 1B index lifecycle models

Revision ID: 007_phase_1b
Revises: 006_phase_1a
Create Date: 2026-07-16 12:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007_phase_1b'
down_revision = '006_phase_1a'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # DesiredIndexState
    op.create_table('desired_index_states',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('import_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_state_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('index_configuration_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('incarnation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['import_id'], ['repository_imports.id'], ),
        sa.ForeignKeyConstraint(['index_configuration_id'], ['index_configurations.id'], ),
        sa.ForeignKeyConstraint(['source_state_id'], ['source_states.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('incarnation_id')
    )
    op.create_index(op.f('ix_desired_index_states_import_id'), 'desired_index_states', ['import_id'], unique=False)

    # IndexRun
    op.create_table('index_runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('desired_state_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.Text(), nullable=False),
        sa.Column('error_diagnostics', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['desired_state_id'], ['desired_index_states.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_index_runs_desired_state_id'), 'index_runs', ['desired_state_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_index_runs_desired_state_id'), table_name='index_runs')
    op.drop_table('index_runs')

    op.drop_index(op.f('ix_desired_index_states_import_id'), table_name='desired_index_states')
    op.drop_table('desired_index_states')
