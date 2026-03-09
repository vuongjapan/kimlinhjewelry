import { useState, useEffect, useCallback } from 'react';

export interface BrandedSilverPriceItem {
  type: string;
  buy: string;
  sell: string;
}

interface BrandedSilverPriceData {
  prices: BrandedSilverPriceItem[];
  updatedAt: string;
  source: string;
}

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useBrandedSilverPrices() {
  const [data, setData] = useState<BrandedSilverPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-branded-silver-prices`,
        { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      if (!resp.ok) throw new Error('Failed to fetch');
      const json = await resp.json();
      setData(json);
      setError(null);
    } catch (e) {
      console.error('Branded silver price fetch error:', e);
      setError('Không thể tải giá bạc thương hiệu');
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
