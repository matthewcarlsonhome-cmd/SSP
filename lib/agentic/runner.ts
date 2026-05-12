/**
 * runner.ts — DAG executor for AgenticDAG.
 *
 * Runs steps round by round. Within a round, all steps execute in parallel
 * via Promise.allSettled so a single failure does not abort siblings. The
 * runner is provider-agnostic; the caller passes provider + apiKey.
 *
 * Per step the runner:
 *   1. Resolves inputs (mix of upfront user inputs and structured upstream
 *      outputs requested via contextRequirements).
 *   2. Invokes the skill via skillTool.invokeSkill.
 *   3. Runs the extractor against the step's outputContract.
 *   4. Stores the structured result so downstream steps can request specific
 *      fields rather than receiving the full prose.
 *
 * Output of a run: a Map of stepId → StepRunResult with raw text, structured
 * fields, status, and timing. The UI renders progress by subscribing to the
 * onEvent callback.
 */

import { logger } from '../logger';
import type { AgenticDAG, AgenticStep, ExecutionRound, StepRuntimeState, StepStatus } from './types';
import { buildExecutionRounds } from './dagAdapter';
import { invokeSkill, resolveSkill } from './skillTool';
import { extractStructured } from './extractor';
import type { AgenticProvider } from './providers';
import { routeModel, type RoutingContext } from './orchestrator';
import { classifyStep } from './taskClassifier';
import { calculateCost, type ModelTierKey, type Provider, type TokenUsage } from './costing';
import { DEFAULT_EVALUATOR, type Evaluator } from './evaluator';
import {
  assessRunQuality,
  buildReplanDecision,
  escalationTier,
  type ReplanDecision,
  type StepQualityAssessment,
  type StepAttemptState,
} from './replanner';
import { canExecuteCrmCapability, executeCrmCapability } from '../crmAgentTools';
import { canExecuteBusinessCapability, executeBusinessCapability } from './businessTools';
import { recordQualityEvents, type QualityEventInput } from './supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface StepRunResult {
  stepId: string;
  skillId: string;
  status: StepStatus;
  rawOutput: string;
  structuredFields: Record<string, unknown>;
  durationMs: number;
  errorMessage?: string;
  routing?: StepRoutingResult;
}

export interface StepRoutingResult {
  modelId: string;
  modelProvider: Provider;
  modelTier: ModelTierKey;
  priceSnapshotId: string;
  estimatedUsage: TokenUsage;
  actualUsage?: TokenUsage;
  estimatedCostCents: number;
  actualCostCents?: number;
  routingReason: string;
  rejectedCandidates: Array<{ modelId: string; reason: string }>;
}

export interface QualityTelemetryEvent {
  workflowId: string;
  stepId: string;
  skillId?: string | null;
  roundIndex: number;
  modelId?: string | null;
  modelProvider?: Provider | null;
  modelTier?: ModelTierKey | null;
  evaluatorId: string;
  status: StepStatus | string;
  decision: string;
  contractCompleteness: number;
  requiredFields: string[];
  presentRequiredFields: string[];
  missingRequiredFields: string[];
  optionalFields: string[];
  presentOptionalFields: string[];
  retryCount: number;
  escalationTier?: ModelTierKey | null;
  reasons: string[];
}

export type RunnerEvent =
  | { type: 'run-started'; totalRounds: number; totalSteps: number }
  | { type: 'round-started'; roundIndex: number; stepIds: string[] }
  | { type: 'step-status'; stepId: string; status: StepStatus }
  | { type: 'step-completed'; result: StepRunResult }
  | {
      type: 'quality-evaluated';
      roundIndex: number;
      decision: string;
      retryStepIds: string[];
      escalateStepIds: string[];
      reason?: string;
    }
  | { type: 'quality-telemetry'; roundIndex: number; events: QualityTelemetryEvent[] }
  | { type: 'run-completed'; results: Record<string, StepRunResult>; totalDurationMs: number }
  | { type: 'run-failed'; error: string };

export interface RunnerOptions {
  provider: AgenticProvider;
  apiKey: string;
  /** Initial inputs collected from the user / document intake. */
  userInputs: Record<string, unknown>;
  /** Subscriber for progress events — UI renders the live DAG from these. */
  onEvent?: (event: RunnerEvent) => void;
  /** Abort the in-flight run. Does not cancel already-started step calls. */
  signal?: AbortSignal;
  /** Override the default rounds (e.g., when a planner has produced its own). */
  precomputedRounds?: ExecutionRound[];
  /** Optional budget/policy context for model routing. Runtime routing is
   *  provider-scoped until the runner accepts multiple provider credentials. */
  routingContext?: Partial<RoutingContext>;
  /** Optional between-round evaluator and retry/escalation policy. */
  quality?: {
    enabled?: boolean;
    maxRetriesPerStep?: number;
    evaluator?: Evaluator;
    /** Optional persisted run id. When present, between-round quality
     *  telemetry is written directly to agentic.quality_events. */
    agentRunId?: string;
    /** Defaults to dag.id. Useful when a generated DAG is tied to a parent workflow. */
    workflowId?: string;
    /** Hook for UIs/tests/offline persistence to capture attempt-level quality rows. */
    onQualityEvents?: (events: QualityTelemetryEvent[]) => void | Promise<void>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Input resolution — selective context per step
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the inputs object passed into a skill's generatePrompt. Combines:
 *  - User-supplied keys at runtime
 *  - Structured fields requested via step.contextRequirements (selective —
 *    no whole-blob handoff)
 *
 * Falls back to the raw output of an upstream step only if the requested
 * fields are not present in the structured extraction (so behavior is
 * never worse than the legacy "pass the whole prose blob" pattern).
 */
function resolveStepInputs(
  step: AgenticStep,
  userInputs: Record<string, unknown>,
  upstream: Record<string, StepRunResult>,
): Record<string, unknown> {
  const inputs: Record<string, unknown> = { ...userInputs };

  for (const req of step.contextRequirements ?? []) {
    const upstreamResult = upstream[req.fromStep];
    if (!upstreamResult) continue;
    const collected: Record<string, unknown> = {};
    let missing = 0;
    for (const f of req.fields) {
      if (Object.prototype.hasOwnProperty.call(upstreamResult.structuredFields, f)) {
        collected[f] = upstreamResult.structuredFields[f];
      } else {
        missing += 1;
      }
    }
    // Attach by upstream stepId so the skill can reference inputs[stepId].field
    inputs[req.fromStep] = collected;

    // Graceful fallback: if structured extraction did not produce the
    // requested fields, also attach a (truncated) raw blob.
    if (missing > 0 && upstreamResult.rawOutput) {
      const max = req.maxTokens ? req.maxTokens * 4 : 4000;
      inputs[`${req.fromStep}_raw`] = upstreamResult.rawOutput.slice(0, max);
    }
  }
  return inputs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function runAgenticDAG(
  dag: AgenticDAG,
  options: RunnerOptions,
): Promise<Record<string, StepRunResult>> {
  const rounds = options.precomputedRounds ?? buildExecutionRounds(dag);
  const stepMap = new Map<string, AgenticStep>(dag.steps.map(s => [s.id, s]));
  const results: Record<string, StepRunResult> = {};
  const startedAt = Date.now();
  const attemptsByStep = new Map<string, number>();
  const tierOverrides = new Map<string, ModelTierKey>();
  const qualityEnabled = options.quality?.enabled ?? false;
  const evaluator = options.quality?.evaluator ?? DEFAULT_EVALUATOR;
  const maxRetriesPerStep = options.quality?.maxRetriesPerStep ?? 2;

  options.onEvent?.({
    type: 'run-started',
    totalRounds: rounds.length,
    totalSteps: dag.steps.length,
  });

  const executeStep = async (stepId: string): Promise<StepRunResult> => {
    const step = stepMap.get(stepId);
    if (!step) {
      return {
        stepId,
        skillId: '<unknown>',
        status: 'failed',
        rawOutput: '',
        structuredFields: {},
        durationMs: 0,
        errorMessage: `Step "${stepId}" not found in DAG`,
      };
    }

    // Skip rule evaluation
    if (step.skipIf) {
      const fieldVal = readField(results, step.skipIf.field);
      const shouldSkip = evaluateSkip(fieldVal, step.skipIf);
      if (shouldSkip) {
        options.onEvent?.({ type: 'step-status', stepId, status: 'skipped' });
        return {
          stepId,
          skillId: step.skillId,
          status: 'skipped',
          rawOutput: '',
          structuredFields: {},
          durationMs: 0,
        };
      }
    }

    options.onEvent?.({ type: 'step-status', stepId, status: 'running' });

    try {
      const inputs = resolveStepInputs(step, options.userInputs, results);

      if (canExecuteCrmCapability(step.capabilityId) && step.executionMode !== 'skill') {
        const capabilityResult = await executeCrmCapability(step.capabilityId, inputs);
        return {
          stepId: step.id,
          skillId: step.skillId,
          status: 'succeeded',
          rawOutput: capabilityResult.rawOutput,
          structuredFields: capabilityResult.structuredFields,
          durationMs: capabilityResult.durationMs,
        };
      }

      if (canExecuteBusinessCapability(step.capabilityId) && step.executionMode !== 'skill') {
        const capabilityResult = await executeBusinessCapability(step.capabilityId, inputs);
        return {
          stepId: step.id,
          skillId: step.skillId,
          status: 'succeeded',
          rawOutput: capabilityResult.rawOutput,
          structuredFields: capabilityResult.structuredFields,
          durationMs: capabilityResult.durationMs,
        };
      }

      const skill = resolveSkill(step.skillId);
      const inputsText = JSON.stringify(inputs);
      const baseClassification = classifyStep({ step, dag, inputsText });
      const forcedTier = tierOverrides.get(stepId);
      const classification = forcedTier
        ? {
            ...baseClassification,
            minTier: forcedTier,
            preferredTier: forcedTier,
          }
        : baseClassification;
      const modelChoice = routeModel(classification, {
        ...options.routingContext,
        preferredProviders: [options.provider],
        allowedProviders: [options.provider],
      });
      const invocation = await invokeSkill({
        step,
        skill,
        inputs,
        provider: options.provider,
        apiKey: options.apiKey,
        modelChoice,
        signal: options.signal,
      });
      const actualUsage = invocation.tokenUsage;
      const actualCostCents = actualUsage
        ? calculateCost(actualUsage, modelChoice.model).totalCents
        : undefined;

      // Two-pass extraction
      const extraction = await extractStructured({
        rawOutput: invocation.rawOutput,
        contract: step.outputContract,
        provider: options.provider,
        apiKey: options.apiKey,
        signal: options.signal,
      });

      return {
        stepId: step.id,
        skillId: step.skillId,
        status: 'succeeded',
        rawOutput: invocation.rawOutput,
        structuredFields: extraction.fields,
        durationMs: invocation.durationMs,
        routing: {
          modelId: modelChoice.model.id,
          modelProvider: modelChoice.model.provider,
          modelTier: modelChoice.selectedTier,
          priceSnapshotId: modelChoice.model.priceSnapshotId,
          estimatedUsage: modelChoice.estimatedUsage,
          actualUsage,
          estimatedCostCents: modelChoice.estimatedCostCents,
          actualCostCents,
          routingReason: forcedTier
            ? `${modelChoice.routingReason} Escalated by quality gate to ${forcedTier}.`
            : modelChoice.routingReason,
          rejectedCandidates: modelChoice.rejectedCandidates,
        },
      };
    } catch (err) {
      logger.error('agentic.runner step failed', {
        stepId,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        stepId: step.id,
        skillId: step.skillId,
        status: 'failed',
        rawOutput: '',
        structuredFields: {},
        durationMs: 0,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  };

  const commitResult = (result: StepRunResult) => {
    results[result.stepId] = result;
    options.onEvent?.({ type: 'step-status', stepId: result.stepId, status: result.status });
    options.onEvent?.({ type: 'step-completed', result });
  };

  const executeStepIds = async (stepIds: string[]) => {
    const settled = await Promise.allSettled(stepIds.map(executeStep));
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        commitResult(outcome.value);
      } else {
        logger.error('agentic.runner unexpected step rejection', {
          error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
        });
      }
    }
  };

  for (const round of rounds) {
    if (options.signal?.aborted) {
      options.onEvent?.({ type: 'run-failed', error: 'Run aborted before round completed.' });
      return results;
    }

    options.onEvent?.({ type: 'round-started', roundIndex: round.index, stepIds: round.stepIds });

    await executeStepIds(round.stepIds);

    if (!qualityEnabled) continue;

    while (!options.signal?.aborted) {
      const evaluation = await evaluator.evaluateRound({
        dag,
        roundIndex: round.index,
        stepIds: round.stepIds,
        results,
      });
      const report = assessRunQuality(dag, results, round.stepIds);
      const retryStepIds = Array.from(new Set([
        ...report.retryStepIds,
        ...(evaluation.retryStepIds ?? []),
      ]));
      const attemptState: StepAttemptState[] = round.stepIds.map((stepId) => ({
        stepId,
        attempts: attemptsByStep.get(stepId) ?? 0,
        lastTier: results[stepId]?.routing?.modelTier ?? tierOverrides.get(stepId),
      }));
      const decision =
        evaluation.decision === 'stop'
          ? {
              decision: 'stop' as const,
              retryStepIds: [],
              escalateStepIds: [],
              stopReason: evaluation.reason,
            }
          : buildReplanDecision(
              { ...report, retryStepIds },
              attemptState,
              {
                maxRetriesPerStep,
                escalateAfterRetries: 1,
                replanAfterRetries: maxRetriesPerStep,
                stopOnTerminalFailure: true,
              },
            );

      options.onEvent?.({
        type: 'quality-evaluated',
        roundIndex: round.index,
        decision: decision.decision,
        retryStepIds: decision.retryStepIds,
        escalateStepIds: decision.escalateStepIds,
        reason: decision.stopReason ?? decision.replanReason ?? evaluation.reason,
      });
      const qualityTelemetry = buildQualityTelemetryEvents({
        dag,
        roundIndex: round.index,
        assessments: report.assessments,
        results,
        attemptsByStep,
        decision,
        workflowId: options.quality?.workflowId ?? dag.id,
      });
      options.onEvent?.({
        type: 'quality-telemetry',
        roundIndex: round.index,
        events: qualityTelemetry,
      });
      await options.quality?.onQualityEvents?.(qualityTelemetry);
      if (options.quality?.agentRunId && qualityTelemetry.length > 0) {
        await recordQualityEvents(
          qualityTelemetry.map((event): QualityEventInput => ({
            agentRunId: options.quality!.agentRunId!,
            workflowId: event.workflowId,
            stepId: event.stepId,
            skillId: event.skillId,
            roundIndex: event.roundIndex,
            modelId: event.modelId,
            modelProvider: event.modelProvider,
            modelTier: event.modelTier,
            evaluatorId: event.evaluatorId,
            status: event.status,
            decision: event.decision,
            contractCompleteness: event.contractCompleteness,
            requiredFields: event.requiredFields,
            presentRequiredFields: event.presentRequiredFields,
            missingRequiredFields: event.missingRequiredFields,
            optionalFields: event.optionalFields,
            presentOptionalFields: event.presentOptionalFields,
            retryCount: event.retryCount,
            escalationTier: event.escalationTier,
            reasons: event.reasons,
          })),
        );
      }

      if (decision.decision === 'proceed') break;

      if (decision.decision === 'stop' || decision.decision === 'replan') {
        options.onEvent?.({
          type: 'run-failed',
          error:
            decision.stopReason ??
            decision.replanReason ??
            'Quality gate stopped the run before the next round.',
        });
        return results;
      }

      const idsToRetry = Array.from(new Set([
        ...decision.retryStepIds,
        ...decision.escalateStepIds,
      ]));
      if (idsToRetry.length === 0) break;

      for (const stepId of decision.escalateStepIds) {
        const currentTier = tierOverrides.get(stepId) ?? results[stepId]?.routing?.modelTier ?? 'fast';
        tierOverrides.set(stepId, escalationTier(currentTier));
      }
      for (const stepId of idsToRetry) {
        attemptsByStep.set(stepId, (attemptsByStep.get(stepId) ?? 0) + 1);
      }

      await executeStepIds(idsToRetry);
    }
  }

  const totalDurationMs = Date.now() - startedAt;
  options.onEvent?.({ type: 'run-completed', results, totalDurationMs });
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildQualityTelemetryEvents(args: {
  dag: AgenticDAG;
  roundIndex: number;
  assessments: StepQualityAssessment[];
  results: Record<string, StepRunResult>;
  attemptsByStep: Map<string, number>;
  decision: ReplanDecision;
  workflowId: string;
}): QualityTelemetryEvent[] {
  const retrySet = new Set(args.decision.retryStepIds);
  const escalationSet = new Set(args.decision.escalateStepIds);
  return args.assessments.map((assessment) => {
    const step = args.dag.steps.find((candidate) => candidate.id === assessment.stepId);
    const result = args.results[assessment.stepId];
    const perStepDecision = escalationSet.has(assessment.stepId)
      ? 'escalate'
      : retrySet.has(assessment.stepId)
        ? 'retry'
        : assessment.decision === 'retry' &&
            (args.decision.decision === 'replan' || args.decision.decision === 'stop')
          ? args.decision.decision
          : assessment.decision;

    return {
      workflowId: args.workflowId,
      stepId: assessment.stepId,
      skillId: result?.skillId ?? step?.skillId ?? null,
      roundIndex: args.roundIndex,
      modelId: result?.routing?.modelId ?? null,
      modelProvider: result?.routing?.modelProvider ?? null,
      modelTier: result?.routing?.modelTier ?? null,
      evaluatorId: 'runner-round-quality-gate',
      status: assessment.status,
      decision: perStepDecision,
      contractCompleteness: assessment.contract.completeness,
      requiredFields: assessment.contract.requiredFields,
      presentRequiredFields: assessment.contract.presentRequiredFields,
      missingRequiredFields: assessment.contract.missingRequiredFields,
      optionalFields: assessment.contract.optionalFields,
      presentOptionalFields: assessment.contract.presentOptionalFields,
      retryCount: args.attemptsByStep.get(assessment.stepId) ?? 0,
      escalationTier: escalationSet.has(assessment.stepId)
        ? escalationTier(result?.routing?.modelTier ?? 'fast')
        : null,
      reasons: assessment.reasons,
    };
  });
}

function readField(results: Record<string, StepRunResult>, dotted: string): unknown {
  // Dotted path: "<stepId>.<fieldKey>"
  const dot = dotted.indexOf('.');
  if (dot === -1) return undefined;
  const stepId = dotted.slice(0, dot);
  const key = dotted.slice(dot + 1);
  const upstream = results[stepId];
  if (!upstream) return undefined;
  return upstream.structuredFields[key];
}

function evaluateSkip(value: unknown, rule: NonNullable<AgenticStep['skipIf']>): boolean {
  switch (rule.operator) {
    case 'equals':       return value === rule.value;
    case 'notEquals':    return value !== rule.value;
    case 'exists':       return value !== undefined && value !== null && value !== '';
    case 'notExists':    return value === undefined || value === null || value === '';
    case 'greaterThan':  return typeof value === 'number' && typeof rule.value === 'number' && value > rule.value;
    case 'lessThan':     return typeof value === 'number' && typeof rule.value === 'number' && value < rule.value;
    default:             return false;
  }
}

/**
 * Build a runtime-state map from completed results — convenient for the UI
 * since StepRuntimeState is what the WorkflowDAG component consumes.
 */
export function toRuntimeState(results: Record<string, StepRunResult>): Record<string, StepRuntimeState> {
  const state: Record<string, StepRuntimeState> = {};
  for (const [id, r] of Object.entries(results)) {
    state[id] = { stepId: id, status: r.status, errorMessage: r.errorMessage };
  }
  return state;
}
