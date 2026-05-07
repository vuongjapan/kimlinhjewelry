
-- Drop overly permissive policies
DROP POLICY "Service role can insert gold_price_history" ON public.gold_price_history;
DROP POLICY "Service role can update gold_price_history" ON public.gold_price_history;
DROP POLICY "Service role can delete gold_price_history" ON public.gold_price_history;
DROP POLICY "Service role can insert gold_daily_summary" ON public.gold_daily_summary;
DROP POLICY "Service role can update gold_daily_summary" ON public.gold_daily_summary;
DROP POLICY "Service role can delete gold_daily_summary" ON public.gold_daily_summary;

-- Admin-only write policies
CREATE POLICY "Admins can insert gold_price_history"
  ON public.gold_price_history FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update gold_price_history"
  ON public.gold_price_history FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete gold_price_history"
  ON public.gold_price_history FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert gold_daily_summary"
  ON public.gold_daily_summary FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update gold_daily_summary"
  ON public.gold_daily_summary FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete gold_daily_summary"
  ON public.gold_daily_summary FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
