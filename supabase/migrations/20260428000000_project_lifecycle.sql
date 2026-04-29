-- ============================================================
-- Project Lifecycle — Phase 1: Schema + RLS
-- Adds: deleted_at, archived_at, updated_at columns to projects
-- Replaces UPDATE/DELETE project policies:
--   - UPDATE: owner + editor (reversible actions: edit, archive, soft-delete, restore)
--   - DELETE: owner only (permanent hard delete from /trash)
--
-- ROLLBACK (run in reverse if needed):
--   DROP POLICY IF EXISTS "Members can update own projects" ON public.projects;
--   DROP POLICY IF EXISTS "Owners can delete own projects" ON public.projects;
--   CREATE POLICY "Users can update own projects." ON public.projects FOR UPDATE USING (auth.uid() = user_id);
--   CREATE POLICY "Users can delete own projects." ON public.projects FOR DELETE USING (auth.uid() = user_id);
--   DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
--   DROP FUNCTION IF EXISTS public.touch_projects_updated_at;
--   DROP INDEX IF EXISTS idx_projects_deleted_at;
--   DROP INDEX IF EXISTS idx_projects_archived_at;
--   ALTER TABLE public.projects DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS archived_at, DROP COLUMN IF EXISTS updated_at;
-- ============================================================

-- 1. Add lifecycle columns
ALTER TABLE public.projects
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN deleted_at  TIMESTAMPTZ,
  ADD COLUMN updated_at  TIMESTAMPTZ DEFAULT now();

-- 2. Partial indices for efficient filtering
CREATE INDEX idx_projects_deleted_at  ON public.projects (deleted_at)  WHERE deleted_at  IS NOT NULL;
CREATE INDEX idx_projects_archived_at ON public.projects (archived_at) WHERE archived_at IS NOT NULL;

-- 3. Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.touch_projects_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.touch_projects_updated_at();

-- 4. Replace UPDATE policy: owner + editor can update
--    (covers: edit name/description/notes, set archived_at, set deleted_at, clear deleted_at)
DROP POLICY IF EXISTS "Users can update own projects." ON public.projects;

CREATE POLICY "Members can update own projects"
ON public.projects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = projects.id
      AND project_members.user_id    = auth.uid()
      AND project_members.role IN ('owner', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = projects.id
      AND project_members.user_id    = auth.uid()
      AND project_members.role IN ('owner', 'editor')
  )
);

-- 5. Replace DELETE policy: owner-only for permanent (hard) delete
DROP POLICY IF EXISTS "Users can delete own projects." ON public.projects;

CREATE POLICY "Owners can delete own projects"
ON public.projects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = projects.id
      AND project_members.user_id    = auth.uid()
      AND project_members.role       = 'owner'
  )
);
