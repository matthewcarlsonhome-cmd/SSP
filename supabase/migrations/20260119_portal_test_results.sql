-- Portal Test Results Schema
-- Stores results from automated portal testing to verify skills/workflows work

-- Test Runs table (one row per "Test All Portals" execution)
CREATE TABLE IF NOT EXISTS portal_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),

  -- Summary stats
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  failed_tests INTEGER NOT NULL DEFAULT 0,
  skipped_tests INTEGER NOT NULL DEFAULT 0,

  -- Configuration
  clients_tested INTEGER NOT NULL DEFAULT 0,
  skills_per_client INTEGER NOT NULL DEFAULT 0,
  workflows_per_client INTEGER NOT NULL DEFAULT 0,

  -- Cost tracking
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  estimated_cost_cents INTEGER DEFAULT 0,

  -- Who initiated
  initiated_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual Test Results (one row per skill/workflow test)
CREATE TABLE IF NOT EXISTS portal_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES portal_test_runs(id) ON DELETE CASCADE,

  -- What was tested
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  portal_slug TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('skill', 'workflow')),
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,

  -- Result
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped', 'running')),
  error_message TEXT,

  -- Performance metrics
  duration_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,

  -- Output sample (truncated for storage)
  output_preview TEXT,

  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_portal_test_runs_status ON portal_test_runs(status);
CREATE INDEX IF NOT EXISTS idx_portal_test_runs_started_at ON portal_test_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_test_results_run_id ON portal_test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_portal_test_results_client_id ON portal_test_results(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_test_results_status ON portal_test_results(status);

-- RLS Policies
ALTER TABLE portal_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_test_results ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view and create test runs
CREATE POLICY "Authenticated users can view test runs"
  ON portal_test_runs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create test runs"
  ON portal_test_runs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update test runs"
  ON portal_test_runs FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to view and create test results
CREATE POLICY "Authenticated users can view test results"
  ON portal_test_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create test results"
  ON portal_test_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update test results"
  ON portal_test_results FOR UPDATE
  TO authenticated
  USING (true);
