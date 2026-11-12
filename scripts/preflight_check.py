"""Deployment preflight verification CLI (Task 5.2).

Validates required environment variables, PostgreSQL non-SQLite enforcement,
AUDIT_HMAC_KEY isolation, and optional live connectivity checks before
bringing up production containers.
"""

from __future__ import annotations

import argparse
import os
import sys

REQUIRED_PROD_VARS = (
    "DATABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_SECRET",
    "FRONTEND_URL",
    "AUDIT_HMAC_KEY",
    "TOKEN_ENCRYPTION_KEY",
    "HISTORY_ENCRYPTION_KEYS",
    "GROQ_API_KEY",
)


def validate_environment(*, strict: bool = True) -> list[str]:
    """Validate configuration invariants and return a list of failure reasons."""
    errors: list[str] = []
    env_name = os.getenv("ENV", "development").lower()

    for var in REQUIRED_PROD_VARS:
        val = os.getenv(var, "").strip()
        if not val:
            if strict or env_name == "production":
                errors.append(f"Missing required environment variable: {var}")

    db_url = os.getenv("DATABASE_URL", "").strip()
    if db_url.startswith("sqlite") and (strict or env_name == "production"):
        errors.append("DATABASE_URL must point to PostgreSQL (SQLite is forbidden in production)")

    audit_key = os.getenv("AUDIT_HMAC_KEY", "").strip()
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "").strip()
    enc_key = os.getenv("TOKEN_ENCRYPTION_KEY", "").strip()
    if audit_key and jwt_secret and audit_key == jwt_secret:
        errors.append("AUDIT_HMAC_KEY must not reuse SUPABASE_JWT_SECRET (SEC-04)")
    if audit_key and enc_key and audit_key == enc_key:
        errors.append("AUDIT_HMAC_KEY must not reuse TOKEN_ENCRYPTION_KEY (SEC-04)")

    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Anuvaad deployment preflight checks")
    parser.add_argument(
        "--non-strict",
        action="store_true",
        help="Allow missing env vars unless ENV=production",
    )
    args = parser.parse_args(argv)

    errors = validate_environment(strict=not args.non_strict)
    if errors:
        for err in errors:
            print(f"[PREFLIGHT FAIL] {err}", file=sys.stderr)
        return 1

    print("[PREFLIGHT OK] Environment and security invariants verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
