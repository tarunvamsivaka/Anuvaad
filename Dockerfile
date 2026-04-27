# ── Stage 1: Build Next.js frontend ──
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --production=false
COPY frontend/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 2: Production image ──
FROM python:3.11-slim
WORKDIR /app

# Install Node.js for Next.js server
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY main.py .

# Copy built frontend
COPY --from=frontend-builder /frontend/.next ./frontend/.next
COPY --from=frontend-builder /frontend/node_modules ./frontend/node_modules
COPY --from=frontend-builder /frontend/package.json ./frontend/package.json
COPY --from=frontend-builder /frontend/public ./frontend/public

# Copy legacy frontend (served by FastAPI for backward compatibility)
COPY index.html .
COPY js/ ./js/
COPY styles.css .
COPY sw.js .
COPY manifest.json .
COPY icon-512.png .
COPY robots.txt .
COPY sitemap.xml .
COPY privacy.html .
COPY terms.html .

# Expose ports: 8000 (API), 3000 (frontend)
EXPOSE 8000 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Start both services
CMD sh -c "cd /app/frontend && npm start & uvicorn main:app --host 0.0.0.0 --port 8000"
