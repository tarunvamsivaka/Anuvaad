#!/bin/sh
# scripts/nginx-entrypoint.sh
# SEC-06: Validates required environment variables before generating the Nginx
# configuration and starting the server. Prevents silent misconfigured deployments.
#
# Usage: set as the container entrypoint in docker-compose.prod.yml nginx service.
set -eu

# ── 1. Require DOMAIN ───────────────────────────────────────────────────────
if [ -z "${DOMAIN:-}" ]; then
    echo "ERROR: DOMAIN environment variable is required. Aborting Nginx startup." >&2
    exit 1
fi

case "$DOMAIN" in
    *[!A-Za-z0-9.-]*|.*|*.|*..*)
        echo "ERROR: DOMAIN must contain only DNS letters, digits, dots, and hyphens." >&2
        exit 1
        ;;
esac

echo "[nginx-entrypoint] Generating Nginx configuration for domain: ${DOMAIN}"

# ── 2. Generate config from template ────────────────────────────────────────
envsubst '${DOMAIN}' < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/conf.d/default.conf

# ── 3. Validate the generated config before starting ────────────────────────
if ! nginx -t 2>&1; then
    echo "ERROR: Nginx configuration test failed. Check the template and environment variables." >&2
    exit 1
fi

echo "[nginx-entrypoint] Configuration valid. Starting Nginx."

# ── 4. Hand off to Nginx ────────────────────────────────────────────────────
exec nginx -g "daemon off;"
