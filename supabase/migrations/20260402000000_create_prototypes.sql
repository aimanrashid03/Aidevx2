-- ============================================================
-- Prototypes table for AI-generated UI prototypes
-- ============================================================

CREATE TABLE public.prototypes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  source_doc_id text NOT NULL,           -- requirement_docs.id
  source_doc_title text NOT NULL,
  source_doc_type text NOT NULL,         -- BRS | URS | SRS | SDS
  name text NOT NULL,
  html text NOT NULL,                    -- full self-contained HTML file
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.prototypes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view prototypes"
ON public.prototypes FOR SELECT USING (
  public.is_project_owner(project_id)
  OR public.is_project_member(project_id)
);

CREATE POLICY "Project editors can insert prototypes"
ON public.prototypes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = prototypes.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);

CREATE POLICY "Project editors can delete prototypes"
ON public.prototypes FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = prototypes.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner')
  )
);

CREATE INDEX idx_prototypes_project_id ON public.prototypes(project_id);
