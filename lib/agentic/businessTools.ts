/**
 * Small executable business-agent capabilities.
 *
 * These tools are intentionally narrow and typed. They give the goal planner
 * safe, local primitives it can compose before it reaches for larger skills or
 * external connectors.
 */

export type BusinessCapabilityId =
  | 'extract-business-goal'
  | 'classify-business-context'
  | 'retrieve-entity-memory'
  | 'summarize-source-material'
  | 'identify-risks-and-open-questions'
  | 'prioritize-actions'
  | 'build-client-brief'
  | 'build-executive-brief'
  | 'build-email-draft'
  | 'build-work-plan'
  | 'evaluate-output-contract'
  | 'persist-business-facts';

export interface BusinessCapabilityExecutionResult {
  capabilityId: BusinessCapabilityId;
  rawOutput: string;
  structuredFields: Record<string, unknown>;
  durationMs: number;
}

const BUSINESS_CAPABILITY_IDS: BusinessCapabilityId[] = [
  'extract-business-goal',
  'classify-business-context',
  'retrieve-entity-memory',
  'summarize-source-material',
  'identify-risks-and-open-questions',
  'prioritize-actions',
  'build-client-brief',
  'build-executive-brief',
  'build-email-draft',
  'build-work-plan',
  'evaluate-output-contract',
  'persist-business-facts',
];

const DOMAIN_KEYWORDS: Array<[string, string[]]> = [
  ['crm', ['crm', 'prospect', 'client record', 'local business']],
  ['ppc', ['ppc', 'paid media', 'google ads', 'campaign performance']],
  ['sales', ['sales', 'deal', 'pipeline', 'discovery', 'objection']],
  ['customer success', ['customer success', 'churn', 'renewal', 'qbr']],
  ['marketing', ['marketing', 'campaign', 'content', 'email sequence']],
  ['finance', ['budget', 'forecast', 'roi', 'unit economics', 'scenario']],
  ['governance', ['contract', 'compliance', 'policy', 'risk', 'regulatory']],
  ['people', ['candidate', 'interview', 'performance review', 'staffing']],
  ['research', ['research', 'competitor', 'market scan', 'customer voice']],
];

export function canExecuteBusinessCapability(capabilityId: string | undefined): capabilityId is BusinessCapabilityId {
  return Boolean(capabilityId && BUSINESS_CAPABILITY_IDS.includes(capabilityId as BusinessCapabilityId));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(inputs: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = inputs[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  for (const value of Object.values(inputs)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const nested = value as Record<string, unknown>;
    for (const key of keys) {
      const nestedValue = nested[key];
      if (typeof nestedValue === 'string' && nestedValue.trim()) return nestedValue.trim();
    }
  }
  return fallback;
}

function arrayValue<T = unknown>(inputs: Record<string, unknown>, keys: string[]): T[] {
  for (const key of keys) {
    const value = inputs[key];
    if (Array.isArray(value)) return value as T[];
  }
  for (const value of Object.values(inputs)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const nested = value as Record<string, unknown>;
    for (const key of keys) {
      const nestedValue = nested[key];
      if (Array.isArray(nestedValue)) return nestedValue as T[];
    }
  }
  return [];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function sentenceList(value: string): string[] {
  return value
    .split(/[\n.;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function inferDomainTags(text: string, hints: unknown): string[] {
  const haystack = normalize(`${text} ${Array.isArray(hints) ? hints.join(' ') : ''}`);
  const tags = DOMAIN_KEYWORDS
    .filter(([, words]) => words.some((word) => haystack.includes(normalize(word))))
    .map(([domain]) => domain);
  return Array.from(new Set(tags.length > 0 ? tags : ['business operations']));
}

function inferDeadline(text: string): string | undefined {
  const explicit = text.match(/\b(?:by|before|on)\s+([A-Z][A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|tomorrow|next\s+\w+)\b/i);
  return explicit?.[1];
}

function inferAudience(text: string, fallback: unknown): string {
  if (typeof fallback === 'string' && fallback.trim()) return fallback.trim();
  const normalized = normalize(text);
  if (/(board|ceo|leadership|executive)/.test(normalized)) return 'leadership';
  if (/(client|customer|prospect|rfp)/.test(normalized)) return 'client';
  if (/(team|manager|ops)/.test(normalized)) return 'team';
  return 'internal';
}

function inferStakes(audience: string): string {
  if (audience === 'leadership') return 'leadership';
  if (audience === 'client') return 'client';
  if (audience === 'internal') return 'internal';
  return 'team';
}

function inferDataSensitivity(text: string, audience: string): string {
  const normalized = normalize(text);
  if (/(health|legal|contract|regulated|pii|personal data|finance)/.test(normalized)) return 'regulated';
  if (audience === 'client' || audience === 'leadership') return 'client-confidential';
  return 'internal';
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function textBlock(inputs: Record<string, unknown>): string {
  return stringValue(inputs, ['sourceMaterial', 'source', 'notes', 'content', 'rawText', 'goal'], JSON.stringify(inputs));
}

function summarizeMaterial(inputs: Record<string, unknown>): Record<string, unknown> {
  const source = textBlock(inputs);
  const points = sentenceList(source).slice(0, 6);
  return {
    summary: points.length > 0 ? points.slice(0, 2).join('. ') : 'No source material was provided.',
    key_points: points,
    source_gaps: source.length < 80 ? ['Source material is short; confirm important facts before using externally.'] : [],
  };
}

function markdownList(values: unknown): string[] {
  if (Array.isArray(values)) return values.map(String).filter(Boolean);
  if (typeof values === 'string') return sentenceList(values);
  return [];
}

function render(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .map(([key, value]) => {
      const display = Array.isArray(value) ? value.map((item) => `- ${String(item)}`).join('\n') : String(value ?? '');
      return `## ${key}\n${display}`;
    })
    .join('\n\n');
}

function buildGoalFields(inputs: Record<string, unknown>): Record<string, unknown> {
  const goal = stringValue(inputs, ['goal', 'request', 'objective'], 'Clarify the business goal.');
  const context = asRecord(inputs.goalContext);
  const audience = inferAudience(goal, context.audience);
  const constraints = unique([
    ...markdownList(inputs.constraints),
    ...sentenceList(goal).filter((part) => /(must|without|budget|constraint|approval|deadline)/i.test(part)),
  ]);
  return {
    goal,
    audience,
    deadline: stringValue(inputs, ['deadline'], inferDeadline(goal) ?? ''),
    constraints,
    success_criteria: markdownList(inputs.successCriteria).length > 0
      ? markdownList(inputs.successCriteria)
      : ['Outcome is specific, useful to the intended audience, and ready for review.'],
    requested_outputs: markdownList(inputs.requestedOutputs).length > 0
      ? markdownList(inputs.requestedOutputs)
      : sentenceList(goal).filter((part) => /(brief|email|plan|packet|deck|dashboard|model|matrix)/i.test(part)),
  };
}

function buildWorkPlanFields(inputs: Record<string, unknown>): Record<string, unknown> {
  const goal = stringValue(inputs, ['goal', 'objective'], 'Complete the requested business goal.');
  const actions = markdownList(inputs.actions).length > 0
    ? markdownList(inputs.actions)
    : [
        'Confirm goal, audience, deadline, and constraints.',
        'Gather source material and durable entity facts.',
        'Run the smallest relevant analysis capabilities.',
        'Render the requested deliverable.',
        'Evaluate quality and route corrections before handoff.',
      ];
  return {
    work_plan: actions.map((action, index) => ({
      order: index + 1,
      action,
      owner: index === 0 ? 'request owner' : 'business agent',
      status: 'planned',
    })),
    milestones: ['intake complete', 'analysis complete', 'deliverable ready', 'quality approved'],
    owners: ['request owner', 'business agent'],
    goal,
  };
}

function evaluateContract(inputs: Record<string, unknown>): Record<string, unknown> {
  const output = asRecord(inputs.output ?? inputs.structuredFields ?? inputs);
  const required = arrayValue<string>(inputs, ['requiredFields']);
  const present = required.filter((key) => output[key] !== undefined && output[key] !== null && output[key] !== '');
  const missing = required.filter((key) => !present.includes(key));
  const completeness = required.length === 0 ? 1 : present.length / required.length;
  return {
    completeness_score: Number(completeness.toFixed(2)),
    missing_fields: missing,
    decision: missing.length === 0 ? 'pass' : 'revise',
    notes: missing.length === 0 ? ['All required fields are present.'] : [`Missing required fields: ${missing.join(', ')}.`],
  };
}

function extractFacts(inputs: Record<string, unknown>): Record<string, unknown> {
  const facts = arrayValue<Record<string, unknown>>(inputs, ['facts', 'memoryFacts']);
  const structured = asRecord(inputs.structuredFields ?? inputs.output);
  const generated = Object.entries(structured)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .slice(0, 12)
    .map(([key, value]) => ({ key, value, confidence: 0.7 }));
  return {
    facts: facts.length > 0 ? facts : generated,
    entity_refs: [asRecord(inputs.entity ?? asRecord(inputs.goalContext).entity)].filter((entity) => entity.type || entity.id),
    persistence_summary: 'Prepared durable business facts for policy-gated persistence.',
  };
}

export async function executeBusinessCapability(
  capabilityId: BusinessCapabilityId,
  inputs: Record<string, unknown>,
): Promise<BusinessCapabilityExecutionResult> {
  const startedAt = Date.now();
  const goal = stringValue(inputs, ['goal', 'objective', 'request'], '');
  const context = asRecord(inputs.goalContext);
  let structuredFields: Record<string, unknown>;

  switch (capabilityId) {
    case 'extract-business-goal':
      structuredFields = buildGoalFields(inputs);
      break;
    case 'classify-business-context': {
      const audience = inferAudience(goal, context.audience);
      structuredFields = {
        domain_tags: inferDomainTags(goal, context.domainHints),
        stakes: inferStakes(audience),
        data_sensitivity: inferDataSensitivity(goal, audience),
        workflow_hint: stringValue(inputs, ['workflowHint'], ''),
        side_effects: /(send|create|update|import|publish|launch)/i.test(goal) ? ['potential-side-effect'] : ['none'],
      };
      break;
    }
    case 'retrieve-entity-memory':
      structuredFields = {
        memory_summary: stringValue(inputs, ['memorySummary'], 'No durable memory was supplied.'),
        memory_keys: asRecord(inputs.memoryKeys),
        relevant_facts: arrayValue(inputs, ['memoryFacts', 'facts']),
      };
      break;
    case 'summarize-source-material':
      structuredFields = summarizeMaterial(inputs);
      break;
    case 'identify-risks-and-open-questions':
      structuredFields = {
        risks: markdownList(inputs.risks).length > 0 ? markdownList(inputs.risks) : ['Source facts may be incomplete or stale.'],
        open_questions: markdownList(inputs.openQuestions).length > 0 ? markdownList(inputs.openQuestions) : ['What source material should be treated as authoritative?'],
        assumptions: markdownList(inputs.assumptions).length > 0 ? markdownList(inputs.assumptions) : ['The agent should avoid external side effects unless explicitly approved.'],
        missing_inputs: markdownList(inputs.missingInputs),
      };
      break;
    case 'prioritize-actions':
      structuredFields = {
        prioritized_actions: buildWorkPlanFields(inputs).work_plan,
        rationale: 'Prioritized by dependency order, customer impact, urgency, and reversibility.',
        owners: buildWorkPlanFields(inputs).owners,
      };
      break;
    case 'build-client-brief':
      structuredFields = {
        client_brief: `Client update: ${goal || 'requested business update'}`,
        recommendations: markdownList(inputs.recommendations).length > 0 ? markdownList(inputs.recommendations) : ['Approve the next best action after reviewing risks and assumptions.'],
        next_steps: markdownList(inputs.nextSteps).length > 0 ? markdownList(inputs.nextSteps) : ['Confirm priorities.', 'Assign owners.', 'Schedule follow-up.'],
      };
      break;
    case 'build-executive-brief':
      structuredFields = {
        executive_brief: `Executive brief: ${goal || 'business decision summary'}`,
        decisions_needed: markdownList(inputs.decisionsNeeded).length > 0 ? markdownList(inputs.decisionsNeeded) : ['Confirm the recommended path.'],
        metrics: markdownList(inputs.metrics),
      };
      break;
    case 'build-email-draft':
      structuredFields = {
        subject: stringValue(inputs, ['subject'], goal ? `Next steps: ${goal.slice(0, 72)}` : 'Next steps'),
        email_body: `Hi,\n\nHere is the concise update on ${goal || 'the requested work'}.\n\nRecommended next step: confirm priorities and approve the proposed plan.\n\nBest,`,
        call_to_action: stringValue(inputs, ['callToAction'], 'Reply with any edits or approval to proceed.'),
      };
      break;
    case 'build-work-plan':
      structuredFields = buildWorkPlanFields(inputs);
      break;
    case 'evaluate-output-contract':
      structuredFields = evaluateContract(inputs);
      break;
    case 'persist-business-facts':
      structuredFields = extractFacts(inputs);
      break;
    default:
      structuredFields = { result: 'Unsupported business capability.' };
  }

  return {
    capabilityId,
    rawOutput: render(structuredFields),
    structuredFields,
    durationMs: Date.now() - startedAt,
  };
}
