import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedPrice, setCachedPrice } from '@/lib/priceCache';

export interface SilverPriceItem {
  type: string;
  buy: string;
  sell: string;
}

interface SilverPriceData {
  prices: SilverPriceItem[];
  updatedAt: string;
  source: string;
  isManual?: boolean;
}

const CACHE_KEY = 'silver';
const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useSilverPrices() {
  const [data, setData] = useState<SilverPriceData | null>(() => getCachedPrice<SilverPriceData>(CACHE_KEY));
  const [loading, setLoading] = useState(!getCachedPrice(CACHE_KEY));
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const [manualResult, apiResp] = await Promise.allSettled([
        supabase.from('site_settings').select('value').eq('key', 'silver_price_manual').maybeSingle(),
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-silver-prices`,
          { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
        ),
      ]);

      const setting = manualResult.status === 'fulfilled' ? manualResult.value.data : null;
      const isManual = (setting?.value as any)?.enabled === true;

      if (isManual) {
        const { data: overrides } = await supabase
          .from('price_overrides').select('*').eq('price_type', 'silver').eq('is_active', true);
        if (overrides && overrides.length > 0) {
          const result: SilverPriceData = {
            prices: overrides.map((o: any) => ({
              type: o.item_name, buy: o.buy_price || '—', sell: o.sell_price || '—',
            })),
            updatedAt: overrides[0]?.updated_at || new Date().toISOString(),
            source: 'manual', isManual: true,
          };
          setData(result);
          setCachedPrice(CACHE_KEY, result);
          setError(null);
          setLoading(false);
          return;
        }
      }

      if (apiResp.status === 'fulfilled') {
        const resp = apiResp.value;
        if (!resp.ok) throw new Error('Failed to fetch');
        const json = await resp.json();
        const result = { ...json, isManual: false };
        setData(result);
        setCachedPrice(CACHE_KEY, result);
        setError(null);
      } else {
        throw apiResp.reason;
      }
    } catch (e) {
      console.error('Silver price fetch error:', e);
      if (!data) setError('Không thể tải giá bạc');
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
