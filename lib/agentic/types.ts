/**
 * Agentic types — isolated from the existing Workflow type system.
 * Existing workflows continue to use lib/storage/types.ts unchanged.
 */

import type {
  DataSensitivity,
  ModelTierKey,
  Provider,
  TaskComplexity,
  TaskKind,
  TaskStakes,
} from './costing';

// ─────────────────────────────────────────────────────────────────────────────
// Output contracts: structured fields a step is expected to produce. Used by
// the two-pass extractor to turn LLM prose into addressable data downstream
// steps can consume selectively.
// ─────────────────────────────────────────────────────────────────────────────
export interface OutputField {
  key: string;
  description: string;
  format: 'text' | 'json' | 'markdown-list' | 'table' | 'number';
  required?: boolean;
  maxTokens?: number;
}

export interface OutputContract {
  fields: OutputField[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Context requirements: a step declares which fields from which upstream
// outputs it needs, instead of receiving entire prior outputs.
// ─────────────────────────────────────────────────────────────────────────────
export interface ContextRequirement {
  fromStep: string;
  fields: string[];
  maxTokens?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// AgenticStep — DAG node that wraps a skill with explicit dependencies,
// optional skip rules, and an output contract.
// ─────────────────────────────────────────────────────────────────────────────
export type SkipRule = {
  field: string;        // dotted path into entity_context or upstream output
  operator: 'equals' | 'notEquals' | 'exists' | 'notExists' | 'greaterThan' | 'lessThan';
  value?: string | number | boolean;
};

export interface AgenticStep {
  id: string;
  skillId: string;
  capabilityId?: string;
  executionMode?: 'skill' | 'internal' | 'renderer' | 'connector' | 'workflow';
  name: string;
  description?: string;

  dependsOn: string[];                    // empty = root
  skipIf?: SkipRule;
  contextRequirements?: ContextRequirement[];
  outputContract?: OutputContract;
  routing?: {
    kind?: TaskKind;
    complexity?: TaskComplexity;
    stakes?: TaskStakes;
    minTier?: ModelTierKey;
    maxTier?: ModelTierKey;
    preferredTier?: ModelTierKey;
    allowedProviders?: Provider[];
    forbiddenProviders?: Provider[];
    requiresJson?: boolean;
    requiresToolCalling?: boolean;
    requiresStreaming?: boolean;
    dataSensitivity?: DataSensitivity;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AgenticDAG — a workflow expressed as a graph. Built either by hand for
// agentic-native workflows or inferred from an existing Workflow via the
// dagAdapter (see ./dagAdapter.ts).
// ─────────────────────────────────────────────────────────────────────────────
export interface AgenticDAG {
  id: string;
  name: string;
  description: string;
  steps: AgenticStep[];

  // Provenance — populated when this DAG was inferred from an existing
  // Workflow rather than hand-authored. Lets the comparison view show the
  // "before vs. after" cleanly.
  derivedFrom?: {
    workflowId: string;
    inferenceNotes: string[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution rounds: groups of steps that can run in parallel. Computed from
// the DAG via topological sort.
// ─────────────────────────────────────────────────────────────────────────────
export interface ExecutionRound {
  index: number;
  stepIds: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution plan — what the planner emits or what a static DAG produces.
// Stored as agent_runs.plan in the database for inspectability.
// ─────────────────────────────────────────────────────────────────────────────
export type ExecutionStrategy = 'static' | 'planned' | 'agentic';

export interface ExecutionPlan {
  strategy: ExecutionStrategy;
  rounds: ExecutionRound[];
  skipped: { stepId: string; reason: string }[];
  reasoning?: string;                     // planner's narrative (planned/agentic)
  estimatedDurationSec?: number;
  estimatedCostCents?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution status — used by both the engine and UI components.
// ─────────────────────────────────────────────────────────────────────────────
export type StepStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped';

export interface StepRuntimeState {
  stepId: string;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
}
