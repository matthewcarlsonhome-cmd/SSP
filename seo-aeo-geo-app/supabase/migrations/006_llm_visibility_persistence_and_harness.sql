-- Durable LLM Visibility evidence and architecture review harness

CREATE TABLE IF NOT EXISTS llm_visibility_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  prior_audit_id UUID REFERENCES llm_visibility_audits(id) ON DELETE SET NULL,
  title TEXT,
  business_name TEXT NOT NULL,
  website_url TEXT,
  niche TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  audit_profile_id TEXT NOT NULL DEFAULT 'madison-mvp',
  industry_pack_id TEXT,
  selected_providers TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'review', 'report_ready', 'published', 'archived')),
  visibility_score NUMERIC(5,2),
  workbook_average NUMERIC(3,2),
  metrics_json JSONB NOT NULL DEFAULT '{}',
  report_json JSONB NOT NULL DEFAULT '{}',
  action_plan_json JSONB NOT NULL DEFAULT '[]',
  public_slug TEXT UNIQUE,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_visibility_audits_org ON llm_visibility_audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_llm_visibility_audits_client ON llm_visibility_audits(client_id);
CREATE INDEX IF NOT EXISTS idx_llm_visibility_audits_public_slug ON llm_visibility_audits(public_slug) WHERE public_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS llm_visibility_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES llm_visibility_audits(id) ON DELETE CASCADE,
  query_id TEXT,
  query_code TEXT,
  query_category TEXT,
  exact_prompt TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('chatgpt', 'claude', 'gemini', 'perplexity', 'manual')),
  capture_mode TEXT NOT NULL DEFAULT 'api' CHECK (capture_mode IN ('api', 'manual', 'hybrid')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'captured', 'manual', 'error', 'excluded')),
  qa_status TEXT NOT NULL DEFAULT 'unreviewed',
  model_id TEXT,
  raw_response TEXT,
  raw_response_json JSONB,
  citations JSONB NOT NULL DEFAULT '[]',
  source_urls TEXT[] NOT NULL DEFAULT '{}',
  screenshot_urls TEXT[] NOT NULL DEFAULT '{}',
  scorer TEXT,
  score_json JSONB NOT NULL DEFAULT '{}',
  evidence_note TEXT,
  caveat_text TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_visibility_runs_audit ON llm_visibility_runs(audit_id);
CREATE INDEX IF NOT EXISTS idx_llm_visibility_runs_provider ON llm_visibility_runs(audit_id, provider);
CREATE INDEX IF NOT EXISTS idx_llm_visibility_runs_category ON llm_visibility_runs(audit_id, query_category);

CREATE TABLE IF NOT EXISTS llm_visibility_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES llm_visibility_audits(id) ON DELETE SET NULL,
  public_slug TEXT,
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  website_url TEXT,
  business_category TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_visibility_leads_audit ON llm_visibility_leads(audit_id);
CREATE INDEX IF NOT EXISTS idx_llm_visibility_leads_slug ON llm_visibility_leads(public_slug);

CREATE TABLE IF NOT EXISTS llm_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('chatgpt', 'claude', 'gemini', 'perplexity', 'firecrawl')),
  label TEXT,
  encrypted_key TEXT NOT NULL,
  key_hint TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider, label)
);

CREATE INDEX IF NOT EXISTS idx_llm_provider_keys_org ON llm_provider_keys(organization_id);

CREATE TABLE IF NOT EXISTS architecture_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  title TEXT NOT NULL,
  spec_markdown TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'retired')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS architecture_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID REFERENCES architecture_specs(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  review_kind TEXT NOT NULL CHECK (review_kind IN ('duplo_spec', 'orchestra_review', 'vroom_audit', 'security_review', 'release_review')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'deferred', 'resolved')),
  summary TEXT,
  findings JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS release_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  branch_name TEXT,
  commit_sha TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'waived')),
  checks JSONB NOT NULL DEFAULT '[]',
  waiver_reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runtime_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),
  subject_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_architecture_reviews_org ON architecture_reviews(organization_id, module);
CREATE INDEX IF NOT EXISTS idx_release_gates_org ON release_gates(organization_id, module);
CREATE INDEX IF NOT EXISTS idx_runtime_audit_events_org ON runtime_audit_events(organization_id, module, created_at);

ALTER TABLE llm_visibility_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_visibility_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_visibility_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage org LLM visibility audits" ON llm_visibility_audits
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage org LLM visibility runs" ON llm_visibility_runs
  FOR ALL USING (audit_id IN (
    SELECT id FROM llm_visibility_audits
    WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can read org LLM visibility leads" ON llm_visibility_leads
  FOR SELECT USING (
    audit_id IN (
      SELECT id FROM llm_visibility_audits
      WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage org provider keys" ON llm_provider_keys
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage org architecture specs" ON architecture_specs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage org architecture reviews" ON architecture_reviews
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage org release gates" ON release_gates
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can read org runtime audit events" ON runtime_audit_events
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
