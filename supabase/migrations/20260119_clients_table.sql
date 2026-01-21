-- Migration: Create clients table for B2B outreach management
-- Date: 2026-01-19

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'other',
  website TEXT,
  description TEXT,
  company_type TEXT,
  services TEXT,
  revenue TEXT,
  employee_count TEXT,
  location TEXT,
  priority TEXT,
  logo_url TEXT,
  linkedin_url TEXT,
  estimated_time_savings TEXT,
  estimated_cost_savings TEXT,
  pain_points TEXT,
  contacts JSONB DEFAULT '[]'::jsonb,
  selected_skill_ids TEXT[] DEFAULT '{}',
  selected_workflow_ids TEXT[] DEFAULT '{}',
  custom_headline TEXT,
  custom_message TEXT,
  portal_slug TEXT NOT NULL UNIQUE,
  portal_enabled BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'prospect',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contacted_at TIMESTAMPTZ
);

-- Create index on portal_slug for fast lookups (used by client portal pages)
CREATE INDEX IF NOT EXISTS idx_clients_portal_slug ON public.clients(portal_slug);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- Create index on industry for filtering
CREATE INDEX IF NOT EXISTS idx_clients_industry ON public.clients(industry);

-- Create index on company_name for search
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON public.clients(company_name);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access for enabled portal pages
CREATE POLICY "Public can view enabled client portals"
  ON public.clients
  FOR SELECT
  USING (portal_enabled = true);

-- Policy: Allow authenticated users to manage all clients
-- (In production, you'd want to restrict this to admin users)
CREATE POLICY "Authenticated users can manage clients"
  ON public.clients
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow anon users to insert/update (for initial setup without auth)
-- Remove this policy in production if you want to require authentication
CREATE POLICY "Anon users can manage clients"
  ON public.clients
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.clients TO authenticated;
GRANT SELECT ON public.clients TO anon;
GRANT INSERT, UPDATE, DELETE ON public.clients TO anon; -- Remove in production

-- Add comment
COMMENT ON TABLE public.clients IS 'B2B client records for outreach and portal management';
