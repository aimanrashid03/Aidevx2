-- Add missing delete policy for requirement_docs
create policy "Users can delete req docs of own projects." on public.requirement_docs
  for delete using (
    exists (
      select 1 from public.projects
      where projects.id = requirement_docs.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Add missing delete policy for storage.objects
create policy "Users can delete own project files." on storage.objects
  for delete using (
    bucket_id = 'project-files' AND
    auth.uid() = owner
  );
