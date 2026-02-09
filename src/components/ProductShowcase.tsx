import { useState } from 'react';
import { X } from 'lucide-react';

const products = [
  {
    id: 1,
    name: 'Nhẫn vàng tây 18K – Mẫu trơn cổ điển',
    weight: '1.5 chỉ',
    karat: '18K',
    price: '10.950.000đ',
    desc: 'Thiết kế tinh giản, phù hợp đeo hàng ngày',
  },
  {
    id: 2,
    name: 'Dây chuyền vàng tây 14K – Mắt xích nhỏ',
    weight: '2.0 chỉ',
    karat: '14K',
    price: '11.500.000đ',
    desc: 'Tinh tế, thanh lịch, phù hợp mọi trang phục',
  },
  {
    id: 3,
    name: 'Lắc tay vàng tây 18K – Bi tròn',
    weight: '1.2 chỉ',
    karat: '18K',
    price: '8.760.000đ',
    desc: 'Phong cách hiện đại, trẻ trung',
  },
  {
    id: 4,
    name: 'Bông tai vàng tây 14K – Giọt nước',
    weight: '0.8 chỉ',
    karat: '14K',
    price: '4.600.000đ',
    desc: 'Nữ tính, nhẹ nhàng theo phong cách Nhật',
  },
  {
    id: 5,
    name: 'Nhẫn cưới vàng tây 18K – Đôi',
    weight: '3.0 chỉ',
    karat: '18K',
    price: '21.900.000đ',
    desc: 'Cặp nhẫn cưới truyền thống, sang trọng',
  },
  {
    id: 6,
    name: 'Mặt dây chuyền 18K – Hoa sen',
    weight: '0.5 chỉ',
    karat: '18K',
    price: '3.650.000đ',
    desc: 'Biểu tượng thuần khiết, may mắn',
  },
];

const ProductShowcase = () => {
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);

  return (
    <section id="san-pham" className="section-padding">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Vàng tây theo mẫu</p>
          <h2 className="text-3xl md:text-4xl font-display font-semibold gold-text">
            Sản Phẩm Nổi Bật
          </h2>
          <p className="text-muted-foreground font-body mt-3 max-w-md mx-auto">
            Thiết kế tinh tế, phù hợp đeo hàng ngày. Giá tính theo trọng lượng thực tế.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="glass-card p-5 cursor-pointer hover:shadow-md transition-all duration-300 group"
            >
              <div className="aspect-square bg-secondary/50 rounded-md mb-4 flex items-center justify-center overflow-hidden">
                <div className="w-16 h-16 rounded-full gold-gradient opacity-30 group-hover:opacity-50 transition-opacity" />
              </div>
              <h3 className="font-display font-semibold text-foreground text-base mb-1">{product.name}</h3>
              <p className="text-sm text-muted-foreground font-body mb-2">{product.desc}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-body">{product.weight} • {product.karat}</span>
                <span className="font-body font-semibold text-primary text-sm">{product.price}</span>
              </div>
            </div>
          ))}
        </div>

        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={() => setSelectedProduct(null)}>
            <div className="bg-card rounded-lg p-6 max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedProduct(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
              <div className="aspect-square bg-secondary/50 rounded-md mb-4 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full gold-gradient opacity-40" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2 text-foreground">{selectedProduct.name}</h3>
              <p className="text-muted-foreground font-body mb-3">{selectedProduct.desc}</p>
              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-sm text-muted-foreground font-body">{selectedProduct.weight} • {selectedProduct.karat}</span>
                <span className="font-display font-bold text-lg text-primary">{selectedProduct.price}</span>
              </div>
              <a
                href="https://zalo.me/0986617939"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block w-full text-center py-3 rounded-md bg-primary text-primary-foreground font-body font-medium hover:bg-primary/90 transition-colors"
              >
                Liên hệ tư vấn
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductShowcase;
