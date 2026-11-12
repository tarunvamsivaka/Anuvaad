"""Encryption for explicitly opted-in, code-bearing translation history."""

from __future__ import annotations

import json
import os

from cryptography.fernet import Fernet, MultiFernet


def _fernet() -> MultiFernet:
    keys = [key.strip() for key in os.getenv("HISTORY_ENCRYPTION_KEYS", "").split(",") if key.strip()]
    if not keys:
        raise RuntimeError("HISTORY_ENCRYPTION_KEYS must be configured before saving code history.")
    return MultiFernet([Fernet(key.encode()) for key in keys])


def encrypt_blocks(blocks: list) -> str:
    return _fernet().encrypt(json.dumps(blocks, separators=(",", ":")).encode()).decode()


def decrypt_blocks(ciphertext: str) -> list:
    decoded = _fernet().decrypt(ciphertext.encode()).decode()
    value = json.loads(decoded)
    if not isinstance(value, list):
        raise ValueError("Encrypted history payload is not a block list.")
    return value
