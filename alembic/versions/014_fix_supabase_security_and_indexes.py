"""fix_supabase_security_and_indexes

Enables Row Level Security on the 11 repository domain tables, adds service_role
and workspace read policies, drops duplicate indexes on api_keys, and secures
get_total_translations_count() by setting an immutable search_path and restricting
execution to the service_role.

Revision ID: 014_fix_supabase_security_and_indexes
Revises: b2e4f8a1c3d7
Create Date: 2026-09-30
"""

from collections.abc import Sequence
from typing import Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "014_fix_supabase_security_and_indexes"
down_revision: Union[str, Sequence[str], None] = "b2e4f8a1c3d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply RLS hardening, index deduplication, and function security."""
    # 1. Enable RLS on repository domain tables
    tables = [
        "desired_index_states",
        "index_configurations",
        "index_runs",
        "repository_imports",
        "repository_linked_history",
        "searchable_materializations",
        "semantic_artifacts",
        "source_states",
        "structural_files",
        "structural_imports",
        "structural_symbols",
    ]
    for table in tables:
        op.execute(f"ALTER TABLE IF EXISTS public.{table} ENABLE ROW LEVEL SECURITY;")

    # 2. Add service_role and workspace access policies
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'desired_index_states' AND policyname = 'service_role_desired_index_states') THEN
                CREATE POLICY "service_role_desired_index_states" ON public.desired_index_states FOR ALL TO service_role USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'index_configurations' AND policyname = 'service_role_index_configurations') THEN
                CREATE POLICY "service_role_index_configurations" ON public.index_configurations FOR ALL TO service_role USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'index_runs' AND policyname = 'service_role_index_runs') THEN
                CREATE POLICY "service_role_index_runs" ON public.index_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repository_imports' AND policyname = 'service_role_repository_imports') THEN
                CREATE POLICY "service_role_repository_imports" ON public.repository_imports FOR ALL TO service_role USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repository_linked_history' AND policyname = 'service_role_repository_linked_history') THEN
                CREATE POLICY "service_role_repository_linked_history" ON public.repository_linked_history FOR ALL TO service_role USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'searchable_materializations' AND policyname = 'service_role_searchable_materializations') THEN
                CREATE POLICY "service_role_searchable_materializations" ON public.searchable_materializations FOR ALL TO service_role USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'semantic_artifacts' AND policyname = 'service_role_semantic_artifacts') THEN
                CREATE POLICY "service_role_semantic_artifacts" ON public.semantic_artifacts FOR ALL TO service_role USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'source_states' AND policyname = 'service_role_source_states') THEN
                CREATE POLICY "service_role_source_states" ON public.source_states FOR ALL TO service_role USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'structural_files' AND policyname = 'service_role_structural_files') THEN
                CREATE POLICY "service_role_structural_files" ON public.structural_files FOR ALL TO service_role USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'structural_imports' AND policyname = 'service_role_structural_imports') THEN
                CREATE POLICY "service_role_structural_imports" ON public.structural_imports FOR ALL TO service_role USING (true) WITH CHECK (true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'structural_symbols' AND policyname = 'service_role_structural_symbols') THEN
                CREATE POLICY "service_role_structural_symbols" ON public.structural_symbols FOR ALL TO service_role USING (true) WITH CHECK (true);
            END IF;

            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repository_imports' AND policyname = 'Users can view workspace repository imports') THEN
                CREATE POLICY "Users can view workspace repository imports" ON public.repository_imports FOR SELECT TO authenticated USING (workspace_id IN (SELECT private.get_user_workspaces()));
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repository_linked_history' AND policyname = 'Users can view workspace linked history') THEN
                CREATE POLICY "Users can view workspace linked history" ON public.repository_linked_history FOR SELECT TO authenticated USING (workspace_id IN (SELECT private.get_user_workspaces()));
            END IF;
        END $$;
        """
    )

    # 3. Drop redundant duplicate indexes on api_keys
    op.execute("DROP INDEX IF EXISTS public.ix_api_keys_key_prefix;")
    op.execute("DROP INDEX IF EXISTS public.ix_api_keys_user_email;")

    # 4. Secure get_total_translations_count with immutable search_path and service_role grant
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.get_total_translations_count()
        RETURNS integer
        LANGUAGE sql
        SECURITY DEFINER
        STABLE
        SET search_path = ''
        AS $$
            SELECT COUNT(*)::integer FROM public.translation_history;
        $$;
        REVOKE EXECUTE ON FUNCTION public.get_total_translations_count() FROM anon, authenticated, public;
        GRANT EXECUTE ON FUNCTION public.get_total_translations_count() TO service_role;
        """
    )


def downgrade() -> None:
    """Revert RLS and security definer function configuration."""
    op.execute("GRANT EXECUTE ON FUNCTION public.get_total_translations_count() TO anon, authenticated;")
