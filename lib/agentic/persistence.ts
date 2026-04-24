/**
 * persistence.ts — turns runner results into rows in agentic.* tables.
 *
 * Three concerns:
 *   1. Record an agent_run + per-step skill_executions so the run is
 *      replayable / inspectable in the Control Tower.
 *   2. Project structured fields from step outputs into entity_context rows
 *      (the living memory). E.g., the PPC Triage step produces p1_accounts
 *      with account names; we write one entity_context fact per account so
 *      future runs can read the current priority assignments without
 *      re-running triage.
 *   3. Be best-effort. Never throw — if Supabase isn't configured or RLS
 *      blocks a write, the run still completes and the UI still renders.
 */

import { logger } from '../logger';
import {
  completeAgentRun,
  createAgentRun,
  recordSkillExecution,
  writeEntityFacts,
} from './supabaseClient';
import type { ExecutionPlan, ExecutionRound, StepRunResult } from '../agentic';

// ─────────────────────────────────────────────────────────────────────────────
// Fact projection — workflow-aware mappers.
//
// Each entry knows: given a structured-fields object from one step, emit a
// list of entity_context facts. Keep this declarative so adding new
// projections doesn't require touching the runner.
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectedFact {
  entityType: string;
  entityId: string;
  key: string;
  value: unknown;
  confidence?: number;
}

type FactProjector = (fields: Record<string, unknown>) => ProjectedFact[];

/**
 * Coerce an unknown value that could be a JSON string OR an actual array
 * into an array. The extractor sometimes returns string-encoded JSON; this
 * unwraps it.
 */
function coerceArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* not JSON */
    }
  }
  return [];
}

/**
 * Try several common shapes to pull an "account name" out of a P1/P2/P3 entry
 * since the LLM may emit different keys.
 */
function readAccountName(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as Record<string, unknown>;
  for (const key of ['account', 'name', 'account_name', 'client', 'client_name']) {
    const v = e[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Workflow-keyed registry of fact projectors. To add facts for another
 * workflow, register a `<workflowId>:<stepId>` entry returning an array of
 * { entityType, entityId, key, value } facts.
 */
const FACT_PROJECTORS: Record<string, FactProjector> = {
  'ppc-master-weekly-workflow:step-1-triage': (fields) => {
    const facts: ProjectedFact[] = [];
    for (const [tier, key] of [
      ['p1_accounts', 'priority'],
      ['p2_accounts', 'priority'],
      ['p3_accounts', 'priority'],
    ] as const) {
      const entries = coerceArray(fields[tier]);
      for (const entry of entries) {
        const name = readAccountName(entry);
        if (!name) continue;
        facts.push({
          entityType: 'account',
          entityId: name,
          key,
          value: tier === 'p1_accounts' ? 'P1' : tier === 'p2_accounts' ? 'P2' : 'P3',
          confidence: 0.9,
        });
        if (entry && typeof entry === 'object') {
          const e = entry as Record<string, unknown>;
          if (typeof e.reason === 'string') {
            facts.push({
              entityType: 'account',
              entityId: name,
              key: 'last_triage_reason',
              value: e.reason,
              confidence: 0.85,
            });
          }
        }
      }
    }
    return facts;
  },

  'ppc-master-weekly-workflow:step-3-search-terms': (fields) => {
    const facts: ProjectedFact[] = [];
    if (typeof fields.wasted_spend_estimate === 'number') {
      facts.push({
        entityType: 'portfolio',
        entityId: 'ssp-mcc',
        key: 'wasted_spend_estimate_weekly',
        value: fields.wasted_spend_estimate,
        confidence: 0.7,
      });
    }
    return facts;
  },
};

function projectFacts(
  workflowId: string,
  stepResult: StepRunResult,
): ProjectedFact[] {
  const key = `${workflowId}:${stepResult.stepId}`;
  const projector = FACT_PROJECTORS[key];
  if (!projector) return [];
  try {
    return projector(stepResult.structuredFields);
  } catch (err) {
    logger.warn('agentic.persistence projector threw', {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface RunPersistenceContext {
  agentId: string;
  workflowId: string;
  plan?: ExecutionPlan;
  triggerEventId?: string | null;
  userId?: string | null;
}

/**
 * Persist the entire run from a single results map. Intended to be called
 * once when the runner completes. Returns the agent_run id (or null if
 * persistence is disabled).
 */
export async function persistRun(
  ctx: RunPersistenceContext,
  results: Record<string, StepRunResult>,
  rounds: ExecutionRound[],
  outcome: 'succeeded' | 'failed',
  summary?: string,
): Promise<string | null> {
  const runId = await createAgentRun({
    agentId: ctx.agentId,
    plan: ctx.plan,
    triggerEventId: ctx.triggerEventId,
    userId: ctx.userId,
  });
  if (!runId) return null;

  const stepRound = new Map<string, number>();
  rounds.forEach(r => r.stepIds.forEach(id => stepRound.set(id, r.index)));

  const allFacts: Array<ProjectedFact & { sourceRunId: string }> = [];

  for (const result of Object.values(results)) {
    await recordSkillExecution({
      agentRunId: runId,
      skillId: result.skillId,
      stepId: result.stepId,
      roundIndex: stepRound.get(result.stepId) ?? 0,
      status: result.status,
      inputs: {},  // inputs persisted at the run level; per-step inputs are derived
      rawOutput: result.rawOutput,
      structuredOutput: result.structuredFields,
      durationMs: result.durationMs,
    });

    if (result.status === 'succeeded') {
      const facts = projectFacts(ctx.workflowId, result);
      facts.forEach(f => allFacts.push({ ...f, sourceRunId: runId }));
    }
  }

  if (allFacts.length > 0) {
    await writeEntityFacts(allFacts);
  }

  await completeAgentRun({
    runId,
    status: outcome,
    summary,
    costCents: 0,  // cost tracking is stubbed during the beta
  });

  logger.info('agentic.persistRun complete', {
    runId,
    facts: allFacts.length,
    steps: Object.keys(results).length,
  });
  return runId;
}
