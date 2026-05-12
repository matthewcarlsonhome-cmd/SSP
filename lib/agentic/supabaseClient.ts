/**
 * supabaseClient.ts — typed read/write helpers for the `agentic.*` schema.
 *
 * Uses the same Supabase client the rest of the app uses, but accesses the
 * isolated `agentic` schema. The schema must be exposed in PostgREST (added
 * to db.schemas in supabase/config.toml or via the project settings).
 *
 * If supabase isn't configured (e.g., local dev without env vars), all
 * helpers return null / [] without throwing so UIs can render an empty
 * state instead of crashing. Persistence is best-effort during the beta.
 */

import { supabase as defaultClient } from '../supabase';
import { logger } from '../logger';
import type { ExecutionPlan, StepStatus } from './types';

const AGENTIC_SCHEMA = 'agentic';

function client() {
  if (!defaultClient) return null;
  // The Supabase JS client supports schema scoping via .schema()
  // The TypeScript types are public-only, so we use a loose cast here. This
  // is a pragmatic boundary for the beta — once the schema is included in
  // generated types we can drop the cast.
  return (defaultClient as unknown as { schema: (s: string) => typeof defaultClient }).schema(
    AGENTIC_SCHEMA,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Persisted shapes — mirror the migration schema, kept loose to survive minor
// column additions during the beta.
// ─────────────────────────────────────────────────────────────────────────────

export interface PersistedAgentRun {
  id: string;
  agent_id: string;
  trigger_event_id: string | null;
  status: 'pending' | 'planning' | 'running' | 'succeeded' | 'failed' | 'awaiting_approval';
  plan: ExecutionPlan | null;
  summary: string | null;
  cost_cents: number;
  started_at: string;
  completed_at: string | null;
}

export interface PersistedSkillExecution {
  id: string;
  agent_run_id: string;
  skill_id: string;
  step_id: string | null;
  round_index: number;
  status: StepStatus | string;
  inputs: Record<string, unknown>;
  raw_output: string | null;
  structured_output: Record<string, unknown> | null;
  duration_ms: number | null;
  cost_cents: number;
  model_id: string | null;
  model_provider: string | null;
  model_tier: string | null;
  price_snapshot_id: string | null;
  estimated_cost_cents: number | null;
  actual_cost_cents: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  tokens_cached_read: number | null;
  tokens_cached_write: number | null;
  tokens_reasoning: number | null;
  routing_reason: string | null;
  routing_rejected_candidates: unknown;
  started_at: string;
  completed_at: string | null;
}

export interface PersistedEntityFact {
  id: string;
  entity_type: string;
  entity_id: string;
  key: string;
  value: unknown;
  confidence: number | null;
  source_run_id: string | null;
  valid_from: string;
  valid_until: string | null;
}

export interface PersistedApproval {
  id: string;
  agent_run_id: string;
  requested_action: Record<string, unknown>;
  reasoning: string | null;
  requested_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  decision: 'approved' | 'edited' | 'rejected' | null;
}

export interface PersistedQualityEvent {
  id: string;
  agent_run_id: string;
  workflow_id: string;
  step_id: string;
  skill_id: string | null;
  round_index: number;
  model_id: string | null;
  model_provider: string | null;
  model_tier: string | null;
  evaluator_id: string;
  status: string;
  decision: string;
  contract_completeness: number;
  required_fields: string[];
  present_required_fields: string[];
  missing_required_fields: string[];
  optional_fields: string[];
  present_optional_fields: string[];
  retry_count: number;
  escalation_tier: string | null;
  reasons: string[];
  created_at: string;
}

export interface QualityEventInput {
  agentRunId: string;
  workflowId: string;
  stepId: string;
  skillId?: string | null;
  roundIndex: number;
  modelId?: string | null;
  modelProvider?: string | null;
  modelTier?: string | null;
  evaluatorId?: string;
  status: StepStatus | string;
  decision: string;
  contractCompleteness: number;
  requiredFields?: string[];
  presentRequiredFields?: string[];
  missingRequiredFields?: string[];
  optionalFields?: string[];
  presentOptionalFields?: string[];
  retryCount?: number;
  escalationTier?: string | null;
  reasons?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Reads (used by Control Tower etc.)
// ─────────────────────────────────────────────────────────────────────────────

export async function listRecentAgentRuns(limit = 25): Promise<PersistedAgentRun[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from('agent_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) {
    logger.warn('agentic.listRecentAgentRuns failed', { error: error.message });
    return [];
  }
  return (data ?? []) as unknown as PersistedAgentRun[];
}

export async function listPendingApprovals(limit = 25): Promise<PersistedApproval[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from('approvals')
    .select('*')
    .is('resolved_at', null)
    .order('requested_at', { ascending: true })
    .limit(limit);
  if (error) {
    logger.warn('agentic.listPendingApprovals failed', { error: error.message });
    return [];
  }
  return (data ?? []) as unknown as PersistedApproval[];
}

export async function listEntityFacts(
  entityType: string,
  entityId: string,
): Promise<PersistedEntityFact[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from('entity_context')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('valid_from', { ascending: false });
  if (error) {
    logger.warn('agentic.listEntityFacts failed', { error: error.message });
    return [];
  }
  return (data ?? []) as unknown as PersistedEntityFact[];
}

export async function listRecentSkillExecutions(limit = 100): Promise<PersistedSkillExecution[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from('skill_executions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) {
    logger.warn('agentic.listRecentSkillExecutions failed', { error: error.message });
    return [];
  }
  return (data ?? []) as unknown as PersistedSkillExecution[];
}

export async function listRecentQualityEvents(limit = 100): Promise<PersistedQualityEvent[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from('quality_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    logger.warn('agentic.listRecentQualityEvents failed', { error: error.message });
    return [];
  }
  return (data ?? []) as unknown as PersistedQualityEvent[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Writes (used by the runner / agents)
// ─────────────────────────────────────────────────────────────────────────────

export async function createAgentRun(input: {
  agentId: string;
  plan?: ExecutionPlan;
  triggerEventId?: string | null;
  userId?: string | null;
}): Promise<string | null> {
  const c = client();
  if (!c) return null;
  const { data, error } = await c
    .from('agent_runs')
    .insert({
      agent_id: input.agentId,
      plan: input.plan ?? null,
      trigger_event_id: input.triggerEventId ?? null,
      user_id: input.userId ?? null,
      status: 'running',
    })
    .select('id')
    .single();
  if (error) {
    logger.warn('agentic.createAgentRun failed', { error: error.message });
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

export async function recordSkillExecution(input: {
  agentRunId: string;
  skillId: string;
  stepId?: string;
  roundIndex: number;
  status: StepStatus | string;
  inputs: Record<string, unknown>;
  rawOutput?: string;
  structuredOutput?: Record<string, unknown>;
  durationMs?: number;
  modelId?: string;
  modelProvider?: string;
  modelTier?: string;
  priceSnapshotId?: string;
  estimatedCostCents?: number;
  actualCostCents?: number;
  tokensIn?: number;
  tokensOut?: number;
  tokensCachedRead?: number;
  tokensCachedWrite?: number;
  tokensReasoning?: number;
  routingReason?: string;
  routingRejectedCandidates?: unknown;
}): Promise<void> {
  const c = client();
  if (!c) return;
  const { error } = await c.from('skill_executions').insert(toSkillExecutionRow(input));
  if (error) logger.warn('agentic.recordSkillExecution failed', { error: error.message });
}

export async function recordQualityEvent(input: QualityEventInput): Promise<void> {
  await recordQualityEvents([input]);
}

export async function recordQualityEvents(inputs: QualityEventInput[]): Promise<void> {
  const c = client();
  if (!c || inputs.length === 0) return;
  const { error } = await c.from('quality_events').insert(inputs.map(toQualityEventRow));
  if (error) logger.warn('agentic.recordQualityEvents failed', { error: error.message });
}

export function toQualityEventRow(input: QualityEventInput): Record<string, unknown> {
  return {
    agent_run_id: input.agentRunId,
    workflow_id: input.workflowId,
    step_id: input.stepId,
    skill_id: input.skillId ?? null,
    round_index: input.roundIndex,
    model_id: input.modelId ?? null,
    model_provider: input.modelProvider ?? null,
    model_tier: input.modelTier ?? null,
    evaluator_id: input.evaluatorId ?? 'deterministic-contract',
    status: input.status,
    decision: input.decision,
    contract_completeness: input.contractCompleteness,
    required_fields: input.requiredFields ?? [],
    present_required_fields: input.presentRequiredFields ?? [],
    missing_required_fields: input.missingRequiredFields ?? [],
    optional_fields: input.optionalFields ?? [],
    present_optional_fields: input.presentOptionalFields ?? [],
    retry_count: input.retryCount ?? 0,
    escalation_tier: input.escalationTier ?? null,
    reasons: input.reasons ?? [],
  };
}

export function toSkillExecutionRow(input: {
  agentRunId: string;
  skillId: string;
  stepId?: string;
  roundIndex: number;
  status: StepStatus | string;
  inputs: Record<string, unknown>;
  rawOutput?: string;
  structuredOutput?: Record<string, unknown>;
  durationMs?: number;
  modelId?: string;
  modelProvider?: string;
  modelTier?: string;
  priceSnapshotId?: string;
  estimatedCostCents?: number;
  actualCostCents?: number;
  tokensIn?: number;
  tokensOut?: number;
  tokensCachedRead?: number;
  tokensCachedWrite?: number;
  tokensReasoning?: number;
  routingReason?: string;
  routingRejectedCandidates?: unknown;
}): Record<string, unknown> {
  return {
    agent_run_id: input.agentRunId,
    skill_id: input.skillId,
    step_id: input.stepId ?? null,
    round_index: input.roundIndex,
    status: input.status,
    inputs: input.inputs,
    raw_output: input.rawOutput ?? null,
    structured_output: input.structuredOutput ?? null,
    duration_ms: input.durationMs ?? null,
    cost_cents: input.actualCostCents ?? input.estimatedCostCents ?? 0,
    model_id: input.modelId ?? null,
    model_provider: input.modelProvider ?? null,
    model_tier: input.modelTier ?? null,
    price_snapshot_id: input.priceSnapshotId ?? null,
    estimated_cost_cents: input.estimatedCostCents ?? null,
    actual_cost_cents: input.actualCostCents ?? input.estimatedCostCents ?? null,
    tokens_in: input.tokensIn ?? null,
    tokens_out: input.tokensOut ?? null,
    tokens_cached_read: input.tokensCachedRead ?? null,
    tokens_cached_write: input.tokensCachedWrite ?? null,
    tokens_reasoning: input.tokensReasoning ?? null,
    routing_reason: input.routingReason ?? null,
    routing_rejected_candidates: input.routingRejectedCandidates ?? null,
    completed_at: new Date().toISOString(),
  };
}

export async function completeAgentRun(input: {
  runId: string;
  status: 'succeeded' | 'failed';
  summary?: string;
  costCents?: number;
}): Promise<void> {
  const c = client();
  if (!c) return;
  const { error } = await c
    .from('agent_runs')
    .update({
      status: input.status,
      summary: input.summary ?? null,
      cost_cents: input.costCents ?? 0,
      completed_at: new Date().toISOString(),
    })
    .eq('id', input.runId);
  if (error) logger.warn('agentic.completeAgentRun failed', { error: error.message });
}

export async function writeEntityFacts(facts: Array<{
  entityType: string;
  entityId: string;
  key: string;
  value: unknown;
  confidence?: number;
  sourceRunId?: string | null;
  validUntil?: string | null;
}>): Promise<void> {
  const c = client();
  if (!c || facts.length === 0) return;
  const rows = facts.map(f => ({
    entity_type: f.entityType,
    entity_id: f.entityId,
    key: f.key,
    value: f.value,
    confidence: f.confidence ?? null,
    source_run_id: f.sourceRunId ?? null,
    valid_until: f.validUntil ?? null,
  }));
  const { error } = await c.from('entity_context').insert(rows);
  if (error) logger.warn('agentic.writeEntityFacts failed', { error: error.message });
}
