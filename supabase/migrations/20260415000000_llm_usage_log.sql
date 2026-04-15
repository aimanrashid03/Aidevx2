-- LLM usage tracking for cost visibility and capacity planning
-- Populated by edge functions after each LLM/embedding call

CREATE TABLE public.llm_usage_log (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,
  user_id       uuid        REFERENCES auth.users ON DELETE SET NULL,
  project_id    uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  feature       text        NOT NULL,  -- 'generate_section' | 'auto_generate_document' | 'generate_prototype' | 'embed'
  provider      text        NOT NULL,  -- 'openrouter' | 'anthropic' | 'voyage'
  model         text        NOT NULL,
  input_tokens  int,
  output_tokens int,
  cost_usd      numeric(10,6)
);

CREATE INDEX idx_llm_usage_log_created   ON public.llm_usage_log(created_at DESC);
CREATE INDEX idx_llm_usage_log_user      ON public.llm_usage_log(user_id, created_at DESC);
CREATE INDEX idx_llm_usage_log_project   ON public.llm_usage_log(project_id, created_at DESC);

ALTER TABLE public.llm_usage_log ENABLE ROW LEVEL SECURITY;

-- Only admins (via service role key in edge functions) can insert
-- Frontend reads allowed for admins only
CREATE POLICY "Admins can read llm_usage_log"
ON public.llm_usage_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
