import { describe, expect, it } from 'vitest';
import {
  assessRunQuality,
  buildReplanDecision,
  escalationTier,
  planShadowRoute,
  routeModel,
  summarizeRouterTuningMetrics,
  type AgenticDAG,
  type StepRunResult,
  type TaskClassification,
} from '../../lib/agentic';

const dag: AgenticDAG = {
  id: 'quality-test',
  name: 'Quality Test',
  description: 'Quality Test',
  steps: [
    {
      id: 'analyze',
      skillId: 'analyze-account',
      name: 'Analyze',
      dependsOn: [],
      outputContract: {
        fields: [
          { key: 'summary', description: 'Summary', format: 'text', required: true },
          { key: 'risks', description: 'Risks', format: 'markdown-list', required: true },
        ],
      },
    },
  ],
};

function result(fields: Record<string, unknown>): StepRunResult {
  return {
    stepId: 'analyze',
    skillId: 'analyze-account',
    status: 'succeeded',
    rawOutput: 'A useful analysis output that is long enough for the quality gate.',
    structuredFields: fields,
    durationMs: 100,
    routing: {
      modelId: 'claude-3-5-haiku-latest',
      modelProvider: 'claude',
      modelTier: 'fast',
      priceSnapshotId: 'snapshot',
      estimatedUsage: { inputTokens: 1000, outputTokens: 500 },
      estimatedCostCents: 0.2,
      routingReason: 'test',
      rejectedCandidates: [],
    },
  };
}

describe('replanner quality framework', () => {
  it('measures contract completeness and recommends retry for missing required fields', () => {
    const report = assessRunQuality(dag, { analyze: result({ summary: 'ok' }) });
    expect(report.contractCompletenessAvg).toBe(0.5);
    expect(report.retryStepIds).toEqual(['analyze']);
  });

  it('escalates after retry threshold and computes the next model tier', () => {
    const report = assessRunQuality(dag, { analyze: result({ summary: 'ok' }) });
    const decision = buildReplanDecision(report, [{ stepId: 'analyze', attempts: 1, lastTier: 'fast' }]);
    expect(decision.decision).toBe('escalate');
    expect(decision.escalateStepIds).toEqual(['analyze']);
    expect(escalationTier('fast')).toBe('balanced');
  });

  it('plans shadow routes for downshift experiments when possible', () => {
    const task: TaskClassification = {
      complexity: 'complex',
      kind: 'analysis',
      stakes: 'team',
      reversible: true,
      estimatedInputTokens: 4000,
      estimatedOutputTokens: 1500,
      isIntermediate: false,
    };
    const productionChoice = routeModel(task);
    const shadow = planShadowRoute(task, productionChoice);
    expect(shadow.productionChoice).toBe(productionChoice);
    expect(typeof shadow.eligible).toBe('boolean');
  });

  it('summarizes router tuning metrics by tier', () => {
    const report = assessRunQuality(dag, { analyze: result({ summary: 'ok', risks: ['one'] }) });
    const metrics = summarizeRouterTuningMetrics(report.assessments, { analyze: result({ summary: 'ok', risks: ['one'] }) });
    expect(metrics.totalSteps).toBe(1);
    expect(metrics.byTier.fast.calls).toBe(1);
    expect(metrics.averageContractCompleteness).toBe(1);
  });
});
