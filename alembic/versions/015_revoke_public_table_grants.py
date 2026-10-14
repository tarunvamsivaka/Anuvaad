"""Restrict PostgREST table privileges for client roles.

Revision ID: 015_revoke_public_table_grants
Revises: 014_fix_supabase_security_and_indexes
Create Date: 2026-10-04
"""

from collections.abc import Sequence
from typing import Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "015_revoke_public_table_grants"
down_revision: Union[str, Sequence[str], None] = "014_supabase_security_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Keep browser roles limited to the explicit public lead-capture insert."""
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public.landing_leads (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            email text NOT NULL,
            source text DEFAULT 'exit_intent',
            created_at timestamptz DEFAULT now()
        );
        """
    )
    op.execute("REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated")
    op.execute("REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated")
    op.execute("GRANT INSERT (email, source) ON TABLE public.landing_leads TO anon")
    # Keep future tables private when created by this migration role.
    op.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated")
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public "
        "REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated"
    )
    op.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated")
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public "
        "REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated"
    )


def downgrade() -> None:
    """Restore the prior broad ACLs if this hardening must be rolled back."""
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER "
        "ON ALL TABLES IN SCHEMA public TO anon, authenticated"
    )
    op.execute("GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated")
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        "GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER "
        "ON TABLES TO anon, authenticated"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public "
        "GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER "
        "ON TABLES TO anon, authenticated"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO anon, authenticated"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public "
        "GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO anon, authenticated"
    )
