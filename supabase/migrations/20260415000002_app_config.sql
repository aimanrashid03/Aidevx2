-- Runtime feature flags and configuration
-- Admin-managed toggles that edge functions read at invocation time

CREATE TABLE public.app_config (
  key         text        PRIMARY KEY,
  value       jsonb       NOT NULL,
  updated_at  timestamptz DEFAULT now(),
  updated_by  uuid        REFERENCES auth.users ON DELETE SET NULL
);

-- Seed default flags
INSERT INTO public.app_config (key, value) VALUES
  ('feature.auto_generate',           'true'::jsonb),
  ('feature.prototype',               'true'::jsonb),
  ('llm.model_override.section',      '""'::jsonb),
  ('llm.model_override.auto_generate','""'::jsonb),
  ('llm.model_override.prototype',    '"google/gemini-2.5-flash-preview"'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Admins can read all flags
CREATE POLICY "Admins can read app_config"
ON public.app_config FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update flags (upsert done via service role key in admin-telemetry fn which bypasses this)
CREATE POLICY "Admins can update app_config"
ON public.app_config FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert app_config"
ON public.app_config FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
