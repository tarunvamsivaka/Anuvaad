# REPOSITORY IMPLEMENTATION EVIDENCE

## 1. Document Control

| Field | Value |
|---|---|
| Phase | Loop 6A: Implementation Evidence Capture |
| Focus | Architecture Baseline Verification |
| Date | 2026-07-15 |

## 2. Objective
This document captures concrete evidence of the current implementation state of the Anuvaad repository relative to the finalized Loop 5 Architecture (`ARCHITECTURE_DECISION.md`). It serves as an empirical input for Loop 6 implementation planning, verifying exactly where the codebase diverges from the binding architectural invariants.

## 3. Evidence Categories

### 3.1 Tenant Isolation & Ownership
**Target Invariant:** `TENANT ISOLATION INVARIANT`, `INDEPENDENT IMPORT INVARIANT`
**Current Implementation Evidence:**
- `app/models/db_models.py (RepoEmbedding)`: The `RepoEmbedding` table uses `repository_name` as the only logical partition. It lacks a `workspace_id` column.
- `app/routers/repo_search.py (index_repo, search_repo)`: The `/repo/index` and `/repo/search` endpoints accept `repo_name` and do not enforce any workspace-level scoping when enqueueing tasks or querying vectors.
- **Conclusion:** The system currently indexes repositories as global singletons. Tenant isolation for repository data is completely absent.

### 3.2 Index Lifecycle & Publication
**Target Invariant:** `DESIRED STATE INCARNATION INVARIANT`, `COMPLETE/SEARCHABLE SEPARATION INVARIANT`, `PUBLICATION INVARIANT`
**Current Implementation Evidence:**
- `app/queue/tasks.py (process_github_repo_task)`: The indexing task fetches files, chunks them, generates embeddings, and immediately inserts them into `RepoEmbedding`. 
- **Conclusion:** There is no concept of an "Index Run", "Desired State", or "Conditional Publication". Indexing is a blind, non-idempotent insert operation with no capability to detect stale runs or manage safe transitions (ABA problem).

### 3.3 Source State & Configuration Identity
**Target Invariant:** `SOURCE STATE INVARIANT`, `SOURCE SNAPSHOT FALLBACK INVARIANT`, `INDEX CONFIGURATION INVARIANT`
**Current Implementation Evidence:**
- `app/services/github.py (fetch_repository_files)`: Fetches files using `repo.get_git_tree(repo.default_branch, recursive=True)`, but discards the commit SHA.
- `app/models/db_models.py (RepoEmbedding)`: Does not store any provider revision identity or source snapshot identity.
- **Conclusion:** A searchable materialization cannot be linked to the specific source state it was built from, making stale-index detection impossible.

### 3.4 Upstream Access & Credential Isolation
**Target Invariant:** `CREDENTIAL ISOLATION INVARIANT`, `UPSTREAM ACCESS VALIDATION INVARIANT`
**Current Implementation Evidence:**
- `app/services/github.py (get_github_client)`: Uses a single global `GITHUB_PAT` environment variable.
- **Conclusion:** It does not use workspace-specific or user-specific GitHub tokens for repository interactions, violating credential isolation and making upstream access validation impossible per-tenant.

### 3.5 Structural Extraction & Mode-Aware Retrieval
**Target Invariant:** `STRUCTURAL HONESTY INVARIANT`, `MODE-AWARE RETRIEVAL INVARIANT`
**Current Implementation Evidence:**
- `app/services/embedding.py (chunk_text)`: Uses a simple sliding-window character-based chunking strategy (`chunk_size=1500`, `overlap=200`).
- `app/routers/repo_search.py (search_repo)`: Performs a pure semantic vector search across all chunks matching the `repository_name`.
- **Conclusion:** There is zero structural extraction (no file/module identity mapping, no symbol definitions, no declared import relationships). Retrieval is entirely semantic, completely lacking mode-aware fallback or explicit anchor expansion.

### 3.6 Repository-Linked Continuity
**Target Invariant:** `HISTORY PROVENANCE INVARIANT`
**Current Implementation Evidence:**
- `app/models/db_models.py (TranslationHistory)`: Stores `workspace_id` and `repository_name`, but has no linkage to a specific `source_state_identity` or `index_run`.
- **Conclusion:** Translation history is loosely coupled to a string repository name, rather than firmly anchored to the precise source state that produced the translation.

## 4. Execution Readiness Assessment
The current implementation requires a foundational rebuild of the repository data model to satisfy the Loop 5 architecture. The gap is not merely additive; existing assumptions in `RepoEmbedding` and `process_github_repo_task` must be structurally replaced. 

The implementation evidence confirms that the dependency order established in `ARCHITECTURE_DECISION.md` (starting with ownership boundaries and source-state identity) is technically accurate and absolutely necessary for safe execution.
