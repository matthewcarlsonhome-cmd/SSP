-- SEO/AEO/GEO Optimizer — Initial Database Schema
-- Run this migration against your Supabase project

-- Organization / agency
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users (agency team members)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client profiles (reusable across audits)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  business_type TEXT,
  industry TEXT,
  target_geography TEXT,
  primary_goal TEXT,
  gbp_url TEXT,
  gbp_review_count INTEGER,
  gbp_average_rating DECIMAL(2,1),
  cms_platform TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Competitors linked to a client
CREATE TABLE client_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT,
  website_url TEXT NOT NULL,
  review_count INTEGER,
  average_rating DECIMAL(2,1),
  notes TEXT
);

-- Target keywords for a client
CREATE TABLE client_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  search_intent TEXT CHECK (search_intent IN (
    'informational', 'commercial', 'transactional', 'navigational', 'local'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  current_ranking INTEGER,
  notes TEXT
);

-- Audit jobs (each run of the optimizer)
CREATE TABLE audit_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  created_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'crawling', 'analyzing_competitors', 'optimizing_pages',
    'generating_report', 'completed', 'failed'
  )),
  progress INTEGER DEFAULT 0,
  current_step TEXT,

  -- Input overrides for this specific run
  input_brief JSONB,
  uploaded_file_path TEXT,

  -- Agent outputs (stored as JSONB for flexibility)
  site_crawl_results JSONB,
  competitor_analysis JSONB,
  gap_analysis JSONB,
  topical_architecture JSONB,
  page_optimizations JSONB,
  technical_audit JSONB,
  offpage_strategy JSONB,
  roadmap JSONB,
  measurement_framework JSONB,

  -- Generated file paths
  report_docx_path TEXT,
  report_pdf_path TEXT,
  schema_zip_path TEXT,
  roadmap_csv_path TEXT,
  full_package_zip_path TEXT,

  -- Metadata
  total_pages_audited INTEGER,
  total_tokens_used INTEGER,
  estimated_cost DECIMAL(8,4),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual page audit results (one row per page per job)
CREATE TABLE page_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES audit_jobs(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  page_title TEXT,
  page_type TEXT,
  health_score INTEGER,
  cluster_role TEXT,
  primary_keyword TEXT,
  search_intent TEXT,

  -- Current state
  current_title_tag TEXT,
  current_meta_description TEXT,
  current_h1 TEXT,
  current_word_count INTEGER,
  current_schema_types TEXT[],
  has_answer_block BOOLEAN DEFAULT false,
  has_faq_section BOOLEAN DEFAULT false,

  -- Recommendations (stored as JSONB for rich structure)
  optimization_spec JSONB,
  generated_schema_code TEXT,
  recommended_title TEXT,
  recommended_meta TEXT,
  recommended_h1 TEXT,
  answer_block_text TEXT,
  heading_structure JSONB,
  content_requirements JSONB,
  internal_linking_plan JSONB,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Backlink opportunities identified
CREATE TABLE link_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES audit_jobs(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  target_domain TEXT,
  opportunity_type TEXT,
  priority TEXT DEFAULT 'medium',
  links_to_competitors TEXT[],
  outreach_approach TEXT,
  status TEXT DEFAULT 'identified',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Citation/directory tasks
CREATE TABLE citation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES audit_jobs(id) ON DELETE CASCADE,
  directory_name TEXT NOT NULL,
  directory_url TEXT,
  current_status TEXT,
  priority TEXT DEFAULT 'medium',
  action_needed TEXT,
  notes TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can access data within their organization
CREATE POLICY "Users can view own org" ON organizations
  FOR SELECT USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view org clients" ON clients
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view client competitors" ON client_competitors
  FOR ALL USING (client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can view client keywords" ON client_keywords
  FOR ALL USING (client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can view org audit jobs" ON audit_jobs
  FOR ALL USING (client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can view job page audits" ON page_audits
  FOR ALL USING (job_id IN (
    SELECT id FROM audit_jobs WHERE client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can view job link opps" ON link_opportunities
  FOR ALL USING (job_id IN (
    SELECT id FROM audit_jobs WHERE client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can view job citations" ON citation_tasks
  FOR ALL USING (job_id IN (
    SELECT id FROM audit_jobs WHERE client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  ));

-- Enable real-time subscriptions for audit_jobs (progress tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE audit_jobs;

-- Indexes for performance
CREATE INDEX idx_clients_org ON clients(organization_id);
CREATE INDEX idx_audit_jobs_client ON audit_jobs(client_id);
CREATE INDEX idx_audit_jobs_status ON audit_jobs(status);
CREATE INDEX idx_page_audits_job ON page_audits(job_id);
CREATE INDEX idx_link_opportunities_job ON link_opportunities(job_id);
CREATE INDEX idx_citation_tasks_job ON citation_tasks(job_id);
