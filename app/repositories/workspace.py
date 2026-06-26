"""
app/repositories/workspace.py

Typed repository for workspaces and workspace_members tables.
Phase 5 (Arch#2.1).
"""
from __future__ import annotations

from sqlalchemy import select, delete
from app.core.database_session import AsyncSessionLocal
from app.models.db_models import Workspace
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
