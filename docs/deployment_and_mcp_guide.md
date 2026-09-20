# Anuvaad Deployment & MCP Server Integration Playbook

## 1. Executive Topology & Multi-Cloud Architecture

Anuvaad operates on a modern, decoupled cloud architecture designed for high availability, low-latency AI translation, and enterprise security:

```
                      ┌────────────────────────────┐
                      │    Next.js 15 Frontend     │
                      │     (Hosted on Vercel)     │
                      └─────────────┬──────────────┘
                                    │ (API Proxy / Rewrites)
                                    ▼
                      ┌────────────────────────────┐
                      │    FastAPI Backend Core    │
                      │     (Hosted on Render)     │
                      └──────┬──────────────┬──────┘
                             │              │
        ┌────────────────────┴───┐      ┌───┴────────────────────┐
        │  Supabase PostgreSQL   │      │   Upstash / Redis      │
        │  (Storage, Auth & ORM) │      │  (Cache & Rate Limits) │
        └────────────────────────┘      └────────────────────────┘
```

---

## 2. MCP Server Configurations

### 2.1. Supabase MCP Server (`supabase`)
- **Role:** Direct database inspection, schema migration execution, advisory checks, and table management.
- **Key Tools:**
  - `list_tables`: Enumerate tables and column definitions.
  - `list_migrations` / `apply_migration`: Validate and run Alembic / Supabase SQL migrations.
  - `get_advisors`: Run security and performance audits against PostgreSQL queries and foreign key indexes.
  - `execute_sql`: Execute DDL / DML verification queries.

### 2.2. Render MCP Server (`render`)
- **Role:** Infrastructure deployment orchestration, environment variable management, and service health monitoring.
- **Key Tools:**
  - `list_services`: List active API and background worker services.
  - `get_deploys`: Monitor build logs and rollout status.
  - `deploy_service`: Trigger zero-downtime rolling deploys.
  - `manage_env_vars`: Sync encryption keys, JWT secrets, and database URIs.

### 2.3. Stitch MCP Server (`StitchMCP`)
- **Role:** Design token alignment, layout generation, and component styling synchronization.
- **Key Tools:**
  - `get_project` / `list_screens`: Inspect design specifications and wireframes.
  - `generate_variants`: Produce accessible component variants matching the design tokens.
  - `apply_design_system`: Sync typography, color palette, and Monaco themes with the frontend design tokens.

---

## 3. Step-by-Step Production Deployment Playbook

### Phase 1: Database Provisioning & Schema Synchronization (Supabase)
1. Ensure the PostgreSQL connection string is set in `DATABASE_URL` (format: `postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/postgres`).
2. Run database migrations:
   ```bash
   alembic upgrade head
   ```
3. Verify migration head is at `010_add_performance_and_fk_indexes`.

### Phase 2: Backend API Deployment (Render)
1. Connect repository with [`render.yaml`](file:///c:/Users/tarun/Anuvaad/Anuvaad/render.yaml).
2. Configure required environment variables in Render Dashboard:
   - `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
   - `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `ENCRYPTION_KEY`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (optional for distributed rate limiting)
3. Deploy service: Render executes `pip install -r requirements.txt`, runs `alembic upgrade head` via `preDeployCommand`, and launches Uvicorn workers.

### Phase 3: Frontend Deployment (Vercel)
1. Set root directory to `frontend/`.
2. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL`: URL of the deployed Render backend (e.g., `https://anuvaad-api.onrender.com`).
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Build command: `npm run build` (`next build`).
4. Output directory: `.next`.

---

## 4. Pre-Flight Verification & Health Checklist

- [x] **Backend Test Suite**: `pytest tests/` (411 passed, 3 skipped, 0 failed).
- [x] **Frontend Unit & Component Tests**: `npx vitest run` (316 passed across 21 test suites).
- [x] **Frontend Production Build**: `npm run build` (Exit code 0, 0 TypeScript errors).
- [x] **Python Linter**: `ruff check .` (0 violations).
- [x] **VSCode Extension Suite**: `npm test` in `vscode-extension/` (16 passed).
- [x] **Database Schema**: Single linear migration head verified.
- [x] **Nginx Ingress**: Real IP spoofing eliminated; rate limits & body size limits active.
- [x] **Security Posture**: OAuth open redirects sanitized; encryption keys enforced from environment.
