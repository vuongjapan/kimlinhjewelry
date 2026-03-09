import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, BarChart3, Shield, Target, Newspaper, Brain, AlertTriangle } from 'lucide-react';

interface KeyIndicator {
  name: string;
  value: string;
  signal: string;
  explanation: string;
}

interface AnalysisData {
  goldPrice: string;
  goldChange: string;
  silverPrice: string;
  silverChange: string;
  overallSignal: string;
  signalColor: string;
  technicalSummary: string;
  trendAnalysis: string;
  keyIndicators: KeyIndicator[];
  supportResistance: {
    support1?: string;
    support2?: string;
    resistance1?: string;
    resistance2?: string;
  };
  geopoliticalImpact: string;
  aiPrediction: string;
  recommendation: string;
  silverAnalysis: string;
  newsHighlights: string[];
  disclaimer: string;
  updatedAt: string;
  error?: string;
}

const ANALYSIS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-market-analysis`;
const AUTH_HEADER = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

function getSignalIcon(signal: string) {
  const s = signal?.toLowerCase() || '';
  if (s.includes('mua') || s.includes('buy') || s.includes('tăng')) return <TrendingUp className="w-5 h-5" />;
  if (s.includes('bán') || s.includes('sell') || s.includes('giảm')) return <TrendingDown className="w-5 h-5" />;
  return <Minus className="w-5 h-5" />;
}

function getSignalBg(color: string) {
  if (color === 'green') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  if (color === 'red') return 'bg-red-500/10 text-red-400 border-red-500/30';
  return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
}

function getIndicatorColor(signal: string) {
  const s = signal?.toLowerCase() || '';
  if (s.includes('mua') || s.includes('buy')) return 'text-emerald-400';
  if (s.includes('bán') || s.includes('sell')) return 'text-red-400';
  if (s.includes('overbought') || s.includes('quá mua')) return 'text-amber-400';
  return 'text-muted-foreground';
}

const MarketAnalysis = () => {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(ANALYSIS_URL, { headers: AUTH_HEADER });
      if (!res.ok) throw new Error('Không thể tải dữ liệu');
      const result = await res.json();
      if (result.error && !result.goldPrice) throw new Error(result.error);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalysis(); }, []);

  return (
    <section id="phan-tich" className="py-12 md:py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-body text-primary font-medium">Phân tích kỹ thuật AI</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Phân Tích Xu Hướng Vàng & Bạc
          </h2>
          <p className="text-muted-foreground font-body text-sm max-w-xl mx-auto">
            Dữ liệu từ Investing.com • AI phân tích và đưa nhận định
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground font-body text-sm">Đang phân tích dữ liệu thị trường...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-destructive font-body mb-4">{error}</p>
            <button onClick={fetchAnalysis} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-body text-sm hover:bg-primary/90">
              Thử lại
            </button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Price Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Gold Price */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-body text-muted-foreground">XAU/USD</span>
                  <span className="text-xs font-body text-muted-foreground">Vàng thế giới</span>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{data.goldPrice}</p>
                <p className={`text-sm font-body mt-1 ${data.goldChange?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {data.goldChange}
                </p>
              </div>

              {/* Silver Price */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-body text-muted-foreground">XAG/USD</span>
                  <span className="text-xs font-body text-muted-foreground">Bạc thế giới</span>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{data.silverPrice}</p>
                <p className={`text-sm font-body mt-1 ${data.silverChange?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {data.silverChange}
                </p>
              </div>

              {/* Overall Signal */}
              <div className={`rounded-xl p-5 border shadow-sm ${getSignalBg(data.signalColor)}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-body opacity-80">Tín hiệu tổng quan</span>
                  {getSignalIcon(data.overallSignal)}
                </div>
                <p className="text-2xl font-display font-bold">{data.overallSignal}</p>
                <p className="text-xs font-body mt-1 opacity-70">Dựa trên 12+ chỉ báo kỹ thuật</p>
              </div>
            </div>

            {/* Technical Summary */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-foreground">Tóm tắt phân tích kỹ thuật</h3>
              </div>
              <p className="font-body text-foreground/90 leading-relaxed">{data.technicalSummary}</p>
            </div>

            {/* Two Column: Trend + Support/Resistance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trend Analysis */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">Xu hướng giá</h3>
                </div>
                <p className="font-body text-foreground/90 leading-relaxed text-sm">{data.trendAnalysis}</p>
              </div>

              {/* Support/Resistance */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">Hỗ trợ & Kháng cự</h3>
                </div>
                <div className="space-y-3">
                  {data.supportResistance?.resistance2 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-body text-red-400">Kháng cự 2</span>
                      <span className="font-body font-semibold text-red-400">${data.supportResistance.resistance2}</span>
                    </div>
                  )}
                  {data.supportResistance?.resistance1 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-body text-red-400">Kháng cự 1</span>
                      <span className="font-body font-semibold text-red-400">${data.supportResistance.resistance1}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-border my-2" />
                  {data.supportResistance?.support1 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-body text-emerald-400">Hỗ trợ 1</span>
                      <span className="font-body font-semibold text-emerald-400">${data.supportResistance.support1}</span>
                    </div>
                  )}
                  {data.supportResistance?.support2 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-body text-emerald-400">Hỗ trợ 2</span>
                      <span className="font-body font-semibold text-emerald-400">${data.supportResistance.support2}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Key Indicators */}
            {data.keyIndicators && data.keyIndicators.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">Chỉ báo kỹ thuật chính</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.keyIndicators.map((ind, i) => (
                    <div key={i} className="bg-secondary/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-body font-semibold text-sm text-foreground">{ind.name}</span>
                        <span className={`text-xs font-body font-medium ${getIndicatorColor(ind.signal)}`}>{ind.signal}</span>
                      </div>
                      <p className="text-lg font-display font-bold text-foreground">{ind.value}</p>
                      <p className="text-xs font-body text-muted-foreground mt-1">{ind.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Geopolitical Impact */}
            {data.geopoliticalImpact && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">Tác động địa chính trị</h3>
                </div>
                <p className="font-body text-foreground/90 leading-relaxed text-sm">{data.geopoliticalImpact}</p>
              </div>
            )}

            {/* AI Prediction + Recommendation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">Nhận định & Dự báo AI</h3>
                </div>
                <p className="font-body text-foreground/90 leading-relaxed text-sm">{data.aiPrediction}</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">Khuyến nghị</h3>
                </div>
                <p className="font-body text-foreground/90 leading-relaxed text-sm">{data.recommendation}</p>
                {data.silverAnalysis && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-body text-muted-foreground mb-1">Bạc XAG/USD</p>
                    <p className="font-body text-foreground/80 text-sm">{data.silverAnalysis}</p>
                  </div>
                )}
              </div>
            </div>

            {/* News Highlights */}
            {data.newsHighlights && data.newsHighlights.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Newspaper className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">Tin tức nổi bật</h3>
                </div>
                <ul className="space-y-2">
                  {data.newsHighlights.map((news, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="font-body text-foreground/80 text-sm">{news}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer + Update Time */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{data.disclaimer || 'Thông tin chỉ mang tính tham khảo, không phải lời khuyên đầu tư.'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-body">Cập nhật: {data.updatedAt}</span>
                <button
                  onClick={fetchAnalysis}
                  disabled={loading}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default MarketAnalysis;
