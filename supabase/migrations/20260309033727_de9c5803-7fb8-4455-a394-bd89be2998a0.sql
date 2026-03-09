CREATE TABLE public.market_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text DEFAULT 'investing.com',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.market_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read market analysis"
  ON public.market_analysis FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_market_analysis_updated ON public.market_analysis(updated_at DESC);