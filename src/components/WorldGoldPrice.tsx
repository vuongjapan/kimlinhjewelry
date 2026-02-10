import { TrendingUp, TrendingDown } from 'lucide-react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useGoldPrices } from '@/hooks/useGoldPrices';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const WorldGoldPrice = () => {
  const { data, loading, error } = useGoldPrices();
  const [priceHistory, setPriceHistory] = useState<Array<{ time: string; price: number }>>([]);

  const worldGold = data?.worldGold;
  const currentPrice = worldGold?.price ?? 0;
  const change = worldGold?.change ?? 0;
  const changePercent = worldGold?.changePercent ?? 0;
  const isUp = change >= 0;

  // Build a simple price history from updates
  useEffect(() => {
    if (currentPrice > 0) {
      setPriceHistory(prev => {
        const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const newEntry = { time: now, price: currentPrice };
        const updated = [...prev, newEntry];
        // Keep last 12 data points
        return updated.slice(-12);
      });
    }
  }, [currentPrice]);

  // Generate display data - if only 1 point, create a synthetic chart
  const chartData = priceHistory.length >= 2
    ? priceHistory
    : currentPrice > 0
      ? [
          { time: '', price: currentPrice - Math.abs(change) },
          { time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), price: currentPrice },
        ]
      : [];

  return (
    <section id="gia-vang-the-gioi" className="section-padding bg-card">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Cập nhật liên tục</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-semibold gold-text">
            Giá Vàng Thế Giới
          </h2>
        </div>

        <div className="glass-card p-6 md:p-10">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground font-body">Đang tải giá vàng...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16 text-sm text-muted-foreground font-body">{error}</div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground font-body mb-1">XAU/USD • Spot Gold</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground">
                      ${currentPrice.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground font-body">/oz</span>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  <span className="text-lg font-body font-semibold">
                    {isUp ? '+' : ''}{change.toFixed(2)} ({changePercent}%)
                  </span>
                </div>
              </div>

              {chartData.length >= 2 && (
                <div className="h-[300px] md:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(37, 45%, 60%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(37, 45%, 60%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(30, 8%, 50%)' }}
                      />
                      <YAxis
                        domain={['dataMin - 10', 'dataMax + 10']}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(30, 8%, 50%)' }}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(40, 30%, 98%)',
                          border: '1px solid hsl(37, 20%, 88%)',
                          borderRadius: '8px',
                          fontSize: '14px',
                        }}
                        formatter={(value: number) => [`$${value}`, 'Giá']}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="hsl(37, 45%, 60%)"
                        strokeWidth={2.5}
                        fill="url(#goldGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center mt-4 font-body">
                Giá mang tính tham khảo {worldGold?.updatedAt && `• Cập nhật: ${new Date(worldGold.updatedAt).toLocaleTimeString('vi-VN')}`}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default WorldGoldPrice;
