FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files using .dockerignore to exclude dev artifacts
COPY main.py .
COPY index.html .
COPY js/ ./js/
COPY styles.css .
COPY sw.js .
COPY manifest.json .
COPY icon-512.png .
COPY robots.txt .
COPY sitemap.xml .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Run with uvicorn (single worker — rate limiter and cache are in-memory)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
