# Anuvaad — Production Deployment Manual

This manual provides the comprehensive blueprint for taking Anuvaad from development to a live production environment. It covers deployment checklists, staging verification, infrastructure scaling, and cost modeling.

---

## 1. Pre-Flight: Required Environment Variables

Before provisioning the server, gather these exact environment variables. The backend will **crash on startup** if the `[REQUIRED]` keys are missing.

### Backend (`.env`)
```bash
ENV=production

# Models
GROQ_API_KEY=your_groq_api_key_here                # [REQUIRED]
DEEPSEEK_API_KEY=your_deepseek_api_key_here        # [REQUIRED]

# Supabase
SUPABASE_URL=https://<your-project>.supabase.co    # [REQUIRED]
SUPABASE_ANON_KEY=your_anon_key                    # [REQUIRED]
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key    # [REQUIRED] - Never expose to client

# Application URLs
FRONTEND_URL=https://anuvaad.dev                   # [REQUIRED] - Must exactly match domain
REDIS_URL=redis://redis:6379                       # [REQUIRED] - Or UPSTASH_REDIS_URL

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_...                      # [REQUIRED for billing]
STRIPE_PRO_PRICE_ID=price_...                      # [REQUIRED for billing]
STRIPE_WEBHOOK_SECRET=whsec_...                    # [REQUIRED for billing]

# Observability (Optional but Recommended)
SENTRY_DSN=your_sentry_dsn
RESEND_API_KEY=your_resend_api_key
METRICS_USERNAME=admin
METRICS_PASSWORD=secure_password
```

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=https://api.anuvaad.dev        # [REQUIRED]
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co # [REQUIRED]
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key        # [REQUIRED]
NEXT_PUBLIC_POSTHOG_KEY=phc_...                    # Optional
```

---

## 2. Infrastructure Specs & Sizing

Anuvaad relies heavily on async I/O (SSE streams) and network requests to external LLMs, making it memory-efficient but network-bound.

| Tier | Traffic | Frontend (Next.js) | Backend (FastAPI) | Redis | Database (Supabase) |
|---|---|---|---|---|---|
| **Low** | < 1k DAU | 1 vCPU, 1GB RAM | 1 vCPU, 1GB RAM | Managed (Upstash Free) | Nano instance |
| **Medium**| 1k - 10k DAU | 2 vCPUs, 2GB RAM | 2 vCPUs, 4GB RAM | 256MB Dedicated | Micro instance |
| **High** | 10k+ DAU | 4 vCPUs, 4GB RAM | 4+ vCPUs, 8GB RAM | 1GB+ Dedicated | Small/Medium instance |

> [!TIP]
> **Scaling Bottlenecks to Watch First:**
> 1. **SSE Concurrency:** Uvicorn/FastAPI handles async well, but long-lived SSE connections can exhaust file descriptors or reverse-proxy connection pools. Increase Nginx `worker_connections`.
> 2. **Supabase Connection Pool:** Python backend queries database heavily. Watch PgBouncer exhaustion.
> 3. **Redis Rate-Limiter:** A sudden spike in translation requests will pound Redis. Ensure the Redis instance is local to the backend or use low-latency Upstash.

---

## 3. Deployment-Ready Checklist

Follow these steps precisely when configuring the production server.

- [ ] **Provision Server:** Spin up the target infrastructure (e.g., Ubuntu 22.04 LTS).
- [ ] **Install Dependencies:** Install Docker and Docker Compose.
- [ ] **Configure Nginx:** 
    - Replace `server_name localhost;` with the actual domains (`anuvaad.dev api.anuvaad.dev`) in `nginx.conf`.
    - Uncomment the HTTPS blocks and configure SSL certificates (via Certbot/Let's Encrypt).
- [ ] **Set Environment Variables:**
    - Create `.env` in the project root.
    - Create `frontend/.env.local`.
    - Verify `ENV=production` is set in the backend to trigger strict validation.
- [ ] **Database Migrations:** Ensure Supabase migrations v1-v5 are successfully applied to the production project.
- [ ] **Deploy:** Run `docker compose up -d --build`.
- [ ] **Confirm Health:** `curl -f http://localhost:8000/api/health`

---

## 4. Staging / Local Verification Path

Before going live on the final domain, verify the deployment behaves correctly using a local/staging smoke test:

1. **Verify Fail-Fast Startup:**
   Temporarily remove `FRONTEND_URL` from `.env` and run `docker compose up backend`. Confirm it crashes with `RuntimeError`. Restore the variable.

2. **Verify CORS Lockdown:**
   Use curl to attempt a translation request from a spoofed origin:
   ```bash
   curl -X POST http://localhost:8000/api/code-to-english \
     -H "Origin: http://evil-site.com" \
     -d '{"code":"print(1)"}'
   ```
   **Expected:** The request should be blocked by CORS policy.

3. **Verify Redis Integration:**
   Hit the health endpoint: `curl http://localhost:8000/api/health`
   **Expected:** The response JSON should show `"redis": "connected"`.

4. **Verify Static Asset Security Headers:**
   ```bash
   curl -I http://localhost:80/_next/static/
   ```
   **Expected:** The response must contain `X-Frame-Options`, `X-XSS-Protection`, and `Referrer-Policy`.

---

## 5. Rollback Checklist

If the deployment causes critical failures, follow these steps to revert:

- [ ] **Stop Traffic:** Revert the DNS records to the previous server IP, or stop Nginx (`systemctl stop nginx`).
- [ ] **Revert Code:** Run `git checkout <previous_stable_commit>` on the server.
- [ ] **Rebuild & Restart:** Run `docker compose up -d --build --force-recreate`.
- [ ] **Verify Reversion:** Check `/api/health` and ensure the backend is running.
- [ ] **Database State:** If a new Supabase migration caused data corruption, use the Supabase Dashboard to restore the database from the last nightly backup.

---

## 6. Final Architecture Summary

The hardened architecture consists of a 4-tier Dockerized setup routed through an Nginx reverse proxy:

1. **Nginx Edge:** Terminates SSL, enforces strict security headers (CSP, HSTS), handles CORS preflights, and proxies traffic to the Next.js frontend or FastAPI backend.
2. **Next.js App Router (Frontend):** Serves the React application. Communicates exclusively with the FastAPI backend and the public Supabase API.
3. **FastAPI (Backend):** The core engine. It manages rate-limiting via Redis, validates Stripe Webhooks, handles authentication verifications, and orchestrates dual-model (Groq/DeepSeek) intelligent failover for SSE streams. Runs strictly in `ENV=production` mode.
4. **Redis:** A local container (or managed Upstash REST) that tracks usage credits and rate limits, completely replacing the legacy in-memory LRU fallback.

---

## 7. Recommended Monitoring / Observability Setup

To ensure high availability, configure the following observability pipelines:

### 1. Prometheus / Grafana (Metrics)
The backend exposes `/api/metrics/prometheus`. Configure your Prometheus server to scrape this endpoint every 15s.
**Key Alerts to set:**
- `http_requests_total{status="5xx"} > 5%` (Backend error spike)
- `llm_translation_latency_seconds > 5s` (Groq/DeepSeek API degradation)
- `redis_connection_errors_total > 10` (Redis offline)

### 2. Sentry (Error Tracking)
Set `SENTRY_DSN` in `.env`.
**Key Alerts to set:**
- "Unhandled Exception in FastAPI"
- "Stripe Webhook Signature Verification Failed" (Potential attack)

### 3. PostHog (Product Analytics)
Set `NEXT_PUBLIC_POSTHOG_KEY`. Use this to track drop-off rates on the Stripe Checkout flow and the success rate of the "Import Gist" feature.

---

## 8. Expected Monthly Cost Model

*(Estimates based on typical provider pricing)*

| Cost Center | Low Traffic | Medium Traffic | High Traffic |
|---|---|---|---|
| **Hosting (DigitalOcean/AWS)** | $10 | $40 | $120+ |
| **Supabase (DB & Auth)** | $0 (Free) | $25 (Pro) | $25 (Pro) + Compute |
| **LLM (Groq + DeepSeek)** | $2 | $15 | $75+ |
| **Redis (Upstash/Managed)** | $0 | $10 | $30 |
| **Total Estimated Monthly** | **~$12** | **~$90** | **~$250+** |

*Note: LLM costs scale purely based on input/output tokens. Implementing aggressive Redis caching on identical code snippets will drastically reduce this cost line.*
