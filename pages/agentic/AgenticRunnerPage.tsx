/**
 * AgenticRunnerPage — runs an agentic DAG end-to-end with live status.
 *
 * Loads the hand-authored DAG when available (output contracts, skip rules,
 * selective context); falls back to inferred adaptation otherwise. Uses the
 * existing useProviderConfig hook so the user's provider/key choice is the
 * same as on the legacy runner.
 *
 * Optional planner step: if the user toggles "Plan with AI" the runner
 * invokes lib/agentic/planner.ts to produce an ExecutionPlan, then runs
 * the precomputed rounds. Without the toggle, the static DAG rounds are
 * used.
 */

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Brain, Loader2, Play, Square } from 'lucide-react';
import {
  HAND_AUTHORED_DAGS,
  adaptWorkflowToDAG,
  buildExecutionRounds,
  persistRun,
  plan,
  runAgenticDAG,
  toRuntimeState,
  type AgenticDAG,
  type ExecutionPlan,
  type RunnerEvent,
  type StepRunResult,
} from '../../lib/agentic';
import { WORKFLOWS } from '../../lib/workflows';
import { useProviderConfig } from '../../components/ProviderConfig';
import { Button } from '../../components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import WorkflowDAG from '../../components/agentic/WorkflowDAG';

const DEFAULT_WORKFLOW_ID = 'ppc-master-weekly-workflow';

const AgenticRunnerPage: React.FC = () => {
  const params = useParams<{ workflowId?: string }>();
  const workflowId = params.workflowId || DEFAULT_WORKFLOW_ID;
  const workflow = WORKFLOWS[workflowId];
  const { state: providerState } = useProviderConfig();

  const dag: AgenticDAG | null = React.useMemo(() => {
    if (HAND_AUTHORED_DAGS[workflowId]) return HAND_AUTHORED_DAGS[workflowId];
    if (workflow) return adaptWorkflowToDAG(workflow);
    return null;
  }, [workflowId, workflow]);

  const [usePlanner, setUsePlanner] = React.useState(false);
  const [inputs, setInputs] = React.useState<Record<string, string>>({});
  const [activePlan, setActivePlan] = React.useState<ExecutionPlan | null>(null);
  const [results, setResults] = React.useState<Record<string, StepRunResult>>({});
  const [events, setEvents] = React.useState<RunnerEvent[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [phase, setPhase] = React.useState<'idle' | 'planning' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  if (!workflow || !dag) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">Workflow not found</h1>
        <p className="text-muted-foreground mb-6">
          No workflow registered with id <code>{workflowId}</code>.
        </p>
        <Link to="/agentic" className="text-primary underline underline-offset-4">
          Back to Agentic Lab
        </Link>
      </div>
    );
  }

  const runtimeState = React.useMemo(() => toRuntimeState(results), [results]);

  const canRun = !!providerState.apiKey && !isRunning;

  const handleRun = async () => {
    if (!providerState.apiKey) {
      setError('Provide an API key in your provider config (top of any skill runner) before running.');
      return;
    }
    setError(null);
    setResults({});
    setEvents([]);
    setActivePlan(null);
    setIsRunning(true);
    abortRef.current = new AbortController();

    try {
      let executionPlan: ExecutionPlan;
      if (usePlanner) {
        setPhase('planning');
        executionPlan = await plan({
          dag,
          userInputs: inputs,
          provider: providerState.provider,
          apiKey: providerState.apiKey,
        });
      } else {
        executionPlan = {
          strategy: 'static',
          rounds: buildExecutionRounds(dag),
          skipped: [],
        };
      }
      setActivePlan(executionPlan);

      setPhase('running');
      const finalResults = await runAgenticDAG(dag, {
        provider: providerState.provider,
        apiKey: providerState.apiKey,
        userInputs: inputs,
        precomputedRounds: executionPlan.rounds,
        signal: abortRef.current.signal,
        onEvent: (e) => {
          setEvents((prev) => [...prev, e]);
          if (e.type === 'step-completed') {
            setResults((prev) => ({ ...prev, [e.result.stepId]: e.result }));
          }
        },
      });

      // Best-effort persistence to agentic.* schema. Failures here do not
      // affect the in-page results; the persistence layer is silent on
      // errors so the UI stays responsive even when supabase is offline.
      const failed = Object.values(finalResults).some((r) => r.status === 'failed');
      void persistRun(
        {
          agentId: 'manual:web',
          workflowId,
          plan: executionPlan,
          triggerEventId: null,
        },
        finalResults,
        executionPlan.rounds,
        failed ? 'failed' : 'succeeded',
        `Manual run from /agentic/run/${workflowId}`,
      );

      setPhase('done');
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  const handleAbort = () => {
    abortRef.current?.abort();
    setIsRunning(false);
    setPhase('idle');
  };

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
          <h1 className="text-2xl font-bold">{dag.name}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{dag.description}</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded font-medium ${
              HAND_AUTHORED_DAGS[workflowId]
                ? 'bg-emerald-500/15 text-emerald-700'
                : 'bg-amber-500/15 text-amber-700'
            }`}>
              {HAND_AUTHORED_DAGS[workflowId] ? 'Hand-authored DAG with contracts' : 'Inferred DAG (no contracts yet)'}
            </span>
            <Link to={`/agentic/compare/${workflowId}`} className="text-primary underline underline-offset-4">
              Compare with linear version
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={usePlanner}
              onChange={(e) => setUsePlanner(e.target.checked)}
              disabled={isRunning}
              className="h-4 w-4"
            />
            <Brain className="h-4 w-4 text-primary" />
            Plan with AI
          </label>
          {isRunning ? (
            <Button onClick={handleAbort} variant="destructive" size="sm">
              <Square className="h-4 w-4 mr-1" />
              Abort
            </Button>
          ) : (
            <Button onClick={handleRun} disabled={!canRun} size="sm">
              <Play className="h-4 w-4 mr-1" />
              Run
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card status="error" className="mb-4">
          <CardTitle className="text-sm">Run failed</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </Card>
      )}

      {!providerState.apiKey && (
        <Card status="warning" className="mb-4">
          <CardTitle className="text-sm">Provider key not set</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Configure a provider key on any classic skill or workflow runner first.
            Provider state is shared across pages.
          </p>
        </Card>
      )}

      <div className="grid lg:grid-cols-[1fr_2fr] gap-4">
        {/* LEFT: inputs + DAG + plan */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inputs</CardTitle>
              <CardDescription>
                {workflow.globalInputs.length} fields from the underlying workflow definition.
              </CardDescription>
            </CardHeader>
            <div className="mt-3 space-y-3 max-h-96 overflow-y-auto pr-1">
              {workflow.globalInputs.map((g) => (
                <label key={g.id} className="block">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">
                    {g.label} {g.required && <span className="text-red-500">*</span>}
                  </span>
                  {g.type === 'textarea' ? (
                    <textarea
                      className="w-full text-sm p-2 rounded border bg-background"
                      rows={3}
                      placeholder={g.placeholder}
                      value={inputs[g.id] ?? ''}
                      onChange={(e) =>
                        setInputs((prev) => ({ ...prev, [g.id]: e.target.value }))
                      }
                    />
                  ) : g.type === 'select' && g.options ? (
                    <select
                      className="w-full text-sm p-2 rounded border bg-background"
                      value={inputs[g.id] ?? ''}
                      onChange={(e) =>
                        setInputs((prev) => ({ ...prev, [g.id]: e.target.value }))
                      }
                    >
                      <option value="">Select…</option>
                      {g.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="w-full text-sm p-2 rounded border bg-background"
                      placeholder={g.placeholder}
                      value={inputs[g.id] ?? ''}
                      onChange={(e) =>
                        setInputs((prev) => ({ ...prev, [g.id]: e.target.value }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>
          </Card>

          {activePlan && (
            <Card status="info">
              <CardHeader>
                <CardTitle className="text-sm">Active plan ({activePlan.strategy})</CardTitle>
                {activePlan.reasoning && (
                  <CardDescription className="text-xs italic">
                    {activePlan.reasoning}
                  </CardDescription>
                )}
              </CardHeader>
              {activePlan.skipped.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="font-medium mb-1">Skipped:</div>
                  <ul className="space-y-1">
                    {activePlan.skipped.map((s) => (
                      <li key={s.stepId} className="text-muted-foreground">
                        <code>{s.stepId}</code> — {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* RIGHT: live DAG + per-step results */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Execution graph</CardTitle>
                <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                  {(phase === 'planning' || phase === 'running') && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {phase}
                </span>
              </div>
            </CardHeader>
            <div className="mt-3">
              <WorkflowDAG dag={dag} mode="full" runtimeState={runtimeState} />
            </div>
          </Card>

          {Object.values(results).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step outputs</CardTitle>
              </CardHeader>
              <div className="mt-3 space-y-3">
                {Object.values(results).map((r) => (
                  <details key={r.stepId} className="rounded-lg border bg-card">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium flex items-center justify-between">
                      <span>
                        {r.stepId} <span className="text-xs text-muted-foreground">({r.skillId})</span>
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        r.status === 'succeeded' ? 'bg-emerald-500/15 text-emerald-700' :
                        r.status === 'failed' ? 'bg-red-500/15 text-red-700' :
                        r.status === 'skipped' ? 'bg-muted text-muted-foreground' :
                        'bg-amber-500/15 text-amber-700'
                      }`}>
                        {r.status} · {Math.round(r.durationMs / 1000)}s
                      </span>
                    </summary>
                    <div className="px-3 pb-3 space-y-2">
                      {Object.keys(r.structuredFields).length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                            Structured fields
                          </div>
                          <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto max-h-48">
                            {JSON.stringify(r.structuredFields, null, 2)}
                          </pre>
                        </div>
                      )}
                      {r.rawOutput && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                            Raw output
                          </div>
                          <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-2 rounded max-h-64 overflow-y-auto">
                            {r.rawOutput}
                          </pre>
                        </div>
                      )}
                      {r.errorMessage && (
                        <div className="text-xs text-red-600">{r.errorMessage}</div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </Card>
          )}

          {events.length > 0 && (
            <details className="rounded-lg border bg-card">
              <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground">
                Event log ({events.length})
              </summary>
              <ul className="px-3 pb-3 space-y-0.5 text-[11px] font-mono max-h-48 overflow-y-auto">
                {events.map((e, i) => (
                  <li key={i} className="text-muted-foreground">
                    {e.type}
                    {'roundIndex' in e && ` round=${e.roundIndex}`}
                    {'stepId' in e && ` step=${e.stepId}`}
                    {'status' in e && ` status=${e.status}`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgenticRunnerPage;
