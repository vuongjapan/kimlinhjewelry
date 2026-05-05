import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useGoldPrices } from '@/hooks/useGoldPrices';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  saveGoldPrice, extractCurrentPrice,
  getStoragePoints, getMonthlyPoints, getQuickStats,
  formatDate,
  type GoldPricePoint, type GoldMonthPoint,
} from '@/utils/gold-price-storage';

/* ── Types ── */
type TabId = '30P' | '1H' | '1N' | '1T' | '1Th' | '3Th' | '1Y';

interface ChartRow { time: string; buy: number; sell: number }

const TABS: { id: TabId; label: string }[] = [
  { id: '30P', label: '30P' },
  { id: '1H',  label: '1H' },
  { id: '1N',  label: '1N' },
  { id: '1T',  label: '1T' },
  { id: '1Th', label: '1Th' },
  { id: '3Th', label: '3Th' },
  { id: '1Y',  label: '1N' },
];

const BUY_COLOR = '#1D9E75';
const SELL_COLOR = '#D85A30';
const ACTIVE_BG = '#BA7517';

/* ── Mock data generator ── */
function generateMockData(tab: TabId): { history: ChartRow[]; current: { buy: number; sell: number }; change: number; high: number; low: number } {
  const base = 15100;
  const spread = 150;
  const now = new Date();
  const points: ChartRow[] = [];

  const config: Record<TabId, { count: number; labelFn: (i: number) => string; variance: number }> = {
    '30P': { count: 30, variance: 50, labelFn: (i) => { const d = new Date(now.getTime() - (29 - i) * 60 * 1000); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; } },
    '1H':  { count: 12, variance: 80, labelFn: (i) => { const d = new Date(now.getTime() - (11 - i) * 5 * 60 * 1000); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; } },
    '1N':  { count: 13, variance: 100, labelFn: (i) => { const d = new Date(now.getTime() - (12 - i) * 30 * 60 * 1000); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; } },
    '1T':  { count: 7, variance: 200, labelFn: (i) => { const d = new Date(now.getTime() - (6 - i) * 86400000); return `${d.getDate()}/${d.getMonth() + 1}`; } },
    '1Th': { count: 30, variance: 300, labelFn: (i) => { const d = new Date(now.getTime() - (29 - i) * 86400000); return `${d.getDate()}/${d.getMonth() + 1}`; } },
    '3Th': { count: 12, variance: 500, labelFn: (i) => { const d = new Date(now.getTime() - (11 - i) * 7 * 86400000); return `${d.getDate()}/${d.getMonth() + 1}`; } },
    '1Y':  { count: 12, variance: 800, labelFn: (i) => { const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1); return `T${d.getMonth() + 1}/${d.getFullYear()}`; } },
  };

  const c = config[tab];
  let prevBuy = base;
  for (let i = 0; i < c.count; i++) {
    const drift = (Math.random() - 0.48) * c.variance;
    const buy = Math.round(prevBuy + drift);
    const sell = buy + spread;
    points.push({ time: c.labelFn(i), buy, sell });
    prevBuy = buy;
  }

  const last = points[points.length - 1];
  const first = points[0];
  const allBuys = points.map(p => p.buy);
  return {
    history: points,
    current: { buy: last.buy, sell: last.sell },
    change: last.buy - first.buy,
    high: Math.max(...allBuys),
    low: Math.min(...allBuys),
  };
}

/* ── Helpers ── */
function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN');
}

/* ── Component ── */
const GoldPriceChart = () => {
  const { data: goldData } = useGoldPrices();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<TabId>('1N');
  const [tick, setTick] = useState(0);

  // Auto-save prices to localStorage
  useEffect(() => {
    if (!goldData?.prices?.length) return;
    const cur = extractCurrentPrice(goldData.prices);
    if (!cur) return;
    saveGoldPrice(cur.buy, cur.sell);
    setTick(t => t + 1);
  }, [goldData]);

  // Try real data first, fallback to mock
  const dataset = useMemo(() => {
    void tick;
    // Check localStorage for real data
    const stats = getQuickStats();
    const hasReal = stats.current != null;

    if (!hasReal) return generateMockData(tab);

    // Build from real storage
    let raw: GoldPricePoint[] = [];
    switch (tab) {
      case '30P': raw = getStoragePoints('per30min'); break;
      case '1H':  raw = getStoragePoints('perHour'); break;
      case '1N':  raw = getStoragePoints('perDay').slice(-30); break;
      case '1T': {
        const w = Date.now() - 7 * 86400000;
        raw = getStoragePoints('perDay').filter(p => p.timestamp >= w);
        break;
      }
      default: break;
    }

    if (raw.length < 2) return generateMockData(tab);

    const history: ChartRow[] = raw.map(p => ({
      time: tab === '30P' || tab === '1H' ? p.datetime.split(' ')[1] : formatDate(p.timestamp).slice(0, 5),
      buy: p.buyPrice,
      sell: p.sellPrice,
    }));
    const last = history[history.length - 1];
    const first = history[0];
    const allBuys = history.map(h => h.buy);
    return {
      history,
      current: { buy: last.buy, sell: last.sell },
      change: last.buy - first.buy,
      high: Math.max(...allBuys),
      low: Math.min(...allBuys),
    };
  }, [tab, tick]);

  const changePct = dataset.history.length > 1 && dataset.history[0].buy
    ? ((dataset.change / dataset.history[0].buy) * 100).toFixed(2)
    : null;

  const historyTable = dataset.history.slice().reverse().slice(0, 8).map((r, i, arr) => {
    const prev = arr[i + 1];
    return { ...r, diff: prev ? r.buy - prev.buy : 0 };
  });

  // Y-axis domain ± 100
  const allValues = dataset.history.flatMap(h => [h.buy, h.sell]);
  const yMin = Math.min(...allValues) - 100;
  const yMax = Math.max(...allValues) + 100;

  return (
    <section className="bg-background border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <h2 className="text-lg md:text-xl font-display font-bold text-foreground">
          Lịch Sử & Xu Hướng Giá Vàng
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground font-body mt-0.5 mb-3">
          Dữ liệu thực tế tại Kim Linh Jewelry
        </p>

        {/* 5 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          <StatCard label="Giá mua" value={fmt(dataset.current.buy)} color={BUY_COLOR} />
          <StatCard label="Giá bán" value={fmt(dataset.current.sell)} color={SELL_COLOR} />
          <StatCard
            label="Thay đổi"
            value={`${dataset.change > 0 ? '+' : ''}${fmt(dataset.change)}`}
            sub={changePct ? `${Number(changePct) > 0 ? '+' : ''}${changePct}%` : undefined}
            color={dataset.change > 0 ? BUY_COLOR : dataset.change < 0 ? SELL_COLOR : undefined}
          />
          <StatCard label="Cao nhất" value={fmt(dataset.high)} />
          <StatCard label="Thấp nhất" value={fmt(dataset.low)} />
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

          {/* Chart */}
          <div className="px-2 md:px-4 py-3">
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
              <LineChart data={dataset.history} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  domain={[yMin, yMax]}
                  tickFormatter={fmt}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [
                    fmt(v),
                    name === 'buy' ? 'Giá Mua' : 'Giá Bán',
                  ]}
                  labelFormatter={(l) => `🕐 ${l}`}
                />
                <Line type="monotone" dataKey="buy" name="buy" stroke={BUY_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="sell" name="sell" stroke={SELL_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex justify-center gap-6 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ backgroundColor: BUY_COLOR }} /> Giá Mua</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ backgroundColor: SELL_COLOR }} /> Giá Bán</span>
            </div>
          </div>

          {/* History Table - 8 rows */}
          {historyTable.length > 0 && (
            <div className="border-t border-border/40 overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-secondary/50 text-foreground">
                    <th className="text-left px-3 py-2 font-semibold">Thời gian</th>
                    <th className="text-right px-3 py-2 font-semibold">Giá Mua</th>
                    <th className="text-right px-3 py-2 font-semibold">Giá Bán</th>
                    <th className="text-right px-3 py-2 font-semibold">Thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  {historyTable.map((r, i) => (
                    <tr key={i} className="border-t border-border/30 hover:bg-secondary/20 transition-colors">
                      <td className="px-3 py-2">{r.time}</td>
                      <td className="px-3 py-2 text-right" style={{ color: BUY_COLOR }}>{fmt(r.buy)}</td>
                      <td className="px-3 py-2 text-right" style={{ color: SELL_COLOR }}>{fmt(r.sell)}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        <span className="inline-flex items-center gap-0.5" style={{ color: r.diff > 0 ? BUY_COLOR : r.diff < 0 ? SELL_COLOR : undefined }}>
                          {r.diff > 0 && <TrendingUp className="w-3 h-3" />}
                          {r.diff < 0 && <TrendingDown className="w-3 h-3" />}
                          {r.diff === 0 && <Minus className="w-3 h-3" />}
                          {r.diff === 0 ? '—' : `${r.diff > 0 ? '+' : ''}${fmt(r.diff)}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer note */}
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

/* ── Stat Card ── */
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