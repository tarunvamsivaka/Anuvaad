"""Tests for code-to-code translation with semantic verification and equivalence report."""

import json


def test_code_to_code_with_verification(client):

    py_code = """def add(a: int, b: int) -> int:
    return a + b
"""

    resp = client.post(
        "/api/v1/code-to-code",
        json={
            "raw_code": py_code,
            "source_language": "python",
            "target_language": "go",
            "verify": True,
        },
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    assert "X-Anuvaad-Audit-Digest" in resp.headers

    # Parse SSE stream events
    lines = resp.text.split("\n\n")
    done_payload = None
    for line in lines:
        if line.startswith("data: "):
            payload = json.loads(line[6:])
            if payload.get("done") is True:
                done_payload = payload
                break

    assert done_payload is not None
    assert "blocks" in done_payload
    # Verification and equivalence must be included because verify=True
    assert "equivalence" in done_payload
    eq = done_payload["equivalence"]
    assert eq["source_language"] == "python"
    assert eq["target_language"] == "go"
    assert eq["confidence_score"] >= 0
    assert "generated_test_code" in eq
    assert "cryptographic_receipt" in eq
