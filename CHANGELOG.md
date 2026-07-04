# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security & Architecture Audit Remediation (2026-07-04)

#### Critical Fixes
- **C-01/C-02:** Confirmed missing imports (`SUPABASE_ANON_KEY`, `get_http_client`) in `history.py` are present; unblocked failing test `test_stats_accessible_to_whitelisted_admin`
- **C-03:** `get_user_credits()` in `quota.py` migrated from raw `supabase_request()` to `subscription_repo.get_credits()` (ORM)
- **C-04:** `get_user_pro_status()` in `auth.py` migrated from raw `supabase_request()` to `subscription_repo.get_subscription()` (ORM) — eliminates one raw HTTP call per authenticated request

#### High Priority Fixes
- **H-01:** History pruning in `save_translation_background()` replaced O(N) REST scan loop with `translation_repo.prune_oldest()` — 2 SQL statements instead of N HTTP calls
- **H-02:** `get_today_usage_count()` fallback replaced `supabase_request_list()` (fetches all IDs) with `translation_repo.get_count_since()` (single `COUNT(*)`)
- **H-03:** Admin dashboard `model_calls` now read via `metrics.snapshot()` (Redis-aggregated) instead of in-memory singleton — fixes multi-worker Gunicorn undercounting
- **H-04:** Billing webhook task (`process_billing_webhook_task`) fully migrated from `supabase_request()` to `subscription_repo` ORM; added `update_by_razorpay_id()` repo method

#### Medium Priority Fixes
- **M-01:** `DELETE /account` now hard-deletes all user data (translations, API keys, subscription) via ORM repos before calling Supabase Auth admin delete — prevents orphaned data
- **M-02:** LLM stale-recovery cache in `ai.py` replaced `supabase_request_list()` with `translation_repo.get_history()` ORM call
- **M-03/M-04:** Auto-fixed 13× W293 trailing whitespace + 1× F541 spurious f-string via `ruff --fix`
- **M-05:** Fixed `AsyncSessionLocal` import in `quota.py` to go directly to `database_session` (avoids re-export chain circular import risk)

#### Repository Additions
- `subscription_repo.update_by_razorpay_id()` — ORM update by Razorpay subscription ID
- `subscription_repo.delete_by_email()` — ORM hard-delete for account deletion
- `translation_repo.delete_all_for_user()` — ORM hard-delete all translations for a user
- `api_key_repo.delete_all_for_user()` — ORM hard-delete all API keys for a user

#### Infrastructure & CI
- **L-01:** Added Python 3.13 to CI test matrix (matches local dev environment)
- **L-02:** Added Redis service to CI test job so Redis-backed features are tested, not just gracefully skipped
- **L-03:** Added `vscode-extension` CI job (TypeScript typecheck + lint)
- **L-04:** Added `healthcheck` to `worker` and `beat` Docker Compose services — dead workers are now detected and restarted automatically

### Features
- **Repository Semantic Search (Phase 4):** Completed backend integration for GitHub repository indexing and vector search using OpenAI embeddings and pgvector.
- **Language Support:** Added detection for Assembly, Verilog, Terraform, Julia, Nim, Zig, Groovy, Fortran, OCaml, and Erlang.

### API
- Added `Sunset: Fri, 01 Jan 2027 00:00:00 GMT` header to all legacy `/api/*` routes to formalized the deprecation timeline.

## [1.4.0] - 2026-06-12

### Landing Page (Phase 5)
- Implemented anonymous demo translate endpoint `POST /api/demo/translate` — rate-limited to 3 req/IP/day, no auth required, pre-cached sample translations for JS/TS/Python/Go/Rust/Java (P-demo)
- Added 8 demo endpoint tests covering all supported languages, fallback, mode validation, headers, and rate decrement tracking
- Added `CustomCursor` motion primitive — GSAP quickTo amber dot + spring-lag ring, expands on hover, disabled on touch + reduced-motion (Phase 5 custom cursor deliverable)
- Exported `CustomCursor` from `components/motion` barrel; integrated into `LandingExperience.tsx`
- Landing experience uses 9-scene `SceneOrchestrator` with WebGL particle canvas (OffscreenCanvas worker) and CSS fallback backdrop

### Testing
- Backend test suite now at **196 tests** (added 8 demo endpoint tests)

---

## [1.3.0] - 2026-06-12

### Security
- Added prompt injection sanitisation to `english-to-code` and `sync-english-to-code` endpoints (SEC-06/07)
- Fixed webhook body parsing order: signature verification now runs before JSON parsing (BACK-09)
- Added Razorpay webhook idempotency guard via Redis SET NX to prevent duplicate event processing (BACK-03)
- Removed `access_token` from Pydantic request bodies in billing; all auth is now header-only (BACK-06)
- Updated `.gitignore` to exclude `frontend/.env.local` from git history (SEC-01/02)

### Performance
- Fixed `is_token_pro()` HTTP client leak: shared singleton client replaces per-call `AsyncClient` (BACK-04)
- Fixed LLM client re-instantiation: `AsyncOpenAI` clients for Groq/DeepSeek are now module-level singletons initialized in `lifespan` (BACK-02)
- Fixed `asyncio.Lock` race condition on HTTP client singleton (ARCH-05)
- Reduced Pro status cache TTL to 30 seconds and bust cache immediately on successful payment (FRONT-08/ARCH-04)
- History pruning changed from O(N) individual deletes to a single DB-side `DELETE ... WHERE id IN (SELECT ...)` query (BACK-07)
- Added composite index on `translation_history(user_email, created_at DESC)` for 10–100× speedup on quota queries (P5)

### Architecture
- Replaced `sys.modules.get("main")` DI anti-pattern with FastAPI `app.state` and `Depends(get_cache)` (BACK-01/ARCH-01)
- Removed `WorkspaceProvider` double mount from root layout (was mounted in both root and dashboard layouts) (ARCH-06)
- Removed redundant client-side auth redirect from `DashboardLayout` (FOUC fix) — `proxy.ts` handles all auth (ARCH-02)
- Replaced `dangerouslySetInnerHTML` sidebar CSS with a proper CSS module (`dashboard/layout.css`) (ARCH-05)
- Changed `useSubscriptionStatus` from POST to GET for HTTP-cache compliance (P4)
- Landing page V1 bundle leak fixed with `next/dynamic` lazy imports behind the `NEXT_PUBLIC_LANDING_V2` flag (ARCH-03)
- Consolidated landing page: `index.html` archived as `.html.archived`; Next.js App Router is now the single canonical source (FRONT-07)

### Frontend
- Fixed `--font-mono` CSS token mismatch: was referencing undefined `--font-geist-mono` (DS-03)
- Fixed `--sidebar-primary` dark mode token to use amber brand color instead of blue (DS-04)
- Decomposed 1,391-line translate page into focused components and hooks (FRONT-01)
- Added per-route `loading.tsx` skeleton files for all 6 dashboard routes (FRONT-04)
- Added `ErrorBoundary` + `ErrorCard` component wrapping all dashboard route children (FRONT-03)
- Replaced `window.location.href` hard redirect in billing with `next/navigation` router (FRONT-05)
- Removed 106 lines of commented-out billing code (FRONT-06)
- Fixed Sentry `tunnelRoute` rewrite conflict in `next.config.ts` (INFRA-05)
- Added Monaco-shaped editor skeleton (`components/ui/monaco-skeleton.tsx`) for cold-start loading (P6)
- Added `prefers-reduced-motion` hard guarantee in `globals.css` (belt-and-suspenders)
- Moved `@types/three` from `dependencies` to `devDependencies` (PERF-05)

### Design System
- Split `globals.css` from a monolith into modular token files (`design/tokens/*.css`, `design/css/*.css`)
- Verified GSAP 3.15.0 license: all Club GSAP plugins (SplitText, DrawSVG, MorphSVG, ScrollSmoother) are free since GSAP 3.12 under the GSAP Standard License. Documented in `package.json` (API-02)

### Infrastructure
- Added Nginx HTTPS server block with HSTS (max-age=63072000), OCSP stapling, and TLS 1.2/1.3 (`nginx.conf`) (INFRA-01)
- Added Redis password authentication in `docker-compose.yml` (INFRA-02)
- Added container health checks for all services (frontend, backend, nginx, redis) (INFRA-03)
- Configured Gunicorn with 4 `UvicornWorker` instances for production throughput (INFRA-04)
- Added `/api/v1/` versioned route prefix; legacy `/api/` routes preserved with `Deprecation` response headers (API-01)
- DB migration: renamed `stripe_subscription_id` to `razorpay_subscription_id` (BACK-10)

### Testing
- Added `TestEnglishToCodeSanitisation` and `TestWebhookIdempotency` test classes in `test_validation.py` (TEST-03)
- Vitest test suite expanded to 41 tests: language detection (19), hooks data layer (16), MonacoSkeleton component (6)
- Added Firefox, Safari/WebKit, and Mobile (Pixel 7, iPhone 14) projects to Playwright matrix (TEST-02)
- Added full Axe accessibility audit Playwright spec (`e2e/accessibility.spec.ts`) targeting 0 critical violations (ACC-01–04)
- Added structured logging with `structlog` replacing f-string log calls (BACK-08)

### Backend test count: 188 passing

## [1.2.0] - 2026-05-14

### Added
- GitHub Gist Import — paste a public Gist URL to import code directly into the translator workspace.
- Transactional email service via Resend (welcome, subscription confirmation, milestone emails).
- PostHog product analytics integration in the frontend with custom event tracking.
- Sentry error monitoring for both frontend (client, server, edge configs) and backend.
- Upstash Redis caching with automatic LRU memory fallback when Redis is unavailable.
- Translation credits system with one-time Razorpay checkout purchase flow.
- `/api/metrics` and `/api/metrics/prometheus` observability endpoints with HTTP Basic Auth.
- Rate limiting middleware (15 requests/minute per IP) backed by Redis.
- File upload endpoint (`/api/upload-file`) with extension-based language detection.
- Forgot password page and auth middleware for protected routes.
- Skeleton loading states for Monaco Editor and dashboard components.
- Workspace context provider for scoping translations to team workspaces.
- SEO: dynamic OpenGraph images, `sitemap.ts`, and structured meta tags.

### Changed
- Updated `.env.example` with proper grouping, [REQUIRED]/[OPTIONAL] labels, and inline documentation.
- Corrected `FRONTEND_URL` default from port 5500 to 3000 (matching Next.js dev server).
- Fixed CI pipeline to use `GROQ_API_KEY` + `DEEPSEEK_API_KEY` instead of non-existent `GEMINI_API_KEY`.
- Cleaned up `.dockerignore` to exclude test artifacts, migration files, and stale references.
- Updated `.gitignore` to exclude `node_modules/`, `.next/`, `test-results/`, and `playwright-report/`.
- README fully rewritten to accurately reflect the Groq + DeepSeek tech stack, all features, and complete API surface.

### Fixed
- README incorrectly stated "Google Gemini 2.5 Flash" — the backend actually uses Groq and DeepSeek models.
- README environment variables table listed `GEMINI_API_KEY` which does not exist in the codebase.
- `.dockerignore` referenced deleted files (`implementation_plan_1`, `walkthrough_1`, `audit_report1`).
- CI Docker health check used wrong environment variable name.

## [1.1.0] - 2026-05-08

### Added
- Supabase migration v4 and v5 for API keys table and enhanced RLS policies.
- Security definer helper function for workspace lookups (resolves RLS infinite recursion).
- Playwright end-to-end test configuration and auth setup.
- Docker Compose service for local Redis.

## [1.0.0] - 2026-05-01

### Added
- Complete FastAPI backend with intelligent LLM routing using Groq (Llama-3.3) and DeepSeek V3/R1.
- Server-Sent Events (SSE) streaming for real-time translation feedback in the UI.
- Next.js frontend built with App Router, shadcn/ui components, and persistent next-themes support.
- Three specialized translation modes: Code → English, English → Code, and Code → Code.
- Supabase Authentication (Google + GitHub OAuth) and robust PostgreSQL integration for user profiles and history.
- Razorpay billing portal with automated webhooks, subscription gating, and Pro-tier functionality.
- Team Workspaces for collaborative sharing of translation context and custom coding standards.
- Production-ready Docker multi-stage build orchestration and NGINX reverse proxy configuration.
- Comprehensive suite of 50+ Pytest tests validating core endpoints, cache performance, and AI fallback logic.
- Automated GitHub Actions CI/CD pipeline enforcing parallel backend tests, Python linters, and strict Next.js TypeScript compilation.
