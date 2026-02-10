import { useState, useEffect, useCallback } from 'react';

export interface GoldPrice {
  type: string;
  buy: string;
  sell: string;
  category: string;
}

export interface WorldGoldData {
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
}

interface GoldPriceData {
  prices: GoldPrice[];
  worldGold: WorldGoldData;
  updatedAt: string;
  source: string;
}

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useGoldPrices() {
  const [data, setData] = useState<GoldPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-gold-prices`,
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
      console.error('Gold price fetch error:', e);
      setError('Không thể tải giá vàng');
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
