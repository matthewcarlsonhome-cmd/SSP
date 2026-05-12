/**
 * Replanner and quality metrics framework.
 *
 * The existing evaluator decides proceed/retry/stop for a round. This module
 * turns individual step results into measurable quality signals and concrete
 * retry/escalation/replan recommendations the runner and future dashboards
 * can consume.
 */

import type { AgenticDAG, AgenticStep, OutputContract } from './types';
import type { StepRunResult } from './runner';
import type { ModelTierKey, TaskClassification } from './costing';
import { routeModel, type ModelChoice, type RoutingContext } from './orchestrator';

export type QualityDecision = 'proceed' | 'retry' | 'escalate' | 'replan' | 'stop';

export interface ContractCompliance {
  requiredFields: string[];
  presentRequiredFields: string[];
  missingRequiredFields: string[];
  optionalFields: string[];
  presentOptionalFields: string[];
  completeness: number;
}

export interface StepQualityAssessment {
  stepId: string;
  status: StepRunResult['status'];
  contract: ContractCompliance;
  rawOutputChars: number;
  decision: QualityDecision;
  reasons: string[];
}

export interface RunQualityReport {
  assessments: StepQualityAssessment[];
  contractCompletenessAvg: number;
  retryStepIds: string[];
  escalationStepIds: string[];
  replanRequired: boolean;
  stopRequired: boolean;
}

export interface RetryEscalationPolicy {
  maxRetriesPerStep: number;
  escalateAfterRetries: number;
  replanAfterRetries: number;
  stopOnTerminalFailure: boolean;
}

export interface StepAttemptState {
  stepId: string;
  attempts: number;
  lastTier?: ModelTierKey;
}

export interface ReplanDecision {
  decision: QualityDecision;
  retryStepIds: string[];
  escalateStepIds: string[];
  replanReason?: string;
  stopReason?: string;
}

export interface ShadowRoutePlan {
  task: TaskClassification;
  productionChoice: ModelChoice;
  shadowChoice?: ModelChoice;
  eligible: boolean;
  reason: string;
}

export interface RouterTuningMetrics {
  totalSteps: number;
  failedSteps: number;
  retrySteps: number;
  escalationSteps: number;
  averageContractCompleteness: number;
  byTier: Record<string, { calls: number; averageCompleteness: number; failures: number }>;
}

const DEFAULT_POLICY: RetryEscalationPolicy = {
  maxRetriesPerStep: 2,
  escalateAfterRetries: 1,
  replanAfterRetries: 2,
  stopOnTerminalFailure: true,
};

const TIER_ORDER: ModelTierKey[] = ['fast', 'balanced', 'smart', 'reasoning'];

function tierIndex(tier: ModelTierKey): number {
  return TIER_ORDER.indexOf(tier);
}

function bumpTier(tier: ModelTierKey): ModelTierKey {
  return TIER_ORDER[Math.min(TIER_ORDER.length - 1, tierIndex(tier) + 1)];
}

function contractCompliance(contract: OutputContract | undefined, fields: Record<string, unknown>): ContractCompliance {
  const contractFields = contract?.fields ?? [];
  const requiredFields = contractFields.filter((field) => field.required).map((field) => field.key);
  const optionalFields = contractFields.filter((field) => !field.required).map((field) => field.key);
  const hasField = (key: string) =>
    Object.prototype.hasOwnProperty.call(fields, key) &&
    fields[key] !== undefined &&
    fields[key] !== null &&
    fields[key] !== '';
  const presentRequiredFields = requiredFields.filter(hasField);
  const presentOptionalFields = optionalFields.filter(hasField);
  const missingRequiredFields = requiredFields.filter((key) => !hasField(key));
  const denominator = requiredFields.length || contractFields.length || 1;
  const numerator = requiredFields.length ? presentRequiredFields.length : Object.keys(fields).length > 0 ? 1 : 0;
  return {
    requiredFields,
    presentRequiredFields,
    missingRequiredFields,
    optionalFields,
    presentOptionalFields,
    completeness: numerator / denominator,
  };
}

export function assessStepQuality(args: {
  dag: AgenticDAG;
  step: AgenticStep;
  result?: StepRunResult;
}): StepQualityAssessment {
  const { dag, step, result } = args;
  const emptyResult: StepRunResult = {
    stepId: step.id,
    skillId: step.skillId,
    status: 'failed',
    rawOutput: '',
    structuredFields: {},
    durationMs: 0,
    errorMessage: 'No result returned for step.',
  };
  const actual = result ?? emptyResult;
  const contract = contractCompliance(step.outputContract, actual.structuredFields);
  const rawOutputChars = actual.rawOutput.length;
  const reasons: string[] = [];
  let decision: QualityDecision = 'proceed';

  if (actual.status === 'failed') {
    reasons.push(actual.errorMessage ?? 'Step failed.');
    decision = 'retry';
  } else if (actual.status === 'skipped') {
    reasons.push('Step skipped.');
    decision = 'proceed';
  } else if (contract.missingRequiredFields.length > 0) {
    reasons.push(`Missing required fields: ${contract.missingRequiredFields.join(', ')}.`);
    decision = 'retry';
  } else if (Object.keys(actual.structuredFields).length === 0 && rawOutputChars < 100) {
    reasons.push('Output is too short and produced no structured fields.');
    decision = 'retry';
  }

  return {
    stepId: step.id,
    status: actual.status,
    contract,
    rawOutputChars,
    decision,
    reasons,
  };
}

export function assessRunQuality(
  dag: AgenticDAG,
  results: Record<string, StepRunResult>,
  stepIds?: string[],
): RunQualityReport {
  const idFilter = stepIds ? new Set(stepIds) : null;
  const assessments = dag.steps
    .filter((step) => !idFilter || idFilter.has(step.id))
    .map((step) => assessStepQuality({ dag, step, result: results[step.id] }));
  const contractCompletenessAvg =
    assessments.length === 0
      ? 1
      : assessments.reduce((sum, assessment) => sum + assessment.contract.completeness, 0) / assessments.length;
  return {
    assessments,
    contractCompletenessAvg,
    retryStepIds: assessments.filter((assessment) => assessment.decision === 'retry').map((assessment) => assessment.stepId),
    escalationStepIds: assessments.filter((assessment) => assessment.decision === 'escalate').map((assessment) => assessment.stepId),
    replanRequired: assessments.some((assessment) => assessment.decision === 'replan'),
    stopRequired: assessments.some((assessment) => assessment.decision === 'stop'),
  };
}

export function buildReplanDecision(
  report: RunQualityReport,
  attempts: StepAttemptState[] = [],
  policy: Partial<RetryEscalationPolicy> = {},
): ReplanDecision {
  const fullPolicy = { ...DEFAULT_POLICY, ...policy };
  const attemptMap = new Map(attempts.map((attempt) => [attempt.stepId, attempt]));

  if (report.stopRequired && fullPolicy.stopOnTerminalFailure) {
    return {
      decision: 'stop',
      retryStepIds: [],
      escalateStepIds: [],
      stopReason: 'A critical failed step has downstream dependents.',
    };
  }

  const retryStepIds: string[] = [];
  const escalateStepIds = [...report.escalationStepIds];
  for (const stepId of report.retryStepIds) {
    const attemptsForStep = attemptMap.get(stepId)?.attempts ?? 0;
    if (attemptsForStep >= fullPolicy.replanAfterRetries) {
      return {
        decision: 'replan',
        retryStepIds: [],
        escalateStepIds,
        replanReason: `Step ${stepId} exceeded retry budget.`,
      };
    }
    if (attemptsForStep >= fullPolicy.escalateAfterRetries) {
      escalateStepIds.push(stepId);
    } else if (attemptsForStep < fullPolicy.maxRetriesPerStep) {
      retryStepIds.push(stepId);
    }
  }

  if (escalateStepIds.length > 0) {
    return { decision: 'escalate', retryStepIds, escalateStepIds: Array.from(new Set(escalateStepIds)) };
  }
  if (retryStepIds.length > 0) {
    return { decision: 'retry', retryStepIds, escalateStepIds: [] };
  }
  if (report.replanRequired) {
    return { decision: 'replan', retryStepIds: [], escalateStepIds: [], replanReason: 'Quality report requested replan.' };
  }
  return { decision: 'proceed', retryStepIds: [], escalateStepIds: [] };
}

export function escalationTier(current: ModelTierKey): ModelTierKey {
  return bumpTier(current);
}

export function planShadowRoute(
  task: TaskClassification,
  productionChoice: ModelChoice,
  ctx?: Partial<RoutingContext>,
): ShadowRoutePlan {
  const currentIndex = tierIndex(productionChoice.selectedTier);
  if (currentIndex <= 0) {
    return {
      task,
      productionChoice,
      eligible: false,
      reason: 'Production choice is already on the lowest tier.',
    };
  }

  const cheaperTier = TIER_ORDER[currentIndex - 1];
  try {
    const shadowChoice = routeModel(
      {
        ...task,
        preferredTier: cheaperTier,
        maxTier: cheaperTier,
        minTier: task.minTier && tierIndex(task.minTier) > tierIndex(cheaperTier) ? task.minTier : cheaperTier,
      },
      ctx,
    );
    return {
      task,
      productionChoice,
      shadowChoice,
      eligible: true,
      reason: `Shadow route can test ${cheaperTier} against ${productionChoice.selectedTier}.`,
    };
  } catch (err) {
    return {
      task,
      productionChoice,
      eligible: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export function summarizeRouterTuningMetrics(
  assessments: StepQualityAssessment[],
  results: Record<string, StepRunResult>,
): RouterTuningMetrics {
  const tierBuckets: Record<string, { calls: number; completenessTotal: number; failures: number }> = {};
  for (const assessment of assessments) {
    const result = results[assessment.stepId];
    const tier = result?.routing?.modelTier ?? 'unknown';
    tierBuckets[tier] = tierBuckets[tier] ?? { calls: 0, completenessTotal: 0, failures: 0 };
    tierBuckets[tier].calls += 1;
    tierBuckets[tier].completenessTotal += assessment.contract.completeness;
    if (assessment.status === 'failed') tierBuckets[tier].failures += 1;
  }

  return {
    totalSteps: assessments.length,
    failedSteps: assessments.filter((assessment) => assessment.status === 'failed').length,
    retrySteps: assessments.filter((assessment) => assessment.decision === 'retry').length,
    escalationSteps: assessments.filter((assessment) => assessment.decision === 'escalate').length,
    averageContractCompleteness:
      assessments.length === 0
        ? 1
        : assessments.reduce((sum, assessment) => sum + assessment.contract.completeness, 0) / assessments.length,
    byTier: Object.fromEntries(
      Object.entries(tierBuckets).map(([tier, bucket]) => [
        tier,
        {
          calls: bucket.calls,
          averageCompleteness: bucket.calls === 0 ? 1 : bucket.completenessTotal / bucket.calls,
          failures: bucket.failures,
        },
      ]),
    ),
  };
}
