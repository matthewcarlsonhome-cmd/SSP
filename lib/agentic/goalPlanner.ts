/**
 * Deterministic goal planner and dynamic DAG builder.
 *
 * This is the first non-LLM planner for open business goals. It uses the
 * ToolCapability registry to select ready capabilities, projects them into
 * AgenticStep nodes, validates the graph, and returns an inspectable plan
 * that can be persisted as agent_runs.plan.
 */

import type { AgenticDAG, AgenticStep, ExecutionPlan } from './types';
import type { DataSensitivity, TaskStakes } from './costing';
import { buildExecutionRounds } from './dagAdapter';
import { HAND_AUTHORED_DAGS, PPC_MASTER_WEEKLY_DAG } from './contracts/ppcMasterWeekly';
import {
  buildMemoryContextEnvelope,
  memoryFactsToKeyValue,
  rankMemoryFactsForGoal,
  type BusinessEntityType,
  type MemoryContextEnvelope,
  type MemoryFact,
} from './memory';
import {
  agenticStepFromCapability,
  capabilitiesForSourceSkill,
  capabilityRequiresApproval,
  getToolCapability,
  searchCapabilities,
  type RussellianAxiom,
  type ToolCapability,
  type ToolCapabilitySearchResult,
} from './toolRegistry';
import { routeDag } from './orchestrator';
import { canExecuteCrmCapability } from '../crmAgentTools';
import { canExecuteBusinessCapability } from './businessTools';
import { listEntityFacts, type PersistedEntityFact } from './supabaseClient';

export interface GoalContextEnvelope {
  userId?: string;
  audience?: 'internal' | 'team' | 'client' | 'leadership';
  deadline?: string;
  budgetCents?: number;
  entity?: {
    type: 'client' | 'account' | 'deal' | 'campaign' | 'project' | 'document' | 'person' | 'portfolio';
    id: string;
  };
  domainHints?: string[];
  dataSensitivity?: DataSensitivity;
  requireApprovalForSideEffects?: boolean;
  memoryFacts?: MemoryFact[];
  memory?: MemoryContextEnvelope;
}

export interface GoalIntake {
  goal: string;
  normalizedGoal: string;
  domainTags: string[];
  requestedOutputs: string[];
  stakes: TaskStakes;
  dataSensitivity: DataSensitivity;
  workflowHint?: string;
}

export interface GraphValidationIssue {
  stepId: string;
  message: string;
}

export interface GraphValidationResult {
  valid: boolean;
  errors: GraphValidationIssue[];
  warnings: GraphValidationIssue[];
}

export interface GoalPlan {
  intake: GoalIntake;
  dag: AgenticDAG;
  executionPlan: ExecutionPlan;
  selectedCapabilities: ToolCapability[];
  candidateCapabilities: ToolCapabilitySearchResult[];
  validation: {
    russellian: GraphValidationResult;
    wittgensteinian: GraphValidationResult;
  };
  memory: MemoryContextEnvelope;
  firstStepInput: Record<string, unknown>;
  trace: string[];
}

export interface GoalPlanInput {
  goal: string;
  context?: GoalContextEnvelope;
  maxCapabilities?: number;
}

export interface GoalPlanReadinessIssue {
  stepId?: string;
  capabilityId?: string;
  inputKey?: string;
  message: string;
}

export interface GoalPlanReadiness {
  ready: boolean;
  missingInputs: GoalPlanReadinessIssue[];
  blockingErrors: GoalPlanReadinessIssue[];
  warnings: GoalPlanReadinessIssue[];
  clarifyingQuestions: string[];
  suggestedUserInputs: Record<string, unknown>;
}

export interface GoalPlanRevision {
  plan: GoalPlan;
  readiness: GoalPlanReadiness;
  action: 'ready' | 'needs-input' | 'blocked';
  trace: string[];
}

export interface MemoryRetrievalForGoalInput {
  entity?: GoalContextEnvelope['entity'];
  goal: string;
  domainHints?: string[];
  facts?: MemoryFact[];
  limit?: number;
  now?: Date;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function containsAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function inferWorkflowHint(normalizedGoal: string, domainHints: string[]): string | undefined {
  const joined = `${normalizedGoal} ${domainHints.join(' ')}`;
  if (containsAny(joined, ['local prospect', 'local business', 'automation outreach', 'law firms', 'crm'])) {
    return 'crm-local-prospecting';
  }
  if (containsAny(joined, ['ppc', 'paid media', 'google ads', 'ads account', 'operating packet'])) {
    return 'ppc-master-weekly-workflow';
  }
  if (containsAny(joined, ['rfp', 'proposal response', 'compliance matrix'])) return 'rfp-response-center';
  if (containsAny(joined, ['sales', 'deal', 'account pursuit', 'discovery call'])) return 'sales-account-pursuit';
  if (containsAny(joined, ['churn', 'renewal', 'customer success', 'retention'])) return 'customer-churn-prevention';
  if (containsAny(joined, ['seo', 'geo', 'search optimization', 'onboarding'])) return 'seo-client-onboarding';
  if (containsAny(joined, ['marketing campaign', 'campaign launch', 'content calendar'])) return 'marketing-campaign';
  if (containsAny(joined, ['digital marketing audit', 'channel audit'])) return 'digital-marketing-audit';
  return undefined;
}

function inferDomains(normalizedGoal: string, domainHints: string[]): string[] {
  const domains = new Set(domainHints.map(normalize).filter(Boolean));
  const checks: Array<[string, string[]]> = [
    ['ppc', ['ppc', 'paid media', 'google ads']],
    ['rfp', ['rfp', 'proposal', 'compliance matrix']],
    ['sales', ['sales', 'deal', 'account pursuit']],
    ['customer success', ['customer success', 'churn', 'renewal', 'retention']],
    ['seo', ['seo', 'geo', 'search optimization']],
    ['marketing', ['marketing', 'campaign', 'content calendar']],
    ['local prospecting', ['local prospect', 'local business', 'law firms', 'automation outreach', 'crm']],
    ['executive communication', ['board', 'leadership', 'executive', 'ceo']],
  ];
  for (const [domain, words] of checks) {
    if (containsAny(normalizedGoal, words)) domains.add(domain);
  }
  if (domains.size === 0) domains.add('business operations');
  return Array.from(domains);
}

function inferOutputs(normalizedGoal: string): string[] {
  const outputs: string[] = [];
  if (containsAny(normalizedGoal, ['brief', 'memo', 'talking points'])) outputs.push('brief');
  if (containsAny(normalizedGoal, ['email'])) outputs.push('email');
  if (containsAny(normalizedGoal, ['deck', 'presentation', 'qbr'])) outputs.push('deck');
  if (containsAny(normalizedGoal, ['spreadsheet', 'model'])) outputs.push('spreadsheet');
  if (containsAny(normalizedGoal, ['dashboard'])) outputs.push('dashboard');
  if (containsAny(normalizedGoal, ['plan', 'roadmap', 'work plan'])) outputs.push('work_plan');
  if (outputs.length === 0) outputs.push('summary');
  return outputs;
}

function inferStakes(normalizedGoal: string, context?: GoalContextEnvelope): TaskStakes {
  if (context?.audience === 'leadership') return 'leadership';
  if (context?.audience === 'client') return 'client';
  if (containsAny(normalizedGoal, ['board', 'ceo', 'leadership', 'investor'])) return 'leadership';
  if (containsAny(normalizedGoal, ['client', 'customer', 'proposal', 'rfp'])) return 'client';
  return context?.audience === 'internal' ? 'internal' : 'team';
}

function inferLocalProspectingInputs(goal: string, intake: GoalIntake): Record<string, unknown> {
  if (intake.workflowHint !== 'crm-local-prospecting' && !intake.domainTags.includes('local prospecting')) {
    return {};
  }
  const trimmed = goal.replace(/\s+/g, ' ').trim();
  const countMatch = trimmed.match(/\b(?:find|lookup|identify|source)\s+(\d+)\b/i);
  const locationMatch = trimmed.match(/\b(?:around|near|in)\s+([A-Z][A-Za-z0-9\s.,'-]+?)(?=\s+(?:and|for|to|then)\b|[.!?]|$)/);
  const typeMatch = trimmed.match(/\b(?:find|lookup|identify|source)\s+(?:\d+\s+)?(?:local\s+)?(.+?)(?=\s+(?:around|near|in)\b|[.!?]|$)/i);
  const businessType = typeMatch?.[1]?.replace(/\b(local|nearby)\b/gi, '').trim();
  const inputs: Record<string, unknown> = {};
  if (businessType) inputs.businessType = businessType;
  if (locationMatch?.[1]) inputs.location = locationMatch[1].trim().replace(/,$/, '');
  if (countMatch?.[1]) inputs.maxResults = Number(countMatch[1]);
  return inputs;
}

export function parseGoalIntake(goal: string, context?: GoalContextEnvelope): GoalIntake {
  const normalizedGoal = normalize(goal);
  const domainHints = context?.domainHints ?? [];
  const stakes = inferStakes(normalizedGoal, context);
  return {
    goal,
    normalizedGoal,
    domainTags: inferDomains(normalizedGoal, domainHints),
    requestedOutputs: inferOutputs(normalizedGoal),
    stakes,
    dataSensitivity:
      context?.dataSensitivity ??
      (stakes === 'client' || stakes === 'leadership' ? 'client-confidential' : 'internal'),
    workflowHint: inferWorkflowHint(normalizedGoal, domainHints),
  };
}

function capabilityForStep(dag: AgenticDAG, step: AgenticStep): ToolCapability | undefined {
  return getToolCapability(`${dag.id}.${step.id}`) ?? capabilitiesForSourceSkill(step.skillId)[0];
}

function cloneTemplateDagWithCapabilities(dag: AgenticDAG): { dag: AgenticDAG; capabilities: ToolCapability[] } {
  const capabilities: ToolCapability[] = [];
  const steps = dag.steps.map((step) => {
    const capability = capabilityForStep(dag, step);
    if (capability) capabilities.push(capability);
    return {
      ...step,
      capabilityId: capability?.id ?? step.capabilityId,
    };
  });
  return {
    dag: {
      ...dag,
      steps,
      derivedFrom: dag.derivedFrom ?? {
        workflowId: dag.id,
        inferenceNotes: ['Selected by deterministic goal planner from workflow/domain hint.'],
      },
    },
    capabilities,
  };
}

function buildRfpDag(): { dag: AgenticDAG; capabilities: ToolCapability[] } {
  const ids = [
    'rfp-response-center.step-rfp-analysis',
    'rfp-response-center.step-compliance-matrix',
    'rfp-response-center.step-response-section',
    'rfp-response-center.step-executive-summary',
  ];
  const capabilities = ids.map((id) => getToolCapability(id)).filter(Boolean) as ToolCapability[];
  const steps: AgenticStep[] = capabilities.map((capability, index) => {
    const dependsOn =
      index === 0 ? [] :
      index === 1 ? ['goal-step-1-rfp-analysis'] :
      index === 2 ? ['goal-step-1-rfp-analysis', 'goal-step-2-compliance-matrix'] :
      ['goal-step-1-rfp-analysis', 'goal-step-3-response-section'];
    return {
      ...agenticStepFromCapability(capability, index, dependsOn),
      id:
        index === 0 ? 'goal-step-1-rfp-analysis' :
        index === 1 ? 'goal-step-2-compliance-matrix' :
        index === 2 ? 'goal-step-3-response-section' :
        'goal-step-4-executive-summary',
    };
  });
  return {
    dag: {
      id: 'goal-rfp-response-center',
      name: 'Goal Plan: RFP Response Center',
      description: 'Dynamically assembled RFP response DAG from tool capabilities.',
      steps,
      derivedFrom: {
        workflowId: 'rfp-response-center',
        inferenceNotes: ['Assembled from RFP ToolCapability descriptors.'],
      },
    },
    capabilities,
  };
}

function buildGenericDag(candidates: ToolCapabilitySearchResult[], maxCapabilities: number): { dag: AgenticDAG; capabilities: ToolCapability[] } {
  const capabilities = candidates
    .map((candidate) => candidate.capability)
    .filter((capability) =>
      Boolean(capability.sourceSkillId) ||
      canExecuteCrmCapability(capability.id) ||
      canExecuteBusinessCapability(capability.id)
    )
    .slice(0, maxCapabilities);

  const steps: AgenticStep[] = [];
  capabilities.forEach((capability, index) => {
    const dependsOn = index === 0 ? [] : [steps[index - 1].id];
    steps.push(agenticStepFromCapability(capability, index, dependsOn));
  });

  return {
    dag: {
      id: 'goal-dynamic-capability-plan',
      name: 'Goal Plan: Dynamic Capability Plan',
      description: 'Dynamically assembled plan from capability search results.',
      steps,
      derivedFrom: {
        workflowId: 'dynamic-goal',
        inferenceNotes: ['No exact workflow hint matched; selected top executable capabilities by search score.'],
      },
    },
    capabilities,
  };
}

function hasAxiom(capability: ToolCapability | undefined, axiom: RussellianAxiom): boolean {
  return Boolean(capability?.safety.axioms.includes(axiom));
}

export function validateRussellianGraph(
  dag: AgenticDAG,
  capabilities: ToolCapability[],
): GraphValidationResult {
  const byId = new Map(capabilities.map((capability) => [capability.id, capability]));
  const byStep = new Map<string, ToolCapability | undefined>(
    dag.steps.map((step) => [step.id, step.capabilityId ? byId.get(step.capabilityId) : capabilityForStep(dag, step)]),
  );
  const errors: GraphValidationIssue[] = [];
  const warnings: GraphValidationIssue[] = [];

  for (const step of dag.steps) {
    const current = byStep.get(step.id);
    if (!current) {
      warnings.push({ stepId: step.id, message: 'No ToolCapability metadata found for step.' });
      continue;
    }
    if (capabilityRequiresApproval(current)) {
      warnings.push({ stepId: step.id, message: 'Capability has side effects and requires policy/approval before execution.' });
    }

    for (const predecessorId of step.dependsOn) {
      const predecessor = byStep.get(predecessorId);
      if (hasAxiom(predecessor, 'GENERATE') && hasAxiom(current, 'WRITE') && !hasAxiom(current, 'VALIDATE')) {
        errors.push({
          stepId: step.id,
          message: `Invalid Russellian chain: ${predecessorId} GENERATE feeds ${step.id} WRITE without VALIDATE.`,
        });
      }
      if (hasAxiom(predecessor, 'READ') && hasAxiom(current, 'WRITE') && !hasAxiom(current, 'TRANSFORM') && !hasAxiom(current, 'VALIDATE')) {
        errors.push({
          stepId: step.id,
          message: `Invalid Russellian chain: ${predecessorId} READ feeds ${step.id} WRITE without TRANSFORM or VALIDATE.`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateWittgensteinianFit(
  intake: GoalIntake,
  capabilities: ToolCapability[],
): GraphValidationResult {
  const warnings: GraphValidationIssue[] = [];
  const goalTerms = new Set(intake.domainTags.map(normalize));

  for (const capability of capabilities) {
    const contextualTerms = [
      ...capability.businessDomains,
      ...capability.languageGames,
      ...capability.familyClusters,
      capability.formOfLife,
    ].map(normalize);
    const hasFit = contextualTerms.some((term) => {
      if (goalTerms.has(term)) return true;
      return Array.from(goalTerms).some((goalTerm) => term.includes(goalTerm) || goalTerm.includes(term));
    });
    if (!hasFit) {
      warnings.push({
        stepId: capability.id,
        message: 'Capability has weak contextual overlap with the inferred goal domain.',
      });
    }
  }

  return { valid: true, errors: [], warnings };
}

function executionPlanForDag(dag: AgenticDAG, trace: string[]): ExecutionPlan {
  const rounds = buildExecutionRounds(dag);
  let estimatedCostCents: number | undefined;
  try {
    estimatedCostCents = routeDag(dag).totalEstimatedCostCents;
  } catch {
    estimatedCostCents = undefined;
  }
  return {
    strategy: 'agentic',
    rounds,
    skipped: [],
    reasoning: trace.join('\n'),
    estimatedCostCents,
  };
}

export function buildGoalPlan(input: GoalPlanInput): GoalPlan {
  const intake = parseGoalIntake(input.goal, input.context);
  const memory =
    input.context?.memory ??
    buildMemoryContextEnvelope({
      focusEntity: input.context?.entity,
      facts: input.context?.memoryFacts ?? [],
    });
  const trace: string[] = [
    `parsed goal: ${intake.normalizedGoal}`,
    `domains: ${intake.domainTags.join(', ')}`,
    `stakes: ${intake.stakes}`,
    `memory: ${memory.summary}`,
  ];

  const candidates = searchCapabilities({
    goal: input.goal,
    businessDomains: intake.domainTags,
    sideEffectSafety: input.context?.requireApprovalForSideEffects ? 'allow-approved' : 'read-only',
    requireExecutable: false,
    limit: 20,
  });
  trace.push(`candidate capabilities: ${candidates.length}`);

  let built: { dag: AgenticDAG; capabilities: ToolCapability[] };
  if (intake.workflowHint === 'rfp-response-center') {
    built = buildRfpDag();
    trace.push('selected RFP dynamic DAG from capability descriptors');
  } else if (intake.workflowHint && HAND_AUTHORED_DAGS[intake.workflowHint]) {
    built = cloneTemplateDagWithCapabilities(HAND_AUTHORED_DAGS[intake.workflowHint]);
    trace.push(`selected hand-authored DAG: ${intake.workflowHint}`);
  } else if (containsAny(intake.normalizedGoal, ['weekly ppc operating packet', 'ppc operating packet'])) {
    built = cloneTemplateDagWithCapabilities(PPC_MASTER_WEEKLY_DAG);
    trace.push('selected PPC Master Weekly fallback DAG');
  } else {
    built = buildGenericDag(candidates, input.maxCapabilities ?? 4);
    trace.push(`selected generic capability DAG with ${built.capabilities.length} executable capabilities`);
  }

  const russellian = validateRussellianGraph(built.dag, built.capabilities);
  const wittgensteinian = validateWittgensteinianFit(intake, built.capabilities);
  trace.push(`russellian validation: ${russellian.valid ? 'valid' : 'invalid'}`);
  trace.push(`wittgensteinian warnings: ${wittgensteinian.warnings.length}`);

  const executionPlan = executionPlanForDag(built.dag, trace);
  const inferredInputs = inferLocalProspectingInputs(input.goal, intake);
  if (Object.keys(inferredInputs).length > 0) {
    trace.push(`inferred goal inputs: ${Object.keys(inferredInputs).join(', ')}`);
  }
  return {
    intake,
    dag: built.dag,
    executionPlan,
    selectedCapabilities: built.capabilities,
    candidateCapabilities: candidates,
    validation: { russellian, wittgensteinian },
    memory,
    firstStepInput: {
      goal: input.goal,
      goalContext: input.context ?? {},
      memorySummary: memory.summary,
      memoryKeys: memoryFactsToKeyValue(memory.facts),
      ...inferredInputs,
    },
    trace,
  };
}

export const planGoal = buildGoalPlan;

function requiredKeys(schema: Record<string, unknown> | undefined): string[] {
  const required = schema?.required;
  return Array.isArray(required) ? required.filter((key): key is string => typeof key === 'string') : [];
}

function hasValue(values: Record<string, unknown>, key: string): boolean {
  const value = values[key];
  return value !== undefined && value !== null && value !== '';
}

export function inspectGoalPlanReadiness(
  plan: GoalPlan,
  userInputs: Record<string, unknown> = {},
): GoalPlanReadiness {
  const supplied = {
    ...plan.firstStepInput,
    ...userInputs,
  };
  const available = new Set(Object.keys(supplied).filter((key) => hasValue(supplied, key)));
  const capabilitiesById = new Map(plan.selectedCapabilities.map((capability) => [capability.id, capability]));
  const missingInputs: GoalPlanReadinessIssue[] = [];
  const blockingErrors: GoalPlanReadinessIssue[] = plan.validation.russellian.errors.map((issue) => ({
    stepId: issue.stepId,
    message: issue.message,
  }));
  const warnings: GoalPlanReadinessIssue[] = [
    ...plan.validation.russellian.warnings.map((issue) => ({ stepId: issue.stepId, message: issue.message })),
    ...plan.validation.wittgensteinian.warnings.map((issue) => ({ stepId: issue.stepId, message: issue.message })),
  ];

  for (const round of plan.executionPlan.rounds) {
    for (const stepId of round.stepIds) {
      const step = plan.dag.steps.find((candidate) => candidate.id === stepId);
      if (!step) continue;
      const capability = step.capabilityId ? capabilitiesById.get(step.capabilityId) : capabilityForStep(plan.dag, step);
      const requirements = requiredKeys(capability?.inputSchema);
      for (const key of requirements) {
        if (available.has(key)) continue;
        const contextProvidesKey = step.contextRequirements?.some((req) => req.fields.includes(key));
        if (contextProvidesKey) continue;
        const issue = {
          stepId: step.id,
          capabilityId: capability?.id,
          inputKey: key,
          message: `Missing required input "${key}" for ${capability?.name ?? step.name}.`,
        };
        if (step.dependsOn.length === 0) {
          missingInputs.push(issue);
        } else {
          warnings.push({
            ...issue,
            message: `${issue.message} It may need an explicit mapping from an upstream step.`,
          });
        }
      }
      for (const field of step.outputContract?.fields ?? []) {
        available.add(field.key);
      }
    }
  }

  if (plan.dag.steps.length === 0) {
    blockingErrors.push({ message: 'Planner produced no executable steps.' });
  }

  if (
    plan.intake.workflowHint === 'ppc-master-weekly-workflow' &&
    !hasValue(supplied, 'accountExport') &&
    !hasValue(supplied, 'accountSnapshot') &&
    !plan.memory.focusEntity
  ) {
    missingInputs.push({
      inputKey: 'accountExport',
      message: 'Weekly PPC operating packets need an account export, account snapshot, or selected account/client entity.',
    });
  }

  const clarifyingQuestions = missingInputs.map((issue) => {
    if (issue.inputKey === 'businessType') return 'What business type should the local prospecting lookup target?';
    if (issue.inputKey === 'location') return 'What city, region, or service area should the lookup use?';
    if (issue.inputKey === 'rfpContent') return 'Paste or attach the RFP content to analyze.';
    if (issue.inputKey === 'accountExport') return 'Which account export, client entity, or account snapshot should the PPC packet use?';
    return `What value should the agent use for "${issue.inputKey}"?`;
  });

  return {
    ready: blockingErrors.length === 0 && missingInputs.length === 0,
    missingInputs,
    blockingErrors,
    warnings,
    clarifyingQuestions: Array.from(new Set(clarifyingQuestions)),
    suggestedUserInputs: plan.firstStepInput,
  };
}

export function reviseGoalPlan(
  plan: GoalPlan,
  userInputs: Record<string, unknown> = {},
): GoalPlanRevision {
  const mergedInputs = { ...plan.firstStepInput, ...userInputs };
  const revisedPlan: GoalPlan = {
    ...plan,
    firstStepInput: mergedInputs,
    trace: [
      ...plan.trace,
      `readiness revision: merged ${Object.keys(userInputs).length} user-provided input(s) into first-step envelope`,
    ],
  };
  const readiness = inspectGoalPlanReadiness(revisedPlan, mergedInputs);
  return {
    plan: revisedPlan,
    readiness,
    action: readiness.blockingErrors.length > 0
      ? 'blocked'
      : readiness.missingInputs.length > 0
        ? 'needs-input'
        : 'ready',
    trace: revisedPlan.trace,
  };
}

function persistedFactToMemoryFact(row: PersistedEntityFact): MemoryFact {
  return {
    entity: {
      type: row.entity_type as BusinessEntityType,
      id: row.entity_id,
    },
    key: row.key,
    value: row.value,
    confidence: row.confidence ?? 0.5,
    sourceRunId: row.source_run_id,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
  };
}

export async function retrieveMemoryForGoal(
  input: MemoryRetrievalForGoalInput,
): Promise<MemoryContextEnvelope> {
  const sourceFacts =
    input.facts ??
    (input.entity
      ? (await listEntityFacts(input.entity.type, input.entity.id)).map(persistedFactToMemoryFact)
      : []);
  const ranked = rankMemoryFactsForGoal({
    facts: sourceFacts,
    goal: input.goal,
    domainHints: input.domainHints,
    focusEntity: input.entity,
    now: input.now,
    limit: input.limit ?? 25,
  }).map((scored) => scored.fact);
  return buildMemoryContextEnvelope({
    focusEntity: input.entity,
    facts: ranked,
    now: input.now,
    maxFacts: input.limit ?? 25,
  });
}
