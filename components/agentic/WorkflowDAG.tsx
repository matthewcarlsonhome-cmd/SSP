/**
 * WorkflowDAG — visualizes an AgenticDAG as a rounds-and-nodes diagram.
 *
 * Three visual modes:
 *  - thumbnail: dense pill row for catalog cards
 *  - compact:   single-column rounds for sidebar/list contexts
 *  - full:      labeled rounds with parallel groups, dependency arrows
 *
 * Live status: pass `runtimeState` to color nodes by execution state.
 * If omitted, the diagram renders in static "structure only" mode.
 */

import React from 'react';
import type {
  AgenticDAG,
  AgenticStep,
  ExecutionRound,
  StepRuntimeState,
  StepStatus,
} from '../../lib/agentic';
import { buildExecutionRounds } from '../../lib/agentic';

export type DAGMode = 'thumbnail' | 'compact' | 'full';

interface WorkflowDAGProps {
  dag: AgenticDAG;
  mode?: DAGMode;
  runtimeState?: Record<string, StepRuntimeState>;
  onStepClick?: (step: AgenticStep) => void;
}

const STATUS_STYLES: Record<StepStatus, string> = {
  pending:   'bg-muted text-muted-foreground border-border',
  ready:     'bg-blue-500/10 text-blue-600 border-blue-500/40',
  running:   'bg-amber-500/15 text-amber-700 border-amber-500/50 animate-pulse',
  succeeded: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/50',
  failed:    'bg-red-500/15 text-red-700 border-red-500/50',
  skipped:   'bg-muted/50 text-muted-foreground border-dashed border-border line-through',
};

function statusFor(stepId: string, runtime?: Record<string, StepRuntimeState>): StepStatus {
  return runtime?.[stepId]?.status ?? 'pending';
}

// ─────────────────────────────────────────────────────────────────────────────
// Thumbnail mode — for catalog cards and other small surfaces.
// ─────────────────────────────────────────────────────────────────────────────
function ThumbnailDAG({ rounds }: { rounds: ExecutionRound[] }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      {rounds.map((round, i) => (
        <React.Fragment key={round.index}>
          <div
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
              round.stepIds.length > 1 ? 'bg-primary/10' : 'bg-muted'
            }`}
            title={
              round.stepIds.length > 1
                ? `Round ${i + 1}: ${round.stepIds.length} steps in parallel`
                : `Round ${i + 1}`
            }
          >
            <span className="font-mono text-[10px] text-muted-foreground">
              {round.stepIds.length === 1 ? '●' : `●${round.stepIds.length}`}
            </span>
          </div>
          {i < rounds.length - 1 && (
            <span className="text-muted-foreground/50">→</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact mode — vertical rounds for sidebars.
// ─────────────────────────────────────────────────────────────────────────────
function CompactDAG({
  dag,
  rounds,
  runtimeState,
  onStepClick,
}: {
  dag: AgenticDAG;
  rounds: ExecutionRound[];
  runtimeState?: Record<string, StepRuntimeState>;
  onStepClick?: (step: AgenticStep) => void;
}) {
  const stepMap = new Map(dag.steps.map(s => [s.id, s]));
  return (
    <ol className="space-y-2">
      {rounds.map((round, i) => (
        <li key={round.index} className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Round {i + 1}
            {round.stepIds.length > 1 && (
              <span className="ml-1 text-primary">· parallel ×{round.stepIds.length}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {round.stepIds.map(id => {
              const step = stepMap.get(id);
              if (!step) return null;
              const status = statusFor(id, runtimeState);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={onStepClick ? () => onStepClick(step) : undefined}
                  disabled={!onStepClick}
                  className={`text-xs px-2 py-1 rounded border ${STATUS_STYLES[status]} ${
                    onStepClick ? 'hover:ring-2 hover:ring-primary/30 cursor-pointer' : ''
                  } transition-all max-w-full truncate text-left`}
                  title={step.description}
                >
                  {step.name}
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full mode — labeled rounds, dependency context, click-for-details.
// ─────────────────────────────────────────────────────────────────────────────
function FullDAG({
  dag,
  rounds,
  runtimeState,
  onStepClick,
}: {
  dag: AgenticDAG;
  rounds: ExecutionRound[];
  runtimeState?: Record<string, StepRuntimeState>;
  onStepClick?: (step: AgenticStep) => void;
}) {
  const stepMap = new Map(dag.steps.map(s => [s.id, s]));
  return (
    <div className="space-y-4">
      {rounds.map((round, i) => (
        <div key={round.index} className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              {i + 1}
            </div>
            <div className="text-sm font-medium">
              Round {i + 1}
              {round.stepIds.length > 1 && (
                <span className="ml-2 text-xs text-primary font-normal">
                  · {round.stepIds.length} steps in parallel
                </span>
              )}
            </div>
          </div>

          <div
            className={`grid gap-2 ml-10 ${
              round.stepIds.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
            }`}
          >
            {round.stepIds.map(id => {
              const step = stepMap.get(id);
              if (!step) return null;
              const status = statusFor(id, runtimeState);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={onStepClick ? () => onStepClick(step) : undefined}
                  disabled={!onStepClick}
                  className={`text-left p-3 rounded-lg border ${STATUS_STYLES[status]} ${
                    onStepClick ? 'hover:ring-2 hover:ring-primary/30 cursor-pointer' : 'cursor-default'
                  } transition-all`}
                >
                  <div className="font-medium text-sm">{step.name}</div>
                  {step.description && (
                    <div className="text-xs opacity-75 mt-1 line-clamp-2">
                      {step.description}
                    </div>
                  )}
                  {step.dependsOn.length > 0 && (
                    <div className="text-[10px] opacity-60 mt-2">
                      ← depends on: {step.dependsOn
                        .map(d => stepMap.get(d)?.name ?? d)
                        .join(', ')}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {i < rounds.length - 1 && (
            <div className="ml-[15px] my-1 h-4 border-l-2 border-dashed border-border" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────────────
const WorkflowDAG: React.FC<WorkflowDAGProps> = ({
  dag,
  mode = 'compact',
  runtimeState,
  onStepClick,
}) => {
  const rounds = React.useMemo(() => buildExecutionRounds(dag), [dag]);
  if (rounds.length === 0) {
    return <div className="text-xs text-muted-foreground">No steps in DAG.</div>;
  }
  if (mode === 'thumbnail') return <ThumbnailDAG rounds={rounds} />;
  if (mode === 'full') return <FullDAG dag={dag} rounds={rounds} runtimeState={runtimeState} onStepClick={onStepClick} />;
  return <CompactDAG dag={dag} rounds={rounds} runtimeState={runtimeState} onStepClick={onStepClick} />;
};

export default WorkflowDAG;
