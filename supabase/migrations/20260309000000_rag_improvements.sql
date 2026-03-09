-- ── RAG improvements ────────────────────────────────────────────────────────
-- Adds metadata, embedding model tracking, and chunk index to document_chunks.
-- Replaces the basic match function with versions that return metadata and
-- support optional document-path filtering.
-- Also adds a helper to alter embedding dimensions when switching models.

-- ── 1. New columns on document_chunks ────────────────────────────────────────

ALTER TABLE public.document_chunks
    ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS embedding_model text,
    ADD COLUMN IF NOT EXISTS chunk_index integer DEFAULT 0;

-- ── 2. Replace match_document_chunks (adds metadata return column) ────────────
-- Must DROP first — CREATE OR REPLACE cannot change the return type signature.

DROP FUNCTION IF EXISTS public.match_document_chunks(vector, float, int, uuid);

CREATE OR REPLACE FUNCTION public.match_document_chunks(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    p_project_id uuid
)
RETURNS TABLE (
    id uuid,
    project_id uuid,
    document_path text,
    content text,
    similarity float,
    metadata jsonb
)
LANGUAGE sql STABLE
AS $$
    SELECT
        dc.id,
        dc.project_id,
        dc.document_path,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity,
        dc.metadata
    FROM public.document_chunks dc
    WHERE dc.project_id = p_project_id
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ── 3. New filtered variant (restricts to specific document paths) ────────────

CREATE OR REPLACE FUNCTION public.match_document_chunks_filtered(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    p_project_id uuid,
    p_document_paths text[] DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    project_id uuid,
    document_path text,
    content text,
    similarity float,
    metadata jsonb
)
LANGUAGE sql STABLE
AS $$
    SELECT
        dc.id,
        dc.project_id,
        dc.document_path,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity,
        dc.metadata
    FROM public.document_chunks dc
    WHERE dc.project_id = p_project_id
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
      AND (p_document_paths IS NULL OR dc.document_path = ANY(p_document_paths))
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ── 4. Dimension-change helper ────────────────────────────────────────────────
-- Run this when switching to an embedding model with different dimensions.
-- After running, delete all document_chunks and re-upload project files.
--
-- Usage: SELECT public.alter_embedding_dimensions(768);

CREATE OR REPLACE FUNCTION public.alter_embedding_dimensions(new_dim integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Drop dependent functions first (they reference the vector column type)
    DROP FUNCTION IF EXISTS public.match_document_chunks(vector, float, int, uuid);
    DROP FUNCTION IF EXISTS public.match_document_chunks_filtered(vector, float, int, uuid, text[]);

    -- Alter the column type
    EXECUTE format(
        'ALTER TABLE public.document_chunks ALTER COLUMN embedding TYPE vector(%s)',
        new_dim
    );

    -- Recreate match_document_chunks with new dimension
    EXECUTE format($fn$
        CREATE OR REPLACE FUNCTION public.match_document_chunks(
            query_embedding vector(%1$s),
            match_threshold float,
            match_count int,
            p_project_id uuid
        )
        RETURNS TABLE (
            id uuid, project_id uuid, document_path text,
            content text, similarity float, metadata jsonb
        )
        LANGUAGE sql STABLE AS $body$
            SELECT dc.id, dc.project_id, dc.document_path, dc.content,
                   1 - (dc.embedding <=> query_embedding) AS similarity,
                   dc.metadata
            FROM public.document_chunks dc
            WHERE dc.project_id = p_project_id
              AND 1 - (dc.embedding <=> query_embedding) > match_threshold
            ORDER BY dc.embedding <=> query_embedding
            LIMIT match_count;
        $body$;
    $fn$, new_dim);

    -- Recreate match_document_chunks_filtered with new dimension
    EXECUTE format($fn$
        CREATE OR REPLACE FUNCTION public.match_document_chunks_filtered(
            query_embedding vector(%1$s),
            match_threshold float,
            match_count int,
            p_project_id uuid,
            p_document_paths text[] DEFAULT NULL
        )
        RETURNS TABLE (
            id uuid, project_id uuid, document_path text,
            content text, similarity float, metadata jsonb
        )
        LANGUAGE sql STABLE AS $body$
            SELECT dc.id, dc.project_id, dc.document_path, dc.content,
                   1 - (dc.embedding <=> query_embedding) AS similarity,
                   dc.metadata
            FROM public.document_chunks dc
            WHERE dc.project_id = p_project_id
              AND 1 - (dc.embedding <=> query_embedding) > match_threshold
              AND (p_document_paths IS NULL OR dc.document_path = ANY(p_document_paths))
            ORDER BY dc.embedding <=> query_embedding
            LIMIT match_count;
        $body$;
    $fn$, new_dim);
END;
$$;
