# Anuvaad — Implementation Backlog
### Synthesized from: Technical Audit v1+v2 · Architecture Inventory · Modernization Roadmap · Engineering Specification

> **Status**: Ready for execution  
> **Total Scope**: 19 weeks (single developer) · 10–12 weeks (frontend + backend in parallel)  
> **Sequencing Rule**: Each phase is independently deployable. No phase requires a subsequent phase to be in-progress before shipping.

---

## Phase Map

| Phase | Name | Weeks | Risk | Business Value | Prerequisite |
|---|---|---|---|---|---|
| **Phase 1** | Foundation Fixes | 1–2 | 🟢 Low | 🔴 High (unblocks all) | None |
| **Phase 2** | Architecture Restructure | 3–5 | 🟡 Medium | 🟡 Medium | Phase 1 |
| **Phase 3** | Design System + Motion Engine | 6–9 | 🟢 Low | 🟡 Medium | Phase 2 |
| **Phase 4** | Dashboard Redesign | 10–13 | 🟡 Medium | 🔴 High | Phase 2, 3 |
| **Phase 5** | Landing Page Redesign | 14–17 | 🔴 High | 🔴 High | Phase 2, 3 |

---

---

## Phase 1 — Foundation Fixes

> **Duration**: 1–2 weeks  
> **Goal**: Zero visual change. Fix every structural defect that blocks all subsequent phases. Backend DI, LLM singletons, dead code removal, payment bug fixes.

---

### TASK-1.1 — Replace `sys.modules` DI with FastAPI `Depends()`

**Category**: Backend · Critical structural fix

**Problem**: `sys.modules.get("main")` in `auth.py`, `quota.py`, and `cache.py` is a global side-effect DI hack. Fragile, opaque, and blocked clean unit testing.

**Exact Tasks**:
1. In `app/core/auth.py`: Remove all `sys.modules.get("main")` lookups. Create `async def get_cache(request: Request) -> CacheProxy` dependency returning `request.app.state.cache`.
2. In `app/core/quota.py`: Same pattern — replace every `sys.modules` reference with `Depends(get_cache)` injection.
3. In `app/main.py` lifespan handler: Store cache instance at `app.state.cache` on startup.
4. In `tests/conftest.py`: Replace `sys.modules` mock injection with `app.dependency_overrides[get_cache] = lambda: mock_cache` pattern.

**Dependencies**: None

**Estimated Effort**: 4–6 hours

**Files Affected**:
- `app/core/auth.py`
- `app/core/quota.py`
- `app/core/cache.py` (CacheProxy)
- `app/main.py`
- `tests/conftest.py`

**Acceptance Criteria**:
- No `sys.modules` reference exists anywhere in `app/`
- All 184 existing backend tests still pass
- `app.dependency_overrides` used in test fixtures
- Static analysis (`mypy`) finds no opaque attribute access

**Testing Requirements**:
- Run full `pytest` suite: all 184 tests must pass
- Add one new test to `test_api.py` that overrides `get_cache` with a mock and asserts the override is used

---

### TASK-1.2 — LLM Client Singletons

**Category**: Backend · Performance fix

**Problem**: `AsyncOpenAI` clients for Groq and DeepSeek are instantiated fresh inside `stream_code_to_english` and `stream_code_to_code` on every call. Repeated DNS resolution and TLS handshake on every translation.

**Exact Tasks**:
1. In `app/services/ai.py`: Create module-level singleton instances:
   ```python
   _groq_client: AsyncOpenAI | None = None
   _deepseek_client: AsyncOpenAI | None = None
   ```
2. Wire singleton initialization into the `lifespan` handler in `app/core/config.py`.
3. Update `stream_code_to_english`, `stream_code_to_code`, and `get_completion` to reference the singletons instead of creating instances inline.
4. Add teardown (`.close()`) in the lifespan exit.

**Dependencies**: TASK-1.1 (lifespan already modified)

**Estimated Effort**: 2–3 hours

**Files Affected**:
- `app/services/ai.py`
- `app/core/config.py` (lifespan)

**Acceptance Criteria**:
- `AsyncOpenAI()` constructor called exactly twice at startup, never per-request
- Streaming endpoints still produce correct SSE output
- Connection pooling reused across concurrent requests

**Testing Requirements**:
- Add test in `test_streaming.py` asserting singleton is referenced (mock at module level, not per-call)
- Run `test_streaming.py` and `test_comprehensive.py`

---

### TASK-1.3 — Deduplicate `get_client_ip`

**Category**: Backend · Code quality

**Problem**: Identical `get_client_ip()` function defined in both `app/main.py` and `app/core/auth.py`. No single source of truth.

**Exact Tasks**:
1. Delete `get_client_ip` from `app/main.py`.
2. Update all callers in `app/main.py` to import from `app/core/auth.py`.
3. Verify no other file defines a local version.

**Dependencies**: None

**Estimated Effort**: 30 minutes

**Files Affected**:
- `app/main.py`
- `app/core/auth.py`

**Acceptance Criteria**:
- Single definition exists in `app/core/auth.py`
- All usages import from `auth.py`
- No duplication detected by `grep -rn "def get_client_ip"`

**Testing Requirements**:
- Run `test_security.py` (rate-limit IP tests rely on this function)

---

### TASK-1.4 — Structured JSON Logging with `structlog`

**Category**: Backend · Observability

**Problem**: All logging uses `logger.info(f"string {var}")`. Not JSON-structured. Unparseable by Datadog/Loki/CloudWatch.

**Exact Tasks**:
1. Add `structlog` to `requirements.txt`.
2. Configure `structlog` in `app/core/config.py` with JSON renderer and shared processors (timestamp, log level, service name).
3. Replace all `logger.info(f"…")`, `logger.warning(...)`, `logger.error(...)` throughout `app/` with `structlog.get_logger().info("event", key=value)` calls.
4. Ensure Sentry integration still receives structured context.

**Dependencies**: None

**Estimated Effort**: 4–6 hours

**Files Affected**:
- `requirements.txt`
- `app/core/config.py`
- `app/main.py`
- `app/core/auth.py`
- `app/core/quota.py`
- `app/services/ai.py`
- `app/services/email.py`
- `app/routers/translate.py`
- `app/routers/billing.py`
- `app/routers/history.py`
- `app/routers/workspace.py`
- `app/routers/utility.py`

**Acceptance Criteria**:
- Every log line is valid JSON when `LOG_FORMAT=json`
- Contains fields: `timestamp`, `level`, `event`, `service: "anuvaad-api"`
- No bare `f"string {var}"` log calls remain

**Testing Requirements**:
- Capture log output in `test_production.py` and assert JSON parse succeeds
- Run full pytest suite; no existing test should break

---

### TASK-1.5 — Remove Framer Motion; Add CSS Block Animation

**Category**: Frontend · Performance

**Problem**: Framer Motion is used in exactly one location (`TranslationBlockCard` entrance in `translate/page.tsx`) but ships ~60KB gzipped to every dashboard user.

**Exact Tasks**:
1. In `frontend/src/app/dashboard/translate/page.tsx`: Replace `<motion.div initial=... animate=... transition=...>` with `<div className="animate-block-in" style={{ '--delay': \`${Math.min(idx * 50, 400)}ms\` }}>`.
2. In `frontend/src/app/globals.css`: Add keyframe:
   ```css
   @keyframes block-enter { to { opacity: 1; transform: translateY(0); } }
   .animate-block-in {
     opacity: 0;
     transform: translateY(15px);
     animation: block-enter 0.4s ease var(--delay, 0ms) forwards;
   }
   ```
3. Run `npm uninstall framer-motion` and remove from `package.json`.
4. Remove all `import { motion } from 'framer-motion'` statements.

**Dependencies**: None

**Estimated Effort**: 2 hours

**Files Affected**:
- `frontend/src/app/dashboard/translate/page.tsx`
- `frontend/src/app/globals.css`
- `frontend/package.json`
- `frontend/package-lock.json`

**Acceptance Criteria**:
- `framer-motion` absent from `package.json` and `node_modules`
- Block entrance animation visually identical (opacity 0→1, y 15→0, stagger)
- Dashboard JS bundle reduced by ~60KB gzipped
- `next build` bundle analyzer confirms no Framer Motion chunk

**Testing Requirements**:
- Visual diff: compare before/after screenshots of translate page after first translation
- E2E: `e2e/anuvaad.spec.ts` — translate flow must complete and show block cards

---

### TASK-1.6 — Fix WorkspaceProvider Duplication

**Category**: Frontend · Bug fix

**Problem**: `WorkspaceProvider` is mounted twice — once in the root `app/layout.tsx` and once in `app/dashboard/layout.tsx`. Causes double fetches and potential state inconsistency.

**Exact Tasks**:
1. Remove `<WorkspaceProvider>` from `frontend/src/app/layout.tsx`.
2. Verify `WorkspaceProvider` remains in `frontend/src/app/dashboard/layout.tsx`.
3. Confirm `useWorkspace()` still works on all dashboard pages.

**Dependencies**: None

**Estimated Effort**: 30 minutes

**Files Affected**:
- `frontend/src/app/layout.tsx`
- `frontend/src/app/dashboard/layout.tsx`

**Acceptance Criteria**:
- Single `WorkspaceProvider` instance in the React tree (use React DevTools to verify)
- Workspace switcher still works on all dashboard routes
- No workspace API call fires on non-dashboard routes

**Testing Requirements**:
- E2E: navigate to landing, then dashboard — verify workspace fetch fires only once
- `test_comprehensive.py` passes (workspace endpoints still functional)

---

### TASK-1.7 — Fix Payment Success Redirect

**Category**: Frontend · Bug fix

**Problem**: `window.location.href = '/dashboard/billing?payment=success'` on payment success loses React state and SWR cache.

**Exact Tasks**:
1. Replace `window.location.href` with `router.push('/dashboard/billing?payment=success')`.
2. Immediately after `router.push`, call `mutate('/api/subscription-status')` and `mutate('/api/check-credits')` to invalidate SWR cache.
3. Remove any `window.location` usages from `billing/page.tsx`.

**Dependencies**: None

**Estimated Effort**: 1 hour

**Files Affected**:
- `frontend/src/app/dashboard/billing/page.tsx`

**Acceptance Criteria**:
- No `window.location.href` in `billing/page.tsx`
- After payment, subscription status updates without full page reload
- SWR cache shows updated plan on all tabs

**Testing Requirements**:
- Manual: complete a test payment flow; verify plan updates in-place
- E2E: stub Razorpay success callback; verify `router.push` called with correct path

---

### TASK-1.8 — Remove Dead Commented Code from Billing Page

**Category**: Frontend · Code quality

**Problem**: 106 lines of commented-out portal management and credit purchase code ship in the production bundle.

**Exact Tasks**:
1. Delete all block-commented code from `billing/page.tsx` (portal management section, credit purchase section).
2. If credit purchase is a planned feature, move to a feature branch `feat/credit-top-up`.

**Dependencies**: None

**Estimated Effort**: 30 minutes

**Files Affected**:
- `frontend/src/app/dashboard/billing/page.tsx`

**Acceptance Criteria**:
- No commented-out code blocks in `billing/page.tsx`
- File size reduced by at least 3KB

**Testing Requirements**:
- Billing page loads and renders correctly
- Upgrade flow still functional

---

### TASK-1.9 — Razorpay Webhook Idempotency

**Category**: Backend · Security / Reliability

**Problem**: Razorpay retries webhooks on timeout. The current handler has no idempotency check, allowing duplicate subscription state writes.

**Exact Tasks**:
1. In `app/routers/billing.py` webhook handler: Extract `razorpay_event_id` from the webhook payload header (`X-Razorpay-Event-Id`).
2. Check Redis for key `webhook:{event_id}`. If exists, return `HTTP 200` immediately (idempotent success).
3. After processing: `SET webhook:{event_id} "processed" EX 86400` (24-hour TTL).
4. Wrap the check + set in an atomic operation (Redis `SET NX`).

**Dependencies**: TASK-1.1 (cache/Redis access pattern)

**Estimated Effort**: 2–3 hours

**Files Affected**:
- `app/routers/billing.py`
- `tests/test_security.py`

**Acceptance Criteria**:
- Sending the same webhook event ID twice returns 200 on both but writes DB only once
- `webhook:{event_id}` key visible in Redis after first event
- No duplicate `user_subscriptions` writes on replay

**Testing Requirements**:
- Add test in `test_security.py`: send same webhook payload twice; assert DB write called exactly once
- Test webhook signature verification still enforced before idempotency check

---

### TASK-1.10 — Fix `useSubscriptionStatus` HTTP Method

**Category**: Frontend · Performance

**Problem**: `useSubscriptionStatus` fires `POST /api/subscription-status` with empty body `{}`. POST bypasses HTTP caching; semantically wrong for a read.

**Exact Tasks**:
1. In `frontend/src/lib/hooks.ts`: Change `useSubscriptionStatus` SWR fetcher from POST to GET.
2. In `app/routers/billing.py`: Change `/api/subscription-status` from `@router.post` to `@router.get`. Move `access_token` from request body to `Authorization` header (already supported).
3. Update all callers that pass `access_token` in the body to use the `Authorization: Bearer {token}` header instead.

**Dependencies**: None

**Estimated Effort**: 2 hours

**Files Affected**:
- `frontend/src/lib/hooks.ts`
- `app/routers/billing.py`
- `tests/test_router.py`

**Acceptance Criteria**:
- `GET /api/subscription-status` returns identical payload to previous POST
- HTTP response is cacheable (no `Cache-Control: no-store`)
- Browser DevTools shows GET, not POST

**Testing Requirements**:
- Update `test_router.py` subscription status test to use GET
- Run full test suite

---

### Phase 1 — Exit Criteria

- [ ] All 184 backend tests pass
- [ ] No `sys.modules` reference in `app/`
- [ ] `framer-motion` absent from `package.json`
- [ ] No `window.location.href` in `billing/page.tsx`
- [ ] Webhook idempotency verified by test
- [ ] No visual regression on any page

---

---

## Phase 2 — Architecture Restructure

> **Duration**: 3 weeks (Weeks 3–5)  
> **Goal**: Feature-based file structure. All large files decomposed. Pages become thin orchestrators (<100 lines each). Backend routers scoped to single endpoint families.

---

### TASK-2.1 — Create Feature Directory Structure

**Category**: Frontend · Architecture

**Exact Tasks**:
1. Create the following top-level directory tree under `frontend/src/`:
   ```
   features/
   ├── translate/        _hooks/ _constants/ _types/ _components/
   ├── overview/         _components/ _hooks/
   ├── billing/          _components/ _hooks/
   ├── history/          _components/ _hooks/
   ├── settings/         _components/
   ├── team/             _components/
   ├── onboarding/       _components/
   ├── shell/            Sidebar/
   ├── auth/             _hooks/
   └── landing/          _sections/ _canvas/ _cursor/ _transitions/ _hooks/
   components/
   ├── ui/               (shadcn — do not touch)
   ├── editors/
   ├── charts/
   ├── overlays/
   └── motion/
   design/
   ├── tokens/
   ├── css/
   └── primitives/
   types/
   ```
2. Create placeholder `index.ts` files in each leaf directory.

**Dependencies**: Phase 1 complete

**Estimated Effort**: 1 hour

**Files Affected**: New directories only

**Acceptance Criteria**:
- Directory tree matches the target structure from the Engineering Specification §13
- TypeScript project compiles with no errors after directory creation
- No existing files moved yet

---

### TASK-2.2 — Extract Translate Feature Constants

**Category**: Frontend · Architecture

**Exact Tasks**:
1. Create `features/translate/_constants/languages.ts` — move the `languages[]` array, `EXT_TO_LANGUAGE` map, and `ACCEPTED_EXTENSIONS` set from `translate/page.tsx`.
2. Create `features/translate/_constants/modes.ts` — move the `modes[]` array with icons and API endpoints.
3. Create `features/translate/_types/index.ts` — define `TranslationBlock`, `TranslationMode`, `FileImportResult` TypeScript interfaces.
4. Update imports in `translate/page.tsx` to reference new paths.

**Dependencies**: TASK-2.1

**Estimated Effort**: 2 hours

**Files Affected**:
- `frontend/src/app/dashboard/translate/page.tsx` (import updates)
- `frontend/src/features/translate/_constants/languages.ts` [NEW]
- `frontend/src/features/translate/_constants/modes.ts` [NEW]
- `frontend/src/features/translate/_types/index.ts` [NEW]

**Acceptance Criteria**:
- `translate/page.tsx` has zero inline constant arrays
- `languages.ts` exports the 35-entry array with full type annotations
- TypeScript compiles without errors

**Testing Requirements**:
- E2E: language selector shows all 35 options
- Mode switcher shows all 3 modes

---

### TASK-2.3 — Extract Translate Hooks

**Category**: Frontend · Architecture (Highest-Risk Item)

**Exact Tasks**:
1. Create `features/translate/_hooks/useTranslationStream.ts`:
   - Move SSE streaming logic: `EventSource` setup, `streamBufferRef`, `requestAnimationFrame` flush (preserve exactly)
   - Export: `{ streamText, isStreaming, isComplete, error, blocks, startStream, stopStream, reset }`
   - Preserve `AbortController` cleanup on unmount
2. Create `features/translate/_hooks/useFileImport.ts`:
   - Move `react-dropzone` config, file validation, extension→language mapping
   - Move GitHub Gist import logic (API call to `/api/import-gist`)
   - Export: `{ isDragActive, importedContent, importedLanguage, importError, getRootProps, getInputProps, importGist, clearImport }`
3. Create `features/translate/_hooks/useLanguageDetection.ts`:
   - Move `detectLanguage()` with all 7 regex heuristics (Python, TypeScript, JavaScript, Rust, C++, Go, Java)
   - Export: `{ detectedLanguage, detectLanguage }`
4. Create `features/translate/_hooks/useTranslationSession.ts`:
   - Move block editing state, English edit toggle, sync-back orchestration (`/api/sync-english-to-code` call)
   - Export: `{ editedBlocks, editingBlockId, isSyncing, syncedCode, setEditingBlock, updateBlockEdit, syncEnglishToCode }`

**Dependencies**: TASK-2.2

**Estimated Effort**: 8–12 hours

**Files Affected**:
- `frontend/src/app/dashboard/translate/page.tsx` (shrinks significantly)
- `frontend/src/features/translate/_hooks/useTranslationStream.ts` [NEW]
- `frontend/src/features/translate/_hooks/useFileImport.ts` [NEW]
- `frontend/src/features/translate/_hooks/useLanguageDetection.ts` [NEW]
- `frontend/src/features/translate/_hooks/useTranslationSession.ts` [NEW]

**Acceptance Criteria**:
- All 4 hooks are independently importable
- `translate/page.tsx` is <600 lines after extraction (all 4 hooks removed)
- All existing translate functionality works identically
- `streamBufferRef` + `rAF` flush pattern preserved exactly in `useTranslationStream`

**Testing Requirements**:
- E2E full translate flow: paste code → translate → see blocks → edit English → sync back → see diff
- Unit test `useLanguageDetection`: assert each of 7 languages detected from sample snippet
- Unit test `useTranslationSession`: mock sync API; assert `isSyncing` state transitions

---

### TASK-2.4 — Extract Translate Components

**Category**: Frontend · Architecture

**Exact Tasks** (extract in this order to manage dependencies):
1. `BlockCard/index.tsx` + `EnglishEditor.tsx` + `BlockActions.tsx` — extract from `translate/page.tsx`
2. `OutputPanel/index.tsx` + `StreamingView.tsx` + `BlocksView.tsx` + `DiffView.tsx`
3. `InputPanel/index.tsx` + `MonacoInput.tsx` + `ModeSelector.tsx` + `FileDropzone.tsx`
4. `Toolbar/index.tsx` + `DownloadButton.tsx` + `CopyButton.tsx` + `ShareButton.tsx` + `SyncButton.tsx`
5. `TranslateShell.tsx` — two-panel layout wrapper

**Dependencies**: TASK-2.3

**Estimated Effort**: 12–16 hours

**Files Affected**:
- `frontend/src/app/dashboard/translate/page.tsx`
- 14 new files under `frontend/src/features/translate/_components/`

**Acceptance Criteria**:
- `translate/page.tsx` is <200 lines; imports from `features/translate` only
- No feature file in `_components/` exceeds 200 lines
- Monaco Editor dynamic import preserved in `MonacoInput.tsx`
- DiffEditor preserved in `DiffView.tsx`
- PostHog analytics events (`translation_started`, `translation_completed`, etc.) all still fire

**Testing Requirements**:
- E2E translate page: all 3 modes work; file drop works; Gist import works; diff view opens after sync
- Run E2E tests after each component extraction, not just at the end

---

### TASK-2.5 — Rebuild Translate Page Entry

**Category**: Frontend · Architecture

**Exact Tasks**:
1. Rewrite `frontend/src/app/dashboard/translate/page.tsx` to <200 lines.
2. It should only: compose `useTranslationStream`, `useFileImport`, `useLanguageDetection`, `useTranslationSession`, and render `<TranslateShell>` with all props.
3. No business logic, no constants, no inline components.

**Dependencies**: TASK-2.4

**Estimated Effort**: 2–3 hours

**Files Affected**:
- `frontend/src/app/dashboard/translate/page.tsx`

**Acceptance Criteria**:
- File is <200 lines
- Contains only imports, hook calls, and JSX return
- TypeScript compilation passes

**Testing Requirements**:
- Full E2E translate suite passes
- Bundle analyzer shows no unintended code duplication

---

### TASK-2.6 — Extract Shell Components

**Category**: Frontend · Architecture

**Exact Tasks**:
1. Create `features/shell/DashboardLayout.tsx` (~80 lines) — thin layout entry.
2. Create `features/shell/Sidebar/index.tsx` — desktop sidebar + collapse button.
3. Create `features/shell/Sidebar/MobileSidebar.tsx` — mobile Sheet drawer.
4. Create `features/shell/Sidebar/SidebarContent.tsx` — nav links + bottom section.
5. Create `features/shell/Sidebar/WorkspaceSwitcher.tsx` — dropdown workspace picker.
6. Create `features/shell/Sidebar/UserCard.tsx` — avatar + email + plan badge.
7. Create `features/shell/Sidebar/UpgradeCTA.tsx` — upgrade prompt for free users.
8. Create `features/shell/NavLink.tsx` — shared active-state nav link.
9. Update `frontend/src/app/dashboard/layout.tsx` to import `<DashboardLayout>` only (~10 lines).

**Dependencies**: TASK-2.1

**Estimated Effort**: 6–8 hours

**Files Affected**:
- `frontend/src/app/dashboard/layout.tsx`
- 8 new files under `frontend/src/features/shell/`

**Acceptance Criteria**:
- `dashboard/layout.tsx` is <20 lines
- Sidebar collapses correctly on desktop (224px ↔ 60px)
- Mobile drawer opens/closes
- Workspace switcher populates from `WorkspaceContext`

**Testing Requirements**:
- E2E: navigate between all dashboard routes; verify sidebar active state correct
- Mobile viewport E2E: drawer opens and closes

---

### TASK-2.7 — Extract Overview Components

**Category**: Frontend · Architecture

**Exact Tasks**:
1. Create `features/overview/index.tsx` — page orchestrator (~100 lines).
2. Create `features/overview/_components/StatCards.tsx` — 4 stat cards, data-driven.
3. Create `features/overview/_components/QuotaRing.tsx` — SVG radial progress `{used, total, isPro}`.
4. Create `features/overview/_components/ActivityChart.tsx` — 7-day bar chart.
5. Create `features/overview/_components/RecentTranslations.tsx` — last 5, skeleton fallback.
6. Create `features/overview/_hooks/useOverviewData.ts` — SWR composition; derives `weekActivity`, `statCards`.
7. Update `frontend/src/app/dashboard/page.tsx` to import `<OverviewPage>` only.

**Dependencies**: TASK-2.1

**Estimated Effort**: 4–6 hours

**Files Affected**:
- `frontend/src/app/dashboard/page.tsx`
- 5 new files under `frontend/src/features/overview/`

**Acceptance Criteria**:
- `dashboard/page.tsx` is <20 lines
- All stat cards render with live data
- Quota ring animates on mount

**Testing Requirements**:
- E2E: dashboard overview renders without errors for free and pro user sessions
- Unit test `useOverviewData`: mock SWR responses; assert derived `statCards` computed correctly

---

### TASK-2.8 — Extract Billing Components

**Category**: Frontend · Architecture

**Exact Tasks**:
1. Create `features/billing/index.tsx` — page orchestrator (~80 lines).
2. Create `features/billing/_components/CurrentPlanCard.tsx` — plan info + usage bar.
3. Create `features/billing/_components/UpgradeCard.tsx` — free user upgrade prompt.
4. Create `features/billing/_components/ProActiveCard.tsx` — confirmation for pro users.
5. Create `features/billing/_components/PaymentStatusBanner.tsx` — success/cancel banner.
6. Create `features/billing/_hooks/useRazorpay.ts` — `handleUpgrade()`, Razorpay modal orchestration, `verify-payment` call.
7. Update `frontend/src/app/dashboard/billing/page.tsx` to import `<BillingPage>` only.

**Dependencies**: TASK-1.7, TASK-2.1

**Estimated Effort**: 4–5 hours

**Files Affected**:
- `frontend/src/app/dashboard/billing/page.tsx`
- 6 new files under `frontend/src/features/billing/`

**Acceptance Criteria**:
- `billing/page.tsx` is <20 lines
- Razorpay modal still opens; payment verification still works
- No `window.location.href` (already fixed in Phase 1)

**Testing Requirements**:
- Manual: trigger billing page; verify plan card renders; verify upgrade button calls `useRazorpay.handleUpgrade`

---

### TASK-2.9 — Decompose Backend Translate Router

**Category**: Backend · Architecture

**Exact Tasks**:
1. Create `app/routers/_translate/` package with `__init__.py`.
2. Create `validators.py` — move `sanitise_input()`, `validate_code_input()`, extension/language maps.
3. Create `code_to_english.py` — move `/api/code-to-english` (SSE) + `/api/code-to-english/sync` endpoints.
4. Create `english_to_code.py` — move `/api/generate-from-english` + `/api/english-to-code` endpoints.
5. Create `code_to_code.py` — move `/api/code-to-code` (SSE) endpoint.
6. Create `sync.py` — move `/api/sync-english-to-code` endpoint.
7. Create `file_upload.py` — move `/api/upload-file` endpoint.
8. Reduce `app/routers/translate.py` to router registration only (~40 lines).

**Dependencies**: TASK-1.1

**Estimated Effort**: 4–6 hours

**Files Affected**:
- `app/routers/translate.py`
- 6 new files under `app/routers/_translate/`

**Acceptance Criteria**:
- `translate.py` is ≤80 lines
- No sub-module file exceeds 150 lines
- All 7 translate endpoints still respond correctly
- All backend tests pass

**Testing Requirements**:
- Run `test_api.py`, `test_streaming.py`, `test_validation.py`, `test_security.py`

---

### TASK-2.10 — Decompose Backend Quota Module

**Category**: Backend · Architecture

**Exact Tasks**:
1. Create `app/core/quota/` package.
2. Create `enforcement.py` — `enforce_quotas_and_protection()`, `check_free_tier_limit()`.
3. Create `limits.py` — `get_user_limits_and_cooldown()`, `get_active_protection_mode()`.
4. Create `credits.py` — `get_user_credits()`, `deduct_credit()`.
5. Create `platform.py` — `increment_platform_daily_usage()`, `get_platform_daily_usage()`.
6. Create `history.py` — `save_translation_background()`, `get_today_usage_count()`.
7. Create `__init__.py` — re-exports `enforce_quotas_and_protection`, `record_successful_completion`.
8. Delete `app/core/quota.py`.

**Dependencies**: TASK-1.1

**Estimated Effort**: 4–5 hours

**Files Affected**:
- `app/core/quota.py` [DELETE]
- 6 new files under `app/core/quota/`
- All routers that import from `quota.py`

**Acceptance Criteria**:
- `quota.py` (old file) deleted
- All quota functions re-exported from `quota/__init__.py`
- No router needs to change its import path (only `from app.core.quota import ...`)

**Testing Requirements**:
- Run `test_comprehensive.py` — all quota enforcement tests pass
- Run `test_launch_resilience.py`

---

### TASK-2.11 — Update All Import Paths + Validate

**Category**: Frontend + Backend · Architecture

**Exact Tasks**:
1. Frontend: Run `tsc --noEmit` to find all broken imports.
2. Fix all broken import paths from features moved in TASK-2.2–2.8.
3. Backend: Verify with `python -c "from app.routers.translate import router"` and equivalent for all modules.
4. Run both test suites to confirm green.

**Dependencies**: TASK-2.2 through TASK-2.10

**Estimated Effort**: 2–3 hours

**Files Affected**: Any file with broken imports (discovered by compiler)

**Acceptance Criteria**:
- `tsc --noEmit` exits 0
- `pytest` exits 0
- `next build` exits 0

---

### TASK-2.12 — Update E2E Tests for New Structure

**Category**: Frontend · Testing

**Exact Tasks**:
1. Review `frontend/e2e/anuvaad.spec.ts` for any selectors that depend on old file structure.
2. Verify `window.__monacoEditor` is still exposed in the new `MonacoInput.tsx`.
3. Update any failing selectors.
4. Run full Playwright suite and achieve green.

**Dependencies**: TASK-2.5

**Estimated Effort**: 2–4 hours

**Files Affected**:
- `frontend/e2e/anuvaad.spec.ts`
- `frontend/src/features/translate/_components/InputPanel/MonacoInput.tsx`

**Acceptance Criteria**:
- All E2E tests pass against the new structure
- `window.__monacoEditor` still accessible from E2E context

**Testing Requirements**:
- `npx playwright test` — full suite green

---

### Phase 2 — Exit Criteria

- [ ] All 184 backend tests pass unchanged
- [ ] All Playwright E2E tests pass
- [ ] No file in `src/app/dashboard/` exceeds 100 lines
- [ ] No file in `src/features/` exceeds 300 lines
- [ ] No file in `app/routers/` main files exceeds 80 lines
- [ ] TypeScript compiles with 0 errors

---

---

## Phase 3 — Design System + Motion Engine

> **Duration**: 4 weeks (Weeks 6–9)  
> **Goal**: Token-based CSS architecture. Split 884-line `globals.css` into route-scoped files. Replace dual animation libraries with GSAP-only motion primitives. Add `prefers-reduced-motion` compliance.

---

### TASK-3.1 — Create Design Token Files

**Category**: Frontend · Design System

**Exact Tasks**:
1. Create `frontend/src/design/tokens/color.css` — full 6-tier color hierarchy:
   - Tier 1: `--amber-{50–900}`, `--void-{50–900}`, `--neutral-{50–900}` primitives
   - Tier 2: `--surface-base` through `--surface-overlay` semantic tokens
   - Tier 3: `--border-faint` through `--border-focus`
   - Tier 4: `--text-primary` through `--text-on-brand`
   - Tier 5: `--glow-xs` through `--glow-lg`
   - Tier 6: `--status-success`, `--status-warning`, `--status-danger`, `--status-info`
2. Create `frontend/src/design/tokens/typography.css` — font families + full Major Third scale (`--text-2xs` through `--text-hero`) + line heights + letter spacing.
3. Create `frontend/src/design/tokens/spacing.css` — 4px-base grid spacing scale.
4. Create `frontend/src/design/tokens/radius.css` — `--radius-sm` through `--radius-4xl`.
5. Create `frontend/src/design/tokens/shadow.css` — shadow + glow token values.
6. Create `frontend/src/design/tokens/animation.css` — duration, easing, stagger tokens.
7. Create `frontend/src/design/tokens/z-index.css` — `--z-canvas`, `--z-base`, `--z-overlay`, `--z-cursor`.
8. Create `frontend/src/design/css/tokens.css` — `@import` all 7 token files.

**Dependencies**: Phase 2 complete

**Estimated Effort**: 6–8 hours

**Files Affected**: 8 new files under `frontend/src/design/tokens/` and `frontend/src/design/css/`

**Acceptance Criteria**:
- All CSS custom properties from current `globals.css` have a corresponding token
- Token hierarchy: primitives never used directly in components (only semantic aliases)
- `tokens.css` imports all 7 files in correct order

**Testing Requirements**:
- Visual snapshot: compute `getComputedStyle(document.documentElement)` in browser and assert tokens resolve correctly

---

### TASK-3.2 — Split `globals.css` into Route-Scoped Files

**Category**: Frontend · Design System · Performance

**Exact Tasks**:
1. Create `frontend/src/design/css/base.css` — `@layer base`: reset, body, scrollbar, focus-visible.
2. Create `frontend/src/design/css/animations.css` — all 25+ `@keyframe` definitions from current `globals.css`.
3. Create `frontend/src/design/css/utilities.css` — semantic utility classes: `.glass-amber`, `.glass-dark`, `.glass-apple`, `.premium-card`, `.btn-amber-shimmer`, `.headline-gradient`, etc.
4. Create `frontend/src/design/css/components.css` — component-level styles: `.terminal-panel`, `.status-dot`, `.progress-bar`, `.typing-dot`, etc.
5. Create `frontend/src/design/css/landing.css` — aurora orbs, marquee, scan-line, perspective rules.
6. Create `frontend/src/design/css/dashboard.css` — sidebar glow, `animate-block-in`, progress bar, typing-dots.
7. Create `frontend/src/design/css/auth.css` — auth-bg radial gradients.
8. Rewrite `frontend/src/app/globals.css` to only `@import base.css + tokens.css + utilities.css + components.css` (~50 lines total).
9. Add `frontend/src/app/dashboard/layout.css` with `@import dashboard.css`.
10. Add route-segment CSS import for auth routes.
11. Add `landing.css` import within `features/landing/LandingPage.tsx`.

**Dependencies**: TASK-3.1

**Estimated Effort**: 8–10 hours

**Files Affected**:
- `frontend/src/app/globals.css` (rewritten to <60 lines)
- 7 new files under `frontend/src/design/css/`
- `frontend/src/app/dashboard/layout.css` [NEW]

**Acceptance Criteria**:
- `globals.css` is <60 lines
- Zero visual difference on any route (landing, auth, dashboard)
- Dashboard routes do not load landing CSS (verify via DevTools network tab)
- `@keyframes` load only when the relevant route is visited

**Testing Requirements**:
- Visual regression: Playwright screenshots before/after on all 3 route segments (landing, auth, dashboard)
- `next build` exits 0

---

### TASK-3.3 — Create Design Primitive Components

**Category**: Frontend · Design System

**Exact Tasks**:
1. `design/primitives/Surface.tsx` — semantic surface wrapper `{level: 0|1|2|'elevated'}` applying `--surface-low/mid/high/overlay`.
2. `design/primitives/GlassPanel.tsx` — glassmorphism panel `{level: 'amber'|'dark'|'apple'}`.
3. `design/primitives/GlowBorder.tsx` — animated amber border wrapper with box-shadow glow.
4. `design/primitives/CodeSurface.tsx` — dark monospace code block surface (`.terminal-panel`).
5. `design/primitives/AmberBadge.tsx` — amber pill badge with optional icon.
6. `design/primitives/StatusDot.tsx` — animated presence indicator (online/offline ping).
7. `design/primitives/TypographyProse.tsx` — Lora italic wrapper for English translation output.

**Dependencies**: TASK-3.2

**Estimated Effort**: 4–6 hours

**Files Affected**: 7 new files under `frontend/src/design/primitives/`

**Acceptance Criteria**:
- Each primitive is independently importable and renders without errors
- CVA variants used for compound variants (e.g., GlassPanel level)
- No hardcoded hex values — only token variables

**Testing Requirements**:
- Storybook snapshot (if applicable) or visual review of each primitive in isolation

---

### TASK-3.4 — Create Motion Infrastructure

**Category**: Frontend · Motion System

**Exact Tasks**:
1. Create `frontend/src/lib/motion.ts`:
   - `motionConfig` const: ease presets, duration scale, stagger steps
   - `useMotionSafe(): boolean` — returns `false` if `prefers-reduced-motion: reduce`
   - `useGsapContext(ref: RefObject<HTMLElement>): gsap.Context` — scoped GSAP context, auto-reverts on unmount
2. Add CSS animation token variables to `design/tokens/animation.css`:
   - `--dur-instant: 50ms`, `--dur-fast: 150ms`, `--dur-normal: 300ms`, etc.
   - `--ease-out-expo`, `--ease-out-back`, `--ease-in-out`, `--ease-spring`
   - `--stagger-xs: 40ms`, `--stagger-sm: 60ms`, `--stagger-md: 100ms`, `--stagger-lg: 160ms`

**Dependencies**: TASK-3.1

**Estimated Effort**: 3–4 hours

**Files Affected**:
- `frontend/src/lib/motion.ts` [NEW]
- `frontend/src/design/tokens/animation.css`

**Acceptance Criteria**:
- `useMotionSafe()` returns `false` when `prefers-reduced-motion: reduce` is set in browser
- `useGsapContext` auto-reverts GSAP animations on component unmount (no animation leaks)
- `motionConfig` values match the Engineering Specification §5.4

---

### TASK-3.5 — Create Motion Primitive Components

**Category**: Frontend · Motion System

**Exact Tasks**:
1. `components/motion/FadeIn.tsx` — opacity 0→1; accepts `{delay, duration, from}`.
2. `components/motion/SlideUp.tsx` — opacity 0→1 + y 20→0; accepts `{delay}`.
3. `components/motion/RevealText.tsx` — GSAP SplitText char/word reveal; accepts `{by: 'char'|'word'}`.
4. `components/motion/StaggerContainer.tsx` — GSAP stagger scope; accepts `{stagger, from}`.
5. `components/motion/MagneticButton.tsx` — mouse-proximity spring pull on CTAs.
6. `components/motion/ParallaxLayer.tsx` — scroll-driven y translation via ScrollTrigger.
7. `components/motion/CountUp.tsx` — animated number counter to target value.
8. `components/motion/GlowIn.tsx` — box-shadow 0 → `var(--glow-md)` on mount.
9. `components/motion/TextScramble.tsx` — cyberpunk character scramble reveal.
10. `components/motion/PageTransition.tsx` — GSAP clip-path wipe on route change.
11. `components/motion/ReducedMotion.tsx` — wraps children; strips all animations if `prefers-reduced-motion`.

**Dependencies**: TASK-3.4

**Estimated Effort**: 10–14 hours

**Files Affected**: 11 new files under `frontend/src/components/motion/`

**Acceptance Criteria**:
- All components use `useMotionSafe()` before registering GSAP animations
- All CSS keyframes wrapped in `@media (prefers-reduced-motion: no-preference) { ... }`
- `ReducedMotion` component renders children without animation when media query matches
- No Framer Motion imports anywhere (already removed in Phase 1)

**Testing Requirements**:
- Unit test each primitive: render → animate → assert final state
- `prefers-reduced-motion` media query test for `ReducedMotion` component

---

### TASK-3.6 — Migrate Dashboard Animations to Motion Primitives

**Category**: Frontend · Motion System

**Exact Tasks**:
1. Replace inline animation styles in `features/overview/_components/StatCards.tsx` with `<SlideUp stagger>`.
2. Replace quota ring mount animation with `<GlowIn>` + CSS transition preserved.
3. Replace activity bar height transition with CSS `animation-fill-mode: forwards` token-driven version.
4. Replace `animate-fade-up` ad-hoc classes with `<FadeIn>` component where appropriate.
5. Use `<CountUp>` for stat card numeric values.
6. Replace `AnimatePresence` (Framer Motion, if any remaining) with GSAP-based equivalent.

**Dependencies**: TASK-3.5, TASK-2.7

**Estimated Effort**: 4–6 hours

**Files Affected**:
- `frontend/src/features/overview/_components/StatCards.tsx`
- `frontend/src/features/overview/_components/ActivityChart.tsx`
- `frontend/src/features/overview/_components/QuotaRing.tsx`
- `frontend/src/features/translate/_components/BlockCard/index.tsx`

**Acceptance Criteria**:
- All dashboard animations use motion primitives
- No inline `animation: ...` style props remain
- `prefers-reduced-motion: reduce` disables all dashboard animations

**Testing Requirements**:
- Visual: dashboard overview animations play correctly
- Accessibility: set `prefers-reduced-motion: reduce` in OS; confirm no movement

---

### Phase 3 — Exit Criteria

- [ ] `globals.css` < 60 lines
- [ ] All 25+ `@keyframes` in `animations.css`, not `globals.css`
- [ ] Zero hardcoded hex colors in component files (only token vars)
- [ ] All dashboard animations use motion primitives
- [ ] `prefers-reduced-motion: reduce` disables all keyframe animations
- [ ] GSAP is the only animation library (no Framer Motion)
- [ ] Zero visual regression on any route

---

---

## Phase 4 — Dashboard Redesign

> **Duration**: 4 weeks (Weeks 10–13)  
> **Goal**: Production-quality dashboard UI. Error boundaries. Per-route loading states. Rebuilt translate UI, dashboard overview, onboarding flow, billing, and sidebar.

---

### TASK-4.1 — Add Error Boundaries to All Dashboard Routes

**Category**: Frontend · Reliability

**Exact Tasks**:
1. Create `frontend/src/components/ui/ErrorCard.tsx` — friendly error display with retry button.
2. Wrap each dashboard route's feature page with:
   ```tsx
   <ErrorBoundary fallback={({ error, reset }) => <ErrorCard title="..." description={error.message} onRetry={reset} />}>
     <Suspense fallback={<RouteSkeleton />}>
       <FeaturePage />
     </Suspense>
   </ErrorBoundary>
   ```
3. Install or implement a lightweight `ErrorBoundary` class component (React doesn't have a hook-based one).
4. Add Sentry `captureException` inside the ErrorBoundary `componentDidCatch`.

**Dependencies**: Phase 2 complete

**Estimated Effort**: 3–4 hours

**Files Affected**:
- `frontend/src/app/dashboard/layout.tsx`
- `frontend/src/components/ui/ErrorCard.tsx` [NEW]
- Potentially all dashboard page files if per-page boundaries needed

**Acceptance Criteria**:
- Throwing an error inside any dashboard feature page shows `ErrorCard`, not white screen
- "Retry" button calls `reset()` which triggers re-render
- Sentry captures the error with stack trace

**Testing Requirements**:
- Unit test: render a component that throws; verify ErrorCard appears
- E2E: inject error via `page.evaluate(() => { throw new Error('test') })`; verify ErrorCard shows

---

### TASK-4.2 — Add Per-Route `loading.tsx` Files

**Category**: Frontend · Performance

**Exact Tasks**:
1. Create `frontend/src/app/dashboard/loading.tsx` — root dashboard skeleton.
2. Create `frontend/src/app/dashboard/translate/loading.tsx` — Monaco skeleton (left panel) + output skeleton (right panel).
3. Create `frontend/src/app/dashboard/history/loading.tsx` — 5-row list skeleton.
4. Create `frontend/src/app/dashboard/billing/loading.tsx` — 2-card skeleton.
5. Create `frontend/src/app/dashboard/settings/loading.tsx`.
6. Create `frontend/src/app/dashboard/team/loading.tsx`.
7. Each skeleton uses `<Skeleton>` from shadcn/ui, styled to match the target layout.

**Dependencies**: TASK-4.1

**Estimated Effort**: 3–4 hours

**Files Affected**: 6 new `loading.tsx` files under dashboard routes

**Acceptance Criteria**:
- Navigating to any dashboard route shows skeleton before content
- Skeleton layout matches the final content layout (no layout shift)
- App Router streaming SSR works for server-fetchable data

**Testing Requirements**:
- Throttle network in DevTools; navigate to each route; verify skeleton appears

---

### TASK-4.3 — Redesign Translate Page UI

**Category**: Frontend · Product Design

**Exact Tasks**:
1. **Mode selector**: Replace current mode switcher with pill tabs; add GSAP ink-slide underline animation (`ModeSelector.tsx` using `motionConfig`).
2. **Panel layout**: Full-width two-panel layout; no `max-width` container; left (Monaco) and right (output) at 50/50 on desktop, stacked on mobile.
3. **Language picker**: Move to top-right corner of Monaco panel.
4. **File drop**: Entire left panel is the drop zone; `isDragActive` shows overlay (no separate Dropzone component visible when idle).
5. **Streaming view**: Add scan-line animation during SSE stream (`StreamingView.tsx`).
6. **Block cards** (TASK-4.5): `CodeSurface` on top + amber 1px rule + `TypographyProse` (Lora italic) English below.
7. **Toolbar**: Bottom bar with `DownloadButton`, `CopyButton`, `ShareButton`, `SyncButton` — icon + label at ≥768px; icon-only on mobile.

**Dependencies**: TASK-2.4, TASK-3.3, TASK-3.5

**Estimated Effort**: 8–12 hours

**Files Affected**:
- `frontend/src/features/translate/_components/TranslateShell.tsx`
- `frontend/src/features/translate/_components/InputPanel/ModeSelector.tsx`
- `frontend/src/features/translate/_components/InputPanel/MonacoInput.tsx`
- `frontend/src/features/translate/_components/OutputPanel/StreamingView.tsx`
- `frontend/src/features/translate/_components/Toolbar/index.tsx`

**Acceptance Criteria**:
- Ink-slide animation on mode tab change (GSAP, <300ms)
- Full-width layout on desktop with correct overflow handling for Monaco
- Drag-and-drop overlay covers entire left panel on `isDragActive`
- Scan-line animation visible during SSE stream

**Testing Requirements**:
- E2E: all 3 modes translate correctly with new layout
- Responsive: test at 375px, 768px, 1280px breakpoints

---

### TASK-4.4 — Redesign Block Cards

**Category**: Frontend · Product Design

**Exact Tasks**:
1. Redesign `BlockCard/index.tsx`:
   - Top section: `<CodeSurface>` with monospace code snippet; language label badge top-right
   - Middle: 1px solid `var(--border-default)` amber rule divider
   - Bottom: `<TypographyProse>` (Lora italic) with English translation
2. `EnglishEditor.tsx`: Click-to-edit inline textarea; auto-height; debounced `updateBlockEdit`.
3. `BlockActions.tsx`: Copy code · Copy English · Edit toggle · Share (icon buttons, tooltip on hover).
4. Add `animate-block-in` CSS stagger from Phase 1 (already done) — verify it's applied.

**Dependencies**: TASK-4.3, TASK-3.3

**Estimated Effort**: 4–6 hours

**Files Affected**:
- `frontend/src/features/translate/_components/BlockCard/index.tsx`
- `frontend/src/features/translate/_components/BlockCard/EnglishEditor.tsx`
- `frontend/src/features/translate/_components/BlockCard/BlockActions.tsx`

**Acceptance Criteria**:
- Block card layout: code top, amber rule, Lora italic English below
- Edit mode activates on click; textarea auto-resizes; debounce 500ms
- Copy buttons work; share button generates and copies `/share/{id}` URL

**Testing Requirements**:
- Unit test `EnglishEditor`: type content → assert `updateBlockEdit` called with debounce
- E2E: translate → click edit on block → type → sync back → verify diff view

---

### TASK-4.5 — Rebuild Dashboard Overview

**Category**: Frontend · Product Design

**Exact Tasks**:
1. Implement RSC strategy: server component fetches initial stats; client component handles animation.
2. `StatCards.tsx`: 4 data-driven cards; `<CountUp>` on numeric values; `<SlideUp>` stagger entrance.
3. `QuotaRing.tsx`: SVG radial progress; color transitions green→amber→red based on usage %; `stroke-dashoffset` animated on mount.
4. `ActivityChart.tsx`: 7 SVG bars; height 0→value transition on mount (700ms); hover tooltip.
5. `RecentTranslations.tsx`: last 5 translations; mode badge + language pair + timestamp + view link; `<Skeleton>` during loading.
6. Quick Actions row: 3 small link cards for 3 translation modes.
7. CSS Grid layout: 2 columns md+; 1 column mobile.

**Dependencies**: TASK-2.7, TASK-3.5, TASK-4.2

**Estimated Effort**: 6–8 hours

**Files Affected**:
- `frontend/src/features/overview/index.tsx`
- `frontend/src/features/overview/_components/StatCards.tsx`
- `frontend/src/features/overview/_components/QuotaRing.tsx`
- `frontend/src/features/overview/_components/ActivityChart.tsx`
- `frontend/src/features/overview/_components/RecentTranslations.tsx`

**Acceptance Criteria**:
- All 4 stat cards render with correct values from SWR
- Quota ring animates to current usage percentage on mount
- 7-day activity chart bars animate height on mount
- Recent translations list shows skeleton during load, then populates

**Testing Requirements**:
- E2E: free user dashboard shows quota ring; pro user shows "Unlimited"
- Unit test `useOverviewData`: assert `statCards` and `weekActivity` derived correctly from mock SWR data

---

### TASK-4.6 — Redesign Sidebar

**Category**: Frontend · Product Design

**Exact Tasks**:
1. Desktop sidebar: always-visible 60px icon rail; hover/click to expand to 224px with labels.
2. Active nav link: left 3px amber inset border + subtle amber glow + text amber.
3. User card: avatar-only in collapsed; expand to show avatar + email + plan badge; click → popover with Settings + Sign Out.
4. Upgrade CTA (free users): collapsed → amber gem icon with tooltip; expanded → card with usage bar and "Upgrade" button + shimmer border animation.
5. Mobile: hamburger → full-width Sheet drawer; same content as expanded desktop sidebar.
6. `TopBar.tsx`: sticky 48px bar; left breadcrumb, center workspace switcher, right theme toggle + user avatar menu.

**Dependencies**: TASK-2.6, TASK-3.5

**Estimated Effort**: 6–8 hours

**Files Affected**:
- `frontend/src/features/shell/Sidebar/index.tsx`
- `frontend/src/features/shell/Sidebar/SidebarContent.tsx`
- `frontend/src/features/shell/Sidebar/UserCard.tsx`
- `frontend/src/features/shell/Sidebar/UpgradeCTA.tsx`
- `frontend/src/features/shell/TopBar.tsx` [NEW]
- `frontend/src/features/shell/NavLink.tsx`

**Acceptance Criteria**:
- Icon-only rail always visible on desktop
- Expand/collapse transition smooth (CSS `transition-all 250ms`)
- Active route correctly highlighted in all states
- Mobile drawer opens/closes; backdrop click closes

**Testing Requirements**:
- E2E: navigate all routes; verify active state; expand/collapse sidebar
- Mobile E2E (375px viewport): hamburger opens drawer

---

### TASK-4.7 — Rebuild Onboarding Flow

**Category**: Frontend · Product Design

**Exact Tasks**:
1. `features/onboarding/index.tsx`: 3-step stepper with GSAP `xPercent` slide transitions between steps.
2. `_components/Stepper.tsx`: progress bar; step 1–3 dots; animated step number.
3. `_components/StepDemo.tsx`: pre-loaded fibonacci→English example; animated `<SlideUp>` reveal.
4. `_components/StepModes.tsx`: 3 mode cards; each with animated icon + description; hover: card lifts + border glows.
5. `_components/StepLaunch.tsx`: "You're ready." heading; `<CountUp>` for developer count; "Open Translator →" CTA; confetti burst.
6. Persist step progress in `localStorage` — refresh restores current step.
7. On completion: call Supabase `updateUser({ data: { onboarded: true } })`.

**Dependencies**: TASK-3.5

**Estimated Effort**: 5–7 hours

**Files Affected**:
- `frontend/src/features/onboarding/index.tsx`
- `frontend/src/features/onboarding/_components/Stepper.tsx`
- `frontend/src/features/onboarding/_components/StepDemo.tsx`
- `frontend/src/features/onboarding/_components/StepModes.tsx`
- `frontend/src/features/onboarding/_components/StepLaunch.tsx`
- `frontend/src/app/dashboard/welcome/page.tsx`

**Acceptance Criteria**:
- Step transitions animate (GSAP slide, ~300ms)
- Step progress preserved in `localStorage` on refresh
- Confetti fires on step 3 completion
- `onboarded: true` set in Supabase user metadata after completion

**Testing Requirements**:
- E2E: complete all 3 steps; verify redirect to `/dashboard`
- Unit: `localStorage` checkpoint persists and restores

---

### TASK-4.8 — Keyboard Navigation Audit

**Category**: Frontend · Accessibility

**Exact Tasks**:
1. Audit every interactive element in the dashboard for `aria-label` or `aria-labelledby`.
2. Add `focus-trap` to all modal/Sheet components (sidebar mobile drawer, command palette, dialogs).
3. Implement roving `tabindex` on the sidebar nav links.
4. Ensure all icon-only buttons have `aria-label` and `title`.
5. Verify `focus-visible` outline (already defined in `globals.css`) applies everywhere.
6. Run Axe accessibility audit via Playwright (`@axe-core/playwright`) and resolve all Critical + Serious violations.

**Dependencies**: TASK-4.6

**Estimated Effort**: 6–8 hours

**Files Affected**: All interactive components in `features/shell/`, `features/translate/_components/`, `components/overlays/`

**Acceptance Criteria**:
- Axe audit: 0 Critical violations, 0 Serious violations
- Keyboard-only navigation: can reach every interactive element via Tab/Shift+Tab
- All modals trap focus; Escape closes them

**Testing Requirements**:
- Playwright Axe test: `await checkA11y(page)` on dashboard, translate, billing, settings pages

---

### Phase 4 — Exit Criteria

- [ ] Lighthouse Performance ≥ 85 on all dashboard routes
- [ ] Lighthouse Accessibility ≥ 90 on all dashboard routes
- [ ] Zero white-screen errors (all routes have ErrorBoundary)
- [ ] All dashboard routes have `loading.tsx`
- [ ] All translate E2E tests pass
- [ ] Onboarding flow completes and sets `onboarded: true`
- [ ] Sidebar accessible via keyboard; all interactive elements have `aria-label`

---

---

## Phase 5 — Landing Page Redesign

> **Duration**: 4 weeks (Weeks 14–17)  
> **Goal**: Awwwards-level landing page. 7 sections. Interactive live demo. GSAP character morph. Custom cursor. WebGL offloaded to Web Worker. Page transitions.

---

### TASK-5.1 — Anonymous Demo API Endpoint

**Category**: Backend · New Feature

**Exact Tasks**:
1. Add `POST /api/demo/translate` to `app/routers/utility.py`.
2. Auth: none required.
3. Rate limit: Redis `SET demo:{ip} EX 3600 NX` → allow max 3 per IP per hour.
4. Model: Groq (Llama 3.3-70b) only.
5. Hard char limit: 1,000 characters (return HTTP 400 if exceeded).
6. Response: identical SSE stream to authenticated `/api/code-to-english`.
7. Track in `MetricsCollector` separately as `demo_requests`.

**Dependencies**: Phase 1 complete

**Estimated Effort**: 3–4 hours

**Files Affected**:
- `app/routers/utility.py`
- `app/core/quota.py` (rate-limit helper)

**Acceptance Criteria**:
- 3 demo requests per IP per hour succeed; 4th returns HTTP 429
- Char limit enforced: 1,001 chars returns HTTP 400
- SSE stream works identically to authenticated endpoint
- No auth header needed

**Testing Requirements**:
- Unit test: 3 requests → 200; 4th → 429
- Unit test: 1,001 chars → 400
- Integration test: SSE stream from demo endpoint delivers blocks

---

### TASK-5.2 — Global Stats API Endpoint

**Category**: Backend · New Feature

**Exact Tasks**:
1. Add `GET /api/stats/global` to `app/routers/utility.py`.
2. Returns `{ total_translations: int }` — count of all rows in `translation_history`.
3. Cache result in Redis with 60-second TTL to avoid per-request DB scans.
4. This endpoint will be used by Next.js ISR for the `LiveCounter` component.

**Dependencies**: None

**Estimated Effort**: 1–2 hours

**Files Affected**:
- `app/routers/utility.py`

**Acceptance Criteria**:
- `GET /api/stats/global` returns `{ total_translations: int }` without auth
- Result cached in Redis for 60s
- Next.js ISR revalidation at 60s works

**Testing Requirements**:
- Unit test: response format correct; second call hits Redis cache (mock Redis)

---

### TASK-5.3 — Refactor WebGL Canvas to OffscreenCanvas + Web Worker

**Category**: Frontend · Performance

**Problem**: Three.js 6,000-particle morph runs all position updates on the main thread. On mobile, costs 4–8ms/frame and drops below 60fps.

**Exact Tasks**:
1. Create `features/landing/_canvas/particle.worker.ts`:
   - Receives `{ canvas: OffscreenCanvas, width, height, dpr }` via `postMessage` on init.
   - Owns Three.js renderer, scene, camera, particles.
   - Receives `{ type: 'scroll', value: 0-1 }` and `{ type: 'mouse', x, y }` messages.
   - Receives `{ type: 'mode', mode: 'dormant'|'active'|'sphere' }` to change WebGL state.
   - rAF render loop runs entirely in Worker — zero main thread cost.
   - Sends `{ type: 'ready' }` and `{ type: 'fps', value }` back to main thread.
2. Update `WebGLCanvas.tsx`:
   - Detect `OffscreenCanvas` support: `'transferControlToOffscreen' in canvas`.
   - If supported: `canvas.transferControlToOffscreen()` → postMessage to Worker.
   - If not supported: fall back to running Three.js on main thread (existing code).
3. Create `useParticleSystem.ts` — compute the 4 layout position buffers (tunnel/grid/wave/sphere) and transfer to Worker.
4. Create `useScrollMorph.ts` — read Lenis scroll progress (0→1); map to scroll ranges; postMessage `{ type: 'scroll', value }` on every Lenis tick.

**Dependencies**: Phase 3 complete

**Estimated Effort**: 12–16 hours (hardest technical task in Phase 5)

**Files Affected**:
- `frontend/src/features/landing/_canvas/WebGLCanvas.tsx`
- `frontend/src/features/landing/_canvas/particle.worker.ts` [NEW]
- `frontend/src/features/landing/_canvas/useParticleSystem.ts` [NEW]
- `frontend/src/features/landing/_canvas/useScrollMorph.ts` [NEW]
- `frontend/next.config.ts` (add worker bundling config)

**Acceptance Criteria**:
- Main thread CPU usage during particle animation: < 1ms/frame (measured in Chrome DevTools Performance panel)
- Workers offload visible in Chrome DevTools → Performance → Worker thread
- Scroll-driven morph still works correctly (tunnel→grid→wave→sphere)
- Mouse interaction still works (position messages to Worker)
- Safari: graceful fallback to main-thread Three.js if OffscreenCanvas unsupported

**Testing Requirements**:
- Performance test: record 5s of scroll on mid-range CPU; assert main thread animation frame budget < 4ms
- Cross-browser: Chrome, Safari, Firefox — particle system works

> **Risk**: Safari 16.4+ supports OffscreenCanvas but earlier versions do not. Feature-detect required. See R05 in risk register.

---

### TASK-5.4 — WebGL Graceful Fallback

**Category**: Frontend · Accessibility / Mobile

**Exact Tasks**:
1. In `WebGLCanvas.tsx`: Add detection:
   ```ts
   const hasWebGL = typeof WebGLRenderingContext !== 'undefined' &&
     !!document.createElement('canvas').getContext('webgl');
   if (!hasWebGL) return <CSSGradientBackdrop />;
   ```
2. Create `CSSGradientBackdrop.tsx` — two radial gradient orbs + aurora-drift animation; matches the dark void aesthetic without Three.js.
3. Add `IntersectionObserver` to defer Three.js init until canvas is near viewport (`rootMargin: '200px'`).

**Dependencies**: TASK-5.3

**Estimated Effort**: 2–3 hours

**Files Affected**:
- `frontend/src/features/landing/_canvas/WebGLCanvas.tsx`
- `frontend/src/features/landing/_canvas/CSSGradientBackdrop.tsx` [NEW]

**Acceptance Criteria**:
- On device with `webgl` context unavailable: CSS gradient renders; no JS error
- Three.js init deferred until canvas near viewport (verified in DevTools Network → Three.js chunk loads late)
- FCP measured with Three.js deferred: LCP improvement visible

**Testing Requirements**:
- Test with `--disable-webgl` flag in Playwright Chromium; verify `CSSGradientBackdrop` renders

---

### TASK-5.5 — Custom Cursor

**Category**: Frontend · Creative / Awwwards

**Exact Tasks**:
1. Create `features/landing/_cursor/useCursor.ts`:
   - Track `mousemove` globally; lerp cursor position at `0.12` factor.
   - Detect hover targets: CTA buttons → `state: 'click'`; code blocks → `state: 'code'`; links → `state: 'link'`.
2. Create `features/landing/_cursor/CustomCursor.tsx`:
   - 20px amber circle, absolute positioned, `pointer-events: none`, `z-index: var(--z-cursor)`.
   - States: normal (20px) → click hover (48px, fill amber, label "Click") → code hover (36px, indigo) → link hover (28px).
   - `mousedown`: `scale(0.8)` spring compress; `click`: `scale(1.1)` then return.
   - Hidden on touch devices (`@media (hover: none)`).
3. Mount `<CustomCursor>` inside `LandingPage.tsx` only (not dashboard).

**Dependencies**: TASK-3.4

**Estimated Effort**: 4–6 hours

**Files Affected**:
- `frontend/src/features/landing/_cursor/CustomCursor.tsx` [NEW]
- `frontend/src/features/landing/_cursor/useCursor.ts` [NEW]
- `frontend/src/features/landing/LandingPage.tsx`

**Acceptance Criteria**:
- Cursor renders on desktop; hidden on touch/mobile
- Smoothly follows mouse with lerp delay
- State transitions visible on hover of CTAs and code blocks
- `pointer-events: none` — cursor does not intercept clicks

**Testing Requirements**:
- Manual: desktop — verify cursor appears and transforms on hover states
- Playwright: `page.mouse.move()` — verify cursor element position updated

---

### TASK-5.6 — Build Section 1: Void Entry (Hero)

**Category**: Frontend · Landing Page

**Exact Tasks**:
1. Create `features/landing/_sections/VoidEntry/index.tsx` — full viewport section; `#030014` background; WebGL particles dormant.
2. Create `Headline.tsx` — `<RevealText by="word">` on "Every Codebase Has a Story." (GSAP SplitText; stagger 0.14s; y 80→0, blur 12→0).
3. Create `Subline.tsx` — fade up 0.6s delay 1.1s: "Understand any codebase in minutes, not weeks."
4. Create `ScrollCue.tsx` — amber 1px vertical line; pulse 0→1 opacity at 1.8s.
5. Add `<MagneticButton>` for "Try Free →" CTA.
6. Add ghost button "See the Story" beside CTA.
7. Add amber eyebrow label above headline ("Open Source Developer Tool").
8. WebGL triggers: scroll > 10% → particles stir; scroll > 20% → morph toward grid.

**Dependencies**: TASK-5.4, TASK-5.5, TASK-3.5

**Estimated Effort**: 5–7 hours

**Files Affected**:
- `frontend/src/features/landing/_sections/VoidEntry/index.tsx` [NEW]
- `frontend/src/features/landing/_sections/VoidEntry/Headline.tsx` [NEW]
- `frontend/src/features/landing/_sections/VoidEntry/Subline.tsx` [NEW]
- `frontend/src/features/landing/_sections/VoidEntry/ScrollCue.tsx` [NEW]

**Acceptance Criteria**:
- Hero headline animates word-by-word on page load
- Magnetic button spring effect on hover
- Scroll cue visible and pulses
- WebGL particles begin stirring on scroll past 10%

**Testing Requirements**:
- Lighthouse FCP: hero section above fold < 1.5s (Three.js deferred)
- E2E: headline animation completes; CTAs clickable

---

### TASK-5.7 — Build Section 2: Translation Moment (600vh Pinned)

**Category**: Frontend · Landing Page (Hardest Section)

**Exact Tasks**:
1. Create `features/landing/_sections/TranslationMoment/index.tsx` — GSAP `ScrollTrigger.create({ pin: true, end: '+=600vh', scrub: 0.5 })`.
2. Create `CodeArtifact.tsx` — anonymous fibonacci function in `CodeSurface`; fades in at 0–15% scroll.
3. Create `CharMorph.tsx`:
   - At 15–35% scroll: `gsap.utils.toArray('.code-char')` → GSAP FLIP records positions.
   - At 35–55%: English word positions measured; FLIP animates each char to target English word position.
   - Chars with no English target: scatter off-screen (`x: ±200, opacity: 0`).
4. Particle convergence: at 55–75%, `postMessage({ type: 'mode', mode: 'active' })` → Worker receives English word centroids as particle targets.
5. Create `NarrativeText.tsx` — at 90–100%: `<RevealText by="word">` on "Anuvaad reads code like a language, not a syntax." + amber underline draws under "language".
6. Implement `driveSceneByProgress(progress)` state machine that dispatches to each scene.

**Dependencies**: TASK-5.3, TASK-3.5

**Estimated Effort**: 16–20 hours (most complex frontend task)

**Files Affected**:
- `frontend/src/features/landing/_sections/TranslationMoment/index.tsx` [NEW]
- `frontend/src/features/landing/_sections/TranslationMoment/CodeArtifact.tsx` [NEW]
- `frontend/src/features/landing/_sections/TranslationMoment/CharMorph.tsx` [NEW]
- `frontend/src/features/landing/_sections/TranslationMoment/NarrativeText.tsx` [NEW]

**Acceptance Criteria**:
- Section pins for exactly 600vh of scroll
- Characters visually morph from code positions to English positions
- Narrative text reveals at end of section
- No performance jank: 60fps on a modern laptop (measure in Chrome Perf panel)

**Testing Requirements**:
- Manual: scroll through section slowly; verify all 6 scene transitions
- Performance: record scroll; assert main thread budget <8ms per frame
- Reduced motion: verify section skips to final state immediately

> **Risk**: GSAP FLIP + coordinate mapping is the most complex frontend operation. Budget extra time. See R06 in risk register.

---

### TASK-5.8 — Build Section 3: Feature Comparison (Horizontal Scroll)

**Category**: Frontend · Landing Page

**Exact Tasks**:
1. Create `features/landing/_sections/FeatureComparison/index.tsx` — GSAP pin 300vh; `xPercent: -200 * progress` drives 3-panel track.
2. Create `ComparePanel.tsx` — single full-width panel with Monaco (read-only, pre-populated) on left, Lora italic English output on right; amber header label.
3. 3 panels: Code→English (Python sorting), English→Code (TypeScript), Code→Code (Python→TypeScript).
4. Panel entry: GSAP `SplitText` on header as panel enters viewport.
5. Code lines type in at panel entry (18ms/line delay).
6. Create `ProgressPill.tsx` — 3 amber dots at bottom-center; active dot expands to pill width, driven by scroll %.
7. Lenis horizontal momentum: `useHorizontalScroll.ts` wraps GSAP pin with Lenis proxy.

**Dependencies**: TASK-5.6

**Estimated Effort**: 8–10 hours

**Files Affected**:
- `frontend/src/features/landing/_sections/FeatureComparison/index.tsx` [NEW]
- `frontend/src/features/landing/_sections/FeatureComparison/ComparePanel.tsx` [NEW]
- `frontend/src/features/landing/_sections/FeatureComparison/ProgressPill.tsx` [NEW]
- `frontend/src/features/landing/_hooks/useHorizontalScroll.ts` [NEW]

**Acceptance Criteria**:
- 3 panels scroll horizontally in sync with vertical scroll
- Each panel header animates on entry
- Progress pill tracks active panel
- Horizontal trackpad momentum works naturally

**Testing Requirements**:
- E2E: scroll to section; verify panel track translates correctly
- Cross-browser: test horizontal scroll in Chrome, Safari, Firefox

---

### TASK-5.9 — Build Section 4: Live Demo

**Category**: Frontend · Landing Page

**Exact Tasks**:
1. Create `features/landing/_sections/LiveDemo/index.tsx` — 80vh section; `--surface-low` background; 1px `--border-subtle` border.
2. Create `DemoEditor.tsx` — Monaco editor (editable, max 1,000 chars); pre-loaded with Quick Sort in C; character count indicator.
3. Create `DemoOutput.tsx` — SSE streaming output panel; `StreamingView` during stream; block cards after completion.
4. Create `DemoHint.tsx` — eyebrow: "Try it. Right here. No account required." + character count indicator.
5. "Translate →" `<MagneticButton>` fires `POST /api/demo/translate`.
6. After rate-limit hit: show "Sign up for unlimited →" amber CTA.
7. After completion: show "This is what developers use every day." message.
8. Track `demo_used` analytics event via `lib/analytics.ts`.

**Dependencies**: TASK-5.1, TASK-5.6

**Estimated Effort**: 6–8 hours

**Files Affected**:
- `frontend/src/features/landing/_sections/LiveDemo/index.tsx` [NEW]
- `frontend/src/features/landing/_sections/LiveDemo/DemoEditor.tsx` [NEW]
- `frontend/src/features/landing/_sections/LiveDemo/DemoOutput.tsx` [NEW]
- `frontend/src/features/landing/_sections/LiveDemo/DemoHint.tsx` [NEW]

**Acceptance Criteria**:
- Monaco editor loads; user can edit code
- "Translate →" button fires real API call; SSE stream renders in real time
- Rate limit message appears after 3 requests
- Character limit (1,000) enforced with visible counter

**Testing Requirements**:
- E2E: type code → click Translate → verify streaming output appears
- Unit test rate-limit UI: mock 429 response → verify rate-limit message shown

---

### TASK-5.10 — Build Section 5: Social Proof

**Category**: Frontend · Landing Page

**Exact Tasks**:
1. Create `features/landing/_sections/SocialProof/index.tsx`.
2. Create `LiveCounter.tsx`:
   - Fetches `/api/stats/global` via Next.js ISR (60s revalidation).
   - `<CountUp>` animation 0 → `{total}` on viewport entry.
   - Amber glow on number (`--glow-sm`).
   - Label: "translations and counting".
3. Create `LanguageGrid.tsx`:
   - 7×5 grid of 35 language boxes (60px × 60px each).
   - On `IntersectionObserver` entry: GSAP stagger glow `{ amount: 1.2, from: 'center', grid: [5,7] }`.
   - Hover: individual box lifts with `--glow-md`.
4. Create `TestimonialMarquee.tsx` — preserve existing two-track infinite marquee (40s/45s, pauses on hover).

**Dependencies**: TASK-5.2

**Estimated Effort**: 4–5 hours

**Files Affected**:
- 4 new files under `frontend/src/features/landing/_sections/SocialProof/`

**Acceptance Criteria**:
- Live counter displays real total from API with ISR freshness
- CountUp animation fires on viewport entry
- Language grid stagger animation plays on scroll into view
- Testimonial marquee pauses on hover

**Testing Requirements**:
- E2E: scroll to social proof; verify CountUp starts and reaches target
- Unit test `LiveCounter`: mock ISR response; assert CountUp receives correct target value

---

### TASK-5.11 — Build Sections 6 & 7: Pricing + Final CTA

**Category**: Frontend · Landing Page

**Exact Tasks**:
1. **Pricing (Section 6)**:
   - Create `features/landing/_sections/Pricing/index.tsx` — 2 cards: Free (₹0/month, 10/day) and Pro (₹499/month, Unlimited).
   - Pro card: `--border-active` shimmer border; "Most Popular" `<AmberBadge>`.
   - `<MagneticButton>` on "Activate Pro →".
   - Honest feature lists; no dark patterns.
2. **Final CTA (Section 7)**:
   - Create `features/landing/_sections/FinalCTA/index.tsx` — 100vh; WebGL mode: SPHERE on entry.
   - Create `PlasmaSphere.tsx` — `IntersectionObserver` fires when >50% visible → `postMessage({ type: 'mode', mode: 'sphere' })`; particles converge from wave to sphere over 2s.
   - `<RevealText by="word">` on "Start reading your codebase."
   - Large amber `<MagneticButton>`: "Start Free →".
   - Below button: "No credit card. 10 free translations per day."

**Dependencies**: TASK-5.10, TASK-5.3

**Estimated Effort**: 4–5 hours

**Files Affected**:
- `frontend/src/features/landing/_sections/Pricing/index.tsx` [NEW]
- `frontend/src/features/landing/_sections/FinalCTA/index.tsx` [NEW]
- `frontend/src/features/landing/_sections/FinalCTA/PlasmaSphere.tsx` [NEW]

**Acceptance Criteria**:
- Pricing cards render with correct prices and feature lists
- Pro card has shimmer border animation
- Final CTA: particles transition to sphere on scroll into view
- "Start Free" button links to `/signup`

---

### TASK-5.12 — Page Transition + Landing Navbar

**Category**: Frontend · Landing Page

**Exact Tasks**:
1. Create `features/landing/_transitions/PageTransition.tsx`:
   - Black overlay div; `clip-path: inset(0 0 100% 0)` → `inset(0 0 0% 0)` on nav out (0.4s, power3.inOut).
   - Then `clip-path: inset(0 0 0% 0)` → `inset(0 100% 0 0)` on nav in (0.3s, power3.in).
   - Hook into Next.js App Router via `usePathname` + `useEffect`.
2. Create `features/landing/_sections/LandingNavbar/index.tsx`:
   - Transparent background at scroll top.
   - Frosted glass (`backdrop-filter: blur(20px)`) when scroll > 40px.
   - Logo (left) + nav links (center) + "Sign In" ghost + "Try Free" amber CTA (right).
   - Links: Features, Demo, Pricing, Docs.

**Dependencies**: TASK-5.6

**Estimated Effort**: 4–5 hours

**Files Affected**:
- `frontend/src/features/landing/_transitions/PageTransition.tsx` [NEW]
- `frontend/src/features/landing/_sections/LandingNavbar/index.tsx` [NEW]

**Acceptance Criteria**:
- Route change triggers wipe animation (verify in Chrome devtools: overlay visible during navigation)
- Navbar transitions from transparent to frosted glass on scroll
- CTAs in navbar are keyboard accessible

---

### TASK-5.13 — Performance Audit + Lighthouse Optimization

**Category**: Frontend · Performance

**Exact Tasks**:
1. Run `next build` + Lighthouse on landing page (desktop + mobile).
2. Run `next build --analyze` (bundle analyzer); identify chunks > 50KB gzipped.
3. Ensure Three.js loads only after `IntersectionObserver` fires (verify in network waterfall).
4. Ensure GSAP SplitText is loaded lazily (dynamic import inside `useEffect`).
5. Add `font-display: swap` and `size-adjust` to all Google Fonts.
6. Verify CLS = 0 (no layout shifts from font loading or image loading).
7. Verify LCP < 2.5s (desktop).
8. Fix any regressions discovered.

**Dependencies**: TASK-5.12

**Estimated Effort**: 4–6 hours

**Files Affected**: Various (findings-driven)

**Acceptance Criteria**:
- Lighthouse Performance ≥ 85 (desktop landing)
- LCP < 2.5s
- CLS = 0
- Three.js bundle loads after canvas enters viewport (Network waterfall confirms)

**Testing Requirements**:
- Lighthouse CI in GitHub Actions: fail build if score < 85

---

### Phase 5 — Exit Criteria

- [ ] Lighthouse Performance ≥ 85 (desktop landing)
- [ ] LCP < 2.5s
- [ ] All 7 sections render correctly in Chrome, Safari, Firefox
- [ ] Custom cursor functional on desktop; hidden on mobile
- [ ] Live demo calls real API and streams output
- [ ] Page transitions work on all route changes
- [ ] WebGL deferred until viewport; CSS fallback works without WebGL
- [ ] `prefers-reduced-motion: reduce` respected on all sections
- [ ] 0 console errors on landing page load

---

---

## Infrastructure Addendum — Phase 6 (Post-Launch Hardening)

> **Duration**: 1–2 weeks (Weeks 18–19)  
> **Goal**: Production-ready deployment, observability, and scalability. Can run in parallel with Phase 5 landing polish.

| Task | Description | Files | Effort |
|---|---|---|---|
| **I-1** | Prometheus metrics endpoint (replace in-process `MetricsCollector`) | `app/core/config.py`, `app/routers/utility.py` | 4–6h |
| **I-2** | Celery task queue for LLM jobs (Redis broker) | `app/workers/` [NEW] | 8–12h |
| **I-3** | Production `docker-compose.prod.yml` (Redis AUTH, HTTPS Nginx, multi-worker Uvicorn, health checks, resource limits) | `docker-compose.prod.yml` [NEW], `nginx.conf` | 4–6h |
| **I-4** | Jinja2 email templates (`welcome.html`, `subscription.html`, `milestone.html`) | `app/services/email/templates/` [NEW] | 4–6h |
| **I-5** | Database index documentation (`user_email`, `created_at` composite index on `translation_history`) | `supabase/migrations/` [NEW] | 1–2h |
| **I-6** | Redis AUTH in Docker Compose (`requirepass` directive, update `REDIS_URL`) | `docker-compose.yml` | 1h |
| **I-7** | Next.js ISR for `LiveCounter` (60s revalidation from `/api/stats/global`) | `features/landing/_sections/SocialProof/LiveCounter.tsx` | 1–2h |
| **I-8** | History pruning optimization: DB-side `DELETE WHERE id IN (SELECT id ... ORDER BY created_at ASC LIMIT n)` | `app/core/quota/history.py` | 2h |

---

---

## Risk Register

| ID | Risk | Phase | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R01 | Translate page decomposition breaks E2E tests | 2 | 🟡 Medium | 🔴 High | Run E2E after every TASK-2.x; keep `window.__monacoEditor` exposed in `MonacoInput.tsx` |
| R02 | Import path changes break runtime | 2 | 🟡 Medium | 🟠 Medium | `tsc --noEmit` after every extraction; CI build on each sub-task |
| R03 | CSS split removes styles from routes | 3 | 🟡 Medium | 🟡 Medium | Playwright visual regression screenshots before/after each CSS file move |
| R04 | GSAP SplitText conflicts with SSR | 3, 5 | 🟡 Medium | 🟡 Medium | All SplitText in `useEffect` with `typeof window` guard |
| R05 | WebGL OffscreenCanvas unsupported in Safari < 16.4 | 5 | 🔴 High | 🟠 Medium | Feature-detect `'transferControlToOffscreen' in canvas`; fall back to main-thread Three.js |
| R06 | Character morph (Section 2) performance on mid-range mobile | 5 | 🔴 High | 🔴 High | Test on real mid-range Android device; use `will-change: transform` on char elements; reduce char count if needed |
| R07 | Anonymous demo API abuse | 5 | 🟡 Medium | 🔴 High | Redis 3 req/IP/hour; Cloudflare Turnstile CAPTCHA if abuse detected |
| R08 | Celery migration affects SSE streaming | Infra | 🔴 High | 🔴 High | SSE is synchronous; Celery is for async DB writes only initially; streaming remains direct |
| R09 | Three.js IntersectionObserver deferral breaks morph timing | 3, 5 | 🟡 Medium | 🟡 Medium | `rootMargin: '200px'` gives buffer before section enters viewport |
| R10 | Quota count DB query performance | Infra | 🟡 Medium | 🟠 Medium | Add `(user_email, created_at)` composite index; cache count in Redis 30s TTL |
| R11 | `prefers-reduced-motion` breaks marketing animations | 3 | 🟢 Low | 🟡 Medium | Only transform/opacity disabled; layout and colors unchanged |
| R12 | GSAP ScrollTrigger conflicts with Lenis | 3, 5 | 🟡 Medium | 🟠 Medium | Use `ScrollTrigger.scrollerProxy` for Lenis integration (GSAP-documented pattern) |

---

---

## Feature Flag Registry

These flags allow safe partial rollouts per phase:

```env
# Phase 4
NEXT_PUBLIC_DASHBOARD_V2=true           # New dashboard UI

# Phase 5
NEXT_PUBLIC_LANDING_V2=true             # New landing page
NEXT_PUBLIC_LIVE_DEMO_ENABLED=true      # Anonymous demo endpoint
NEXT_PUBLIC_CUSTOM_CURSOR=true          # Custom cursor (desktop only)
NEXT_PUBLIC_PAGE_TRANSITIONS=true       # Route transition wipes

# Infrastructure
FEATURE_CELERY_ENABLED=false            # LLM task queue
FEATURE_PROMETHEUS_ENABLED=false        # Prometheus metrics endpoint
```

---

## Success Metrics

| Metric | Current | Target (All Phases Complete) |
|---|---|---|
| Lighthouse Performance (landing) | ~55 | ≥ 85 |
| Lighthouse Performance (dashboard) | ~65 | ≥ 85 |
| Lighthouse Accessibility | ~60 | ≥ 90 |
| LCP (landing) | ~3.5s | < 2.5s |
| Dashboard JS bundle | ~450KB gzipped | < 280KB gzipped |
| Largest frontend file | 1,391 lines | < 200 lines |
| Largest backend router | 608 lines | < 80 lines |
| `prefers-reduced-motion` compliance | 0% | 100% |
| Error boundary coverage | 0% | 100% |
| Backend tests | 184 | ≥ 184 (no regression) |
| E2E tests | Thin | Full translate + auth + billing flow |
| `sys.modules` DI references | 6+ | 0 |
| Awwwards submission readiness | ❌ | ✅ |

---

*Backlog generated from: Technical Audit v1+v2 · Architecture Inventory · Detailed Rebuild Plan · Engineering Specification · 2026-06-10*
