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
export {
  CUSTOMER_CHURN_PREVENTION_DAG,
  DIGITAL_MARKETING_AUDIT_DAG,
  MARKETING_CAMPAIGN_DAG,
  SALES_ACCOUNT_PURSUIT_DAG,
  SEO_CLIENT_ONBOARDING_DAG,
  TIER_2_HAND_AUTHORED_DAGS,
} from './contracts/tier2Workflows';

// Document-first intake
export { extractIntake, type IntakeFieldSpec, type IntakeResult } from './intake';

// Orchestrator — task classification + model routing
export {
  routeDag,
  routeModel,
  type DagRoutingPlan,
  type ModelChoice,
  type RoutingContext,
} from './orchestrator';

export { classifyStep, type ClassifyStepArgs } from './taskClassifier';

// Cost modeling — model registry, price table, cost estimation
export {
  MODEL_REGISTRY,
  calculateCost,
  centsToDollarString,
  estimateCost,
  estimateTokens,
  formatCostCompact,
  getModel,
  listModels,
  modelsByTier,
  type CostBreakdown,
  type ModelProfile,
  type ModelTierKey,
  type Provider,
  type TaskClassification,
  type TaskComplexity,
  type TaskKind,
  type TaskStakes,
  type TokenUsage,
} from './costing';

// Persistence
export { persistRun, type RunPersistenceContext } from './persistence';

// Evaluator
export {
  DEFAULT_EVALUATOR,
  createLLMEvaluator,
  type EvaluationResult,
  type Evaluator,
  type EvaluatorDecision,
} from './evaluator';

// Policy
export {
  DEFAULT_RULES,
  evaluateAction,
  type PolicyContext,
  type PolicyDecision,
  type PolicyEvaluation,
  type PolicyRule,
  type ProposedAction,
  type ProposedActionKind,
} from './policy';

// Agents + triggers
export {
  AGENTS,
  PPC_OPS_AGENT,
  getAgent,
  listAgents,
  type Agent,
  type AgentRunInput,
  type AgentRunOutcome,
  type AgentTriggerSpec,
} from './agents';

export {
  agentsForEvent,
  dispatchEvent,
  type TriggerEvent,
  type TriggerSource,
} from './triggers';
