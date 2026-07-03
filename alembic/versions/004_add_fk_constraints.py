"""Add foreign key constraints and workspace role CHECK constraint

Revision ID: 004_add_fk_constraints
Revises: 003_argon2_api_key_hashing
Create Date: 2026-07-02

FIX-28 (P2-09): Database referential integrity enforcement.

Without FK constraints orphaned workspace_members and api_keys rows can
accumulate silently when workspaces are deleted.  The CHECK constraint on
workspace_members.role prevents any value outside the allowed set from being
stored — catching bugs at the database layer before they propagate.

Pre-migration cleanup: deletes any orphaned rows so the constraints can be
applied without conflict errors.
"""
from alembic import op
import sqlalchemy as sa


revision = "004_add_fk_constraints"
down_revision = "003_argon2_api_key_hashing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Clean orphaned rows before adding FK constraints ──
    op.execute("""
        DELETE FROM workspace_members
        WHERE workspace_id NOT IN (SELECT id FROM workspaces)
    """)
    op.execute("""
        DELETE FROM translation_history
        WHERE workspace_id IS NOT NULL
          AND workspace_id NOT IN (SELECT id FROM workspaces)
    """)
    op.execute("""
        DELETE FROM api_keys
        WHERE workspace_id IS NOT NULL
          AND workspace_id NOT IN (SELECT id FROM workspaces)
    """)

    # ── 2. Add FK constraints with CASCADE deletes ──
    op.create_foreign_key(
        "fk_workspace_members_workspace",
        "workspace_members", "workspaces",
        ["workspace_id"], ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_api_keys_workspace",
        "api_keys", "workspaces",
        ["workspace_id"], ["id"],
        ondelete="CASCADE",
    )

    # ── 3. CHECK constraint on workspace role ──
    op.execute("""
        ALTER TABLE workspace_members
        ADD CONSTRAINT chk_workspace_role
        CHECK (role IN ('owner', 'admin', 'member'))
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS chk_workspace_role")
    op.drop_constraint("fk_api_keys_workspace", "api_keys", type_="foreignkey")
    op.drop_constraint("fk_workspace_members_workspace", "workspace_members", type_="foreignkey")
