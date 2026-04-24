/**
 * SideBySideRunnerPage — admin shadow-mode tool. Runs the agentic DAG and
 * shows a structural comparison against the legacy linear workflow without
 * actually executing the legacy chain twice (no need to double the cost).
 *
 * The page focuses on the per-step diff that matters: what the agentic run
 * produced (structured fields + raw output) vs. what the linear workflow
 * would have produced (a single prose blob with no field structure). This
 * is enough to validate the agentic results before flipping the switch.
 *
 * For an actual side-by-side execution comparison, run the legacy workflow
 * runner in another tab — both share useProviderConfig state.
 */

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Play } from 'lucide-react';
import {
  HAND_AUTHORED_DAGS,
  adaptWorkflowToDAG,
  buildExecutionRounds,
  runAgenticDAG,
  summarizeParallelism,
  toRuntimeState,
  type AgenticDAG,
  type StepRunResult,
} from '../../lib/agentic';
import { WORKFLOWS } from '../../lib/workflows';
import { useProviderConfig } from '../../components/ProviderConfig';
import { Button } from '../../components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import WorkflowDAG from '../../components/agentic/WorkflowDAG';

const DEFAULT_WORKFLOW_ID = 'ppc-master-weekly-workflow';

const SideBySideRunnerPage: React.FC = () => {
  const params = useParams<{ workflowId?: string }>();
  const workflowId = params.workflowId || DEFAULT_WORKFLOW_ID;
  const workflow = WORKFLOWS[workflowId];
  const { state: providerState } = useProviderConfig();

  const dag: AgenticDAG | null = React.useMemo(() => {
    if (HAND_AUTHORED_DAGS[workflowId]) return HAND_AUTHORED_DAGS[workflowId];
    if (workflow) return adaptWorkflowToDAG(workflow);
    return null;
  }, [workflowId, workflow]);

  const [inputs, setInputs] = React.useState<Record<string, string>>({});
  const [results, setResults] = React.useState<Record<string, StepRunResult>>({});
  const [isRunning, setIsRunning] = React.useState(false);
  const [agenticDurationMs, setAgenticDurationMs] = React.useState<number | null>(null);

  if (!workflow || !dag) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">Workflow not found</h1>
        <Link to="/agentic" className="text-primary underline underline-offset-4">
          Back to Agentic Lab
        </Link>
      </div>
    );
  }

  const runtimeState = toRuntimeState(results);
  const stats = summarizeParallelism(dag);

  const handleRun = async () => {
    if (!providerState.apiKey) return;
    setIsRunning(true);
    setResults({});
    setAgenticDurationMs(null);
    const started = Date.now();
    try {
      await runAgenticDAG(dag, {
        provider: providerState.provider,
        apiKey: providerState.apiKey,
        userInputs: inputs,
        precomputedRounds: buildExecutionRounds(dag),
        onEvent: (e) => {
          if (e.type === 'step-completed') {
            setResults((prev) => ({ ...prev, [e.result.stepId]: e.result }));
          }
        },
      });
      setAgenticDurationMs(Date.now() - started);
    } finally {
      setIsRunning(false);
    }
  };

  const completedCount = Object.values(results).filter((r) => r.status === 'succeeded').length;
  const fieldCount = Object.values(results).reduce(
    (n, r) => n + Object.keys(r.structuredFields).length,
    0,
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
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
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Shadow run: {dag.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Runs the agentic DAG once and shows structural results next to a description of the
            legacy linear behavior. Use this to verify agentic output before flipping a workflow live.
          </p>
        </div>
        <Button onClick={handleRun} disabled={!providerState.apiKey || isRunning} size="sm">
          <Play className="h-4 w-4 mr-1" />
          {isRunning ? 'Running…' : 'Run agentic'}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-sm">
        <Stat label="Total steps" value={String(stats.totalSteps)} />
        <Stat label="Linear (sequential)" value={`~${stats.totalSteps * 4}s × steps`} muted />
        <Stat label="Agentic rounds" value={String(stats.rounds)} accent />
        <Stat
          label="Wall time"
          value={agenticDurationMs ? `${(agenticDurationMs / 1000).toFixed(1)}s` : '—'}
          accent={!!agenticDurationMs}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* LEFT: legacy linear chain (description only) */}
        <Card>
          <CardHeader>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-muted text-muted-foreground inline-block w-fit">
              Today (linear)
            </span>
            <CardTitle className="text-base mt-1">Sequential chain</CardTitle>
            <CardDescription>
              Each step blocks on the previous one and receives the entire prior output as a prose
              blob. {workflow.steps.length} sequential calls; no structured handoff.
            </CardDescription>
          </CardHeader>
          <ol className="mt-3 space-y-1.5">
            {workflow.steps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className="h-5 w-5 rounded-full bg-muted text-xs flex items-center justify-center font-semibold">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{s.name}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            Open this workflow in the legacy runner to compare actual outputs:{' '}
            <Link to={`/workflow/${workflowId}`} className="text-primary underline underline-offset-4">
              /workflow/{workflowId}
            </Link>
          </p>
        </Card>

        {/* RIGHT: live agentic execution */}
        <Card>
          <CardHeader>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-primary/15 text-primary inline-block w-fit">
              Agentic (DAG)
            </span>
            <CardTitle className="text-base mt-1">Parallel rounds with structured handoffs</CardTitle>
            <CardDescription>
              {stats.rounds} rounds, max {stats.maxParallel}× parallelism. Each step extracts
              structured fields downstream steps consume selectively.
            </CardDescription>
          </CardHeader>
          <div className="mt-3">
            <WorkflowDAG dag={dag} mode="compact" runtimeState={runtimeState} />
          </div>
          {completedCount > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/30 text-xs">
              <strong className="text-emerald-700">{completedCount}</strong> steps complete ·{' '}
              <strong className="text-emerald-700">{fieldCount}</strong> structured fields extracted
            </div>
          )}
        </Card>
      </div>

      {/* Inputs */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Inputs</CardTitle>
          <CardDescription>Same inputs feed both the linear and agentic forms.</CardDescription>
        </CardHeader>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {workflow.globalInputs.slice(0, 4).map((g) => (
            <label key={g.id} className="block text-sm">
              <span className="block text-xs font-medium text-muted-foreground mb-1">
                {g.label}
              </span>
              {g.type === 'textarea' ? (
                <textarea
                  className="w-full text-sm p-2 rounded border bg-background"
                  rows={2}
                  placeholder={g.placeholder}
                  value={inputs[g.id] ?? ''}
                  onChange={(e) => setInputs((p) => ({ ...p, [g.id]: e.target.value }))}
                />
              ) : (
                <input
                  type="text"
                  className="w-full text-sm p-2 rounded border bg-background"
                  placeholder={g.placeholder}
                  value={inputs[g.id] ?? ''}
                  onChange={(e) => setInputs((p) => ({ ...p, [g.id]: e.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; muted?: boolean; accent?: boolean }> = ({
  label, value, muted, accent,
}) => (
  <div className={`p-3 rounded-lg border ${
    accent ? 'border-emerald-500/40 bg-emerald-500/5' : muted ? 'bg-muted/30' : 'bg-card'
  }`}>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    <div className={`text-lg font-bold mt-0.5 ${accent ? 'text-emerald-600' : ''}`}>{value}</div>
  </div>
);

export default SideBySideRunnerPage;
