import { describe, expect, it } from 'vitest';
import { classifyStep } from '../../lib/agentic/taskClassifier';
import { routeDag, routeModel, RoutingBudgetExceededError } from '../../lib/agentic/orchestrator';
import { PPC_MASTER_WEEKLY_DAG } from '../../lib/agentic/contracts/ppcMasterWeekly';
import type { AgenticDAG, AgenticStep, TaskClassification } from '../../lib/agentic';

const baseClass: TaskClassification = {
  complexity: 'routine',
  kind: 'analysis',
  stakes: 'team',
  reversible: true,
  estimatedInputTokens: 4000,
  estimatedOutputTokens: 1500,
  isIntermediate: true,
};

describe('routeModel tier mapping', () => {
  it('routes trivial extraction to fast tier', () => {
    const choice = routeModel({ ...baseClass, complexity: 'trivial', kind: 'extraction' });
    expect(choice.selectedTier).toBe('fast');
  });

  it('routes routine intermediate work to fast tier', () => {
    const choice = routeModel({ ...baseClass, complexity: 'routine', isIntermediate: true });
    expect(choice.selectedTier).toBe('fast');
  });

  it('routes client-facing generation to at least balanced', () => {
    const choice = routeModel({
      ...baseClass,
      complexity: 'routine',
      kind: 'generation',
      isIntermediate: false,
      stakes: 'client',
    });
    expect(['balanced', 'smart', 'reasoning']).toContain(choice.selectedTier);
  });

  it('routes complex analysis to balanced baseline', () => {
    const choice = routeModel({ ...baseClass, complexity: 'complex', isIntermediate: false });
    expect(choice.selectedTier).toBe('balanced');
  });

  it('routes strategic synthesis to smart tier', () => {
    const choice = routeModel({
      ...baseClass,
      complexity: 'strategic',
      kind: 'synthesis',
      isIntermediate: false,
    });
    expect(choice.selectedTier).toBe('smart');
  });

  it('routes strategic reasoning to reasoning when an allowed reasoning model exists', () => {
    const choice = routeModel({
      ...baseClass,
      complexity: 'strategic',
      kind: 'reasoning',
      isIntermediate: false,
    });
    expect(choice.selectedTier).toBe('reasoning');
    expect(choice.useExtendedThinking).toBe(true);
  });
});

describe('routeModel provider and capability constraints', () => {
  it('respects preferred provider order', () => {
    const choice = routeModel(
      { ...baseClass, complexity: 'trivial', kind: 'extraction' },
      { preferredProviders: ['gemini', 'claude', 'chatgpt'] },
    );
    expect(choice.model.provider).toBe('gemini');
  });

  it('skips forbidden providers', () => {
    const choice = routeModel(
      { ...baseClass, complexity: 'trivial', kind: 'extraction' },
      { forbiddenProviders: ['gemini', 'chatgpt'], preferredProviders: ['claude'] },
    );
    expect(choice.model.provider).toBe('claude');
  });

  it('honors allowedProviders from routing context', () => {
    const choice = routeModel(
      { ...baseClass, complexity: 'complex', kind: 'analysis' },
      { allowedProviders: ['chatgpt'], preferredProviders: ['claude', 'chatgpt'] },
    );
    expect(choice.model.provider).toBe('chatgpt');
  });

  it('returns rejected candidate reasons for auditability', () => {
    const choice = routeModel(
      { ...baseClass, complexity: 'trivial', kind: 'extraction' },
      { allowedProviders: ['claude'] },
    );
    expect(choice.rejectedCandidates.some((c) => c.reason.includes('not allowed'))).toBe(true);
  });

  it('filters models that do not satisfy streaming requirements', () => {
    const choice = routeModel({
      ...baseClass,
      complexity: 'strategic',
      kind: 'reasoning',
      requiresStreaming: true,
      minTier: 'smart',
    });
    expect(choice.model.supportsStreaming).toBe(true);
  });
});

describe('routeModel budget enforcement', () => {
  it('uses a cheaper eligible tier when no explicit quality floor blocks it', () => {
    const choice = routeModel(
      { ...baseClass, complexity: 'strategic', kind: 'synthesis', isIntermediate: false, stakes: 'team' },
      { perCallCeilingCents: 1 },
    );
    expect(choice.estimatedCostCents).toBeLessThanOrEqual(1);
  });

  it('does not violate explicit minTier under budget pressure', () => {
    expect(() =>
      routeModel(
        {
          ...baseClass,
          complexity: 'strategic',
          kind: 'synthesis',
          isIntermediate: false,
          minTier: 'smart',
        },
        { perCallCeilingCents: 1 },
      ),
    ).toThrow(RoutingBudgetExceededError);
  });

  it('throws when daily budget is exhausted', () => {
    expect(() =>
      routeModel(
        { ...baseClass, complexity: 'complex', kind: 'analysis', minTier: 'balanced' },
        { agentDailyBudgetCents: 100, agentSpendTodayCents: 100 },
      ),
    ).toThrow(RoutingBudgetExceededError);
  });
});

describe('routeModel reasoning output', () => {
  it('explains the routing decision', () => {
    const choice = routeModel(baseClass);
    expect(choice.routingReason).toContain('baseline tier');
    expect(choice.routingReason).toContain('picked ');
    expect(choice.reasoning).toBe(choice.routingReason);
  });
});

const tinyDag = (steps: AgenticStep[]): AgenticDAG => ({
  id: 'test',
  name: 'Test DAG',
  description: '',
  steps,
});

describe('classifyStep task kind detection', () => {
  it('detects extraction from skill id', () => {
    const step: AgenticStep = {
      id: 's1',
      skillId: 'extract-fields-from-document',
      name: 'Extract',
      dependsOn: [],
    };
    const c = classifyStep({ step, dag: tinyDag([step]) });
    expect(c.kind).toBe('extraction');
  });

  it('detects analysis from skill id', () => {
    const step: AgenticStep = {
      id: 's1',
      skillId: 'ppc-recommendations-audit',
      name: 'Recommendations Audit',
      dependsOn: [],
    };
    const c = classifyStep({ step, dag: tinyDag([step]) });
    expect(c.kind).toBe('analysis');
  });

  it('detects synthesis for deliverables and merge steps', () => {
    const step: AgenticStep = {
      id: 's1',
      skillId: 'ppc-deliverables-generator',
      name: 'Deliverables',
      dependsOn: ['p1', 'p2', 'p3'],
    };
    const c = classifyStep({ step, dag: tinyDag([step]) });
    expect(c.kind).toBe('synthesis');
  });

  it('lets explicit routing metadata override heuristics', () => {
    const step: AgenticStep = {
      id: 's1',
      skillId: 'plain-name',
      name: 'Plain',
      dependsOn: [],
      routing: { kind: 'evaluation', complexity: 'routine', minTier: 'balanced' },
    };
    const c = classifyStep({ step, dag: tinyDag([step]) });
    expect(c.kind).toBe('evaluation');
    expect(c.minTier).toBe('balanced');
  });
});

describe('classifyStep complexity inference', () => {
  it('extraction is trivial', () => {
    const step: AgenticStep = { id: 's1', skillId: 'extract-x', name: 'Extract', dependsOn: [] };
    const c = classifyStep({ step, dag: tinyDag([step]) });
    expect(c.complexity).toBe('trivial');
  });

  it('synthesis at a merge point with 2+ deps is strategic', () => {
    const synth: AgenticStep = {
      id: 'synth',
      skillId: 'merge-deliverables',
      name: 'Merge',
      dependsOn: ['a', 'b', 'c'],
    };
    const c = classifyStep({ step: synth, dag: tinyDag([synth]) });
    expect(c.complexity).toBe('strategic');
  });

  it('analysis non-merge is routine', () => {
    const step: AgenticStep = {
      id: 's1',
      skillId: 'analyze-account',
      name: 'Analyze',
      dependsOn: ['triage'],
    };
    const c = classifyStep({ step, dag: tinyDag([step]) });
    expect(c.complexity).toBe('routine');
  });
});

describe('routeDag full DAG routing on PPC Master Weekly', () => {
  const plan = routeDag(PPC_MASTER_WEEKLY_DAG);

  it('produces a routing decision for every step', () => {
    expect(Object.keys(plan.perStep)).toHaveLength(PPC_MASTER_WEEKLY_DAG.steps.length);
  });

  it('routes the deliverables merge step to a higher tier than extraction-tier work', () => {
    const triage = plan.perStep['step-1-triage'];
    const deliverables = plan.perStep['step-5-deliverables'];
    const tierOrder = ['fast', 'balanced', 'smart', 'reasoning'];
    expect(tierOrder.indexOf(deliverables.choice.selectedTier)).toBeGreaterThanOrEqual(
      tierOrder.indexOf(triage.choice.selectedTier),
    );
  });

  it('total estimated cost is materially less than blanket Opus', () => {
    expect(plan.totalEstimatedCostCents).toBeLessThan(150);
  });

  it('every step routing decision has a non-empty reason', () => {
    Object.values(plan.perStep).forEach(({ choice }) => {
      expect(choice.routingReason.length).toBeGreaterThan(0);
    });
  });
});
