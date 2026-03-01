import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ProductCategory = 'vang_10k' | 'vang_14k' | 'vang_18k' | 'bac';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  weight: number | null;
  karat: string | null;
  price: number | null;
  price_type: string | null;
  image_url: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

const categoryLabels: Record<ProductCategory, string> = {
  vang_10k: 'Vàng 10K',
  vang_14k: 'Vàng 14K',
  vang_18k: 'Vàng 18K',
  bac: 'Bạc',
};

export const getCategoryLabel = (cat: ProductCategory) => categoryLabels[cat];

export const useProducts = (category?: ProductCategory) => {
  return useQuery({
    queryKey: ['products', category],
    queryFn: async () => {
      let query = supabase.from('products').select('*').eq('is_active', true).order('sort_order');
      if (category) query = query.eq('category', category);
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });
};

export const useAllProducts = () => {
  return useQuery({
    queryKey: ['products', 'all-admin'],
    queryFn: async () => {
      // Admin sees all products including inactive
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('category')
        .order('sort_order');
      if (error) throw error;
      return data as Product[];
    },
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { error } = await supabase.from('products').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id'>) => {
      const { error } = await supabase.from('products').insert(product);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const uploadProductImage = async (file: File, productId: string) => {
  const ext = file.name.split('.').pop();
  const path = `${productId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
};
