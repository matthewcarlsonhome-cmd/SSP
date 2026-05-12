-- Add first-class lookup provenance for CRM prospect imports.
-- These fields keep provider/source data inspectable instead of burying it in notes.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source_provider TEXT,
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS lookup_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS lookup_raw JSONB;

CREATE INDEX IF NOT EXISTS idx_clients_source_provider ON public.clients(source_provider);
CREATE INDEX IF NOT EXISTS idx_clients_source_external_id ON public.clients(source_external_id);

COMMENT ON COLUMN public.clients.source_provider IS 'Lookup/import provider used to create the prospect, such as google_places or manual.';
COMMENT ON COLUMN public.clients.source_external_id IS 'Provider-specific external identifier, such as a Google Places place ID.';
COMMENT ON COLUMN public.clients.source_url IS 'Source URL used for prospect import, such as website, maps URL, or directory URL.';
COMMENT ON COLUMN public.clients.lookup_confidence IS '0-1 confidence score assigned during local business lookup/enrichment.';
COMMENT ON COLUMN public.clients.lookup_raw IS 'Raw normalized lookup payload for audit/debugging.';
