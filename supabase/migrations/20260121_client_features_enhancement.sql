-- Client Features Enhancement Migration
-- Date: 2026-01-21
-- Features: Contact Activity Timeline, Portal Analytics, Email Sequences

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CONTACT ACTIVITY TIMELINE
-- Track all interactions per contact (emails, calls, LinkedIn, meetings)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.contact_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL,  -- UUID of the contact within the client's contacts array

  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'linkedin_connect_sent',
    'linkedin_connect_accepted',
    'linkedin_message_sent',
    'linkedin_message_received',
    'email_sent',
    'email_received',
    'email_opened',
    'email_clicked',
    'call_made',
    'call_received',
    'meeting_scheduled',
    'meeting_completed',
    'portal_shared',
    'note_added',
    'status_changed'
  )),

  -- Activity content/details
  subject TEXT,                    -- Email subject or meeting title
  body TEXT,                       -- Email body, call notes, etc.
  outcome TEXT,                    -- Result of the activity (e.g., "Left voicemail", "Interested in demo")

  -- Metadata
  channel TEXT,                    -- 'linkedin', 'email', 'phone', 'in_person', 'portal'
  direction TEXT CHECK (direction IN ('outbound', 'inbound', 'internal')),

  -- Email tracking (for email sequences)
  email_sequence_id UUID,          -- Link to email sequence if part of one
  email_sequence_step INTEGER,     -- Step number in sequence

  -- Timestamps
  activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT                  -- User who logged the activity
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_contact_activities_client_id ON public.contact_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_contact_id ON public.contact_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_type ON public.contact_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_contact_activities_activity_at ON public.contact_activities(activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_activities_sequence ON public.contact_activities(email_sequence_id) WHERE email_sequence_id IS NOT NULL;

-- RLS
ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage contact activities"
  ON public.contact_activities FOR ALL
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. PORTAL ANALYTICS
-- Track visits to client portal pages
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.portal_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  portal_slug TEXT NOT NULL,

  -- Visit details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view',
    'skill_click',
    'workflow_click',
    'skill_demo_start',
    'skill_demo_complete',
    'workflow_demo_start',
    'workflow_demo_complete',
    'cta_click',
    'contact_click',
    'scroll_depth'
  )),

  -- Event data
  item_id TEXT,                    -- Skill or workflow ID if applicable
  item_name TEXT,                  -- Skill or workflow name
  scroll_percent INTEGER,          -- For scroll_depth events
  time_on_page_seconds INTEGER,    -- Time spent on page before event

  -- Visitor info (anonymized)
  visitor_id TEXT,                 -- Anonymous session ID
  referrer TEXT,                   -- Where they came from
  user_agent TEXT,                 -- Browser info

  -- Location (if available)
  country TEXT,
  region TEXT,
  city TEXT,

  -- Timestamps
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_analytics_client_id ON public.portal_analytics(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_analytics_portal_slug ON public.portal_analytics(portal_slug);
CREATE INDEX IF NOT EXISTS idx_portal_analytics_event_type ON public.portal_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_portal_analytics_event_at ON public.portal_analytics(event_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_analytics_visitor ON public.portal_analytics(visitor_id);

-- RLS - Allow anonymous writes (from portal visitors) and authenticated reads
ALTER TABLE public.portal_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert portal analytics"
  ON public.portal_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view portal analytics"
  ON public.portal_analytics FOR SELECT
  TO authenticated
  USING (true);

-- Also allow anon to view for now (admin dashboards)
CREATE POLICY "Anon can view portal analytics"
  ON public.portal_analytics FOR SELECT
  TO anon
  USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. EMAIL SEQUENCES
-- Templates for multi-step email campaigns
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sequence metadata
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,                   -- Target industry (can be null for universal)
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,

  -- Step configuration
  step_number INTEGER NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,  -- Days after previous step

  -- Email content (with template variables)
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,

  -- Optional: Different content based on conditions
  condition_type TEXT,             -- e.g., 'no_response', 'opened', 'clicked'

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(sequence_id, step_number)
);

-- Track which contacts are enrolled in which sequences
CREATE TABLE IF NOT EXISTS public.contact_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,

  -- Progress
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'unsubscribed', 'bounced')),

  -- Timestamps
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_step_at TIMESTAMPTZ,
  next_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  UNIQUE(client_id, contact_id, sequence_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_sequences_industry ON public.email_sequences(industry);
CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_sequence ON public.email_sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_contact_sequence_enrollments_client ON public.contact_sequence_enrollments(client_id);
CREATE INDEX IF NOT EXISTS idx_contact_sequence_enrollments_status ON public.contact_sequence_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_contact_sequence_enrollments_next_step ON public.contact_sequence_enrollments(next_step_at)
  WHERE status = 'active';

-- RLS
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage email sequences"
  ON public.email_sequences FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage email sequence steps"
  ON public.email_sequence_steps FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage sequence enrollments"
  ON public.contact_sequence_enrollments FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. CLIENT RESEARCH CACHE
-- Store AI-generated research to avoid re-fetching
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.client_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Research data
  research_type TEXT NOT NULL CHECK (research_type IN (
    'company_overview',
    'linkedin_profile',
    'recent_news',
    'tech_stack',
    'pain_points',
    'competitor_analysis',
    'contact_enrichment'
  )),

  -- Results
  raw_data JSONB,                  -- Original API response
  summary TEXT,                    -- AI-generated summary
  key_insights TEXT[],             -- Array of bullet points
  suggested_skills TEXT[],         -- Skill IDs that might be relevant
  suggested_workflows TEXT[],      -- Workflow IDs that might be relevant
  confidence_score DECIMAL(3,2),   -- 0.00 to 1.00

  -- Source tracking
  source_url TEXT,
  source_name TEXT,                -- 'linkedin', 'clearbit', 'news_api', 'web_scrape', 'ai_analysis'

  -- Timestamps
  researched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,          -- When to refresh

  UNIQUE(client_id, research_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_research_client_id ON public.client_research(client_id);
CREATE INDEX IF NOT EXISTS idx_client_research_type ON public.client_research(research_type);
CREATE INDEX IF NOT EXISTS idx_client_research_expires ON public.client_research(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE public.client_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage client research"
  ON public.client_research FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ENHANCED PORTAL TEST VALIDATION
-- Additional checks for comprehensive portal testing
-- ═══════════════════════════════════════════════════════════════════════════

-- Add new columns to portal_test_results for enhanced validation
ALTER TABLE portal_test_results
  ADD COLUMN IF NOT EXISTS validation_type TEXT DEFAULT 'skill_execution',
  ADD COLUMN IF NOT EXISTS page_load_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS roi_calculation_valid BOOLEAN,
  ADD COLUMN IF NOT EXISTS skill_cards_rendered INTEGER,
  ADD COLUMN IF NOT EXISTS workflow_cards_rendered INTEGER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. GRANTS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT ALL ON public.contact_activities TO authenticated;
GRANT ALL ON public.contact_activities TO anon;

GRANT ALL ON public.portal_analytics TO authenticated;
GRANT INSERT, SELECT ON public.portal_analytics TO anon;

GRANT ALL ON public.email_sequences TO authenticated;
GRANT ALL ON public.email_sequences TO anon;

GRANT ALL ON public.email_sequence_steps TO authenticated;
GRANT ALL ON public.email_sequence_steps TO anon;

GRANT ALL ON public.contact_sequence_enrollments TO authenticated;
GRANT ALL ON public.contact_sequence_enrollments TO anon;

GRANT ALL ON public.client_research TO authenticated;
GRANT ALL ON public.client_research TO anon;

-- Comments
COMMENT ON TABLE public.contact_activities IS 'Timeline of all interactions with contacts';
COMMENT ON TABLE public.portal_analytics IS 'Tracking data for client portal visits and engagement';
COMMENT ON TABLE public.email_sequences IS 'Multi-step email campaign templates';
COMMENT ON TABLE public.email_sequence_steps IS 'Individual steps within email sequences';
COMMENT ON TABLE public.contact_sequence_enrollments IS 'Tracks which contacts are in which sequences';
COMMENT ON TABLE public.client_research IS 'Cached AI research results for clients';
