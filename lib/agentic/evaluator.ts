/**
 * evaluator.ts — between-round quality gate for agentic runs.
 *
 * After each round of the runner, the evaluator inspects the structured
 * outputs against the steps' contracts and returns one of:
 *   - proceed: outputs look reasonable, continue to the next round.
 *   - retry:   one or more steps in the round produced empty / contract-
 *              violating output and should be re-run.
 *   - stop:    a critical step failed and the rest of the run should abort.
 *
 * The default evaluator is a deterministic rule-based check (no LLM call):
 *   - A step is "empty" if its structured fields object has zero keys AND
 *     its rawOutput is shorter than 100 chars.
 *   - A step is "contract-violating" if any required field in its contract
 *     is missing from the structured fields.
 *
 * An LLM-backed evaluator is sketched as a future swap-in; the interface is
 * the same so the runner doesn't care which is plugged in.
 */

import type {
  AgenticDAG,
  AgenticStep,
  StepRunResult,
} from './types';

export type EvaluatorDecision = 'proceed' | 'retry' | 'stop';

export interface EvaluationResult {
  decision: EvaluatorDecision;
  reason: string;
  retryStepIds?: string[];
}

export interface Evaluator {
  evaluateRound(input: {
    dag: AgenticDAG;
    roundIndex: number;
    stepIds: string[];
    results: Record<string, StepRunResult>;
  }): Promise<EvaluationResult>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isEmpty(result: StepRunResult): boolean {
  if (result.status !== 'succeeded') return false; // failed/skipped handled separately
  const noFields = Object.keys(result.structuredFields).length === 0;
  const shortRaw = (result.rawOutput?.length ?? 0) < 100;
  return noFields && shortRaw;
}

function missingRequiredFields(step: AgenticStep, result: StepRunResult): string[] {
  if (!step.outputContract) return [];
  return step.outputContract.fields
    .filter(f => f.required)
    .filter(f => !Object.prototype.hasOwnProperty.call(result.structuredFields, f.key))
    .map(f => f.key);
}

// ─────────────────────────────────────────────────────────────────────────────
// Default evaluator — deterministic, no LLM call.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_EVALUATOR: Evaluator = {
  async evaluateRound({ dag, stepIds, results }) {
    const stepMap = new Map<string, AgenticStep>(dag.steps.map(s => [s.id, s]));
    const retryIds: string[] = [];
    const failures: string[] = [];

    for (const stepId of stepIds) {
      const step = stepMap.get(stepId);
      const result = results[stepId];
      if (!step || !result) continue;

      if (result.status === 'failed') {
        failures.push(stepId);
        continue;
      }

      if (result.status === 'skipped') continue;

      if (isEmpty(result)) {
        retryIds.push(stepId);
        continue;
      }

      const missing = missingRequiredFields(step, result);
      if (missing.length > 0) {
        retryIds.push(stepId);
      }
    }

    // A failed merge step (one downstream depends on) is critical; stop.
    if (failures.length > 0) {
      const merges = failures.filter(id =>
        dag.steps.some(s => s.dependsOn.includes(id)),
      );
      if (merges.length > 0) {
        return {
          decision: 'stop',
          reason: `Critical step(s) failed and have downstream dependents: ${merges.join(', ')}.`,
        };
      }
    }

    if (retryIds.length > 0) {
      return {
        decision: 'retry',
        reason: `Empty or contract-violating output in: ${retryIds.join(', ')}.`,
        retryStepIds: retryIds,
      };
    }

    return { decision: 'proceed', reason: 'All steps in round met contract expectations.' };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// LLM-backed evaluator — placeholder. Same interface so the runner can swap
// implementations transparently. Implementing this is a Phase 6 (agentic)
// concern that requires careful prompt engineering — for now the
// deterministic evaluator covers the obvious failure modes.
// ─────────────────────────────────────────────────────────────────────────────

export function createLLMEvaluator(_args: {
  provider: 'claude' | 'gemini' | 'chatgpt';
  apiKey: string;
}): Evaluator {
  // Stub — falls back to deterministic checks. Implementing this means
  // writing an evaluator prompt that takes contract + structured fields +
  // raw output and decides proceed/retry/stop with reasoning.
  return DEFAULT_EVALUATOR;
}
