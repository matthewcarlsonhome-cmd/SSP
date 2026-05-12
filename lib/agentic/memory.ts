/**
 * Entity memory and fact extraction framework.
 *
 * This module is intentionally independent from Supabase. Persistence remains
 * in supabaseClient/persistence; memory here defines the policy and shapes for
 * extracting facts, filtering active facts, building graph context, and
 * recording correction events.
 */

export type BusinessEntityType =
  | 'client'
  | 'account'
  | 'deal'
  | 'campaign'
  | 'project'
  | 'document'
  | 'person'
  | 'portfolio';

export interface EntityRef {
  type: BusinessEntityType;
  id: string;
  label?: string;
}

export interface MemoryFact {
  entity: EntityRef;
  key: string;
  value: unknown;
  confidence: number;
  sourceRunId?: string | null;
  sourceStepId?: string | null;
  validFrom: string;
  validUntil?: string | null;
}

export interface FactExtractionPolicy {
  id: string;
  workflowId?: string;
  stepId?: string;
  fieldKey: string;
  entityType: BusinessEntityType;
  entityIdField?: string;
  entityIdFallback?: string;
  factKey: string;
  confidence: number;
  ttlDays?: number;
}

export interface FactExtractionInput {
  workflowId: string;
  stepId: string;
  structuredFields: Record<string, unknown>;
  sourceRunId?: string | null;
  now?: Date;
  policies?: FactExtractionPolicy[];
}

export interface EntityGraphNode {
  entity: EntityRef;
  facts: MemoryFact[];
}

export interface EntityGraphEdge {
  from: EntityRef;
  to: EntityRef;
  relation: string;
  confidence: number;
}

export interface EntityGraph {
  nodes: EntityGraphNode[];
  edges: EntityGraphEdge[];
}

export interface MemoryContextEnvelope {
  focusEntity?: EntityRef;
  facts: MemoryFact[];
  graph: EntityGraph;
  summary: string;
}

export interface MemoryCorrection {
  fact: MemoryFact;
  correctedValue: unknown;
  correctedBy?: string;
  correctedAt: string;
  reason?: string;
}

export interface MemoryFactScore {
  fact: MemoryFact;
  score: number;
  reasons: string[];
}

export const DEFAULT_FACT_POLICIES: FactExtractionPolicy[] = [
  {
    id: 'ppc-triage-p1',
    workflowId: 'ppc-master-weekly-workflow',
    stepId: 'step-1-triage',
    fieldKey: 'p1_accounts',
    entityType: 'account',
    entityIdField: 'account',
    factKey: 'priority',
    confidence: 0.9,
    ttlDays: 14,
  },
  {
    id: 'ppc-triage-p2',
    workflowId: 'ppc-master-weekly-workflow',
    stepId: 'step-1-triage',
    fieldKey: 'p2_accounts',
    entityType: 'account',
    entityIdField: 'account',
    factKey: 'priority',
    confidence: 0.9,
    ttlDays: 14,
  },
  {
    id: 'ppc-triage-p3',
    workflowId: 'ppc-master-weekly-workflow',
    stepId: 'step-1-triage',
    fieldKey: 'p3_accounts',
    entityType: 'account',
    entityIdField: 'account',
    factKey: 'priority',
    confidence: 0.9,
    ttlDays: 14,
  },
  {
    id: 'portfolio-wasted-spend',
    workflowId: 'ppc-master-weekly-workflow',
    stepId: 'step-3-search-terms',
    fieldKey: 'wasted_spend_estimate',
    entityType: 'portfolio',
    entityIdFallback: 'ssp-mcc',
    factKey: 'wasted_spend_estimate_weekly',
    confidence: 0.7,
    ttlDays: 30,
  },
  {
    id: 'goal-risk-summary',
    fieldKey: 'risks',
    entityType: 'project',
    entityIdFallback: 'current-goal',
    factKey: 'open_risks',
    confidence: 0.65,
    ttlDays: 30,
  },
];

function addDays(date: Date, days: number): string {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function coerceArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value ? [value] : [];
    }
  }
  return value === undefined || value === null ? [] : [value];
}

function readObjectField(value: unknown, field: string | undefined): string | null {
  if (!field) return null;
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const direct = record[field];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  for (const fallback of ['account', 'account_name', 'client', 'client_name', 'name', 'id']) {
    const fallbackValue = record[fallback];
    if (typeof fallbackValue === 'string' && fallbackValue.trim()) return fallbackValue.trim();
  }
  return null;
}

function policyApplies(policy: FactExtractionPolicy, input: FactExtractionInput): boolean {
  if (policy.workflowId && policy.workflowId !== input.workflowId) return false;
  if (policy.stepId && policy.stepId !== input.stepId) return false;
  return Object.prototype.hasOwnProperty.call(input.structuredFields, policy.fieldKey);
}

export function extractFactsFromStepOutput(input: FactExtractionInput): MemoryFact[] {
  const now = input.now ?? new Date();
  const facts: MemoryFact[] = [];
  const policies = input.policies ?? DEFAULT_FACT_POLICIES;

  for (const policy of policies) {
    if (!policyApplies(policy, input)) continue;
    const fieldValue = input.structuredFields[policy.fieldKey];
    const values = coerceArray(fieldValue);
    for (const value of values) {
      const entityId = readObjectField(value, policy.entityIdField) ?? policy.entityIdFallback;
      if (!entityId) continue;
      let factValue: unknown = value;
      if (policy.factKey === 'priority') {
        if (policy.fieldKey.includes('p1')) factValue = 'P1';
        if (policy.fieldKey.includes('p2')) factValue = 'P2';
        if (policy.fieldKey.includes('p3')) factValue = 'P3';
      }
      facts.push({
        entity: { type: policy.entityType, id: entityId },
        key: policy.factKey,
        value: factValue,
        confidence: policy.confidence,
        sourceRunId: input.sourceRunId ?? null,
        sourceStepId: input.stepId,
        validFrom: now.toISOString(),
        validUntil: policy.ttlDays ? addDays(now, policy.ttlDays) : null,
      });
    }
  }

  return facts;
}

export function filterActiveFacts(facts: MemoryFact[], now = new Date()): MemoryFact[] {
  return facts.filter((fact) => !fact.validUntil || new Date(fact.validUntil).getTime() > now.getTime());
}

function entityKey(entity: EntityRef): string {
  return `${entity.type}:${entity.id}`;
}

export function buildEntityGraph(facts: MemoryFact[]): EntityGraph {
  const nodeMap = new Map<string, EntityGraphNode>();
  const edges: EntityGraphEdge[] = [];

  for (const fact of facts) {
    const key = entityKey(fact.entity);
    if (!nodeMap.has(key)) nodeMap.set(key, { entity: fact.entity, facts: [] });
    nodeMap.get(key)!.facts.push(fact);

    if (fact.key.endsWith('_id') && typeof fact.value === 'string') {
      const relation = fact.key.replace(/_id$/, '');
      const to: EntityRef = { type: relation as BusinessEntityType, id: fact.value };
      edges.push({ from: fact.entity, to, relation, confidence: fact.confidence });
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

export function buildMemoryContextEnvelope(args: {
  focusEntity?: EntityRef;
  facts: MemoryFact[];
  now?: Date;
  maxFacts?: number;
}): MemoryContextEnvelope {
  const active = filterActiveFacts(args.facts, args.now).slice(0, args.maxFacts ?? 50);
  const graph = buildEntityGraph(active);
  const focusPrefix = args.focusEntity ? `${args.focusEntity.type}:${args.focusEntity.id}` : 'business context';
  const summary =
    active.length === 0
      ? `No active memory facts for ${focusPrefix}.`
      : `${active.length} active memory fact(s) available for ${focusPrefix}.`;
  return {
    focusEntity: args.focusEntity,
    facts: active,
    graph,
    summary,
  };
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((part) => part.length >= 3),
  );
}

function factSearchText(fact: MemoryFact): string {
  const value =
    typeof fact.value === 'string'
      ? fact.value
      : fact.value && typeof fact.value === 'object'
        ? JSON.stringify(fact.value)
        : String(fact.value ?? '');
  return `${fact.entity.type} ${fact.entity.id} ${fact.entity.label ?? ''} ${fact.key} ${value}`;
}

export function scoreMemoryFactForGoal(args: {
  fact: MemoryFact;
  goal: string;
  domainHints?: string[];
  focusEntity?: EntityRef;
  now?: Date;
}): MemoryFactScore {
  const now = args.now ?? new Date();
  const reasons: string[] = [];
  let score = args.fact.confidence;

  if (
    args.focusEntity &&
    args.fact.entity.type === args.focusEntity.type &&
    args.fact.entity.id === args.focusEntity.id
  ) {
    score += 0.45;
    reasons.push('matches focus entity');
  }

  const goalTerms = tokenize(`${args.goal} ${(args.domainHints ?? []).join(' ')}`);
  const factTerms = tokenize(factSearchText(args.fact));
  const overlap = Array.from(goalTerms).filter((term) => factTerms.has(term)).length;
  if (overlap > 0) {
    score += Math.min(0.35, overlap * 0.08);
    reasons.push(`${overlap} goal term match${overlap === 1 ? '' : 'es'}`);
  }

  if (args.fact.validUntil && new Date(args.fact.validUntil).getTime() <= now.getTime()) {
    score -= 1;
    reasons.push('expired');
  }

  const ageMs = Math.max(0, now.getTime() - new Date(args.fact.validFrom).getTime());
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 14) {
    score += 0.1;
    reasons.push('recent');
  } else if (ageDays > 90) {
    score -= 0.1;
    reasons.push('older than 90 days');
  }

  return {
    fact: args.fact,
    score,
    reasons,
  };
}

export function rankMemoryFactsForGoal(args: {
  facts: MemoryFact[];
  goal: string;
  domainHints?: string[];
  focusEntity?: EntityRef;
  now?: Date;
  limit?: number;
}): MemoryFactScore[] {
  return args.facts
    .map((fact) => scoreMemoryFactForGoal({
      fact,
      goal: args.goal,
      domainHints: args.domainHints,
      focusEntity: args.focusEntity,
      now: args.now,
    }))
    .filter((scored) => !scored.reasons.includes('expired'))
    .sort((a, b) => b.score - a.score)
    .slice(0, args.limit ?? 50);
}

export function applyMemoryCorrection(correction: MemoryCorrection): MemoryFact {
  return {
    ...correction.fact,
    value: correction.correctedValue,
    confidence: 1,
    validFrom: correction.correctedAt,
    validUntil: correction.fact.validUntil ?? null,
  };
}

export function memoryFactsToKeyValue(facts: MemoryFact[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const fact of facts) {
    out[`${fact.entity.type}:${fact.entity.id}:${fact.key}`] = fact.value;
  }
  return out;
}
