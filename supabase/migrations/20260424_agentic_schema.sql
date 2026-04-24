-- ═══════════════════════════════════════════════════════════════════════════
-- AGENTIC SCHEMA — Isolated namespace for the Business OS / agentic workflow
-- experiment. Drops cleanly: `DROP SCHEMA agentic CASCADE;` removes everything
-- here without touching the existing `public` tables.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS agentic;

-- ─────────────────────────────────────────────────────────────────────────────
-- events: every observable thing that happens (cron tick, inbound webhook,
-- manual trigger, derived signal). Agents subscribe via polling for now.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agentic.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,                    -- 'cron' | 'webhook' | 'manual' | 'derived'
  kind TEXT NOT NULL,                      -- e.g., 'monday.triage.due', 'email.received'
  subject_type TEXT,                       -- 'client' | 'account' | 'deal' | NULL
  subject_id TEXT,                         -- soft reference, no FK
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agentic_events_kind ON agentic.events(kind);
CREATE INDEX IF NOT EXISTS idx_agentic_events_unprocessed
  ON agentic.events(received_at) WHERE processed_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- agent_runs: a single decision-and-execution cycle by an agent. The plan
-- column captures what the agent decided to do and why so runs are inspectable.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agentic.agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL,                  -- e.g., 'ppc-ops', 'client-success'
  trigger_event_id UUID REFERENCES agentic.events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|planning|running|succeeded|failed|awaiting_approval
  plan JSONB,                              -- ExecutionPlan serialized
  summary TEXT,                            -- human-readable narrative of what was done
  cost_cents INTEGER NOT NULL DEFAULT 0,
  token_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_agentic_agent_runs_agent_id ON agentic.agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agentic_agent_runs_status ON agentic.agent_runs(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- skill_executions: each tool/skill invocation inside an agent run. Replaces
-- ephemeral workflow step state for agentic runs (existing workflows untouched).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agentic.skill_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_run_id UUID NOT NULL REFERENCES agentic.agent_runs(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  step_id TEXT,                            -- planner-assigned id within a run
  round_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|running|succeeded|failed|skipped
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_output TEXT,
  structured_output JSONB,                 -- contract-extracted fields
  duration_ms INTEGER,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agentic_skill_exec_run ON agentic.skill_executions(agent_run_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- entity_context: the living memory. Structured facts about business
-- entities derived from runs. Indexed by (entity_type, entity_id, key) so
-- future runs can read the current known state without re-running upstream
-- work. Soft-references `public.clients` etc. — no FK to keep coupling loose.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agentic.entity_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,               -- 'client' | 'account' | 'deal' | 'prospect'
  entity_id TEXT NOT NULL,                 -- soft reference
  key TEXT NOT NULL,                       -- e.g., 'priority', 'health_score', 'last_anomaly'
  value JSONB NOT NULL,
  confidence NUMERIC(3,2),                 -- 0.00 - 1.00
  source_run_id UUID REFERENCES agentic.agent_runs(id) ON DELETE SET NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,                 -- NULL = no expiry
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agentic_entity_context_lookup
  ON agentic.entity_context(entity_type, entity_id, key);
CREATE INDEX IF NOT EXISTS idx_agentic_entity_context_valid
  ON agentic.entity_context(entity_type, entity_id, key, valid_from DESC)
  WHERE valid_until IS NULL OR valid_until > NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- policies: human-set guardrails. Evaluated by the policy engine before any
-- action with side effects (sending email, modifying ad account, etc.).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agentic.policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope TEXT NOT NULL,                     -- 'global' | 'agent:<id>' | 'workflow:<id>'
  rule JSONB NOT NULL,                     -- structured rule definition
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- approvals: human-in-the-loop gates raised by an agent run. Reviewer can
-- approve, edit (modify the proposed action), or reject.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agentic.approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_run_id UUID NOT NULL REFERENCES agentic.agent_runs(id) ON DELETE CASCADE,
  requested_action JSONB NOT NULL,         -- structured proposed action
  reasoning TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  decision TEXT,                           -- 'approved' | 'edited' | 'rejected'
  decision_notes TEXT,
  edited_action JSONB                      -- if decision = 'edited'
);

CREATE INDEX IF NOT EXISTS idx_agentic_approvals_pending
  ON agentic.approvals(requested_at) WHERE resolved_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — admin-only during the experiment. Loosen as features
-- graduate from the beta nav.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE agentic.events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentic.agent_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentic.skill_executions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentic.entity_context    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentic.policies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentic.approvals         ENABLE ROW LEVEL SECURITY;

-- Helper: is the calling user an admin?
CREATE OR REPLACE FUNCTION agentic.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY agentic_events_admin       ON agentic.events           FOR ALL USING (agentic.is_admin());
CREATE POLICY agentic_runs_admin         ON agentic.agent_runs       FOR ALL USING (agentic.is_admin());
CREATE POLICY agentic_skill_exec_admin   ON agentic.skill_executions FOR ALL USING (agentic.is_admin());
CREATE POLICY agentic_entity_ctx_admin   ON agentic.entity_context   FOR ALL USING (agentic.is_admin());
CREATE POLICY agentic_policies_admin     ON agentic.policies         FOR ALL USING (agentic.is_admin());
CREATE POLICY agentic_approvals_admin    ON agentic.approvals        FOR ALL USING (agentic.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Expose the schema to PostgREST so the Supabase JS client can query it.
-- Requires `agentic` to be added to db.schemas in supabase/config.toml or the
-- Supabase project API settings — documented in the agentic README.
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA agentic TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA agentic TO authenticated, service_role;

COMMENT ON SCHEMA agentic IS
  'Isolated schema for the Business OS / agentic workflow experiment. '
  'Safe to drop with CASCADE to remove the entire feature.';
