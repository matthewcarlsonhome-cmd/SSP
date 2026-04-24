/**
 * ControlTowerPage — operations dashboard for the agentic system.
 *
 * Reads from the `agentic.*` schema (best-effort; renders empty state if
 * Supabase isn't configured or RLS blocks the query). Surfaces:
 *   - Recent agent runs (last 25)
 *   - Pending approvals queue
 *   - Empty-state guidance describing what populates each panel
 *
 * Once the first agent (PPC Ops) is running on a schedule, this becomes the
 * Monday-morning landing page for SSP — not a workflow catalog, but a live
 * view of what the system is doing.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Loader2,
  PlayCircle,
} from 'lucide-react';
import {
  listRecentAgentRuns,
  listPendingApprovals,
  type PersistedAgentRun,
  type PersistedApproval,
} from '../../lib/agentic/supabaseClient';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';

const ControlTowerPage: React.FC = () => {
  const [runs, setRuns] = React.useState<PersistedAgentRun[]>([]);
  const [approvals, setApprovals] = React.useState<PersistedApproval[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [r, a] = await Promise.all([listRecentAgentRuns(25), listPendingApprovals(25)]);
      if (!cancelled) {
        setRuns(r);
        setApprovals(a);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const succeeded = runs.filter((r) => r.status === 'succeeded').length;
  const failed = runs.filter((r) => r.status === 'failed').length;
  const running = runs.filter((r) => r.status === 'running' || r.status === 'planning').length;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/agentic"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Agentic Lab
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Control Tower
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Live view of agent runs, pending approvals, and system activity. Becomes the primary
            surface once the PPC Ops agent is running on schedule.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Total runs" value={String(runs.length)} icon={PlayCircle} />
        <Stat label="Succeeded" value={String(succeeded)} icon={CheckCircle2} accent="emerald" />
        <Stat label="Running / planning" value={String(running)} icon={Loader2} accent="amber" />
        <Stat label="Pending approvals" value={String(approvals.length)} icon={ShieldAlert} accent={approvals.length > 0 ? 'red' : undefined} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent runs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent agent runs
            </CardTitle>
            <CardDescription>Last 25 runs across all agents.</CardDescription>
          </CardHeader>

          {loading ? (
            <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : runs.length === 0 ? (
            <EmptyState
              icon={PlayCircle}
              title="No runs yet"
              description="Agent runs will appear here once an agent fires. Try the AgenticRunner to record the first run."
              actionTo="/agentic/run/ppc-master-weekly-workflow"
              actionLabel="Run PPC Master Weekly →"
            />
          ) : (
            <ul className="mt-3 divide-y">
              {runs.map((r) => (
                <li key={r.id} className="py-2 flex items-center gap-3 text-sm">
                  <StatusDot status={r.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.agent_id}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.started_at).toLocaleString()}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Pending approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Pending approvals
            </CardTitle>
            <CardDescription>Actions agents want to take that are gated by policy.</CardDescription>
          </CardHeader>

          {loading ? (
            <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : approvals.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Inbox zero"
              description="No actions awaiting review. When an agent proposes a side-effecting action gated by policy, it appears here."
            />
          ) : (
            <ul className="mt-3 divide-y">
              {approvals.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <div className="font-medium">Run {a.agent_run_id.slice(0, 8)}…</div>
                  {a.reasoning && (
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {a.reasoning}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    requested {new Date(a.requested_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle className="text-sm">What populates this page</CardTitle>
        </CardHeader>
        <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Each run from the AgenticRunner page records to <code>agentic.agent_runs</code>.</li>
          <li>The PPC Ops agent (Phase 3 of the roadmap) will fire on a Monday cron and post results here.</li>
          <li>Approvals appear when the policy engine intercepts an action.</li>
          <li>If Supabase is not configured locally, this page renders empty states without erroring.</li>
        </ul>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Local pieces
// ─────────────────────────────────────────────────────────────────────────────

const Stat: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: 'emerald' | 'amber' | 'red';
}> = ({ label, value, icon: Icon, accent }) => {
  const accentBorder =
    accent === 'emerald'
      ? 'border-emerald-500/40 bg-emerald-500/5'
      : accent === 'amber'
      ? 'border-amber-500/40 bg-amber-500/5'
      : accent === 'red'
      ? 'border-red-500/40 bg-red-500/5'
      : 'bg-card';
  const accentText =
    accent === 'emerald'
      ? 'text-emerald-600'
      : accent === 'amber'
      ? 'text-amber-600'
      : accent === 'red'
      ? 'text-red-600'
      : '';
  return (
    <div className={`p-3 rounded-lg border ${accentBorder}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${accentText}`}>{value}</div>
    </div>
  );
};

const StatusDot: React.FC<{ status: string }> = ({ status }) => {
  const cls =
    status === 'succeeded'
      ? 'bg-emerald-500'
      : status === 'failed'
      ? 'bg-red-500'
      : status === 'running' || status === 'planning'
      ? 'bg-amber-500 animate-pulse'
      : 'bg-muted-foreground';
  return <span className={`h-2.5 w-2.5 rounded-full ${cls} shrink-0`} />;
};

const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  actionTo?: string;
  actionLabel?: string;
}> = ({ icon: Icon, title, description, actionTo, actionLabel }) => (
  <div className="mt-4 p-6 rounded-lg border border-dashed text-center">
    <Icon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
    <div className="font-medium">{title}</div>
    <div className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{description}</div>
    {actionTo && actionLabel && (
      <Link
        to={actionTo}
        className="inline-block mt-3 text-sm text-primary underline underline-offset-4"
      >
        {actionLabel}
      </Link>
    )}
  </div>
);

export default ControlTowerPage;
