-- Unified client workbench dashboard
-- Stores cross-tool run progress, reporting summaries, and recommended optimizations
-- for SEO/AEO/GEO, Firecrawl site crawls, LLM Visibility, and AIR audits.

CREATE TABLE IF NOT EXISTS client_audit_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Client visibility cycle',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'running', 'review', 'completed', 'archived')),
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  latest_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_tool_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES client_audit_cycles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tool_key TEXT NOT NULL CHECK (tool_key IN ('firecrawl', 'seo_geo', 'llm_visibility', 'air')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'queued', 'running', 'completed', 'failed', 'needs_review')),
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  source_table TEXT,
  source_id UUID,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES client_audit_cycles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source_tool TEXT NOT NULL CHECK (source_tool IN ('firecrawl', 'seo_geo', 'llm_visibility', 'air', 'manual')),
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_fix TEXT,
  owner TEXT DEFAULT 'agency',
  estimated_hours NUMERIC(6,2),
  estimated_price INTEGER,
  status TEXT NOT NULL DEFAULT 'recommended' CHECK (status IN ('recommended', 'accepted', 'in_progress', 'done', 'wont_fix')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_audit_cycles_org_client ON client_audit_cycles(organization_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_audit_cycles_status ON client_audit_cycles(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_client_tool_runs_cycle ON client_tool_runs(cycle_id);
CREATE INDEX IF NOT EXISTS idx_client_tool_runs_client_tool ON client_tool_runs(client_id, tool_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_tool_runs_source ON client_tool_runs(source_table, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_recommendations_client ON client_recommendations(client_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_client_recommendations_cycle ON client_recommendations(cycle_id);
CREATE INDEX IF NOT EXISTS idx_client_recommendations_source ON client_recommendations(source_tool);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_tool_runs_unique_source
  ON client_tool_runs(client_id, tool_key, source_table, source_id)
  WHERE source_id IS NOT NULL;

ALTER TABLE client_audit_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tool_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org audit cycles" ON client_audit_cycles
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view org tool runs" ON client_tool_runs
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view org recommendations" ON client_recommendations
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));
