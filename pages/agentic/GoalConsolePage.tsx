import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Loader2,
  Play,
  Route,
  Sparkles,
} from 'lucide-react';
import {
  buildGoalPlan,
  formatCostCompact,
  inspectGoalPlanReadiness,
  persistRun,
  retrieveMemoryForGoal,
  routeDag,
  runAgenticDAG,
  type AgenticProvider,
  type GoalContextEnvelope,
  type GoalPlan,
  type GoalPlanReadiness,
  type RunnerEvent,
  type StepRunResult,
} from '../../lib/agentic';
import { buildMemoryContextEnvelope, memoryFactsToKeyValue } from '../../lib/agentic/memory';
import { useProviderConfig } from '../../components/ProviderConfig';
import { Button } from '../../components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';

type EntityType = NonNullable<GoalContextEnvelope['entity']>['type'];
type Audience = NonNullable<GoalContextEnvelope['audience']>;

const ENTITY_TYPES: EntityType[] = [
  'client',
  'account',
  'deal',
  'campaign',
  'project',
  'document',
  'person',
  'portfolio',
];

const AUDIENCES: Audience[] = ['team', 'client', 'leadership', 'internal'];

const DEFAULT_GOAL = 'Create a weekly PPC operating packet for priority client accounts.';

function splitHints(value: string): string[] {
  return value
    .split(',')
    .map((hint) => hint.trim())
    .filter(Boolean);
}

function parseBudgetCents(value: string): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function resultSummary(results: Record<string, StepRunResult>): string {
  const values = Object.values(results);
  const succeeded = values.filter((result) => result.status === 'succeeded').length;
  const failed = values.filter((result) => result.status === 'failed').length;
  const skipped = values.filter((result) => result.status === 'skipped').length;
  return `${succeeded} succeeded, ${failed} failed, ${skipped} skipped.`;
}

const GoalConsolePage: React.FC = () => {
  const { state: providerState } = useProviderConfig();
  const [goal, setGoal] = React.useState(DEFAULT_GOAL);
  const [audience, setAudience] = React.useState<Audience>('client');
  const [entityType, setEntityType] = React.useState<EntityType>('account');
  const [entityId, setEntityId] = React.useState('ssp-mcc');
  const [domainHints, setDomainHints] = React.useState('ppc, paid media, client reporting');
  const [budgetCents, setBudgetCents] = React.useState('25');
  const [plan, setPlan] = React.useState<GoalPlan | null>(null);
  const [results, setResults] = React.useState<Record<string, StepRunResult>>({});
  const [events, setEvents] = React.useState<RunnerEvent[]>([]);
  const [phase, setPhase] = React.useState<'idle' | 'planning' | 'planned' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const context = React.useMemo<GoalContextEnvelope>(() => {
    const parsedBudget = parseBudgetCents(budgetCents);
    const entity = entityId.trim() ? { type: entityType, id: entityId.trim() } : undefined;
    return {
      audience,
      entity,
      domainHints: splitHints(domainHints),
      budgetCents: parsedBudget,
      requireApprovalForSideEffects: true,
    };
  }, [audience, budgetCents, domainHints, entityId, entityType]);

  const routePlan = React.useMemo(() => {
    if (!plan) return null;
    try {
      return routeDag(plan.dag, {
        agentDailyBudgetCents: context.budgetCents ?? 0,
        perCallCeilingCents: context.budgetCents ?? 0,
      });
    } catch {
      return null;
    }
  }, [context.budgetCents, plan]);
  const readiness = React.useMemo(
    () => (plan ? inspectGoalPlanReadiness(plan, plan.firstStepInput) : null),
    [plan],
  );

  const canPlan = goal.trim().length > 0 && phase !== 'running';
  const hasValidationErrors = Boolean(plan?.validation.russellian.errors.length);
  const canRun = Boolean(
    plan &&
    providerState.apiKey &&
    !hasValidationErrors &&
    readiness?.ready &&
    phase !== 'running',
  );

  const handlePlan = async () => {
    setPhase('planning');
    setError(null);
    setResults({});
    setEvents([]);
    try {
      const memory = await retrieveMemoryForGoal({
        entity: context.entity,
        goal,
        domainHints: context.domainHints,
      });
      const nextPlan = buildGoalPlan({
        goal,
        context: {
          ...context,
          memory,
          memoryFacts: memory.facts,
        },
      });
      setPlan(nextPlan);
      setPhase('planned');
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRun = async () => {
    if (!plan || !providerState.apiKey) return;
    setPhase('running');
    setError(null);
    setResults({});
    setEvents([]);
    abortRef.current = new AbortController();

    try {
      const memory = plan.memory ?? buildMemoryContextEnvelope({
        focusEntity: context.entity,
        facts: context.memoryFacts ?? [],
      });
      const userInputs = {
        ...plan.firstStepInput,
        goal,
        goalContext: context,
        memorySummary: memory.summary,
        memoryKeys: memoryFactsToKeyValue(memory.facts),
      };
      const finalResults = await runAgenticDAG(plan.dag, {
        provider: providerState.provider as AgenticProvider,
        apiKey: providerState.apiKey,
        userInputs,
        precomputedRounds: plan.executionPlan.rounds,
        signal: abortRef.current.signal,
        routingContext: {
          agentDailyBudgetCents: context.budgetCents ?? 0,
          perCallCeilingCents: context.budgetCents ?? 0,
          latencySensitive: false,
        },
        quality: {
          enabled: true,
          maxRetriesPerStep: 2,
        },
        onEvent: (event) => {
          setEvents((prev) => [...prev, event]);
          if (event.type === 'step-completed') {
            setResults((prev) => ({ ...prev, [event.result.stepId]: event.result }));
          }
        },
      });
      const failed = Object.values(finalResults).some((result) => result.status === 'failed');
      await persistRun(
        {
          agentId: 'business-agent',
          workflowId: plan.dag.id,
          plan: plan.executionPlan,
          dag: plan.dag,
          triggerEventId: null,
        },
        finalResults,
        plan.executionPlan.rounds,
        failed ? 'failed' : 'succeeded',
        `Goal Console run: ${resultSummary(finalResults)}`,
      );
      setResults(finalResults);
      setPhase(failed ? 'error' : 'done');
      if (failed) setError(resultSummary(finalResults));
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAbort = () => {
    abortRef.current?.abort();
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

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Goal Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Plan an open business goal into capabilities, rounds, routing, and executable DAG steps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePlan} disabled={!canPlan} size="sm" variant="secondary">
            {phase === 'planning' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Brain className="h-4 w-4 mr-1" />}
            Plan goal
          </Button>
          <Button onClick={handleRun} disabled={!canRun} size="sm">
            {phase === 'running' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Run plan
          </Button>
          {phase === 'running' && (
            <Button onClick={handleAbort} size="sm" variant="outline">
              Abort
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card status="error" className="mb-4">
          <CardTitle className="text-sm">Goal run issue</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </Card>
      )}

      {!providerState.apiKey && (
        <Card status="warning" className="mb-4">
          <CardTitle className="text-sm">Provider key not set</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Configure a provider key before running. Planning remains available without an API call.
          </p>
        </Card>
      )}

      <div className="grid lg:grid-cols-[0.9fr_1.4fr] gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Goal intake</CardTitle>
              <CardDescription>Provider: {providerState.provider}</CardDescription>
            </CardHeader>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground block mb-1">Goal</span>
                <textarea
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  rows={5}
                  className="w-full text-sm p-2 rounded border bg-background"
                />
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">Audience</span>
                  <select
                    value={audience}
                    onChange={(event) => setAudience(event.target.value as Audience)}
                    className="w-full text-sm p-2 rounded border bg-background"
                  >
                    {AUDIENCES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">Budget cap (cents)</span>
                  <input
                    type="number"
                    min={0}
                    value={budgetCents}
                    onChange={(event) => setBudgetCents(event.target.value)}
                    className="w-full text-sm p-2 rounded border bg-background"
                  />
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">Entity type</span>
                  <select
                    value={entityType}
                    onChange={(event) => setEntityType(event.target.value as EntityType)}
                    className="w-full text-sm p-2 rounded border bg-background"
                  >
                    {ENTITY_TYPES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">Entity id</span>
                  <input
                    type="text"
                    value={entityId}
                    onChange={(event) => setEntityId(event.target.value)}
                    className="w-full text-sm p-2 rounded border bg-background"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-muted-foreground block mb-1">Domain hints</span>
                <input
                  type="text"
                  value={domainHints}
                  onChange={(event) => setDomainHints(event.target.value)}
                  className="w-full text-sm p-2 rounded border bg-background"
                />
              </label>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Run status</CardTitle>
            </CardHeader>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <StatusBox label="Phase" value={phase} />
              <StatusBox label="Events" value={events.length} />
              <StatusBox label="Results" value={Object.keys(results).length} />
              <StatusBox
                label="Cost"
                value={routePlan ? formatCostCompact(routePlan.totalEstimatedCostCents) : 'n/a'}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <PlanPreview plan={plan} routePlan={routePlan} readiness={readiness} />
          <RunResults results={results} events={events} />
        </div>
      </div>
    </div>
  );
};

const PlanPreview: React.FC<{
  plan: GoalPlan | null;
  routePlan: ReturnType<typeof routeDag> | null;
  readiness: GoalPlanReadiness | null;
}> = ({ plan, routePlan, readiness }) => {
  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan preview</CardTitle>
          <CardDescription>No active plan yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="h-4 w-4 text-primary" />
              {plan.dag.name}
            </CardTitle>
            <CardDescription>{plan.dag.description}</CardDescription>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium">
            {formatCostCompact(plan.executionPlan.estimatedCostCents ?? routePlan?.totalEstimatedCostCents ?? 0)}
          </span>
        </div>
      </CardHeader>

      <div className="mt-4 grid sm:grid-cols-3 gap-2">
        <StatusBox label="Steps" value={plan.dag.steps.length} />
        <StatusBox label="Rounds" value={plan.executionPlan.rounds.length} />
        <StatusBox label="Readiness" value={readiness?.ready ? 'ready' : 'needs input'} />
      </div>

      <div className="mt-4 grid xl:grid-cols-2 gap-3">
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Selected capabilities
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {plan.selectedCapabilities.map((capability) => (
              <div key={capability.id} className="text-xs rounded border bg-card p-2">
                <div className="font-medium">{capability.name}</div>
                <div className="text-muted-foreground mt-0.5">
                  <code>{capability.id}</code>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>{capability.task.kind}</span>
                  <span>{capability.routing.preferredTier ?? capability.routing.minTier}</span>
                  <span>{capability.safety.sideEffects.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Execution rounds
          </div>
          <div className="space-y-2">
            {plan.executionPlan.rounds.map((round) => (
              <div key={round.index} className="text-xs rounded border bg-card p-2">
                <div className="font-medium">Round {round.index + 1}</div>
                <div className="text-muted-foreground mt-1">{round.stepIds.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ValidationBlock
        title="Russellian validation"
        errors={plan.validation.russellian.errors.map((issue) => `${issue.stepId}: ${issue.message}`)}
        warnings={plan.validation.russellian.warnings.map((issue) => `${issue.stepId}: ${issue.message}`)}
      />
      <ValidationBlock
        title="Wittgensteinian fit"
        errors={plan.validation.wittgensteinian.errors.map((issue) => `${issue.stepId}: ${issue.message}`)}
        warnings={plan.validation.wittgensteinian.warnings.map((issue) => `${issue.stepId}: ${issue.message}`)}
      />
      {readiness && (
        <ValidationBlock
          title="Readiness"
          errors={[
            ...readiness.blockingErrors.map((issue) => issue.message),
            ...readiness.missingInputs.map((issue) => issue.message),
          ]}
          warnings={[
            ...readiness.warnings.map((issue) => issue.message),
            ...readiness.clarifyingQuestions.map((question) => `Question: ${question}`),
          ]}
        />
      )}
    </Card>
  );
};

const RunResults: React.FC<{
  results: Record<string, StepRunResult>;
  events: RunnerEvent[];
}> = ({ results, events }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Execution output</CardTitle>
      <CardDescription>{Object.keys(results).length} completed step result(s).</CardDescription>
    </CardHeader>
    <div className="mt-3 space-y-3">
      {Object.values(results).map((result) => (
        <details key={result.stepId} className="rounded-lg border bg-card">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium flex items-center justify-between gap-3">
            <span className="truncate">{result.stepId}</span>
            <span className="text-xs text-muted-foreground">{result.routing?.modelTier ?? result.status}</span>
          </summary>
          <div className="px-3 pb-3 space-y-2">
            {result.routing && (
              <div className="text-xs rounded bg-muted/40 p-2">
                <div className="font-medium">{result.routing.modelId}</div>
                <div className="text-muted-foreground mt-0.5">{result.routing.routingReason}</div>
              </div>
            )}
            <pre className="text-xs bg-muted/30 p-2 rounded max-h-56 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(result.structuredFields, null, 2)}
            </pre>
            {result.errorMessage && <div className="text-xs text-red-600">{result.errorMessage}</div>}
          </div>
        </details>
      ))}
      {events.length > 0 && (
        <details className="rounded-lg border bg-card">
          <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground">
            Event log ({events.length})
          </summary>
          <ul className="px-3 pb-3 space-y-0.5 text-[11px] font-mono max-h-48 overflow-y-auto">
            {events.map((event, index) => (
              <li key={`${event.type}-${index}`} className="text-muted-foreground">
                {event.type}
                {'roundIndex' in event && ` round=${event.roundIndex}`}
                {'stepId' in event && ` step=${event.stepId}`}
                {'decision' in event && ` decision=${event.decision}`}
                {'status' in event && ` status=${event.status}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  </Card>
);

const StatusBox: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-lg border bg-card p-3">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    <div className="text-sm font-semibold mt-1">{value}</div>
  </div>
);

const ValidationBlock: React.FC<{
  title: string;
  errors: string[];
  warnings: string[];
}> = ({ title, errors, warnings }) => (
  <div className="mt-4 rounded-lg border bg-card p-3">
    <div className="flex items-center gap-2 text-sm font-medium">
      {errors.length > 0 ? (
        <AlertTriangle className="h-4 w-4 text-red-600" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      )}
      {title}
    </div>
    {errors.length === 0 && warnings.length === 0 && (
      <div className="text-xs text-muted-foreground mt-2">No issues found.</div>
    )}
    {errors.length > 0 && (
      <ul className="mt-2 space-y-1 text-xs text-red-600">
        {errors.map((item) => <li key={item}>{item}</li>)}
      </ul>
    )}
    {warnings.length > 0 && (
      <ul className="mt-2 space-y-1 text-xs text-amber-700">
        {warnings.map((item) => <li key={item}>{item}</li>)}
      </ul>
    )}
  </div>
);

export default GoalConsolePage;
