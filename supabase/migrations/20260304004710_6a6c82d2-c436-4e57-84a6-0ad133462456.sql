
-- Table for "About" page sections (text blocks + images)
CREATE TABLE public.about_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.about_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view about sections" ON public.about_sections FOR SELECT USING (true);
CREATE POLICY "Admins can insert about sections" ON public.about_sections FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update about sections" ON public.about_sections FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete about sections" ON public.about_sections FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_about_sections_updated_at BEFORE UPDATE ON public.about_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for about page images
CREATE TABLE public.about_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES public.about_sections(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.about_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view about images" ON public.about_images FOR SELECT USING (true);
CREATE POLICY "Admins can insert about images" ON public.about_images FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update about images" ON public.about_images FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete about images" ON public.about_images FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Table for investment knowledge articles (replaces hardcoded data)
CREATE TABLE public.knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,
  content text,
  is_auto boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published articles" ON public.knowledge_articles FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can select all articles" ON public.knowledge_articles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert articles" ON public.knowledge_articles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update articles" ON public.knowledge_articles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete articles" ON public.knowledge_articles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_knowledge_articles_updated_at BEFORE UPDATE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for about images
INSERT INTO storage.buckets (id, name, public) VALUES ('about-images', 'about-images', true);

CREATE POLICY "Anyone can view about images storage" ON storage.objects FOR SELECT USING (bucket_id = 'about-images');
CREATE POLICY "Admins can upload about images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'about-images' AND auth.role() = 'authenticated');
CREATE POLICY "Admins can delete about images" ON storage.objects FOR DELETE USING (bucket_id = 'about-images' AND auth.role() = 'authenticated');

-- Seed default about sections
INSERT INTO public.about_sections (title, content, sort_order) VALUES
('Lịch sử hình thành', 'Kim Linh Jewelry được thành lập với niềm đam mê mang đến những sản phẩm vàng bạc chất lượng cao, phục vụ nhu cầu trang sức và đầu tư của khách hàng tại Sầm Sơn, Thanh Hóa. Trải qua nhiều năm hoạt động, chúng tôi đã xây dựng được uy tín vững chắc trong cộng đồng.', 0),
('Cam kết uy tín – minh bạch', 'Mọi sản phẩm tại Kim Linh Jewelry đều được kiểm định chất lượng, đóng tem rõ ràng và có hóa đơn đầy đủ. Chúng tôi cam kết giá cả minh bạch, cạnh tranh và dịch vụ hậu mãi chu đáo.', 1);

-- Seed default knowledge articles
INSERT INTO public.knowledge_articles (title, summary, sort_order) VALUES
('Vì sao nên đầu tư vàng?', 'Vàng là kênh trú ẩn an toàn khi kinh tế biến động. Giá trị vàng có xu hướng tăng dài hạn, giúp bảo toàn tài sản trước lạm phát và rủi ro tiền tệ.', 0),
('Xu hướng giá vàng gần đây', 'Giá vàng thế giới liên tục lập đỉnh mới trong năm 2025, chạm mốc gần $3,000/oz. Nhu cầu mua vàng từ các ngân hàng trung ương tăng mạnh.', 1),
('Khi nào nên mua vàng?', 'Thời điểm tốt để mua vàng là khi giá điều chỉnh giảm sau các đợt tăng mạnh. Nên mua dần đều đặn thay vì dồn một lần để giảm rủi ro.', 2),
('Lưu ý khi mua vàng vật chất', 'Luôn mua tại tiệm vàng uy tín, kiểm tra tem đóng, hóa đơn đầy đủ. Giữ hóa đơn cẩn thận để bán lại được giá tốt nhất.', 3);

-- Add auto_update setting
INSERT INTO public.site_settings (key, value) VALUES ('knowledge_auto_update', '{"enabled": true}'::jsonb)
ON CONFLICT DO NOTHING;
