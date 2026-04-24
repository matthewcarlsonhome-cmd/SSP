/**
 * Agentic module entry point. Re-exports the public surface so consumers
 * import from `lib/agentic` rather than reaching into individual files.
 *
 * RULE: nothing in lib/workflows/ or lib/skills/ may import from this module.
 * The dependency arrow points only one way — agentic → existing — so the
 * agentic experiment can be deleted wholesale without breakage.
 */

// Types
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

// DAG inference + introspection (Phase 1)
export {
  adaptWorkflowToDAG,
  buildExecutionRounds,
  inferDependencies,
  summarizeParallelism,
} from './dagAdapter';

// Provider abstraction
export type { AgenticProvider, ModelTier } from './providers';
export { runPrompt } from './providers';

// Skill-as-tool adapter
export {
  appendContractDirective,
  invokeSkill,
  resolveSkill,
  type SkillToolInvocation,
  type SkillToolResult,
} from './skillTool';

// Two-pass extractor
export {
  extractStructured,
  parseLooseJSON,
  type ExtractionResult,
} from './extractor';

// DAG runner
export {
  runAgenticDAG,
  toRuntimeState,
  type RunnerEvent,
  type RunnerOptions,
  type StepRunResult,
} from './runner';

// Planner
export {
  plan,
  staticPlan,
} from './planner';

// Hand-authored DAGs (production-grade workflow definitions with contracts)
export { HAND_AUTHORED_DAGS, PPC_MASTER_WEEKLY_DAG } from './contracts/ppcMasterWeekly';
