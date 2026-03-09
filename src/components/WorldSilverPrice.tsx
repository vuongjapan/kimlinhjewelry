import { useEffect, useRef, useState } from 'react';

const WorldSilverPrice = () => {
  const tickerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartVisible, setChartVisible] = useState(false);

  useEffect(() => {
    if (!tickerRef.current || tickerRef.current.querySelector('script')) return;
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: 'OANDA:XAGUSD',
      width: '100%',
      isTransparent: true,
      colorTheme: 'light',
      locale: 'vi_VN',
    });
    tickerRef.current.appendChild(script);
  }, []);

  // Lazy load chart when visible
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setChartVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="gia-bac-the-gioi" className="section-padding">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Cập nhật theo thời gian thực</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-semibold gold-text">
            Giá Bạc Thế Giới
          </h2>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-border/50">
            <div ref={tickerRef} className="tradingview-widget-container">
              <div className="tradingview-widget-container__widget"></div>
            </div>
          </div>

          <div ref={chartContainerRef} className="w-full" style={{ height: '500px' }}>
            {chartVisible ? (
              <iframe
                src="https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=vi_VN#%7B%22autosize%22%3Atrue%2C%22symbol%22%3A%22OANDA%3AXAGUSD%22%2C%22timezone%22%3A%22Asia%2FHo_Chi_Minh%22%2C%22theme%22%3A%22light%22%2C%22style%22%3A%221%22%2C%22hide_top_toolbar%22%3Afalse%2C%22hide_legend%22%3Afalse%2C%22withdateranges%22%3Atrue%2C%22range%22%3A%221M%22%2C%22allow_symbol_change%22%3Afalse%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%7D"
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                title="Biểu đồ XAG/USD"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-secondary/20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
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

export default WorldSilverPrice;
