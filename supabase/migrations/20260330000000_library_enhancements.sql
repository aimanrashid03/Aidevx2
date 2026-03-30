-- ============================================================
-- Library Enhancements:
-- 1. user_stories table
-- 2. diagram_notes table
-- 3. embedding_status column on project_documents
-- 4. Auto-cleanup trigger for document_chunks on file delete
-- ============================================================

-- ============================================================
-- 1. user_stories table
-- ============================================================

CREATE TABLE public.user_stories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'User Stories',
  responses jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  embedding_status text DEFAULT 'pending'
    CHECK (embedding_status IN ('pending', 'processing', 'processed', 'failed'))
);

ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view user stories"
ON public.user_stories FOR SELECT USING (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

CREATE POLICY "Project editors can insert user stories"
ON public.user_stories FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = user_stories.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);

CREATE POLICY "Project editors can update user stories"
ON public.user_stories FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = user_stories.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);

CREATE POLICY "Project editors can delete user stories"
ON public.user_stories FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = user_stories.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);

-- ============================================================
-- 2. diagram_notes table
-- ============================================================

CREATE TABLE public.diagram_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text DEFAULT '',
  diagram_type text DEFAULT 'freeform',
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.diagram_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view diagram notes"
ON public.diagram_notes FOR SELECT USING (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

CREATE POLICY "Project editors can insert diagram notes"
ON public.diagram_notes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = diagram_notes.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);

CREATE POLICY "Project editors can update diagram notes"
ON public.diagram_notes FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = diagram_notes.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);

CREATE POLICY "Project editors can delete diagram notes"
ON public.diagram_notes FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = diagram_notes.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);

-- ============================================================
-- 3. embedding_status column on project_documents
-- ============================================================

ALTER TABLE public.project_documents
  ADD COLUMN IF NOT EXISTS embedding_status text DEFAULT 'pending'
    CHECK (embedding_status IN ('pending', 'processing', 'processed', 'failed'));

-- ============================================================
-- 4. Auto-cleanup trigger: delete document_chunks when a
--    project_document row is deleted
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_document_chunks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.document_chunks
  WHERE project_id = OLD.project_id
    AND document_path = OLD.file_path;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cleanup_chunks_on_doc_delete
  BEFORE DELETE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_document_chunks();
