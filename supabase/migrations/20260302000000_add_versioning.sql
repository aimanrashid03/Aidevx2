-- Add versioning support for requirement documents

-- 1. Add version tracking and section_statuses columns to requirement_docs
ALTER TABLE public.requirement_docs
ADD COLUMN IF NOT EXISTS current_version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS section_statuses jsonb;

-- 2. Create doc_versions table for version history
CREATE TABLE public.doc_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id text NOT NULL,
  project_id uuid NOT NULL,
  version_number integer NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  section_statuses jsonb,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  change_summary text,

  FOREIGN KEY (doc_id, project_id) REFERENCES public.requirement_docs(id, project_id) ON DELETE CASCADE,
  UNIQUE (doc_id, project_id, version_number)
);

ALTER TABLE public.doc_versions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view versions of their own project docs
CREATE POLICY "Users can view versions of own project docs"
ON public.doc_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = doc_versions.project_id
    AND projects.user_id = auth.uid()
  )
);

-- RLS: Users can insert versions for their own project docs
CREATE POLICY "Users can insert versions for own project docs"
ON public.doc_versions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = doc_versions.project_id
    AND projects.user_id = auth.uid()
  )
);

-- RLS: Admins can view all versions
CREATE POLICY "Admins can view all doc_versions"
ON public.doc_versions FOR SELECT USING (public.is_admin());
