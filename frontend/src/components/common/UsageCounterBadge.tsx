/**
 * UsageCounterBadge — M3 Feature #6
 *
 * Displays remaining daily translation credits in the TopBar as a color-coded
 * pill: green (>50% remaining), amber (<50%), red (<20% or exhausted).
 * Hidden for Pro users (unlimited) and guests (unauthenticated).
 *
 * API: GET /api/check-credits → { remaining: number, limit: number, tier: string }
 */
"use client";

import { Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import useSWR from "swr";
import { cn } from "@/lib/utils";

interface CreditsResponse {
  remaining: number;
  limit: number;
  tier: "guest" | "free" | "pro";
  credits?: number;
  reset_at?: string;
}

async function fetchCredits([url, tokenKey]: [string, string]): Promise<CreditsResponse> {
  const headers: Record<string, string> = {};
  if (tokenKey && tokenKey !== "guest") {
    headers["Authorization"] = `Bearer ${tokenKey}`;
  }
  const res = await fetch(url, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function UsageCounterBadge() {
  const { session, isPro } = useAuth();
  const token = session?.access_token;

  const { data, error } = useSWR<CreditsResponse>(
    ["/api/check-credits", token || "guest"],
    fetchCredits,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  // Don't render for Pro (unlimited)
  if (isPro || data?.tier === "pro") return null;
  // Suppress while loading or on error
  if (!data || error) return null;

  const { remaining, limit, tier } = data;
  const currentTier = tier || (token ? "free" : "guest");
  const used = limit - remaining;
  const pct = limit > 0 ? used / limit : 0;

  const colorClass =
    remaining === 0
      ? "bg-red-500/10 text-red-400 border-red-500/20"
      : pct >= 0.8
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

  const tierPillClass =
    (currentTier as string) === "guest"
      ? "bg-slate-500/20 text-slate-300 border-slate-500/30"
      : (currentTier as string) === "pro"
      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

  const label =
    remaining === 0 ? "No credits left" : `${remaining} / ${limit} left`;

  return (
    <div
      title={`Daily translation credits: ${remaining} of ${limit} remaining`}
      className={cn(
        "hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold select-none transition-colors",
        colorClass
      )}
    >
      <span className={cn("px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase tracking-wider border", tierPillClass)}>
        [{currentTier.toUpperCase()}]
      </span>
      <Zap className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
