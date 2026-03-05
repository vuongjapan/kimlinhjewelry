import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useGoldPrices } from '@/hooks/useGoldPrices';
import { useSilverPrices } from '@/hooks/useSilverPrices';
import { Save, Clock, ToggleLeft, ToggleRight } from 'lucide-react';

interface PriceRow {
  item_name: string;
  buy_price: string;
  sell_price: string;
}

interface HistoryEntry {
  id: string;
  price_type: string;
  item_name: string;
  old_buy: string | null;
  old_sell: string | null;
  new_buy: string | null;
  new_sell: string | null;
  edited_at: string;
}

const AdminPriceEditor = () => {
  const { toast } = useToast();
  const { data: goldData } = useGoldPrices();
  const { data: silverData } = useSilverPrices();

  const [goldManual, setGoldManual] = useState(false);
  const [silverManual, setSilverManual] = useState(false);
  const [goldPrices, setGoldPrices] = useState<PriceRow[]>([]);
  const [silverPrices, setSilverPrices] = useState<PriceRow[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [saving, setSaving] = useState(false);

  // Load settings and overrides
  useEffect(() => {
    loadSettings();
    loadHistory();
  }, []);

  // Populate from auto prices when available
  useEffect(() => {
    if (goldData?.prices) {
      loadOverrides('gold', goldData.prices.map(p => ({ item_name: p.type, buy_price: p.buy, sell_price: p.sell })));
    }
  }, [goldData]);

  useEffect(() => {
    if (silverData?.prices) {
      loadOverrides('silver', silverData.prices.map(p => ({ item_name: p.type, buy_price: p.buy, sell_price: p.sell })));
    }
  }, [silverData]);

  const loadSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*').in('key', ['gold_price_manual', 'silver_price_manual']);
    if (data) {
      const gold = data.find((s: any) => s.key === 'gold_price_manual');
      const silver = data.find((s: any) => s.key === 'silver_price_manual');
      setGoldManual((gold?.value as any)?.enabled ?? false);
      setSilverManual((silver?.value as any)?.enabled ?? false);
    }
  };

  const loadOverrides = async (type: string, autoPrices: PriceRow[]) => {
    const { data: overrides } = await supabase.from('price_overrides').select('*').eq('price_type', type).eq('is_active', true);
    
    const merged = autoPrices.map(ap => {
      const override = (overrides as any[])?.find(o => o.item_name === ap.item_name);
      return override ? { item_name: ap.item_name, buy_price: override.buy_price || ap.buy_price, sell_price: override.sell_price || ap.sell_price } : ap;
    });

    if (type === 'gold') setGoldPrices(merged);
    else setSilverPrices(merged);
  };

  const loadHistory = async () => {
    const { data } = await supabase.from('price_edit_history').select('*').order('edited_at', { ascending: false }).limit(20);
    setHistory((data as HistoryEntry[]) || []);
  };

  const toggleManualMode = async (type: 'gold' | 'silver', enabled: boolean) => {
    const key = `${type}_price_manual`;
    await supabase.from('site_settings').update({ value: { enabled } as any }).eq('key', key);
    if (type === 'gold') setGoldManual(enabled);
    else setSilverManual(enabled);
    toast({ title: enabled ? `Đã bật giá ${type === 'gold' ? 'vàng' : 'bạc'} thủ công` : `Đã chuyển về giá ${type === 'gold' ? 'vàng' : 'bạc'} tự động` });
  };

  const savePrices = async (type: 'gold' | 'silver') => {
    setSaving(true);
    const prices = type === 'gold' ? goldPrices : silverPrices;
    
    try {
      for (const p of prices) {
        // Get old values for history
        const { data: existing } = await supabase.from('price_overrides')
          .select('*').eq('price_type', type).eq('item_name', p.item_name).maybeSingle();

        // Upsert override
        await supabase.from('price_overrides').upsert({
          price_type: type,
          item_name: p.item_name,
          buy_price: p.buy_price,
          sell_price: p.sell_price,
          is_active: true,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'price_type,item_name' });

        // Record history
        await supabase.from('price_edit_history').insert({
          price_type: type,
          item_name: p.item_name,
          old_buy: (existing as any)?.buy_price || null,
          old_sell: (existing as any)?.sell_price || null,
          new_buy: p.buy_price,
          new_sell: p.sell_price,
          edited_by: (await supabase.auth.getUser()).data.user?.id,
        });
      }

      toast({ title: 'Đã lưu giá thành công' });
      loadHistory();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const updatePrice = (type: 'gold' | 'silver', index: number, field: 'buy_price' | 'sell_price', value: string) => {
    if (type === 'gold') {
      setGoldPrices(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
    } else {
      setSilverPrices(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
    }
  };

  const renderPriceTable = (type: 'gold' | 'silver', prices: PriceRow[], isManual: boolean) => (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg">
          Giá {type === 'gold' ? 'Vàng' : 'Bạc'}
        </h3>
        <div className="flex items-center gap-3">
          <Badge variant={isManual ? 'default' : 'secondary'} className="text-xs">
            {isManual ? (
              <><ToggleRight className="w-3 h-3 mr-1" />Giá thủ công (Admin)</>
            ) : (
              <><ToggleLeft className="w-3 h-3 mr-1" />Giá tự động</>
            )}
          </Badge>
          <Switch checked={isManual} onCheckedChange={(v) => toggleManualMode(type, v)} />
        </div>
      </div>

      {!isManual && (
        <p className="text-xs text-muted-foreground font-body">
          Đang dùng giá tự động từ hệ thống. Bật chế độ thủ công để chỉnh sửa.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/50">
              <th className="text-left px-3 py-2 font-body font-semibold">Loại</th>
              <th className="text-right px-3 py-2 font-body font-semibold">Mua vào</th>
              <th className="text-right px-3 py-2 font-body font-semibold">Bán ra</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p, i) => (
              <tr key={i} className="border-t border-border/50">
                <td className="px-3 py-2 font-body font-medium">{p.item_name}</td>
                <td className="px-3 py-2 text-right">
                  {isManual ? (
                    <Input
                      className="w-32 ml-auto text-right h-8 text-sm"
                      value={p.buy_price}
                      onChange={(e) => updatePrice(type, i, 'buy_price', e.target.value)}
                    />
                  ) : (
                    <span className="text-muted-foreground">{p.buy_price}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {isManual ? (
                    <Input
                      className="w-32 ml-auto text-right h-8 text-sm"
                      value={p.sell_price}
                      onChange={(e) => updatePrice(type, i, 'sell_price', e.target.value)}
                    />
                  ) : (
                    <span className="font-semibold">{p.sell_price}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isManual && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => savePrices(type)} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />{saving ? 'Đang lưu...' : 'Lưu giá'}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-semibold">Quản lý giá Vàng / Bạc</h2>

      {renderPriceTable('gold', goldPrices, goldManual)}
      {renderPriceTable('silver', silverPrices, silverManual)}

      {/* History */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Clock className="w-4 h-4" />Lịch sử chỉnh sửa giá
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body text-center py-4">Chưa có lịch sử chỉnh sửa</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="text-left px-3 py-2 font-body">Thời gian</th>
                  <th className="text-left px-3 py-2 font-body">Loại</th>
                  <th className="text-left px-3 py-2 font-body">Tên</th>
                  <th className="text-right px-3 py-2 font-body">Mua cũ → Mới</th>
                  <th className="text-right px-3 py-2 font-body">Bán cũ → Mới</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-t border-border/50">
                    <td className="px-3 py-2 font-body text-muted-foreground">
                      {new Date(h.edited_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 font-body">
                      <Badge variant="outline" className="text-[10px]">{h.price_type === 'gold' ? 'Vàng' : 'Bạc'}</Badge>
                    </td>
                    <td className="px-3 py-2 font-body font-medium">{h.item_name}</td>
                    <td className="px-3 py-2 text-right font-body">
                      <span className="text-muted-foreground">{h.old_buy || '—'}</span> → <span>{h.new_buy || '—'}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-body">
                      <span className="text-muted-foreground">{h.old_sell || '—'}</span> → <span>{h.new_sell || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPriceEditor;
