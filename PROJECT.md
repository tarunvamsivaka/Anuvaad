# Project: Anuvaad Zero-Budget AI Code Translation Platform Transformation

## Architecture
- **Backend**: FastAPI (Python 3.11, SQLAlchemy 2.0 ORM, Pydantic v2, Groq/OpenRouter LLM engine)
- **Frontend**: Next.js 16 (React 19, Monaco Editor, SWR, SSE Buffer, Vitest)
- **Database**: PostgreSQL (Supabase 500MB free tier) + pgvector, SQLAlchemy async connection pooling (`pool_size=5`, `max_overflow=10`, `pool_recycle=300`)
- **Cache / Rate Limiting**: Upstash Redis (10k requests/day free tier) with in-memory LRU cache fallback
- **Hosting / Deployments**: Render backend web service + Vercel frontend web app
- **Background Tasks**: Celery + Redis for scheduled database footprint pruning (`prune_database_footprint`)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Groq Free Tier Guardrails | Input size caps (4,000 chars) and output token cap (max_tokens=1500) | M1 | R1 |
| 2 | Model Failover | Graceful failover to `llama-3.1-8b-instant` on rate limits / 429 errors | M1 | R1 |
| 3 | Client IP & User Rate Limits | 5/day for guests, 25/day for free users; structured HTTP 429 payload | M1 | R1 |
| 4 | DB Async Pool Settings | SQLAlchemy pool_size=5, max_overflow=10, pool_recycle=300 | M2 | R2 |
| 5 | Scheduled DB Footprint Pruning | Prune guest history (>7 days) & stale vector cache (>30 days) | M2 | R2 |
| 6 | Usage Counter & Tier Badge | Remaining credits header badge across TopBar, TranslateShell, Navbar | M3 | R3 |
| 7 | Quota Exceeded 429 Modal | Polished modal on HTTP 429 with live countdown reset timer & CTAs | M3 | R3 |
| 8 | Streamlined Guest Onboarding | Zero-friction guest translation & Gist save/import sign-up prompts | M3 | R3 |
| 9 | Product Landing & Pricing Polish | Update landing page, FAQ, and pricing cards to 5 guest / 25 free limits | M4 | R4 |
| 10| Zero-Budget Deployment Guide | Comprehensive ZERO_BUDGET_DEPLOYMENT.md guide for Vercel/Render/Supabase/Upstash/Groq | M4 | R4 |
| 11| Full Test Suite Verification | Extend pytest & vitest suites for rate limits, failover, 429 modal, DB pruning; 0 errors on build & ruff | M5 | R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Zero-Budget AI Quota & Resilience Architecture | Groq input/output caps, Groq model failover to `llama-3.1-8b-instant`, IP & user rate limits, structured 429 response | None | DONE |
| 2 | M2: Database Footprint Optimization & Connection Safety | Async DB connection pool settings (pool_size=5, pool_recycle=300), background pruning for anonymous history & stale vectors | M1 | DONE |
| 3 | M3: Startup User Onboarding & Usage Transparency UX | Header credits badge, HTTP 429 quota modal with countdown, guest translation & Gist import sign-up prompts | M1 | DONE |
| 4 | M4: Product Polish & Zero-Budget Deployment Guide | Landing page, FAQ, pricing update (5 guest / 25 free), ZERO_BUDGET_DEPLOYMENT.md, DEEP_DIVE_REPORT.md update | M3 | DONE |
| 5 | M5: Test Verification & Zero Regression | Pytest, Vitest, npm run build, and ruff checks all pass with 0 failures | M1, M2, M3, M4 | DONE |

## Code Layout
- `app/`: FastAPI backend application
  - `main.py`: App entry-point, lifespan, FastAPI factory, router mounts
  - `core/`: Cross-cutting concerns
    - `auth.py`: JWT (HS256/ES256/RS256) + API key verification; `get_client_ip()` proxy-trust
    - `cache.py`: `RedisCache` with Upstash REST + in-memory LRU fallback
    - `config.py`: All environment variable declarations and application constants
    - `constants.py`: Named constants replacing magic numbers (page sizes, limits, TTLs)
    - `database_session.py`: SQLAlchemy async engine, PgBouncer pool config
    - `metrics.py`: `MetricsCollector` for request/error/latency tracking
    - `quota.py`: `enforce_quotas_and_protection()`, usage tracking, rate-limit 429 helpers
    - `rate_limit.py`: FastAPI `Depends`-based sliding window rate limiter
    - `token_encryption.py`: `MultiFernet` key rotation for API key encryption
  - `api/middleware/`: HTTP middleware stack
    - `rate_limit.py`: Global per-IP/per-token sliding window middleware
    - `csrf.py`: CSRF protection for state-mutating endpoints
    - `security_headers.py`: HSTS, CSP, X-Frame-Options headers
    - `metrics_middleware.py`: Request latency and error recording
  - `domain/quota/policy.py`: `QuotaPolicy` dataclass — pure, side-effect-free quota logic
  - `models/`: SQLAlchemy ORM model definitions
  - `repositories/`: Data access layer (no raw SQL, no Supabase REST)
    - `translation.py`: Translation history CRUD + cursor-paginated queries
    - `subscription.py`: Pro/credit subscription queries
    - `api_key.py`: API key creation, Argon2id hashing, verification, revocation
    - `vectors.py`: pgvector embedding queries
  - `routers/`: HTTP route handlers (thin — delegate to services/repositories)
    - `translate/`: `code_to_english.py`, `english_to_code.py`, `code_to_code.py`, `upload.py`
    - `history.py`: Translation history, API keys, account management
    - `utility.py`: `/health`, `/health/detailed`, `/metrics`, `/cache-stats`, `/usage`
    - `workspace.py`: Team workspace CRUD
    - `billing.py`: Razorpay webhook + subscription management
    - `github.py`: GitHub OAuth + repository integration
    - `demo.py`: Anonymous demo endpoint (rate-limited, pre-cached)
    - `repo_search.py`: Repository semantic search (pgvector)
  - `services/`: Business logic + external integrations
    - `ai.py`: LLM client singletons (Groq + OpenRouter), streaming, failover
    - `email.py`: Transactional email via Resend
  - `queue/`: Celery background workers
    - `tasks.py`: `save_translation_history_task`, `send_transactional_email_task`
    - `celery_config.py`: Celery app factory and broker configuration
- `frontend/`: Next.js 16 / React 19 frontend
  - `src/app/`: Next.js App Router pages and API routes
  - `src/components/`: Reusable UI components (Monaco editor, modals, nav)
  - `src/features/`: Domain-specific feature modules (translate, dashboard)
  - `src/hooks/`: Custom React hooks (`useTranslationStream`, quota hooks)
  - `src/lib/`: Supabase client, SWR fetchers, API utilities
  - `src/context/`: React context providers
  - `src/proxy.ts`: Middleware-level auth proxy for SSR dashboard routes
- `vscode-extension/`: VS Code extension for in-editor code translation
  - `src/extension.ts`: Command handlers, SecretStorage migration, API client
  - `src/test/`: Mocha unit tests (16 tests)
- `tests/`: Pytest backend test suite (341 tests)
- `frontend/src/tests/`: Vitest frontend test suite (134 tests)
- `alembic/`: Database migration scripts
- `ZERO_BUDGET_DEPLOYMENT.md`: Render/Vercel/Supabase/Upstash deployment guide
- `AUDIT_FINDINGS.md`: Security and architectural audit findings log
- `DEEP_DIVE_REPORT.md`: Comprehensive remediation status report
- `render.yaml`: Render infrastructure-as-code blueprint
- `nginx.conf`: Nginx reverse proxy configuration (security headers, real IP)


## Interface Contracts
### Structured 429 Rate Limit Response Header & JSON Payload
- Status Code: `429 Too Many Requests`
- Headers: `Retry-After: <seconds>`
- Payload:
```json
{
  "detail": "Daily translation limit reached for guest tier (5/5).",
  "limit_type": "guest_daily_limit" | "user_daily_limit" | "tpm_limit" | "rpm_limit",
  "retry_after_seconds": 86400,
  "tier_limit": 5
}
```
