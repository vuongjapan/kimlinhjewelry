import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PriceOverride {
  id: string;
  price_type: string;
  item_name: string;
  buy_price: string | null;
  sell_price: string | null;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ManualModeState {
  gold: boolean;
  silver: boolean;
}

export function usePriceOverrides() {
  const [overrides, setOverrides] = useState<PriceOverride[]>([]);
  const [manualMode, setManualMode] = useState<ManualModeState>({ gold: false, silver: false });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [{ data: overrideData }, { data: settings }] = await Promise.all([
      supabase.from('price_overrides').select('*').eq('is_active', true),
      supabase.from('site_settings').select('*').in('key', ['gold_price_manual', 'silver_price_manual']),
    ]);

    setOverrides((overrideData as PriceOverride[]) || []);
    
    const goldSetting = settings?.find((s: any) => s.key === 'gold_price_manual');
    const silverSetting = settings?.find((s: any) => s.key === 'silver_price_manual');
    setManualMode({
      gold: (goldSetting?.value as any)?.enabled ?? false,
      silver: (silverSetting?.value as any)?.enabled ?? false,
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getOverride = useCallback((priceType: string, itemName: string) => {
    if ((priceType === 'gold' && !manualMode.gold) || (priceType === 'silver' && !manualMode.silver)) {
      return null;
    }
    return overrides.find(o => o.price_type === priceType && o.item_name === itemName) || null;
  }, [overrides, manualMode]);

  const isManualMode = useCallback((priceType: 'gold' | 'silver') => manualMode[priceType], [manualMode]);

  return { overrides, manualMode, loading, getOverride, isManualMode, refetch: fetchAll };
}
