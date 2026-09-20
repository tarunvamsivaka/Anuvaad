"""Phase 2: Half-precision vector optimization and IVFFlat indexing.

Converts vector embeddings in semantic_artifacts, repo_embeddings, and llm_semantic_cache
to halfvec(1536) to reduce storage footprint by 50% within Supabase's 500 MB limit,
and adds IVFFlat indexing with cosine distance for accelerated retrieval.

Revision ID: 013_halfvec_and_ivfflat
Revises: 012_grant_anon_translation_count
Create Date: 2026-09-20
"""

from alembic import op

revision = "013_halfvec_and_ivfflat"
down_revision = "012_grant_anon_translation_count"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Convert columns to halfvec(1536)
        op.execute("ALTER TABLE semantic_artifacts ALTER COLUMN embedding TYPE halfvec(1536) USING embedding::halfvec;")
        op.execute("ALTER TABLE repo_embeddings ALTER COLUMN embedding TYPE halfvec(1536) USING embedding::halfvec;")
        op.execute("ALTER TABLE llm_semantic_cache ALTER COLUMN embedding TYPE halfvec(1536) USING embedding::halfvec;")

        # Create IVFFlat indexes with lists = 100 for cosine distance
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_semantic_artifacts_embedding_ivfflat "
            "ON semantic_artifacts USING ivfflat (embedding halfvec_cosine_ops) WITH (lists = 100);"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_repo_embeddings_embedding_ivfflat "
            "ON repo_embeddings USING ivfflat (embedding halfvec_cosine_ops) WITH (lists = 100);"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_llm_semantic_cache_embedding_ivfflat "
            "ON llm_semantic_cache USING ivfflat (embedding halfvec_cosine_ops) WITH (lists = 100);"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_llm_semantic_cache_embedding_ivfflat;")
        op.execute("DROP INDEX IF EXISTS ix_repo_embeddings_embedding_ivfflat;")
        op.execute("DROP INDEX IF EXISTS ix_semantic_artifacts_embedding_ivfflat;")

        op.execute("ALTER TABLE llm_semantic_cache ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector;")
        op.execute("ALTER TABLE repo_embeddings ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector;")
        op.execute("ALTER TABLE semantic_artifacts ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector;")
