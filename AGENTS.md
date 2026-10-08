# Project Rules: Anuvaad AI Code Translation Platform

## Architecture & Technology Stack
- **Frontend**: Next.js 16.3 (App Router), React 19.2, TypeScript 5 (strict mode), Tailwind CSS v4, Monaco Editor (`@monaco-editor/react`), Zustand, SWR.
- **Backend**: FastAPI 0.139, Python 3.11–3.13, Pydantic V2, SQLAlchemy 2.0 (asyncio + asyncpg), Alembic, Celery, Uvicorn.
- **AST Parsing Engine**: Tree-sitter 0.23 multi-language AST parser (`app/services/ast_parser.py`) for boundary extraction, symbol contracts, and structural diffing.
- **Database & Cache**: Supabase PostgreSQL with `pgvector` for semantic code search; Upstash Redis for caching and rate limiting.
- **Payments**: Stripe Hosted Checkout & Customer Portal with HMAC webhook signature verification.

---

## Autonomous Skill, Plugin & MCP Dispatch Invariant (Zero-Manual-Spec Requirement)

> **MANDATORY POLICY**: The user must NEVER need to manually specify or prompt which skills, plugins, or MCP servers to use.
> For every user request, Antigravity MUST autonomously inspect the task domain, proactively load relevant `SKILL.md` playbooks via `view_file`, and dispatch the corresponding MCP tools and subagents automatically according to the matrix below:

| Task Domain | Mandatory Autonomous Skills (`SKILL.md`) | Mandatory MCP Servers & Tools | Autonomous Standard Operating Procedure |
| :--- | :--- | :--- | :--- |
| **New Features & Architecture** | `spec-driven-development`, `loop-engineering`, `backend-architect`, `scalar-api` | `context7` (for library docs) | Formulate EARS requirements and interface schemas before generating implementation code; mount Scalar interactive docs. |
| **Code Implementation & Bug Fixing** | `tdd-agentic-loop`, `fastapi-pro`, `nextjs-app-router-patterns`, `react-best-practices`, `tree-sitter-ast-engineer`, `ast-grep` | `context7`, `StitchMCP`, CLI `ast-grep` | Execute Red-Green-Refactor loop; verify AST syntax (`ast-grep scan` / `node.has_error == False`). |
| **Codebase Hygiene & Refactoring** | `knip`, `code-review-anti-bloat`, `ponytail-review`, `typos-checker` | CLI `knip`, `typos` | Run `knip` to eliminate dead code and phantom dependencies; run `typos` to fix source and doc typos; eliminate speculative abstractions. |
| **API Contract Verification & Fuzzing** | `schemathesis`, `fastapi-pro`, `api-design-principles`, `scalar-api` | CLI `schemathesis`, `scalar-fastapi` | Run property-based fuzz tests against OpenAPI endpoints; verify response schemas and ensure zero unhandled 500 exceptions. |
| **Database & Schema Evolution** | `database-migrations-sql-migrations`, `postgresql`, `sql-optimization-patterns`, `vector-database-engineer` | `supabase` MCP (`execute_sql`, `list_migrations`, `list_tables`) | Generate idempotent migrations, inspect EXPLAIN query plans, avoid downtime, enforce keyset pagination. |
| **UI, Styling & Web Quality** | `ui-ux-pro-max`, `tailwind-design-system`, `ui-ux-designer`, `web-quality-suite` | `playwright` MCP, `accessibility-scanner` MCP, `chrome-devtools-mcp` | Enforce Wispr Flow dark palette, WCAG 2.2 AA accessibility, responsive layout without horizontal overflow. |
| **Security, Secret Hygiene & SAST** | `gitleaks-audit`, `security-sast-audit`, `backend-security-coder`, `frontend-security-coder`, `stripe-integration` | CLI `gitleaks`, local SAST scanners | Run `gitleaks git --staged` before commits; audit OWASP Top 10; sanitize secrets; enforce Zero Code Retention (ZDR) and HMAC audit digests. |
| **Performance Profiling & Mutation** | `py-spy-profiler`, `mutation-testing`, `python-performance-optimization` | CLI `py-spy`, `mutmut` | Run `py-spy` to generate flame graphs and eliminate event loop blocking; run mutation testing to verify test assertion strength. |
| **Build, Lint & Release Automation** | `ci-cd-self-healing`, `github-actions-templates`, `git-cliff` | CLI `git-cliff`, `gh-dash` | Automate Conventional Commit release changelogs; extract failure frames from compiler/test logs; apply surgical minimal-diff repairs. |
| **Parallel Tasks & Multi-Agent** | `git-worktree-orchestrator`, `loop-engineering` | Subagents & `git worktree`, `github` MCP | Isolate branches in separate worktree directories; never collide on `.git/index`; coordinate via GitHub MCP. |
| **Third-Party API & Framework Docs** | `context7`, `gemini-api-dev` | `context7` (`resolve-library-id`, `query-docs`), `gemini-api_gemini-api-docs` | Query real-time, version-specific API signatures; never guess deprecated library signatures. |

---

## Core Architectural Invariants

### 1. Verifiable Zero Code Retention (ZDR)
- Source code inputs must stream through volatile RAM buffers only and must NEVER be logged to disks, non-ephemeral files, or external model training pools.
- Every translation must generate an HMAC-SHA256 audit digest (`sha256(secret, user_id + timestamp + code_hash)`).
- Never commit or log API keys or secrets.

### 2. Zero-Budget Operational Discipline ($0.00 / Month)
- All compute, database, cache, background queue, and AI inference must run on perpetual free tiers until customer revenue subsidizes dedicated scaling.
- Multi-tier AI Gateway routing:
  1. Tier 1: Cerebras Cloud (Llama 3.3 70B via ultra-fast LPU inference)
  2. Tier 2: Google Gemini 2.0 Flash (OpenAI-compatible client / native SDK)
  3. Tier 3: DeepSeek V3 / R1
  4. Tier 4: OpenRouter Free models
  5. Tier 5: Local Ollama fallback
- Avoid synthetic keep-alive pings or idle container sleep hacks; utilize proper stateless architectures.

### 3. Deterministic AST Boundary Validation
- Never return unvalidated LLM output to users.
- Always validate syntax and extract symbol boundaries using `app/services/ast_parser.py`.
- Check `node.has_error` to catch syntax errors or malformed brackets before output serialization.

### 4. Backend (FastAPI + Async Python) Guidelines
- Always use asynchronous database drivers (`asyncpg`) and SQLAlchemy 2.0 async sessions.
- Endpoints must never block the event loop with synchronous I/O or heavy CPU-bound parsing (use `asyncio.to_thread` for Tree-sitter parsing).
- Enforce strict Pydantic V2 schemas for request and response validation.
- Implement keyset pagination (`(created_at, id) < (cursor_time, cursor_id)`) instead of `OFFSET / LIMIT` on large tables.

### 5. Frontend & UI Guidelines
- Adhere to the Wispr Flow design system: clean neutral surfaces (`#ffffff`, `#f8fafc`, `#0f172a`), precision monospace (`JetBrains Mono`), and high-density code surfaces.
- Avoid heavy 3D canvas blockers, CPU-hogging particle systems, or scroll hijacking libraries.
- Maintain full WCAG AA accessibility: all interactive elements require accessible names, keyboard focus rings, and proper ARIA roles.

### 6. Testing & CI Invariants
- Verify changes against both backend (`pytest tests/`) and frontend (`vitest run`) test tracks.
- Ensure `npm run build` exits with code 0 and zero lint or type errors before completing work.
