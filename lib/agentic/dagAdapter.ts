/**
 * dagAdapter — converts an existing Workflow (lib/storage/types.ts) into an
 * AgenticDAG so the comparison/teaching view can show "today's linear
 * workflow vs. agentic representation" using real workflow definitions
 * without modifying them.
 *
 * Inference rules:
 *  - If a step's inputMappings reference `{ type: 'previous', stepId: X }`
 *    we infer a hard dependency on X.
 *  - Steps that only depend on the very first step are flagged as
 *    parallelizable with each other in the inference notes.
 *  - Steps with no `previous` references default to depending on the prior
 *    step (matches the existing engine fallback in parallelExecutor.ts:43).
 */

import type { Workflow, WorkflowStep } from '../storage/types';
import type { AgenticDAG, AgenticStep, ExecutionRound } from './types';

export interface InferredStepDeps {
  stepId: string;
  inferred: string[];
  source: 'explicit-previous-mapping' | 'sequential-fallback' | 'declared-dependsOn';
}

/**
 * Inspect a single workflow step's inputMappings and pull out any explicit
 * `{ type: 'previous', stepId: ... }` references.
 */
function extractPreviousReferences(step: WorkflowStep): string[] {
  const refs = new Set<string>();
  const mappings = step.inputMappings || {};
  for (const key of Object.keys(mappings)) {
    const src = mappings[key] as { type?: string; stepId?: string } | undefined;
    if (src && src.type === 'previous' && src.stepId) {
      refs.add(src.stepId);
    }
  }
  return Array.from(refs);
}

/**
 * Infer dependencies for every step in the workflow.
 */
export function inferDependencies(workflow: Workflow): InferredStepDeps[] {
  const result: InferredStepDeps[] = [];
  workflow.steps.forEach((step, index) => {
    if (step.dependsOn && step.dependsOn.length > 0) {
      result.push({ stepId: step.id, inferred: [...step.dependsOn], source: 'declared-dependsOn' });
      return;
    }

    const previousRefs = extractPreviousReferences(step);
    if (previousRefs.length > 0) {
      result.push({ stepId: step.id, inferred: previousRefs, source: 'explicit-previous-mapping' });
      return;
    }

    if (index === 0) {
      result.push({ stepId: step.id, inferred: [], source: 'sequential-fallback' });
    } else {
      result.push({
        stepId: step.id,
        inferred: [workflow.steps[index - 1].id],
        source: 'sequential-fallback',
      });
    }
  });
  return result;
}

/**
 * Adapt a Workflow into an AgenticDAG. The result is a *view* — the original
 * workflow definition is untouched.
 */
export function adaptWorkflowToDAG(workflow: Workflow): AgenticDAG {
  const inferred = inferDependencies(workflow);
  const inferenceNotes: string[] = [];

  const declaredCount = inferred.filter(d => d.source === 'declared-dependsOn').length;
  const explicitCount = inferred.filter(d => d.source === 'explicit-previous-mapping').length;
  const fallbackCount = inferred.filter(d => d.source === 'sequential-fallback').length;

  if (declaredCount > 0) {
    inferenceNotes.push(`${declaredCount} step(s) declare dependsOn explicitly.`);
  }
  if (explicitCount > 0) {
    inferenceNotes.push(`${explicitCount} step(s) inferred from "previous" input mappings.`);
  }
  if (fallbackCount > 0) {
    inferenceNotes.push(
      `${fallbackCount} step(s) defaulted to depending on the previous step ` +
        '(no explicit dependency information available).',
    );
  }

  const steps: AgenticStep[] = workflow.steps.map((step, index) => {
    const deps = inferred[index].inferred;
    return {
      id: step.id,
      skillId: step.skillId,
      name: step.name,
      description: step.description,
      dependsOn: deps,
      // outputContract / contextRequirements deliberately omitted — those
      // require human authoring and the adapter does not invent them.
    };
  });

  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    steps,
    derivedFrom: {
      workflowId: workflow.id,
      inferenceNotes,
    },
  };
}

/**
 * Topological sort → execution rounds. Steps in the same round have their
 * dependencies satisfied by earlier rounds and may run in parallel.
 *
 * This duplicates the logic in lib/workflows/parallelExecutor.ts on purpose:
 * the agentic side must not import from the existing engine so the two
 * systems stay independently evolvable. If the patterns converge later,
 * refactor into a shared utility.
 */
export function buildExecutionRounds(dag: AgenticDAG): ExecutionRound[] {
  const rounds: ExecutionRound[] = [];
  const completed = new Set<string>();
  const remaining = new Set(dag.steps.map(s => s.id));
  const stepDeps = new Map<string, string[]>();
  dag.steps.forEach(s => stepDeps.set(s.id, s.dependsOn));

  let roundIndex = 0;
  while (remaining.size > 0) {
    const ready: string[] = [];
    for (const id of remaining) {
      const deps = stepDeps.get(id) || [];
      if (deps.every(d => completed.has(d))) ready.push(id);
    }
    if (ready.length === 0) {
      // Circular or missing dependency — flush the rest sequentially so the
      // visualization still renders rather than hanging.
      for (const id of remaining) {
        rounds.push({ index: roundIndex++, stepIds: [id] });
        completed.add(id);
      }
      break;
    }
    rounds.push({ index: roundIndex++, stepIds: ready });
    ready.forEach(id => {
      completed.add(id);
      remaining.delete(id);
    });
  }
  return rounds;
}

/**
 * Convenience metric for the comparison view: how many sequential rounds the
 * adapted DAG actually requires versus the original linear step count.
 */
export function summarizeParallelism(dag: AgenticDAG): {
  totalSteps: number;
  rounds: number;
  maxParallel: number;
  speedupRatio: number; // totalSteps / rounds
} {
  const rounds = buildExecutionRounds(dag);
  const totalSteps = dag.steps.length;
  const maxParallel = rounds.reduce((m, r) => Math.max(m, r.stepIds.length), 0);
  const speedupRatio = rounds.length === 0 ? 1 : totalSteps / rounds.length;
  return { totalSteps, rounds: rounds.length, maxParallel, speedupRatio };
}
