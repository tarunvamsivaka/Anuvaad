from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Depends
import os
import httpx
from app.queue.tasks import process_github_repo_task
from app.core.auth import get_user_email
import logging

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
                # Trigger repository fetching if they install an app
                return {"message": "GitHub connected successfully", "access_token": data["access_token"]}
            else:
                raise HTTPException(status_code=400, detail="Failed to get access token")
    except Exception as e:
        logger.error(f"GitHub OAuth Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

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
