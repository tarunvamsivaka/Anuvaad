# ARCHITECTURE DECISION

## 1. Document Control

| Field | Value |
|---|---|
| Phase | Loop 5: Final Architecture Selection (Correction Pass) |
| Author | ARCHITECTURE DECISION ARBITER |
| Baseline Commit | c4e2cebf68449b957d720a0067f5af67caae1009 |
| Baseline Branch | master |
| Date | 2026-07-15 |

## 2. Architecture Arbitration Mandate
This document is the final conceptual architecture selection record for the current protocol scope, executed under the authority of LOOP 5. The arbiter is authorized to select the final target architecture at the conceptual level, reject provisional recommendations, accept/modify challenge findings, and define binding invariants without executing implementation changes. This version includes the mandatory Loop 5 Correction and Completeness Pass.

## 3. Source Evidence and Decision Authority
- docs/engineering/REPOSITORY_BASELINE.md
- docs/engineering/AUDIT_FINDINGS.md
- docs/engineering/GAP_ANALYSIS.md
- docs/engineering/ARCHITECTURE_OPTIONS.md
- docs/engineering/ARCHITECTURE_CHALLENGE.md
Actual production implementation was inspected as needed for arbitration.

## 4. Approved Capability and Gap Boundary
**Approved Target Capabilities:**
CAP-TGT-01 Repository Resource Identity & Ownership
CAP-TGT-02 Repository Revision Tracking
CAP-TGT-03 Idempotent Index Lifecycle
CAP-TGT-04 Structural Relationship Extraction
CAP-TGT-05 Repository-Aware Context Retrieval
CAP-TGT-06 Context-Aware Prompt Boundaries
CAP-TGT-07 Repository-Linked Continuity

**Approved Gaps:**
GAP-01 No tenant boundary on indexed repository data (FOUNDATIONAL)
GAP-02 No revision identity tracking for indexes (FOUNDATIONAL)
GAP-03 Blind, non-idempotent indexing with no state tracking (FOUNDATIONAL)
GAP-04 No structural extraction (CORE_PRODUCT)
GAP-05 Retrieval is semantic only, no structural resolution (CORE_PRODUCT)
GAP-07 Translation history disconnected from repository identity (CORE_PRODUCT)
GAP-06 Untrusted repository data not isolated in prompts (DEFENCE_IN_DEPTH)

## 5. Arbitration Method
Final architecture decisions were evaluated against the primary option-analysis recommendation, the independent adversarial challenge, and strict Loop 5 arbitration rules. A subsequent correction pass validated completeness of conceptual architecture semantics.

## 6. Executive Final Architecture Summary
The selected architecture establishes a secure, robust foundation for repository intelligence. It relies on workspace-owned repository imports to provide strict tenant isolation, immutable index runs with non-repeating desired-state incarnation identities to resolve publication race conditions, targeted extraction of MUST_HAVE structural relationships, mode-aware context retrieval to avoid wasteful semantic searches, bounded admission for free-tier survival, and explicit prompt trust boundaries. Cross-tenant sharing and generalized memory subsystems are deliberately excluded.

## 7. FINAL-DEC-01 Repository Ownership and Scoping
1. **Primary Option-Analysis Recommendation:** OPTION C (Repository connection/import resource separated from logical repository identity).
2. **Independent Challenge Classification:** REJECT. Proposed OPTION B-CORRECTED.
3. **Arbitration Correction:** Explicitly determine whether separate logical repository identity and provider connection entities are required, and define explicit security and lifecycle semantics for workspace imports.
4. **Final Architecture Direction:** OPTION B-CORRECTED (Workspace-owned repository import with provider-qualified identity).
5. **Explanation:** The workspace safely serves as both the OWNING_TENANT_BOUNDARY and COLLABORATION_SCOPE. A separate logical repository identity and provider connection entity are not required now; cross-tenant shared indexes remain deferred. The same upstream repository can be imported independently into two workspaces, and their indexes remain strictly tenant-scoped. One workspace cannot infer another workspace imported the same upstream repository. Provider credential changes associated with one workspace's repository import do not affect another workspace's independent import. Removing a user's workspace membership removes that user's authorization to access the workspace's repository imports, searchable materializations, structural metadata, and repository-linked history; it changes authorization without implying deletion of workspace-owned data. When a workspace is deleted, its repository imports and all derived data lose their ownership boundary and become permanently inaccessible (eligible for tenant-isolated cleanup). When a repository import is deleted, the retrieval relationship becomes unavailable. If an upstream repository is renamed or transferred, the stable upstream resource identity persists; mutable provider locators (owner/name strings) must not alone define immutable upstream repository identity. If a public repository becomes private and upstream authorization is lost, new indexing and source refresh must fail closed, retry must not bypass the authorization failure, and an existing searchable materialization becomes conceptually inaccessible for retrieval until upstream access is re-established (it is not treated as proof of continuing upstream authorization). 
6. **Explicitly Rejected Alternative:** OPTION C (Separate logical identity and connection identity).
7. **Binding Architectural Invariants:**
   - TENANT ISOLATION INVARIANT: No repository import, index artifact, structural metadata, retrieval candidate, or repository-linked history may be returned across workspace ownership boundaries.
   - INDEPENDENT IMPORT INVARIANT: The same upstream repository may be imported independently into multiple workspaces without creating shared tenant materialization.
   - CROSS-WORKSPACE NON-INFERENCE INVARIANT: A workspace must not be able to infer another workspace's import existence through lookup, state, deduplication, retrieval, or shared identifiers.
   - CREDENTIAL ISOLATION INVARIANT: Credential provenance and access-state changes for one workspace's import must not mutate authorization or indexing eligibility for another workspace's independent import.
   - MEMBERSHIP AUTHORIZATION INVARIANT: Workspace membership directly governs authorization to access all workspace-owned repository assets.
   - UPSTREAM ACCESS VALIDATION INVARIANT: If upstream authorization is lost, operations must fail closed and existing materializations must become conceptually inaccessible.
   - DELETION ISOLATION INVARIANT: Loss of accessibility of a tenant-owned repository import must prevent future repository retrieval through that import and must not affect another workspace's independent import.
8. **Map to Target Capabilities/Gaps:** CAP-TGT-01, GAP-01.
9. **Classification:** SELECTED_WITH_ARBITRATION_CORRECTION

## 8. FINAL-DEC-02 Repository Source-State Identity
1. **Primary Option-Analysis Recommendation:** OPTION C (Provider revision identity plus index configuration identity).
2. **Arbitration Correction:** Define architecture-neutral source-state fallback, distinguish SOURCE_STATE_IDENTITY from INDEX_CONFIGURATION_IDENTITY, and define stale-index detection.
3. **Final Architecture Direction:** OPTION C (Provider immutable revision identity where available plus index-configuration identity).
4. **Explanation:** The primary source-state identity is IMMUTABLE PROVIDER REVISION IDENTITY when available and reliable. The architecture-neutral fallback is DETERMINISTIC SOURCE SNAPSHOT IDENTITY, which identifies the exact admitted repository source snapshot used for indexing. The fallback identity must change when admitted source content materially changes, and is deterministic for the same exact admitted snapshot. SOURCE_STATE_IDENTITY identifies source content state. INDEX_CONFIGURATION_IDENTITY identifies how searchable output is produced from that source state (e.g., content selection, chunking). A searchable materialization is stale relative to the repository import when its bound source-state identity differs from the repository import's currently desired source-state identity or its bound index-configuration identity differs from the currently desired index-configuration identity. Stale means not current for the desired repository materialization; it does not necessarily mean corrupted.
5. **Explicitly Rejected Alternative:** OPTION A (Provider revision identity alone).
6. **Binding Architectural Invariants:**
   - SOURCE STATE INVARIANT: Searchable repository context must correspond to an identifiable repository source state.
   - SOURCE SNAPSHOT FALLBACK INVARIANT: When provider revision identity is unavailable, a deterministic source snapshot identity must be used.
   - INDEX CONFIGURATION INVARIANT: Material changes to searchable-output configuration produce a distinct desired materialization identity.
7. **Map to Target Capabilities/Gaps:** CAP-TGT-02, GAP-02.
8. **Classification:** SELECTED_WITH_ARBITRATION_CORRECTION

## 9. FINAL-DEC-03 Index Lifecycle and Publication
1. **Primary Option-Analysis Recommendation:** OPTION B (Immutable index-run records with one conditionally published searchable materialization).
2. **Arbitration Correction:** Define COMPLETE, SEARCHABLE, and PARTIAL. Ensure desired-state incarnation identity is non-repeating. Address ABA stale publication and previous materialization continuity.
3. **Final Architecture Direction:** OPTION B-CORRECTED (Immutable index-run attempts, desired materialization identity, non-repeating desired-state incarnation, conditional publication, and one current searchable materialization).
4. **Explanation:** 
   - **COMPLETE**: An index run is COMPLETE when all work required by that run's accepted indexing contract has reached terminal successful completion under the selected partial-failure policy, all required searchable artifacts for the run are internally coherent, and no required indexing work remains pending.
   - **SEARCHABLE**: A repository materialization is SEARCHABLE only after a COMPLETE run successfully passes conditional publication against the current desired materialization identity and current desired-state incarnation and becomes the single current published materialization for the repository import.
   - **COMPLETE ≠ SEARCHABLE**: A run may be COMPLETE but stale, or COMPLETE but publication-ineligible.
   - **PARTIAL**: A run or materialization missing required work under its accepted indexing contract is partial and is never searchable.
   - **Desired-State Incarnation**: Every desired indexing request has a desired-state incarnation identity that cannot repeat across A -> B -> A transitions, preventing ABA stale publication. The architecture remains neutral to mechanisms (monotonic generation or unique request token) and does not require monotonic generation.
   - **Product Continuity**: The last previously searchable materialization may remain searchable while a replacement run is pending. Its source-state provenance remains explicit and it is not represented as the current desired source state.
   - **Diagnostics and Cleanup**: Failed runs expose bounded file-identifiable diagnostics. Orphaned-run detection remains conceptually independent of successful completion.
5. **Explicitly Rejected Alternative:** OPTION A (Single mutable index record).
6. **Binding Architectural Invariants:**
   - DESIRED STATE INCARNATION INVARIANT: Every desired indexing request has a non-repeating incarnation identity sufficient to survive A -> B -> A transitions.
   - COMPLETE/SEARCHABLE SEPARATION INVARIANT: A run reaching COMPLETE state does not automatically make it SEARCHABLE; publication is a distinct conditional operation.
   - PUBLICATION INVARIANT: Only a completed run targeting the current desired materialization and current desired-state incarnation may become searchable.
   - SINGLE CURRENT SEARCHABLE INVARIANT: At most one current searchable materialization exists per repository import.
   - PARTIAL INDEX INVARIANT: A partial index is never searchable.
7. **Map to Target Capabilities/Gaps:** CAP-TGT-03, GAP-03.
8. **Classification:** SELECTED_WITH_ARBITRATION_CORRECTION

## 10. FINAL-DEC-04 Minimum Structural Metadata
1. **Primary Option-Analysis Recommendation:** OPTION C (File, symbols, and lightweight relationships).
2. **Arbitration Correction:** Explicitly distinguish declared relationships from resolved targets and justify every MUST_HAVE structural class.
3. **Final Architecture Direction:** OPTION C-CORRECTED (Lightweight deterministic structural extraction supporting bounded file/module structural expansion).
4. **Explanation:**
   The architecture explicitly distinguishes DECLARED_IMPORT_RELATIONSHIP from RESOLVED_INTERNAL_IMPORT_TARGET. An unresolved import provides a lookup hint, not an exact internal file identity. The system makes no claim of symbol-reference or call-graph precision.
   
   **MUST_HAVE Structural Justification Matrix:**
   | STRUCTURAL CLASS | PRODUCT MODE REQUIREMENT | RETRIEVAL DEPENDENCY | DEGRADED BEHAVIOUR IF ABSENT | FREE-TIER PRESSURE |
   |---|---|---|---|---|
   | file path | All modes | Source anchoring | Bounded semantic only | Storage per file |
   | language | All modes | Syntax/parser selection | Unknown structure | None |
   | file/module identity | Code to Code | Import target resolution | Unresolved imports | Storage per module |
   | symbol definition | Code to Code, Code to English | Explicit symbol anchors | Semantic anchor fallback | Storage per symbol |
   | symbol kind | Code to English, Code to Code | Differentiating classes vs funcs | Lower precision semantic retrieval | None |
   | symbol location | Code to English, Code to Code | File structural expansion | Cannot map symbol to file text | None |
   | declared import relationship | Code to Code | Dependency lookup hint | Bounded semantic expansion | Storage per import |

   SHOULD_HAVE classes: resolved internal import target, export relationship, inheritance.
   DEFERRED classes: symbol reference, call relationship, control/data flow.
5. **Explicitly Rejected Alternative:** OPTION B (File plus symbol definitions, no relationships).
6. **Binding Architectural Invariants:**
   - STRUCTURAL HONESTY INVARIANT: The system must not claim deterministic symbol-reference or call-graph precision when those relationships are not extracted.
7. **Map to Target Capabilities/Gaps:** CAP-TGT-04, GAP-04.
8. **Classification:** SELECTED_WITH_ARBITRATION_CORRECTION

## 11. FINAL-DEC-05 Mode-Aware Repository Retrieval
1. **Primary Option-Analysis Recommendation:** OPTION A (Universal semantic retrieval followed by deterministic structural expansion).
2. **Arbitration Correction:** Define mode-specific paths and degraded behaviour paths.
3. **Final Architecture Direction:** MODE_AWARE_RETRIEVAL.
4. **Explanation:**
   Retrieval sequences differ by mode:
   - CODE TO ENGLISH: explicit anchor -> bounded structural expansion -> optional semantic supplementation -> context budget.
   - ENGLISH TO CODE: natural-language intent -> semantic candidates -> bounded structural expansion.
   - CODE TO CODE SOURCE SIDE: explicit source anchor -> bounded source structural expansion.
   - CODE TO CODE TARGET SIDE: target intent -> semantic target candidates -> bounded target structural expansion.
   
   **Degraded Behaviour:**
   - **TARGET REPOSITORY CONTEXT DOES NOT EXIST**: For CODE TO CODE target-side retrieval, target repository retrieval is skipped. Translation proceeds using source context and model translation knowledge. The system must not claim target-repository convention alignment.
   - **STRUCTURAL METADATA IS UNAVAILABLE**: Fallback uses bounded semantic and/or bounded file context where available. System must not claim structural expansion occurred.
   - **IMPORT TARGET RESOLUTION FAILS**: Declared import relationship may be used as a structural lookup hint. It must not be treated as an exact resolved internal target.
   - **REPOSITORY INDEX IS INCOMPLETE OR NOT SEARCHABLE**: A partial materialization must never be queried. The previous searchable materialization may remain usable (provenance remains explicit, not represented as current desired state). If none exists, repository context is unavailable and translation falls back to non-repository mode.
   - **SEMANTIC RETRIEVAL RETURNS NO USEFUL CANDIDATES**: Bounded file-level context or non-repository mode fallback.
   - **EXPLICIT ANCHOR CANNOT BE MAPPED TO STRUCTURAL METADATA**: Bounded file-level or source-selection fallback.
5. **Explicitly Rejected Alternative:** OPTION A (Universal semantic-first retrieval).
6. **Binding Architectural Invariants:**
   - MODE-AWARE RETRIEVAL INVARIANT: Explicit-code modes use explicit anchors before semantic discovery; natural-language discovery modes may use semantic retrieval first.
7. **Map to Target Capabilities/Gaps:** CAP-TGT-05, GAP-05.
8. **Classification:** SELECTED_WITH_ARBITRATION_CORRECTION

## 12. FINAL-DEC-06 Repository-Linked Continuity
1. **Primary Option-Analysis Recommendation:** OPTION B (Translation history linked to repository resource and source state).
2. **Arbitration Correction:** Explicitly define lifecycle and deletion semantics for repository-linked history.
3. **Final Architecture Direction:** OPTION A (OWNERSHIP-BOUND HISTORY): Translation history linked to repository import and source state without repository memory.
4. **Explanation:** Repository-linked translation history remains part of the owning workspace's repository context. 
   - If the repository import is deleted, repository-linked history associated with that import is no longer retained as active product history.
   - If the workspace is deleted, its repository-linked history is no longer retained as accessible product history.
   - Removing a user from a workspace removes authorization but does not itself delete workspace-owned history.
   - Old translations remain visible after repository source state changes as historical translation records, but their linked repository context is stale relative to the new source state.
   - Stale historical context is represented conceptually as linked to a prior source-state identity.
   - Indexing lifecycle events remain separate from translation history.
   - Generalized repository activity abstraction remains deferred. Repository memory remains not required.
5. **Explicitly Rejected Alternative:** OPTION C (Separate repository activity record abstraction), DETACHED HISTORICAL PROVENANCE.
6. **Binding Architectural Invariants:**
   - HISTORY PROVENANCE INVARIANT: Repository-linked translation history identifies the repository import and source state used for the translation.
   - HISTORY LIFECYCLE INVARIANT: Repository-linked history is ownership-bound to the workspace and repository import, losing accessibility if those parent entities are removed.
7. **Map to Target Capabilities/Gaps:** CAP-TGT-07, GAP-07.
8. **Classification:** SELECTED_WITH_ARBITRATION_CORRECTION

## 13. FINAL-DEC-07 Bounded Repository Indexing Admission
1. **Primary Option-Analysis Recommendation:** N/A (Cross-cutting gap identified in challenge).
2. **Arbitration Correction:** Define admission execution boundary and index-configuration relationship.
3. **Final Architecture Direction:** BOUNDED ADMISSION VALIDATION.
4. **Explanation:** 
   - **Execution Boundary**: `INDEX REQUEST -> ADMISSION EVALUATION -> ACCEPTED -> EXPENSIVE INDEX EXECUTION`. No expensive indexing execution may begin before admission succeeds. A pre-admission run-record may exist later if selected by implementation design, but it does not authorize expensive indexing.
   - **Rejection**: Rejected admission produces no searchable artifacts, cannot transition into expensive indexing execution, cannot be bypassed by retry, and must be exposed as a distinct admission rejection outcome rather than an indexing execution failure.
   - **Admission-Policy/Index-Configuration Relationship**: Admission policy changes that alter searchable content selection (eligible file selection, supported content, language selection) materially change searchable output and are conceptually part of INDEX_CONFIGURATION_IDENTITY. Admission policy changes that only alter tenant or operational eligibility (max imports per workspace, operational concurrency) do not necessarily alter INDEX_CONFIGURATION_IDENTITY for an existing materialization.
5. **Explicitly Rejected Alternative:** Unbounded ingestion with failure-at-limit.
6. **Binding Architectural Invariants:**
   - ADMISSION INVARIANT: Repository indexing must pass bounded admission validation before expensive indexing execution.
   - ADMISSION EXECUTION BOUNDARY INVARIANT: Rejected admission must halt the indexing pipeline prior to expensive resource utilization and yield a distinct rejection outcome.
7. **Map to Target Capabilities/Gaps:** Partially addresses GAP-03.
8. **Classification:** SELECTED_WITH_ARBITRATION_CORRECTION

## 14. FINAL-DEC-08 Prompt Trust Boundary
1. **Primary Option-Analysis Recommendation:** N/A.
2. **Arbitration Correction:** Define fail-closed prompt degradation boundary.
3. **Final Architecture Direction:** ISOLATED UNTRUSTED CONTEXT.
4. **Explanation:** System instructions, user intent, and trusted application context must be conceptually distinguished from untrusted repository context. If the application cannot preserve trust separation between these trusted domains and the UNTRUSTED_REPOSITORY_CONTEXT, then repository-derived context must be excluded from the model request. The system may then execute in non-repository translation mode (if valid) or return a repository-context-unavailable outcome. The system must never concatenate raw repository content into authoritative instruction scope because isolation failed, weaken authorization boundaries, reinterpret repository text as system policy, or grant tool permissions based on repository content.
5. **Explicitly Rejected Alternative:** Naive textual inclusion of repository content.
6. **Binding Architectural Invariants:**
   - PROMPT TRUST INVARIANT: Repository content is untrusted context and cannot redefine authoritative instructions or security boundaries.
   - PROMPT FAIL-CLOSED INVARIANT: Failure to safely isolate repository context must result in its exclusion from the model request, rather than degrading trust boundaries.
7. **Map to Target Capabilities/Gaps:** CAP-TGT-06, GAP-06.
8. **Classification:** SELECTED_WITH_ARBITRATION_CORRECTION

## 15. Binding Architecture Invariants
- **TENANT ISOLATION INVARIANT**: No repository import, index artifact, structural metadata, retrieval candidate, or repository-linked history may be returned across workspace ownership boundaries.
- **INDEPENDENT IMPORT INVARIANT**: The same upstream repository may be imported independently into multiple workspaces without creating shared tenant materialization.
- **CROSS-WORKSPACE NON-INFERENCE INVARIANT**: A workspace must not be able to infer another workspace's import existence through lookup, state, deduplication, retrieval, or shared identifiers.
- **CREDENTIAL ISOLATION INVARIANT**: Credential provenance and access-state changes for one workspace's import must not mutate authorization or indexing eligibility for another workspace's independent import.
- **MEMBERSHIP AUTHORIZATION INVARIANT**: Workspace membership directly governs authorization to access all workspace-owned repository assets.
- **UPSTREAM ACCESS VALIDATION INVARIANT**: If upstream authorization is lost, operations must fail closed and existing materializations must become conceptually inaccessible.
- **DELETION ISOLATION INVARIANT**: Loss of accessibility of a tenant-owned repository import must prevent future repository retrieval through that import and must not affect another workspace's independent import.
- **SOURCE STATE INVARIANT**: Searchable repository context must correspond to an identifiable repository source state.
- **SOURCE SNAPSHOT FALLBACK INVARIANT**: When provider revision identity is unavailable, a deterministic source snapshot identity must be used.
- **INDEX CONFIGURATION INVARIANT**: Material changes to searchable-output configuration produce a distinct desired materialization identity.
- **DESIRED STATE INCARNATION INVARIANT**: Every desired indexing request has a non-repeating incarnation identity sufficient to survive A -> B -> A transitions.
- **COMPLETE/SEARCHABLE SEPARATION INVARIANT**: A run reaching COMPLETE state does not automatically make it SEARCHABLE; publication is a distinct conditional operation.
- **PUBLICATION INVARIANT**: Only a completed run targeting the current desired materialization and current desired-state incarnation may become searchable.
- **SINGLE CURRENT SEARCHABLE INVARIANT**: At most one current searchable materialization exists per repository import.
- **PARTIAL INDEX INVARIANT**: A partial index is never searchable.
- **ADMISSION INVARIANT**: Repository indexing must pass bounded admission validation before expensive indexing execution.
- **ADMISSION EXECUTION BOUNDARY INVARIANT**: Rejected admission must halt the indexing pipeline prior to expensive resource utilization and yield a distinct rejection outcome.
- **STRUCTURAL HONESTY INVARIANT**: The system must not claim deterministic symbol-reference or call-graph precision when those relationships are not extracted.
- **MODE-AWARE RETRIEVAL INVARIANT**: Explicit-code modes use explicit anchors before semantic discovery; natural-language discovery modes may use semantic retrieval first.
- **PROMPT TRUST INVARIANT**: Repository content is untrusted context and cannot redefine authoritative instructions or security boundaries.
- **PROMPT FAIL-CLOSED INVARIANT**: Failure to safely isolate repository context must result in its exclusion from the model request, rather than degrading trust boundaries.
- **HISTORY PROVENANCE INVARIANT**: Repository-linked translation history identifies the repository import and source state used for the translation.
- **HISTORY LIFECYCLE INVARIANT**: Repository-linked history is ownership-bound to the workspace and repository import, losing accessibility if those parent entities are removed.

## 16. Selected Conceptual Component Model
- WORKSPACE OWNERSHIP BOUNDARY: SELECTED_COMPONENT_RESPONSIBILITY. Essential for the tenant isolation invariant.
- REPOSITORY IMPORT: SELECTED_COMPONENT_RESPONSIBILITY. Tracks external resource access, credential provenance, and provider qualification separate from the workspace.
- SOURCE STATE IDENTITY: SELECTED_COMPONENT_RESPONSIBILITY. Must track immutable upstream revisions separate from index configuration.
- INDEX CONFIGURATION IDENTITY: SELECTED_COMPONENT_RESPONSIBILITY. Required to identify changes in content selection or chunking policy.
- DESIRED INDEX STATE: SELECTED_COMPONENT_RESPONSIBILITY. Represents the target convergence state for indexing operations.
- INDEX RUN: SELECTED_COMPONENT_RESPONSIBILITY. Represents a specific execution attempt targeting a desired state, enabling failure diagnostics and retry logic.
- SEARCHABLE MATERIALIZATION PUBLICATION: MERGED_RESPONSIBILITY (Merged into DESIRED INDEX STATE / INDEX RUN lifecycle). Publication is a conditional state transition of a completed index run against the desired index state; it does not require an independently named boundary.
- INDEX ADMISSION POLICY: SELECTED_COMPONENT_RESPONSIBILITY. Enforces limits and pre-execution authorization before heavy computation.
- STRUCTURAL EXTRACTION: SELECTED_COMPONENT_RESPONSIBILITY. Distinct analysis phase producing deterministic relationships separate from semantic vectorization.
- SEMANTIC VECTOR INDEX: SELECTED_COMPONENT_RESPONSIBILITY. Distinct statistical representation of content.
- STRUCTURAL RELATIONSHIP CONTEXT: MERGED_RESPONSIBILITY (Merged into STRUCTURAL EXTRACTION / MODE-AWARE CONTEXT RETRIEVAL). It is the output of extraction and input to retrieval; not a standalone active component.
- MODE-AWARE CONTEXT RETRIEVAL: SELECTED_COMPONENT_RESPONSIBILITY. Mediates dynamic anchor-based and semantic lookup based on translation product mode.
- PROMPT TRUST BOUNDARY: SELECTED_COMPONENT_RESPONSIBILITY. Enforces safety and isolation invariants at the final LLM interaction boundary.
- REPOSITORY-LINKED TRANSLATION HISTORY: SELECTED_COMPONENT_RESPONSIBILITY. Tracks translation provenance linked to specific source-state identities for product continuity.
- INDEX LIFECYCLE OBSERVABILITY: MERGED_RESPONSIBILITY (Merged into INDEX RUN). Diagnostics and run state are inherent properties of the index run execution attempt.
- STALE-RUN DETECTION: SELECTED_COMPONENT_RESPONSIBILITY. Cross-cutting asynchronous cleanup responsibility that must detect orphaned or retired artifacts independently of active execution.

## 17. Current Component Disposition
| Component | Disposition | Details |
|---|---|---|
| RepoEmbedding | DECOMPOSE | REUSABLE: vector storage and semantic similarity capability. INCOMPATIBLE: current aggregate identity/lifecycle model lacks tenant ownership, source state, index configuration, index-run identity, and searchable-materialization semantics. TARGET SPLIT: vector artifacts become subordinate to tenant-scoped repository imports and versioned materialization lifecycle concepts. |
| repository search router | ADAPT | |
| GitHub service | ADAPT | |
| indexing Celery task | DECOMPOSE | REUSABLE: async task execution. INCOMPATIBLE: lacks idempotent boundaries, admission policy, and materialization publication. TARGET SPLIT: splits into admission gate, indexing execution run, and publication phase. |
| translation routers | REUSE | |
| AI service | REUSE | |
| translation history | ADAPT | |
| workspace authorization | REUSE | |
| Redis usage | REUSE | |
| PostgreSQL | ADAPT | |
| pgvector | REUSE | |
| frontend repository experience | ADAPT | |

## 18. Architecture Decision Dependency Order
1. ownership boundary (HARD_ARCHITECTURE_PREREQUISITE)
2. repository import identity (HARD_ARCHITECTURE_PREREQUISITE)
3. source-state identity (HARD_ARCHITECTURE_PREREQUISITE)
4. index-configuration identity (HARD_ARCHITECTURE_PREREQUISITE)
5. admission boundary (HARD_ARCHITECTURE_PREREQUISITE) - Requires identity establishment to evaluate content policies before authorization.
6. desired materialization identity (HARD_ARCHITECTURE_PREREQUISITE)
7. desired-state incarnation (CROSS_CUTTING_INVARIANT)
8. index-run lifecycle (HARD_ARCHITECTURE_PREREQUISITE)
9. searchable publication (CROSS_CUTTING_INVARIANT)
10. structural metadata capability (INDEPENDENT_CAPABILITY)
11. mode-aware retrieval (INDEPENDENT_CAPABILITY)
12. prompt trust boundary (CROSS_CUTTING_INVARIANT)
13. repository-linked history (INDEPENDENT_CAPABILITY)
14. stale-run detection (INDEPENDENT_CAPABILITY)

## 19. Deferred Architecture Register
| Item | Classification | Trigger for Reconsideration |
|---|---|---|
| cross-tenant public index sharing | DEFERRED | Multi-tenant performance demands public reuse |
| separate logical repository identity entity | DEFERRED | Same as above |
| separate provider connection entity | DEFERRED | Multi-provider requirements per tenant |
| generalized repository activity abstraction | DEFERRED | Need for episodic memory beyond translation history |
| repository memory subsystem | OUT_OF_SCOPE | N/A |
| symbol-reference extraction | DEFERRED | Precision required by advanced Code-to-Code flows |
| call graph extraction | DEFERRED | Same as above |
| control-flow analysis | OUT_OF_SCOPE | N/A |
| data-flow analysis | OUT_OF_SCOPE | N/A |
| AI structural enrichment | NOT_JUSTIFIED | Extraction accuracy limits reached |
| AI reranking | OPTIONAL_TECHNIQUE | Semantic precision becomes a bottleneck |
| repository summarisation | OPTIONAL_TECHNIQUE | User UX requests |
| context selection assistance | OPTIONAL_TECHNIQUE | User UX requests |
| graph database | NOT_JUSTIFIED | Relational recursive queries become too slow |
| microservices | NOT_JUSTIFIED | Monolith bounds reached |
| autonomous coding agent | OUT_OF_SCOPE | N/A |
| repository write automation | DEFERRED | Product strategy change |

## 20. Architecture Risk Register
| Risk | Type | Severity | Mitigation | Residual Risk |
|---|---|---|---|---|
| tenant ownership migration risk | MIGRATION | HIGH | Require explicit ownership attribution and prohibit legacy repository artifacts whose tenant ownership cannot be proven from becoming searchable under target tenant semantics. | LOW |
| existing RepoEmbedding migration pressure | MIGRATION | HIGH | Current aggregate embedding model is not authoritative; legacy artifacts require explicit compatibility, transition, or retirement disposition before target publication semantics apply. | LOW |
| index storage duplication | OPERABILITY | MEDIUM | Bounded coexistence and retirement eligibility semantics for stale runs. | LOW |
| orphaned run accumulation | OPERABILITY | HIGH | Independent stale-run detection and cleanup eligibility. | LOW |
| embedding API pressure | COST | HIGH | Admission, idempotent retry semantics, and mode-aware retrieval where relevant. | MEDIUM |
| PostgreSQL/pgvector growth | COST | CRITICAL | Bounded admission, bounded materialization coexistence, and retirement eligibility. | MEDIUM |
| structural extraction language coverage | PRODUCT | MEDIUM | Declared capability coverage and honest degraded retrieval. | LOW |
| import resolution reliability | PRODUCT | MEDIUM | Preserve declared-import versus resolved-target distinction. | LOW |
| retrieval context inflation | PRODUCT | HIGH | Require bounded context budgets and bounded structural expansion. | MEDIUM |
| prompt injection through repository content | SECURITY | CRITICAL | Require fail-closed prompt trust separation. | LOW |
| history deletion/provenance semantics | CONSISTENCY | LOW | Ownership-bound deletion and loss of accessibility (Option A). | LOW |
| workspace lifecycle coupling | CONSISTENCY | MEDIUM | Preserve workspace ownership and authorization semantics through tenant-isolated cleanup eligibility without selecting database cascades. | LOW |

## 21. Negative Architecture Verification
| Concept | Classification | Pressure Exists / Boundary |
|---|---|---|
| generic coding agent | NOT_REQUIRED | |
| repository write automation | DEFERRED | |
| repository memory subsystem | OUT_OF_SCOPE | |
| graph database | NOT_JUSTIFIED | |
| microservices | NOT_JUSTIFIED | |
| AI-based structural extraction | NOT_JUSTIFIED | |
| full compiler-grade semantic analysis | OUT_OF_SCOPE | |
| control-flow analysis | OUT_OF_SCOPE | |
| data-flow analysis | OUT_OF_SCOPE | |
| cross-tenant index sharing | DEFERRED | |
| universal semantic-first retrieval | NOT_REQUIRED | PRESSURE_EXISTS (Mode-aware conditional branch explicitly prevents universal semantic assumption) |
| event-sourced index lifecycle | NOT_REQUIRED | |
| workflow engine | NOT_REQUIRED | |
| provider integration framework | NOT_REQUIRED | |

## 22. Capability and Gap Closure Matrix
| Item | Classification |
|---|---|
| CAP-TGT-01 | ARCHITECTURALLY_SATISFIED |
| CAP-TGT-02 | ARCHITECTURALLY_SATISFIED |
| CAP-TGT-03 | ARCHITECTURALLY_SATISFIED |
| CAP-TGT-04 | ARCHITECTURALLY_SATISFIED |
| CAP-TGT-05 | ARCHITECTURALLY_SATISFIED |
| CAP-TGT-06 | ARCHITECTURALLY_SATISFIED |
| CAP-TGT-07 | ARCHITECTURALLY_SATISFIED |
| GAP-01 | ARCHITECTURALLY_CLOSED |
| GAP-02 | ARCHITECTURALLY_CLOSED |
| GAP-03 | ARCHITECTURALLY_CLOSED |
| GAP-04 | ARCHITECTURALLY_CLOSED |
| GAP-05 | ARCHITECTURALLY_CLOSED |
| GAP-06 | ARCHITECTURALLY_CLOSED |
| GAP-07 | ARCHITECTURALLY_CLOSED |

Note: Architecture closure means conceptual semantics are fully defined; it does not mean implementation exists.

## 23. Final Architecture Boundary
The selected architecture remains restricted to the engineering of secure, deterministic repository understanding and context delivery for code transformation. It excludes autonomous agent execution, unstructured episodic memory, and uncontrolled cross-tenant optimization.

## 24. Loop 5 Verification Summary
- Read all 5 source documents.
- Evaluated and classified 8 architecture decisions in compliance with Loop 5 correction instructions.
- Corrected and fully defined conceptual architecture semantics across security boundaries, index lifecycles, structured extraction, degraded retrieval paths, historical continuity, and trust segregation.
- Created `ARCHITECTURE_DECISION.md` without modifying any other files, code, or creating migration tasks.
- No database schemas designed, no parsers selected, no network integrations made.
- See 90-point completion summary in external output.
