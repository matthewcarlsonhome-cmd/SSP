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
  recordQualityEvents,
  recordSkillExecution,
  writeEntityFacts,
} from './supabaseClient';
import type { AgenticDAG, ExecutionPlan, ExecutionRound, StepRunResult } from '../agentic';
import {
  DEFAULT_FACT_POLICIES,
  extractFactsFromStepOutput,
  type MemoryFact,
} from './memory';
import { assessRunQuality } from './replanner';

// ─────────────────────────────────────────────────────────────────────────────
// Fact projection — workflow-aware mappers.
//
// Each entry knows: given a structured-fields object from one step, emit a
// list of entity_context facts. Keep this declarative so adding new
// projections doesn't require touching the runner.
// ─────────────────────────────────────────────────────────────────────────────

interface PersistableFact {
  entityType: string;
  entityId: string;
  key: string;
  value: unknown;
  confidence?: number;
  sourceRunId?: string | null;
  validUntil?: string | null;
}

function memoryFactToPersistable(fact: MemoryFact, sourceRunId: string): PersistableFact {
  return {
    entityType: fact.entity.type,
    entityId: fact.entity.id,
    key: fact.key,
    value: fact.value,
    confidence: fact.confidence,
    sourceRunId,
    validUntil: fact.validUntil ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface RunPersistenceContext {
  agentId: string;
  workflowId: string;
  plan?: ExecutionPlan;
  dag?: AgenticDAG;
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

  const allFacts: PersistableFact[] = [];
  let totalCostCents = 0;

  for (const result of Object.values(results)) {
    const estimatedUsage = result.routing?.estimatedUsage;
    const actualUsage = result.routing?.actualUsage ?? estimatedUsage;
    const estimatedCostCents = result.routing?.estimatedCostCents;
    const actualCostCents = result.routing?.actualCostCents ?? estimatedCostCents;
    if (typeof actualCostCents === 'number') totalCostCents += actualCostCents;

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
      modelId: result.routing?.modelId,
      modelProvider: result.routing?.modelProvider,
      modelTier: result.routing?.modelTier,
      priceSnapshotId: result.routing?.priceSnapshotId,
      estimatedCostCents,
      actualCostCents,
      tokensIn: actualUsage?.inputTokens,
      tokensOut: actualUsage?.outputTokens,
      tokensCachedRead: actualUsage?.cacheReadTokens,
      tokensCachedWrite: actualUsage?.cacheWriteTokens,
      tokensReasoning: actualUsage?.reasoningTokens,
      routingReason: result.routing?.routingReason,
      routingRejectedCandidates: result.routing?.rejectedCandidates,
    });

    if (result.status === 'succeeded') {
      const facts = extractFactsFromStepOutput({
        workflowId: ctx.workflowId,
        stepId: result.stepId,
        structuredFields: result.structuredFields,
        sourceRunId: runId,
        policies: DEFAULT_FACT_POLICIES,
      });
      facts.forEach(f => allFacts.push(memoryFactToPersistable(f, runId)));
    }
  }

  if (allFacts.length > 0) {
    await writeEntityFacts(allFacts);
  }

  if (ctx.dag) {
    const report = assessRunQuality(ctx.dag, results);
    const qualityRows = report.assessments.map((assessment) => {
      const result = results[assessment.stepId];
      const step = ctx.dag?.steps.find((s) => s.id === assessment.stepId);
      return {
        agentRunId: runId,
        workflowId: ctx.workflowId,
        stepId: assessment.stepId,
        skillId: result?.skillId ?? step?.skillId ?? null,
        roundIndex: stepRound.get(assessment.stepId) ?? 0,
        modelId: result?.routing?.modelId ?? null,
        modelProvider: result?.routing?.modelProvider ?? null,
        modelTier: result?.routing?.modelTier ?? null,
        evaluatorId: 'post-run-contract-assessment',
        status: assessment.status,
        decision: assessment.decision,
        contractCompleteness: assessment.contract.completeness,
        requiredFields: assessment.contract.requiredFields,
        presentRequiredFields: assessment.contract.presentRequiredFields,
        missingRequiredFields: assessment.contract.missingRequiredFields,
        optionalFields: assessment.contract.optionalFields,
        presentOptionalFields: assessment.contract.presentOptionalFields,
        retryCount: 0,
        escalationTier: result?.routing?.routingReason?.includes('Escalated by quality gate')
          ? result.routing.modelTier
          : null,
        reasons: assessment.reasons,
      };
    });
    await recordQualityEvents(qualityRows);
  }

  await completeAgentRun({
    runId,
    status: outcome,
    summary,
    costCents: totalCostCents,
  });

  logger.info('agentic.persistRun complete', {
    runId,
    facts: allFacts.length,
    steps: Object.keys(results).length,
  });
  return runId;
}
