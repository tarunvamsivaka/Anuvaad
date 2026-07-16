# Repository Baseline

## Identity
- **Repository Root**: `C:/Users/tarun/Anuvaad/Anuvaad` (Verified via `git rev-parse --show-toplevel`)
- **Branch**: `master`
- **Commit SHA**: `c4e2cebf68449b957d720a0067f5af67caae1009`
- **Working Tree State**: Clean (no uncommitted changes)
- **Ignored Files**:
  - Environment files: `.env`, `.env.*`
  - Python caches: `__pycache__/`, `*.py[cod]`, `.pytest_cache/`, `.ruff_cache/`
  - Node dependencies: `node_modules/`
  - Build output: `frontend/.next/`, `vscode-extension/out/`, `vscode-extension/*.vsix`
  - Test artifacts: `frontend/test-results/`, `frontend/playwright-report/`, `.playwright-report/`
  - Internal docs: `implementation_plan*`, `walkthrough*`, `task.md`

## Architecture Map (Expanded)
- `app/` (Backend):
  - **FastAPI application entry point**: `main.py`
  - **API routers**: `routers/` (billing, demo, github, history, onboarding, repo_search, translate, utility, workspace)
  - **Authentication**: Supabase-based token validation (`core/auth.py` via `is_token_pro`, etc.)
  - **Workspace logic**: `routers/workspace.py` and `repositories/workspace.py` (Application-level isolation, no RLS).
  - **Translation domain**: `routers/translate/` (code_to_english, english_to_code, code_to_code, upload)
  - **AI integration**: `services/ai.py` (Handles completions, caching, and stream routing)
  - **Provider selection**: Hardcoded failovers in `services/ai.py` (Groq -> OpenRouter) and `queue/tasks.py` (OpenAI -> HF for embeddings).
  - **Streaming**: Implemented via Async Generators yielding SSE chunks (`stream_code_to_english`).
  - **Persistence/repositories**: `repositories/` (vectors, subscription, github_token, workspace)
  - **SQLAlchemy models**: `models/db_models.py`
  - **Database session handling**: `core/database_session.py` (AsyncSessionLocal)
  - **Caching**: `core/cache.py` (Redis with Upstash fallback)
  - **Rate limiting**: Enforced in `core/quota.py` (`enforce_quotas_and_protection`)
  - **Background jobs**: `queue/tasks.py`
  - **Celery configuration**: `queue/celery_config.py`
  - **Billing**: `routers/billing.py` (Razorpay webhooks) and Celery tasks
  - **Email**: `services/email.py` (Resend REST integration)
  - **API keys**: Managed in `models/db_models.py` (hashed with argon2/sha256)
  - **Observability**: `utility.py` (Prometheus), `services/ai.py` (Sentry spans)
- `frontend/` (Next.js):
  - **Routing architecture**: Next.js App Router (`src/app/`)
  - **Application shell**: `src/app/layout.tsx` (includes PostHogProvider)
  - **Authentication/session**: Supabase SSR (`src/proxy.ts`, `src/infrastructure/supabase.ts`, `src/lib/supabase-types.ts`)
  - **Analytics**: `src/infrastructure/analytics.ts` (PostHog)
- `vscode-extension/`:
  - Contains basic package configuration and build scripts.
  - CI includes typecheck and linting (though lint config is missing/non-blocking).

## Technology Inventory & Active Usage
- **pgvector**: ACTIVELY_USED (Alembic migration `a3f8c1d2e9b4_add_repo_embeddings_table.py`, used in `app/repositories/vectors.py` for cosine distance).
- **Redis**: ACTIVELY_USED (`app/core/cache.py` as primary cache backend).
- **upstash-redis**: CONFIGURED (Supported in `app/core/cache.py` as a fallback if `UPSTASH_REDIS_URL` is set).
- **Celery**: ACTIVELY_USED (Tasks for history saving, email, billing, large files, and GitHub repo chunking in `app/queue/tasks.py`).
- **OpenAI**: ACTIVELY_USED (`generate_embeddings_openai` in `app/services/embedding.py` and via `AsyncOpenAI` client wrapper for Groq/OpenRouter in `app/services/ai.py`).
- **Razorpay**: ACTIVELY_USED (Webhook processing in `app/routers/billing.py` and `app/queue/tasks.py`).
- **Resend**: ACTIVELY_USED (`app/services/email.py` for transactional emails).
- **Supabase**: ACTIVELY_USED (Authentication via `@supabase/ssr` on frontend and REST fallback in backend `app/core/database.py`).

## Verification Commands Inventory

**BACKEND**

- `pytest`: LOCALLY_RUN_AND_PASSED (Result: 195 passed, 3 warnings)
- `pip-audit`: CONFIGURED_IN_CI, NOT_LOCALLY_RUN
- `Ruff`: CONFIGURED_IN_CI, NOT_LOCALLY_RUN
- `mypy` / `pyright`: NOT_CONFIGURED
- `Bandit`: NOT_CONFIGURED
- Alembic migration consistency validation: NOT_CONFIGURED

**FRONTEND**

- `ESLint`: LOCALLY_RUN_AND_PASSED
- `Vitest`: LOCALLY_RUN_AND_PASSED (Result: 47 tests passed)
- `tsc --noEmit`: CONFIGURED_IN_CI, NOT_LOCALLY_RUN
- Next.js production build: CONFIGURED_IN_CI, NOT_LOCALLY_RUN
- Playwright E2E: CONFIGURED_IN_CI, NOT_LOCALLY_RUN
- `npm audit`: CONFIGURED_IN_CI, NOT_LOCALLY_RUN
- VS Code extension lint: CONFIGURED_IN_CI_NON_BLOCKING

**Note**: The baseline execution previously marked "TEST SUITE PASSED". This confirms unit test success but does NOT mean "FULL PRODUCTION VERIFICATION PASSED" as some static analysis (like `mypy`) and database migration testing is missing. A command being present in `ci.yml` means CONFIGURED_IN_CI. It does not prove a current successful CI run unless current CI run evidence was explicitly inspected.

## Baseline Failures
- **None**: Both backend and frontend test suites completed successfully. No baseline failures exist in the core test suites.
