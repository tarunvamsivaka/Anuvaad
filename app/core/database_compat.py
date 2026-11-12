"""
app/core/database_compat.py — Deprecated database compatibility helpers.
CQ-03: Renamed from database.py to clarify that modern operations use
app.repositories and app.core.database_session.
"""

import warnings

from sqlalchemy import text
from sqlalchemy.orm import class_mapper

from app.core.config import logger
from app.core.database_session import AsyncSessionLocal
from app.models.db_models import TranslationHistory


async def check_db_health() -> bool:
    """Execute a simple SELECT 1 against PostgreSQL to verify connectivity."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        return False


async def supabase_request(method: str, path: str, data: dict = None) -> dict | None:
    """Deprecated legacy Supabase REST helper. Replaced by typed SQLAlchemy repositories."""
    warnings.warn(
        "supabase_request is deprecated and retired. Use ORM repositories in app.repositories instead.",
        category=DeprecationWarning,
        stacklevel=2,
    )
    logger.warning("DEPRECATED: supabase_request is deprecated and retired. Use ORM repositories instead.")
    return None


async def supabase_request_list(path: str) -> list:
    """Deprecated legacy Supabase REST helper. Replaced by typed SQLAlchemy repositories."""
    warnings.warn(
        "supabase_request_list is deprecated and retired. Use ORM repositories in app.repositories instead.",
        category=DeprecationWarning,
        stacklevel=2,
    )
    logger.warning("DEPRECATED: supabase_request_list is deprecated and retired. Use ORM repositories instead.")
    return []


# H-6: Cache column set at module level — schema never changes at runtime.
_history_columns_cache: set[str] | None = None


async def get_history_columns() -> set[str]:
    """Return the column names of the TranslationHistory table.
    H-6: Cached at module level after the first call to avoid repeated ORM reflection.
    """
    global _history_columns_cache
    if _history_columns_cache is None:
        _history_columns_cache = {c.key for c in class_mapper(TranslationHistory).columns}
    return _history_columns_cache
