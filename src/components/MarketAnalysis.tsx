import { useEffect, useRef, useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, BarChart3, AlertTriangle,
  Loader2, RefreshCw, Newspaper, Globe, ClipboardList, Target, Activity, Brain, CheckCircle2,
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatVN, timeVNWithSeconds } from '@/utils/vietnam-time';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const API_URL = `${SUPABASE_URL}/functions/v1/fetch-market-analysis`;
const AUTO_URL = `${SUPABASE_URL}/functions/v1/auto-update-gold-analysis`;
const AUTH = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, 'Content-Type': 'application/json' };

type Indicator = { name: string; value: string; signal: string; group?: string };
type SourceMeta = {
  source?: string; fetched_at?: string; source_timestamp?: string;
  raw_price?: number; closes_count?: number; last_close?: number;
  data_age_hours?: number; ai_called_at?: string; ai_status?: string;
};
type MetalData = {
  price: number; change: number; change_pct: number;
  high_24h: number; low_24h: number; trend: string; signal: string;
  short_trend?: string; mid_trend?: string; long_trend?: string;
  indicators: Indicator[]; support: number[]; resistance: number[];
  summary: string; source_meta?: SourceMeta;
};
type NewsItem = { title: string; impact: string; detail: string };
type MacroData = { fed_rate: string; usd_index: string; president_policy: string; geopolitical: string };
type AnalysisRow = {
  id: string; created_at: string;
  gold_data: MetalData; silver_data: MetalData;
  news_data: { news: NewsItem[]; macro: MacroData; ai_created_at?: string };
  trigger_type?: string;
};

// ---------- helpers ----------
const sigKind = (s: string): 'buy_strong' | 'buy' | 'neutral' | 'sell' | 'sell_strong' => {
  const l = (s || '').toLowerCase();
  if (l.includes('mua mạnh')) return 'buy_strong';
  if (l.includes('bán mạnh')) return 'sell_strong';
  if (l.includes('mua')) return 'buy';
  if (l.includes('bán')) return 'sell';
  return 'neutral';
};

const sigBg: Record<string, string> = {
  buy_strong: 'bg-[#1D9E75] text-white',
  buy: 'bg-[#5DCAA5] text-white',
  neutral: 'bg-[#BA7517] text-white',
  sell: 'bg-[#F0997B] text-white',
  sell_strong: 'bg-[#D85A30] text-white',
};

const sigText: Record<string, string> = {
  buy_strong: 'MUA MẠNH',
  buy: 'MUA',
  neutral: 'TRUNG LẬP',
  sell: 'BÁN',
  sell_strong: 'BÁN MẠNH',
};

const smallBadge = (s: string) => {
  const k = sigKind(s);
  if (k === 'buy_strong' || k === 'buy') return 'bg-[#1D9E75]/15 text-[#1D9E75]';
  if (k === 'sell_strong' || k === 'sell') return 'bg-[#D85A30]/15 text-[#D85A30]';
  return 'bg-[#888780]/15 text-[#888780]';
};

const trendIcon = (t: string) => {
  const l = (t || '').toLowerCase();
  if (l.includes('tăng')) return { icon: <TrendingUp className="w-4 h-4" />, color: 'text-[#1D9E75]', label: l.includes('mạnh') ? 'TĂNG MẠNH' : 'TĂNG' };
  if (l.includes('giảm')) return { icon: <TrendingDown className="w-4 h-4" />, color: 'text-[#D85A30]', label: l.includes('mạnh') ? 'GIẢM MẠNH' : 'GIẢM' };
  return { icon: <Minus className="w-4 h-4" />, color: 'text-[#888780]', label: 'NGANG' };
};

const impactBadge = (i: string) => {
  const l = i?.toLowerCase() || '';
  if (l.includes('tích cực')) return 'bg-[#1D9E75]/10 text-[#1D9E75]';
  if (l.includes('tiêu cực')) return 'bg-[#D85A30]/10 text-[#D85A30]';
  return 'bg-[#888780]/10 text-[#888780]';
};

// ---------- TradingView Quote ----------
function TVQuote({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || ref.current.querySelector('script')) return;
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
    s.async = true;
    s.innerHTML = JSON.stringify({ symbol, width: '100%', isTransparent: true, colorTheme: 'light', locale: 'vi_VN' });
    ref.current.appendChild(s);
  }, [symbol]);
  return <div ref={ref} className="tradingview-widget-container"><div className="tradingview-widget-container__widget" /></div>;
}

// ---------- Card: Overall Signal ----------
function OverallSignalCard({ data }: { data: MetalData }) {
  const counts = { buy: 0, sell: 0, neutral: 0 };
  (data.indicators || []).forEach(i => {
    const k = sigKind(i.signal);
    if (k === 'buy' || k === 'buy_strong') counts.buy++;
    else if (k === 'sell' || k === 'sell_strong') counts.sell++;
    else counts.neutral++;
  });
  const total = counts.buy + counts.sell + counts.neutral || 1;
  const k = sigKind(data.signal);
  // gauge fill: 0..1 from sell_strong to buy_strong
  const score = (counts.buy - counts.sell) / total; // -1..1
  const pct = Math.max(0, Math.min(100, ((score + 1) / 2) * 100));

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col">
      <h3 className="font-display font-semibold text-sm text-[#BA7517] mb-3">Tín hiệu tổng quan</h3>
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className={`px-5 py-2 rounded-full font-bold text-base shadow-sm ${sigBg[k]}`}>
          {k === 'buy' || k === 'buy_strong' ? '🟢 ' : k === 'sell' || k === 'sell_strong' ? '🔴 ' : '🟡 '}
          {sigText[k]}
        </div>
        <p className="text-xs text-muted-foreground">Dựa trên {total} chỉ báo kỹ thuật</p>
        <div className="grid grid-cols-3 gap-2 w-full text-center text-xs">
          <div className="bg-[#1D9E75]/10 rounded-lg py-2">
            <div className="font-bold text-[#1D9E75] text-base">{counts.buy}</div>
            <div className="text-[#1D9E75] text-[10px]">Mua</div>
          </div>
          <div className="bg-[#888780]/10 rounded-lg py-2">
            <div className="font-bold text-[#888780] text-base">{counts.neutral}</div>
            <div className="text-[#888780] text-[10px]">Trung lập</div>
          </div>
          <div className="bg-[#D85A30]/10 rounded-lg py-2">
            <div className="font-bold text-[#D85A30] text-base">{counts.sell}</div>
            <div className="text-[#D85A30] text-[10px]">Bán</div>
          </div>
        </div>
        <div className="w-full mt-2">
          <div className="relative h-2 rounded-full bg-gradient-to-r from-[#D85A30] via-[#BA7517] to-[#1D9E75]">
            <div
              className="absolute -top-1 w-4 h-4 rounded-full bg-foreground border-2 border-background shadow"
              style={{ left: `calc(${pct}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>Bán mạnh</span><span>Mua mạnh</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Card: Technical Summary ----------
function TechnicalSummaryCard({ data }: { data: MetalData }) {
  const ma = (data.indicators || []).filter(i => i.group === 'ma');
  const osc = (data.indicators || []).filter(i => i.group !== 'ma');

  const renderRow = (ind: Indicator, i: number) => {
    const k = sigKind(ind.signal);
    return (
      <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 py-1.5 px-2 rounded bg-secondary/40 text-[12px]">
        <span className="font-medium text-foreground truncate">{ind.name}</span>
        <span className="font-mono text-muted-foreground">{ind.value}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${smallBadge(ind.signal)}`}>
          {sigText[k]}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-[#BA7517]" />
        <h3 className="font-display font-semibold text-[#BA7517]">Tóm tắt phân tích kỹ thuật</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-[#BA7517] mb-2 uppercase tracking-wide">Đường trung bình</h4>
          <div className="space-y-1">
            {ma.length ? ma.map(renderRow) : <p className="text-xs text-muted-foreground italic">Đang cập nhật…</p>}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-bold text-[#BA7517] mb-2 uppercase tracking-wide">Dao động & Xu hướng</h4>
          <div className="space-y-1">
            {osc.length ? osc.map(renderRow) : <p className="text-xs text-muted-foreground italic">Đang cập nhật…</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Card: Trends ----------
function TrendsCard({ data }: { data: MetalData }) {
  const items = [
    { label: 'Ngắn hạn', range: '1-7 ngày', trend: data.short_trend || data.trend || '' },
    { label: 'Trung hạn', range: '1-4 tuần', trend: data.mid_trend || '' },
    { label: 'Dài hạn', range: '1-6 tháng', trend: data.long_trend || '' },
  ];
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-[#BA7517]" />
        <h3 className="font-display font-semibold text-[#BA7517]">Xu hướng giá</h3>
      </div>
      <div className="space-y-3">
        {items.map((it, i) => {
          const t = trendIcon(it.trend);
          return (
            <div key={i} className="flex items-center justify-between py-3 px-3 rounded-lg bg-secondary/40">
              <div>
                <div className="font-semibold text-sm text-foreground">{it.label}</div>
                <div className="text-[11px] text-muted-foreground">({it.range})</div>
              </div>
              <div className={`flex items-center gap-1.5 font-bold ${t.color}`}>
                {t.icon}<span className="text-sm">{t.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Card: Support/Resistance ----------
function SupportResistanceCard({ data }: { data: MetalData }) {
  const supports = (data.support || []).slice().sort((a, b) => b - a); // closest to price first
  const resistances = (data.resistance || []).slice().sort((a, b) => a - b);
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-[#BA7517]" />
        <h3 className="font-display font-semibold text-[#BA7517]">Hỗ trợ & Kháng cự</h3>
      </div>
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-[#D85A30] uppercase tracking-wide">Kháng cự</div>
        {resistances.slice().reverse().map((r, i) => (
          <div key={i} className="flex items-center justify-between bg-[#D85A30]/5 rounded px-3 py-1.5 text-sm">
            <span className="font-mono text-[#D85A30] font-semibold">R{resistances.length - i}</span>
            <span className="font-mono text-foreground font-bold">${r.toLocaleString()}</span>
          </div>
        ))}
        <div className="my-3 flex items-center justify-between bg-[#BA7517]/10 border border-[#BA7517]/30 rounded-lg px-3 py-2">
          <span className="text-[11px] font-bold text-[#BA7517]">► Giá hiện tại</span>
          <span className="font-mono text-foreground font-bold">${typeof data.price === 'number' ? data.price.toLocaleString() : data.price}</span>
        </div>
        <div className="text-[11px] font-bold text-[#1D9E75] uppercase tracking-wide">Hỗ trợ</div>
        {supports.map((s, i) => (
          <div key={i} className="flex items-center justify-between bg-[#1D9E75]/5 rounded px-3 py-1.5 text-sm">
            <span className="font-mono text-[#1D9E75] font-semibold">S{i + 1}</span>
            <span className="font-mono text-foreground font-bold">${s.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Card: AI Analysis ----------
function AICard({ data, news }: { data: MetalData; news?: { news: NewsItem[]; macro: MacroData } }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-[#BA7517]" />
        <h3 className="font-display font-semibold text-[#BA7517]">Nhận định & Dự báo AI</h3>
      </div>
      {data.summary ? (
        <p className="text-sm text-foreground/90 leading-relaxed mb-4">{data.summary}</p>
      ) : (
        <Skeleton className="h-16 w-full mb-4" />
      )}
      {news?.news && news.news.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#BA7517] uppercase">
            <Newspaper className="w-3.5 h-3.5" /> Tin tức ảnh hưởng
          </div>
          {news.news.slice(0, 5).map((n, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${impactBadge(n.impact)}`}>{n.impact}</span>
              <div>
                <p className="text-[13px] font-medium text-foreground leading-snug">{n.title}</p>
                {n.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{n.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {news?.macro && (
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {[
            { label: 'Fed', value: news.macro.fed_rate },
            { label: 'USD Index', value: news.macro.usd_index },
            { label: 'Chính sách', value: news.macro.president_policy },
            { label: 'Địa chính trị', value: news.macro.geopolitical },
          ].map((m, i) => m.value && (
            <div key={i} className="bg-secondary/40 rounded px-2 py-1.5">
              <span className="text-muted-foreground">{m.label}: </span>
              <span className="text-foreground font-medium">{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Card: Recommendation ----------
function RecommendationCard({ data }: { data: MetalData }) {
  const k = sigKind(data.signal);
  const recoText: Record<string, string> = {
    buy_strong: 'NÊN MUA MẠNH', buy: 'NÊN MUA', neutral: 'CHỜ TÍN HIỆU',
    sell: 'NÊN BÁN', sell_strong: 'NÊN BÁN MẠNH',
  };
  // bullets from indicators
  const ind = data.indicators || [];
  const bullets: string[] = [];
  const ma = ind.filter(i => i.group === 'ma');
  if (ma.length) {
    const buys = ma.filter(i => sigKind(i.signal).startsWith('buy')).length;
    if (buys >= ma.length - 1) bullets.push(`Giá nằm trên ${buys}/${ma.length} đường MA — xu hướng tích cực`);
    else if (buys <= 1) bullets.push(`Giá dưới ${ma.length - buys}/${ma.length} đường MA — áp lực giảm`);
    else bullets.push(`MA hỗn hợp (${buys}/${ma.length} mua) — xu hướng chưa rõ`);
  }
  const rsi = ind.find(i => i.name.toLowerCase().includes('rsi'));
  if (rsi) bullets.push(`RSI ${rsi.value} — ${rsi.signal}`);
  const macd = ind.find(i => i.name.toLowerCase().includes('macd'));
  if (macd) bullets.push(`MACD ${macd.value} — ${macd.signal}`);

  const supports = (data.support || []).slice().sort((a, b) => b - a);
  const resistances = (data.resistance || []).slice().sort((a, b) => a - b);
  const entryLow = data.price ? Math.round(data.price * 0.995) : 0;
  const entryHigh = data.price ? Math.round(data.price * 1.005) : 0;
  const stopLoss = supports[0] || (data.price ? Math.round(data.price * 0.98) : 0);
  const target1 = resistances[0] || (data.price ? Math.round(data.price * 1.02) : 0);
  const target2 = resistances[1] || (data.price ? Math.round(data.price * 1.035) : 0);

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-[#BA7517]" />
        <h3 className="font-display font-semibold text-[#BA7517]">Khuyến nghị</h3>
      </div>
      <div className={`inline-flex px-4 py-2 rounded-full font-bold text-sm shadow-sm mb-3 ${sigBg[k]}`}>
        {k === 'buy' || k === 'buy_strong' ? '🟢 ' : k === 'sell' || k === 'sell_strong' ? '🔴 ' : '🟡 '}
        {recoText[k]}
      </div>
      <ul className="space-y-1.5 mb-4 text-sm">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-foreground/90">
            <span className="text-[#BA7517] mt-0.5">•</span><span className="leading-snug">{b}</span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-1 gap-1.5 text-[13px] bg-secondary/40 rounded-lg p-3">
        <div className="flex justify-between"><span className="text-muted-foreground">Vào lệnh:</span><span className="font-mono font-semibold text-foreground">${entryLow.toLocaleString()} - ${entryHigh.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Cắt lỗ:</span><span className="font-mono font-semibold text-[#D85A30]">${stopLoss.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Mục tiêu:</span><span className="font-mono font-semibold text-[#1D9E75]">${target1.toLocaleString()} - ${target2.toLocaleString()}</span></div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground italic flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> Chỉ mang tính tham khảo, không phải tư vấn đầu tư
      </p>
    </div>
  );
}

// ---------- Admin Debug ----------
function AdminDebugInfo({ data, onForce, onLogs, loading, raw, logs }: { data: AnalysisRow; onForce: () => void; onLogs: () => void; loading: boolean; raw: unknown; logs: unknown[] }) {
  const meta = data.gold_data?.source_meta;
  const fmt = (v?: string) => v ? formatVN(v) : '—';
  return (
    <div className="rounded-xl border border-dashed border-[#BA7517]/40 bg-[#BA7517]/5 p-4 text-sm">
      <div className="mb-3 flex items-center gap-2 font-semibold text-[#BA7517]"><ClipboardList className="h-4 w-4" /> 🔧 Debug (admin)</div>
      <div className="grid gap-1 text-xs text-foreground sm:grid-cols-2">
        <span>Yahoo timestamp: <b>{fmt(meta?.source_timestamp)}</b></span>
        <span>Giá raw: <b>{meta?.raw_price ? `$${meta.raw_price}` : '—'}</b></span>
        <span>Closes: <b>{meta?.closes_count ?? '—'}</b></span>
        <span>AI gọi lúc: <b>{fmt(meta?.ai_called_at)}</b></span>
        <span>AI status: <b>{meta?.ai_status || '—'}</b></span>
        <span>Backend lưu: <b>{fmt(data.created_at)}</b></span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={onForce} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-[#BA7517] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Force Fetch
        </button>
        <button onClick={onLogs} className="inline-flex items-center gap-2 rounded-full border border-[#BA7517]/30 px-4 py-2 text-xs font-semibold text-[#BA7517]">📋 Logs</button>
      </div>
      {logs.length > 0 ? <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-background/80 p-3 text-[11px] text-muted-foreground">{JSON.stringify(logs, null, 2)}</pre> : null}
      {raw ? <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-background/80 p-3 text-[11px] text-muted-foreground">{JSON.stringify(raw, null, 2)}</pre> : null}
    </div>
  );
}

// ---------- Live VN Clock ----------
function VNClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-foreground">
      {timeVNWithSeconds(now)} {now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
    </span>
  );
}

// ---------- Main ----------
const MarketAnalysis = () => {
  const { isAdmin } = useAdmin();
  const [data, setData] = useState<AnalysisRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugRaw, setDebugRaw] = useState<unknown>(null);
  const [debugLogs, setDebugLogs] = useState<unknown[]>([]);
  const [tab, setTab] = useState<'gold' | 'silver'>('gold');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL, { method: 'POST', headers: AUTH, body: JSON.stringify({ mode: 'read' }) });
      const json = await res.json();
      if (json && json.gold_data) setData(json); else setData(null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    setGenerating(true); setError(null);
    try {
      const res = await fetch(AUTO_URL, { method: 'POST', headers: AUTH, body: JSON.stringify({ mode: 'generate', trigger_type: 'manual', force: true }) });
      const json = await res.json();
      setDebugRaw(json);
      if (json.error) {
        setError(json.error === 'AI_CREDITS_EXHAUSTED' ? 'AI hết credits.'
          : json.error === 'AI_RATE_LIMITED' ? 'AI đang quá tải.'
          : `Lỗi: ${json.error}`);
      }
      await fetchData();
    } catch { setError('Không thể kết nối.'); }
    finally { setGenerating(false); }
  };

  const handleShowLogs = async () => {
    const { data: logs } = await supabase.from('gold_analysis_log').select('*').order('created_at', { ascending: false }).limit(10);
    setDebugLogs(logs || []);
  };

  useEffect(() => { fetchData(); }, []);

  const active = tab === 'gold' ? data?.gold_data : data?.silver_data;

  return (
    <section id="phan-tich" className="py-12 md:py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-body text-primary font-medium">Phân tích chuyên sâu</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Phân Tích Xu Hướng Vàng & Bạc
          </h2>
          <p className="text-xs text-muted-foreground">Dữ liệu Investing/Yahoo · AI phân tích và đưa nhận định</p>

          {/* Asset toggle */}
          <div className="mt-4 inline-flex gap-2">
            <button
              onClick={() => setTab('gold')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${tab === 'gold' ? 'bg-[#BA7517] text-white' : 'bg-secondary text-foreground'}`}
            >🥇 Vàng (XAU/USD)</button>
            <button
              onClick={() => setTab('silver')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${tab === 'silver' ? 'bg-[#BA7517] text-white' : 'bg-secondary text-foreground'}`}
            >🥈 Bạc (XAG/USD)</button>
          </div>

          {isAdmin && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="ml-2 mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#BA7517]/40 text-[#BA7517] text-xs font-semibold hover:bg-[#BA7517]/10 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {generating ? 'Đang phân tích…' : 'Cập nhật phân tích'}
            </button>
          )}
          {error && <p className="text-sm text-[#D85A30] mt-2">{error}</p>}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" />
          </div>
        ) : !data || !active ? (
          <div className="text-center py-16">
            <div className="inline-block bg-[#BA7517]/10 border border-[#BA7517]/30 rounded-xl px-8 py-6">
              <p className="text-2xl mb-2">📊</p>
              <p className="font-semibold text-foreground mb-1">Chưa có dữ liệu phân tích</p>
              <p className="text-sm text-muted-foreground">Đang chờ admin cập nhật</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Row 1: 3 cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold text-sm text-[#BA7517]">XAU/USD</h3>
                  <span className="text-[11px] text-muted-foreground">Vàng thế giới</span>
                </div>
                <TVQuote symbol="OANDA:XAUUSD" />
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold text-sm text-[#BA7517]">XAG/USD</h3>
                  <span className="text-[11px] text-muted-foreground">Bạc thế giới</span>
                </div>
                <TVQuote symbol="OANDA:XAGUSD" />
              </div>
              <OverallSignalCard data={active} />
            </div>

            {/* Row 2: full width technical summary */}
            <TechnicalSummaryCard data={active} />

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TrendsCard data={active} />
              <SupportResistanceCard data={active} />
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AICard data={active} news={data.news_data} />
              <RecommendationCard data={active} />
            </div>

            {isAdmin && <AdminDebugInfo data={data} onForce={handleGenerate} onLogs={handleShowLogs} loading={generating} raw={debugRaw} logs={debugLogs} />}

            {/* Footer */}
            <div className="pt-4 border-t border-border/60 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Thông tin chỉ mang tính tham khảo, không phải lời khuyên đầu tư.
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  Cập nhật: <VNClock /> <RefreshCw className="w-3 h-3" />
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Giá: TradingView · Phân tích: Yahoo Finance + AI · Lịch sử: Kim Linh Jewelry
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MarketAnalysis;
