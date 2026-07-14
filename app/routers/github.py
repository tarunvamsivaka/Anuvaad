"""
app/routers/github.py

GitHub OAuth integration — connect user account, list repos, trigger processing.

FIX-01 (P0-01): GitHub OAuth tokens are now Fernet-encrypted before storage.
    - encrypt_token() is called when saving the token.
    - decrypt_token() is called when reading the token back.
FIX-26 (P2-01): Token storage/retrieval now goes through the SQLAlchemy ORM
    (app/repositories/github_token.py) instead of ad-hoc supabase_request() calls.
FIX-30 (P3-04): Removed redundant `if not user_email` guards.
FIX-25 (P1-10/A10): httpx client used with follow_redirects=False.
"""
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from app.core.auth import get_user_email
from app.core.logging import logger
from app.queue.tasks import process_github_repo_task

UTC = timezone.utc  # datetime.UTC requires Python 3.11+; alias for 3.10 compat

router = APIRouter()

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


@router.get("/oauth/github/login")
async def github_login(request: Request):
    """Initiates GitHub OAuth flow."""
    redirect_uri = f"{FRONTEND_URL}/api/auth/github/callback"
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=repo"
    )
    return {"auth_url": auth_url}


@router.post("/oauth/github/callback")
async def github_callback(code: str, user_email: str = Depends(get_user_email)):
    """Handle GitHub OAuth callback — exchange code for token.

    FIX-01: Token is Fernet-encrypted before DB storage.
    FIX-26: Uses ORM repository instead of supabase_request().
    """
    try:
        # FIX-25: follow_redirects=False prevents SSRF via redirect chains
        async with httpx.AsyncClient(follow_redirects=False) as client:
            resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )
            data = resp.json()
            if "access_token" not in data:
                raise HTTPException(status_code=400, detail="Failed to get access token from GitHub")

            plaintext_token = data["access_token"]

            from app.repositories.github_token import save_github_token
            success = await save_github_token(user_email, plaintext_token)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to save GitHub token")

            # Return the plaintext token to the client (one-time only).
            # The frontend stores it in session/memory — never on disk.
            return {"message": "GitHub connected successfully", "access_token": plaintext_token}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("GitHub OAuth error", error=str(e))
        raise HTTPException(status_code=500, detail="Internal Server Error")


async def _get_github_token(user_email: str) -> str:
    """Retrieve and decrypt the stored GitHub OAuth token for a user.

    FIX-01: Transparently decrypts Fernet-encrypted tokens.
    FIX-26: ORM-based lookup.
    """
    from app.repositories.github_token import get_github_token
    token = await get_github_token(user_email)
    if not token:
        raise HTTPException(status_code=404, detail="GitHub account not connected")
    return token


@router.get("/github/repos")
async def get_github_repos(user_email: str = Depends(get_user_email)):
    """Return the GitHub repositories for the authenticated user.

    FIX-26: ORM-based token retrieval. FIX-30: Removed redundant auth guard.
    """
    access_token = await _get_github_token(user_email)

    try:
        # FIX-25: No redirects to prevent SSRF
        async with httpx.AsyncClient(follow_redirects=False) as client:
            resp = await client.get(
                "https://api.github.com/user/repos",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json",
                },
                params={"per_page": 100, "sort": "updated"},
            )
            if resp.status_code == 401:
                raise HTTPException(status_code=401, detail="GitHub token expired. Please reconnect.")
            resp.raise_for_status()
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("GitHub repos fetch error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch GitHub repositories")


@router.post("/github/process-repo")
async def process_github_repo(
    repo_name: str,
    background_tasks: BackgroundTasks,
    user_email: str = Depends(get_user_email),
):
    """Enqueue a background task to process a GitHub repository.

    FIX-30: Removed redundant auth guard.
    """
    if not repo_name:
        raise HTTPException(status_code=400, detail="repo_name is required")

    # Verify the user has a connected GitHub token before enqueuing
    await _get_github_token(user_email)

    process_github_repo_task.delay(repo_name)
    return {"message": f"Repository processing started for {repo_name}"}


@router.delete("/github/disconnect")
async def disconnect_github(user_email: str = Depends(get_user_email)):
    """Remove the stored GitHub OAuth token for the authenticated user."""
    from app.repositories.github_token import delete_github_token
    await delete_github_token(user_email)
    return {"message": "GitHub account disconnected"}
