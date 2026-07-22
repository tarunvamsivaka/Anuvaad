# Phase 4: Semantic Retrieval Engine

Phase 4 provides a workflow-independent semantic retrieval boundary over
`SemanticArtifact` records. It introduces no API routes, user-facing AI
features, prompt construction, or LLM calls.

## Ownership and filtering

Every query starts with a required workspace ID and joins the approved chain:

`Workspace -> RepositoryImport -> SearchableMaterialization -> SemanticArtifact`.

The query always filters to the workspace and to current materializations.
Optional repository-import and materialization ID filters only narrow that
already-isolated set. Retrieval never reads the legacy `RepoEmbedding` table.

## Retrieval contract

`SemanticRetrievalService.retrieve()` accepts a validated query embedding, its
embedding model, top-K limit, cosine-similarity threshold, and optional filters.
The repository computes `1 - cosine_distance`, removes matches below the
threshold, ranks by descending similarity with deterministic path/chunk ties,
and returns typed artifact DTOs. Database failures are logged and surfaced as
`SemanticRetrievalError`; an empty match set is a successful degraded result.
