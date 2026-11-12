"""
app/core/database.py — Forwarding shim for backward compatibility (CQ-03).
Canonical compatibility helpers now live in app.core.database_compat.
Modern database sessions and engines live in app.core.database_session.
"""

from app.core.database_compat import (  # noqa: F401
    check_db_health,
    get_history_columns,
    supabase_request,
    supabase_request_list,
)

__all__ = [
    "check_db_health",
    "get_history_columns",
    "supabase_request",
    "supabase_request_list",
]
