/**
 * taskClassifier.ts — converts an AgenticStep into a TaskClassification.
 *
 * Rule-based, deterministic, fast. The router needs a TaskClassification
 * for every call but does not need an LLM call to compute it.
 *
 * Classification heuristics:
 *  1. Skill-id pattern matching (most reliable when skills follow naming
 *     conventions — "extract", "audit", "summary", "strategy", etc.).
 *  2. Output-contract shape (a contract with a single `summary` text field
 *     suggests routine summarization; a contract with structured arrays
 *     suggests analysis or extraction).
 *  3. Step-name keywords (fallback when skill id is uninformative).
 *  4. Position in the DAG (root steps and steps with many dependents are
 *     promoted to higher complexity; leaf steps with no dependents are
 *     usually generation-tier).
 *
 * Edge cases land in `routine` / `analysis` / `team` stakes. Those are the
 * safe defaults — the router maps them to balanced-tier models, which
 * handle most workloads acceptably.
 */

import type { AgenticDAG, AgenticStep } from './types';
import type {
  TaskClassification,
  TaskComplexity,
  TaskKind,
  TaskStakes,
} from './costing';
import { estimateTokens } from './costing';

// ─────────────────────────────────────────────────────────────────────────────
// Keyword tables — pattern-match against skill ids, step names, and step
// descriptions to infer task kind. Match order matters: more specific
// patterns first.
// ─────────────────────────────────────────────────────────────────────────────

const KIND_PATTERNS: Array<{ kind: TaskKind; patterns: RegExp[] }> = [
  // Reasoning is searched first because it dominates routing decisions.
  { kind: 'reasoning',     patterns: [/strategy/i, /optimi[sz]e/i, /allocat/i, /plan(?:ner|ning)?/i, /decision/i, /trade-?off/i] },
  { kind: 'creative',      patterns: [/creative/i, /brainstorm/i, /ideat/i, /pitch/i, /tagline/i, /headline/i, /name[ -]?generator/i] },
  { kind: 'extraction',    patterns: [/extract/i, /parse/i, /pull[ -]?fields?/i, /intake/i] },
  { kind: 'classification',patterns: [/classify/i, /categori[sz]e/i, /tag/i, /label/i, /tier/i, /priorit[iy]/i, /score/i, /rank/i] },
  { kind: 'transformation',patterns: [/transform/i, /reformat/i, /convert/i, /translate/i, /compress/i] },
  { kind: 'summarization', patterns: [/summari[sz]e/i, /summary/i, /digest/i, /recap/i, /change[ -]?log/i] },
  { kind: 'synthesis',     patterns: [/deliverable/i, /merge/i, /synthesi[sz]e/i, /aggregat/i, /combin/i, /compile/i, /rollup/i, /report/i] },
  { kind: 'generation',    patterns: [/generat/i, /write/i, /draft/i, /compose/i, /author/i, /email/i, /proposal/i, /brief/i, /content/i] },
  { kind: 'analysis',      patterns: [/audit/i, /analy[sz]e/i, /analysis/i, /assess/i, /review/i, /research/i, /investigat/i, /diagnose/i] },
];

function pickKindByText(text: string): TaskKind | null {
  for (const { kind, patterns } of KIND_PATTERNS) {
    for (const p of patterns) {
      if (p.test(text)) return kind;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Complexity inference — based on contract shape, kind, and DAG position.
// ─────────────────────────────────────────────────────────────────────────────

function inferComplexity(step: AgenticStep, kind: TaskKind, isMergePoint: boolean, isLeaf: boolean): TaskComplexity {
  // Reasoning is always at least complex; if it's a merge point in the DAG
  // (depends on multiple predecessors), it's strategic.
  if (kind === 'reasoning') return isMergePoint ? 'strategic' : 'complex';

  // Creative work without structured constraints is strategic; with a
  // narrow contract it drops to complex.
  if (kind === 'creative') {
    return step.outputContract && step.outputContract.fields.length <= 2 ? 'complex' : 'strategic';
  }

  // Extraction / classification / transformation / summarization are all
  // trivial-to-routine; default routine.
  if (kind === 'extraction')     return 'trivial';
  if (kind === 'classification') return 'trivial';
  if (kind === 'transformation') return 'routine';
  if (kind === 'summarization')  return 'routine';

  // Synthesis and analysis are complexity-by-context. Merge points need to
  // reason across multiple inputs — promote them. Leaf steps with no
  // dependents are usually feeding back to the user; keep at complex.
  if (kind === 'synthesis') return isMergePoint ? 'strategic' : 'complex';
  if (kind === 'analysis')  return isMergePoint ? 'complex'   : 'routine';

  // Generation: leaf steps producing client-facing content stay at complex;
  // intermediate generation can be routine.
  if (kind === 'generation') return isLeaf ? 'complex' : 'routine';

  return 'routine';
}

// ─────────────────────────────────────────────────────────────────────────────
// Stakes inference — coarse heuristic based on text patterns.
// ─────────────────────────────────────────────────────────────────────────────

function inferStakes(text: string): TaskStakes {
  if (/board|ceo|exec|leadership|investor/i.test(text)) return 'leadership';
  if (/client|customer|deliverable|external|proposal/i.test(text)) return 'client';
  if (/team|internal[ -]?report|standup|retro/i.test(text)) return 'team';
  return 'team';
}

// ─────────────────────────────────────────────────────────────────────────────
// Reversibility — true unless the step's output is going somewhere that
// can't be revised easily. Heuristic: any step that produces a "send",
// "publish", "modify-account" output is treated as not-reversible. Most
// content-generation outputs are reversible because they go through human
// review before delivery.
// ─────────────────────────────────────────────────────────────────────────────

function inferReversibility(text: string): boolean {
  if (/\bsend\b|publish|deploy|modify[ -]?account/i.test(text)) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// DAG-position helpers
// ─────────────────────────────────────────────────────────────────────────────

function isMergePointInDag(step: AgenticStep): boolean {
  // A step that depends on 2+ predecessors is a merge.
  return step.dependsOn.length >= 2;
}

function isLeafInDag(step: AgenticStep, dag: AgenticDAG): boolean {
  // No other step depends on this one → it's a leaf (terminal output).
  return !dag.steps.some((s) => s.dependsOn.includes(step.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassifyStepArgs {
  step: AgenticStep;
  dag: AgenticDAG;
  /** Optional: text of inputs that will be passed to the step at runtime,
   *  used for input-token estimation. */
  inputsText?: string;
}

/**
 * Classify a step in a DAG. Pure function — same step + DAG always
 * produces the same classification. The result is what the router
 * consumes via routeModel().
 */
export function classifyStep(args: ClassifyStepArgs): TaskClassification {
  const { step, dag, inputsText } = args;
  const haystack = `${step.skillId} ${step.name} ${step.description ?? ''}`;
  const kind = pickKindByText(haystack) ?? 'analysis';
  const merge = isMergePointInDag(step);
  const leaf = isLeafInDag(step, dag);
  const complexity = inferComplexity(step, kind, merge, leaf);
  const stakes = inferStakes(haystack);
  const reversible = inferReversibility(haystack);

  const inputTokens = inputsText ? estimateTokens(inputsText) : 4000;
  // Output token estimate by kind — extraction stays small, generation /
  // synthesis run large.
  const outputTokens =
    kind === 'extraction' || kind === 'classification' ? 500 :
    kind === 'transformation' || kind === 'summarization' ? 1000 :
    kind === 'analysis' || kind === 'synthesis' ? 2000 :
    kind === 'reasoning' || kind === 'creative' ? 2500 :
    /* generation */ 2000;

  // Intermediate iff the step has at least one downstream dependent.
  const isIntermediate = !leaf;

  return {
    complexity,
    kind,
    stakes,
    reversible,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    isIntermediate,
  };
}
