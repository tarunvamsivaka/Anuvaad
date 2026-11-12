#!/usr/bin/env python3
"""scripts/gen_secrets.py — Cross-platform production secret generator.

Generates auto-generatable production secrets for Render, Vercel, Supabase, and Upstash.
Never commit the generated values to source control.
"""

import argparse
import os
import secrets
import string
from pathlib import Path

parser = argparse.ArgumentParser(description="Generate production secrets into a private local file.")
parser.add_argument(
    "--output", default="Anuvaad.secrets.env", help="Output path (created exclusively, never overwritten)"
)
args = parser.parse_args()

try:
    from cryptography.fernet import Fernet

    fernet_key = Fernet.generate_key().decode()
except ImportError:
    fernet_key = "[Install cryptography: pip install cryptography]"

redis_pass = secrets.token_hex(20)
cron_secret = secrets.token_urlsafe(32)
alphabet = string.ascii_letters + string.digits + "!@#%^&*"
metrics_pass = "".join(secrets.choice(alphabet) for _ in range(24))

output_path = Path(args.output).expanduser()
flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
file_descriptor = os.open(output_path, flags, 0o600)
with os.fdopen(file_descriptor, "w", encoding="utf-8") as output_file:
    output_file.write(f"TOKEN_ENCRYPTION_KEY={fernet_key}\n")
    output_file.write(f"REDIS_PASSWORD={redis_pass}\n")
    output_file.write(f"CRON_SECRET={cron_secret}\n")
    output_file.write(f"METRICS_PASSWORD={metrics_pass}\n")

print(
    f"Generated secrets were saved to {output_path}. Move them to your service settings securely, then delete this file."
)
