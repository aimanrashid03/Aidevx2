-- ─── Phase 1: Document Management Features ────────────────────────────────────
-- Adds: last_edited_by, locked_by/locked_at, parent_doc_id/cr_number columns
-- and the change_requests table for CR versioning/branching.

-- Feature 1: Last Edited Info
ALTER TABLE public.requirement_docs
  ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES auth.users;

-- Feature 2: Document Locking
ALTER TABLE public.requirement_docs
  ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES auth.users,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- Feature 3: CR Versioning
ALTER TABLE public.requirement_docs
  ADD COLUMN IF NOT EXISTS parent_doc_id text,
  ADD COLUMN IF NOT EXISTS cr_number int;

-- CR tracking table
CREATE TABLE IF NOT EXISTS public.change_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  original_doc_id text NOT NULL,
  cr_doc_id text NOT NULL,
  cr_number int NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'approved', 'rejected', 'merged')),
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  description text,
  UNIQUE (project_id, original_doc_id, cr_number)
);

ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view change_requests"
  ON public.change_requests FOR SELECT USING (
    public.is_project_member(project_id) OR public.is_project_owner(project_id)
  );

CREATE POLICY "Editors can create change_requests"
  ON public.change_requests FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = change_requests.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.role IN ('editor', 'owner')
    )
  );

CREATE POLICY "Owners can update change_requests"
  ON public.change_requests FOR UPDATE USING (
    public.is_project_owner(project_id)
  );

-- Enable realtime for lock state broadcasting
ALTER PUBLICATION supabase_realtime ADD TABLE public.requirement_docs;
