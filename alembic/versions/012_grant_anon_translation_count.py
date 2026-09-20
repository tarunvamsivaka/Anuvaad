"""Grant anon execute on get_total_translations_count RPC.

Creates (or replaces) the get_total_translations_count() Postgres function
with SECURITY DEFINER and grants EXECUTE to the anon and authenticated roles
used by the Supabase PostgREST layer.

Without this grant, the Next.js static-generation build logs a noisy
"permission denied for function get_total_translations_count" warning
because the /api/stats/translation-count route calls the RPC during ISR.
The function uses SECURITY DEFINER so it runs as the defining role,
preventing direct table access while exposing only the aggregate count.

Revision ID: 012_grant_anon_translation_count
Revises: 011_add_indexed_by_to_repo_embeddings
Create Date: 2026-09-20
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "012_grant_anon_translation_count"
down_revision = "011_add_indexed_by_to_repo_embeddings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create/replace the RPC function and grant execute to Supabase anon roles."""
    op.execute(
        """
        CREATE OR REPLACE FUNCTION get_total_translations_count()
        RETURNS integer
        LANGUAGE sql
        SECURITY DEFINER
        STABLE
        AS $$
            SELECT COUNT(*)::integer FROM translation_history;
        $$;
        """
    )
    # Grant to both roles used by Supabase PostgREST:
    # - anon:           unauthenticated RPC calls (used by the Next.js build)
    # - authenticated:  JWT-authenticated RPC calls
    op.execute("GRANT EXECUTE ON FUNCTION get_total_translations_count() TO anon;")
    op.execute("GRANT EXECUTE ON FUNCTION get_total_translations_count() TO authenticated;")


def downgrade() -> None:
    """Revoke grants and drop the function."""
    op.execute("REVOKE EXECUTE ON FUNCTION get_total_translations_count() FROM anon;")
    op.execute("REVOKE EXECUTE ON FUNCTION get_total_translations_count() FROM authenticated;")
    op.execute("DROP FUNCTION IF EXISTS get_total_translations_count();")
