"""
app/core/token_encryption.py

Fernet symmetric encryption for GitHub OAuth tokens stored in the DB.
FIX-01 (P0-01): Tokens must never be stored in plaintext.

Generate the key once with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
Then set TOKEN_ENCRYPTION_KEY in your environment / secrets manager.
"""
from cryptography.fernet import Fernet

from app.core.config import TOKEN_ENCRYPTION_KEY


def _get_fernet() -> Fernet:
    """Return a Fernet instance backed by the configured key."""
    return Fernet(TOKEN_ENCRYPTION_KEY.encode())


def encrypt_token(plaintext: str) -> str:
    """Encrypt a plaintext GitHub OAuth token.

    Returns a URL-safe base64 string that starts with 'gAAAAA'.
    Safe to store directly in a TEXT column.
    """
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a previously encrypted GitHub OAuth token.

    Raises:
        cryptography.fernet.InvalidToken — if the ciphertext is tampered,
            expired (when TTL is set), or encrypted with a different key.
    """
    return _get_fernet().decrypt(ciphertext.encode()).decode()


def is_encrypted(value: str) -> bool:
    """Heuristic: Fernet tokens always start with 'gAAAAA'.

    Used in the one-time migration to skip already-encrypted values.
    """
    return value.startswith("gAAAAA")
