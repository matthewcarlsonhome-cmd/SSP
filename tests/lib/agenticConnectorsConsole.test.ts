import { describe, expect, it } from 'vitest';
import {
  buildBusinessAgentConsoleState,
  buildGoalPlan,
  buildMemoryContextEnvelope,
  connectorAvailable,
  connectorActionAllowedWithoutExternalIntegration,
  createApprovalDiff,
  createGoalInboxItem,
  dashboardCardsFromMemory,
  executeConnectorAction,
  goalPlanToInboxItem,
  listConnectorImplementationOrder,
  listConnectors,
  planConnectorAction,
  timelineFromGoalPlan,
} from '../../lib/agentic';

describe('connector framework', () => {
  it('creates approval diffs for side-effect changes', () => {
    const diff = createApprovalDiff({ status: 'old' }, { status: 'new', owner: 'Sam' });
    expect(diff.changedKeys).toEqual(['status', 'owner']);
    expect(diff.summary).toContain('2 field');
  });

  it('maps connector drafts through policy evaluation', () => {
    const plan = planConnectorAction({
      agentId: 'business-agent',
      actionKind: 'email.send',
      title: 'Send client update',
      description: 'Send PPC update to client.',
      payload: { to: 'client@example.com', body: 'Update' },
      policyContext: { agentSpendTodayCents: 0, agentDailyBudgetCents: 1000 },
    });
    expect(plan.proposedAction.kind).toBe('send_email');
    expect(plan.policy.decision).toBe('require-approval');
    expect(plan.approvalDiff).toBeTruthy();
  });

  it('reports connector availability from credentials', () => {
    expect(listConnectors().length).toBeGreaterThanOrEqual(7);
    expect(connectorAvailable('email', { email: true })).toBe(true);
    expect(connectorAvailable('email', {})).toBe(false);
    expect(connectorAvailable('document', {})).toBe(true);
  });

  it('keeps connector execution order and integration boundaries explicit', () => {
    const order = listConnectorImplementationOrder();
    expect(order.map((row) => row.actionKind)).toEqual([
      'document.create',
      'task.create',
      'email.draft',
      'calendar.create_event',
      'crm.update_record',
      'spreadsheet.create',
      'ads.propose_change',
      'email.send',
    ]);
    expect(connectorActionAllowedWithoutExternalIntegration('document.create')).toBe(true);
    expect(connectorActionAllowedWithoutExternalIntegration('task.create')).toBe(true);
    expect(connectorActionAllowedWithoutExternalIntegration('email.draft')).toBe(true);
    expect(connectorActionAllowedWithoutExternalIntegration('email.send')).toBe(false);
  });

  it('executes local-first connector drafts without unsafe external writes', () => {
    const emailDraft = executeConnectorAction({
      agentId: 'business-agent',
      actionKind: 'email.draft',
      title: 'Draft client outreach',
      description: 'Draft a campaign email.',
      payload: { to: 'prospect@example.com', subject: 'Automation follow-up', body: 'Hello' },
      policyContext: { agentSpendTodayCents: 0, agentDailyBudgetCents: 1000 },
    });
    expect(emailDraft.status).toBe('drafted');
    expect(emailDraft.artifact).toMatchObject({ type: 'email-draft' });

    const taskDraft = executeConnectorAction({
      agentId: 'business-agent',
      actionKind: 'task.create',
      title: 'Call top prospect',
      description: 'Prepare and call the top local prospect.',
      payload: { owner: 'Matthew', dueDate: '2026-05-01' },
      policyContext: { agentSpendTodayCents: 0, agentDailyBudgetCents: 1000 },
    });
    expect(taskDraft.status).toBe('drafted');
    expect(taskDraft.artifact).toMatchObject({ type: 'task-draft' });

    const send = executeConnectorAction({
      agentId: 'business-agent',
      actionKind: 'email.send',
      title: 'Send client outreach',
      description: 'Send a campaign email.',
      payload: { to: 'prospect@example.com', body: 'Hello' },
      policyContext: { agentSpendTodayCents: 0, agentDailyBudgetCents: 1000 },
      credentials: { email: true },
    });
    expect(send.status).toBe('approval-required');
    expect(send.artifact).toBeUndefined();
  });
});

describe('business console framework', () => {
  it('turns a goal and plan into console state pieces', () => {
    const draft = createGoalInboxItem('Prepare a weekly PPC operating packet.', { type: 'portfolio', id: 'ssp-mcc' });
    expect(draft.status).toBe('draft');

    const plan = buildGoalPlan({ goal: 'Prepare a weekly PPC operating packet.' });
    const planned = goalPlanToInboxItem(plan, { type: 'portfolio', id: 'ssp-mcc' });
    expect(planned.status).toBe('planned');

    const timeline = timelineFromGoalPlan(plan);
    expect(timeline[0].kind).toBe('planned');

    const memory = buildMemoryContextEnvelope({
      facts: [
        {
          entity: { type: 'account', id: 'Alpha' },
          key: 'priority',
          value: 'P1',
          confidence: 0.9,
          validFrom: new Date().toISOString(),
        },
      ],
    });
    const state = buildBusinessAgentConsoleState({
      inbox: [planned],
      timeline,
      memory,
      dashboards: dashboardCardsFromMemory(memory),
      estimatedCostCents: plan.executionPlan.estimatedCostCents,
    });

    expect(state.inbox).toHaveLength(1);
    expect(state.dashboards[0].activeFacts).toBe(1);
    expect(state.costQualityTrace.estimatedCostCents).toBeGreaterThan(0);
  });
});
