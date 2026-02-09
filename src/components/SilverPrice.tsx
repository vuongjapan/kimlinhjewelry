const silverPrices = [
  { type: 'Bạc 999', buy: '1.050', sell: '1.150' },
  { type: 'Bạc 925 (Sterling)', buy: '980', sell: '1.080' },
  { type: 'Bạc thỏi', buy: '1.020', sell: '1.120' },
];

const SilverPrice = () => {
  return (
    <section id="gia-bac" className="section-padding bg-card">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Cập nhật hàng ngày</p>
          <h2 className="text-3xl md:text-4xl font-display font-semibold gold-text">
            Bảng Giá Bạc Trong Nước
          </h2>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary/10">
                  <th className="text-left px-4 md:px-6 py-4 font-body font-semibold text-foreground text-sm md:text-base">Loại bạc</th>
                  <th className="text-right px-4 md:px-6 py-4 font-body font-semibold text-foreground text-sm md:text-base">Mua vào</th>
                  <th className="text-right px-4 md:px-6 py-4 font-body font-semibold text-foreground text-sm md:text-base">Bán ra</th>
                </tr>
              </thead>
              <tbody>
                {silverPrices.map((item, i) => (
                  <tr key={i} className="border-t border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="px-4 md:px-6 py-4 font-body text-sm md:text-base font-medium text-foreground">{item.type}</td>
                    <td className="px-4 md:px-6 py-4 font-body text-sm md:text-base text-right text-muted-foreground">{item.buy}</td>
                    <td className="px-4 md:px-6 py-4 font-body text-sm md:text-base text-right font-semibold text-foreground">{item.sell}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 md:px-6 py-3 bg-secondary/30">
            <p className="text-xs text-muted-foreground font-body text-center">
              Đơn vị: nghìn đồng/lượng • Nguồn: cafef.vn • Cập nhật: {new Date().toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SilverPrice;
