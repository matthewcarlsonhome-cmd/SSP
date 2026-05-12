-- Add first-class quality telemetry for agentic runs.
-- The Cost Explorer can use these rows for attribution instead of inferring
-- quality from skill_executions alone.

CREATE TABLE IF NOT EXISTS agentic.quality_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_run_id UUID NOT NULL REFERENCES agentic.agent_runs(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  skill_id TEXT,
  round_index INTEGER NOT NULL DEFAULT 0,
  model_id TEXT,
  model_provider TEXT,
  model_tier TEXT,
  evaluator_id TEXT NOT NULL DEFAULT 'deterministic-contract',
  status TEXT NOT NULL,
  decision TEXT NOT NULL,
  contract_completeness NUMERIC NOT NULL DEFAULT 0,
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  present_required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  optional_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  present_optional_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  retry_count INTEGER NOT NULL DEFAULT 0,
  escalation_tier TEXT,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agentic.quality_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'agentic'
      AND tablename = 'quality_events'
      AND policyname = 'agentic_quality_events_admin'
  ) THEN
    CREATE POLICY agentic_quality_events_admin
      ON agentic.quality_events
      FOR ALL
      USING (agentic.is_admin());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agentic_quality_events_run
  ON agentic.quality_events(agent_run_id);

CREATE INDEX IF NOT EXISTS idx_agentic_quality_events_workflow
  ON agentic.quality_events(workflow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agentic_quality_events_step
  ON agentic.quality_events(step_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agentic_quality_events_tier
  ON agentic.quality_events(model_tier, created_at DESC);

GRANT ALL ON TABLE agentic.quality_events TO authenticated, service_role;
