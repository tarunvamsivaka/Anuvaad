"""
app/core/dependencies.py
FastAPI dependency composition root (BACK-01).

Provides clean, injectable dependencies for routers — replacing any remaining
module-level state access with proper FastAPI Depends() patterns.
"""

from fastapi import Request, HTTPException
from app.core.cache import CacheProxy


async def get_cache(request: Request) -> CacheProxy:
    """FastAPI dependency: retrieve the shared cache proxy from app state.

    Usage in a router:
        from app.core.dependencies import get_cache
        from fastapi import Depends

        @router.get("/example")
        async def example(cache: CacheProxy = Depends(get_cache)):
            val = await cache.get("key")
            ...
    """
    cache = getattr(request.app.state, "cache", None)
    if cache is None:
        # Fallback: import the module-level cache proxy directly.
        # This allows routers to work even when app.state.cache isn't set
        # (e.g., during testing without a full lifespan).
        from app.core.cache import cache as module_cache
        return module_cache
    return cache


async def get_current_user_email(request: Request) -> str | None:
    """FastAPI dependency: extract the authenticated user email from the request.

    Returns None for unauthenticated requests (public endpoints).
    Raises 401 if an Authorization header is present but invalid.

    Usage:
        @router.get("/protected")
        async def protected(email: str | None = Depends(get_current_user_email)):
            if not email:
                raise HTTPException(status_code=401, detail="Authentication required")
            ...
    """
    from app.core.auth import get_user_email
    from fastapi.security import HTTPAuthorizationCredentials

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1]
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    return await get_user_email(creds)


async def require_authenticated_user(
    email: str | None = None,
    request: Request = None,
) -> str:
    """Strict variant of get_current_user_email — raises 401 if not authenticated.

    Usage:
        @router.get("/auth-required")
        async def auth_required(email: str = Depends(require_authenticated_user)):
            ...  # email is guaranteed non-None here
    """
    if email is None and request is not None:
        email = await get_current_user_email(request)

    if not email:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in to continue.",
        )
    return email
