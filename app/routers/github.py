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

UTC = timezone.utc  # datetime.UTC requires Python 3.11+; alias for 3.10 compat

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from app.core.auth import get_user_email
from app.core.logging import logger
from app.core.token_encryption import decrypt_token, encrypt_token, is_encrypted
from app.queue.tasks import process_github_repo_task

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

            # FIX-01 (P0-01): Encrypt the token before storing it
            encrypted = encrypt_token(plaintext_token)

            # FIX-26 (P2-01): ORM-based upsert
            from sqlalchemy import select

            from app.core.database_session import AsyncSessionLocal
            from app.models.db_models import UserGithubToken

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(UserGithubToken).where(UserGithubToken.user_email == user_email)
                )
                existing = result.scalars().first()
                if existing:
                    existing.access_token = encrypted
                    existing.updated_at = datetime.now(UTC)
                else:
                    session.add(UserGithubToken(
                        user_email=user_email,
                        access_token=encrypted,
                        updated_at=datetime.now(UTC),
                    ))
                await session.commit()

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
    from sqlalchemy import select

    from app.core.database_session import AsyncSessionLocal
    from app.models.db_models import UserGithubToken

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserGithubToken).where(UserGithubToken.user_email == user_email)
        )
        row = result.scalars().first()

    if not row:
        raise HTTPException(status_code=404, detail="GitHub account not connected")

    token = row.access_token
    # Transparently handle tokens that were stored before the encryption migration
    if is_encrypted(token):
        try:
            token = decrypt_token(token)
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to decrypt GitHub token")
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
    from sqlalchemy import delete

    from app.core.database_session import AsyncSessionLocal
    from app.models.db_models import UserGithubToken

    async with AsyncSessionLocal() as session:
        await session.execute(
            delete(UserGithubToken).where(UserGithubToken.user_email == user_email)
        )
        await session.commit()
    return {"message": "GitHub account disconnected"}
