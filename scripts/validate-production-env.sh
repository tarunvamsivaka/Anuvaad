#!/usr/bin/env bash
# scripts/validate-production-env.sh
# Validates all required production environment variables before deployment.
# Run as part of CI/CD deploy step or manually before docker-compose up.
#
# Usage:
#   bash scripts/validate-production-env.sh
#   Source .env first: set -a && source .env && set +a && bash scripts/validate-production-env.sh
set -euo pipefail

REQUIRED_VARS=(
    # Database
    "DATABASE_URL"
    # Redis
    "REDIS_URL"
    # Supabase / Auth
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_JWT_SECRET"
    "SUPABASE_SERVICE_ROLE_KEY"
    # Cryptographic secrets
    "TOKEN_ENCRYPTION_KEY"
    "HISTORY_ENCRYPTION_KEYS"
    "AUDIT_HMAC_KEY"
    "GROQ_API_KEY"
    "FRONTEND_URL"
    # Nginx / TLS
    "DOMAIN"
    # Frontend build-time credentials
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)

FAILED=0
for var in "${REQUIRED_VARS[@]}"; do
    value="${!var:-}"
    if [ -z "$value" ]; then
        echo "ERROR: Required production variable '$var' is not set." >&2
        FAILED=1
    fi
done

if [ "$FAILED" -eq 1 ]; then
    echo ""
    echo "Production environment validation FAILED." >&2
    echo "Fix all missing variables and re-run this script before deploying." >&2
    exit 1
fi

echo "All required production environment variables are set. Deployment may proceed."
