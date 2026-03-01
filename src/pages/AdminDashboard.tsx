import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useAllProducts, useUpdateProduct, useDeleteProduct, useCreateProduct, uploadProductImage, getCategoryLabel, type Product, type ProductCategory } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Plus, Pencil, Trash2, Upload } from 'lucide-react';

const categories: ProductCategory[] = ['vang_18k', 'vang_14k', 'vang_10k', 'bac'];

const emptyProduct: Omit<Product, 'id'> = {
  name: '', description: '', category: 'vang_18k', weight: 0, karat: '18K',
  price: null, price_type: 'auto', image_url: null, sort_order: 0, is_active: true,
};

const AdminDashboard = () => {
  const { isAdmin, loading: authLoading, signOut } = useAdmin();
  const navigate = useNavigate();
  const { data: products, isLoading } = useAllProducts();
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'> | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/admin/login');
  }, [authLoading, isAdmin, navigate]);

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Đang tải...</p></div>;
  }

  const handleImageUpload = async (file: File, productId: string) => {
    setUploading(true);
    try {
      const url = await uploadProductImage(file, productId);
      await updateProduct.mutateAsync({ id: productId, image_url: url });
      toast({ title: 'Đã upload ảnh thành công' });
      setEditProduct(prev => prev ? { ...prev, image_url: url } : null);
    } catch (err: any) {
      toast({ title: 'Lỗi upload', description: err.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!editProduct) return;
    try {
      const { id, ...rest } = editProduct;
      await updateProduct.mutateAsync({ id, ...rest });
      toast({ title: 'Đã lưu' });
      setEditProduct(null);
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    if (!newProduct) return;
    try {
      await createProduct.mutateAsync(newProduct);
      toast({ title: 'Đã tạo sản phẩm mới' });
      setNewProduct(null);
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa sản phẩm này?')) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: 'Đã xóa' });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const productsByCategory = (cat: ProductCategory) =>
    products?.filter((p) => p.category === cat) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-display font-semibold text-lg gold-text">Admin – Quản lý sản phẩm</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>Trang chủ</Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-1" />Đăng xuất</Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="vang_18k">
          <TabsList className="mb-4">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="font-body">{getCategoryLabel(cat)}</TabsTrigger>
            ))}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat} value={cat}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-display font-semibold">{getCategoryLabel(cat)}</h2>
                <Button size="sm" onClick={() => setNewProduct({ ...emptyProduct, category: cat, karat: cat === 'bac' ? 'Bạc 925' : cat.replace('vang_', '').toUpperCase() })}>
                  <Plus className="w-4 h-4 mr-1" />Thêm
                </Button>
              </div>

              <div className="grid gap-3">
                {productsByCategory(cat).map(product => (
                  <div key={product.id} className="glass-card p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-secondary/50 flex-shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full gold-gradient opacity-30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-body font-semibold text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-muted-foreground">{product.weight} chỉ • {product.karat} • {product.price ? new Intl.NumberFormat('vi-VN').format(product.price) + 'đ' : 'Giá tự động'}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditProduct(product)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {productsByCategory(cat).length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">Chưa có sản phẩm nào</p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Chỉnh sửa sản phẩm</DialogTitle></DialogHeader>
          {editProduct && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-md overflow-hidden bg-secondary/50 flex-shrink-0 relative group">
                  {editProduct.image_url ? (
                    <img src={editProduct.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-5 h-5 text-background" />
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], editProduct.id)} />
                  </label>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <Label className="font-body text-xs">Tên sản phẩm</Label>
                    <Input value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="font-body text-xs">Mô tả</Label>
                    <Input value={editProduct.description || ''} onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="font-body text-xs">Trọng lượng (chỉ)</Label>
                  <Input type="number" step="0.1" value={editProduct.weight ?? ''} onChange={(e) => setEditProduct({ ...editProduct, weight: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="font-body text-xs">Loại vàng</Label>
                  <Input value={editProduct.karat || ''} onChange={(e) => setEditProduct({ ...editProduct, karat: e.target.value })} />
                </div>
                <div>
                  <Label className="font-body text-xs">Giá cố định (đ)</Label>
                  <Input type="number" value={editProduct.price ?? ''} placeholder="Để trống = giá tự động"
                    onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value ? parseInt(e.target.value) : null, price_type: e.target.value ? 'fixed' : 'auto' })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-body text-xs">Thứ tự hiển thị</Label>
                  <Input type="number" value={editProduct.sort_order ?? 0} onChange={(e) => setEditProduct({ ...editProduct, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
                    <input type="checkbox" checked={editProduct.is_active ?? true}
                      onChange={(e) => setEditProduct({ ...editProduct, is_active: e.target.checked })} />
                    Hiển thị trên trang
                  </label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditProduct(null)}>Hủy</Button>
                <Button onClick={handleSave} disabled={updateProduct.isPending}>Lưu</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={!!newProduct} onOpenChange={(open) => !open && setNewProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Thêm sản phẩm mới</DialogTitle></DialogHeader>
          {newProduct && (
            <div className="space-y-4">
              <div>
                <Label className="font-body text-xs">Tên sản phẩm</Label>
                <Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
              </div>
              <div>
                <Label className="font-body text-xs">Mô tả</Label>
                <Input value={newProduct.description || ''} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="font-body text-xs">Trọng lượng (chỉ)</Label>
                  <Input type="number" step="0.1" value={newProduct.weight ?? ''} onChange={(e) => setNewProduct({ ...newProduct, weight: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="font-body text-xs">Loại vàng</Label>
                  <Input value={newProduct.karat || ''} onChange={(e) => setNewProduct({ ...newProduct, karat: e.target.value })} />
                </div>
                <div>
                  <Label className="font-body text-xs">Giá cố định (đ)</Label>
                  <Input type="number" value={newProduct.price ?? ''} placeholder="Để trống = tự động"
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value ? parseInt(e.target.value) : null, price_type: e.target.value ? 'fixed' : 'auto' })} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setNewProduct(null)}>Hủy</Button>
                <Button onClick={handleCreate} disabled={createProduct.isPending}>Tạo</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
