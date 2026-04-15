-- Platform-wide admin audit trail
-- Records admin-initiated actions and system events for compliance and debugging

CREATE TABLE public.admin_audit_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now() NOT NULL,
  actor_id    uuid        REFERENCES auth.users ON DELETE SET NULL,
  action      text        NOT NULL,       -- see action types below
  target_type text,                       -- 'user' | 'project' | 'document' | 'flag'
  target_id   text,                       -- the affected entity's id (as text for flexibility)
  metadata    jsonb       DEFAULT '{}'::jsonb
);

-- Action types:
--   user.create       — { email, role }
--   user.delete       — { email }
--   user.role_change  — { from_role, to_role, email }
--   project.delete    — { project_name }
--   prototype.generate — { project_id, doc_id }
--   flag.set          — { key, value }
--   oo.save           — { doc_id, success }

CREATE INDEX idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_actor   ON public.admin_audit_log(actor_id, created_at DESC);
CREATE INDEX idx_admin_audit_log_action  ON public.admin_audit_log(action, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log; inserts are done via service role key (bypasses RLS)
CREATE POLICY "Admins can read admin_audit_log"
ON public.admin_audit_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
