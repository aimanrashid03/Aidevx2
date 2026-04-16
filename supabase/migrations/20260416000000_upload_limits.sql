-- Set server-side file size limit on the project-files storage bucket.
-- Uploads exceeding this are rejected by Supabase with a 413 error,
-- regardless of client-side validation.
UPDATE storage.buckets
SET file_size_limit = 10485760  -- 10 MB (10 * 1024 * 1024 bytes)
WHERE id = 'project-files';
