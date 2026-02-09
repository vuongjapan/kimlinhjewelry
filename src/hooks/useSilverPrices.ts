import { useState, useEffect, useCallback } from 'react';

export interface SilverPriceItem {
  type: string;
  buy: string;
  sell: string;
}

interface SilverPriceData {
  prices: SilverPriceItem[];
  updatedAt: string;
  source: string;
}

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useSilverPrices() {
  const [data, setData] = useState<SilverPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-silver-prices`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      if (!resp.ok) throw new Error('Failed to fetch');
      const json = await resp.json();
      setData(json);
      setError(null);
    } catch (e) {
      console.error('Silver price fetch error:', e);
      setError('Không thể tải giá bạc');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return { data, loading, error, refetch: fetchPrices };
}
