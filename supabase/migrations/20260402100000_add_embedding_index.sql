-- Add HNSW index on document_chunks.embedding for faster vector similarity search.
-- HNSW is chosen over IVFFlat: no training step required, better recall,
-- and works well with incrementally growing datasets.
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
ON public.document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
