# Anuvaad — Deployment Runbook

Complete step-by-step guide for deploying Anuvaad to production safely.

---

## Prerequisites

- A Linux VPS (Ubuntu 22.04 or 24.04 LTS recommended)
- A domain pointed at the server's IP (`A` record)
- A GitHub account with access to this repository

---

## Step 1 — Bootstrap the Server (One-Time)

SSH into the server as root and run the setup script:

```bash
# Clone the repo to get the script
git clone https://github.com/tarunvamsivaka/Anuvaad.git /tmp/anuvaad-setup
bash /tmp/anuvaad-setup/scripts/server-setup.sh \
  --domain getanuvaad.com \
  --email admin@getanuvaad.com
```

This automatically:
- Installs Docker Engine + Compose plugin
- Creates the `deploy` user + Docker permissions
- Configures UFW (ports 22/80/443 only)
- Issues a Let's Encrypt TLS certificate
- Creates `~/anuvaad/.env` template
- Sets up auto-renewal cron for TLS

---

## Step 2 — Generate Secrets

Run on your local machine (requires `cryptography` Python package):

```bash
bash scripts/gen-secrets.sh
```

Copy the output values — you'll need them in Steps 3 and 4.

---

## Step 3 — Configure GitHub Secrets & Variables

Go to: **Repository → Settings → Secrets and variables → Actions**

### 3a. Secrets (Environment: `production`)

> [!CAUTION]
> These are sensitive — never paste into logs or share publicly.

| Name | How to get |
|---|---|
| `PROD_HOST` | Your VPS IP address |
| `PROD_SSH_KEY` | Generate: `ssh-keygen -t ed25519 -C "deploy@anuvaad" -f ~/.ssh/anuvaad_deploy` then paste `~/.ssh/anuvaad_deploy` (private key) |
| `DOCKER_PASSWORD` | GitHub → Settings → Developer → Personal access tokens → Fine-grained → `read/write:packages` |

> After generating the SSH key, add the **public** key to the server:
> ```bash
> ssh-copy-id -i ~/.ssh/anuvaad_deploy.pub deploy@YOUR_SERVER_IP
> ```

### 3b. Variables (non-secret)

Go to: **Repository → Settings → Variables → Actions**

| Name | Value |
|---|---|
| `DOCKER_REGISTRY` | `ghcr.io` |
| `PROD_USER` | `deploy` |
| `NEXT_PUBLIC_API_URL` | `https://api.getanuvaad.com` (or your domain) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

---

## Step 4 — Fill in Server `.env`

SSH into the server and edit the env file:

```bash
ssh deploy@YOUR_SERVER_IP
nano ~/anuvaad/.env
```

Fill in **all** required values. Minimum viable production set:

```env
# AI
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret-from-dashboard

# Database
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres
DATABASE_POOL_URL=postgresql://postgres.xxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# Security (from gen-secrets.sh output)
TOKEN_ENCRYPTION_KEY=gAAAAA...
REDIS_PASSWORD=abc123...

# Networking
FRONTEND_URL=https://getanuvaad.com
DOMAIN=getanuvaad.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=https://api.getanuvaad.com

# GitHub OAuth
GITHUB_CLIENT_ID=Ov23...
GITHUB_CLIENT_SECRET=abc...

# Billing (disabled)
ENABLE_BILLING=false

# Runtime
ENV=production
WEB_CONCURRENCY=4
```

> [!WARNING]
> The app will **refuse to start** if any of these are missing in production:
> `GROQ_API_KEY`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `FRONTEND_URL`

---

## Step 5 — Run Database Migrations

Before the first deploy, run Alembic migrations manually:

```bash
# On the server, from ~/anuvaad
docker run --rm \
  --env-file .env \
  ghcr.io/tarunvamsivaka/anuvaad-api:latest \
  alembic upgrade head
```

Or if running locally against the production DB:

```bash
DATABASE_URL=postgresql://... alembic upgrade head
```

---

## Step 6 — Trigger Deploy

Push to `master` or manually dispatch from GitHub Actions:

```
Repository → Actions → Deploy to Production → Run workflow
```

The pipeline will:
1. Build and push Docker images to GHCR
2. SSH into the production server
3. Pull the new images
4. Rolling restart (zero-downtime)
5. Health check — auto-rollback on failure

---

## Step 7 — Post-Deploy Verification

```bash
# Health check
curl -sf https://getanuvaad.com/api/health | python3 -m json.tool

# All containers healthy?
ssh deploy@YOUR_SERVER_IP "docker compose -f ~/anuvaad/docker-compose.prod.yml ps"

# Check logs
ssh deploy@YOUR_SERVER_IP "docker compose -f ~/anuvaad/docker-compose.prod.yml logs --tail=50 api"
```

Expected health response:
```json
{"status": "ok", "env": "production"}
```

---

## Rollback

If a deploy breaks production, rollback to the previous image:

```bash
ssh deploy@YOUR_SERVER_IP
cd ~/anuvaad

# List available image tags
docker images ghcr.io/tarunvamsivaka/anuvaad-api

# Rollback to a specific SHA
IMAGE_TAG=<previous-sha>
cat > docker-compose.override.yml <<EOF
services:
  backend:
    image: ghcr.io/tarunvamsivaka/anuvaad-api:${IMAGE_TAG}
  worker:
    image: ghcr.io/tarunvamsivaka/anuvaad-api:${IMAGE_TAG}
  beat:
    image: ghcr.io/tarunvamsivaka/anuvaad-api:${IMAGE_TAG}
  frontend:
    image: ghcr.io/tarunvamsivaka/anuvaad-frontend:${IMAGE_TAG}
EOF

docker compose -f docker-compose.prod.yml -f docker-compose.override.yml \
  up -d --no-deps --wait backend worker beat frontend
```

---

## Useful Commands

```bash
# View all service logs
docker compose -f docker-compose.prod.yml logs -f

# Restart a single service without downtime
docker compose -f docker-compose.prod.yml restart api

# View resource usage
docker stats

# Renew TLS certificate manually
certbot renew --dry-run
```
