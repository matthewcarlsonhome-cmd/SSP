/**
 * Agentic Home — landing page for the beta. Lists the experiment's surfaces
 * and links into the Workflow Compare view (the only working screen at this
 * stage of the build).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, GitBranch, Network, ShieldCheck, Activity, Workflow, Play, ArrowRightLeft } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';

interface SurfaceTile {
  to: string;
  title: string;
  description: string;
  icon: React.ElementType;
  status: 'live' | 'planned';
}

const SURFACES: SurfaceTile[] = [
  {
    to: '/agentic/run/ppc-master-weekly-workflow',
    title: 'Agentic Runner',
    description:
      'Execute the PPC Master Weekly DAG end-to-end with parallel rounds, structured output ' +
      'extraction, and optional AI planning. Live status renders on the dependency graph.',
    icon: Play,
    status: 'live',
  },
  {
    to: '/agentic/compare/ppc-master-weekly-workflow',
    title: 'Workflow Compare',
    description:
      'Side-by-side view of an existing linear workflow and its inferred DAG representation. ' +
      'Demonstrates how today\'s sequential steps would run as a parallel agentic graph.',
    icon: GitBranch,
    status: 'live',
  },
  {
    to: '/agentic/side-by-side/ppc-master-weekly-workflow',
    title: 'Shadow Run',
    description:
      'Run the agentic DAG and compare structurally against the legacy linear workflow. The ' +
      'safety mechanism for graduating workflows from beta to primary.',
    icon: ArrowRightLeft,
    status: 'live',
  },
  {
    to: '/agentic/control-tower',
    title: 'Control Tower',
    description:
      'Live activity feed of agent runs, pending approvals, blockers, and today\'s ' +
      'auto-completed work. Becomes the primary surface once an agent is running.',
    icon: Activity,
    status: 'live',
  },
  {
    to: '/agentic',
    title: 'Entity Inspector',
    description:
      'Pick a client or account to see everything the system knows about it: recent runs, ' +
      'current facts from entity_context, upcoming deliverables, open risks.',
    icon: Network,
    status: 'planned',
  },
  {
    to: '/agentic',
    title: 'Approvals Queue',
    description:
      'Actions an agent wants to take that are gated by policy. Approve, edit, or reject.',
    icon: ShieldCheck,
    status: 'planned',
  },
];

const AgenticHomePage: React.FC = () => {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 mb-3 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-medium">
          <Workflow className="h-3.5 w-3.5" />
          Beta · admin only
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Agentic Workflow Lab</h1>
        <p className="text-muted-foreground max-w-3xl">
          Isolated workspace for the Business OS experiment. The existing workflow product
          continues to run unchanged; everything in this section is additive and gated. Use the
          Compare view to see how today’s linear workflows map onto the new DAG / agentic model.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SURFACES.map(s => {
          const Icon = s.icon;
          const isLive = s.status === 'live';
          const inner = (
            <Card
              variant={isLive ? 'interactive' : 'outline'}
              className={!isLive ? 'opacity-60 cursor-not-allowed' : undefined}
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isLive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle>{s.title}</CardTitle>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                          isLive
                            ? 'bg-emerald-500/15 text-emerald-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <CardDescription className="mt-2">{s.description}</CardDescription>
                  </div>
                  {isLive && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
              </CardHeader>
            </Card>
          );
          return isLive ? (
            <Link to={s.to} key={s.title}>
              {inner}
            </Link>
          ) : (
            <div key={s.title}>{inner}</div>
          );
        })}
      </div>

      <div className="mt-10 p-5 rounded-xl border border-dashed bg-muted/30">
        <h2 className="font-semibold mb-2 text-sm">Why this exists</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Existing workflows are linear chains regardless of whether their steps actually depend on
          each other. The agentic experiment evolves them into dependency graphs, then into
          planner-driven execution, then into continuously-operating domain agents that share a
          living model of the business. This lab lets us prove the pattern on the PPC Master
          Weekly workflow before generalizing.
        </p>
      </div>
    </div>
  );
};

export default AgenticHomePage;
