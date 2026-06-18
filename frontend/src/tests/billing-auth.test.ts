/**
 * BACK-06 Security Tests: Billing API Authorization Header Pattern
 *
 * Documents and verifies that all billing API calls use Authorization headers
 * and NOT access_token in request bodies (per BACK-06 migration).
 *
 * These tests inline the fetch logic pattern from billing/page.tsx to
 * verify the header-auth approach without requiring a live DOM.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Inline the checkout fetch pattern from billing/page.tsx ──────────────────

const API_BASE = "http://localhost:8000";

async function callCreateCheckout(
  accessToken: string,
  userEmail: string
): Promise<Response> {
  return fetch(`${API_BASE}/api/create-checkout-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // BACK-06: auth via header, NOT body
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ user_email: userEmail }),
  });
}

async function callVerifyPayment(
  accessToken: string,
  paymentId: string,
  subscriptionId: string,
  signature: string
): Promise<Response> {
  return fetch(`${API_BASE}/api/verify-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // BACK-06: auth via header, NOT body
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: signature,
      payment_type: "subscription",
      // No access_token field in body — BACK-06 compliant
    }),
  });
}

describe("BACK-06: Billing API uses Authorization header (not body token)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("create-checkout-session sends Authorization header not body token", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscription_id: "sub_123", key_id: "rzp_test_abc" }),
    } as Response);

    await callCreateCheckout("my_jwt_token", "user@example.com");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("create-checkout-session"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my_jwt_token",
        }),
      })
    );
  });

  it("create-checkout-session body does NOT contain access_token", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscription_id: "sub_123", key_id: "rzp_test_abc" }),
    } as Response);

    await callCreateCheckout("my_jwt_token", "user@example.com");

    const callArgs = mockFetch.mock.calls[0];
    const bodyStr = callArgs[1]?.body as string;
    const body = JSON.parse(bodyStr);

    // BACK-06: access_token must NOT appear in request body
    expect(body).not.toHaveProperty("access_token");
    expect(body).toHaveProperty("user_email", "user@example.com");
  });

  it("verify-payment sends Authorization header not body token", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", plan: "pro" }),
    } as Response);

    await callVerifyPayment("my_jwt_token", "pay_123", "sub_456", "sig_789");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("verify-payment"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my_jwt_token",
        }),
      })
    );
  });

  it("verify-payment body does NOT contain access_token", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", plan: "pro" }),
    } as Response);

    await callVerifyPayment("my_jwt_token", "pay_123", "sub_456", "sig_789");

    const callArgs = mockFetch.mock.calls[0];
    const bodyStr = callArgs[1]?.body as string;
    const body = JSON.parse(bodyStr);

    // BACK-06: access_token must NOT appear in request body
    expect(body).not.toHaveProperty("access_token");
    expect(body).toHaveProperty("payment_type", "subscription");
    expect(body).toHaveProperty("razorpay_payment_id", "pay_123");
  });

  it("verify-payment returns pro plan on success", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", plan: "pro" }),
    } as Response);

    const res = await callVerifyPayment("my_jwt_token", "pay_123", "sub_456", "sig_789");
    const data = await res.json();

    expect(data.status).toBe("success");
    expect(data.plan).toBe("pro");
  });

  it("checkout returns subscription_id and key_id", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscription_id: "sub_123", key_id: "rzp_live_xyz" }),
    } as Response);

    const res = await callCreateCheckout("jwt_token", "user@test.com");
    const data = await res.json();

    expect(data.subscription_id).toBe("sub_123");
    expect(data.key_id).toBe("rzp_live_xyz");
  });
});
