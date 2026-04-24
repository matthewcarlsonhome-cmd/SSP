/**
 * Agentic module entry point. Re-exports the public surface so consumers
 * import from `lib/agentic` rather than reaching into individual files.
 *
 * RULE: nothing in lib/workflows/ or lib/skills/ may import from this module.
 * The dependency arrow points only one way — agentic → existing — so the
 * agentic experiment can be deleted wholesale without breakage.
 */

export type {
  AgenticDAG,
  AgenticStep,
  ContextRequirement,
  ExecutionPlan,
  ExecutionRound,
  ExecutionStrategy,
  OutputContract,
  OutputField,
  SkipRule,
  StepRuntimeState,
  StepStatus,
} from './types';

export {
  adaptWorkflowToDAG,
  buildExecutionRounds,
  inferDependencies,
  summarizeParallelism,
} from './dagAdapter';
