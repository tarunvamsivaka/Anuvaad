"""
app/repositories/workspace.py

Typed repository for workspaces and workspace_members tables.
Phase 5 (Arch#2.1).
"""
from __future__ import annotations

from sqlalchemy import select, delete
from app.core.database_session import AsyncSessionLocal
from app.models.db_models import Workspace, WorkspaceMember
from app.core.config import logger


async def get_workspaces(email: str) -> list[dict]:
    """Return all workspaces the user owns or is a member of."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(Workspace).where(Workspace.owner_email == email)
                .order_by(Workspace.created_at.desc())
            )
            rows = result.scalars().all()
            return [{c.key: getattr(r, c.key) for c in r.__mapper__.columns} for r in rows]
        except Exception as e:
            logger.error(f"workspace.get_workspaces({email}): {e}")
            return []


async def create_workspace(owner_email: str, name: str, description: str = "") -> dict | None:
    """Create a new workspace and return the created row."""
    async with AsyncSessionLocal() as session:
        try:
            row = Workspace(owner_email=owner_email, name=name, description=description)
            session.add(row)
            await session.commit()
            await session.refresh(row)
            return {c.key: getattr(row, c.key) for c in row.__mapper__.columns}
        except Exception as e:
            logger.error(f"workspace.create_workspace({owner_email}): {e}")
            await session.rollback()
            return None


async def delete_workspace(workspace_id: str, owner_email: str) -> bool:
    """Delete a workspace owned by owner_email.  Returns True on success."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                delete(Workspace)
                .where(Workspace.id == workspace_id)
                .where(Workspace.owner_email == owner_email)
            )
            await session.commit()
            return (result.rowcount or 0) > 0
        except Exception as e:
            logger.error(f"workspace.delete_workspace({workspace_id}): {e}")
            await session.rollback()
            return False


async def get_members(workspace_id: str) -> list[dict]:
    """Return all workspace_members rows for the given workspace."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(WorkspaceMember)
                .where(WorkspaceMember.workspace_id == workspace_id)
            )
            rows = result.scalars().all()
            return [{c.key: getattr(r, c.key) for c in r.__mapper__.columns} for r in rows]
        except Exception as e:
            logger.error(f"workspace.get_members({workspace_id}): {e}")
            return []


async def get_member(workspace_id: str, email: str) -> dict | None:
    """Return the membership row for a specific user, or None."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(WorkspaceMember)
                .where(WorkspaceMember.workspace_id == workspace_id)
                .where(WorkspaceMember.user_email == email)
            )
            row = result.scalars().first()
            if row is None:
                return None
            return {c.key: getattr(row, c.key) for c in row.__mapper__.columns}
        except Exception as e:
            logger.error(f"workspace.get_member({workspace_id}, {email}): {e}")
            return None


async def add_member(
    workspace_id: str,
    email: str,
    role: str = "member",
) -> bool:
    """Add a member to a workspace. Returns True on success."""
    async with AsyncSessionLocal() as session:
        try:
            session.add(WorkspaceMember(
                workspace_id=workspace_id,
                user_email=email,
                role=role,
            ))
            await session.commit()
            return True
        except Exception as e:
            logger.error(f"workspace.add_member({workspace_id}, {email}): {e}")
            await session.rollback()
            return False


async def remove_member(workspace_id: str, email: str) -> bool:
    """Remove a member from a workspace. Returns True if a row was deleted."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                delete(WorkspaceMember)
                .where(WorkspaceMember.workspace_id == workspace_id)
                .where(WorkspaceMember.user_email == email)
            )
            await session.commit()
            return (result.rowcount or 0) > 0
        except Exception as e:
            logger.error(f"workspace.remove_member({workspace_id}, {email}): {e}")
            await session.rollback()
            return False


async def delete_all_members(workspace_id: str) -> None:
    """Remove all members from a workspace (used during workspace deletion)."""
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(
                delete(WorkspaceMember)
                .where(WorkspaceMember.workspace_id == workspace_id)
            )
            await session.commit()
        except Exception as e:
            logger.error(f"workspace.delete_all_members({workspace_id}): {e}")
            await session.rollback()

