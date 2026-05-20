-- Migration: generation_jobs
-- Tracks in-progress full-document auto-generations for the informational
-- queue UI. Frontend-owned: AutoGenerateProgress inserts a row on start and
-- updates it on completion. No admission control — purely for visibility.

CREATE TABLE public.generation_jobs (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id  uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    doc_type    text NOT NULL,
    status      text NOT NULL DEFAULT 'running'
                CHECK (status IN ('running', 'complete', 'error')),
    created_at  timestamptz DEFAULT now() NOT NULL,
    updated_at  timestamptz DEFAULT now() NOT NULL
);

-- Partial index for the "count running jobs" query
CREATE INDEX idx_generation_jobs_running
    ON public.generation_jobs (created_at)
    WHERE status = 'running';

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read — needed to count team-wide running jobs
CREATE POLICY "Authenticated users can read generation jobs"
    ON public.generation_jobs
    FOR SELECT
    TO authenticated
    USING (true);

-- Users may insert only their own rows
CREATE POLICY "Users can insert own generation jobs"
    ON public.generation_jobs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users may update only their own rows
CREATE POLICY "Users can update own generation jobs"
    ON public.generation_jobs
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Enable Realtime so the queue UI updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;
