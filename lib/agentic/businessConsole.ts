/**
 * Business Agent Console state framework.
 *
 * The production console will be a UI over this shape: goal inbox, run
 * timeline, cost/quality trace, approvals, memory, recurring goals, policies,
 * and client/account dashboard cards.
 */

import type { GoalPlan } from './goalPlanner';
import type { MemoryContextEnvelope, EntityRef } from './memory';
import type { PolicyEvaluation } from './policy';
import type { RouterTuningMetrics } from './replanner';

export type GoalInboxStatus = 'draft' | 'planned' | 'running' | 'blocked' | 'completed' | 'failed';

export interface GoalInboxItem {
  id: string;
  goal: string;
  status: GoalInboxStatus;
  createdAt: string;
  updatedAt: string;
  entity?: EntityRef;
  plan?: GoalPlan;
  blocker?: string;
}

export interface AgentRunTimelineEvent {
  id: string;
  at: string;
  kind: 'goal_created' | 'planned' | 'started' | 'step_completed' | 'approval_requested' | 'completed' | 'failed';
  title: string;
  detail?: string;
  costCents?: number;
  qualityScore?: number;
}

export interface CostQualityTrace {
  estimatedCostCents: number;
  actualCostCents?: number;
  routingReasons: string[];
  quality?: RouterTuningMetrics;
}

export interface ApprovalSummary {
  pending: number;
  approved: number;
  rejected: number;
  lastDecisionAt?: string;
}

export interface SavedRecurringGoal {
  id: string;
  goal: string;
  cron: string;
  agentId: string;
  enabled: boolean;
  nextRunAt?: string;
}

export interface TeamPolicySummary {
  id: string;
  description: string;
  active: boolean;
  lastEvaluation?: PolicyEvaluation;
}

export interface ClientDashboardCard {
  entity: EntityRef;
  health?: 'good' | 'watch' | 'risk' | 'unknown';
  activeFacts: number;
  openApprovals: number;
  lastRunAt?: string;
}

export interface BusinessAgentConsoleState {
  inbox: GoalInboxItem[];
  timeline: AgentRunTimelineEvent[];
  costQualityTrace: CostQualityTrace;
  approvals: ApprovalSummary;
  memory: MemoryContextEnvelope;
  recurringGoals: SavedRecurringGoal[];
  teamPolicies: TeamPolicySummary[];
  dashboards: ClientDashboardCard[];
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createGoalInboxItem(goal: string, entity?: EntityRef): GoalInboxItem {
  const at = nowIso();
  return {
    id: `goal:${at}:${goal.slice(0, 24).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    goal,
    status: 'draft',
    createdAt: at,
    updatedAt: at,
    entity,
  };
}

export function goalPlanToInboxItem(plan: GoalPlan, entity?: EntityRef): GoalInboxItem {
  const at = nowIso();
  const hasErrors = !plan.validation.russellian.valid;
  return {
    id: `goal-plan:${plan.dag.id}:${at}`,
    goal: plan.intake.goal,
    status: hasErrors ? 'blocked' : 'planned',
    createdAt: at,
    updatedAt: at,
    entity,
    plan,
    blocker: hasErrors ? plan.validation.russellian.errors.map((error) => error.message).join(' ') : undefined,
  };
}

export function timelineFromGoalPlan(plan: GoalPlan): AgentRunTimelineEvent[] {
  const at = nowIso();
  return [
    {
      id: `${plan.dag.id}:planned`,
      at,
      kind: 'planned',
      title: `Planned ${plan.dag.name}`,
      detail: `${plan.dag.steps.length} step(s), ${plan.executionPlan.rounds.length} round(s).`,
      costCents: plan.executionPlan.estimatedCostCents,
    },
  ];
}

export function buildBusinessAgentConsoleState(args: {
  inbox?: GoalInboxItem[];
  timeline?: AgentRunTimelineEvent[];
  memory: MemoryContextEnvelope;
  recurringGoals?: SavedRecurringGoal[];
  teamPolicies?: TeamPolicySummary[];
  dashboards?: ClientDashboardCard[];
  quality?: RouterTuningMetrics;
  estimatedCostCents?: number;
  actualCostCents?: number;
  routingReasons?: string[];
  approvals?: ApprovalSummary;
}): BusinessAgentConsoleState {
  return {
    inbox: args.inbox ?? [],
    timeline: args.timeline ?? [],
    costQualityTrace: {
      estimatedCostCents: args.estimatedCostCents ?? 0,
      actualCostCents: args.actualCostCents,
      routingReasons: args.routingReasons ?? [],
      quality: args.quality,
    },
    approvals: args.approvals ?? { pending: 0, approved: 0, rejected: 0 },
    memory: args.memory,
    recurringGoals: args.recurringGoals ?? [],
    teamPolicies: args.teamPolicies ?? [],
    dashboards: args.dashboards ?? [],
  };
}

export function dashboardCardsFromMemory(memory: MemoryContextEnvelope): ClientDashboardCard[] {
  return memory.graph.nodes.map((node) => ({
    entity: node.entity,
    health: 'unknown',
    activeFacts: node.facts.length,
    openApprovals: 0,
  }));
}
