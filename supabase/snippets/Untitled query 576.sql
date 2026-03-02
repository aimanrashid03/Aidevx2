-- ============================================================
-- Phase 3: Collaboration - Project Sharing & Comments
-- ============================================================

-- 1. Project Members table (sharing)
CREATE TABLE public.project_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'owner')),
  invited_by uuid REFERENCES auth.users,
  invited_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members of projects they belong to or own
CREATE POLICY "Members can view project members"
ON public.project_members FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_members.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Only project owners can invite members
CREATE POLICY "Owners can insert project members"
ON public.project_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_members.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Only project owners can remove members
CREATE POLICY "Owners can delete project members"
ON public.project_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_members.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Only project owners can update member roles
CREATE POLICY "Owners can update project members"
ON public.project_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_members.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Admins can manage all members
CREATE POLICY "Admins can manage all project_members"
ON public.project_members FOR ALL USING (public.is_admin());

-- ============================================================
-- 2. Update RLS on existing tables to allow member access
-- ============================================================

-- Projects: members can view shared projects
CREATE POLICY "Members can view shared projects"
ON public.projects FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = projects.id
    AND project_members.user_id = auth.uid()
  )
);

-- requirement_docs: members can view shared project docs
CREATE POLICY "Members can view shared req docs"
ON public.requirement_docs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = requirement_docs.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- requirement_docs: editors can modify shared project docs
CREATE POLICY "Editors can update shared req docs"
ON public.requirement_docs FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = requirement_docs.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('editor', 'owner')
  )
);

CREATE POLICY "Editors can insert shared req docs"
ON public.requirement_docs FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = requirement_docs.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('editor', 'owner')
  )
);

-- project_documents: members can view
CREATE POLICY "Members can view shared project_documents"
ON public.project_documents FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = project_documents.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- doc_versions: members can view
CREATE POLICY "Members can view shared doc_versions"
ON public.doc_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = doc_versions.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- doc_versions: editors can insert
CREATE POLICY "Editors can insert shared doc_versions"
ON public.doc_versions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = doc_versions.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('editor', 'owner')
  )
);

-- ============================================================
-- 3. Document Comments table
-- ============================================================

CREATE TABLE public.doc_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id text NOT NULL,
  project_id uuid NOT NULL,
  section_index integer NOT NULL,
  parent_id uuid REFERENCES public.doc_comments(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  FOREIGN KEY (doc_id, project_id) REFERENCES public.requirement_docs(id, project_id) ON DELETE CASCADE
);

ALTER TABLE public.doc_comments ENABLE ROW LEVEL SECURITY;

-- Members and owners can view comments
CREATE POLICY "Members can view doc comments"
ON public.doc_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = doc_comments.project_id
    AND project_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = doc_comments.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Members and owners can create comments
CREATE POLICY "Members can create doc comments"
ON public.doc_comments FOR INSERT WITH CHECK (
  auth.uid() = author_id
  AND (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = doc_comments.project_id
      AND project_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = doc_comments.project_id
      AND projects.user_id = auth.uid()
    )
  )
);

-- Authors can update their own comments, owners can resolve any
CREATE POLICY "Authors can update own comments"
ON public.doc_comments FOR UPDATE USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = doc_comments.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Authors can delete their own comments
CREATE POLICY "Authors can delete own comments"
ON public.doc_comments FOR DELETE USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = doc_comments.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Admins can manage all comments
CREATE POLICY "Admins can manage all doc_comments"
ON public.doc_comments FOR ALL USING (public.is_admin());
