#!/usr/bin/env sh
# scripts/docker-entrypoint-nginx.sh
#
# SEC-06 (DEP-02): Nginx container startup preflight gate.
#
# Verifies that required environment variables are set and that the
# nginx configuration is syntactically valid BEFORE starting nginx.
# Exits with code 1 on any failure — prevents a silently broken proxy
# from starting and serving malformed config (e.g. ${DOMAIN} unexpanded).
#
# Usage: Set as the Docker ENTRYPOINT in Dockerfile.nginx:
#   ENTRYPOINT ["/scripts/docker-entrypoint-nginx.sh"]
#   CMD ["nginx", "-g", "daemon off;"]

set -eu

# ── 1. Validate required environment variables ──────────────────────────────
: "${DOMAIN:?[nginx-entrypoint] DOMAIN env var is required but not set. Aborting.}"

if [ -z "$DOMAIN" ]; then
  echo "[nginx-entrypoint] ERROR: DOMAIN is set but empty. Aborting." >&2
  exit 1
fi

echo "[nginx-entrypoint] DOMAIN=${DOMAIN}"

# ── 2. Substitute environment variables in nginx config template ─────────────
# If a template file exists at /etc/nginx/nginx.conf.template, perform envsubst
# to produce the final /etc/nginx/nginx.conf before validation.
if [ -f "/etc/nginx/nginx.conf.template" ]; then
  echo "[nginx-entrypoint] Substituting env vars in nginx.conf.template..."
  envsubst '${DOMAIN}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
  echo "[nginx-entrypoint] nginx.conf generated successfully."
elif [ -f "/etc/nginx/nginx.conf" ]; then
  # Perform in-place substitution if template is embedded in the conf directly
  echo "[nginx-entrypoint] Running envsubst on existing nginx.conf..."
  envsubst '${DOMAIN}' < /etc/nginx/nginx.conf > /tmp/nginx.conf.rendered
  cp /tmp/nginx.conf.rendered /etc/nginx/nginx.conf
  rm -f /tmp/nginx.conf.rendered
fi

# ── 3. Validate nginx configuration syntax ───────────────────────────────────
echo "[nginx-entrypoint] Testing nginx configuration..."
if ! nginx -t 2>&1; then
  echo "[nginx-entrypoint] ERROR: nginx -t failed. Aborting startup." >&2
  exit 1
fi

echo "[nginx-entrypoint] nginx configuration is valid. Starting nginx..."

# ── 4. Hand off to CMD (nginx -g 'daemon off;') ───────────────────────────────
exec "$@"
