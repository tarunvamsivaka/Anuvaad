"""baseline_and_new_tables

Revision ID: 7af437a6b3ae
Revises: 
Create Date: 2026-06-17 23:51:22.643307

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy


# revision identifiers, used by Alembic.
revision: str = '7af437a6b3ae'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.translation_history (
            id UUID PRIMARY KEY,
            user_email TEXT,
            is_public BOOLEAN DEFAULT FALSE,
            char_count INTEGER DEFAULT 0,
            block_count INTEGER DEFAULT 0,
            blocks JSONB,
            character_count INTEGER DEFAULT 0,
            target_language TEXT,
            source_language TEXT,
            mode TEXT,
            file_path TEXT,
            model_used TEXT,
            title TEXT,
            session_id TEXT,
            repository_name TEXT,
            input_preview TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)

    op.execute('ALTER TABLE public.translation_history ADD COLUMN IF NOT EXISTS session_id TEXT;')
    op.execute('ALTER TABLE public.translation_history ADD COLUMN IF NOT EXISTS repository_name TEXT;')
    op.execute('ALTER TABLE public.translation_history ADD COLUMN IF NOT EXISTS file_path TEXT;')
    op.execute('CREATE INDEX IF NOT EXISTS idx_translation_history_session_id ON public.translation_history(session_id);')

    op.create_table(
        'payment_transactions',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_id', sa.Text(), nullable=False),
        sa.Column('payload', sa.dialects.postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('status', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payment_transactions_event_id'), 'payment_transactions', ['event_id'], unique=True)

    op.create_table(
        'llm_semantic_cache',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('prompt_hash', sa.Text(), nullable=False),
        sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=1536), nullable=True),
        sa.Column('response', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_llm_semantic_cache_prompt_hash'), 'llm_semantic_cache', ['prompt_hash'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_llm_semantic_cache_prompt_hash'), table_name='llm_semantic_cache')
    op.drop_table('llm_semantic_cache')
    op.drop_index(op.f('ix_payment_transactions_event_id'), table_name='payment_transactions')
    op.drop_table('payment_transactions')
    
    op.execute('DROP INDEX IF EXISTS idx_translation_history_session_id;')
    op.execute('ALTER TABLE public.translation_history DROP COLUMN IF EXISTS file_path;')
    op.execute('ALTER TABLE public.translation_history DROP COLUMN IF EXISTS repository_name;')
    op.execute('ALTER TABLE public.translation_history DROP COLUMN IF EXISTS session_id;')
