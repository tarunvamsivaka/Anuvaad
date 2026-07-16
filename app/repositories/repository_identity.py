"""
app/repositories/repository_identity.py

CRUD operations for Phase 1A Foundational Identity models:
RepositoryImport, SourceState, IndexConfiguration
"""
from __future__ import annotations

from sqlalchemy import select
from typing import List, Optional

from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from app.core.config import logger
from app.core.database_session import AsyncSessionLocal
from app.models.db_models import RepositoryImport, SourceState, IndexConfiguration


async def create_repository_import(workspace_id: str, provider: str, provider_repo_id: str) -> dict | None:
    async with AsyncSessionLocal() as session:
        try:
            row = RepositoryImport(
                workspace_id=workspace_id,
                provider=provider,
                provider_repo_id=provider_repo_id
            )
            session.add(row)
            await session.commit()
            await session.refresh(row)
            return {c.key: getattr(row, c.key) for c in row.__mapper__.columns}
        except IntegrityError as e:
            logger.error(f"repository_identity.create_repository_import [IntegrityError]: {e}")
            await session.rollback()
            return None
        except SQLAlchemyError as e:
            logger.error(f"repository_identity.create_repository_import [SQLAlchemyError]: {e}")
            await session.rollback()
            return None

async def get_repository_import_by_workspace_and_repo(workspace_id: str, provider: str, provider_repo_id: str) -> dict | None:
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(RepositoryImport)
                .where(RepositoryImport.workspace_id == workspace_id)
                .where(RepositoryImport.provider == provider)
                .where(RepositoryImport.provider_repo_id == provider_repo_id)
            )
            row = result.scalars().first()
            if row is None:
                return None
            return {c.key: getattr(row, c.key) for c in row.__mapper__.columns}
        except SQLAlchemyError as e:
            logger.error(f"repository_identity.get_repository_import_by_workspace_and_repo [SQLAlchemyError]: {e}")
            return None

async def get_repository_imports_for_workspace(workspace_id: str) -> List[dict]:
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(RepositoryImport)
                .where(RepositoryImport.workspace_id == workspace_id)
                .order_by(RepositoryImport.created_at.desc())
            )
            rows = result.scalars().all()
            return [{c.key: getattr(r, c.key) for c in r.__mapper__.columns} for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"repository_identity.get_repository_imports_for_workspace [SQLAlchemyError]: {e}")
            return []

async def create_source_state(import_id: str, revision_sha: str, snapshot_hash: Optional[str] = None) -> dict | None:
    async with AsyncSessionLocal() as session:
        try:
            row = SourceState(
                import_id=import_id,
                revision_sha=revision_sha,
                snapshot_hash=snapshot_hash
            )
            session.add(row)
            await session.commit()
            await session.refresh(row)
            return {c.key: getattr(row, c.key) for c in row.__mapper__.columns}
        except IntegrityError as e:
            logger.error(f"repository_identity.create_source_state [IntegrityError]: {e}")
            await session.rollback()
            return None
        except SQLAlchemyError as e:
            logger.error(f"repository_identity.create_source_state [SQLAlchemyError]: {e}")
            await session.rollback()
            return None

async def get_source_states_for_import(import_id: str) -> List[dict]:
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(SourceState)
                .where(SourceState.import_id == import_id)
                .order_by(SourceState.created_at.desc())
            )
            rows = result.scalars().all()
            return [{c.key: getattr(r, c.key) for c in r.__mapper__.columns} for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"repository_identity.get_source_states_for_import [SQLAlchemyError]: {e}")
            return []

async def create_index_configuration(config_hash: str, chunk_size: int, admission_policy_version: str) -> dict | None:
    async with AsyncSessionLocal() as session:
        try:
            row = IndexConfiguration(
                config_hash=config_hash,
                chunk_size=chunk_size,
                admission_policy_version=admission_policy_version
            )
            session.add(row)
            await session.commit()
            await session.refresh(row)
            return {c.key: getattr(row, c.key) for c in row.__mapper__.columns}
        except IntegrityError as e:
            logger.error(f"repository_identity.create_index_configuration [IntegrityError]: {e}")
            await session.rollback()
            return None
        except SQLAlchemyError as e:
            logger.error(f"repository_identity.create_index_configuration [SQLAlchemyError]: {e}")
            await session.rollback()
            return None

async def get_index_configuration_by_hash(config_hash: str) -> dict | None:
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(IndexConfiguration)
                .where(IndexConfiguration.config_hash == config_hash)
            )
            row = result.scalars().first()
            if row is None:
                return None
            return {c.key: getattr(row, c.key) for c in row.__mapper__.columns}
        except SQLAlchemyError as e:
            logger.error(f"repository_identity.get_index_configuration_by_hash [SQLAlchemyError]: {e}")
            return None
