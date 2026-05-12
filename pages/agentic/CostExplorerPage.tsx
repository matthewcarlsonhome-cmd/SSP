/**
 * CostExplorerPage — visualizes model routing decisions and projected costs
 * across three units of analysis:
 *
 *   1. Models — every entry in the price registry, with per-call cost at
 *      typical token sizes and tier classification.
 *   2. Workflows — pick a hand-authored DAG, see each step's classification,
 *      router decision, model, and cost. Toggle between router-driven and
 *      blanket-tier strategies to see the savings live.
 *   3. System — projection of weekly / monthly cost at configurable run
 *      cadence + account count. Shows the spend delta between strategies.
 *
 * No DB reads required to use the page. Every number is computed pure-
 * function from the registry and the hand-authored DAGs.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  Cpu,
  Network,
  TrendingDown,
  ChevronRight,
} from 'lucide-react';
import {
  HAND_AUTHORED_DAGS,
  MODEL_REGISTRY,
  calculateCost,
  classifyStep,
  formatCostCompact,
  listRecentQualityEvents,
  listRecentSkillExecutions,
  listModels,
  planShadowRoute,
  routeDag,
  type AgenticDAG,
  type ModelProfile,
  type ModelTierKey,
  type PersistedQualityEvent,
  type PersistedSkillExecution,
} from '../../lib/agentic';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';

const TIER_ORDER: ModelTierKey[] = ['fast', 'balanced', 'smart', 'reasoning'];

const CostExplorerPage: React.FC = () => {
  const [tab, setTab] = React.useState<'models' | 'workflow' | 'system'>('workflow');

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/agentic"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Agentic Lab
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Cost Explorer
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Model routing decisions and projected costs across the agentic system.
          All numbers come from the price registry in <code>lib/agentic/costing.ts</code>;
          actual run costs (once persisted) overlay these projections.
        </p>
      </div>

      <div className="flex gap-1 mb-6 border-b">
        <TabButton active={tab === 'models'} onClick={() => setTab('models')} icon={Cpu}>
          Models
        </TabButton>
        <TabButton active={tab === 'workflow'} onClick={() => setTab('workflow')} icon={Network}>
          Per workflow
        </TabButton>
        <TabButton active={tab === 'system'} onClick={() => setTab('system')} icon={TrendingDown}>
          System rollup
        </TabButton>
      </div>

      {tab === 'models' && <ModelsTab />}
      {tab === 'workflow' && <WorkflowTab />}
      {tab === 'system' && <SystemTab />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Models tab — registry overview + per-call cost at typical sizes
// ─────────────────────────────────────────────────────────────────────────────

const TYPICAL_USAGE = { inputTokens: 5000, outputTokens: 2000 };

const ModelsTab: React.FC = () => {
  const models = listModels().slice().sort((a, b) => {
    const ti = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
    if (ti !== 0) return ti;
    return calculateCost(TYPICAL_USAGE, a).totalCents - calculateCost(TYPICAL_USAGE, b).totalCents;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Registered models</CardTitle>
        <CardDescription>
          Cost at typical skill-call size: 5K input + 2K output tokens.
        </CardDescription>
      </CardHeader>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
              <th className="py-2 pr-3">Model</th>
              <th className="py-2 pr-3">Provider</th>
              <th className="py-2 pr-3">Tier</th>
              <th className="py-2 pr-3 text-right">Input $/M</th>
              <th className="py-2 pr-3 text-right">Output $/M</th>
              <th className="py-2 pr-3 text-right">Per call</th>
              <th className="py-2 pr-3">Good for</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => {
              const cost = calculateCost(TYPICAL_USAGE, m);
              return (
                <tr key={m.id} className="border-b last:border-b-0 align-top">
                  <td className="py-2 pr-3 font-medium">{m.displayName}</td>
                  <td className="py-2 pr-3"><code className="text-xs">{m.provider}</code></td>
                  <td className="py-2 pr-3">
                    <TierPill tier={m.tier} />
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    ${(m.inputPricePerMTokensCents / 100).toFixed(2)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    ${(m.outputPricePerMTokensCents / 100).toFixed(2)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {formatCostCompact(cost.totalCents)}
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {m.goodFor.slice(0, 3).join(', ')}{m.goodFor.length > 3 && '…'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-workflow tab — pick a DAG, see step-level routing decisions, toggle
// strategies to compare costs.
// ─────────────────────────────────────────────────────────────────────────────

type Strategy = 'router' | 'blanket-fast' | 'blanket-balanced' | 'blanket-smart';

const STRATEGY_LABELS: Record<Strategy, string> = {
  'router': 'Router-driven',
  'blanket-fast': 'Blanket Haiku/Flash',
  'blanket-balanced': 'Blanket Sonnet/4o',
  'blanket-smart': 'Blanket Opus',
};

function persistedCost(row: PersistedSkillExecution): number {
  return Number(row.actual_cost_cents ?? row.estimated_cost_cents ?? row.cost_cents ?? 0);
}

function dayKey(value: string | null | undefined): string {
  if (!value) return 'unknown';
  return value.slice(0, 10);
}

function completenessProxy(row: PersistedSkillExecution): number {
  if (row.status === 'failed') return 0;
  const fields = row.structured_output ?? {};
  const fieldCount = Object.values(fields).filter((value) => value !== undefined && value !== null && value !== '').length;
  if (fieldCount > 0) return 1;
  if ((row.raw_output?.length ?? 0) > 100) return 0.5;
  return 0;
}

function workflowForExecution(row: PersistedSkillExecution): string {
  for (const dag of Object.values(HAND_AUTHORED_DAGS)) {
    if (dag.steps.some((step) => step.id === row.step_id || step.skillId === row.skill_id)) {
      return dag.id;
    }
  }
  return 'unknown';
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function blanketModelForTier(tier: ModelTierKey): ModelProfile | null {
  const candidates = listModels()
    .filter((m) => m.tier === tier && m.provider === 'claude')
    .sort((a, b) => a.outputPricePerMTokensCents - b.outputPricePerMTokensCents);
  return candidates[0] ?? null;
}

const WorkflowTab: React.FC = () => {
  const dagIds = Object.keys(HAND_AUTHORED_DAGS);
  const [dagId, setDagId] = React.useState<string>(dagIds[0] ?? '');
  const dag: AgenticDAG | undefined = HAND_AUTHORED_DAGS[dagId];

  const [strategy, setStrategy] = React.useState<Strategy>('router');

  const stepBreakdown = React.useMemo(() => {
    if (!dag) return [];
    const routerPlan = routeDag(dag);
    return dag.steps.map((step) => {
      const planEntry = routerPlan.perStep[step.id];
      const classification = planEntry.classification;

      let model: ModelProfile;
      if (strategy === 'router') {
        model = planEntry.choice.model;
      } else {
        const tier: ModelTierKey =
          strategy === 'blanket-fast' ? 'fast' :
          strategy === 'blanket-balanced' ? 'balanced' :
          'smart';
        model = blanketModelForTier(tier) ?? planEntry.choice.model;
      }

      const usage = {
        inputTokens: classification.estimatedInputTokens,
        outputTokens: classification.estimatedOutputTokens,
      };
      const cost = calculateCost(usage, model);
      const reasoning = strategy === 'router' ? planEntry.choice.reasoning : `Blanket ${strategy}`;

      return { step, classification, model, cost: cost.totalCents, reasoning, tier: model.tier };
    });
  }, [dag, strategy]);

  const totalCents = stepBreakdown.reduce((s, b) => s + b.cost, 0);

  // Compute the four totals so the savings comparison is always visible.
  const allFourTotals = React.useMemo(() => {
    if (!dag) return null;
    const out: Record<Strategy, number> = {
      router: 0,
      'blanket-fast': 0,
      'blanket-balanced': 0,
      'blanket-smart': 0,
    };
    const plan = routeDag(dag);
    for (const step of dag.steps) {
      const c = plan.perStep[step.id].classification;
      const usage = { inputTokens: c.estimatedInputTokens, outputTokens: c.estimatedOutputTokens };
      out.router += plan.perStep[step.id].choice.estimatedCostCents;
      const fast = blanketModelForTier('fast');
      const balanced = blanketModelForTier('balanced');
      const smart = blanketModelForTier('smart');
      if (fast) out['blanket-fast'] += calculateCost(usage, fast).totalCents;
      if (balanced) out['blanket-balanced'] += calculateCost(usage, balanced).totalCents;
      if (smart) out['blanket-smart'] += calculateCost(usage, smart).totalCents;
    }
    return out;
  }, [dag]);

  if (!dag) {
    return <Card><CardTitle className="text-sm">No DAGs registered</CardTitle></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Workflow picker */}
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Workflow:</span>
            <select
              value={dagId}
              onChange={(e) => setDagId(e.target.value)}
              className="text-sm p-1.5 rounded border bg-background"
            >
              {dagIds.map((id) => (
                <option key={id} value={id}>{HAND_AUTHORED_DAGS[id].name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground mr-1">Strategy:</span>
            {(Object.keys(STRATEGY_LABELS) as Strategy[]).map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`text-xs px-2 py-1 rounded ${
                  strategy === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {STRATEGY_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Strategy comparison strip */}
      {allFourTotals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(STRATEGY_LABELS) as Strategy[]).map((s) => {
            const total = allFourTotals[s];
            const isCurrent = strategy === s;
            const isCheapest = total === Math.min(...Object.values(allFourTotals));
            return (
              <div
                key={s}
                className={`p-3 rounded-lg border ${
                  isCurrent ? 'border-primary bg-primary/5' : isCheapest ? 'border-emerald-500/40 bg-emerald-500/5' : 'bg-card'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {STRATEGY_LABELS[s]}
                </div>
                <div className="text-xl font-bold mt-0.5">{formatCostCompact(total)}</div>
                {isCheapest && <div className="text-[10px] text-emerald-600 mt-0.5">cheapest</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Per-step table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-step breakdown — {STRATEGY_LABELS[strategy]}</CardTitle>
          <CardDescription>
            Total estimated cost: <strong>{formatCostCompact(totalCents)}</strong>
          </CardDescription>
        </CardHeader>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="py-2 pr-3">Step</th>
                <th className="py-2 pr-3">Kind</th>
                <th className="py-2 pr-3">Complexity</th>
                <th className="py-2 pr-3">Model</th>
                <th className="py-2 pr-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {stepBreakdown.map((b) => (
                <tr key={b.step.id} className="border-b last:border-b-0 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{b.step.name}</div>
                    <div className="text-[10px] text-muted-foreground"><code>{b.step.id}</code></div>
                  </td>
                  <td className="py-2 pr-3 text-xs"><code>{b.classification.kind}</code></td>
                  <td className="py-2 pr-3"><ComplexityPill complexity={b.classification.complexity} /></td>
                  <td className="py-2 pr-3 text-xs">
                    {b.model.displayName}
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      <TierPill tier={b.tier} />
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">{formatCostCompact(b.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reasoning trace (router strategy only) */}
      {strategy === 'router' && (
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Routing reasoning trace
          </summary>
          <ul className="mt-3 space-y-2 text-xs">
            {stepBreakdown.map((b) => (
              <li key={b.step.id}>
                <code className="font-semibold">{b.step.id}</code>:{' '}
                <span className="text-muted-foreground">{b.reasoning}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// System rollup — projections at configurable cadence + scale.
// ─────────────────────────────────────────────────────────────────────────────

const SystemTab: React.FC = () => {
  const dags = Object.values(HAND_AUTHORED_DAGS);
  const [runsPerWeek, setRunsPerWeek] = React.useState(50);
  const [accounts, setAccounts] = React.useState(45);
  const [actualExecutions, setActualExecutions] = React.useState<PersistedSkillExecution[]>([]);
  const [qualityEvents, setQualityEvents] = React.useState<PersistedQualityEvent[]>([]);
  const [actualLoaded, setActualLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      listRecentSkillExecutions(100),
      listRecentQualityEvents(100),
    ]).then(([executionRows, qualityRows]) => {
      if (cancelled) return;
      setActualExecutions(executionRows);
      setQualityEvents(qualityRows);
      setActualLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const projections = dags.map((dag) => {
    const router = routeDag(dag);
    const planRunOnce = router.totalEstimatedCostCents;
    const fast = blanketModelForTier('fast');
    const balanced = blanketModelForTier('balanced');
    const smart = blanketModelForTier('smart');

    const totals: Record<Strategy, number> = {
      router: 0,
      'blanket-fast': 0,
      'blanket-balanced': 0,
      'blanket-smart': 0,
    };
    totals.router = planRunOnce;
    for (const step of dag.steps) {
      const c = router.perStep[step.id].classification;
      const usage = { inputTokens: c.estimatedInputTokens, outputTokens: c.estimatedOutputTokens };
      if (fast) totals['blanket-fast'] += calculateCost(usage, fast).totalCents;
      if (balanced) totals['blanket-balanced'] += calculateCost(usage, balanced).totalCents;
      if (smart) totals['blanket-smart'] += calculateCost(usage, smart).totalCents;
    }
    return { dag, totals };
  });

  // Annual projection: runsPerWeek * 52 * accounts (the agentic platform
  // multiplies these together — every workflow runs against every account).
  const annualMultiplier = runsPerWeek * 52 * accounts;
  const totalAnnualRouter = projections.reduce((s, p) => s + p.totals.router, 0) * annualMultiplier / 100;
  const totalAnnualBlanketSmart = projections.reduce((s, p) => s + p.totals['blanket-smart'], 0) * annualMultiplier / 100;
  const annualSavings = totalAnnualBlanketSmart - totalAnnualRouter;
  const actualTotalCents = actualExecutions.reduce(
    (sum, row) => sum + persistedCost(row),
    0,
  );
  const actualByTier = actualExecutions.reduce<Record<string, number>>((acc, row) => {
    const tier = row.model_tier ?? 'unknown';
    acc[tier] = (acc[tier] ?? 0) + persistedCost(row);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cadence & scale</CardTitle>
          <CardDescription>Tune the projection inputs.</CardDescription>
        </CardHeader>
        <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
          <label className="block">
            <span className="text-xs font-medium block mb-1">Runs per workflow per week</span>
            <input
              type="number"
              min={1}
              value={runsPerWeek}
              onChange={(e) => setRunsPerWeek(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-full text-sm p-2 rounded border bg-background"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium block mb-1">Account / client multiplier</span>
            <input
              type="number"
              min={1}
              value={accounts}
              onChange={(e) => setAccounts(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-full text-sm p-2 rounded border bg-background"
            />
          </label>
        </div>
      </Card>

      <Card status="info">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Annual projection (all workflows × cadence × accounts)
          </CardTitle>
        </CardHeader>
        <div className="mt-3 grid sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-card border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Router-driven</div>
            <div className="text-2xl font-bold mt-0.5 text-emerald-600">
              ${totalAnnualRouter.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Blanket Opus</div>
            <div className="text-2xl font-bold mt-0.5 text-red-600">
              ${totalAnnualBlanketSmart.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/40">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Annual savings</div>
            <div className="text-2xl font-bold mt-0.5 text-emerald-600">
              ${annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {totalAnnualBlanketSmart > 0
                ? `${((annualSavings / totalAnnualBlanketSmart) * 100).toFixed(0)}% reduction`
                : ''}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actual attribution overlay</CardTitle>
          <CardDescription>
            Recent persisted agentic skill executions from Supabase. When no rows load, this page remains a projection tool.
          </CardDescription>
        </CardHeader>
        <div className="mt-3 grid sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-card border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Rows loaded</div>
            <div className="text-2xl font-bold mt-0.5">{actualLoaded ? actualExecutions.length : '...'}</div>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Actual cost</div>
            <div className="text-2xl font-bold mt-0.5">{formatCostCompact(actualTotalCents)}</div>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Spend by tier</div>
            <div className="text-xs mt-1 space-y-0.5">
              {Object.keys(actualByTier).length === 0 && (
                <span className="text-muted-foreground">No persisted routing rows yet.</span>
              )}
              {Object.entries(actualByTier).map(([tier, cents]) => (
                <div key={tier} className="flex justify-between gap-3">
                  <span><code>{tier}</code></span>
                  <span className="font-mono">{formatCostCompact(cents)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <ActualQualityMetrics executions={actualExecutions} qualityEvents={qualityEvents} />
      <ShadowDownshiftCandidates dags={dags} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-workflow breakdown</CardTitle>
          <CardDescription>Single-run cost across strategies.</CardDescription>
        </CardHeader>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="py-2 pr-3">Workflow</th>
                <th className="py-2 pr-3">Steps</th>
                <th className="py-2 pr-3 text-right">Router</th>
                <th className="py-2 pr-3 text-right">Blanket fast</th>
                <th className="py-2 pr-3 text-right">Blanket balanced</th>
                <th className="py-2 pr-3 text-right">Blanket smart</th>
                <th className="py-2 pr-3 text-right">Savings vs. smart</th>
              </tr>
            </thead>
            <tbody>
              {projections.map(({ dag, totals }) => {
                const savings = totals['blanket-smart'] - totals.router;
                const savingsPct = totals['blanket-smart'] > 0 ? (savings / totals['blanket-smart']) * 100 : 0;
                return (
                  <tr key={dag.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 font-medium">{dag.name}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{dag.steps.length}</td>
                    <td className="py-2 pr-3 text-right font-mono text-emerald-600">{formatCostCompact(totals.router)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">{formatCostCompact(totals['blanket-fast'])}</td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">{formatCostCompact(totals['blanket-balanced'])}</td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">{formatCostCompact(totals['blanket-smart'])}</td>
                    <td className="py-2 pr-3 text-right text-xs">
                      <span className="text-emerald-600">−{savingsPct.toFixed(0)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Local UI bits
// ─────────────────────────────────────────────────────────────────────────────

const ActualQualityMetrics: React.FC<{
  executions: PersistedSkillExecution[];
  qualityEvents: PersistedQualityEvent[];
}> = ({ executions, qualityEvents }) => {
  const costByDay = React.useMemo(() => {
    const rows: Record<string, number> = {};
    for (const row of executions) {
      const key = dayKey(row.started_at);
      rows[key] = (rows[key] ?? 0) + persistedCost(row);
    }
    return rows;
  }, [executions]);

  const byDay = React.useMemo(() => {
    if (qualityEvents.length > 0) {
      const rows: Record<string, { calls: number; cost: number; completeness: number[] }> = {};
      for (const event of qualityEvents) {
        const key = dayKey(event.created_at);
        rows[key] = rows[key] ?? { calls: 0, cost: costByDay[key] ?? 0, completeness: [] };
        rows[key].calls += 1;
        rows[key].completeness.push(Number(event.contract_completeness ?? 0));
      }
      return Object.entries(rows)
        .map(([day, value]) => ({ day, ...value, averageCompleteness: average(value.completeness) }))
        .sort((a, b) => b.day.localeCompare(a.day))
        .slice(0, 10);
    }

    const rows: Record<string, { calls: number; cost: number; completeness: number[] }> = {};
    for (const row of executions) {
      const key = dayKey(row.started_at);
      rows[key] = rows[key] ?? { calls: 0, cost: 0, completeness: [] };
      rows[key].calls += 1;
      rows[key].cost += persistedCost(row);
      rows[key].completeness.push(completenessProxy(row));
    }
    return Object.entries(rows)
      .map(([day, value]) => ({ day, ...value, averageCompleteness: average(value.completeness) }))
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, 10);
  }, [costByDay, executions, qualityEvents]);

  const byTierWorkflow = React.useMemo(() => {
    if (qualityEvents.length > 0) {
      const rows: Record<string, { tier: string; workflow: string; calls: number; completeness: number[]; failures: number; retries: number }> = {};
      for (const event of qualityEvents) {
        const tier = event.model_tier ?? 'unknown';
        const workflow = event.workflow_id;
        const key = `${workflow}:${tier}`;
        rows[key] = rows[key] ?? { tier, workflow, calls: 0, completeness: [], failures: 0, retries: 0 };
        rows[key].calls += 1;
        rows[key].completeness.push(Number(event.contract_completeness ?? 0));
        if (event.status === 'failed') rows[key].failures += 1;
        if (['retry', 'escalate', 'replan', 'stop'].includes(event.decision)) rows[key].retries += 1;
      }
      return Object.values(rows)
        .map((row) => ({
          ...row,
          averageCompleteness: average(row.completeness),
          retryRateProxy: row.calls === 0 ? 0 : row.retries / row.calls,
        }))
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 12);
    }

    const rows: Record<string, { tier: string; workflow: string; calls: number; completeness: number[]; failures: number; escalations: number }> = {};
    for (const row of executions) {
      const tier = row.model_tier ?? 'unknown';
      const workflow = workflowForExecution(row);
      const key = `${workflow}:${tier}`;
      rows[key] = rows[key] ?? { tier, workflow, calls: 0, completeness: [], failures: 0, escalations: 0 };
      rows[key].calls += 1;
      rows[key].completeness.push(completenessProxy(row));
      if (row.status === 'failed') rows[key].failures += 1;
      if (row.routing_reason?.includes('Escalated by quality gate')) rows[key].escalations += 1;
    }
    return Object.values(rows)
      .map((row) => ({
        ...row,
        averageCompleteness: average(row.completeness),
        retryRateProxy: row.calls === 0 ? 0 : (row.failures + row.escalations) / row.calls,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 12);
  }, [executions, qualityEvents]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost and quality rollup</CardTitle>
        <CardDescription>
          Uses persisted quality events when available; falls back to execution-row quality proxies for offline/local runs.
        </CardDescription>
      </CardHeader>
      <div className="mt-3 grid xl:grid-cols-2 gap-4">
        <div className="overflow-x-auto">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Actual rows grouped by day</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="py-2 pr-3">Day</th>
                <th className="py-2 pr-3 text-right">Calls</th>
                <th className="py-2 pr-3 text-right">Cost</th>
                <th className="py-2 pr-3 text-right">Completeness</th>
              </tr>
            </thead>
            <tbody>
              {byDay.length === 0 && (
                <tr><td className="py-3 text-muted-foreground" colSpan={4}>No persisted rows yet.</td></tr>
              )}
              {byDay.map((row) => (
                <tr key={row.day} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-medium">{row.day}</td>
                  <td className="py-2 pr-3 text-right">{row.calls}</td>
                  <td className="py-2 pr-3 text-right font-mono">{formatCostCompact(row.cost)}</td>
                  <td className="py-2 pr-3 text-right">{(row.averageCompleteness * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Tier mix and quality by workflow</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                <th className="py-2 pr-3">Workflow</th>
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3 text-right">Calls</th>
                <th className="py-2 pr-3 text-right">Complete</th>
                <th className="py-2 pr-3 text-right">Retry</th>
              </tr>
            </thead>
            <tbody>
              {byTierWorkflow.length === 0 && (
                <tr><td className="py-3 text-muted-foreground" colSpan={5}>No persisted rows yet.</td></tr>
              )}
              {byTierWorkflow.map((row) => (
                <tr key={`${row.workflow}-${row.tier}`} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-medium">{row.workflow}</td>
                  <td className="py-2 pr-3"><code className="text-xs">{row.tier}</code></td>
                  <td className="py-2 pr-3 text-right">{row.calls}</td>
                  <td className="py-2 pr-3 text-right">{(row.averageCompleteness * 100).toFixed(0)}%</td>
                  <td className="py-2 pr-3 text-right">{(row.retryRateProxy * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

const ShadowDownshiftCandidates: React.FC<{ dags: AgenticDAG[] }> = ({ dags }) => {
  const rows = React.useMemo(() => {
    return dags.flatMap((dag) => {
      const routed = routeDag(dag);
      return dag.steps.map((step) => {
        const entry = routed.perStep[step.id];
        const shadow = planShadowRoute(entry.classification, entry.choice);
        return { dag, step, entry, shadow };
      });
    }).filter((row) => row.shadow.eligible && row.shadow.shadowChoice).slice(0, 12);
  }, [dags]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Candidate downshift experiments</CardTitle>
        <CardDescription>
          Shadow-route rows identify cheaper tiers worth testing against current production routing.
        </CardDescription>
      </CardHeader>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
              <th className="py-2 pr-3">Workflow</th>
              <th className="py-2 pr-3">Step</th>
              <th className="py-2 pr-3">Production</th>
              <th className="py-2 pr-3">Candidate</th>
              <th className="py-2 pr-3 text-right">Savings</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="py-3 text-muted-foreground" colSpan={5}>No downshift candidates under current routing.</td></tr>
            )}
            {rows.map(({ dag, step, entry, shadow }) => {
              const shadowChoice = shadow.shadowChoice!;
              const savings = entry.choice.estimatedCostCents - shadowChoice.estimatedCostCents;
              return (
                <tr key={`${dag.id}-${step.id}`} className="border-b last:border-b-0 align-top">
                  <td className="py-2 pr-3 font-medium">{dag.name}</td>
                  <td className="py-2 pr-3 text-xs">{step.name}</td>
                  <td className="py-2 pr-3 text-xs">
                    <TierPill tier={entry.choice.selectedTier} />
                    <div className="font-mono mt-1">{formatCostCompact(entry.choice.estimatedCostCents)}</div>
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    <TierPill tier={shadowChoice.selectedTier} />
                    <div className="font-mono mt-1">{formatCostCompact(shadowChoice.estimatedCostCents)}</div>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-emerald-600">
                    {formatCostCompact(Math.max(0, savings))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
      active
        ? 'border-primary text-foreground font-medium'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`}
  >
    <Icon className="h-4 w-4" />
    {children}
  </button>
);

const TIER_PILL_STYLES: Record<ModelTierKey, string> = {
  fast:      'bg-emerald-500/15 text-emerald-700',
  balanced:  'bg-blue-500/15 text-blue-700',
  smart:     'bg-amber-500/15 text-amber-700',
  reasoning: 'bg-purple-500/15 text-purple-700',
};

const TierPill: React.FC<{ tier: ModelTierKey }> = ({ tier }) => (
  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${TIER_PILL_STYLES[tier]}`}>
    {tier}
  </span>
);

const ComplexityPill: React.FC<{ complexity: string }> = ({ complexity }) => (
  <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold bg-muted text-muted-foreground">
    {complexity}
  </span>
);

export default CostExplorerPage;
