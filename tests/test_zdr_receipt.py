"""
Unit tests for Cryptographic Zero Code Retention (ZDR) receipts and audit digests.
"""
import time
import pytest
from app.services.zdr_receipt import ZdrEngine


def test_zdr_receipt_generation_and_verification():
    engine = ZdrEngine(secret_key="test-secret-key-32-bytes-long!")
    code = "def add(a: int, b: int) -> int:\n    return a + b"
    user_id = "test_user_42"
    start_mono = time.perf_counter()

    receipt = engine.generate_receipt(
        source_code=code,
        user_id=user_id,
        start_time_mono=start_mono,
    )

    assert receipt.audit_digest is not None
    assert len(receipt.audit_digest) == 64  # SHA-256 hex string
    assert receipt.user_id == user_id
    assert receipt.zero_retention_guaranteed is True
    assert receipt.ephemeral_lifecycle_ms >= 0

    # Verify signature passes
    is_valid = engine.verify_receipt(
        audit_digest=receipt.audit_digest,
        source_code_hash=receipt.source_code_hash,
        user_id=receipt.user_id,
        timestamp=receipt.timestamp,
    )
    assert is_valid is True


def test_zdr_receipt_tamper_detection():
    engine = ZdrEngine(secret_key="test-secret-key-32-bytes-long!")
    code = "console.log('secure payload');"
    user_id = "usr_alpha"
    start_mono = time.perf_counter()

    receipt = engine.generate_receipt(
        source_code=code,
        user_id=user_id,
        start_time_mono=start_mono,
    )

    # Tamper with code hash
    tampered_hash = receipt.source_code_hash[:-4] + "ffff"
    assert engine.verify_receipt(
        audit_digest=receipt.audit_digest,
        source_code_hash=tampered_hash,
        user_id=receipt.user_id,
        timestamp=receipt.timestamp,
    ) is False

    # Tamper with user_id
    assert engine.verify_receipt(
        audit_digest=receipt.audit_digest,
        source_code_hash=receipt.source_code_hash,
        user_id="impostor_user",
        timestamp=receipt.timestamp,
    ) is False
