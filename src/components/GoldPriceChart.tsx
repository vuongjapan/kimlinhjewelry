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
  date: string;
  time: string;
  buy: number;
  sell: number;
  is_open: boolean;
  is_close: boolean;
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

type TabId = '1N' | '1Th' | '6Th' | '1Y';

const TABS: { id: TabId; label: string }[] = [
  { id: '1N',  label: '1 Ngày' },
  { id: '1Th', label: '1 Tháng' },
  { id: '6Th', label: '6 Tháng' },
  { id: '1Y',  label: '1 Năm' },
];

const BUY_COLOR = '#1D9E75';
const SELL_COLOR = '#D85A30';
const ACTIVE_BG = '#BA7517';

/* ── Helpers ── */
function isValidPrice(buy: number, sell: number): boolean {
  if (!buy || !sell) return false;
  if (buy < 5000 || sell < 5000) return false;
  if (buy > 200000 || sell > 200000) return false;
  if (sell < buy) return false;
  return true;
}

function parsePrice(s: string | number | undefined): number {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  return parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0;
}

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return '—';
  return n.toLocaleString('vi-VN');
}

/** Format date string "YYYY-MM-DD" → "DD/MM/YYYY" */
function fmtDateStr(d: string): string {
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

/** Format date string "YYYY-MM-DD" → "DD/MM" */
function fmtDateShort(d: string): string {
  const [, m, dd] = d.split('-');
  return `${dd}/${m}`;
}

/** Format time string "HH:MM:SS" → "HH:MM" */
function fmtTimeStr(t: string): string {
  return t.slice(0, 5);
}

/* ── Component ── */
const GoldPriceChart = () => {
  const { data: goldData } = useGoldPrices();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<TabId>('1N');
  const [dbHistory, setDbHistory] = useState<HistoryPoint[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [expanded, setExpanded] = useState(false);
  const lastSavedBuyRef = useRef<number>(0);
  const lastSavedSellRef = useRef<number>(0);
  const savingRef = useRef(false);

  useEffect(() => {
    try { localStorage.removeItem('kl_gold_history'); } catch {}
  }, []);

  const isDayTab = tab === '1N';
  const isSummaryTab = !isDayTab;

  const current = useMemo(() => {
    if (!goldData?.prices?.length) return null;
    const row9999 = goldData.prices.find(p => (p.type || '').includes('9999'));
    if (!row9999) return null;
    const buy = parsePrice(row9999.buy);
    const sell = parsePrice(row9999.sell);
    if (!isValidPrice(buy, sell)) return null;
    return { buy, sell };
  }, [goldData]);

  const fetchHistory = useCallback(async () => {
    if (isSummaryTab) {
      const days = tab === '1Th' ? 30 : tab === '6Th' ? 180 : 365;
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
      const since = new Date();
      since.setDate(since.getDate() - 1);
      const { data } = await supabase
        .from('gold_price_history')
        .select('*')
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      const points: HistoryPoint[] = (data || []).map((r: any) => ({
        date: r.date,
        time: r.time,
        buy: Number(r.buy_price),
        sell: Number(r.sell_price),
        is_open: !!r.is_open,
        is_close: !!r.is_close,
      })).filter((p: HistoryPoint) => isValidPrice(p.buy, p.sell));
      setDbHistory(points);
      setDailySummaries([]);
    }
  }, [tab, isSummaryTab]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    if (!current || savingRef.current) return;
    if (current.buy === lastSavedBuyRef.current && current.sell === lastSavedSellRef.current) return;
    savingRef.current = true;
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-gold-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ buy_price: current.buy, sell_price: current.sell }),
    })
      .then(r => r.json())
      .then(res => {
        if (res.status === 'saved' || res.status === 'skipped') {
          lastSavedBuyRef.current = current.buy;
          lastSavedSellRef.current = current.sell;
          if (res.status === 'saved') fetchHistory();
        }
      })
      .catch(() => {})
      .finally(() => { savingRef.current = false; });
  }, [current, fetchHistory]);

  /* ── Chart data ── */
  const chartData = useMemo(() => {
    if (isSummaryTab) {
      return dailySummaries.map(s => ({
        label: fmtDateShort(s.date),
        fullDate: fmtDateStr(s.date),
        buy: s.close_buy,
        sell: s.close_sell,
        open_buy: s.open_buy,
        open_sell: s.open_sell,
        high_buy: s.high_buy,
        low_buy: s.low_buy,
        change_buy: s.change_buy,
        change_pct: s.change_pct,
      }));
    }
    return dbHistory.map(p => ({
      label: fmtTimeStr(p.time),
      fullDate: fmtDateStr(p.date),
      buy: p.buy,
      sell: p.sell,
    }));
  }, [dbHistory, dailySummaries, isSummaryTab]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    if (isDayTab) {
      const buyNow = current?.buy ?? 0;
      const sellNow = current?.sell ?? 0;
      const first = dbHistory[0];
      const last = dbHistory[dbHistory.length - 1];
      const change = first ? buyNow - first.buy : 0;
      const changePct = first && first.buy ? ((change / first.buy) * 100).toFixed(2) : null;
      const openPoint = dbHistory.find(p => p.is_open) || first;
      const closePoint = [...dbHistory].reverse().find(p => p.is_close) || last;
      return {
        type: 'day' as const,
        buy: buyNow, sell: sellNow, change, changePct,
        openBuy: openPoint?.buy ?? 0,
        openTime: openPoint ? `${fmtTimeStr(openPoint.time)}` : '—',
        openDate: openPoint ? fmtDateStr(openPoint.date) : '',
        closeBuy: closePoint?.buy ?? 0,
        closeTime: closePoint ? `${fmtTimeStr(closePoint.time)}` : '—',
        closeDate: closePoint ? fmtDateStr(closePoint.date) : '',
      };
    } else {
      const buyNow = current?.buy ?? 0;
      const first = dailySummaries[0];
      const last = dailySummaries[dailySummaries.length - 1];
      const allHigh = dailySummaries.map(d => d.high_buy).filter(v => v > 0);
      const allLow = dailySummaries.map(d => d.low_buy).filter(v => v > 0);
      const highVal = allHigh.length ? Math.max(...allHigh) : 0;
      const lowVal = allLow.length ? Math.min(...allLow) : 0;
      const highDay = dailySummaries.find(d => d.high_buy === highVal);
      const lowDay = dailySummaries.find(d => d.low_buy === lowVal);
      return {
        type: 'period' as const,
        currentBuy: buyNow,
        openBuy: first?.open_buy ?? 0,
        openDate: first ? fmtDateShort(first.date) : '—',
        closeBuy: last?.close_buy ?? 0,
        closeDate: last ? fmtDateShort(last.date) : '—',
        highBuy: highVal,
        highDate: highDay ? fmtDateShort(highDay.date) : '—',
        lowBuy: lowVal,
        lowDate: lowDay ? fmtDateShort(lowDay.date) : '—',
      };
    }
  }, [current, dbHistory, dailySummaries, isDayTab]);

  /* ── History table ── */
  const historyTable = useMemo(() => {
    if (isSummaryTab) {
      return dailySummaries.slice().reverse().map(s => ({
        type: 'summary' as const,
        date: fmtDateStr(s.date),
        open_buy: s.open_buy, open_sell: s.open_sell,
        close_buy: s.close_buy, close_sell: s.close_sell,
        high_buy: s.high_buy, low_buy: s.low_buy,
        change_buy: s.change_buy, change_pct: s.change_pct,
        isUp: s.close_buy > s.open_buy,
        isDown: s.close_buy < s.open_buy,
      }));
    }
    return dbHistory.slice().reverse().map((r, i, arr) => {
      const prev = arr[i + 1];
      return {
        type: 'point' as const,
        time: fmtTimeStr(r.time),
        date: fmtDateStr(r.date),
        buy: r.buy,
        sell: r.sell,
        diff: prev ? r.buy - prev.buy : 0,
        is_open: r.is_open,
        is_close: r.is_close,
      };
    });
  }, [dbHistory, dailySummaries, isSummaryTab]);

  const visibleHistory = expanded ? historyTable : historyTable.slice(0, 5);

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
          {stats.type === 'day' ? (
            <>
              <StatCard label="GIÁ MUA" value={fmt(stats.buy)} sub="nghìn đ" color={BUY_COLOR} />
              <StatCard label="GIÁ BÁN" value={fmt(stats.sell)} sub="nghìn đ" color={SELL_COLOR} />
              <StatCard
                label="THAY ĐỔI"
                value={stats.change === 0 ? '—' : `${stats.change > 0 ? '+' : ''}${fmt(stats.change)}`}
                sub={stats.changePct ? `${Number(stats.changePct) > 0 ? '+' : ''}${stats.changePct}%` : undefined}
                color={stats.change > 0 ? BUY_COLOR : stats.change < 0 ? SELL_COLOR : undefined}
              />
              <StatCard label="MỞ CỬA hôm nay" value={fmt(stats.openBuy)} sub={stats.openTime} subExtra={stats.openDate} />
              <StatCard label="ĐÓNG CỬA gần nhất" value={fmt(stats.closeBuy)} sub={stats.closeTime} subExtra={stats.closeDate} />
            </>
          ) : (
            <>
              <StatCard label="GIÁ HIỆN TẠI" value={fmt(stats.currentBuy)} color={ACTIVE_BG} />
              <StatCard label="MỞ KỲ đầu kỳ" value={fmt(stats.openBuy)} sub={stats.openDate} />
              <StatCard label="ĐÓNG KỲ gần nhất" value={fmt(stats.closeBuy)} sub={stats.closeDate} />
              <StatCard label="CAO KỲ" value={fmt(stats.highBuy)} sub={stats.highDate} color={BUY_COLOR} />
              <StatCard label="THẤP KỲ" value={fmt(stats.lowBuy)} sub={stats.lowDate} color={SELL_COLOR} />
            </>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Period Selector — 4 buttons only */}
          <div className="flex flex-wrap gap-1.5 px-3 py-2.5 border-b border-border/40">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setExpanded(false); }}
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
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[yMin, yMax]} tickFormatter={fmt} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, name: string) => [fmt(v), name === 'buy' ? 'Giá Mua' : 'Giá Bán']}
                    labelFormatter={(_l: string, payload: any[]) => {
                      if (!payload?.length) return _l;
                      const p = payload[0]?.payload;
                      if (!p) return _l;
                      if (isDayTab) return `${p.label}  ${p.fullDate}`;
                      const extra = [];
                      if (p.open_buy) extra.push(`Mở cửa: ${fmt(p.open_buy)} / ${fmt(p.open_sell)}`);
                      if (p.buy) extra.push(`Đóng cửa: ${fmt(p.buy)} / ${fmt(p.sell)}`);
                      if (p.high_buy) extra.push(`Cao nhất: ${fmt(p.high_buy)}`);
                      if (p.low_buy) extra.push(`Thấp nhất: ${fmt(p.low_buy)}`);
                      if (p.change_buy) extra.push(`Thay đổi: ${p.change_buy > 0 ? '+' : ''}${fmt(p.change_buy)} (${p.change_pct > 0 ? '+' : ''}${p.change_pct}%)`);
                      return `${p.fullDate}\n${extra.join('\n')}`;
                    }}
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

          {/* History Table */}
          {visibleHistory.length > 0 && (
            <div className="border-t border-border/40 overflow-x-auto">
              <table className="w-full" style={{ fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="bg-secondary/50 text-foreground">
                    {isSummaryTab ? (
                      <>
                        <th className="text-left px-3 py-2 font-semibold">Ngày</th>
                        <th className="text-right px-3 py-2 font-semibold">Mở cửa</th>
                        <th className="text-right px-3 py-2 font-semibold">Đóng cửa</th>
                        {!isMobile && <th className="text-right px-3 py-2 font-semibold">Cao</th>}
                        {!isMobile && <th className="text-right px-3 py-2 font-semibold">Thấp</th>}
                        <th className="text-right px-3 py-2 font-semibold">Thay đổi</th>
                      </>
                    ) : (
                      <>
                        <th className="text-left px-3 py-2 font-semibold">Thời gian</th>
                        <th className="text-right px-3 py-2 font-semibold">Giá Mua</th>
                        <th className="text-right px-3 py-2 font-semibold">Giá Bán</th>
                        <th className="text-right px-3 py-2 font-semibold">Thay đổi</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visibleHistory.map((r: any, i: number) => {
                    if (r.type === 'summary') {
                      const rowBg = r.isUp ? 'rgba(29,158,117,0.06)' : r.isDown ? 'rgba(216,90,48,0.06)' : undefined;
                      return (
                        <tr key={i} className="border-t border-border/30 transition-colors hover:bg-secondary/20" style={rowBg ? { backgroundColor: rowBg } : undefined}>
                          <td className="px-3 py-2">{r.date}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.open_buy)}/{fmt(r.open_sell)}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.close_buy)}/{fmt(r.close_sell)}</td>
                          {!isMobile && <td className="px-3 py-2 text-right">{fmt(r.high_buy)}</td>}
                          {!isMobile && <td className="px-3 py-2 text-right">{fmt(r.low_buy)}</td>}
                          <td className="px-3 py-2 text-right font-medium"><DiffCell diff={r.change_buy} pct={r.change_pct} /></td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={i} className="border-t border-border/30 transition-colors hover:bg-secondary/20">
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.time}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            {r.date}
                            {r.is_open && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: 'rgba(29,158,117,0.15)', color: '#0f7a5a' }}>MỞ</span>}
                            {r.is_close && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: 'rgba(216,90,48,0.15)', color: '#b04420' }}>ĐÓNG</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right" style={{ color: BUY_COLOR }}>{fmt(r.buy)}</td>
                        <td className="px-3 py-2 text-right" style={{ color: SELL_COLOR }}>{fmt(r.sell)}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {i === visibleHistory.length - 1 ? '—' : <DiffCell diff={r.diff} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {historyTable.length > 5 && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={() => setExpanded(v => !v)}
                    className="px-4 py-1.5 text-xs font-medium text-white transition-colors"
                    style={{ backgroundColor: ACTIVE_BG, borderRadius: 6 }}
                  >
                    {expanded ? 'Rút gọn ▲' : 'Xem thêm ▼'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/40">
            <p className="text-[10px] md:text-xs text-muted-foreground text-center">
              Đơn vị: nghìn đồng/chỉ · Giá Vàng Nhẫn 9999 tại Kim Linh Jewelry · Cập nhật tự động khi có thay đổi
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

function DiffCell({ diff, pct }: { diff: number; pct?: number }) {
  if (diff === 0) return <span className="inline-flex items-center gap-0.5"><Minus className="w-3 h-3" />—</span>;
  const color = diff > 0 ? BUY_COLOR : SELL_COLOR;
  const arrow = diff > 0 ? '↑' : '↓';
  return (
    <span className="inline-flex items-center gap-0.5" style={{ color }}>
      {arrow}{diff > 0 ? '+' : ''}{fmt(diff)}
      {pct != null && pct !== 0 && <span className="text-[11px] opacity-70 ml-0.5">({pct > 0 ? '+' : ''}{pct}%)</span>}
    </span>
  );
}

function StatCard({ label, value, sub, subExtra, color }: { label: string; value: string; sub?: string; subExtra?: string; color?: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg px-3 py-2.5">
      <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide leading-tight">{label}</p>
      <p className="text-sm md:text-base font-bold mt-0.5" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      {subExtra && <p className="text-[10px] text-muted-foreground/70">{subExtra}</p>}
    </div>
  );
}

export default GoldPriceChart;