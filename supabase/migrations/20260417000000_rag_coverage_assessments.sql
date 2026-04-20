-- Migration: rag_coverage_assessments
-- Stores semantic coverage results per project per doc type.
-- One row per (project_id, doc_type) — upserted on each assessment run.

CREATE TABLE public.rag_coverage_assessments (
    id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id                uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    doc_type                  text NOT NULL DEFAULT 'BRS'
                              CHECK (doc_type IN ('BRS', 'URS', 'SRS', 'SDS')),
    -- JSONB array: [{ title, quality, chunkCount, avgSimilarity, topSources }]
    sections                  jsonb NOT NULL DEFAULT '[]',
    -- 0-1 float: weighted average (high=1.0, medium=0.66, low=0.33, none=0)
    overall_score             float NOT NULL DEFAULT 0
                              CHECK (overall_score >= 0 AND overall_score <= 1),
    -- { high: N, medium: N, low: N, none: N, totalSections: N }
    coverage_summary          jsonb NOT NULL DEFAULT '{}',
    -- Snapshot of total chunk count at assessment time (staleness detection)
    chunk_count_at_assessment int NOT NULL DEFAULT 0,
    created_at                timestamptz DEFAULT now() NOT NULL,
    UNIQUE (project_id, doc_type)
);

-- Index for fast lookup by project
CREATE INDEX idx_rag_coverage_project ON public.rag_coverage_assessments (project_id);

-- RLS: project members can read their own assessments; service role handles writes
ALTER TABLE public.rag_coverage_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can read coverage assessments"
    ON public.rag_coverage_assessments
    FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
        )
    );

-- Service role key (used by edge functions) bypasses RLS entirely
-- so no INSERT/UPDATE policy is needed for the edge function writes.
