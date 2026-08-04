"""
Empirical Backend Router Schema & Error Handling Verification Harness
Executes complete empirical test suite across FastAPI app routers, schemas, error paths, and security middleware.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from app.core.auth import get_user_email, get_user_email_from_request
from main import app

auth_client = TestClient(app)


async def mock_get_user_email():
    return "testuser@example.com"


def run_empirical_verification():
    passed = 0
    failed = 0
    results = []

    def check(name, condition, detail=""):
        nonlocal passed, failed
        if condition:
            passed += 1
            results.append((True, name, detail))
            print(f"  [PASS] {name}")
        else:
            failed += 1
            results.append((False, name, detail))
            print(f"  [FAIL] {name} - {detail}")

    print("=== EMPIRICAL VERIFICATION OF BACKEND ROUTERS, SCHEMAS & ERROR HANDLING ===")

    # ---------------------------------------------------------
    # 1. Unauthenticated Endpoint Error Handling (401)
    # ---------------------------------------------------------
    print("\n--- 1. Unauthenticated Endpoint Error Handling (401) ---")
    app.dependency_overrides.clear()
    unauth_client = TestClient(app)

    protected_endpoints = [
        ("GET", "/api/history"),
        ("GET", "/api/v1/history"),
        ("GET", "/api/workspaces"),
        ("POST", "/api/workspaces"),
        ("GET", "/api/api-keys"),
        ("POST", "/api/api-keys"),
        ("GET", "/api/subscription-status"),
        ("GET", "/api/check-credits"),
        ("GET", "/api/usage"),
    ]

    for method, ep in protected_endpoints:
        if method == "GET":
            r = unauth_client.get(ep)
        elif method == "POST":
            r = unauth_client.post(ep, json={})
        check(f"{method} {ep} without Auth header returns 401", r.status_code == 401, f"Status: {r.status_code}")

    # ---------------------------------------------------------
    # 2. Schema Validation Testing (422) with Authenticated Session
    # ---------------------------------------------------------
    print("\n--- 2. Router Schema Validation (422 Unprocessable Entity) ---")
    app.dependency_overrides[get_user_email] = mock_get_user_email
    app.dependency_overrides[get_user_email_from_request] = mock_get_user_email

    # 2.1 CodePayload (/api/code-to-english & /api/v1/code-to-english)
    res = auth_client.post("/api/code-to-english", json={})
    check("CodePayload missing required raw_code/language returns 422", res.status_code == 422)

    res = auth_client.post("/api/code-to-english", json={"raw_code": "   ", "language": "python"})
    check("CodePayload whitespace-only raw_code returns 422", res.status_code == 422)

    res = auth_client.post("/api/code-to-english", json={"raw_code": "x" * 50001, "language": "python"})
    check("CodePayload raw_code length > 50000 returns 422", res.status_code == 422)

    res = auth_client.post("/api/code-to-english", json={"raw_code": "print('hello')", "language": "a" * 31})
    check("CodePayload language length > 30 returns 422", res.status_code == 422)

    # 2.2 GeneratePayload (/api/generate-from-english)
    res = auth_client.post("/api/generate-from-english", json={})
    check("GeneratePayload missing prompt/language returns 422", res.status_code == 422)

    res = auth_client.post("/api/generate-from-english", json={"prompt": "  \n\t ", "language": "python"})
    check("GeneratePayload whitespace-only prompt returns 422", res.status_code == 422)

    res = auth_client.post("/api/generate-from-english", json={"prompt": "x" * 5001, "language": "python"})
    check("GeneratePayload prompt length > 5000 returns 422", res.status_code == 422)

    # 2.3 CodeToCodePayload (/api/code-to-code)
    res = auth_client.post("/api/code-to-code", json={})
    check("CodeToCodePayload missing required fields returns 422", res.status_code == 422)

    res = auth_client.post(
        "/api/code-to-code", json={"raw_code": "   ", "source_language": "py", "target_language": "js"}
    )
    check("CodeToCodePayload whitespace-only raw_code returns 422", res.status_code == 422)

    # 2.4 VerifyPaymentPayload (/api/verify-payment)
    res = auth_client.post(
        "/api/verify-payment",
        json={"razorpay_payment_id": "pay_12345", "razorpay_signature": "sig_12345", "payment_type": "invalid"},
    )
    check("VerifyPaymentPayload invalid payment_type regex returns 422", res.status_code == 422)

    res = auth_client.post(
        "/api/verify-payment",
        json={"razorpay_payment_id": "p", "razorpay_signature": "sig_12345", "payment_type": "subscription"},
    )
    check("VerifyPaymentPayload payment_id < 5 chars returns 422", res.status_code == 422)

    # 2.5 Workspace & API Key Schemas
    res = auth_client.post("/api/workspaces", json={"name": "   "})
    check("WorkspaceCreate whitespace-only name returns 422", res.status_code == 422)

    res = auth_client.post("/api/workspaces", json={"name": "x" * 101})
    check("WorkspaceCreate name length > 100 returns 422", res.status_code == 422)

    res = auth_client.post(
        "/api/workspaces/ws-123456789012345678901234567890123456/invite", json={"email": "invalid-email"}
    )
    check("WorkspaceInvite invalid email format returns 422", res.status_code == 422)

    res = auth_client.post("/api/api-keys", json={"name": ""})
    check("ApiKeyCreate empty name returns 422", res.status_code == 422)

    # ---------------------------------------------------------
    # 3. Resource Isolation & Error Handling (403 / 404 / 401)
    # ---------------------------------------------------------
    print("\n--- 3. Resource Isolation & Endpoint Error Handling ---")

    res = auth_client.get("/api/history/00000000-0000-0000-0000-000000000000")
    check("GET /api/history/{non_existent} returns 404 Not Found", res.status_code == 404, f"Status: {res.status_code}")

    res = auth_client.get("/api/shared/00000000-0000-0000-0000-000000000000")
    check("GET /api/shared/{non_existent} returns 404 Not Found", res.status_code == 404, f"Status: {res.status_code}")

    res = auth_client.delete("/api/workspaces/00000000-0000-0000-0000-000000000000")
    check(
        "DELETE /api/workspaces/{non_existent} for non-member returns 403 Forbidden",
        res.status_code == 403,
        f"Status: {res.status_code}",
    )

    res = auth_client.delete("/api/api-keys/00000000-0000-0000-0000-000000000000")
    check(
        "DELETE /api/api-keys/{non_existent} returns 404 Not Found",
        res.status_code == 404,
        f"Status: {res.status_code}",
    )

    # ---------------------------------------------------------
    # 4. Webhook Endpoint Handling
    # ---------------------------------------------------------
    print("\n--- 4. Webhook Handling ---")
    res = auth_client.post("/api/webhook/razorpay", content=b'{"event":"test"}')
    check(
        "Webhook unconfigured/missing signature returns expected status code (503/400)", res.status_code in (400, 503)
    )

    # ---------------------------------------------------------
    # 5. Security Headers & Admin Basic Auth
    # ---------------------------------------------------------
    print("\n--- 5. Security Headers & Admin Auth Verification ---")

    res = auth_client.get("/api/health")
    check("GET /api/health returns 200 OK", res.status_code == 200)
    check(
        "Security Header X-Content-Type-Options: nosniff present",
        res.headers.get("x-content-type-options") == "nosniff",
    )
    check("Security Header X-Frame-Options: DENY present", res.headers.get("x-frame-options") == "DENY")
    check("Security Header X-XSS-Protection present", "x-xss-protection" in res.headers)

    res = auth_client.get("/api/metrics")
    check("GET /api/metrics without Basic Auth returns 401 Unauthorized", res.status_code == 401)

    app.dependency_overrides.clear()

    print("\n==========================================")
    print(f"EMPIRICAL VERIFICATION SUMMARY: {passed} PASSED, {failed} FAILED")
    print("==========================================")

    return failed == 0


if __name__ == "__main__":
    success = run_empirical_verification()
    sys.exit(0 if success else 1)
