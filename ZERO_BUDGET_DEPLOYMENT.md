# Anuvaad — Zero-Budget Production Deployment Guide

> **Target Monthly Cost**: $0.00 / month  
> **Target Scale**: Thousands of daily translations served sustainably on Free Tier infrastructure  
> **Status**: Verified Production Ready

This guide outlines how to deploy and operate the complete Anuvaad platform with **zero hosting or API costs** by taking maximum advantage of generous cloud and AI provider free tiers with built-in architectural guardrails.

---

## 1. Zero-Budget Free Tier Architecture Matrix

| Service Component | Free Tier Provider | Free Tier Allocation | Guardrail & Quota Enforcement |
|---|---|---|---|
| **AI Translation Engine** | **Groq API** (Llama 3.3 70B & 3.1 8B) | **14,400 req/day**, 6,000 RPM, 100,000 TPM | Dual-model fallback (70B ➔ 8B), input cap 4,000 chars, max tokens 1,500 |
| **Relational & Vector DB** | **Supabase PostgreSQL** | **500 MB** storage, 2 active projects, pgvector | Async pool `pool_size=5`, `pool_recycle=300`, nightly DB pruning of anonymous data |
| **Cache & Rate Limiting** | **Upstash Redis** | **10,000 commands/day** | In-memory LRU fallback (500 items), client IP & account sliding window rate limits |
| **Web Frontend** | **Vercel** / **Render** | **100 GB bandwidth / mo**, Serverless Edge runtime | Static generation for landing/auth, SWR client caching, proxy rewrites |
| **FastAPI Backend** | **Render Free Web Service** | **750 hours/month** (1 Web Service) | Asynchronous non-blocking I/O, lightweight Uvicorn instance |
| **Transactional Email** | **Resend** | **3,000 emails/month** (100/day) | Asynchronous Celery background dispatch with retry backoff |

---

## 2. Step-by-Step Deployment Instructions

### Step 1: Provision Free AI Keys (Groq)
1. Register for a free account at [console.groq.com](https://console.groq.com).
2. Generate an API Key and note it as `GROQ_API_KEY`.
3. *(Optional free fallback)* Register at [openrouter.ai](https://openrouter.ai) or DeepSeek free tier for emergency redundancy (`DEEPSEEK_API_KEY`).

### Step 2: Provision Free PostgreSQL & Vector DB (Supabase)
1. Sign up at [supabase.com](https://supabase.com) and create a free project named `anuvaad-prod`.
2. In **Project Settings ➔ Database ➔ Connection Pooling**:
   - Enable **Transaction Mode Connection Pooling** (port 6543).
   - Copy the connection string as `DATABASE_POOL_URL` (and direct connection as `DATABASE_URL`).
3. Under **API Settings**, copy the `Project URL`, `anon` key, and `service_role` key.
4. Run migrations from the repository root:
   ```bash
   alembic upgrade head
   ```

### Step 3: Provision Free Redis & Rate Limiter (Upstash)
1. Sign up at [upstash.com](https://upstash.com) and create a free Global Redis database.
2. Under **REST API Details**, copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. *Note*: If Upstash keys are omitted, Anuvaad automatically operates using an in-memory thread-safe LRU cache with zero downtime.

### Step 4: Deploy FastAPI Backend (Render)
1. Create a free account on [render.com](https://render.com).
2. Click **New + ➔ Web Service** and connect your GitHub repository.
3. Configure the service:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables:
   - `ENV=production`
   - `GROQ_API_KEY=<your-groq-key>`
   - `DATABASE_URL=<your-supabase-db-url>`
   - `DATABASE_POOL_URL=<your-supabase-pooler-url>`
   - `UPSTASH_REDIS_URL=<your-upstash-url>`
   - `UPSTASH_REDIS_TOKEN=<your-upstash-token>`
   - `FRONTEND_URL=https://<your-frontend-domain>.vercel.app`
   - `JWT_SECRET=<random-32-character-string>`

### Step 5: Deploy Next.js Frontend (Vercel)
1. Sign up at [vercel.com](https://vercel.com) and import the `/frontend` subfolder.
2. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL=https://<your-render-backend-url>.onrender.com`
   - `NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>`
3. Click **Deploy**. Vercel will automatically build and serve the optimized Next.js application globally on edge CDN.

---

## 3. Quota & Cost Protection Safeguards

Anuvaad includes multiple proactive guards to prevent accidental overages or account lockouts:

```
                  +--------------------------------+
                  | Incoming User / Client Request |
                  +---------------+----------------+
                                  |
                                  v
                  +--------------------------------+
                  |  Sliding Window Rate Limiter   |
                  |  - Guest: 5 req/day / IP       |
                  |  - Free User: 25 req/day       |
                  +---------------+----------------+
                                  | Pass
                                  v
                  +--------------------------------+
                  |  Token & Payload Size Enforcer |
                  |  - Max Input: 4,000 Chars      |
                  |  - Max Output: 1,500 Tokens    |
                  +---------------+----------------+
                                  | Pass
                                  v
                  +--------------------------------+
                  |    Dual-Model Groq Engine      |
                  |  Primary: Llama 3.3 70B        |
                  |  Fallback on 429: Llama 3.1 8B |
                  +---------------+----------------+
                                  |
                                  v
                  +--------------------------------+
                  | Nightly Database Pruning Task  |
                  |  - Deletes guest data > 7 days |
                  |  - Deletes stale cache > 30 d  |
                  +--------------------------------+
```

1. **Guest vs User Tiering**: Unregistered visitors receive 5 daily translations, motivating conversion to free user accounts (25 translations/day) with clear UI badges and gentle upgrade modals.
2. **Groq TPM/RPM Failover**: When traffic spikes occur on the primary Llama 3.3 70B model, the backend transparently fails over to Llama 3.1 8B Instant without failing the user's request.
3. **Database Footprint Retention Policy**: The background task `prune_database_footprint` runs automatically to delete anonymous history older than 7 days and stale semantic cache rows older than 30 days, keeping the Supabase storage comfortably below the 500 MB limit indefinitely.
4. **Connection Pool Multiplexing**: SQLAlchemy AsyncPG connection settings are configured with `pool_size=5`, `max_overflow=10`, and `pool_recycle=300`, ensuring the backend never exceeds Supabase's concurrent connection cap.

---

## 4. Operational Monitoring & Health Checks

- **Health Endpoint**: `GET /api/health` — inspects connectivity to Groq, Supabase, and Redis.
- **Cache Statistics**: `GET /api/cache-stats` — tracks cache hit ratio and LRU fallback memory.
- **Quota & Usage**: `GET /api/usage` — provides user-specific remaining daily counts.
- **Prometheus Metrics**: `GET /api/metrics/prometheus` — real-time request counts, error rates, and translation latency.
