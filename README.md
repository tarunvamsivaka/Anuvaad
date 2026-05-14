# Anuvaad — AI-Powered Code Translator

> Understand any codebase instantly. Translate code to plain English and back.

[![CI](https://github.com/tarunvamsivaka/Anuvaad/actions/workflows/ci.yml/badge.svg)](https://github.com/tarunvamsivaka/Anuvaad/actions)
[![Release](https://img.shields.io/github/v/release/tarunvamsivaka/Anuvaad?label=Release&color=blue)](https://github.com/tarunvamsivaka/Anuvaad/releases)
[![Powered by Groq + DeepSeek](https://img.shields.io/badge/Powered%20by-Groq%20%2B%20DeepSeek-orange.svg)](https://groq.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is Anuvaad?

Anuvaad is an AI-powered developer tool that translates code into plain English and back. It supports **three modes**:

| Mode | Description |
|---|---|
| **Code → English** | Paste code, get block-by-block explanations |
| **English → Code** | Describe what you want, get working code |
| **Code → Code** | Convert between programming languages |

Powered by **Groq (Llama 3.3 70B)** and **DeepSeek (V3 / R1)** with intelligent failover, Redis caching, and real-time SSE streaming.

## Key Features

- **35+ Languages** — Web, systems, mobile, scripting, functional, and more
- **GitHub Gist Import** — Paste a public Gist URL to import code directly
- **File Upload** — Drag & drop `.py`, `.js`, `.ts`, `.java`, `.cpp`, `.go`, `.rs`, `.c`, `.cs` files
- **Real-time Streaming** — Server-Sent Events for live translation output
- **Team Workspaces** — Collaborative translation context with role-based access
- **API Keys** — Programmatic access via `ak_` prefixed bearer tokens
- **Pro Tier** — Unlimited translations, DeepSeek R1 reasoning, 200KB file uploads
- **Translation Credits** — Pay-as-you-go one-time credit purchases
- **Translation History** — Automatic saving with workspace scoping
- **Transactional Emails** — Welcome, subscription, and milestone emails via Resend
- **Observability** — Sentry error tracking, PostHog analytics, Prometheus metrics endpoint

## Supported Languages (35+)

**Web:** HTML · CSS · JavaScript · TypeScript  
**Systems:** Python · Java · C++ · C · C# · Go · Rust  
**Mobile:** Swift · Kotlin · Dart · Objective-C  
**Scripting:** PHP · Ruby · Perl · Lua · R · MATLAB  
**Data & Query:** SQL · GraphQL  
**Shell & DevOps:** Bash · PowerShell · Dockerfile · YAML  
**Functional:** Scala · Haskell · Elixir · Clojure  
**Markup & Config:** JSON · XML · Markdown  
**Assembly:** Assembly (MIPS)

## Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (Next.js 16 + TypeScript)     │
│  ├── Landing page with pricing/FAQ      │
│  ├── Auth (Supabase — Google/GitHub)    │
│  ├── Dashboard with sidebar nav         │
│  ├── Translator workspace (Monaco)      │
│  ├── GitHub Gist import                  │
│  ├── File drag-and-drop upload           │
│  └── Billing (Stripe integration)       │
├─────────────────────────────────────────┤
│  Backend (FastAPI + Python)             │
│  ├── /api/code-to-english  (SSE stream) │
│  ├── /api/generate-from-english         │
│  ├── /api/code-to-code                  │
│  ├── /api/import-gist                   │
│  ├── /api/upload-file                   │
│  ├── /api/webhook/stripe                │
│  ├── /api/workspaces + /api/api-keys    │
│  └── /api/metrics (Prometheus)          │
├─────────────────────────────────────────┤
│  Services                               │
│  ├── Groq (Llama 3.3 70B)              │
│  ├── DeepSeek (V3 + R1 reasoning)      │
│  ├── Supabase (Auth + PostgreSQL)       │
│  ├── Stripe (Payments + Webhooks)       │
│  ├── Upstash Redis (Cache + Rate Limit) │
│  ├── Resend (Transactional Emails)      │
│  ├── Sentry (Error Monitoring)          │
│  └── PostHog (Product Analytics)        │
└─────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Monaco Editor |
| Backend | FastAPI, Python 3.11, Uvicorn |
| AI Models | Groq (Llama 3.3 70B), DeepSeek V3/R1 — dual-model failover |
| Auth | Supabase (Google + GitHub OAuth) |
| Database | Supabase PostgreSQL with RLS |
| Payments | Stripe Checkout + Webhooks + Billing Portal |
| Cache | Upstash Redis (serverless) with LRU memory fallback |
| Email | Resend (transactional: welcome, subscription, milestones) |
| Monitoring | Sentry (errors), PostHog (analytics), Prometheus (metrics) |
| CI/CD | GitHub Actions (pytest, ruff, tsc, Playwright, Docker) |
| Deploy | Docker multi-stage + Nginx reverse proxy |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- npm

### 1. Clone & Setup Backend

```bash
git clone https://github.com/tarunvamsivaka/Anuvaad.git
cd Anuvaad

# Create .env from template
cp .env.example .env
# Edit .env with your API keys (at minimum: GROQ_API_KEY and DEEPSEEK_API_KEY)

# Install Python dependencies
pip install -r requirements.txt

# Start backend
python -c "import uvicorn; uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=True)"
```

### 2. Setup Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your Supabase project URL and anon key

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the frontend proxies API calls to `localhost:8000`.

### 3. Apply Database Migrations

Run the Supabase migration files in order against your project:

```
supabase_migration.sql      → Core tables (users, subscriptions, history)
supabase_migration_v2.sql   → Workspaces & team members
supabase_migration_v3.sql   → RLS policies & security definer helpers
supabase_migration_v4.sql   → API keys & enhanced RLS
supabase_migration_v5.sql   → Schema refinements
```

### 4. Run Tests

```bash
# From project root
python -m pytest tests/ -v
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/code-to-english` | Translate code to English (SSE stream) |
| `POST` | `/api/code-to-english/sync` | Translate code to English (JSON response) |
| `POST` | `/api/generate-from-english` | Generate code from English description |
| `POST` | `/api/code-to-code` | Translate between programming languages |
| `POST` | `/api/english-to-code` | Update code from modified English |
| `POST` | `/api/upload-file` | Upload a code file for translation |
| `GET` | `/api/import-gist` | Import code from a public GitHub Gist URL |
| `GET` | `/api/health` | Health check (LLM, Stripe, Redis, Supabase) |
| `GET` | `/api/usage` | Get today's translation count and limit |
| `GET` | `/api/cache-stats` | Redis/LRU cache statistics |
| `GET` | `/api/metrics` | Observability metrics (JSON) |
| `GET` | `/api/metrics/prometheus` | Prometheus text exposition format |
| `POST` | `/api/create-checkout-session` | Create Stripe checkout for Pro plan |
| `POST` | `/api/create-portal-session` | Open Stripe billing portal |
| `POST` | `/api/create-credit-checkout` | Purchase translation credits |
| `POST` | `/api/check-credits` | Check remaining translation credits |
| `POST` | `/api/webhook/stripe` | Stripe webhook handler |
| `POST` | `/api/subscription-status` | Check Pro subscription status |
| `GET` | `/api/history` | Get translation history |
| `GET` | `/api/workspaces` | List user workspaces |
| `POST` | `/api/workspaces` | Create a workspace |
| `GET` | `/api/workspaces/:id/members` | List workspace members |
| `POST` | `/api/workspaces/:id/invite` | Invite a workspace member |
| `GET` | `/api/api-keys` | List API keys |
| `POST` | `/api/api-keys` | Create an API key |
| `DELETE` | `/api/api-keys/:id` | Revoke an API key |
| `DELETE` | `/api/account` | Delete user account |

## Environment Variables

### Backend (`.env`)

See [`.env.example`](.env.example) for all variables with inline documentation.

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ | Groq API key (Llama 3.3 model access) |
| `DEEPSEEK_API_KEY` | ✅ | DeepSeek API key (V3 + R1 models) |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase public anon key (JWT verification) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side DB writes) |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key |
| `STRIPE_PRO_PRICE_ID` | For billing | Stripe price ID for Pro plan |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `FRONTEND_URL` | Production | Frontend domain for CORS and redirects |
| `UPSTASH_REDIS_URL` | Optional | Upstash Redis REST URL (falls back to LRU) |
| `UPSTASH_REDIS_TOKEN` | Optional | Upstash Redis REST token |
| `SENTRY_DSN` | Optional | Sentry DSN for error monitoring |
| `RESEND_API_KEY` | Optional | Resend API key for transactional emails |
| `METRICS_USERNAME` | Optional | HTTP Basic Auth username for /api/metrics |
| `METRICS_PASSWORD` | Optional | HTTP Basic Auth password for /api/metrics |

### Frontend (`frontend/.env.local`)

See [`frontend/.env.example`](frontend/.env.example) for all variables.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase public anon key |
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | PostHog project API key for analytics |

## Production Deployment

When deploying to a production environment (e.g., using Docker Compose):

1. **Required Environment Variables**: You must copy `.env.example` to `.env` and fill in all real values. The application will crash at startup if critical variables like `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `SUPABASE_URL`, or `SUPABASE_SERVICE_ROLE_KEY` are missing or contain placeholder values.
2. **ENV=production**: Ensure `ENV=production` is set (this is the default in `docker-compose.yml`). This enables strict startup validation and locks down CORS to only your `FRONTEND_URL`.
3. **FRONTEND_URL**: Must be set to your exact deployed frontend domain (e.g., `https://anuvaad.dev`). In production, localhost origins are rejected.
4. **Redis is Required**: You must provide a valid `REDIS_URL` (or `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN`). Relying on the in-memory LRU fallback in production means rate-limiting and caching will reset on container restarts and will not work across multiple backend workers.

## Docker

```bash
docker compose up --build
```

This spins up four services:
- **Redis** — serverless cache and rate limiting
- **Backend** — FastAPI on port 8000
- **Frontend** — Next.js on port 3000
- **Nginx** — reverse proxy on port 80

## Project Structure

```
Anuvaad/
├── frontend/               # Next.js 16 app
│   ├── src/app/            # App Router pages (dashboard, auth, billing)
│   ├── src/components/     # UI components (landing, shadcn/ui)
│   ├── src/lib/            # Auth context, Supabase client, analytics
│   ├── src/context/        # Workspace context provider
│   └── e2e/                # Playwright end-to-end tests
├── main.py                 # FastAPI backend (2100+ lines)
├── tests/                  # Pytest test suite
├── js/                     # Legacy vanilla JS modules
├── supabase_migration*.sql # Database migration files (v1–v5)
├── .github/workflows/      # CI pipeline (test, lint, build, e2e, docker)
├── Dockerfile              # Multi-stage production build
├── docker-compose.yml      # Full stack orchestration (4 services)
└── nginx.conf              # Reverse proxy config
```

## License

MIT — see [LICENSE](LICENSE).
