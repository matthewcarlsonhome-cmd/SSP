/**
 * AgentConsolePage — per-agent dashboard.
 *
 * Lists all registered agents on /agentic/agents and shows a single agent's
 * detail at /agentic/agents/:agentId. Surface includes:
 *   - Trigger spec (subscribed event kinds + cron expression)
 *   - Recent runs by this agent
 *   - "Fire trigger now" — manual dispatch using the AgenticRunner UI
 *
 * Becomes the operator surface once agents are running on schedule.
 */

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bot, Calendar, Clock, Play, ChevronRight } from 'lucide-react';
import { listAgents, getAgent, type Agent } from '../../lib/agentic/agents';
import {
  listRecentAgentRuns,
  type PersistedAgentRun,
} from '../../lib/agentic/supabaseClient';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';

const AgentConsolePage: React.FC = () => {
  const { agentId } = useParams<{ agentId?: string }>();
  if (agentId) {
    return <AgentDetail agentId={agentId} />;
  }
  return <AgentList />;
};

// ─────────────────────────────────────────────────────────────────────────────
// List view
// ─────────────────────────────────────────────────────────────────────────────

const AgentList: React.FC = () => {
  const agents = listAgents();
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/agentic"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Agentic Lab
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Agents
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Long-lived domain agents. Each subscribes to event kinds and produces agent runs.
        </p>
      </div>

      {agents.length === 0 ? (
        <Card className="border-dashed">
          <CardTitle className="text-sm">No agents registered</CardTitle>
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map((a) => (
            <Link key={a.id} to={`/agentic/agents/${a.id}`}>
              <Card variant="interactive">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{a.name}</CardTitle>
                      <code className="text-[10px] text-muted-foreground">{a.id}</code>
                    </div>
                    <CardDescription className="mt-1">{a.description}</CardDescription>
                    <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-muted-foreground">
                      {a.trigger.cron && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {a.trigger.cron}
                        </span>
                      )}
                      {a.trigger.eventKinds.map((k) => (
                        <code key={k} className="px-1.5 py-0.5 rounded bg-muted">
                          {k}
                        </code>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Detail view
// ─────────────────────────────────────────────────────────────────────────────

const AgentDetail: React.FC<{ agentId: string }> = ({ agentId }) => {
  const agent: Agent | undefined = getAgent(agentId);
  const [runs, setRuns] = React.useState<PersistedAgentRun[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!agent) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const all = await listRecentAgentRuns(50);
      if (!cancelled) {
        setRuns(all.filter((r) => r.agent_id === agentId));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent, agentId]);

  if (!agent) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">Agent not found</h1>
        <Link to="/agentic/agents" className="text-primary underline underline-offset-4">
          Back to Agents
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/agentic/agents"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Agents
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {agent.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{agent.description}</p>
        </div>
        <Link to="/agentic/run/ppc-master-weekly-workflow">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Play className="h-4 w-4" />
            Fire manual trigger
          </span>
        </Link>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">Trigger spec</CardTitle>
        </CardHeader>
        <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Cron
            </div>
            <code className="text-xs">{agent.trigger.cron ?? 'none'}</code>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Event kinds
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {agent.trigger.eventKinds.map((k) => (
                <code key={k} className="text-xs px-1.5 py-0.5 rounded bg-muted">
                  {k}
                </code>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent runs by this agent
          </CardTitle>
        </CardHeader>
        {loading ? (
          <div className="text-sm text-muted-foreground mt-3">Loading…</div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">
            No runs recorded for this agent yet. Fire a manual trigger to record one.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {runs.map((r) => (
              <li key={r.id} className="py-2 text-sm flex items-center justify-between">
                <span>
                  <code className="text-xs">{r.id.slice(0, 8)}</code>{' '}
                  <span className="text-muted-foreground">
                    {new Date(r.started_at).toLocaleString()}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default AgentConsolePage;
