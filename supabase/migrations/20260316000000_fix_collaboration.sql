-- ============================================================
-- Fix Collaboration: member visibility, auto-insert owner, backfill,
-- storage & table policies
-- ============================================================

-- 0. Fix project_members SELECT policy so all members can see the full team
--    (Previously only let non-owners see their own row)
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;

CREATE POLICY "Members can view project members"
ON public.project_members FOR SELECT USING (
  public.is_project_member(project_id)
  OR public.is_project_owner(project_id)
);

-- 1. Auto-insert project creator as 'owner' into project_members
CREATE OR REPLACE FUNCTION public.handle_project_owner_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_project_owner_member();

-- 2. Backfill existing projects that don't have an owner in project_members
INSERT INTO public.project_members (project_id, user_id, role)
SELECT id, user_id, 'owner' FROM public.projects
ON CONFLICT (project_id, user_id) DO NOTHING;

-- ============================================================
-- 3. Storage: allow collaborators access to 'documents' bucket
-- ============================================================

-- Editors/owners in project_members can upload DOCX files
CREATE POLICY "Project editors can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id::text = (string_to_array(storage.objects.name, '/'))[1]
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);

-- Editors/owners can update documents
CREATE POLICY "Project editors can update documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id::text = (string_to_array(storage.objects.name, '/'))[1]
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);

-- ============================================================
-- 4. Storage: allow collaborators access to 'project-files' bucket
-- ============================================================

-- Members can view/download supporting files
CREATE POLICY "Project members can view project files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id::text = (string_to_array(storage.objects.name, '/'))[1]
      AND project_members.user_id = auth.uid()
  )
);

-- Editors can upload supporting files
CREATE POLICY "Project editors can upload project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id::text = (string_to_array(storage.objects.name, '/'))[1]
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);

-- ============================================================
-- 5. Table: allow editors to insert/delete project_documents
-- ============================================================

CREATE POLICY "Editors can insert docs to shared projects"
ON public.project_documents FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = project_documents.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);

CREATE POLICY "Editors can delete docs of shared projects"
ON public.project_documents FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = project_documents.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);
