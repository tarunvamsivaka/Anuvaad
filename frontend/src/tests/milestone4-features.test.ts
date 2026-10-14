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

  describe("Zustand OAuth Active Draft Persistence", () => {
    it("persists active input and blocks across store updates in sessionStorage", () => {
      useTranslationStore.getState().setInput("def calculate_tax(income): return income * 0.2");
      useTranslationStore.getState().setDetectedLang("python");
      useTranslationStore.getState().setSessionId("test-session-123");

      const raw = sessionStorage.getItem("anuvaad-active-draft");
      expect(raw).toBeTruthy();

      const parsed = JSON.parse(raw!);
      expect(parsed.state.input).toBe("def calculate_tax(income): return income * 0.2");
      expect(parsed.state.detectedLang).toBe("python");
      expect(parsed.state.sessionId).toBe("test-session-123");
    });
  });
});
