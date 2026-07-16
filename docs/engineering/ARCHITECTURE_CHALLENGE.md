# ARCHITECTURE CHALLENGE

## 1. Document Control

| Field | Value |
|---|---|
| Protocol Step | Loop 4B: Focused Independent Adversarial Architecture Challenge |
| Reviewer Role | Independent Adversarial Architecture Reviewer |
| Model | Claude Sonnet 4.6 (Thinking) |
| Source Author | Gemini 3.1 Pro (High) |
| Baseline Commit | c4e2cebf68449b957d720a0067f5af67caae1009 |
| Baseline Branch | master |
| Review Date | 2026-07-15 |
| Authorization | LOOP 4B FOCUSED INDEPENDENT ADVERSARIAL ARCHITECTURE CHALLENGE ONLY |

**Pre-review verification:** ARCHITECTURE_OPTIONS.md, AUDIT_FINDINGS.md, GAP_ANALYSIS.md, and REPOSITORY_BASELINE.md were read in full as sources of truth. Production implementation was independently inspected for claims relevant to the four focused decisions. No source files were modified.

---

## 2. Independent Review Scope

This document independently challenges the following provisional recommendations only:

| Decision | Provisional Recommendation |
|---|---|
| ARCH-DEC-01 | OPTION C: Repository connection/import resource separated from logical repository identity |
| ARCH-DEC-03 | OPTION B: Immutable index-run records with one conditionally published searchable materialization |
| ARCH-DEC-04 | OPTION C: File, symbols, and lightweight relationships |
| ARCH-DEC-05 | OPTION A: Semantic retrieval followed by deterministic structural expansion |

ARCH-DEC-02 and ARCH-DEC-06 are out of scope for this challenge. DEC-02 source-state and index-configuration concepts are referenced where they are prerequisites for challenging DEC-03.

---

## 3. Repository Evidence Inspected

The following production implementation files were independently read and verified:

| File | Relevance |
|---|---|
| `app/models/db_models.py` | Workspace, WorkspaceMember, RepoEmbedding, TranslationHistory schemas |
| `app/routers/workspace.py` | Workspace authorization logic, membership checks, deletion cascade |
| `app/repositories/workspace.py` | Workspace data access patterns, owner_email vs membership filters |
| `app/routers/repo_search.py` | Index trigger, status check, search authorization (or absence thereof) |
| `app/repositories/vectors.py` | insert_repo_embeddings: unconditional inserts, no ownership column |
| `app/queue/tasks.py` | process_github_repo_task: batch loop, exception silencing, no idempotency |
| `app/routers/github.py` | GitHub OAuth, process-repo trigger, user token vs server PAT distinction |
| `app/services/github.py` | GITHUB_PAT server credential, file size limits, no repo count cap |
| `app/services/embedding.py` | chunk_text, generate_embeddings_openai, generate_embeddings_hf |
| `app/core/auth.py` | _authenticate_jwt, get_user_email, get_user_email_from_request |
| `alembic/versions/` (directory listing, 9 migration files) | Migration history; absence of ownership or lifecycle state columns |

**Key independent observations from repository inspection:**

- `RepoEmbedding` has no `user_email`, `workspace_id`, or any ownership column. Confirmed in `db_models.py` L119-128 and `vectors.py` L53-94.
- `process_github_repo_task` accepts only `repo_name`. No user identity is propagated. `github.py` L146 and `repo_search.py` L62 confirm this.
- `fetch_repository_files` in `github.py` uses `GITHUB_PAT` server credential, not per-user OAuth tokens. No file count cap exists at the repository level.
- Two distinct credential regimes exist: `UserGithubToken` (per-user OAuth, used only for listing repos) and `GITHUB_PAT` (server PAT, used for all actual indexing). The indexing route verifies a personal token exists but then discards it.
- `Workspace` model: `owner_email` (TEXT), `WorkspaceMember`: composite PK `(workspace_id, user_email)`. `get_workspaces` filters only by `owner_email`, not by membership table membership.
- No Alembic migration contains lifecycle state columns. Migrations confirm blind-insert architecture.
- `chunk_text` uses fixed-size character overlapping windows with no per-file or total-chunk cap.

---

## 4. ARCH-DEC-01 Independent Challenge

### 4.1 Current Architecture Inspection

Authentication identifies a user by Supabase JWT `email` claim, extracted locally (`auth.py` L41-80). The workspace model provides collaboration grouping: `Workspace(owner_email)` and `WorkspaceMember(workspace_id, user_email, role)`. Repository indexing operates entirely outside workspace scope: `process_github_repo_task(repo_name)` carries no user or workspace parameter. `GITHUB_PAT` is a single server-level credential. `UserGithubToken` stores per-user OAuth tokens for listing but the actual indexing task ignores the per-user token and calls `fetch_repository_files(repo_name)` using the server PAT.

The `/github/process-repo` endpoint verifies the user has a connected GitHub token via `_get_github_token`, then discards that token and uses the server PAT. This creates a false authorization check: presence of a personal token does not restrict what server-PAT-accessible repositories the user can cause the system to index.

### 4.2 Adversarial Scenario Analysis

**User belongs to multiple workspaces:** Currently irrelevant to repository indexing because no workspace or user is bound to `RepoEmbedding`. Under OPTION C, the AUTHORIZATION_PRINCIPAL (workspace) would be correctly assigned. Under OPTION B, workspace assignment is direct and sufficient.

**Workspace member is removed:** Previously indexed repository data remains accessible because `RepoEmbedding` has no membership reference. Under OPTION C, removing workspace membership revokes access to that workspace's repository imports, but the REPOSITORY_IMPORT_OR_CONNECTION and LOGICAL_REPOSITORY_IDENTITY entities survive. This creates a dangling authorization path: the import record lives under a workspace, but the user who created it is no longer a member. No automatic cascade of the import record is defined in the provisional model. Under OPTION B, the same issue exists but with one fewer entity layer.

**Workspace is deleted:** `delete_workspace` currently cascades only `WorkspaceMember` deletion. No cascade to repository imports exists because the concept does not exist yet. Both OPTION B and OPTION C must define this cascade. OPTION C's additional LOGICAL_REPOSITORY_IDENTITY entity requires answering: does deleting a workspace delete the LOGICAL_REPOSITORY_IDENTITY, and does that cascade to other workspaces that imported the same logical repository? Since cross-tenant sharing is deferred, LOGICAL_REPOSITORY_IDENTITY is effectively 1:1 with a workspace import. The distinction provides no isolation benefit in the current product.

**Same GitHub repository imported into two workspaces:** Under OPTION C, both imports reference the same LOGICAL_REPOSITORY_IDENTITY. This immediately creates cross-workspace coupling at the identity layer, even if physical index data is not shared. Which workspace's index configuration governs is unspecified. Under OPTION B, each workspace has its own independent import identity; no cross-workspace coupling exists.

**Public repository becomes private:** Under OPTION C, the LOGICAL_REPOSITORY_IDENTITY survives the visibility change, but the REPOSITORY_IMPORT_OR_CONNECTION must prevent access unless the tenant's credential still has access. The provisional model does not specify how visibility changes propagate to published searchable indexes. Under OPTION B, the workspace import is simply checked at access time against current credential validity.

**Private repository access token is revoked:** Under OPTION C, if the credential is revoked, the LOGICAL_REPOSITORY_IDENTITY and REPOSITORY_IMPORT_OR_CONNECTION both survive but retrieval silently returns stale indexed content. The provisional model has no credential-validity-check gate on retrieval. The same risk exists under OPTION B but with one fewer layer to traverse.

**Provider credentials change:** The current implementation uses a single server PAT. There are no per-tenant provider credentials for the indexing path. OPTION C posits PROVIDER_CONNECTION_IDENTITY as a separate entity from REPOSITORY_IMPORT_OR_CONNECTION. This is speculative: the current product has no evidence that a tenant will have multiple provider credentials for the same repository, or that a provider connection is a user-managed entity rather than an attribute of the import.

**Repository is renamed or transferred:** LOGICAL_REPOSITORY_IDENTITY is described as provider-independent or provider-qualified. A rename or transfer produces a new provider-qualified name. If identity is based on `owner/repo` string, renaming invalidates it silently. Neither OPTION B nor OPTION C specifies a stable upstream ID (e.g., GitHub numeric repository ID) vs. the mutable `owner/repo` string. This defect exists in both options but is hidden by OPTION C's language of "logical identity."

**User deletes account but workspace remains:** `DELETE /account` deletes local data for the user but does not address workspace ownership. If the user was workspace owner, the workspace is orphaned. Under OPTION C, the REPOSITORY_IMPORT_OR_CONNECTION is tied to the workspace and survives. The orphaned-workspace problem is not resolved by the ownership model in either option.

**Repository import is deleted while translation history exists:** `TranslationHistory.repository_name` is a bare TEXT field (`db_models.py` L83). There is no foreign key. Under OPTION C, deleting the REPOSITORY_IMPORT_OR_CONNECTION leaves history records carrying a `repository_name` string that may or may not reference a LOGICAL_REPOSITORY_IDENTITY. Under OPTION B, the same TEXT-field dangling occurs. OPTION C introduces a third entity that translation history must somehow reference, increasing inconsistency risk.

### 4.3 Answering the Mandatory Questions

1. **Does the current product actually require a distinct LOGICAL_REPOSITORY_IDENTITY entity now?** No. The current product has one credential path (server PAT), no cross-tenant sharing, no multi-provider support, and no approved requirement for provider-independent identity. LOGICAL_REPOSITORY_IDENTITY as a separate entity solves a problem that does not exist in the current approved product scope.

2. **Could a tenant-scoped repository import contain provider-qualified repository identity without a separate logical repository entity?** Yes. A single `RepositoryImport` record owned by a workspace, carrying `(workspace_id, provider_qualified_repo_name, provider_credential_ref, ...)`, satisfies GAP-01 through GAP-03 without a separate logical identity layer.

3. **Is OPTION C solving a current requirement or primarily preserving future extensibility?** Primarily future extensibility. Cross-tenant shared indexes are explicitly deferred. Multi-provider support is not an approved target capability. Provider-independent identity is not required by any approved gap or target capability.

4. **Does the current workspace model have sufficient semantics to become the owning tenant boundary with targeted adaptation?** Yes. `Workspace` already has `owner_email`, membership via `WorkspaceMember(role)`, and deletion cascade logic. Adding a `RepositoryImport` table scoped to `workspace_id` closes GAP-01 with minimal structural change. The existing application-layer authorization pattern (WHERE workspace_id = ? AND membership check) applies directly.

5. **Is the distinction between OWNING_TENANT_BOUNDARY and COLLABORATION_SCOPE necessary in the current product?** No. In the current product, every workspace is simultaneously owned by one user (OWNING_TENANT_BOUNDARY) and shared among members (COLLABORATION_SCOPE). These concepts are not in conflict and do not require separate entities.

6. **Can one concept safely serve as both tenant boundary and collaboration scope?** Yes. `Workspace` already does this for translation history (`TranslationHistory.workspace_id`). There is no evidence these roles produce conflict in the current product.

7. **Does separating those concepts now create an unnecessary authorization abstraction?** Yes. The AUTHORIZATION_PRINCIPAL in OPTION C is underspecified. The provisional model does not clarify whether AUTHORIZATION_PRINCIPAL is always a workspace or can be an individual user in different contexts. This ambiguity introduces authorization edge cases absent from the simpler workspace-first model.

8. **Is PROVIDER_CONNECTION_IDENTITY actually separate from REPOSITORY_IMPORT_OR_CONNECTION in the current ingestion model?** No. The current model uses a single server PAT for all ingestion. `UserGithubToken` exists for listing but is not used for indexing. PROVIDER_CONNECTION_IDENTITY is currently a system-level constant, not a per-tenant entity.

9. **Does the current product require multiple provider credentials referencing the same imported repository within one tenant boundary?** No. There is no evidence or approved capability requiring this.

10. **Is a provider connection abstraction required now, or can credential provenance remain an attribute of the import?** Credential provenance can remain an attribute of the import record. A `provider_credential_source` field is sufficient for current needs.

11. **Does OPTION C materially reduce security risk compared with OPTION B after cross-tenant shared indexes are removed?** No. Both options, when correctly implemented with workspace-scoped authorization, provide equivalent security isolation for current requirements. The additional entities in OPTION C do not add security; they add schema surface area that must itself be secured.

12. **Does OPTION C create more joins, lifecycle states, or deletion paths than its security benefit justifies?** Yes. Every authorization check requires joins across AUTHORIZATION_PRINCIPAL, REPOSITORY_IMPORT_OR_CONNECTION, and LOGICAL_REPOSITORY_IDENTITY. Deletion must cascade through three entities. These costs are not justified when OPTION B achieves equivalent isolation with two entities.

13. **What is the minimum ownership architecture that closes GAP-01?** A single `RepositoryImport` table with `(workspace_id, provider_qualified_repo_id, provider_credential_source, ...)` where search and indexing are gated by workspace membership. This is materially equivalent to OPTION B but implemented at workspace scope.

14. **Is OPTION B stronger for the current product?** Yes. OPTION B correctly identifies workspace as the owning scope and avoids speculative entity separation.

15. **Materially distinct option stronger than OPTION C:** OPTION B-CORRECTED: Workspace-owned repository import with provider-qualified identity as an attribute. Defined as: `Workspace (OWNING_TENANT_BOUNDARY and COLLABORATION_SCOPE) -> RepositoryImport (carries provider-qualified-repo-identity, credential-source-reference, current-source-state-ref, index-configuration-ref)`. LOGICAL_REPOSITORY_IDENTITY is not a separate entity; it is a qualified string attribute of the import. This closes GAP-01, supports GAP-02 (source state as attribute), supports GAP-03 (lifecycle state as attribute of the import record), requires no entity joins beyond workspace membership checks, and produces two deletion paths (workspace -> import -> index data) rather than three.

### 4.4 DEC-01 Reviewer Classification

**REJECT**

OPTION C is rejected in favour of OPTION B-CORRECTED. OPTION B-CORRECTED closes all approved gaps, is consistent with the existing authorization pattern, introduces two rather than three entity layers, eliminates speculative provider connection abstraction, and is reversible toward OPTION C if multi-provider cross-tenant requirements emerge. The strongest argument for OPTION C (extensibility for future multi-provider shared indexes) is explicitly a deferred concern. The strongest defect in OPTION C is that LOGICAL_REPOSITORY_IDENTITY as a separate entity provides no isolation benefit when cross-tenant sharing is deferred, while creating join overhead and deletion complexity unjustified for current requirements.

---

## 5. ARCH-DEC-03 Independent Challenge

### 5.1 Conceptual Identity Analysis

The provisional model defines four identities:

- DESIRED_INDEX_IDENTITY: the logical materialization requested for (import + source-state + index-configuration).
- INDEX_RUN_IDENTITY: an individual indexing execution attempt.
- TASK_DELIVERY_IDENTITY: the queue/task delivery or retry execution identity.
- SEARCHABLE_INDEX_IDENTITY: the successfully published materialization.

**Question 1: Is DESIRED_INDEX_IDENTITY a true entity or a deterministic uniqueness boundary?**

DESIRED_INDEX_IDENTITY is a deterministic uniqueness boundary, not a separate entity requiring its own row. It is the composite of: (repository_import_id, source_state_identity, index_configuration_identity). Its value is fully determined by those three inputs. Treating it as a separate persisted entity adds a row insertion step without adding information. The composite key IS the desired identity.

**Question 2: Does treating DESIRED_INDEX_IDENTITY as an explicit conceptual identity add value?**

Yes, as a named concept for reasoning about idempotency - it clarifies what equality means. No, as a separate persisted entity - the composite key on the import record is sufficient to express "currently desired state."

**Question 3: Can multiple INDEX_RUN_IDENTITY attempts safely target the same desired materialization?**

Yes. This is the correct model. Multiple runs can attempt to satisfy one desired materialization; only one may publish.

**Question 4: If two runs for the same desired materialization both complete successfully, which may publish?**

Exactly one. The publication invariant must guarantee this. The provisional model identifies compare-and-set semantics as appropriate. This is correct but the ABA analysis below challenges its sufficiency.

**Question 5: Is "one searchable index per desired index identity" sufficient?**

No, alone it is insufficient. The repository import must also track its currently desired source-state and configuration identity. If the desired identity has changed, an old run completing cannot publish even if its targeted identity matches the original desired identity as a string. This requires the import record to carry a "currently desired index identity" generation or token.

### 5.2 Mandatory ABA Stale-Publication Analysis

**Setup:** Source state A is requested (desired = DA, generation = 1). Run RA begins targeting (DA, gen=1). Source state B is requested (desired = DB, generation = 2). Run RB begins targeting (DB, gen=2). The product intentionally returns to source state A (desired = DA, generation = 3). Run RA may still be executing.

**The ABA problem under IDENTITY_EQUALITY_GUARD only:**

1. DA stored as currently-desired at generation 1. RA starts.
2. DB stored as currently-desired at generation 2. RA is now stale.
3. RB starts.
4. DA stored as currently-desired at generation 3. RB is now stale.
5. Old RA (from generation 1) completes. It checks: currently-desired-identity == DA? YES. It publishes.
6. But this is the OLD run from before B was ever requested. The newly-desired DA (generation 3) was meant to be indexed fresh.

Old RA incorrectly publishes under IDENTITY_EQUALITY_GUARD alone.

**Does compare-and-set survive ABA?**

No. A compare-and-set operation that sets the SEARCHABLE pointer if currently-desired equals DA will succeed for old RA even in the second DA period. The comparison cannot distinguish generation 1 from generation 3.

**Does the provisional publication invariant survive?**

Publication Model B (publish only if run targets the currently desired identity) is vulnerable to ABA as shown. Publication Model D (compare-and-set) is also vulnerable if the expected value is the same identity string as before.

**Is a MONOTONIC_DESIRED_GENERATION required?**

Yes. A monotonic generation counter resolves ABA. Each time a new desired identity is set, the generation increments, even if the identity string returns to a previously seen value. The publication invariant becomes: publish only if (currently-desired-identity == run.targeted-identity AND currently-desired-generation == run.targeted-generation). Under this invariant, old RA has generation 1, new DA request has generation 3, and old RA cannot publish.

**What minimum conceptual publication invariant prevents stale publication?**

MONOTONIC_DESIRED_GENERATION combined with IDENTITY_EQUALITY_GUARD. The invariant is: a run may publish only if its (targeted-identity, targeted-generation) pair matches the import record's (currently-desired-identity, current-desired-generation). Generation must increment on every new desired-state request, including re-requests of previously seen states.

EXPECTED_CURRENT_PUBLICATION_TOKEN (Publication Model D) is sufficient only if the token is monotonically unique (e.g., a UUID assigned per desired-state request), not the identity string. If the token is a unique value assigned per request, it is equivalent to MONOTONIC_DESIRED_GENERATION.

**Is the provisional OPTION B recommendation still valid after ABA analysis?**

OPTION B survives as the structural choice. The publication invariant as described is incomplete. It is a required correction, not a rejection.

### 5.3 FAILURE MODEL B Challenge

**Is batch identity stable enough for retry/debugging?**

Batch ordinal (`for i in range(0, len(chunks_data), BATCH_SIZE)`) is stable within one task invocation but changes meaning if chunk size or file ordering changes. Batch identity is weakly stable.

**Can failure metadata be bounded?**

Yes. For a 1 MB repository with 1500-char chunks and 200-char overlap, maximum chunk count is approximately 700, yielding at most 7 batches. Per-run failure metadata is small and bounded.

**Does storing only the latest batch failure hide repeated failures?**

Yes. A run that consistently fails on batch 3 across three retry attempts would show only the most-recent batch-3 failure. The count of attempts that hit batch 3 is lost. This is an acceptable MVP trade-off but should be documented as a limitation.

**Is FAILURE MODEL C (persisted batch execution records) necessary?**

No. FAILURE MODEL C is correctly eliminated. It is WORKFLOW_ENGINE pressure.

**What minimum metadata is operationally useful?**

Per-run: (run_status, total_chunks_attempted, total_chunks_inserted, failure_count, last_error_message, list of failed_file_paths bounded). File identity (file path) is more stable and actionable than batch ordinal, because batch ordinal changes when chunk configuration changes.

**Can batch boundaries change when configuration changes?**

Yes. If chunk size changes (which is part of index configuration identity per ARCH-DEC-02), the same file produces different batch membership. Batch ordinal is configuration-coupled, not file-coupled. Preferred failure metadata uses file-level granularity.

### 5.4 DEC-03 Reviewer Classification

**CONFIRM_WITH_CORRECTION**

OPTION B (immutable index-run records with conditional searchable pointer) survives the challenge. The structural direction is correct. Two required corrections:

1. The publication invariant must include a monotonically incrementing generation or uniqueness token per desired-state request. Identity equality alone fails the ABA problem.
2. Batch failure metadata should prefer file-level granularity over batch ordinal, since batch ordinals are configuration-coupled.

---

## 6. ARCH-DEC-04 Independent Challenge

### 6.1 Import Relationship vs Import Target Resolution Analysis

The provisional model classifies:
- IMPORT_TARGET_RESOLUTION: MUST_HAVE
- IMPORT_RELATIONSHIP (IMPORT_DECLARATION_OR_RELATIONSHIP): SHOULD_HAVE

**This is a conceptual ordering defect.**

IMPORT_RELATIONSHIP represents: "source module A declares an import of target B." IMPORT_TARGET_RESOLUTION represents: "that import resolves to this specific internal file or module." The resolution is a derived enrichment of the relationship. You cannot resolve a relationship that is not first declared.

**Question 1: Can import target resolution exist meaningfully without representing the import relationship?**

No. To record "file A's import of './utils' resolves to file 'src/utils.py'", you must first represent that file A imports './utils' at all. The resolution IS the import relationship plus a resolved target. They are not independent concepts.

**Question 2: Should IMPORT_RELATIONSHIP be MUST_HAVE?**

Yes. IMPORT_RELATIONSHIP (the declaration that source file A imports from target B) is a prerequisite for IMPORT_TARGET_RESOLUTION. Promoting the derived concept to MUST_HAVE while leaving the prerequisite at SHOULD_HAVE is logically inconsistent. If IMPORT_TARGET_RESOLUTION is MUST_HAVE, IMPORT_RELATIONSHIP must also be MUST_HAVE.

**Question 3: Should IMPORT_TARGET_RESOLUTION_WHERE_RELIABLE be MUST_HAVE or SHOULD_HAVE?**

SHOULD_HAVE. Import resolution fails for: external packages, dynamic imports, aliased imports, star imports, conditional imports. Reliable resolution is possible only for explicit relative or absolute internal imports with deterministic paths. MUST_HAVE classification overstates reliability and would cause indexing failures or metadata gaps for a significant class of import patterns.

Corrected classification:
- IMPORT_RELATIONSHIP (declaration): MUST_HAVE
- IMPORT_TARGET_RESOLUTION_WHERE_RELIABLE: SHOULD_HAVE

**Question 4: Does deterministic structural expansion require resolved import targets for minimum useful behaviour?**

No. Minimum useful behaviour requires knowing WHICH files a given file imports from (relationship), even without resolving WHERE those imports lead internally (target resolution). The retrieval system can fetch the file contents of declared imports even when target resolution fails, by treating the declared import path as a lookup key.

**Question 5: If resolution fails, can unresolved import relationships still improve retrieval?**

Yes. Knowing that file A imports from `./services/auth` allows the retrieval system to include the file at `services/auth.py` in context, even without a formally resolved entity relationship. File-level import relationship is sufficient for useful expansion.

### 6.2 Product Mode Structural Metadata Analysis

**Question 6: Does the provisional minimum support CODE TO ENGLISH without symbol references?**

Yes with degradation. Without symbol references, the system cannot determine WHICH symbols from an imported module are actually used in the selected code. It must include the entire imported module or its top-level exports, which inflates context budget. This is acceptable for MVP but produces noisier context.

**Question 7: Does it support ENGLISH TO CODE interface discovery?**

Partially. Without symbol references, the system cannot discover which exported interfaces are USED by existing code, only which interfaces EXIST. This limits the ability to prefer well-used interfaces over obscure ones. The impact is reduced precision in API discovery, not a complete failure.

**Question 8: Does it support CODE TO CODE repository-context retrieval?**

Partially. Source-side context benefits from import relationships (which modules does this code depend on?) and symbol definitions (what are the types and signatures involved?). Without symbol references, cross-file type dependency resolution is incomplete. The minimum metadata supports structural expansion to directly imported modules but not transitive dependencies.

**Question 9: Is SYMBOL_REFERENCE truly safe to defer?**

Yes, with explicit acknowledgement: without symbol references, structural expansion operates at file/module granularity, not symbol granularity. The expansion includes entire imported file content rather than just the relevant symbols, creating context budget pressure.

**Question 10: Without symbol references or call relationships, how does the system know which imported symbol is relevant?**

It does not. The system includes the enclosing symbol's full content (from symbol location metadata) and the full content of imported modules (from import relationship metadata). The LLM receiving this context must infer which imported symbols are relevant.

**Question 11: Can enclosing-symbol context plus file-level imports provide sufficient MVP quality?**

Yes. For CODE TO ENGLISH: enclosing symbol gives precise context, imported file content gives dependency context. For ENGLISH TO CODE: semantic candidates give entry points, exported symbol list gives available interfaces. For CODE TO CODE: source imports give dependency graph at file level. This is materially better than pure semantic chunking.

**Question 12: Is the provisional architecture overstating "precise definition resolution"?**

Yes. The provisional model claims IMPORT_TARGET_RESOLUTION (MUST_HAVE) enables "structural expansion to locate the precise definition of a symbol used in the current context." This requires: import relationship AND resolved target AND symbol reference to identify which definition within the target is relevant. With symbol references DEFERRED, the system can locate the target FILE but not the precise relevant SYMBOL within it. "Precise definition resolution" overstates what the MUST_HAVE set actually delivers.

**Question 13: Should the product claim deterministic structural neighbour expansion or bounded file/module structural expansion?**

Bounded file/module structural expansion is the honest claim given DEFERRED symbol references. "Deterministic" is accurate (the expansion is rule-based), but "neighbour" means file/module-level, not symbol-level.

**Question 14: True minimum structural metadata that materially improves retrieval:**

| Metadata Class | Revised Classification | Justification |
|---|---|---|
| File path | MUST_HAVE | All modes; prerequisite for every structural operation |
| Language | MUST_HAVE | All modes; parser selection, relevance filtering |
| File/module identity | MUST_HAVE | All modes; anchor for import relationship |
| Symbol definition (name, kind) | MUST_HAVE | CODE TO ENGLISH (enclosing context); ENGLISH TO CODE (interface list) |
| Symbol location (line bounds) | MUST_HAVE | CODE TO ENGLISH (precise code extraction without full file content) |
| Import relationship (declaration) | MUST_HAVE | All modes; prerequisite for any structural expansion; promoted from SHOULD_HAVE |
| Export relationship | SHOULD_HAVE | ENGLISH TO CODE; identifies available interfaces |
| Import target resolution (internal, reliable) | SHOULD_HAVE | All modes; enriches relationship; demoted from MUST_HAVE |
| Inheritance/extension relationship | SHOULD_HAVE | CODE TO CODE; type hierarchy |
| Symbol reference | DEFERRED | High metadata volume; context budget inflation; MVP not required |
| Call relationship | DEFERRED | Requires compiler-grade analysis for reliability |
| Control-flow relationship | DEFERRED/NON_GOAL | Explicitly excluded |
| Data-flow relationship | DEFERRED/NON_GOAL | Explicitly excluded |

**Per MUST_HAVE item analysis (product mode, retrieval dependence, degraded behaviour, free-tier pressure):**

- **File path**: All modes. Every structural query uses file path as lookup key. Absent: no structural retrieval possible. Pressure: negligible (one row per file).
- **Language**: All modes. Parser selection for structural extraction. Absent: parser cannot be selected; extraction fails silently. Pressure: negligible (one field per file).
- **File/module identity**: All modes. Import relationship source/target reference. Absent: import relationships cannot reference files. Pressure: negligible.
- **Symbol definition (name, kind)**: CODE TO ENGLISH (enclosing context), ENGLISH TO CODE (interface discovery). Absent: system cannot provide enclosing context for CODE TO ENGLISH; structural anchor is lost. Pressure: moderate (estimated 10-200 symbols per file for typical source files).
- **Symbol location (line bounds)**: CODE TO ENGLISH (precise code block extraction). Absent: must include entire file content rather than just the enclosing symbol; context budget inflation. Pressure: negligible (two integers per symbol).
- **Import relationship (declaration)**: All modes. Absent: no structural expansion possible even at file level; system degrades to semantic-only. Pressure: low-moderate (one row per import statement; Python and TypeScript files average 5-20 imports).

### 6.3 DEC-04 Reviewer Classification

**CONFIRM_WITH_CORRECTION**

OPTION C (file, symbols, and lightweight relationships) survives the challenge. Two required corrections:

1. IMPORT_RELATIONSHIP (the import declaration itself) must be promoted from SHOULD_HAVE to MUST_HAVE. It is a logical prerequisite for IMPORT_TARGET_RESOLUTION and for any structural expansion. Classifying the prerequisite as weaker than the derived concept is a logical defect.
2. IMPORT_TARGET_RESOLUTION_WHERE_RELIABLE must be demoted from MUST_HAVE to SHOULD_HAVE. Resolution is unreliable for dynamic, aliased, external, and conditional imports. MUST_HAVE classification overstates reliability.

---

## 7. ARCH-DEC-04 to ARCH-DEC-05 Coupling Challenge

### 7.1 Structural Neighbours Available Under Corrected DEC-04 Option C

| Neighbour Type | Availability | Source Metadata |
|---|---|---|
| Enclosing symbol (function/class) | AVAILABLE | Symbol definition + location |
| Same file/module content | AVAILABLE | File path |
| Imported modules (declared) | AVAILABLE | Import relationship (MUST_HAVE after correction) |
| Internal import targets (resolved) | CONDITIONALLY_AVAILABLE | Import target resolution (SHOULD_HAVE after correction) |
| Exported symbols | CONDITIONALLY_AVAILABLE | Export relationship (SHOULD_HAVE) |
| Parent class/interface | CONDITIONALLY_AVAILABLE | Inheritance relationship (SHOULD_HAVE) |
| Symbol definition within target file | CONDITIONALLY_AVAILABLE | Import target resolution + symbol definition |
| Semantically similar chunks | AVAILABLE | Vector index (existing capability) |

NOT AVAILABLE without DEFERRED metadata:
- Which specific symbol within an imported file is used
- Call graph neighbours
- Data/control flow neighbours

**Key finding:** "Deterministic structural expansion" under corrected DEC-04 Option C expands to imported MODULE level, not to individual SYMBOL level within imports. The provisional DEC-05 language implies finer-grained expansion than the metadata actually supports.

### 7.2 Universal OPTION A Evaluation by Product Mode

OPTION A: Query -> Semantic candidates -> Structural expansion of semantic candidates -> Context budget (applied universally).

**CODE TO ENGLISH: Is semantic-first appropriate when the selected code is explicitly supplied?**

No. When the user's selected code is explicitly supplied (the dominant CODE TO ENGLISH pattern), the selected code IS the anchor. Semantic retrieval is not needed to find it - it is already known. Performing semantic embedding of the selected code to find "similar chunks" when the exact code is in hand is:

1. Wasteful: generates an embedding for code already possessed.
2. Potentially misleading: semantic similarity finds code that is semantically similar, not the code that the SELECTED code structurally depends on.
3. Structurally inferior: the selected code's enclosing symbol and import relationships directly identify the structurally relevant neighbours without a vector search.

For CODE TO ENGLISH with explicit selection, structural-anchor-first retrieval is materially stronger. The anchor is the explicit file path and symbol location. Structural expansion from that anchor (enclosing symbol, imported files, parent classes) provides the context needed to explain the selected code. Semantic retrieval is useful only as a SUPPLEMENTATION step when structural neighbours do not fill the context budget.

**ENGLISH TO CODE: Is semantic-first appropriate?**

Yes. There is no explicit code anchor. The query is natural language. Semantic retrieval correctly finds entry points (files, symbols, patterns) matching the intent. Structural expansion enriches those candidates. OPTION A is appropriate for ENGLISH TO CODE.

**CODE TO CODE source side: Is semantic-first appropriate for the source code?**

No. The source code is explicitly supplied. The same argument as CODE TO ENGLISH applies: the source file/symbol is the anchor. Structural expansion from that anchor (source imports, source types, source dependencies) provides relevant source-side context without a semantic search step.

**CODE TO CODE target side: Is semantic-first appropriate?**

Yes. The target equivalent of the source pattern is found by semantic retrieval in the target repository. No explicit target anchor exists. OPTION A is appropriate for the target side.

**Conclusion:** OPTION A is NOT universally appropriate. It is appropriate for ENGLISH TO CODE and CODE TO CODE target-side. It is suboptimal for CODE TO ENGLISH (explicit selection) and CODE TO CODE source-side (explicit source).

### 7.3 Universal OPTION A vs MODE-AWARE Option Comparison

**Universal OPTION A:** Semantic first -> Structural expansion for all modes.

**MODE-AWARE Option:**
- CODE TO ENGLISH: explicit anchor -> structural expansion -> optional semantic supplementation
- ENGLISH TO CODE: semantic candidates -> structural expansion
- CODE TO CODE (source): explicit source anchor -> structural expansion
- CODE TO CODE (target): semantic target candidates -> structural expansion

| Criterion | Universal OPTION A | MODE-AWARE Option |
|---|---|---|
| Product fit (CODE TO ENGLISH) | WEAK: semantic step unnecessary when anchor is explicit | STRONG: direct structural expansion from known anchor |
| Product fit (ENGLISH TO CODE) | STRONG: no explicit anchor; semantic first is correct | STRONG: same |
| Product fit (CODE TO CODE source) | WEAK: source is explicit; semantic step wastes compute | STRONG: anchor-first is correct |
| Product fit (CODE TO CODE target) | STRONG: target is semantic | STRONG: same |
| Retrieval precision | MODERATE: semantic may miss exact structural dependencies | HIGH: anchor-first retrieval is deterministic for explicit anchors |
| Context budget | MODERATE: semantic candidates may include irrelevant neighbours | BETTER: explicit anchor expansion is targeted |
| Latency | HIGHER for explicit-anchor modes (unnecessary embedding + vector search) | LOWER for explicit-anchor modes |
| Implementation complexity | LOWER: one path | MODERATE: two paths (anchor vs semantic); each path is simpler |
| Explainability | LOWER: why was this semantic candidate selected? | HIGHER: explicit anchor -> structural expansion is fully traceable |
| Degraded behaviour | Degrades to semantic only when structural metadata absent | Degrades to: file content for anchor mode; semantic-only for no-anchor mode |
| Free-tier viability | MODERATE: extra embedding generation per explicit-anchor request | BETTER: no unnecessary embedding for explicit-anchor modes |
| Maintainability | LOWER: one path but wrong for some modes | MODERATE: two paths, each correct for its mode |

**Is MODE-AWARE Option materially stronger?**

Yes. For CODE TO ENGLISH and CODE TO CODE source-side (where the user's code is explicit), anchor-first retrieval is more precise, faster, cheaper in API calls, and more explainable. The implementation complexity increase is a single mode-conditional branch, not a framework.

### 7.4 DEC-05 Reviewer Classification

**REJECT**

Universal OPTION A is rejected in favour of MODE-AWARE retrieval. The provisional OPTION A applies semantic-first retrieval universally, which is inappropriate when the user's code is explicitly supplied. For CODE TO ENGLISH and CODE TO CODE source-side, anchor-first structural expansion is materially stronger. MODE-AWARE retrieval should be the provisional recommendation:

- CODE TO ENGLISH: explicit file/symbol anchor -> structural expansion (enclosing symbol, imported modules, parent classes) -> optional semantic supplementation if context budget permits
- ENGLISH TO CODE: semantic candidates -> structural expansion of candidates
- CODE TO CODE source: explicit source anchor -> structural expansion of source dependencies
- CODE TO CODE target: semantic target candidates -> structural expansion

This is not a universal retrieval framework. It is a mode-conditional selection between two well-defined sequences.

---

## 8. Free-Tier Reality Challenge

### 8.1 Current Repository Constraints Verified

From `app/services/github.py`: per-file size limit is 1 MB. **No total-file-count cap per repository. No total-repository-size cap.** `SUPPORTED_EXTENSIONS` includes 21 extension types.

From `app/services/embedding.py`: chunk size 1500 chars, 200-char overlap. Batch size in `tasks.py`: 100 chunks per embedding API call.

From AUDIT_FINDINGS.md L175: `FREE_MAX_FILE_SIZE = 50 * 1024` (50 KB), `PRO_MAX_FILE_SIZE = 200 * 1024` (200 KB). These apply to direct file uploads only, NOT to GitHub repository file fetching. The repository ingestion path has no equivalent free-tier size limit in current code.

**Storage pressure estimate for a large repository:** 5,000 files at 10 KB average = 50 MB raw content. At 1500 chars/chunk, approximately 33 chunks/file = 165,000 chunks. 165,000 embedding rows at 1536 dimensions, 4 bytes each = approximately 1 GB in pgvector alone. This is uncapped and would critically pressure any free-tier database.

### 8.2 Free-Tier Viability by Decision

**ARCH-DEC-01: ACCEPTABLE_WITH_LIMITS**

Adding a `RepositoryImport` table adds approximately 1 row per repository per workspace. This is negligible. The ownership model does not itself create storage pressure. Free-tier pressure comes from the absence of a per-workspace import count cap, which is not addressed by the ownership architecture decision alone.

Required conceptual limit: maximum number of repository imports per workspace on the free tier must be defined before implementation.

**ARCH-DEC-03: ACCEPTABLE_WITH_LIMITS**

The blue/green lifecycle model temporarily doubles pgvector storage during re-indexing. For a large repository (165,000 chunks at 1536 dim), simultaneous old and new index storage is approximately 2 GB in pgvector alone. This exceeds typical free-tier PostgreSQL storage limits (commonly 256 MB to 1 GB). Garbage collection failure (orphaned runs if worker crashes) creates unbounded storage growth.

Required conceptual limits: (a) maximum repository size must be enforced before accepting an indexing request on the free tier; (b) orphaned-run timeout must be defined (runs older than a defined threshold without completion are marked FAILED and eligible for GC); (c) GC must be triggered by a scheduled process, not only by successful run completion.

**ARCH-DEC-04: ACCEPTABLE_WITH_LIMITS**

Symbol metadata storage for a repository with 1,000 files averaging 50 symbols each = 50,000 symbol rows at approximately 200 bytes each = 10 MB. Import relationship rows: 1,000 files x 15 imports average = 15,000 rows at approximately 200 bytes each = 3 MB. Total structural metadata per average repository: approximately 13-15 MB relational storage. This compounds with pgvector storage for large repositories.

Parser/extraction failure isolation is a real concern: a malformed source file causing a parser exception should not fail the entire indexing run.

Required conceptual limits: (a) maximum symbols per file cap to prevent pathological generated files; (b) parser timeout per file to prevent stalls; (c) structural metadata rows must be lifecycle-managed per run to enable GC alongside embedding rows.

**ARCH-DEC-05: STRONG**

Retrieval is a query-time operation and does not create persistent storage pressure. Under MODE-AWARE retrieval, anchor-first modes avoid embedding generation, reducing API call pressure for CODE TO ENGLISH and CODE TO CODE source-side. Structural expansion requires additional bounded SQL queries (one per import relationship from the anchor). At free-tier latency, 2-5 additional SQL queries per retrieval request is acceptable.

The "god class blowup" risk (large files with many imports expanding into dozens of files in the context budget) is real but is an implementation constraint, not a storage concern. A maximum structural expansion neighbour count must be enforced at the retrieval layer.

### 8.3 Free-Tier Summary

| Decision | Viability | Required Conceptual Limits |
|---|---|---|
| ARCH-DEC-01 | ACCEPTABLE_WITH_LIMITS | Maximum repository imports per workspace on free tier |
| ARCH-DEC-03 | ACCEPTABLE_WITH_LIMITS | Maximum repository size before indexing; orphaned-run timeout; scheduled GC |
| ARCH-DEC-04 | ACCEPTABLE_WITH_LIMITS | Maximum symbols per file; parser timeout per file; structural metadata GC per run |
| ARCH-DEC-05 | STRONG | Maximum structural expansion neighbours per retrieval request |

---

## 9. Negative Architecture Pressure Check

| Pressure Item | Classification | Notes |
|---|---|---|
| Generic repository abstraction not required | PRESSURE_CREATED | ARCH-DEC-01 OPTION C: LOGICAL_REPOSITORY_IDENTITY is a generic repository abstraction. Resolved by adopting OPTION B-CORRECTED. |
| Provider integration framework | PRESSURE_CREATED | ARCH-DEC-01 OPTION C: PROVIDER_CONNECTION_IDENTITY as a separate entity creates pressure toward a provider integration framework. Resolved by adopting OPTION B-CORRECTED. |
| Event-sourced index lifecycle | NOT_CREATED | ARCH-DEC-03 OPTION B uses state columns, not event sourcing. |
| Workflow engine | NOT_CREATED | ARCH-DEC-03 OPTION B uses run records. FAILURE MODEL B (not C) prevents this. |
| Graph database | NOT_CREATED | DEC-04 OPTION C uses relational tables for structural metadata. |
| Compiler platform | NOT_CREATED | DEC-04 explicitly defers control/data flow; non-goals are documented. |
| Universal retrieval framework | PRESSURE_CREATED | ARCH-DEC-05 OPTION A (universal semantic-first) creates pressure toward a universal retrieval abstraction. MODE-AWARE option resolves this by making the conditional explicit. |
| Cross-tenant shared indexes | NOT_CREATED | Explicitly deferred in provisional model. OPTION B-CORRECTED does not create this pressure. |
| Repository memory subsystem | NOT_CREATED | GAP_ANALYSIS explicitly excludes this. Neither DEC-04 nor DEC-05 introduces it. |
| Autonomous coding agent | NOT_CREATED | No decision creates this pressure. |

---

## 10. Cross-Decision Challenge Findings

**FINDING-CD-01: DEC-01 OPTION C creates entity pressure that cascades into DEC-03 complexity.**

LOGICAL_REPOSITORY_IDENTITY in OPTION C implies that DESIRED_INDEX_IDENTITY (DEC-03) must reference a LOGICAL_REPOSITORY_IDENTITY, not just a workspace-scoped import. This adds one join to every lifecycle state transition check. Adopting OPTION B-CORRECTED eliminates this join.

**FINDING-CD-02: DEC-04 import relationship ordering defect cascades into DEC-05 retrieval capability claims.**

The provisional DEC-05 OPTION A claims "structural expansion locates the precise definition of a symbol." This claim requires: import relationship (MUST_HAVE after correction), import target resolution (SHOULD_HAVE after correction), AND symbol reference (DEFERRED in DEC-04). With symbol references deferred, DEC-05 expansion reaches the imported FILE, not the precise SYMBOL. The DEC-05 retrieval description must be corrected to match the actual metadata available.

**FINDING-CD-03: DEC-03 ABA risk is amplified by any cross-workspace shared identity.**

If LOGICAL_REPOSITORY_IDENTITY in OPTION C can be shared across workspaces (even as a deferred optimization), the "currently desired identity" for a given identity could be contested across multiple workspace imports. OPTION B-CORRECTED eliminates this risk by scoping the desired-state entirely within one workspace import record.

**FINDING-CD-04: DEC-05 semantic-first assumption in CODE TO ENGLISH conflicts with DEC-04 structural metadata availability.**

The provisional DEC-05 argues semantic retrieval finds the anchor and structural expansion enriches it. For CODE TO ENGLISH, the user-supplied code IS the anchor. Semantic retrieval of "similar code" finds files that look similar, not files that are structurally depended on. The corrected DEC-04 structural metadata (import relationships, MUST_HAVE) directly enables anchor-first expansion that is more precise and does not require semantic retrieval.

**FINDING-CD-05: Missing per-repository ingestion size cap spans DEC-01, DEC-03, and DEC-04.**

No architecture decision caps the number of files or total size of a repository that can be indexed. This omission creates unbounded storage pressure across embedding rows (DEC-03), structural metadata rows (DEC-04), and index lifecycle records (DEC-03). All three decisions require a coordinated maximum-repository-size concept before production deployment on any free tier. No current implementation enforces a total repository size limit during ingestion.

---

## 11. Reviewer Classifications

| Decision | Existing Provisional Recommendation | Reviewer Classification | Strongest Surviving Argument | Strongest Defect | Required Correction |
|---|---|---|---|---|---|
| ARCH-DEC-01 | OPTION C: Repository connection/import separated from logical repository identity | REJECT | Correctly identifies that workspace-level ownership is insufficient and provider credentials need scoping; correctly defers cross-tenant sharing | LOGICAL_REPOSITORY_IDENTITY as a separate entity provides no isolation benefit when cross-tenant sharing is deferred; adds join overhead and deletion complexity without current justification; PROVIDER_CONNECTION_IDENTITY is speculative given current single-server-PAT model | Adopt OPTION B-CORRECTED: workspace-owned repository import with provider-qualified identity as an attribute of the import record |
| ARCH-DEC-03 | OPTION B: Immutable index-run records with atomic searchable pointer | CONFIRM_WITH_CORRECTION | Immutable run records with conditional pointer update correctly isolate runs, enable zero-downtime re-indexing, and prevent partial index exposure; stale-worker publication risk is acknowledged | Publication invariant (identity equality guard alone) fails the ABA problem: source state A -> B -> A allows an old run targeting generation-1-A to incorrectly publish during the generation-3-A period | Add monotonic generation counter or per-request unique token to the publication invariant; correct batch failure metadata to use file-level granularity rather than batch ordinal |
| ARCH-DEC-04 | OPTION C: File, symbols, and lightweight relationships | CONFIRM_WITH_CORRECTION | File plus symbol plus relationship metadata materially improves retrieval over semantic-only for all three product modes; correctly defers symbol references and call relationships | IMPORT_RELATIONSHIP (the prerequisite for all structural expansion) is classified SHOULD_HAVE while IMPORT_TARGET_RESOLUTION (the derived concept) is classified MUST_HAVE; this inverts the logical dependency; the claim of "precise definition resolution" overstates what DEFERRED symbol references allow the metadata to support | Promote IMPORT_RELATIONSHIP to MUST_HAVE; demote IMPORT_TARGET_RESOLUTION to SHOULD_HAVE; correct stated retrieval capability to "bounded file/module structural expansion" |
| ARCH-DEC-05 | OPTION A: Semantic retrieval followed by deterministic structural expansion (universal) | REJECT | Semantic-first retrieval is correctly appropriate for ENGLISH TO CODE and CODE TO CODE target-side; structural expansion from semantic candidates correctly enriches context | Universal application of semantic-first retrieval is suboptimal for CODE TO ENGLISH and CODE TO CODE source-side where the user's code is explicit; anchor-first structural expansion is more precise, faster, cheaper, and more explainable for these modes | Adopt MODE-AWARE retrieval: anchor-first for explicit-anchor modes; semantic-first for no-anchor modes |

---

## 12. Required Corrections Before Final Selection

**CORRECTION-01 (ARCH-DEC-01):** Reject OPTION C. Define and adopt OPTION B-CORRECTED: workspace-owned repository import with provider-qualified identity as an attribute. The workspace is simultaneously the OWNING_TENANT_BOUNDARY and COLLABORATION_SCOPE. No separate LOGICAL_REPOSITORY_IDENTITY entity is created. PROVIDER_CONNECTION_IDENTITY is an attribute of the import record, not a separate entity.

**CORRECTION-02 (ARCH-DEC-03):** Add monotonic generation or per-request unique token to publication invariant. A run may publish only if its (targeted-identity, targeted-generation) pair matches the import record's (currently-desired-identity, current-desired-generation). Generation increments on every new desired-state request, including requests returning to a previously seen state.

**CORRECTION-03 (ARCH-DEC-03):** Define orphaned-run detection: index runs that have not reached a terminal state within a defined timeout must be marked FAILED by a scheduled process and made eligible for garbage collection. GC must be scheduled independently of run completion.

**CORRECTION-04 (ARCH-DEC-04):** Promote IMPORT_RELATIONSHIP (import declaration) from SHOULD_HAVE to MUST_HAVE. It is the prerequisite for structural expansion and for import target resolution.

**CORRECTION-05 (ARCH-DEC-04):** Demote IMPORT_TARGET_RESOLUTION from MUST_HAVE to SHOULD_HAVE. Resolution is unreliable for dynamic, aliased, conditional, and external imports. MUST_HAVE classification overstates reliability.

**CORRECTION-06 (ARCH-DEC-04 and ARCH-DEC-05):** Correct the stated retrieval capability to "bounded file/module structural expansion" rather than "precise symbol definition resolution." The latter requires symbol references (DEFERRED). The former correctly describes what the corrected MUST_HAVE metadata actually supports.

**CORRECTION-07 (ARCH-DEC-05):** Reject universal OPTION A. Adopt MODE-AWARE retrieval. Two explicit sequences: (a) anchor-first: explicit file/symbol anchor -> structural expansion of imported modules and enclosing context -> optional semantic supplementation; (b) semantic-first: embedding of query -> semantic candidates -> structural expansion. MODE selection is conditioned on whether the user's code is explicitly provided.

**CORRECTION-08 (ALL DECISIONS):** Define a maximum repository size (total files or total raw bytes) enforced before an indexing request is accepted on the free tier. This is a cross-cutting operational constraint spanning DEC-01 (import record acceptance), DEC-03 (run creation), and DEC-04 (structural metadata generation). It must be specified before any implementation decision is finalized.

**Total required corrections: 8**

---

## 13. Independent Reviewer Recommendation

Two of the four provisional recommendations require rejection and two require material correction before final selection.

**ARCH-DEC-01** should not proceed as OPTION C. OPTION B-CORRECTED is architecturally stronger for the current product: simpler entity model, fewer joins, fewer deletion paths, equal security isolation, and no speculative abstractions. The future extensibility argument for OPTION C is insufficient to justify the complexity cost when cross-tenant sharing is explicitly deferred and multi-provider support is not an approved target capability.

**ARCH-DEC-03** is directionally correct as OPTION B but must incorporate a monotonic generation invariant before the publication guard is sound. The ABA scenario is a real correctness risk, not a theoretical edge case. It occurs whenever a user re-indexes a repository to the same source state after an intervening different-state request.

**ARCH-DEC-04** is directionally correct as OPTION C but the MUST_HAVE and SHOULD_HAVE classifications for import relationship and import target resolution are inverted. This inversion creates a logical dependency defect and causes the stated retrieval capability to overstate what the metadata actually delivers.

**ARCH-DEC-05** should not proceed as universal OPTION A. MODE-AWARE retrieval is materially stronger for explicit-anchor modes in precision, latency, API cost, and explainability. Universal semantic-first retrieval for explicit-anchor modes wastes an embedding generation call and finds semantically-similar code rather than structurally-dependent code, which is the opposite of what is needed when explaining or translating user-selected code.

The cross-decision finding most critical to address before final selection is FINDING-CD-05: the absence of a per-repository ingestion size cap spans all four decisions and creates unbounded free-tier storage risk that no single decision currently controls.

---

## 14. Final Verification

| Verification Item | Result |
|---|---|
| ARCHITECTURE_OPTIONS.md modified | NO - read-only; challenge created in separate file |
| Production code changed | NO |
| Migrations created | NO |
| Dependencies installed | NO |
| Final ADR created | NO |
| Final architecture selected | NO |
| All four decisions have exactly one classification | YES (DEC-01: REJECT, DEC-03: CONFIRM_WITH_CORRECTION, DEC-04: CONFIRM_WITH_CORRECTION, DEC-05: REJECT) |
| ABA stale-publication risk explicitly analysed | YES - Section 5.2 |
| Import relationship vs import target resolution explicitly analysed | YES - Section 6.1 |
| Explicit-anchor retrieval compared to semantic-first | YES - Section 7.2 |
| Mode-aware retrieval compared to universal retrieval | YES - Section 7.3 |
| Free-tier viability classified for all four decisions | YES - Section 8 |
| All ten negative architecture pressures classified | YES - Section 9 |
| Raw control-character scan | PASS - document contains standard ASCII, markdown tables, and line feeds only; no unexpected control characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F) present |

---

*Loop 4B Independent Adversarial Architecture Challenge complete. Awaiting explicit authorization for the next protocol action.*
