
CREATE TABLE public.gold_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  gold_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  silver_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  news_data jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.gold_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gold_analysis"
  ON public.gold_analysis FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert gold_analysis"
  ON public.gold_analysis FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update gold_analysis"
  ON public.gold_analysis FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete gold_analysis"
  ON public.gold_analysis FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_gold_analysis_updated_at
  BEFORE UPDATE ON public.gold_analysis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
