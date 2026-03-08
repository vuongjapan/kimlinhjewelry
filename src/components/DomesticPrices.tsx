import { useGoldPrices } from '@/hooks/useGoldPrices';
import { useSilverPrices } from '@/hooks/useSilverPrices';
import { Loader2, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const DomesticPrices = () => {
  const { data: goldData, loading: goldLoading, error: goldError, refetch: refetchGold } = useGoldPrices();
  const { data: silverData, loading: silverLoading, error: silverError, refetch: refetchSilver } = useSilverPrices();

  const goldPrices = goldData?.prices || [];
  const silverPrices = silverData?.prices || [];
  const goldUpdated = goldData?.updatedAt ? new Date(goldData.updatedAt).toLocaleTimeString('vi-VN') : '';
  const silverUpdated = silverData?.updatedAt ? new Date(silverData.updatedAt).toLocaleTimeString('vi-VN') : '';
  const goldIsManual = goldData?.isManual;
  const silverIsManual = silverData?.isManual;

  const renderTable = (
    items: { type: string; buy: string; sell: string; category?: string }[],
    loading: boolean,
    error: string | null,
    label: string,
    updatedAt: string,
    unit: string,
  ) => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-body">Đang cập nhật giá…</span>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center px-4">
          <p className="text-sm font-body font-medium text-foreground">Không thể tải bảng giá.</p>
          <a href="tel:0986617939" className="text-sm text-primary font-body hover:underline">📞 098 661 7939</a>
        </div>
      );
    }
    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-primary/10">
                <th className="text-left px-3 md:px-5 py-3 font-body font-semibold text-foreground text-xs md:text-sm">Loại {label}</th>
                <th className="text-right px-3 md:px-5 py-3 font-body font-semibold text-foreground text-xs md:text-sm">Mua vào</th>
                <th className="text-right px-3 md:px-5 py-3 font-body font-semibold text-foreground text-xs md:text-sm">Bán ra</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-t border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="px-3 md:px-5 py-3 font-body text-xs md:text-sm font-medium text-foreground">
                    {item.type}
                    {item.category && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{item.category}</span>
                    )}
                  </td>
                  <td className="px-3 md:px-5 py-3 font-body text-xs md:text-sm text-right text-muted-foreground">{item.buy}</td>
                  <td className="px-3 md:px-5 py-3 font-body text-xs md:text-sm text-right font-semibold text-foreground">{item.sell}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 md:px-5 py-2 bg-secondary/30">
          <p className="text-[10px] md:text-xs text-muted-foreground font-body text-center">
            Đơn vị: {unit} • Giá mang tính tham khảo{updatedAt && ` • Cập nhật: ${updatedAt}`}
          </p>
        </div>
      </>
    );
  };

  return (
    <section id="gia-vang" className="bg-gradient-to-b from-primary/5 via-background to-background border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg md:text-2xl font-display font-bold gold-text leading-tight">
              💎 Giá Vàng & Bạc tại Kim Linh
            </h2>
            <p className="text-[10px] md:text-xs text-muted-foreground font-body mt-0.5">
              Cập nhật tự động theo thị trường mỗi 5 phút
            </p>
          </div>
          <button
            onClick={() => { refetchGold(); refetchSilver(); }}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-body transition-colors px-2 py-1 rounded-md hover:bg-primary/10"
            title="Làm mới giá"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Làm mới</span>
          </button>
        </div>

        {/* Price cards */}
        <div className="rounded-xl border border-border/60 bg-card shadow-lg overflow-hidden">
          <Tabs defaultValue="gold" className="w-full">
            <div className="px-3 md:px-5 pt-3">
              <TabsList className="w-full h-9">
                <TabsTrigger value="gold" className="flex-1 font-body text-xs md:text-sm">🪙 Giá Vàng</TabsTrigger>
                <TabsTrigger value="silver" className="flex-1 font-body text-xs md:text-sm">🥈 Giá Bạc</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="gold" className="mt-0">
              {goldIsManual && (
                <div className="px-3 md:px-5 pt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-body">📌 Giá thủ công (Admin)</span>
                </div>
              )}
              {renderTable(goldPrices, goldLoading, goldError, 'vàng', goldUpdated, 'nghìn đồng/chỉ')}
            </TabsContent>
            <TabsContent value="silver" className="mt-0">
              {silverIsManual && (
                <div className="px-3 md:px-5 pt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-body">📌 Giá thủ công (Admin)</span>
                </div>
              )}
              {renderTable(silverPrices, silverLoading, silverError, 'bạc', silverUpdated, 'VNĐ/lượng')}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default DomesticPrices;
