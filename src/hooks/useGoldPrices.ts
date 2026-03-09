import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedPrice, setCachedPrice } from '@/lib/priceCache';

export interface GoldPrice {
  type: string;
  buy: string;
  sell: string;
  category: string;
}

interface GoldPriceData {
  prices: GoldPrice[];
  updatedAt: string;
  source: string;
  isManual?: boolean;
}

const CACHE_KEY = 'gold';
const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useGoldPrices() {
  const [data, setData] = useState<GoldPriceData | null>(() => getCachedPrice<GoldPriceData>(CACHE_KEY));
  const [loading, setLoading] = useState(!getCachedPrice(CACHE_KEY));
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      // Check manual mode and fetch API in parallel
      const [manualResult, apiResp] = await Promise.allSettled([
        supabase.from('site_settings').select('value').eq('key', 'gold_price_manual').maybeSingle(),
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-gold-prices`,
          { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
        ),
      ]);

      const setting = manualResult.status === 'fulfilled' ? manualResult.value.data : null;
      const isManual = (setting?.value as any)?.enabled === true;

      if (isManual) {
        const { data: overrides } = await supabase
          .from('price_overrides').select('*').eq('price_type', 'gold').eq('is_active', true);
        
        if (overrides && overrides.length > 0) {
          const result: GoldPriceData = {
            prices: overrides.map((o: any) => ({
              type: o.item_name,
              buy: o.buy_price || '—',
              sell: o.sell_price || '—',
              category: '',
            })),
            updatedAt: overrides[0]?.updated_at || new Date().toISOString(),
            source: 'manual',
            isManual: true,
          };
          setData(result);
          setCachedPrice(CACHE_KEY, result);
          setError(null);
          setLoading(false);
          return;
        }
      }

      // Use API response
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
      console.error('Gold price fetch error:', e);
      if (!data) setError('Không thể tải giá vàng');
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
