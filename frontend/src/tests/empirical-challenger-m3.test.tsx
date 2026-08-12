/**
 * Empirical Challenger M3 Test Suite — Edge & Boundary Verification
 * 
 * Verifies:
 * 1. 0 remaining credits boundary conditions for guest (5/5) and free users (25/25).
 * 2. Missing or malformed Retry-After HTTP headers on 429 responses.
 * 3. Guest onboarding modal trigger cancellation and modal closing behaviors.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SWRConfig, mutate } from "swr";

import { UsageCounterBadge } from "@/components/common/UsageCounterBadge";
import { QuotaExceededModal, parseQuotaErrorPayload, QuotaError } from "@/components/modals/QuotaExceededModal";
import { GuestOnboardingModal } from "@/components/modals/GuestOnboardingModal";

const mockAuth = {
  user: null as any,
  session: null as any,
  loading: false,
  isPro: false,
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockAuth,
}));

function renderBadge() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <UsageCounterBadge />
    </SWRConfig>
  );
}

describe("Empirical Challenger M3 Boundary & Edge Case Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutate(() => true, undefined, { revalidate: false });
    mockAuth.user = null;
    mockAuth.session = null;
    mockAuth.loading = false;
    mockAuth.isPro = false;
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // ---------------------------------------------------------------------------
  // 1. Boundary Testing: 0 Remaining Credits (Guest 5/5, Free 25/25)
  // ---------------------------------------------------------------------------
  describe("1. 0 Remaining Credits Boundary Conditions", () => {
    it("renders red 'No credits left' badge for Guest user when 5/5 used (0 remaining)", async () => {
      mockAuth.session = null;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ remaining: 0, limit: 5, tier: "guest" }),
        })
      );

      const { container } = renderBadge();
      const pill = await screen.findByText("[GUEST]");
      expect(pill).toBeInTheDocument();
      expect(screen.getByText("No credits left")).toBeInTheDocument();

      const badgeDiv = container.querySelector("div");
      expect(badgeDiv?.className).toContain("bg-red-500/10");
      expect(badgeDiv?.className).toContain("text-red-400");
      expect(badgeDiv?.className).toContain("border-red-500/20");
    });

    it("renders red 'No credits left' badge for Free user when 25/25 used (0 remaining)", async () => {
      mockAuth.session = { access_token: "mock_free_token" };
      mockAuth.user = { email: "free@example.com" };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ remaining: 0, limit: 25, tier: "free" }),
        })
      );

      const { container } = renderBadge();
      const pill = await screen.findByText("[FREE]");
      expect(pill).toBeInTheDocument();
      expect(screen.getByText("No credits left")).toBeInTheDocument();

      const badgeDiv = container.querySelector("div");
      expect(badgeDiv?.className).toContain("bg-red-500/10");
      expect(badgeDiv?.className).toContain("text-red-400");
    });

    it("renders green badge for Guest user when 0/5 used (5 remaining)", async () => {
      mockAuth.session = null;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ remaining: 5, limit: 5, tier: "guest" }),
        })
      );

      const { container } = renderBadge();
      await screen.findByText("[GUEST]");
      expect(screen.getByText("5 / 5 left")).toBeInTheDocument();

      const badgeDiv = container.querySelector("div");
      expect(badgeDiv?.className).toContain("bg-emerald-500/10");
      expect(badgeDiv?.className).toContain("text-emerald-400");
    });

    it("renders green badge for Free user when 0/25 used (25 remaining)", async () => {
      mockAuth.session = { access_token: "mock_free_token" };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ remaining: 25, limit: 25, tier: "free" }),
        })
      );

      const { container } = renderBadge();
      await screen.findByText("[FREE]");
      expect(screen.getByText("25 / 25 left")).toBeInTheDocument();

      const badgeDiv = container.querySelector("div");
      expect(badgeDiv?.className).toContain("bg-emerald-500/10");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Edge Case Testing: Missing & Malformed Retry-After Headers
  // ---------------------------------------------------------------------------
  describe("2. Missing & Malformed Retry-After HTTP Headers", () => {
    it("handles missing (null) Retry-After header cleanly without crashing", () => {
      const result = parseQuotaErrorPayload({ detail: "Too many requests" }, null);
      expect(result.detail).toBe("Too many requests");
      expect(result.retry_after_seconds).toBe(0);
      expect(result.tier_limit).toBe(5);
    });

    it("handles missing (undefined) Retry-After header cleanly", () => {
      const result = parseQuotaErrorPayload({ detail: "Too many requests" });
      expect(result.retry_after_seconds).toBe(0);
    });

    it("handles malformed string Retry-After header ('invalid_header') cleanly", () => {
      const result = parseQuotaErrorPayload({ detail: "Rate limited" }, "invalid_header");
      expect(result.detail).toBe("Rate limited");
      expect(result.retry_after_seconds).toBe(0);
    });

    it("handles empty string Retry-After header ('')", () => {
      const result = parseQuotaErrorPayload({ detail: "Rate limited" }, "");
      expect(result.retry_after_seconds).toBe(0);
    });

    it("handles alpha-numeric malformed Retry-After header ('3600seconds')", () => {
      const result = parseQuotaErrorPayload({ detail: "Rate limited" }, "3600seconds");
      expect(result.retry_after_seconds).toBe(3600); // parseInt parses leading numbers
    });

    it("handles non-numeric malformed Retry-After header ('abc3600')", () => {
      const result = parseQuotaErrorPayload({ detail: "Rate limited" }, "abc3600");
      expect(result.retry_after_seconds).toBe(0); // parseInt returns NaN -> fallback 0
    });

    it("prioritizes numeric payload retry_after_seconds over header fallback", () => {
      const result = parseQuotaErrorPayload({ detail: "Rate limited", retry_after_seconds: 120 }, "3600");
      expect(result.retry_after_seconds).toBe(120);
    });

    it("handles completely empty or null payload safely", () => {
      const result = parseQuotaErrorPayload(null, "invalid");
      expect(result.detail).toBe("Quota limit exceeded");
      expect(result.limit_type).toBe("user_daily_limit");
      expect(result.retry_after_seconds).toBe(0);
      expect(result.tier_limit).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Modal Behaviors: Guest Onboarding Modal Cancellation & Closing
  // ---------------------------------------------------------------------------
  describe("3. Guest Onboarding Modal Trigger Cancellation & Closing Behaviors", () => {
    it("does NOT execute pending action when closed via close icon (X)", () => {
      const onClose = vi.fn();
      const onContinue = vi.fn();

      render(
        <GuestOnboardingModal
          isOpen={true}
          onClose={onClose}
          onContinueAsGuest={onContinue}
          reason="gist"
        />
      );

      const closeBtn = screen.getByLabelText("Close modal");
      fireEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onContinue).not.toHaveBeenCalled();
    });

    it("does NOT execute pending action when closed via Escape key", () => {
      const onClose = vi.fn();
      const onContinue = vi.fn();

      render(
        <GuestOnboardingModal
          isOpen={true}
          onClose={onClose}
          onContinueAsGuest={onContinue}
          reason="save"
        />
      );

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onContinue).not.toHaveBeenCalled();
    });

    it("does NOT execute pending action when closed via backdrop click", () => {
      const onClose = vi.fn();
      const onContinue = vi.fn();

      const { container } = render(
        <GuestOnboardingModal
          isOpen={true}
          onClose={onClose}
          onContinueAsGuest={onContinue}
          reason="export"
        />
      );

      const backdrop = container.querySelector('div[role="dialog"]');
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onContinue).not.toHaveBeenCalled();
    });

    it("EXECUTES pending action when user explicitly clicks 'Continue as Guest'", () => {
      const onClose = vi.fn();
      const onContinue = vi.fn();

      render(
        <GuestOnboardingModal
          isOpen={true}
          onClose={onClose}
          onContinueAsGuest={onContinue}
          reason="gist"
        />
      );

      const continueBtn = screen.getByText("Continue as Guest");
      fireEvent.click(continueBtn);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it("does NOT execute pending action when user clicks 'Sign Up / Log In' CTA link", () => {
      const onClose = vi.fn();
      const onContinue = vi.fn();

      render(
        <GuestOnboardingModal
          isOpen={true}
          onClose={onClose}
          onContinueAsGuest={onContinue}
          reason="save"
        />
      );

      const signupLink = screen.getByText("Sign Up / Log In").closest("a");
      expect(signupLink).toHaveAttribute("href", "/signup?reason=save");
      fireEvent.click(signupLink!);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onContinue).not.toHaveBeenCalled();
    });
  });
});
