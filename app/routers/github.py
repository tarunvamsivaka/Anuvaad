from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Depends
import os
import httpx
from app.queue.tasks import process_github_repo_task
from app.core.auth import get_user_email
from app.core.database import supabase_request
import logging
from datetime import datetime, timezone

router = APIRouter()
logger = logging.getLogger("anuvaad")

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

@router.get("/oauth/github/login")
async def github_login(request: Request):
    """Initiates GitHub OAuth flow."""
    redirect_uri = f"{FRONTEND_URL}/api/auth/github/callback"
    auth_url = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&redirect_uri={redirect_uri}&scope=repo"
    return {"auth_url": auth_url}

@router.post("/oauth/github/callback")
async def github_callback(code: str, user_email: str = Depends(get_user_email)):
    """Handles GitHub OAuth callback to exchange code for token."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code
                },
                headers={"Accept": "application/json"}
            )
            data = resp.json()
            if "access_token" in data:
                # Save the token to user profile or session
                token = data["access_token"]

                # Check if exists
                existing = await supabase_request("GET", f"user_github_tokens?user_email=eq.{user_email}")
                if existing and isinstance(existing, list) and len(existing) > 0:
                    await supabase_request("PATCH", f"user_github_tokens?user_email=eq.{user_email}", {
                        "access_token": token,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    })
                else:
                    await supabase_request("POST", "user_github_tokens", {
                        "user_email": user_email,
                        "access_token": token,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    })

                return {"message": "GitHub connected successfully", "access_token": token}
            else:
                raise HTTPException(status_code=400, detail="Failed to get access token")
    except Exception as e:
        logger.error(f"GitHub OAuth Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/github/repos")
async def get_github_repos(user_email: str = Depends(get_user_email)):
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    tokens = await supabase_request("GET", f"user_github_tokens?user_email=eq.{user_email}")
    if not tokens or not isinstance(tokens, list) or len(tokens) == 0:
        raise HTTPException(status_code=404, detail="GitHub account not connected")

    access_token = tokens[0].get("access_token")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.github.com/user/repos",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                params={"sort": "updated", "per_page": 100}
            )
            if resp.status_code == 401:
                # Token might be revoked
                raise HTTPException(status_code=401, detail="GitHub token expired or revoked")
            resp.raise_for_status()

            # Filter and map response
            repos = resp.json()
            return [{"full_name": repo["full_name"], "private": repo["private"], "updated_at": repo["updated_at"]} for repo in repos]
    except Exception as e:
        logger.error(f"Failed to fetch GitHub repos: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch repositories")

@router.post("/github/webhook")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """Listens for GitHub App installation events."""
    payload = await request.json()
    event = request.headers.get("X-GitHub-Event")

    if event == "installation" and payload.get("action") == "created":
        installation_id = payload.get("installation", {}).get("id")
        repos = payload.get("repositories", [])
        for repo in repos:
            repo_name = repo.get("full_name")
            # Dispatch background job to clone repo and generate embeddings
            process_github_repo_task.delay(repo_name, installation_id)

    return {"status": "ok"}
