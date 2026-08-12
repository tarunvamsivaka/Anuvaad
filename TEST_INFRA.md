# Comprehensive Test Infrastructure & Verification Specification (`TEST_INFRA.md`)

**Project**: Anuvaad Zero-Budget Startup Platform  
**Repository Path**: `C:\Users\tarun\Anuvaad\Anuvaad`  
**Date**: 2026-08-08  
**Status**: Official Specification Baseline  

---

## 1. Overview & Operational Methodology

The Anuvaad test infrastructure is engineered to guarantee 100% functional reliability, zero regression, and robust error handling across the entire stack while operating under strict zero-budget cloud constraints (Groq AI API free tier, Supabase 500MB PostgreSQL, Upstash Redis 10k req/day, and Render/Vercel PaaS limits).

### Test Engineering Methodologies Applied:
1. **Category-Partition Method**: Systematic decomposition of input domains (user tiers, prompt sizes, payload schemas, DB connection states, network conditions) into distinct categories and partitions to construct representative, non-redundant test frames.
2. **Boundary Value Analysis (BVA)**: Rigorous evaluation of edge conditions at, immediately below, and immediately above operational thresholds (e.g., 4,000 vs 4,001 input characters, 5 vs 6 guest translations, 100,000 TPM limit boundaries, connection pool overflow limits).
3. **Pairwise (Combinatorial) Testing**: Systematic cross-feature interaction testing evaluating pairwise combinations of critical platform components (e.g., Groq Caps x Model Failover, DB Connection Pooling x Background Footprint Pruning, Structured 429 Payloads x Frontend UX Modals).
4. **Real-World Workload Testing**: High-fidelity end-to-end user lifecycle validation and synthetic load testing simulating multi-user translation traffic spikes, primary provider rate-limit failures, and background storage maintenance routines.

---

## 2. Architectural Goals & Fixture Isolation

To maintain fast execution speeds, determinism, and independence from external services, the Anuvaad test infrastructure enforces five architectural isolation principles:

```
+-----------------------------------------------------------------------------------+
|                        Test Architecture Isolation Layers                         |
+-----------------------------------------------------------------------------------+
| 1. Groq / LLM Mocking   --> MockAsyncOpenAI / MockAsyncOpenAIError (100% Offline)   |
| 2. DB Isolation         --> SQLite AsyncEngine (sqlite+aiosqlite:///:memory:)     |
| 3. Cache & Rate Limit   --> MockRedisCache & client_no_redis (LRU Fallback)       |
| 4. Task Queue Isolation --> mock_celery_tasks autouse fixture (No broker needed)  |
| 5. Auth State           --> client_with_auth / client_no_auth dependency overrides|
+-----------------------------------------------------------------------------------+
```

### Core Fixture Specifications (`tests/conftest.py` & `frontend/src/tests/setup.ts`):

| Fixture / Isolation Layer | Type / Scope | Description & Implementation Mechanism |
|---------------------------|--------------|-----------------------------------------|
| `client` | Function | FastAPI `TestClient` wired to in-memory DB and mocked `AsyncOpenAI` client returning standard JSON block completions. |
| `client_rate_limited` | Function | `TestClient` pre-populated with max IP request counts in Redis/LRU to test HTTP 429 structured error responses. |
| `client_multi_block` | Function | `TestClient` utilizing `MockAsyncOpenAIMulti` to test streaming translation of complex multi-function code snippets. |
| `client_ai_error` | Function | `TestClient` utilizing `MockAsyncOpenAIError` to simulate LLM provider rate limits (429), timeouts (504), and server errors (500). |
| `client_no_redis` | Function | `TestClient` simulating Redis network failure, verifying that the backend seamlessly falls back to thread-safe in-memory LRU cache. |
| `client_with_auth` | Function | Authenticated `TestClient` overriding `get_user_email()` dependency to inject `testuser@example.com` JWT context. |
| `client_no_auth` | Function | Unauthenticated `TestClient` overriding `get_user_email()` to raise HTTP 401 Unauthorized exceptions. |
| `mock_supabase_and_quota` | Autouse | Intercepts database calls to `get_today_usage_count`, `increment_today_usage_count`, and credit RPC functions for isolated rate limit testing. |
| `mock_celery_tasks` | Autouse | Replaces `.delay()` and `.apply_async()` on all Celery tasks (`save_translation_history_task`, `prune_database_footprint`) with direct mock execution. |
| Vitest DOM Setup | Global | `frontend/src/tests/setup.ts` providing JSDOM environment, `@testing-library/jest-dom` matchers, and `window.matchMedia` mocks. |

---

## 3. Test Suite Map & Directory Structure

```
Anuvaad/
├── tests/                           # Pytest Backend Suite (FastAPI, SQLAlchemy, Groq, Redis, Celery)
│   ├── conftest.py                  # Shared fixtures, AI mocks, Redis LRU mocks, DB fixtures, Celery mocks
│   ├── test_zero_budget.py          # R1 Groq limits, 429 payloads, model failover, guest/user rate limiting
│   ├── test_api.py                  # Core API endpoints (/code-to-english, /history, /billing, /github)
│   ├── test_be_remediation.py       # Auth dependencies, JWT verification, ORM schema stability
│   ├── test_cache.py                # Upstash Redis & in-memory LRU fallback cache functionality
│   ├── test_db_optimization.py      # SQLAlchemy connection pool settings & query execution safety
│   ├── test_launch_resilience.py    # Production environment validation & high-load error recovery
│   ├── test_security.py             # TRUST_PROXY_HOPS proxy headers, rate limiter security, timing attack defense
│   ├── test_streaming.py            # SSE stream buffering, chunk parsing, and client error propagation
│   └── pytest.ini                   # Pytest configuration (asyncio mode, test paths, warning filters)
│
└── frontend/                        # Vitest Unit & Playwright E2E Suite (Next.js 16, React, Tailwind)
    ├── vitest.config.ts             # Vitest config (JSDOM environment, path aliases, inline setup)
    ├── e2e/
    │   └── signup-test.spec.ts      # Playwright E2E signup & onboarding flow test script
    └── src/tests/
        ├── setup.ts                 # Vitest matchers setup & global browser API shims
        ├── milestone3-features.test.ts # Usage counter badge, tab navigation, language detection, history filters
        ├── billing-auth.test.ts     # Auth state transitions, subscription tier pills, token refresh
        ├── detect-language.test.ts  # Programming language auto-detection heuristic unit tests
        ├── hooks.test.ts            # Translation stream hooks (`useTranslationStream`) & state management
        ├── monaco-skeleton.test.tsx # UI component unit tests & editor skeleton loaders
        └── empirical-stress.test.ts # Client-side rendering stress & rapid state update tests
```

---

## 4. Feature Checklist Matrix (All 15 Features)

### Tier 1: Feature Coverage (>= 5 Test Cases per Feature = 75+ Test Cases)

| Test Case ID | Target Feature | Description | Inputs / Preconditions | Expected Behavior |
|--------------|----------------|-------------|------------------------|-------------------|
| **TC-F01-1** | Feature 1: Backend Dead Code Removal | Verify `app/db/repositories/embedding_repo.py` stub removal. | Import attempt from `app.db.repositories.embedding_repo` | `ModuleNotFoundError` raised; vector operations use `app.repositories.vectors`. |
| **TC-F01-2** | Feature 1: Backend Dead Code Removal | Verify `app/db/repositories/translation_repo.py` stub removal. | Import attempt from `app.db.repositories.translation_repo` | `ModuleNotFoundError` raised; history operations use `app.repositories.translation`. |
| **TC-F01-3** | Feature 1: Backend Dead Code Removal | Verify `app/db/repositories/workspace_repo.py` stub removal. | Import attempt from `app.db.repositories.workspace_repo` | `ModuleNotFoundError` raised; workspace operations use `app.repositories.workspace`. |
| **TC-F01-4** | Feature 1: Backend Dead Code Removal | Verify removal of experimental `app/services/modernization.py`. | Import attempt from `app.services.modernization` | `ModuleNotFoundError` raised; core service layer remains completely operational. |
| **TC-F01-5** | Feature 1: Backend Dead Code Removal | Verify removal of legacy `get_async_openai_class()` shim in `app/services/ai.py`. | Execution of `get_completion()` in `app/services/ai.py` | Direct instantiation of `AsyncOpenAI` without legacy wrapper shim. |
| **TC-F02-1** | Feature 2: Frontend Dead Code Removal | Verify deletion of `frontend/scripts/replace_colors.js`. | Script file presence check in `frontend/scripts/` | File does not exist; build scripts execute without referencing it. |
| **TC-F02-2** | Feature 2: Frontend Dead Code Removal | Verify deletion of 6 orphan template SVGs in `frontend/public/`. | File check for `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | Files do not exist; frontend bundle references only active assets. |
| **TC-F02-3** | Feature 2: Frontend Dead Code Removal | Verify removal of unused npm packages from `package.json`. | Dependency inspection in `frontend/package.json` | Unused packages removed; `npm run build` completes with zero missing package errors. |
| **TC-F02-4** | Feature 2: Frontend Dead Code Removal | Verify removal of 11 unused frontend UI components/hooks. | Component import audit across `frontend/src/` | Page routing and UI rendering operate without broken component imports. |
| **TC-F02-5** | Feature 2: Frontend Dead Code Removal | Verify clean TypeScript compilation after dead code removal. | Command: `cd frontend && npm run build` | Process exits with status code 0 and zero TypeScript errors. |
| **TC-F03-1** | Feature 3: Root Artifact Cleanup | Verify deletion of root `test.db` file. | File presence check at `C:\Users\tarun\Anuvaad\Anuvaad\test.db` | File does not exist; backend tests use SQLite in-memory engine. |
| **TC-F03-2** | Feature 3: Root Artifact Cleanup | Verify deletion of obsolete root `schema_migration.sql`. | File presence check at repo root | File does not exist; database schema managed exclusively via Alembic. |
| **TC-F03-3** | Feature 3: Root Artifact Cleanup | Verify deletion of legacy SQL scripts in `docs/legacy/sql/`. | Directory audit of `docs/legacy/sql/` | Deleted legacy SQL scripts removed; repository history remains clean. |
| **TC-F03-4** | Feature 3: Root Artifact Cleanup | Verify clean git status without leftover build artifacts. | Execution of `git status` check | No untracked `.db`, `.sql` or temp build artifacts present in working tree. |
| **TC-F03-5** | Feature 3: Root Artifact Cleanup | Verify fresh Alembic migration execution without legacy SQL files. | Command: `alembic upgrade head` | Migrations execute cleanly from scratch without depending on root SQL files. |
| **TC-F04-1** | Feature 4: Groq Caps & TPM/RPM | Enforce guest user input code cap at 4,000 characters. | Payload with 4,001 input characters for guest user | HTTP 413 exception raised: "Input size (4001 chars) exceeds current limit of 4000 chars". |
| **TC-F04-2** | Feature 4: Groq Caps & TPM/RPM | Enforce free signed-in user input code cap at 4,000 characters. | Payload with 4,001 input characters for free user | HTTP 413 exception raised: "Input size (4001 chars) exceeds current limit of 4000 chars". |
| **TC-F04-3** | Feature 4: Groq Caps & TPM/RPM | Allow Pro tier user input code size up to 50,000 characters. | Payload with 45,000 input characters for Pro user | Request passes quota policy check without size truncation error. |
| **TC-F04-4** | Feature 4: Groq Caps & TPM/RPM | Enforce Groq RPM tracking (6,000 req/min limit). | 6,001 requests within a 60-second window | HTTP 429 structured payload returned with `limit_type: "rpm_limit"`. |
| **TC-F04-5** | Feature 4: Groq Caps & TPM/RPM | Enforce Groq TPM tracking (100,000 tokens/min limit). | Cumulative token count reaching 100,001 in 60s window | HTTP 429 structured payload returned with `limit_type: "tpm_limit"`. |
| **TC-F05-1** | Feature 5: LLM Model Failover | Verify primary model `llama-3.3-70b-versatile` execution path. | Normal translation request with responsive Groq API | Translation generated via primary model; `model_name` recorded as `llama-3.3-70b-versatile`. |
| **TC-F05-2** | Feature 5: LLM Model Failover | Failover to `llama-3.1-8b-instant` on primary model 429 error. | Primary model returns HTTP 429 rate limit exception | Request automatically retries on `llama-3.1-8b-instant` and succeeds without 500 error. |
| **TC-F05-3** | Feature 5: LLM Model Failover | Failover to `llama-3.1-8b-instant` on primary model timeout/500. | Primary model raises 500 API error or timeout | Backend switches to fallback model and returns completed translation payload. |
| **TC-F05-4** | Feature 5: LLM Model Failover | Failover to OpenRouter API when both Groq models fail. | Both Groq models fail; `OPENROUTER_API_KEY` configured | Request completes via OpenRouter `meta-llama/llama-3.3-70b-instruct`. |
| **TC-F05-5** | Feature 5: LLM Model Failover | Failover to stale history cache when all LLM providers fail. | All LLM endpoints fail; input matches existing history entry | `find_stale_translation` returns cached blocks with `model_name: "stale_recovery"`. |
| **TC-F06-1** | Feature 6: Structured HTTP 429 Payloads | Verify guest daily quota 429 response structure. | Guest exceeds 5 daily translations | HTTP 429 returned with `detail`, `limit_type: "guest_daily_limit"`, `retry_after_seconds: 86400`, `tier_limit: 5`. |
| **TC-F06-2** | Feature 6: Structured HTTP 429 Payloads | Verify free user daily quota 429 response structure. | Free user exceeds 25 daily translations | HTTP 429 returned with `detail`, `limit_type: "user_daily_limit"`, `retry_after_seconds: 86400`, `tier_limit: 25`. |
| **TC-F06-3** | Feature 6: Structured HTTP 429 Payloads | Verify `Retry-After` HTTP header formatting. | Any rate limit condition triggered | Response header contains `Retry-After: <integer_seconds>` matching payload detail. |
| **TC-F06-4** | Feature 6: Structured HTTP 429 Payloads | Verify RPM limit 429 payload `retry_after_seconds`. | RPM limit exceeded in minute window | Payload contains exact remaining seconds until minute window reset. |
| **TC-F06-5** | Feature 6: Structured HTTP 429 Payloads | Verify global FastAPI `http_exception_handler` JSON formatting. | Structured dict passed to `HTTPException(status_code=429)` | FastAPI serializes dict cleanly into JSON response body without double-escaping. |
| **TC-F07-1** | Feature 7: DB Connection Pool & Safety | Verify default SQLAlchemy async engine pool parameters. | Engine initialization in `app/core/database_session.py` | Engine configured with `pool_size=5`, `max_overflow=10`, `pool_recycle=300`. |
| **TC-F07-2** | Feature 7: DB Connection Pool & Safety | Verify PgBouncer connection mode pool override in production. | Environment setting `DATABASE_POOL_URL` configured | Engine forces `pool_size=1`, `max_overflow=0` for serverless PgBouncer multiplexing. |
| **TC-F07-3** | Feature 7: DB Connection Pool & Safety | Verify connection pre-ping detection (`pool_pre_ping=True`). | DB session checkout from connection pool | Stale or disconnected socket connections detected and refreshed before query execution. |
| **TC-F07-4** | Feature 7: DB Connection Pool & Safety | Verify session rollback and release on exception. | Unhandled exception raised during DB transaction | Session transaction rolled back and connection returned to pool without leaking. |
| **TC-F07-5** | Feature 7: DB Connection Pool & Safety | Verify SQLite in-memory fallback initialization. | `DATABASE_URL` unset (local test environment) | In-memory SQLite DB created with custom `cosine_distance` vector distance function. |
| **TC-F08-1** | Feature 8: Safe Footprint Background Pruning | Verify `prune_anonymous_history` deletes old guest records. | Guest translation records older than retention cutoff (7 days) | Rows matching `user_email LIKE 'guest:%'` deleted; signed-in user records preserved. |
| **TC-F08-2** | Feature 8: Safe Footprint Background Pruning | Verify `prune_stale_vectors` deletes unreferenced embeddings. | Vector embedding rows older than retention cutoff (30 days) | Unreferenced stale vectors deleted from DB; active workspace vectors preserved. |
| **TC-F08-3** | Feature 8: Safe Footprint Background Pruning | Verify `prune_database_footprint` Celery task execution. | Scheduled background execution of pruning routine | Task runs history and vector pruning sequentially and returns summary execution dict. |
| **TC-F08-4** | Feature 8: Safe Footprint Background Pruning | Enforce `HISTORY_LIMIT_FREE` (100 rows per free user). | Free user translation history exceeding 100 entries | Oldest translation entries beyond 100 count automatically pruned during insert/job. |
| **TC-F08-5** | Feature 8: Safe Footprint Background Pruning | Enforce `HISTORY_LIMIT_PRO` (1,000 rows per Pro user). | Pro user translation history exceeding 1,000 entries | Oldest translation entries beyond 1,000 count automatically pruned. |
| **TC-F09-1** | Feature 9: Guest & User Usage Counter Badge | Verify `UsageCounterBadge` credit fetch for free users. | Signed-in free user session on frontend | Component fetches `/api/check-credits` and displays remaining credit ratio. |
| **TC-F09-2** | Feature 9: Guest & User Usage Counter Badge | Verify green badge styling when >50% credits remain. | Daily credit balance > 12 out of 25 | Badge displays green background/border (`bg-emerald-500/10 text-emerald-400`). |
| **TC-F09-3** | Feature 9: Guest & User Usage Counter Badge | Verify amber badge styling when <50% credits remain. | Daily credit balance between 1 and 12 out of 25 | Badge displays amber background/border (`bg-amber-500/10 text-amber-400`). |
| **TC-F09-4** | Feature 9: Guest & User Usage Counter Badge | Verify red badge styling when 0 credits remain. | Daily credit balance == 0 out of 25 | Badge displays red background/border (`bg-red-500/10 text-red-400`). |
| **TC-F09-5** | Feature 9: Guest & User Usage Counter Badge | Verify guest tier pill `[GUEST]` rendering for unauthenticated visitors. | Visitor without JWT auth cookie | Header displays `[GUEST]` pill with remaining guest credits (e.g., `3 / 5 left`). |
| **TC-F10-1** | Feature 10: Quota Exceeded Modal Hook | Verify `QuotaExceededModal` trigger on HTTP 429 response. | API endpoint returns HTTP 429 during stream or request | Frontend translation hook populates `quotaError` state and opens modal overlay. |
| **TC-F10-2** | Feature 10: Quota Exceeded Modal Hook | Verify countdown timer calculation in modal. | Modal initialized with `retry_after_seconds: 3600` | Modal renders live ticking countdown timer starting at `01:00:00`. |
| **TC-F10-3** | Feature 10: Quota Exceeded Modal Hook | Verify "Upgrade to Pro" CTA navigation link. | Click on primary CTA button in quota modal | User navigated to `/signup?plan=pro` page. |
| **TC-F10-4** | Feature 10: Quota Exceeded Modal Hook | Verify "Create a free account (25/day)" secondary CTA. | Modal triggered by guest rate limit 429 error | Modal renders secondary CTA button directing guest to sign up for free account. |
| **TC-F10-5** | Feature 10: Quota Exceeded Modal Hook | Verify modal dismiss via `Escape` key or backdrop click. | Press `Escape` key or click modal backdrop | Modal closes and clears `quotaError` state cleanly. |
| **TC-F11-1** | Feature 11: Streamlined Guest Onboarding | Allow friction-free guest translation on homepage. | Unauthenticated user visits homepage and inputs code | Translation streams immediately without blocking auth popups. |
| **TC-F11-2** | Feature 11: Streamlined Guest Onboarding | Trigger signup prompt on guest "Save Translation" click. | Guest user clicks "Save Translation" button | Onboarding modal appears promoting free account creation to save history. |
| **TC-F11-3** | Feature 11: Streamlined Guest Onboarding | Trigger signup prompt on guest "Import Gist" click. | Guest user clicks "Import Gist" feature | Onboarding modal appears explaining Gist sync requires free account. |
| **TC-F11-4** | Feature 11: Streamlined Guest Onboarding | Trigger signup prompt on guest "Export Code" click. | Guest user clicks "Export Code" feature | Onboarding modal appears promoting account registration for export capabilities. |
| **TC-F11-5** | Feature 11: Streamlined Guest Onboarding | Preserve guest workbench state across signup redirection. | Guest initiates signup from onboarding modal | Active code snippet saved in session storage and restored post-signup. |
| **TC-F12-1** | Feature 12: Zero-Budget Deployment Guide | Verify environment variables documentation in `ZERO_BUDGET_DEPLOYMENT.md`. | Review `ZERO_BUDGET_DEPLOYMENT.md` contents | Complete list of required env vars documented (`SUPABASE_URL`, `SUPABASE_JWT_SECRET`, etc.). |
| **TC-F12-2** | Feature 12: Zero-Budget Deployment Guide | Verify Gunicorn production start command documentation. | Review backend deployment section in guide | Guide specifies `gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker`. |
| **TC-F12-3** | Feature 12: Zero-Budget Deployment Guide | Verify free tier limits breakdown table in deployment guide. | Review service limits section in guide | Guide accurately details Groq (14.4k req/day), Supabase (500MB), Upstash (10k req/day). |
| **TC-F12-4** | Feature 12: Zero-Budget Deployment Guide | Verify Supabase transaction pooler port documentation. | Review database setup section in guide | Guide specifies port 6543 for transaction pooling mode. |
| **TC-F12-5** | Feature 12: Zero-Budget Deployment Guide | Verify health check endpoint routes in deployment guide. | Review monitoring section in guide | Health route matches backend implementation (`/api/v1/utility/health`). |
| **TC-F13-1** | Feature 13: Environment Template & DX Alignment | Eliminate duplicate variable declarations in `.env.example`. | Audit `.env.example` file keys | Zero duplicate keys remain (e.g. single `TRUST_PROXY_HOPS` entry). |
| **TC-F13-2** | Feature 13: Environment Template & DX Alignment | Align default DB pool settings in `.env.example`. | Inspect default pool values in `.env.example` | Defaults set to `DB_POOL_SIZE=5`, `DB_POOL_RECYCLE=300`. |
| **TC-F13-3** | Feature 13: Environment Template & DX Alignment | Verify startup validation success with valid `.env`. | Run `validate_production_env()` with required vars | Validation passes and logs success confirmation message. |
| **TC-F13-4** | Feature 13: Environment Template & DX Alignment | Verify startup failure on missing required production vars. | Run `validate_production_env()` with `ENV=production` & missing JWT secret | `RuntimeError` raised identifying missing environment variable. |
| **TC-F13-5** | Feature 13: Environment Template & DX Alignment | Document Fernet key generation for `TOKEN_ENCRYPTION_KEY`. | Inspect inline documentation in `.env.example` | Clear inline instructions provided for generating Fernet base64 key. |
| **TC-F14-1** | Feature 14: Executive Launch Documentation | Update `DEEP_DIVE_REPORT.md` with zero-budget startup architecture. | Review `DEEP_DIVE_REPORT.md` architecture section | Report thoroughly details zero-cost infrastructure and rate-limiting stack. |
| **TC-F14-2** | Feature 14: Executive Launch Documentation | Document CFO zero-cost compliance controls in report. | Review `DEEP_DIVE_REPORT.md` financial controls | Report details hard caps preventing unintended cloud vendor charges. |
| **TC-F14-3** | Feature 14: Executive Launch Documentation | Document CTO code hygiene and modularity in report. | Review `DEEP_DIVE_REPORT.md` technical debt section | Report documents dead code removal and repository modularization metrics. |
| **TC-F14-4** | Feature 14: Executive Launch Documentation | Document VP Engineering automated test suite results. | Review `DEEP_DIVE_REPORT.md` verification section | Report records 100% pytest pass, 100% vitest pass, 0 ruff errors, exit 0 build. |
| **TC-F14-5** | Feature 14: Executive Launch Documentation | Update unified issue inventory table in report. | Review `DEEP_DIVE_REPORT.md` issue inventory | Inventory reflects 0 open critical/high issues across all project tracks. |
| **TC-F15-1** | Feature 15: E2E Testing Suite & Final Green Gate | Execute pytest backend suite with 0 failures and 0 errors. | Command: `python -m pytest tests/ -v` | All backend test cases pass cleanly with 0 failures and 0 errors. |
| **TC-F15-2** | Feature 15: E2E Testing Suite & Final Green Gate | Execute Ruff linter and static analysis with 0 violations. | Command: `ruff check .` | Analysis completes with 0 warnings and 0 errors across codebase. |
| **TC-F15-3** | Feature 15: E2E Testing Suite & Final Green Gate | Execute frontend production build with exit status code 0. | Command: `cd frontend && npm run build` | Next.js compilation succeeds with exit code 0 and zero TypeScript errors. |
| **TC-F15-4** | Feature 15: E2E Testing Suite & Final Green Gate | Execute Vitest unit/component suite with 0 failures. | Command: `cd frontend && npm test` | Vitest executes all component/hook tests with 100% pass rate. |
| **TC-F15-5** | Feature 15: E2E Testing Suite & Final Green Gate | Execute Playwright E2E signup test workflow. | Command: `cd frontend && npx playwright test` | End-to-end signup user journey executes and passes completely. |

---

### Tier 2: Boundary & Corner Cases (>= 5 Test Cases per Feature = 75+ Test Cases)

| Test Case ID | Target Feature | Boundary / Corner Condition | Observed & Documented System Behavior |
|--------------|----------------|----------------------------|---------------------------------------|
| **TC-B01-1** | Feature 1: Backend Dead Code | Direct import attempt of `app.db.repositories.translation_repo` | `ImportError` / `ModuleNotFoundError` raised immediately; no lingering circular import. |
| **TC-B01-2** | Feature 1: Backend Dead Code | Direct import attempt of `LegacyModernizationOrchestrator` | `ModuleNotFoundError` raised cleanly without side-effects on active service imports. |
| **TC-B01-3** | Feature 1: Backend Dead Code | Call `get_completion()` without legacy `get_async_openai_class` shim | AsyncOpenAI client initializes directly and handles request cleanly. |
| **TC-B01-4** | Feature 1: Backend Dead Code | Execute repository operations under 50 concurrent async tasks | Repositories in `app.repositories` execute queries cleanly without dead code fallback calls. |
| **TC-B01-5** | Feature 1: Backend Dead Code | Inspect `sys.modules` runtime loading during test suite execution | Verified that zero deleted legacy modules are loaded into Python memory. |
| **TC-B02-1** | Feature 2: Frontend Dead Code | Attempt execution of deleted build script `replace_colors.js` | npm build script configuration functions cleanly without referencing deleted script. |
| **TC-B02-2** | Feature 2: Frontend Dead Code | Render main landing page without orphan SVGs in `public/` directory | Next.js image loader renders all active assets without 444/404 image load errors. |
| **TC-B02-3** | Feature 2: Frontend Dead Code | Next.js bundle analysis post-dead code cleanup | Tree-shaking eliminates unreferenced icon modules and unused helper functions. |
| **TC-B02-4** | Feature 2: Frontend Dead Code | Pass undefined/null props to `UsageCounterBadge` and `QuotaExceededModal` | Component fallbacks render safe UI state without client-side React hydration errors. |
| **TC-B02-5** | Feature 2: Frontend Dead Code | TypeScript build with strict `noUnusedLocals` and `noUnusedParameters` | Zero unused variable compiler warnings or errors reported during compilation. |
| **TC-B03-1** | Feature 3: Root Artifact Cleanup | Run test suite in read-only file system (where `test.db` disk file fails) | Pytest succeeds completely using in-memory `sqlite+aiosqlite:///:memory:` engine. |
| **TC-B03-2** | Feature 3: Root Artifact Cleanup | Execute Alembic schema migrations without root `schema_migration.sql` | Alembic reads migration scripts exclusively from `app/db/migrations/` and updates DB cleanly. |
| **TC-B03-3** | Feature 3: Root Artifact Cleanup | File system search for `.sql` files in root and `docs/legacy/sql/` | Zero legacy SQL files found; database versioning centralized in Alembic. |
| **TC-B03-4** | Feature 3: Root Artifact Cleanup | Perform migration downgrade to base and re-upgrade to head | Migration rollback and re-apply cycle completes cleanly without depending on deleted artifacts. |
| **TC-B03-5** | Feature 3: Root Artifact Cleanup | Container build context inspection following root artifact removal | Docker build context size reduced, eliminating unnecessary disk artifacts from image build. |
| **TC-B04-1** | Feature 4: Groq Caps & TPM/RPM | Submit input code payload with exactly 4,000 chars vs 4,001 chars | 4,000 chars passes validation; 4,001 chars raises HTTP 413 "Input size exceeds limit". |
| **TC-B04-2** | Feature 4: Groq Caps & TPM/RPM | Submit input code payload under `PROTECTION_MODE=EMERGENCY` | Input size capped at 300 chars; requests exceeding 300 chars rejected immediately. |
| **TC-B04-3** | Feature 4: Groq Caps & TPM/RPM | Groq TPM count at 99,999 tokens (passes) vs 100,001 tokens (fails) | 99,999 tokens allowed through; 100,001 tokens raises HTTP 429 `limit_type: "tpm_limit"`. |
| **TC-B04-4** | Feature 4: Groq Caps & TPM/RPM | Groq RPM count at 6,000 requests in 60s (passes) vs 6,001 requests (fails) | 6,000th request succeeds; 6,001st request raises HTTP 429 `limit_type: "rpm_limit"`. |
| **TC-B04-5** | Feature 4: Groq Caps & TPM/RPM | `estimate_tokens` heuristic with multi-byte UTF-8 unicode code snippets | Token estimator handles unicode characters without throwing string index encoding errors. |
| **TC-B05-1** | Feature 5: LLM Model Failover | Primary Groq model returns 429 rate limit error | `get_completion` catches 429, logs warning, and switches to `llama-3.1-8b-instant`. |
| **TC-B05-2** | Feature 5: LLM Model Failover | Primary model returns malformed non-JSON completion response | `clean_json_response` attempts repair; if repair fails, switches to fallback model. |
| **TC-B05-3** | Feature 5: LLM Model Failover | Primary AND Secondary Groq models fail; OpenRouter key configured | Request switches to OpenRouter `meta-llama/llama-3.3-70b-instruct` and succeeds. |
| **TC-B05-4** | Feature 5: LLM Model Failover | All external LLM endpoints fail; input matches historical code hash | `find_stale_translation` returns cached translation payload marked `stale_recovery`. |
| **TC-B05-5** | Feature 5: LLM Model Failover | All external LLM endpoints fail and history cache has zero matches | HTTP 500 exception raised cleanly: "Translation failed on all providers". |
| **TC-B06-1** | Feature 6: Structured 429 Payloads | Guest translation count reaching 6 (>5 limit) | Returns HTTP 429 with JSON body `limit_type: "guest_daily_limit"` and `Retry-After: 86400`. |
| **TC-B06-2** | Feature 6: Structured 429 Payloads | TPM limit triggered at second 59 of minute window | `retry_after_seconds` equals 1; `Retry-After` header set to `1`. |
| **TC-B06-3** | Feature 6: Structured 429 Payloads | TPM limit triggered at second 01 of minute window | `retry_after_seconds` equals 59; `Retry-After` header set to `59`. |
| **TC-B06-4** | Feature 6: Structured 429 Payloads | Validate response header `Retry-After` format against RFC 7231 | Header contains valid decimal integer string matching payload `retry_after_seconds`. |
| **TC-B06-5** | Feature 6: Structured 429 Payloads | Pass standard string error detail to `HTTPException(429, detail="Error")` | Exception handler normalizes payload to `{"detail": {"message": "Error", "limit_type": "rate_limit"}}`. |
| **TC-B07-1** | Feature 7: DB Connection Pool | 15 concurrent DB queries executed under `pool_size=5`, `max_overflow=10` | All 15 requests execute successfully; connections beyond 5 overflow and recycle cleanly. |
| **TC-B07-2** | Feature 7: DB Connection Pool | 16th concurrent DB request exceeding `max_overflow=10` limit | Request waits up to 30s timeout and raises `TimeoutError` without crashing engine pool. |
| **TC-B07-3** | Feature 7: DB Connection Pool | Connection idle in pool for 301 seconds (`pool_recycle=300`) | Engine automatically recycles stale socket connection before executing next query. |
| **TC-B07-4** | Feature 7: DB Connection Pool | PgBouncer mode activated with `DATABASE_POOL_URL` in production | Engine configures `pool_size=1`, `max_overflow=0` for serverless PgBouncer compatibility. |
| **TC-B07-5** | Feature 7: DB Connection Pool | Network disruption drops DB connection during session active state | `pool_pre_ping` detects broken connection and raises OperationalError for clean retry. |
| **TC-B08-1** | Feature 8: Safe Footprint Pruning | Run `prune_anonymous_history` with cutoff date exactly on timestamp boundary | Boundary rows evaluated correctly: `< cutoff` deleted, `>= cutoff` retained. |
| **TC-B08-2** | Feature 8: Safe Footprint Pruning | Execute `prune_anonymous_history` against database with 50,000 guest rows | Single bulk SQL `DELETE` query completes efficiently without memory exhaustion. |
| **TC-B08-3** | Feature 8: Safe Footprint Pruning | Nightly pruning for free user with 100 history rows (passes) vs 101 rows | 100 rows retained; 101st row (oldest) deleted to enforce `HISTORY_LIMIT_FREE`. |
| **TC-B08-4** | Feature 8: Safe Footprint Pruning | Run `prune_stale_vectors` on vectors referenced in workspace state | Foreign-key referenced vectors preserved; orphan vectors older than 30 days pruned. |
| **TC-B08-5** | Feature 8: Safe Footprint Pruning | Pruning task execution during active concurrent translation saves | Transaction isolation prevents DB deadlocks; new inserts complete normally. |
| **TC-B09-1** | Feature 9: Usage Counter Badge | Free user daily remaining credit balance drops from 1 to 0 | Badge dynamically changes style class from amber (`text-amber-400`) to red (`text-red-400`). |
| **TC-B09-2** | Feature 9: Usage Counter Badge | `/api/check-credits` returns HTTP 500 or network timeout | Badge gracefully renders `null` without throwing React client-side rendering error. |
| **TC-B09-3** | Feature 9: Usage Counter Badge | User auth state transitions from logged-in to logged-out | Badge immediately updates from `[FREE]` credit ratio to `[GUEST]` credit count. |
| **TC-B09-4** | Feature 9: Usage Counter Badge | User upgrades to Pro tier (`isPro=true`) | Badge detects Pro entitlement and unmounts/hides credit counter from header. |
| **TC-B09-5** | Feature 9: Usage Counter Badge | Mobile screen viewport rendering (< 640px width) | Responsive CSS classes (`hidden sm:inline-flex`) collapse badge cleanly on small screens. |
| **TC-B10-1** | Feature 10: Quota Exceeded Modal | Countdown timer in modal reaches `00:00:00` | Timer halts at zero without negative values; reset prompt displayed to user. |
| **TC-B10-2** | Feature 10: Quota Exceeded Modal | Receive HTTP 429 response with `retry_after_seconds = 0` | Countdown box element hidden from modal rendering; generic refresh prompt shown. |
| **TC-B10-3** | Feature 10: Quota Exceeded Modal | Click backdrop overlay element surrounding modal box | Modal backdrop onClick triggers `onClose` callback and dismisses modal. |
| **TC-B10-4** | Feature 10: Quota Exceeded Modal | Click inside inner modal dialog box content area | Event propagation stopped (`e.stopPropagation()`); modal remains open. |
| **TC-B10-5** | Feature 10: Quota Exceeded Modal | Rapid succession of HTTP 429 stream error events | Modal hook deduplicates errors; single modal overlay instance rendered on screen. |
| **TC-B11-1** | Feature 11: Guest Onboarding | Guest user executes 5th translation (at daily limit cap) | 5th translation succeeds; 6th attempt opens `QuotaExceededModal` with guest signup CTA. |
| **TC-B11-2** | Feature 11: Guest Onboarding | Guest enters invalid/malformed GitHub Gist URL | Validation error displayed on input field before triggering guest signup modal. |
| **TC-B11-3** | Feature 11: Guest Onboarding | Guest clicks "Create Free Account" CTA in onboarding prompt | User redirected to `/signup`; active code payload stored in session storage. |
| **TC-B11-4** | Feature 11: Guest Onboarding | Guest completes registration flow and returns to workbench | Session storage retrieved; original code snippet auto-populated into editor. |
| **TC-B11-5** | Feature 11: Guest Onboarding | Guest explicitly dismisses onboarding prompt modal | Modal closes cleanly; guest remains on page with current translation output visible. |
| **TC-B12-1** | Feature 12: Zero-Budget Deployment | Copy env var template from `ZERO_BUDGET_DEPLOYMENT.md` to `.env` | FastAPI backend initializes without `KeyError` or environment configuration error. |
| **TC-B12-2** | Feature 12: Zero-Budget Deployment | Execute Gunicorn start command in 512MB RAM Linux container | Gunicorn master and 2 Uvicorn workers initialize within 180MB RAM footprint. |
| **TC-B12-3** | Feature 12: Zero-Budget Deployment | HTTP GET request to health route specified in deployment guide | `/api/v1/utility/health` returns HTTP 200 `{"status": "healthy"}`. |
| **TC-B12-4** | Feature 12: Zero-Budget Deployment | Vercel edge deployment static asset compilation | Next.js frontend compiles cleanly for deployment on Vercel CDN edge servers. |
| **TC-B12-5** | Feature 12: Zero-Budget Deployment | Render web service free tier deployment verification | Backend service responds to HTTP keep-alive pings without sleeping during tests. |
| **TC-B13-1** | Feature 13: Environment Template | Parse `.env.example` line by line using python key parser | Zero duplicate keys detected; configuration template verified clean. |
| **TC-B13-2** | Feature 13: Environment Template | Compare `.env.example` values against `app/core/config.py` defaults | Config default constants strictly match template values (`DB_POOL_SIZE=5`). |
| **TC-B13-3** | Feature 13: Environment Template | Launch app in development mode (`ENV=development`) with template vars | App starts cleanly and logs development configuration status message. |
| **TC-B13-4** | Feature 13: Environment Template | Launch app in production mode (`ENV=production`) with missing JWT secret | `validate_production_env()` raises `RuntimeError("SUPABASE_JWT_SECRET required in production")`. |
| **TC-B13-5** | Feature 13: Environment Template | Validate `TOKEN_ENCRYPTION_KEY` base64 Fernet format validator | Cryptographic key validator verifies key length and base64 encoding on startup. |
| **TC-B14-1** | Feature 14: Executive Documentation | Markdown linting verification of `DEEP_DIVE_REPORT.md` | Document contains valid Markdown formatting, clean headers, and aligned tables. |
| **TC-B14-2** | Feature 14: Executive Documentation | Verify file paths referenced in `DEEP_DIVE_REPORT.md` | All referenced file paths match existing files in repository tree. |
| **TC-B14-3** | Feature 14: Executive Documentation | Verify governance compliance metrics in report | CFO zero-cost controls and CTO code hygiene metrics accurately documented. |
| **TC-B14-4** | Feature 14: Executive Documentation | Verify table of contents anchor links in report | Anchor links navigate to matching header IDs across all report sections. |
| **TC-B14-5** | Feature 14: Executive Documentation | Executive audit review of zero-budget startup architecture | Document provides complete engineering overview suitable for launch review. |
| **TC-B15-1** | Feature 15: E2E Quality Gate | Run pytest with deprecation warning interception | Suite executes with zero failed tests and zero blocking deprecation warnings. |
| **TC-B15-2** | Feature 15: E2E Quality Gate | Run Ruff check across entire repository | Static analysis completes with 0 errors and 0 warnings reported. |
| **TC-B15-3** | Feature 15: E2E Quality Gate | Run Next.js production build with strict type-checking | Next.js build produces clean production bundle with status code 0. |
| **TC-B15-4** | Feature 15: E2E Quality Gate | Run Vitest unit & component test suite | All Vitest test suites execute and pass with 0 failures. |
| **TC-B15-5** | Feature 15: E2E Quality Gate | Run Playwright end-to-end user signup test script | Playwright headless test executes user signup flow and completes cleanly. |

---

### Tier 3: Cross-Feature Pairwise Combination Scenarios

```
                  +-----------------------------------+
                  |   Pairwise Interaction Matrix     |
                  +-----------------------------------+
                                    |
     +------------------------------+------------------------------+
     |                              |                              |
     v                              v                              v
+----+-------------------+    +-----+------------------+    +------+------------------+
| Groq Limits + Failover |    | DB Pooling + Pruning   |    | 429 Payload + UX Modal   |
| (Feature 4 x Feature 5)|    | (Feature 7 x Feature 8)|    | (Feature 6 x Feature 10) |
+------------------------+    +------------------------+    +-------------------------+
     |                              |                              |
     v                              v                              v
+----+-------------------+    +-----+------------------+    +------+------------------+
| Test Case: TC-INT-01   |    | Test Case: TC-INT-02   |    | Test Case: TC-INT-03    |
+------------------------+    +------------------------+    +-------------------------+
```

#### Pairwise Scenario 1: Groq Token Caps x LLM Model Failover (Feature 4 x Feature 5)
- **Scenario ID**: `TC-INT-01`
- **Component Stack**: `app.core.quota` -> `app.services.ai` -> Groq API Client
- **Description**: Verifies that when a high-token translation request triggers Groq rate-limiting or 429 error on primary model `llama-3.3-70b-versatile`, the token counter tracks usage in Redis/LRU, and `get_completion` seamlessly triggers failover to `llama-3.1-8b-instant` without losing token budget accounting or raising unhandled 500 errors.
- **Preconditions**: Primary Groq model simulated with HTTP 429 rate limit response.
- **Expected Outcome**: Primary model failure caught; fallback model invoked; token usage counter incremented; response returns 200 OK with `model_used: "Groq Llama 3.1 8B (fallback)"`.

#### Pairwise Scenario 2: DB Connection Pool x Background Footprint Pruning (Feature 7 x Feature 8)
- **Scenario ID**: `TC-INT-02`
- **Component Stack**: `app.core.database_session` -> `app.queue.tasks` -> `app.repositories.translation`
- **Description**: Verifies that background Celery pruning task `prune_database_footprint` executing bulk `prune_anonymous_history` and `prune_stale_vectors` operates safely within configured SQLAlchemy connection pool limits (`pool_size=5`, `max_overflow=10`) without blocking concurrent user translation writes or exhausting pool connections.
- **Preconditions**: Concurrent user translation save operations running alongside background pruning execution.
- **Expected Outcome**: Pruning task acquires DB session from pool, performs DELETE query, commits, and returns session to pool; user translation save requests complete without connection timeout errors.

#### Pairwise Scenario 3: Structured 429 Payloads x Quota Exceeded Modal (Feature 6 x Feature 10)
- **Scenario ID**: `TC-INT-03`
- **Component Stack**: FastAPI Endpoint -> `http_exception_handler` -> Frontend SSE Client -> `QuotaExceededModal`
- **Description**: Verifies end-to-end contract between backend structured HTTP 429 exception and frontend UX modal rendering. When backend raises `HTTPException(429, detail={"detail": "Daily limit reached", "limit_type": "user_daily_limit", "retry_after_seconds": 3600, "tier_limit": 25})`, frontend stream hook parses JSON detail and passes error object to `QuotaExceededModal`, which renders countdown timer starting at `01:00:00`.
- **Preconditions**: Free signed-in user submits 26th translation request of the day.
- **Expected Outcome**: HTTP 429 response received with `Retry-After: 3600` header; frontend displays backdrop modal showing "Daily limit reached", "25 daily translations used", and countdown timer `01:00:00`.

#### Pairwise Scenario 4: Streamlined Guest Onboarding x Usage Counter Badge (Feature 9 x Feature 11)
- **Scenario ID**: `TC-INT-04`
- **Component Stack**: Frontend Header (`UsageCounterBadge`) -> Onboarding Modal -> Auth Context (`useAuth`)
- **Description**: Verifies usage counter badge and guest onboarding integration. Unauthenticated visitor sees `[GUEST] 5 / 5 left` badge in header. As guest performs translations, remaining count decrements to `0 / 5 left` (badge turns red). Next translation attempt or Gist import opens guest onboarding modal prompting account creation. Upon completing signup, `useAuth` updates session, badge refreshes to `[FREE] 25 / 25 left` (green pill).
- **Preconditions**: Guest user translating code snippets until quota exhaustion.
- **Expected Outcome**: Smooth UI state transition from guest badge to guest limit modal to authenticated free tier badge without full page reload.

#### Pairwise Scenario 5: Environment Template x Startup Validation x Deployment Guide (Feature 12 x Feature 13 x Feature 14)
- **Scenario ID**: `TC-INT-05`
- **Component Stack**: `.env.example` -> `app.main.validate_production_env` -> `ZERO_BUDGET_DEPLOYMENT.md`
- **Description**: Verifies configuration consistency across deployment guide, env template, and runtime validator. Environment variables listed in `ZERO_BUDGET_DEPLOYMENT.md` match `.env.example` keys exactly. When app starts in production mode (`ENV=production`), `validate_production_env()` checks all critical variables listed in deployment guide and passes.
- **Preconditions**: Production environment initialization with guide-specified env vars.
- **Expected Outcome**: Startup validator logs `"Environment validation passed — all critical vars are set"` and FastAPI app starts cleanly.

---

### Tier 4: Real-World Application End-to-End Scenarios

```
+-----------------------------------------------------------------------------------+
|               Real-World End-to-End User Journey (Tier 4)                         |
+-----------------------------------------------------------------------------------+
| 1. Visitor arrives as Guest -> Translates code (Badge: [GUEST] 5/5 -> 4/5)        |
| 2. Guest hits 5/5 daily limit -> QuotaExceededModal triggers with Countdown       |
| 3. Guest clicks "Create free account" -> Redirected to /signup                     |
| 4. Guest registers -> Receives Welcome email -> Badge updates: [FREE] 25/25 left  |
| 5. Free user performs 25 translations -> Reaches 0/25 -> Modal triggers           |
| 6. User attempts Gist import -> Guest onboarding modal prompts Pro upgrade        |
| 7. Nightly 3 AM UTC Celery job runs -> prune_database_footprint cleans guest data |
+-----------------------------------------------------------------------------------+
```

#### Real-World Scenario 1: Complete Guest-to-Authenticated Lifecycle & Quota Exhaustion Workflow
- **Scenario ID**: `TC-RW-01`
- **Description**: Tests the full lifecycle of a developer discovering Anuvaad:
  1. Visitor arrives on homepage unauthenticated. Usage counter badge displays `[GUEST] 5 / 5 left`.
  2. Visitor inputs Python snippet and translates to English. Translation streams back successfully. Usage badge updates to `[GUEST] 4 / 5 left`.
  3. Visitor submits 4 more translations, exhausting the guest quota (5/5).
  4. Visitor attempts a 6th translation. Backend returns HTTP 429 (`limit_type: "guest_daily_limit"`).
  5. Frontend catches 429 and pops `QuotaExceededModal` displaying countdown to UTC midnight and CTA "Create a free account (25/day)".
  6. Visitor clicks CTA, signs up for a free account.
  7. Upon account creation, welcome email task is enqueued via Resend.
  8. Header refreshes to `[FREE] 25 / 25 left` badge.
  9. User uses 25 free translations over the day. At translation #26, system pops `QuotaExceededModal` with "Upgrade to Pro — Unlimited translations" CTA.
- **Validation Criteria**: All UI transitions occur seamlessly; HTTP 429 contract is strictly respected; background Celery email task is enqueued; usage counters update accurately in Redis and DB.

#### Real-World Scenario 2: High-Traffic Spike with Primary Provider Failure & Background Footprint Cleanup
- **Scenario ID**: `TC-RW-02`
- **Description**: Tests platform resilience under zero-budget operational load:
  1. 100 concurrent guest visitors hit `/api/v1/code-to-english` simultaneously.
  2. Per-IP rate limiter (`TRUST_PROXY_HOPS=1`) isolates visitors correctly behind reverse proxy.
  3. Groq primary model `llama-3.3-70b-versatile` hits 6,000 RPM rate limit and responds with 429.
  4. Backend `get_completion` router catches 429 on primary model and transparently redirects requests to fallback model `llama-3.1-8b-instant`.
  5. All 100 translation requests complete successfully without returning HTTP 500 to users.
  6. Concurrent DB writes enqueue translation history items. DB connection pool (`pool_size=5`, `max_overflow=10`) handles write burst cleanly.
  7. At 3:00 AM UTC, Celery Beat triggers `prune_database_footprint`.
  8. `prune_anonymous_history` deletes guest records older than 7 days, and `prune_stale_vectors` deletes vector embeddings older than 30 days.
  9. Supabase database storage footprint remains safely below 500 MB limit.
- **Validation Criteria**: Zero 500 errors during primary model rate limiting; connection pool handles write concurrency without timeout; background pruning maintains DB storage budget automatically.

---

## 5. Automated Verification Commands & Execution Guide

### Backend Verification:
```bash
# 1. Run full backend pytest suite (all 245+ tests)
python -m pytest tests/ -v

# 2. Run zero-budget specific resilience tests
python -m pytest tests/test_zero_budget.py -v

# 3. Run backend linter & static analysis check
ruff check .
```

### Frontend Verification:
```bash
# Navigate to frontend directory
cd frontend

# 1. Run Vitest unit & component test suite (79+ tests)
npm test

# 2. Run TypeScript compilation & Next.js production build check
npm run build

# 3. Run Playwright end-to-end user tests
npx playwright test
```

---

## 6. Green Gate Criteria for Milestone 5

Before any release or production deployment, the project must satisfy the **Green Gate Threshold**:

| Quality Metric | Target Threshold | Verification Command | Failure Action |
|----------------|------------------|----------------------|----------------|
| **Backend Pytest** | 100% Passed (0 Failures, 0 Errors) | `python -m pytest tests/ -v` | Block deployment; repair failing test logic. |
| **Backend Linting** | 0 Warnings, 0 Errors | `ruff check .` | Block deployment; run `ruff check --fix .`. |
| **Frontend Vitest** | 100% Passed (0 Failures) | `cd frontend && npm test` | Block deployment; repair component/hook specs. |
| **Frontend Production Build** | Exit Code 0 (0 TS Errors) | `cd frontend && npm run build` | Block deployment; fix TypeScript/Next.js errors. |
| **Playwright E2E** | 100% Passed | `cd frontend && npx playwright test` | Block deployment; fix end-to-end user flow. |

---
*Specification standard established by `worker_infra` (teamwork_preview_worker)*  
