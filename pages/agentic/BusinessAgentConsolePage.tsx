import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Database,
  Inbox,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  buildBusinessAgentConsoleState,
  buildGoalPlan,
  buildMemoryContextEnvelope,
  dashboardCardsFromMemory,
  goalPlanToInboxItem,
  timelineFromGoalPlan,
  type BusinessAgentConsoleState,
} from '../../lib/agentic';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';

function buildDemoConsoleState(): BusinessAgentConsoleState {
  const goalPlan = buildGoalPlan({
    goal: 'Find 40 local law firms around Milwaukee and draft a two-week automation outreach campaign.',
    context: {
      audience: 'team',
      entity: { type: 'campaign', id: 'milwaukee-law-automation' },
      domainHints: ['crm', 'local prospecting', 'sales'],
      requireApprovalForSideEffects: true,
    },
  });
  const memory = buildMemoryContextEnvelope({
    focusEntity: { type: 'campaign', id: 'milwaukee-law-automation' },
    facts: [
      {
        entity: { type: 'campaign', id: 'milwaukee-law-automation' },
        key: 'target_market',
        value: 'Milwaukee law firms',
        confidence: 0.9,
        validFrom: new Date().toISOString(),
      },
      {
        entity: { type: 'client', id: 'example-law-prospect' },
        key: 'automation_angle',
        value: 'Intake follow-up and document collection automation',
        confidence: 0.72,
        validFrom: new Date().toISOString(),
      },
    ],
  });

  return buildBusinessAgentConsoleState({
    inbox: [goalPlanToInboxItem(goalPlan, { type: 'campaign', id: 'milwaukee-law-automation' })],
    timeline: [
      ...timelineFromGoalPlan(goalPlan),
      {
        id: 'crm-local-prospecting:next',
        at: new Date().toISOString(),
        kind: 'started',
        title: 'Ready for campaign planning',
        detail: 'CRM prospecting capabilities are executable as internal tools.',
        costCents: goalPlan.executionPlan.estimatedCostCents,
        qualityScore: 1,
      },
    ],
    memory,
    dashboards: dashboardCardsFromMemory(memory),
    estimatedCostCents: goalPlan.executionPlan.estimatedCostCents,
    approvals: { pending: 0, approved: 0, rejected: 0 },
    recurringGoals: [
      {
        id: 'weekly-ppc-ops',
        goal: 'Create a weekly PPC operating packet for priority client accounts.',
        cron: '0 8 * * MON',
        agentId: 'ppc-ops',
        enabled: false,
      },
    ],
    teamPolicies: [
      {
        id: 'side-effects-approval',
        description: 'External sends and database writes require policy checks and approval boundaries.',
        active: true,
      },
    ],
  });
}

const BusinessAgentConsolePage: React.FC = () => {
  const state = React.useMemo(() => buildDemoConsoleState(), []);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Link
        to="/agentic"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Agentic Lab
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Business Agent Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Operator view for goals, runs, approvals, memory, policies, and client/account dashboards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/agentic/goals"
            className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            New goal
          </Link>
          <Link
            to="/agentic/approvals"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ShieldCheck className="h-4 w-4 mr-1" />
            Approvals
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-4">
        <Metric label="Inbox" value={state.inbox.length} icon={Inbox} />
        <Metric label="Pending approvals" value={state.approvals.pending} icon={ShieldCheck} />
        <Metric label="Memory facts" value={state.memory.facts.length} icon={Database} />
        <Metric label="Recurring goals" value={state.recurringGoals.length} icon={CalendarClock} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Panel title="Goal Inbox" description="Planned and draft goals">
            <div className="space-y-2">
              {state.inbox.map((item) => (
                <div key={item.id} className="rounded border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{item.goal}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.entity ? `${item.entity.type}:${item.entity.id}` : 'No entity selected'}
                      </div>
                    </div>
                    <StatusPill label={item.status} tone={item.status === 'blocked' ? 'warning' : 'good'} />
                  </div>
                  {item.blocker && <div className="text-xs text-amber-700 mt-2">{item.blocker}</div>}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Run Timeline" description="Latest agent activity">
            <div className="space-y-2">
              {state.timeline.map((event) => (
                <div key={event.id} className="rounded border bg-card p-3 flex gap-3">
                  <Clock3 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{event.title}</div>
                    {event.detail && <div className="text-xs text-muted-foreground mt-1">{event.detail}</div>}
                    <div className="text-[11px] text-muted-foreground mt-1">{event.kind}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Cost And Quality" description="Current trace">
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Estimated cents" value={state.costQualityTrace.estimatedCostCents.toFixed(2)} icon={BadgeCheck} />
              <Metric label="Actual cents" value={state.costQualityTrace.actualCostCents?.toFixed(2) ?? 'pending'} icon={CheckCircle2} />
            </div>
          </Panel>

          <Panel title="Memory" description={state.memory.summary}>
            <div className="space-y-2">
              {state.memory.facts.map((fact) => (
                <div key={`${fact.entity.type}:${fact.entity.id}:${fact.key}`} className="rounded border bg-card p-2">
                  <div className="text-xs font-medium">{fact.key}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {fact.entity.type}:{fact.entity.id}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Dashboards" description="Entity cards">
            <div className="space-y-2">
              {state.dashboards.map((dashboard) => (
                <div key={`${dashboard.entity.type}:${dashboard.entity.id}`} className="rounded border bg-card p-2">
                  <div className="text-xs font-medium">
                    {dashboard.entity.type}:{dashboard.entity.id}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {dashboard.activeFacts} facts, {dashboard.openApprovals} approvals
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

const Panel: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <div className="mt-3">{children}</div>
  </Card>
);

const Metric: React.FC<{ label: string; value: React.ReactNode; icon: React.ElementType }> = ({
  label,
  value,
  icon: Icon,
}) => (
  <div className="rounded border bg-card p-3">
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
        <div className="text-sm font-semibold mt-1">{value}</div>
      </div>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
  </div>
);

const StatusPill: React.FC<{ label: string; tone: 'good' | 'warning' }> = ({ label, tone }) => (
  <span
    className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
      tone === 'good' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-500/15 text-amber-700'
    }`}
  >
    {label}
  </span>
);

export default BusinessAgentConsolePage;
