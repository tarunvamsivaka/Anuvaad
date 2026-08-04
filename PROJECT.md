# Project: Anuvaad AI Code Translation Platform Remediation & QA

## Architecture
- **Backend**: FastAPI (Python 3.11, SQLAlchemy 2.0 ORM, Pydantic v2, Groq/OpenRouter LLM engine)
- **Frontend**: Next.js 16 (React 19, Monaco Editor, SWR, SSE Buffer, Vitest)
- **Database**: PostgreSQL + pgvector, Alembic migrations linear chain, SQLite vector fallback
- **VSCode Extension**: VSCode IDE Extension (SecretStorage, inline translation, hover provider)
- **Infra**: Nginx reverse proxy, Docker containers, Celery + Redis background worker

## Code Layout
- `app/`: FastAPI application code
  - `main.py`: Composition root
  - `core/database.py`: Database connection and native SQLAlchemy 2.0 ORM queries
  - `models/`: ORM database models and Pydantic schemas (`schemas.py`)
  - `routers/`: API endpoints (`/code-to-english`, `/code-to-code`, `/auth`, `/user`, etc.)
- `frontend/`: Next.js web application (`src/app/`, `src/components/`, `src/hooks/`)
- `vscode-extension/`: VSCode extension source (`src/extension.ts`, `src/test/`)
- `nginx.conf`: Reverse proxy configuration
- `scripts/`: Utility and compliance scripts

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: P0 Critical Vulnerability & Payload Fixes | Redact credentials in root `.env`, fix VSCode payload field mismatch in `vscode-extension/src/extension.ts` | None | DONE |
| 2 | M2: P1 Infrastructure Protection & Extension Testing | Nginx rate limiting in `nginx.conf`, Ruff lint fix across Python modules, VSCode extension unit tests & ESLint flat config | M1 | DONE |
| 3 | M3: P2 Architectural Cleanup & Test Runner Resilience | Deprecate `supabase_request()` shims in `app/core/database.py`, SQLite vector operation fallback mocking for local unit tests | M2 | DONE |
| 4 | M4: E2E Verification & Production Readiness | Run backend pytest suite, Vitest frontend suite, Next.js production build (`npm run build`), VSCode extension lint and test suite | M3 | DONE |
| 5 | M5: Multi-Layer Testing & Deep Defect Audit | Comprehensive audit across Backend API/DB, Frontend Vitest/Build/Monaco/SSE, and VSCode Extension | M4 | DONE |
| 6 | M6: Automated Remediation & Root-Cause Fixes | Fix all identified defects (BE-01..08, FE-01..05, EXT-01..08) in backend, frontend, and extension | M5 | DONE |
| 7 | M7: Comprehensive Re-Verification & Challenge | Empirical verification: 100% pytest pass, 100% vitest pass, 0-error Next.js build, extension tests pass | M6 | IN_PROGRESS |
| 8 | M8: Platform Forensic Integrity Audit | Forensic audit verification (CLEAN verdict) across all updated application layers | M7 | PLANNED |

## Interface Contracts
### VSCode Extension ↔ FastAPI Backend (`/api/v1/code-to-english/sync`)
- Request payload model: `CodePayload` (`raw_code: str`, `language: str`)
- Response: JSON object or JSON Array of translation blocks
