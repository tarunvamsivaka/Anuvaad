"""Internal DTOs for the Phase 2 repository domain layer."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class _Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RepositoryImportCreate(_Schema):
    provider: str = Field(min_length=1)
    provider_repo_id: str = Field(min_length=1)


class RepositoryImportRead(RepositoryImportCreate):
    id: UUID
    workspace_id: UUID
    created_at: datetime | None


class SourceStateCreate(_Schema):
    revision_sha: str = Field(min_length=1)
    snapshot_hash: str | None = None


class SourceStateRead(SourceStateCreate):
    id: UUID
    import_id: UUID
    created_at: datetime | None


class IndexConfigurationCreate(_Schema):
    config_hash: str = Field(min_length=1)
    chunk_size: int = Field(gt=0)
    admission_policy_version: str = Field(min_length=1)


class IndexConfigurationRead(IndexConfigurationCreate):
    id: UUID
    created_at: datetime | None


class DesiredIndexStateCreate(_Schema):
    source_state_id: UUID
    index_configuration_id: UUID
    incarnation_id: UUID


class DesiredIndexStateRead(DesiredIndexStateCreate):
    id: UUID
    import_id: UUID
    created_at: datetime | None


class IndexRunCreate(_Schema):
    status: str = Field(min_length=1)
    error_diagnostics: str | None = None


class IndexRunRead(IndexRunCreate):
    id: UUID
    desired_state_id: UUID
    created_at: datetime | None
    completed_at: datetime | None


class SearchableMaterializationCreate(_Schema):
    index_run_id: UUID
    is_current: bool = True


class SearchableMaterializationRead(SearchableMaterializationCreate):
    id: UUID
    import_id: UUID
    published_at: datetime


class StructuralFileCreate(_Schema):
    file_path: str = Field(min_length=1)
    language: str = Field(min_length=1)
    module_identity: str | None = None


class StructuralFileRead(StructuralFileCreate):
    id: UUID
    materialization_id: UUID
    created_at: datetime | None


class StructuralSymbolCreate(_Schema):
    symbol_name: str = Field(min_length=1)
    symbol_kind: str = Field(min_length=1)
    location_start: int = Field(ge=0)
    location_end: int = Field(ge=0)

    @model_validator(mode="after")
    def location_range_is_ordered(self):
        if self.location_end < self.location_start:
            raise ValueError("location_end must be greater than or equal to location_start")
        return self


class StructuralSymbolRead(StructuralSymbolCreate):
    id: UUID
    structural_file_id: UUID
    created_at: datetime | None


class StructuralImportCreate(_Schema):
    declared_import: str = Field(min_length=1)
    resolved_target_file_id: UUID | None = None


class StructuralImportRead(StructuralImportCreate):
    id: UUID
    source_file_id: UUID
    created_at: datetime | None


class RepositoryLinkedHistoryCreate(_Schema):
    translation_history_id: UUID
    source_state_id: UUID


class RepositoryLinkedHistoryRead(RepositoryLinkedHistoryCreate):
    id: UUID
    workspace_id: UUID
    import_id: UUID
    created_at: datetime | None

class SemanticArtifactCreate(_Schema):
    file_path: str = Field(min_length=1)
    chunk_index: int = Field(ge=0)
    content: str = Field(min_length=1)
    content_hash: str = Field(min_length=1)
    embedding: list[float] = Field(min_length=1536, max_length=1536)
    embedding_model: str = Field(min_length=1)


class SemanticArtifactRead(SemanticArtifactCreate):
    id: UUID
    materialization_id: UUID
    created_at: datetime
