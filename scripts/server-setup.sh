#!/usr/bin/env bash
# =============================================================================
# scripts/server-setup.sh — One-time production server bootstrap for Anuvaad
# =============================================================================
# Target OS: Ubuntu 22.04 LTS / 24.04 LTS (auto-detected)
# Run as root or with sudo once on a fresh VPS.
#
# Usage:
#   sudo bash scripts/server-setup.sh [--domain getanuvaad.com] [--email admin@getanuvaad.com]
#
# What this script does:
#   1. Updates the system
#   2. Installs Docker Engine + Compose plugin
#   3. Installs Certbot (if --domain supplied, issues TLS cert automatically)
#   4. Creates a non-root `deploy` user with Docker permissions
#   5. Configures UFW firewall (22/80/443 only)
#   6. Creates ~/anuvaad directory structure + .env template
#   7. Runs a pre-flight check
# =============================================================================
set -euo pipefail

# ── Argument parsing ──────────────────────────────────────────────────────────
DOMAIN=""
EMAIL=""
DEPLOY_USER="deploy"

while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)   DOMAIN="$2";  shift 2 ;;
        --email)    EMAIL="$2";   shift 2 ;;
        --user)     DEPLOY_USER="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [--domain DOMAIN] [--email EMAIL] [--user deploy]"
            exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }
step() { echo -e "\n${YELLOW}===>${NC} $1"; }

[[ $EUID -ne 0 ]] && fail "Please run as root: sudo bash $0"

# ── Detect OS ─────────────────────────────────────────────────────────────────
step "Detecting OS"
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS_ID="${ID:-unknown}"
    OS_VERSION="${VERSION_ID:-unknown}"
    ok "Detected: ${PRETTY_NAME:-$OS_ID $OS_VERSION}"
    [[ "$OS_ID" != "ubuntu" ]] && warn "This script is tested on Ubuntu. Proceed with caution on $OS_ID."
else
    fail "Cannot detect OS — /etc/os-release not found"
fi

# ── Step 1: System update ─────────────────────────────────────────────────────
step "Updating system packages"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl wget git gnupg2 ca-certificates lsb-release \
    ufw python3 python3-pip apt-transport-https software-properties-common
ok "System packages updated"

# ── Step 2: Docker Engine ─────────────────────────────────────────────────────
step "Installing Docker Engine"
if command -v docker &>/dev/null; then
    ok "Docker already installed: $(docker --version)"
else
    # Official Docker install script (verified checksum approach)
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    ok "Docker installed: $(docker --version)"
fi

# ── Step 3: Deploy user ───────────────────────────────────────────────────────
step "Creating deploy user: $DEPLOY_USER"
if id "$DEPLOY_USER" &>/dev/null; then
    ok "User $DEPLOY_USER already exists"
else
    useradd -m -s /bin/bash "$DEPLOY_USER"
    ok "Created user: $DEPLOY_USER"
fi

# Add to docker group so user can run docker without sudo
usermod -aG docker "$DEPLOY_USER"
ok "$DEPLOY_USER added to docker group"

# Create SSH directory for deploy key
DEPLOY_HOME="/home/$DEPLOY_USER"
SSH_DIR="$DEPLOY_HOME/.ssh"
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"
touch "$SSH_DIR/authorized_keys"
chmod 600 "$SSH_DIR/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$SSH_DIR"
ok "SSH directory created at $SSH_DIR"
warn "Add your deploy public key to: $SSH_DIR/authorized_keys"

# ── Step 4: UFW Firewall ──────────────────────────────────────────────────────
step "Configuring UFW firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment "SSH"
ufw allow 80/tcp   comment "HTTP (Let's Encrypt + redirect)"
ufw allow 443/tcp  comment "HTTPS"
ufw --force enable
ok "UFW active — only ports 22, 80, 443 open"
ufw status verbose

# ── Step 5: Certbot / TLS ─────────────────────────────────────────────────────
step "Setting up Certbot (Let's Encrypt)"
if command -v certbot &>/dev/null; then
    ok "Certbot already installed: $(certbot --version 2>&1)"
else
    apt-get install -y -qq certbot
    ok "Certbot installed"
fi

if [[ -n "$DOMAIN" && -n "$EMAIL" ]]; then
    step "Issuing TLS certificate for $DOMAIN"
    certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" || warn "Certbot failed — check DNS and try manually: certbot certonly --standalone -d $DOMAIN"
    
    # Auto-renewal cron
    if ! crontab -l 2>/dev/null | grep -q certbot; then
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'docker compose -f ~/anuvaad/docker-compose.prod.yml exec nginx nginx -s reload'") | crontab -
        ok "Certbot auto-renewal cron added (daily at 03:00)"
    fi
elif [[ -n "$DOMAIN" && -z "$EMAIL" ]]; then
    warn "Skipping cert issuance — provide --email to issue certificate"
    warn "Run manually: certbot certonly --standalone -d $DOMAIN --email your@email.com"
else
    warn "Skipping TLS setup — provide --domain and --email to issue Let's Encrypt certificate"
fi

# ── Step 6: Anuvaad directory ─────────────────────────────────────────────────
step "Creating Anuvaad app directory"
ANUVAAD_DIR="$DEPLOY_HOME/anuvaad"
mkdir -p "$ANUVAAD_DIR"
chown "$DEPLOY_USER:$DEPLOY_USER" "$ANUVAAD_DIR"
ok "App directory: $ANUVAAD_DIR"

# Create .env template if it doesn't exist
ENV_FILE="$ANUVAAD_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
    ok ".env already exists — skipping template (preserving existing secrets)"
else
    cat > "$ENV_FILE" <<'ENVTEMPLATE'
# =============================================================================
# Anuvaad Production Environment — Fill all [REQUIRED] values before deploy
# Generated by scripts/server-setup.sh
# =============================================================================

# ── AI Models [REQUIRED] ──
GROQ_API_KEY=
DEEPSEEK_API_KEY=

# ── Supabase [REQUIRED] ──
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# ── Frontend vars (also needed as Docker build-args) [REQUIRED] ──
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=https://api.getanuvaad.com

# ── Database [REQUIRED] ──
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
DATABASE_POOL_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# ── Security [REQUIRED] ──
# Generate with: bash scripts/gen-secrets.sh
TOKEN_ENCRYPTION_KEY=
REDIS_PASSWORD=

# ── Networking [REQUIRED] ──
FRONTEND_URL=https://getanuvaad.com
DOMAIN=getanuvaad.com

# ── GitHub OAuth [REQUIRED for GitHub integration] ──
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ── Billing [REQUIRED if ENABLE_BILLING=true] ──
ENABLE_BILLING=false
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_PRO_PLAN_ID=
RAZORPAY_WEBHOOK_SECRET=

# ── Email [OPTIONAL] ──
RESEND_API_KEY=

# ── Error Tracking [OPTIONAL] ──
SENTRY_DSN=

# ── LLM Fallback [OPTIONAL] ──
OPENROUTER_API_KEY=

# ── Metrics Auth [OPTIONAL] ──
METRICS_USERNAME=admin
METRICS_PASSWORD=

# ── Admin users (comma-separated) ──
ADMIN_USERS=
TRUSTED_USERS=

# ── Gunicorn workers (default: 4) ──
WEB_CONCURRENCY=4

# ── Protection mode ──
PLATFORM_DAILY_CAP_TRANSLATIONS=1000
ENV=production
ENVTEMPLATE
    chmod 600 "$ENV_FILE"
    chown "$DEPLOY_USER:$DEPLOY_USER" "$ENV_FILE"
    ok ".env template created at $ENV_FILE"
    warn "Fill in all [REQUIRED] values in $ENV_FILE before running deploy"
fi

# ── Step 7: Pre-flight check ──────────────────────────────────────────────────
step "Pre-flight check"
echo ""
docker --version        && ok "docker" || fail "docker not found"
docker compose version  && ok "docker compose" || fail "docker compose not found"
certbot --version 2>&1  && ok "certbot" || warn "certbot not found"
ufw status | grep -q "Status: active" && ok "ufw active" || warn "ufw not active"
[[ -f "$ENV_FILE" ]]    && ok ".env file exists" || warn ".env missing"

# Verify required env vars are non-empty
echo ""
step "Checking .env for required values"
REQUIRED_VARS=(GROQ_API_KEY SUPABASE_URL SUPABASE_JWT_SECRET TOKEN_ENCRYPTION_KEY DATABASE_URL FRONTEND_URL REDIS_PASSWORD DOMAIN)
ALL_OK=true
for VAR in "${REQUIRED_VARS[@]}"; do
    VAL=$(grep -E "^${VAR}=.+" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
    if [[ -n "$VAL" ]]; then
        ok "$VAR is set"
    else
        warn "$VAR is EMPTY — fill in $ENV_FILE"
        ALL_OK=false
    fi
done

echo ""
if $ALL_OK; then
    ok "All required vars are set. Server is ready to deploy."
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo "  1. Copy your public key to $SSH_DIR/authorized_keys"
    echo "  2. Add PROD_HOST, PROD_SSH_KEY to GitHub Secrets"
    echo "  3. Push to master to trigger the CD pipeline"
else
    warn "Fill in missing vars in $ENV_FILE, then re-run this script to verify."
fi

echo ""
ok "Server setup complete!"
