
-- Gold price history - individual price points
CREATE TABLE public.gold_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  time time NOT NULL,
  buy_price numeric NOT NULL,
  sell_price numeric NOT NULL,
  is_open boolean NOT NULL DEFAULT false,
  is_close boolean NOT NULL DEFAULT false,
  is_after_hours boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gold_price_history_date ON public.gold_price_history(date DESC);
CREATE INDEX idx_gold_price_history_date_time ON public.gold_price_history(date, time);

ALTER TABLE public.gold_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gold_price_history"
  ON public.gold_price_history FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert gold_price_history"
  ON public.gold_price_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update gold_price_history"
  ON public.gold_price_history FOR UPDATE
  USING (true);

CREATE POLICY "Service role can delete gold_price_history"
  ON public.gold_price_history FOR DELETE
  USING (true);

-- Gold daily summary
CREATE TABLE public.gold_daily_summary (
  date date PRIMARY KEY,
  open_buy numeric NOT NULL DEFAULT 0,
  open_sell numeric NOT NULL DEFAULT 0,
  close_buy numeric NOT NULL DEFAULT 0,
  close_sell numeric NOT NULL DEFAULT 0,
  high_buy numeric NOT NULL DEFAULT 0,
  low_buy numeric NOT NULL DEFAULT 0,
  change_buy numeric NOT NULL DEFAULT 0,
  change_pct numeric NOT NULL DEFAULT 0,
  point_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gold_daily_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gold_daily_summary"
  ON public.gold_daily_summary FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert gold_daily_summary"
  ON public.gold_daily_summary FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update gold_daily_summary"
  ON public.gold_daily_summary FOR UPDATE
  USING (true);

CREATE POLICY "Service role can delete gold_daily_summary"
  ON public.gold_daily_summary FOR DELETE
  USING (true);

-- Auto-delete data older than 366 days
CREATE OR REPLACE FUNCTION public.cleanup_old_gold_data()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.gold_price_history WHERE date < CURRENT_DATE - INTERVAL '366 days';
  DELETE FROM public.gold_daily_summary WHERE date < CURRENT_DATE - INTERVAL '366 days';
$$;
