# ANUVAAD BACKEND RUNTIME EVIDENCE

## 1. Document Control

`DOCUMENT`: EVIDENCE_BACKEND_RUNTIME.md
`PROTOCOL_PASS`: LOOP_6A_1C
`REPOSITORY_ROOT`: C:/Users/tarun/Anuvaad/Anuvaad
`BRANCH`: master
`HEAD_COMMIT`: c4e2cebf68449b957d720a0067f5af67caae1009
`CURRENT_LOOP_6A_1C_INITIAL_STATUS`: 3 untracked paths (docs/, dump_prompt.py, prompt.txt)
`LOOP_6A_1B_TRUE_INITIAL_WORKING_TREE_STATE`: NOT_DETERMINABLE_FROM_INSPECTED_CODE
`DUMP_PROMPT_PY_PROVENANCE`: CREATED_DURING_LOOP_6A_1B_TOOLING
`PROMPT_TXT_PROVENANCE`: CREATED_DURING_LOOP_6A_1B_TOOLING
`DUMP_PROMPT_PY_DELETION_RESULT`: DELETED_DURING_LOOP_6A_1C
`PROMPT_TXT_DELETION_RESULT`: DELETED_DURING_LOOP_6A_1C
`EVIDENCE_AUTHORITY`: Current production code under `app/`
`AUTHORIZED_SCOPE`: Backend Runtime Evidence Integrity Correction

## 2. Git and Repository State

* **Repository Root:** C:/Users/tarun/Anuvaad/Anuvaad
* **Current Branch:** master
* **HEAD Commit:** c4e2cebf68449b957d720a0067f5af67caae1009
* **Current Loop 6A-1C Initial Git Status:**
```text
?? docs/
?? dump_prompt.py
?? prompt.txt
```
* **Historical Loop 6A-1B Provenance:**
  * True initial working tree state: `NOT_DETERMINABLE_FROM_INSPECTED_CODE`
  * `dump_prompt.py`: `CREATED_DURING_LOOP_6A_1B_TOOLING`
  * `prompt.txt`: `CREATED_DURING_LOOP_6A_1B_TOOLING`
  * `docs/`: Provenance not determinable from inspected code.
* **Deletion Status:** `dump_prompt.py` and `prompt.txt` safely deleted in Loop 6A-1C after evidence verification.

## 3. FastAPI Application Evidence

| Runtime Concern | Current Behaviour | Evidence Classification | Active Location |
|---|---|---|---|
| Application Entry Point | Creates `app = FastAPI(...)` and attaches middleware/routes. | `DIRECT_REPOSITORY_EVIDENCE` | `app/main.py` |
| Router Registration | Uses `app.include_router` loop iterating over an `API_ROUTERS` list. | `DIRECT_REPOSITORY_EVIDENCE` | `app/main.py` |
| Application Run | Exported for ASGI server, no `if __name__ == "__main__":` run block found. | `DIRECT_REPOSITORY_EVIDENCE` | `app/main.py` |

## 4. Registered Router Table

| Router Object | Router Source | Router Prefix | Registration Prefix | Effective Prefix | Responsibility |
|---|---|---|---|---|---|
| `router` | `app.routers.auth` | `/auth` | `/api` | `/api/auth` | Authentication |
| `router` | `app.routers.workspace` | `/workspace` | `/api` | `/api/workspace` | Workspace Management |
| `router` | `app.routers.history` | `/history` | `/api` | `/api/history` | Translation History |
| `router` | `app.routers.repo_search` | `/repo` | `/api` | `/api/repo` | GitHub Repo Index/Search |
| `router` | `app.routers.translate.code_to_english` | `""` | `/api` | `/api` | Code-to-English Translate |
| `router` | `app.routers.translate.english_to_code` | `""` | `/api` | `/api` | English-to-Code Translate |
| `router` | `app.routers.translate.code_to_code` | `""` | `/api` | `/api` | Code-to-Code Translate |
| `router` | `app.routers.translate.upload` | `""` | `/api` | `/api` | File Upload Translate |
| `router` | `app.routers.github` | `""` | `/api` | `/api` | GitHub OAuth |
| `router` | `app.routers.billing` | `""` | `/api` | `/api` | Billing & Checkout |
| `router` | `app.routers.onboarding` | `/onboarding` | `/api` | `/api/onboarding` | Onboarding Flow |
| `router` | `app.routers.demo` | `""` | `/api` | `/api` | Anonymous Demo |
| `router` | `app.routers.utility` | `""` | `/api` | `/api` | Utilities & Import Gist |

**Resolved Effective Paths for Scoped Translation Endpoints:**
* Code-to-English streaming: `/api/code-to-english` (from `app/routers/translate/code_to_english.py`)
* Code-to-English sync: `/api/code-to-english/sync` (from `app/routers/translate/code_to_english.py`)
* English-to-Code generate: `/api/generate-from-english` (from `app/routers/translate/english_to_code.py`)
* English-to-Code update: `/api/english-to-code` (from `app/routers/translate/english_to_code.py`)
* English-to-Code sync: `/api/sync-english-to-code` (from `app/routers/translate/english_to_code.py`)
* Code-to-Code: `/api/code-to-code` (from `app/routers/translate/code_to_code.py`)

## 5. Unregistered Router Modules Observed

| Router Source | Router Object | Observed Prefix | Registration Evidence |
|---|---|---|---|
| None | None | None | `NOT_PRESENT_IN_INSPECTED_CODE` |

`NOT_PRESENT_IN_INSPECTED_CODE`: No unregistered router modules were observed.

## 6. Database Session Authority

`ACTIVE_DATABASE_SETUP_PATH`: `app/core/database_session.py` (`DIRECT_REPOSITORY_EVIDENCE`)
`DATABASE_CONFIGURATION_SOURCE`: `os.environ.get("DATABASE_URL")` modified to `postgresql+asyncpg://` (`DIRECT_REPOSITORY_EVIDENCE`)
`ENGINE_TYPE`: Async SQLAlchemy engine via `create_async_engine` (`DIRECT_REPOSITORY_EVIDENCE`)
`SESSION_FACTORY`: `async_sessionmaker(engine, expire_on_commit=False)` (`DIRECT_REPOSITORY_EVIDENCE`)
`REQUEST_DATABASE_DEPENDENCY`: `get_db_session()` FastAPI generator dependency (`DIRECT_REPOSITORY_EVIDENCE`)
`SESSION_LIFECYCLE`: Yields `AsyncSessionLocal`, auto-closes in `finally` block (`DIRECT_REPOSITORY_EVIDENCE`)
`OBSERVED_COMMIT_PATTERN`: Explicit `await session.commit()` in repository logic (`DIRECT_REPOSITORY_EVIDENCE`)
`OBSERVED_ROLLBACK_PATTERN`: Explicit `await session.rollback()` on exceptions before raising (`DIRECT_REPOSITORY_EVIDENCE`)
`CONCLUSION`: `app/core/database_session.py` is the single source of truth for the async database connection and session lifecycle. (`DIRECT_REPOSITORY_EVIDENCE`)

## 7. Authoritative Model Path Resolution

`ACTIVE_SQLALCHEMY_BASE_PATH`: `app/models/db_models.py` (`DIRECT_REPOSITORY_EVIDENCE`)
`ACTIVE_MODEL_DEFINITION_PATH`: `app/models/db_models.py` (`DIRECT_REPOSITORY_EVIDENCE`)
`MODEL_IMPORT_CONSUMERS_INSPECTED`: `app/repositories/workspace.py`, `app/repositories/translation.py`, `app/repositories/vectors.py`, `app/core/auth.py`. (`DIRECT_REPOSITORY_EVIDENCE`)
`OTHER_MODEL_PATHS_FOUND`: None (`NOT_PRESENT_IN_INSPECTED_CODE`)
`DUPLICATE_OR_STALE_MODEL_PATHS`: None (`NOT_PRESENT_IN_INSPECTED_CODE`)
`REPO_EMBEDDING_DEFINITION_PATH`: `app/models/db_models.py` (`DIRECT_REPOSITORY_EVIDENCE`)
`REPO_EMBEDDING_BASE_AUTHORITY`: Shared `Base` from `app/models/db_models.py` (`DIRECT_REPOSITORY_EVIDENCE`)
`REPO_EMBEDDING_IMPORT_CONSUMERS`: `app/repositories/vectors.py`, `app/routers/repo_search.py`, `app/queue/tasks.py` (`DIRECT_REPOSITORY_EVIDENCE`)
`MODEL_AUTHORITY_CONCLUSION`: `app/models/db_models.py` holds authoritative definitions for all active SQLAlchemy models. (`DIRECT_REPOSITORY_EVIDENCE`)

## 8. Active SQLAlchemy Model Inventory

| Model | Table | Identity Fields | User Ownership | Workspace Ownership | Important Relationships | Observed Runtime Use | Evidence Classification |
|---|---|---|---|---|---|---|---|
| `Workspace` | `workspaces` | `id` | `EXPLICIT_FIELD` (`owner_email`) | `NO_FIELD_OBSERVED` | None | Workspace management | `DIRECT_REPOSITORY_EVIDENCE` |
| `WorkspaceMember` | `workspace_members` | `id` | `EXPLICIT_FIELD` (`user_email`) | `EXPLICIT_FIELD` (`workspace_id`) | `workspace` | Authorization & roles | `DIRECT_REPOSITORY_EVIDENCE` |
| `TranslationHistory` | `translation_history` | `id` | `EXPLICIT_FIELD` (`user_email`) | `EXPLICIT_FIELD` (`workspace_id`) | `workspace` | Translation logging | `DIRECT_REPOSITORY_EVIDENCE` |
| `UserApiKey` | `user_api_keys` | `id` | `EXPLICIT_FIELD` (`user_email`) | `NO_FIELD_OBSERVED` | None | API authentication | `DIRECT_REPOSITORY_EVIDENCE` |
| `RepoEmbedding` | `repo_embeddings` | `id` | `NO_FIELD_OBSERVED` | `NO_FIELD_OBSERVED` | None | Vector retrieval | `DIRECT_REPOSITORY_EVIDENCE` |
| `PaymentTransaction` | `payment_transactions` | `id`, `event_id` | `NO_FIELD_OBSERVED` | `NO_FIELD_OBSERVED` | None | Webhook idempotency | `DIRECT_REPOSITORY_EVIDENCE` |
| `GithubToken` | `github_tokens` | `user_email` | `EXPLICIT_FIELD` (`user_email`) | `NO_FIELD_OBSERVED` | None | OAuth token storage | `DIRECT_REPOSITORY_EVIDENCE` |

## 9. Active API Schema Inventory

| Schema | Definition Path | Used By | Current Request/Response Contract | Evidence Classification |
|---|---|---|---|---|
| `TranslateRequest` | `app/models/schemas.py` | `code_to_english.py` | Source code to English sync | `DIRECT_REPOSITORY_EVIDENCE` |
| `TranslateStreamRequest` | `app/models/schemas.py` | `code_to_english.py` | Source code to English streaming | `DIRECT_REPOSITORY_EVIDENCE` |
| `EnglishToCodeRequest` | `app/models/schemas.py` | `english_to_code.py` | English requirement to code generation | `DIRECT_REPOSITORY_EVIDENCE` |
| `EnglishToCodeUpdateRequest` | `app/models/schemas.py` | `english_to_code.py` | Modifying existing code based on English | `DIRECT_REPOSITORY_EVIDENCE` |
| `CodeToCodeRequest` | `app/models/schemas.py` | `code_to_code.py` | Code translation between languages | `DIRECT_REPOSITORY_EVIDENCE` |

Field presence inventory:
* authenticated user ID: `FIELD_NOT_OBSERVED`
* workspace ID: `FIELD_OBSERVED`
* repository name: `FIELD_OBSERVED`
* repository provider: `FIELD_NOT_OBSERVED`
* repository source revision: `FIELD_NOT_OBSERVED`
* index identity: `FIELD_NOT_OBSERVED`
* indexing status: `FIELD_NOT_OBSERVED`
* repository context provenance: `FIELD_NOT_OBSERVED`

### English-to-Code `blocks` and `full_context` Resolution

**`blocks`**
* schema field type: `list[dict[str, Any]] | None`
* whether client-supplied: Yes (`DIRECT_REPOSITORY_EVIDENCE`)
* which endpoint consumes it: `/api/english-to-code` (`TRACED_RUNTIME_FLOW`)
* which callable receives it: `function_update_to_code` handler (`TRACED_RUNTIME_FLOW`)
* whether it represents editor/request context based on inspected code: Yes, structural code elements context. (`DIRECT_REPOSITORY_EVIDENCE`)

**`full_context`**
* schema field type: `str | None`
* whether client-supplied: Yes (`DIRECT_REPOSITORY_EVIDENCE`)
* which endpoint consumes it: `/api/english-to-code` (`TRACED_RUNTIME_FLOW`)
* which callable receives it: `function_update_to_code` handler (`TRACED_RUNTIME_FLOW`)
* whether derived from repository search: `NOT_DETERMINABLE_FROM_INSPECTED_CODE`
* whether derived from backend retrieval: No (`DIRECT_REPOSITORY_EVIDENCE`)
* whether the backend validates repository provenance: No (`DIRECT_REPOSITORY_EVIDENCE`)
* whether it represents editor/request context based on inspected code: Yes, whole file string context. (`DIRECT_REPOSITORY_EVIDENCE`)

## 10. Authentication Runtime Trace

`HTTP REQUEST`
`-> CHECK X-API-Key header`
`-> IF PRESENT: -> _authenticate_api_key -> SUCCESS RETURN str OR RAISE 401`
`-> IF ABSENT: -> CHECK Authorization header (Bearer)`
`-> IF PRESENT: -> _authenticate_jwt -> SUCCESS RETURN str OR RAISE 401`
`-> IF ABSENT: -> RAISE 401`

`API_KEY_AUTH_DECLARED_RETURN_TYPE`: `str`
`API_KEY_AUTH_SUCCESSFUL_RUNTIME_RETURN_TYPE`: `str` (the user's email)
`API_KEY_AUTH_FAILURE_BEHAVIOUR`: Raises `HTTPException` (401)

`JWT_AUTH_DECLARED_RETURN_TYPE`: `str`
`JWT_AUTH_SUCCESSFUL_RUNTIME_RETURN_TYPE`: `str` (the extracted email claim)
`JWT_AUTH_DECODE_FAILURE_BEHAVIOUR`: Raises `HTTPException` (401)

`GET_USER_EMAIL_FROM_REQUEST_DECLARED_RETURN_TYPE`: `str`
`GET_USER_EMAIL_FROM_REQUEST_SUCCESSFUL_RUNTIME_RETURN_TYPE`: `str` (the authenticated user's email)
`GET_USER_EMAIL_FROM_REQUEST_NO_CREDENTIAL_BEHAVIOUR`: Raises `HTTPException` (401)

`GET_USER_EMAIL_DECLARED_RETURN_TYPE`: `str`
`GET_USER_EMAIL_SUCCESSFUL_RUNTIME_RETURN_TYPE`: `str` (the authenticated user's email)
`GET_USER_EMAIL_NO_CREDENTIAL_BEHAVIOUR`: Raises `HTTPException` (401)

`CURRENT_AUTHENTICATED_IDENTITY_TYPE`: `str` (user email string for both API key and JWT)
`CURRENT_ANONYMOUS_BEHAVIOUR`: No anonymous execution allowed; both dependencies strictly raise 401 on missing credentials. (`TRACED_RUNTIME_FLOW`)

`CURRENT_AUTH_IDENTITY_SOURCE`: JWT claims or Database via API key (`TRACED_RUNTIME_FLOW`)
`CURRENT_AUTH_DEPENDENCY`: `get_user_email` and `get_user_email_from_request` (`DIRECT_REPOSITORY_EVIDENCE`)

**Authentication Precedence Conclusion:**
`DIRECT_REPOSITORY_EVIDENCE`: `get_user_email_from_request` checks `X-API-Key` first, then falls back to `Bearer` if absent. If `X-API-Key` is present and invalid, it raises 401 (does not fall back). `get_user_email` only checks `Bearer` credentials.

**Scoped Dependency Conclusion:**
`TRACED_RUNTIME_FLOW`: `get_user_email` is the traced authentication identity dependency for the inspected translation, workspace, and history flows.

## 11. Workspace Authorization Evidence

1. `TRACED_RUNTIME_FLOW`: How is membership represented? Row in `WorkspaceMember` matching user and workspace.
2. `TRACED_RUNTIME_FLOW`: How is ownership represented? `role="owner"` in `WorkspaceMember` AND `owner_email` on `Workspace`.
3. `TRACED_RUNTIME_FLOW`: Which callable checks membership? Inline in handlers (e.g., `list_workspace_members`).
4. `TRACED_RUNTIME_FLOW`: Which callable checks ownership? Inline in handlers (e.g., `delete_workspace`).
5. `TRACED_RUNTIME_FLOW`: What happens when workspace is not found? If `get_member` returns None, it raises 403.
6. `TRACED_RUNTIME_FLOW`: What happens when user is not a member? Raises 403.
7. `TRACED_RUNTIME_FLOW`: What happens when non-owner performs owner-only action? Raises 403 or 400.
8. `DIRECT_REPOSITORY_EVIDENCE`: Are role values present? Yes.
9. `TRACED_RUNTIME_FLOW`: Are role values used in authorization decisions? Yes.
10. `NOT_PRESENT_IN_INSPECTED_CODE`: Is one shared authorization helper consistently used? No helper is used.
11. `TRACED_RUNTIME_FLOW`: Is authorization inline in any handlers? Yes, in membership-authorized handlers, owner-authorized handlers, and role-authorized handlers, but not in all handlers (e.g., creating or listing workspaces relies only on authentication).
12. `TRACED_RUNTIME_FLOW`: Does workspace deletion call any repository/vector/index cleanup operation in the inspected path? No.

| HTTP Method | Router-local Path | Effective Path | Auth Dependency | Membership Check | Ownership Check | Role Check | Authorization Helper | Inline Authorization | Response Purpose | Evidence Classification |
|---|---|---|---|---|---|---|---|---|---|---|
| POST | `/workspaces` | `/api/workspace/workspaces` | `get_user_email` | No | No | No | `NOT_PRESENT_IN_INSPECTED_CODE` | No | Creates workspace | `TRACED_RUNTIME_FLOW` |
| GET | `/workspaces` | `/api/workspace/workspaces` | `get_user_email` | No | No | No | `NOT_PRESENT_IN_INSPECTED_CODE` | No | Returns list of workspaces | `TRACED_RUNTIME_FLOW` |
| GET | `/workspaces/{workspace_id}/members` | `/api/workspace/workspaces/{workspace_id}/members` | `get_user_email` | Yes | No | No | `NOT_PRESENT_IN_INSPECTED_CODE` | Yes | Returns list of members | `TRACED_RUNTIME_FLOW` |
| DELETE | `/workspaces/{workspace_id}` | `/api/workspace/workspaces/{workspace_id}` | `get_user_email` | Yes | Yes | Yes | `NOT_PRESENT_IN_INSPECTED_CODE` | Yes | Deletes workspace | `TRACED_RUNTIME_FLOW` |
| DELETE | `/workspaces/{workspace_id}/members/{member_email}` | `/api/workspace/workspaces/{workspace_id}/members/{member_email}` | `get_user_email` | Yes | Yes | Yes | `NOT_PRESENT_IN_INSPECTED_CODE` | Yes | Removes member | `TRACED_RUNTIME_FLOW` |
| POST | `/workspaces/{workspace_id}/invite` | `/api/workspace/workspaces/{workspace_id}/invite` | `get_user_email` | Yes | Yes | Yes | `NOT_PRESENT_IN_INSPECTED_CODE` | Yes | Invites member | `TRACED_RUNTIME_FLOW` |

**Member-Authorized Trace:**
`GET /api/workspaces/{id}/members` -> `get_user_email` -> `workspace_repo.get_member` -> Inline check -> Query `workspace_repo.get_members` -> Returns list.

**Owner-Only Trace:**
`DELETE /api/workspaces/{id}` -> `get_user_email` -> `workspace_repo.get_member` -> Inline check for `role == "owner"` -> Deletes records.

## 12. Translation History Write Paths

| Translation Mode/Path | Endpoint | Generator Callable | Output Accumulation | Task Dispatch in `try` | Task Dispatch in `except` | Task Dispatch in `finally` | Dispatch after AI Exhaustion | Dispatch on Exception | Dispatch on Partial Output | Client Receipt Determinable | Evidence Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Code-to-English | `/api/code-to-english` | `stream_code_to_english` | `full_content += content` | Yes | No | No | Yes | No | No | No | `TRACED_RUNTIME_FLOW` |
| Code-to-Code | `/api/code-to-code` | `stream_code_to_code` | `full_content += content` | Yes | No | No | Yes | No | No | No | `TRACED_RUNTIME_FLOW` |

**Persistence Inventory:**
* user identity: `PERSISTED`
* workspace identity: `PERSISTED`
* translation mode: `PERSISTED`
* input: `PERSISTED`
* output: `PERSISTED`
* source language: `PERSISTED`
* target language: `PERSISTED`
* repository name: `PERSISTED`
* provider repository identity: `NOT_PERSISTED`
* repository source revision: `NOT_PERSISTED`
* index identity: `NOT_PERSISTED`
* repository context provenance: `NOT_PERSISTED`

**Streaming History Timing:**
`TRACED_RUNTIME_FLOW`: The `save_translation_history_task.delay()` dispatch occurs inside the `try` block, after the normal upstream AI iterator exhaustion (the `async for` loop finishes). It does NOT dispatch on an exception, nor with partial accumulated output. The client's receipt of all emitted bytes is `NOT_DETERMINABLE_FROM_INSPECTED_CODE` from the backend source alone.

## 13. Translation History Read/Delete Evidence

| Endpoint | Auth | Query Filters | Ownership/Workspace Check | Response Behaviour | Evidence Classification |
|---|---|---|---|---|---|
| `GET /api/history` | `get_user_email` | `user_email`, `workspace_id`, `before`, `limit` | Verifies `workspace_id` membership | Returns paginated list | `TRACED_RUNTIME_FLOW` |
| `DELETE /api/history/{id}` | `get_user_email` | `id`, `user_email` | Must own history record | Deletes record | `TRACED_RUNTIME_FLOW` |

**Read Trace:**
`GET /api/history` -> `get_user_email` -> `require_workspace_membership` -> `get_user_translation_history` -> Keysets -> Returns rows.

**Delete Trace:**
`DELETE /api/history/{id}` -> `get_user_email` -> `delete_translation_history_item` -> Verifies `user_email` -> Deletes record.

## 14. Code-to-English Runtime Trace

**Sync Trace:**
`HTTP REQUEST` -> `AUTH` (`get_user_email`) -> `RATE LIMIT` (`NOT_PRESENT_IN_INSPECTED_CODE`) -> `QUOTA` (`enforce_quotas_and_protection`) -> `REQUEST VALIDATION` (`validate_code_input` / `sanitise_input`) -> `HANDLER` (`function_translate_to_english`) -> `AI CALL` (`get_completion`) -> `HISTORY DISPATCH` (`save_translation_history_task.delay`)

**Streaming Trace:**
`HTTP REQUEST` -> `AUTH` (`get_user_email`) -> `RATE LIMIT` (`rate_limiter`) -> `QUOTA` (`enforce_quotas_and_protection`) -> `REQUEST VALIDATION` (`validate_code_input` / `sanitise_input`) -> `HANDLER` (`function_translate_to_english_stream`) -> `GENERATOR CALLABLE` (`stream_code_to_english`) -> `HISTORY DISPATCH` (`save_translation_history_task.delay`)

* effective endpoint path: `/api/code-to-english/sync`, `/api/code-to-english`
* request schema: `CodePayload`
* auth dependency: `get_user_email`
* rate-limit callable/decorator: `rate_limiter` for stream, `NOT_PRESENT_IN_INSPECTED_CODE` for sync
* quota callable: `enforce_quotas_and_protection`
* validation callable: `validate_code_input`, `sanitise_input`
* AI callable: `get_completion` (sync), `stream_code_to_english` (stream)
* prompt construction callable/path: Inline in handler (sync) or in generator `stream_code_to_english` (stream)
* history dispatch timing: Post-completion in handler (sync) or in `try` block after yield exhaustion (stream)
* exception-path history behavior: Not dispatched on exception. (`TRACED_RUNTIME_FLOW`)
* partial-output history behavior where streaming applies: Not dispatched on partial output. (`TRACED_RUNTIME_FLOW`)
* error path: Standard Exception to HTTP 500 / stream err
* stream error behaviour if applicable: Streams `{'error': ...}`

`CURRENT_CODE_TO_ENGLISH_REPOSITORY_CONTEXT_USED: NO` (`DIRECT_REPOSITORY_EVIDENCE`)
Explanation: Only client-supplied payload code is passed to the AI; no vector searches or external context are retrieved.

## 15. English-to-Code Runtime Trace

**Generate Trace (`/api/generate-from-english`):**
`HTTP REQUEST` -> `AUTH` (`get_user_email`) -> `RATE LIMIT` (`NOT_PRESENT_IN_INSPECTED_CODE`) -> `QUOTA` (`enforce_quotas_and_protection`) -> `REQUEST VALIDATION` (`validate_code_input` / `sanitise_input`) -> `HANDLER` (`function_generate_from_english`) -> `AI CALL` (`get_completion`) -> `HISTORY DISPATCH` (`save_translation_history_task.delay`)

**Update Trace (`/api/english-to-code`):**
`HTTP REQUEST` -> `AUTH` (`get_user_email`) -> `RATE LIMIT` (`rate_limiter`) -> `QUOTA` (`enforce_quotas_and_protection`) -> `REQUEST VALIDATION` (`sanitise_input`) -> `HANDLER` (`function_update_to_code`) -> `AI CALL` (`get_completion`) -> `HISTORY DISPATCH` (`NOT_PRESENT_IN_INSPECTED_CODE`)

**Sync Trace (`/api/sync-english-to-code`):**
`HTTP REQUEST` -> `AUTH` (`get_user_email`) -> `RATE LIMIT` (`NOT_PRESENT_IN_INSPECTED_CODE`) -> `QUOTA` (`enforce_quotas_and_protection`) -> `REQUEST VALIDATION` (`sanitise_input`) -> `HANDLER` (`function_sync_english_to_code`) -> `AI CALL` (`get_completion`) -> `HISTORY DISPATCH` (`save_translation_history_task.delay`)

* effective endpoint paths: `/api/generate-from-english`, `/api/english-to-code`, `/api/sync-english-to-code`
* blocks and full_context runtime use: Formatted into the user prompt if provided by the client request payload. (`TRACED_RUNTIME_FLOW`)
* history dispatch timing: Post-completion in handler for generate/sync. Not dispatched for update. (`TRACED_RUNTIME_FLOW`)
* exception-path history behavior: Not dispatched on exception. (`TRACED_RUNTIME_FLOW`)
* partial-output history behavior where streaming applies: Not applicable (no streaming). (`TRACED_RUNTIME_FLOW`)

`CURRENT_ENGLISH_TO_CODE_REPOSITORY_CONTEXT_USED: NO` (`DIRECT_REPOSITORY_EVIDENCE`)
Explanation: Client strings `blocks` and `full_context` provide local context, but they are blindly accepted from the client request; no server-side repository retrieval validates or provides context.

## 16. Code-to-Code Runtime Trace

**Trace:**
`HTTP REQUEST` -> `AUTH` (`get_user_email`) -> `RATE LIMIT` (`rate_limiter`) -> `QUOTA` (`enforce_quotas_and_protection`) -> `REQUEST VALIDATION` (`validate_code_input` / `sanitise_input`) -> `HANDLER` (`function_code_to_code`) -> `GENERATOR CALLABLE` (`stream_code_to_code`) -> `HISTORY DISPATCH` (`save_translation_history_task.delay`)

**Six Concept Classifications:**
* source-side repository context: `NOT_PRESENT_IN_INSPECTED_CODE`
* target-side repository context: `NOT_PRESENT_IN_INSPECTED_CODE`
* source anchor: `NOT_PRESENT_IN_INSPECTED_CODE`
* target intent: `NOT_PRESENT_IN_INSPECTED_CODE`
* semantic repository context: `NOT_PRESENT_IN_INSPECTED_CODE`
* structural repository context: `NOT_PRESENT_IN_INSPECTED_CODE`
* history dispatch timing: Post-exhaustion in generator. (`TRACED_RUNTIME_FLOW`)
* exception-path history behavior: Not dispatched on exception. (`TRACED_RUNTIME_FLOW`)
* partial-output history behavior where streaming applies: Not dispatched. (`TRACED_RUNTIME_FLOW`)

`CURRENT_CODE_TO_CODE_REPOSITORY_CONTEXT_USED: NO` (`DIRECT_REPOSITORY_EVIDENCE`)
Explanation: Standard prompt execution translating purely client-provided string blocks. No structural or anchor context retrieved.

## 17. Current Translation Mode Comparison

| Runtime Concern | Code-to-English | English-to-Code | Code-to-Code | Evidence Classification |
|---|---|---|---|---|
| registered effective endpoint or endpoints | `/api/code-to-english`, `/api/code-to-english/sync` | `/api/generate-from-english`, `/api/english-to-code`, `/api/sync-english-to-code` | `/api/code-to-code` | `DIRECT_REPOSITORY_EVIDENCE` |
| sync endpoint presence | Yes | Yes | No | `DIRECT_REPOSITORY_EVIDENCE` |
| streaming endpoint presence | Yes | No | Yes | `DIRECT_REPOSITORY_EVIDENCE` |
| auth dependency | `get_user_email` | `get_user_email` | `get_user_email` | `DIRECT_REPOSITORY_EVIDENCE` |
| rate-limit callable or absence | `rate_limiter` for stream, absent for sync | absent for generate & sync, `rate_limiter` for update | `rate_limiter` | `DIRECT_REPOSITORY_EVIDENCE` |
| quota callable | `enforce_quotas_and_protection` | `enforce_quotas_and_protection` | `enforce_quotas_and_protection` | `DIRECT_REPOSITORY_EVIDENCE` |
| request validation callable or absence | `validate_code_input`, `sanitise_input` | `validate_code_input`, `sanitise_input` (validate absent for sync/update) | `validate_code_input`, `sanitise_input` | `DIRECT_REPOSITORY_EVIDENCE` |
| handler callable or callables | `function_translate_to_english_stream`, `function_translate_to_english` | `function_generate_from_english`, `function_update_to_code`, `function_sync_english_to_code` | `function_code_to_code` | `DIRECT_REPOSITORY_EVIDENCE` |
| AI callable or generator callable | `get_completion` (sync), `stream_code_to_english` (stream) | `get_completion` | `stream_code_to_code` | `TRACED_RUNTIME_FLOW` |
| prompt construction location | Inline in handler (sync) or Generator (stream) | Inline in handler | Generator | `TRACED_RUNTIME_FLOW` |
| repository context passed to AI | None | Client-supplied only | None | `TRACED_RUNTIME_FLOW` |
| history persistence mechanism | Celery `save_translation_history_task.delay()` | Celery `save_translation_history_task.delay()` | Celery `save_translation_history_task.delay()` | `TRACED_RUNTIME_FLOW` |
| history dispatch timing | Post-completion in handler (sync) or post-exhaustion in generator (stream) | Post-completion in handler (generate, sync), absent (update) | Post-exhaustion in generator | `TRACED_RUNTIME_FLOW` |
| exception-path history behavior | Not dispatched | Not dispatched | Not dispatched | `TRACED_RUNTIME_FLOW` |
| partial-output history behavior where streaming applies | Not dispatched | Not applicable | Not dispatched | `TRACED_RUNTIME_FLOW` |

### `/import-gist` Contradiction Resolution

1. `DIRECT_REPOSITORY_EVIDENCE`: Does an `/import-gist` route exist? Yes
2. `DIRECT_REPOSITORY_EVIDENCE`: Is the router containing it registered on the active FastAPI application? Yes
3. `DIRECT_REPOSITORY_EVIDENCE`: What is the effective endpoint path? `/api/import-gist`
4. `TRACED_RUNTIME_FLOW`: Does it accept GitHub Gist URLs? Yes
5. `NOT_PRESENT_IN_INSPECTED_CODE`: Does it call the GitHub Gist REST API? No
6. `NOT_PRESENT_IN_INSPECTED_CODE`: Does it use a Gist API endpoint such as `api.github.com/gists/...`? No
7. `TRACED_RUNTIME_FLOW`: Does it fetch raw Gist content URLs instead? Yes
8. `TRACED_RUNTIME_FLOW`: Does it parse `gist.github.com` URLs? Yes
9. `TRACED_RUNTIME_FLOW`: Does it support raw GitHub URLs? Yes
10. `TRACED_RUNTIME_FLOW`: Does it support GitHub blob URLs? Yes
11. `NOT_PRESENT_IN_INSPECTED_CODE`: Does it support GitHub repository URLs? No
12. `NOT_PRESENT_IN_INSPECTED_CODE`: Does it use GitHub credentials for this endpoint? No
13. `NOT_PRESENT_IN_INSPECTED_CODE`: Does it support private Gists based on inspected code? No
14. `DIRECT_REPOSITORY_EVIDENCE`: Where is `GIST_MAX_SIZE` defined or sourced? `app/core/config.py`
15. `TRACED_RUNTIME_FLOW`: How is the size limit enforced? String length evaluation after fetching data.
16. `NOT_PRESENT_IN_INSPECTED_CODE`: Is server-side bounded reading used? No
17. `TRACED_RUNTIME_FLOW`: Is `Content-Length` used? Yes
18. `TRACED_RUNTIME_FLOW`: Can actual response bytes exceed the limit before rejection based on the current read path? Yes

`CURRENT_IMPORT_GIST_ROUTE_EXISTS: YES`
`CURRENT_GIST_URL_IMPORT_EXISTS: YES`
`CURRENT_GITHUB_GIST_API_INTEGRATION_EXISTS: NO`
`CURRENT_PRIVATE_GIST_SUPPORT: NO`

## 18. Files Inspected and Searches Performed

### Files Inspected

| Repository-Relative Path | Why Inspected | Read Classification |
|---|---|---|
| `app/main.py` | Verify entry point & router registration | `COMPLETE` |
| `app/core/database_session.py` | Determine DB engine & session factory | `COMPLETE` |
| `app/models/db_models.py` | Verify active SQLAlchemy Base and model identities | `COMPLETE` |
| `app/core/auth.py` | Trace auth dependencies | `COMPLETE` |
| `app/routers/workspace.py` | Inspect workspace authorization | `COMPLETE` |
| `app/repositories/workspace.py` | Inspect workspace DB operations | `COMPLETE` |
| `app/routers/history.py` | Inspect translation history | `COMPLETE` |
| `app/repositories/translation.py` | Inspect translation persistence mapping | `COMPLETE` |
| `app/queue/tasks.py` | Trace history task context | `COMPLETE` |
| `app/routers/utility.py` | Resolve Gist contradiction | `COMPLETE` |
| `app/routers/translate/upload.py` | Examine file upload translations | `COMPLETE` |
| `app/routers/translate/code_to_english.py` | Trace C2E logic | `COMPLETE` |
| `app/routers/translate/english_to_code.py` | Trace E2C logic | `COMPLETE` |
| `app/routers/translate/code_to_code.py` | Trace C2C logic | `COMPLETE` |
| `app/routers/repo_search.py` | Verify repo search endpoint status | `COMPLETE` |
| `app/routers/onboarding.py` | Verify onboarding status | `COMPLETE` |
| `app/routers/github.py` | Verify GitHub router details | `COMPLETE` |
| `app/routers/demo.py` | Verify demo translations | `COMPLETE` |
| `app/routers/billing.py` | Verify billing endpoint paths | `COMPLETE` |

### Searches Performed
* `FastAPI(`
* `include_router`
* `APIRouter(`
* `create_async_engine`
* `async_sessionmaker`
* `get_db_session`
* `declarative_base`
* `RepoEmbedding`
* Imports of `TranslationHistory`, `Workspace`, `WorkspaceUser`, `UserApiKey`
* `BaseModel`
* `get_user_email`
* `TranslationHistory(`
* `save_translation_history_task.delay`
* `blocks`, `full_context`, `import-gist`, `gist`, `GIST_MAX_SIZE`

## 19. Backend Runtime Evidence Gaps

| ID | Question | Files Inspected | Why Not Determinable from Inspected Code |
|---|---|---|---|
| `BACKEND-EVIDENCE-GAP-01` | What is the deployed PostgreSQL database value? | `app/core/database_session.py` | `DATABASE_URL` is injected via environment variables at runtime. |
| `BACKEND-EVIDENCE-GAP-02` | Is the Celery worker active in production? | `app/queue/tasks.py` | Cannot be determined solely from source code existence. |

## 20. Loop 6A-1C Verification Summary

1. `REPOSITORY_ROOT`: C:/Users/tarun/Anuvaad/Anuvaad
2. `BRANCH`: master
3. `HEAD_COMMIT`: c4e2cebf68449b957d720a0067f5af67caae1009
4. `CURRENT_LOOP_6A_1C_INITIAL_STATUS`: 3 untracked paths
5. `LOOP_6A_1B_TRUE_INITIAL_WORKING_TREE_STATE`: NOT_DETERMINABLE_FROM_INSPECTED_CODE
6. `LOOP_6A_1B_PROVENANCE_CORRECTION`: Provenance properly updated.
7. `DUMP_PROMPT_PY_PROVENANCE`: CREATED_DURING_LOOP_6A_1B_TOOLING
8. `PROMPT_TXT_PROVENANCE`: CREATED_DURING_LOOP_6A_1B_TOOLING
9. `DUMP_PROMPT_PY_PRODUCTION_REFERENCE_RESULT`: No references found
10. `PROMPT_TXT_PRODUCTION_REFERENCE_RESULT`: No references found
11. `DUMP_PROMPT_PY_DELETION_RESULT`: DELETED_DURING_LOOP_6A_1C
12. `PROMPT_TXT_DELETION_RESULT`: DELETED_DURING_LOOP_6A_1C
13. `AUTHORIZED_LOOP_6A_1C_EVIDENCE_CHANGE`: docs/engineering/EVIDENCE_BACKEND_RUNTIME.md modified
14. `CURRENT_LOOP_6A_1C_FINAL_STATUS`: 1 untracked path + modified evidence (pending final command)
15. `H2_MAJOR_SECTION_COUNT`: 20
16. `H2_STRUCTURE_VERIFICATION`: Confirmed exactly 20 matching H2 headings in correct order.
17. `UNEXPECTED_ASCII_CONTROL_CHARACTER_COUNT`: 0
18. `WORKSPACE_MODEL_USER_OWNERSHIP_CLASSIFICATION`: EXPLICIT_FIELD (`owner_email`)
19. `WORKSPACE_MODEL_WORKSPACE_OWNERSHIP_CLASSIFICATION`: NO_FIELD_OBSERVED
20. `AUTHENTICATION_PRECEDENCE_CONCLUSION`: `get_user_email_from_request` checks `X-API-Key` first, then falls back to `Bearer` if absent. If `X-API-Key` is present and invalid, it raises 401 (does not fall back). `get_user_email` only checks `Bearer` credentials.
21. `AUTHENTICATION_SCOPED_DEPENDENCY_CONCLUSION`: `get_user_email` is the traced authentication identity dependency for the inspected translation, workspace, and history flows.
22. `WORKSPACE_ROUTE_COUNT`: 6 registered workspace routes inventoried.
23. `WORKSPACE_AUTHORIZATION_TABLE_COMPLETENESS`: Completed table for all 6 active router endpoints with 11 exact conceptual fields.
24. `STREAMING_HISTORY_ENDPOINT_COUNT`: 2 independent endpoints traced (Code-to-English and Code-to-Code streaming).
25. `STREAMING_HISTORY_TIMING_RESOLUTION`: Dispatch occurs in `try` block after AI iteration exhaustion, not in `finally`.
26. `ENGLISH_TO_CODE_ENDPOINT_COUNT`: 3 endpoints traced with actual callable names (`function_generate_from_english`, `function_update_to_code`, `function_sync_english_to_code`).
27. `ENGLISH_TO_CODE_CALLABLE_TRACE_STATUS`: Completed.
28. `CODE_TO_CODE_CALLABLE_TRACE_STATUS`: Completed.
29. `WORKSPACE_NUMBERED_ANSWER_CLASSIFICATION_STATUS`: Applied to all 12 answers.
30. `GIST_NUMBERED_ANSWER_CLASSIFICATION_STATUS`: Applied to all 18 answers.
31. `BACKEND_RUNTIME_EVIDENCE_GAP_COUNT`: 2 gaps remaining.
32. `NO_ARCHITECTURE_COMPARISON_CONFIRMATION`: Confirmed.
33. `NO_GAP_ANALYSIS_CONFIRMATION`: Confirmed.
34. `NO_RECOMMENDATIONS_CONFIRMATION`: Confirmed.
35. `NO_IMPLEMENTATION_PLANNING_CONFIRMATION`: Confirmed.
36. `NO_SCHEMA_DESIGN_CONFIRMATION`: Confirmed.
37. `NO_PRODUCTION_CODE_CHANGE_CONFIRMATION`: Confirmed.
38. `NO_FRONTEND_CHANGE_CONFIRMATION`: Confirmed.
39. `NO_TEST_CHANGE_CONFIRMATION`: Confirmed.
40. `NO_MIGRATION_CONFIRMATION`: Confirmed.
41. `NO_DEPENDENCY_INSTALLATION_CONFIRMATION`: Confirmed.
42. `LOOP_6A_2_NOT_EXECUTED_CONFIRMATION`: Confirmed.
43. `LOOP_6B_NOT_EXECUTED_CONFIRMATION`: Confirmed.
44. `IMPLEMENTATION_NOT_EXECUTED_CONFIRMATION`: Confirmed.
45. `CROSS_SECTION_CONTRADICTION_COUNT`: 0
46. `FINAL_GIT_STATUS_PATH_COUNT`: 1
47. `FINAL_GIT_STATUS_SHORT_EXACT`:
```text
?? docs/
```
48. `FINAL_STATUS`: `LOOP_6A_1D_BACKEND_RUNTIME_EVIDENCE_ACCEPTANCE_CORRECTION_COMPLETE_AWAITING_EXTERNAL_REVIEW`
