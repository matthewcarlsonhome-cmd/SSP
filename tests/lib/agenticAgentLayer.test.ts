/**
 * Tests for the agent / policy / evaluator / triggers layer.
 *
 * These do not exercise live persistence (supabase is intentionally a no-op
 * when env vars are missing) — they cover decision logic, registry
 * correctness, and dispatcher routing.
 */

import { describe, it, expect, vi } from 'vitest';

import { DEFAULT_EVALUATOR } from '../../lib/agentic/evaluator';
import {
  DEFAULT_RULES,
  evaluateAction,
  type ProposedAction,
} from '../../lib/agentic/policy';
import { agentsForEvent, dispatchEvent } from '../../lib/agentic/triggers';
import { listAgents, getAgent, PPC_OPS_AGENT } from '../../lib/agentic/agents';
import { PPC_MASTER_WEEKLY_DAG } from '../../lib/agentic/contracts/ppcMasterWeekly';
import type { StepRunResult } from '../../lib/agentic';

const ok = (id: string, fields: Record<string, unknown> = { summary: 'x'.repeat(200) }): StepRunResult => ({
  stepId: id,
  skillId: 'k',
  status: 'succeeded',
  rawOutput: 'long enough output that exceeds the empty threshold check used by the evaluator '.repeat(3),
  structuredFields: fields,
  durationMs: 100,
});

describe('evaluator.DEFAULT_EVALUATOR', () => {
  it('proceeds when every step has structured fields and meets contract', async () => {
    const decision = await DEFAULT_EVALUATOR.evaluateRound({
      dag: PPC_MASTER_WEEKLY_DAG,
      roundIndex: 0,
      stepIds: ['step-1-triage'],
      results: {
        'step-1-triage': ok('step-1-triage', { p1_accounts: [], summary: 'ok' }),
      },
    });
    expect(decision.decision).toBe('proceed');
  });

  it('asks to retry when a step produced empty output', async () => {
    const empty: StepRunResult = {
      stepId: 'step-1-triage',
      skillId: 'ppc-weekly-triage',
      status: 'succeeded',
      rawOutput: '',
      structuredFields: {},
      durationMs: 5,
    };
    const decision = await DEFAULT_EVALUATOR.evaluateRound({
      dag: PPC_MASTER_WEEKLY_DAG,
      roundIndex: 0,
      stepIds: ['step-1-triage'],
      results: { 'step-1-triage': empty },
    });
    expect(decision.decision).toBe('retry');
    expect(decision.retryStepIds).toContain('step-1-triage');
  });

  it('asks to retry when a required contract field is missing', async () => {
    // step-1-triage requires p1_accounts; omit it.
    const decision = await DEFAULT_EVALUATOR.evaluateRound({
      dag: PPC_MASTER_WEEKLY_DAG,
      roundIndex: 0,
      stepIds: ['step-1-triage'],
      results: {
        'step-1-triage': ok('step-1-triage', { p2_accounts: [], summary: 'short' }),
      },
    });
    expect(decision.decision).toBe('retry');
  });

  it('stops when a step with downstream dependents fails', async () => {
    const failed: StepRunResult = {
      stepId: 'step-1-triage',
      skillId: 'k',
      status: 'failed',
      rawOutput: '',
      structuredFields: {},
      durationMs: 0,
      errorMessage: 'rate limited',
    };
    const decision = await DEFAULT_EVALUATOR.evaluateRound({
      dag: PPC_MASTER_WEEKLY_DAG,
      roundIndex: 0,
      stepIds: ['step-1-triage'],
      results: { 'step-1-triage': failed },
    });
    expect(decision.decision).toBe('stop');
    expect(decision.reason).toContain('Critical');
  });
});

describe('policy.evaluateAction', () => {
  const ctx = { agentSpendTodayCents: 0, agentDailyBudgetCents: 0 };

  it('requires approval for outbound emails by default', () => {
    const action: ProposedAction = {
      kind: 'send_email',
      agentId: 'ppc-ops',
      description: 'Draft client weekly recap',
    };
    expect(evaluateAction(action, ctx).decision).toBe('require-approval');
  });

  it('requires approval for ad account modifications', () => {
    const action: ProposedAction = {
      kind: 'modify_ad_account',
      agentId: 'ppc-ops',
      description: 'Pause campaign',
    };
    expect(evaluateAction(action, ctx).decision).toBe('require-approval');
  });

  it('allows document creation without gates', () => {
    const action: ProposedAction = {
      kind: 'create_doc',
      agentId: 'ppc-ops',
      description: 'Generate change log',
    };
    expect(evaluateAction(action, ctx).decision).toBe('allow');
  });

  it('denies actions that exceed the daily budget cap', () => {
    const action: ProposedAction = {
      kind: 'create_doc',
      agentId: 'ppc-ops',
      description: 'Expensive doc',
      estimatedCostCents: 200,
    };
    const result = evaluateAction(action, {
      agentSpendTodayCents: 900,
      agentDailyBudgetCents: 1000,
    });
    expect(result.decision).toBe('deny');
    expect(result.matchedRules).toContain('daily-budget-cap');
  });

  it('returns allow when no rules match', () => {
    const customRules = DEFAULT_RULES.filter(r => r.id === 'allow-create-doc');
    const action: ProposedAction = {
      kind: 'tool_call',
      agentId: 'ppc-ops',
      description: 'Internal tool call',
    };
    expect(evaluateAction(action, ctx, customRules).decision).toBe('allow');
  });
});

describe('agents registry + triggers', () => {
  it('registers PPC Ops Agent in the global registry', () => {
    expect(getAgent('ppc-ops')).toBeDefined();
    expect(listAgents().some(a => a.id === 'ppc-ops')).toBe(true);
  });

  it('PPC Ops Agent declares the expected trigger spec', () => {
    expect(PPC_OPS_AGENT.trigger.eventKinds).toContain('cron.monday_triage');
    expect(PPC_OPS_AGENT.trigger.cron).toBe('0 6 * * 1');
  });

  it('agentsForEvent returns subscribed agents', () => {
    const subs = agentsForEvent('cron.monday_triage');
    expect(subs.map(a => a.id)).toContain('ppc-ops');
  });

  it('dispatchEvent invokes subscribed agent run() and returns outcomes', async () => {
    const runSpy = vi.spyOn(PPC_OPS_AGENT, 'run').mockResolvedValueOnce({
      agentRunId: 'fake-run-id',
      status: 'succeeded',
      results: {},
      plan: { strategy: 'static', rounds: [], skipped: [] },
      summary: 'mocked',
    });

    const outcomes = await dispatchEvent(
      { source: 'manual', kind: 'manual.ppc_ops_run', id: 'evt-1' },
      { userInputs: {}, provider: 'claude', apiKey: 'sk-test' },
    );

    expect(runSpy).toHaveBeenCalledOnce();
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].status).toBe('succeeded');
    expect(outcomes[0].agentRunId).toBe('fake-run-id');

    runSpy.mockRestore();
  });

  it('dispatchEvent returns an empty array when no agents subscribe', async () => {
    const outcomes = await dispatchEvent(
      { source: 'manual', kind: 'no.such.event' },
      { userInputs: {}, provider: 'claude', apiKey: 'sk-test' },
    );
    expect(outcomes).toEqual([]);
  });
});
