import { describe, expect, it } from 'vitest';
import {
  buildGoalPlan,
  inspectGoalPlanReadiness,
  reviseGoalPlan,
  validateRussellianGraph,
  type AgenticDAG,
  type ToolCapability,
} from '../../lib/agentic';

function makeCapability(id: string, axioms: ToolCapability['safety']['axioms']): ToolCapability {
  return {
    id,
    sourceSkillId: id,
    name: id,
    description: id,
    executionMode: 'skill',
    status: 'ready',
    goalVerbs: ['build'],
    businessDomains: ['test'],
    languageGames: ['generation'],
    familyClusters: ['test'],
    formOfLife: 'test',
    inputSchema: { type: 'object', properties: {}, required: [] },
    outputContract: { fields: [{ key: 'summary', description: 'Summary', format: 'text', required: true }] },
    task: {
      kind: 'generation',
      complexity: 'routine',
      defaultStakes: 'team',
      reversible: true,
      isIntermediateDefault: true,
    },
    routing: { minTier: 'fast', dataSensitivity: 'internal' },
    safety: {
      axioms,
      typeLevel: axioms.includes('WRITE') ? 2 : 1,
      sideEffects: axioms.includes('WRITE') ? ['database-write'] : ['none'],
      approvalRequired: axioms.includes('WRITE'),
    },
    economics: { typicalInputTokens: 1000, typicalOutputTokens: 500 },
    examples: [{ goal: id, inputs: {}, expectedOutputs: ['summary'] }],
  };
}

describe('goal planner', () => {
  it('builds the first production-ish PPC operating packet DAG from a goal', () => {
    const plan = buildGoalPlan({
      goal: 'Create a weekly PPC operating packet for priority client accounts.',
      context: { audience: 'client', domainHints: ['paid media'] },
    });

    expect(plan.dag.id).toBe('ppc-master-weekly-workflow');
    expect(plan.dag.steps.length).toBeGreaterThan(0);
    expect(plan.dag.steps.every((step) => Boolean(step.capabilityId))).toBe(true);
    expect(plan.selectedCapabilities.length).toBe(plan.dag.steps.length);
    expect(plan.validation.russellian.valid).toBe(true);
    expect(plan.executionPlan.strategy).toBe('agentic');
    expect(plan.executionPlan.rounds.length).toBeGreaterThan(1);
    expect(plan.executionPlan.reasoning).toContain('selected hand-authored DAG');
  });

  it('builds an RFP DAG from capability descriptors even without a hand-authored agentic contract', () => {
    const plan = buildGoalPlan({
      goal: 'Analyze this RFP and create a compliance matrix, technical response, and executive summary.',
      context: { audience: 'client', domainHints: ['rfp'] },
    });

    expect(plan.dag.id).toBe('goal-rfp-response-center');
    expect(plan.dag.steps.map((step) => step.skillId)).toEqual([
      'business-analyst-rfp-requirements-analyzer',
      'business-analyst-rfp-compliance-matrix-generator',
      'business-analyst-rfp-section-response-writer',
      'business-analyst-proposal-executive-summary-generator',
    ]);
    expect(plan.validation.russellian.valid).toBe(true);
  });

  it('includes entity memory in the first executable input envelope', () => {
    const plan = buildGoalPlan({
      goal: 'Prepare a client account update.',
      context: {
        audience: 'client',
        entity: { type: 'account', id: 'Alpha' },
        memoryFacts: [
          {
            entity: { type: 'account', id: 'Alpha' },
            key: 'priority',
            value: 'P1',
            confidence: 0.9,
            validFrom: new Date().toISOString(),
          },
        ],
      },
    });

    expect(plan.memory.facts).toHaveLength(1);
    expect(plan.firstStepInput.memoryKeys).toMatchObject({
      'account:Alpha:priority': 'P1',
    });
  });

  it('builds a generic business-agent DAG from small executable anchor tools', () => {
    const plan = buildGoalPlan({
      goal: 'Clarify this business goal, identify risks, and build a work plan for the operations team.',
      context: { audience: 'team', domainHints: ['business intake', 'planning'] },
      maxCapabilities: 5,
    });

    const capabilityIds = plan.selectedCapabilities.map((capability) => capability.id);
    expect(capabilityIds).toContain('extract-business-goal');
    expect(capabilityIds).toContain('build-work-plan');
    expect(plan.dag.steps.every((step) => step.executionMode !== 'skill')).toBe(true);
    expect(plan.validation.russellian.valid).toBe(true);
    expect(inspectGoalPlanReadiness(plan).ready).toBe(true);
  });

  it('builds a CRM local automation campaign DAG from executable CRM capabilities', () => {
    const plan = buildGoalPlan({
      goal: 'Find 40 local law firms around Milwaukee and draft a two-week automation outreach campaign.',
      context: {
        audience: 'team',
        domainHints: ['crm', 'local prospecting', 'sales'],
        requireApprovalForSideEffects: true,
      },
      maxCapabilities: 6,
    });

    const capabilityIds = plan.selectedCapabilities.map((capability) => capability.id);
    expect(capabilityIds).toContain('crm.find-local-businesses');
    expect(capabilityIds).toContain('crm.draft-local-automation-outreach');
    expect(plan.dag.steps.some((step) => step.executionMode === 'internal' || step.executionMode === 'renderer')).toBe(true);
    expect(plan.validation.russellian.valid).toBe(true);
    expect(plan.firstStepInput).toMatchObject({
      businessType: 'law firms',
      location: 'Milwaukee',
      maxResults: 40,
    });
    expect(inspectGoalPlanReadiness(plan).ready).toBe(true);
  });

  it('reports missing source material before executing an RFP plan', () => {
    const plan = buildGoalPlan({
      goal: 'Analyze this RFP and create a compliance matrix.',
      context: { audience: 'client', domainHints: ['rfp'] },
    });

    const readiness = inspectGoalPlanReadiness(plan);
    expect(readiness.ready).toBe(false);
    expect(readiness.missingInputs.some((issue) => issue.inputKey === 'rfpContent')).toBe(true);
    expect(readiness.clarifyingQuestions.join(' ')).toContain('RFP content');

    const revised = reviseGoalPlan(plan, { rfpContent: 'RFP requirements and scope.' });
    expect(revised.action).toBe('ready');
    expect(revised.readiness.ready).toBe(true);
  });

  it('blocks a weekly PPC packet without an account export, snapshot, or entity', () => {
    const plan = buildGoalPlan({
      goal: 'Create a weekly PPC operating packet for priority client accounts.',
      context: { audience: 'client', domainHints: ['paid media'] },
    });

    const readiness = inspectGoalPlanReadiness(plan);
    expect(readiness.ready).toBe(false);
    expect(readiness.missingInputs.some((issue) => issue.inputKey === 'accountExport')).toBe(true);
  });

  it('flags invalid Russellian generate-to-write chains without validation', () => {
    const generate = makeCapability('generate-copy', ['READ', 'GENERATE']);
    const write = makeCapability('write-to-system', ['WRITE']);
    const dag: AgenticDAG = {
      id: 'invalid',
      name: 'Invalid',
      description: 'Invalid test DAG',
      steps: [
        { id: 'generate', capabilityId: generate.id, skillId: generate.sourceSkillId!, name: 'Generate', dependsOn: [] },
        { id: 'write', capabilityId: write.id, skillId: write.sourceSkillId!, name: 'Write', dependsOn: ['generate'] },
      ],
    };

    const result = validateRussellianGraph(dag, [generate, write]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('GENERATE feeds write WRITE without VALIDATE');
  });
});
