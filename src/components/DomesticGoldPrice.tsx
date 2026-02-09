const domesticGold = [
  { type: 'Vàng SJC 9999', buy: '95.500', sell: '97.500' },
  { type: 'Vàng 24K (999.9)', buy: '95.000', sell: '96.500' },
  { type: 'Vàng 18K (750)', buy: '71.200', sell: '73.000' },
  { type: 'Vàng tây 14K (585)', buy: '55.500', sell: '57.500' },
  { type: 'Vàng tây 10K (416)', buy: '39.500', sell: '41.500' },
];

const DomesticGoldPrice = () => {
  return (
    <section id="gia-vang" className="section-padding">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Theo thị trường</p>
          <h2 className="text-3xl md:text-4xl font-display font-semibold gold-text">
            Giá Vàng Trong Nước
          </h2>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary/10">
                  <th className="text-left px-4 md:px-6 py-4 font-body font-semibold text-foreground text-sm md:text-base">Loại vàng</th>
                  <th className="text-right px-4 md:px-6 py-4 font-body font-semibold text-foreground text-sm md:text-base">Mua vào</th>
                  <th className="text-right px-4 md:px-6 py-4 font-body font-semibold text-foreground text-sm md:text-base">Bán ra</th>
                </tr>
              </thead>
              <tbody>
                {domesticGold.map((item, i) => (
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
              Đơn vị: nghìn đồng/chỉ • Nguồn: vangmlc.vn • Cập nhật: {new Date().toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DomesticGoldPrice;
