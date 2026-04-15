-- Helper SQL functions for the admin-telemetry edge function.
-- All functions are SECURITY DEFINER and granted only to service_role.

-- Check whether the pgvector extension is installed
CREATE OR REPLACE FUNCTION public.check_pgvector()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector');
$$;

-- List applied Supabase migrations
CREATE OR REPLACE FUNCTION public.get_applied_migrations()
RETURNS TABLE(version text, name text) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT version, COALESCE(name, '') AS name
  FROM supabase_migrations.schema_migrations
  ORDER BY version ASC;
$$;

-- List pgvector-related indexes in the public schema
CREATE OR REPLACE FUNCTION public.get_embedding_indexes()
RETURNS TABLE(indexname text) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT indexname::text
  FROM pg_indexes
  WHERE schemaname = 'public' AND indexdef ILIKE '%vector%';
$$;

-- Chunk counts grouped by embedding_status (column lives on project_documents)
CREATE OR REPLACE FUNCTION public.get_embedding_status_counts()
RETURNS TABLE(status text, count bigint) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT embedding_status::text AS status, count(*)::bigint AS count
  FROM public.project_documents
  GROUP BY embedding_status;
$$;

-- Count chunks whose embedding dimension differs from the expected 512
-- (embedding column lives on document_chunks; vector_dims lives in extensions schema)
CREATE OR REPLACE FUNCTION public.count_dimension_mismatches()
RETURNS bigint LANGUAGE sql SECURITY DEFINER
SET search_path = public, extensions AS $$
  SELECT count(*)::bigint
  FROM public.document_chunks
  WHERE embedding IS NOT NULL AND vector_dims(embedding) <> 512;
$$;

-- Restrict execution to service_role only
REVOKE ALL ON FUNCTION
  public.check_pgvector,
  public.get_applied_migrations,
  public.get_embedding_indexes,
  public.get_embedding_status_counts,
  public.count_dimension_mismatches
FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.check_pgvector,
  public.get_applied_migrations,
  public.get_embedding_indexes,
  public.get_embedding_status_counts,
  public.count_dimension_mismatches
TO service_role;
