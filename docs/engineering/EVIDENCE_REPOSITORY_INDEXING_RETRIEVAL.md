# EVIDENCE: REPOSITORY INDEXING AND RETRIEVAL RUNTIME

## 1. Document Control

* **Document Name:** EVIDENCE_REPOSITORY_INDEXING_RETRIEVAL.md
* **Protocol Pass:** LOOP_6A_2
* **Repository Root:** C:/Users/tarun/Anuvaad/Anuvaad
* **Branch:** master
* **HEAD Commit:** c4e2cebf68449b957d720a0067f5af67caae1009
* **Initial Git Status Exact Output:**
  ```text
  ?? docs/
  ```
* **Evidence Authority:** Current production repository indexing and retrieval code
* **Authorized Scope:** Observe current repository ingestion -> trace indexing -> trace embedding persistence -> trace search -> trace translation consumption.
* **Artifact Creation Status:** Created in Loop 6A-2

## 2. Git and Repository State

* **Repository Root:** C:/Users/tarun/Anuvaad/Anuvaad
* **Branch:** master
* **HEAD Commit:** c4e2cebf68449b957d720a0067f5af67caae1009
* **Exact Initial `git status --short` Output:**
  ```text
  ?? docs/
  ```
* **Initial Git Status Path Count:** 1
* **Target Artifact Pre-existed:** False
* **Unexpected Working-Tree Change Outside docs/:** None observed

## 3. Repository Runtime Component Authority

| Runtime Concern | Active Path | Active Callable/Class | Runtime Consumer | Evidence Classification |
| --- | --- | --- | --- | --- |
| Repository index endpoint | `app/routers/repo_search.py` | `index_repo` | HTTP API Clients | DIRECT_REPOSITORY_EVIDENCE |
| Repository search endpoint | `app/routers/repo_search.py` | `search_repo` | HTTP API Clients | DIRECT_REPOSITORY_EVIDENCE |
| GitHub repository acquisition service | `app/services/github.py` | `fetch_repository_files` | `process_github_repo_task` | DIRECT_REPOSITORY_EVIDENCE |
| Celery index task | `app/queue/tasks.py` | `process_github_repo_task` | Celery Worker | DIRECT_REPOSITORY_EVIDENCE |
| Embedding service | `app/services/embedding.py` | `generate_embeddings_openai` / `generate_embeddings_hf` | `process_github_repo_task` / `search_repo` | DIRECT_REPOSITORY_EVIDENCE |
| Vector repository | `app/repositories/vectors.py` | `insert_repo_embeddings` / `search_repo_embeddings` | `process_github_repo_task` / `search_repo` | DIRECT_REPOSITORY_EVIDENCE |
| Vector model | `app/models/db_models.py` | `RepoEmbedding` | `app/repositories/vectors.py` | DIRECT_REPOSITORY_EVIDENCE |
| Repository request schemas | `app/routers/repo_search.py` | `IndexRepoPayload` / `SearchRepoPayload` | `index_repo` / `search_repo` | DIRECT_REPOSITORY_EVIDENCE |
| Relevant configuration source | `app/routers/repo_search.py` | `os.environ.get("OPENAI_API_KEY")` | Module initialization | DIRECT_REPOSITORY_EVIDENCE |

## 4. Repository API Endpoint Inventory

1. **Endpoint:** `POST /repo/index`
   * HTTP Method: POST
   * Router-local Path: `/index`
   * Effective Path: `/repo/index`
   * Handler Callable: `index_repo`
   * Request Schema: `IndexRepoPayload`
   * Auth Dependency: `Depends(get_user_email)`
   * Workspace Identifier Accepted: No
   * Repository Identifier Accepted: Yes (`repo_name`)
   * Repository Provider Accepted: No
   * Source Revision Accepted: No
   * Task Dispatch or Direct Execution: Task Dispatch (`process_github_repo_task.delay`)
   * Response Purpose: Acknowledge indexing start
   * Evidence Classification: DIRECT_REPOSITORY_EVIDENCE

2. **Endpoint:** `GET /repo/{owner}/{repo}/status`
   * HTTP Method: GET
   * Router-local Path: `/{owner}/{repo}/status`
   * Effective Path: `/repo/{owner}/{repo}/status`
   * Handler Callable: `repo_status`
   * Request Schema: None (Path parameters)
   * Auth Dependency: `Depends(get_user_email)`
   * Workspace Identifier Accepted: No
   * Repository Identifier Accepted: Yes (`owner`, `repo`)
   * Repository Provider Accepted: No
   * Source Revision Accepted: No
   * Task Dispatch or Direct Execution: Direct Execution
   * Response Purpose: Return indexed chunk count
   * Evidence Classification: DIRECT_REPOSITORY_EVIDENCE

3. **Endpoint:** `POST /repo/search`
   * HTTP Method: POST
   * Router-local Path: `/search`
   * Effective Path: `/repo/search`
   * Handler Callable: `search_repo`
   * Request Schema: `SearchRepoPayload`
   * Auth Dependency: `Depends(get_user_email)`
   * Workspace Identifier Accepted: No
   * Repository Identifier Accepted: Yes (`repo_name`)
   * Repository Provider Accepted: No
   * Source Revision Accepted: No
   * Task Dispatch or Direct Execution: Direct Execution
   * Response Purpose: Return semantic search results
   * Evidence Classification: DIRECT_REPOSITORY_EVIDENCE

* REGISTERED_REPOSITORY_RUNTIME_ROUTE_COUNT: 3
* REPOSITORY_ENDPOINT_TABLE_ROW_COUNT: 3

## 5. Repository Index Request Runtime Trace

`HTTP REQUEST`
`-> POST /repo/index`
`-> Depends(get_user_email)`
`-> IndexRepoPayload (repo_name: str)`
`-> index_repo`
`-> payload.repo_name`
`-> process_github_repo_task.delay(payload.repo_name)`
`-> tasks.process_github_repo`

1. What endpoint starts indexing? `POST /repo/index` (DIRECT_REPOSITORY_EVIDENCE)
2. What request schema is used? `IndexRepoPayload` (DIRECT_REPOSITORY_EVIDENCE)
3. What user identity is available? `user_email` (DIRECT_REPOSITORY_EVIDENCE)
4. Is a workspace identity required? No (DIRECT_REPOSITORY_EVIDENCE)
5. Is workspace membership checked? No (DIRECT_REPOSITORY_EVIDENCE)
6. Is workspace ownership checked? No (DIRECT_REPOSITORY_EVIDENCE)
7. What repository identity is accepted? string `repo_name` formatted as "owner/repo" (DIRECT_REPOSITORY_EVIDENCE)
8. Is repository identity provider-qualified? No (DIRECT_REPOSITORY_EVIDENCE)
9. Is a branch accepted? No (DIRECT_REPOSITORY_EVIDENCE)
10. Is a commit/revision accepted? No (DIRECT_REPOSITORY_EVIDENCE)
11. Is repository authorization checked before dispatch? No (DIRECT_REPOSITORY_EVIDENCE)
12. Is repository size checked before dispatch? No (DIRECT_REPOSITORY_EVIDENCE)
13. Is duplicate indexing checked before dispatch? No (DIRECT_REPOSITORY_EVIDENCE)
14. Is an index state row created before dispatch? No (DIRECT_REPOSITORY_EVIDENCE)
15. What exact Celery dispatch expression is used? `process_github_repo_task.delay(payload.repo_name)` (DIRECT_REPOSITORY_EVIDENCE)
16. What arguments are passed to the task? `payload.repo_name` (DIRECT_REPOSITORY_EVIDENCE)
17. What immediate HTTP response is returned? `{"message": f"Started indexing {payload.repo_name}", "status": "accepted"}` (DIRECT_REPOSITORY_EVIDENCE)

## 6. GitHub Repository Content Acquisition

1. Whether the code uses GitHub REST API: Yes (`from github import Github`) (DIRECT_REPOSITORY_EVIDENCE)
2. Whether it uses raw content URLs: No (DIRECT_REPOSITORY_EVIDENCE)
3. Whether it uses `git clone`: No (DIRECT_REPOSITORY_EVIDENCE)
4. Whether it downloads an archive: No (DIRECT_REPOSITORY_EVIDENCE)
5. Whether it recursively calls the contents API: No, uses `get_git_tree(..., recursive=True)` (DIRECT_REPOSITORY_EVIDENCE)
6. Whether it uses `GITHUB_PAT`: Yes (DIRECT_REPOSITORY_EVIDENCE)
7. Where credentials are sourced: `os.environ.get("GITHUB_PAT")` (DIRECT_REPOSITORY_EVIDENCE)
8. Whether credentials are user-specific: No (DIRECT_REPOSITORY_EVIDENCE)
9. Whether credentials are workspace-specific: No (DIRECT_REPOSITORY_EVIDENCE)
10. Whether one global credential is used: Yes (DIRECT_REPOSITORY_EVIDENCE)
11. Whether private repositories are supported by the indexing path: Yes, if the global PAT has access (TRACED_RUNTIME_FLOW)
12. Whether provider repository ID is resolved: No (DIRECT_REPOSITORY_EVIDENCE)
13. Whether repository owner/login is resolved: Implicit in string split, but not separately resolved as ID (DIRECT_REPOSITORY_EVIDENCE)
14. Whether default branch is resolved: Yes (`repo.default_branch`) (DIRECT_REPOSITORY_EVIDENCE)
15. Whether requested branch is supported: No (DIRECT_REPOSITORY_EVIDENCE)
16. Whether commit SHA/revision is resolved: No (DIRECT_REPOSITORY_EVIDENCE)
17. Whether rate-limit responses are handled: No explicit handling in source (DIRECT_REPOSITORY_EVIDENCE)
18. Whether pagination is handled: Handled internally by PyGithub, no explicit pagination code in source (DIRECT_REPOSITORY_EVIDENCE)
19. Whether symlinks are handled: No (DIRECT_REPOSITORY_EVIDENCE)
20. Whether submodules are handled: No (DIRECT_REPOSITORY_EVIDENCE)
21. Whether Git LFS pointers are detected: No (DIRECT_REPOSITORY_EVIDENCE)
22. Whether binary files are detected: NOT_PRESENT_IN_INSPECTED_CODE (EXPLICIT_BINARY_DETECTION: NOT_PRESENT_IN_INSPECTED_CODE, UTF8_DECODE_FAILURE_REJECTION: NOT_PRESENT_IN_INSPECTED_CODE, UTF8_ERRORS_IGNORE: CONFIGURED, GENERIC_EXCEPTION_SKIP: CONFIGURED)
23. Whether file-size limits exist: Yes, `getattr(element, "size", 0) > 1024 * 1024` (DIRECT_REPOSITORY_EVIDENCE)
24. Whether repository-size limits exist: No (DIRECT_REPOSITORY_EVIDENCE)
25. Whether network timeouts are configured: No (DIRECT_REPOSITORY_EVIDENCE)
26. Whether retry behavior exists: No explicit retries in GitHub API calls (DIRECT_REPOSITORY_EVIDENCE)

## 7. Celery Repository Indexing Task Trace

* Task Decorator/Name: `@celery_app.task(name="tasks.process_github_repo", autoretry_for=(Exception,), max_retries=3, default_retry_delay=300, retry_backoff=True)`
* Callable Name: `process_github_repo_task`
* Queue/Routing if visible: Default Celery queue
* Task Arguments: `repo_name: str, installation_id: str = None`
* Sync/Async Boundary: `run_async(_process())`
* Database Session Creation: `async with AsyncSessionLocal() as session:` (inside batch loop)
* GitHub Acquisition Call: `files = fetch_repository_files(repo_name)`
* File Iteration: `for file in files:`
* Chunking Call: `chunks = chunk_text(file["content"], chunk_size=1500, overlap=200)`
* Embedding Call: `await generate_embeddings_openai(texts)` or `await generate_embeddings_hf(texts)`
* Vector Insert Call: `await insert_repo_embeddings(session, repo_name, batch)`
* Commit Behavior: Called per batch of 100 inside `insert_repo_embeddings`
* Rollback Behavior: Called per batch on exception inside `insert_repo_embeddings`
* Exception Handling: `except Exception as e: logger.error(...)` per batch, does not abort task (BATCH_LEVEL_FAILURE_CONTINUATION: CONFIGURED, BATCH_LEVEL_CAUGHT_EXCEPTION_RETRY: NOT_PRESENT_IN_INSPECTED_CODE, BATCH_LEVEL_PROVIDER_FALLBACK: NOT_PRESENT_IN_INSPECTED_CODE, BATCH_LEVEL_FAILURE_PROPAGATION: NOT_PRESENT_IN_INSPECTED_CODE)
* Retry Behavior: Configured in task decorator `autoretry_for=(Exception,)` (TASK_LEVEL_UNHANDLED_EXCEPTION_AUTORETRY: CONFIGURED)
* Timeout Behavior: 30.0s for HF API, none for task overall
* Task Result: None (Implicit None returned)
* Progress/State Persistence: None
* Duplicate Execution Behavior: Blind insert of duplicate chunks
* Partial Failure Behavior: Fails batch, continues next batch

1. Can the same repository be indexed concurrently? Yes (TRACED_RUNTIME_FLOW)
2. Is there a database lock? No (DIRECT_REPOSITORY_EVIDENCE)
3. Is there a distributed lock? No (DIRECT_REPOSITORY_EVIDENCE)
4. Is there a Redis lock? No (DIRECT_REPOSITORY_EVIDENCE)
5. Is there an idempotency key? No (DIRECT_REPOSITORY_EVIDENCE)
6. Is there an index-run identity? No (DIRECT_REPOSITORY_EVIDENCE)
7. Is there a desired-state identity? No (DIRECT_REPOSITORY_EVIDENCE)
8. Is there a generation/incarnation identity? No (DIRECT_REPOSITORY_EVIDENCE)
9. Is an old index deleted before new insertion? No (DIRECT_REPOSITORY_EVIDENCE)
10. Can readers observe partially inserted vectors? Yes (TRACED_RUNTIME_FLOW)
11. Does one transaction cover the entire indexing task? No, chunked into batches (DIRECT_REPOSITORY_EVIDENCE)
12. Does failure preserve prior searchable vectors? Yes, old rows are never deleted (TRACED_RUNTIME_FLOW)
13. Does failure leave partial new vectors? Yes (TRACED_RUNTIME_FLOW)
14. Is stale-run publication possible as represented by current code? Yes (TRACED_RUNTIME_FLOW)
15. Is task progress persisted? No (DIRECT_REPOSITORY_EVIDENCE)

## 8. Repository File Discovery and Filtering

* Acquisition Result Format: `list[dict[str, str]]` (`path`, `content`)
* File Iteration Method: Tree blob iteration (`for element in tree: if element.type == "blob":`)
* Recursive Behavior: Yes (`recursive=True`)
* Directory Filtering: None
* Hidden File Behavior: Processed if extension matches
* Ignored Directory List: None
* Extension Allowlist: `.py`, `.ts`, `.tsx`, `.js`, `.jsx`, `.md`, `.txt`, `.json`, `.yml`, `.yaml`, `.html`, `.css`, `.go`, `.rs`, `.c`, `.cpp`, `.h`, `.hpp`, `.java`, `.rb`, `.php`
* Extension Denylist: None
* Binary Detection: NOT_PRESENT_IN_INSPECTED_CODE
* Generated-file Detection: None
* Vendor/dependency Directory Filtering: None
* Test-file Treatment: Processed if extension matches
* Documentation-file Treatment: Processed if extension matches
* Lockfile Treatment: Filtered by missing extension
* Maximum File Count: None
* Maximum Individual File Size: `> 1024 * 1024` bytes (1MB)
* Maximum Repository Bytes: None
* Decoding Strategy: base64 decode to utf-8, or raw utf-8 blob
* Decoding Error Behavior: `errors="ignore"` for base64, ignored via except block
* Empty File Behavior: Added to files list, but chunks empty

| Filter Concern | Current Runtime Behaviour | Active Location | Evidence Classification |
| --- | --- | --- | --- |
| Extension Allowlist | Uses `SUPPORTED_EXTENSIONS` set | `app/services/github.py` | DIRECT_REPOSITORY_EVIDENCE |
| Max File Size | Skips blobs > 1048576 bytes | `app/services/github.py` | DIRECT_REPOSITORY_EVIDENCE |
| Directory Filtering | NOT_PRESENT_IN_INSPECTED_CODE | `app/services/github.py` | NOT_PRESENT_IN_INSPECTED_CODE |
| Binary File Rejection | NOT_PRESENT_IN_INSPECTED_CODE | `app/services/github.py` | NOT_PRESENT_IN_INSPECTED_CODE |

## 9. Chunk Creation Runtime Evidence

* Active Chunking Callable: `chunk_text`
* Input Type: `str`
* Output Type: `list[str]`
* Chunk Unit: Characters
* Chunk Size: `1500` (default parameter used)
* Overlap: `200` (default parameter used)
* Step Size: `chunk_size - overlap`
* Boundary Logic: Sliding window string slicing
* Line Awareness: No
* Token Awareness: No
* Syntax Awareness: No
* Language Awareness: No
* File Identity Preservation: Yes (In task loop, `path` is attached to chunks)
* Path Identity Preservation: Yes
* Line-range Preservation: No
* Symbol Identity Preservation: No
* Metadata Attached to Each Chunk: `file_path`, `chunk_index`
* Empty Chunk Behavior: Returns empty list
* Final Short Chunk Behavior: Slices to end of string and appends
* Deterministic Behavior: Yes

Formula in code:
`start += chunk_size - overlap`

Example of algorithm behavior:
For a 2000-character string, chunk size 1500, overlap 200:
1. Chunk 1 is created from characters 0 to 1500.
2. Step size is 1500 - 200 = 1300.
3. Start advances to 1300.
4. Chunk 2 is created from characters 1300 to 2000 (length 700).
5. Start advances to 2600. Loop ends. Two chunks created.

## 10. Embedding Generation Runtime Evidence

* Embedding Service Path: `app/services/embedding.py`
* Active Callable: `generate_embeddings_openai` or `generate_embeddings_hf`
* Provider/API Used: OpenAI API (`text-embedding-3-small`) or HuggingFace Inference API (`all-MiniLM-L6-v2`)
* Model Name Source: Hard-coded string literals
* Model Name Value: `"text-embedding-3-small"` or `"all-MiniLM-L6-v2"`
* Input Accepted: `list[str]`
* Batching Behavior: Batched in `tasks.py` (`BATCH_SIZE = 100`)
* Per-chunk Call Behavior: Sent in array to API
* Async/Sync Behavior: Async
* Network Client: `AsyncOpenAI` or `httpx.AsyncClient`
* Timeout: 30.0s for HF API, PyOpenAI default for OpenAI
* Retry: No explicit retries in embedding.py
* Rate-limit Handling: None explicit
* Response Field Used: `.data[].embedding` (OpenAI) or direct JSON list (HF)
* Vector Dimension Expected: OPENAI_GENERATED_VECTOR_DIMENSION: 1536, HF_GENERATED_VECTOR_DIMENSION: 384
* Dimension Validation: APPLICATION_DIMENSION_VALIDATION: NOT_PRESENT_IN_INSPECTED_CODE, APPLICATION_DIMENSION_TRANSFORMATION: NOT_PRESENT_IN_INSPECTED_CODE
* Empty Input Behavior: Returns empty list
* Exception Behavior: Returns empty list (OpenAI) or array of zero vectors (HF)
* API Key Source: `os.environ.get("OPENAI_API_KEY")` or `os.environ.get("HF_TOKEN")`
* User-specific Key: No
* Workspace-specific Key: No
* Global Key Used: Yes

`CHUNK`
`-> generate_embeddings_openai/generate_embeddings_hf`
`-> AsyncOpenAI client / httpx.AsyncClient HF_API_URL`
`-> response.data.embedding / response.json()`
`-> list[float]`

## 11. RepoEmbedding Persistence Model

| Field | SQLAlchemy Type | Nullable | Default | Index/Constraint | Runtime Meaning | Evidence Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | `UUID(as_uuid=True)` | False | `uuid.uuid4` | Primary Key | Row identifier | DIRECT_REPOSITORY_EVIDENCE |
| `repository_name` | `Text` | False | None | Index=True | Scope Key | DIRECT_REPOSITORY_EVIDENCE |
| `file_path` | `Text` | False | None | None | Original file | DIRECT_REPOSITORY_EVIDENCE |
| `chunk_index` | `Integer` | False | None | None | Ordinal | DIRECT_REPOSITORY_EVIDENCE |
| `content` | `Text` | False | None | None | Chunk text | DIRECT_REPOSITORY_EVIDENCE |
| `embedding` | `Vector(1536)` | True (implicit) | None | None | Vector values | DIRECT_REPOSITORY_EVIDENCE |
| `provider` | `Text` | False | "hf" | None | Embedding Provider Identity | DIRECT_REPOSITORY_EVIDENCE |
| `created_at` | `DateTime(timezone=True)`| True (implicit) | `now` | None | Timestamp | DIRECT_REPOSITORY_EVIDENCE |

* Primary Key: FIELD_OBSERVED
* Repository Name: FIELD_OBSERVED
* Repository Provider: FIELD_NOT_OBSERVED
* Provider Repository ID: FIELD_NOT_OBSERVED
* Owner/login: FIELD_NOT_OBSERVED
* Workspace ID: FIELD_NOT_OBSERVED
* User Identity: FIELD_NOT_OBSERVED
* Source Branch: FIELD_NOT_OBSERVED
* Source Revision/SHA: FIELD_NOT_OBSERVED
* Source File Path: FIELD_OBSERVED
* File Identity: FIELD_NOT_OBSERVED
* Line Start: FIELD_NOT_OBSERVED
* Line End: FIELD_NOT_OBSERVED
* Symbol Identity: FIELD_NOT_OBSERVED
* Chunk Ordinal: FIELD_OBSERVED (`chunk_index`)
* Chunk Text: FIELD_OBSERVED (`content`)
* Embedding Vector: FIELD_OBSERVED
* Embedding Provider Identity: FIELD_OBSERVED (`provider`)
* Exact Embedding Model Identity: FIELD_NOT_OBSERVED
* Persistence Column Vector Dimension: 1536
* Embedding Configuration Identity: FIELD_NOT_OBSERVED
* Index Identity: FIELD_NOT_OBSERVED
* Index Run Identity: FIELD_NOT_OBSERVED
* Lifecycle State: FIELD_NOT_OBSERVED
* Creation Timestamp: FIELD_OBSERVED
* Update Timestamp: FIELD_NOT_OBSERVED

## 12. Vector Persistence Runtime Trace

* Persistence Callable: `insert_repo_embeddings`
* Model Constructor: `RepoEmbedding`
* Fields Populated: `id`, `repository_name`, `file_path`, `chunk_index`, `content`, `embedding`, `provider`
* One-row-per-chunk Behavior: Yes
* Batch Insert Behavior: `db.add_all(records)`
* Session Creation: `AsyncSessionLocal()` per batch in `tasks.py`
* Transaction Boundary: Scoped to batch
* Commit Frequency: Once per 100 chunks
* Flush Behavior: None explicit before commit
* Rollback Behavior: `await db.rollback()` on exception
* Duplicate Handling: None (blind insert)
* Unique Constraints: None
* Upsert Behavior: No
* Deletion Behavior: No
* Replacement Behavior: No
* Old-vector Coexistence: Yes
* Partial Insert Behavior: Yes

Trace:
`chunk_text output -> mapped to dictionaries in tasks.py -> generate_embeddings_... -> insert_repo_embeddings -> db.add_all(records) -> await db.commit()`

1. Is `repository_name` the vector scope key? Yes (DIRECT_REPOSITORY_EVIDENCE)
2. Is `workspace_id` written? No (DIRECT_REPOSITORY_EVIDENCE)
3. Is `user_email` written? No (DIRECT_REPOSITORY_EVIDENCE)
4. Is source revision written? No (DIRECT_REPOSITORY_EVIDENCE)
5. Is file path written? Yes (DIRECT_REPOSITORY_EVIDENCE)
6. Is chunk ordinal written? Yes (DIRECT_REPOSITORY_EVIDENCE)
7. Is exact embedding model identity written? No (FIELD_NOT_OBSERVED)
8. Is index identity written? No (DIRECT_REPOSITORY_EVIDENCE)
9. Is old data deleted before insertion? No (DIRECT_REPOSITORY_EVIDENCE)
10. Is commit performed once or repeatedly? Repeatedly per batch (DIRECT_REPOSITORY_EVIDENCE)
11. Can duplicate chunks be persisted? Yes (TRACED_RUNTIME_FLOW)
12. Can repeated indexing create additional rows for the same repository name? Yes (TRACED_RUNTIME_FLOW)

## 13. Repository Search Runtime Trace

`HTTP REQUEST`
`-> POST /repo/search`
`-> Depends(get_user_email)`
`-> SearchRepoPayload(repo_name, query, top_k)`
`-> generate_embeddings_openai / hf`
`-> search_repo_embeddings`
`-> select(RepoEmbedding.file_path, RepoEmbedding.content, RepoEmbedding.embedding.cosine_distance(query_embedding).label("similarity"))`
`-> .where(RepoEmbedding.repository_name == repo_name).where(RepoEmbedding.provider == provider)`
`-> .order_by("similarity")`
`-> .limit(top_k)`
`-> [file_path, content, similarity]`

* Endpoint: `/repo/search`
* HTTP Method: POST
* Handler Callable: `search_repo`
* Auth Dependency: `Depends(get_user_email)`
* Request Inputs: `SearchRepoPayload`
* Repository Identifier Input: `payload.repo_name`
* Workspace Input: None
* User Identity Availability: Yes (via `Depends`)
* Query Text Input: `payload.query`
* Query Embedding: `generate_embeddings_openai` or `generate_embeddings_hf`
* Vector Query Callable: `search_repo_embeddings`
* Vector Filter: `repository_name == repo_name`, `provider == provider`
* Similarity/Distance Expression: `cosine_distance`
* Sort Direction: Ascending (default `.order_by`)
* Result Limit: `payload.top_k` (default 5)
* Returned Fields: `file_path`, `content`, `similarity`
* Score/Distance Returned or Omitted: Returned (`similarity`)
* Empty-result Behavior: Returns empty list
* Provider Identity Filtering: Yes (`provider`)
* Source Revision Filtering: No
* Index Identity Filtering: No

1. Can User A search vectors indexed by User B if the same repository name is known? Yes (TRACED_RUNTIME_FLOW)
2. Is workspace membership checked? No (DIRECT_REPOSITORY_EVIDENCE)
3. Is repository ownership checked? No (DIRECT_REPOSITORY_EVIDENCE)
4. Is the search restricted by authenticated user? No (TRACED_RUNTIME_FLOW)
5. Is the search restricted by workspace? No (DIRECT_REPOSITORY_EVIDENCE)
6. Is the search restricted by provider? Yes (DIRECT_REPOSITORY_EVIDENCE)
7. Is the search restricted by source revision? No (DIRECT_REPOSITORY_EVIDENCE)
8. Is the search restricted by index identity? No (DIRECT_REPOSITORY_EVIDENCE)

## 14. Vector Similarity and Ranking Evidence

* Vector Column: `embedding`
* Distance/Similarity Callable: `.cosine_distance()`
* SQL Expression: Uses `<=>` (pgvector cosine distance operator implicitly mapped by SQLAlchemy)
* Order Direction: Ascending (`.order_by("similarity")`)
* Limit Source: `payload.top_k`
* Default Limit: 5
* Maximum Limit: None
* Threshold Behavior: None
* Score Transformation: None (Raw distance returned mapped to "similarity" alias)
* Reranking: None
* Lexical Scoring: None
* Structural Scoring: None
* Hybrid Scoring: None
* Deduplication: None
* Diversity/MMR: None
* Metadata Weighting: None
* Language Weighting: None
* File Weighting: None

The query uses a DISTANCE operator (`cosine_distance`) and orders ascending. It is explicitly a distance, not a similarity score, despite being labeled "similarity" in the return payload.

CURRENT_RANKING_PIPELINE: `[pgvector cosine_distance, ascending limit top_k]`

## 15. Repository Scope and Tenant Boundary Evidence

| Runtime Stage | user_email present? | workspace_id present? | repository_name present? | provider identity present? | revision identity present? | index identity present? | Evidence Classification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1. HTTP index request | Yes | No | Yes | No | No | No | DIRECT_REPOSITORY_EVIDENCE |
| 2. task dispatch | No | No | Yes | No | No | No | DIRECT_REPOSITORY_EVIDENCE |
| 3. Celery task | No | No | Yes | No | No | No | DIRECT_REPOSITORY_EVIDENCE |
| 4. GitHub acquisition | No | No | Yes | No | No | No | DIRECT_REPOSITORY_EVIDENCE |
| 5. chunk | No | No | Yes | No | No | No | DIRECT_REPOSITORY_EVIDENCE |
| 6. embedding call | No | No | No | No | No | No | DIRECT_REPOSITORY_EVIDENCE |
| 7. vector row | No | No | Yes | Yes | No | No | DIRECT_REPOSITORY_EVIDENCE |
| 8. HTTP search request | Yes | No | Yes | No | No | No | DIRECT_REPOSITORY_EVIDENCE |
| 9. vector search query | No | No | Yes | Yes | No | No | DIRECT_REPOSITORY_EVIDENCE |
| 10. search result | No | No | No | No | No | No | DIRECT_REPOSITORY_EVIDENCE |

* CURRENT_INDEX_USER_SCOPE: None (TRACED_RUNTIME_FLOW)
* CURRENT_INDEX_WORKSPACE_SCOPE: None (TRACED_RUNTIME_FLOW)
* CURRENT_VECTOR_USER_SCOPE: None (TRACED_RUNTIME_FLOW)
* CURRENT_VECTOR_WORKSPACE_SCOPE: None (TRACED_RUNTIME_FLOW)
* CURRENT_SEARCH_USER_SCOPE: None (TRACED_RUNTIME_FLOW)
* CURRENT_SEARCH_WORKSPACE_SCOPE: None (TRACED_RUNTIME_FLOW)
* CURRENT_REPOSITORY_SCOPE_KEY: `repository_name` string (DIRECT_REPOSITORY_EVIDENCE)
* CURRENT_PROVIDER_SCOPE: `provider` column (DIRECT_REPOSITORY_EVIDENCE)
* CURRENT_REVISION_SCOPE: None (TRACED_RUNTIME_FLOW)
* CURRENT_INDEX_IDENTITY_SCOPE: None (TRACED_RUNTIME_FLOW)

## 16. Revision, Index Identity, and Lifecycle Evidence

| Lifecycle Concern | Current Runtime Representation | Active Location | Evidence Classification |
| --- | --- | --- | --- |
| branch | `repo.default_branch` at fetch time | `app/services/github.py` | DIRECT_REPOSITORY_EVIDENCE |
| commit / SHA / revision | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| source state | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| index state / indexing state | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| desired state | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| materialization | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| index run | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| generation / incarnation | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| publish | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| active index / current index | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| stale index / failed index | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| completed index | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |

1. Is a provider revision identity persisted? No (DIRECT_REPOSITORY_EVIDENCE)
2. Is a branch persisted? No (DIRECT_REPOSITORY_EVIDENCE)
3. Is an index configuration identity persisted? No (DIRECT_REPOSITORY_EVIDENCE)
4. Is an index run persisted? No (DIRECT_REPOSITORY_EVIDENCE)
5. Is task start persisted? No (DIRECT_REPOSITORY_EVIDENCE)
6. Is task completion persisted? No (DIRECT_REPOSITORY_EVIDENCE)
7. Is task failure persisted? No (DIRECT_REPOSITORY_EVIDENCE)
8. Is progress persisted? No (DIRECT_REPOSITORY_EVIDENCE)
9. Is one searchable index marked active? No (DIRECT_REPOSITORY_EVIDENCE)
10. Is publication conditional? No (DIRECT_REPOSITORY_EVIDENCE)
11. Can a stale task distinguish itself from a newer request? No (TRACED_RUNTIME_FLOW)
12. Can repository source change between indexing requests without a persisted source-state identity? Yes (TRACED_RUNTIME_FLOW)
13. Can search distinguish old and new indexing rows? No (TRACED_RUNTIME_FLOW)
14. Is there an explicit re-index lifecycle? No (DIRECT_REPOSITORY_EVIDENCE)

## 17. Structural Extraction and Relationship Evidence

| Structural Capability | Current Runtime Implementation | Active Location | Evidence Classification |
| --- | --- | --- | --- |
| file identity | Preserved as file path | `app/queue/tasks.py` | DIRECT_REPOSITORY_EVIDENCE |
| file path | Preserved in output | `app/queue/tasks.py` | DIRECT_REPOSITORY_EVIDENCE |
| language detection | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| function extraction | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| class extraction | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| symbol extraction | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| import extraction | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| declared import relationship | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| resolved import target | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| call relationship | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| symbol reference | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| definition resolution | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| module relationship | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |
| dependency relationship | NOT_PRESENT_IN_INSPECTED_CODE | N/A | NOT_PRESENT_IN_INSPECTED_CODE |

CURRENT_STRUCTURAL_EXTRACTION_LEVEL: PURE_TEXT_SLIDING_WINDOW

## 18. Translation Mode Retrieval Consumption

| Translation Mode | Handler | Repository Identifier Accepted | Vector Search Invoked | Retrieved Context Passed to AI | Client Context Accepted | Evidence Classification |
| --- | --- | --- | --- | --- | --- | --- |
| Code to English | `app/routers/translate/code_to_english.py` | Yes | No | No | No | DIRECT_REPOSITORY_EVIDENCE |
| English to Code | `app/routers/translate/english_to_code.py` | Yes | No | No | Yes (`full_context`) | DIRECT_REPOSITORY_EVIDENCE |
| Code to Code | `app/routers/translate/code_to_code.py` | Yes | No | No | No | DIRECT_REPOSITORY_EVIDENCE |
| Sync English to Code | `app/routers/translate/english_to_code.py` | Yes | No | No | Yes (`blocks`) | DIRECT_REPOSITORY_EVIDENCE |

* CURRENT_CODE_TO_ENGLISH_SERVER_RETRIEVAL: NOT_PRESENT_IN_INSPECTED_CODE
* CURRENT_ENGLISH_TO_CODE_SERVER_RETRIEVAL: NOT_PRESENT_IN_INSPECTED_CODE
* CURRENT_CODE_TO_CODE_SERVER_RETRIEVAL: NOT_PRESENT_IN_INSPECTED_CODE
* CURRENT_ENGLISH_TO_CODE_CLIENT_CONTEXT: CLIENT_SUPPLIED_CONTEXT_WITH_UNVERIFIED_REPOSITORY_PROVENANCE
* CURRENT_SYNC_ENGLISH_TO_CODE_CLIENT_CONTEXT: CLIENT_SUPPLIED_CONTEXT_WITH_UNVERIFIED_REPOSITORY_PROVENANCE
* CURRENT_SYNC_ENGLISH_TO_CODE_CLIENT_INSTRUCTION: CLIENT_SUPPLIED_INSTRUCTION

1. Is the repository search endpoint called internally by translation routes? No (TRACED_RUNTIME_FLOW)
2. Is vector search invoked by any translation handler? No (TRACED_RUNTIME_FLOW)
3. Is retrieved repository context passed into any AI prompt? No (TRACED_RUNTIME_FLOW)
4. Is repository identity persisted with translation history? Yes (DIRECT_REPOSITORY_EVIDENCE)
5. Is source revision persisted with translation history? No (DIRECT_REPOSITORY_EVIDENCE)
6. Is index identity persisted with translation history? No (DIRECT_REPOSITORY_EVIDENCE)

## 19. Repository Runtime Evidence Gaps

| ID | Question | Files Inspected | Why Not Determinable from Inspected Code |
| --- | --- | --- | --- |
| REPOSITORY-EVIDENCE-GAP-01 | Actual deployed GitHub API rate limit status | `app/services/github.py` | Depends on external GitHub environment and PAT rate-limit tier. |
| REPOSITORY-EVIDENCE-GAP-02 | Current production database row count for `repo_embeddings` | `app/models/db_models.py` | Requires querying live production PostgreSQL. |
| REPOSITORY-EVIDENCE-GAP-03 | Actual value of `GITHUB_PAT` and its scope | `app/services/github.py` | Belongs in environment variables out of source control. |
| REPOSITORY-EVIDENCE-GAP-04 | Are Celery workers currently running? | `app/queue/tasks.py` | Requires checking infrastructure execution status. |
| REPOSITORY-EVIDENCE-GAP-05 | Does pgvector(1536) reject or pad HF 384-dimensional vectors at insert time? | `app/repositories/vectors.py` | ACTUAL_HF_384_TO_VECTOR_1536_PERSISTENCE_RESULT: NOT_DETERMINABLE_FROM_INSPECTED_CODE |

CROSS_SECTION_CONTRADICTION_COUNT: 0

## 20. Loop 6A-2 Verification Summary

1. REPOSITORY_ROOT: C:/Users/tarun/Anuvaad/Anuvaad
2. BRANCH: master
3. HEAD_COMMIT: c4e2cebf68449b957d720a0067f5af67caae1009
4. INITIAL_GIT_STATUS_SHORT_EXACT: "?? docs/"
5. INITIAL_GIT_STATUS_PATH_COUNT: 1
6. TARGET_ARTIFACT_PREEXISTED: False
7. TARGET_ARTIFACT_CREATED: docs/engineering/EVIDENCE_REPOSITORY_INDEXING_RETRIEVAL.md
8. FILES_MODIFIED_COUNT: 0
9. AUTHORIZED_ARTIFACT_ONLY_CHANGE_CONFIRMATION: True
10. REPOSITORY_RUNTIME_ROUTE_COUNT: 3
11. REPOSITORY_ENDPOINT_TABLE_ROW_COUNT: 3
12. INDEX_ENTRY_ENDPOINT: /repo/index
13. INDEX_HANDLER_CALLABLE: index_repo
14. INDEX_CELERY_TASK: process_github_repo_task
15. INDEX_TASK_ARGUMENTS: repo_name: str, installation_id: str = None
16. GITHUB_ACQUISITION_CALLABLE: fetch_repository_files
17. GITHUB_ACQUISITION_METHOD: PyGithub get_git_tree(recursive=True) blob fetching
18. GITHUB_CREDENTIAL_SOURCE: os.environ.get("GITHUB_PAT")
19. GITHUB_CREDENTIAL_SCOPE: Global
20. FILE_DISCOVERY_METHOD: Recursive tree blob iteration with extension match
21. CHUNKING_CALLABLE: chunk_text
22. CHUNK_SIZE: 1500
23. CHUNK_OVERLAP: 200
24. CHUNK_STEP: 1300
25. EMBEDDING_CALLABLE: generate_embeddings_openai, generate_embeddings_hf
26. EMBEDDING_PROVIDER: OpenAI, HuggingFace
27. EMBEDDING_MODEL: RUNTIME_EXACT_MODELS="text-embedding-3-small", "all-MiniLM-L6-v2"; PERSISTED_EXACT_MODEL_IDENTITY=FIELD_NOT_OBSERVED
28. EMBEDDING_VECTOR_DIMENSION: OPENAI_GENERATED=1536; HF_GENERATED=384; PERSISTENCE_COLUMN=1536; HF_TO_PERSISTENCE_DIMENSION_MATCH=False
29. REPO_EMBEDDING_TABLE: repo_embeddings
30. REPO_EMBEDDING_SCOPE_KEY: repository_name
31. VECTOR_WRITE_CALLABLE: insert_repo_embeddings
32. VECTOR_COMMIT_PATTERN: Batch commit per 100 chunks
33. SEARCH_ENDPOINT: /repo/search
34. SEARCH_HANDLER_CALLABLE: search_repo
35. VECTOR_SEARCH_CALLABLE: search_repo_embeddings
36. VECTOR_DISTANCE_EXPRESSION: cosine_distance
37. VECTOR_ORDER_DIRECTION: Ascending
38. SEARCH_RESULT_LIMIT: payload.top_k
39. CURRENT_INDEX_WORKSPACE_SCOPE: None
40. CURRENT_VECTOR_WORKSPACE_SCOPE: None
41. CURRENT_SEARCH_WORKSPACE_SCOPE: None
42. CURRENT_REVISION_SCOPE: None
43. CURRENT_INDEX_IDENTITY_SCOPE: None
44. CURRENT_STRUCTURAL_EXTRACTION_LEVEL: PURE_TEXT_SLIDING_WINDOW
45. TRANSLATION_SERVER_RETRIEVAL_MODE_COUNT: 0
46. REPOSITORY_RUNTIME_EVIDENCE_GAP_COUNT: 5
47. H2_MAJOR_SECTION_COUNT: 20
48. UNEXPECTED_ASCII_CONTROL_CHARACTER_COUNT: 0
49. FINAL_GIT_STATUS_SHORT_EXACT: "?? docs/"
50. FINAL_STATUS: LOOP_6A_2_REPOSITORY_INDEXING_RETRIEVAL_EVIDENCE_COMPLETE_AWAITING_EXTERNAL_REVIEW
