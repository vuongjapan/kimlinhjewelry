import { useState } from 'react';
import { X } from 'lucide-react';
import { useGoldPrices, GoldPrice } from '@/hooks/useGoldPrices';
import { useProducts, getCategoryLabel, type Product, type ProductCategory } from '@/hooks/useProducts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const categories: ProductCategory[] = ['vang_18k', 'vang_14k', 'vang_10k', 'bac'];

function getGoldSellPrice(prices: GoldPrice[], karat: string): number | null {
  const karatMap: Record<string, string[]> = {
    '18K': ['Trang Sức', '18K', '18k', '750'],
    '14K': ['Trang Sức', '14K', '14k', '585'],
    '10K': ['Tây 10K', '10K', '10k', '416'],
    '24K': ['Nhẫn Ép Vỉ', '9999', 'SJC'],
  };
  const keywords = karatMap[karat] || [karat];
  for (const price of prices) {
    if (keywords.some((kw) => price.type.includes(kw))) {
      const num = parseFloat(price.sell.replace(/\./g, '').replace(',', '.'));
      return isNaN(num) ? null : num;
    }
  }
  return null;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(price * 1000)) + 'đ';
}

const ProductShowcase = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { data } = useGoldPrices();
  const goldPrices = data?.prices || [];

  const getProductPrice = (product: Product) => {
    if (product.price && product.price_type === 'fixed') {
      return new Intl.NumberFormat('vi-VN').format(product.price) + 'đ';
    }
    if (!product.karat || !product.weight) return 'Liên hệ';
    const sellPrice = getGoldSellPrice(goldPrices, product.karat);
    if (!sellPrice) return 'Liên hệ';
    return formatPrice(sellPrice * product.weight);
  };

  return (
    <section id="san-pham" className="section-padding">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Bộ sưu tập</p>
          <h2 className="text-3xl md:text-4xl font-display font-semibold gold-text">
            Sản Phẩm Nổi Bật
          </h2>
          <p className="text-muted-foreground font-body mt-3 max-w-md mx-auto">
            Thiết kế tinh tế, phù hợp đeo hàng ngày. Giá tự động cập nhật theo thị trường.
          </p>
        </div>

        <Tabs defaultValue="vang_18k" className="w-full">
          <TabsList className="w-full max-w-xl mx-auto grid grid-cols-4 mb-6">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="font-body text-xs sm:text-sm">{getCategoryLabel(cat)}</TabsTrigger>
            ))}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat} value={cat}>
              <CategoryProducts category={cat} onSelect={setSelectedProduct} getPrice={getProductPrice} />
            </TabsContent>
          ))}
        </Tabs>

        <p className="text-xs text-muted-foreground text-center mt-6 font-body">
          Giá tham khảo = giá vàng hiện tại × trọng lượng • Liên hệ cửa hàng để chốt giá chính xác
        </p>

        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={() => setSelectedProduct(null)}>
            <div className="bg-card rounded-lg p-6 max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedProduct(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
              <div className="aspect-square bg-secondary/50 rounded-md mb-4 flex items-center justify-center overflow-hidden">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-full gold-gradient opacity-40" />
                )}
              </div>
              <h3 className="font-display font-semibold text-xl mb-2 text-foreground">{selectedProduct.name}</h3>
              <p className="text-muted-foreground font-body mb-3">{selectedProduct.description}</p>
              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-sm text-muted-foreground font-body">{selectedProduct.weight} chỉ • {selectedProduct.karat}</span>
                <span className="font-display font-bold text-lg text-primary">{getProductPrice(selectedProduct)}</span>
              </div>
              <p className="text-xs text-muted-foreground font-body mt-2">Giá tham khảo, liên hệ cửa hàng để chốt giá chính xác</p>
              <a href="https://zalo.me/0986617939" target="_blank" rel="noopener noreferrer"
                className="mt-4 block w-full text-center py-3 rounded-md bg-primary text-primary-foreground font-body font-medium hover:bg-primary/90 transition-colors">
                Liên hệ tư vấn
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const CategoryProducts = ({ category, onSelect, getPrice }: { category: ProductCategory; onSelect: (p: Product) => void; getPrice: (p: Product) => string }) => {
  const { data: products, isLoading } = useProducts(category);

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Đang tải...</div>;
  if (!products?.length) return <div className="text-center py-8 text-muted-foreground text-sm">Chưa có sản phẩm</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {products.map((product) => (
        <div key={product.id} onClick={() => onSelect(product)}
          className="glass-card p-5 cursor-pointer hover:shadow-md transition-all duration-300 group">
          <div className="aspect-square bg-secondary/50 rounded-md mb-4 flex items-center justify-center overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            ) : (
              <div className="w-16 h-16 rounded-full gold-gradient opacity-30 group-hover:opacity-50 transition-opacity" />
            )}
          </div>
          <h3 className="font-display font-semibold text-foreground text-base mb-1">{product.name}</h3>
          <p className="text-sm text-muted-foreground font-body mb-2">{product.description}</p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-body">{product.weight} chỉ • {product.karat}</span>
            <span className="font-body font-semibold text-primary text-sm">{getPrice(product)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductShowcase;
