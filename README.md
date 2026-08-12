# Anuvaad — AI-Powered Code Translator

> Understand any codebase instantly. Translate code to plain English and back.

[![Anuvaad CI](https://github.com/tarunvamsivaka/Anuvaad/actions/workflows/ci.yml/badge.svg)](https://github.com/tarunvamsivaka/Anuvaad/actions/workflows/ci.yml)
[![Powered by Groq + DeepSeek](https://img.shields.io/badge/Powered%20by-Groq%20%2B%20DeepSeek-orange.svg)](https://groq.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%20|%203.12%20|%203.13-blue.svg)](https://python.org)

## What is Anuvaad?

Anuvaad is an AI-powered developer tool that translates code into plain English and back. It supports **three modes**:

| Mode | Description |
|---|---|
| **Code to English** | Paste code, get block-by-block explanations |
| **English to Code** | Describe what you want, get working code |
| **Code to Code** | Convert between programming languages |

Powered by **Groq (Llama 3.3 70B)** and **DeepSeek (V3 / R1)** with intelligent failover, Upstash Redis caching, and real-time SSE streaming. Built as a zero-budget production startup — free-tier infrastructure, enterprise-grade security.

## Key Features

- **35+ Languages** — Web, systems, mobile, scripting, functional, and more
- **GitHub Gist Import** — Paste a public Gist URL to import code directly
- **File Upload** — Drag and drop .py, .js, .ts, .java, .cpp, .go, .rs, .c, .cs files
- **Real-time Streaming** — Server-Sent Events for live translation output
- **Team Workspaces** — Collaborative translation context with role-based access
- **API Keys** — Programmatic access via ak_ prefixed bearer tokens
- **Pro Tier** — Unlimited translations, DeepSeek R1 reasoning, 200KB file uploads
- **Translation Credits** — Pay-as-you-go one-time credit purchases
- **Translation History** — Automatic saving with workspace scoping
- **Transactional Emails** — Welcome, subscription, and milestone emails via Resend
- **Observability** — Sentry error tracking, PostHog analytics, Prometheus metrics endpoint
- **Protection Levels** — Auto-scaling NORMAL > CAUTION > RESTRICTED > EMERGENCY based on daily platform cap
- **RAG Repository Indexing** — pgvector-powered semantic code search across indexed repos

## Supported Languages (35+)

**Web:** HTML, CSS, JavaScript, TypeScript
**Systems:** Python, Java, C++, C, C#, Go, Rust
**Mobile:** Swift, Kotlin, Dart, Objective-C
**Scripting:** PHP, Ruby, Perl, Lua, R, MATLAB
**Data and Query:** SQL, GraphQL
**Shell and DevOps:** Bash, PowerShell, Dockerfile, YAML
**Functional:** Scala, Haskell, Elixir, Clojure
**Markup and Config:** JSON, XML, Markdown
**Assembly:** Assembly (MIPS)

## Architecture

```
Frontend (Next.js 16 + TypeScript)
  Landing page, Auth (Supabase), Dashboard, Monaco translator workspace,
  GitHub Gist import, File upload, Guest onboarding + quota modals, Billing (Razorpay)

Backend (FastAPI + Python 3.11-3.13)
  /api/code-to-english (SSE stream), /api/generate-from-english,
  /api/code-to-code, /api/import-gist, /api/upload-file,
  /api/webhook/razorpay, /api/workspaces, /api/api-keys,
  /api/health, /api/health/detailed, /api/metrics (Prometheus)

Services
  Groq (Llama 3.3 70B), DeepSeek (V3 + R1), OpenRouter (LLM fallback),
  Supabase (Auth + PostgreSQL + pgvector), Razorpay (Payments + Webhooks),
  Upstash Redis (Cache + Rate Limit), Resend (Email), Sentry, PostHog
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, Monaco Editor |
| Backend | FastAPI, Python 3.11-3.13, Uvicorn (4 workers) |
| AI Models | Groq (Llama 3.3 70B), DeepSeek V3/R1, OpenRouter — triple failover |
| Auth | Supabase (Google + GitHub OAuth) with local JWT verification |
| Database | Supabase PostgreSQL + pgvector, application-layer access control |
| Payments | Razorpay Checkout + Webhooks + Self-service Modal |
| Cache | Upstash Redis (serverless) with LRU memory fallback |
| Email | Resend (transactional: welcome, subscription, milestones) |
| Monitoring | Sentry (errors), PostHog (analytics), Prometheus (metrics) |
| CI/CD | GitHub Actions — pytest (3.11/3.12/3.13), ruff, tsc, Vitest, Playwright, Docker |
| Deploy | Render (PaaS) + Docker multi-stage + Nginx reverse proxy |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- npm

### 1. Clone and Setup Backend

```bash
git clone https://github.com/tarunvamsivaka/Anuvaad.git
cd Anuvaad

# Create .env from template (all variables documented inline)
cp .env.example .env
# Edit .env with at minimum: GROQ_API_KEY, DEEPSEEK_API_KEY, SUPABASE_* keys
# Generate secrets: bash scripts/gen-secrets.sh

pip install -r requirements.txt
alembic upgrade head
python -c "import uvicorn; uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=True)"
```

### 2. Setup Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 — the frontend proxies API calls to localhost:8000.

### 3. Run Tests

```bash
# Backend (355 tests across Python 3.11 / 3.12 / 3.13)
python -m pytest tests/ -v

# Frontend unit tests (134 tests, 9 test files)
cd frontend && npx vitest run

# End-to-end (Playwright)
cd frontend && npx playwright test
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/code-to-english | Translate code to English (SSE stream) |
| POST | /api/code-to-english/sync | Translate code to English (JSON response) |
| POST | /api/generate-from-english | Generate code from English description |
| POST | /api/code-to-code | Translate between programming languages |
| POST | /api/english-to-code | Update code from modified English |
| POST | /api/upload-file | Upload a code file for translation |
| GET | /api/import-gist | Import code from a public GitHub Gist URL |
| GET | /api/health | Public health check (status + service availability) |
| GET | /api/health/detailed | Detailed health check (auth required) |
| GET | /api/usage | Get today's translation count and limit |
| GET | /api/cache-stats | Redis/LRU cache statistics |
| GET | /api/metrics | Observability metrics (JSON, Basic Auth) |
| GET | /api/metrics/prometheus | Prometheus text exposition format |
| POST | /api/create-checkout-session | Create Razorpay checkout for Pro plan |
| POST | /api/create-portal-session | Get active Razorpay subscription details |
| POST | /api/create-credit-checkout | Purchase translation credits |
| POST | /api/check-credits | Check remaining translation credits |
| POST | /api/webhook/razorpay | Razorpay webhook handler |
| POST | /api/subscription-status | Check Pro subscription status |
| GET | /api/history | Get translation history |
| GET | /api/workspaces | List user workspaces |
| POST | /api/workspaces | Create a workspace |
| GET | /api/workspaces/:id/members | List workspace members |
| POST | /api/workspaces/:id/invite | Invite a workspace member |
| GET | /api/api-keys | List API keys |
| POST | /api/api-keys | Create an API key |
| DELETE | /api/api-keys/:id | Revoke an API key |
| DELETE | /api/account | Delete user account |

## Environment Variables

### Backend (.env)

See [.env.example](.env.example) for **all variables with full inline documentation** including generation instructions, rotation guides, and service sign-up links.

| Variable | Required | Description |
|---|---|---|
| GROQ_API_KEY | Required | Groq API key (Llama 3.3 70B) |
| DEEPSEEK_API_KEY | Required | DeepSeek API key (V3 + R1 models) |
| SUPABASE_URL | Required | Supabase project URL |
| SUPABASE_ANON_KEY | Required | Supabase public anon key |
| SUPABASE_SERVICE_ROLE_KEY | Required | Supabase service role key (server-side only) |
| SUPABASE_JWT_SECRET | Required | JWT secret for local token verification |
| TOKEN_ENCRYPTION_KEY | Required | Fernet key for encrypting GitHub OAuth tokens at rest |
| FRONTEND_URL | Required in prod | Frontend domain for CORS and Razorpay redirects |
| TRUST_PROXY_HOPS | PaaS | Number of trusted reverse proxy hops (set to 1 on Render) |
| DATABASE_URL | Required | PostgreSQL connection URL (Supabase) |
| DATABASE_POOL_URL | Recommended | PgBouncer pooler URL for production |
| GITHUB_CLIENT_ID | GitHub integration | GitHub OAuth App Client ID |
| GITHUB_CLIENT_SECRET | GitHub integration | GitHub OAuth App Client Secret |
| RAZORPAY_KEY_ID | Billing | Razorpay API key ID |
| RAZORPAY_KEY_SECRET | Billing | Razorpay API key secret |
| RAZORPAY_PRO_PLAN_ID | Billing | Razorpay plan ID for Pro |
| RAZORPAY_WEBHOOK_SECRET | Billing | Razorpay webhook signature secret |
| UPSTASH_REDIS_REST_URL | Optional | Upstash Redis REST URL (strongly recommended in production) |
| UPSTASH_REDIS_REST_TOKEN | Optional | Upstash Redis REST token |
| OPENROUTER_API_KEY | Optional | OpenRouter key (LLM fallback provider) |
| SENTRY_DSN | Optional | Sentry DSN for error monitoring |
| RESEND_API_KEY | Optional | Resend API key for transactional emails |
| METRICS_USERNAME | Optional | HTTP Basic Auth username for /api/metrics |
| METRICS_PASSWORD | Optional | HTTP Basic Auth password for /api/metrics |
| PROTECTION_MODE | Optional | Manual override: NORMAL, CAUTION, RESTRICTED, EMERGENCY |

### Frontend (frontend/.env.local)

| Variable | Required | Description |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Required | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Required | Supabase public anon key |
| NEXT_PUBLIC_API_URL | Required | Backend API URL (default: http://localhost:8000) |
| NEXT_PUBLIC_POSTHOG_KEY | Optional | PostHog project API key for analytics |

## Production Deployment

### Render (Recommended — Zero-Budget)

See [ZERO_BUDGET_DEPLOYMENT.md](ZERO_BUDGET_DEPLOYMENT.md) for the full zero-budget Render deployment guide.

1. **Fail-fast startup** — the application raises RuntimeError before accepting traffic if any critical env var is missing in production.
2. **4 Uvicorn workers** — configured in render.yaml for I/O-bound concurrency within the 512MB RAM constraint.
3. **TRUST_PROXY_HOPS=1** — required on Render so rate limiting uses real client IPs via X-Forwarded-For.
4. **Upstash Redis** — strongly recommended so rate-limit counters persist across worker restarts.

### Docker

```bash
docker compose up --build
```

Spins up four services: Redis, Backend (FastAPI, 4 workers), Frontend (Next.js), Nginx (reverse proxy).

## Project Structure

```
Anuvaad/
  frontend/                 Next.js 16 app (Turbopack)
    src/app/                App Router pages (dashboard, auth, billing)
    src/components/         UI components (common, modals, landing)
    src/features/           Feature slices (translate, landing)
    src/design/             Design system (tokens, CSS, animations)
    src/lib/                Auth context, Supabase client, analytics
    src/context/            Workspace context provider
    src/tests/              Vitest unit tests (134 tests)
    e2e/                    Playwright end-to-end tests
  app/                      FastAPI application
    core/                   Auth, cache, config, quota, rate limiting
    domain/                 Business logic (billing, quota)
    models/                 SQLAlchemy ORM models + Pydantic schemas
    repositories/           DB access layer
    routers/                API route handlers
    services/               AI, email, subscription services
    api/middleware/         Rate limiting, logging middleware
  tests/                    Pytest suite (355 tests, Python 3.11/3.12/3.13)
  alembic/                  Alembic migration scripts
  scripts/                  Server setup + secret generation scripts
  main.py                   FastAPI entry point
  render.yaml               Render PaaS blueprint
  .github/workflows/        CI: lint, test, migration, docker, e2e, deploy
  Dockerfile                Multi-stage production build
  docker-compose.yml        Full-stack orchestration (4 services)
  nginx.conf                Reverse proxy configuration
  pytest.ini                Pytest configuration
  .env.example              Fully documented environment variable template
  AUDIT_FINDINGS.md         Security audit findings + remediation status
  CHANGELOG.md              Version history
  ZERO_BUDGET_DEPLOYMENT.md Zero-budget Render deployment guide
```

## Security

Anuvaad has undergone a comprehensive security audit. Key hardening measures:

- **Proxy IP trust** — TRUST_PROXY_HOPS controls X-Forwarded-For hop count; all rate limiters use get_client_ip()
- **Token encryption** — GitHub OAuth tokens encrypted at rest with Fernet (TOKEN_ENCRYPTION_KEY); zero-downtime key rotation via TOKEN_ENCRYPTION_KEYS
- **JWT verification** — local Supabase JWT verification via SUPABASE_JWT_SECRET (no outbound HTTP per request)
- **Fail-fast startup** — validate_production_env() raises RuntimeError before the service becomes reachable if critical env vars are missing
- **Secrets never logged** — credential sanitization in all error paths
- **npm CVE overrides** — 11 transitive dependency overrides in frontend/package.json; CI gates on --audit-level=high
- **pip audit** — pip-audit runs in CI; setuptools>=83.0.0 resolves PYSEC-2026-3447

See [AUDIT_FINDINGS.md](AUDIT_FINDINGS.md) for the full audit report — 18 of 19 findings resolved (1 upstream Razorpay).

## Observability

- **Sentry** — exception tracking with user context tagging
- **PostHog** — product analytics (signup-to-translation funnel, Pro upgrade conversions)
- **Prometheus** — /api/metrics/prometheus for scraping; secured with HTTP Basic Auth
- **Structured logging** — structlog JSON logs on all request paths

## License

MIT — see [LICENSE](LICENSE).
