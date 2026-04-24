/**
 * Tests for tier-2 hand-authored DAGs and the document-intake module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  HAND_AUTHORED_DAGS,
  buildExecutionRounds,
  summarizeParallelism,
  SALES_ACCOUNT_PURSUIT_DAG,
  CUSTOMER_CHURN_PREVENTION_DAG,
  SEO_CLIENT_ONBOARDING_DAG,
  MARKETING_CAMPAIGN_DAG,
  DIGITAL_MARKETING_AUDIT_DAG,
  TIER_2_HAND_AUTHORED_DAGS,
} from '../../lib/agentic';
import { extractIntake } from '../../lib/agentic/intake';

vi.mock('../../lib/agentic/providers', () => ({
  runPrompt: vi.fn(),
}));

import { runPrompt } from '../../lib/agentic/providers';

describe('tier-2 hand-authored DAGs', () => {
  it('all tier-2 DAGs are merged into the global HAND_AUTHORED_DAGS registry', () => {
    Object.keys(TIER_2_HAND_AUTHORED_DAGS).forEach((id) => {
      expect(HAND_AUTHORED_DAGS[id]).toBeDefined();
      expect(HAND_AUTHORED_DAGS[id].id).toBe(id);
    });
  });

  it('every DAG step has dependsOn explicitly set (no implicit chaining)', () => {
    Object.values(TIER_2_HAND_AUTHORED_DAGS).forEach((dag) => {
      dag.steps.forEach((s) => {
        expect(Array.isArray(s.dependsOn)).toBe(true);
      });
    });
  });

  it('every DAG step has an output contract', () => {
    Object.values(TIER_2_HAND_AUTHORED_DAGS).forEach((dag) => {
      dag.steps.forEach((s) => {
        expect(s.outputContract).toBeDefined();
        expect(s.outputContract!.fields.length).toBeGreaterThan(0);
      });
    });
  });

  it('Sales Account Pursuit collapses 6 steps into 4 rounds with parallel branching', () => {
    const stats = summarizeParallelism(SALES_ACCOUNT_PURSUIT_DAG);
    expect(stats.totalSteps).toBe(6);
    expect(stats.rounds).toBeLessThan(6);
    expect(stats.maxParallel).toBeGreaterThan(1);
  });

  it('Customer Churn Prevention places escalation/retention/winback in fan-out from analysis', () => {
    const rounds = buildExecutionRounds(CUSTOMER_CHURN_PREVENTION_DAG);
    expect(rounds[0].stepIds).toEqual(['step-churn-analysis']);
    // The second round should contain at least escalation-brief and winback (retention depends on escalation).
    expect(rounds[1].stepIds.length).toBeGreaterThan(1);
  });

  it('SEO Onboarding has a fan-out at round 2 and a merge for content priorities', () => {
    const rounds = buildExecutionRounds(SEO_CLIENT_ONBOARDING_DAG);
    expect(rounds[0].stepIds).toEqual(['step-technical-audit']);
    const round2 = rounds[1].stepIds;
    expect(round2).toContain('step-keyword-research');
    expect(round2).toContain('step-ai-search-optimization');
    expect(round2).toContain('step-competitive-analysis');
    const priorities = SEO_CLIENT_ONBOARDING_DAG.steps.find(s => s.id === 'step-content-priorities');
    expect(priorities!.dependsOn.length).toBe(3);
  });

  it('Marketing Campaign Launch fans out 4 deliverables from content strategy', () => {
    const stats = summarizeParallelism(MARKETING_CAMPAIGN_DAG);
    expect(stats.totalSteps).toBe(6);
    expect(stats.maxParallel).toBeGreaterThanOrEqual(4);
  });

  it('Digital Marketing Audit merges 3 audit areas into recommendations', () => {
    const recs = DIGITAL_MARKETING_AUDIT_DAG.steps.find(s => s.id === 'step-recommendations');
    expect(recs).toBeDefined();
    expect(recs!.dependsOn.length).toBe(3);
  });
});

describe('intake.extractIntake', () => {
  beforeEach(() => {
    vi.mocked(runPrompt).mockReset();
  });

  const fields = [
    { id: 'alertEmails', label: 'Alert emails' },
    { id: 'accountCount', label: 'Account count' },
  ];

  it('returns empty fields when document is empty', async () => {
    const result = await extractIntake({
      document: '',
      fields,
      provider: 'claude',
      apiKey: 'sk-test',
    });
    expect(result.fields.alertEmails).toBe('');
    expect(result.unmatched).toContain('alertEmails');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('populates fields from a valid LLM JSON response', async () => {
    vi.mocked(runPrompt).mockResolvedValue({
      text: JSON.stringify({
        alertEmails: '3 alerts about CPL spike on Acme account',
        accountCount: '47',
      }),
      durationMs: 50,
    });
    const result = await extractIntake({
      document: 'Subject: Weekly CPL alert. Body: ...',
      fields,
      provider: 'claude',
      apiKey: 'sk-test',
    });
    expect(result.fields.alertEmails).toContain('Acme');
    expect(result.fields.accountCount).toBe('47');
    expect(result.unmatched).toHaveLength(0);
  });

  it('marks fields the model couldn\'t populate as unmatched', async () => {
    vi.mocked(runPrompt).mockResolvedValue({
      text: JSON.stringify({ alertEmails: 'present', accountCount: '' }),
      durationMs: 10,
    });
    const result = await extractIntake({
      document: 'doc',
      fields,
      provider: 'claude',
      apiKey: 'sk-test',
    });
    expect(result.unmatched).toContain('accountCount');
    expect(result.unmatched).not.toContain('alertEmails');
  });

  it('falls back gracefully when the LLM call fails', async () => {
    vi.mocked(runPrompt).mockRejectedValue(new Error('429'));
    const result = await extractIntake({
      document: 'doc',
      fields,
      provider: 'claude',
      apiKey: 'sk-test',
    });
    expect(result.unmatched).toEqual(['alertEmails', 'accountCount']);
    expect(result.warnings[0]).toContain('429');
  });

  it('falls back gracefully when the LLM returns garbage', async () => {
    vi.mocked(runPrompt).mockResolvedValue({
      text: 'I cannot help with that request.',
      durationMs: 5,
    });
    const result = await extractIntake({
      document: 'doc',
      fields,
      provider: 'claude',
      apiKey: 'sk-test',
    });
    expect(result.unmatched).toEqual(['alertEmails', 'accountCount']);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
