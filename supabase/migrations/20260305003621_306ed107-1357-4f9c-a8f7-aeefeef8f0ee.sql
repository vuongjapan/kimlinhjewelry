
-- Table for manual price overrides
CREATE TABLE public.price_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_type text NOT NULL CHECK (price_type IN ('gold', 'silver')),
  item_name text NOT NULL,
  buy_price text,
  sell_price text,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(price_type, item_name)
);

-- Table for price edit history
CREATE TABLE public.price_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_type text NOT NULL,
  item_name text NOT NULL,
  old_buy text,
  old_sell text,
  new_buy text,
  new_sell text,
  edited_by uuid REFERENCES auth.users(id),
  edited_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_edit_history ENABLE ROW LEVEL SECURITY;

-- RLS for price_overrides
CREATE POLICY "Anyone can view price overrides" ON public.price_overrides FOR SELECT USING (true);
CREATE POLICY "Admins can insert price overrides" ON public.price_overrides FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update price overrides" ON public.price_overrides FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete price overrides" ON public.price_overrides FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS for price_edit_history
CREATE POLICY "Admins can view price history" ON public.price_edit_history FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert price history" ON public.price_edit_history FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- Manual mode setting in site_settings
INSERT INTO public.site_settings (key, value) VALUES 
  ('gold_price_manual', '{"enabled": false}'::jsonb),
  ('silver_price_manual', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
