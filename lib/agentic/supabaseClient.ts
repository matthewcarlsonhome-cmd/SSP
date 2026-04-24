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
}): Promise<void> {
  const c = client();
  if (!c) return;
  const { error } = await c.from('skill_executions').insert({
    agent_run_id: input.agentRunId,
    skill_id: input.skillId,
    step_id: input.stepId ?? null,
    round_index: input.roundIndex,
    status: input.status,
    inputs: input.inputs,
    raw_output: input.rawOutput ?? null,
    structured_output: input.structuredOutput ?? null,
    duration_ms: input.durationMs ?? null,
    completed_at: new Date().toISOString(),
  });
  if (error) logger.warn('agentic.recordSkillExecution failed', { error: error.message });
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
