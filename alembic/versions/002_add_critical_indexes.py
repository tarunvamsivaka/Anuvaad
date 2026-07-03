"""Add critical database indexes for query performance

Revision ID: 002_add_critical_indexes
Revises: 001_encrypt_github_tokens
Create Date: 2026-07-02

FIX-03 (P0-05): Adds composite and single-column indexes on the most queried
columns to prevent full table scans at 10,000+ DAU scale.

Key indexes:
  - translation_history(user_email, created_at DESC) — primary list query
  - workspace_members(workspace_id)                  — workspace member lookup
  - workspaces(owner_email)                          — workspace list by owner
  - translation_history(workspace_id)                — workspace history filter
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "002_add_critical_indexes"
down_revision = "001_encrypt_github_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Composite index for the most common history query: WHERE user_email = ? ORDER BY created_at DESC
    op.create_index(
        "ix_translation_history_user_created",
        "translation_history",
        ["user_email", "created_at"],
        postgresql_ops={"created_at": "DESC"},
    )

    # Index for workspace member lookup (foreign key join without explicit FK constraint)
    op.create_index(
        "ix_workspace_members_workspace",
        "workspace_members",
        ["workspace_id"],
    )

    # Index for listing workspaces owned by a user
    op.create_index(
        "ix_workspaces_owner",
        "workspaces",
        ["owner_email"],
    )

    # Index for filtering history by workspace
    op.create_index(
        "ix_translation_history_workspace",
        "translation_history",
        ["workspace_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_translation_history_user_created", table_name="translation_history")
    op.drop_index("ix_workspace_members_workspace", table_name="workspace_members")
    op.drop_index("ix_workspaces_owner", table_name="workspaces")
    op.drop_index("ix_translation_history_workspace", table_name="translation_history")
