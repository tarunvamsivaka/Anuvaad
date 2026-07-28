"""
app/db/repositories/translation_repo.py

Compatibility module re-exporting translation repository functionality from app.repositories.translation.
"""

from app.repositories.translation import (
    _is_workspace_member_or_owner,
    delete_all_for_user,
    delete_by_id,
    get_by_id,
    get_count_since,
    get_history,
    prune_oldest,
    save,
    update_share_status,
)

__all__ = [
    "_is_workspace_member_or_owner",
    "delete_all_for_user",
    "delete_by_id",
    "get_by_id",
    "get_count_since",
    "get_history",
    "prune_oldest",
    "save",
    "update_share_status",
]
