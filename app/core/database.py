import re

from sqlalchemy import asc, delete, desc, insert, select, update
from sqlalchemy.orm import class_mapper

from app.core.config import logger
from app.core.database_session import AsyncSessionLocal
from app.models.db_models import (
    ApiKey,
    TranslationHistory,
    User,
    UserGithubToken,
    UserSubscription,
    UserTranslationStats,
    Workspace,
    WorkspaceMember,
)

TABLE_MODEL_MAP = {
    "users": User,
    "user_subscriptions": UserSubscription,
    "workspaces": Workspace,
    "workspace_members": WorkspaceMember,
    "api_keys": ApiKey,
    "translation_history": TranslationHistory,
    "user_translation_stats": UserTranslationStats,
    "user_github_tokens": UserGithubToken
}

# Arch#2.5: Test-injection override globals removed.
# Tests should use unittest.mock.patch or pytest monkeypatch on supabase_request/supabase_request_list.
# Previously: supabase_request_override = None / supabase_request_list_override = None

def get_model_column(model, column_name):
    try:
        return getattr(model, column_name)
    except AttributeError:
        return None

def apply_filters(query, model, filters):
    for f in filters:
        if not f or f.startswith("select=") or f.startswith("order=") or f.startswith("limit="):
            continue

        f_parts = f.split("=", 1)
        if len(f_parts) < 2:
            continue
        field, op_val = f_parts[0], f_parts[1]

        col = get_model_column(model, field)
        if col is None:
            continue

        op_parts = op_val.split(".", 1)
        if len(op_parts) < 2:
            continue
        op, val = op_parts[0], op_parts[1]

        if op == "in":
            clean_list = val.strip("()").split(",")
            query = query.where(col.in_(clean_list))
        elif op == "eq":
            query = query.where(col == val)
        elif op == "neq":
            query = query.where(col != val)
        elif op == "gte":
            query = query.where(col >= val)
        elif op == "lte":
            query = query.where(col <= val)
        elif op == "gt":
            query = query.where(col > val)
        elif op == "lt":
            query = query.where(col < val)
        elif op == "is":
            if val.lower() == "null":
                query = query.where(col.is_(None))
            else:
                query = query.where(col.is_not(None))
    return query

async def supabase_request(method: str, path: str, data: dict = None) -> dict | None:
    method = method.upper()
    parts = path.split("?", 1)
    table_name = parts[0]
    query_str = parts[1] if len(parts) > 1 else ""

    model = TABLE_MODEL_MAP.get(table_name)
    if not model:
        logger.error(f"Table {table_name} not found in model map.")
        return None

    filters = query_str.split("&") if query_str else []

    async with AsyncSessionLocal() as session:
        try:
            if method == "GET":
                stmt = select(model)
                stmt = apply_filters(stmt, model, filters)

                order_match = re.search(r"order=([^&]+)", query_str)
                if order_match:
                    order_val = order_match.group(1)
                    order_parts = order_val.split(".", 1)
                    order_col = get_model_column(model, order_parts[0])
                    if order_col is not None:
                        direction = order_parts[1] if len(order_parts) > 1 else "asc"
                        stmt = stmt.order_by(desc(order_col) if direction.lower() == "desc" else asc(order_col))

                limit_match = re.search(r"limit=(\d+)", query_str)
                if limit_match:
                    stmt = stmt.limit(int(limit_match.group(1)))

                result = await session.execute(stmt)
                row = result.scalars().first()
                if row:
                    return {c.key: getattr(row, c.key) for c in class_mapper(row.__class__).columns}
                return {}

            elif method == "POST":
                stmt = insert(model).values(**data).returning(model)
                result = await session.execute(stmt)
                await session.commit()
                row = result.scalars().first()
                if row:
                    return {c.key: getattr(row, c.key) for c in class_mapper(row.__class__).columns}
                return {}

            elif method == "PATCH":
                stmt = update(model)
                stmt = apply_filters(stmt, model, filters)
                stmt = stmt.values(**data).returning(model)
                result = await session.execute(stmt)
                await session.commit()
                row = result.scalars().first()
                if row:
                    return {c.key: getattr(row, c.key) for c in class_mapper(row.__class__).columns}
                return {}

            elif method == "DELETE":
                stmt = delete(model)
                stmt = apply_filters(stmt, model, filters)
                stmt = stmt.returning(model)
                result = await session.execute(stmt)
                await session.commit()
                row = result.scalars().first()
                if row:
                    return {c.key: getattr(row, c.key) for c in class_mapper(row.__class__).columns}
                return {}

        except Exception as e:
            logger.error(f"SQLAlchemy request error for {method} {path}: {e}")
            await session.rollback()
            return None

async def supabase_request_list(path: str) -> list:
    parts = path.split("?", 1)
    table_name = parts[0]
    query_str = parts[1] if len(parts) > 1 else ""

    model = TABLE_MODEL_MAP.get(table_name)
    if not model:
        logger.error(f"Table {table_name} not found in model map.")
        return []

    filters = query_str.split("&") if query_str else []

    async with AsyncSessionLocal() as session:
        try:
            stmt = select(model)
            stmt = apply_filters(stmt, model, filters)

            order_match = re.search(r"order=([^&]+)", query_str)
            if order_match:
                order_val = order_match.group(1)
                order_parts = order_val.split(".", 1)
                order_col = get_model_column(model, order_parts[0])
                if order_col is not None:
                    direction = order_parts[1] if len(order_parts) > 1 else "asc"
                    stmt = stmt.order_by(desc(order_col) if direction.lower() == "desc" else asc(order_col))

            limit_match = re.search(r"limit=(\d+)", query_str)
            if limit_match:
                stmt = stmt.limit(int(limit_match.group(1)))

            result = await session.execute(stmt)
            rows = result.scalars().all()
            return [{c.key: getattr(row, c.key) for c in class_mapper(row.__class__).columns} for row in rows]

        except Exception as e:
            logger.error(f"SQLAlchemy list request error for {path}: {e}")
            return []

# H-6: Cache column set at module level — schema never changes at runtime.
# First call reflects the mapper once; subsequent calls return the cached set O(1).
_history_columns_cache: set[str] | None = None

async def get_history_columns() -> set[str]:
    """Return the column names of the TranslationHistory table.
    H-6: Cached at module level after the first call to avoid repeated ORM reflection.
    """
    global _history_columns_cache
    if _history_columns_cache is None:
        _history_columns_cache = {c.key for c in class_mapper(TranslationHistory).columns}
    return _history_columns_cache
