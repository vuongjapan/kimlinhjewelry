import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useGoldPrices } from '@/hooks/useGoldPrices';
import { useIsMobile } from '@/hooks/use-mobile';

/* ── Types ── */
interface HistoryPoint {
  ts: number;       // unix ms
  time: string;     // "HH:mm" or "dd/MM"
  buy: number;
  sell: number;
}

type TabId = '30P' | '1H' | '1N' | '1T' | '1Th' | '3Th' | '1Y';

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
const STORAGE_KEY = 'kl_gold_history';
const MAX_POINTS = 200;
const MIN_INTERVAL_MS = 10 * 60 * 1000; // don't save more often than 10 min

/* ── localStorage helpers ── */
function readHistory(): HistoryPoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeHistory(points: HistoryPoint[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points.slice(-MAX_POINTS)));
  } catch { /* quota exceeded — ignore */ }
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
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

/* ── Component ── */
const GoldPriceChart = () => {
  const { data: goldData } = useGoldPrices();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<TabId>('1N');
  const [history, setHistory] = useState<HistoryPoint[]>(readHistory);
  const lastSavedRef = useRef<number>(history.length ? history[history.length - 1].ts : 0);
  const [expanded, setExpanded] = useState(false);

  // Extract "Nhẫn Ép Vỉ 9999" (or first valid row) from the same hook powering the price table
  const current = useMemo(() => {
    if (!goldData?.prices?.length) return null;
    // Prioritize 9999 / 24k
    const ranked = [...goldData.prices].sort((a, b) => {
      const score = (t: string) => {
        const x = (t || '').toLowerCase();
        if (x.includes('9999') || x.includes('24k')) return 0;
        if (x.includes('nhẫn')) return 1;
        return 2;
      };
      return score(a.type) - score(b.type);
    });
    for (const p of ranked) {
      const buy = parsePrice(p.buy);
      const sell = parsePrice(p.sell);
      if (buy > 0 && sell > 0) return { buy, sell };
    }
    return null;
  }, [goldData]);

  // Append to history whenever goldData updates (throttled)
  useEffect(() => {
    if (!current) return;
    const now = Date.now();
    if (now - lastSavedRef.current < MIN_INTERVAL_MS) return;

    const point: HistoryPoint = {
      ts: now,
      time: fmtTime(now),
      buy: current.buy,
      sell: current.sell,
    };

    setHistory(prev => {
      const next = [...prev, point].slice(-MAX_POINTS);
      writeHistory(next);
      return next;
    });
    lastSavedRef.current = now;
  }, [current]);

  // Filter history by selected tab
  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoffs: Record<TabId, number> = {
      '30P': 30 * 60 * 1000,
      '1H':  60 * 60 * 1000,
      '1N':  24 * 60 * 60 * 1000,
      '1T':  7 * 24 * 60 * 60 * 1000,
      '1Th': 30 * 24 * 60 * 60 * 1000,
      '3Th': 90 * 24 * 60 * 60 * 1000,
      '1Y':  365 * 24 * 60 * 60 * 1000,
    };
    const cutoff = now - cutoffs[tab];
    const pts = history.filter(p => p.ts >= cutoff);
    // Relabel based on tab
    const useDate = ['1T', '1Th', '3Th', '1Y'].includes(tab);
    return pts.map(p => ({ ...p, time: useDate ? fmtDate(p.ts) : fmtTime(p.ts) }));
  }, [history, tab]);

  // Stats
  const stats = useMemo(() => {
    const buyNow = current?.buy ?? 0;
    const sellNow = current?.sell ?? 0;
    const allBuys = filtered.map(p => p.buy).filter(v => v > 0);
    const first = filtered[0];
    const change = first ? buyNow - first.buy : 0;
    const changePct = first && first.buy ? ((change / first.buy) * 100).toFixed(2) : null;
    return {
      buy: buyNow, sell: sellNow, change, changePct,
      high: allBuys.length ? Math.max(...allBuys, buyNow) : buyNow,
      low: allBuys.length ? Math.min(...allBuys, buyNow) : buyNow,
    };
  }, [current, filtered]);

  // Chart data — include current as last point if not already there
  const chartData = useMemo(() => {
    const pts = [...filtered];
    if (current && (pts.length === 0 || pts[pts.length - 1].buy !== current.buy)) {
      pts.push({ ts: Date.now(), time: fmtTime(Date.now()), buy: current.buy, sell: current.sell });
    }
    return pts;
  }, [filtered, current]);

  // History table (8 most recent)
  const historyTable = useMemo(() => {
    return chartData.slice().reverse().slice(0, 15).map((r, i, arr) => {
      const prev = arr[i + 1];
      return { ...r, diff: prev ? r.buy - prev.buy : 0 };
    });
  }, [chartData]);

  const visibleHistory = expanded ? historyTable : historyTable.slice(0, 5);
  const showChangeCol = historyTable.length >= 2;

  // Y domain
  const allVals = chartData.flatMap(h => [h.buy, h.sell]).filter(v => v > 0);
  const yMin = allVals.length ? Math.min(...allVals) - 100 : 0;
  const yMax = allVals.length ? Math.max(...allVals) + 100 : 20000;

  const noData = chartData.length < 2;

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

          {/* Chart */}
          <div className="px-2 md:px-4 py-3">
            {noData ? (
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
                  <Line type="monotone" dataKey="buy" name="buy" stroke={BUY_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="sell" name="sell" stroke={SELL_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
            <div className="flex justify-center gap-6 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ backgroundColor: BUY_COLOR }} /> Giá Mua</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ backgroundColor: SELL_COLOR }} /> Giá Bán</span>
            </div>
          </div>

          {/* History Table - 8 rows */}
          {visibleHistory.length > 0 && (
            <div className="border-t border-border/40 overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-secondary/50 text-foreground">
                    <th className="text-left px-3 py-2 font-semibold">Thời gian</th>
                    <th className="text-right px-3 py-2 font-semibold">Giá Mua</th>
                    <th className="text-right px-3 py-2 font-semibold">Giá Bán</th>
                    {showChangeCol && <th className="text-right px-3 py-2 font-semibold">Thay đổi</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleHistory.map((r, i) => (
                    <tr key={i} className="border-t border-border/30 hover:bg-secondary/20 transition-colors">
                      <td className="px-3 py-2">{r.time}</td>
                      <td className="px-3 py-2 text-right" style={{ color: BUY_COLOR }}>{fmt(r.buy)}</td>
                      <td className="px-3 py-2 text-right" style={{ color: SELL_COLOR }}>{fmt(r.sell)}</td>
                      {showChangeCol && <td className="px-3 py-2 text-right font-medium">
                        <span className="inline-flex items-center gap-0.5" style={{ color: r.diff > 0 ? BUY_COLOR : r.diff < 0 ? SELL_COLOR : undefined }}>
                          {r.diff > 0 && <TrendingUp className="w-3 h-3" />}
                          {r.diff < 0 && <TrendingDown className="w-3 h-3" />}
                          {r.diff === 0 && <Minus className="w-3 h-3" />}
                          {r.diff === 0 ? '—' : `${r.diff > 0 ? '+' : ''}${fmt(r.diff)}`}
                        </span>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {historyTable.length > 5 && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={() => setExpanded(prev => !prev)}
                    className="px-4 py-1.5 text-xs font-medium text-white rounded-md transition-colors"
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