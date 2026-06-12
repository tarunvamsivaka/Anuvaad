import re
from supabase import create_client, Client
from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, logger

supabase_client: Client = None

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("Supabase python client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Database client disabled.")


def parse_postgrest_path(client: Client, method: str, path: str, data: dict = None):
    """
    Parses a PostgREST path (e.g. 'table?col=eq.val') and translates it
    into a Supabase Python SDK builder query.
    """
    # Split table name from query parameters
    parts = path.split("?", 1)
    table_name = parts[0]
    query_str = parts[1] if len(parts) > 1 else ""

    query = client.table(table_name)

    # Resolve Select fields
    select_fields = "*"
    select_match = re.search(r"select=([^&]+)", query_str)
    if select_match:
        select_fields = select_match.group(1)

    # Initial query construction
    if method == "GET":
        query = query.select(select_fields)
    elif method == "POST":
        query = query.insert(data)
    elif method == "PATCH":
        query = query.update(data)
    elif method == "DELETE":
        query = query.delete()

    # Parse and apply filters
    filters = query_str.split("&")
    for f in filters:
        if not f or f.startswith("select=") or f.startswith("order="):
            continue
        # Split on the first '='
        f_parts = f.split("=", 1)
        if len(f_parts) < 2:
            continue
        field, op_val = f_parts[0], f_parts[1]
        
        # Split operator from target value
        op_parts = op_val.split(".", 1)
        if len(op_parts) < 2:
            continue
        op, val = op_parts[0], op_parts[1]

        # Map filter operators
        if op == "in":
            # Format: in.(val1,val2)
            clean_list = val.strip("()").split(",")
            query = query.in_(field, clean_list)
        elif op == "eq":
            query = query.eq(field, val)
        elif op == "neq":
            query = query.neq(field, val)
        elif op == "gte":
            query = query.gte(field, val)
        elif op == "lte":
            query = query.lte(field, val)
        elif op == "is":
            # Handle is.null and is.not.null
            if val.lower() == "null":
                query = query.is_(field, None)
            else:
                query = query.not_.is_(field, None)

    # Parse limit constraint
    limit_match = re.search(r"limit=(\d+)", query_str)
    if limit_match:
        query = query.limit(int(limit_match.group(1)))

    # Parse sorting constraints
    order_match = re.search(r"order=([^&]+)", query_str)
    if order_match:
        order_val = order_match.group(1)
        order_parts = order_val.split(".", 1)
        col = order_parts[0]
        direction = order_parts[1] if len(order_parts) > 1 else "asc"
        desc = direction.lower() == "desc"
        query = query.order(col, desc=desc)

    return query


async def supabase_request(method: str, path: str, data: dict = None) -> dict | None:
    """
    Make an database query using the official Supabase Client.
    Maintains compatibility with legacy direct PostgREST string callers.
    """
    import sys
    import inspect
    main_mod = sys.modules.get("main")
    if main_mod:
        main_func = getattr(main_mod, "supabase_request", None)
        if main_func and main_func is not _orig_supabase_request:
            res = main_func(method, path, data)
            if inspect.isawaitable(res):
                return await res
            return res
        
        # Test mock checking for disabled DB
        url = getattr(main_mod, "SUPABASE_URL", "dummy")
        key = getattr(main_mod, "SUPABASE_SERVICE_KEY", "dummy")
        if url is None or key is None or not url or not key:
            logger.warning("Supabase client disabled via config patch — skipping DB operation")
            return None

    if not supabase_client:
        logger.warning("Supabase client not initialized — skipping DB operation")
        return None

    try:
        query = parse_postgrest_path(supabase_client, method, path, data)
        loop = None
        import asyncio
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            pass

        if loop:
            resp = await loop.run_in_executor(None, query.execute)
        else:
            resp = query.execute()

        result = resp.data
        if isinstance(result, list):
            return result[0] if result else {}
        return result
    except Exception as e:
        logger.error(f"Supabase request error via SDK: {e}")
        return None

_orig_supabase_request = supabase_request


async def supabase_request_list(path: str) -> list:
    """
    GET helper that returns lists (for multi-row tables).
    """
    import sys
    import inspect
    main_mod = sys.modules.get("main")
    if main_mod:
        main_func = getattr(main_mod, "supabase_request_list", None)
        if main_func and main_func is not _orig_supabase_request_list:
            res = main_func(path)
            if inspect.isawaitable(res):
                return await res
            return res


        # Test mock checking for disabled DB
        url = getattr(main_mod, "SUPABASE_URL", "dummy")
        key = getattr(main_mod, "SUPABASE_SERVICE_KEY", "dummy")
        if url is None or key is None or not url or not key:
            return []

    if not supabase_client:
        return []

    try:
        query = parse_postgrest_path(supabase_client, "GET", path)
        loop = None
        import asyncio
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            pass

        if loop:
            resp = await loop.run_in_executor(None, query.execute)
        else:
            resp = query.execute()

        result = resp.data
        return result if isinstance(result, list) else [result] if result else []
    except Exception as e:
        logger.error(f"Supabase list request error via SDK: {e}")
        return []

_orig_supabase_request_list = supabase_request_list


_history_columns = None


async def get_history_columns() -> set[str]:
    """Dynamically get the columns of the translation_history table from PostgREST."""
    global _history_columns
    if _history_columns is not None:
        return _history_columns

    fallback = {"id", "user_email", "mode", "source_language", "target_language", "input_preview", "workspace_id"}
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return fallback

    try:
        from app.core.config import get_http_client
        headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        }
        client = await get_http_client()
        resp = await client.get(f"{SUPABASE_URL}/rest/v1/", headers=headers, timeout=5.0)
        if resp.status_code == 200:
            definitions = resp.json().get("definitions", {})
            table_def = definitions.get("translation_history", {})
            properties = table_def.get("properties", {})
            if properties:
                _history_columns = set(properties.keys())
                logger.info(f"Dynamically resolved translation_history columns: {_history_columns}")
                return _history_columns
    except Exception as e:
        logger.warning(f"Error fetching translation_history table columns: {e}")

    return fallback

