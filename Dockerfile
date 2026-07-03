# ── Stage 1: Build Next.js frontend ──
# FIX-34 (P3-07): Uses official node:20-alpine base image instead of curl | bash NodeSource installer.
# The piped curl approach is a supply chain attack vector; official base images are signed + verifiable.
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --production=false --legacy-peer-deps
COPY frontend/ .
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time placeholders — real values are injected at runtime via env vars.
# These allow `npm run build` to succeed in CI/Docker without live Supabase credentials.
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key_for_build
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ── Stage 2: Extract Node.js runtime from official image ──
# Copies only the Node binary and its supporting libraries — no npm, no shell.
FROM node:20-alpine AS node-runtime

# ── Stage 3: Production image ──
FROM python:3.11-slim
WORKDIR /app

# FIX-34: Copy Node.js from official pinned image (no curl | bash, no NodeSource)
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib /usr/local/lib

# Install system dependencies (curl for health check, libpq for psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (including gunicorn for multi-worker production)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy backend
COPY main.py .
COPY app/ ./app

# Copy built frontend
COPY --from=frontend-builder /frontend/public ./frontend/public
COPY --from=frontend-builder /frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /frontend/.next/static ./frontend/.next/static

# Copy static files (served by Nginx or FastAPI)
COPY robots.txt .
COPY privacy.html .
COPY terms.html .

# Expose ports: 8000 (API), 3000 (frontend)
EXPOSE 8000 3000

# Add non-root user
RUN useradd -m -u 1001 appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD curl -f http://localhost:8000/api/health || exit 1

# INFRA-04: Gunicorn multi-worker production server
# WEB_CONCURRENCY controls worker count (default: 4 workers)
RUN chown -R appuser:appuser /app
USER appuser
CMD sh -c "cd /app/frontend && node server.js & \
  gunicorn main:app \
    --workers ${WEB_CONCURRENCY:-4} \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile -"
