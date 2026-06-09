import useSWR from 'swr';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const getFetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch GET resource');
  }
  return res.json();
};

const postFetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch POST resource');
  }
  return res.json();
};

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

export function useTranslationStats(_userEmail: string | undefined, accessToken: string | undefined) {
  // Fetch stats and history using SWR
  const { data: statsData, isLoading: statsLoading } = useSWR(
    accessToken ? [`${API_BASE}/api/stats`, accessToken] : null,
    getFetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );

  const { data: historyData, isLoading: historyLoading } = useSWR(
    accessToken ? [`${API_BASE}/api/history?limit=5`, accessToken] : null,
    getFetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );

  const stats = statsData ? {
    today: statsData.today || 0,
    week: statsData.week || 0,
    total: statsData.total || 0,
  } : { today: 0, week: 0, total: 0 };

  const recentTranslations: TranslationHistoryItem[] = historyData || [];
  const isLoading = !!accessToken && (statsLoading || historyLoading);

  return { stats, recentTranslations, isLoading };
}

export function useSubscriptionStatus(accessToken: string | undefined) {
  const { data, isLoading } = useSWR(
    accessToken ? [`${API_BASE}/api/subscription-status`, accessToken] : null,
    postFetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );

  const subscription = data ? {
    plan: data.plan || 'free',
    status: data.status || 'inactive',
    current_period_end: data.current_period_end
  } : null;

  return { subscription, isLoading: !!accessToken && isLoading };
}

export function useCredits(accessToken: string | undefined) {
  const { data, isLoading, mutate } = useSWR(
    accessToken ? [`${API_BASE}/api/check-credits`, accessToken] : null,
    postFetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );

  const credits = data?.credits || 0;

  const setCredits = (val: number | ((prev: number) => number)) => {
    if (typeof val === 'function') {
      mutate((prevData: { credits: number } | undefined) => {
        const current = prevData?.credits || 0;
        const nextVal = val(current);
        return { ...prevData, credits: nextVal };
      }, { revalidate: false });
    } else {
      mutate({ ...data, credits: val }, { revalidate: false });
    }
  };

  return { credits, isLoading: !!accessToken && isLoading, setCredits };
}
