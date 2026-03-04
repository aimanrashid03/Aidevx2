-- Allow NULL created_by for system-generated version snapshots
-- (OnlyOffice callback creates versions server-side with no user context)
ALTER TABLE public.doc_versions
  ALTER COLUMN created_by DROP NOT NULL;
