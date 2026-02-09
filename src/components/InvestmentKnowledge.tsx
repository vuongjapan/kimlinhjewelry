import { BookOpen } from 'lucide-react';

const articles = [
  {
    title: 'Vì sao nên đầu tư vàng?',
    summary: 'Vàng là kênh trú ẩn an toàn khi kinh tế biến động. Giá trị vàng có xu hướng tăng dài hạn, giúp bảo toàn tài sản trước lạm phát và rủi ro tiền tệ.',
  },
  {
    title: 'Xu hướng giá vàng gần đây',
    summary: 'Giá vàng thế giới liên tục lập đỉnh mới trong năm 2025, chạm mốc gần $3,000/oz. Nhu cầu mua vàng từ các ngân hàng trung ương tăng mạnh.',
  },
  {
    title: 'Khi nào nên mua vàng?',
    summary: 'Thời điểm tốt để mua vàng là khi giá điều chỉnh giảm sau các đợt tăng mạnh. Nên mua dần đều đặn thay vì dồn một lần để giảm rủi ro.',
  },
  {
    title: 'Lưu ý khi mua vàng vật chất',
    summary: 'Luôn mua tại tiệm vàng uy tín, kiểm tra tem đóng, hóa đơn đầy đủ. Giữ hóa đơn cẩn thận để bán lại được giá tốt nhất.',
  },
];

const InvestmentKnowledge = () => {
  return (
    <section id="kien-thuc" className="section-padding bg-card">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Tham khảo</p>
          <h2 className="text-3xl md:text-4xl font-display font-semibold gold-text">
            Kiến Thức Đầu Tư Vàng
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articles.map((article, i) => (
            <div key={i} className="glass-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10 mt-0.5">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-2">{article.title}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{article.summary}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6 font-body">
          Nội dung mang tính tham khảo, không phải tư vấn tài chính • Cập nhật: {new Date().toLocaleDateString('vi-VN')}
        </p>
      </div>
    </section>
  );
};

export default InvestmentKnowledge;
