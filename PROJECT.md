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
- `app/`: FastAPI backend
  - `core/database_session.py`: Connection pool configuration
  - `domain/quota/policy.py`: Quota limits & policy definitions
  - `services/ai.py`: LLM provider calls & model failover
  - `core/quota.py` & `api/middleware/rate_limit.py`: Rate limit checking & structured 429 responses
  - `repositories/translation.py` & `vectors.py`: Database pruning queries
  - `queue/tasks.py`: Scheduled Celery tasks
- `frontend/`: Next.js frontend
  - `src/components/common/UsageCounterBadge.tsx`: Usage counter UI
  - `src/components/modals/QuotaExceededModal.tsx`: Quota modal
  - `src/features/translate/_hooks/useTranslationStream.ts`: 429 response interceptor
  - `src/components/dashboard/TopBar.tsx`, `TranslateShell.tsx`, `Navbar.tsx`: Header badge integration
  - `src/components/landing/`: Pricing, FAQ, ExitIntentModal
- `ZERO_BUDGET_DEPLOYMENT.md`: Root deployment guide
- `tests/`: Pytest test suite
- `frontend/src/tests/`: Vitest test suite

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
