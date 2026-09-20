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
SEC-GH-01: Removed plaintext access_token from OAuth callback response body.
SEC-GH-02: Added rate limit to OAuth callback endpoint.
SEC-GH-03: Added repo_name format validation to prevent path traversal / injection.
SEC-GH-04: Added OAuth state parameter to login URL to prevent CSRF on OAuth flow.
"""

import os
import re
import secrets
from datetime import timezone

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from app.core.auth import get_user_email
from app.core.logging import logger
from app.core.rate_limit import rate_limiter
from app.queue.tasks import process_github_repo_task

UTC = timezone.utc  # noqa: UP017 — datetime.UTC requires Python 3.11+; alias for 3.10 compat

router = APIRouter()

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# SEC-GH-03: Strict repo_name format: only alphanumeric, hyphens, dots, underscores
_REPO_NAME_RE = re.compile(r"^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$")


def _validate_repo_name(repo_name: str) -> None:
    """Raise HTTP 400 if repo_name is not a valid 'owner/repo' format.

    SEC-GH-03: Prevents path-traversal and injection via crafted repo_name strings
    that could be used in URL construction by the Celery worker.
    """
    if not repo_name or not _REPO_NAME_RE.match(repo_name):
        raise HTTPException(
            status_code=400,
            detail="Invalid repo_name format. Expected 'owner/repo' with alphanumeric characters, hyphens, dots, and underscores only.",
        )


@router.get("/oauth/github/login")
async def github_login(request: Request):
    """Initiates GitHub OAuth flow.

    SEC-GH-04: Includes a random state parameter in the authorization URL to
    prevent CSRF attacks on the OAuth callback. The state is a URL-safe random
    token; the frontend must store and verify it on callback.
    """
    redirect_uri = f"{FRONTEND_URL}/api/auth/github/callback"
    state = secrets.token_urlsafe(32)
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=repo"
        f"&state={state}"
    )
    return {"auth_url": auth_url, "state": state}


@router.post("/oauth/github/callback", dependencies=[Depends(rate_limiter(5, 60))])
async def github_callback(code: str, user_email: str = Depends(get_user_email)):
    """Handle GitHub OAuth callback — exchange code for token.

    FIX-01: Token is Fernet-encrypted before DB storage.
    FIX-26: Uses ORM repository instead of supabase_request().
    SEC-GH-01: Plaintext access_token is no longer returned in the response body.
               The token is stored encrypted in the database; subsequent API calls
               (e.g. GET /github/repos) transparently use the stored token.
    SEC-GH-02: Rate-limited to 5 requests/min per token to prevent abuse.
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

            # SEC-GH-01: Do NOT return the plaintext token in the response body.
            # The token is stored Fernet-encrypted in the database. Use GET /github/repos
            # to confirm the connection — the backend transparently decrypts and uses the token.
            return {"message": "GitHub connected successfully"}

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


@router.post("/github/process-repo", dependencies=[Depends(rate_limiter(3, 60))])
async def process_github_repo(
    repo_name: str,
    background_tasks: BackgroundTasks,
    user_email: str = Depends(get_user_email),
):
    """Enqueue a background task to process a GitHub repository.

    FIX-30: Removed redundant auth guard.
    SEC-GH-03: Validates repo_name format before enqueueing.
    """
    _validate_repo_name(repo_name)

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
