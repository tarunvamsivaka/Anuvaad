"""Workspace-scoped CRUD access for the Phase 1A--1C repository domain.

All import-derived reads and writes take ``workspace_id`` and prove ownership
through ``repository_imports`` before returning a domain record.  This module
does not perform indexing, publication, extraction, retrieval, or prompting.
"""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import (
    DesiredIndexState,
    IndexConfiguration,
    IndexRun,
    RepositoryImport,
    RepositoryLinkedHistory,
    SearchableMaterialization,
    SourceState,
    StructuralFile,
    StructuralImport,
    StructuralSymbol,
    TranslationHistory,
)
from app.schemas.repository_domain import (
    DesiredIndexStateCreate,
    IndexConfigurationCreate,
    IndexRunCreate,
    RepositoryImportCreate,
    RepositoryLinkedHistoryCreate,
    SearchableMaterializationCreate,
    SourceStateCreate,
    StructuralFileCreate,
    StructuralImportCreate,
    StructuralSymbolCreate,
)


class RepositoryDomainRepository:
    """Persistence boundary for tenant-owned repository domain records."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _commit(self, row):
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return row

    async def _owns_import(self, workspace_id: UUID, import_id: UUID) -> bool:
        result = await self._session.execute(
            select(RepositoryImport.id).where(
                RepositoryImport.id == import_id,
                RepositoryImport.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def _owned_materialization(self, workspace_id: UUID, materialization_id: UUID):
        result = await self._session.execute(
            select(SearchableMaterialization)
            .join(RepositoryImport)
            .where(
                SearchableMaterialization.id == materialization_id,
                RepositoryImport.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_import(self, workspace_id: UUID, data: RepositoryImportCreate) -> RepositoryImport:
        return await self._commit(RepositoryImport(workspace_id=workspace_id, **data.model_dump()))

    async def get_import(self, workspace_id: UUID, import_id: UUID):
        result = await self._session.execute(
            select(RepositoryImport).where(
                RepositoryImport.id == import_id,
                RepositoryImport.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_imports(self, workspace_id: UUID) -> list[RepositoryImport]:
        result = await self._session.execute(
            select(RepositoryImport)
            .where(RepositoryImport.workspace_id == workspace_id)
            .order_by(RepositoryImport.created_at.desc())
        )
        return list(result.scalars())

    async def delete_import(self, workspace_id: UUID, import_id: UUID) -> bool:
        result = await self._session.execute(
            delete(RepositoryImport).where(
                RepositoryImport.id == import_id,
                RepositoryImport.workspace_id == workspace_id,
            )
        )
        await self._session.commit()
        return bool(result.rowcount)

    async def create_source_state(self, workspace_id: UUID, import_id: UUID, data: SourceStateCreate):
        if not await self._owns_import(workspace_id, import_id):
            return None
        return await self._commit(SourceState(import_id=import_id, **data.model_dump()))

    async def list_source_states(self, workspace_id: UUID, import_id: UUID) -> list[SourceState]:
        if not await self._owns_import(workspace_id, import_id):
            return []
        result = await self._session.execute(
            select(SourceState).where(SourceState.import_id == import_id).order_by(SourceState.created_at.desc())
        )
        return list(result.scalars())

    async def create_index_configuration(self, data: IndexConfigurationCreate) -> IndexConfiguration:
        return await self._commit(IndexConfiguration(**data.model_dump()))

    async def get_index_configuration(self, config_id: UUID):
        result = await self._session.execute(select(IndexConfiguration).where(IndexConfiguration.id == config_id))
        return result.scalar_one_or_none()

    async def create_desired_state(self, workspace_id: UUID, import_id: UUID, data: DesiredIndexStateCreate):
        if not await self._owns_import(workspace_id, import_id):
            return None
        if await self.get_index_configuration(data.index_configuration_id) is None:
            return None
        result = await self._session.execute(
            select(SourceState.id).where(SourceState.id == data.source_state_id, SourceState.import_id == import_id)
        )
        if result.scalar_one_or_none() is None:
            return None
        return await self._commit(DesiredIndexState(import_id=import_id, **data.model_dump()))

    async def get_desired_state(self, workspace_id: UUID, state_id: UUID):
        result = await self._session.execute(
            select(DesiredIndexState)
            .join(RepositoryImport, DesiredIndexState.import_id == RepositoryImport.id)
            .where(DesiredIndexState.id == state_id, RepositoryImport.workspace_id == workspace_id)
        )
        return result.scalar_one_or_none()

    async def create_index_run(self, workspace_id: UUID, desired_state_id: UUID, data: IndexRunCreate):
        if await self.get_desired_state(workspace_id, desired_state_id) is None:
            return None
        return await self._commit(IndexRun(desired_state_id=desired_state_id, **data.model_dump()))

    async def get_index_run(self, workspace_id: UUID, run_id: UUID):
        result = await self._session.execute(
            select(IndexRun)
            .join(DesiredIndexState)
            .join(RepositoryImport, DesiredIndexState.import_id == RepositoryImport.id)
            .where(IndexRun.id == run_id, RepositoryImport.workspace_id == workspace_id)
        )
        return result.scalar_one_or_none()

    async def create_materialization(
        self, workspace_id: UUID, import_id: UUID, data: SearchableMaterializationCreate
    ):
        if not await self._owns_import(workspace_id, import_id):
            return None
        run = await self.get_index_run(workspace_id, data.index_run_id)
        if run is None or run.status.casefold() != "complete":
            return None
        state = await self.get_desired_state(workspace_id, run.desired_state_id)
        if state is None or state.import_id != import_id:
            return None
        return await self._commit(SearchableMaterialization(import_id=import_id, **data.model_dump()))

    async def get_materialization(self, workspace_id: UUID, materialization_id: UUID):
        return await self._owned_materialization(workspace_id, materialization_id)

    async def get_current_materialization(self, workspace_id: UUID, import_id: UUID):
        result = await self._session.execute(
            select(SearchableMaterialization)
            .join(RepositoryImport)
            .where(
                SearchableMaterialization.import_id == import_id,
                SearchableMaterialization.is_current.is_(True),
                RepositoryImport.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_structural_file(
        self, workspace_id: UUID, materialization_id: UUID, data: StructuralFileCreate
    ):
        if await self._owned_materialization(workspace_id, materialization_id) is None:
            return None
        return await self._commit(StructuralFile(materialization_id=materialization_id, **data.model_dump()))

    async def create_structural_symbol(
        self, workspace_id: UUID, structural_file_id: UUID, data: StructuralSymbolCreate
    ):
        result = await self._session.execute(
            select(StructuralFile.id)
            .join(SearchableMaterialization)
            .join(RepositoryImport)
            .where(StructuralFile.id == structural_file_id, RepositoryImport.workspace_id == workspace_id)
        )
        if result.scalar_one_or_none() is None:
            return None
        return await self._commit(StructuralSymbol(structural_file_id=structural_file_id, **data.model_dump()))

    async def create_structural_import(
        self, workspace_id: UUID, source_file_id: UUID, data: StructuralImportCreate
    ):
        source = await self._session.execute(
            select(StructuralFile.materialization_id)
            .join(SearchableMaterialization)
            .join(RepositoryImport)
            .where(StructuralFile.id == source_file_id, RepositoryImport.workspace_id == workspace_id)
        )
        source_materialization_id = source.scalar_one_or_none()
        if source_materialization_id is None:
            return None
        if data.resolved_target_file_id is not None:
            target = await self._session.execute(
                select(StructuralFile.materialization_id)
                .join(SearchableMaterialization)
                .join(RepositoryImport)
                .where(StructuralFile.id == data.resolved_target_file_id, RepositoryImport.workspace_id == workspace_id)
            )
            if target.scalar_one_or_none() != source_materialization_id:
                return None
        return await self._commit(StructuralImport(source_file_id=source_file_id, **data.model_dump()))

    async def create_linked_history(
        self, workspace_id: UUID, import_id: UUID, data: RepositoryLinkedHistoryCreate
    ):
        if not await self._owns_import(workspace_id, import_id):
            return None
        source = await self._session.execute(
            select(SourceState.id).where(SourceState.id == data.source_state_id, SourceState.import_id == import_id)
        )
        if source.scalar_one_or_none() is None:
            return None
        history = await self._session.execute(
            select(TranslationHistory.id).where(
                TranslationHistory.id == data.translation_history_id,
                TranslationHistory.workspace_id == workspace_id,
            )
        )
        if history.scalar_one_or_none() is None:
            return None
        return await self._commit(
            RepositoryLinkedHistory(workspace_id=workspace_id, import_id=import_id, **data.model_dump())
        )

    async def list_linked_history(self, workspace_id: UUID, import_id: UUID) -> list[RepositoryLinkedHistory]:
        if not await self._owns_import(workspace_id, import_id):
            return []
        result = await self._session.execute(
            select(RepositoryLinkedHistory)
            .where(
                RepositoryLinkedHistory.workspace_id == workspace_id,
                RepositoryLinkedHistory.import_id == import_id,
            )
            .order_by(RepositoryLinkedHistory.created_at.desc())
        )
        return list(result.scalars())
