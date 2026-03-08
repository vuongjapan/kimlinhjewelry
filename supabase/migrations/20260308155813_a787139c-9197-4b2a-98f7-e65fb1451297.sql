
CREATE TABLE public.chat_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  memory jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_conversation_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(visitor_id)
);

ALTER TABLE public.chat_memories ENABLE ROW LEVEL SECURITY;

-- Public can read/write via edge function (service role), no direct client access needed
-- But allow anonymous select/insert/update for the chat widget
CREATE POLICY "Anyone can view chat memories" ON public.chat_memories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert chat memories" ON public.chat_memories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update chat memories" ON public.chat_memories FOR UPDATE USING (true);
