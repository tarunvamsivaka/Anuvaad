#!/usr/bin/env python3
"""scripts/gen_secrets.py — Cross-platform production secret generator.

Generates auto-generatable production secrets for Render, Vercel, Supabase, and Upstash.
Never commit the generated values to source control.
"""

import secrets
import string

print("\n==========================================")
print(" Anuvaad — Production Secret Generator")
print("==========================================\n")

try:
    from cryptography.fernet import Fernet

    fernet_key = Fernet.generate_key().decode()
except ImportError:
    fernet_key = "[Install cryptography: pip install cryptography]"

redis_pass = secrets.token_hex(20)
cron_secret = secrets.token_urlsafe(32)
alphabet = string.ascii_letters + string.digits + "!@#%^&*"
metrics_pass = "".join(secrets.choice(alphabet) for _ in range(24))

print("Copy these generated values into your Render / Vercel Environment Dashboards:")
print("-------------------------------------------------------------------------")
print(f"TOKEN_ENCRYPTION_KEY={fernet_key}")
print(f"REDIS_PASSWORD={redis_pass}")
print(f"CRON_SECRET={cron_secret}")
print(f"METRICS_PASSWORD={metrics_pass}")
print("-------------------------------------------------------------------------")
print("WARNING: NEVER COMMIT THESE GENERATED VALUES TO GIT.\n")
