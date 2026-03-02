-- Fix circular RLS dependency between projects and project_members
-- The "Members can view project members" policy referenced both project_members (self)
-- and projects, while projects had a policy referencing project_members back — creating
-- an infinite loop that caused all project queries to return empty results.

-- 1. Drop the circular project_members SELECT policy
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;

-- 2. Recreate without the self-referential join.
-- Logic: you can see members if you are one of them OR you own the project.
-- The owner check uses SECURITY DEFINER function to avoid circular RLS.
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id
    AND user_id = auth.uid()
  );
$$;

CREATE POLICY "Members can view project members"
ON public.project_members FOR SELECT USING (
  auth.uid() = user_id
  OR public.is_project_owner(project_id)
);

-- 3. Fix the shared projects policy on projects table to also use SECURITY DEFINER
-- to avoid the circular dependency when evaluating project_members RLS.
DROP POLICY IF EXISTS "Members can view shared projects" ON public.projects;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
    AND user_id = auth.uid()
  );
$$;

CREATE POLICY "Members can view shared projects"
ON public.projects FOR SELECT USING (
  public.is_project_member(id)
);
