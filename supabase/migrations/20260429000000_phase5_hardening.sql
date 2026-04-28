-- ============================================================
-- Phase 5: Hardening
-- 1. pg_cron job — hard-delete projects trashed > 30 days ago
-- 2. Admin INSERT policy on admin_audit_log — enables client-side
--    audit writes for admin actors (non-admins get RLS rejection)
--
-- FK cascade audit (all already correct, no changes needed):
--   project_documents   → ON DELETE CASCADE ✓
--   requirement_docs    → ON DELETE CASCADE ✓
--   document_chunks     → ON DELETE CASCADE ✓
--   prototypes          → ON DELETE CASCADE ✓
--   rag_coverage_assessments → ON DELETE CASCADE ✓
--   project_members     → ON DELETE CASCADE ✓
--   doc_versions        → ON DELETE CASCADE ✓ (via requirement_docs)
-- ============================================================

-- 1. Schedule daily purge of permanently-trashed projects (30-day grace period)
--
--    Requires pg_cron to be enabled: Supabase Dashboard → Database → Extensions → pg_cron
--    If pg_cron is not enabled this block is a no-op (outer EXCEPTION swallows the error).
--    The cron job runs as the postgres superuser (bypasses RLS) — this is intentional.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove previous version of this job if it exists (idempotent re-apply)
    BEGIN
      PERFORM cron.unschedule('purge-deleted-projects-30d');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- job did not exist; that is fine
    END;

    -- Daily at 03:00 UTC: hard-delete rows where deleted_at is older than 30 days.
    -- ON DELETE CASCADE propagates to all child tables automatically.
    PERFORM cron.schedule(
      'purge-deleted-projects-30d',
      '0 3 * * *',
      $cron$
        DELETE FROM public.projects
        WHERE deleted_at IS NOT NULL
          AND deleted_at < now() - INTERVAL '30 days';
      $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- pg_cron extension not available; skip silently
END;
$$;

-- 2. Allow admin-role users to insert into admin_audit_log via the anon key.
--    Non-admin users attempting an insert receive an RLS rejection, which callers swallow.
--    Writes performed via the service role key (edge functions) bypass RLS and are unaffected.
CREATE POLICY "Admins can insert admin_audit_log"
ON public.admin_audit_log FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id   = auth.uid()
      AND role = 'admin'
  )
);
