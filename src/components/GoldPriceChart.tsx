import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, LineChart as ChartIcon } from 'lucide-react';
import { useGoldPrices } from '@/hooks/useGoldPrices';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  saveGoldPrice, extractCurrentPrice,
  getStoragePoints, getMonthlyPoints, getQuickStats,
  formatDate,
  type GoldPricePoint, type GoldMonthPoint,
} from '@/utils/gold-price-storage';

type TabId = '30P' | '1H' | '1N' | '1T' | '1Th' | '3Th' | '1Y';

const TABS: { id: TabId; label: string; sub: string }[] = [
  { id: '30P',  label: '30P',  sub: '30 phút' },
  { id: '1H',   label: '1H',   sub: '1 giờ' },
  { id: '1N',   label: '1N',   sub: '1 ngày' },
  { id: '1T',   label: '1T',   sub: '1 tuần' },
  { id: '1Th',  label: '1Th',  sub: '1 tháng' },
  { id: '3Th',  label: '3Th',  sub: '3 tháng' },
  { id: '1Y',   label: '1N',   sub: '1 năm' },
];

const SAVE_INTERVAL_MS = 30 * 60 * 1000;

function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN');
}

function changeColor(diff: number) {
  if (diff > 0) return 'text-emerald-600';
  if (diff < 0) return 'text-red-500';
  return 'text-muted-foreground';
}

function changeIcon(diff: number) {
  if (diff > 0) return <TrendingUp className="w-3.5 h-3.5" />;
  if (diff < 0) return <TrendingDown className="w-3.5 h-3.5" />;
  return <Minus className="w-3.5 h-3.5" />;
}

const GoldPriceChart = () => {
  const { data: goldData } = useGoldPrices();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<TabId>('1N');
  const [tick, setTick] = useState(0); // re-render khi storage thay đổi

  // ---- Auto-save mỗi khi giá thay đổi & mỗi 30 phút ----
  useEffect(() => {
    if (!goldData?.prices?.length) return;
    const cur = extractCurrentPrice(goldData.prices);
    if (!cur) return;
    saveGoldPrice(cur.buy, cur.sell);
    setTick(t => t + 1);
  }, [goldData]);

  useEffect(() => {
    const id = setInterval(() => {
      const cur = goldData?.prices ? extractCurrentPrice(goldData.prices) : null;
      if (cur) {
        saveGoldPrice(cur.buy, cur.sell);
        setTick(t => t + 1);
      }
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [goldData]);

  // ---- Dữ liệu cho biểu đồ ----
  const { chartData, ohlc, isOhlc, totalPoints } = useMemo(() => {
    void tick; // depend on tick to refresh
    let raw: GoldPricePoint[] = [];
    let isMonthView = false;

    switch (tab) {
      case '30P': raw = getStoragePoints('per30min'); break;
      case '1H':  raw = getStoragePoints('perHour'); break;
      case '1N':  raw = getStoragePoints('perDay').slice(-30); break;
      case '1T': {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        raw = getStoragePoints('perDay').filter(p => p.timestamp >= oneWeekAgo);
        break;
      }
      case '1Th': isMonthView = true; break;
      case '3Th': isMonthView = true; break;
      case '1Y':  isMonthView = true; break;
    }

    if (isMonthView) {
      const all = getMonthlyPoints();
      const limit = tab === '1Th' ? 1 : tab === '3Th' ? 3 : 12;
      const slice = all.slice(-limit);
      const data = slice.map(m => ({
        label: m.month,
        buyPrice: m.closeBuy,
        sellPrice: m.closeSell,
      }));
      return { chartData: data, ohlc: slice, isOhlc: true, totalPoints: slice.length };
    }

    const data = raw.map(p => ({
      label: tab === '30P' || tab === '1H'
        ? p.datetime.split(' ')[1] // chỉ giờ
        : formatDate(p.timestamp).slice(0, 5), // dd/mm
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
      datetime: p.datetime,
    }));
    return { chartData: data, ohlc: [] as GoldMonthPoint[], isOhlc: false, totalPoints: raw.length };
  }, [tab, tick]);

  // ---- Stats ----
  const stats = useMemo(() => { void tick; return getQuickStats(); }, [tick]);

  // ---- Bảng lịch sử ----
  const historyRows = useMemo(() => {
    void tick;
    if (isOhlc) {
      const rows = ohlc.slice().reverse().map((m, i, arr) => {
        const prev = arr[i + 1];
        const change = prev ? m.closeBuy - prev.closeBuy : 0;
        return { ...m, change };
      });
      return rows;
    }
    let raw: GoldPricePoint[] = [];
    if (tab === '30P') raw = getStoragePoints('per30min');
    else if (tab === '1H') raw = getStoragePoints('perHour');
    else if (tab === '1N') raw = getStoragePoints('perDay').slice(-30);
    else if (tab === '1T') {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      raw = getStoragePoints('perDay').filter(p => p.timestamp >= oneWeekAgo);
    }
    return raw.slice().reverse().slice(0, 20).map((p, i, arr) => {
      const prev = arr[i + 1];
      const change = prev ? p.buyPrice - prev.buyPrice : 0;
      return { ...p, change };
    });
  }, [tab, tick, isOhlc, ohlc]);

  return (
    <section className="bg-background border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <ChartIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg md:text-xl font-display font-bold text-foreground">
              📈 Lịch Sử & Xu Hướng Giá Vàng
            </h2>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground font-body mt-0.5">
            Dữ liệu thực tế tại Kim Linh Jewelry
          </p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-card shadow-sm overflow-hidden">
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/50">
            <StatCell
              label="Giá hiện tại"
              value={stats.current ? `${formatNumber(stats.current.buyPrice)}` : '—'}
              sub="nghìn đồng/chỉ"
            />
            <StatCell
              label="Thay đổi hôm nay"
              value={
                stats.todayChange == null
                  ? '—'
                  : `${stats.todayChange > 0 ? '+' : ''}${formatNumber(stats.todayChange)}`
              }
              sub={
                stats.todayChangePct == null
                  ? 'Đang thu thập'
                  : `${stats.todayChangePct > 0 ? '+' : ''}${stats.todayChangePct.toFixed(2)}%`
              }
              tone={stats.todayChange ?? 0}
            />
            <StatCell
              label="Cao nhất tháng"
              value={formatNumber(stats.monthHigh)}
              sub="nghìn đồng/chỉ"
            />
            <StatCell
              label="Thấp nhất tháng"
              value={formatNumber(stats.monthLow)}
              sub="nghìn đồng/chỉ"
            />
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 px-3 md:px-4 py-2.5 border-b border-border/40 bg-secondary/20">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-body font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/70'
                }`}
                title={t.sub}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="px-2 md:px-4 py-3">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground font-body py-12">
                Chưa đủ dữ liệu cho khung này. Hãy quay lại sau.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => formatNumber(v)}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number, name) => [formatNumber(v), name]}
                    labelFormatter={(l) => `🕐 ${l}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="buyPrice"
                    name="Giá Mua"
                    stroke="hsl(160 84% 39%)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sellPrice"
                    name="Giá Bán"
                    stroke="hsl(0 84% 60%)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* History table */}
          {historyRows.length > 0 && (
            <div className="border-t border-border/40 overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-primary/10 text-foreground">
                    {isOhlc ? (
                      <>
                        <th className="text-left px-3 py-2 font-body font-semibold">Tháng</th>
                        <th className="text-right px-3 py-2 font-body font-semibold">Mở cửa</th>
                        <th className="text-right px-3 py-2 font-body font-semibold">Đóng cửa</th>
                        <th className="text-right px-3 py-2 font-body font-semibold hidden md:table-cell">Cao nhất</th>
                        <th className="text-right px-3 py-2 font-body font-semibold hidden md:table-cell">Thấp nhất</th>
                        <th className="text-right px-3 py-2 font-body font-semibold">Thay đổi</th>
                      </>
                    ) : (
                      <>
                        <th className="text-left px-3 py-2 font-body font-semibold">Thời gian</th>
                        <th className="text-right px-3 py-2 font-body font-semibold">Giá Mua</th>
                        <th className="text-right px-3 py-2 font-body font-semibold">Giá Bán</th>
                        <th className="text-right px-3 py-2 font-body font-semibold">Thay đổi</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((r: any, i) => (
                    <tr key={i} className="border-t border-border/40 hover:bg-yellow-500/5 transition-colors">
                      {isOhlc ? (
                        <>
                          <td className="px-3 py-2 font-body font-medium">{r.month}</td>
                          <td className="px-3 py-2 text-right font-body">{formatNumber(r.openBuy)}</td>
                          <td className="px-3 py-2 text-right font-body font-semibold">{formatNumber(r.closeBuy)}</td>
                          <td className="px-3 py-2 text-right font-body hidden md:table-cell">{formatNumber(r.highBuy)}</td>
                          <td className="px-3 py-2 text-right font-body hidden md:table-cell">{formatNumber(r.lowBuy)}</td>
                          <td className={`px-3 py-2 text-right font-body font-medium ${changeColor(r.change)}`}>
                            <span className="inline-flex items-center justify-end gap-1">
                              {changeIcon(r.change)}
                              {r.change === 0 ? '—' : `${r.change > 0 ? '+' : ''}${formatNumber(r.change)}`}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 font-body">{r.datetime}</td>
                          <td className="px-3 py-2 text-right font-body">{formatNumber(r.buyPrice)}</td>
                          <td className="px-3 py-2 text-right font-body font-semibold">{formatNumber(r.sellPrice)}</td>
                          <td className={`px-3 py-2 text-right font-body font-medium ${changeColor(r.change)}`}>
                            <span className="inline-flex items-center justify-end gap-1">
                              {changeIcon(r.change)}
                              {r.change === 0 ? '—' : `${r.change > 0 ? '+' : ''}${formatNumber(r.change)}`}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="px-3 md:px-4 py-2 bg-secondary/30 border-t border-border/40">
            <p className="text-[10px] md:text-xs text-muted-foreground font-body text-center">
              {totalPoints < 7
                ? '📊 Đang thu thập dữ liệu… Biểu đồ đầy đủ sau 7 ngày hoạt động • '
                : ''}
              Dữ liệu được lưu tự động từ bảng giá Kim Linh • Cập nhật mỗi 30 phút
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

function StatCell({
  label, value, sub, tone,
}: { label: string; value: string; sub?: string; tone?: number }) {
  const toneClass = tone == null ? 'text-foreground' : changeColor(tone);
  return (
    <div className="bg-card px-3 py-3">
      <p className="text-[10px] md:text-xs text-muted-foreground font-body uppercase tracking-wide">{label}</p>
      <p className={`text-base md:text-lg font-display font-bold mt-0.5 ${toneClass}`}>{value}</p>
      {sub && <p className="text-[10px] md:text-xs text-muted-foreground font-body">{sub}</p>}
    </div>
  );
}

export default GoldPriceChart;