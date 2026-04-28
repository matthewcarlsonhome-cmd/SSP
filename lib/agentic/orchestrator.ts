/**
 * orchestrator.ts — the model router.
 *
 * Takes a TaskClassification and a RoutingContext, produces a ModelChoice
 * (which model to call, why, estimated cost). Pure function over the price
 * registry and a small ruleset; no LLM call to make the routing decision.
 *
 * Decision priority (matches docs/AGENTIC_ORCHESTRATION_DESIGN.md §4.4):
 *   1. Hard constraints — respect policy filters and capability requirements.
 *   2. Map complexity → tier baseline.
 *   3. Bump up for stakes (client/leadership).
 *   4. Bump down for intermediate (errors caught downstream).
 *   5. Pick the cheapest model in the chosen tier that is goodFor or
 *      acceptableFor the kind, with provider preference applied.
 *   6. Estimate cost; if it exceeds policy caps, downshift one tier.
 *   7. Return ModelChoice with a human-readable reasoning string.
 */

import {
  calculateCost,
  formatCostCompact,
  listModels,
  type ModelProfile,
  type ModelTierKey,
  type Provider,
  type TaskClassification,
  type TaskKind,
  type TokenUsage,
} from './costing';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface RoutingContext {
  /** Cumulative cost spent by this agent today, in cents. 0 if not tracked. */
  agentSpendTodayCents: number;
  /** Daily budget cap in cents; 0 = no cap. */
  agentDailyBudgetCents: number;
  /** Per-call ceiling in cents; 0 = no cap. */
  perCallCeilingCents: number;
  /**
   * Provider preference order — the router picks the first provider in this
   * list that has a model in the chosen tier capable of the task. Allows
   * accounts to express "Anthropic only" or "Gemini for cheap, Claude for
   * everything else."
   */
  preferredProviders: Provider[];
  /** Forbidden providers (e.g., contractual restrictions). */
  forbiddenProviders?: Provider[];
  /** True for live UI runs (latency-sensitive); false for background. */
  latencySensitive?: boolean;
}

export interface ModelChoice {
  model: ModelProfile;
  /** Tier that was selected (may differ from model.tier if the registry
   *  doesn't have a tier-exact match and the router fell back). */
  selectedTier: ModelTierKey;
  /** True if the model supports + is using extended thinking for this call. */
  useExtendedThinking: boolean;
  /** Estimated token usage for the call. */
  estimatedUsage: TokenUsage;
  /** Estimated cost breakdown. */
  estimatedCostCents: number;
  /** Human-readable explanation of how the choice was reached. Used for
   *  the Cost Explorer's audit trail. */
  reasoning: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier mapping rules
// ─────────────────────────────────────────────────────────────────────────────

const COMPLEXITY_TO_BASE_TIER: Record<TaskClassification['complexity'], ModelTierKey> = {
  trivial:   'fast',
  routine:   'fast',
  complex:   'balanced',
  strategic: 'smart',
};

// Routine tasks producing user-visible output get bumped to balanced (the
// router decides this in shouldBumpForStakes; this constant is only used
// for the "intermediate routine" case which stays fast).

const TIER_ORDER: ModelTierKey[] = ['fast', 'balanced', 'smart', 'reasoning'];

function bumpTier(t: ModelTierKey, by: number): ModelTierKey {
  const i = TIER_ORDER.indexOf(t);
  const next = Math.min(TIER_ORDER.length - 1, Math.max(0, i + by));
  return TIER_ORDER[next];
}

// ─────────────────────────────────────────────────────────────────────────────
// Candidate selection
// ─────────────────────────────────────────────────────────────────────────────

function tierCapableForKind(model: ModelProfile, kind: TaskKind): 'good' | 'acceptable' | 'avoid' {
  if (model.avoidFor.includes(kind)) return 'avoid';
  if (model.goodFor.includes(kind)) return 'good';
  if (model.acceptableFor.includes(kind)) return 'acceptable';
  return 'avoid';
}

interface CandidateSet {
  good: ModelProfile[];
  acceptable: ModelProfile[];
}

function candidatesForTier(
  tier: ModelTierKey,
  kind: TaskKind,
  ctx: RoutingContext,
): CandidateSet {
  const all = listModels().filter((m) => m.tier === tier);
  const allowed = all.filter((m) => !ctx.forbiddenProviders?.includes(m.provider));
  const good: ModelProfile[] = [];
  const acceptable: ModelProfile[] = [];
  for (const m of allowed) {
    const fit = tierCapableForKind(m, kind);
    if (fit === 'good') good.push(m);
    else if (fit === 'acceptable') acceptable.push(m);
  }
  return { good, acceptable };
}

function pickByPreference(
  candidates: ModelProfile[],
  preferred: Provider[],
  estimatedCost: (m: ModelProfile) => number,
): ModelProfile | null {
  if (candidates.length === 0) return null;
  // Sort by (provider preference index ASC, estimated cost ASC).
  const sorted = [...candidates].sort((a, b) => {
    const ai = preferred.indexOf(a.provider);
    const bi = preferred.indexOf(b.provider);
    const aiNorm = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const biNorm = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    if (aiNorm !== biNorm) return aiNorm - biNorm;
    return estimatedCost(a) - estimatedCost(b);
  });
  return sorted[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PREFERRED: Provider[] = ['claude', 'gemini', 'chatgpt'];

export function routeModel(task: TaskClassification, ctx?: Partial<RoutingContext>): ModelChoice {
  const fullCtx: RoutingContext = {
    agentSpendTodayCents: ctx?.agentSpendTodayCents ?? 0,
    agentDailyBudgetCents: ctx?.agentDailyBudgetCents ?? 0,
    perCallCeilingCents: ctx?.perCallCeilingCents ?? 0,
    preferredProviders: ctx?.preferredProviders ?? DEFAULT_PREFERRED,
    forbiddenProviders: ctx?.forbiddenProviders,
    latencySensitive: ctx?.latencySensitive,
  };

  const reasoningSteps: string[] = [];

  // 1. Map complexity → baseline tier.
  let tier: ModelTierKey = COMPLEXITY_TO_BASE_TIER[task.complexity];
  reasoningSteps.push(`complexity=${task.complexity} → baseline tier=${tier}`);

  // 2. Bump up for high-stakes user-visible work.
  if (!task.isIntermediate && (task.stakes === 'client' || task.stakes === 'leadership')) {
    const promoted = bumpTier(tier, 1);
    if (promoted !== tier) {
      reasoningSteps.push(`stakes=${task.stakes} promotes tier → ${promoted}`);
      tier = promoted;
    }
  }

  // 3. Bump down for routine intermediate steps (errors caught downstream).
  if (task.isIntermediate && task.complexity === 'routine') {
    const demoted = bumpTier(tier, -1);
    if (demoted !== tier) {
      reasoningSteps.push(`intermediate routine step → demote to ${demoted}`);
      tier = demoted;
    }
  }

  // 4. Reasoning kind always at least complex; reasoning + strategic →
  //    reasoning tier if any model supports it, else smart.
  if (task.kind === 'reasoning' && task.complexity === 'strategic') {
    const reasoningModels = listModels().filter((m) => m.tier === 'reasoning');
    if (reasoningModels.length > 0) {
      tier = 'reasoning';
      reasoningSteps.push('strategic reasoning task → reasoning tier');
    } else {
      tier = 'smart';
      reasoningSteps.push('strategic reasoning task → smart (no reasoning-tier model registered)');
    }
  }

  // 5. Find candidates in the chosen tier; if empty (e.g., reasoning tier
  //    with no models registered), step down a tier and retry.
  let candidates = candidatesForTier(tier, task.kind, fullCtx);
  while (candidates.good.length === 0 && candidates.acceptable.length === 0 && tier !== 'fast') {
    const stepped = bumpTier(tier, -1);
    if (stepped === tier) break;
    reasoningSteps.push(`no eligible models in tier=${tier}; stepping down to ${stepped}`);
    tier = stepped;
    candidates = candidatesForTier(tier, task.kind, fullCtx);
  }

  // Estimator function for sorting candidates by cost.
  const usage: TokenUsage = {
    inputTokens: task.estimatedInputTokens,
    outputTokens: task.estimatedOutputTokens,
  };
  const estCost = (m: ModelProfile) => calculateCost(usage, m).totalCents;

  // Prefer good-fit; fall back to acceptable.
  let pool = candidates.good.length > 0 ? candidates.good : candidates.acceptable;
  let chosen = pickByPreference(pool, fullCtx.preferredProviders, estCost);

  // Final safety: if literally nothing matched, fall back to the cheapest
  // fast-tier model regardless of fit.
  if (!chosen) {
    chosen = listModels()
      .filter((m) => m.tier === 'fast' && !fullCtx.forbiddenProviders?.includes(m.provider))
      .sort((a, b) => estCost(a) - estCost(b))[0];
    if (chosen) {
      tier = 'fast';
      reasoningSteps.push('no eligible models found anywhere — falling back to cheapest fast model');
    }
  }

  if (!chosen) {
    throw new Error(
      'routeModel: no eligible model found and no fast-tier fallback available. ' +
        'Verify lib/agentic/costing.ts MODEL_REGISTRY is populated.',
    );
  }

  let estimatedCostCents = estCost(chosen);

  // 6. Budget enforcement: if the per-call ceiling is exceeded, downshift.
  if (fullCtx.perCallCeilingCents > 0 && estimatedCostCents > fullCtx.perCallCeilingCents) {
    const fallbackTier = bumpTier(tier, -1);
    if (fallbackTier !== tier) {
      reasoningSteps.push(
        `per-call ceiling ${formatCostCompact(fullCtx.perCallCeilingCents)} exceeded ` +
          `(${formatCostCompact(estimatedCostCents)}); downshifting to ${fallbackTier}`,
      );
      const fallbackPool = candidatesForTier(fallbackTier, task.kind, fullCtx);
      const fallbackPickPool = fallbackPool.good.length > 0 ? fallbackPool.good : fallbackPool.acceptable;
      const fallbackChosen = pickByPreference(fallbackPickPool, fullCtx.preferredProviders, estCost);
      if (fallbackChosen) {
        chosen = fallbackChosen;
        tier = fallbackTier;
        estimatedCostCents = estCost(fallbackChosen);
      }
    }
  }

  // 7. Daily-budget enforcement: same downshift logic if we'd exceed the cap.
  if (
    fullCtx.agentDailyBudgetCents > 0 &&
    fullCtx.agentSpendTodayCents + estimatedCostCents > fullCtx.agentDailyBudgetCents
  ) {
    const fallbackTier = bumpTier(tier, -1);
    if (fallbackTier !== tier) {
      reasoningSteps.push(
        `daily budget exceeded (${formatCostCompact(fullCtx.agentDailyBudgetCents)}); ` +
          `downshifting to ${fallbackTier}`,
      );
      const fallbackPool = candidatesForTier(fallbackTier, task.kind, fullCtx);
      const fallbackPickPool = fallbackPool.good.length > 0 ? fallbackPool.good : fallbackPool.acceptable;
      const fallbackChosen = pickByPreference(fallbackPickPool, fullCtx.preferredProviders, estCost);
      if (fallbackChosen) {
        chosen = fallbackChosen;
        tier = fallbackTier;
        estimatedCostCents = estCost(fallbackChosen);
      }
    }
  }

  // 8. Use extended thinking for reasoning-tier tasks if the model supports it.
  const useExtendedThinking =
    chosen.supportsExtendedThinking && tier === 'reasoning';

  reasoningSteps.push(`chose ${chosen.displayName} — ${formatCostCompact(estimatedCostCents)} est.`);

  return {
    model: chosen,
    selectedTier: tier,
    useExtendedThinking,
    estimatedUsage: usage,
    estimatedCostCents,
    reasoning: reasoningSteps.join('; '),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: route a whole DAG and return per-step choices. Used by the
// Cost Explorer's per-workflow projector to show what every step will cost.
// ─────────────────────────────────────────────────────────────────────────────

import type { AgenticDAG } from './types';
import { classifyStep } from './taskClassifier';

export interface DagRoutingPlan {
  perStep: Record<string, { classification: TaskClassification; choice: ModelChoice }>;
  totalEstimatedCostCents: number;
}

export function routeDag(dag: AgenticDAG, ctx?: Partial<RoutingContext>): DagRoutingPlan {
  const perStep: DagRoutingPlan['perStep'] = {};
  let total = 0;
  for (const step of dag.steps) {
    const classification = classifyStep({ step, dag });
    const choice = routeModel(classification, ctx);
    perStep[step.id] = { classification, choice };
    total += choice.estimatedCostCents;
  }
  return { perStep, totalEstimatedCostCents: total };
}
