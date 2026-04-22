-- Migration: project_metadata_embedding_status
-- Adds embedding status tracking columns for project description and notes,
-- and enables Realtime on rag_coverage_assessments for live coverage refresh.

ALTER TABLE public.projects
  ADD COLUMN description_embedding_status text
    NOT NULL DEFAULT 'pending'
    CHECK (description_embedding_status IN ('pending', 'processing', 'processed', 'failed')),
  ADD COLUMN notes_embedding_status text
    NOT NULL DEFAULT 'pending'
    CHECK (notes_embedding_status IN ('pending', 'processing', 'processed', 'failed'));

-- Enable Realtime on rag_coverage_assessments so the frontend hook
-- can subscribe and auto-refresh coverage scores after any ingestion.
ALTER PUBLICATION supabase_realtime ADD TABLE public.rag_coverage_assessments;
