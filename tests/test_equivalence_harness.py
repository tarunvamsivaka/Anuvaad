"""Tests for EquivalenceHarness, characterization test generation, and audit verification endpoints."""

from fastapi.testclient import TestClient

from app.core.audit import generate_audit_receipt, verify_audit_receipt
from app.services.verification.equivalence_harness import EquivalenceHarness
from main import app

client = TestClient(app)


def test_equivalence_input_vectors():
    params = ["arg1", "arg2"]
    vectors = EquivalenceHarness.generate_input_vectors(params)
    assert len(vectors) >= 3
    for vec in vectors:
        assert len(vec) == 2


def test_test_suite_synthesis():
    from app.services.ast_parser import FunctionSymbol

    functions = [
        FunctionSymbol(name="process_payment", start_line=1, end_line=10, parameters=["amount", "currency"]),
    ]

    py_suite = EquivalenceHarness.synthesize_test_suite("python", functions)
    assert "def test_process_payment_characterization():" in py_suite

    go_suite = EquivalenceHarness.synthesize_test_suite("go", functions)
    assert "func TestProcess_paymentCharacterization(t *testing.T)" in go_suite

    ts_suite = EquivalenceHarness.synthesize_test_suite("typescript", functions)
    assert 'describe("process_payment"' in ts_suite


def test_equivalence_evaluation_report():
    src_py = "def multiply(a: int, b: int) -> int:\n    return a * b\n"
    tgt_go = "package main\n\nfunc multiply(a int, b int) int {\n    return a * b\n}\n"

    report = EquivalenceHarness.evaluate(
        source_language="python",
        target_language="go",
        source_code=src_py,
        target_code=tgt_go,
        user_id="dev@anuvaad.ai",
    )

    assert report.total_tests > 0
    assert report.passed_tests > 0
    assert report.confidence_score >= 0.8
    assert "audit_digest" in report.cryptographic_receipt


def test_cryptographic_audit_receipt_verification():
    receipt = generate_audit_receipt(
        user_id="auditor@enterprise.com",
        code="int x = 42;",
    )
    is_valid = verify_audit_receipt(
        user_id=receipt["user_id"],
        timestamp_utc=receipt["timestamp_utc"],
        code_hash=receipt["sha256_input_hash"],
        audit_digest=receipt["audit_digest"],
    )
    assert is_valid is True

    # Tampered code_hash must fail
    tampered = verify_audit_receipt(
        user_id=receipt["user_id"],
        timestamp_utc=receipt["timestamp_utc"],
        code_hash="tampered_hash_123",
        audit_digest=receipt["audit_digest"],
    )
    assert tampered is False


def test_api_audit_verify_endpoint():
    receipt = generate_audit_receipt(
        user_id="client@bank.org",
        code="IDENTIFICATION DIVISION. PROGRAM-ID. HELLO.",
    )
    resp = client.post(
        "/api/v1/audit/verify",
        json={
            "user_id": receipt["user_id"],
            "timestamp_utc": receipt["timestamp_utc"],
            "code_hash": receipt["sha256_input_hash"],
            "audit_digest": receipt["audit_digest"],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["retention_policy"] == "RAM_ONLY_EPHEMERAL"


def test_api_equivalence_evaluate_endpoint():
    src = "def square(n: int) -> int:\n    return n * n\n"
    tgt = "package main\n\nfunc square(n int) int {\n    return n * n\n}\n"

    resp = client.post(
        "/api/v1/equivalence/evaluate",
        json={
            "source_code": src,
            "target_code": tgt,
            "source_language": "python",
            "target_language": "go",
            "user_id": "test_user",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["confidence_score"] > 0
    assert "generated_test_code" in data
    assert "cryptographic_receipt" in data
