/**
 * PPC Ops Agent — the SSP weekly operating-cadence agent.
 *
 * Wraps the hand-authored PPC Master Weekly DAG with:
 *   - Trigger spec: Monday 6am UTC cron (subject to scheduler wiring).
 *   - Optional planner pass before execution.
 *   - Persistence to agentic.* tables on completion.
 *
 * This is the first concrete domain agent. Other agents (Client Success,
 * Sales, Content) follow the same pattern.
 */

import type { Agent, AgentRunInput, AgentRunOutcome } from './types';
import { PPC_MASTER_WEEKLY_DAG } from '../contracts/ppcMasterWeekly';
import { plan, staticPlan } from '../planner';
import { runAgenticDAG } from '../runner';
import { persistRun } from '../persistence';

const AGENT_ID = 'ppc-ops';

export const PPC_OPS_AGENT: Agent = {
  id: AGENT_ID,
  name: 'PPC Ops Agent',
  description:
    'Runs the SSP Monday-to-Friday operating cadence: triage, recommendations, ' +
    'search-term review, PMax audit, deliverables, dashboard updates, change log.',
  trigger: {
    eventKinds: ['cron.monday_triage', 'manual.ppc_ops_run'],
    cron: '0 6 * * 1', // Monday 06:00 UTC
  },

  async run(input: AgentRunInput): Promise<AgentRunOutcome> {
    // Try the planner first; fall back to static automatically on any failure.
    let executionPlan = await plan({
      dag: PPC_MASTER_WEEKLY_DAG,
      userInputs: input.userInputs,
      provider: input.provider,
      apiKey: input.apiKey,
    });

    if (!executionPlan.rounds.length) {
      executionPlan = staticPlan(PPC_MASTER_WEEKLY_DAG);
    }

    const results = await runAgenticDAG(PPC_MASTER_WEEKLY_DAG, {
      provider: input.provider,
      apiKey: input.apiKey,
      userInputs: input.userInputs,
      precomputedRounds: executionPlan.rounds,
    });

    const failed = Object.values(results).some(r => r.status === 'failed');
    const status: 'succeeded' | 'failed' = failed ? 'failed' : 'succeeded';
    const succeededCount = Object.values(results).filter(r => r.status === 'succeeded').length;
    const skippedCount = Object.values(results).filter(r => r.status === 'skipped').length;

    const summary =
      `${succeededCount} steps succeeded, ${skippedCount} skipped, ` +
      `${Object.values(results).filter(r => r.status === 'failed').length} failed.`;

    const agentRunId = await persistRun(
      {
        agentId: AGENT_ID,
        workflowId: PPC_MASTER_WEEKLY_DAG.id,
        plan: executionPlan,
        dag: PPC_MASTER_WEEKLY_DAG,
        triggerEventId: input.triggerEventId,
      },
      results,
      executionPlan.rounds,
      status,
      summary,
    );

    return {
      agentRunId,
      status,
      results,
      plan: executionPlan,
      summary,
    };
  },
};
