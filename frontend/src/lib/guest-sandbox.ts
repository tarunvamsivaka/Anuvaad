/**
 * Guest Sandbox Utilities — Milestone 4
 *
 * Enforces up to 3 free translations per 24-hour window for unauthenticated guests.
 * State is stored in localStorage with an automatic 24-hour reset window.
 */

const GUEST_USAGE_KEY = "anuvaad_guest_usage";
const GUEST_DAILY_LIMIT = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface GuestUsage {
  count: number;
  resetAt: number;
}

export function getGuestUsage(): GuestUsage {
  if (typeof window === "undefined") {
    return { count: 0, resetAt: Date.now() + WINDOW_MS };
  }

  try {
    const raw = localStorage.getItem(GUEST_USAGE_KEY);
    if (!raw) {
      const initial: GuestUsage = { count: 0, resetAt: Date.now() + WINDOW_MS };
      localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const usage: GuestUsage = JSON.parse(raw);
    const now = Date.now();

    // If window expired, reset counter for next 24 hours
    if (now >= usage.resetAt) {
      const refreshed: GuestUsage = { count: 0, resetAt: now + WINDOW_MS };
      localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(refreshed));
      return refreshed;
    }

    return usage;
  } catch {
    return { count: 0, resetAt: Date.now() + WINDOW_MS };
  }
}

export function incrementGuestUsage(): number {
  if (typeof window === "undefined") return 1;

  try {
    const usage = getGuestUsage();
    usage.count += 1;
    localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(usage));
    return usage.count;
  } catch {
    return 1;
  }
}

export function isGuestLimitReached(): boolean {
  const usage = getGuestUsage();
  return usage.count >= GUEST_DAILY_LIMIT;
}

export function getGuestRemainingSeconds(): number {
  const usage = getGuestUsage();
  const diff = Math.max(0, usage.resetAt - Date.now());
  return Math.ceil(diff / 1000);
}

export function resetGuestUsage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_USAGE_KEY);
  } catch {
    // Ignore error
  }
}

export { GUEST_DAILY_LIMIT };
