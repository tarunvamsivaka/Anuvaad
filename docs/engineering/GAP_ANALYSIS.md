# Anuvaad Target Capability Gap Analysis

## 1. Document Control

| Field | Value |
|---|---|
| Phase | Loop 3: Target Capability Gap Analysis (Corrected) |
| Author | Gemini 3.1 Pro (High) |
| Baseline Commit | c4e2cebf68449b957d720a0067f5af67caae1009 |
| Baseline Branch | master |
| Date | 2026-07-15 |

## 2. Executive Gap Summary
Anuvaad currently functions as a stateless, prompt-driven code translation tool relying on naive text-chunk semantic search for repository context. The target system aims to be a repository-aware code understanding and transformation platform. 

The most critical gaps identified are foundational: repository resources lack ownership boundaries (FINDING-05), semantic retrieval lacks structural awareness (FINDING-02), and index generation is neither reliable nor idempotent (FINDING-04, FINDING-07). Before complex capabilities like code-to-code translation can safely utilize repository context, the system must first implement secure, isolated, and consistent repository ingestion and representation.

## 3. Loop 3 Capability Principle Coverage

1. **Repository context**: Satisfied by existing target capability (CAP-TGT-05).
2. **Structural relationships**: Satisfied by existing target capability (CAP-TGT-04).
3. **Repository-scoped retrieval**: Cross-cutting concern spanning authorization (CAP-TGT-01) and retrieval (CAP-TGT-05).
4. **Safe tenant ownership**: Satisfied by existing target capability (CAP-TGT-01).
5. **Index consistency**: Satisfied by existing target capability (CAP-TGT-03).
6. **Repository revision awareness**: Satisfied by existing target capability (CAP-TGT-02).
7. **Repository memory / continuity**: Distinct missing target capability; added as CAP-TGT-07 (Repository-Linked Continuity) based on requirement B (stable repository state plus repository-linked activity/history).
8. **AI task boundaries**: Evaluated via explicit AI Task Boundary Analysis.
9. **Prompt trust boundaries**: Satisfied by existing target capability (CAP-TGT-06).
10. **Free-tier operational reality**: Cross-cutting architecture decision pressure evaluated in Operational Pressure Analysis.

## 4. Current-State Capability Map

| Capability ID | Capability Name | Current Classification | Primary Evidence | Current Behaviour | Current Limitation | Relevant Audit Findings |
|---|---|---|---|---|---|---|
| CAP-CUR-01 | Code to English | FUNCTIONAL | app/routers/translate/code_to_english.py | Sync and streaming explanation of isolated code | No repository context | None |
| CAP-CUR-02 | English to Code | FUNCTIONAL | app/routers/translate/english_to_code.py | Generates code from natural language | Operates in isolation | None |
| CAP-CUR-03 | Code to Code | FUNCTIONAL | app/routers/translate/code_to_code.py | Translates code between languages | Operates in isolation | None |
| CAP-CUR-04 | File upload translation | FUNCTIONAL | app/routers/translate/upload.py | Reads file into memory, translates to blocks | Full content buffered before limit check, stored in JSONB | FINDING-03 |
| CAP-CUR-05 | Gist import | MISSING | Repository-wide absence | Not implemented | Repository-wide search reveals no Gist API integration or endpoints. | None |
| CAP-CUR-06 | GitHub repository file fetching | FUNCTIONAL | app/services/github.py | Fetches supported text files via PyGitHub tree API | Uses server PAT, no user auth gating | FINDING-05 |
| CAP-CUR-07 | Repository indexing | PARTIAL | app/queue/tasks.py | Chunks files and generates embeddings | Linear text chunking only, skips failed batches | FINDING-02, FINDING-04 |
| CAP-CUR-08 | Repository semantic search | PARTIAL | app/routers/repo_search.py | Cosine similarity on text chunks | No ownership isolation, no structural awareness | FINDING-02, FINDING-05 |
| CAP-CUR-09 | Repository structural analysis | MISSING | N/A | Not implemented | Semantic matching only | FINDING-02 |
| CAP-CUR-10 | Repository ownership isolation | MISSING | app/models/db_models.py | RepoEmbedding lacks user/workspace columns | Cross-tenant data exposure for private repos | FINDING-05 |
| CAP-CUR-11 | Repository revision awareness | MISSING | app/models/db_models.py | Only repository_name stored | Index cannot be tied to a source state | FINDING-07 |
| CAP-CUR-12 | Repository index lifecycle | MISSING | app/queue/tasks.py | Blind inserts, no state tracking | Retries cause duplicate data, no idempotency | FINDING-07 |
| CAP-CUR-13 | Repository memory | MISSING | N/A | Not implemented | No continuity across translations | None |
| CAP-CUR-14 | Translation history | FUNCTIONAL | app/routers/history.py | Logs translations to Postgres | Standalone translation records lack any explicit association with repository resource identity, source-state identity, or index identity. | None |
| CAP-CUR-15 | Workspace authorization | FUNCTIONAL | app/routers/workspace.py | Role-based membership checks | Application layer WHERE clauses only | FINDING-01 |
| CAP-CUR-16 | API key authentication | FUNCTIONAL | app/core/auth.py | Argon2id hashing, transparent upgrades | DELETE /account bypasses local JWT | FINDING-06 |
| CAP-CUR-17 | AI completion routing | FUNCTIONAL | app/services/ai.py | Centralised 3-level fallback | None | None |
| CAP-CUR-18 | AI embedding generation | PARTIAL | app/routers/repo_search.py | OpenAI or HF via load-time selection | No batch retry or fallback | FINDING-04 |
| CAP-CUR-19 | Streaming | FUNCTIONAL | app/services/ai.py | SSE code generation | None | None |
| CAP-CUR-20 | Background jobs | FUNCTIONAL | app/queue/tasks.py | Celery async workers | Task-level retries conflict with non-idempotent operations | FINDING-07 |
| CAP-CUR-21 | Billing entitlement | FUNCTIONAL | app/routers/billing.py | Webhooks and quota enforcement | None | None |
| CAP-CUR-22 | Rate limiting | FUNCTIONAL | app/core/rate_limit.py | Redis TTL-based limits | None | None |
| CAP-CUR-23 | Protection modes | FUNCTIONAL | app/core/quota.py | Character limits, basic checks | None | None |
| CAP-CUR-24 | Observability | PARTIAL | app/core/config.py | Basic metrics and logging | Cannot observe index completeness or failures | FINDING-04 |
| CAP-CUR-25 | Prompt trust separation | PARTIAL | app/services/ai.py | System prompts define structure | Repository content is inserted without untrusted-data framing | None |
| CAP-CUR-26 | VS Code extension integration | OUT_OF_SCOPE | N/A | Mentioned in docs | Outside current core platform logic | None |

## 5. Target Capability Map

Documentation Convention: DIRECT_HARD_PREREQUISITES_ONLY

| Target Capability ID | Target Capability Name | Product Mode / Platform Concern | User Need | Required Behaviour | Why Current is Insufficient | Dependencies / Prerequisites | Operational Pressure | Evidence Source |
|---|---|---|---|---|---|---|---|---|
| CAP-TGT-01 | Repository Resource Identity & Ownership | SECURITY | I need my private repos to remain private to my workspace. | Explicit ownership binding for imported repositories | Current embeddings are globally shared | None | DB Storage (new tables) | FINDING-05 |
| CAP-TGT-02 | Repository Revision Tracking | INDEX CONSISTENCY | I need the AI to know if the code has changed since it was indexed. | Associate an index with an unambiguous repository source-state identity and determine whether that source state has changed. | Current index has no concept of time or revision | CAP-TGT-01 | Low | FINDING-07 |
| CAP-TGT-03 | Idempotent Index Lifecycle | INDEX CONSISTENCY | Indexing must reliably complete or fail without corrupting data. | Repeated indexing and retry execution must converge on a defined, consistent searchable representation for a repository source state. | Retries cause duplicates, failures leave partial indexes | CAP-TGT-02 | Lifecycle-state persistence and coordination | FINDING-04, FINDING-07 |
| CAP-TGT-04 | Structural Relationship Extraction | CODE TO ENGLISH, ENGLISH TO CODE, CODE TO CODE | The AI needs to understand what this function imports. | Extract the minimum structural metadata necessary to identify material code relationships relevant to translation and explanation tasks. | Current text chunks lack relationship context | CAP-TGT-01 | Compute (Parsing), DB Storage | FINDING-02 |
| CAP-TGT-05 | Repository-Aware Context Retrieval | CODE TO ENGLISH, ENGLISH TO CODE, CODE TO CODE | When explaining a file, the AI should see the interfaces it uses. | Retrieve context using both semantic similarity and structural relationship signals | Current retrieval is purely semantic text similarity | CAP-TGT-03, CAP-TGT-04 | Vector Search latency, Prompt size | FINDING-02 |
| CAP-TGT-06 | Context-Aware Prompt Boundaries | SECURITY | Malicious code in a repo should not hijack the agent. | Strict separation of instructions from untrusted repo data | Current system injects repo text directly into prompt | None | None | Prompt Injection risk |
| CAP-TGT-07 | Repository-Linked Continuity | PRODUCT CONCERN | I need context to persist across sessions | Maintain stable repository state and link relevant prior activity to it | Current translations are disconnected from repository identity | CAP-TGT-01 | Database indexing/querying | Continuity Principle |

## 6. Current-to-Target Gap Matrix

| Gap ID | Current Capability | Target Capability | Gap Description | Gap Type | Product Impact | Security Impact | Operational Impact | Prerequisites | Related Audit Findings | Arch Decision Required |
|---|---|---|---|---|---|---|---|---|---|---|
| GAP-01 | CAP-CUR-10 | CAP-TGT-01 | No tenant boundary on indexed repository data | SECURITY_BOUNDARY | High | High (Cross-tenant exposure) | Low | None | FINDING-05 | YES (How should an imported repository resource be owned and scoped?) |
| GAP-02 | CAP-CUR-11 | CAP-TGT-02 | No revision identity tracking for indexes | CONSISTENCY_GAP | High | None | Low | CAP-TGT-01 | FINDING-07 | YES (What repository revision identity should define an index?) |
| GAP-03 | CAP-CUR-12, CAP-CUR-18 | CAP-TGT-03 | Blind, non-idempotent indexing with no state tracking or batch retries | CONSISTENCY_GAP | High | None | Moderate (Storage bloat from duplicates) | CAP-TGT-02 | FINDING-04, FINDING-07 | YES (How should index lifecycle state and transitions be represented and enforced?) |
| GAP-04 | CAP-CUR-09 | CAP-TGT-04 | No structural extraction | MISSING_CAPABILITY | High | None | High (Compute/Storage) | CAP-TGT-01 | FINDING-02 | YES (What minimum structural metadata provides meaningful retrieval improvement?) |
| GAP-05 | CAP-CUR-08 | CAP-TGT-05 | Retrieval is semantic only, no structural resolution | PARTIAL_CAPABILITY | High | None | Moderate (Search latency) | CAP-TGT-03, CAP-TGT-04 | FINDING-02 | YES (How should semantic and structural signals be combined for retrieval?) |
| GAP-06 | CAP-CUR-25 | CAP-TGT-06 | Untrusted repo data not isolated in prompts | SECURITY_BOUNDARY | Low | Medium | Low | None | None | NO |
| GAP-07 | CAP-CUR-13, CAP-CUR-14 | CAP-TGT-07 | Translation history disconnected from repository identity | MISSING_CAPABILITY | High | None | Low | CAP-TGT-01 | None | YES (What is the minimum continuity capability that satisfies the current target product modes?) |

## 7. AI Task Boundary Analysis

Deterministic structural extraction is a required capability input for CAP-TGT-04 but is NOT_AN_AI_TASK.

| Task Category | Current Implementation | Input Contract | Output Contract | Failure / Fallback Behaviour | Repository-Aware Target Pressure | Whether Target Capability Changes the Task Class |
|---|---|---|---|---|---|---|
| **AI-TASK-01:** Structured explanation/generation | Sync API with Groq/OpenRouter | Natural language prompt + code snippet | Structured JSON blocks | Centralised 3-level fallback | High volume of retrieved repository context increasing prompt size and generation latency | No |
| **AI-TASK-02:** Streaming explanation/generation | SSE endpoint | Prompt + code snippet | Streamed JSON | Provider routing via singleton | Context delivery latency pressure | No |
| **AI-TASK-03:** Embedding generation | Celery via OpenAI/HF | Text chunks | Vectors | Silent drop on batch failure | Batch retry amplification, large input volume | No |
| **Candidate:** Repository summarisation | N/A | Repository metadata and files | Narrative summary | Graceful degradation to file listing | Must consume large repository context budgets | OPTIONAL_ARCHITECTURE_TECHNIQUE |
| **Candidate:** Context reranking | N/A | Query + candidate chunks | Ranked list | Fall back to pure semantic ranking | High throughput requirement for retrieval | OPTIONAL_ARCHITECTURE_TECHNIQUE |
| **Candidate:** Context selection assistance | N/A | Query + repository tree | Selected paths | Fall back to naive semantic search | Deep architectural context requirement | OPTIONAL_ARCHITECTURE_TECHNIQUE |
| **Candidate:** Structural metadata enrichment | N/A | Raw source code | AI-inferred relationships | Fall back to deterministic edges | Massive batch processing pressure | NOT_JUSTIFIED |

## 8. Product-Flow Gap Analysis

### FLOW-GAP-01 CODE TO ENGLISH WITH REPOSITORY CONTEXT
- **Current Flow:** User submits isolated code or file.
- **Target Flow:** User may explain code with repository-aware context.
- **Current Reusable Components:** Streaming LLM completion, block generation.
- **Repository Authorization Needs:** Ensure user owns the repository context used (GAP-01).
- **Source-State Prerequisites:** Requires an available, indexed source state (GAP-02, GAP-03).
- **Context-Selection Needs:** Mechanism to identify files/symbols to pull (GAP-05).
- **Structural Relationship Needs:** Ability to find definitions of symbols used in the queried code (GAP-04).
- **Prompt-Boundary Needs:** Untrusted repository data isolated from user prompts (GAP-06).
- **Persistence/Continuity Needs:** Link explanation to repository state for future sessions (GAP-07).
- **Observability Needs:** Token usage attribution to repository context.
- **Failure Behaviour:** Fall back to isolated explanation if repository context is unavailable.

### FLOW-GAP-02 ENGLISH TO CODE WITH REPOSITORY CONTEXT
- **Current Flow:** Operates in isolation.
- **Target Flow:** Generates code leveraging internal patterns.
- **Current Reusable Components:** Structured code generation.
- **Context Resolution:** Translate natural language into semantic/structural search queries (GAP-05).
- **Internal API/Type Awareness:** Must retrieve project-specific patterns.
- **Structural Context Needs:** Ensure generated code aligns with project architecture (GAP-04).
- **Semantic Context Needs:** Find semantically similar existing implementations.
- **Authorization & State:** User-scoped (GAP-01) and fully indexed source state (GAP-02, GAP-03).
- **Prompt Trust Boundaries:** Prevent prompt injection from retrieved context (GAP-06).
- **Continuity & Observability:** Link generated code to session (GAP-07); log generation quality.
- **Failure Behaviour:** Generate generic code if repo context is missing.

### FLOW-GAP-03 CODE TO CODE WITH REPOSITORY CONTEXT
- **Current Flow:** Operates in isolation.
- **Target Flow:** Cross-file context aware translation.
- **Current Reusable Components:** Syntax translation endpoint.
- **Source/Target Language Context:** Understand source project structure; map to target conventions.
- **Dependency & Type Context:** Identify packages and maintain type safety (GAP-04).
- **Cross-File Relationship Needs:** Translate multi-file modules coherently.
- **Context-Selection Requirements:** Retrieve both source definitions and target equivalents (GAP-05).
- **Authorization & State:** Both source and target context must be authorized (GAP-01) and indexed (GAP-02, GAP-03).
- **Observability & Degraded Behaviour:** Track translation success rates; degrade to isolated single-file translation.

### FLOW-GAP-04 REPOSITORY IMPORT AND INDEXING
1. **Repository connection/import**: CURRENT: Server PAT. TARGET NEED: User-scoped GitHub app or OAuth. GAP: GAP-01.
2. **Authorization**: CURRENT: Shared global embeddings. TARGET NEED: Tenant isolated repository boundaries. GAP: GAP-01.
3. **Repository resource identity**: CURRENT: Bare name string. TARGET NEED: Unambiguous globally unique repository identifier. GAP: GAP-01.
4. **Source-state identity**: CURRENT: Missing. TARGET NEED: Explicit revision (e.g. commit hash) tracking. GAP: GAP-02.
5. **File selection**: CURRENT: Basic extension filtering. TARGET NEED: Respect ignores, limits. GAP: NONE / EXISTING CAPABILITY SUFFICIENT.
6. **Untrusted-content treatment**: CURRENT: Raw processing. TARGET NEED: Safe isolation boundaries during extraction. GAP: GAP-06.
7. **Structural metadata extraction**: CURRENT: None. TARGET NEED: Extract relationships (imports, definitions). GAP: GAP-04.
8. **Semantic indexing where applicable**: CURRENT: Linear chunking. TARGET NEED: Chunking optimized for semantics. GAP: GAP-05.
9. **Index lifecycle**: CURRENT: Blind insert. TARGET NEED: Tracking index state transitions. GAP: GAP-03.
10. **Searchable-state transition**: CURRENT: Implicit on row insert. TARGET NEED: Atomic transition to searchable state. GAP: GAP-03.
11. **Failure visibility**: CURRENT: Silent drop. TARGET NEED: Observable index failure states. GAP: GAP-03.
12. **Retry**: CURRENT: Task-level Celery retries causing duplicates. TARGET NEED: Idempotent batch retries. GAP: GAP-03.
13. **Re-index**: CURRENT: Manual deletion or uncontrolled overwrite. TARGET NEED: Managed source-state updates. GAP: GAP-03.

### FLOW-GAP-05 REPOSITORY SEARCH AND CONTEXT RETRIEVAL
1. **Translation task**: CURRENT: Isolated code blocks. TARGET NEED: Contextualized query. GAP: NONE / EXISTING CAPABILITY SUFFICIENT.
2. **Repository authorization**: CURRENT: Unrestricted embedding search. TARGET NEED: Tenant isolated search execution. GAP: GAP-01.
3. **Source-state/index availability**: CURRENT: Blind query. TARGET NEED: Ensure searchable state is available before querying. GAP: GAP-03.
4. **User-selected context**: CURRENT: Missing. TARGET NEED: Allow explicit file/symbol filtering by user. GAP: GAP-05.
5. **Semantic candidate retrieval**: CURRENT: Pure cosine similarity. TARGET NEED: Accurate semantic recall. GAP: NONE / EXISTING CAPABILITY SUFFICIENT.
6. **Structural relevance**: CURRENT: Missing. TARGET NEED: Resolve structural relationships linked to candidates. GAP: GAP-04.
7. **Language relevance**: CURRENT: Blind to language semantics. TARGET NEED: Language-aware relationship parsing. GAP: GAP-04.
8. **Repository convention relevance**: CURRENT: None. TARGET NEED: Highlight recurring project patterns. GAP: GAP-05.
9. **Context budget**: CURRENT: Arbitrary limit. TARGET NEED: Dynamic token budgeting based on candidate quality. GAP: GAP-05.
10. **Prompt-context construction**: CURRENT: Naive text injection. TARGET NEED: Boundary isolation for untrusted text. GAP: GAP-06.

### FLOW-GAP-06 REPOSITORY CONTINUITY
1. **Repository imported**: CURRENT: Functional. TARGET NEED: Fully authorized and identified. REQUIRES: REPOSITORY_STATE. GAP: GAP-01.
2. **Repository state persisted**: CURRENT: Missing revision. TARGET NEED: Trackable source state. REQUIRES: REPOSITORY_STATE, INDEX. GAP: GAP-02.
3. **Translation/explanation performed**: CURRENT: Functional. TARGET NEED: Execution with context. REQUIRES: INDEX. GAP: NONE / EXISTING CAPABILITY SUFFICIENT.
4. **Activity associated where justified**: CURRENT: Missing. TARGET NEED: Link translation to the active repository state. REQUIRES: HISTORY, REPOSITORY_STATE. GAP: GAP-07.
5. **User leaves**: CURRENT: Stateless. TARGET NEED: Session termination tracking. REQUIRES: NONE. GAP: NONE / EXISTING CAPABILITY SUFFICIENT.
6. **User returns**: CURRENT: Starts fresh. TARGET NEED: Identify returning user's active workspace. REQUIRES: NONE. GAP: NONE / EXISTING CAPABILITY SUFFICIENT.
7. **Repository context restored**: CURRENT: None. TARGET NEED: Restore active repository view. REQUIRES: REPOSITORY_STATE. GAP: GAP-07.
8. **Prior relevant activity surfaced where justified**: CURRENT: Missing. TARGET NEED: Show previous translations for the same repository. REQUIRES: HISTORY, REPOSITORY_STATE. GAP: GAP-07. (Distinct repository memory subsystem is not currently required).

## 9. Audit Finding to Capability Gap Mapping

| Finding ID | Classification | Capability Gap | Justification |
|---|---|---|---|
| FINDING-01 | DEFENCE_IN_DEPTH | N/A | RLS is a defence-in-depth concern, not a missing core product capability. |
| FINDING-02 | TARGET_CAPABILITY_GAP | GAP-04, GAP-05 | Missing structural analysis maps to the need for structural extraction and context-aware retrieval. |
| FINDING-03 | LOCAL_REMEDIATION | N/A | Upload size enforcement is a local quality fix. |
| FINDING-04 | TARGET_CAPABILITY_GAP | GAP-03 | Embedding failure handling maps directly to index lifecycle and consistency. |
| FINDING-05 | TARGET_CAPABILITY_GAP | GAP-01 | Repository ownership isolation maps to repository resource identity and ownership. |
| FINDING-06 | LOCAL_REMEDIATION | N/A | Centralised auth consistency is a local cleanup item. |
| FINDING-07 | TARGET_CAPABILITY_GAP | GAP-02, GAP-03 | Non-idempotent indexing maps to revision tracking and index lifecycle. |

## 10. Capability Dependency and Prerequisite Analysis

Documentation Convention: DIRECT_HARD_PREREQUISITES_ONLY

- **Can repository-aware retrieval safely execute without repository authorization scoping?** NO (HARD_PREREQUISITE).
- **Can retrieval use an index without knowing whether the index is searchable or incomplete?** NO (HARD_PREREQUISITE).
- **Can index lifecycle be reliable without repository source-state identity?** NO (HARD_PREREQUISITE).
- **Can repository continuity be restored without stable repository resource identity?** NO (HARD_PREREQUISITE).
- **Can structural metadata be associated correctly without stable repository identity?** NO (HARD_PREREQUISITE).
- **Does prompt trust separation logically depend on repository ownership?** NO (CROSS_CUTTING).

```text
CAP-TGT-01 (Repository Resource Identity & Ownership)
  │
  ├──► CAP-TGT-02 (Repository Revision Tracking)
  │      │
  │      └──► CAP-TGT-03 (Idempotent Index Lifecycle)
  │             │
  │             └──► CAP-TGT-05 (Repository-Aware Context Retrieval)
  │
  ├──► CAP-TGT-04 (Structural Relationship Extraction)
  │      │
  │      └──► CAP-TGT-05 (Repository-Aware Context Retrieval)
  │
  └──► CAP-TGT-07 (Repository-Linked Continuity)

CAP-TGT-06 (Context-Aware Prompt Boundaries) [CROSS_CUTTING]
`

## 11. Operational and Free-Tier Pressure Analysis

| Category | Pressure Level | Pressure Source | Capabilities Creating Pressure | Free-Tier Risk | Measurement Needed |
|---|---|---|---|---|---|
| PostgreSQL relational storage | HIGH | Structural metadata and file state storage | CAP-TGT-04, CAP-TGT-03 | Row limits on free-tier DB | Rows per average repo |
| pgvector storage | HIGH | High-dimensional vectors per chunk | CAP-TGT-05 | Storage limits | Disk usage per repo |
| Redis | LOW | Cache operations and background job queueing. Current use is basic rate limiting; target capability coordination could increase memory pressure without necessarily acting as the persistent lifecycle store. | CAP-TGT-03 | Memory exhaustion | Peak keys |
| Celery workers | MODERATE | Long-running indexing tasks block concurrency. Worker concurrency limit is easily saturated. | CAP-TGT-03, CAP-TGT-04 | Worker starvation | Queue depth |
| External AI APIs | HIGH | Large embedding input volume, high provider request volume, aggressive rate limits, retry amplification risks, and completion prompt-context growth. | CAP-TGT-03 | Hard token rate limits | Tokens per indexing job |
| GitHub API limits | MODERATE | Server PAT exhaustion | CAP-TGT-01, CAP-TGT-02 | 5,000 req/hr limit | API calls per repo size |
| Frontend complexity | LOW | Exposing repository context UI | CAP-TGT-05 | Client performance | Render times |
| Indexing latency | MODERATE | Slow structural extraction and semantic indexing degrade UX. | CAP-TGT-03, CAP-TGT-04 | User abandonment | Time-to-indexed |
| Deployment memory | HIGH | Repository file retrieval, content working set, batch size limits, embedding batches, structural extraction working set, and concurrent worker jobs all compete for bounded memory. | CAP-TGT-03, CAP-TGT-04 | OOM kills | Peak RAM usage |
| Background processing | HIGH | Background-processing orchestration pressure (state transition coordination, failure handling) compounds raw CPU bounds from extraction. | CAP-TGT-03, CAP-TGT-04 | CPU throttling | Compute duration |

## 12. Non-Goals and Deferred Capabilities

| Capability | Classification | Rationale |
|---|---|---|
| Autonomous coding agent | NON_GOAL | Anuvaad is a code translation and understanding platform. |
| Direct repository write-back | DEFERRED_CANDIDATE | Focus is on generating code; automated PRs/commits are secondary. |
| Automatic pull request creation | DEFERRED_CANDIDATE | Secondary to core translation capabilities. |
| Code execution sandbox | NON_GOAL | Out of scope for current product positioning. |
| Full compiler-grade semantic analysis | NON_GOAL | Too heavy for free-tier operational reality; lightweight structural metadata is preferred. |
| Full control-flow analysis | DEFERRED_CANDIDATE | High complexity; minimal ROI for standard translation tasks. |
| Full data-flow analysis | DEFERRED_CANDIDATE | High complexity; minimal ROI for standard translation tasks. |
| Real-time repository synchronization | DEFERRED_CANDIDATE | Immediate target product modes require source-state awareness and explicit refresh/re-index capability; continuous synchronization mechanism selection is deferred. |
| GitHub webhook synchronization | DEFERRED_CANDIDATE | Can be implemented post-foundational capability build. |
| Multi-IDE synchronization | DEFERRED_CANDIDATE | Outside immediate repository intelligence scope. |
| Collaborative editing | NON_GOAL | Out of scope. |
| Graph database | ARCHITECTURE_OPTION_NOT_CAPABILITY | This is a technology choice for implementation, not a capability itself. |
| Microservice decomposition | ARCHITECTURE_OPTION_NOT_CAPABILITY | Architectural choice, not a capability. |

## 13. Gap Priority Summary

| Gap ID | Priority | Description |
|---|---|---|
| GAP-01 | FOUNDATIONAL | No tenant boundary on indexed repository data |
| GAP-02 | FOUNDATIONAL | No revision identity tracking for indexes |
| GAP-03 | FOUNDATIONAL | Blind, non-idempotent indexing with no state tracking |
| GAP-04 | CORE_PRODUCT | No structural extraction |
| GAP-05 | CORE_PRODUCT | Retrieval is semantic only, no structural resolution |
| GAP-06 | DEFENCE_IN_DEPTH | Untrusted repo data not isolated in prompts |
| GAP-07 | CORE_PRODUCT | Translation history disconnected from repository identity |

## 14. Architecture Decision Questions for the Next Loop

1. How should an imported repository resource be owned and scoped?
2. What repository revision identity should define an index?
3. How should index lifecycle state and transitions be represented and enforced?
4. What minimum structural metadata provides meaningful retrieval improvement?
5. How should semantic and structural signals be combined for retrieval?
6. What is the minimum continuity capability that satisfies the current target product modes?

## 15. Loop 3 Verification Summary
- **Current Capabilities:** Recounted from repository evidence; counts corrected.
- **Gist Import:** Verified missing via full repository search.
- **Translation History Memory:** Corrected limitation; history is functional but disconnected from repository context.
- **Target Completeness:** Expanded to 7 target capabilities to satisfy continuity principle.
- **AI Task Boundaries:** Evaluated. Deterministic extraction distinguished from AI tasks.
- **Architecture Neutrality:** Removed premature parser selections (AST, Tree-sitter), architecture options (Neo4j, upsert), and identity options (commit SHA, workspace_id).
- **Product Flows:** Expanded all 6 product flows to analyze capabilities across 10+ operational dimensions.
- **Prerequisite Graph:** Textually rebuilt defining hard prerequisites for target capabilities.
- **Deferred Candidates:** Checked to ensure they are accurately phrased and deferred logic makes no architectural assumptions.
- **Decisions:** Formulated exclusively as questions for Loop 4. No implementations selected.
