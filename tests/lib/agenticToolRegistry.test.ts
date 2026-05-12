import { describe, expect, it } from 'vitest';
import {
  buildCapabilityCoverageRows,
  capabilityCoverageRowsToCsv,
  capabilityFromLibrarySkill,
  capabilityRequiresApproval,
  canExecuteBusinessCapability,
  executeBusinessCapability,
  filterCapabilityCoverageRows,
  getToolCapability,
  isSkillExecutableCapability,
  listToolCapabilities,
  searchCapabilities,
  summarizeCapabilityRoadmapCoverage,
  taskClassificationFromCapability,
  toQualityEventRow,
  toSkillExecutionRow,
  routeModel,
} from '../../lib/agentic';
import type { LibrarySkill } from '../../lib/skillLibrary/types';

function sampleLibrarySkill(): LibrarySkill {
  return {
    id: 'sample-market-brief',
    name: 'Market Brief Builder',
    description: 'Analyze market notes and build a client-ready brief.',
    longDescription: 'Turns research notes into a concise client-ready market brief.',
    whatYouGet: ['Market summary', 'Risks and opportunities', 'Recommended next actions'],
    estimatedTimeSaved: '2 hours',
    tags: {
      roles: ['marketer', 'founder'],
      category: 'analysis',
      useCases: ['daily-work'],
      level: 'intermediate',
      custom: ['market intelligence'],
    },
    source: 'builtin',
    theme: { primary: 'text-blue-500', secondary: 'bg-blue-500/10', gradient: 'from-blue-500/20 to-transparent' },
    inputs: [
      { id: 'researchNotes', label: 'Research notes', type: 'textarea', validation: { required: true } },
    ],
    prompts: {
      systemInstruction: 'You are a business analyst.',
      userPromptTemplate: 'Build a market brief from {{researchNotes}}.',
      outputFormat: 'markdown',
    },
    config: {
      recommendedModel: 'claude',
      useWebSearch: true,
      maxTokens: 1800,
      temperature: 0.2,
    },
    useCount: 0,
    rating: { sum: 0, count: 0 },
  };
}

describe('tool capability registry', () => {
  it('adapts a LibrarySkill into an agent-facing ToolCapability', () => {
    const capability = capabilityFromLibrarySkill(sampleLibrarySkill());
    expect(capability.id).toBe('skill.sample-market-brief');
    expect(capability.sourceSkillId).toBe('sample-market-brief');
    expect(capability.inputSchema).toMatchObject({
      type: 'object',
      required: ['researchNotes'],
    });
    expect(capability.outputContract.fields.map((field) => field.description)).toContain('Market summary');
    expect(capability.routing.allowedProviders).toEqual(['claude']);
    expect(capability.safety.sideEffects).toEqual(['external-read']);
  });

  it('finds PPC capabilities from contextual language without exact skill names', () => {
    const results = searchCapabilities({
      goal: 'Prepare the weekly paid media operating packet for priority client accounts.',
      businessDomains: ['ppc'],
      sideEffectSafety: 'read-only',
      requireExecutable: true,
      limit: 10,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.capability.sourceSkillId === 'ppc-weekly-triage')).toBe(true);
  });

  it('finds CRM local prospecting capabilities for local automation campaigns', () => {
    const results = searchCapabilities({
      goal: 'Find local law firms in Milwaukee and draft an automation outreach campaign.',
      businessDomains: ['local prospecting'],
      sideEffectSafety: 'allow-approved',
      limit: 10,
    });

    const ids = results.map((result) => result.capability.id);
    expect(ids).toContain('crm.find-local-businesses');
    expect(ids).toContain('crm.draft-local-automation-outreach');
  });

  it('treats executable CRM tools as executable capabilities without source skills', () => {
    const results = searchCapabilities({
      goal: 'Extract public contact info from a prospect website.',
      businessDomains: ['contact enrichment'],
      requireExecutable: true,
      limit: 10,
    });

    expect(results.map((result) => result.capability.id)).toContain('crm.extract-website-contact-info');
    expect(getToolCapability('crm.extract-website-contact-info')?.sourceSkillId).toBeUndefined();
  });

  it('treats side-effect capabilities as requiring policy handling', () => {
    const capability = getToolCapability('persist-business-facts');
    expect(capability).toBeTruthy();
    expect(capabilityRequiresApproval(capability!)).toBe(true);
    expect(capability?.safety.approvalRequired).toBe(true);
  });

  it('registers the first 12 anchor agent tools as executable typed capabilities', () => {
    const anchorIds = [
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

    for (const id of anchorIds) {
      const capability = getToolCapability(id);
      expect(capability, id).toBeTruthy();
      expect(capability?.status, id).toBe('ready');
      expect(capability?.outputContract.fields.length, id).toBeGreaterThan(0);
      expect(isSkillExecutableCapability(capability!), id).toBe(true);
      expect(canExecuteBusinessCapability(id), id).toBe(true);
    }
  });

  it('covers each highest-value roadmap family with typed planned capabilities', () => {
    const coverage = summarizeCapabilityRoadmapCoverage();
    expect(coverage.map((family) => family.familyCluster)).toEqual([
      'business-intake-planning',
      'research-intelligence',
      'financial-operating-analysis',
      'sales-customer-success',
      'marketing-content-operations',
      'legal-compliance-governance',
      'people-recruiting',
      'deliverable-renderers',
      'quality-evaluator',
    ]);
    expect(coverage.every((family) => family.missingCapabilityIds.length === 0)).toBe(true);
    expect(coverage.every((family) => family.registeredCount > 0)).toBe(true);
  });

  it('finds roadmap capabilities by business goal without exact skill names', () => {
    const finance = searchCapabilities({
      goal: 'Model best base worst case scenarios and write an ROI narrative for leadership.',
      businessDomains: ['finance'],
      sideEffectSafety: 'read-only',
      limit: 12,
    }).map((result) => result.capability.id);

    expect(finance).toContain('finance.scenario-modeling');
    expect(finance).toContain('finance.roi-narrative');

    const board = searchCapabilities({
      goal: 'Create a board brief with key decisions and risks.',
      businessDomains: ['leadership'],
      sideEffectSafety: 'read-only',
      limit: 10,
    }).map((result) => result.capability.id);

    expect(board).toContain('renderer.board-brief');
  });

  it('keeps planned roadmap descriptors separate from currently executable tools', () => {
    const executable = listToolCapabilities({ includePlanned: false }).map((capability) => capability.id);
    expect(executable).toContain('extract-business-goal');
    expect(executable).toContain('crm.find-local-businesses');
    expect(executable).not.toContain('finance.scenario-modeling');
  });

  it('executes anchor business capabilities without a monolithic UI skill', async () => {
    const result = await executeBusinessCapability('extract-business-goal', {
      goal: 'Draft a client email by Friday about the PPC budget constraint.',
      goalContext: { audience: 'client' },
    });

    expect(result.structuredFields).toMatchObject({
      goal: 'Draft a client email by Friday about the PPC budget constraint.',
      audience: 'client',
    });
    expect(result.structuredFields.constraints).toEqual(expect.arrayContaining([
      expect.stringContaining('budget constraint'),
    ]));
    expect(result.rawOutput).toContain('requested_outputs');
  });

  it('routes models using capability routing constraints', () => {
    const capability = getToolCapability('rfp-response-center.step-executive-summary');
    expect(capability).toBeTruthy();
    const classification = taskClassificationFromCapability(capability!);
    const choice = routeModel(classification);
    expect(['balanced', 'smart', 'reasoning']).toContain(choice.selectedTier);
    expect(choice.selectedTier).not.toBe('fast');
  });

  it('reports capability coverage for agent-ready migration checks', () => {
    const rows = buildCapabilityCoverageRows();
    const ppcRow = rows.find((row) => row.skillId === 'ppc-weekly-triage');
    expect(ppcRow).toBeTruthy();
    expect(ppcRow?.capabilityExists).toBe(true);
    expect(ppcRow?.outputContractExists).toBe(true);
    expect(ppcRow?.russellianAxiomsPresent).toBe(true);
    expect(ppcRow?.wittgensteinianLanguageGamesPresent).toBe(true);
  });

  it('reports missing coverage rows for library skills not yet described as capabilities', () => {
    const rows = buildCapabilityCoverageRows([], ['missing-library-skill']);
    expect(rows).toEqual([
      expect.objectContaining({
        skillId: 'missing-library-skill',
        capabilityExists: false,
        outputContractExists: false,
        russellianAxiomsPresent: false,
        wittgensteinianLanguageGamesPresent: false,
        sideEffectsDeclared: false,
        examplesPresent: false,
        status: 'missing',
        readinessScore: 0,
      }),
    ]);
    expect(rows[0].recommendedAction).toContain('Create ToolCapability');
  });

  it('filters and exports capability coverage migration rows', () => {
    const rows = buildCapabilityCoverageRows([], ['missing-library-skill', 'another-library-skill']);
    const filtered = filterCapabilityCoverageRows(rows, { missing: 'capability', search: 'missing-library' });
    expect(filtered).toHaveLength(1);
    const csv = capabilityCoverageRowsToCsv(filtered);
    expect(csv).toContain('skill_id,capability_id,status');
    expect(csv).toContain('missing-library-skill');
  });
});

describe('agentic persistence row shape', () => {
  it('serializes routing metadata and estimated usage into the insert row', () => {
    const row = toSkillExecutionRow({
      agentRunId: 'run-1',
      skillId: 'skill-1',
      stepId: 'step-1',
      roundIndex: 0,
      status: 'succeeded',
      inputs: {},
      rawOutput: 'done',
      structuredOutput: { summary: 'done' },
      durationMs: 123,
      modelId: 'claude-3-5-haiku-latest',
      modelProvider: 'claude',
      modelTier: 'fast',
      priceSnapshotId: 'snapshot',
      estimatedCostCents: 0.42,
      tokensIn: 1200,
      tokensOut: 300,
      routingReason: 'test route',
      routingRejectedCandidates: [{ modelId: 'x', reason: 'not allowed' }],
    });

    expect(row).toMatchObject({
      agent_run_id: 'run-1',
      skill_id: 'skill-1',
      step_id: 'step-1',
      model_id: 'claude-3-5-haiku-latest',
      model_provider: 'claude',
      model_tier: 'fast',
      estimated_cost_cents: 0.42,
      actual_cost_cents: 0.42,
      tokens_in: 1200,
      tokens_out: 300,
      routing_reason: 'test route',
    });
  });

  it('serializes actual token usage and actual cost when attribution has provider usage', () => {
    const row = toSkillExecutionRow({
      agentRunId: 'run-1',
      skillId: 'skill-1',
      stepId: 'step-1',
      roundIndex: 0,
      status: 'succeeded',
      inputs: {},
      estimatedCostCents: 0.42,
      actualCostCents: 0.31,
      tokensIn: 800,
      tokensOut: 220,
      tokensCachedRead: 100,
      tokensReasoning: 30,
    });

    expect(row).toMatchObject({
      cost_cents: 0.31,
      estimated_cost_cents: 0.42,
      actual_cost_cents: 0.31,
      tokens_in: 800,
      tokens_out: 220,
      tokens_cached_read: 100,
      tokens_reasoning: 30,
    });
  });

  it('serializes quality metrics into the insert row', () => {
    const row = toQualityEventRow({
      agentRunId: 'run-1',
      workflowId: 'workflow-1',
      stepId: 'step-1',
      skillId: 'skill-1',
      roundIndex: 0,
      modelId: 'claude-3-5-haiku-latest',
      modelProvider: 'claude',
      modelTier: 'fast',
      status: 'succeeded',
      decision: 'retry',
      contractCompleteness: 0.5,
      requiredFields: ['summary', 'risks'],
      presentRequiredFields: ['summary'],
      missingRequiredFields: ['risks'],
      reasons: ['Missing required fields: risks.'],
    });

    expect(row).toMatchObject({
      agent_run_id: 'run-1',
      workflow_id: 'workflow-1',
      step_id: 'step-1',
      skill_id: 'skill-1',
      round_index: 0,
      model_id: 'claude-3-5-haiku-latest',
      model_provider: 'claude',
      model_tier: 'fast',
      evaluator_id: 'deterministic-contract',
      status: 'succeeded',
      decision: 'retry',
      contract_completeness: 0.5,
      required_fields: ['summary', 'risks'],
      present_required_fields: ['summary'],
      missing_required_fields: ['risks'],
      retry_count: 0,
      reasons: ['Missing required fields: risks.'],
    });
  });
});
