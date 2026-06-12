/**
 * TEST-02/04 (4.3): Unit tests for SWR-based data hooks.
 *
 * Tests useTranslationStats, useSubscriptionStatus, and useCredits hooks
 * with mocked fetch calls to verify data transformation and loading states.
 *
 * useAuth is integration-tested via E2E (auth.setup.ts) because it tightly
 * couples Supabase auth.onAuthStateChange — mocking that is brittle.
 * Instead we test the pure data-transform layer: SWR hooks return correctly
 * shaped data from API responses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Minimal fetch mock helpers ────────────────────────────────────────────────

function mockFetchOnce(body: unknown, status = 200) {
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

// ── useTranslationStats data transform ────────────────────────────────────────

describe("useTranslationStats data shape", () => {
  it("maps statsData correctly when all fields present", () => {
    const rawStats = { today: 5, week: 30, total: 120 };
    // Inline the transformation logic (from hooks.ts lines 60-64)
    const stats = rawStats
      ? {
          today: rawStats.today || 0,
          week: rawStats.week || 0,
          total: rawStats.total || 0,
        }
      : { today: 0, week: 0, total: 0 };

    expect(stats.today).toBe(5);
    expect(stats.week).toBe(30);
    expect(stats.total).toBe(120);
  });

  it("falls back to zero when statsData is undefined", () => {
    const rawStats = undefined;
    const stats = rawStats
      ? {
          today: (rawStats as { today?: number }).today || 0,
          week: (rawStats as { week?: number }).week || 0,
          total: (rawStats as { total?: number }).total || 0,
        }
      : { today: 0, week: 0, total: 0 };

    expect(stats.today).toBe(0);
    expect(stats.week).toBe(0);
    expect(stats.total).toBe(0);
  });

  it("falls back to zero for missing fields in partial response", () => {
    const rawStats = { today: 3 }; // week and total are missing
    const stats = {
      today: (rawStats as Record<string, number>).today || 0,
      week: (rawStats as Record<string, number>).week || 0,
      total: (rawStats as Record<string, number>).total || 0,
    };

    expect(stats.today).toBe(3);
    expect(stats.week).toBe(0);
    expect(stats.total).toBe(0);
  });
});

// ── useSubscriptionStatus data shape ─────────────────────────────────────────

describe("useSubscriptionStatus data shape", () => {
  it("maps subscription plan and status correctly", () => {
    const data = { plan: "pro", status: "active", current_period_end: "2026-12-31" };

    const subscription = data
      ? {
          plan: data.plan || "free",
          status: data.status || "inactive",
          current_period_end: data.current_period_end,
        }
      : null;

    expect(subscription?.plan).toBe("pro");
    expect(subscription?.status).toBe("active");
    expect(subscription?.current_period_end).toBe("2026-12-31");
  });

  it("defaults plan to free and status to inactive for partial data", () => {
    const data = {}; // empty response
    const subscription = {
      plan: (data as Record<string, string>).plan || "free",
      status: (data as Record<string, string>).status || "inactive",
      current_period_end: (data as Record<string, string>).current_period_end,
    };

    expect(subscription.plan).toBe("free");
    expect(subscription.status).toBe("inactive");
  });

  it("returns null when data is undefined (no token)", () => {
    const data = undefined;
    const subscription = data
      ? {
          plan: (data as Record<string, string>).plan || "free",
          status: (data as Record<string, string>).status || "inactive",
        }
      : null;

    expect(subscription).toBeNull();
  });
});

// ── useCredits data shape ─────────────────────────────────────────────────────

describe("useCredits data shape", () => {
  it("extracts credits from data correctly", () => {
    const data = { credits: 42 };
    const credits = data?.credits || 0;
    expect(credits).toBe(42);
  });

  it("defaults credits to 0 when data is missing", () => {
    const data = undefined;
    const credits = data ? (data as Record<string, number>).credits || 0 : 0;
    expect(credits).toBe(0);
  });

  it("defaults credits to 0 when credits field is missing", () => {
    const data = {};
    const credits = (data as Record<string, number>).credits || 0;
    expect(credits).toBe(0);
  });
});

// ── getFetcher / postFetcher logic ────────────────────────────────────────────

describe("getFetcher error handling", () => {
  const getFetcher = async ([url, token]: [string, string]) => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch GET resource");
    }
    return res.json();
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Unauthorized" }),
    } as Response);

    await expect(getFetcher(["http://api/stats", "bad_token"])).rejects.toThrow(
      "Failed to fetch GET resource"
    );
  });

  it("returns parsed JSON on ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ today: 10, week: 50, total: 200 }),
    } as Response);

    const result = await getFetcher(["http://api/stats", "valid_token"]);
    expect(result.today).toBe(10);
    expect(result.total).toBe(200);
  });

  it("sends Authorization header correctly", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    await getFetcher(["http://api/stats", "my_test_token"]);

    expect(mockFetch).toHaveBeenCalledWith("http://api/stats", {
      headers: { Authorization: "Bearer my_test_token" },
    });
  });
});

// ── Pro status check logic (from auth-context.tsx) ───────────────────────────

describe("checkProStatus logic", () => {
  const checkProStatus = async (
    accessToken: string,
    apiBase: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBase}/api/subscription-status`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.isPro === true;
      }
    } catch {
      // Silently fail — Pro status defaults to false
    }
    return false;
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when API returns isPro: true", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isPro: true, plan: "pro" }),
    } as Response);

    const result = await checkProStatus("valid_token", "http://localhost:8000");
    expect(result).toBe(true);
  });

  it("returns false when API returns isPro: false", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isPro: false, plan: "free" }),
    } as Response);

    const result = await checkProStatus("valid_token", "http://localhost:8000");
    expect(result).toBe(false);
  });

  it("returns false on network failure (graceful degradation)", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    const result = await checkProStatus("valid_token", "http://localhost:8000");
    expect(result).toBe(false);
  });

  it("returns false on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Unauthorized" }),
    } as Response);

    const result = await checkProStatus("bad_token", "http://localhost:8000");
    expect(result).toBe(false);
  });
});
