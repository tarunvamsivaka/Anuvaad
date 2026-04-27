# Anuvaad — AI-Powered Code Translator

> Understand any codebase instantly. Translate code to plain English and back.

[![CI](https://github.com/tarunvamsivaka/Anuvaad/actions/workflows/ci.yml/badge.svg)](https://github.com/tarunvamsivaka/Anuvaad/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is Anuvaad?

Anuvaad is an AI-powered developer tool that translates code into plain English and back. It supports **three modes**:

| Mode | Description |
|---|---|
| **Code → English** | Paste code, get block-by-block explanations |
| **English → Code** | Describe what you want, get working code |
| **Code → Code** | Convert between programming languages |

Powered by **Google Gemini 2.5 Flash** with intelligent caching for instant results.

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
│  ├── Translator workspace               │
│  └── Billing (Stripe integration)       │
├─────────────────────────────────────────┤
│  Backend (FastAPI + Python)             │
│  ├── /api/code-to-english               │
│  ├── /api/generate-from-english         │
│  ├── /api/code-to-code                  │
│  ├── /api/webhook/stripe                │
│  └── /api/subscription-status           │
├─────────────────────────────────────────┤
│  Services                               │
│  ├── Google Gemini AI                   │
│  ├── Supabase (Auth + DB)              │
│  └── Stripe (Payments)                  │
└─────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | FastAPI, Python 3.11, Uvicorn |
| Auth | Supabase (Google + GitHub OAuth) |
| Payments | Stripe Checkout + Webhooks |
| AI | Google Gemini 2.5 Flash |
| CI/CD | GitHub Actions |
| Deploy | Docker + Nginx |

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
# Edit .env with your API keys

# Install Python dependencies
pip install -r requirements.txt

# Start backend
python -c "import uvicorn; uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=True)"
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the frontend proxies API calls to `localhost:8000`.

### 3. Run Tests

```bash
# From project root
python -m pytest tests/ -v
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/code-to-english` | Translate code to English |
| `POST` | `/api/generate-from-english` | Generate code from English |
| `POST` | `/api/code-to-code` | Translate between languages |
| `POST` | `/api/english-to-code` | Update code from modified English |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/create-checkout-session` | Create Stripe checkout |
| `POST` | `/api/webhook/stripe` | Stripe webhook handler |
| `POST` | `/api/subscription-status` | Check Pro subscription |
| `GET` | `/api/history` | Get translation history |
| `GET` | `/api/workspaces` | List user workspaces |
| `POST` | `/api/workspaces` | Create a workspace |
| `GET` | `/api/workspaces/:id/members` | List workspace members |
| `POST` | `/api/workspaces/:id/invite` | Invite a workspace member |
| `GET` | `/api/api-keys` | List API keys |
| `POST` | `/api/api-keys` | Create an API key |
| `DELETE` | `/api/api-keys/:id` | Revoke an API key |

## Environment Variables

See [`.env.example`](.env.example) for all required variables:

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key |
| `STRIPE_PRO_PRICE_ID` | For billing | Stripe price ID for Pro plan |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `SUPABASE_SERVICE_ROLE_KEY` | For auth | Supabase server-side key |

## Docker

```bash
docker compose up --build
```

This builds the multi-stage image (Next.js + FastAPI) and starts both services behind Nginx.

## Project Structure

```
Anuvaad/
├── frontend/               # Next.js 16 app
│   ├── src/app/            # App Router pages
│   ├── src/components/     # UI components (landing, shadcn)
│   └── src/lib/            # Auth context, Supabase client
├── main.py                 # FastAPI backend (932 lines)
├── tests/                  # 140+ pytest tests
├── .github/workflows/      # CI pipeline
├── Dockerfile              # Multi-stage production build
├── docker-compose.yml      # Full stack orchestration
└── nginx.conf              # Reverse proxy config
```

## License

MIT — see [LICENSE](LICENSE).
