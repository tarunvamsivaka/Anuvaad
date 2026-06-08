import httpx
from fastapi import APIRouter, Depends, HTTPException
from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, logger, metrics, get_http_client
from app.core.cache import cache
from app.core.auth import get_user_email
from app.core.database import supabase_request, supabase_request_list
from app.models.schemas import WorkspaceCreate, WorkspaceInvite

router = APIRouter(prefix="/api", tags=["workspaces"])

@router.post("/workspaces")
async def create_workspace(
    payload: WorkspaceCreate, email: str = Depends(get_user_email)
):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    workspace = await supabase_request(
        "POST", "workspaces", {"name": payload.name, "owner_email": email}
    )

    if not workspace or not isinstance(workspace, dict) or "id" not in workspace:
        raise HTTPException(status_code=500, detail="Failed to create workspace")

    workspace_id = workspace.get("id")

    await supabase_request(
        "POST",
        "workspace_members",
        {"workspace_id": workspace_id, "user_email": email, "role": "owner"},
    )

    await cache.delete(f"user_workspaces:{email}")

    return workspace


@router.get("/workspaces")
async def list_workspaces(email: str = Depends(get_user_email)):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    cache_key = f"user_workspaces:{email}"
    cached = await cache.get(cache_key)
    if cached is not None:
        metrics.record_cache_hit()
        return cached
    metrics.record_cache_miss()

    memberships = await supabase_request_list(
        f"workspace_members?user_email=eq.{email}&select=workspace_id,role"
    )

    if not memberships:
        await cache.put(cache_key, [], ttl=300)
        return []

    workspace_ids = [
        m["workspace_id"]
        for m in memberships
        if isinstance(m, dict) and "workspace_id" in m
    ]
    if not workspace_ids:
        await cache.put(cache_key, [], ttl=300)
        return []

    ids_param = ",".join(workspace_ids)
    workspaces = await supabase_request_list(f"workspaces?id=in.({ids_param})")
    await cache.put(cache_key, workspaces, ttl=300)
    return workspaces


@router.get("/workspaces/{workspace_id}/members")
async def list_workspace_members(
    workspace_id: str, email: str = Depends(get_user_email)
):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    membership = await supabase_request(
        "GET", f"workspace_members?workspace_id=eq.{workspace_id}&user_email=eq.{email}"
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden")

    members = await supabase_request_list(
        f"workspace_members?workspace_id=eq.{workspace_id}"
    )
    return members


@router.delete("/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, email: str = Depends(get_user_email)):
    """Delete a workspace. Only the owner can delete it."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    membership = await supabase_request(
        "GET", f"workspace_members?workspace_id=eq.{workspace_id}&user_email=eq.{email}"
    )
    if (
        not membership
        or not isinstance(membership, dict)
        or membership.get("role") != "owner"
    ):
        raise HTTPException(
            status_code=403, detail="Forbidden: Only the workspace owner can delete it"
        )

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Database not configured")

    members = await supabase_request_list(
        f"workspace_members?workspace_id=eq.{workspace_id}&select=user_email"
    )

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    try:
        http_client = get_http_client()
        await http_client.delete(
            f"{SUPABASE_URL}/rest/v1/workspace_members?workspace_id=eq.{workspace_id}",
            headers=headers,
        )
        resp = await http_client.delete(
            f"{SUPABASE_URL}/rest/v1/workspaces?id=eq.{workspace_id}", headers=headers
        )
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail="Failed to delete workspace")
    except Exception as e:
        logger.error(f"Failed to delete workspace from DB: {e}")
        raise HTTPException(
            status_code=500, detail="Database error during workspace deletion"
        )

    for member in members:
        if isinstance(member, dict) and "user_email" in member:
            await cache.delete(f"user_workspaces:{member['user_email']}")

    return {"status": "success"}


@router.delete("/workspaces/{workspace_id}/members/{member_email}")
async def remove_workspace_member(
    workspace_id: str, member_email: str, email: str = Depends(get_user_email)
):
    """Remove a member from a workspace. Requires admin/owner role."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    membership = await supabase_request(
        "GET", f"workspace_members?workspace_id=eq.{workspace_id}&user_email=eq.{email}"
    )
    if (
        not membership
        or not isinstance(membership, dict)
        or membership.get("role") not in ["owner", "admin"]
    ):
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")

    target = await supabase_request(
        "GET",
        f"workspace_members?workspace_id=eq.{workspace_id}&user_email=eq.{member_email}",
    )
    if target and isinstance(target, dict) and target.get("role") == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove the workspace owner")

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Database not configured")

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    try:
        http_client = get_http_client()
        resp = await http_client.delete(
            f"{SUPABASE_URL}/rest/v1/workspace_members?workspace_id=eq.{workspace_id}&user_email=eq.{member_email}",
            headers=headers,
        )
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail="Failed to remove member")
    except Exception as e:
        logger.error(f"Failed to remove workspace member: {e}")
        raise HTTPException(
            status_code=500, detail="Database error during member removal"
        )

    await cache.delete(f"user_workspaces:{member_email}")

    return {"status": "success", "message": f"Removed {member_email}"}


@router.post("/workspaces/{workspace_id}/invite")
async def invite_workspace_member(
    workspace_id: str, payload: WorkspaceInvite, email: str = Depends(get_user_email)
):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    membership = await supabase_request(
        "GET", f"workspace_members?workspace_id=eq.{workspace_id}&user_email=eq.{email}"
    )
    if (
        not membership
        or not isinstance(membership, dict)
        or membership.get("role") not in ["owner", "admin"]
    ):
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")

    await supabase_request(
        "POST",
        "workspace_members",
        {
            "workspace_id": workspace_id,
            "user_email": payload.email,
            "role": payload.role,
        },
    )

    await cache.delete(f"user_workspaces:{payload.email}")

    return {"status": "success", "message": f"Invited {payload.email}"}
