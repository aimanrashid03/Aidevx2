-- Section content persistence: stores AI-generated HTML per section so the
-- AI panel can reload it without reprocessing the DOCX, and replace_section
-- can inject it server-side into the document.

CREATE TABLE public.section_content (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    uuid        REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  doc_id        text        NOT NULL,
  section_title text        NOT NULL,
  html          text        NOT NULL DEFAULT '',
  sources       text[]      NOT NULL DEFAULT '{}',
  content_type  text        NOT NULL DEFAULT 'text'
                            CHECK (content_type IN ('text', 'table', 'diagram')),
  diagram_type  text        CHECK (diagram_type IS NULL OR diagram_type IN ('mermaid', 'drawio')),
  is_in_document boolean    NOT NULL DEFAULT false,
  created_by    uuid        REFERENCES auth.users NOT NULL,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE (doc_id, section_title)
);

ALTER TABLE public.section_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view section content"
ON public.section_content FOR SELECT USING (
  public.is_project_owner(project_id) OR public.is_project_member(project_id)
);

CREATE POLICY "Project editors can insert section content"
ON public.section_content FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.project_members
    WHERE project_members.project_id = section_content.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner'))
);

CREATE POLICY "Project editors can update section content"
ON public.section_content FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.project_members
    WHERE project_members.project_id = section_content.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner'))
);

CREATE POLICY "Project editors can delete section content"
ON public.section_content FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.project_members
    WHERE project_members.project_id = section_content.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('editor', 'owner'))
);

CREATE INDEX idx_section_content_doc_id ON public.section_content(doc_id);
CREATE INDEX idx_section_content_project_id ON public.section_content(project_id);
