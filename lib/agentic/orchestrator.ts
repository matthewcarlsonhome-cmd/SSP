/**
 * Deterministic model router for agentic runs.
 *
 * The router is pure: it receives task metadata, policy/budget context, and
 * the model registry, then returns the cheapest eligible model that satisfies
 * the quality floor. It never calls an LLM to make the routing decision.
 */

import {
  MODEL_REGISTRY,
  calculateCost,
  formatCostCompact,
  listModels,
  type CostBreakdown,
  type ModelProfile,
  type ModelTierKey,
  type Provider,
  type TaskClassification,
  type TaskKind,
  type TokenUsage,
} from './costing';

export interface RoutingContext {
  agentSpendTodayCents: number;
  agentDailyBudgetCents: number;
  perCallCeilingCents: number;
  preferredProviders: Provider[];
  allowedProviders?: Provider[];
  forbiddenProviders?: Provider[];
  latencySensitive?: boolean;
  forceTier?: ModelTierKey;
  forceModelId?: string;
}

export interface RejectedModelCandidate {
  modelId: string;
  reason: string;
}

export interface ModelChoice {
  model: ModelProfile;
  selectedTier: ModelTierKey;
  tier: ModelTierKey;
  useExtendedThinking: boolean;
  useStreaming: boolean;
  usePromptCaching: boolean;
  extendedThinkingBudgetTokens?: number;
  estimatedUsage: TokenUsage;
  estimatedCost: CostBreakdown;
  estimatedCostCents: number;
  reasoning: string;
  routingReason: string;
  rejectedCandidates: RejectedModelCandidate[];
}

export class RoutingBudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoutingBudgetExceededError';
  }
}

const DEFAULT_PREFERRED: Provider[] = ['claude', 'gemini', 'chatgpt'];
const TIER_ORDER: ModelTierKey[] = ['fast', 'balanced', 'smart', 'reasoning'];

const COMPLEXITY_TO_BASE_TIER: Record<TaskClassification['complexity'], ModelTierKey> = {
  trivial: 'fast',
  routine: 'balanced',
  complex: 'balanced',
  strategic: 'smart',
};

function normalizeContext(ctx?: Partial<RoutingContext>): RoutingContext {
  return {
    agentSpendTodayCents: ctx?.agentSpendTodayCents ?? 0,
    agentDailyBudgetCents: ctx?.agentDailyBudgetCents ?? 0,
    perCallCeilingCents: ctx?.perCallCeilingCents ?? 0,
    preferredProviders: ctx?.preferredProviders ?? DEFAULT_PREFERRED,
    allowedProviders: ctx?.allowedProviders,
    forbiddenProviders: ctx?.forbiddenProviders,
    latencySensitive: ctx?.latencySensitive,
    forceTier: ctx?.forceTier,
    forceModelId: ctx?.forceModelId,
  };
}

function tierIndex(tier: ModelTierKey): number {
  return TIER_ORDER.indexOf(tier);
}

function bumpTier(tier: ModelTierKey, by: number): ModelTierKey {
  const next = Math.min(TIER_ORDER.length - 1, Math.max(0, tierIndex(tier) + by));
  return TIER_ORDER[next];
}

function minTier(a: ModelTierKey, b: ModelTierKey): ModelTierKey {
  return tierIndex(a) <= tierIndex(b) ? a : b;
}

function maxTier(a: ModelTierKey, b: ModelTierKey): ModelTierKey {
  return tierIndex(a) >= tierIndex(b) ? a : b;
}

function clampTier(tier: ModelTierKey, minAllowed: ModelTierKey, maxAllowed: ModelTierKey): ModelTierKey {
  return minTier(maxTier(tier, minAllowed), maxAllowed);
}

function baselineTier(task: TaskClassification): ModelTierKey {
  if (task.kind === 'reasoning' && task.complexity === 'strategic') return 'reasoning';
  if (task.complexity === 'routine' && task.isIntermediate) return 'fast';
  return COMPLEXITY_TO_BASE_TIER[task.complexity];
}

function capabilityFit(model: ModelProfile, kind: TaskKind): 'good' | 'acceptable' | 'avoid' {
  if (model.avoidFor.includes(kind)) return 'avoid';
  if (model.goodFor.includes(kind)) return 'good';
  if (model.acceptableFor.includes(kind)) return 'acceptable';
  return 'avoid';
}

function providerAllowed(
  provider: Provider,
  task: TaskClassification,
  ctx: RoutingContext,
): boolean {
  const allowedLists = [ctx.allowedProviders, task.allowedProviders].filter(Boolean) as Provider[][];
  if (allowedLists.some((allowed) => !allowed.includes(provider))) return false;
  const forbidden = new Set([...(ctx.forbiddenProviders ?? []), ...(task.forbiddenProviders ?? [])]);
  return !forbidden.has(provider);
}

function firstHardRejection(
  model: ModelProfile,
  task: TaskClassification,
  ctx: RoutingContext,
): string | null {
  if (!model.active) return 'model is inactive';
  if (!providerAllowed(model.provider, task, ctx)) return `provider ${model.provider} is not allowed`;
  if (task.requiresJson && !model.supportsJson) return 'task requires JSON support';
  if (task.requiresToolCalling && !model.supportsToolCalling) return 'task requires tool calling';
  if (task.requiresStreaming && !model.supportsStreaming) return 'task requires streaming';
  if (task.estimatedInputTokens > model.maxInputTokens) return 'estimated input exceeds context window';
  if (task.estimatedOutputTokens > model.maxOutputTokens) return 'estimated output exceeds model max';
  if (capabilityFit(model, task.kind) === 'avoid') return `model is not suitable for ${task.kind}`;
  return null;
}

function providerPreferenceIndex(provider: Provider, preferred: Provider[]): number {
  const idx = preferred.indexOf(provider);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

function sortCandidates(
  candidates: ModelProfile[],
  preferredProviders: Provider[],
  estimate: (model: ModelProfile) => number,
): ModelProfile[] {
  return [...candidates].sort((a, b) => {
    const providerDiff =
      providerPreferenceIndex(a.provider, preferredProviders) -
      providerPreferenceIndex(b.provider, preferredProviders);
    if (providerDiff !== 0) return providerDiff;
    return estimate(a) - estimate(b);
  });
}

function budgetLimit(ctx: RoutingContext): number {
  const limits: number[] = [];
  if (ctx.perCallCeilingCents > 0) limits.push(ctx.perCallCeilingCents);
  if (ctx.agentDailyBudgetCents > 0) {
    limits.push(Math.max(0, ctx.agentDailyBudgetCents - ctx.agentSpendTodayCents));
  }
  return limits.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...limits);
}

function tierSearchOrder(target: ModelTierKey, minAllowed: ModelTierKey, maxAllowed: ModelTierKey): ModelTierKey[] {
  const targetIndex = tierIndex(target);
  const minIndex = tierIndex(minAllowed);
  const maxIndex = tierIndex(maxAllowed);
  const tiers: ModelTierKey[] = [];

  for (let i = targetIndex; i <= maxIndex; i += 1) tiers.push(TIER_ORDER[i]);
  for (let i = targetIndex - 1; i >= minIndex; i -= 1) tiers.push(TIER_ORDER[i]);

  return Array.from(new Set(tiers));
}

function serializeBudget(ctx: RoutingContext): string {
  const parts: string[] = [];
  if (ctx.perCallCeilingCents > 0) {
    parts.push(`per-call ${formatCostCompact(ctx.perCallCeilingCents)}`);
  }
  if (ctx.agentDailyBudgetCents > 0) {
    parts.push(
      `daily remaining ${formatCostCompact(Math.max(0, ctx.agentDailyBudgetCents - ctx.agentSpendTodayCents))}`,
    );
  }
  return parts.join(', ');
}

export function routeModel(task: TaskClassification, ctx?: Partial<RoutingContext>): ModelChoice {
  const fullCtx = normalizeContext(ctx);
  const usage: TokenUsage = {
    inputTokens: task.estimatedInputTokens,
    outputTokens: task.estimatedOutputTokens,
  };
  const estimate = (model: ModelProfile) => calculateCost(usage, model).totalCents;
  const reasoningSteps: string[] = [];
  const rejectedCandidates: RejectedModelCandidate[] = [];

  if (fullCtx.forceModelId) {
    const forced = MODEL_REGISTRY[fullCtx.forceModelId];
    if (!forced) throw new Error(`routeModel: forced model ${fullCtx.forceModelId} is not registered`);
    const rejection = firstHardRejection(forced, task, fullCtx);
    if (rejection) {
      throw new Error(`routeModel: forced model ${forced.id} is invalid for this task: ${rejection}`);
    }
    const cost = calculateCost(usage, forced);
    const reason = `forced model ${forced.displayName}; estimated ${formatCostCompact(cost.totalCents)}`;
    return {
      model: forced,
      selectedTier: forced.tier,
      tier: forced.tier,
      useExtendedThinking: forced.supportsExtendedThinking && task.kind === 'reasoning',
      useStreaming: Boolean(task.requiresStreaming) && forced.supportsStreaming,
      usePromptCaching: forced.supportsPromptCaching,
      extendedThinkingBudgetTokens: forced.supportsExtendedThinking ? Math.min(4096, task.estimatedOutputTokens) : undefined,
      estimatedUsage: usage,
      estimatedCost: cost,
      estimatedCostCents: cost.totalCents,
      reasoning: reason,
      routingReason: reason,
      rejectedCandidates,
    };
  }

  let targetTier = fullCtx.forceTier ?? task.preferredTier ?? baselineTier(task);
  reasoningSteps.push(`baseline tier ${targetTier} from ${task.complexity}/${task.kind}`);

  const explicitMinTier = task.minTier;
  const inferredMinTier =
    task.kind === 'generation' && !task.isIntermediate && (task.stakes === 'client' || task.stakes === 'leadership')
      ? 'balanced'
      : task.kind === 'reasoning' && task.complexity === 'strategic'
        ? 'smart'
        : 'fast';
  const minAllowed = explicitMinTier ?? inferredMinTier;
  const maxAllowed = task.maxTier ?? 'reasoning';

  if (!task.isIntermediate && (task.stakes === 'client' || task.stakes === 'leadership')) {
    const promoted = bumpTier(targetTier, 1);
    if (promoted !== targetTier) {
      reasoningSteps.push(`${task.stakes} stakes promoted ${targetTier} to ${promoted}`);
      targetTier = promoted;
    }
  }

  if (task.isIntermediate && task.reversible && targetTier !== 'fast') {
    const demoted = clampTier(bumpTier(targetTier, -1), minAllowed, maxAllowed);
    if (demoted !== targetTier) {
      reasoningSteps.push('reversible intermediate work allowed one-tier demotion');
      targetTier = demoted;
    }
  }

  targetTier = clampTier(targetTier, minAllowed, maxAllowed);
  reasoningSteps.push(`quality bounds ${minAllowed}-${maxAllowed}; selected target ${targetTier}`);

  const allModels = listModels({ includeInactive: true });
  const eligible = allModels.filter((model) => {
    const rejection = firstHardRejection(model, task, fullCtx);
    if (rejection) {
      rejectedCandidates.push({ modelId: model.id, reason: rejection });
      return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    throw new Error('routeModel: no eligible model after hard constraints');
  }

  const limit = budgetLimit(fullCtx);
  const tiers = tierSearchOrder(targetTier, minAllowed, maxAllowed);
  const overBudget: RejectedModelCandidate[] = [];

  for (const tier of tiers) {
    const tierModels = eligible.filter((model) => model.tier === tier);
    if (tierModels.length === 0) continue;

    const good = tierModels.filter((model) => capabilityFit(model, task.kind) === 'good');
    const acceptable = tierModels.filter((model) => capabilityFit(model, task.kind) === 'acceptable');
    const pools = [good, acceptable].filter((pool) => pool.length > 0);

    for (const pool of pools) {
      const sorted = sortCandidates(pool, fullCtx.preferredProviders, estimate);
      for (const model of sorted) {
        const cost = calculateCost(usage, model);
        if (cost.totalCents > limit) {
          overBudget.push({
            modelId: model.id,
            reason: `estimated ${formatCostCompact(cost.totalCents)} exceeds budget ${serializeBudget(fullCtx)}`,
          });
          continue;
        }

        const reason = [
          ...reasoningSteps,
          `picked ${model.displayName} (${model.provider}, ${model.tier})`,
          `estimated ${formatCostCompact(cost.totalCents)}`,
        ].join('; ');

        return {
          model,
          selectedTier: tier,
          tier,
          useExtendedThinking: model.supportsExtendedThinking && (tier === 'reasoning' || task.kind === 'reasoning'),
          useStreaming: Boolean(task.requiresStreaming || fullCtx.latencySensitive) && model.supportsStreaming,
          usePromptCaching: model.supportsPromptCaching,
          extendedThinkingBudgetTokens:
            model.supportsExtendedThinking && (tier === 'reasoning' || task.kind === 'reasoning')
              ? Math.min(8192, Math.max(1024, Math.floor(task.estimatedOutputTokens / 2)))
              : undefined,
          estimatedUsage: usage,
          estimatedCost: cost,
          estimatedCostCents: cost.totalCents,
          reasoning: reason,
          routingReason: reason,
          rejectedCandidates: [...rejectedCandidates, ...overBudget],
        };
      }
    }
  }

  if (overBudget.length > 0) {
    throw new RoutingBudgetExceededError(
      `No eligible model fits budget (${serializeBudget(fullCtx)}) without violating minimum tier ${minAllowed}.`,
    );
  }

  throw new Error(`routeModel: no eligible model between tiers ${minAllowed} and ${maxAllowed}`);
}

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
