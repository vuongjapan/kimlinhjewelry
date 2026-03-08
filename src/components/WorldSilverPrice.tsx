import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-world-silver-price`;
const AUTH_HEADER = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

interface WorldSilverData {
  price: string;
  change: string;
  unit: string;
  vndPerOunce: string;
  updatedAt: string;
}

const WorldSilverPrice = () => {
  const [data, setData] = useState<WorldSilverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(API_URL, { headers: AUTH_HEADER });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (mounted) setData(json);
      } catch {
        if (mounted) setError('Không thể tải giá bạc thế giới');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const changeNum = data ? parseFloat(data.change.split('(')[0].trim().replace(/,/g, '')) : 0;
  const isUp = changeNum > 0;
  const isDown = changeNum < 0;

  return (
    <section id="gia-bac-the-gioi" className="section-padding">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Cập nhật liên tục</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-semibold gold-text">
            Giá Bạc Thế Giới
          </h2>
        </div>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground font-body">Đang tải giá bạc thế giới...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-sm text-muted-foreground font-body">{error}</div>
          ) : data && (
            <>
              {/* Price summary */}
              <div className="px-4 md:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border/50">
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground font-body mb-1">Bạc giao ngay (XAG/USD)</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl md:text-4xl font-display font-bold text-foreground">{data.price}</span>
                    <span className="text-sm text-muted-foreground font-body">{data.unit}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isUp ? <TrendingUp className="w-5 h-5 text-green-500" /> :
                   isDown ? <TrendingDown className="w-5 h-5 text-red-500" /> :
                   <Minus className="w-5 h-5 text-muted-foreground" />}
                  <span className={`text-sm font-body font-semibold ${
                    isUp ? 'text-green-500' : isDown ? 'text-red-500' : 'text-muted-foreground'
                  }`}>
                    {data.change}
                  </span>
                </div>
              </div>

              {/* TradingView chart */}
              <div className="w-full" style={{ height: '500px' }}>
                <iframe
                  src="https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=vi_VN#%7B%22autosize%22%3Atrue%2C%22symbol%22%3A%22OANDA%3AXAGUSD%22%2C%22timezone%22%3A%22Asia%2FHo_Chi_Minh%22%2C%22theme%22%3A%22light%22%2C%22style%22%3A%221%22%2C%22hide_top_toolbar%22%3Afalse%2C%22hide_legend%22%3Afalse%2C%22withdateranges%22%3Atrue%2C%22range%22%3A%221M%22%2C%22allow_symbol_change%22%3Afalse%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%7D"
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  title="Biểu đồ XAG/USD"
                  loading="lazy"
                />
              </div>

              <div className="px-4 md:px-6 py-3 bg-secondary/30">
                <p className="text-xs text-muted-foreground font-body text-center">
                  Giá mang tính tham khảo • Nguồn: CafeF / TradingView • Cập nhật mỗi 5 phút
                  {data.vndPerOunce && ` • 1 Ounce ≈ ${data.vndPerOunce} VNĐ`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default WorldSilverPrice;
