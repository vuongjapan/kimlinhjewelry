import { useGoldPrices } from '@/hooks/useGoldPrices';
import { useSilverPrices } from '@/hooks/useSilverPrices';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const DomesticPrices = () => {
  const { data: goldData, loading: goldLoading, error: goldError } = useGoldPrices();
  const { data: silverData, loading: silverLoading, error: silverError } = useSilverPrices();

  const goldPrices = goldData?.prices || [];
  const silverPrices = silverData?.prices || [];
  const goldUpdated = goldData?.updatedAt ? new Date(goldData.updatedAt).toLocaleTimeString('vi-VN') : '';
  const silverUpdated = silverData?.updatedAt ? new Date(silverData.updatedAt).toLocaleTimeString('vi-VN') : '';

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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground font-body">Đang tải giá {label}...</span>
        </div>
      );
    }
    if (error) {
      return <div className="text-center py-12 text-sm text-muted-foreground font-body">{error}</div>;
    }
    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-primary/10">
                <th className="text-left px-4 md:px-6 py-4 font-body font-semibold text-foreground text-sm md:text-base">Loại {label}</th>
                <th className="text-right px-4 md:px-6 py-4 font-body font-semibold text-foreground text-sm md:text-base">Mua vào</th>
                <th className="text-right px-4 md:px-6 py-4 font-body font-semibold text-foreground text-sm md:text-base">Bán ra</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-t border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="px-4 md:px-6 py-4 font-body text-sm md:text-base font-medium text-foreground">
                    {item.type}
                    {item.category && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{item.category}</span>
                    )}
                  </td>
                  <td className="px-4 md:px-6 py-4 font-body text-sm md:text-base text-right text-muted-foreground">{item.buy}</td>
                  <td className="px-4 md:px-6 py-4 font-body text-sm md:text-base text-right font-semibold text-foreground">{item.sell}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 md:px-6 py-3 bg-secondary/30">
          <p className="text-xs text-muted-foreground font-body text-center">
            Đơn vị: {unit} • Giá mang tính tham khảo{updatedAt && ` • Cập nhật: ${updatedAt}`}
          </p>
        </div>
      </>
    );
  };

  return (
    <section id="gia-vang" className="section-padding">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Theo thị trường</p>
          <h2 className="text-3xl md:text-4xl font-display font-semibold gold-text">
            Giá Vàng & Bạc Trong Nước
          </h2>
        </div>

        <div className="glass-card overflow-hidden">
          <Tabs defaultValue="gold" className="w-full">
            <div className="px-4 md:px-6 pt-4">
              <TabsList className="w-full">
                <TabsTrigger value="gold" className="flex-1 font-body">Giá Vàng</TabsTrigger>
                <TabsTrigger value="silver" className="flex-1 font-body">Giá Bạc</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="gold" className="mt-0">
              {renderTable(goldPrices, goldLoading, goldError, 'vàng', goldUpdated, 'nghìn đồng/chỉ')}
            </TabsContent>
            <TabsContent value="silver" className="mt-0">
              {renderTable(silverPrices, silverLoading, silverError, 'bạc', silverUpdated, 'VNĐ/lượng')}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default DomesticPrices;
