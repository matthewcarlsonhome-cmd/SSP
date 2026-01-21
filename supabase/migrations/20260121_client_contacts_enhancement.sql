-- Migration: Enhance clients table with technical research and multi-contact support
-- Date: 2026-01-21

-- Add company technical research fields
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS company_technical_info TEXT,
ADD COLUMN IF NOT EXISTS key_use_cases TEXT[] DEFAULT '{}';

-- Note: The contacts JSONB field already exists.
-- We're enhancing the structure to support:
-- - Multiple contacts (1-3) with enhanced fields
-- - Per-contact messaging (linkedInConnectMessage, linkedInFollowupMessage)
-- - Contact status tracking
-- - Contact background notes and dates

-- Update comment on table
COMMENT ON TABLE public.clients IS 'B2B client records for outreach and portal management. Contacts stored as JSONB array with per-contact messaging and status tracking.';

-- Add comment on new columns
COMMENT ON COLUMN public.clients.company_technical_info IS 'Technical stack, key use cases, research notes for determining skill/workflow fits';
COMMENT ON COLUMN public.clients.key_use_cases IS 'Array of identified use cases for quick scanning and filtering';
