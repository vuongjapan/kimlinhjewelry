import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBrandedSilverPrices } from "@/hooks/useBrandedSilverPrices";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const BrandedSilverPriceCard = () => {
  const { data, loading, error, refetch } = useBrandedSilverPrices();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Giá Bạc Thương Hiệu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Đang tải...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Giá Bạc Thương Hiệu</CardTitle>
          <Button variant="ghost" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error || 'Không có dữ liệu'}</p>
        </CardContent>
      </Card>
    );
  }

  const formatPrice = (price: string) => {
    const num = parseFloat(price.replace(/[.,]/g, ''));
    if (isNaN(num)) return price;
    return num.toLocaleString('vi-VN');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Giá Bạc Thương Hiệu</CardTitle>
        <Button variant="ghost" size="icon" onClick={refetch}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.prices.slice(0, 10).map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.type}</span>
              <div className="flex gap-2">
                <span className="text-destructive font-medium">Mua: {formatPrice(item.buy)}</span>
                <span className="text-primary font-medium">Bán: {formatPrice(item.sell)}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Cập nhật: {new Date(data.updatedAt).toLocaleString('vi-VN')} ({data.source === 'live' ? 'Trực tiếp' : 'Cache'})
        </p>
      </CardContent>
    </Card>
  );
};
