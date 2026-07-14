"""
app/routers/workspace.py

HTTP layer only — all data access delegated to app/repositories/workspace.py.

Endpoints:
  POST   /workspaces                                 — create workspace
  GET    /workspaces                                 — list user's workspaces
  GET    /workspaces/{workspace_id}/members          — list members
  DELETE /workspaces/{workspace_id}                  — delete workspace (owner only)
  DELETE /workspaces/{workspace_id}/members/{email}  — remove member (owner/admin)
  POST   /workspaces/{workspace_id}/invite           — invite member (owner/admin)
"""
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_user_email
from app.core.cache import cache
from app.core.config import metrics
from app.models.schemas import WorkspaceCreate, WorkspaceInvite
from app.repositories import workspace as workspace_repo

router = APIRouter(prefix="", tags=["workspaces"])


@router.post("/workspaces")
async def create_workspace(
    payload: WorkspaceCreate,
    email: str = Depends(get_user_email),
):
    """Create a workspace and automatically add the creator as the owner."""
    # FIX-30 (P3-04): get_user_email() raises HTTP 401 automatically; guard removed.
    workspace = await workspace_repo.create_workspace(owner_email=email, name=payload.name)
    if not workspace or "id" not in workspace:
        raise HTTPException(status_code=500, detail="Failed to create workspace")

    await workspace_repo.add_member(
        workspace_id=str(workspace["id"]),
        email=email,
        role="owner",
    )
    await cache.delete(f"user_workspaces:{email}")
    return workspace


@router.get("/workspaces")
async def list_workspaces(email: str = Depends(get_user_email)):
    """Return all workspaces the authenticated user belongs to."""
    # FIX-30 (P3-04): get_user_email() raises HTTP 401 automatically; guard removed.
    cache_key = f"user_workspaces:{email}"
    cached = await cache.get(cache_key)
    if cached is not None:
        await metrics.record_cache_hit()
        return cached
    await metrics.record_cache_miss()

    workspaces = await workspace_repo.get_workspaces(email)
    await cache.put(cache_key, workspaces, ttl=300)
    return workspaces


@router.get("/workspaces/{workspace_id}/members")
async def list_workspace_members(
    workspace_id: str,
    email: str = Depends(get_user_email),
):
    """List all members of a workspace. Requires membership."""
    # FIX-30 (P3-04): get_user_email() raises HTTP 401 automatically; guard removed.
    membership = await workspace_repo.get_member(workspace_id, email)
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden")

    return await workspace_repo.get_members(workspace_id)


@router.delete("/workspaces/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    email: str = Depends(get_user_email),
):
    """Delete a workspace. Only the owner can delete it."""
    # FIX-30 (P3-04): get_user_email() raises HTTP 401 automatically; guard removed.
    membership = await workspace_repo.get_member(workspace_id, email)
    if not membership or membership.get("role") != "owner":
        raise HTTPException(
            status_code=403, detail="Forbidden: Only the workspace owner can delete it"
        )

    # Collect member emails before deletion (for cache invalidation)
    members = await workspace_repo.get_members(workspace_id)

    # Delete members first (FK constraint), then the workspace
    await workspace_repo.delete_all_members(workspace_id)
    deleted = await workspace_repo.delete_workspace(workspace_id, owner_email=email)

    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete workspace")

    # Invalidate workspace cache for all affected members
    for member in members:
        if isinstance(member, dict) and "user_email" in member:
            await cache.delete(f"user_workspaces:{member['user_email']}")

    return {"status": "success"}


@router.delete("/workspaces/{workspace_id}/members/{member_email}")
async def remove_workspace_member(
    workspace_id: str,
    member_email: str,
    email: str = Depends(get_user_email),
):
    """Remove a member from a workspace. Requires admin or owner role."""
    # FIX-30 (P3-04): get_user_email() raises HTTP 401 automatically; guard removed.
    membership = await workspace_repo.get_member(workspace_id, email)
    if not membership or membership.get("role") not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")

    target = await workspace_repo.get_member(workspace_id, member_email)
    if target and target.get("role") == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove the workspace owner")

    removed = await workspace_repo.remove_member(workspace_id, member_email)
    if not removed:
        raise HTTPException(status_code=500, detail="Failed to remove member")

    await cache.delete(f"user_workspaces:{member_email}")
    return {"status": "success", "message": f"Removed {member_email}"}


@router.post("/workspaces/{workspace_id}/invite")
async def invite_workspace_member(
    workspace_id: str,
    payload: WorkspaceInvite,
    email: str = Depends(get_user_email),
):
    """Invite a user to a workspace. Requires admin or owner role."""
    # FIX-30 (P3-04): get_user_email() raises HTTP 401 automatically; guard removed.
    membership = await workspace_repo.get_member(workspace_id, email)
    if not membership or membership.get("role") not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")

    await workspace_repo.add_member(
        workspace_id=workspace_id,
        email=payload.email,
        role=payload.role,
    )
    await cache.delete(f"user_workspaces:{payload.email}")
    return {"status": "success", "message": f"Invited {payload.email}"}
