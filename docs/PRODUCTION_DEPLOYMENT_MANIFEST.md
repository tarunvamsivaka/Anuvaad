# Anuvaad Zero-Budget Production Deployment Manifests

This document contains copy-paste deployment manifests, environment variable tables, and post-deployment validation steps for **Render** (FastAPI backend) and **Vercel** (Next.js 16 frontend).

---

## 1. Fast Cryptographic Secret Generation

Run this command once locally to generate strong cryptographically random keys for production:

```bash
python -c "
import secrets
from cryptography.fernet import Fernet

print('TOKEN_ENCRYPTION_KEY=' + Fernet.generate_key().decode())
print('CRON_SECRET=' + secrets.token_urlsafe(32))
print('METRICS_PASSWORD=' + secrets.token_urlsafe(24))
"
```

---

## 2. Render Deployment (Backend API)

### 2.1 Service Configuration
- **Repository:** `https://github.com/tarunvamsivaka/Anuvaad`
- **Branch:** `master`
- **Root Directory:** *(leave blank / repo root)*
- **Runtime:** `Python 3`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2`
- **Health Check Path:** `/api/health`
- **Instance Type:** `Free (0.5 CPU, 512 MB RAM)`
- **Auto-Deploy:** `Yes`

### 2.2 Environment Variables (Render Dashboard → Environment)

| Key | Example / Recommended Value | Notes |
| :--- | :--- | :--- |
| `ENV` | `production` | Enables production security checks and disables debug endpoints |
| `GROQ_API_KEY` | `gsk_...` | Primary tier AI inference key from console.groq.com |
| `DEEPSEEK_API_KEY` | `sk-...` | Fallback tier AI inference key from platform.deepseek.com |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:[PASS]@[HOST]:5432/postgres` | Direct connection from Supabase Database Settings |
| `DATABASE_POOL_URL` | `postgresql+asyncpg://postgres:[PASS]@[HOST]:6543/postgres?pgbouncer=true` | PgBouncer pooled connection from Supabase |
| `SUPABASE_URL` | `https://[PROJECT-ID].supabase.co` | Supabase API Settings |
| `SUPABASE_ANON_KEY` | `eyJ...` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase elevated service role key |
| `SUPABASE_JWT_SECRET` | `[JWT-SECRET-STRING]` | Supabase API Settings → JWT Secret |
| `TOKEN_ENCRYPTION_KEY` | `[FERNET-32-BYTE-KEY]` | Generated via `Fernet.generate_key().decode()` |
| `FRONTEND_URL` | `https://getanuvaad.vercel.app` | Production frontend domain |
| `TRUST_PROXY_HOPS` | `1` | Reads client IP from X-Forwarded-For behind Render edge |
| `ENABLE_BILLING` | `false` | Keeps Razorpay checkout dormant during public free-beta |
| `FREE_TIER_DAILY_LIMIT` | `10` | Daily translation quota for authenticated free users |
| `DEMO_RATE_LIMIT_PER_DAY` | `3` | Daily anonymous trial limit before sign-up prompt |
| `RATE_LIMIT_IP_MAX` | `15` | Per-minute sliding window rate limit per client IP |
| `METRICS_USERNAME` | `admin` | HTTP Basic Auth user for `/api/metrics` |
| `METRICS_PASSWORD` | `[RANDOM-SECRET]` | HTTP Basic Auth password for `/api/metrics` |
| `CRON_SECRET` | `[RANDOM-SECRET]` | Bearer token for automated DB maintenance triggers |
| `RESEND_API_KEY` | `re_...` | *(Optional)* For transactional email dispatch |
| `SENTRY_DSN` | `https://...@sentry.io/...` | *(Optional)* For backend error tracking |
| `UPSTASH_REDIS_URL` | `rediss://default:...@...upstash.io:6379` | *(Optional)* Upstash serverless Redis connection |

---

## 3. Vercel Deployment (Next.js 16 Frontend)

### 3.1 Project Settings
- **Framework Preset:** `Next.js`
- **Root Directory:** `frontend`
- **Build Command:** `next build`
- **Output Directory:** `.next`
- **Install Command:** `npm ci`
- **Node.js Version:** `20.x` or `22.x`

### 3.2 Environment Variables (Vercel Project Settings → Environment Variables)

| Key | Value | Target Environments |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://anuvaad-api.onrender.com` | Production, Preview, Development |
| `NEXT_PUBLIC_FRONTEND_URL` | `https://getanuvaad.vercel.app` | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[PROJECT-ID].supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Development |
| `NEXT_PUBLIC_ENABLE_BILLING` | `false` | Production, Preview, Development |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` | *(Optional)* Analytics key |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://...@sentry.io/...` | *(Optional)* Frontend error telemetry |

---

## 4. Post-Deployment Verification Commands

Once the Render service and Vercel app are live, run the verification scripts from your terminal:

```bash
# 1. Run live smoke test against production endpoints:
powershell -File scripts/smoke-test.ps1 -FrontendUrl "https://getanuvaad.vercel.app" -BackendUrl "https://anuvaad-api.onrender.com"

# 2. Check backend health directly:
curl -s https://anuvaad-api.onrender.com/api/health | jq .

# 3. Verify metrics endpoint requires authentication:
curl -i https://anuvaad-api.onrender.com/api/metrics
```
