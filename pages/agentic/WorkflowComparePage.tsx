/**
 * WorkflowComparePage — the teaching/reference view.
 *
 * Renders an existing Workflow side-by-side with its inferred AgenticDAG so
 * stakeholders can see how today's linear chain maps to the parallel/agentic
 * model. The original workflow definition is read directly from the existing
 * registry (lib/workflows) — it is never modified, only inspected.
 *
 * Default subject is the PPC Master Weekly Workflow (the SSP pilot target).
 * Other workflows can be loaded by changing the URL :workflowId param.
 */

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, GitBranch, Layers, Zap } from 'lucide-react';
import { WORKFLOWS } from '../../lib/workflows';
import { adaptWorkflowToDAG, summarizeParallelism } from '../../lib/agentic';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import WorkflowDAG from '../../components/agentic/WorkflowDAG';

const DEFAULT_WORKFLOW_ID = 'ppc-master-weekly-workflow';

const WorkflowComparePage: React.FC = () => {
  const params = useParams<{ workflowId?: string }>();
  const workflowId = params.workflowId || DEFAULT_WORKFLOW_ID;
  const workflow = WORKFLOWS[workflowId];

  if (!workflow) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">Workflow not found</h1>
        <p className="text-muted-foreground mb-6">
          No workflow registered with id <code className="text-sm">{workflowId}</code>.
        </p>
        <Link to="/agentic" className="text-primary underline underline-offset-4">
          Back to Agentic Lab
        </Link>
      </div>
    );
  }

  const dag = React.useMemo(() => adaptWorkflowToDAG(workflow), [workflow]);
  const stats = React.useMemo(() => summarizeParallelism(dag), [dag]);
  const speedupPct = Math.round((stats.speedupRatio - 1) * 100);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/agentic"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Agentic Lab
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{workflow.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{workflow.description}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {workflow.estimatedTime}
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              {workflow.steps.length} steps
            </span>
          </div>
        </div>
      </div>

      {/* Summary stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile label="Steps" value={String(stats.totalSteps)} />
        <StatTile
          label="Sequential rounds"
          value={String(stats.rounds)}
          hint="When run as a DAG"
        />
        <StatTile
          label="Max parallelism"
          value={`×${stats.maxParallel}`}
          hint="Largest round size"
        />
        <StatTile
          label="Time reduction"
          value={speedupPct > 0 ? `~${speedupPct}%` : 'none'}
          hint="From sequential → parallel"
          accent={speedupPct > 0}
        />
      </div>

      {/* Two-pane comparison */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* LEFT: today's linear workflow */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-muted text-muted-foreground">
                Today
              </span>
              <CardTitle className="text-base">Linear sequential chain</CardTitle>
            </div>
            <CardDescription>
              Each step waits for the previous one to complete, regardless of whether it actually
              depends on its output.
            </CardDescription>
          </CardHeader>
          <ol className="mt-4 space-y-2">
            {workflow.steps.map((step, i) => (
              <li
                key={step.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{step.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {step.description}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
                    skill: {step.skillId}
                  </div>
                </div>
                {i < workflow.steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-2" />
                )}
              </li>
            ))}
          </ol>
        </Card>

        {/* RIGHT: inferred agentic DAG */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-primary/15 text-primary">
                Agentic
              </span>
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Inferred dependency graph
              </CardTitle>
            </div>
            <CardDescription>
              Same skills, regrouped into rounds based on their actual dependencies. Steps within a
              round can run in parallel.
            </CardDescription>
          </CardHeader>
          <div className="mt-4">
            <WorkflowDAG dag={dag} mode="full" />
          </div>
        </Card>
      </div>

      {/* Inference notes */}
      {dag.derivedFrom?.inferenceNotes && dag.derivedFrom.inferenceNotes.length > 0 && (
        <Card className="mt-6" status="info">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              How dependencies were inferred
            </CardTitle>
          </CardHeader>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc list-inside">
            {dag.derivedFrom.inferenceNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            This DAG is a <em>view</em>. The original workflow definition in{' '}
            <code>lib/workflows/</code> is unchanged. Editing the workflow to add an explicit{' '}
            <code>dependsOn</code> array on each step would make these dependencies authoritative
            instead of inferred — and the existing workflow runner already supports it.
          </p>
        </Card>
      )}

      {/* Other workflows quick switcher */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold mb-2">Compare another workflow</h2>
        <div className="flex flex-wrap gap-2">
          {Object.values(WORKFLOWS)
            .filter(w => w.id !== workflowId)
            .slice(0, 12)
            .map(w => (
              <Link
                key={w.id}
                to={`/agentic/compare/${w.id}`}
                className="text-xs px-2.5 py-1 rounded-full border hover:border-primary hover:text-primary transition-colors"
              >
                {w.name}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Local tile component
// ─────────────────────────────────────────────────────────────────────────────
const StatTile: React.FC<{
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}> = ({ label, value, hint, accent }) => (
  <div
    className={`p-3 rounded-lg border ${
      accent ? 'border-emerald-500/40 bg-emerald-500/5' : 'bg-card'
    }`}
  >
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
      {label}
    </div>
    <div className={`text-2xl font-bold mt-0.5 ${accent ? 'text-emerald-600' : ''}`}>{value}</div>
    {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
  </div>
);

export default WorkflowComparePage;
