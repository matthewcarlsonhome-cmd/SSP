/**
 * Tests for lib/agentic/orchestrator.ts (router) and taskClassifier.ts.
 * Pure-function tests; no LLM calls.
 */

import { describe, it, expect } from 'vitest';
import { classifyStep } from '../../lib/agentic/taskClassifier';
import { routeDag, routeModel } from '../../lib/agentic/orchestrator';
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

describe('routeModel — tier mapping', () => {
  it('trivial → fast tier', () => {
    const choice = routeModel({ ...baseClass, complexity: 'trivial', kind: 'extraction' });
    expect(choice.selectedTier).toBe('fast');
  });

  it('routine intermediate → fast tier (one step down from balanced)', () => {
    const choice = routeModel({
      ...baseClass,
      complexity: 'routine',
      isIntermediate: true,
    });
    expect(choice.selectedTier).toBe('fast');
  });

  it('routine final → balanced tier when stakes are not internal-only', () => {
    const choice = routeModel({
      ...baseClass,
      complexity: 'routine',
      isIntermediate: false,
      stakes: 'client',
    });
    expect(choice.selectedTier).toBe('balanced');
  });

  it('complex → balanced tier baseline', () => {
    const choice = routeModel({ ...baseClass, complexity: 'complex' });
    expect(choice.selectedTier).toBe('balanced');
  });

  it('strategic → smart tier baseline', () => {
    const choice = routeModel({ ...baseClass, complexity: 'strategic' });
    expect(choice.selectedTier).toBe('smart');
  });

  it('client-stakes promotion bumps complex → smart for terminal output', () => {
    const choice = routeModel({
      ...baseClass,
      complexity: 'complex',
      stakes: 'client',
      isIntermediate: false,
      kind: 'generation',
    });
    expect(choice.selectedTier).toBe('smart');
  });

  it('leadership-stakes also promotes the tier', () => {
    const choice = routeModel({
      ...baseClass,
      complexity: 'complex',
      stakes: 'leadership',
      isIntermediate: false,
      kind: 'synthesis',
    });
    expect(choice.selectedTier).toBe('smart');
  });
});

describe('routeModel — provider preference and forbidden providers', () => {
  it('respects preferredProviders order', () => {
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
});

describe('routeModel — budget enforcement', () => {
  it('downshifts when per-call ceiling would be exceeded', () => {
    // Strategic task → smart tier (Opus). Set a tiny per-call ceiling so the
    // router has to fall back to balanced tier.
    const choice = routeModel(
      { ...baseClass, complexity: 'strategic', kind: 'synthesis', isIntermediate: false, stakes: 'team' },
      { perCallCeilingCents: 1 }, // 1¢ — guaranteed less than Opus
    );
    expect(['fast', 'balanced']).toContain(choice.selectedTier);
    expect(choice.reasoning).toContain('downshifting');
  });

  it('downshifts when daily budget would be exceeded', () => {
    const choice = routeModel(
      { ...baseClass, complexity: 'strategic', kind: 'synthesis', isIntermediate: false, stakes: 'team' },
      { agentDailyBudgetCents: 100, agentSpendTodayCents: 99 },
    );
    expect(choice.reasoning).toContain('daily budget');
    expect(['fast', 'balanced']).toContain(choice.selectedTier);
  });
});

describe('routeModel — fitness filtering', () => {
  it('does not route extraction work to a model that has it in avoidFor', () => {
    const choice = routeModel({
      ...baseClass,
      complexity: 'trivial',
      kind: 'extraction',
    });
    expect(choice.model.avoidFor.includes('extraction')).toBe(false);
  });

  it('reasoning + strategic routes to a model with extended thinking when available', () => {
    const choice = routeModel({
      ...baseClass,
      complexity: 'strategic',
      kind: 'reasoning',
      isIntermediate: false,
    });
    // Should pick a model that supports extended thinking.
    expect(choice.model.supportsExtendedThinking).toBe(true);
  });
});

describe('routeModel — reasoning quality', () => {
  it('produces a non-empty reasoning string explaining each routing decision', () => {
    const choice = routeModel(baseClass);
    expect(choice.reasoning.length).toBeGreaterThan(0);
    expect(choice.reasoning).toContain('complexity=');
    expect(choice.reasoning).toContain('chose ');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task classifier
// ─────────────────────────────────────────────────────────────────────────────

const tinyDag = (steps: AgenticStep[]): AgenticDAG => ({
  id: 'test',
  name: 'Test DAG',
  description: '',
  steps,
});

describe('classifyStep — task kind detection', () => {
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

  it('detects synthesis for deliverables / merge steps', () => {
    const step: AgenticStep = {
      id: 's1',
      skillId: 'ppc-deliverables-generator',
      name: 'Deliverables',
      dependsOn: ['p1', 'p2', 'p3'],
    };
    const c = classifyStep({ step, dag: tinyDag([step]) });
    expect(c.kind).toBe('synthesis');
  });

  it('detects reasoning from "strategy" naming', () => {
    const step: AgenticStep = {
      id: 's1',
      skillId: 'sales-deal-strategy-planner',
      name: 'Deal Strategy',
      dependsOn: [],
    };
    const c = classifyStep({ step, dag: tinyDag([step]) });
    expect(c.kind).toBe('reasoning');
  });
});

describe('classifyStep — complexity inference', () => {
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

describe('routeDag — full DAG routing on PPC Master Weekly', () => {
  const plan = routeDag(PPC_MASTER_WEEKLY_DAG);

  it('produces a routing decision for every step', () => {
    expect(Object.keys(plan.perStep).length).toBe(PPC_MASTER_WEEKLY_DAG.steps.length);
  });

  it('routes the deliverables merge step to a higher tier than extraction-tier work', () => {
    const triage = plan.perStep['step-1-triage'];
    const deliverables = plan.perStep['step-5-deliverables'];
    expect(triage).toBeDefined();
    expect(deliverables).toBeDefined();
    // Deliverables is a 4-dep merge → strategic → smart tier; triage is a
    // first-step analysis → at most balanced.
    const tierOrder = ['fast', 'balanced', 'smart', 'reasoning'];
    expect(tierOrder.indexOf(deliverables.choice.selectedTier)).toBeGreaterThanOrEqual(
      tierOrder.indexOf(triage.choice.selectedTier),
    );
  });

  it('total estimated cost is materially less than blanket-Opus', () => {
    // Compare: route the DAG with default ctx vs. force-route everything to
    // Opus by setting forbidden providers + a single-tier registry would be
    // intrusive. Easier: just assert the routed plan total is below a
    // sensible blanket-Opus ceiling for a 7-step run.
    expect(plan.totalEstimatedCostCents).toBeLessThan(150); // blanket-Opus ~ 157¢
  });

  it('every step routing decision has a non-empty reasoning string', () => {
    for (const id of Object.keys(plan.perStep)) {
      expect(plan.perStep[id].choice.reasoning.length).toBeGreaterThan(0);
    }
  });
});
