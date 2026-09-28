"""
app/core/audit.py — Zero Code Retention (ZDR) & Cryptographic Receipts.

Invariants (AGENTS.md):
1. Zero Code Retention: Source code inputs must stream through volatile RAM
   buffers only and must NEVER be logged to disks, telemetry pipelines, or
   external training pools.
2. Audit Verification: Every translation must compute a deterministic
   HMAC-SHA256 audit digest (`sha256(secret, user_id + timestamp + code_hash)`)
   proving the zero-retention guarantee.
"""

from __future__ import annotations

import hashlib
import hmac
from datetime import UTC, datetime

from app.core.config import SUPABASE_JWT_SECRET, TOKEN_ENCRYPTION_KEY

AUDIT_DIGEST_HEADER = "X-Anuvaad-Audit-Digest"
PRIVACY_HEADER = "X-Anuvaad-Privacy"
PRIVACY_MODE_HEADER = "X-Anuvaad-Privacy-Mode"
EPHEMERAL_VALUE = "ephemeral; zero-retention"

_DEFAULT_SECRET = SUPABASE_JWT_SECRET or TOKEN_ENCRYPTION_KEY or "anuvaad-ephemeral-zdr-cryptographic-audit-key-v1"


def compute_code_hash(code: str) -> str:
    """Deterministic SHA-256 digest of source code input."""
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def compute_audit_digest(
    secret: str,
    user_id: str,
    timestamp_utc: str,
    code_hash: str,
) -> str:
    """Compute deterministic HMAC-SHA256 audit digest.

    HMAC key: secret
    Message: user_id:timestamp_utc:code_hash
    """
    key_bytes = secret.encode("utf-8")
    msg_bytes = f"{user_id}:{timestamp_utc}:{code_hash}".encode()
    return hmac.new(key_bytes, msg_bytes, hashlib.sha256).hexdigest()


def generate_audit_receipt(
    user_id: str,
    code: str,
    timestamp: datetime | None = None,
    secret: str | None = None,
) -> dict:
    """Generate a verifiable Zero Code Retention cryptographic receipt.

    Returns dictionary containing:
      - user_id: authenticated user email or 'anonymous'
      - timestamp_utc: ISO-8601 formatted UTC timestamp
      - sha256_input_hash: SHA-256 hash of input code
      - retention_policy: 'RAM_ONLY_EPHEMERAL'
      - audit_digest: HMAC-SHA256 signature
    """
    signing_secret = secret or _DEFAULT_SECRET
    ts = timestamp.astimezone(UTC).isoformat() if timestamp else datetime.now(UTC).isoformat()
    code_hash = compute_code_hash(code)
    digest = compute_audit_digest(signing_secret, user_id, ts, code_hash)

    return {
        "user_id": user_id,
        "timestamp_utc": ts,
        "sha256_input_hash": code_hash,
        "retention_policy": "RAM_ONLY_EPHEMERAL",
        "audit_digest": digest,
    }


def verify_audit_receipt(
    user_id: str,
    timestamp_utc: str,
    code_hash: str,
    audit_digest: str,
    secret: str | None = None,
) -> bool:
    """Verify that a given audit digest is cryptographically valid and matches the input."""
    signing_secret = secret or _DEFAULT_SECRET
    expected_digest = compute_audit_digest(signing_secret, user_id, timestamp_utc, code_hash)
    return hmac.compare_digest(expected_digest, audit_digest)
