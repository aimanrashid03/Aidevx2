-- Storage RLS policies for the 'documents' bucket
-- Authenticated users can upload/update DOCX files for their own projects
-- (path = {projectId}/{docId}/current.docx or v{n}.docx)

CREATE POLICY "Authenticated users can upload project documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id::text = (string_to_array(storage.objects.name, '/'))[1]
      AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can update project documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id::text = (string_to_array(storage.objects.name, '/'))[1]
      AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can delete project documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id::text = (string_to_array(storage.objects.name, '/'))[1]
      AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can read public documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');
