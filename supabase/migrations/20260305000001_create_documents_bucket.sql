-- Create the 'documents' storage bucket used for DOCX files and templates.
-- Previously this was only a NOTE in 20260305000000_onlyoffice_storage.sql.

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;
