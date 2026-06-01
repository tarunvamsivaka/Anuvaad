import { useState, useEffect } from 'react';

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

        if (active) {
          setStats({
            today: statsData.today || 0,
            week: statsData.week || 0,
            total: statsData.total || 0,
          });
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
          if (active) {
            setCredits(data.credits || 0);
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
