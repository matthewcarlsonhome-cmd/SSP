/**
 * Tool capability registry.
 *
 * A ToolCapability is the agent-facing view of useful work. Existing skills
 * remain the human-facing product surface; capabilities expose the smaller,
 * typed, searchable contracts that a goal planner can compose.
 */

import type { DbExecutableSkill, DbSkillMetadata } from '../skillLibrary/dbLoader';
import type { LibrarySkill } from '../skillLibrary/types';
import type {
  ContextRequirement,
  OutputContract,
  OutputField,
  AgenticDAG,
  AgenticStep,
} from './types';
import type {
  DataSensitivity,
  ModelTierKey,
  Provider,
  TaskClassification,
  TaskComplexity,
  TaskKind,
  TaskStakes,
} from './costing';
import { estimateTokens } from './costing';
import { HAND_AUTHORED_DAGS } from './contracts/ppcMasterWeekly';
import { classifyStep } from './taskClassifier';
import { canExecuteCrmCapability } from '../crmAgentTools';
import { canExecuteBusinessCapability } from './businessTools';

export type RussellianAxiom = 'READ' | 'TRANSFORM' | 'WRITE' | 'DECIDE' | 'GENERATE' | 'WAIT' | 'VALIDATE';

export type ToolSideEffect =
  | 'none'
  | 'external-read'
  | 'email'
  | 'database-write'
  | 'external-api-write'
  | 'ad-account-write'
  | 'calendar-write'
  | 'document-write';

export type ToolExecutionMode = 'skill' | 'internal' | 'renderer' | 'connector' | 'workflow';

export interface ToolCapability {
  id: string;
  sourceSkillId?: string;
  name: string;
  description: string;
  executionMode: ToolExecutionMode;
  status: 'ready' | 'planned' | 'connector-required';

  goalVerbs: string[];
  businessDomains: string[];
  languageGames: string[];
  familyClusters: string[];
  formOfLife: string;

  inputSchema: Record<string, unknown>;
  outputContract: OutputContract;
  contextRequirements?: ContextRequirement[];

  task: {
    kind: TaskKind;
    complexity: TaskComplexity;
    defaultStakes: TaskStakes;
    reversible: boolean;
    isIntermediateDefault: boolean;
  };

  routing: {
    minTier: ModelTierKey;
    preferredTier?: ModelTierKey;
    maxTier?: ModelTierKey;
    allowedProviders?: Provider[];
    requiresJson?: boolean;
    requiresToolCalling?: boolean;
    dataSensitivity: DataSensitivity;
  };

  safety: {
    axioms: RussellianAxiom[];
    typeLevel: number;
    sideEffects: ToolSideEffect[];
    approvalRequired: boolean;
  };

  economics: {
    typicalInputTokens: number;
    typicalOutputTokens: number;
    typicalLatencyMs?: number;
  };

  examples: Array<{
    goal: string;
    inputs: Record<string, unknown>;
    expectedOutputs: string[];
  }>;
}

export interface ToolCapabilitySearchQuery {
  goal?: string;
  goalVerbs?: string[];
  businessDomains?: string[];
  languageGames?: string[];
  familyClusters?: string[];
  outputFields?: string[];
  sideEffectSafety?: 'read-only' | 'allow-approved' | 'allow-any';
  provider?: Provider;
  minTier?: ModelTierKey;
  maxTier?: ModelTierKey;
  requireExecutable?: boolean;
  limit?: number;
}

export interface ToolCapabilitySearchResult {
  capability: ToolCapability;
  score: number;
  reasons: string[];
}

export interface CapabilityCoverageRow {
  skillId: string;
  capabilityId?: string;
  capabilityExists: boolean;
  outputContractExists: boolean;
  russellianAxiomsPresent: boolean;
  wittgensteinianLanguageGamesPresent: boolean;
  defaultModelTier?: ModelTierKey;
  sideEffectsDeclared: boolean;
  examplesPresent: boolean;
  status: ToolCapability['status'] | 'missing';
  readinessScore: number;
  missingFields: string[];
  recommendedAction: string;
}

export interface CapabilityCoverageFilter {
  search?: string;
  status?: CapabilityCoverageRow['status'] | 'all';
  missing?: 'capability' | 'output-contract' | 'axioms' | 'language-games' | 'side-effects' | 'examples' | 'all';
}

export interface CapabilityRoadmapFamilyStatus {
  familyCluster: string;
  label: string;
  expectedCapabilityIds: string[];
  registeredCount: number;
  readyCount: number;
  plannedCount: number;
  missingCapabilityIds: string[];
}

const TIER_ORDER: ModelTierKey[] = ['fast', 'balanced', 'smart', 'reasoning'];

function tierIndex(tier: ModelTierKey): number {
  return TIER_ORDER.indexOf(tier);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(value: string | undefined): string[] {
  if (!value) return [];
  return normalize(value).split(/\s+/).filter(Boolean);
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean).map((v) => normalize(v)).filter(Boolean)));
}

function outputField(key: string, description: string, format: OutputField['format'] = 'text'): OutputField {
  return { key, description, format, required: true };
}

function objectSchema(
  properties: Record<string, string>,
  required: string[] = [],
): Record<string, unknown> {
  return {
    type: 'object',
    properties: Object.fromEntries(
      Object.entries(properties).map(([key, description]) => [key, { type: 'string', description }]),
    ),
    required,
  };
}

function defaultInputSchema(inputs: Array<{ id: string; label?: string; type?: string; validation?: { required?: boolean } }> = []): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const input of inputs) {
    const type =
      input.type === 'number' ? 'number' :
      input.type === 'checkbox' ? 'boolean' :
      'string';
    properties[input.id] = { type, description: input.label ?? input.id };
    if (input.validation?.required) required.push(input.id);
  }
  return { type: 'object', properties, required };
}

function outputContractFromBenefits(benefits: string[] | null | undefined, fallback = 'summary'): OutputContract {
  const fields =
    benefits && benefits.length > 0
      ? benefits.slice(0, 6).map((benefit, index) =>
          outputField(`output_${index + 1}`, benefit, benefit.toLowerCase().includes('table') ? 'table' : 'text'),
        )
      : [outputField(fallback, 'Primary structured output from the capability.')];
  return { fields };
}

function kindFromCategory(category: string | null | undefined): TaskKind {
  switch (category) {
    case 'generation':
    case 'communication':
      return 'generation';
    case 'automation':
      return 'transformation';
    case 'optimization':
      return 'reasoning';
    case 'research':
      return 'analysis';
    case 'analysis':
    default:
      return 'analysis';
  }
}

function complexityFromLevel(level: string | null | undefined): TaskComplexity {
  if (level === 'advanced') return 'strategic';
  if (level === 'intermediate') return 'complex';
  return 'routine';
}

function languageGameFromKind(kind: TaskKind): string {
  if (kind === 'generation' || kind === 'creative' || kind === 'synthesis') return 'generation';
  if (kind === 'reasoning') return 'optimization';
  if (kind === 'extraction' || kind === 'classification') return 'analysis';
  return 'analysis';
}

function defaultAxioms(kind: TaskKind, hasExternalRead = false): RussellianAxiom[] {
  const axioms = new Set<RussellianAxiom>();
  if (hasExternalRead || kind === 'analysis' || kind === 'extraction' || kind === 'classification') {
    axioms.add('READ');
  }
  if (kind === 'generation' || kind === 'synthesis' || kind === 'creative') {
    axioms.add('READ');
    axioms.add('GENERATE');
    axioms.add('VALIDATE');
  }
  if (kind === 'reasoning') {
    axioms.add('READ');
    axioms.add('DECIDE');
  }
  if (kind === 'evaluation') {
    axioms.add('READ');
    axioms.add('VALIDATE');
  }
  axioms.add('TRANSFORM');
  return Array.from(axioms);
}

function typeLevelForAxioms(axioms: RussellianAxiom[]): number {
  if (axioms.includes('WRITE')) return 2;
  if (axioms.includes('READ') || axioms.includes('GENERATE') || axioms.includes('DECIDE')) return 1;
  return 0;
}

function routeDefaults(kind: TaskKind, complexity: TaskComplexity, stakes: TaskStakes): ToolCapability['routing'] {
  const minTier: ModelTierKey =
    kind === 'reasoning' && complexity === 'strategic' ? 'smart' :
    (kind === 'generation' || kind === 'synthesis') && (stakes === 'client' || stakes === 'leadership') ? 'balanced' :
    'fast';
  return {
    minTier,
    preferredTier: complexity === 'strategic' ? 'smart' : complexity === 'complex' ? 'balanced' : undefined,
    requiresJson: true,
    dataSensitivity: stakes === 'client' || stakes === 'leadership' ? 'client-confidential' : 'internal',
  };
}

function classificationFromCapability(capability: ToolCapability): TaskClassification {
  return {
    complexity: capability.task.complexity,
    kind: capability.task.kind,
    stakes: capability.task.defaultStakes,
    reversible: capability.task.reversible,
    estimatedInputTokens: capability.economics.typicalInputTokens,
    estimatedOutputTokens: capability.economics.typicalOutputTokens,
    isIntermediate: capability.task.isIntermediateDefault,
    minTier: capability.routing.minTier,
    maxTier: capability.routing.maxTier,
    preferredTier: capability.routing.preferredTier,
    allowedProviders: capability.routing.allowedProviders,
    requiresJson: capability.routing.requiresJson,
    requiresToolCalling: capability.routing.requiresToolCalling,
    dataSensitivity: capability.routing.dataSensitivity,
  };
}

export function taskClassificationFromCapability(capability: ToolCapability): TaskClassification {
  return classificationFromCapability(capability);
}

export function capabilityRequiresApproval(capability: ToolCapability): boolean {
  if (capability.safety.approvalRequired) return true;
  return capability.safety.sideEffects.some((effect) => effect !== 'none' && effect !== 'external-read');
}

export function isSkillExecutableCapability(capability: ToolCapability): boolean {
  return (
    (capability.executionMode === 'skill' && Boolean(capability.sourceSkillId)) ||
    canExecuteCrmCapability(capability.id) ||
    canExecuteBusinessCapability(capability.id)
  );
}

export function capabilityFromLibrarySkill(skill: LibrarySkill): ToolCapability {
  const kind = kindFromCategory(skill.tags.category);
  const complexity = complexityFromLevel(skill.tags.level);
  const stakes: TaskStakes = skill.tags.useCases.includes('daily-work') ? 'team' : 'internal';
  const axioms = defaultAxioms(kind, skill.config.useWebSearch);
  const description = skill.longDescription ?? skill.description;

  return {
    id: `skill.${skill.id}`,
    sourceSkillId: skill.id,
    name: skill.name,
    description,
    executionMode: 'skill',
    status: 'ready',
    goalVerbs: inferGoalVerbs(`${skill.name} ${description} ${skill.tags.category}`),
    businessDomains: uniq([
      skill.tags.category,
      ...skill.tags.roles,
      ...skill.tags.useCases,
      ...(skill.tags.custom ?? []),
    ]),
    languageGames: [languageGameFromKind(kind)],
    familyClusters: uniq([skill.tags.category, ...skill.tags.useCases]),
    formOfLife: skill.tags.useCases[0] ?? 'business-operations',
    inputSchema: defaultInputSchema(skill.inputs),
    outputContract: outputContractFromBenefits(skill.whatYouGet, skill.prompts.outputFormat === 'table' ? 'table' : 'summary'),
    task: {
      kind,
      complexity,
      defaultStakes: stakes,
      reversible: true,
      isIntermediateDefault: kind !== 'generation',
    },
    routing: {
      ...routeDefaults(kind, complexity, stakes),
      allowedProviders:
        skill.config.recommendedModel === 'claude' ? ['claude'] :
        skill.config.recommendedModel === 'gemini' ? ['gemini'] :
        undefined,
    },
    safety: {
      axioms,
      typeLevel: typeLevelForAxioms(axioms),
      sideEffects: skill.config.useWebSearch ? ['external-read'] : ['none'],
      approvalRequired: false,
    },
    economics: {
      typicalInputTokens: Math.max(
        1000,
        estimateTokens(skill.prompts.systemInstruction) + estimateTokens(skill.prompts.userPromptTemplate),
      ),
      typicalOutputTokens: skill.config.maxTokens || 1500,
    },
    examples: [
      {
        goal: `Use ${skill.name} for ${skill.tags.category} work.`,
        inputs: {},
        expectedOutputs: skill.whatYouGet ?? ['Structured skill output'],
      },
    ],
  };
}

export function capabilityFromDbSkill(skill: DbSkillMetadata | DbExecutableSkill): ToolCapability {
  const kind = kindFromCategory(skill.category);
  const complexity = complexityFromLevel(skill.level);
  const stakes: TaskStakes = skill.use_cases?.includes('daily-work') ? 'team' : 'internal';
  const promptText =
    'current_system_instruction' in skill
      ? `${skill.current_system_instruction} ${skill.current_user_prompt_template}`
      : `${skill.name} ${skill.description ?? ''}`;
  const axioms = (skill.axioms && skill.axioms.length > 0 ? skill.axioms : defaultAxioms(kind, Boolean(skill.use_web_search))) as RussellianAxiom[];

  return {
    id: `db.${skill.id}`,
    sourceSkillId: skill.id,
    name: skill.name,
    description: skill.long_description ?? skill.description ?? skill.name,
    executionMode: 'skill',
    status: 'ready',
    goalVerbs: inferGoalVerbs(`${skill.name} ${skill.description ?? ''} ${skill.category ?? ''}`),
    businessDomains: uniq([
      skill.category ?? '',
      ...(skill.roles ?? []),
      ...(skill.use_cases ?? []),
      ...(skill.custom_tags ?? []),
    ]),
    languageGames: skill.language_games ?? [languageGameFromKind(kind)],
    familyClusters: skill.family_clusters ?? uniq([skill.category ?? '', ...(skill.use_cases ?? [])]),
    formOfLife: skill.form_of_life ?? skill.use_cases?.[0] ?? 'business-operations',
    inputSchema: defaultInputSchema(skill.inputs ?? []),
    outputContract: outputContractFromBenefits(skill.what_you_get, skill.output_format === 'table' ? 'table' : 'summary'),
    task: {
      kind,
      complexity,
      defaultStakes: stakes,
      reversible: true,
      isIntermediateDefault: kind !== 'generation',
    },
    routing: {
      ...routeDefaults(kind, complexity, stakes),
      allowedProviders:
        skill.recommended_model === 'claude' ? ['claude'] :
        skill.recommended_model === 'gemini' ? ['gemini'] :
        undefined,
    },
    safety: {
      axioms,
      typeLevel: skill.type_level ?? typeLevelForAxioms(axioms),
      sideEffects: skill.use_web_search ? ['external-read'] : ['none'],
      approvalRequired: false,
    },
    economics: {
      typicalInputTokens: Math.max(1000, estimateTokens(promptText)),
      typicalOutputTokens: 'max_tokens' in skill && skill.max_tokens ? skill.max_tokens : 1500,
    },
    examples: [
      {
        goal: `Use ${skill.name} when the goal matches ${skill.category ?? 'business'} work.`,
        inputs: {},
        expectedOutputs: skill.what_you_get ?? ['Structured skill output'],
      },
    ],
  };
}

interface DagFamilyMeta {
  domains: string[];
  languageGames: string[];
  familyClusters: string[];
  formOfLife: string;
  goalHints: string[];
}

const DAG_FAMILY_META: Record<string, DagFamilyMeta> = {
  'ppc-master-weekly-workflow': {
    domains: ['ppc', 'paid media', 'google ads', 'agency operations', 'client reporting'],
    languageGames: ['analysis', 'optimization', 'generation'],
    familyClusters: ['ppc-operations', 'weekly-operating-cadence', 'client-deliverables'],
    formOfLife: 'agency-operations',
    goalHints: ['weekly ppc operating packet', 'paid media triage', 'google ads account review'],
  },
  'sales-account-pursuit': {
    domains: ['sales', 'account pursuit', 'enterprise sales', 'deal strategy'],
    languageGames: ['research', 'analysis', 'generation'],
    familyClusters: ['sales-pursuit', 'account-intelligence', 'proposal-generation'],
    formOfLife: 'revenue-operations',
    goalHints: ['sales account pursuit', 'deal strategy', 'enterprise proposal'],
  },
  'customer-churn-prevention': {
    domains: ['customer success', 'churn', 'renewal', 'retention'],
    languageGames: ['analysis', 'optimization', 'generation'],
    familyClusters: ['customer-success', 'risk-triage', 'retention-playbooks'],
    formOfLife: 'customer-operations',
    goalHints: ['churn prevention', 'renewal risk', 'customer intervention'],
  },
  'seo-client-onboarding': {
    domains: ['seo', 'geo', 'client onboarding', 'content strategy'],
    languageGames: ['analysis', 'research', 'optimization'],
    familyClusters: ['seo-operations', 'client-onboarding', 'content-briefs'],
    formOfLife: 'marketing-operations',
    goalHints: ['seo onboarding', 'geo onboarding', 'technical seo audit'],
  },
  'marketing-campaign': {
    domains: ['marketing', 'campaign launch', 'content operations', 'paid media'],
    languageGames: ['research', 'generation', 'optimization'],
    familyClusters: ['campaign-launch', 'marketing-operations', 'content-production'],
    formOfLife: 'marketing-operations',
    goalHints: ['marketing campaign launch', 'campaign strategy', 'content calendar'],
  },
  'digital-marketing-audit': {
    domains: ['marketing', 'digital audit', 'seo', 'paid media', 'social media'],
    languageGames: ['analysis', 'optimization'],
    familyClusters: ['digital-marketing-audit', 'channel-audit', 'recommendations'],
    formOfLife: 'marketing-operations',
    goalHints: ['digital marketing audit', 'channel audit', 'marketing recommendations'],
  },
};

function inferGoalVerbs(text: string): string[] {
  const haystack = normalize(text);
  const verbs: string[] = [];
  const checks: Array<[string, string[]]> = [
    ['extract', ['extract', 'parse', 'intake']],
    ['classify', ['classify', 'score', 'prioritize', 'rank', 'triage']],
    ['research', ['research', 'intelligence', 'market', 'competitor']],
    ['analyze', ['analyze', 'analysis', 'audit', 'assess', 'review']],
    ['summarize', ['summarize', 'summary', 'brief', 'digest']],
    ['build', ['build', 'create', 'generate', 'produce']],
    ['draft', ['draft', 'write', 'email', 'proposal', 'narrative']],
    ['plan', ['plan', 'strategy', 'roadmap', 'calendar']],
    ['validate', ['validate', 'evaluate', 'check', 'compliance']],
  ];
  for (const [verb, words] of checks) {
    if (words.some((word) => haystack.includes(word))) verbs.push(verb);
  }
  return verbs.length > 0 ? uniq(verbs) : ['analyze'];
}

function capabilityFromAgenticStep(dag: AgenticDAG, step: AgenticStep, meta: DagFamilyMeta): ToolCapability {
  const classification = classifyStep({ step, dag });
  const axioms = defaultAxioms(classification.kind, true);
  const outputNames = step.outputContract?.fields.map((f) => f.description) ?? ['Structured step output'];
  const isLeaf = !dag.steps.some((s) => s.dependsOn.includes(step.id));

  return {
    id: `${dag.id}.${step.id}`,
    sourceSkillId: step.skillId,
    name: step.name,
    description: step.description ?? `${step.name} for ${dag.name}.`,
    executionMode: 'skill',
    status: 'ready',
    goalVerbs: uniq([...inferGoalVerbs(`${step.name} ${step.description ?? ''}`), ...tokens(meta.goalHints.join(' '))]),
    businessDomains: meta.domains,
    languageGames: uniq([...meta.languageGames, languageGameFromKind(classification.kind)]),
    familyClusters: meta.familyClusters,
    formOfLife: meta.formOfLife,
    inputSchema: { type: 'object', properties: {}, required: [] },
    outputContract: step.outputContract ?? { fields: [outputField('summary', 'Structured summary')] },
    contextRequirements: step.contextRequirements,
    task: {
      kind: classification.kind,
      complexity: classification.complexity,
      defaultStakes: classification.stakes,
      reversible: classification.reversible,
      isIntermediateDefault: !isLeaf,
    },
    routing: {
      minTier: classification.minTier ?? routeDefaults(classification.kind, classification.complexity, classification.stakes).minTier,
      preferredTier: classification.preferredTier,
      maxTier: classification.maxTier,
      allowedProviders: classification.allowedProviders,
      requiresJson: true,
      requiresToolCalling: classification.requiresToolCalling,
      dataSensitivity: classification.dataSensitivity ?? 'internal',
    },
    safety: {
      axioms,
      typeLevel: typeLevelForAxioms(axioms),
      sideEffects: ['none'],
      approvalRequired: false,
    },
    economics: {
      typicalInputTokens: classification.estimatedInputTokens,
      typicalOutputTokens: classification.estimatedOutputTokens,
    },
    examples: [
      {
        goal: meta.goalHints[0] ?? dag.name,
        inputs: {},
        expectedOutputs: outputNames,
      },
    ],
  };
}

function buildDagCapabilities(): ToolCapability[] {
  const capabilities: ToolCapability[] = [];
  for (const dag of Object.values(HAND_AUTHORED_DAGS)) {
    const meta = DAG_FAMILY_META[dag.id];
    if (!meta) continue;
    for (const step of dag.steps) {
      capabilities.push(capabilityFromAgenticStep(dag, step, meta));
    }
  }
  return capabilities;
}

const RFP_CAPABILITIES: ToolCapability[] = [
  {
    id: 'rfp-response-center.step-rfp-analysis',
    sourceSkillId: 'business-analyst-rfp-requirements-analyzer',
    name: 'Analyze RFP Requirements',
    description: 'Parse RFP requirements, assess compliance, and produce a go/no-go recommendation.',
    executionMode: 'skill',
    status: 'ready',
    goalVerbs: ['analyze', 'classify', 'validate'],
    businessDomains: ['rfp', 'proposal', 'compliance', 'business development'],
    languageGames: ['analysis', 'research'],
    familyClusters: ['rfp-response', 'compliance-matrix', 'proposal-generation'],
    formOfLife: 'business-development',
    inputSchema: defaultInputSchema([
      { id: 'rfpContent', label: 'RFP content', type: 'textarea', validation: { required: true } },
      { id: 'companyCapabilities', label: 'Company capabilities', type: 'textarea' },
    ]),
    outputContract: { fields: [
      outputField('requirements_summary', 'Requirements summary'),
      outputField('go_no_go', 'Go/no-go recommendation'),
      outputField('risks', 'Key pursuit risks', 'markdown-list'),
    ] },
    task: { kind: 'analysis', complexity: 'complex', defaultStakes: 'client', reversible: true, isIntermediateDefault: true },
    routing: { minTier: 'balanced', requiresJson: true, dataSensitivity: 'client-confidential' },
    safety: { axioms: ['READ', 'TRANSFORM', 'DECIDE'], typeLevel: 1, sideEffects: ['none'], approvalRequired: false },
    economics: { typicalInputTokens: 8000, typicalOutputTokens: 1800 },
    examples: [{ goal: 'Analyze this RFP and decide whether we should pursue it.', inputs: {}, expectedOutputs: ['Go/no-go recommendation'] }],
  },
  {
    id: 'rfp-response-center.step-compliance-matrix',
    sourceSkillId: 'business-analyst-rfp-compliance-matrix-generator',
    name: 'Generate Compliance Matrix',
    description: 'Map requirements to response sections, owners, and evidence.',
    executionMode: 'skill',
    status: 'ready',
    goalVerbs: ['build', 'validate', 'classify'],
    businessDomains: ['rfp', 'proposal', 'compliance'],
    languageGames: ['analysis', 'generation'],
    familyClusters: ['rfp-response', 'compliance-matrix'],
    formOfLife: 'business-development',
    inputSchema: defaultInputSchema([{ id: 'requirements', label: 'Requirements', type: 'textarea', validation: { required: true } }]),
    outputContract: { fields: [outputField('compliance_matrix', 'Compliance matrix', 'table')] },
    task: { kind: 'synthesis', complexity: 'complex', defaultStakes: 'client', reversible: true, isIntermediateDefault: true },
    routing: { minTier: 'balanced', requiresJson: true, dataSensitivity: 'client-confidential' },
    safety: { axioms: ['READ', 'GENERATE', 'TRANSFORM', 'VALIDATE'], typeLevel: 1, sideEffects: ['none'], approvalRequired: false },
    economics: { typicalInputTokens: 6000, typicalOutputTokens: 2200 },
    examples: [{ goal: 'Create a compliance matrix for this RFP.', inputs: {}, expectedOutputs: ['Compliance matrix'] }],
  },
  {
    id: 'rfp-response-center.step-response-section',
    sourceSkillId: 'business-analyst-rfp-section-response-writer',
    name: 'Write Technical Response',
    description: 'Draft a proposal response section with win themes and supporting evidence.',
    executionMode: 'skill',
    status: 'ready',
    goalVerbs: ['draft', 'build'],
    businessDomains: ['rfp', 'proposal', 'technical response'],
    languageGames: ['generation'],
    familyClusters: ['rfp-response', 'proposal-generation'],
    formOfLife: 'business-development',
    inputSchema: defaultInputSchema([{ id: 'requirements', label: 'Requirements', type: 'textarea', validation: { required: true } }]),
    outputContract: { fields: [outputField('technical_response', 'Technical response draft')] },
    task: { kind: 'generation', complexity: 'complex', defaultStakes: 'client', reversible: true, isIntermediateDefault: true },
    routing: { minTier: 'balanced', preferredTier: 'balanced', requiresJson: true, dataSensitivity: 'client-confidential' },
    safety: { axioms: ['READ', 'GENERATE', 'TRANSFORM', 'VALIDATE'], typeLevel: 1, sideEffects: ['none'], approvalRequired: false },
    economics: { typicalInputTokens: 7000, typicalOutputTokens: 2500 },
    examples: [{ goal: 'Draft the technical approach section for this proposal.', inputs: {}, expectedOutputs: ['Technical response draft'] }],
  },
  {
    id: 'rfp-response-center.step-executive-summary',
    sourceSkillId: 'business-analyst-proposal-executive-summary-generator',
    name: 'Generate Executive Summary',
    description: 'Produce a client-facing executive summary for proposal evaluators.',
    executionMode: 'skill',
    status: 'ready',
    goalVerbs: ['draft', 'summarize', 'build'],
    businessDomains: ['rfp', 'proposal', 'executive summary'],
    languageGames: ['generation', 'analysis'],
    familyClusters: ['rfp-response', 'executive-brief', 'proposal-generation'],
    formOfLife: 'business-development',
    inputSchema: defaultInputSchema([{ id: 'opportunityOverview', label: 'Opportunity overview', type: 'textarea', validation: { required: true } }]),
    outputContract: { fields: [outputField('executive_summary', 'Executive summary')] },
    task: { kind: 'synthesis', complexity: 'strategic', defaultStakes: 'client', reversible: true, isIntermediateDefault: false },
    routing: { minTier: 'balanced', preferredTier: 'smart', requiresJson: true, dataSensitivity: 'client-confidential' },
    safety: { axioms: ['READ', 'GENERATE', 'TRANSFORM', 'VALIDATE'], typeLevel: 1, sideEffects: ['none'], approvalRequired: false },
    economics: { typicalInputTokens: 9000, typicalOutputTokens: 2200 },
    examples: [{ goal: 'Create an executive summary for this RFP response.', inputs: {}, expectedOutputs: ['Executive summary'] }],
  },
];

const FIRST_AGENT_TOOL_CAPABILITIES: ToolCapability[] = [
  {
    ...internalCapability('extract-business-goal', 'Extract Business Goal', 'Extract the actionable goal, constraints, deadline, audience, and success criteria.', ['extract', 'clarify'], ['business intake', 'planning'], 'extraction'),
    status: 'ready',
    languageGames: ['intake', 'clarification', 'planning'],
    familyClusters: ['business-intake-planning', 'goal-clarification'],
    inputSchema: objectSchema({
      goal: 'Raw user goal or request.',
      goalContext: 'Optional context envelope with audience, deadline, budget, entity, and domain hints.',
    }, ['goal']),
    outputContract: { fields: [
      outputField('goal', 'Normalized actionable business goal'),
      outputField('audience', 'Intended audience or stakeholder group'),
      outputField('deadline', 'Deadline or timing constraint'),
      outputField('constraints', 'Constraints that shape execution', 'markdown-list'),
      outputField('success_criteria', 'Success criteria for completion', 'markdown-list'),
      outputField('requested_outputs', 'Requested deliverables', 'markdown-list'),
    ] },
  },
  {
    ...internalCapability('classify-business-context', 'Classify Business Context', 'Classify business domain, stakes, data sensitivity, workflow family, and side-effect posture.', ['classify'], ['business intake', 'planning', 'governance'], 'classification'),
    status: 'ready',
    languageGames: ['classification', 'routing', 'policy'],
    familyClusters: ['business-intake-planning', 'context-classification', 'governance'],
    inputSchema: objectSchema({
      goal: 'Normalized or raw business goal.',
      goalContext: 'Optional context envelope.',
    }, ['goal']),
    outputContract: { fields: [
      outputField('domain_tags', 'Inferred business domains', 'markdown-list'),
      outputField('stakes', 'Inferred stakes level'),
      outputField('data_sensitivity', 'Data sensitivity class'),
      outputField('workflow_hint', 'Likely workflow or capability family'),
      outputField('side_effects', 'Potential side-effect classes', 'markdown-list'),
    ] },
  },
  {
    ...internalCapability('retrieve-entity-memory', 'Retrieve Entity Memory', 'Retrieve durable facts about clients, accounts, deals, campaigns, projects, documents, and people.', ['retrieve', 'research'], ['memory', 'entity intelligence', 'business context'], 'analysis'),
    status: 'ready',
    languageGames: ['memory retrieval', 'entity intelligence', 'context assembly'],
    familyClusters: ['memory-entity-intelligence', 'business-intake-planning'],
    inputSchema: objectSchema({
      entity: 'Business entity reference.',
      memoryFacts: 'Optional preloaded durable memory facts.',
      memoryKeys: 'Optional key-value memory envelope.',
    }),
    outputContract: { fields: [
      outputField('memory_summary', 'Short memory summary'),
      outputField('memory_keys', 'Relevant memory keys and values', 'json'),
      outputField('relevant_facts', 'Ranked relevant facts', 'json'),
    ] },
  },
  {
    ...internalCapability('summarize-source-material', 'Summarize Source Material', 'Condense long source material into structured decision-ready notes.', ['summarize'], ['research', 'analysis', 'source synthesis'], 'summarization'),
    status: 'ready',
    languageGames: ['summarization', 'source synthesis'],
    familyClusters: ['research-intelligence', 'business-intake-planning'],
    inputSchema: objectSchema({
      sourceMaterial: 'Documents, notes, transcript, CRM record, or pasted context.',
    }, ['sourceMaterial']),
    outputContract: { fields: [
      outputField('summary', 'Decision-ready summary'),
      outputField('key_points', 'Most important source points', 'markdown-list'),
      outputField('source_gaps', 'Missing, stale, or weak source areas', 'markdown-list'),
    ] },
  },
  {
    ...internalCapability('identify-risks-and-open-questions', 'Identify Risks And Open Questions', 'Identify risks, missing inputs, assumptions, and unresolved decisions before execution.', ['analyze', 'validate'], ['planning', 'risk', 'governance'], 'analysis'),
    status: 'ready',
    languageGames: ['risk review', 'planning', 'quality'],
    familyClusters: ['business-intake-planning', 'quality-evaluator', 'governance'],
    outputContract: { fields: [
      outputField('risks', 'Execution or business risks', 'markdown-list'),
      outputField('open_questions', 'Questions that should be answered', 'markdown-list'),
      outputField('assumptions', 'Assumptions being made', 'markdown-list'),
      outputField('missing_inputs', 'Inputs needed before execution', 'markdown-list'),
    ] },
  },
  {
    ...internalCapability('prioritize-actions', 'Prioritize Actions', 'Rank next actions by impact, urgency, confidence, dependency order, and owner.', ['prioritize', 'plan'], ['operations', 'planning'], 'classification'),
    status: 'ready',
    languageGames: ['prioritization', 'operations planning'],
    familyClusters: ['business-intake-planning', 'operating-analysis'],
    outputContract: { fields: [
      outputField('prioritized_actions', 'Ranked next actions', 'json'),
      outputField('rationale', 'Why this order is recommended'),
      outputField('owners', 'Suggested owners or roles', 'markdown-list'),
    ] },
  },
  {
    ...rendererCapability('build-client-brief', 'Build Client Brief', 'Render structured findings into a polished client-ready brief.', ['draft', 'build'], ['client communication', 'customer success', 'sales'], 'synthesis'),
    status: 'ready',
    languageGames: ['client communication', 'brief rendering'],
    familyClusters: ['deliverable-renderers', 'customer-success'],
    outputContract: { fields: [
      outputField('client_brief', 'Client-ready brief'),
      outputField('recommendations', 'Recommended actions', 'markdown-list'),
      outputField('next_steps', 'Client-facing next steps', 'markdown-list'),
    ] },
  },
  {
    ...rendererCapability('build-executive-brief', 'Build Executive Brief', 'Render structured findings into a concise leadership brief.', ['draft', 'summarize'], ['executive communication', 'leadership', 'operations'], 'synthesis'),
    status: 'ready',
    languageGames: ['executive communication', 'decision memo'],
    familyClusters: ['deliverable-renderers', 'business-intake-planning'],
    outputContract: { fields: [
      outputField('executive_brief', 'Leadership-ready brief'),
      outputField('decisions_needed', 'Decisions or approvals needed', 'markdown-list'),
      outputField('metrics', 'Relevant metrics or evidence', 'markdown-list'),
    ] },
  },
  {
    ...rendererCapability('build-email-draft', 'Build Email Draft', 'Render approved facts and recommendations into an email draft.', ['draft', 'write'], ['communication', 'sales', 'customer success'], 'generation'),
    status: 'ready',
    languageGames: ['email drafting', 'business communication'],
    familyClusters: ['deliverable-renderers', 'sales-customer-success', 'marketing-content-operations'],
    outputContract: { fields: [
      outputField('subject', 'Email subject line'),
      outputField('email_body', 'Email body draft'),
      outputField('call_to_action', 'Recommended call to action'),
    ] },
  },
  {
    ...rendererCapability('build-work-plan', 'Build Work Plan', 'Render prioritized actions into an owner/date/action work plan.', ['build', 'plan'], ['operations', 'planning', 'project management'], 'synthesis'),
    status: 'ready',
    languageGames: ['project planning', 'operations'],
    familyClusters: ['deliverable-renderers', 'business-intake-planning'],
    outputContract: { fields: [
      outputField('work_plan', 'Action plan with order, owner, and status', 'json'),
      outputField('milestones', 'Project milestones', 'markdown-list'),
      outputField('owners', 'Suggested owners', 'markdown-list'),
    ] },
  },
  {
    ...internalCapability('evaluate-output-contract', 'Evaluate Output Contract', 'Check whether a tool output satisfies required fields, audience constraints, and revision rules.', ['evaluate', 'validate'], ['quality', 'governance'], 'evaluation'),
    status: 'ready',
    languageGames: ['quality evaluation', 'contract checking'],
    familyClusters: ['quality-evaluator', 'governance'],
    outputContract: { fields: [
      outputField('completeness_score', 'Required-field completeness score', 'number'),
      outputField('missing_fields', 'Missing required fields', 'markdown-list'),
      outputField('decision', 'Quality decision'),
      outputField('notes', 'Evaluator notes', 'markdown-list'),
    ] },
  },
  {
    ...internalCapability('persist-business-facts', 'Persist Business Facts', 'Persist durable structured facts into entity memory.', ['persist'], ['memory', 'entity intelligence'], 'transformation'),
    status: 'ready',
    languageGames: ['memory persistence', 'entity intelligence'],
    familyClusters: ['memory-entity-intelligence', 'quality-evaluator'],
    outputContract: { fields: [
      outputField('facts', 'Facts prepared for persistence', 'json'),
      outputField('entity_refs', 'Entities the facts belong to', 'json'),
      outputField('persistence_summary', 'Persistence summary'),
    ] },
    safety: { axioms: ['WRITE', 'VALIDATE'], typeLevel: 2, sideEffects: ['database-write'], approvalRequired: true },
    executionMode: 'internal',
  },
];

interface RoadmapCapabilitySpec {
  id: string;
  name: string;
  description: string;
  goalVerbs: string[];
  domains: string[];
  languageGames: string[];
  familyCluster: string;
  formOfLife: string;
  kind: TaskKind;
  complexity?: TaskComplexity;
  stakes?: TaskStakes;
  executionMode?: ToolExecutionMode;
  outputs: Array<[string, string, OutputField['format']?]>;
}

const ROADMAP_CAPABILITY_SPECS: RoadmapCapabilitySpec[] = [
  // Business intake and planning
  { id: 'business.goal-clarification', name: 'Goal Clarification', description: 'Clarify vague business requests into an executable objective with success criteria.', goalVerbs: ['clarify', 'extract'], domains: ['business intake', 'planning'], languageGames: ['intake', 'clarification'], familyCluster: 'business-intake-planning', formOfLife: 'business-operations', kind: 'extraction', outputs: [['clarified_goal', 'Clarified goal'], ['success_criteria', 'Success criteria', 'markdown-list'], ['clarifying_questions', 'Clarifying questions', 'markdown-list']] },
  { id: 'business.stakeholder-identification', name: 'Stakeholder Identification', description: 'Identify stakeholders, decision makers, reviewers, and affected teams.', goalVerbs: ['identify', 'classify'], domains: ['business intake', 'planning'], languageGames: ['stakeholder mapping'], familyCluster: 'business-intake-planning', formOfLife: 'business-operations', kind: 'classification', outputs: [['stakeholders', 'Stakeholder list', 'json'], ['decision_makers', 'Decision makers', 'markdown-list'], ['reviewers', 'Reviewers or approvers', 'markdown-list']] },
  { id: 'business.deadline-extraction', name: 'Deadline Extraction', description: 'Extract deadlines, milestones, dependencies, and urgency from source context.', goalVerbs: ['extract'], domains: ['business intake', 'planning', 'project management'], languageGames: ['deadline planning'], familyCluster: 'business-intake-planning', formOfLife: 'business-operations', kind: 'extraction', outputs: [['deadline', 'Primary deadline'], ['milestones', 'Milestones', 'markdown-list'], ['urgency', 'Urgency level']] },
  { id: 'business.constraint-extraction', name: 'Constraint Extraction', description: 'Extract budget, policy, audience, source, approval, and technical constraints.', goalVerbs: ['extract', 'classify'], domains: ['business intake', 'planning', 'governance'], languageGames: ['constraint analysis'], familyCluster: 'business-intake-planning', formOfLife: 'business-operations', kind: 'extraction', outputs: [['constraints', 'Constraints', 'markdown-list'], ['approval_needs', 'Approval needs', 'markdown-list'], ['blocked_by', 'Blocking constraints', 'markdown-list']] },
  { id: 'business.project-decomposition', name: 'Project Decomposition', description: 'Break a business goal into phases, work packages, dependencies, and owners.', goalVerbs: ['decompose', 'plan', 'build'], domains: ['business intake', 'operations', 'project management'], languageGames: ['project planning'], familyCluster: 'business-intake-planning', formOfLife: 'business-operations', kind: 'reasoning', complexity: 'complex', outputs: [['work_packages', 'Work packages', 'json'], ['dependencies', 'Dependencies', 'json'], ['owner_map', 'Owner map', 'json']] },

  // Research and intelligence
  { id: 'research.account-intelligence', name: 'Account Intelligence', description: 'Synthesize account context, priorities, risks, stakeholders, and expansion paths.', goalVerbs: ['research', 'summarize'], domains: ['research', 'sales', 'customer success'], languageGames: ['account intelligence'], familyCluster: 'research-intelligence', formOfLife: 'revenue-operations', kind: 'analysis', outputs: [['account_summary', 'Account summary'], ['priorities', 'Priorities', 'markdown-list'], ['opportunities', 'Opportunities', 'markdown-list']] },
  { id: 'research.competitor-research', name: 'Competitor Research', description: 'Compare competitors, positioning, strengths, weaknesses, and likely responses.', goalVerbs: ['research', 'compare'], domains: ['research', 'marketing', 'strategy'], languageGames: ['competitive intelligence'], familyCluster: 'research-intelligence', formOfLife: 'market-strategy', kind: 'analysis', outputs: [['competitors', 'Competitor profiles', 'json'], ['positioning_gaps', 'Positioning gaps', 'markdown-list'], ['battlecard_points', 'Battlecard points', 'markdown-list']] },
  { id: 'research.market-scan', name: 'Market Scan', description: 'Scan a market for trends, demand signals, adoption barriers, and strategic implications.', goalVerbs: ['research', 'scan'], domains: ['research', 'market intelligence', 'strategy'], languageGames: ['market intelligence'], familyCluster: 'research-intelligence', formOfLife: 'market-strategy', kind: 'analysis', outputs: [['market_summary', 'Market summary'], ['signals', 'Market signals', 'markdown-list'], ['implications', 'Strategic implications', 'markdown-list']] },
  { id: 'research.regulatory-scan', name: 'Regulatory Scan', description: 'Identify regulatory issues, obligations, constraints, and review needs.', goalVerbs: ['research', 'validate'], domains: ['research', 'regulatory', 'compliance'], languageGames: ['regulatory review'], familyCluster: 'research-intelligence', formOfLife: 'governance', kind: 'analysis', complexity: 'complex', stakes: 'leadership', outputs: [['regulatory_issues', 'Regulatory issues', 'markdown-list'], ['obligations', 'Obligations', 'markdown-list'], ['review_needed', 'Review needs', 'markdown-list']] },
  { id: 'research.customer-voice-synthesis', name: 'Customer Voice Synthesis', description: 'Synthesize interviews, reviews, tickets, notes, and transcripts into customer themes.', goalVerbs: ['summarize', 'synthesize'], domains: ['research', 'customer success', 'marketing'], languageGames: ['customer voice'], familyCluster: 'research-intelligence', formOfLife: 'customer-operations', kind: 'synthesis', outputs: [['themes', 'Customer voice themes', 'json'], ['quotes', 'Representative quotes or evidence', 'markdown-list'], ['product_or_service_implications', 'Implications', 'markdown-list']] },

  // Financial and operating analysis
  { id: 'finance.budget-review', name: 'Budget Review', description: 'Review budget allocation, variances, overages, and underused resources.', goalVerbs: ['review', 'analyze'], domains: ['finance', 'operations'], languageGames: ['budget analysis'], familyCluster: 'financial-operating-analysis', formOfLife: 'business-operations', kind: 'analysis', outputs: [['budget_findings', 'Budget findings', 'markdown-list'], ['variances', 'Variances', 'json'], ['recommended_changes', 'Recommended changes', 'markdown-list']] },
  { id: 'finance.forecast-variance', name: 'Forecast Variance', description: 'Explain forecast variance, drivers, risks, and corrective actions.', goalVerbs: ['analyze', 'explain'], domains: ['finance', 'operations'], languageGames: ['forecast review'], familyCluster: 'financial-operating-analysis', formOfLife: 'business-operations', kind: 'analysis', outputs: [['variance_summary', 'Variance summary'], ['drivers', 'Variance drivers', 'markdown-list'], ['corrective_actions', 'Corrective actions', 'markdown-list']] },
  { id: 'finance.unit-economics', name: 'Unit Economics', description: 'Analyze margins, CAC, LTV, payback, throughput, and unit-level profitability.', goalVerbs: ['analyze', 'model'], domains: ['finance', 'strategy'], languageGames: ['unit economics'], familyCluster: 'financial-operating-analysis', formOfLife: 'business-operations', kind: 'analysis', complexity: 'complex', outputs: [['unit_economics', 'Unit economics summary', 'json'], ['sensitivity_drivers', 'Sensitivity drivers', 'markdown-list'], ['recommendations', 'Recommendations', 'markdown-list']] },
  { id: 'finance.scenario-modeling', name: 'Scenario Modeling', description: 'Build best/base/worst scenario assumptions and implications.', goalVerbs: ['model', 'plan'], domains: ['finance', 'strategy', 'operations'], languageGames: ['scenario planning'], familyCluster: 'financial-operating-analysis', formOfLife: 'business-operations', kind: 'reasoning', complexity: 'strategic', stakes: 'leadership', outputs: [['scenarios', 'Scenario table', 'table'], ['assumptions', 'Assumptions', 'markdown-list'], ['decision_implications', 'Decision implications', 'markdown-list']] },
  { id: 'finance.roi-narrative', name: 'ROI Narrative', description: 'Turn financial and operating evidence into a credible ROI story.', goalVerbs: ['draft', 'explain'], domains: ['finance', 'sales', 'executive communication'], languageGames: ['roi narrative'], familyCluster: 'financial-operating-analysis', formOfLife: 'business-development', kind: 'synthesis', stakes: 'client', outputs: [['roi_narrative', 'ROI narrative'], ['proof_points', 'Proof points', 'markdown-list'], ['caveats', 'Caveats', 'markdown-list']] },

  // Sales and customer success
  { id: 'sales.account-pursuit', name: 'Account Pursuit', description: 'Plan a target account pursuit with signals, stakeholders, pains, and plays.', goalVerbs: ['plan', 'research'], domains: ['sales', 'account pursuit'], languageGames: ['deal strategy'], familyCluster: 'sales-customer-success', formOfLife: 'revenue-operations', kind: 'reasoning', complexity: 'complex', stakes: 'client', outputs: [['pursuit_plan', 'Pursuit plan', 'json'], ['account_hypotheses', 'Account hypotheses', 'markdown-list'], ['next_moves', 'Next moves', 'markdown-list']] },
  { id: 'sales.discovery-prep', name: 'Discovery Prep', description: 'Prepare discovery questions, agenda, hypotheses, and qualification risks.', goalVerbs: ['prepare', 'plan'], domains: ['sales', 'discovery'], languageGames: ['discovery preparation'], familyCluster: 'sales-customer-success', formOfLife: 'revenue-operations', kind: 'synthesis', outputs: [['agenda', 'Discovery agenda', 'markdown-list'], ['questions', 'Discovery questions', 'markdown-list'], ['qualification_risks', 'Qualification risks', 'markdown-list']] },
  { id: 'sales.objection-handling', name: 'Objection Handling', description: 'Map likely objections to evidence-based responses and follow-up questions.', goalVerbs: ['prepare', 'respond'], domains: ['sales', 'customer success'], languageGames: ['objection handling'], familyCluster: 'sales-customer-success', formOfLife: 'revenue-operations', kind: 'synthesis', outputs: [['objections', 'Objections and responses', 'json'], ['proof_points', 'Proof points', 'markdown-list'], ['follow_up_questions', 'Follow-up questions', 'markdown-list']] },
  { id: 'success.qbr-prep', name: 'QBR Preparation', description: 'Prepare a QBR narrative with performance, value delivered, risks, and asks.', goalVerbs: ['prepare', 'summarize'], domains: ['customer success', 'qbr'], languageGames: ['business review'], familyCluster: 'sales-customer-success', formOfLife: 'customer-operations', kind: 'synthesis', stakes: 'client', outputs: [['qbr_narrative', 'QBR narrative'], ['value_delivered', 'Value delivered', 'markdown-list'], ['asks', 'Client asks', 'markdown-list']] },
  { id: 'success.churn-intervention', name: 'Churn Intervention', description: 'Diagnose churn risk and propose an intervention plan.', goalVerbs: ['diagnose', 'plan'], domains: ['customer success', 'churn', 'retention'], languageGames: ['risk intervention'], familyCluster: 'sales-customer-success', formOfLife: 'customer-operations', kind: 'reasoning', complexity: 'complex', outputs: [['churn_risks', 'Churn risks', 'markdown-list'], ['intervention_plan', 'Intervention plan', 'json'], ['success_signals', 'Recovery signals', 'markdown-list']] },
  { id: 'success.renewal-expansion-planning', name: 'Renewal And Expansion Planning', description: 'Plan renewal and expansion actions based on value, health, stakeholders, and timing.', goalVerbs: ['plan', 'prioritize'], domains: ['customer success', 'renewal', 'expansion'], languageGames: ['renewal planning'], familyCluster: 'sales-customer-success', formOfLife: 'customer-operations', kind: 'reasoning', complexity: 'complex', stakes: 'client', outputs: [['renewal_plan', 'Renewal plan', 'json'], ['expansion_paths', 'Expansion paths', 'markdown-list'], ['risks', 'Risks', 'markdown-list']] },

  // Marketing and content operations
  { id: 'marketing.campaign-strategy', name: 'Campaign Strategy', description: 'Design a campaign strategy with audience, offer, channels, proof, and KPIs.', goalVerbs: ['plan', 'build'], domains: ['marketing', 'campaign strategy'], languageGames: ['campaign planning'], familyCluster: 'marketing-content-operations', formOfLife: 'marketing-operations', kind: 'reasoning', complexity: 'complex', outputs: [['strategy', 'Campaign strategy'], ['channels', 'Channel plan', 'markdown-list'], ['kpis', 'Campaign KPIs', 'markdown-list']] },
  { id: 'marketing.editorial-calendar', name: 'Editorial Calendar', description: 'Create an editorial calendar from themes, audiences, offers, and cadence.', goalVerbs: ['build', 'plan'], domains: ['marketing', 'content operations'], languageGames: ['content planning'], familyCluster: 'marketing-content-operations', formOfLife: 'marketing-operations', kind: 'synthesis', outputs: [['calendar', 'Editorial calendar', 'table'], ['themes', 'Content themes', 'markdown-list'], ['production_notes', 'Production notes', 'markdown-list']] },
  { id: 'marketing.paid-media-audit', name: 'Paid Media Audit', description: 'Audit paid media structure, budget, conversion paths, and wasted spend.', goalVerbs: ['audit', 'analyze'], domains: ['marketing', 'ppc', 'paid media'], languageGames: ['paid media audit'], familyCluster: 'marketing-content-operations', formOfLife: 'marketing-operations', kind: 'analysis', outputs: [['audit_findings', 'Paid media findings', 'markdown-list'], ['waste_or_risk', 'Waste or risk areas', 'markdown-list'], ['optimizations', 'Optimizations', 'markdown-list']] },
  { id: 'marketing.seo-geo-analysis', name: 'SEO And GEO Analysis', description: 'Analyze SEO/GEO visibility, content gaps, technical issues, and AI search readiness.', goalVerbs: ['analyze', 'audit'], domains: ['marketing', 'seo', 'geo'], languageGames: ['search optimization'], familyCluster: 'marketing-content-operations', formOfLife: 'marketing-operations', kind: 'analysis', outputs: [['visibility_findings', 'Visibility findings', 'markdown-list'], ['content_gaps', 'Content gaps', 'markdown-list'], ['technical_actions', 'Technical actions', 'markdown-list']] },
  { id: 'marketing.landing-page-critique', name: 'Landing Page Critique', description: 'Critique landing page message, offer, friction, trust, and conversion path.', goalVerbs: ['critique', 'analyze'], domains: ['marketing', 'conversion optimization'], languageGames: ['landing page review'], familyCluster: 'marketing-content-operations', formOfLife: 'marketing-operations', kind: 'analysis', outputs: [['critique', 'Landing page critique'], ['conversion_issues', 'Conversion issues', 'markdown-list'], ['test_ideas', 'Test ideas', 'markdown-list']] },
  { id: 'marketing.email-sequence-generation', name: 'Email Sequence Generation', description: 'Generate a multi-touch email sequence from audience, offer, proof, and CTA.', goalVerbs: ['generate', 'draft'], domains: ['marketing', 'email', 'sales'], languageGames: ['email sequence'], familyCluster: 'marketing-content-operations', formOfLife: 'marketing-operations', kind: 'generation', stakes: 'client', executionMode: 'renderer', outputs: [['sequence', 'Email sequence', 'json'], ['subject_lines', 'Subject lines', 'markdown-list'], ['cta_strategy', 'CTA strategy']] },

  // Legal, compliance, and governance
  { id: 'governance.contract-issue-spotting', name: 'Contract Issue Spotting', description: 'Spot contract issues, risks, missing terms, and review questions.', goalVerbs: ['review', 'spot'], domains: ['legal', 'contract', 'governance'], languageGames: ['contract review'], familyCluster: 'legal-compliance-governance', formOfLife: 'governance', kind: 'analysis', complexity: 'complex', stakes: 'leadership', outputs: [['issues', 'Contract issues', 'markdown-list'], ['risk_level', 'Risk level'], ['review_questions', 'Review questions', 'markdown-list']] },
  { id: 'governance.rfp-compliance-matrix', name: 'RFP Compliance Matrix', description: 'Map RFP requirements to response status, owner, evidence, and gaps.', goalVerbs: ['build', 'validate'], domains: ['rfp', 'compliance', 'governance'], languageGames: ['compliance matrix'], familyCluster: 'legal-compliance-governance', formOfLife: 'business-development', kind: 'analysis', stakes: 'client', outputs: [['compliance_matrix', 'Compliance matrix', 'table'], ['gaps', 'Compliance gaps', 'markdown-list'], ['owner_actions', 'Owner actions', 'markdown-list']] },
  { id: 'governance.ai-risk-assessment', name: 'AI Risk Assessment', description: 'Assess AI use-case risk, controls, data sensitivity, and approval needs.', goalVerbs: ['assess', 'classify'], domains: ['ai governance', 'risk', 'compliance'], languageGames: ['ai risk review'], familyCluster: 'legal-compliance-governance', formOfLife: 'governance', kind: 'evaluation', stakes: 'leadership', outputs: [['risk_rating', 'AI risk rating'], ['controls', 'Controls', 'markdown-list'], ['approval_path', 'Approval path']] },
  { id: 'governance.data-handling-classification', name: 'Data Handling Classification', description: 'Classify data sensitivity, storage constraints, sharing rules, and retention needs.', goalVerbs: ['classify'], domains: ['data governance', 'compliance'], languageGames: ['data handling'], familyCluster: 'legal-compliance-governance', formOfLife: 'governance', kind: 'classification', outputs: [['data_classification', 'Data classification'], ['handling_rules', 'Handling rules', 'markdown-list'], ['retention_notes', 'Retention notes', 'markdown-list']] },
  { id: 'governance.policy-comparison', name: 'Policy Comparison', description: 'Compare policy versions or requirements and explain deltas, conflicts, and action items.', goalVerbs: ['compare', 'review'], domains: ['policy', 'compliance', 'governance'], languageGames: ['policy comparison'], familyCluster: 'legal-compliance-governance', formOfLife: 'governance', kind: 'analysis', outputs: [['differences', 'Policy differences', 'json'], ['conflicts', 'Conflicts', 'markdown-list'], ['action_items', 'Action items', 'markdown-list']] },

  // People and recruiting
  { id: 'people.job-intake', name: 'Job Intake', description: 'Convert hiring needs into a structured role intake, requirements, and scorecard.', goalVerbs: ['intake', 'extract'], domains: ['people', 'recruiting', 'hiring'], languageGames: ['job intake'], familyCluster: 'people-recruiting', formOfLife: 'people-operations', kind: 'extraction', outputs: [['role_summary', 'Role summary'], ['requirements', 'Requirements', 'markdown-list'], ['scorecard_dimensions', 'Scorecard dimensions', 'markdown-list']] },
  { id: 'people.candidate-screening-rubric', name: 'Candidate Screening Rubric', description: 'Build a consistent candidate screening rubric from role criteria.', goalVerbs: ['build', 'evaluate'], domains: ['people', 'recruiting'], languageGames: ['candidate screening'], familyCluster: 'people-recruiting', formOfLife: 'people-operations', kind: 'evaluation', outputs: [['rubric', 'Screening rubric', 'table'], ['must_haves', 'Must-haves', 'markdown-list'], ['red_flags', 'Red flags', 'markdown-list']] },
  { id: 'people.interview-plan', name: 'Interview Plan', description: 'Create an interview plan with panels, questions, signals, and decision criteria.', goalVerbs: ['plan', 'prepare'], domains: ['people', 'interviewing'], languageGames: ['interview planning'], familyCluster: 'people-recruiting', formOfLife: 'people-operations', kind: 'synthesis', outputs: [['interview_plan', 'Interview plan', 'json'], ['questions', 'Interview questions', 'markdown-list'], ['decision_criteria', 'Decision criteria', 'markdown-list']] },
  { id: 'people.performance-review-synthesis', name: 'Performance Review Synthesis', description: 'Synthesize review notes into themes, accomplishments, growth areas, and manager talking points.', goalVerbs: ['summarize', 'synthesize'], domains: ['people', 'performance'], languageGames: ['performance review'], familyCluster: 'people-recruiting', formOfLife: 'people-operations', kind: 'synthesis', stakes: 'leadership', outputs: [['review_summary', 'Review summary'], ['strengths', 'Strengths', 'markdown-list'], ['growth_areas', 'Growth areas', 'markdown-list']] },
  { id: 'people.staffing-client-update', name: 'Staffing Client Update', description: 'Create a client-ready staffing update with pipeline, risks, blockers, and next actions.', goalVerbs: ['draft', 'summarize'], domains: ['people', 'staffing', 'client communication'], languageGames: ['staffing update'], familyCluster: 'people-recruiting', formOfLife: 'people-operations', kind: 'synthesis', stakes: 'client', outputs: [['client_update', 'Client staffing update'], ['pipeline_status', 'Pipeline status', 'markdown-list'], ['next_actions', 'Next actions', 'markdown-list']] },

  // Deliverable renderers
  { id: 'renderer.executive-memo', name: 'Executive Memo Renderer', description: 'Render structured analysis into a crisp executive memo.', goalVerbs: ['render', 'draft'], domains: ['deliverable', 'executive communication'], languageGames: ['executive memo'], familyCluster: 'deliverable-renderers', formOfLife: 'business-operations', kind: 'generation', stakes: 'leadership', executionMode: 'renderer', outputs: [['memo', 'Executive memo'], ['decision', 'Decision needed'], ['appendix', 'Supporting appendix', 'markdown-list']] },
  { id: 'renderer.client-email', name: 'Client Email Renderer', description: 'Render approved facts into a polished client email.', goalVerbs: ['render', 'draft'], domains: ['deliverable', 'client communication'], languageGames: ['client email'], familyCluster: 'deliverable-renderers', formOfLife: 'client-service', kind: 'generation', stakes: 'client', executionMode: 'renderer', outputs: [['subject', 'Email subject'], ['body', 'Email body'], ['cta', 'Call to action']] },
  { id: 'renderer.board-brief', name: 'Board Brief Renderer', description: 'Render strategic findings into a board-ready brief.', goalVerbs: ['render', 'draft'], domains: ['deliverable', 'board', 'leadership'], languageGames: ['board brief'], familyCluster: 'deliverable-renderers', formOfLife: 'executive-operations', kind: 'synthesis', complexity: 'strategic', stakes: 'leadership', executionMode: 'renderer', outputs: [['board_brief', 'Board brief'], ['key_decisions', 'Key decisions', 'markdown-list'], ['risks', 'Risks', 'markdown-list']] },
  { id: 'renderer.qbr-deck-outline', name: 'QBR Deck Outline Renderer', description: 'Render customer success material into a QBR deck outline.', goalVerbs: ['render', 'outline'], domains: ['deliverable', 'qbr', 'customer success'], languageGames: ['deck outline'], familyCluster: 'deliverable-renderers', formOfLife: 'customer-operations', kind: 'synthesis', stakes: 'client', executionMode: 'renderer', outputs: [['deck_outline', 'QBR deck outline', 'json'], ['speaker_notes', 'Speaker notes', 'markdown-list'], ['data_needs', 'Data needs', 'markdown-list']] },
  { id: 'renderer.spreadsheet-model-spec', name: 'Spreadsheet Model Spec Renderer', description: 'Render model requirements into a spreadsheet model specification.', goalVerbs: ['render', 'spec'], domains: ['deliverable', 'finance', 'operations'], languageGames: ['spreadsheet specification'], familyCluster: 'deliverable-renderers', formOfLife: 'business-operations', kind: 'synthesis', executionMode: 'renderer', outputs: [['model_spec', 'Spreadsheet model spec', 'json'], ['tabs', 'Spreadsheet tabs', 'markdown-list'], ['formulas', 'Formula notes', 'markdown-list']] },
  { id: 'renderer.dashboard-spec', name: 'Dashboard Spec Renderer', description: 'Render operational questions into a dashboard specification.', goalVerbs: ['render', 'spec'], domains: ['deliverable', 'dashboard', 'analytics'], languageGames: ['dashboard specification'], familyCluster: 'deliverable-renderers', formOfLife: 'business-operations', kind: 'synthesis', executionMode: 'renderer', outputs: [['dashboard_spec', 'Dashboard spec', 'json'], ['metrics', 'Metrics', 'markdown-list'], ['filters', 'Filters', 'markdown-list']] },
  { id: 'renderer.task-plan', name: 'Task Plan Renderer', description: 'Render prioritized work into a task plan suitable for project tooling.', goalVerbs: ['render', 'plan'], domains: ['deliverable', 'tasks', 'project management'], languageGames: ['task planning'], familyCluster: 'deliverable-renderers', formOfLife: 'business-operations', kind: 'synthesis', executionMode: 'renderer', outputs: [['tasks', 'Task list', 'json'], ['milestones', 'Milestones', 'markdown-list'], ['dependencies', 'Dependencies', 'markdown-list']] },

  // Quality and evaluator skills
  { id: 'quality.factual-consistency-check', name: 'Factual Consistency Check', description: 'Check a draft against source facts for unsupported claims or contradictions.', goalVerbs: ['check', 'validate'], domains: ['quality', 'source review'], languageGames: ['factual consistency'], familyCluster: 'quality-evaluator', formOfLife: 'business-operations', kind: 'evaluation', outputs: [['unsupported_claims', 'Unsupported claims', 'markdown-list'], ['contradictions', 'Contradictions', 'markdown-list'], ['decision', 'Decision']] },
  { id: 'quality.contract-completeness-check', name: 'Contract Completeness Check', description: 'Check whether an output satisfies the declared output contract.', goalVerbs: ['check', 'evaluate'], domains: ['quality', 'contracts'], languageGames: ['contract checking'], familyCluster: 'quality-evaluator', formOfLife: 'business-operations', kind: 'evaluation', outputs: [['completeness_score', 'Completeness score', 'number'], ['missing_fields', 'Missing fields', 'markdown-list'], ['decision', 'Decision']] },
  { id: 'quality.tone-audience-fit-check', name: 'Tone And Audience Fit Check', description: 'Evaluate tone, level of detail, and audience fit before delivery.', goalVerbs: ['check', 'evaluate'], domains: ['quality', 'communication'], languageGames: ['audience fit'], familyCluster: 'quality-evaluator', formOfLife: 'business-operations', kind: 'evaluation', outputs: [['fit_score', 'Audience-fit score', 'number'], ['tone_issues', 'Tone issues', 'markdown-list'], ['revision_guidance', 'Revision guidance', 'markdown-list']] },
  { id: 'quality.risk-compliance-check', name: 'Risk And Compliance Check', description: 'Evaluate output for legal, policy, data handling, and operational risks.', goalVerbs: ['check', 'validate'], domains: ['quality', 'risk', 'compliance'], languageGames: ['risk review'], familyCluster: 'quality-evaluator', formOfLife: 'governance', kind: 'evaluation', complexity: 'complex', stakes: 'leadership', outputs: [['risk_findings', 'Risk findings', 'markdown-list'], ['required_approvals', 'Required approvals', 'markdown-list'], ['decision', 'Decision']] },
  { id: 'quality.source-coverage-check', name: 'Source Coverage Check', description: 'Check whether enough source coverage exists for the requested deliverable.', goalVerbs: ['check', 'validate'], domains: ['quality', 'research'], languageGames: ['source coverage'], familyCluster: 'quality-evaluator', formOfLife: 'business-operations', kind: 'evaluation', outputs: [['coverage_score', 'Source coverage score', 'number'], ['missing_sources', 'Missing sources', 'markdown-list'], ['confidence', 'Confidence level']] },
];

const ROADMAP_BUSINESS_CAPABILITIES: ToolCapability[] = ROADMAP_CAPABILITY_SPECS.map(roadmapCapability);

const CRM_PROSPECTING_CAPABILITIES: ToolCapability[] = [
  {
    ...internalCapability(
      'crm.find-local-businesses',
      'Find Local Businesses',
      'Look up companies by business type and location and normalize them into local business records.',
      ['find', 'lookup', 'research'],
      ['crm', 'local prospecting', 'sales', 'business development', 'local campaigns'],
      'analysis',
    ),
    status: 'ready',
    languageGames: ['research', 'analysis'],
    familyClusters: ['crm-prospecting', 'local-campaigns', 'sales-outreach'],
    formOfLife: 'local-business-development',
    inputSchema: {
      type: 'object',
      properties: {
        businessType: { type: 'string', description: 'Business type or category to look up.' },
        location: { type: 'string', description: 'City, region, or service area.' },
        maxResults: { type: 'number', description: 'Maximum records to return.' },
        minRating: { type: 'number', description: 'Optional public rating filter.' },
      },
      required: ['businessType', 'location'],
    },
    outputContract: { fields: [
      outputField('records', 'Normalized local business records', 'json'),
      outputField('warnings', 'Provider or data quality warnings', 'markdown-list'),
    ] },
    routing: { minTier: 'fast', preferredTier: 'fast', requiresJson: true, dataSensitivity: 'public' },
    safety: { axioms: ['READ', 'TRANSFORM'], typeLevel: 1, sideEffects: ['external-read'], approvalRequired: false },
    economics: { typicalInputTokens: 700, typicalOutputTokens: 1400 },
    examples: [{
      goal: 'Find local law firms in Milwaukee for an automation campaign.',
      inputs: { businessType: 'law firms', location: 'Milwaukee, WI', maxResults: 20 },
      expectedOutputs: ['Local business records with company names, websites, phones, and addresses'],
    }],
  },
  {
    ...internalCapability(
      'crm.enrich-local-prospects',
      'Enrich Local Prospects',
      'Convert local business records into enriched CRM prospects with pain points, use cases, savings, and recommended skills.',
      ['enrich', 'classify', 'prioritize'],
      ['crm', 'local prospecting', 'sales', 'campaign planning'],
      'transformation',
    ),
    status: 'ready',
    languageGames: ['analysis', 'classification'],
    familyClusters: ['crm-prospecting', 'client-intelligence', 'local-campaigns'],
    formOfLife: 'local-business-development',
    inputSchema: {
      type: 'object',
      properties: {
        records: { type: 'array', description: 'Local business records from a lookup provider.' },
        defaultIndustry: { type: 'string', description: 'Fallback CRM industry.' },
      },
      required: ['records'],
    },
    outputContract: { fields: [
      outputField('prospects', 'Enriched CRM prospects with campaign-ready metadata', 'json'),
      outputField('recommended_skills', 'Recommended automation skills for the prospect set', 'markdown-list'),
      outputField('recommended_workflows', 'Recommended workflows for the prospect set', 'markdown-list'),
    ] },
    routing: { minTier: 'fast', preferredTier: 'fast', requiresJson: true, dataSensitivity: 'internal' },
    safety: { axioms: ['READ', 'TRANSFORM', 'VALIDATE'], typeLevel: 1, sideEffects: ['none'], approvalRequired: false },
    economics: { typicalInputTokens: 2200, typicalOutputTokens: 1800 },
    examples: [{
      goal: 'Enrich this list of contractors for automation campaign outreach.',
      inputs: { records: [] },
      expectedOutputs: ['Enriched prospects', 'Recommended skills', 'Recommended workflows'],
    }],
  },
  {
    ...internalCapability(
      'crm.score-automation-campaign-fit',
      'Score Automation Campaign Fit',
      'Score local prospects for automation campaign readiness and explain the best angle.',
      ['score', 'prioritize', 'classify'],
      ['crm', 'sales', 'local campaigns', 'business development'],
      'classification',
    ),
    status: 'ready',
    languageGames: ['classification', 'sales qualification'],
    familyClusters: ['crm-prospecting', 'local-campaigns', 'sales-prioritization'],
    formOfLife: 'local-business-development',
    outputContract: { fields: [
      outputField('score', 'Automation campaign fit score', 'number'),
      outputField('reasons', 'Reasons the prospect is or is not campaign-ready', 'markdown-list'),
      outputField('recommended_angle', 'Recommended outreach angle'),
    ] },
    routing: { minTier: 'fast', preferredTier: 'fast', requiresJson: true, dataSensitivity: 'internal' },
    safety: { axioms: ['READ', 'DECIDE', 'VALIDATE'], typeLevel: 1, sideEffects: ['none'], approvalRequired: false },
    economics: { typicalInputTokens: 1200, typicalOutputTokens: 500 },
    examples: [{
      goal: 'Prioritize these local prospects by automation campaign fit.',
      inputs: {},
      expectedOutputs: ['Fit score', 'Reasons', 'Recommended angle'],
    }],
  },
  {
    ...internalCapability(
      'crm.import-client-prospects',
      'Import Client Prospects',
      'Create Client CRM prospect records from approved enriched prospects.',
      ['import', 'persist', 'create'],
      ['crm', 'sales', 'client operations'],
      'transformation',
    ),
    status: 'ready',
    languageGames: ['crm operations', 'persistence'],
    familyClusters: ['crm-prospecting', 'client-records', 'local-campaigns'],
    formOfLife: 'local-business-development',
    inputSchema: {
      type: 'object',
      properties: {
        prospects: { type: 'array', description: 'Approved enriched prospects to create as Clients.' },
        priority: { type: 'string', description: 'Default CRM priority.' },
        portalEnabled: { type: 'boolean', description: 'Whether to create portal-enabled records.' },
      },
      required: ['prospects'],
    },
    outputContract: { fields: [
      outputField('created_client_ids', 'Created Client record identifiers', 'json'),
      outputField('failed_imports', 'Failed imports and reasons', 'markdown-list'),
      outputField('summary', 'Import summary'),
    ] },
    routing: { minTier: 'fast', preferredTier: 'fast', requiresJson: true, dataSensitivity: 'internal' },
    safety: { axioms: ['WRITE', 'VALIDATE'], typeLevel: 2, sideEffects: ['database-write'], approvalRequired: false },
    economics: { typicalInputTokens: 1600, typicalOutputTokens: 700 },
    examples: [{
      goal: 'Import the selected local agency prospects into the CRM.',
      inputs: { prospects: [] },
      expectedOutputs: ['Created Client IDs', 'Import summary'],
    }],
  },
  {
    ...internalCapability(
      'crm.extract-website-contact-info',
      'Extract Website Contact Info',
      'Fetch or parse a business website and extract public emails, phone numbers, contact pages, and leadership names.',
      ['extract', 'research'],
      ['crm', 'local prospecting', 'sales', 'contact enrichment'],
      'extraction',
    ),
    status: 'ready',
    languageGames: ['research', 'extraction'],
    familyClusters: ['crm-prospecting', 'contact-enrichment', 'local-campaigns'],
    formOfLife: 'local-business-development',
    inputSchema: {
      type: 'object',
      properties: {
        website: { type: 'string', description: 'Business website URL.' },
        html: { type: 'string', description: 'Optional provided HTML to parse without fetching.' },
        maxPages: { type: 'number', description: 'Maximum website pages to scan.' },
      },
      required: ['website'],
    },
    outputContract: { fields: [
      outputField('emails', 'Public email addresses found on the website', 'json'),
      outputField('phones', 'Phone numbers found on the website', 'json'),
      outputField('contactPageUrls', 'Contact/about/team page URLs', 'json'),
      outputField('people', 'Public people or leadership names discovered', 'json'),
      outputField('confidence', 'Contact extraction confidence', 'number'),
    ] },
    routing: { minTier: 'fast', preferredTier: 'fast', requiresJson: true, dataSensitivity: 'public' },
    safety: { axioms: ['READ', 'TRANSFORM', 'VALIDATE'], typeLevel: 1, sideEffects: ['external-read'], approvalRequired: false },
    economics: { typicalInputTokens: 1200, typicalOutputTokens: 700 },
    examples: [{
      goal: 'Find the public contact path for this local roofing company.',
      inputs: { website: 'https://example.com' },
      expectedOutputs: ['Emails', 'Phones', 'Contact page URLs', 'People'],
    }],
  },
  {
    ...rendererCapability(
      'crm.draft-local-automation-outreach',
      'Draft Local Automation Outreach',
      'Draft professional local automation outreach using CRM prospect facts, fit score, and selected use cases.',
      ['draft', 'write', 'build'],
      ['crm', 'sales', 'local campaigns', 'outreach'],
      'generation',
    ),
    status: 'ready',
    languageGames: ['generation', 'sales outreach'],
    familyClusters: ['crm-prospecting', 'local-campaigns', 'sales-outreach'],
    formOfLife: 'local-business-development',
    outputContract: { fields: [
      outputField('email_draft', 'Prospect email draft'),
      outputField('linkedin_note', 'Short LinkedIn connection note'),
      outputField('call_opener', 'Phone opener or voicemail script'),
    ] },
    safety: { axioms: ['READ', 'GENERATE', 'VALIDATE'], typeLevel: 1, sideEffects: ['none'], approvalRequired: false },
    examples: [{
      goal: 'Draft outreach for a local law firm about automating intake and follow-up.',
      inputs: {},
      expectedOutputs: ['Email draft', 'LinkedIn note', 'Call opener'],
    }],
  },
  {
    ...rendererCapability(
      'crm.build-local-campaign-worklist',
      'Build Local Campaign Worklist',
      'Turn selected CRM prospects into a prioritized local automation campaign plan.',
      ['build', 'plan', 'prioritize'],
      ['crm', 'sales', 'local campaigns', 'operations'],
      'synthesis',
    ),
    status: 'ready',
    languageGames: ['planning', 'sales operations'],
    familyClusters: ['crm-prospecting', 'local-campaigns', 'sales-worklists'],
    formOfLife: 'local-business-development',
    outputContract: { fields: [
      outputField('segments', 'Campaign segments', 'json'),
      outputField('daily_worklist', 'Daily outreach worklist', 'table'),
      outputField('success_metrics', 'Campaign success metrics', 'markdown-list'),
    ] },
    safety: { axioms: ['READ', 'DECIDE', 'GENERATE', 'VALIDATE'], typeLevel: 1, sideEffects: ['none'], approvalRequired: false },
    examples: [{
      goal: 'Build a two-week local automation campaign worklist for selected prospects.',
      inputs: {},
      expectedOutputs: ['Segments', 'Daily worklist', 'Success metrics'],
    }],
  },
];

function internalCapability(
  id: string,
  name: string,
  description: string,
  goalVerbs: string[],
  domains: string[],
  kind: TaskKind,
): ToolCapability {
  const complexity: TaskComplexity = kind === 'evaluation' || kind === 'extraction' || kind === 'classification' ? 'routine' : 'complex';
  const axioms = defaultAxioms(kind);
  return {
    id,
    name,
    description,
    executionMode: 'internal',
    status: 'planned',
    goalVerbs,
    businessDomains: domains,
    languageGames: [languageGameFromKind(kind)],
    familyClusters: domains,
    formOfLife: 'business-operations',
    inputSchema: { type: 'object', properties: {}, required: [] },
    outputContract: { fields: [outputField('result', description)] },
    task: { kind, complexity, defaultStakes: 'team', reversible: true, isIntermediateDefault: true },
    routing: routeDefaults(kind, complexity, 'team'),
    safety: { axioms, typeLevel: typeLevelForAxioms(axioms), sideEffects: ['none'], approvalRequired: false },
    economics: { typicalInputTokens: 2500, typicalOutputTokens: 900 },
    examples: [{ goal: description, inputs: {}, expectedOutputs: ['Structured result'] }],
  };
}

function rendererCapability(
  id: string,
  name: string,
  description: string,
  goalVerbs: string[],
  domains: string[],
  kind: TaskKind,
): ToolCapability {
  const cap = internalCapability(id, name, description, goalVerbs, domains, kind);
  return {
    ...cap,
    executionMode: 'renderer',
    task: { ...cap.task, defaultStakes: 'client', isIntermediateDefault: false },
    routing: { ...routeDefaults(kind, 'complex', 'client'), preferredTier: 'balanced' },
    economics: { typicalInputTokens: 5000, typicalOutputTokens: 1800 },
  };
}

function roadmapCapability(spec: RoadmapCapabilitySpec): ToolCapability {
  const base = spec.executionMode === 'renderer'
    ? rendererCapability(spec.id, spec.name, spec.description, spec.goalVerbs, spec.domains, spec.kind)
    : internalCapability(spec.id, spec.name, spec.description, spec.goalVerbs, spec.domains, spec.kind);
  const complexity = spec.complexity ?? base.task.complexity;
  const stakes = spec.stakes ?? base.task.defaultStakes;
  const routing = routeDefaults(spec.kind, complexity, stakes);

  return {
    ...base,
    status: 'planned',
    businessDomains: uniq(spec.domains),
    languageGames: uniq(spec.languageGames),
    familyClusters: uniq([spec.familyCluster, ...spec.domains]),
    formOfLife: spec.formOfLife,
    inputSchema: objectSchema({
      goal: 'Business goal or subtask the capability should support.',
      sourceMaterial: 'Optional source material, facts, notes, records, or prior step outputs.',
      context: 'Optional business context envelope.',
    }),
    outputContract: {
      fields: spec.outputs.map(([key, description, format]) => outputField(key, description, format)),
    },
    task: {
      ...base.task,
      complexity,
      defaultStakes: stakes,
      isIntermediateDefault: spec.executionMode === 'renderer' ? false : base.task.isIntermediateDefault,
    },
    routing: {
      ...routing,
      preferredTier:
        spec.kind === 'reasoning' || complexity === 'strategic'
          ? 'smart'
          : routing.preferredTier,
    },
    economics: {
      typicalInputTokens: spec.executionMode === 'renderer' ? 5000 : complexity === 'strategic' ? 6500 : 3200,
      typicalOutputTokens: spec.executionMode === 'renderer' ? 1800 : 1100,
    },
    examples: [{
      goal: spec.description,
      inputs: {},
      expectedOutputs: spec.outputs.map(([, description]) => description),
    }],
  };
}

export const MANUAL_TOOL_CAPABILITIES: ToolCapability[] = [
  ...buildDagCapabilities(),
  ...RFP_CAPABILITIES,
  ...FIRST_AGENT_TOOL_CAPABILITIES,
  ...ROADMAP_BUSINESS_CAPABILITIES,
  ...CRM_PROSPECTING_CAPABILITIES,
];

export const CAPABILITY_ROADMAP_FAMILIES = [
  { familyCluster: 'business-intake-planning', label: 'Business intake and planning' },
  { familyCluster: 'research-intelligence', label: 'Research and intelligence' },
  { familyCluster: 'financial-operating-analysis', label: 'Financial and operating analysis' },
  { familyCluster: 'sales-customer-success', label: 'Sales and customer success' },
  { familyCluster: 'marketing-content-operations', label: 'Marketing and content operations' },
  { familyCluster: 'legal-compliance-governance', label: 'Legal, compliance, and governance' },
  { familyCluster: 'people-recruiting', label: 'People and recruiting' },
  { familyCluster: 'deliverable-renderers', label: 'Deliverable renderers' },
  { familyCluster: 'quality-evaluator', label: 'Quality and evaluator skills' },
] as const;

export function summarizeCapabilityRoadmapCoverage(
  registry = MANUAL_TOOL_CAPABILITIES,
): CapabilityRoadmapFamilyStatus[] {
  return CAPABILITY_ROADMAP_FAMILIES.map((family) => {
    const expectedCapabilityIds = ROADMAP_CAPABILITY_SPECS
      .filter((spec) => spec.familyCluster === family.familyCluster)
      .map((spec) => spec.id);
    const registered = expectedCapabilityIds
      .map((id) => registry.find((capability) => capability.id === id))
      .filter((capability): capability is ToolCapability => Boolean(capability));
    const familyCapabilities = registry.filter((capability) =>
      capability.familyClusters.map(normalize).includes(normalize(family.familyCluster)),
    );
    return {
      ...family,
      expectedCapabilityIds,
      registeredCount: registered.length,
      readyCount: familyCapabilities.filter((capability) => capability.status === 'ready').length,
      plannedCount: familyCapabilities.filter((capability) => capability.status === 'planned').length,
      missingCapabilityIds: expectedCapabilityIds.filter((id) => !registry.some((capability) => capability.id === id)),
    };
  });
}

export function listToolCapabilities(options?: { includePlanned?: boolean }): ToolCapability[] {
  const includePlanned = options?.includePlanned ?? true;
  return MANUAL_TOOL_CAPABILITIES.filter((capability) => includePlanned || capability.status === 'ready');
}

export function getToolCapability(id: string): ToolCapability | undefined {
  return MANUAL_TOOL_CAPABILITIES.find((capability) => capability.id === id);
}

export function capabilitiesForSourceSkill(skillId: string): ToolCapability[] {
  return MANUAL_TOOL_CAPABILITIES.filter((capability) => capability.sourceSkillId === skillId);
}

export function buildCapabilityCoverageRows(
  capabilities = MANUAL_TOOL_CAPABILITIES,
  skillIds: string[] = [],
): CapabilityCoverageRow[] {
  const rows = capabilities.map((capability): CapabilityCoverageRow => {
    const base = {
      skillId: capability.sourceSkillId ?? capability.id,
      capabilityId: capability.id,
      capabilityExists: true,
      outputContractExists: capability.outputContract.fields.length > 0,
      russellianAxiomsPresent: capability.safety.axioms.length > 0,
      wittgensteinianLanguageGamesPresent:
        capability.languageGames.length > 0 &&
        capability.familyClusters.length > 0 &&
        Boolean(capability.formOfLife),
      defaultModelTier: capability.routing.preferredTier ?? capability.routing.minTier,
      sideEffectsDeclared: capability.safety.sideEffects.length > 0,
      examplesPresent: capability.examples.length > 0,
      status: capability.status,
    };
    return withCoverageReadiness(base);
  });

  const covered = new Set(rows.map((row) => row.skillId));
  for (const skillId of skillIds) {
    if (covered.has(skillId)) continue;
    rows.push(withCoverageReadiness({
      skillId,
      capabilityExists: false,
      outputContractExists: false,
      russellianAxiomsPresent: false,
      wittgensteinianLanguageGamesPresent: false,
      sideEffectsDeclared: false,
      examplesPresent: false,
      status: 'missing',
    }));
  }

  return rows.sort((a, b) => a.skillId.localeCompare(b.skillId));
}

function withCoverageReadiness(
  row: Omit<CapabilityCoverageRow, 'readinessScore' | 'missingFields' | 'recommendedAction'>,
): CapabilityCoverageRow {
  const checks: Array<[string, boolean]> = [
    ['capability', row.capabilityExists],
    ['output-contract', row.outputContractExists],
    ['axioms', row.russellianAxiomsPresent],
    ['language-games', row.wittgensteinianLanguageGamesPresent],
    ['side-effects', row.sideEffectsDeclared],
    ['examples', row.examplesPresent],
  ];
  const missingFields = checks.filter(([, ok]) => !ok).map(([key]) => key);
  const readinessScore = (checks.length - missingFields.length) / checks.length;
  const recommendedAction =
    missingFields.length === 0
      ? 'Ready for agent planning.'
      : row.capabilityExists
        ? `Add ${missingFields.join(', ')} metadata.`
        : 'Create ToolCapability descriptor from source skill.';
  return {
    ...row,
    readinessScore,
    missingFields,
    recommendedAction,
  };
}

export function filterCapabilityCoverageRows(
  rows: CapabilityCoverageRow[],
  filter: CapabilityCoverageFilter = {},
): CapabilityCoverageRow[] {
  const search = normalize(filter.search ?? '');
  return rows.filter((row) => {
    if (filter.status && filter.status !== 'all' && row.status !== filter.status) return false;
    if (filter.missing && filter.missing !== 'all' && !row.missingFields.includes(filter.missing)) return false;
    if (!search) return true;
    return normalize([
      row.skillId,
      row.capabilityId ?? '',
      row.defaultModelTier ?? '',
      row.status,
      row.missingFields.join(' '),
      row.recommendedAction,
    ].join(' ')).includes(search);
  });
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function capabilityCoverageRowsToCsv(rows: CapabilityCoverageRow[]): string {
  const header = [
    'skill_id',
    'capability_id',
    'status',
    'readiness_score',
    'missing_fields',
    'default_model_tier',
    'recommended_action',
  ];
  const body = rows.map((row) => [
    row.skillId,
    row.capabilityId ?? '',
    row.status,
    row.readinessScore.toFixed(2),
    row.missingFields.join('|'),
    row.defaultModelTier ?? '',
    row.recommendedAction,
  ]);
  return [header, ...body].map((line) => line.map(csvCell).join(',')).join('\n');
}

function sideEffectAllowed(capability: ToolCapability, safety: ToolCapabilitySearchQuery['sideEffectSafety']): boolean {
  if (!safety || safety === 'allow-any') return true;
  const readOnly = capability.safety.sideEffects.every((effect) => effect === 'none' || effect === 'external-read');
  if (safety === 'read-only') return readOnly;
  if (safety === 'allow-approved') return readOnly || capabilityRequiresApproval(capability);
  return true;
}

function arrayOverlapScore(
  capabilityValues: string[],
  queryValues: string[] | undefined,
  weight: number,
  label: string,
): { score: number; reasons: string[] } {
  if (!queryValues || queryValues.length === 0) return { score: 0, reasons: [] };
  const cap = new Set(capabilityValues.map(normalize));
  const hits = queryValues.map(normalize).filter((value) => cap.has(value));
  return {
    score: hits.length * weight,
    reasons: hits.map((hit) => `${label}:${hit}`),
  };
}

export function searchCapabilities(query: ToolCapabilitySearchQuery, registry = MANUAL_TOOL_CAPABILITIES): ToolCapabilitySearchResult[] {
  const goalTokens = tokens(query.goal);
  const results: ToolCapabilitySearchResult[] = [];

  for (const capability of registry) {
    if (query.requireExecutable && !isSkillExecutableCapability(capability)) continue;
    if (!sideEffectAllowed(capability, query.sideEffectSafety)) continue;
    if (query.provider && capability.routing.allowedProviders && !capability.routing.allowedProviders.includes(query.provider)) continue;
    if (query.maxTier && tierIndex(capability.routing.minTier) > tierIndex(query.maxTier)) continue;
    if (query.minTier && tierIndex(capability.routing.minTier) < tierIndex(query.minTier)) continue;

    let score = 0;
    const reasons: string[] = [];
    const searchableText = normalize([
      capability.id,
      capability.name,
      capability.description,
      capability.sourceSkillId ?? '',
      capability.goalVerbs.join(' '),
      capability.businessDomains.join(' '),
      capability.languageGames.join(' '),
      capability.familyClusters.join(' '),
      capability.outputContract.fields.map((f) => `${f.key} ${f.description}`).join(' '),
      capability.examples.map((e) => e.goal).join(' '),
    ].join(' '));

    for (const token of goalTokens) {
      if (token.length >= 3 && searchableText.includes(token)) {
        score += 1;
        reasons.push(`goal:${token}`);
      }
    }

    for (const scored of [
      arrayOverlapScore(capability.goalVerbs, query.goalVerbs, 6, 'verb'),
      arrayOverlapScore(capability.businessDomains, query.businessDomains, 8, 'domain'),
      arrayOverlapScore(capability.languageGames, query.languageGames, 5, 'game'),
      arrayOverlapScore(capability.familyClusters, query.familyClusters, 5, 'family'),
      arrayOverlapScore(capability.outputContract.fields.map((f) => f.key), query.outputFields, 6, 'output'),
    ]) {
      score += scored.score;
      reasons.push(...scored.reasons);
    }

    if (query.goal && normalize(capability.name).includes(normalize(query.goal))) {
      score += 10;
      reasons.push('name-exact-ish');
    }

    if (score > 0 || !query.goal) {
      results.push({ capability, score, reasons });
    }
  }

  return results
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.capability.name.localeCompare(b.capability.name);
    })
    .slice(0, query.limit ?? 20);
}

export function agenticStepFromCapability(
  capability: ToolCapability,
  index: number,
  dependsOn: string[] = [],
): AgenticStep {
  return {
    id: `goal-step-${index + 1}-${capability.id.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    capabilityId: capability.id,
    skillId: capability.sourceSkillId ?? capability.id,
    executionMode: capability.executionMode,
    name: capability.name,
    description: capability.description,
    dependsOn,
    outputContract: capability.outputContract,
    contextRequirements: capability.contextRequirements,
    routing: {
      kind: capability.task.kind,
      complexity: capability.task.complexity,
      stakes: capability.task.defaultStakes,
      minTier: capability.routing.minTier,
      maxTier: capability.routing.maxTier,
      preferredTier: capability.routing.preferredTier,
      allowedProviders: capability.routing.allowedProviders,
      requiresJson: capability.routing.requiresJson,
      requiresToolCalling: capability.routing.requiresToolCalling,
      dataSensitivity: capability.routing.dataSensitivity,
    },
  };
}
