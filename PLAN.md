---
phase: 0
name: Critical Production Stabilization (P0)
status: IMPLEMENTED_AWAITING_CONTAINER_AND_PRODUCTION_VERIFICATION
total_tasks: 4
waves:
  - wave: 1
    description: Authentication concurrency & atomic write-through quota enforcement
    tasks: [P0-01, P0-02]
  - wave: 2
    description: Docker container process supervision & Nginx domain validation
    tasks: [P0-03, P0-04]
files_modified:
  - app/core/auth.py
  - app/core/quota.py
  - app/routers/translate.py
  - Dockerfile
  - docker-compose.prod.yml
  - scripts/docker-entrypoint-nginx.sh
  - nginx.conf
  - tests/test_security_audit4.py
  - tests/test_quota_concurrency.py
---

# PLAN.md: Phase 0 — Critical Production Stabilization (First 24 Hours, P0)

## Overview & Execution Context
Based on **Anuvaad Comprehensive Code & Architecture Audit 4 (3 November 2026)**, Phase 0 eliminates the immediate P0 operational and security risks:
1. **JWKS Lock Race Condition (SEC-01)**: Prevent concurrent ES256 key refresh requests from creating duplicate lock instances.
2. **Daily Quota Cache Invalidation & Bypass (PERF-02)**: Replace stale 86,400s caching with atomic write-through synchronization between PostgreSQL usage counts and Redis counters.
3. **Container Partial Failures (DEP-01)**: Stop backgrounding Node.js processes inside monolithic containers; enforce separated frontend/backend service lifecycles with health checks.
4. **Nginx Domain Environment Substitution (SEC-06)**: Validate `${DOMAIN}` environment presence and syntax before Nginx initialization.

---

## Wave 1: Authentication Concurrency & Daily Quota Integrity (Parallel Execution)

### Task P0-01: Fix JWKS Asynchronous Lock Initialization
- **task_id**: P0-01
- **wave**: 1
- **audit_id**: SEC-01
- **title**: Initialize `_jwks_async_lock` at module scope to eliminate race conditions during concurrent ES256 verification
- **file(s)**:
  - `app/core/auth.py`
  - `tests/test_security_audit4.py`
- **context**:
  - Current lines 54-61 in `app/core/auth.py` lazily instantiate `_jwks_async_lock` upon the first request:
    ```python
    _jwks_async_lock: asyncio.Lock | None = None
    def _get_jwks_lock() -> asyncio.Lock:
        global _jwks_async_lock
        if _jwks_async_lock is None:
            _jwks_async_lock = asyncio.Lock()
        return _jwks_async_lock
    ```
  - Under burst traffic or cold starts, multiple concurrent coroutines execute `if _jwks_async_lock is None:` before any assignment, creating separate lock instances and defeating mutex synchronization.
- **implementation_steps**:
  1. Replace lazy initialization with a module-level initialization or event-loop-safe singleton pattern:
     ```python
     _jwks_async_lock: asyncio.Lock = asyncio.Lock()
     ```
  2. Deprecate `_get_jwks_lock()` or have it return the module-level lock instance directly.
  3. Ensure all JWKS refresh operations in `app/core/auth.py` acquire `async with _jwks_async_lock:`.
  4. Author concurrent unit test with `asyncio.gather` firing 50 simultaneous ES256 token verification requests against a mocked JWKS endpoint.
- **acceptance_criteria**:
  1. Exactly one lock instance is utilized across the lifetime of the worker process.
  2. 50 concurrent verification requests result in exactly ONE remote JWKS fetch; subsequent requests consume the cached keyset.
  3. All existing JWT authentication test suites pass with zero regressions.
- **verification_command**:
  ```bash
  pytest tests/test_security_audit4.py -k "test_jwks_lock_concurrency"
  pytest tests/test_security.py
  ```

---

### Task P0-02: Implement Atomic Write-Through Daily Quota Enforcement
- **task_id**: P0-02
- **wave**: 1
- **audit_id**: PERF-02
- **title**: Correct daily usage cache synchronization to eliminate quota bypass and stale TTL drift
- **file(s)**:
  - `app/core/quota.py`
  - `app/routers/translate.py`
  - `tests/test_quota_concurrency.py`
- **context**:
  - `app/core/quota.py` caches user daily usage counts with an 86,400s TTL. If translations execute concurrently or cache updates drift, users can exceed daily tier limits.
  - A cache reset/expiration or out-of-order write allows free tier users to bypass the quota.
- **implementation_steps**:
  1. Refactor `app/core/quota.py` to implement strict write-through synchronization:
     - On translation completion: atomically update the database usage count in `daily_usages` table.
     - Increment the Redis daily usage key (`user_daily_usage:{user_id}:{date}`) using Redis `INCR` or atomic Lua script.
  2. Implement fail-closed consistency check: if Redis key is missing or evicted, reseed immediately from the database record rather than defaulting to 0.
  3. Handle cache degradation gracefully: if Redis is unavailable, fallback directly to the authoritative database transaction count.
  4. Author unit and concurrency tests verifying quota enforcement at tier limits (e.g. 5 free translations/day).
- **acceptance_criteria**:
  1. Every successful translation increments both database and cache usage atomically.
  2. Bursting 10 concurrent requests at quota limit (e.g. 4/5 used) permits exactly 1 request and returns HTTP 429 for the remaining 9.
  3. Cache key expiration does not reset consumed quota when database holds the authoritative count.
- **verification_command**:
  ```bash
  pytest tests/test_quota_concurrency.py
  ```

---

## Wave 2: Process Supervision & Nginx Hardening (Parallel Execution)

### Task P0-03: Eliminate Monolithic Container Partial Failures via Service Decoupling & Tini Supervision
- **task_id**: P0-03
- **wave**: 2
- **audit_id**: DEP-01
- **title**: Decouple frontend and backend process lifecycles and enforce error propagation in Docker
- **file(s)**:
  - `docker-compose.prod.yml`
  - `Dockerfile`
  - `Dockerfile.api`
  - `Dockerfile.frontend`
- **context**:
  - The monolithic `Dockerfile` executes:
    `CMD sh -c "cd /app/frontend && node server.js & gunicorn main:app ..."`
  - If `node server.js` crashes or runs out of memory, the background process dies silently while Gunicorn continues running. The Docker container healthcheck passes while the frontend is completely dead.
- **implementation_steps**:
  1. In `docker-compose.prod.yml`, standardize on separate `backend` (using `Dockerfile.api`) and `frontend` (using `Dockerfile.frontend`) services.
  2. Add independent healthchecks, restart policies (`restart: unless-stopped`), resource limits, and logging drivers for each.
  3. In monolithic `Dockerfile` (used in fallback / standalone environments), replace unmanaged shell backgrounding with a robust process manager (`tini` + shell script with `set -e` and trap exit handlers) that immediately exits the container if either child process terminates.
  4. Ensure healthcheck verifies both endpoints when running monolithic container.
- **acceptance_criteria**:
  1. Killing `node` in monolithic container causes container to exit immediately with non-zero exit code.
  2. In `docker-compose.prod.yml`, frontend and backend run as independent containers with isolated logs and healthchecks.
  3. Zero silent partial failure states possible in production.
- **verification_command**:
  ```bash
  docker compose -f docker-compose.prod.yml config
  ```

---

### Task P0-04: Implement Nginx Domain & Configuration Validation Preflight
- **task_id**: P0-04
- **wave**: 2
- **audit_id**: SEC-06
- **title**: Implement fail-fast preflight validation script for Nginx domain substitution and syntax checking
- **file(s)**:
  - `scripts/docker-entrypoint-nginx.sh`
  - `nginx.conf`
  - `docker-compose.prod.yml`
- **context**:
  - `nginx.conf` relies on `${DOMAIN}` substitution. If `DOMAIN` is unset or blank in the production environment, `envsubst` generates invalid syntax or points to non-existent TLS certificate paths (`/etc/letsencrypt/live//fullchain.pem`), causing catastrophic startup failure or security misconfigurations.
- **implementation_steps**:
  1. Author `scripts/docker-entrypoint-nginx.sh`:
     ```sh
     #!/bin/sh
     set -eu

     if [ -z "${DOMAIN:-}" ]; then
         echo "FATAL: DOMAIN environment variable is required for Nginx initialization" >&2
         exit 1
     fi

     echo "Validating Nginx template for domain: ${DOMAIN}"
     envsubst '${DOMAIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

     echo "Testing Nginx configuration syntax..."
     nginx -t

     echo "Nginx preflight validation successful. Starting Nginx..."
     exec nginx -g "daemon off;"
     ```
  2. Mount the script as container entrypoint in `docker-compose.prod.yml`.
  3. Make script executable and ensure POSIX compliance (no bashisms).
- **acceptance_criteria**:
  1. Running the entrypoint with unset `DOMAIN` exits with code 1 and descriptive fatal error.
  2. Running the entrypoint with valid `DOMAIN` generates `/etc/nginx/conf.d/default.conf` and passes `nginx -t`.
  3. Nginx container never starts with a broken or unverified configuration.
- **verification_command**:
  ```bash
  bash scripts/docker-entrypoint-nginx.sh
  ```

---

## Master Remediation Phase Mapping (Phases 1–5)

Following Phase 0 verification, execution transitions into subsequent phases as outlined in `.gsd/ROADMAP.md`:

| Phase | Key Focus | Primary Deliverables | Target Timeline |
| :--- | :--- | :--- | :--- |
| **Phase 1: Security & Data Integrity** | P1 Vulnerabilities | ZDR browser storage cleanup (FE-01), environment synchronization (DEP-02), SQLite production block (DEP-03), dedicated `AUDIT_HMAC_SECRET` (SEC-04), CSRF staging enforcement (SEC-03), Argon2id async offloading (SEC-10). | Days 2–7 |
| **Phase 2: Backend & AI Refactoring** | AI Service Architecture | Decompose `app/services/ai.py` into `app/services/ai/` (PERF-04), centralize history dispatch (PERF-01), Redis streaming concurrency (PERF-03), SWR subscription optimization (PERF-05), code quality cleanup (CQ-01 to CQ-11). | Weeks 2–3 |
| **Phase 3: Frontend Quality & Privacy** | UX & Client Reliability | Fail-safe Supabase build checks (FE-02), streaming `aria-live` accessibility (FE-03), Monaco editor sizing & skeleton (FE-04), bundle size budget (FE-05), dependency pruning (CQ-06 to CQ-08). | Weeks 3–4 |
| **Phase 4: Testing & Verification Gates** | Integration & SAST Gates | Async streaming integration test suite with `httpx` (TEST-01), security test hardening, Alembic migration head startup verification (DEP-04), Vitest consolidation (TEST-02), mutation testing (TEST-03), LLM provider contracts (TEST-04). | Weeks 4–5 |
| **Phase 5: Deployment Hardening** | Production Infrastructure | Multi-container decoupled topology (DEP-01), deployment preflight validator, ordered CI/CD migration gates, Nginx BYOK CORS (SEC-09), payment script nonce CSP (SEC-05), Redis urlparse validation (SEC-07). | Weeks 5–6 |
