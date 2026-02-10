const WorldGoldPrice = () => {
  return (
    <section id="gia-vang-the-gioi" className="section-padding bg-card">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Cập nhật liên tục</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-semibold gold-text">
            Giá Vàng Thế Giới
          </h2>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="w-full" style={{ height: '600px' }}>
            <iframe
              src="https://thietbinganhvang.com/bieudo/"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="Biểu đồ XAU/USD"
              loading="lazy"
            />
          </div>
          <div className="px-4 md:px-6 py-3 bg-secondary/30">
            <p className="text-xs text-muted-foreground font-body text-center">
              Giá mang tính tham khảo • Biểu đồ XAU/USD cập nhật theo thời gian thực
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorldGoldPrice;
