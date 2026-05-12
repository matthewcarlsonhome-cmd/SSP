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
  type QualityTelemetryEvent,
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
  RoutingBudgetExceededError,
  type DagRoutingPlan,
  type ModelChoice,
  type RejectedModelCandidate,
  type RoutingContext,
} from './orchestrator';

export { classifyStep, type ClassifyStepArgs } from './taskClassifier';

// Tool capability registry + goal planner
export {
  CAPABILITY_ROADMAP_FAMILIES,
  MANUAL_TOOL_CAPABILITIES,
  agenticStepFromCapability,
  capabilitiesForSourceSkill,
  capabilityFromDbSkill,
  capabilityFromLibrarySkill,
  capabilityRequiresApproval,
  buildCapabilityCoverageRows,
  capabilityCoverageRowsToCsv,
  getToolCapability,
  filterCapabilityCoverageRows,
  isSkillExecutableCapability,
  listToolCapabilities,
  searchCapabilities,
  summarizeCapabilityRoadmapCoverage,
  taskClassificationFromCapability,
  type RussellianAxiom,
  type CapabilityCoverageRow,
  type CapabilityCoverageFilter,
  type CapabilityRoadmapFamilyStatus,
  type ToolCapability,
  type ToolCapabilitySearchQuery,
  type ToolCapabilitySearchResult,
  type ToolExecutionMode,
  type ToolSideEffect,
} from './toolRegistry';

export {
  buildGoalPlan,
  inspectGoalPlanReadiness,
  parseGoalIntake,
  planGoal,
  retrieveMemoryForGoal,
  reviseGoalPlan,
  validateRussellianGraph,
  validateWittgensteinianFit,
  type GoalContextEnvelope,
  type GoalIntake,
  type GoalPlan,
  type GoalPlanInput,
  type GoalPlanReadiness,
  type GoalPlanReadinessIssue,
  type GoalPlanRevision,
  type GraphValidationIssue,
  type GraphValidationResult,
  type MemoryRetrievalForGoalInput,
} from './goalPlanner';

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
  type DataSensitivity,
  type ModelProfile,
  type ModelTierKey,
  type Provider,
  type TaskClassification,
  type TaskComplexity,
  type TaskKind,
  type TaskStakes,
  type TokenUsage,
} from './costing';

export {
  mergeTokenUsage,
  normalizeProviderTokenUsage,
  preferActualTokenUsage,
} from './tokenUsage';

// Persistence
export { persistRun, type RunPersistenceContext } from './persistence';
export {
  listRecentQualityEvents,
  listRecentSkillExecutions,
  recordQualityEvent,
  recordQualityEvents,
  toQualityEventRow,
  toSkillExecutionRow,
  type PersistedQualityEvent,
  type PersistedSkillExecution,
  type QualityEventInput,
} from './supabaseClient';

// Evaluator
export {
  DEFAULT_EVALUATOR,
  createLLMEvaluator,
  type EvaluationResult,
  type Evaluator,
  type EvaluatorDecision,
} from './evaluator';

export {
  assessRunQuality,
  assessStepQuality,
  buildReplanDecision,
  escalationTier,
  planShadowRoute,
  summarizeRouterTuningMetrics,
  type ContractCompliance,
  type QualityDecision,
  type ReplanDecision,
  type RetryEscalationPolicy,
  type RouterTuningMetrics,
  type RunQualityReport,
  type ShadowRoutePlan,
  type StepAttemptState,
  type StepQualityAssessment,
} from './replanner';

export {
  DEFAULT_FACT_POLICIES,
  applyMemoryCorrection,
  buildEntityGraph,
  buildMemoryContextEnvelope,
  extractFactsFromStepOutput,
  filterActiveFacts,
  memoryFactsToKeyValue,
  rankMemoryFactsForGoal,
  scoreMemoryFactForGoal,
  type BusinessEntityType,
  type EntityGraph,
  type EntityGraphEdge,
  type EntityGraphNode,
  type EntityRef,
  type FactExtractionInput,
  type FactExtractionPolicy,
  type MemoryContextEnvelope,
  type MemoryCorrection,
  type MemoryFact,
  type MemoryFactScore,
} from './memory';

export {
  CONNECTOR_IMPLEMENTATION_ORDER,
  CONNECTOR_REGISTRY,
  connectorActionAllowedWithoutExternalIntegration,
  connectorActionRequiresApproval,
  connectorActionRequiresExternalIntegration,
  connectorActionToProposedAction,
  connectorAvailable,
  createApprovalDiff,
  executeConnectorAction,
  listConnectorImplementationOrder,
  listConnectors,
  planConnectorAction,
  type ApprovalDiff,
  type ConnectorAuditEvent,
  type ConnectorActionDraft,
  type ConnectorActionKind,
  type ConnectorDescriptor,
  type ConnectorImplementationStatus,
  type ConnectorKind,
  type ConnectorExecutionResult,
  type ConnectorExecutionStatus,
  type ConnectorPlan,
} from './connectors';

export {
  buildBusinessAgentConsoleState,
  createGoalInboxItem,
  dashboardCardsFromMemory,
  goalPlanToInboxItem,
  timelineFromGoalPlan,
  type AgentRunTimelineEvent,
  type ApprovalSummary,
  type BusinessAgentConsoleState,
  type ClientDashboardCard,
  type CostQualityTrace,
  type GoalInboxItem,
  type GoalInboxStatus,
  type SavedRecurringGoal,
  type TeamPolicySummary,
} from './businessConsole';

export {
  canExecuteBusinessCapability,
  executeBusinessCapability,
  type BusinessCapabilityExecutionResult,
  type BusinessCapabilityId,
} from './businessTools';

export {
  buildLocalCampaignWorklist,
  canExecuteCrmCapability,
  draftLocalAutomationOutreach,
  executeCrmCapability,
  extractWebsiteContactInfo,
  extractWebsiteContactInfoFromHtml,
  sourceDomainForProspect,
  type CapabilityToolExecutionResult,
  type CrmCapabilityId,
  type LocalAutomationOutreachDraft,
  type LocalCampaignWorklist,
  type LocalCampaignWorklistInput,
  type WebsiteContactExtractionResult,
  type WebsiteContactPerson,
} from '../crmAgentTools';

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
