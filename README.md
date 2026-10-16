# Anuvaad — AI Code Translation & Architectural Intelligence Platform

[![Version](https://img.shields.io/badge/version-v1.2.0--prod-blue.svg)](https://github.com/tarunvamsivaka/Anuvaad/releases)
[![CI Status](https://github.com/tarunvamsivaka/Anuvaad/actions/workflows/ci.yml/badge.svg)](https://github.com/tarunvamsivaka/Anuvaad/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Infrastructure Budget](https://img.shields.io/badge/Infrastructure-%240.00%2Fmonth-brightgreen.svg)](#)
[![Live Platform](https://img.shields.io/badge/Live-getanuvaad.vercel.app-blueviolet.svg)](https://getanuvaad.vercel.app)
[![Explain in Anuvaad](https://img.shields.io/badge/Explain%20in-Anuvaad-amber?style=flat&logo=code)](https://getanuvaad.vercel.app/dashboard/translate?file=https://github.com/tarunvamsivaka/Anuvaad/blob/master/app/core/cache.py)

Anuvaad is a high-performance web workspace for explaining code, generating code from plain English, and translating between programming languages. Operating strictly on a **$0.00/month infrastructure budget**, Anuvaad provides real-time dual-pane AST-validated translation, 60 FPS stream buffering, two-tier in-memory/Redis caching, client-side encrypted Bring-Your-Own-Key (BYOK) privacy, and client-side AST codemod modernization.

---

## Ecosystem: CLI & VS Code Extension

Anuvaad is available across the web, your command line, and your IDE. Direct installation commands:

### 1. Anuvaad CLI (`@anuvaad/cli`)
Translate, review, and modernize code directly from your terminal:
```bash
# Install globally from GitHub Release tarball
npm i -g https://github.com/tarunvamsivaka/Anuvaad/releases/download/v1.2.0-prod/anuvaad-cli-1.2.0.tgz

# Verify installation
anuvaad --version
anuvaad translate ./src/LegacyComponent.jsx --to typescript
```

### 2. Anuvaad VS Code Extension (`anuvaad-vscode`)
Instant inline code translation and explainers right inside VS Code:
```bash
# Install via VS Code CLI
code --install-extension https://github.com/tarunvamsivaka/Anuvaad/releases/download/v1.2.0-prod/anuvaad-vscode-1.2.0.vsix

# Or install locally if downloaded:
code --install-extension anuvaad-vscode-1.2.0.vsix
```

---

---

## Key Architectural Highlights

- **60 FPS `requestAnimationFrame` Stream Buffer:** Decouples high-frequency Server-Sent Events (80–120 chunks/sec) from React state dispatch, throttling UI updates to 16.6ms intervals with zero Cumulative Layout Shift (CLS) and guaranteed zero-drop synchronous final flush.
- **Two-Tier L1/L2 Cache & Semantic AST Deduplication:** In-process `TTLCache` (L1) fronting Upstash Redis (L2) reduces external cache queries by ~80%. Normalizes code whitespace, comments, and docstrings into deterministic SHA-256 hashes, returning instant cached explanations in `< 40ms` at 0 LLM token cost.
- **Client-Side Encrypted BYOK Vault:** Uses Web Cryptography API (AES-GCM 256-bit with PBKDF2) to securely persist personal Gemini API keys inside client IndexedDB. Transmitted via ephemeral `X-User-LLM-Key` headers with zero platform credit deductions and strict server-side log redaction.
- **Sub-10ms Split Health & Constant-Time Metrics:** `/health/live` probe verifies API container responsiveness in $< 10\text{ms}$; `/health/ready` validates PostgreSQL and Redis upstream dependencies; `/metrics` enforces constant-time HTTP Basic Auth (`secrets.compare_digest`).
- **Zero Code Retention (ZDR) & Verified Security Invariants:** Enforces tenant isolation on Supabase PostgreSQL and `pgvector`, CSRF token validation, proxy IP trust (ignoring spoofed `X-Forwarded-For`), and webhook HMAC signature and timestamp replay defenses.

---

## Product status

- Try the translation workspace at [getanuvaad.vercel.app](https://getanuvaad.vercel.app). Unauthenticated guests receive 3 free translations per 24 hours.
- Power users can bring their personal Gemini API key via the Settings drawer for unlimited private translation.
- Ephemeral mode ensures source code streams through volatile RAM buffers only with zero non-ephemeral logging.

## Repository

| Area | Location |
| --- | --- |
| Next.js web app | `frontend/` |
| FastAPI API | `app/`, `main.py` |
| Database migrations | `alembic/versions/` |
| Backend tests | `tests/` |
| Consumer strategy and validation protocol | `docs/CONSUMER_PRODUCT_DEVELOPMENT_STRATEGY.md`, `docs/CONSUMER_VALIDATION_PLAN.md` |
| Implementation plan | `docs/IMPLEMENTATION_PLAN_2026-10-04.md` |

## Local development

Prerequisites: Python 3.11+, Node.js 20+, and npm.

1. Copy `.env.example` to `.env` and configure the backend values required for the services you intend to run. Do not commit secrets.
2. Install backend dependencies with `python -m pip install -r requirements.txt`.
3. Start the API with `python -m uvicorn main:app --reload --port 8000`.
4. Copy `frontend/.env.example` to `frontend/.env.local`, set Supabase public configuration and `NEXT_PUBLIC_API_URL=http://localhost:8000`, then run `npm ci` and `npm run dev` from `frontend/`.
5. Open `http://localhost:3000`.

Apply database migrations only to a disposable/local database during development. For production, follow [the migration policy](docs/DATABASE_MIGRATION_POLICY.md); this repository does not authorize changes to a live database.

## Verification

On Windows PowerShell, install the project dependencies once (`python -m pip install -r requirements-dev.txt`, then `npm ci` from `frontend/`) and run the local verification entry point:

```powershell
.\scripts\verify.ps1
```

Use `-SkipBuild` for a quicker local loop. The script sets CI-only placeholder service values for tests and restores the caller's process environment when it exits.

The equivalent individual checks are:

```powershell
python -m ruff check main.py app/ tests/ --select E,F,W --ignore E501,F401
python -m ruff format --check main.py app/ tests/ alembic/
python -m pytest tests/ -q -p no:cacheprovider --ignore=tests/test_production.py
cd frontend; npm run lint; npx tsc --noEmit; npm test -- --run; npm run build
```

CI also covers PostgreSQL migration checks, Playwright, the CLI, and the VS Code extension. A passing local unit suite is not evidence of production service configuration or user research outcomes.

## Security and privacy

Read [the privacy page](frontend/src/app/privacy/page.tsx), [security and privacy notes](docs/SECURITY_AND_PRIVACY_WHITEPAPER.md), and [the security policy](SECURITY.md) before using real source code. The application audit receipt is an HMAC digest of request metadata and input hash; it does not verify provider or infrastructure retention.

## License

MIT. See [LICENSE](LICENSE).
