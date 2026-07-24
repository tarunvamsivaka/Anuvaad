# Project: Anuvaad AI Code Translation Platform Remediation

## Architecture
- **Backend**: FastAPI (Python 3.11, SQLAlchemy 2.0 ORM, Pydantic v2, Groq/OpenRouter LLM engine)
- **Frontend**: Next.js 16 (React 19, Monaco Editor, SWR, SSE Buffer)
- **Database**: PostgreSQL + pgvector, Alembic migrations linear chain
- **VSCode Extension**: VSCode IDE Extension (SecretStorage, inline translation, hover provider)
- **Infra**: Nginx reverse proxy, Docker containers, Celery + Redis background worker

## Code Layout
- `app/`: FastAPI application code
  - `main.py`: Composition root
  - `core/database.py`: Database connection and legacy shims
  - `models/`: ORM database models and Pydantic schemas (`schemas.py`)
  - `routers/`: API endpoints (`/code-to-english`, `/code-to-code`, etc.)
- `frontend/`: Next.js web application
- `vscode-extension/`: VSCode extension source (`src/extension.ts`)
- `nginx.conf`: Reverse proxy configuration
- `scripts/`: Utility and compliance scripts (`compliance_subagent.py`)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: P0 Critical Vulnerability & Payload Fixes | Redact credentials in root `.env`, fix VSCode payload field mismatch in `vscode-extension/src/extension.ts` | None | DONE |
| 2 | M2: P1 Infrastructure Protection & Extension Testing | Nginx rate limiting in `nginx.conf`, Ruff lint fix across Python modules, VSCode extension unit tests & ESLint flat config | M1 | DONE |
| 3 | M3: P2 Architectural Cleanup & Test Runner Resilience | Deprecate `supabase_request()` shims in `app/core/database.py`, SQLite vector operation fallback mocking for local unit tests | M2 | DONE |
| 4 | M4: E2E Verification & Production Readiness | Run backend pytest suite, Vitest frontend suite, Next.js production build (`npm run build`), VSCode extension lint and test suite | M3 | DONE |



## Interface Contracts
### VSCode Extension ↔ FastAPI Backend (`/api/v1/code-to-english/sync`)
- Request payload model: `CodePayload` (`raw_code: str`, `language: str`)
- Response: JSON object or JSON Array of translation blocks
