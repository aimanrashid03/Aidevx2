-- OnlyOffice integration: add storage_path and document_key columns

-- requirement_docs: track DOCX file location in Supabase Storage
ALTER TABLE requirement_docs
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS document_key TEXT;

-- doc_versions: track DOCX snapshot file location
ALTER TABLE doc_versions
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Index for key lookups (OnlyOffice identifies docs by key for cache busting)
CREATE INDEX IF NOT EXISTS idx_requirement_docs_document_key
  ON requirement_docs(document_key)
  WHERE document_key IS NOT NULL;

-- doc_comments: add section_title for heading-slug based comment anchoring
-- (replaces positional section_index for OnlyOffice-format documents)
ALTER TABLE doc_comments
  ADD COLUMN IF NOT EXISTS section_title TEXT;

-- NOTE: Create the 'documents' storage bucket via Supabase Dashboard or CLI:
-- supabase storage create documents
-- Set bucket to public or use signed URLs.
