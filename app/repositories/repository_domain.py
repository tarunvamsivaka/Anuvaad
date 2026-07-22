"""Workspace-scoped CRUD access for the Phase 1A--1C repository domain.

All import-derived reads and writes take ``workspace_id`` and prove ownership
through ``repository_imports`` before returning a domain record.  This module
does not perform indexing, publication, extraction, retrieval, or prompting.
"""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, literal, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import (
    DesiredIndexState,
    IndexConfiguration,
    IndexRun,
    RepositoryImport,
    RepositoryLinkedHistory,
    SearchableMaterialization,
    SemanticArtifact,
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
    SemanticArtifactCreate,
    SourceStateCreate,
    StructuralFileCreate,
    StructuralImportCreate,
    StructuralSymbolCreate,
)
from app.schemas.retrieval import SemanticArtifactMatch, SemanticRetrievalRequest


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

    async def create_semantic_artifact(
        self, workspace_id: UUID, materialization_id: UUID, data: SemanticArtifactCreate
    ):
        if await self._owned_materialization(workspace_id, materialization_id) is None:
            return None
        return await self._commit(
            SemanticArtifact(materialization_id=materialization_id, **data.model_dump())
        )

    async def get_semantic_artifact(self, workspace_id: UUID, artifact_id: UUID):
        result = await self._session.execute(
            select(SemanticArtifact)
            .join(SearchableMaterialization)
            .join(RepositoryImport)
            .where(SemanticArtifact.id == artifact_id, RepositoryImport.workspace_id == workspace_id)
        )
        return result.scalar_one_or_none()

    async def list_semantic_artifacts(
        self, workspace_id: UUID, materialization_id: UUID
    ) -> list[SemanticArtifact]:
        if await self._owned_materialization(workspace_id, materialization_id) is None:
            return []
        result = await self._session.execute(
            select(SemanticArtifact)
            .where(SemanticArtifact.materialization_id == materialization_id)
            .order_by(SemanticArtifact.file_path, SemanticArtifact.chunk_index)
        )
        return list(result.scalars())

    async def search_current_semantic_artifacts(
        self, workspace_id: UUID, request: SemanticRetrievalRequest
    ) -> list[SemanticArtifactMatch]:
        """Rank current workspace artifacts by cosine similarity.

        The ownership join and ``is_current`` predicate are mandatory even when
        callers provide repository or materialization filters. This prevents a
        stale or cross-workspace artifact identifier from widening the query.
        """
        cosine_distance = SemanticArtifact.embedding.cosine_distance(request.query_embedding)
        similarity = (literal(1.0) - cosine_distance).label("similarity")
        statement = (
            select(SemanticArtifact, SearchableMaterialization.import_id, similarity)
            .join(SearchableMaterialization)
            .join(RepositoryImport)
            .where(
                RepositoryImport.workspace_id == workspace_id,
                SearchableMaterialization.is_current.is_(True),
                SemanticArtifact.embedding_model == request.embedding_model,
                similarity >= request.similarity_threshold,
            )
        )
        if request.repository_import_ids is not None:
            statement = statement.where(RepositoryImport.id.in_(request.repository_import_ids))
        if request.materialization_ids is not None:
            statement = statement.where(SearchableMaterialization.id.in_(request.materialization_ids))
        statement = statement.order_by(
            similarity.desc(), SemanticArtifact.file_path, SemanticArtifact.chunk_index
        ).limit(request.top_k)
        result = await self._session.execute(statement)
        return [
            SemanticArtifactMatch(
                artifact_id=artifact.id,
                repository_import_id=import_id,
                materialization_id=artifact.materialization_id,
                file_path=artifact.file_path,
                chunk_index=artifact.chunk_index,
                content=artifact.content,
                content_hash=artifact.content_hash,
                embedding_model=artifact.embedding_model,
                similarity=float(score),
            )
            for artifact, import_id, score in result.all()
        ]
