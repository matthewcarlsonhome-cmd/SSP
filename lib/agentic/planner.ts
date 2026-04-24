/**
 * planner.ts — single LLM call that turns a goal + available skills + user
 * inputs into an ExecutionPlan (which steps run, in which order, in which
 * rounds, with which skipped).
 *
 * The planner sits BETWEEN the user's submit click and the runner. It is an
 * optional step: workflows with `executionStrategy: 'static'` skip it; only
 * `executionStrategy: 'planned'` invokes the planner.
 *
 * Failure mode: if the planner returns malformed output or errors, callers
 * should fall back to the static execution rounds from buildExecutionRounds.
 * That fallback is the planner's safety net, not a bug — never trust an
 * LLM-emitted plan as load-bearing without a deterministic backup.
 */

import { runPrompt, type AgenticProvider } from './providers';
import { parseLooseJSON } from './extractor';
import { buildExecutionRounds } from './dagAdapter';
import type { AgenticDAG, AgenticStep, ExecutionPlan, ExecutionRound } from './types';
import { logger } from '../logger';

interface PlanArgs {
  dag: AgenticDAG;
  userInputs: Record<string, unknown>;
  goal?: string;
  provider: AgenticProvider;
  apiKey: string;
}

interface PlannerResponse {
  rounds?: Array<{ step_ids: string[] }>;
  skipped?: Array<{ step_id: string; reason: string }>;
  reasoning?: string;
  estimated_minutes?: number;
}

function buildPlannerSystem(): string {
  return (
    'You are a workflow planner. Given a directed acyclic graph (DAG) of ' +
    'available skills and the user inputs for this run, decide:\n' +
    '  1. Which steps to run (skip steps whose inputs are missing or whose ' +
    '     conditions are not met).\n' +
    '  2. The grouping into execution rounds — steps in the same round will ' +
    '     run in parallel, so only group steps whose dependencies are all in ' +
    '     prior rounds.\n' +
    '  3. A short reasoning explaining the plan.\n\n' +
    'Constraints:\n' +
    '  - Respect declared dependencies. A step cannot run before all of its ' +
    '    dependsOn predecessors complete (or are explicitly skipped).\n' +
    '  - Prefer parallelism. If two steps have the same dependencies, place ' +
    '    them in the same round.\n' +
    '  - Skip aggressively when inputs are clearly thin or empty.\n' +
    '  - Return ONLY a JSON object — no prose, no code fences.\n\n' +
    'Output schema:\n' +
    '{\n' +
    '  "rounds": [ { "step_ids": ["..."] }, ... ],\n' +
    '  "skipped": [ { "step_id": "...", "reason": "..." }, ... ],\n' +
    '  "reasoning": "...",\n' +
    '  "estimated_minutes": 0\n' +
    '}'
  );
}

function buildPlannerUserPrompt(dag: AgenticDAG, inputs: Record<string, unknown>, goal?: string): string {
  const stepDocs = dag.steps
    .map(
      s =>
        `- id: ${s.id}\n` +
        `  skill: ${s.skillId}\n` +
        `  name: ${s.name}\n` +
        `  depends_on: [${s.dependsOn.join(', ')}]\n` +
        (s.outputContract
          ? `  produces: ${s.outputContract.fields.map(f => f.key).join(', ')}\n`
          : '') +
        `  description: ${s.description ?? ''}`,
    )
    .join('\n');

  const inputDocs = Object.entries(inputs)
    .map(([k, v]) => {
      const val = typeof v === 'string' ? v.slice(0, 200) : JSON.stringify(v).slice(0, 200);
      const provided = v !== undefined && v !== null && v !== '';
      return `- ${k}: ${provided ? `(provided) ${val}` : '(empty)'}`;
    })
    .join('\n');

  return (
    `Workflow: ${dag.name}\n` +
    (goal ? `Goal: ${goal}\n` : '') +
    `\nAvailable skills (DAG nodes):\n${stepDocs}\n\n` +
    `User inputs for this run:\n${inputDocs}\n\n` +
    `Return your plan as a JSON object now.`
  );
}

/**
 * Take a planner response and turn it into the canonical ExecutionPlan
 * shape. Validates that referenced step ids exist and that round dependencies
 * are satisfied; returns null if the plan is invalid (caller should fall back).
 */
function normalizePlan(
  raw: PlannerResponse,
  dag: AgenticDAG,
): ExecutionPlan | null {
  if (!raw || !Array.isArray(raw.rounds)) return null;
  const validIds = new Set(dag.steps.map(s => s.id));
  const stepDeps = new Map<string, string[]>();
  dag.steps.forEach(s => stepDeps.set(s.id, s.dependsOn));

  const skipped = (raw.skipped ?? []).filter(s => validIds.has(s.step_id));
  const skippedIds = new Set(skipped.map(s => s.step_id));

  const completedSoFar = new Set<string>(skippedIds);  // skipped counts as "done"
  const rounds: ExecutionRound[] = [];

  for (let i = 0; i < raw.rounds.length; i++) {
    const round = raw.rounds[i];
    if (!round || !Array.isArray(round.step_ids)) return null;
    const stepIds = round.step_ids.filter(id => validIds.has(id) && !skippedIds.has(id));
    if (stepIds.length === 0) continue;
    // Validate every step's dependencies are already completed.
    for (const id of stepIds) {
      const deps = stepDeps.get(id) ?? [];
      for (const dep of deps) {
        if (!completedSoFar.has(dep)) {
          // Round violates dependency order — reject the whole plan.
          return null;
        }
      }
    }
    rounds.push({ index: rounds.length, stepIds });
    stepIds.forEach(id => completedSoFar.add(id));
  }

  return {
    strategy: 'planned',
    rounds,
    skipped: skipped.map(s => ({ stepId: s.step_id, reason: s.reason })),
    reasoning: raw.reasoning,
    estimatedDurationSec: typeof raw.estimated_minutes === 'number' ? raw.estimated_minutes * 60 : undefined,
  };
}

/**
 * Static fallback plan — runs every step using the topological rounds with no
 * skipping. Use when the planner fails or is not invoked.
 */
export function staticPlan(dag: AgenticDAG): ExecutionPlan {
  return {
    strategy: 'static',
    rounds: buildExecutionRounds(dag),
    skipped: [],
  };
}

/**
 * Public entry: produce an ExecutionPlan for the DAG. Uses the planner LLM
 * call by default; falls back to staticPlan on any failure so callers can
 * proceed without special-casing the error path.
 */
export async function plan(args: PlanArgs): Promise<ExecutionPlan> {
  try {
    const result = await runPrompt({
      provider: args.provider,
      apiKey: args.apiKey,
      systemInstruction: buildPlannerSystem(),
      userPrompt: buildPlannerUserPrompt(args.dag, args.userInputs, args.goal),
      modelTier: 'balanced',
    });

    const parsed = parseLooseJSON(result.text) as PlannerResponse | null;
    if (!parsed) {
      logger.warn('agentic.planner returned unparseable JSON; using static fallback');
      return staticPlan(args.dag);
    }

    const normalized = normalizePlan(parsed, args.dag);
    if (!normalized) {
      logger.warn('agentic.planner produced invalid plan; using static fallback');
      return staticPlan(args.dag);
    }
    return normalized;
  } catch (err) {
    logger.warn('agentic.planner call failed; using static fallback', {
      error: err instanceof Error ? err.message : String(err),
    });
    return staticPlan(args.dag);
  }
}

// Re-export for convenience
export { buildExecutionRounds };
