# Render.com Production Setup Guide for Anuvaad

This guide walks you through setting every required environment variable in the
**Render Dashboard** so the live API works correctly.

---

## Why the App Is Failing Right Now

When you visit the live site and try to translate, you see:

> **"Server misconfiguration: JWT secret not configured"**

This happens because `SUPABASE_JWT_SECRET` is **not set** in your Render
service's Environment Variables. Every authenticated API request requires this
variable to verify user tokens locally — without it, 100% of requests fail.

---

## Step 1 — Open Your Render Service

1. Go to **[dashboard.render.com](https://dashboard.render.com)**
2. Click on **anuvaad-api** (your backend Web Service)
3. Click **Environment** in the left sidebar

---

## Step 2 — Set All Required Environment Variables

Add every variable below. Use **"Add Environment Variable"** for each one.

> ⚠️ **All of these are REQUIRED for the app to work properly.**

### 🔴 CRITICAL — Fix the JWT Error Immediately

| Key | Where to Get It |
|-----|----------------|
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → **Settings** → **API** → scroll to "JWT Settings" → copy **"JWT Secret"** |

This single variable will fix the "JWT secret not configured" error and make translations work.

---

### AI Models

| Key | How to Get It |
|-----|--------------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys → Create |
| `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) → API Keys |

---

### Supabase

| Key | How to Get It |
|-----|--------------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → **Project URL** |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → **anon public** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → **service_role secret** |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Settings → API → JWT Settings → **JWT Secret** |

---

### Database

| Key | How to Get It |
|-----|--------------|
| `DATABASE_URL` | Supabase Dashboard → Settings → **Database** → Connection String (URI) → port **5432** |
| `DATABASE_POOL_URL` | Supabase Dashboard → Settings → Database → **Connection Pooling** → URI (Transaction mode, port **6543**) |

---

### Security — Generated Secrets

Run this command locally to generate the values:

```powershell
# Windows PowerShell — Run this once, save the output securely
python -c "from cryptography.fernet import Fernet; print('TOKEN_ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
```

| Key | Value |
|-----|-------|
| `TOKEN_ENCRYPTION_KEY` | Output from the command above (starts with a random base64 string) |

---

### Frontend / Networking

| Key | Value |
|-----|-------|
| `FRONTEND_URL` | `https://getanuvaad.vercel.app` (or your custom domain) |
| `ENV` | `production` |

---

### GitHub OAuth (for GitHub repo integration)

| Key | How to Get It |
|-----|--------------|
| `GITHUB_CLIENT_ID` | GitHub → Settings → Developer Settings → OAuth Apps → your app → **Client ID** |
| `GITHUB_CLIENT_SECRET` | Same page → **Client secrets** → Generate a client secret |

---

## Step 3 — Save & Redeploy

After adding all environment variables:
1. Click **"Save Changes"** in Render
2. Render will automatically trigger a new deploy
3. Wait ~2 minutes for it to go live
4. Visit [getanuvaad.vercel.app/dashboard/translate](https://getanuvaad.vercel.app/dashboard/translate) and test a translation

---

## Step 4 — Run Database Migrations

If this is the first deployment with a real PostgreSQL database, run the
migrations so the schema is created:

```bash
# Option A: On Render — use the Shell tab in your service
alembic upgrade head

# Option B: Locally against the production DB
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres" alembic upgrade head
```

---

## Quick Verification

After setting all variables and redeploying, run:

```bash
curl https://your-render-service.onrender.com/api/health
```

Expected response:
```json
{"status": "healthy", "service": "anuvaad-api", ...}
```

If you see `"status": "healthy"`, the backend is fully operational.

---

## Summary of Variables to Set

Copy this checklist into your Render Dashboard:

```
✅ REQUIRED FOR JWT (fixes "JWT secret not configured"):
   SUPABASE_JWT_SECRET       = <from Supabase Dashboard → Settings → API → JWT Settings>

✅ REQUIRED FOR AI FEATURES:
   GROQ_API_KEY              = gsk_...
   DEEPSEEK_API_KEY          = sk-...

✅ REQUIRED FOR AUTH & DB:
   SUPABASE_URL              = https://xxx.supabase.co
   SUPABASE_ANON_KEY         = eyJ...
   SUPABASE_SERVICE_ROLE_KEY = eyJ...
   DATABASE_URL              = postgresql://postgres:PASS@db.xxx.supabase.co:5432/postgres
   DATABASE_POOL_URL         = postgresql://postgres.xxx:PASS@pooler.supabase.com:6543/postgres

✅ REQUIRED FOR SECURITY:
   TOKEN_ENCRYPTION_KEY      = <run: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">

✅ REQUIRED FOR CORS:
   FRONTEND_URL              = https://getanuvaad.vercel.app
   ENV                       = production

✅ REQUIRED FOR GITHUB FEATURES:
   GITHUB_CLIENT_ID          = Ov23...
   GITHUB_CLIENT_SECRET      = <from GitHub OAuth App settings>
```
