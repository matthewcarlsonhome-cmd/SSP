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
}

export type RunnerEvent =
  | { type: 'run-started'; totalRounds: number; totalSteps: number }
  | { type: 'round-started'; roundIndex: number; stepIds: string[] }
  | { type: 'step-status'; stepId: string; status: StepStatus }
  | { type: 'step-completed'; result: StepRunResult }
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

  options.onEvent?.({
    type: 'run-started',
    totalRounds: rounds.length,
    totalSteps: dag.steps.length,
  });

  for (const round of rounds) {
    if (options.signal?.aborted) {
      options.onEvent?.({ type: 'run-failed', error: 'Run aborted before round completed.' });
      return results;
    }

    options.onEvent?.({ type: 'round-started', roundIndex: round.index, stepIds: round.stepIds });

    const promises = round.stepIds.map(async (stepId): Promise<StepRunResult> => {
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
        const skill = resolveSkill(step.skillId);
        const inputs = resolveStepInputs(step, options.userInputs, results);
        const invocation = await invokeSkill({
          step,
          skill,
          inputs,
          provider: options.provider,
          apiKey: options.apiKey,
          modelTier: 'balanced',
          signal: options.signal,
        });

        // Two-pass extraction
        const extraction = await extractStructured({
          rawOutput: invocation.rawOutput,
          contract: step.outputContract,
          provider: options.provider,
          apiKey: options.apiKey,
          signal: options.signal,
        });

        const result: StepRunResult = {
          stepId: step.id,
          skillId: step.skillId,
          status: 'succeeded',
          rawOutput: invocation.rawOutput,
          structuredFields: extraction.fields,
          durationMs: invocation.durationMs,
        };
        return result;
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
    });

    const settled = await Promise.allSettled(promises);
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        const r = outcome.value;
        results[r.stepId] = r;
        options.onEvent?.({ type: 'step-status', stepId: r.stepId, status: r.status });
        options.onEvent?.({ type: 'step-completed', result: r });
      }
      // settled rejections shouldn't happen because per-step errors are caught
      // above, but be defensive.
    }
  }

  const totalDurationMs = Date.now() - startedAt;
  options.onEvent?.({ type: 'run-completed', results, totalDurationMs });
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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
