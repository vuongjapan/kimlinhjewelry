
-- Create product categories enum
CREATE TYPE public.product_category AS ENUM ('vang_10k', 'vang_14k', 'vang_18k', 'bac');

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category product_category NOT NULL,
  weight NUMERIC(10,2),
  karat TEXT,
  price NUMERIC(15,0),
  price_type TEXT DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'auto')),
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Everyone can read active products
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true);

-- Admin roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin can do everything on products
CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can read roles
CREATE POLICY "Admins can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- Seed default products
INSERT INTO public.products (name, description, category, weight, karat, sort_order) VALUES
  ('Nhẫn vàng tây 18K – Mẫu trơn cổ điển', 'Thiết kế tinh giản, phù hợp đeo hàng ngày', 'vang_18k', 1.5, '18K', 1),
  ('Lắc tay vàng tây 18K – Bi tròn', 'Phong cách hiện đại, trẻ trung', 'vang_18k', 1.2, '18K', 2),
  ('Nhẫn cưới vàng tây 18K – Đôi', 'Cặp nhẫn cưới truyền thống, sang trọng', 'vang_18k', 3.0, '18K', 3),
  ('Mặt dây chuyền 18K – Hoa sen', 'Biểu tượng thuần khiết, may mắn', 'vang_18k', 0.5, '18K', 4),
  ('Dây chuyền vàng tây 14K – Mắt xích nhỏ', 'Tinh tế, thanh lịch, phù hợp mọi trang phục', 'vang_14k', 2.0, '14K', 1),
  ('Bông tai vàng tây 14K – Giọt nước', 'Nữ tính, nhẹ nhàng theo phong cách Nhật', 'vang_14k', 0.8, '14K', 2),
  ('Nhẫn vàng tây 10K – Mẫu xoắn', 'Thiết kế trẻ trung, giá hợp lý', 'vang_10k', 1.0, '10K', 1),
  ('Lắc chân bạc 925 – Chuông nhỏ', 'Dễ thương, phù hợp mọi lứa tuổi', 'bac', 1.5, 'Bạc 925', 1),
  ('Nhẫn bạc 925 – Mặt đá CZ', 'Sang trọng, lấp lánh', 'bac', 0.8, 'Bạc 925', 2);
