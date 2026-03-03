
-- Create site_settings table for storing map coordinates and other settings
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can view site settings"
ON public.site_settings FOR SELECT
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update site settings"
ON public.site_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert site settings"
ON public.site_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default map location (Sầm Sơn, Thanh Hóa)
INSERT INTO public.site_settings (key, value) VALUES (
  'map_location',
  '{"lat": 19.7583, "lng": 105.9020, "zoom": 16}'::jsonb
);
