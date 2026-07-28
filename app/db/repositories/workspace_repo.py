"""
app/db/repositories/workspace_repo.py

Compatibility module re-exporting workspace repository functionality from app.repositories.workspace.
"""

from app.repositories.workspace import (
    add_member,
    create_workspace,
    delete_all_members,
    delete_workspace,
    get_member,
    get_members,
    get_workspaces,
    remove_member,
)

__all__ = [
    "add_member",
    "create_workspace",
    "delete_all_members",
    "delete_workspace",
    "get_member",
    "get_members",
    "get_workspaces",
    "remove_member",
]
