"use client";

import useSWR from "swr";

export interface PublicQuotaLimits {
  guest_daily_limit: number;
  free_daily_limit: number;
}

async function fetchPublicQuotaLimits(url: string): Promise<PublicQuotaLimits> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load current usage limits (${response.status}).`);
  }
  return response.json();
}

/** Fetches configured normal-mode guest and free-account limits from the API. */
export function usePublicQuotaLimits(enabled = true) {
  return useSWR<PublicQuotaLimits>(enabled ? "/api/v1/public/limits" : null, fetchPublicQuotaLimits, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}
