-- Activity log for tracking who did what across projects
-- Records user-initiated actions with structured details metadata

CREATE TABLE public.activity_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid        REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  doc_id      text,                                          -- nullable: project-level events have no doc
  user_id     uuid        REFERENCES auth.users NOT NULL,
  action      text        NOT NULL,                          -- see action types below
  details     jsonb       DEFAULT '{}'::jsonb NOT NULL,      -- action-specific metadata
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Action types:
--   doc_created       — { docTitle, docType, sectionCount? }
--   doc_restored      — { fromVersion, toVersion }
--   section_generated — { sectionTitle, contentType, source: 'auto_gen'|'ai_panel' }
--   section_replaced  — { sectionTitle }
--   member_invited    — { memberEmail, role }
--   member_removed    — { memberEmail }
--   comment_added     — { sectionTitle?, commentId }
--   comment_resolved  — { commentId }
--   file_uploaded     — { fileName }
--   file_deleted      — { fileName }

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Project members (including owner) can view activity for their projects
CREATE POLICY "Project members can view activity"
ON public.activity_log FOR SELECT USING (
  public.is_project_owner(project_id) OR public.is_project_member(project_id)
);

-- Members can insert their own activity (client-side inserts)
CREATE POLICY "Project members can insert activity"
ON public.activity_log FOR INSERT WITH CHECK (
  (public.is_project_owner(project_id) OR public.is_project_member(project_id))
  AND user_id = auth.uid()
);

CREATE INDEX idx_activity_log_project ON public.activity_log(project_id, created_at DESC);
CREATE INDEX idx_activity_log_doc ON public.activity_log(doc_id, created_at DESC);
CREATE INDEX idx_activity_log_user ON public.activity_log(user_id, created_at DESC);
