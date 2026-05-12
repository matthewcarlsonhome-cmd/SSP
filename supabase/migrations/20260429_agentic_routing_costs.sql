-- Add model routing and cost attribution fields to agentic skill executions.
-- Idempotent so local and hosted databases can apply it safely.

ALTER TABLE agentic.skill_executions
  ADD COLUMN IF NOT EXISTS model_id TEXT,
  ADD COLUMN IF NOT EXISTS model_provider TEXT,
  ADD COLUMN IF NOT EXISTS model_tier TEXT,
  ADD COLUMN IF NOT EXISTS price_snapshot_id TEXT,
  ADD COLUMN IF NOT EXISTS estimated_cost_cents NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_cost_cents NUMERIC,
  ADD COLUMN IF NOT EXISTS tokens_in INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_out INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_cached_read INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_cached_write INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_reasoning INTEGER,
  ADD COLUMN IF NOT EXISTS routing_reason TEXT,
  ADD COLUMN IF NOT EXISTS routing_rejected_candidates JSONB;

CREATE INDEX IF NOT EXISTS idx_agentic_skill_exec_model_id
  ON agentic.skill_executions(model_id);

CREATE INDEX IF NOT EXISTS idx_agentic_skill_exec_model_tier
  ON agentic.skill_executions(model_tier);
