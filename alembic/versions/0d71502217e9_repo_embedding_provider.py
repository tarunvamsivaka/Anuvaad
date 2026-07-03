"""repo_embedding_provider

Revision ID: 0d71502217e9
Revises: 8d3045f704c7
Create Date: 2026-06-27 16:43:05.274070

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '0d71502217e9'
down_revision: Union[str, Sequence[str], None] = '8d3045f704c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add provider column
    op.add_column('repo_embeddings', sa.Column('provider', sa.Text(), server_default='hf', nullable=False))
    
    # We must truncate the table because Postgres cannot automatically cast 
    # a 384-dimensional vector into a 1536-dimensional vector.
    op.execute('TRUNCATE TABLE repo_embeddings')

    # Change embedding vector dimension from 384 to 1536
    op.alter_column('repo_embeddings', 'embedding',
               existing_type=Vector(384),
               type_=Vector(1536),
               existing_nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Revert embedding vector dimension back to 384
    op.alter_column('repo_embeddings', 'embedding',
               existing_type=Vector(1536),
               type_=Vector(384),
               existing_nullable=True)
               
    # Drop provider column
    op.drop_column('repo_embeddings', 'provider')
