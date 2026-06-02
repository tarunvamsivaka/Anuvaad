import { useState, useEffect } from 'react';

// Lightweight in-memory cache (SWR-style) to avoid redundant API calls during navigation
// Keyed by "<endpoint>:<accessToken>"; values expire after CACHE_TTL_MS
const CACHE_TTL_MS = 30_000; // 30 seconds
const _cache = new Map<string, { value: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.value as T;
}
function setCache<T>(key: string, value: T): void {
  _cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}


export interface TranslationHistoryItem {
  id: string;
  user_email: string;
  input_preview: string;
  source_language: string | null;
  target_language: string | null;
  mode: string;
  created_at: string;
  model_used: string | null;
}

export function useTranslationStats(userEmail: string | undefined, accessToken: string | undefined) {
  const [stats, setStats] = useState({ today: 0, week: 0, total: 0 });
  const [recentTranslations, setRecentTranslations] = useState<TranslationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(!!accessToken);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function fetchStats() {
      const cacheKey = `stats:${accessToken}`;
      const cached = getCached<{ stats: { today: number; week: number; total: number }; history: TranslationHistoryItem[] }>(cacheKey);
      if (cached) {
        if (active) {
          setStats(cached.stats);
          setRecentTranslations(cached.history);
          setIsLoading(false);
        }
        return;
      }
      setIsLoading(true);
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        // Fetch history and usage count from backend APIs concurrently
        const [historyRes, statsRes] = await Promise.all([
          fetch(`${API}/api/history?limit=5`, {
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }),
          fetch(`${API}/api/stats`, {
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }),
        ]);

        if (!historyRes.ok || !statsRes.ok) {
          throw new Error('Failed to fetch stats from API');
        }

        const historyData: TranslationHistoryItem[] = await historyRes.json();
        const statsData = await statsRes.json();
        const newStats = {
          today: statsData.today || 0,
          week: statsData.week || 0,
          total: statsData.total || 0,
        };

        // Populate cache before setting state
        setCache(cacheKey, { stats: newStats, history: historyData });

        if (active) {
          setStats(newStats);
          setRecentTranslations(historyData);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching stats:', error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    fetchStats();
    return () => {
      active = false;
      controller.abort();
    };
  }, [accessToken, userEmail]);

  return { stats, recentTranslations, isLoading };
}

export function useSubscriptionStatus(accessToken: string | undefined) {
  const [subscription, setSubscription] = useState<{ plan: string; status: string; current_period_end?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(!!accessToken);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function fetchStatus() {
      setIsLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/subscription-status`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken })
        });
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setSubscription({
              plan: data.plan || 'free',
              status: data.status || 'inactive',
              current_period_end: data.current_period_end
            });
          }
        } else {
          if (active) {
            setSubscription(null);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch subscription status', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    fetchStatus();
    return () => {
      active = false;
      controller.abort();
    };
  }, [accessToken]);

  return { subscription, isLoading };
}

export function useCredits(accessToken: string | undefined) {
  const [credits, setCredits] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(!!accessToken);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function fetchCredits() {
      const cacheKey = `credits:${accessToken}`;
      const cached = getCached<number>(cacheKey);
      if (cached !== null) {
        if (active) { setCredits(cached); setIsLoading(false); }
        return;
      }
      setIsLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/check-credits`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken })
        });
        if (res.ok) {
          const data = await res.json();
          const creditsValue = data.credits || 0;
          setCache(cacheKey, creditsValue);
          if (active) {
            setCredits(creditsValue);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch credits', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    fetchCredits();
    return () => {
      active = false;
      controller.abort();
    };
  }, [accessToken]);

  return { credits, isLoading, setCredits };
}
