
-- Create gold_analysis_log table
CREATE TABLE public.gold_analysis_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type text NOT NULL DEFAULT 'auto',
  status text NOT NULL DEFAULT 'success',
  gold_price numeric,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gold_analysis_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gold_analysis_log" ON public.gold_analysis_log FOR SELECT USING (true);
CREATE POLICY "Admins can insert gold_analysis_log" ON public.gold_analysis_log FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete gold_analysis_log" ON public.gold_analysis_log FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
