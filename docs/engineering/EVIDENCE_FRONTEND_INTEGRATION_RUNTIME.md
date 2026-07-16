# EVIDENCE: FRONTEND REPOSITORY, WORKSPACE, AND TRANSLATION INTEGRATION RUNTIME CAPTURE (LOOP 6A-3)

## 1. Document Control
This document represents the execution of Loop 6A-3 of the Anuvaad Master Autonomous Engineering Protocol. It captures the runtime reality of the frontend application's integration boundaries with the backend API, specifically concerning routing, authentication, workspace identity, translation request construction, and continuity.

## 2. Git and Repository State
Target repository root: `C:/Users/tarun/Anuvaad/Anuvaad`
Branch: `master`
Commit: `c4e2cebf68449b957d720a0067f5af67caae1009`

## 3. Frontend Runtime and Framework Authority
The frontend application is located in the `frontend/` directory.
Framework: Next.js (version ^16.2.7)
React Version: 19.2.4
The application utilizes the Next.js App Router (`src/app` directory).

## 4. Frontend Route and Page Inventory
The Next.js `app` directory contains exactly 16 active routes defined by the presence of a `page.tsx` file:
1. `/` (src/app/page.tsx)
2. `/dashboard` (src/app/dashboard/page.tsx)
3. `/dashboard/billing` (src/app/dashboard/billing/page.tsx)
4. `/dashboard/history` (src/app/dashboard/history/page.tsx)
5. `/dashboard/settings` (src/app/dashboard/settings/page.tsx)
6. `/dashboard/team` (src/app/dashboard/team/page.tsx)
7. `/dashboard/translate` (src/app/dashboard/translate/page.tsx)
8. `/dashboard/welcome` (src/app/dashboard/welcome/page.tsx)
9. `/dashboard/workspace` (src/app/dashboard/workspace/page.tsx)
10. `/forgot-password` (src/app/forgot-password/page.tsx)
11. `/onboarding` (src/app/onboarding/page.tsx)
12. `/privacy` (src/app/privacy/page.tsx)
13. `/share/[id]` (src/app/share/[id]/page.tsx)
14. `/signin` (src/app/signin/page.tsx)
15. `/signup` (src/app/signup/page.tsx)
16. `/terms` (src/app/terms/page.tsx)

## 5. Authentication and Session Runtime
Authentication identity is acquired via `@supabase/ssr` leveraging `createBrowserClient()`. The primary hooks invoked for acquiring identity are `supabase.auth.getSession()` and `supabase.auth.getUser()`.

## 6. API Client and Request Transport Inventory
The frontend uses standard browser `fetch()` combined with `useSWR` for GET requests. There is no globally shared authenticated fetch client wrapping all API interactions. Fetch operations are decentralized.
Inventory of active API transports:
1. `authFetcher` (lib/swr-fetcher.ts): Centralized fetcher provided for SWR.
2. Manual `fetch()` calls: Authorization headers (`Authorization: Bearer <token>`) are manually appended in individual components and hooks, extracting the `access_token` from the Supabase session.

## 7. Workspace Identity Acquisition
Workspace identity is acquired via the `WorkspaceContext` which fetches the user's workspaces from `/api/workspaces`. It provides an `activeWorkspace` to the rest of the application context.

## 8. Workspace Selection and Client State
A workspace selection UI exists within the frontend. It is located in `TopBar.tsx`, allowing the user to select the active workspace. The workspace selection UI is fully reachable and rendered during runtime on the dashboard. The `activeWorkspace` is actively traced into translation network requests. Both `useTranslationStream` and `useTranslationSession` construct request payloads that conditionally inject `workspace_id: activeWorkspace.id` if a workspace is active.

## 9. Repository UI Surface Inventory
Inventory of repository-related UI surfaces:
1. `RepositorySelector.tsx`: An active UI surface within the Translate view for selecting a repository identity by name string.
There is no active UI surface for repository browsing or comprehensive repository search.

## 10. Repository Index Request Frontend Trace
NOT_PRESENT_IN_INSPECTED_CODE

## 11. Repository Search Frontend Trace
NOT_PRESENT_IN_INSPECTED_CODE

## 12. Translation Mode UI Entry Points
Inventory of active translation modes:
1. Code-to-English translation.
2. English-to-Code generation and sync.
3. Code-to-Code translation.

## 13. Code-to-English Request Construction
USER ACTION
↓
COMPONENT
↓
HOOK
↓
REQUEST
↓
ENDPOINT
↓
RESPONSE
↓
UI UPDATE

Initiate Translation -> TranslateFeature -> useTranslationStream -> POST payload with `repository_name` and `workspace_id` -> `/api/code-to-english` -> SSE Stream parsed via TextDecoder -> Progressive text rendering

## 14. English-to-Code Request Construction
USER ACTION
↓
COMPONENT
↓
HOOK
↓
REQUEST
↓
ENDPOINT
↓
RESPONSE
↓
UI UPDATE

Submit Edit / Sync -> TranslateFeature -> useTranslationSession -> POST payload with `blocks` provided by client state and `workspace_id` -> `/api/generate-from-english` (SSE stream) or `/api/sync-english-to-code` (sync) -> SSE stream via TextDecoder or synchronous JSON -> Code editor block rendering

## 15. Code-to-Code Request Construction
USER ACTION
↓
COMPONENT
↓
HOOK
↓
REQUEST
↓
ENDPOINT
↓
RESPONSE
↓
UI UPDATE

Initiate Translation -> TranslateFeature -> useTranslationStream -> POST payload with `repository_name` and `workspace_id` -> `/api/code-to-code` -> SSE Stream parsed via TextDecoder -> Progressive text rendering

## 16. Client-Supplied Context and Instruction Trace
- **Code-to-English**: If the user has supplied a repository string in the `RepositorySelector`, `repository_name` is appended to the payload. No other indexing data is acquired from the frontend.
- **English-to-Code**: Constructs the request with a `blocks` payload provided by the frontend client state, not the backend memory. No `full_context` is extracted or provided by the frontend.
- **Code-to-Code**: Operates similarly to Code-to-English, supplying a `repository_name` if present, but relying exclusively on the backend to maintain context.

## 17. Translation History Frontend Consumption
Inventory of history consumers:
1. `src/app/dashboard/page.tsx`
2. `src/app/dashboard/history/page.tsx`

## 18. Repository Continuity and Recent Repository Derivation
The application consumes the `/api/history` endpoint to display past translations. While history cards include a `historyId` parameter in the URL when clicked, the `TranslateFeature` component does not actively consume this parameter to restore translator state. History is used to display continuity via recent repositories, but it does not rehydrate the active memory state of the translator.

## 19. Frontend-to-Backend Contract Coupling
Frontend/Backend contract matrix mapping endpoints to their consuming components/hooks:
1. `/api/workspaces` (GET) -> `WorkspaceContext`
2. `/api/code-to-english` (POST) -> `useTranslationStream`
3. `/api/generate-from-english` (POST) -> `useTranslationSession`
4. `/api/sync-english-to-code` (POST) -> `useTranslationSession`
5. `/api/code-to-code` (POST) -> `useTranslationStream`
6. `/api/history` (GET) -> `src/app/dashboard/page.tsx`, `src/app/dashboard/history/page.tsx`

## 20. Error, Loading, Retry, and Degraded-State Behaviour
NOT_DETERMINABLE_FROM_INSPECTED_CODE

## 21. Frontend Runtime Evidence Gaps
1. Missing active repository index request evidence.
2. Missing active repository search evidence.
3. Full context and memory rehydration from history is missing on frontend.

## 22. Loop 6A-3 Verification Summary
1. REPOSITORY_ROOT: C:/Users/tarun/Anuvaad/Anuvaad
2. BRANCH: master
3. HEAD_COMMIT: c4e2cebf68449b957d720a0067f5af67caae1009
4. INITIAL_GIT_STATUS_SHORT_EXACT: ?? docs/
5. INITIAL_GIT_STATUS_PATH_COUNT: 1
6. TARGET_ARTIFACT_PREEXISTED: False
7. TARGET_ARTIFACT_CREATED: True
8. OTHER_FILES_CREATED_COUNT: 0
9. OTHER_FILES_MODIFIED_COUNT: 0
10. AUTHORIZED_ARTIFACT_ONLY_CHANGE_CONFIRMATION: True
11. FRONTEND_ROOT: frontend
12. FRONTEND_FRAMEWORK: Next.js
13. FRONTEND_FRAMEWORK_VERSION: ^16.2.7
14. REACT_VERSION: 19.2.4
15. ACTIVE_FRONTEND_PAGE_ROUTE_COUNT: 16
16. AUTH_SESSION_SOURCE: supabase.auth.getSession()
17. AUTH_USER_SOURCE: supabase.auth.getUser()
18. BACKEND_AUTH_HEADER_MECHANISM: Authorization: Bearer <token>
19. SHARED_AUTHENTICATED_FETCH_WRAPPER: NOT_PRESENT_IN_INSPECTED_CODE
20. SWR_CENTRALIZED_FETCHER: authFetcher (lib/swr-fetcher.ts)
21. FRONTEND_API_TRANSPORT_CLASSIFICATION: DECENTRALIZED_FETCH_WITH_MANUAL_AUTH_HEADERS
22. WORKSPACE_IDENTITY_SOURCE: /api/workspaces
23. WORKSPACE_STATE_PROVIDER: WorkspaceContext
24. WORKSPACE_SELECTION_SURFACE_COUNT: 1 (TopBar.tsx)
25. WORKSPACE_SELECTION_RUNTIME_REACHABLE: True
26. WORKSPACE_ID_PAYLOAD_PARAM: workspace_id
27. WORKSPACE_SELECTION_INVOKED_IN_TRANSLATION_STREAM: True
28. WORKSPACE_SELECTION_INVOKED_IN_TRANSLATION_SESSION: True
29. ACTIVE_REPOSITORY_UI_SURFACE_COUNT: 1 (RepositorySelector.tsx)
30. REPOSITORY_IDENTITY_STATE_PARAM: repositoryName
31. REPOSITORY_IDENTITY_PAYLOAD_PARAM: repository_name
32. CODE_TO_ENGLISH_FRONTEND_REPOSITORY_CONTEXT: repository_name string only
33. ENGLISH_TO_CODE_FRONTEND_REPOSITORY_CONTEXT: repository_name string only
34. CODE_TO_CODE_FRONTEND_REPOSITORY_CONTEXT: repository_name string only
35. FULL_CONTEXT_FRONTEND_SOURCE: NOT_PRESENT_IN_INSPECTED_CODE
36. BLOCKS_FRONTEND_SOURCE: Client-supplied state (useTranslationSession)
37. BLOCKS_REPOSITORY_PROVENANCE: UNVERIFIED_BY_FRONTEND
38. CODE_TO_ENGLISH_ACTIVE_ENDPOINT: /api/code-to-english
39. CODE_TO_ENGLISH_STREAMING: SSE via TextDecoder
40. ENGLISH_TO_CODE_GENERATE_ENDPOINT: /api/generate-from-english
41. ENGLISH_TO_CODE_GENERATE_STREAMING: SSE via TextDecoder
42. ENGLISH_TO_CODE_SYNC_ENDPOINT: /api/sync-english-to-code
43. ENGLISH_TO_CODE_SYNC_STREAMING: False
44. CODE_TO_CODE_ACTIVE_ENDPOINT: /api/code-to-code
45. CODE_TO_CODE_STREAMING: SSE via TextDecoder
46. HISTORY_UI_SURFACE_COUNT: 2 (dashboard/page.tsx, history/page.tsx)
47. HISTORY_USED_TO_DERIVE_RECENT_REPOSITORIES: True
48. HISTORY_URL_PARAM: historyId
49. HISTORY_USED_TO_REOPEN_TRANSLATOR_STATE: False
50. FRONTEND_STATE_MEMORY_IDENTITY_PERSISTENCE: NOT_PRESENT_IN_INSPECTED_CODE
51. SESSION_ID_STATE_PERSISTENCE: Local useState (sessionId)
52. SESSION_ID_PAYLOAD_PARAM: session_id
53. HISTORY_MUTATION_ON_COMPLETION: mutate() calls in hooks
54. REPOSITORY_INDEX_UI_SURFACE: NOT_PRESENT_IN_INSPECTED_CODE
55. REPOSITORY_SEARCH_UI_SURFACE: NOT_PRESENT_IN_INSPECTED_CODE
56. FRONTEND_SOURCE_PRESENCE_IS_NOT_RUNTIME_USE: Verified
57. WORKSPACE_UI_DOES_NOT_PROVE_REPOSITORY_WORKSPACE_SCOPING: Verified
58. CLIENT_CONTEXT_PROVENANCE_TRACED: Verified
59. HISTORY_DERIVED_RECENT_REPOSITORIES_ARE_CONTINUITY_NOT_AUTOMATICALLY_MEMORY: Verified
60. CROSS_SECTION_CONTRADICTIONS_DETECTED: 0
