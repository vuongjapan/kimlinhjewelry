import { useBrandedSilverPrices } from "@/hooks/useBrandedSilverPrices";
import { RefreshCw, Loader2, Clock } from "lucide-react";

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  
  if (diffMin < 1) return 'Vừa cập nhật';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return date.toLocaleDateString('vi-VN');
}

export const BrandedSilverPriceCard = () => {
  const { data, loading, error, refetch } = useBrandedSilverPrices();
  const prices = data?.prices || [];
  const updatedAt = data?.updatedAt;

  return (
    <section id="gia-bac-thuong-hieu" className="bg-gradient-to-b from-secondary/30 via-background to-background border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg md:text-2xl font-display font-bold gold-text leading-tight">
              Giá Bạc Thương Hiệu
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] md:text-xs text-muted-foreground font-body">
                Cập nhật tự động mỗi 15 phút
              </p>
              {updatedAt && !loading && (
                <span className="inline-flex items-center gap-1 text-[10px] md:text-xs text-emerald-600 font-body font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(updatedAt)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-body transition-colors px-2 py-1 rounded-md hover:bg-primary/10 disabled:opacity-50"
            title="Làm mới giá"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Làm mới</span>
          </button>
        </div>

        <div className="rounded-xl border border-border/60 bg-card shadow-lg overflow-hidden">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground font-body">Đang cập nhật giá…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center px-4">
              <p className="text-sm font-body font-medium text-foreground">Không thể tải bảng giá.</p>
              <a href="tel:0986617939" className="text-sm text-primary font-body hover:underline">📞 098 661 7939</a>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-primary/10">
                      <th className="text-left px-3 md:px-4 py-2.5 font-body font-semibold text-foreground text-xs md:text-sm">Loại bạc</th>
                      <th className="text-right px-3 md:px-4 py-2.5 font-body font-semibold text-foreground text-xs md:text-sm">Mua vào</th>
                      <th className="text-right px-3 md:px-4 py-2.5 font-body font-semibold text-foreground text-xs md:text-sm">Bán ra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.slice(0, 10).map((item, i) => (
                      <tr key={i} className="border-t border-border/50 hover:bg-secondary/50 transition-colors">
                        <td className="px-3 md:px-4 py-2.5 font-body text-xs md:text-sm font-medium text-foreground">{item.type}</td>
                        <td className="px-3 md:px-4 py-2.5 font-body text-xs md:text-sm text-right text-muted-foreground">{item.buy}</td>
                        <td className="px-3 md:px-4 py-2.5 font-body text-xs md:text-sm text-right font-semibold text-foreground">{item.sell}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 md:px-4 py-2 bg-secondary/30">
                <p className="text-[10px] md:text-xs text-muted-foreground font-body text-center">
                  Đơn vị: VNĐ • Nguồn: CafeF
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
