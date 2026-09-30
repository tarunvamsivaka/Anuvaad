# Anuvaad Codebase Analysis & Engineering Audit Report

**Project Name:** Anuvaad (AI-Powered Code Translation & Localization Platform)  
**Target Repository:** `c:\Anuvaad\Anuvaad`  
**Date of Audit:** July 24, 2026  
**Auditor Team:** Anuvaad Codebase Analysis Working Group (Backend, Frontend, Infrastructure, and Security Specialists)  
**Report Version:** 1.0.0 — Production Engineering Assessment  

---

## Table of Contents
1. [Executive Summary & Technical Architecture Overview](#1-executive-summary--technical-architecture-overview)
   - 1.1 Executive Summary & Architectural Maturity Assessment
   - 1.2 System Architecture Diagram & Data Flow
2. [Subsystem Deep-Dives](#2-subsystem-deep-dives)
   - 2.1 Backend Subsystem (FastAPI, Middleware, Sanitization & Celery)
   - 2.2 Frontend Subsystem (Next.js 16, React 19, Monaco, SWR & SSE Buffering)
   - 2.3 Database & Schemas Subsystem (SQLAlchemy 2.0, pgvector, Alembic & PgBouncer)
   - 2.4 VSCode Extension Subsystem (SecretStorage, Providers & Critical Payload Mismatch)
   - 2.5 Infrastructure, Security & Deployment Subsystem (Containers, Nginx & Render Specs)
3. [Security & Risk Vulnerability Matrix](#3-security--risk-vulnerability-matrix)
   - 3.1 Structured Risk Matrix
   - 3.2 Detailed Critical Vulnerability Analysis
4. [Code Quality & Test Coverage Assessment](#4-code-quality--test-coverage-assessment)
   - 4.1 Test Execution Breakdown (Pytest, Vitest, ESLint)
   - 4.2 Static Analysis & Linting Summary (Ruff & ESLint Gaps)
   - 4.3 Test Coverage & Architectural Gap Analysis
5. [Prioritized Remediation Roadmap](#5-prioritized-remediation-roadmap)
   - 5.1 P0 Critical (Immediate / Sprint 1)
   - 5.2 P1 High Priority (Short-Term / Sprint 2)
   - 5.3 P2 Optimization (Medium-Term / Sprint 3)

---

## 1. Executive Summary & Technical Architecture Overview

### 1.1 Executive Summary & Architectural Maturity Assessment

Anuvaad is an enterprise-grade, multi-tiered AI application engineered for automated code translation, natural language explanation, workspace indexing, and developer tooling. The codebase spans five core operational domains:
1. **Python FastAPI Backend** (`app/`): High-performance asynchronous API engine utilizing SQLAlchemy 2.0 ORM, Pydantic v2 validation, custom security middleware, dual JWT authentication, and multi-tier LLM provider failover (Groq & OpenRouter).
2. **Next.js 16 Web Frontend** (`frontend/`): React 19 App Router application featuring Monaco editor integration, SWR data fetching, Server-Sent Events (SSE) stream rendering optimized via `requestAnimationFrame`, and Supabase SSR authentication.
3. **PostgreSQL & Vector Database** (`app/models/db_models.py` & `alembic/`): Database layer utilizing PostgreSQL with native `UUID`, `JSONB`, and `pgvector` 1536-dimensional embeddings, supported by a 100% linear 13-migration Alembic history.
4. **VSCode Extension** (`vscode-extension/`): Inline developer IDE extension providing command-based code translation and hover-activated explanations using VSCode `SecretStorage` for secure credential persistence.
5. **Infrastructure & Async Worker Tier** (`Dockerfile*`, `nginx.conf`, `docker-compose.yml`, `render.yaml`): Non-root multi-stage Docker containers, Nginx reverse proxy with HSTS/CSP security headers, Celery background worker queues with Redis, and automated Render deployment specs.

#### Architectural Maturity Scorecard

| Dimension | Rating | Key Highlights | Areas for Improvement |
| :--- | :---: | :--- | :--- |
| **Backend & API Design** | **9.5 / 10** | Router versioning (`/api/v1/`), clean dependency injection, zero-latency local JWT validation, multi-layer prompt injection defenses. | Deprecate legacy REST-shim `supabase_request()` functions in `app/core/database.py`. |
| **Database Architecture** | **9.5 / 10** | SQLAlchemy 2.0 async ORM, composite indexes, window-function bulk operations, complete 13-migration Alembic linear chain. | Add pgvector SQLite mocking for local offline fallback test environments. |
| **Frontend UI/UX Engine** | **9.0 / 10** | Monaco integration, SWR module-level fetcher singletons, `requestAnimationFrame` SSE buffer, robust error boundaries. | Automate Playwright E2E browser tests within the primary test runner pipeline. |
| **VSCode Extension** | **4.0 / 10** | Clean command registration, VSCode `SecretStorage` migration, debounced hover tooltips. | **CRITICAL BUG**: API payload field mismatch (`code`/`source_language` vs `raw_code`/`language`) causes 422 HTTP errors on all inline translations. 0 unit tests exist. |
| **Infra & Container Security** | **8.5 / 10** | Non-root users (`appuser`, `nextjs`), multi-stage Docker builds, HSTS, strict CSP rules. | **CRITICAL RISK**: Unredacted production credentials stored in local `.env`. Missing Nginx-level `limit_req_zone` rate limiting. |

---

### 1.2 System Architecture Diagram & Data Flow

The following diagram illustrates the multi-tier client, proxy, backend application, database, worker, and external AI provider architecture of Anuvaad:

```
+---------------------------------------------------------------------------------------------------+
|                                            CLIENT LAYER                                           |
|  +--------------------------------------------+     +------------------------------------------+  |
|  |           Next.js 16 Web Frontend          |     |             VSCode Extension             |  |
|  |   React 19, Monaco Editor, SWR Caching,    |     |  SecretStorage Key Management, Inline    |  |
|  |   `requestAnimationFrame` SSE Stream Buffer|     |  Commands (Cmd+Shift+A), Hover Provider  |  |
|  +---------------------+----------------------+     +--------------------+---------------------+  |
+------------------------|-------------------------------------------------|------------------------+
                         |                                                 |
                         | HTTPS / SSE Streaming                           | HTTPS / Sync API
                         v                                                 v
+---------------------------------------------------------------------------------------------------+
|                                    REVERSE PROXY & INGRESS TIER                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  |                                      Nginx Reverse Proxy                                    |  |
|  |   SSL/TLS 1.2/1.3 Termination, HSTS Preload (63072000s), Strict CSP & Frame-Options DENY,   |  |
|  |   Path Routing (/api/v1/ -> FastAPI API, / -> Next.js Frontend App)                         |  |
|  +----------------------------------------------+----------------------------------------------+  |
+-------------------------------------------------|-------------------------------------------------+
                                                  |
                                                  v Internal HTTP / Port 8000
+---------------------------------------------------------------------------------------------------+
|                                     FASTAPI BACKEND APPLICATION                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  |                                    Composition Root (app/main.py)                             |  |
|  |  Lifespan Context (LLM Client Singletons) | Router Versioning (/api/v1/ with /api/ aliases)   |  |
|  +----------------------------------------------+----------------------------------------------+  |
|                                                 |                                                 |
|  +----------------------------------------------v----------------------------------------------+  |
|  |                                      Middleware Stack Chain                                 |  |
|  |  1. CORS (explicit allowed origins)        4. HTTP Metrics Collector                      |  |
|  |  2. Security Headers (X-Content-Type)      5. Sliding-Window Rate Limiting (IP/Token)     |  |
|  |  3. CSRF Origin Matching (frozenset O(1))  6. API Deprecation & Sunset Headers            |  |
|  +----------------------------------------------+----------------------------------------------+  |
|                                                 |                                                 |
|  +----------------------------------------------v----------------------------------------------+  |
|  |                                     Core Logic & Router Engine                              |  |
|  |  - Auth Guard: Dual JWT (HS256 local / ES256 JWKS) + Argon2id Rolling API Keys               |  |
|  |  - Security Guard: NFKC Unicode Normalization, Comment Injection Redaction, Base64 Defense   |  |
|  |  - Router Endpoints: /code-to-english, /code-to-code, /history, /workspace, /billing, /github |  |
|  +---------------------+-------------------------------------------------------+---------------+  |
+------------------------|-------------------------------------------------------|------------------+
                         |                                                       |
                         v                                                       v
+-------------------------------------------------------+     +-------------------------------------+
|                  DATA & ASYNC QUEUE TIER              |     |          EXTERNAL SERVICES TIER     |
|  +-------------------------------------------------+  |     |  +-------------------------------+  |
|  |              PostgreSQL + pgvector              |  |     |  |      Groq AI Engine           |  |
|  |  SQLAlchemy 2.0 ORM, 1536-dim Vector Embeddings,  |  |     |  |  Primary: deepseek-r1-70b     |  |
|  |  JSONB, 13-File Linear Alembic Chain, PgBouncer  |  |     |  |  Secondary: llama-3.3-70b     |  |
|  +------------------------+------------------------+  |     |  +---------------+---------------+  |
|                           |                           |     |                  |                  |
|  +------------------------v------------------------+  |     |  +---------------+---------------+  |
|  |                 Redis & Celery                  |  |     |  |     OpenRouter Fallback       |  |
|  |  Celery Worker Tasks, Celery Beat Scheduled    |  |     |  |  meta-llama/llama-3.3-70b    |  |
|  |  Crons (Daily/Weekly Stats & 2AM History Prune) |  |     |  +---------------+---------------+  |
|  +-------------------------------------------------+  |     |                  |                  |
+-------------------------------------------------------+     |  +---------------+---------------+  |
                                                              |  |      Supabase Auth & JWKS     |  |
                                                              |  |  Public Key Discovery Endpoint|  |
                                                              |  +-------------------------------+  |
                                                              +-------------------------------------+
```

---

## 2. Subsystem Deep-Dives

### 2.1 Backend Subsystem
- **Application Lifespan & Client Management (`app/main.py`):**
  The FastAPI application uses modern `@asynccontextmanager` lifespan handlers. On startup, `init_clients()` instantiates singletons for `AsyncOpenAI` pointing to Groq and OpenRouter. On shutdown, `close_clients()` safely teardowns connection pools. This eliminates per-request TLS handshakes and socket creation overhead.
- **Router Versioning & Legacy Aliases:**
  Primary production endpoints are mounted under `/api/v1/`. Backward compatibility for legacy clients is maintained via `/api/` route aliases, which automatically pass through `api_deprecation_middleware` to inject HTTP `Deprecation` and `Sunset` headers (sunsetting target: 2027).
- **Middleware Execution Chain (`app/api/middleware/`):**
  Requests pass through a strict 6-stage middleware pipeline:
  1. `CORSMiddleware`: Restricts HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`) and headers (`Authorization`, `Content-Type`, `X-API-Key`, `X-CSRF-Token`).
  2. `security_headers_middleware`: Injects frame protection, content-type sniffing protection, and baseline CSP.
  3. `csrf_origin_middleware`: Checks state-mutating requests (`POST`, `PATCH`, `DELETE`) against a pre-computed `frozenset` (`_allowed_origins_set`) in production environments for $O(1)$ verification efficiency while bypassing `/api/webhook/`.
  4. `metrics_middleware`: Captures request latencies and response status code distribution.
  5. `rate_limit_middleware`: Implements a sliding-window rate limiter supporting both IP-based tracking (`50 req/min` default) and authenticated user token tracking (`200 req/min` default).
  6. `api_deprecation_middleware`: Injects sunset metadata headers on legacy `/api/` paths.
- **Prompt Sanitization & Security Defenses (`app/routers/translate/dependencies.py`):**
  Before code payloads are forwarded to the LLM engine, input passes through multi-tiered sanitization:
  - **Unicode Normalization**: Executes `unicodedata.normalize('NFKC', raw_code)` and strips hidden zero-width space characters (`_UNICODE_CONTROL`).
  - **Comment Redaction**: Scans code for single-line (`//`, `#`, `--`), multi-line (`/* */`, `'''`, `"""`), and HEREDOC comment blocks. Prompt injection keywords within comments are redacted.
  - **Base64 Payload Detection**: Decodes base64 strings embedded inside comments; if the decoded payload contains prompt injection vectors, it is redacted.
  - **Dangerous URL Scheme Filtering**: Blocks requests containing non-HTTP URL schemes (`file://`, `ftp://`, `jar://`, `gopher://`) to prevent local file inclusion and SSRF attacks.
- **Async SSE Streaming & AI Fallback (`app/services/ai.py`):**
  Translation requests utilize Server-Sent Events (`StreamingResponse` emitting `text/event-stream`). The AI service implements a 3-tier model fallback strategy:
  1. Primary: Groq `deepseek-r1-distill-llama-70b` (or `llama-3.3-70b-versatile` for standard requests).
  2. Secondary Fallback: Groq `llama-3.3-70b-versatile` (or `llama3-8b-8192` under isolated rate-limit buckets).
  3. Tertiary Fallback: OpenRouter `meta-llama/llama-3.3-70b-instruct`.
- **Async Celery Task Worker (`app/queue/tasks.py`):**
  Offloads intensive operations to background Celery workers:
  - `save_translation_history_task`: Asynchronous, non-blocking translation recording.
  - `process_billing_webhook_task`: Idempotent Razorpay event processing.
  - `process_github_repo_task`: Long-running repository ingestion, AST parsing, chunking, and embedding generation.
  - `Celery Beat Crons`: Daily stats resets, weekly stats resets, and scheduled daily history pruning at 2:00 AM UTC.

---

### 2.2 Frontend Subsystem
- **Framework & Component Architecture (`frontend/src/app`):**
  Built on Next.js 16.2.7 (App Router) and React 19.2.4 using a feature-first folder organization:
  - `src/features/translate/`: Encapsulates code editing, block list rendering, and language selection.
  - `src/features/landing/`: High-performance landing page components.
  - `src/components/ui/`: Radix primitive UI components styled with Tailwind CSS v4 and Framer Motion animations.
- **Monaco Code Editor Integration (`@monaco-editor/react` v4.7.0):**
  Provides full code syntax highlighting, custom theme configuration, and block selection. Monaco options are pre-allocated at the module level to eliminate unnecessary editor re-instantiations.
- **State Management & SWR Fetching Stability (`src/lib/swr-fetcher.ts`):**
  Utilizes SWR (v2.4.1) for client-side data synchronization (`useTranslationStats`, `useSubscriptionStatus`, `useCredits`). `authFetcher` and `publicFetcher` instances are declared at module scope, preserving identity across component re-renders to prevent infinite refetch loops.
- **SSE Streaming Buffer with `requestAnimationFrame` (`useTranslationStream`):**
  Incoming SSE text chunks from `/api/code-to-english` can arrive at high frequency. To prevent UI frame drops and heavy React render thrashing, incoming text is appended to an internal buffer and flushed to React state via `requestAnimationFrame` aligned with the browser's display refresh rate. An `AbortController` handles immediate stream termination on user cancellation.
- **Error Boundaries & User Experience (`src/components/ui/error-boundary.tsx`):**
  Combines Next.js App Router error files (`src/app/dashboard/error.tsx`) with React Error Boundaries and `sonner` toast notifications (`toast.error()`), ensuring unhandled errors degrade gracefully without crashing the UI.
- **Supabase SSR Auth Integration (`src/infrastructure/auth-context.tsx`):**
  Implements `@supabase/ssr` with cookie-based session persistence. Tokens are sent securely via standard HTTP `Authorization: Bearer <access_token>` headers, completely eliminating token leakage in POST payload bodies.

---

### 2.3 Database & Schemas Subsystem
- **SQLAlchemy 2.0 Async ORM Models (`app/models/db_models.py`):**
  Defines 20+ relational and vector tables using standard declarative mapping:
  - Core User & Auth: `User`, `UserGithubToken`, `UserSubscription`, `ApiKey`, `UserTranslationStats`.
  - Workspace Multitenancy: `Workspace`, `WorkspaceMember` (composite primary key `workspace_id` + `user_email`).
  - Vector & Semantic Storage: `LLMSemanticCache` (`Vector(1536)`), `RepoEmbedding` (`Vector(1536)`), `SemanticArtifact` (`Vector(1536)`).
  - Codebase Structural Indexing: `RepositoryImport`, `SourceState`, `IndexConfiguration`, `DesiredIndexState`, `IndexRun`, `SearchableMaterialization`, `StructuralFile`, `StructuralSymbol`, `StructuralImport`.
- **Field Types & Timezone Integrity:**
  - Primary Keys: Native PostgreSQL `UUID(as_uuid=True)` with `default=uuid.uuid4`.
  - Timestamps: Explicit UTC timezone support (`DateTime(timezone=True)` using `default=lambda: datetime.now(UTC)`).
  - Unstructured Data: Native PostgreSQL `JSONB` for translation block structure and payment metadata.
- **Database Indexing & Foreign Key Constraints:**
  - Composite Index: `ix_translation_history_user_created` on `translation_history(user_email, created_at DESC)` optimizes workspace history listing.
  - Unique Idempotency Index: `ix_payment_transactions_event_id` on `payment_transactions(event_id)`.
  - Partial Unique Index: `uq_searchable_materializations_current_import` on `searchable_materializations(import_id)` WHERE `is_current IS TRUE`.
  - Role Constraint: `CHECK (role IN ('owner', 'admin', 'member'))` on `workspace_members`.
  - Cascading Deletes: `ON DELETE CASCADE` configured on workspace memberships, API keys, and repository imports.
- **Query Efficiency & Bulk Window Functions (`app/queue/tasks.py`):**
  Scheduled translation history pruning avoids $O(N)$ row-by-row queries. It executes a single SQL query leveraging `ROW_NUMBER() OVER (PARTITION BY user_email ORDER BY created_at DESC)` to identify and delete expired history rows in two bulk operations for Free and Pro tiers.
- **13-File Linear Alembic Migration Chain:**
  Verification of `alembic/versions/` confirms a unbroken, continuous migration chain:
  ```
  7af437a6b3ae (baseline_and_new_tables)
    └─► a3f8c1d2e9b4 (add_repo_embeddings_table)
          └─► 8d3045f704c7 (add_user_github_tokens)
                └─► 0d71502217e9 (repo_embedding_provider)
                      └─► 001_encrypt_github_tokens
                            └─► 002_add_critical_indexes
                                  └─► 003_argon2_api_key_hashing
                                        └─► 004_add_fk_constraints
                                              └─► 005_remove_duplicate_columns
                                                    └─► 006_phase_1a_identity_models
                                                          └─► 007_phase_1b
                                                                └─► 008_phase_1c_searchable_persistence
                                                                      └─► 009_phase_2a_semantic_artifacts
  ```
  - Migration `001_encrypt_github_tokens` contains the explicit link from `0d71502217e9` to `001`.
  - Migration `004` cleans up orphaned workspace member records prior to attaching foreign key constraints.
  - Migration `005` safely migrates `char_count` values into `character_count` before dropping legacy columns.
- **Connection Pooling & PgBouncer Support (`app/core/database_session.py`):**
  Supports standard SQLAlchemy connection pooling (`pool_size=20`, `max_overflow=10`) as well as production PgBouncer transaction-mode connection pooling (`pool_size=1`, `max_overflow=0`).

---

### 2.4 VSCode Extension Subsystem
- **Extension Architecture & Manifest (`vscode-extension/package.json`):**
  Lightweight extension (v0.1.0) targeting VSCode engine `^1.80.0`. Declares command `anuvaad.translateInline` (shortcut `cmd+shift+a` / `ctrl+shift+a`), configuration settings (`anuvaad.apiKey`, `anuvaad.apiUrl`), and activation events for major languages (`python`, `typescript`, `javascript`, `go`, `rust`).
- **SecretStorage Migration (`vscode-extension/src/extension.ts`):**
  On activation, the extension automatically migrates plain settings configuration keys to encrypted VSCode `SecretStorage`:
  ```typescript
  const legacyApiKey = config.get<string>('apiKey');
  if (legacyApiKey) {
      await context.secrets.store('anuvaad.apiKey', legacyApiKey);
      await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
  }
  ```
- **Command & Hover Providers:**
  - `anuvaad.translateInline`: Formats AI translations into comment blocks tailored to the active file's language syntax (`//` for JS/TS/Go/Rust, `#` for Python/Yaml, `<!-- -->` for HTML/XML).
  - `provideHover`: Debounced hover provider (800ms) active across all file types (`*`), supporting cancellation tokens (`token.isCancellationRequested`) and rendering explanations as `vscode.MarkdownString`.
- **CRITICAL BUG: Payload Field Mismatch Breaking Extension:**
  - **Issue Location**: `vscode-extension/src/extension.ts` lines 63–66 and 142–145 vs `app/models/schemas.py` lines 6–13.
  - **Extension Outbound Request Payload**:
    ```json
    {
      "code": "function add(a, b) { return a + b; }",
      "source_language": "typescript"
    }
    ```
  - **Backend Schema Requirement (`CodePayload` in Pydantic)**:
    ```python
    class CodePayload(BaseModel):
        raw_code: str = Field(..., min_length=1, max_length=50000)
        language: str = Field(..., min_length=1, max_length=30)
    ```
  - **Impact**: Every inline translation request sent from VSCode fails immediately with HTTP 422 Unprocessable Entity (`Field required: raw_code`, `Field required: language`), rendering extension translation completely non-functional.

---

### 2.5 Infrastructure, Security & Deployment Subsystem
- **Non-Root Multi-Stage Docker Build Strategy:**
  - Backend API (`Dockerfile.api`): Multi-stage Python 3.11 build creating user `appuser` (UID 1001) and executing under `USER appuser`.
  - Frontend Web (`Dockerfile.frontend`): Multi-stage Node.js 22 build creating user `nextjs` (UID 1001, group `nodejs`) running under `USER nextjs`.
  - All services specify resource limits (e.g. API capped at 1GB RAM / 2 CPUs) and explicit health check probes (`curl`, `wget`, `celery inspect ping`, `pg_isready`).
- **Nginx Reverse Proxy Hardening (`nginx.conf`):**
  - Enforces HTTP to HTTPS 301 redirection while preserving ACME challenge paths.
  - Restricts SSL protocols strictly to `TLSv1.2` and `TLSv1.3`.
  - Security headers attached: HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, strict CSP headers.
  - **Nginx Deficiency**: `nginx.conf` lacks `limit_req_zone` and `limit_req` directives. While FastAPI handles application rate-limiting, raw layer-7 HTTP floods pass directly to Gunicorn application workers.
- **Render Deployment Specs (`render.yaml`):**
  - Defines Python web service `anuvaad-api` running `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`.
  - Configures pre-deploy command `alembic upgrade head` to ensure database schema migrations run automatically prior to routing live traffic.
  - Enforces `sync: false` on secrets, preventing raw credentials from being stored in version control specs.

---

## 3. Security & Risk Vulnerability Matrix

### 3.1 Structured Risk Matrix

The following matrix categorizes all identified vulnerabilities across the Anuvaad codebase by risk level:

| Vulnerability ID | Subsystem | Risk Level | Description | Impact | Mitigation Strategy |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **VULN-CRIT-01** | Secret Management | **CRITICAL** | Unredacted live credentials present in local `.env` file (`GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, DB password `Tarunvamsivaka7#`, `UPSTASH_REDIS_TOKEN`). | Potential credential compromise, unauthorized database access, and data exfiltration if local machine is compromised. | Immediately revoke and rotate all affected credentials. Remove live secrets from local `.env` and utilize secure environment variable stores. |
| **VULN-CRIT-02** | VSCode Extension | **CRITICAL** | Request payload field key mismatch (`code`/`source_language` vs `raw_code`/`language` in `app/models/schemas.py:6-13`). | HTTP 422 errors on 100% of VSCode inline translation requests, breaking extension core functionality. | Update `vscode-extension/src/extension.ts` lines 63–66 & 142–145 to pass `{ raw_code, language }`. |
| **VULN-HIGH-01** | Infrastructure Proxy | **HIGH** | Missing Nginx `limit_req_zone` rate-limiting configuration in `nginx.conf`. | Unthrottled HTTP floods hit Gunicorn app workers directly, exposing backend to Denial of Service (DoS). | Configure Nginx `limit_req_zone` (e.g. 10 req/s rate with burst=20) for `/api/` locations. |
| **VULN-HIGH-02** | VSCode Quality | **HIGH** | Zero unit tests exist in `vscode-extension/` and ESLint fails due to flat config incompatibility. | Unchecked extension regressions, broken builds during VSCode updates, and lack of integration safety. | Implement test suite using `@vscode/test-electron` or Vitest and upgrade to ESLint v9/v10 flat config (`eslint.config.js`). |
| **VULN-MED-01** | Backend Quality | **MEDIUM** | 62 Ruff static analysis lint errors identified in backend scripts (`scripts/compliance_subagent.py`). | Code maintainability issues, style inconsistencies, and unused variable warnings. | Run `ruff check --fix .` to auto-correct 60 whitespace violations; manually resolve remaining 2 issues. |
| **VULN-MED-02** | Technical Debt | **MEDIUM** | Legacy `supabase_request()` REST wrapper functions in `app/core/database.py` decorated with `@deprecated_async`. | Dead code maintenance overhead and confusion regarding primary ORM access patterns. | Refactor legacy calls to native SQLAlchemy ORM repositories and delete deprecated functions. |
| **VULN-LOW-01** | Testing Infrastructure | **LOW** | SQLite memory fallback (`sqlite+aiosqlite:///:memory:`) lacks native support for `pgvector.sqlalchemy.Vector`. | Vector embedding unit tests fail if run against default SQLite fallback without mocking. | Implement SQLite vector distance mock functions or pgvector extension stubs for local testing. |

---

### 3.2 Detailed Critical Vulnerability Analysis

#### VULN-CRIT-01: Unredacted Production Credentials in Local `.env`
- **Location**: `.env` (repository root directory)
- **Detailed Findings**:
  Inspection of the root `.env` file revealed active, plaintext production secrets:
  - `GROQ_API_KEY`: `gsk_TQq5...`
  - `SUPABASE_SERVICE_ROLE_KEY` & `SUPABASE_JWT_SECRET`
  - `DATABASE_URL` & `DATABASE_POOL_URL`: Contains plaintext database user password `Tarunvamsivaka7#`
  - `UPSTASH_REDIS_TOKEN` & `UPSTASH_REDIS_REST_TOKEN`
  - `TOKEN_ENCRYPTION_KEY`: Fernet key for encrypting GitHub OAuth tokens at rest
- **Verification**: `.gitignore` correctly lists `.env` and `.env.*` (preventing commit to GitHub). However, storing live production keys unencrypted on developer disk creates severe risk of secret leakage via workstation compromise, local backup software, or diagnostic log dumps.
- **Remediation**:
  1. Revoke all currently exposed keys (Groq API key, Supabase service role key, Database password, Upstash Redis tokens).
  2. Issue newly generated secrets in production environments (Render, Vercel, Supabase).
  3. Replace local `.env` values with standard placeholder strings matching `.env.example`.

#### VULN-CRIT-02: VSCode Extension Payload Field Mismatch
- **Location**: `vscode-extension/src/extension.ts` lines 63–66, 142–145 vs `app/models/schemas.py` lines 6–13
- **Detailed Findings**:
  When triggering inline translation (`anuvaad.translateInline`) or hover explanations (`provideHover`), the VSCode extension constructs the following POST body payload:
  ```typescript
  // vscode-extension/src/extension.ts
  const response = await axios.post(`${apiUrl}/api/v1/code-to-english/sync`, {
      code: selectedText,
      source_language: document.languageId
  });
  ```
  However, the FastAPI backend endpoint expects the Pydantic model `CodePayload` defined in `app/models/schemas.py`:
  ```python
  # app/models/schemas.py
  class CodePayload(BaseModel):
      raw_code: str = Field(..., min_length=1, max_length=50000)
      language: str = Field(..., min_length=1, max_length=30)
      workspace_id: str | None = None
      session_id: str | None = None
      repository_name: str | None = None
      file_path: str | None = None
  ```
- **Impact**: FastAPI strictly validates payload fields. Because `raw_code` and `language` are missing in the request, FastAPI returns HTTP 422 Unprocessable Entity (`Field required: raw_code`, `Field required: language`). As a result, the extension fails on 100% of user translation attempts.
- **Remediation**:
  Update `vscode-extension/src/extension.ts` to map text selection and language ID to the exact backend payload field names:
  ```typescript
  const response = await axios.post(`${apiUrl}/api/v1/code-to-english/sync`, {
      raw_code: selectedText,
      language: document.languageId
  });
  ```

---

## 4. Code Quality & Test Coverage Assessment

### 4.1 Test Execution Breakdown

Automated test execution across all project modules yielded the following results:

```
=================================== TEST RESULTS SUMMARY ===================================
1. Backend Unit & Integration Suite (Pytest):
   - Command: pytest -v --tb=short
   - Status: 221 PASSED, 3 SKIPPED, 0 FAILED (100% Pass Rate across active tests)
   - Duration: 9.42 seconds
   - Scope Covered: Router mounting, auth validation, prompt sanitization, rate-limiting,
                    vector retrieval, database schema migrations, and quota resilience.

2. Web Frontend Test Suite (Vitest):
   - Command: npm test (in frontend/)
   - Status: 47 PASSED across 4 test files, 0 FAILED (100% Pass Rate)
   - Duration: 7.52 seconds
   - Scope Covered: Auth/billing logic, custom hooks, code language detection heuristics,
                    and Monaco skeleton rendering states.

3. Web Frontend Linter (ESLint):
   - Command: npm run lint (in frontend/)
   - Status: 0 ERRORS / 0 WARNINGS (100% Clean Compliance)

4. Backend Static Analysis (Ruff):
   - Command: ruff check .
   - Status: 62 Lint Violations Identified (60 Auto-Fixable via ruff check --fix .)

5. VSCode Extension Linter (ESLint):
   - Command: npm run lint (in vscode-extension/)
   - Status: FAILED (Missing local node_modules / flat config incompatibility)
============================================================================================
```

---

### 4.2 Static Analysis & Linting Summary

- **Backend (Ruff Analysis)**:
  `ruff check .` identified 62 code style issues:
  - 60 issues (`W291`, `W293`): Trailing whitespace and blank line whitespace inside script files (`scripts/compliance_subagent.py`). All 60 issues can be resolved automatically via `ruff check --fix .`.
  - 1 issue (`UP015`): Unnecessary explicit open mode argument.
  - 1 issue (`B007`): Unused loop control variable `expected`.
- **Frontend (ESLint Analysis)**:
  The frontend uses ESLint flat configuration (`eslint.config.mjs`) compatible with Next.js 16 and TypeScript. Execution returned **0 errors**, confirming strict compliance with formatting, hook usage, and import rules.
- **VSCode Extension (ESLint Analysis Gap)**:
  Execution of `npm run lint` within `vscode-extension/` failed due to missing local dependency installation in `vscode-extension/node_modules` and legacy ESLint configuration rules incompatible with ESLint v10.

---

### 4.3 Test Coverage & Architectural Gap Analysis

1. **VSCode Extension Zero Test Coverage (CRITICAL GAP)**:
   The `vscode-extension/` directory contains **0 unit test files**. There are no automated checks verifying extension activation, API request payload structure, response parsing, or hover provider markdown formatting.
2. **Missing Automated Playwright E2E Browser Testing**:
   While `@playwright/test` is installed in `frontend/package.json`, browser-level E2E test execution is not integrated into `npm test` or CI execution scripts. Core user journeys (login -> workspace selection -> code translation -> history inspection) are not verified automatically end-to-end.
3. **Backend Async Celery & Transaction Edge Cases**:
   Although backend pytest coverage is high (221 tests), task queues (`worker`, `worker-heavy`, `beat`) lack integration tests simulating Redis connection dropouts or atomic database transaction rollbacks during mid-stream Razorpay webhook failures.

---

## 5. Prioritized Remediation Roadmap

The remediation roadmap is structured into three execution phases prioritized by severity and impact:

```
+---------------------------------------------------------------------------------------------------+
|                               PRIORITIZED REMEDIATION TIMELINE                                   |
+---------------------------------------------------------------------------------------------------+
|  [P0 CRITICAL - SPRINT 1 (IMMEDIATE)]                                                             |
|  ├── 1. Revoke & Rotate Exposed Credentials in root .env file                                     |
|  └── 2. Fix VSCode Extension Request Payload (code -> raw_code, source_language -> language)     |
+---------------------------------------------------------------------------------------------------+
|  [P1 HIGH PRIORITY - SPRINT 2 (SHORT-TERM)]                                                       |
|  ├── 1. Configure Nginx Rate Limiting (limit_req_zone) in nginx.conf                              |
|  ├── 2. Implement VSCode Extension Test Suite & Fix ESLint Flat Config                            |
|  └── 3. Execute `ruff check --fix .` for Backend Script Formatting Cleans                         |
+---------------------------------------------------------------------------------------------------+
|  [P2 OPTIMIZATION - SPRINT 3 (MEDIUM-TERM)]                                                       |
|  ├── 1. Deprecate Legacy `supabase_request()` DB Shims in app/core/database.py                    |
|  ├── 2. Integrate Automated Playwright E2E Browser Tests into Frontend CI Pipeline                 |
|  └── 3. Implement SQLite Vector Operation Mocking for Local Offline Test Fallbacks                |
+---------------------------------------------------------------------------------------------------+
```

---

### 5.1 P0 Critical (Immediate / Sprint 1)

1. **Credential Rotation & Secret Sanitization**:
   - **Action**: Immediately invalidate and rotate `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, PostgreSQL database password (`Tarunvamsivaka7#`), Upstash Redis tokens, and Fernet `TOKEN_ENCRYPTION_KEY`.
   - **File**: `.env` (root directory)
   - **Target State**: Ensure no live plaintext credentials reside on local developer disk; replace local `.env` with placeholder strings matching `.env.example`.
2. **VSCode Extension API Payload Alignment**:
   - **Action**: Modify request payload key names in `vscode-extension/src/extension.ts` lines 63–66 and 142–145:
     ```typescript
     // BEFORE (Causes 422 Error):
     { code: selectedText, source_language: document.languageId }

     // AFTER (Valid Payload):
     { raw_code: selectedText, language: document.languageId }
     ```
   - **File**: `vscode-extension/src/extension.ts`
   - **Target State**: VSCode inline translation and hover provider operations succeed with 200 OK responses.

---

### 5.2 P1 High Priority (Short-Term / Sprint 2)

1. **Nginx Reverse Proxy Rate Limiting**:
   - **Action**: Add `limit_req_zone` rate limiting to `nginx.conf`:
     ```nginx
     http {
         limit_req_zone $binary_remote_addr zone=api_rate_limit:10m rate=10r/s;
         ...
         server {
             location /api/ {
                 limit_req zone=api_rate_limit burst=20 nodelay;
                 proxy_pass http://fastapi;
             }
         }
     }
     ```
   - **File**: `nginx.conf`
   - **Target State**: Layer-7 HTTP flood protection enforced at proxy boundary before reaching Gunicorn application workers.
2. **VSCode Extension Unit Testing & ESLint Fix**:
   - **Action**: Create unit tests (`vscode-extension/src/test/extension.test.ts`) covering command execution, payload building, and response parsing. Update `vscode-extension/package.json` and ESLint flat config (`eslint.config.js`).
   - **Target State**: 100% passing linting and automated unit testing for VSCode extension module.
3. **Backend Ruff Lint Cleanup**:
   - **Action**: Run `ruff check --fix .` across backend repository to resolve 60 whitespace violations in `scripts/compliance_subagent.py`. Manually resolve remaining unused variable warnings (`UP015`, `B007`).
   - **Target State**: 0 Ruff lint errors across entire Python backend codebase.

---

### 5.3 P2 Optimization (Medium-Term / Sprint 3)

1. **Deprecate Legacy Database Compatibility Wrappers**:
   - **Action**: Refactor legacy code references calling `supabase_request()` and `supabase_request_list()` in `app/core/database.py` to use SQLAlchemy 2.0 ORM repositories (`app/repositories/`). Remove `@deprecated_async` wrappers once migrated.
   - **Target State**: Clean, single-path ORM access pattern across backend application.
2. **Automate Playwright E2E CI Integration**:
   - **Action**: Configure Playwright browser test scripts in `frontend/package.json` (`npm run test:e2e`) and integrate into CI deployment workflow.
   - **Target State**: Automated headless browser testing of critical user workflows on every pull request.
3. **SQLite Local Vector Embedding Stubs**:
   - **Action**: Add SQLite mock stubs for `pgvector.sqlalchemy.Vector(1536)` operations in `app/core/database_session.py` when running in offline `sqlite+aiosqlite:///:memory:` mode.
   - **Target State**: Full local unit test execution capabilities without requiring external PostgreSQL instances.

---

*End of Anuvaad Codebase Analysis & Engineering Audit Report.*
