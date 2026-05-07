import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useGoldPrices } from '@/hooks/useGoldPrices';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

/* ── Types ── */
interface HistoryPoint {
  ts: number;
  time: string;
  buy: number;
  sell: number;
}

interface DailySummary {
  date: string;
  open_buy: number;
  open_sell: number;
  close_buy: number;
  close_sell: number;
  high_buy: number;
  low_buy: number;
  change_buy: number;
  change_pct: number;
  point_count: number;
}

type TabId = '30P' | '1H' | '1N' | '1T' | '1Th' | '3Th' | '6Th' | '1Y';

const TABS: { id: TabId; label: string }[] = [
  { id: '30P', label: '30P' },
  { id: '1H',  label: '1H' },
  { id: '1N',  label: '1N' },
  { id: '1T',  label: '1T' },
  { id: '1Th', label: '1Th' },
  { id: '3Th', label: '3Th' },
  { id: '6Th', label: '6Th' },
  { id: '1Y',  label: '1N' },
];

const BUY_COLOR = '#1D9E75';
const SELL_COLOR = '#D85A30';
const ACTIVE_BG = '#BA7517';

/* ── Validation ── */
function isValidPrice(buy: number, sell: number): boolean {
  if (!buy || !sell) return false;
  if (buy <= 0 || sell <= 0) return false;
  if (buy < 5000 || sell < 5000) return false;
  if (buy > 200000 || sell > 200000) return false;
  if (sell < buy) return false;
  return true;
}

/** Parse VN price string "14.950" → 14950 */
function parsePrice(s: string | number | undefined): number {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  return parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0;
}

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return '—';
  return n.toLocaleString('vi-VN');
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ── Component ── */
const GoldPriceChart = () => {
  const { data: goldData } = useGoldPrices();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<TabId>('1N');
  const [dbHistory, setDbHistory] = useState<HistoryPoint[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('kl_history_expanded') === '1'; } catch { return false; }
  });
  const lastSavedBuyRef = useRef<number>(0);
  const lastSavedSellRef = useRef<number>(0);
  const savingRef = useRef(false);

  // Cleanup old localStorage key
  useEffect(() => {
    try { localStorage.removeItem('kl_gold_history'); } catch {}
  }, []);

  const toggleExpanded = () => {
    setExpanded(prev => {
      const next = !prev;
      try { localStorage.setItem('kl_history_expanded', next ? '1' : '0'); } catch {}
      return next;
    });
  };

  // Extract ONLY "9999" row
  const current = useMemo(() => {
    if (!goldData?.prices?.length) return null;
    const row9999 = goldData.prices.find(p =>
      (p.type || '').includes('9999')
    );
    if (!row9999) return null;
    const buy = parsePrice(row9999.buy);
    const sell = parsePrice(row9999.sell);
    if (!isValidPrice(buy, sell)) return null;
    return { buy, sell };
  }, [goldData]);

  // Fetch history from Supabase based on tab
  const fetchHistory = useCallback(async () => {
    const useSummary = ['3Th', '6Th', '1Y'].includes(tab);
    if (useSummary) {
      const days = tab === '3Th' ? 90 : tab === '6Th' ? 180 : 365;
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data } = await supabase
        .from('gold_daily_summary')
        .select('*')
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true });
      setDailySummaries((data as DailySummary[]) || []);
      setDbHistory([]);
    } else {
      const cutoffs: Record<string, number> = {
        '30P': 30 * 60 * 1000,
        '1H': 60 * 60 * 1000,
        '1N': 24 * 60 * 60 * 1000,
        '1T': 7 * 24 * 60 * 60 * 1000,
        '1Th': 30 * 24 * 60 * 60 * 1000,
      };
      const since = new Date(Date.now() - (cutoffs[tab] || 24 * 60 * 60 * 1000));
      const { data } = await supabase
        .from('gold_price_history')
        .select('*')
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      const points: HistoryPoint[] = (data || []).map((r: any) => {
        const dt = new Date(`${r.date}T${r.time}`);
        return {
          ts: dt.getTime(),
          time: fmtTime(dt.getTime()),
          buy: Number(r.buy_price),
          sell: Number(r.sell_price),
        };
      }).filter((p: HistoryPoint) => isValidPrice(p.buy, p.sell));
      setDbHistory(points);
      setDailySummaries([]);
    }
  }, [tab]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Save price to Supabase when it changes
  useEffect(() => {
    if (!current || savingRef.current) return;
    if (current.buy === lastSavedBuyRef.current && current.sell === lastSavedSellRef.current) return;

    savingRef.current = true;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-gold-price`;
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ buy_price: current.buy, sell_price: current.sell }),
    })
      .then(r => r.json())
      .then(res => {
        if (res.status === 'saved') {
          lastSavedBuyRef.current = current.buy;
          lastSavedSellRef.current = current.sell;
          fetchHistory();
        } else if (res.status === 'skipped') {
          lastSavedBuyRef.current = current.buy;
          lastSavedSellRef.current = current.sell;
        }
      })
      .catch(() => {})
      .finally(() => { savingRef.current = false; });
  }, [current, fetchHistory]);

  const useSummaryView = ['3Th', '6Th', '1Y'].includes(tab);

  // Chart data for point-based tabs
  const chartData = useMemo(() => {
    if (useSummaryView) {
      return dailySummaries.map(s => ({
        ts: new Date(s.date).getTime(),
        time: fmtDate(new Date(s.date).getTime()),
        buy: s.close_buy,
        sell: s.close_sell,
        open_buy: s.open_buy,
        high_buy: s.high_buy,
        low_buy: s.low_buy,
        change_buy: s.change_buy,
        change_pct: s.change_pct,
      }));
    }
    const pts = [...dbHistory];
    if (current && pts.length > 0 && pts[pts.length - 1].buy !== current.buy) {
      pts.push({ ts: Date.now(), time: fmtTime(Date.now()), buy: current.buy, sell: current.sell });
    }
    return pts;
  }, [dbHistory, dailySummaries, current, useSummaryView]);

  // Open/Close badges
  const todaySummary = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return dailySummaries.find(s => s.date === today) || null;
  }, [dailySummaries]);

  // Stats
  const stats = useMemo(() => {
    const buyNow = current?.buy ?? 0;
    const sellNow = current?.sell ?? 0;
    const allBuys = chartData.map(p => p.buy).filter(v => v > 0);
    const first = chartData[0];
    const change = first ? buyNow - first.buy : 0;
    const changePct = first && first.buy ? ((change / first.buy) * 100).toFixed(2) : null;
    return {
      buy: buyNow, sell: sellNow, change, changePct,
      high: allBuys.length ? Math.max(...allBuys) : buyNow,
      low: allBuys.length ? Math.min(...allBuys) : buyNow,
    };
  }, [current, chartData]);

  // History table
  const historyTable = useMemo(() => {
    if (useSummaryView) {
      return dailySummaries.slice().reverse().slice(0, 15).map(s => ({
        time: s.date,
        buy: s.close_buy,
        sell: s.close_sell,
        diff: s.change_buy,
        open_buy: s.open_buy,
        high_buy: s.high_buy,
        low_buy: s.low_buy,
        change_pct: s.change_pct,
        point_count: s.point_count,
      }));
    }
    return chartData.slice().reverse().slice(0, 15).map((r, i, arr) => {
      const prev = arr[i + 1];
      return { ...r, diff: prev ? r.buy - prev.buy : 0 };
    });
  }, [chartData, dailySummaries, useSummaryView]);

  const visibleHistory = expanded ? historyTable : historyTable.slice(0, 5);
  const showChangeCol = historyTable.length >= 2;

  // Y domain
  const allVals = chartData.flatMap(h => [h.buy, h.sell]).filter(v => v > 0);
  const yMin = allVals.length ? Math.min(...allVals) - 100 : 0;
  const yMax = allVals.length ? Math.max(...allVals) + 100 : 20000;

  const noData = chartData.length < 2;
  const noValidCurrent = !current;

  return (
    <section className="bg-background border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
        <h2 className="text-lg md:text-xl font-display font-bold text-foreground">
          Lịch Sử & Xu Hướng Giá Vàng
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground font-body mt-0.5 mb-3">
          Dữ liệu thực tế tại Kim Linh Jewelry
        </p>

        {/* 5 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          <StatCard label="Giá mua" value={fmt(stats.buy)} color={BUY_COLOR} />
          <StatCard label="Giá bán" value={fmt(stats.sell)} color={SELL_COLOR} />
          <StatCard
            label="Thay đổi"
            value={stats.change === 0 ? '—' : `${stats.change > 0 ? '+' : ''}${fmt(stats.change)}`}
            sub={stats.changePct ? `${Number(stats.changePct) > 0 ? '+' : ''}${stats.changePct}%` : undefined}
            color={stats.change > 0 ? BUY_COLOR : stats.change < 0 ? SELL_COLOR : undefined}
          />
          <StatCard label="Cao nhất" value={fmt(stats.high)} />
          <StatCard label="Thấp nhất" value={fmt(stats.low)} />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Period Selector */}
          <div className="flex flex-wrap gap-1.5 px-3 py-2.5 border-b border-border/40">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={tab === t.id
                  ? { backgroundColor: ACTIVE_BG, color: '#fff' }
                  : { backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--foreground))' }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Open/Close badges */}
          {todaySummary && (
            <div className="flex gap-3 px-3 py-1.5 text-xs">
              <span className="inline-flex items-center gap-1 text-[#1D9E75]">🟢 Mở: {fmt(todaySummary.open_buy)}</span>
              <span className="inline-flex items-center gap-1 text-[#D85A30]">🔴 Đóng: {fmt(todaySummary.close_buy)}</span>
            </div>
          )}

          {/* Chart */}
          <div className="px-2 md:px-4 py-3">
            {noValidCurrent && noData ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground py-12">
                ⏸ Đang chờ dữ liệu hợp lệ từ Nhẫn 9999...
              </div>
            ) : noData ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground py-12">
                📊 Đang thu thập dữ liệu… Biểu đồ sẽ hiển thị sau vài lần cập nhật giá.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[yMin, yMax]} tickFormatter={fmt} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, name: string) => [fmt(v), name === 'buy' ? 'Giá Mua' : 'Giá Bán']}
                    labelFormatter={(l) => `🕐 ${l}`}
                  />
                  <Line type="monotone" dataKey="buy" name="buy" stroke={BUY_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
                  <Line type="monotone" dataKey="sell" name="sell" stroke={SELL_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
            <div className="flex justify-center gap-6 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ backgroundColor: BUY_COLOR }} /> Giá Mua</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ backgroundColor: SELL_COLOR }} /> Giá Bán</span>
            </div>
          </div>

          {/* History Table */}
          {visibleHistory.length > 0 && (
            <div className="border-t border-border/40 overflow-x-auto">
              <table className="w-full" style={{ fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="bg-secondary/50 text-foreground">
                    <th className="text-left px-3 py-2 font-semibold">{useSummaryView ? 'Ngày' : 'Thời gian'}</th>
                    {useSummaryView ? (
                      <>
                        <th className="text-right px-3 py-2 font-semibold">Mở</th>
                        <th className="text-right px-3 py-2 font-semibold">Đóng</th>
                        {!isMobile && <th className="text-right px-3 py-2 font-semibold">Cao</th>}
                        {!isMobile && <th className="text-right px-3 py-2 font-semibold">Thấp</th>}
                        <th className="text-right px-3 py-2 font-semibold">+/-</th>
                        {!isMobile && <th className="text-right px-3 py-2 font-semibold">%</th>}
                      </>
                    ) : (
                      <>
                        <th className="text-right px-3 py-2 font-semibold">Giá Mua</th>
                        <th className="text-right px-3 py-2 font-semibold">Giá Bán</th>
                        {showChangeCol && <th className="text-right px-3 py-2 font-semibold">Thay đổi</th>}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visibleHistory.map((r: any, i: number) => {
                    const rowBg = useSummaryView
                      ? r.diff > 0 ? 'rgba(29,158,117,0.06)' : r.diff < 0 ? 'rgba(216,90,48,0.06)' : undefined
                      : i === 0 ? 'rgba(186,117,23,0.1)' : undefined;
                    return (
                      <tr key={i} className="border-t border-border/30 transition-colors hover:bg-secondary/20" style={rowBg ? { backgroundColor: rowBg } : undefined}>
                        <td className="px-3 py-2">{r.time}</td>
                        {useSummaryView ? (
                          <>
                            <td className="px-3 py-2 text-right">{fmt(r.open_buy)}</td>
                            <td className="px-3 py-2 text-right">{fmt(r.buy)}</td>
                            {!isMobile && <td className="px-3 py-2 text-right">{fmt(r.high_buy)}</td>}
                            {!isMobile && <td className="px-3 py-2 text-right">{fmt(r.low_buy)}</td>}
                            <td className="px-3 py-2 text-right font-medium">
                              <DiffCell diff={r.diff} />
                            </td>
                            {!isMobile && <td className="px-3 py-2 text-right text-muted-foreground">{r.change_pct ? `${r.change_pct > 0 ? '+' : ''}${r.change_pct}%` : '—'}</td>}
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-right" style={{ color: BUY_COLOR }}>{fmt(r.buy)}</td>
                            <td className="px-3 py-2 text-right" style={{ color: SELL_COLOR }}>{fmt(r.sell)}</td>
                            {showChangeCol && <td className="px-3 py-2 text-right font-medium">
                              {i === historyTable.length - 1 ? '—' : <DiffCell diff={r.diff} />}
                            </td>}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {historyTable.length > 5 && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={toggleExpanded}
                    className="px-4 py-1.5 text-xs font-medium text-white transition-colors"
                    style={{ backgroundColor: '#BA7517', borderRadius: 6 }}
                  >
                    {expanded ? 'Rút gọn ▲' : 'Xem thêm ▼'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="px-3 py-2 border-t border-border/40">
            <p className="text-[10px] md:text-xs text-muted-foreground text-center">
              Đơn vị: nghìn đồng/chỉ · Cập nhật mỗi 30 phút
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

function DiffCell({ diff }: { diff: number }) {
  if (diff === 0) return <span className="inline-flex items-center gap-0.5"><Minus className="w-3 h-3" />—</span>;
  const color = diff > 0 ? BUY_COLOR : SELL_COLOR;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-0.5" style={{ color }}>
      <Icon className="w-3 h-3" />
      {diff > 0 ? '+' : ''}{fmt(diff)}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg px-3 py-2.5">
      <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm md:text-base font-bold mt-0.5" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default GoldPriceChart;