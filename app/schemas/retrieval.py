"""DTOs for the workspace-scoped semantic retrieval boundary."""

from __future__ import annotations

import math
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SemanticRetrievalRequest(BaseModel):
    """A vector query limited to current materializations in one workspace."""

    query_embedding: list[float] = Field(min_length=1536, max_length=1536)
    embedding_model: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=100)
    similarity_threshold: float = Field(default=0.0, ge=-1.0, le=1.0)
    repository_import_ids: list[UUID] | None = None
    materialization_ids: list[UUID] | None = None

    @field_validator("query_embedding")
    @classmethod
    def query_embedding_must_be_finite(cls, value: list[float]) -> list[float]:
        if not all(math.isfinite(component) for component in value):
            raise ValueError("query_embedding must contain only finite values")
        return value


class SemanticArtifactMatch(BaseModel):
    """One ranked semantic artifact returned by a retrieval query."""

    artifact_id: UUID
    repository_import_id: UUID
    materialization_id: UUID
    file_path: str
    chunk_index: int
    content: str
    content_hash: str
    embedding_model: str
    similarity: float


class SemanticRetrievalResult(BaseModel):
    """The deterministic result of a semantic retrieval request."""

    matches: list[SemanticArtifactMatch]
