/**
 * Rule-based AgenticStep classifier.
 *
 * Explicit step routing metadata wins. Otherwise the classifier uses skill
 * names, step names, output contracts, and DAG position to produce the task
 * classification consumed by routeModel().
 */

import type { AgenticDAG, AgenticStep } from './types';
import type {
  DataSensitivity,
  ModelTierKey,
  TaskClassification,
  TaskComplexity,
  TaskKind,
  TaskStakes,
} from './costing';
import { estimateTokens } from './costing';

const KIND_PATTERNS: Array<{ kind: TaskKind; patterns: RegExp[] }> = [
  { kind: 'reasoning', patterns: [/strategy/i, /optimi[sz]e/i, /allocat/i, /plan(?:ner|ning)?/i, /decision/i, /trade-?off/i] },
  { kind: 'creative', patterns: [/creative/i, /brainstorm/i, /ideat/i, /pitch/i, /tagline/i, /headline/i, /name[ -]?generator/i] },
  { kind: 'extraction', patterns: [/extract/i, /parse/i, /pull[ -]?fields?/i, /intake/i] },
  { kind: 'classification', patterns: [/classify/i, /categori[sz]e/i, /tag/i, /label/i, /tier/i, /priorit/i, /score/i, /rank/i] },
  { kind: 'transformation', patterns: [/transform/i, /reformat/i, /convert/i, /translate/i, /compress/i] },
  { kind: 'summarization', patterns: [/summari[sz]e/i, /summary/i, /digest/i, /recap/i, /change[ -]?log/i] },
  { kind: 'synthesis', patterns: [/deliverable/i, /merge/i, /synthesi[sz]e/i, /aggregat/i, /combin/i, /compile/i, /rollup/i, /report/i] },
  { kind: 'generation', patterns: [/generat/i, /write/i, /draft/i, /compose/i, /author/i, /email/i, /proposal/i, /brief/i, /content/i] },
  { kind: 'analysis', patterns: [/audit/i, /analy[sz]e/i, /analysis/i, /assess/i, /review/i, /research/i, /investigat/i, /diagnose/i] },
];

function pickKindByText(text: string): TaskKind | null {
  for (const { kind, patterns } of KIND_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(text))) return kind;
  }
  return null;
}

function inferComplexity(step: AgenticStep, kind: TaskKind, isMergePoint: boolean, isLeaf: boolean): TaskComplexity {
  if (kind === 'reasoning') return isMergePoint ? 'strategic' : 'complex';
  if (kind === 'creative') return step.outputContract && step.outputContract.fields.length <= 2 ? 'complex' : 'strategic';
  if (kind === 'extraction' || kind === 'classification') return 'trivial';
  if (kind === 'transformation' || kind === 'summarization' || kind === 'evaluation') return 'routine';
  if (kind === 'synthesis') return isMergePoint ? 'strategic' : 'complex';
  if (kind === 'analysis') return isMergePoint ? 'complex' : 'routine';
  if (kind === 'generation') return isLeaf ? 'complex' : 'routine';
  return 'routine';
}

function inferStakes(text: string): TaskStakes {
  if (/board|ceo|exec|leadership|investor/i.test(text)) return 'leadership';
  if (/client|customer|deliverable|external|proposal/i.test(text)) return 'client';
  if (/team|internal[ -]?report|standup|retro/i.test(text)) return 'team';
  return 'team';
}

function inferReversibility(text: string): boolean {
  return !/\bsend\b|publish|deploy|modify[ -]?account/i.test(text);
}

function isMergePointInDag(step: AgenticStep): boolean {
  return step.dependsOn.length >= 2;
}

function isLeafInDag(step: AgenticStep, dag: AgenticDAG): boolean {
  return !dag.steps.some((s) => s.dependsOn.includes(step.id));
}

function inferOutputTokens(kind: TaskKind): number {
  if (kind === 'extraction' || kind === 'classification' || kind === 'evaluation') return 500;
  if (kind === 'transformation' || kind === 'summarization') return 1000;
  if (kind === 'analysis' || kind === 'synthesis' || kind === 'generation') return 2000;
  return 2500;
}

function inferDataSensitivity(stakes: TaskStakes): DataSensitivity {
  if (stakes === 'client' || stakes === 'leadership') return 'client-confidential';
  return 'internal';
}

function inferMinTier(args: {
  kind: TaskKind;
  complexity: TaskComplexity;
  stakes: TaskStakes;
  isIntermediate: boolean;
  reversible: boolean;
}): ModelTierKey | undefined {
  if (args.kind === 'reasoning' && args.complexity === 'strategic') return 'smart';
  if (args.kind === 'synthesis' && args.complexity === 'strategic') return 'balanced';
  if (args.kind === 'generation' && !args.isIntermediate && (args.stakes === 'client' || args.stakes === 'leadership')) {
    return 'balanced';
  }
  if (!args.reversible && (args.stakes === 'client' || args.stakes === 'leadership')) return 'balanced';
  return undefined;
}

export interface ClassifyStepArgs {
  step: AgenticStep;
  dag: AgenticDAG;
  inputsText?: string;
}

export function classifyStep(args: ClassifyStepArgs): TaskClassification {
  const { step, dag, inputsText } = args;
  const haystack = `${step.skillId} ${step.name} ${step.description ?? ''}`;
  const leaf = isLeafInDag(step, dag);
  const merge = isMergePointInDag(step);

  const kind = step.routing?.kind ?? pickKindByText(haystack) ?? 'analysis';
  const complexity = step.routing?.complexity ?? inferComplexity(step, kind, merge, leaf);
  const stakes = step.routing?.stakes ?? inferStakes(haystack);
  const reversible = inferReversibility(haystack);
  const isIntermediate = !leaf;

  const estimatedInputTokens = inputsText ? estimateTokens(inputsText) : 4000;
  const estimatedOutputTokens = inferOutputTokens(kind);
  const minTier =
    step.routing?.minTier ??
    inferMinTier({ kind, complexity, stakes, isIntermediate, reversible });

  return {
    complexity,
    kind,
    stakes,
    reversible,
    estimatedInputTokens,
    estimatedOutputTokens,
    isIntermediate,
    minTier,
    maxTier: step.routing?.maxTier,
    preferredTier: step.routing?.preferredTier,
    allowedProviders: step.routing?.allowedProviders,
    forbiddenProviders: step.routing?.forbiddenProviders,
    requiresJson: step.routing?.requiresJson ?? false,
    requiresToolCalling: step.routing?.requiresToolCalling ?? false,
    requiresStreaming: step.routing?.requiresStreaming,
    dataSensitivity: step.routing?.dataSensitivity ?? inferDataSensitivity(stakes),
  };
}
