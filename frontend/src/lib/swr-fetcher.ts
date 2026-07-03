/**
 * frontend/src/lib/swr-fetcher.ts
 *
 * FIX-22 (P2-10): Stable module-level SWR fetcher functions.
 *
 * Defining fetchers inside a component body creates a new function reference on every render,
 * causing SWR to refetch on every render cycle. Module-level fetchers have stable references.
 */

/**
 * Creates a stable SWR fetcher for authenticated API calls.
 * Use this as the second argument to useSWR when passing a [url, token] key tuple.
 *
 * Usage:
 *   const { data } = useSWR(
 *     token ? ['/api/check-credits', token] : null,
 *     authFetcher
 *   );
 */
export async function authFetcher([url, token]: [string, string]): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = new Error(`API error: ${res.status} ${res.statusText}`);
    throw error;
  }
  return res.json();
}

/**
 * Public (unauthenticated) SWR fetcher for simple GET requests.
 */
export async function publicFetcher(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
