-- Add model jsonb column to prototypes table.
-- Stores the raw PrototypeModel JSON returned by the LLM, enabling future
-- per-page editing without re-parsing the assembled HTML.
-- Nullable — existing rows keep working unchanged.

ALTER TABLE public.prototypes
  ADD COLUMN IF NOT EXISTS model jsonb;
