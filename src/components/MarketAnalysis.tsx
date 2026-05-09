 import { useEffect, useState } from 'react';
 import {
   TrendingUp, TrendingDown, Minus, BarChart3,
    AlertTriangle, Loader2, RefreshCw, Newspaper, Globe, ClipboardList,
 } from 'lucide-react';
import { Clock, Calendar } from 'lucide-react';
 import { useAdmin } from '@/hooks/useAdmin';
 import { Skeleton } from '@/components/ui/skeleton';
  import { supabase } from '@/integrations/supabase/client';
 
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const API_URL = `${SUPABASE_URL}/functions/v1/fetch-market-analysis`;
const AUTO_URL = `${SUPABASE_URL}/functions/v1/auto-update-gold-analysis`;
const AUTH = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, 'Content-Type': 'application/json' };
 
 type Indicator = { name: string; value: string; signal: string; group?: string };
 type SourceMeta = {
   source?: string; fetched_at?: string; source_timestamp?: string; source_timestamp_vn?: string;
   raw_price?: number; closes_count?: number; first_close?: number; last_close?: number;
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
 
 const signalColor = (s: string) => {
   const l = s?.toLowerCase() || '';
   if (l.includes('mua mạnh')) return 'bg-[#1D9E75]/15 text-[#1D9E75] border-[#1D9E75]/30';
   if (l.includes('mua')) return 'bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/20';
   if (l.includes('bán mạnh')) return 'bg-[#D85A30]/15 text-[#D85A30] border-[#D85A30]/30';
   if (l.includes('bán')) return 'bg-[#D85A30]/10 text-[#D85A30] border-[#D85A30]/20';
   return 'bg-[#888780]/10 text-[#888780] border-[#888780]/20';
 };
 
 const signalBadge = (s: string) => {
   const l = s?.toLowerCase() || '';
   if (l.includes('mua')) return 'bg-[#1D9E75]/15 text-[#1D9E75]';
   if (l.includes('bán')) return 'bg-[#D85A30]/15 text-[#D85A30]';
   return 'bg-[#888780]/10 text-[#888780]';
 };
 
 const trendBadge = (t: string) => {
   const l = t?.toLowerCase() || '';
   if (l.includes('tăng')) return { color: 'bg-[#1D9E75]/10 text-[#1D9E75]', icon: <TrendingUp className="w-3 h-3" /> };
   if (l.includes('giảm')) return { color: 'bg-[#D85A30]/10 text-[#D85A30]', icon: <TrendingDown className="w-3 h-3" /> };
   return { color: 'bg-[#888780]/10 text-[#888780]', icon: <Minus className="w-3 h-3" /> };
 };
 
 const impactBadge = (i: string) => {
   const l = i?.toLowerCase() || '';
   if (l.includes('tích cực')) return 'bg-[#1D9E75]/10 text-[#1D9E75]';
   if (l.includes('tiêu cực')) return 'bg-[#D85A30]/10 text-[#D85A30]';
   return 'bg-[#888780]/10 text-[#888780]';
 };
 
 function IndicatorTable({ indicators }: { indicators: Indicator[] }) {
   const groups = [
     { label: 'Đường trung bình', key: 'ma', items: indicators.filter(i => i.group === 'ma') },
     { label: 'Dao động', key: 'oscillator', items: indicators.filter(i => i.group === 'oscillator') },
     { label: 'Xu hướng', key: 'trend', items: indicators.filter(i => i.group === 'trend') },
   ];
   // Put ungrouped into trend
   const grouped = new Set(groups.flatMap(g => g.items.map(i => i.name)));
   const ungrouped = indicators.filter(i => !grouped.has(i.name));
   if (ungrouped.length) groups[2].items.push(...ungrouped);
 
   const counts = { mua: 0, ban: 0, tl: 0 };
   indicators.forEach(i => {
     const l = i.signal?.toLowerCase() || '';
     if (l.includes('mua')) counts.mua++;
     else if (l.includes('bán')) counts.ban++;
     else counts.tl++;
   });
 
   return (
     <div className="space-y-3">
       {groups.map(g => g.items.length > 0 && (
         <div key={g.key}>
           <h4 className="text-xs font-semibold text-[#BA7517] mb-1.5 uppercase tracking-wide">{g.label}</h4>
           <div className="space-y-1">
             {g.items.map((ind, i) => (
               <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-secondary/40 text-[13px]">
                 <span className="font-medium text-foreground truncate max-w-[40%]">{ind.name}</span>
                 <span className="font-mono text-muted-foreground">{ind.value}</span>
                 <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${signalBadge(ind.signal)}`}>
                   {ind.signal}
                 </span>
               </div>
             ))}
           </div>
         </div>
       ))}
       <div className="flex items-center justify-center gap-4 pt-2 text-xs font-medium">
         <span className="text-[#1D9E75]">Mua: {counts.mua}</span>
         <span className="text-[#888780]">Trung lập: {counts.tl}</span>
         <span className="text-[#D85A30]">Bán: {counts.ban}</span>
       </div>
     </div>
   );
 }
 
 function MetalSection({ data, label }: { data: MetalData; label: string }) {
   const isUp = (data.change || 0) >= 0;
   const short = trendBadge(data.short_trend || data.trend);
   const mid = trendBadge(data.mid_trend || '');
   const long = trendBadge(data.long_trend || '');
 
   return (
     <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
       <h3 className="font-display font-bold text-lg text-[#BA7517] mb-4">{label}</h3>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
         {/* Left column */}
         <div className="space-y-4">
           {/* Price */}
           <div>
             <div className="flex items-baseline gap-3">
               <span className="text-3xl font-bold font-mono text-foreground">
                 ${typeof data.price === 'number' ? data.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : data.price}
               </span>
               <span className={`text-lg font-semibold font-mono ${isUp ? 'text-[#1D9E75]' : 'text-[#D85A30]'}`}>
                 {isUp ? '+' : ''}{data.change} ({isUp ? '+' : ''}{data.change_pct}%)
               </span>
             </div>
             <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
               <span>H: ${data.high_24h}</span>
               <span>L: ${data.low_24h}</span>
             </div>
           </div>
 
           {/* Signal */}
           <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border font-semibold ${signalColor(data.signal)}`}>
             {data.signal?.toLowerCase().includes('mua') ? <TrendingUp className="w-4 h-4" /> :
              data.signal?.toLowerCase().includes('bán') ? <TrendingDown className="w-4 h-4" /> :
              <Minus className="w-4 h-4" />}
             {data.signal}
           </div>
 
           {/* Trends */}
           <div className="flex gap-2 flex-wrap">
             {[{ label: 'Ngắn hạn', ...short }, { label: 'Trung hạn', ...mid }, { label: 'Dài hạn', ...long }].map((t, i) => (
               <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${t.color}`}>
                 {t.icon} {t.label}
               </span>
             ))}
           </div>
 
           {/* Support/Resistance */}
           <div className="grid grid-cols-2 gap-2 text-xs">
             <div className="bg-[#1D9E75]/5 rounded-lg p-2">
               <div className="text-[#1D9E75] font-medium mb-1">Hỗ trợ</div>
               {data.support?.map((s, i) => (
                 <div key={i} className="font-mono text-foreground">S{i + 1}: ${s}</div>
               ))}
             </div>
             <div className="bg-[#D85A30]/5 rounded-lg p-2">
               <div className="text-[#D85A30] font-medium mb-1">Kháng cự</div>
               {data.resistance?.map((r, i) => (
                 <div key={i} className="font-mono text-foreground">R{i + 1}: ${r}</div>
               ))}
             </div>
           </div>
 
           {/* Summary */}
           <p className="text-sm text-foreground/85 leading-relaxed">{data.summary}</p>
         </div>
 
         {/* Right column: indicators */}
         <div className="max-h-[500px] overflow-y-auto pr-1">
           <IndicatorTable indicators={data.indicators || []} />
         </div>
       </div>
     </div>
   );
 }
 
 function LoadingSkeleton() {
   return (
     <div className="space-y-4">
       <Skeleton className="h-8 w-64 mx-auto" />
       <Skeleton className="h-4 w-48 mx-auto" />
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <Skeleton className="h-[400px] rounded-xl" />
         <Skeleton className="h-[400px] rounded-xl" />
       </div>
     </div>
   );
 }

  const fmtDateTimeVN = (value?: string) => value
    ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    : 'Đang cập nhật';

  const fmtUsd = (value?: number) => typeof value === 'number'
    ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

  function TimestampTransparency({ data }: { data: AnalysisRow }) {
    const meta = data.gold_data?.source_meta;
    const priceTime = meta?.source_timestamp;
    const aiTime = meta?.ai_called_at || data.news_data?.ai_created_at || data.created_at;
    const warn = priceTime && aiTime && Math.abs(new Date(aiTime).getTime() - new Date(priceTime).getTime()) > 5 * 86400000;
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card/70 px-4 py-3 text-left text-xs text-muted-foreground space-y-1">
        <p>📡 Giá lấy từ Yahoo Finance lúc: <span className="font-semibold text-foreground">{fmtDateTimeVN(priceTime)}</span></p>
        <p>🤖 Phân tích AI viết lúc: <span className="font-semibold text-foreground">{fmtDateTimeVN(aiTime)}</span></p>
        {warn && <p className="mt-2 rounded-lg border border-[#BA7517]/30 bg-[#BA7517]/10 px-3 py-2 text-[#BA7517]">⚠️ Phần phân tích text có thể chưa cập nhật theo giá mới nhất</p>}
      </div>
    );
  }

  function AdminDebugInfo({ data, onForce, onLogs, loading, raw, logs }: { data: AnalysisRow; onForce: () => void; onLogs: () => void; loading: boolean; raw: unknown; logs: unknown[] }) {
    const meta = data.gold_data?.source_meta;
    return (
      <div className="rounded-xl border border-dashed border-[#BA7517]/40 bg-[#BA7517]/5 p-4 text-sm">
        <div className="mb-3 flex items-center gap-2 font-semibold text-[#BA7517]"><ClipboardList className="h-4 w-4" /> 🔧 Debug Info (chỉ admin)</div>
        <div className="grid gap-1 text-xs text-foreground sm:grid-cols-2">
          <span>Yahoo timestamp: <b>{fmtDateTimeVN(meta?.source_timestamp)}</b></span>
          <span>Giá raw từ API: <b>{fmtUsd(meta?.raw_price)}</b></span>
          <span>Closes array: <b>{meta?.closes_count ?? '—'} điểm</b></span>
          <span>Điểm cuối mảng: <b>{fmtUsd(meta?.last_close)}</b></span>
          <span>Lưu backend lúc: <b>{fmtDateTimeVN(data.created_at)}</b></span>
          <span>Claude gọi lúc: <b>{fmtDateTimeVN(meta?.ai_called_at)}</b></span>
          <span>AI status: <b>{meta?.ai_status || '—'}</b></span>
          <span>Tuổi dữ liệu: <b>{typeof meta?.data_age_hours === 'number' ? `${meta.data_age_hours.toFixed(1)} giờ` : '—'}</b></span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={onForce} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-[#BA7517] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} 🔄 Force Fetch Ngay
          </button>
          <button onClick={onLogs} className="inline-flex items-center gap-2 rounded-full border border-[#BA7517]/30 px-4 py-2 text-xs font-semibold text-[#BA7517]">
            📋 Xem Log
          </button>
        </div>
        {logs.length > 0 ? <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-background/80 p-3 text-[11px] text-muted-foreground">{JSON.stringify(logs, null, 2)}</pre> : null}
        {raw ? <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-background/80 p-3 text-[11px] text-muted-foreground">{JSON.stringify(raw, null, 2)}</pre> : null}
      </div>
    );
  }
 
function StaleBanner({ createdAt }: { createdAt: string }) {
  const diffDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 4) return null;

  const nextUpdate = (() => {
    const now = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const dow = d.getDay();
      if (dow === 1 || dow === 3) return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
    }
    return '';
  })();

  const dateStr = new Date(createdAt).toLocaleDateString('vi-VN');

  if (diffDays > 10) {
    return (
      <div className="bg-[#D85A30]/10 border border-[#D85A30]/30 rounded-lg px-4 py-3 text-sm text-[#D85A30] mb-4">
        ⚠️ Dữ liệu có thể không còn chính xác. Vui lòng liên hệ admin.
      </div>
    );
  }

  return (
    <div className="bg-[#BA7517]/10 border border-[#BA7517]/30 rounded-lg px-4 py-3 text-sm text-[#BA7517] mb-4">
      ⚠️ Dữ liệu từ {dateStr}. Đang chờ cập nhật tự động vào {nextUpdate}.
    </div>
  );
}

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
       if (json && json.gold_data) setData(json);
       else setData(null);
     } catch (e) {
       console.error(e);
     } finally {
       setLoading(false);
     }
   };
 
   const handleGenerate = async () => {
     setGenerating(true);
     setError(null);
     try {
      const res = await fetch(AUTO_URL, { method: 'POST', headers: AUTH, body: JSON.stringify({ mode: 'generate', trigger_type: 'manual', force: true }) });
       const json = await res.json();
        setDebugRaw(json);
       if (json.error) {
          if (json.error === 'PRICE_INVALID') {
            setError(`⚠️ Dữ liệu không hợp lệ — ${json.detail || 'vui lòng thử cập nhật lại'}`);
          } else {
            setError(json.error === 'AI_CREDITS_EXHAUSTED'
           ? 'AI hết credits. Vui lòng nạp thêm.'
           : json.error === 'AI_RATE_LIMITED'
           ? 'AI đang quá tải, thử lại sau.'
           : `Lỗi: ${json.error}`);
          }
      } else if (json.success) {
          await fetchData();
       } else {
         await fetchData();
       }
     } catch (e) {
       setError('Không thể kết nối. Kiểm tra mạng.');
     } finally {
       setGenerating(false);
     }
   };

    const handleShowLogs = async () => {
      const { data: logs } = await supabase
        .from('gold_analysis_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setDebugLogs(logs || []);
    };
 
   useEffect(() => { fetchData(); }, []);
 
   const updatedAt = data?.created_at
     ? new Date(data.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
     : null;
 
   return (
     <section id="phan-tich" className="py-12 md:py-16 bg-gradient-to-b from-background to-secondary/20">
       <div className="container mx-auto px-4 max-w-6xl">
         {/* Header */}
         <div className="text-center mb-8">
           <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-4">
             <BarChart3 className="w-4 h-4 text-primary" />
             <span className="text-sm font-body text-primary font-medium">Phân tích chuyên sâu</span>
           </div>
           <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
             Phân Tích Xu Hướng Vàng & Bạc
           </h2>
           {updatedAt && (
            <p className="text-muted-foreground font-body text-sm mb-1">
               🕐 Cập nhật lúc: <span className="font-semibold text-foreground">{updatedAt}</span>
             </p>
           )}
          {data?.trigger_type && (
            <p className="text-xs mb-1" style={{ color: data.trigger_type === 'manual' ? '#BA7517' : '#888780' }}>
              {data.trigger_type === 'manual' ? '✏️ Cập nhật bởi admin' : '🔄 Tự động cập nhật'}{updatedAt ? ` lúc ${updatedAt}` : ''}
            </p>
          )}
           {data && <TimestampTransparency data={data} />}
          <p className="text-muted-foreground font-body text-xs flex items-center justify-center gap-1">
            <Calendar className="w-3 h-3" />
            🔄 Tự động cập nhật: Thứ 2 & Thứ 4 hàng tuần
          </p>
 
           {isAdmin && (
             <button
               onClick={handleGenerate}
               disabled={generating}
               className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#BA7517] text-white text-sm font-semibold hover:bg-[#BA7517]/90 disabled:opacity-50 transition-colors"
             >
               {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
               {generating ? 'Đang phân tích...' : '🔄 Cập nhật phân tích'}
             </button>
           )}
           {error && <p className="text-sm text-[#D85A30] mt-2">{error}</p>}
         </div>
 
         {loading ? (
           <LoadingSkeleton />
         ) : !data ? (
          <div className="space-y-4">
            <StaleBanner createdAt="" />
            <div className="text-center py-16 space-y-4">
              <div className="inline-block bg-[#BA7517]/10 border border-[#BA7517]/30 rounded-xl px-8 py-6">
                <p className="text-2xl mb-2">📊</p>
                <p className="font-semibold text-foreground mb-1">Chưa có dữ liệu phân tích</p>
                <p className="text-sm text-muted-foreground">Nhấn nút Cập nhật để tải thông tin mới nhất ngày hôm nay</p>
              </div>
             {isAdmin && (
               <button
                 onClick={handleGenerate}
                 disabled={generating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#BA7517] text-white text-sm font-semibold hover:bg-[#BA7517]/90 disabled:opacity-50 transition-colors"
               >
                 {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                 {generating ? 'Đang phân tích...' : 'Cập nhật lần đầu'}
               </button>
             )}
              {!isAdmin && (
                <p className="text-xs text-muted-foreground italic">Dữ liệu sẽ được admin cập nhật sớm</p>
              )}
           </div>
          </div>
         ) : (
           <div className="space-y-6">
            {data.created_at && <StaleBanner createdAt={data.created_at} />}
             {/* Tab selector */}
             <div className="flex justify-center gap-2">
               <button
                 onClick={() => setTab('gold')}
                 className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                   tab === 'gold' ? 'bg-[#BA7517] text-white' : 'bg-secondary text-foreground hover:bg-secondary/80'
                 }`}
               >
                 🥇 Vàng (XAU/USD)
               </button>
               <button
                 onClick={() => setTab('silver')}
                 className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                   tab === 'silver' ? 'bg-[#BA7517] text-white' : 'bg-secondary text-foreground hover:bg-secondary/80'
                 }`}
               >
                 🥈 Bạc (XAG/USD)
               </button>
             </div>
 
             {/* Metal section */}
             {tab === 'gold' && data.gold_data && (
               <MetalSection data={data.gold_data} label="Vàng — XAU/USD" />
             )}
             {tab === 'silver' && data.silver_data && (
               <MetalSection data={data.silver_data} label="Bạc — XAG/USD" />
             )}
 
             {/* News */}
             {data.news_data?.news?.length > 0 && (
               <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                 <div className="flex items-center gap-2 mb-4">
                   <Newspaper className="w-5 h-5 text-[#BA7517]" />
                   <h3 className="font-display font-semibold text-[#BA7517]">Tin tức ảnh hưởng hôm nay</h3>
                 </div>
                 <div className="space-y-3">
                   {data.news_data.news.map((n, i) => (
                     <div key={i} className="flex items-start gap-3">
                       <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${impactBadge(n.impact)}`}>
                         {n.impact}
                       </span>
                       <div>
                         <p className="text-sm font-medium text-foreground">{n.title}</p>
                         <p className="text-xs text-muted-foreground mt-0.5">{n.detail}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}
 
             {/* Macro */}
             {data.news_data?.macro && (
               <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                 <div className="flex items-center gap-2 mb-4">
                   <Globe className="w-5 h-5 text-[#BA7517]" />
                   <h3 className="font-display font-semibold text-[#BA7517]">Vĩ mô</h3>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                   {[
                     { label: 'Lãi suất Fed', value: data.news_data.macro.fed_rate },
                     { label: 'USD Index', value: data.news_data.macro.usd_index },
                     { label: 'Chính sách TT Mỹ', value: data.news_data.macro.president_policy },
                     { label: 'Địa chính trị', value: data.news_data.macro.geopolitical },
                   ].map((m, i) => (
                     <div key={i} className="bg-secondary/40 rounded-lg px-3 py-2">
                       <span className="text-xs text-muted-foreground">{m.label}</span>
                       <p className="text-foreground font-medium text-[13px] mt-0.5">{m.value}</p>
                     </div>
                   ))}
                 </div>
               </div>
             )}

              {isAdmin && <AdminDebugInfo data={data} onForce={handleGenerate} onLogs={handleShowLogs} loading={generating} raw={debugRaw} logs={debugLogs} />}
 
             {/* Footer */}
             <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-body pt-2">
               <AlertTriangle className="w-3.5 h-3.5" />
               <span>Phân tích bằng AI • Không phải tư vấn tài chính</span>
             </div>
           </div>
         )}
       </div>
     </section>
   );
 };
 
 export default MarketAnalysis;