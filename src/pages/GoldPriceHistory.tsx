import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Search, Download, Trash2, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const BUY_COLOR = '#1D9E75';
const SELL_COLOR = '#D85A30';
const GOLD_COLOR = '#BA7517';
const PER_PAGE = 20;

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return '—';
  return n.toLocaleString('vi-VN');
}

function fmtDate(d: string): string {
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

interface DailySummary {
  date: string;
  open_buy: number; open_sell: number;
  close_buy: number; close_sell: number;
  high_buy: number; low_buy: number;
  change_buy: number; change_pct: number;
  point_count: number;
}

interface PricePoint {
  id: string; date: string; time: string;
  buy_price: number; sell_price: number;
  is_open: boolean; is_close: boolean; is_after_hours: boolean;
}

const GoldPriceHistory = () => {
  const { isAdmin } = useAdmin();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl md:text-2xl font-display font-bold text-foreground mb-1">
          📊 Lịch Sử Giá Vàng Nhẫn 9999
        </h1>
        <p className="text-sm text-muted-foreground mb-4">Dữ liệu thực tế tại Kim Linh Jewelry</p>

        <Tabs defaultValue="lookup">
          <TabsList className="mb-4">
            <TabsTrigger value="lookup" className="data-[state=active]:text-white" style={{ '--tw-bg-opacity': 1 } as any}>
              🔍 Tra Cứu Giá
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="backup" className="data-[state=active]:text-white">
                💾 Quản Lý Sao Lưu
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="lookup">
            <LookupTab isMobile={isMobile} />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="backup">
              <BackupTab isMobile={isMobile} />
            </TabsContent>
          )}
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

/* ═══════ TAB 1: Tra Cứu Giá ═══════ */
function LookupTab({ isMobile }: { isMobile: boolean }) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [detailDate, setDetailDate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from('gold_daily_summary')
      .select('*')
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: false });
    setData((rows as DailySummary[]) || []);
    setPage(0);
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setPreset = (days: number) => {
    const to = new Date();
    const from = new Date(); from.setDate(from.getDate() - days);
    setFromDate(from.toISOString().split('T')[0]);
    setToDate(to.toISOString().split('T')[0]);
  };

  const paged = data.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(data.length / PER_PAGE);

  // Summary stats
  const summary = useMemo(() => {
    if (!data.length) return null;
    const first = data[data.length - 1];
    const last = data[0];
    const allHigh = data.map(d => d.high_buy);
    const allLow = data.map(d => d.low_buy).filter(v => v > 0);
    const change = last.close_buy - first.open_buy;
    const changePct = first.open_buy > 0 ? (change / first.open_buy) * 100 : 0;
    return {
      startBuy: first.open_buy,
      startSell: first.open_sell,
      endBuy: last.close_buy,
      endSell: last.close_sell,
      high: Math.max(...allHigh),
      low: allLow.length ? Math.min(...allLow) : 0,
      change,
      changePct: Math.round(changePct * 100) / 100,
      totalDays: data.length,
    };
  }, [data]);

  // Chart data (ascending for chart) — 4 lines
  const chartData = useMemo(() =>
    [...data].reverse().map(d => ({
      date: fmtDate(d.date),
      close_buy: d.close_buy,
      close_sell: d.close_sell,
      open_buy: d.open_buy,
      open_sell: d.open_sell,
    })), [data]);

  const yDomain = useMemo<[number, number]>(() => {
    const vals = chartData.flatMap(d => [d.close_buy, d.close_sell, d.open_buy, d.open_sell]).filter(v => v > 0);
    if (!vals.length) return [0, 1];
    return [Math.min(...vals) - 200, Math.max(...vals) + 200];
  }, [chartData]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Từ ngày</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="border border-border rounded-md px-2 py-1.5 text-sm bg-background" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Đến ngày</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="border border-border rounded-md px-2 py-1.5 text-sm bg-background" />
        </div>
        <Button size="sm" onClick={fetchData} className="gap-1" style={{ backgroundColor: GOLD_COLOR }}>
          <Search className="w-3.5 h-3.5" /> Tìm kiếm
        </Button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {[
          { label: 'Hôm nay', days: 0 },
          { label: '7 ngày', days: 7 },
          { label: '30 ngày', days: 30 },
          { label: '3 tháng', days: 90 },
          { label: '6 tháng', days: 180 },
          { label: '1 năm', days: 365 },
        ].map(p => (
          <button key={p.label} onClick={() => setPreset(p.days)}
            className="px-3 py-1 text-xs border border-border rounded-md hover:bg-[#BA7517]/10 transition-colors">
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <>
          {/* Mini Chart */}
          {chartData.length >= 2 && (
            <div className="mb-4 rounded-lg border border-border bg-card p-2">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} width={55} domain={yDomain} />
                  <Tooltip
                    formatter={(v: number, name: string) => {
                      const map: Record<string, string> = {
                        close_buy: 'Mua đóng', close_sell: 'Bán đóng',
                        open_buy: 'Mua mở', open_sell: 'Bán mở',
                      };
                      return [fmt(v), map[name] || name];
                    }}
                  />
                  <Line type="monotone" dataKey="close_buy" stroke={BUY_COLOR} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="close_sell" stroke={SELL_COLOR} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="open_buy" stroke={BUY_COLOR} strokeWidth={1.5} strokeDasharray="4 3" dot={false} strokeOpacity={0.6} />
                  <Line type="monotone" dataKey="open_sell" stroke={SELL_COLOR} strokeWidth={1.5} strokeDasharray="4 3" dot={false} strokeOpacity={0.6} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-4 h-0.5" style={{ background: BUY_COLOR }} /> Mua đóng</span>
                <span className="flex items-center gap-1"><span className="w-4 h-0.5" style={{ background: SELL_COLOR }} /> Bán đóng</span>
                <span className="flex items-center gap-1"><span className="w-4 border-t border-dashed" style={{ borderColor: BUY_COLOR }} /> Mua mở</span>
                <span className="flex items-center gap-1"><span className="w-4 border-t border-dashed" style={{ borderColor: SELL_COLOR }} /> Bán mở</span>
              </div>
            </div>
          )}

          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4`}>
            {/* Table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full border-collapse" style={{ fontSize: 13 }}>
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left px-3 py-2 font-semibold">Ngày</th>
                    <th className="text-right px-3 py-2 font-semibold">Mở cửa<br/><span className="text-[10px] font-normal text-muted-foreground">Mua / Bán</span></th>
                    <th className="text-right px-3 py-2 font-semibold">Đóng cửa<br/><span className="text-[10px] font-normal text-muted-foreground">Mua / Bán</span></th>
                    {!isMobile && <th className="text-right px-3 py-2 font-semibold">Cao<br/><span className="text-[10px] font-normal text-muted-foreground">(mua)</span></th>}
                    {!isMobile && <th className="text-right px-3 py-2 font-semibold">Thấp<br/><span className="text-[10px] font-normal text-muted-foreground">(mua)</span></th>}
                    <th className="text-right px-3 py-2 font-semibold">+/-</th>
                    {!isMobile && <th className="text-right px-3 py-2 font-semibold">Điểm</th>}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r, i) => (
                    <tr key={r.date}
                      onClick={() => setDetailDate(r.date)}
                      className="border-t border-border/30 cursor-pointer hover:bg-secondary/20 transition-colors"
                      style={{ backgroundColor: r.close_buy > r.open_buy ? 'rgba(29,158,117,0.05)' : r.close_buy < r.open_buy ? 'rgba(216,90,48,0.05)' : undefined }}>
                      <td className="px-3 py-2">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{fmt(r.open_buy)} / {fmt(r.open_sell)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{fmt(r.close_buy)} / {fmt(r.close_sell)}</td>
                      {!isMobile && <td className="px-3 py-2 text-right">{fmt(r.high_buy)}</td>}
                      {!isMobile && <td className="px-3 py-2 text-right">{fmt(r.low_buy)}</td>}
                      <td className="px-3 py-2 text-right">
                        <span style={{ color: r.change_buy > 0 ? BUY_COLOR : r.change_buy < 0 ? SELL_COLOR : undefined }}>
                          {r.change_buy === 0 ? '—' : `${r.change_buy > 0 ? '+' : ''}${fmt(r.change_buy)}`}
                        </span>
                      </td>
                      {!isMobile && <td className="px-3 py-2 text-right text-muted-foreground">{r.point_count}</td>}
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Không có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-3">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" /> Trước
                  </Button>
                  <span className="text-xs text-muted-foreground">{page + 1}/{totalPages}</span>
                  <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    Sau <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Summary box */}
            {summary && !isMobile && (
              <div className="w-56 shrink-0 border border-border rounded-lg p-3 bg-card h-fit" style={{ fontSize: 13 }}>
                <p className="font-semibold text-sm mb-2">Tóm tắt kỳ</p>
                <div className="space-y-1.5 text-muted-foreground">
                  <Row label="Đầu kỳ — Mua" value={fmt(summary.startBuy)} />
                  <Row label="Đầu kỳ — Bán" value={fmt(summary.startSell)} />
                  <Row label="Cuối kỳ — Mua" value={fmt(summary.endBuy)} />
                  <Row label="Cuối kỳ — Bán" value={fmt(summary.endSell)} />
                  <Row label="Cao nhất (mua)" value={fmt(summary.high)} />
                  <Row label="Thấp nhất (mua)" value={fmt(summary.low)} />
                  <Row label="Thay đổi kỳ" value={`${summary.change > 0 ? '+' : ''}${fmt(summary.change)} (${summary.changePct > 0 ? '+' : ''}${summary.changePct}%)`}
                    color={summary.change > 0 ? BUY_COLOR : summary.change < 0 ? SELL_COLOR : undefined} />
                  <Row label="Tổng ngày" value={String(summary.totalDays)} />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {detailDate && (
        <DayDetailModal date={detailDate} onClose={() => setDetailDate(null)} />
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-medium" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

/* ═══ Day Detail Modal ═══ */
function DayDetailModal({ date, onClose }: { date: string; onClose: () => void }) {
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('gold_price_history')
      .select('*')
      .eq('date', date)
      .order('time', { ascending: true })
      .then(({ data }) => {
        setPoints((data as PricePoint[]) || []);
        setLoading(false);
      });
  }, [date]);

  const chartData = points.map(p => ({
    time: p.time.slice(0, 5),
    buy: Number(p.buy_price),
    sell: Number(p.sell_price),
  }));

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết ngày {fmtDate(date)}</DialogTitle>
          <DialogDescription>Tất cả các điểm giá trong ngày</DialogDescription>
        </DialogHeader>
        {loading ? <Skeleton className="h-40" /> : (
          <>
            {chartData.length >= 2 && (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} width={55} />
                  <Tooltip formatter={(v: number, n: string) => [fmt(v), n === 'buy' ? 'Mua' : 'Bán']} />
                  <Line dataKey="buy" stroke={BUY_COLOR} strokeWidth={2} dot={{ r: 2 }} />
                  <Line dataKey="sell" stroke={SELL_COLOR} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
            <table className="w-full mt-2" style={{ fontSize: 13 }}>
              <thead>
                <tr className="bg-secondary/50">
                  <th className="text-left px-2 py-1.5">Giờ</th>
                  <th className="text-right px-2 py-1.5">Mua</th>
                  <th className="text-right px-2 py-1.5">Bán</th>
                  <th className="text-right px-2 py-1.5">Thay đổi</th>
                  <th className="text-center px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {points.map((p, i) => {
                  const prev = points[i - 1];
                  const diff = prev ? Number(p.buy_price) - Number(prev.buy_price) : 0;
                  return (
                    <tr key={p.id} className="border-t border-border/30"
                      style={{ opacity: p.is_after_hours ? 0.5 : 1 }}>
                      <td className="px-2 py-1.5">{p.time.slice(0, 5)}</td>
                      <td className="px-2 py-1.5 text-right" style={{ color: BUY_COLOR }}>{fmt(Number(p.buy_price))}</td>
                      <td className="px-2 py-1.5 text-right" style={{ color: SELL_COLOR }}>{fmt(Number(p.sell_price))}</td>
                      <td className="px-2 py-1.5 text-right">
                        {i === 0 ? '—' : (
                          <span style={{ color: diff > 0 ? BUY_COLOR : diff < 0 ? SELL_COLOR : undefined }}>
                            {diff > 0 ? '+' : ''}{fmt(diff)}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs">
                        {p.is_open && <span className="text-[#1D9E75]">Mở cửa</span>}
                        {p.is_close && <span className="text-[#D85A30]">Đóng cửa</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════ TAB 2: Quản Lý Sao Lưu (Admin) ═══════ */
function BackupTab({ isMobile }: { isMobile: boolean }) {
  const [stats, setStats] = useState<{
    totalDays: number; daysWithOC: number; totalPoints: number; oldestDate: string | null;
  } | null>(null);
  const [monthlies, setMonthlies] = useState<{ month: string; days: number; points: number }[]>([]);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [monthDetails, setMonthDetails] = useState<DailySummary[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteCount, setDeleteCount] = useState(0);

  const loadStats = useCallback(async () => {
    const { data: summaries } = await supabase
      .from('gold_daily_summary')
      .select('*')
      .order('date', { ascending: true });
    if (!summaries) return;

    const totalDays = summaries.length;
    const daysWithOC = summaries.filter(s => s.open_buy > 0 && s.close_buy > 0).length;
    const totalPoints = summaries.reduce((sum, s) => sum + (s.point_count || 0), 0);
    const oldestDate = summaries.length ? summaries[0].date : null;

    setStats({ totalDays, daysWithOC, totalPoints, oldestDate });

    // Group by month
    const byMonth: Record<string, { days: number; points: number }> = {};
    summaries.forEach(s => {
      const m = s.date.slice(0, 7); // YYYY-MM
      if (!byMonth[m]) byMonth[m] = { days: 0, points: 0 };
      byMonth[m].days++;
      byMonth[m].points += s.point_count || 0;
    });
    setMonthlies(Object.entries(byMonth).reverse().map(([month, v]) => ({ month, ...v })));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const loadMonthDetails = async (month: string) => {
    if (expandedMonth === month) { setExpandedMonth(null); return; }
    setExpandedMonth(month);
    const { data } = await supabase
      .from('gold_daily_summary')
      .select('*')
      .gte('date', `${month}-01`)
      .lte('date', `${month}-31`)
      .order('date', { ascending: true });
    setMonthDetails((data as DailySummary[]) || []);
  };

  const exportCSV = async (monthOnly?: string) => {
    let query = supabase.from('gold_daily_summary').select('*').order('date', { ascending: true });
    if (monthOnly) {
      query = query.gte('date', `${monthOnly}-01`).lte('date', `${monthOnly}-31`);
    }
    const { data } = await query;
    if (!data?.length) return;
    const header = 'date,open_buy,open_sell,close_buy,close_sell,high,low,change,pct,points\n';
    const rows = data.map(d =>
      `${d.date},${d.open_buy},${d.open_sell},${d.close_buy},${d.close_sell},${d.high_buy},${d.low_buy},${d.change_buy},${d.change_pct},${d.point_count}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url;
    a.download = `kimlinh_gold_history_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const prepareDelete = async () => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const { count } = await supabase
      .from('gold_price_history')
      .select('id', { count: 'exact', head: true })
      .lt('date', cutoff.toISOString().split('T')[0]);
    setDeleteCount(count || 0);
    setConfirmDelete(true);
  };

  const doDelete = async () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-gold-price`;
    // Call cleanup via edge function would need new endpoint; for now use RPC
    await supabase.rpc('cleanup_old_gold_data' as any);
    setConfirmDelete(false);
    loadStats();
  };

  const getStatus = (s: DailySummary) => {
    if (s.open_buy > 0 && s.close_buy > 0 && s.point_count >= 3) return { icon: '✅', label: 'Đủ' };
    if (s.point_count < 2) return { icon: '🔴', label: 'Ít điểm' };
    return { icon: '⚠️', label: 'Thiếu' };
  };

  if (!stats) return <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div>
      {/* 4 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MiniCard label="Tổng ngày lưu" value={String(stats.totalDays)} />
        <MiniCard label="Ngày đủ O/C" value={String(stats.daysWithOC)} />
        <MiniCard label="Tổng điểm" value={String(stats.totalPoints)} />
        <MiniCard label="Ngày cũ nhất" value={stats.oldestDate ? fmtDate(stats.oldestDate) : '—'} />
      </div>

      {/* Tools */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Button size="sm" variant="outline" onClick={() => exportCSV()} className="gap-1">
          <Download className="w-3.5 h-3.5" /> Xuất CSV toàn bộ
        </Button>
        {monthlies[0] && (
          <Button size="sm" variant="outline" onClick={() => exportCSV(monthlies[0].month)} className="gap-1">
            <Download className="w-3.5 h-3.5" /> Xuất CSV tháng này
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={prepareDelete} className="gap-1 text-destructive">
          <Trash2 className="w-3.5 h-3.5" /> Xóa dữ liệu cũ hơn 1 năm
        </Button>
        <Button size="sm" variant="outline" onClick={loadStats} className="gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Kiểm tra & vá dữ liệu
        </Button>
      </div>

      {/* Monthly accordion */}
      <div className="space-y-1">
        {monthlies.map(m => {
          const [y, mm] = m.month.split('-');
          const label = `Tháng ${mm}/${y}`;
          const isOpen = expandedMonth === m.month;
          return (
            <div key={m.month} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => loadMonthDetails(m.month)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-secondary/30 transition-colors"
              >
                <span>{isOpen ? '▼' : '▶'} {label} ({m.days} ngày • {m.points} điểm)</span>
              </button>
              {isOpen && (
                <div className="border-t border-border/40 overflow-x-auto">
                  <table className="w-full" style={{ fontSize: 13 }}>
                    <thead>
                      <tr className="bg-secondary/40">
                        <th className="text-left px-3 py-1.5">Ngày</th>
                        <th className="text-right px-3 py-1.5">Mở</th>
                        <th className="text-right px-3 py-1.5">Đóng</th>
                        <th className="text-right px-3 py-1.5">Điểm</th>
                        <th className="text-center px-3 py-1.5">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthDetails.map(d => {
                        const st = getStatus(d);
                        return (
                          <tr key={d.date} className="border-t border-border/30">
                            <td className="px-3 py-1.5">{fmtDate(d.date)}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(d.open_buy)}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(d.close_buy)}</td>
                            <td className="px-3 py-1.5 text-right">{d.point_count}</td>
                            <td className="px-3 py-1.5 text-center text-xs">{st.icon} {st.label}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa dữ liệu cũ</DialogTitle>
            <DialogDescription>
              Sẽ xóa {deleteCount} điểm giá cũ hơn 1 năm. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Hủy</Button>
            <Button variant="destructive" onClick={doDelete}>Xóa</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg px-3 py-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}

export default GoldPriceHistory;