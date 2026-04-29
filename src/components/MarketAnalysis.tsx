import { useEffect, useRef, useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, BarChart3, Target,
  Brain, AlertTriangle, Sparkles, Copy, X, Loader2,
} from 'lucide-react';
import { goldAnalysisCache, type SignalColor } from '@/data/gold-analysis-cache';

const ANALYSIS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-market-analysis`;
const AUTH_HEADER = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

function getSignalIcon(signal: string) {
  const s = signal?.toLowerCase() || '';
  if (s.includes('mua') || s.includes('tăng')) return <TrendingUp className="w-5 h-5" />;
  if (s.includes('bán') || s.includes('giảm')) return <TrendingDown className="w-5 h-5" />;
  return <Minus className="w-5 h-5" />;
}

function getSignalBg(color: SignalColor) {
  if (color === 'green') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
  if (color === 'red') return 'bg-red-500/10 text-red-500 border-red-500/30';
  return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
}

function getIndicatorColor(signal: string) {
  const s = signal?.toLowerCase() || '';
  if (s.includes('mua') || s.includes('tăng') || s.includes('hỗ trợ')) return 'text-emerald-500';
  if (s.includes('bán') || s.includes('giảm') || s.includes('kháng cự')) return 'text-red-500';
  if (s.includes('bùng nổ') || s.includes('yếu')) return 'text-amber-500';
  return 'text-muted-foreground';
}

const MarketAnalysis = () => {
  const data = goldAnalysisCache;
  const goldTickerRef = useRef<HTMLDivElement>(null);
  const silverTickerRef = useRef<HTMLDivElement>(null);

  // Admin mode (?admin=true)
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminResult, setAdminResult] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [showAdminDialog, setShowAdminDialog] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setIsAdmin(params.get('admin') === 'true');
    } catch { /* noop */ }
  }, []);

  // TradingView widgets — miễn phí, giữ nguyên
  useEffect(() => {
    if (goldTickerRef.current && !goldTickerRef.current.querySelector('script')) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        symbol: 'OANDA:XAUUSD', width: '100%', isTransparent: true, colorTheme: 'light', locale: 'vi_VN',
      });
      goldTickerRef.current.appendChild(script);
    }
    if (silverTickerRef.current && !silverTickerRef.current.querySelector('script')) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        symbol: 'OANDA:XAGUSD', width: '100%', isTransparent: true, colorTheme: 'light', locale: 'vi_VN',
      });
      silverTickerRef.current.appendChild(script);
    }
  }, []);

  const handleAdminGenerate = async () => {
    setAdminLoading(true);
    setAdminError(null);
    setAdminResult(null);
    setShowAdminDialog(true);
    try {
      const res = await fetch(ANALYSIS_URL, { headers: AUTH_HEADER });
      const json = await res.json().catch(() => ({}));
      if (json.error && json.fallback) {
        setAdminError(json.error === 'AI_CREDITS_EXHAUSTED'
          ? 'AI Gateway đã hết credits. Vui lòng nạp thêm tại Settings → Workspace → Usage.'
          : 'AI tạm không khả dụng, vui lòng thử lại sau.');
      } else {
        // Build a copy-friendly TS snippet for admin
        const snippet = buildCacheSnippet(json);
        setAdminResult(snippet);
      }
    } catch (e) {
      console.error('[admin] generate failed:', e);
      setAdminError('Không gọi được AI. Kiểm tra console.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <section id="phan-tich" className="py-12 md:py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-body text-primary font-medium">Phân tích xu hướng tuần</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Phân Tích Xu Hướng Vàng & Bạc
          </h2>
          <p className="text-muted-foreground font-body text-sm max-w-xl mx-auto">
            🕐 Cập nhật: <span className="font-semibold text-foreground">{data.lastUpdated}</span>
            {' '}• Biểu đồ realtime từ TradingView
          </p>

          {isAdmin && (
            <button
              onClick={handleAdminGenerate}
              disabled={adminLoading}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-body font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {adminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              🔄 Tạo Phân Tích Mới Bằng AI
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Price Overview Cards (TradingView free) + Signal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-body text-muted-foreground">XAU/USD</span>
                <span className="text-xs font-body text-muted-foreground">Vàng thế giới</span>
              </div>
              <div ref={goldTickerRef} className="tradingview-widget-container">
                <div className="tradingview-widget-container__widget"></div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-body text-muted-foreground">XAG/USD</span>
                <span className="text-xs font-body text-muted-foreground">Bạc thế giới</span>
              </div>
              <div ref={silverTickerRef} className="tradingview-widget-container">
                <div className="tradingview-widget-container__widget"></div>
              </div>
            </div>

            <div className={`rounded-xl p-5 border shadow-sm ${getSignalBg(data.signalColor)}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-body opacity-80">Tín hiệu tổng quan</span>
                {getSignalIcon(data.signal)}
              </div>
              <p className="text-2xl font-display font-bold">{data.signal}</p>
              <p className="text-xs font-body mt-1 opacity-70">Tổng hợp từ chỉ báo kỹ thuật</p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-display font-semibold text-foreground">Tóm tắt phân tích kỹ thuật</h3>
            </div>
            <p className="font-body text-foreground/90 leading-relaxed whitespace-pre-line">{data.summary.trim()}</p>
          </div>

          {/* Price Trend + Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-foreground">Xu hướng giá</h3>
              </div>
              <p className="font-body text-foreground/90 leading-relaxed text-sm whitespace-pre-line">
                {data.priceTrend.trim()}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-foreground">Chỉ báo kỹ thuật</h3>
              </div>
              <div className="space-y-2.5">
                {data.indicators.map((ind, i) => (
                  <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="font-body font-semibold text-sm text-foreground">{ind.name}</p>
                      <p className="text-xs font-body text-muted-foreground">{ind.value}</p>
                    </div>
                    <span className={`text-xs font-body font-medium ${getIndicatorColor(ind.signal)}`}>
                      {ind.signal}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Key Factors */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="font-display font-semibold text-foreground">Yếu tố ảnh hưởng tuần này</h3>
            </div>
            <ul className="space-y-2">
              {data.keyFactors.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span className="font-body text-foreground/85 text-sm">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendation */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-display font-semibold text-foreground">Khuyến nghị</h3>
            </div>
            <p className="font-body text-foreground/90 leading-relaxed text-sm whitespace-pre-line">
              {data.recommendation.trim()}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-body pt-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Phân tích cập nhật mỗi thứ 2 hàng tuần • Không phải tư vấn tài chính</span>
          </div>
        </div>

        {/* Admin dialog */}
        {showAdminDialog && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <h4 className="font-display font-semibold text-foreground">🔄 Phân tích AI mới</h4>
                <button onClick={() => setShowAdminDialog(false)} className="p-1.5 rounded-md hover:bg-secondary">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {adminLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang gọi AI...
                  </div>
                )}
                {adminError && (
                  <div className="text-sm text-red-500 font-body">{adminError}</div>
                )}
                {adminResult && (
                  <>
                    <p className="text-sm text-muted-foreground font-body">
                      Copy đoạn dưới và dán vào <code className="bg-secondary px-1 rounded">src/data/gold-analysis-cache.ts</code>:
                    </p>
                    <pre className="bg-secondary/50 border border-border rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-words max-h-[50vh] overflow-auto">
{adminResult}
                    </pre>
                  </>
                )}
              </div>
              {adminResult && (
                <div className="px-5 py-3 border-t border-border flex justify-end">
                  <button
                    onClick={() => navigator.clipboard?.writeText(adminResult)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-body font-semibold hover:bg-primary/90"
                  >
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// Convert AI response to a cache.ts snippet that admin can paste in
function buildCacheSnippet(ai: any): string {
  const today = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const indicators = Array.isArray(ai?.keyIndicators) && ai.keyIndicators.length
    ? ai.keyIndicators.map((i: any) => `    { name: ${JSON.stringify(i.name || '')}, value: ${JSON.stringify(i.value || '')}, signal: ${JSON.stringify(i.signal || '')} },`).join('\n')
    : `    { name: 'RSI (14)', value: '—', signal: 'Trung lập' },`;

  const factors = Array.isArray(ai?.newsHighlights) && ai.newsHighlights.length
    ? ai.newsHighlights.map((n: string) => `    ${JSON.stringify(n)},`).join('\n')
    : `    'Cập nhật yếu tố tuần này',`;

  return `lastUpdated: '${today}',
signal: ${JSON.stringify(ai?.overallSignal || 'Tích lũy')},
signalColor: ${JSON.stringify(ai?.signalColor || 'yellow')},

summary: \`
  ${(ai?.technicalSummary || '').toString().trim()}
\`,

priceTrend: \`
  ${(ai?.trendAnalysis || '').toString().trim()}
\`,

keyFactors: [
${factors}
],

recommendation: \`
  ${(ai?.recommendation || '').toString().trim()}
\`,

indicators: [
${indicators}
],`;
}

export default MarketAnalysis;