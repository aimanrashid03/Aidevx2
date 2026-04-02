-- Migration: Switch embedding model from OpenAI text-embedding-3-small (1536d)
-- to Voyage AI voyage-3-lite (512d).
-- Must truncate existing data BEFORE altering the vector column type.

-- 1. Clear all existing chunks (must happen before column type change)
TRUNCATE public.document_chunks;

-- 2. Reset embedding status so documents can be re-embedded
UPDATE public.project_documents
SET embedding_status = 'pending'
WHERE embedding_status = 'processed';

-- 3. Resize vector column and recreate RPC functions for new dimension
SELECT public.alter_embedding_dimensions(512);
