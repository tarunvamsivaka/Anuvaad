"""
app/core/token_encryption.py

Fernet symmetric encryption for GitHub OAuth tokens stored in the DB.
FIX-01 (P0-01): Tokens must never be stored in plaintext.

KEY ROTATION SUPPORT
====================
Set TOKEN_ENCRYPTION_KEYS (comma-separated, newest first) to enable
zero-downtime key rotation:

    TOKEN_ENCRYPTION_KEYS="new_fernet_key_b64,old_fernet_key_b64"

When TOKEN_ENCRYPTION_KEYS is set it takes precedence over TOKEN_ENCRYPTION_KEY.

Rotation protocol:
  1. Generate a new key:
       python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  2. Prepend it to TOKEN_ENCRYPTION_KEYS on Render → Environment and deploy.
     New tokens are encrypted with the first (primary) key.
     Old tokens encrypted with previous keys are still decryptable during the
     transition window.
  3. After all tokens have been re-encrypted (or a suitable grace period),
     remove the old key from TOKEN_ENCRYPTION_KEYS.

If only TOKEN_ENCRYPTION_KEY (singular) is set, behaviour is identical to
the previous single-key implementation — no migration required.
"""
import os

from cryptography.fernet import Fernet, MultiFernet

__all__ = ["encrypt_token", "decrypt_token", "is_encrypted"]

# ── Key loading ──────────────────────────────────────────────────────────────

def _load_fernet() -> MultiFernet:
    """
    Load one or more Fernet instances from environment variables.

    Priority:
      1. TOKEN_ENCRYPTION_KEYS — comma-separated list of base64 Fernet keys,
         newest (primary) key first.  All keys are used for decryption; only
         the first key is used for encryption.
      2. TOKEN_ENCRYPTION_KEY  — legacy single-key variable (backwards-compat).

    Returns a MultiFernet that encrypts with the primary key and decrypts
    with any key in the list, enabling safe key rotation without downtime.
    """
    multi_env = os.getenv("TOKEN_ENCRYPTION_KEYS", "")
    if multi_env:
        keys = [k.strip() for k in multi_env.split(",") if k.strip()]
        if not keys:
            raise RuntimeError(
                "TOKEN_ENCRYPTION_KEYS is set but contains no valid keys."
            )
        return MultiFernet([Fernet(k.encode()) for k in keys])

    single_env = os.getenv("TOKEN_ENCRYPTION_KEY", "")
    if single_env:
        return MultiFernet([Fernet(single_env.encode())])

    # No key configured — allow startup but raise on first use so local dev
    # works without encryption for non-GitHub features.
    return None  # type: ignore[return-value]


_fernet: MultiFernet | None = _load_fernet()


def _get_fernet() -> MultiFernet:
    """Return the configured MultiFernet instance, raising clearly if missing."""
    if _fernet is None:
        raise RuntimeError(
            "GitHub token encryption is not configured. "
            "Set TOKEN_ENCRYPTION_KEYS (recommended) or TOKEN_ENCRYPTION_KEY "
            "in your environment variables before using GitHub OAuth features."
        )
    return _fernet


# ── Public API ───────────────────────────────────────────────────────────────

def encrypt_token(plaintext: str) -> str:
    """Encrypt a plaintext GitHub OAuth token using the primary (first) key.

    Returns a URL-safe base64 string that starts with 'gAAAAA'.
    Safe to store directly in a TEXT column.
    """
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a previously encrypted GitHub OAuth token.

    Tries all configured keys (primary and rotation keys) in order.

    Raises:
        cryptography.fernet.InvalidToken — if the ciphertext is tampered,
            expired (when TTL is set), or encrypted with an unrecognised key.
        RuntimeError — if no encryption key is configured.
    """
    return _get_fernet().decrypt(ciphertext.encode()).decode()


def is_encrypted(value: str) -> bool:
    """Heuristic: Fernet tokens always start with 'gAAAAA'.

    Used in the one-time migration to skip already-encrypted values.
    """
    return value.startswith("gAAAAA")
