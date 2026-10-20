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
        ("GET", "/api/usage"),
    ]

    for method, ep in protected_endpoints:
        if method == "GET":
            r = unauth_client.get(ep)
        elif method == "POST":
            r = unauth_client.post(ep, json={})
        check(f"{method} {ep} without Auth header returns 401", r.status_code == 401, f"Status: {r.status_code}")

    # Check unauthenticated guest quota access on check-credits
    guest_r = unauth_client.get("/api/check-credits")
    check(
        "GET /api/check-credits without Auth header returns 200 (guest tier)",
        guest_r.status_code == 200 and guest_r.json().get("tier") == "guest",
        f"Status: {guest_r.status_code}",
    )

    # ---------------------------------------------------------
    # 2. Router Schema Validation (422 Unprocessable Entity)
    # ---------------------------------------------------------
    print("\n--- 2. Router Schema Validation (422 Unprocessable Entity) ---")
    app.dependency_overrides[get_user_email] = mock_get_user_email
    app.dependency_overrides[get_user_email_from_request] = mock_get_user_email
    os.environ["ENABLE_BILLING"] = "true"

    # CodePayload validations
    r = auth_client.post("/api/code-to-english", json={})
    check("CodePayload missing required raw_code/language returns 422", r.status_code == 422)

    r = auth_client.post("/api/code-to-english", json={"raw_code": "   ", "language": "python"})
    check("CodePayload whitespace-only raw_code returns 422", r.status_code == 422)

    r = auth_client.post("/api/code-to-english", json={"raw_code": "a" * 50001, "language": "python"})
    check("CodePayload raw_code length > 50000 returns 422", r.status_code == 422)

    r = auth_client.post("/api/code-to-english", json={"raw_code": "print(1)", "language": "a" * 31})
    check("CodePayload language length > 30 returns 422", r.status_code == 422)

    # GeneratePayload validations
    r = auth_client.post("/api/english-to-code", json={})
    check("GeneratePayload missing prompt/language returns 422", r.status_code == 422)

    r = auth_client.post("/api/english-to-code", json={"prompt": "   ", "language": "python"})
    check("GeneratePayload whitespace-only prompt returns 422", r.status_code == 422)

    r = auth_client.post("/api/english-to-code", json={"prompt": "a" * 5001, "language": "python"})
    check("GeneratePayload prompt length > 5000 returns 422", r.status_code == 422)

    # CodeToCodePayload validations
    r = auth_client.post("/api/code-to-code", json={"raw_code": "print(1)"})
    check("CodeToCodePayload missing required fields returns 422", r.status_code == 422)

    r = auth_client.post(
        "/api/code-to-code",
        json={"raw_code": "   ", "source_language": "python", "target_language": "javascript"},
    )
    check("CodeToCodePayload whitespace-only raw_code returns 422", r.status_code == 422)

    # VerifyPaymentPayload validations
    r = auth_client.post(
        "/api/verify-payment",
        json={
            "razorpay_payment_id": "pay_12345",
            "razorpay_signature": "sig_12345",
            "payment_type": "invalid_type",
        },
    )
    check("VerifyPaymentPayload invalid payment_type regex returns 422", r.status_code == 422)

    r = auth_client.post(
        "/api/verify-payment",
        json={
            "razorpay_payment_id": "123",
            "razorpay_signature": "sig_12345",
            "payment_type": "subscription",
        },
    )
    check("VerifyPaymentPayload payment_id < 5 chars returns 422", r.status_code == 422)

    # Workspace & ApiKey Schemas
    r = auth_client.post("/api/workspaces", json={"name": "   "})
    check("WorkspaceCreate whitespace-only name returns 422", r.status_code == 422)

    r = auth_client.post("/api/workspaces", json={"name": "a" * 101})
    check("WorkspaceCreate name length > 100 returns 422", r.status_code == 422)

    r = auth_client.post(
        "/api/workspaces/00000000-0000-0000-0000-000000000000/invite",
        json={"email": "not-an-email"},
    )
    check("WorkspaceInvite invalid email format returns 422", r.status_code == 422)

    r = auth_client.post("/api/api-keys", json={"name": ""})
    check("ApiKeyCreate empty name returns 422", r.status_code == 422)

    # ---------------------------------------------------------
    # 3. Resource Isolation & Endpoint Error Handling
    # ---------------------------------------------------------
    print("\n--- 3. Resource Isolation & Endpoint Error Handling ---")

    # Non-existent translation history item (404)
    r = auth_client.get("/api/history/00000000-0000-0000-0000-000000000000")
    check("GET /api/history/{non_existent} returns 404 Not Found", r.status_code == 404, f"Status: {r.status_code}")

    # Non-existent shared link (404)
    r = auth_client.get("/api/shared/00000000-0000-0000-0000-000000000000")
    check("GET /api/shared/{non_existent} returns 404 Not Found", r.status_code == 404, f"Status: {r.status_code}")

    # Non-existent workspace delete by non-owner (403 or 404)
    r = auth_client.delete("/api/workspaces/00000000-0000-0000-0000-000000000000")
    check(
        "DELETE /api/workspaces/{non_existent} for non-member returns 403 Forbidden",
        r.status_code == 403,
        f"Status: {r.status_code}",
    )

    # Non-existent API key delete (404)
    r = auth_client.delete("/api/api-keys/00000000-0000-0000-0000-000000000000")
    check("DELETE /api/api-keys/{non_existent} returns 404 Not Found", r.status_code == 404, f"Status: {r.status_code}")

    # ---------------------------------------------------------
    # 4. Webhook Handling
    # ---------------------------------------------------------
    print("\n--- 4. Webhook Handling ---")
    r = auth_client.post("/api/webhook/razorpay", content=b"{}")
    check(
        "Webhook unconfigured/missing signature returns expected status code (503/400)",
        r.status_code in (400, 503),
        f"Status: {r.status_code}",
    )

    # ---------------------------------------------------------
    # 5. Security Headers & Admin Auth Verification
    # ---------------------------------------------------------
    print("\n--- 5. Security Headers & Admin Auth Verification ---")

    r = auth_client.get("/api/health")
    check("GET /api/health returns 200 OK", r.status_code == 200)
    check(
        "Security Header X-Content-Type-Options: nosniff present", r.headers.get("x-content-type-options") == "nosniff"
    )
    check("Security Header X-Frame-Options: DENY present", r.headers.get("x-frame-options") == "DENY")
    check("Security Header X-XSS-Protection present", "x-xss-protection" in r.headers)

    # Metrics requires Basic Auth
    r = unauth_client.get("/api/metrics")
    check("GET /api/metrics without Basic Auth returns 401 Unauthorized", r.status_code == 401)

    print("\n==========================================")
    print(f"EMPIRICAL VERIFICATION SUMMARY: {passed} PASSED, {failed} FAILED")
    print("==========================================")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_empirical_verification()
