import { useState, useEffect, useCallback, useRef } from 'react';
import { getCachedPrice, setCachedPrice, isCacheFresh } from '@/lib/priceCache';

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

const CACHE_KEY = 'branded_silver';
const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useBrandedSilverPrices() {
  const [data, setData] = useState<BrandedSilverPriceData | null>(() => getCachedPrice<BrandedSilverPriceData>(CACHE_KEY));
  const [loading, setLoading] = useState(!getCachedPrice(CACHE_KEY));
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchPrices = useCallback(async (force = false) => {
    // Skip if cache is fresh and not forcing
    if (!force && isCacheFresh(CACHE_KEY) && data) {
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-branded-silver-prices`,
        { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      if (!resp.ok) throw new Error('Failed to fetch');
      const json = await resp.json();
      setData(json);
      setCachedPrice(CACHE_KEY, json);
      setError(null);
    } catch (e) {
      console.error('Branded silver price fetch error:', e);
      if (!data) setError('Không thể tải giá bạc thương hiệu');
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchPrices();
    }
    const interval = setInterval(() => fetchPrices(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return { data, loading, error, refetch: () => fetchPrices(true) };
}
