import { useEffect, useRef } from 'react';

const WorldGoldPrice = () => {
  const tickerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // TradingView Ticker Tape widget for real-time price
  useEffect(() => {
    if (!tickerRef.current || tickerRef.current.querySelector('script')) return;
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: 'OANDA:XAUUSD',
      width: '100%',
      isTransparent: true,
      colorTheme: 'light',
      locale: 'vi_VN',
    });
    tickerRef.current.appendChild(script);
  }, []);

  return (
    <section id="gia-vang-the-gioi" className="section-padding bg-card">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Cập nhật theo thời gian thực</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-semibold gold-text">
            Giá Vàng Thế Giới
          </h2>
        </div>

        <div className="glass-card overflow-hidden">
          {/* TradingView Single Quote — real-time price */}
          <div className="px-4 md:px-6 py-4 border-b border-border/50">
            <div ref={tickerRef} className="tradingview-widget-container">
              <div className="tradingview-widget-container__widget"></div>
            </div>
          </div>

          {/* TradingView Advanced Chart */}
          <div className="w-full" style={{ height: '500px' }}>
            <iframe
              src="https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=vi_VN#%7B%22autosize%22%3Atrue%2C%22symbol%22%3A%22OANDA%3AXAUUSD%22%2C%22interval%22%3A%223%22%2C%22timezone%22%3A%22Asia%2FHo_Chi_Minh%22%2C%22theme%22%3A%22light%22%2C%22style%22%3A%221%22%2C%22withdateranges%22%3Atrue%2C%22allow_symbol_change%22%3Afalse%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%7D"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="Biểu đồ XAU/USD"
              loading="lazy"
            />
          </div>

          <div className="px-4 md:px-6 py-3 bg-secondary/30">
            <p className="text-xs text-muted-foreground font-body text-center">
              Giá mang tính tham khảo • Nguồn: TradingView (OANDA) • Cập nhật real-time
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorldGoldPrice;
