-- AIR Audit Module - additive schema for the SSP Visibility workbench.
-- This project uses organizations as the tenant boundary, so tenant_id from
-- the product spec is implemented as organization_id.

CREATE TABLE IF NOT EXISTS air_tier_configs (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  price_cents_min INTEGER,
  price_cents_max INTEGER,
  price_display TEXT NOT NULL,
  duration_label TEXT NOT NULL,
  duration_days INTEGER,
  description TEXT NOT NULL,
  deliverable_kind TEXT NOT NULL,
  requires_intake BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS air_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  tier_id TEXT NOT NULL REFERENCES air_tier_configs(id),
  parent_audit_id UUID REFERENCES air_audits(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'intake_in_progress', 'scoring', 'deliverable_review', 'published', 'completed', 'archived')),
  title TEXT,
  vertical TEXT,
  competitor_urls TEXT[] DEFAULT '{}',
  primary_website_url TEXT,
  intake_started_at TIMESTAMPTZ,
  intake_completed_at TIMESTAMPTZ,
  scored_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  public_slug TEXT UNIQUE,
  created_by UUID REFERENCES users(id),
  assigned_lead UUID REFERENCES users(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_air_audits_org ON air_audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_air_audits_client ON air_audits(client_id);
CREATE INDEX IF NOT EXISTS idx_air_audits_status ON air_audits(status);
CREATE INDEX IF NOT EXISTS idx_air_audits_parent ON air_audits(parent_audit_id);
CREATE INDEX IF NOT EXISTS idx_air_audits_public_slug ON air_audits(public_slug) WHERE public_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS air_audit_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES air_audits(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'auto',
  payload JSONB NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_air_audit_inputs_audit ON air_audit_inputs(audit_id);
CREATE INDEX IF NOT EXISTS idx_air_audit_inputs_type ON air_audit_inputs(audit_id, input_type);

CREATE TABLE IF NOT EXISTS air_audit_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES air_audits(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  sub_dimension TEXT NOT NULL,
  auto_score NUMERIC(3,1),
  analyst_score NUMERIC(3,1),
  final_score NUMERIC(3,1) NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  evidence_refs UUID[] DEFAULT '{}',
  reasoning TEXT,
  override_reason TEXT,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scored_by UUID REFERENCES users(id),
  UNIQUE(audit_id, domain, sub_dimension)
);

CREATE INDEX IF NOT EXISTS idx_air_audit_scores_audit ON air_audit_scores(audit_id);

CREATE TABLE IF NOT EXISTS air_audit_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES air_audits(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('strength', 'gap', 'risk', 'opportunity', 'context')),
  domain TEXT,
  title TEXT NOT NULL,
  body TEXT,
  source_input_id UUID REFERENCES air_audit_inputs(id),
  display_in_snapshot BOOLEAN DEFAULT FALSE,
  display_in_audit BOOLEAN DEFAULT TRUE,
  rank INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_air_audit_observations_audit ON air_audit_observations(audit_id);

CREATE TABLE IF NOT EXISTS air_audit_quick_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES air_audits(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  effort_label TEXT NOT NULL,
  timeline_label TEXT NOT NULL,
  projected_impact TEXT NOT NULL,
  ssp_service_match TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(audit_id, rank)
);

CREATE TABLE IF NOT EXISTS air_audit_roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES air_audits(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('month_1', 'month_2', 'month_3')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  body TEXT,
  owner_role TEXT,
  success_metric TEXT,
  effort_hours_est NUMERIC(5,1),
  monthly_savings_est INTEGER,
  monthly_revenue_est INTEGER,
  dependency_id UUID REFERENCES air_audit_roadmap_items(id),
  ssp_service_match TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_air_roadmap_audit ON air_audit_roadmap_items(audit_id);

CREATE TABLE IF NOT EXISTS air_audit_opportunity_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES air_audits(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  hours_recaptured_mo NUMERIC(5,1),
  revenue_impact_mo INTEGER,
  implementation_eff TEXT NOT NULL,
  risk TEXT NOT NULL,
  data_dependency TEXT,
  composite_score NUMERIC(5,2),
  selected_for_sprint BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(audit_id, rank)
);

CREATE TABLE IF NOT EXISTS air_audit_tool_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES air_audits(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  category TEXT,
  monthly_cost_usd NUMERIC(8,2),
  annual_cost_usd NUMERIC(10,2),
  primary_user TEXT,
  primary_purpose TEXT,
  last_meaningful_use TEXT,
  overlap_with TEXT[],
  recommendation TEXT,
  recommendation_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_air_tools_audit ON air_audit_tool_inventory(audit_id);

CREATE TABLE IF NOT EXISTS air_audit_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES air_audits(id) ON DELETE CASCADE,
  workflow_kind TEXT NOT NULL,
  steps JSONB NOT NULL,
  bottleneck_notes TEXT,
  dropout_notes TEXT,
  total_hours_per_week NUMERIC(5,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(audit_id, workflow_kind)
);

CREATE TABLE IF NOT EXISTS air_audit_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES air_audits(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  content JSONB NOT NULL,
  narrative_md TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by_model TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  is_latest BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(audit_id, kind, version)
);

CREATE INDEX IF NOT EXISTS idx_air_deliverables_audit ON air_audit_deliverables(audit_id);
CREATE INDEX IF NOT EXISTS idx_air_deliverables_latest ON air_audit_deliverables(audit_id, kind) WHERE is_latest = TRUE;

CREATE TABLE IF NOT EXISTS air_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES air_audits(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  actor_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_air_events_audit ON air_audit_events(audit_id, created_at);

CREATE TABLE IF NOT EXISTS air_ingestion_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL UNIQUE,
  source_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_air_ingestion_cache_expires ON air_ingestion_cache(expires_at);

INSERT INTO air_tier_configs (id, display_name, price_cents_min, price_cents_max, price_display, duration_label, duration_days, description, deliverable_kind, requires_intake, is_public, sort_order) VALUES
  ('air_snapshot', 'AIR Snapshot', 0, 0, 'Free', '48 hours', 2, '1-page AIR Score with 3 quick wins. Auto-generated from public data. No sales call required.', 'snapshot', FALSE, TRUE, 1),
  ('air_audit', 'AIR Audit', 750000, 750000, '$7,500', '30 days', 30, 'Full diagnostic with stakeholder interviews, CRM audit, and tool inventory. 90-day roadmap delivered as a working document.', 'audit', TRUE, FALSE, 2),
  ('air_foundation_sprint', 'Foundation Sprint', 1250000, 1800000, '$12,500-$18,000', '60 days', 60, 'For clients scoring 20-39. Data hygiene, workflow documentation, and one standardized workflow installed.', 'foundation_sprint', TRUE, FALSE, 3),
  ('air_transition_sprint', 'Transition Sprint', 2500000, 5000000, '$25,000-$50,000', '90 days', 90, 'Audit plus implementation. Lead Hub setup, MLH AI Employees deployed, team training, 60- and 90-day re-scoring.', 'transition_sprint', TRUE, FALSE, 4),
  ('air_operations', 'AI Operations', 200000, 500000, '$2,000-$5,000/mo', 'Ongoing', NULL, 'Managed services post-Sprint. Quarterly re-scoring, optimization, new automation builds, executive briefing per quarter.', 'operations', TRUE, FALSE, 5)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price_cents_min = EXCLUDED.price_cents_min,
  price_cents_max = EXCLUDED.price_cents_max,
  price_display = EXCLUDED.price_display,
  duration_label = EXCLUDED.duration_label,
  duration_days = EXCLUDED.duration_days,
  description = EXCLUDED.description,
  deliverable_kind = EXCLUDED.deliverable_kind,
  requires_intake = EXCLUDED.requires_intake,
  is_public = EXCLUDED.is_public,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

ALTER TABLE air_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_audit_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_audit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_audit_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_audit_quick_wins ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_audit_roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_audit_opportunity_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_audit_tool_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_audit_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_audit_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_ingestion_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage org AIR audits" ON air_audits
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage org AIR inputs" ON air_audit_inputs
  FOR ALL USING (audit_id IN (
    SELECT id FROM air_audits WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage org AIR scores" ON air_audit_scores
  FOR ALL USING (audit_id IN (
    SELECT id FROM air_audits WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage org AIR observations" ON air_audit_observations
  FOR ALL USING (audit_id IN (
    SELECT id FROM air_audits WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage org AIR quick wins" ON air_audit_quick_wins
  FOR ALL USING (audit_id IN (
    SELECT id FROM air_audits WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage org AIR roadmap" ON air_audit_roadmap_items
  FOR ALL USING (audit_id IN (
    SELECT id FROM air_audits WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage org AIR opportunity matrix" ON air_audit_opportunity_matrix
  FOR ALL USING (audit_id IN (
    SELECT id FROM air_audits WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage org AIR tools" ON air_audit_tool_inventory
  FOR ALL USING (audit_id IN (
    SELECT id FROM air_audits WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage org AIR workflows" ON air_audit_workflows
  FOR ALL USING (audit_id IN (
    SELECT id FROM air_audits WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage org AIR deliverables" ON air_audit_deliverables
  FOR ALL USING (audit_id IN (
    SELECT id FROM air_audits WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can read org AIR events" ON air_audit_events
  FOR SELECT USING (audit_id IN (
    SELECT id FROM air_audits WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage org AIR ingestion cache" ON air_ingestion_cache
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
