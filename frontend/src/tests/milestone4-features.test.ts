import { describe, it, expect, beforeEach } from "vitest";
import { useTranslationStore } from "@/features/translate/_store/useTranslationStore";
import {
  getGuestUsage,
  incrementGuestUsage,
  isGuestLimitReached,
  resetGuestUsage,
  GUEST_DAILY_LIMIT,
} from "@/lib/guest-sandbox";

describe("Milestone 4: Guest Sandbox & Store Draft Persistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    useTranslationStore.setState({
      input: "",
      detectedLang: null,
      sessionId: "",
      outputBlocks: null,
    });
  });

  describe("Guest Sandbox Rate Limiting", () => {
    it("starts with 0 usage and limit not reached", () => {
      resetGuestUsage();
      const usage = getGuestUsage();
      expect(usage.count).toBe(0);
      expect(isGuestLimitReached()).toBe(false);
    });

    it("increments guest usage up to the limit of 3", () => {
      resetGuestUsage();
      expect(incrementGuestUsage()).toBe(1);
      expect(isGuestLimitReached()).toBe(false);

      expect(incrementGuestUsage()).toBe(2);
      expect(isGuestLimitReached()).toBe(false);

      expect(incrementGuestUsage()).toBe(3);
      expect(isGuestLimitReached()).toBe(true);
      expect(GUEST_DAILY_LIMIT).toBe(3);
    });

    it("resets guest usage when expired", () => {
      resetGuestUsage();
      incrementGuestUsage();
      incrementGuestUsage();
      incrementGuestUsage();
      expect(isGuestLimitReached()).toBe(true);

      // Artificially age the reset timestamp
      const expiredUsage = { count: 3, resetAt: Date.now() - 1000 };
      localStorage.setItem("anuvaad_guest_usage", JSON.stringify(expiredUsage));

      // getGuestUsage will auto-reset
      const refreshed = getGuestUsage();
      expect(refreshed.count).toBe(0);
      expect(isGuestLimitReached()).toBe(false);
    });
  });

  describe("Zustand Storage ZDR Compliance (FE-01)", () => {
    it("does NOT persist sensitive input or code in sessionStorage or localStorage", () => {
      useTranslationStore.getState().setInput("def calculate_tax(income): return income * 0.2");
      useTranslationStore.getState().setDetectedLang("python");
      useTranslationStore.getState().setSessionId("test-session-123");
      useTranslationStore.getState().setExecutionEngine("byok");

      // sessionStorage must not contain user draft code (FE-01)
      const raw = sessionStorage.getItem("anuvaad-active-draft");
      expect(raw).toBeNull();

      // UI prefs in localStorage must only contain non-sensitive preferences
      const prefsRaw = localStorage.getItem("anuvaad-ui-prefs");
      if (prefsRaw) {
        const parsed = JSON.parse(prefsRaw);
        expect(parsed.state?.input).toBeUndefined();
        expect(parsed.state?.outputBlocks).toBeUndefined();
        expect(parsed.state?.executionEngine).toBe("byok");
      }
    });
  });
});
