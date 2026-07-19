"""Transactional Phase 3 repository ingestion pipeline."""

from __future__ import annotations

import hashlib
import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.db_models import (
    DesiredIndexState,
    IndexRun,
    RepositoryImport,
    SearchableMaterialization,
    SemanticArtifact,
    SourceState,
    StructuralFile,
    StructuralImport,
    StructuralSymbol,
)
from app.services.embedding import chunk_text, generate_embeddings_openai
from app.services.github import fetch_repository_snapshot
from app.services.indexing.admission import AdmissionPolicy, AdmissionRejectedError
from app.services.indexing.extraction import extract_structure

logger = logging.getLogger("anuvaad.indexing")
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_BATCH_SIZE = 100


class IndexingError(RuntimeError):
    """A bounded indexing run failed after admission."""


class RepositoryIndexingPipeline:
    def __init__(
        self,
        session: AsyncSession,
        policy: AdmissionPolicy | None = None,
        fetcher=fetch_repository_snapshot,
        embedder=generate_embeddings_openai,
    ) -> None:
        self.session, self.policy, self.fetcher, self.embedder = session, policy or AdmissionPolicy(), fetcher, embedder

    async def run(self, workspace_id: UUID, import_id: UUID, desired_state_id: UUID) -> str:
        context = await self._load_context(workspace_id, import_id, desired_state_id)
        if context is None:
            raise AdmissionRejectedError("index request is not owned by this workspace")
        desired, import_, source = context
        self.policy.validate_request(import_.provider, desired.index_configuration.chunk_size)
        if await self._published_for_desired(import_id, desired_state_id):
            return "already_published"
        run = IndexRun(desired_state_id=desired.id, status="pending")
        self.session.add(run)
        await self.session.commit()
        try:
            run.status = "running"
            await self.session.commit()
            snapshot = self.fetcher(import_.provider_repo_id, source.revision_sha)
            files = snapshot["files"]
            self.policy.validate_content(files)
            if source.snapshot_hash and source.snapshot_hash != snapshot["snapshot_hash"]:
                raise IndexingError("source snapshot no longer matches the requested source state")
            await self._complete_and_persist(run, import_, desired, files)
            logger.info("indexing_run_published", extra={"run_id": str(run.id), "import_id": str(import_id)})
            return "published"
        except AdmissionRejectedError as exc:
            await self._fail(run, f"admission rejected: {exc}")
            logger.warning("indexing_admission_rejected", extra={"run_id": str(run.id), "reason": str(exc)})
            raise
        except Exception as exc:
            await self._fail(run, str(exc))
            logger.exception("indexing_run_failed", extra={"run_id": str(run.id), "import_id": str(import_id)})
            raise IndexingError(str(exc)) from exc

    async def _load_context(self, workspace_id: UUID, import_id: UUID, desired_id: UUID):
        result = await self.session.execute(
            select(DesiredIndexState, RepositoryImport, SourceState)
            .join(RepositoryImport, DesiredIndexState.import_id == RepositoryImport.id)
            .join(SourceState, DesiredIndexState.source_state_id == SourceState.id)
            .options(selectinload(DesiredIndexState.index_configuration))
            .where(
                DesiredIndexState.id == desired_id,
                DesiredIndexState.import_id == import_id,
                RepositoryImport.workspace_id == workspace_id,
            )
        )
        return result.one_or_none()

    async def _published_for_desired(self, import_id: UUID, desired_id: UUID):
        result = await self.session.execute(
            select(SearchableMaterialization)
            .join(IndexRun)
            .where(
                SearchableMaterialization.import_id == import_id,
                SearchableMaterialization.is_current.is_(True),
                IndexRun.desired_state_id == desired_id,
            )
        )
        return result.scalar_one_or_none()

    async def _complete_and_persist(self, run, import_, desired, files: list[dict[str, str]]) -> None:
        chunks = [
            (file["path"], index, chunk)
            for file in files
            for index, chunk in enumerate(
                chunk_text(file["content"], chunk_size=desired.index_configuration.chunk_size)
            )
        ]
        if not chunks:
            raise AdmissionRejectedError("repository contains no chunkable source")
        embeddings: list[list[float]] = []
        for start in range(0, len(chunks), EMBEDDING_BATCH_SIZE):
            vectors = await self.embedder([chunk[2] for chunk in chunks[start : start + EMBEDDING_BATCH_SIZE]])
            expected = min(EMBEDDING_BATCH_SIZE, len(chunks) - start)
            if len(vectors) != expected or any(len(vector) != 1536 for vector in vectors):
                raise IndexingError("embedding provider returned an invalid vector batch")
            embeddings.extend(vectors)
        run.status, run.completed_at = "complete", datetime.now(UTC)
        materialization = SearchableMaterialization(import_id=import_.id, index_run_id=run.id, is_current=False)
        self.session.add(materialization)
        await self.session.flush()
        imports = []
        for file in files:
            extracted = extract_structure(file["path"], file["content"])
            row = StructuralFile(
                materialization_id=materialization.id,
                file_path=extracted.path,
                language=extracted.language,
                module_identity=extracted.module_identity,
            )
            self.session.add(row)
            await self.session.flush()
            self.session.add_all(
                StructuralSymbol(
                    structural_file_id=row.id,
                    symbol_name=s.name,
                    symbol_kind=s.kind,
                    location_start=s.start,
                    location_end=s.end,
                )
                for s in extracted.symbols
            )
            imports.extend((row, declared) for declared in extracted.imports)
        self.session.add_all(
            StructuralImport(source_file_id=row.id, declared_import=declared) for row, declared in imports
        )
        self.session.add_all(
            SemanticArtifact(
                materialization_id=materialization.id,
                file_path=path,
                chunk_index=index,
                content=content,
                content_hash=hashlib.sha256(content.encode("utf-8")).hexdigest(),
                embedding=embedding,
                embedding_model=EMBEDDING_MODEL,
            )
            for (path, index, content), embedding in zip(chunks, embeddings, strict=True)
        )
        await self.session.flush()
        await self.session.execute(
            update(SearchableMaterialization)
            .where(SearchableMaterialization.import_id == import_.id, SearchableMaterialization.is_current.is_(True))
            .values(is_current=False)
        )
        materialization.is_current = True
        await self.session.commit()

    async def _fail(self, run: IndexRun, diagnostic: str) -> None:
        await self.session.rollback()
        run.status, run.error_diagnostics, run.completed_at = "failed", diagnostic[:4_000], datetime.now(UTC)
        self.session.add(run)
        await self.session.commit()
