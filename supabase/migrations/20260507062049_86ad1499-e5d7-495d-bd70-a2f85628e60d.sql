
-- Allow service role (edge functions) to insert logs
CREATE POLICY "Service role can insert gold_analysis_log" ON public.gold_analysis_log FOR INSERT TO service_role WITH CHECK (true);
