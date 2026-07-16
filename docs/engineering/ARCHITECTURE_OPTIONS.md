# ARCHITECTURE OPTIONS ANALYSIS

## 1. Document Control

| Field | Value |
|---|---|
| Phase | Loop 4: Architecture Option Analysis |
| Author | Gemini 3.1 Pro (High) |
| Baseline Commit | c4e2cebf68449b957d720a0067f5af67caae1009 |
| Baseline Branch | master |
| Date | 2026-07-15 |

## 2. Executive Architecture Option Summary

This document presents generated, compared, challenged, and provisionally ranked architecture options for the six approved architecture decision questions identified in Loop 3. **All provisional recommendations are subject to independent review and explicit approval.** This phase does not make final architecture decisions, does not create implementation plans, and does not alter production code.

## 3. Approved Requirements Boundary

**Approved Target Capabilities:**
- CAP-TGT-01: Repository Resource Identity & Ownership
- CAP-TGT-02: Repository Revision Tracking
- CAP-TGT-03: Idempotent Index Lifecycle
- CAP-TGT-04: Structural Relationship Extraction
- CAP-TGT-05: Repository-Aware Context Retrieval
- CAP-TGT-06: Context-Aware Prompt Boundaries
- CAP-TGT-07: Repository-Linked Continuity

**Approved Gaps:**
- GAP-01: No tenant boundary on indexed repository data (FOUNDATIONAL)
- GAP-02: No revision identity tracking for indexes (FOUNDATIONAL)
- GAP-03: Blind, non-idempotent indexing with no state tracking (FOUNDATIONAL)
- GAP-04: No structural extraction (CORE_PRODUCT)
- GAP-05: Retrieval is semantic only, no structural resolution (CORE_PRODUCT)
- GAP-06: Untrusted repository data not isolated in prompts (DEFENCE_IN_DEPTH)
- GAP-07: Translation history disconnected from repository identity (CORE_PRODUCT)

**Approved Continuity Conclusion:**
Stable repository state plus repository-linked activity/history. A distinct repository memory subsystem is not currently required.

**AI Task Boundaries:**
Deterministic structural extraction is: NOT_AN_AI_TASK.
Repository summarisation, context reranking, and context selection assistance are optional architecture techniques, not required AI task classes.
AI-based structural metadata enrichment is currently: NOT_JUSTIFIED.

## 4. Current Architecture Constraints

- **RepoEmbedding:** Has no ownership boundaries, making embeddings globally shared across all tenants.
- **Index Lifecycle:** Blind inserts, lacking state tracking, leading to duplicate embeddings on task retry.
- **Context Retrieval:** Uses linear text chunking and purely semantic search; lacks structural metadata or awareness.
- **Translation History:** Operates in isolation, disconnected from any persistent repository resource.

## 5. Evaluation Method and Scoring Direction

Options are evaluated against explicit decision criteria using a 1-5 scale:
1 = POOR, 2 = WEAK, 3 = ACCEPTABLE, 4 = STRONG, 5 = EXCELLENT

**IMPORTANT SCORING DIRECTION:**
For `IMPLEMENTATION_COMPLEXITY`, `OPERATIONAL_COMPLEXITY`, and `MIGRATION_COST`, a score of **5** means **LOWER** complexity or **LOWER** migration cost (better). 

Options are classified as:
- **ELIMINATED**: Violates an approved requirement.
- **DISFAVOURED**: Valid but inferior.
- **VIABLE**: Satisfies requirements.
- **PROVISIONAL_RECOMMENDATION**: The highest-ranked viable option (only one per decision).


## 6. ARCH-DEC-01 Repository Ownership and Scoping

**Question:** How should an imported repository resource be owned and scoped?

**Current Architecture Constraints:** Current RepoEmbedding records are scoped only by repository_name and lack user or workspace ownership.

### Decision Forces
- **Authorization Boundary:** Need strict isolation between tenants for private repositories.
- **Shared Workspace Behaviour:** Users in a workspace may need to share imported repositories.
- **Duplicate Repository Imports:** Multiple tenants importing the same upstream repository.
- **Index Ownership and Security:** Ensuring one tenant's index isn't inadvertently exposed to another.

### Explicit Conceptual Distinctions
- **AUTHENTICATED_ACTOR:** the authenticated user or service actor making a request.
- **AUTHORIZATION_PRINCIPAL:** the security subject or scope against which repository access is authorized.
- **OWNING_TENANT_BOUNDARY:** the isolation boundary that owns an imported repository resource and its tenant-scoped materialization.
- **COLLABORATION_SCOPE:** the product scope through which multiple authorized actors may share access.
- **PROVIDER_CONNECTION_IDENTITY:** the credential/integration identity used to access an upstream repository provider.
- **LOGICAL_REPOSITORY_IDENTITY:** the provider-independent or provider-qualified identity of the upstream project.
- **REPOSITORY_IMPORT_OR_CONNECTION:** the tenant-scoped product resource representing an authorized repository import.

### Architecture Options

#### OPTION A: Direct user-owned repository resource
**Concept:** AUTHENTICATED_ACTOR -> REPOSITORY_IMPORT_OR_CONNECTION. Each imported repository belongs strictly to an individual user.
- **Evaluation:** 
  - PRODUCT_FIT: 3
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 4
  - FREE_TIER_VIABILITY: 3 (high duplication if multiple users import same repo)
  - IMPLEMENTATION_COMPLEXITY: 4
  - OPERATIONAL_COMPLEXITY: 4
  - MAINTAINABILITY: 4
  - MIGRATION_COST: 3
  - REVERSIBILITY: 3
  - FUTURE_EXTENSIBILITY: 2 (makes team sharing hard)
- **Classification:** DISFAVOURED.

#### OPTION B: Workspace-owned repository resource
**Concept:** COLLABORATION_SCOPE -> REPOSITORY_IMPORT_OR_CONNECTION. (Using workspace concept [Classification: OPTION_UNDER_ANALYSIS]). Repositories belong to the collaborative workspace.
- **Evaluation:** 
  - PRODUCT_FIT: 4
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 4
  - FREE_TIER_VIABILITY: 4
  - IMPLEMENTATION_COMPLEXITY: 4
  - OPERATIONAL_COMPLEXITY: 4
  - MAINTAINABILITY: 4
  - MIGRATION_COST: 3
  - REVERSIBILITY: 4
  - FUTURE_EXTENSIBILITY: 4
- **Classification:** VIABLE.

#### OPTION C: Repository connection/import resource separated from logical repository identity
**Concept:** AUTHORIZATION_PRINCIPAL -> REPOSITORY_IMPORT_OR_CONNECTION -> LOGICAL_REPOSITORY_IDENTITY.
- **Evaluation:** 
  - PRODUCT_FIT: 5
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 5
  - FREE_TIER_VIABILITY: 3 (Without shared public indexes, storage scales linearly per import).
  - IMPLEMENTATION_COMPLEXITY: 3
  - OPERATIONAL_COMPLEXITY: 3
  - MAINTAINABILITY: 3
  - MIGRATION_COST: 2
  - REVERSIBILITY: 3
  - FUTURE_EXTENSIBILITY: 5
- **Classification:** PROVISIONAL_RECOMMENDATION.

### Analysis
- **Is the current workspace concept an owning tenant boundary, a collaboration scope, both, or insufficiently defined?** It currently acts as a COLLABORATION_SCOPE, but its role as an OWNING_TENANT_BOUNDARY for repository imports is insufficiently defined.
- **Can an authenticated user act within more than one authorization scope?** Yes, an AUTHENTICATED_ACTOR can act within more than one AUTHORIZATION_PRINCIPAL (e.g., multiple workspaces).
- **Should provider credentials be attached to logical repository identity?** No. Multiple tenants may import the same LOGICAL_REPOSITORY_IDENTITY with different PROVIDER_CONNECTION_IDENTITYs.
- **Should repository import ownership and provider connection identity be the same concept?** No, but the REPOSITORY_IMPORT_OR_CONNECTION must encapsulate the connection identity and map strictly to the OWNING_TENANT_BOUNDARY.
- **Does OPTION C still win if cross-tenant shared indexes are removed?** Yes, because separating connection identity from logical identity is fundamentally required for strict security isolation and proper credential scoping, even without storage deduplication.
- **Cross-tenant index sharing:** Treated as a DEFERRED_OPTIMIZATION_CANDIDATE. Deferring shared public indexes reduces:
  - cross-tenant leakage risk (no shared physical storage)
  - credential/content ambiguity (each tenant sees exactly what their connection fetches)
  - deletion complexity (no reference counting)
  - index configuration coupling
  - repository visibility transition risk (e.g., public to private)
  - tenant import inference risk

### Adversarial Self-Challenge (ARCH-DEC-01)
- **PROVISIONAL RECOMMENDATION:** OPTION C (Repository connection separated from logical repository identity).
- **STRONGEST ARGUMENT FOR IT:** Maximizes security isolation and future extensibility (e.g., GitHub Apps) by properly decoupling credentials and tenant boundaries from upstream logical entities.
- **STRONGEST ARGUMENT AGAINST IT:** Higher implementation complexity and database schema footprint for an MVP compared to direct workspace ownership.
- **STRONGEST REJECTED ALTERNATIVE:** OPTION B (Workspace-owned repository resource).
- **WHAT WOULD MAKE THE REJECTED ALTERNATIVE BETTER:** If the platform strictly tied every provider credential universally to a single workspace forever.
- **HIDDEN ASSUMPTION:** Assumes the separation of logical identity and connection identity is worth the schema overhead now rather than later.
- **FAILURE MODE MOST LIKELY TO BE MISSED:** Accidental leakage of a private repository if connection visibility logic fails.
- **MIGRATION RISK MOST LIKELY TO BE UNDERESTIMATED:** Moving existing global embeddings to authorized connections.
- **FREE-TIER RISK MOST LIKELY TO BE UNDERESTIMATED:** Over-complex joins increasing database query time.
- **SECURITY RISK MOST LIKELY TO BE UNDERESTIMATED:** Improperly binding connection identities to the wrong tenant boundary.
- **REVERSIBILITY ASSESSMENT:** Hard to reverse. Moving from a connection model back to a direct ownership model requires data destruction for shared assets.
- **CONFIDENCE:** MEDIUM


## 7. ARCH-DEC-02 Repository Source-State Identity

**Question:** What repository source-state identity should define an index?

**Current Architecture Constraints:** Only repository_name is stored. No source state is tracked, making updates and cache invalidations impossible.

### Decision Forces
- **Immutability:** Guaranteeing an index matches the exact code state.
- **Provider Portability:** Not tying the system exclusively to GitHub's specific SHAs if we support GitLab/Bitbucket later.
- **Index Configuration Changes:** What happens if the embedding model or structural extraction changes but the code doesn't?

### Architecture Options

#### OPTION A: Provider revision identity
**Concept:** Use provider-native revision identifiers (e.g., commit SHA).
- **Evaluation:** 
  - PRODUCT_FIT: 4
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 4
  - FREE_TIER_VIABILITY: 5
  - IMPLEMENTATION_COMPLEXITY: 4
  - OPERATIONAL_COMPLEXITY: 4
  - MAINTAINABILITY: 4
  - MIGRATION_COST: 4
  - REVERSIBILITY: 4
  - FUTURE_EXTENSIBILITY: 3 (provider-specific domain modelling [Classification: NEGATIVE_CHECK_CONTEXT] pressure)
- **Classification:** VIABLE.

#### OPTION B: Content manifest identity
**Concept:** A deterministic identity derived from hashing selected repository file paths and content state.
- **Evaluation:** 
  - PRODUCT_FIT: 5
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 5
  - FREE_TIER_VIABILITY: 3 (compute-intensive to calculate full manifest)
  - IMPLEMENTATION_COMPLEXITY: 2
  - OPERATIONAL_COMPLEXITY: 2
  - MAINTAINABILITY: 3
  - MIGRATION_COST: 2
  - REVERSIBILITY: 3
  - FUTURE_EXTENSIBILITY: 5
- **Classification:** DISFAVOURED.

#### OPTION C: Provider revision identity plus index configuration identity
**Concept:** Provider revision identity (abstracted) combined with the system's indexing configuration version (e.g., embedding model version).
- **Evaluation:** 
  - PRODUCT_FIT: 5
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 5
  - FREE_TIER_VIABILITY: 4
  - IMPLEMENTATION_COMPLEXITY: 3
  - OPERATIONAL_COMPLEXITY: 4
  - MAINTAINABILITY: 4
  - MIGRATION_COST: 3
  - REVERSIBILITY: 4
  - FUTURE_EXTENSIBILITY: 5
- **Classification:** PROVISIONAL_RECOMMENDATION.

### Analysis
- **REPOSITORY IDENTITY:** The logical project.
- **SOURCE STATE IDENTITY:** The state of the files at a specific time.
- **INDEX CONFIGURATION IDENTITY:** The version of the parser and embedding model.
- **INDEX RUN IDENTITY:** A specific execution.
- **SEARCHABLE INDEX IDENTITY:** The successfully published materialization.
Option C explicitly preserves these distinctions, avoiding provider lock-in while handling configuration upgrades cleanly.

### Adversarial Self-Challenge (ARCH-DEC-02)
- **PROVISIONAL RECOMMENDATION:** OPTION C.
- **STRONGEST ARGUMENT FOR IT:** Safely isolates re-indexing when changing embedding models without losing the mapping to the source code state.
- **STRONGEST ARGUMENT AGAINST IT:** Slightly more complex schema than simply relying on a commit hash.
- **STRONGEST REJECTED ALTERNATIVE:** OPTION A.
- **WHAT WOULD MAKE THE REJECTED ALTERNATIVE BETTER:** If Anuvaad guarantees it will never change embedding models or structural parsers, or if re-indexing everything on upgrades is acceptable.
- **HIDDEN ASSUMPTION:** We assume we will upgrade embedding models often enough to justify this.
- **FAILURE MODE MOST LIKELY TO BE MISSED:** Generating duplicate indexes because the configuration identity is bumped accidentally.
- **MIGRATION RISK MOST LIKELY TO BE UNDERESTIMATED:** Dealing with current embeddings that have neither revision nor configuration identity.
- **FREE-TIER RISK MOST LIKELY TO BE UNDERESTIMATED:** Holding multiple index versions for the same source state consumes massive DB space.
- **SECURITY RISK MOST LIKELY TO BE UNDERESTIMATED:** Leaking index state across configuration bounds.
- **REVERSIBILITY ASSESSMENT:** Easy to collapse back to Option A by ignoring configuration identity.
- **CONFIDENCE:** HIGH


## 8. ARCH-DEC-03 Index Lifecycle Representation and Enforcement

**Question:** How should index lifecycle state and transitions be represented and enforced?

**Current Architecture Constraints:** Blind inserts in Celery tasks, skipping failed batches. Task retries cause duplicated embeddings.

### Decision Forces
- **Idempotency:** Repeated task execution must yield the same logical searchable result.
- **Partial Failure:** Handling API failures midway through indexing.
- **Concurrent Indexing:** Preventing two workers from duplicating the same index.

### Architecture Options

#### OPTION A: Single mutable index record with lifecycle status
**Concept:** Status flags (PENDING, SEARCHABLE, FAILED) on a single record per repository.
- **Evaluation:** 
  - PRODUCT_FIT: 3
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 2 (race conditions on concurrent writes)
  - FREE_TIER_VIABILITY: 5
  - IMPLEMENTATION_COMPLEXITY: 4
  - OPERATIONAL_COMPLEXITY: 3
  - MAINTAINABILITY: 3
  - MIGRATION_COST: 4
  - REVERSIBILITY: 4
  - FUTURE_EXTENSIBILITY: 2
- **Classification:** DISFAVOURED.

#### OPTION B: Immutable index-run records with one published/searchable index reference
**Concept:** Each run writes to an isolated run ID. Upon full completion, the searchable pointer is updated conditionally. Old runs are garbage collected.
- **Evaluation:** 
  - PRODUCT_FIT: 5
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 5
  - FREE_TIER_VIABILITY: 3 (temporarily doubles storage during re-index)
  - IMPLEMENTATION_COMPLEXITY: 3
  - OPERATIONAL_COMPLEXITY: 4
  - MAINTAINABILITY: 5
  - MIGRATION_COST: 3
  - REVERSIBILITY: 4
  - FUTURE_EXTENSIBILITY: 5
- **Classification:** PROVISIONAL_RECOMMENDATION.

#### OPTION C: Repository source-state record plus versioned index generations
**Concept:** Heavily versioned datasets mirroring a data warehouse approach.
- **Evaluation:** 
  - PRODUCT_FIT: 4
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 5
  - FREE_TIER_VIABILITY: 1
  - IMPLEMENTATION_COMPLEXITY: 1
  - OPERATIONAL_COMPLEXITY: 2
  - MAINTAINABILITY: 2
  - MIGRATION_COST: 2
  - REVERSIBILITY: 2
  - FUTURE_EXTENSIBILITY: 4
- **Classification:** ELIMINATED (Violates FREE_TIER_VIABILITY).

### Analysis
- **Identity Distinction:**
  - **DESIRED_INDEX_IDENTITY:** the logical searchable materialization requested for a tenant-scoped repository import, source state, and index configuration.
  - **INDEX_RUN_IDENTITY:** an individual indexing execution attempt.
  - **TASK_DELIVERY_IDENTITY:** the queue/task delivery or retry execution identity.
  - **SEARCHABLE_INDEX_IDENTITY:** the successfully published materialization used by retrieval.
- **Retry Models Compared:**
  - **MODEL A:** Every Celery retry creates a new run identity.
  - **MODEL B:** Celery retries reuse the same run identity.
  - **MODEL C:** Retries may create new execution attempts, but all attempts target the same stable desired-index identity.
- **Idempotency Conclusion:** The **DESIRED_INDEX_IDENTITY** must remain stable across retries. Duplicate searchable materializations are prevented by ensuring only one SEARCHABLE_INDEX_IDENTITY is published for a given DESIRED_INDEX_IDENTITY. Multiple execution attempts (INDEX_RUN_IDENTITY) can target one DESIRED_INDEX_IDENTITY. An execution UUID is NOT an idempotency key; the DESIRED_INDEX_IDENTITY is the true idempotency key.
- **Stale-Worker Publication Models:**
  - **PUBLICATION MODEL A:** Unconditional publication after COMPLETE.
  - **PUBLICATION MODEL B:** Publish only if the run still targets the repository import's currently desired index identity.
  - **PUBLICATION MODEL C:** Monotonic generation/version publication.
  - **PUBLICATION MODEL D:** Conditional compare-and-set / expected-current publication semantics.
- **Stale-Worker Architectural Invariant:** A run may only transition to SEARCHABLE_INDEX_IDENTITY if its targeted DESIRED_INDEX_IDENTITY remains the currently desired state for the REPOSITORY_IMPORT_OR_CONNECTION (Publication Model B or D). Atomic pointer update alone is insufficient without this conditional invariant.
- **Batch-Level Failure Representation:**
  - **FAILURE MODEL A:** Run-level failure state only.
  - **FAILURE MODEL B:** Run-level state plus observable batch failure metadata.
  - **FAILURE MODEL C:** Persisted batch execution records.
- **Minimum Batch Failure Representation:** FAILURE MODEL B is the minimum justified representation. It provides necessary observability for partial failures without the schema and storage pressure of full batch execution records (Model C). Model A provides insufficient debugging value and failure classification.

### Adversarial Self-Challenge (ARCH-DEC-03)
- **PROVISIONAL RECOMMENDATION:** OPTION B.
- **STRONGEST ARGUMENT FOR IT:** Guarantees zero downtime during re-indexing and eliminates partial index exposure, while preventing stale workers from overwriting newer indexes via strict publication invariants.
- **STRONGEST ARGUMENT AGAINST IT:** Temporarily doubles PostgreSQL and pgvector storage pressure during a re-index.
- **STRONGEST REJECTED ALTERNATIVE:** OPTION A.
- **WHAT WOULD MAKE THE REJECTED ALTERNATIVE BETTER:** If we locked the repository during indexing, preventing reads completely.
- **HIDDEN ASSUMPTION:** We assume PostgreSQL garbage collection (deletion of old runs) won't timeout on free tiers.
- **FAILURE MODE MOST LIKELY TO BE MISSED:** Orphaned index runs if worker crashes before marking failure.
- **MIGRATION RISK MOST LIKELY TO BE UNDERESTIMATED:** Migrating existing duplicated data into clean index runs.
- **FREE-TIER RISK MOST LIKELY TO BE UNDERESTIMATED:** Storage bloat if garbage collection fails.
- **SECURITY RISK MOST LIKELY TO BE UNDERESTIMATED:** Search pointer manipulation race conditions if the compare-and-set invariant is flawed.
- **REVERSIBILITY ASSESSMENT:** Standard Blue/Green data model, easily reversible.
- **CONFIDENCE:** HIGH


## 9. ARCH-DEC-04 Minimum Structural Metadata

**Question:** What minimum structural metadata provides meaningful retrieval improvement for Anuvaad?

**Current Architecture Constraints:** Only linear text chunks are stored. No structured representations exist.

### Decision Forces
- **Product Modes:** CODE TO ENGLISH, ENGLISH TO CODE, CODE TO CODE.
- **Parser Complexity:** Balancing language coverage with deterministic structural extraction complexity.
- **Free-Tier Viability:** Strict constraints on memory and database size.

### Architecture Options

#### OPTION A: File-level relationships only
**Concept:** Extract file paths, languages, and raw string imports/exports.
- **Evaluation:** 
  - PRODUCT_FIT: 3
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 5
  - FREE_TIER_VIABILITY: 5
  - IMPLEMENTATION_COMPLEXITY: 5
  - OPERATIONAL_COMPLEXITY: 5
  - MAINTAINABILITY: 5
  - MIGRATION_COST: 4
  - REVERSIBILITY: 5
  - FUTURE_EXTENSIBILITY: 3
- **Classification:** DISFAVOURED (Too weak for meaningful CODE TO CODE context).

#### OPTION B: File plus symbol definitions
**Concept:** Extract file metadata AND define symbols (functions, classes) with their line bounds.
- **Evaluation:** 
  - PRODUCT_FIT: 4
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 4
  - FREE_TIER_VIABILITY: 4
  - IMPLEMENTATION_COMPLEXITY: 4
  - OPERATIONAL_COMPLEXITY: 4
  - MAINTAINABILITY: 4
  - MIGRATION_COST: 3
  - REVERSIBILITY: 4
  - FUTURE_EXTENSIBILITY: 4
- **Classification:** VIABLE.

#### OPTION C: File, symbols, and lightweight relationships
**Concept:** Extract file metadata, symbol definitions, and local import/export relationships.
- **Evaluation:** 
  - PRODUCT_FIT: 5
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 4
  - FREE_TIER_VIABILITY: 3
  - IMPLEMENTATION_COMPLEXITY: 3
  - OPERATIONAL_COMPLEXITY: 3
  - MAINTAINABILITY: 3
  - MIGRATION_COST: 3
  - REVERSIBILITY: 4
  - FUTURE_EXTENSIBILITY: 5
- **Classification:** PROVISIONAL_RECOMMENDATION.

#### OPTION D: Richer semantic graph
**Concept:** Call relationships, control flow, data flow.
- **Evaluation:** 
  - PRODUCT_FIT: 4
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 4
  - FREE_TIER_VIABILITY: 1
  - IMPLEMENTATION_COMPLEXITY: 1
  - OPERATIONAL_COMPLEXITY: 1
  - MAINTAINABILITY: 2
  - MIGRATION_COST: 2
  - REVERSIBILITY: 2
  - FUTURE_EXTENSIBILITY: 4
- **Classification:** ELIMINATED (Violates FREE_TIER_VIABILITY. Full compiler-grade semantic analysis, control-flow analysis, and data-flow analysis are explicit non-goals).

### Analysis
- **MUST_HAVE relationship classes:** File path, language, file/module identity, symbol definition, symbol kind, symbol location, import target resolution where reliably available. (Needed for Code to English to identify enclosing contexts, and Code to Code to link imports to definitions. If absent, structural expansion cannot locate the precise definition of a symbol used in the current context).
- **SHOULD_HAVE relationship classes:** Import relationship, export relationship, inheritance/extension relationship where reliably available.
- **DEFERRED relationship classes:** Symbol reference, call relationship, control-flow relationship, data-flow relationship.
Option C provides the exact metadata needed to resolve "what is this class" using deterministic structural extraction complexity.

### Adversarial Self-Challenge (ARCH-DEC-04)
- **PROVISIONAL RECOMMENDATION:** OPTION C.
- **STRONGEST ARGUMENT FOR IT:** Maximizes context retrieval accuracy for Code-to-Code by explicitly linking imports to definitions.
- **STRONGEST ARGUMENT AGAINST IT:** Requires parser technology and multi-language maintenance.
- **STRONGEST REJECTED ALTERNATIVE:** OPTION B.
- **WHAT WOULD MAKE THE REJECTED ALTERNATIVE BETTER:** If we relied purely on LLM reranking of semantic search rather than deterministic structural links.
- **HIDDEN ASSUMPTION:** Assumes lightweight parsers can reliably extract imports across languages (Python, TS).
- **FAILURE MODE MOST LIKELY TO BE MISSED:** Parser panics on malformed code crashing the indexing worker.
- **MIGRATION RISK MOST LIKELY TO BE UNDERESTIMATED:** Reprocessing all old repos to extract metadata.
- **FREE-TIER RISK MOST LIKELY TO BE UNDERESTIMATED:** Storing hundreds of thousands of symbol rows in PostgreSQL.
- **SECURITY RISK MOST LIKELY TO BE UNDERESTIMATED:** Parser vulnerabilities (e.g. billion laughs or regex DOS).
- **REVERSIBILITY ASSESSMENT:** Moderate. Once structural data is relied on, removing it degrades product quality.
- **CONFIDENCE:** MEDIUM


## 10. ARCH-DEC-05 Semantic and Structural Retrieval

**Question:** How should semantic and structural signals be combined for repository-aware retrieval?

**Current Architecture Constraints:** Semantic only, using cosine similarity over text chunks.

### Decision Forces
- **Context Budget:** Strict token limits.
- **Explainability:** Why was this file included in the prompt?
- **Degraded Behaviour:** Handling partially indexed or unsupported languages.

### Architecture Options

#### OPTION A: Semantic retrieval followed by deterministic structural expansion
**Concept:** Query -> Semantic candidates -> Structural neighbours -> Context budget.
- **Evaluation:** 
  - PRODUCT_FIT: 5
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 5
  - FREE_TIER_VIABILITY: 4
  - IMPLEMENTATION_COMPLEXITY: 4
  - OPERATIONAL_COMPLEXITY: 4
  - MAINTAINABILITY: 4
  - MIGRATION_COST: 4
  - REVERSIBILITY: 5
  - FUTURE_EXTENSIBILITY: 4
- **Classification:** PROVISIONAL_RECOMMENDATION.

#### OPTION B: Parallel semantic and structural candidate generation followed by deterministic fusion
**Concept:** Semantic + Structural queried concurrently, then fused.
- **Evaluation:** 
  - PRODUCT_FIT: 4
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 4
  - FREE_TIER_VIABILITY: 3
  - IMPLEMENTATION_COMPLEXITY: 2
  - OPERATIONAL_COMPLEXITY: 3
  - MAINTAINABILITY: 2
  - MIGRATION_COST: 3
  - REVERSIBILITY: 4
  - FUTURE_EXTENSIBILITY: 5
- **Classification:** DISFAVOURED (Higher latency and complexity).

#### OPTION C: Semantic retrieval with metadata filtering and structural boosting
**Concept:** Use structural data purely as weights/filters in the semantic query.
- **Evaluation:** 
  - PRODUCT_FIT: 3 (fails to pull in un-semantically related but structurally required definitions)
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 5
  - FREE_TIER_VIABILITY: 5
  - IMPLEMENTATION_COMPLEXITY: 4
  - OPERATIONAL_COMPLEXITY: 5
  - MAINTAINABILITY: 4
  - MIGRATION_COST: 4
  - REVERSIBILITY: 5
  - FUTURE_EXTENSIBILITY: 3
- **Classification:** DISFAVOURED.

### Expanded Product-Mode Retrieval Analysis
- **CODE TO ENGLISH:**
  - *Context elements:* selected code as an anchor, enclosing symbol context, referenced definitions, imported internal modules, nearby usage patterns, semantic repository context.
  - *Structural expansion value:* Very high. Resolves exactly what a referenced internal function does.
  - *Context-budget priority:* Structural exact matches over fuzzy semantic matches.
  - *Degraded behaviour:* Fall back to pure semantic matching, missing precise definition context if structural metadata is unavailable.
- **ENGLISH TO CODE:**
  - *Context elements:* natural-language intent, repository conventions, analogous implementations, internal APIs, types/interfaces, dependency usage, target file/module context.
  - *Semantic candidate value:* High, for finding "how we do X".
  - *Structural expansion value:* High, for pulling the specific interfaces used by the semantic matches.
  - *Context-budget priority:* Semantic anchors first, then their structural dependencies.
  - *Degraded behaviour:* Relies entirely on semantic chunk overlap, risking hallucinated interfaces.
- **CODE TO CODE:**
  - *SOURCE REPOSITORY CONTEXT:* selected source code, source definitions, source imports, source types/interfaces, source usage patterns.
  - *TARGET REPOSITORY CONTEXT (when existing):* target language, target interfaces, repository conventions, analogous target implementations, target dependency usage.
  - *TRANSLATION KNOWLEDGE:* language/library equivalence, syntax transformation, semantic translation reasoning.
  - *Important limitation:* Repository structural metadata does not inherently map external libraries between programming languages. Independent translation knowledge must provide that mapping.

### Adversarial Self-Challenge (ARCH-DEC-05)
- **PROVISIONAL RECOMMENDATION:** OPTION A (Remains the provisional recommendation for all three product modes, as semantic provides the anchor and structural provides the precise context).
- **STRONGEST ARGUMENT FOR IT:** Highly predictable, easily testable, and naturally bounds context size by fetching semantic anchors first.
- **STRONGEST ARGUMENT AGAINST IT:** If the initial semantic retrieval misses the anchor, structural expansion cannot compensate.
- **STRONGEST REJECTED ALTERNATIVE:** OPTION B.
- **WHAT WOULD MAKE THE REJECTED ALTERNATIVE BETTER:** If users frequently query strictly by symbol name without semantic meaning.
- **HIDDEN ASSUMPTION:** Assumes semantic search will accurately find the "entry points".
- **FAILURE MODE MOST LIKELY TO BE MISSED:** Expanding into a massive "god class" that blows the context budget.
- **MIGRATION RISK MOST LIKELY TO BE UNDERESTIMATED:** None, this is a query-time change.
- **FREE-TIER RISK MOST LIKELY TO BE UNDERESTIMATED:** Additional DB queries for structural resolution adding latency.
- **SECURITY RISK MOST LIKELY TO BE UNDERESTIMATED:** Leaking structural metadata across boundaries (mitigated by isolated index queries).
- **REVERSIBILITY ASSESSMENT:** Easy to disable structural expansion and revert to pure semantic.
- **CONFIDENCE:** HIGH


## 11. ARCH-DEC-06 Repository-Linked Continuity

**Question:** What is the minimum continuity architecture that satisfies current target product modes?

**Current Architecture Constraints:** Translation history is fully disconnected from repository identity.

### Decision Forces
- **Source-State Changes:** What happens to history when the repo is updated?
- **Privacy/Deletion:** Cascading deletions across workspaces and accounts.

### Architecture Options

#### OPTION A: Translation history linked only to repository resource
**Concept:** Tie history to the repository connection, ignoring source-state changes.
- **Evaluation:** 
  - PRODUCT_FIT: 3
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 3
  - FREE_TIER_VIABILITY: 5
  - IMPLEMENTATION_COMPLEXITY: 5
  - OPERATIONAL_COMPLEXITY: 5
  - MAINTAINABILITY: 5
  - MIGRATION_COST: 5
  - REVERSIBILITY: 5
  - FUTURE_EXTENSIBILITY: 2
- **Classification:** DISFAVOURED.

#### OPTION B: Translation history linked to repository resource and source state
**Concept:** History references both the repository connection and the specific source-state (e.g. revision hash) it was executed against.
- **Evaluation:** 
  - PRODUCT_FIT: 5
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 5
  - FREE_TIER_VIABILITY: 5
  - IMPLEMENTATION_COMPLEXITY: 4
  - OPERATIONAL_COMPLEXITY: 4
  - MAINTAINABILITY: 4
  - MIGRATION_COST: 4
  - REVERSIBILITY: 4
  - FUTURE_EXTENSIBILITY: 5
- **Classification:** PROVISIONAL_RECOMMENDATION.

#### OPTION C: Repository activity record separated from translation history
**Concept:** Introduce a distinct abstraction for repository activity logs or events.
- **Evaluation:** 
  - PRODUCT_FIT: 4
  - SECURITY_ISOLATION: 5
  - CONSISTENCY: 4
  - FREE_TIER_VIABILITY: 3
  - IMPLEMENTATION_COMPLEXITY: 3
  - OPERATIONAL_COMPLEXITY: 3
  - MAINTAINABILITY: 3
  - MIGRATION_COST: 3
  - REVERSIBILITY: 4
  - FUTURE_EXTENSIBILITY: 5
- **Classification:** DISFAVOURED (An ACTIVITY_LOG_OR_EVENT_ABSTRACTION is distinct from a REPOSITORY_MEMORY_SUBSYSTEM. While viable, it is disfavoured because it adds schema complexity beyond the current approved continuity need, which can be satisfied by simply linking existing translation history to the repository and source-state).

### Analysis
- **Should an old translation remain visible after repository changes?** Yes, but marked as generated against a prior state.
- **Should the system identify the source state used for a translation?** Yes, to provide context invalidation if the code changes drastically.
- **Is generic translation history sufficient for repository continuity?** Yes, when enriched with repository and source-state identifiers.
- **Is a separate repository activity abstraction justified now?** No.

### Adversarial Self-Challenge (ARCH-DEC-06)
- **PROVISIONAL RECOMMENDATION:** OPTION B.
- **STRONGEST ARGUMENT FOR IT:** Minimal schema change providing full continuity without building complex episodic memory [Classification: NEGATIVE_CHECK_CONTEXT] systems.
- **STRONGEST ARGUMENT AGAINST IT:** If index-runs are garbage collected (ARCH-DEC-03), the history record may point to a deleted source-state record.
- **STRONGEST REJECTED ALTERNATIVE:** OPTION C.
- **WHAT WOULD MAKE THE REJECTED ALTERNATIVE BETTER:** If we needed a generalized timeline of repository events rather than just translation history.
- **HIDDEN ASSUMPTION:** Assumes source-state identifiers (e.g., commit SHAs) remain stable and meaningful strings even if the DB record is garbage collected.
- **FAILURE MODE MOST LIKELY TO BE MISSED:** Foreign key constraint errors preventing garbage collection of old indexes.
- **MIGRATION RISK MOST LIKELY TO BE UNDERESTIMATED:** Backfilling null repository fields in existing history records.
- **FREE-TIER RISK MOST LIKELY TO BE UNDERESTIMATED:** None.
- **SECURITY RISK MOST LIKELY TO BE UNDERESTIMATED:** Leaking repository metadata through history endpoints.
- **REVERSIBILITY ASSESSMENT:** Easy to revert by nullifying the columns.
- **CONFIDENCE:** HIGH


## 12. Cross-Decision Coupling Analysis

- **ARCH-DEC-01 ↔ ARCH-DEC-02 (Ownership and source-state identity):** MODERATE_COUPLING. Ownership determines *who* can access the state, but state definition is independent. Order doesn't strictly matter, but ownership should be established first.
- **ARCH-DEC-01 ↔ ARCH-DEC-03 (Ownership and index lifecycle):** LOOSE_COUPLING. Lifecycle transitions are mostly mechanical, independent of ownership semantics.
- **ARCH-DEC-01 ↔ ARCH-DEC-06 (Ownership and repository-linked history):** MODERATE_COUPLING. History must be scoped to the exact same ownership boundary as the repository connection.
- **ARCH-DEC-02 ↔ ARCH-DEC-03 (Source-state identity and index lifecycle):** TIGHT_COUPLING. Index lifecycle directly tracks the materialization of a source-state identity. If DEC-02 changes, the primary keys and lifecycle transitions in DEC-03 are invalid.
- **ARCH-DEC-02 ↔ ARCH-DEC-06 (Source-state identity and historical relevance):** TIGHT_COUPLING. The history record uses the source-state identity to determine relevance.
- **ARCH-DEC-03 ↔ ARCH-DEC-05 (Searchable index lifecycle and retrieval):** MODERATE_COUPLING. Retrieval must only query indexes marked SEARCHABLE by the lifecycle manager.
- **ARCH-DEC-04 ↔ ARCH-DEC-05 (Structural metadata and retrieval strategy):** TIGHT_COUPLING. Structural expansion (DEC-05) is completely constrained by what metadata is actually persisted (DEC-04). DEC-04 must be finalized before DEC-05.

## 13. Current Architecture Compatibility Matrix

| Component | Classification | Impact |
|---|---|---|
| RepoEmbedding | DECOMPOSE | REUSABLE RESPONSIBILITY: Vector storage and semantic similarity search. INCOMPATIBLE RESPONSIBILITY: Lack of tenant boundaries and source-state identity. TARGET CONCEPTUAL SPLIT: Tenant-scoped import connections and versioned index runs managing isolated chunk collections. |
| repository search router | ADAPT | Must route via new retrieval strategy and enforce tenant boundaries. |
| GitHub service | ADAPT | Needs to integrate with new ownership model. |
| indexing Celery task | DECOMPOSE | REUSABLE RESPONSIBILITY: GitHub API interaction, basic rate-limiting, queuing. INCOMPATIBLE RESPONSIBILITY: Blind, non-idempotent batch inserts without structural extraction or lifecycle coordination. TARGET CONCEPTUAL SPLIT: Idempotent orchestration task separate from deterministic structural extraction and batch vector generation. |
| translation routers | REUSE | Core translation logic remains substantially unchanged. |
| AI service | REUSE | LLM routing and streaming remains substantially unchanged. |
| translation history | ADAPT | Needs foreign keys/references to repository connection and source state. |
| workspace authorization | REUSE | Continues as the primary application-layer isolation mechanic. |
| Redis usage | REUSE | Continues for rate limiting. |
| PostgreSQL | ADAPT | Schema additions required. |
| pgvector | REUSE | Core vector operations remain. |
| frontend repository experience | NEW_CAPABILITY_COMPONENT | Needs UI for managing imported connections, index status, and context awareness. |

## 14. Operational and Free-Tier Impact Summary

The provisional recommendations minimize external API pressure by implementing idempotent indexing (saving embedding API tokens on retries). Database row pressure increases moderately due to structural metadata extraction (Option C in DEC-04) and Blue/Green index staging (Option B in DEC-03). Overall free-tier viability remains STRONG, as expensive graph databases and full compiler-grade extraction were successfully avoided.

## 15. Negative Architecture Check

- a generic coding agent (Classification: NEGATIVE_CHECK_CONTEXT): NOT_CREATED
- repository write automation (Classification: NEGATIVE_CHECK_CONTEXT): NOT_CREATED
- a graph database requirement (Classification: NEGATIVE_CHECK_CONTEXT): NOT_CREATED
- microservice pressure (Classification: NEGATIVE_CHECK_CONTEXT): NOT_CREATED
- AI-based structural extraction: NOT_CREATED
- a repository memory subsystem: NOT_CREATED
- provider lock-in: NOT_CREATED
- GitHub-only domain modelling: NOT_CREATED
- cross-tenant index sharing: INTENTIONALLY_DEFERRED
- partial-index search: NOT_CREATED
- unbounded repository ingestion: RISK_CREATED (ARCH-DEC-01 does not explicitly cap connections per tenant yet).
- excessive free-tier database growth: RISK_CREATED (ARCH-DEC-03 blue/green index strategy temporarily doubles storage, garbage collection failure could lead to unbounded growth).
- excessive embedding API pressure: RISK_CREATED (If chunk sizes change frequently in configuration identity, it triggers massive re-embedding).
- unrecoverable migration coupling: NOT_CREATED
- frontend requirements not represented in backend concepts: NOT_CREATED

## 16. Provisional Recommendation Summary

- **ARCH-DEC-01:** OPTION C (Repository connection/import separated from logical identity)
- **ARCH-DEC-02:** OPTION C (Provider revision identity plus index configuration identity)
- **ARCH-DEC-03:** OPTION B (Immutable index-run records with atomic searchable pointer)
- **ARCH-DEC-04:** OPTION C (File, symbols, and lightweight relationships)
- **ARCH-DEC-05:** OPTION A (Semantic retrieval followed by deterministic structural expansion)
- **ARCH-DEC-06:** OPTION B (History linked to repository resource and source state)

## 17. Architecture Questions Requiring Independent Challenge

1. **ARCH-DEC-01:** Is separating connection identity from logical identity too heavy for the current MVP?
2. **ARCH-DEC-04:** Can lightweight structural extraction be reliably executed in Python within a free-tier Celery worker without exhausting memory?

## 18. Loop 4 Verification Summary

- At least three materially distinct options evaluated for every decision.
- No options are merely naming variants.
- Mapped to approved Loop 3 capabilities and gaps.
- Current repository compatibility claims based on implementation evidence.
- Analyzed security, retry, free-tier pressure, migration, and reversibility.
- Identified strongest rejected alternative and conducted adversarial self-challenge.
- Only ONE provisional recommendation per decision.
- ARCH-DEC-01: No final ownership key selected. Explicitly analyzed cross-tenant index sharing as an intentionally deferred optimization.
- ARCH-DEC-02: Differentiated repo identity and source-state identity. Analyzed provider portability.
- ARCH-DEC-03: Analyzed partial index search, stale worker completion, batch failure.
- ARCH-DEC-04: Analyzed Code-to-English, English-to-Code, Code-to-Code product modes. MUST/SHOULD/DEFERRED explicit. No parser technology selected.
- ARCH-DEC-05: Analyzed modes independently. No final ranking formula selected.
- ARCH-DEC-06: No repository memory subsystem introduced.
- Restricted words appropriately classified or avoided.
