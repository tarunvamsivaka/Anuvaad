# IMPLEMENTATION BLUEPRINT (LOOP 6B-FINAL)

## 1. Executive Summary

This document provides a deterministic engineering execution plan to implement the target architecture for Anuvaad's repository intelligence features. The strategy involves a phased rollout of a new tenant-isolated repository indexing and retrieval system, running alongside the legacy system to ensure zero downtime. 

The implementation will construct robust, workspace-owned `Repository Import` resources, introduce deterministic `Source State` tracking and `Index Lifecycle` states culminating in explicitly published `SearchableMaterialization` components. It extracts `Structural Metadata`, implements `Mode-Aware Retrieval`, and enforces strict `Prompt Trust Boundaries`. Legacy models will be deprecated and removed only after the new system is fully verified and observed in compatibility mode.

---

## 2. Dependency Graph

The implementation workstreams follow strict hard dependencies to ensure no phase relies on partially implemented future work:

1. **Foundational Identity Schema (Phase 1A)**: Must precede all other work.
2. **Index Lifecycle Schema (Phase 1B)**: Depends on Phase 1A.
3. **Searchable Persistence Schema (Phase 1C)**: Depends on Phase 1B. Defines `SearchableMaterialization`.
4. **Core Domain & Repositories (Phase 2)**: Depends on Phase 1C. Provides the programmatic interface to the database.
5. **Tenant-Scoped Semantic Artifact Persistence (Phase 2A)**: Depends on Phase 2. Provides the workspace-owned persistence target required for semantic chunks and embeddings.
6. **Indexing Pipeline & Extraction (Phase 3)**: Depends on Phase 2A. The pipeline requires semantic artifact persistence as well as domain models to publish `SearchableMaterialization`.
7. **Retrieval & Trust Boundaries (Phase 4)**: Depends on Phase 3. Retrieval cannot happen until searchable materializations, semantic artifacts, and structural metadata exist.
8. **Backend API Stabilization (Phase 5A)**: Depends on Phase 4. Freezes API contracts before UI consumes them.
9. **Frontend Integration (Phase 5B)**: Depends on Phase 5A. Exposes the capabilities to the user interface.
10. **Continuity & Cleanup (Phase 6)**: Depends on Phase 5B. Background cleanup of stale artifacts once the system is active.
11. **Compatibility Mode (Phase 7A)**: Depends on Phase 6. Disables legacy writes and observes system stability.
12. **Legacy Removal (Phase 7B)**: Depends on Phase 7A. Removes old code and tables after full transition observation.

---

## 3. Phase Breakdown

### Phase 1A: Foundational Identity
* **Purpose**: Establish the core relational schema for tenant-isolated repository imports and source state.
* **Prerequisites**: None.
* **Affected Backend Modules**: Alembic migration scripts.
* **Affected Frontend Modules**: None.
* **Database Changes**: Add tables for `repository_imports`, `source_states`, and `index_configurations`. No lifecycle or structural tables.
* **API Contract Changes**: None.
* **Background Worker Changes**: None.
* **Migration Requirements**: Additive only.
* **Test Requirements**: Migration up/down tests.
* **Documentation Updates**: Schema ERD documentation.
* **Risks**: None (additive schema).
* **Rollback Strategy**: Alembic downgrade.
* **Acceptance Criteria**: Migrations apply and rollback cleanly. Existing application tests pass.
* **Review Gate**: Implementation Complete -> Independent Engineering Review -> Approval -> Merge -> Next Phase

### Phase 1B: Index Lifecycle
* **Purpose**: Introduce database lifecycle states for index runs without structural persistence.
* **Prerequisites**: Phase 1A.
* **Affected Backend Modules**: Alembic migration scripts.
* **Affected Frontend Modules**: None.
* **Database Changes**: Add tables for `desired_index_states` and `index_runs`. No structural persistence, no retrieval tables.
* **API Contract Changes**: None.
* **Background Worker Changes**: None.
* **Migration Requirements**: Additive only.
* **Test Requirements**: Migration up/down tests.
* **Documentation Updates**: Schema ERD updates.
* **Risks**: None (additive schema).
* **Rollback Strategy**: Alembic downgrade.
* **Acceptance Criteria**: Migrations apply and rollback cleanly.
* **Review Gate**: Implementation Complete -> Independent Engineering Review -> Approval -> Merge -> Next Phase

### Phase 1C: Searchable Persistence
* **Purpose**: Introduce final publication state and structural metadata tables.
* **Prerequisites**: Phase 1B.
* **Affected Backend Modules**: Alembic migration scripts.
* **Affected Frontend Modules**: None.
* **Database Changes**: Add tables for `searchable_materializations` (explicitly representing the `SearchableMaterialization`), `structural_files`, `structural_symbols`, `structural_imports`, and `repository_linked_history`.
* **API Contract Changes**: None.
* **Background Worker Changes**: None.
* **Migration Requirements**: Additive only.
* **Test Requirements**: Migration up/down tests.
* **Documentation Updates**: Schema ERD updates.
* **Risks**: None (additive schema).
* **Rollback Strategy**: Alembic downgrade.
* **Acceptance Criteria**: Migrations apply and rollback cleanly.
* **Review Gate**: Implementation Complete -> Independent Engineering Review -> Approval -> Merge -> Next Phase

### Phase 2: Core Backend Domain Models
* **Purpose**: Implement SQLAlchemy models, Pydantic schemas, and repository layer for all new tables including `SearchableMaterialization`.
* **Prerequisites**: Phase 1C.
* **Affected Backend Modules**: `app/models/db_models.py`, `app/schemas/`, `app/repositories/`.
* **Affected Frontend Modules**: None.
* **Database Changes**: None.
* **API Contract Changes**: None.
* **Background Worker Changes**: None.
* **Migration Requirements**: None.
* **Test Requirements**: Unit tests for CRUD operations ensuring workspace isolation.
* **Documentation Updates**: Internal developer docs for new repositories.
* **Risks**: Logic bugs in tenant isolation.
* **Rollback Strategy**: Git revert.
* **Acceptance Criteria**: 100% test coverage on new repository layer. Tenant isolation verified.
* **Review Gate**: Implementation Complete -> Independent Engineering Review -> Approval -> Merge -> Next Phase

### Phase 2A: Tenant-Scoped Semantic Artifact Persistence
* **Purpose**: Add persistence for semantic chunks and embeddings without duplicating workspace ownership.
* **Prerequisites**: Phase 2.
* **Database Changes**: Add `semantic_artifacts`, owned transitively through `SearchableMaterialization` -> `RepositoryImport` -> `Workspace`; no `workspace_id` column.
* **API Contract Changes**: None.
* **Background Worker Changes**: None.
* **Test Requirements**: Migration, repository unit, and cross-workspace isolation tests.
### Phase 3: Structural Extraction & Indexing Pipeline
* **Purpose**: Implement the background worker pipeline: Admission Validation -> Source Fetch -> Extraction -> Semantic Vectorization -> Publication of `SearchableMaterialization`.
* **Prerequisites**: Phase 2.
* **Affected Backend Modules**: `app/queue/tasks.py`, `app/services/indexing/`, `app/services/extraction/`.
* **Affected Frontend Modules**: None.
* **Database Changes**: None.
* **API Contract Changes**: None.
* **Background Worker Changes**: New Celery tasks for bounded indexing runs.
* **Migration Requirements**: None.
* **Test Requirements**: Integration tests verifying idempotent index runs and distinct publication states into `SearchableMaterialization`.
* **Documentation Updates**: Pipeline architecture documentation.
* **Risks**: Memory pressure during structural extraction.
* **Rollback Strategy**: Git revert and purge new queues.
* **Acceptance Criteria**: Pipeline successfully takes a mock repository from import to SEARCHABLE state, emitting a valid `SearchableMaterialization`.
* **Review Gate**: Implementation Complete -> Independent Engineering Review -> Approval -> Merge -> Next Phase

### Phase 4: Mode-Aware Retrieval & Prompt Trust Boundaries
* **Purpose**: Implement the retrieval logic and strict isolation of untrusted repository context in LLM prompts.
* **Prerequisites**: Phase 3.
* **Affected Backend Modules**: `app/services/retrieval.py`, `app/services/ai.py`.
* **Affected Frontend Modules**: None.
* **Database Changes**: None.
* **API Contract Changes**: None.
* **Background Worker Changes**: None.
* **Migration Requirements**: None.
* **Test Requirements**: Unit tests verifying degraded behavior paths and prompt boundary isolation against `SearchableMaterialization` records.
* **Documentation Updates**: Retrieval mode logic documentation.
* **Risks**: Hallucinations if prompt isolation fails.
* **Rollback Strategy**: Git revert.
* **Acceptance Criteria**: Retrieval functions return expected context per mode. Prompts format repository context securely.
* **Review Gate**: Implementation Complete -> Independent Engineering Review -> Approval -> Merge -> Next Phase

### Phase 5A: Backend API Stabilization
* **Purpose**: Freeze API contracts and complete backend verification.
* **Prerequisites**: Phase 4.
* **Affected Backend Modules**: `app/routers/repository.py`, `app/routers/translate/`.
* **Affected Frontend Modules**: None.
* **Database Changes**: None.
* **API Contract Changes**: Finalize additive endpoints for `/api/repositories`, modifying translation endpoints to accept `repository_id`.
* **Background Worker Changes**: None.
* **Migration Requirements**: None.
* **Test Requirements**: API endpoint validation tests.
* **Documentation Updates**: API OpenAPI documentation.
* **Risks**: None.
* **Rollback Strategy**: Git revert.
* **Acceptance Criteria**: All backend APIs are stable, tested, and contractually frozen.
* **Review Gate**: Implementation Complete -> Independent Engineering Review -> Approval -> Merge -> Next Phase

### Phase 5B: Frontend Integration
* **Purpose**: Consume only frozen APIs on the frontend. No simultaneous backend redesign.
* **Prerequisites**: Phase 5A.
* **Affected Backend Modules**: None.
* **Affected Frontend Modules**: `src/features/translate/`, `src/features/repository/`.
* **Database Changes**: None.
* **API Contract Changes**: None.
* **Background Worker Changes**: None.
* **Migration Requirements**: None.
* **Test Requirements**: E2E tests for repository import and context-aware translation.
* **Documentation Updates**: Frontend components documentation.
* **Risks**: UI integration bugs.
* **Rollback Strategy**: Git revert frontend changes.
* **Acceptance Criteria**: Users can import a repository, wait for indexing, and translate code utilizing structural context via the UI.
* **Review Gate**: Implementation Complete -> Independent Engineering Review -> Approval -> Merge -> Next Phase

### Phase 6: Continuity & Stale-Run Detection
* **Purpose**: Implement history tracking tied to repository state and background cleanup jobs.
* **Prerequisites**: Phase 5B.
* **Affected Backend Modules**: `app/routers/history.py`, `app/queue/cleanup.py`.
* **Affected Frontend Modules**: `src/app/dashboard/history/`.
* **Database Changes**: None.
* **API Contract Changes**: `historyId` now returns linked repository context.
* **Background Worker Changes**: New periodic task to purge orphaned runs and stale `SearchableMaterialization`s.
* **Migration Requirements**: None.
* **Test Requirements**: Cron job execution tests, history continuity tests.
* **Documentation Updates**: None.
* **Risks**: Accidental deletion of active data by cleanup worker.
* **Rollback Strategy**: Git revert, disable cleanup cron.
* **Acceptance Criteria**: Stale indexes and `SearchableMaterialization`s are deleted after limits are reached. History UI correctly links to repository identities.
* **Review Gate**: Implementation Complete -> Independent Engineering Review -> Approval -> Merge -> Next Phase

### Phase 7A: Compatibility Mode
* **Purpose**: Disable legacy writes, observe production stability, and maintain rollback capability.
* **Prerequisites**: Phase 6.
* **Affected Backend Modules**: `app/routers/repo_search.py`, `app/queue/tasks.py`.
* **Affected Frontend Modules**: None.
* **Database Changes**: None.
* **API Contract Changes**: Legacy API endpoints return deprecation warnings or redirect.
* **Background Worker Changes**: Legacy indexing tasks disabled.
* **Migration Requirements**: None.
* **Test Requirements**: Production stability observation.
* **Documentation Updates**: None.
* **Risks**: Missed legacy dependencies.
* **Rollback Strategy**: Re-enable legacy routes/tasks via feature flags or revert.
* **Acceptance Criteria**: System operates flawlessly without new legacy data being written.
* **Review Gate**: Implementation Complete -> Independent Engineering Review -> Approval -> Merge -> Next Phase

### Phase 7B: Legacy Removal
* **Purpose**: Drop legacy schema, remove legacy endpoints, and remove legacy workers.
* **Prerequisites**: Phase 7A (after successful observation window).
* **Affected Backend Modules**: `app/models/db_models.py`, `app/routers/repo_search.py`, `app/queue/tasks.py`.
* **Affected Frontend Modules**: Legacy components removed.
* **Database Changes**: Drop `RepoEmbedding` table.
* **API Contract Changes**: Remove deprecated `/api/repo_search`.
* **Background Worker Changes**: Remove legacy Celery indexing tasks.
* **Migration Requirements**: Destructive Alembic migration.
* **Test Requirements**: Ensure tests still pass.
* **Documentation Updates**: Remove legacy references.
* **Risks**: Breaking external clients using undocumented legacy endpoints.
* **Rollback Strategy**: Alembic downgrade (restores schema, but not data), Git revert.
* **Acceptance Criteria**: Repository is clean of legacy embedding code and schema.
* **Review Gate**: Implementation Complete -> Independent Engineering Review -> Approval -> Merge -> Next Phase

---

## 4. Database Migration Plan

1. **Migration 1 (Phase 1A): Foundational Identity**
   * **Objective**: Create `repository_imports`, `source_states`, `index_configurations`.
   * **Ordering**: First.
   * **Compatibility Strategy**: Independent of legacy tables.
   * **Coexistence Period**: Until Phase 7B.
   * **Cleanup Phase**: N/A.

2. **Migration 2 (Phase 1B): Index Lifecycle**
   * **Objective**: Create `desired_index_states`, `index_runs`.
   * **Ordering**: Second.
   * **Compatibility Strategy**: Independent of legacy tables.
   * **Coexistence Period**: Until Phase 7B.
   * **Cleanup Phase**: N/A.

3. **Migration 3 (Phase 1C): Searchable Persistence**
   * **Objective**: Create `searchable_materializations`, `structural_files`, `structural_symbols`, `structural_imports`, `repository_linked_history`.
   * **Ordering**: Third.
   * **Compatibility Strategy**: Independent of legacy tables.
   * **Coexistence Period**: Until Phase 7B.
   * **Cleanup Phase**: N/A.

4. **Migration 4 (Phase 2A): Tenant-Scoped Semantic Artifact Persistence
   * **Objective**: Create `semantic_artifacts`, scoped transitively through `searchable_materializations`.
   * **Compatibility Strategy**: Coexists with legacy `RepoEmbedding`; no legacy reads or writes change.

5. **Migration 5 (Phase 7B): Destructive Cleanup**
   * **Objective**: Drop legacy `RepoEmbedding`.
   * **Ordering**: Last.
   * **Compatibility Strategy**: Executed only after the application stops reading/writing to the legacy table and passes Phase 7A.
   * **Coexistence Period**: N/A.
   * **Cleanup Phase**: Phase 7B.

---

## 5. Backend Implementation Plan

### Subsystems:
* **Models**:
  * **New**: `RepositoryImport`, `SourceState`, `IndexConfiguration` (Phase 1A). `DesiredIndexState`, `IndexRun` (Phase 1B). `SearchableMaterialization`, `StructuralFile`, `StructuralSymbol`, `StructuralImport`, `RepositoryLinkedHistory` (Phase 1C). `SemanticArtifact` (Phase 2A).
  * **Deleted**: `RepoEmbedding` (in Phase 7B).
* **Repositories**:
  * **New**: Repositories for all new models enforcing workspace scoping, including explicitly retrieving `SearchableMaterialization`.
* **Services**:
  * **New**: `IndexingAdmissionService`, `StructuralExtractionService`, `ModeAwareRetrievalService` (acting upon `SearchableMaterialization`).
  * **Modified**: `AIService` (to enforce prompt trust boundaries).
* **Routers**:
  * **New**: `/api/repositories` (import lifecycle).
  * **Modified**: Translation routers (accepting exact `repository_id`).
* **Celery**:
  * **New**: Idempotent index execution tasks publishing `SearchableMaterialization`, stale-run cleanup cron.
  * **Deleted**: Legacy chunking tasks (Phase 7B).

---

## 6. Frontend Implementation Plan

### Subsystems:
* **Repository Management**:
  * **New**: `RepositoryImportModal`, `RepositoryList`, `IndexStatusIndicator`.
* **Translation**:
  * **Modified**: `RepositorySelector` (fetch from `/api/repositories` instead of free-text input).
  * **Modified**: `TranslateFeature` (handle explicit repository IDs and source states).
* **History**:
  * **Modified**: History components to display repository context metadata.
* **API Clients**:
  * **New**: `useRepositories` SWR hook.
  * **Modified**: Translation network hooks.

---

## 7. API Contract Evolution

* `/api/repositories` [POST, GET, DELETE]: **Additive**. New resource lifecycle.
* `/api/code-to-english` [POST]: **Additive/Breaking**. Add `repository_id`. Deprecate arbitrary `repository_name` string.
* `/api/code-to-code` [POST]: **Additive/Breaking**. Add `source_repository_id`, `target_repository_id`. Deprecate arbitrary string.
* `/api/history` [GET]: **Additive**. Returns repository context metadata.
* `/api/repo_search` [POST]: **Deprecated**. Legacy endpoints disabled in 7A, deleted in 7B.

---

## 8. Testing Blueprint

* **Unit Tests**: Domain models (tenant isolation), Prompt construction (trust boundary), Mode-Aware Retrieval logic validating `SearchableMaterialization`.
* **Integration Tests**: Celery task idempotency, Structural extraction logic against mock code.
* **API Tests**: Endpoint validation, Workspace isolation.
* **Frontend Tests**: Component rendering, SWR cache updates on import success.
* **Migration Tests**: Standard Alembic up/down.
* **Concurrency Tests**: Index publication race conditions.
* **Tenant Isolation Tests**: Ensure no cross-workspace repository access is permitted.
* **Regression Tests**: All legacy translations must continue to work during Phases 1-6.

**Phase Test Gates**: Every phase requires 100% pass rate on existing regression tests plus 100% pass rate on newly introduced unit/integration tests before merge.

---

## 9. Verification Gates

* **Phase Completion Gate**: All bullet points in the phase breakdown are coded and locally tested.
* **Merge Gate**: Implementation Complete -> Independent Engineering Review -> Approval -> Merge -> Next Phase
* **Deployment Gate**: Zero-downtime deployment verified in staging environment. Production deployment requires metrics monitoring for 24 hours post-deployment before proceeding to the next phase.

---

## 10. Rollback Strategy

* **Migration Rollback**: Run `alembic downgrade`. Destructive migrations (Phase 7B) require restoring data from backup if rollback is necessary.
* **Feature Rollback**: Revert specific Git commits. Due to the phased approach, reverting backend logic in a phase will not corrupt legacy data.
* **Deployment Rollback**: Re-deploy previous container image tags and rollback database if migrations were applied.

---

## 11. Merge Strategy

* **Branch Strategy**: Trunk-based development. Feature branches per phase (e.g., `feature/phase-1a-foundational-identity`).
* **Review Checkpoints**: Mandatory architecture and security review before merging Phase 2 (Core Domain) and Phase 4 (Trust Boundaries). Every phase must pass the mandatory independent engineering review.
* **Commit Cadence**: Atomic commits per logical subsystem within a phase.

---

## 12. Out-of-Scope Items

* Generating or modifying autonomous agent capabilities.
* Implementing direct repository write-back (automated PRs/commits).
* Migrating from PostgreSQL to a Graph Database.
* Implementing cross-tenant public index sharing.
* AI-based structural extraction (must remain deterministic).
* Writing actual production SQL or code during this blueprinting phase.

---

## 13. Final Execution Checklist

1. [ ] Review and approve Implementation Blueprint.
2. [ ] Execute Phase 1A: Foundational Identity (Create & merge).
3. [ ] Execute Phase 1B: Index Lifecycle (Create & merge).
4. [ ] Execute Phase 1C: Searchable Persistence (Create & merge).
5. [ ] Execute Phase 2: Core Domain and Repositories (Create & merge).
6. [ ] Execute Phase 2A: Tenant-Scoped Semantic Artifact Persistence (Create & merge).
7. [ ] Execute Phase 3: Structural Extraction & Indexing Pipeline (Create & merge).
8. [ ] Execute Phase 4: Retrieval logic & Prompt Boundaries (Create & merge).
9. [ ] Execute Phase 5A: Backend API Stabilization (Create & merge).
10. [ ] Execute Phase 5B: Frontend Integration (Create & merge).
11. [ ] Execute Phase 6: Cleanup workers and History context linking (Create & merge).
12. [ ] Execute Phase 7A: Compatibility Mode (Disable legacy writes, observe).
13. [ ] Execute Phase 7B: Legacy Removal (Drop tables, delete code).
14. [ ] Final Sign-off.


