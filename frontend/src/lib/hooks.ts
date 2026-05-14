import { useCallback } from 'react';



import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export function useTranslationStats(userEmail: string | undefined) {
  const [stats, setStats] = useState({ today: 0, week: 0, total: 0 });
  const [recentTranslations, setRecentTranslations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) {
      setIsLoading(false);
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function fetchStats() {
      setIsLoading(true);
      try {
        // 1. Total translations
        const { count: totalCount } = await supabase
          .from('translation_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_email', userEmail);

        // 2. Today translations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: todayCount } = await supabase
          .from('translation_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_email', userEmail)
          .gte('created_at', today.toISOString());

        // 3. This week translations
        const week = new Date();
        week.setDate(week.getDate() - week.getDay());
        week.setHours(0, 0, 0, 0);
        const { count: weekCount } = await supabase
          .from('translation_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_email', userEmail)
          .gte('created_at', week.toISOString());

        // 4. Recent translations
        const { data: recent } = await supabase
          .from('translation_history')
          .select('*')
          .eq('user_email', userEmail)
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({
          today: todayCount || 0,
          week: weekCount || 0,
          total: totalCount || 0,
        });
        setRecentTranslations(recent || []);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [userEmail]);

  return { stats, recentTranslations, isLoading };
}

export function useSubscriptionStatus(accessToken: string | undefined) {
  const [subscription, setSubscription] = useState<{ plan: string; status: string; current_period_end?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    async function fetchStatus() {
      setIsLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/subscription-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken })
        });
        if (res.ok) {
          const data = await res.json();
          setSubscription({
            plan: data.plan || 'free',
            status: data.status || 'inactive',
            current_period_end: data.current_period_end
          });
        } else {
          setSubscription(null);
        }
      } catch (err) {
        console.error('Failed to fetch subscription status', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStatus();
  }, [accessToken]);

  return { subscription, isLoading };
}

export function useCredits(accessToken: string | undefined) {
  const [credits, setCredits] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    async function fetchCredits() {
      setIsLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/check-credits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken })
        });
        if (res.ok) {
          const data = await res.json();
          setCredits(data.credits || 0);
        }
      } catch (err) {
        console.error('Failed to fetch credits', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCredits();
  }, [accessToken]);

  return { credits, isLoading, setCredits };
}
