#!/usr/bin/env bash
# =============================================================================
# scripts/gen-secrets.sh — Generate all auto-generatable production secrets
# =============================================================================
# Run this locally ONCE, then paste the output into your server's .env file.
# NEVER commit the generated values to source control.
#
# Usage:
#   bash scripts/gen-secrets.sh
#
# Output (copy each value into ~/anuvaad/.env on the production server):
#   TOKEN_ENCRYPTION_KEY=...
#   REDIS_PASSWORD=...
#   METRICS_PASSWORD=...
# =============================================================================
set -euo pipefail

echo ""
echo "=========================================="
echo " Anuvaad — Production Secret Generator"
echo "=========================================="
echo ""

# ── Check prerequisites ────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    echo "[ERROR] python3 is required. Install it first."
    exit 1
fi

python3 -c "from cryptography.fernet import Fernet" 2>/dev/null || {
    echo "[WARN] cryptography package not installed."
    echo "  Install with: pip install cryptography"
    echo "  Or run inside the Docker container:"
    echo "    docker run --rm python:3.11-slim python3 -c \\"
    echo "      \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
    echo ""
}

# ── Generate secrets ──────────────────────────────────────────────────────────
FERNET_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null \
    || echo "GENERATE_MANUALLY_SEE_INSTRUCTIONS_ABOVE")

# 40-char hex string — strong enough for Redis AUTH
REDIS_PASS=$(python3 -c "import secrets; print(secrets.token_hex(20))")

# 24-char random string for metrics basic auth
METRICS_PASS=$(python3 -c "import secrets, string; \
    alphabet = string.ascii_letters + string.digits + '!@#%^&*'; \
    print(''.join(secrets.choice(alphabet) for _ in range(24)))")

echo "Copy the following into your server's ~/anuvaad/.env file:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TOKEN_ENCRYPTION_KEY=${FERNET_KEY}"
echo "REDIS_PASSWORD=${REDIS_PASS}"
echo "METRICS_PASSWORD=${METRICS_PASS}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "[SECURITY] These secrets were generated in-memory and are NOT saved to disk."
echo "[SECURITY] Store them immediately in your secrets manager or server .env."
echo ""
echo "Tip: SSH into your server and run:"
echo "  nano ~/anuvaad/.env"
echo "Then paste the values above."
echo ""
