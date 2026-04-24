/**
 * triggers.ts — registers triggers and dispatches events to agents.
 *
 * In production, this module would run inside a worker / edge function and
 * subscribe to inbound webhooks + cron schedules. During the beta we expose
 * it as in-process helpers so the AgenticRunnerPage can fire a "manual"
 * trigger that follows the exact same code path an automated trigger will
 * eventually use.
 *
 * Three trigger sources:
 *   - manual: user clicked a button (Run, Side-by-side, Agent Console)
 *   - cron: scheduled by an external scheduler reading agent.trigger.cron
 *   - webhook: inbound HTTP from an external system
 *
 * The dispatcher's contract is small: given an event, find subscribed
 * agents and invoke them. Persistence and follow-up are the agent's job.
 */

import { logger } from '../logger';
import { listAgents, type Agent, type AgentRunInput, type AgentRunOutcome } from './agents';

export type TriggerSource = 'manual' | 'cron' | 'webhook';

export interface TriggerEvent {
  /** Stable id (use crypto.randomUUID() in browser contexts). */
  id?: string;
  source: TriggerSource;
  kind: string;                            // e.g., 'manual.ppc_ops_run'
  payload?: Record<string, unknown>;
  receivedAt?: string;
}

/**
 * Find agents subscribed to a given event kind.
 */
export function agentsForEvent(eventKind: string): Agent[] {
  return listAgents().filter(a => a.trigger.eventKinds.includes(eventKind));
}

/**
 * Dispatch a trigger event to all subscribed agents and run them. Returns
 * the per-agent outcomes. Failures in one agent do not abort the others.
 */
export async function dispatchEvent(
  event: TriggerEvent,
  runArgs: Omit<AgentRunInput, 'triggerEventId'>,
): Promise<AgentRunOutcome[]> {
  const targets = agentsForEvent(event.kind);
  if (targets.length === 0) {
    logger.warn('agentic.dispatchEvent had no subscribers', { kind: event.kind });
    return [];
  }
  logger.info('agentic.dispatchEvent firing', {
    kind: event.kind,
    agents: targets.map(a => a.id),
  });

  const outcomes = await Promise.all(
    targets.map(async (agent) => {
      try {
        return await agent.run({ ...runArgs, triggerEventId: event.id ?? null });
      } catch (err) {
        logger.error('agentic.dispatchEvent agent threw', {
          agent: agent.id,
          error: err instanceof Error ? err.message : String(err),
        });
        return {
          agentRunId: null,
          status: 'failed' as const,
          results: {},
          plan: { strategy: 'static' as const, rounds: [], skipped: [] },
          summary: err instanceof Error ? err.message : 'Agent run failed.',
        };
      }
    }),
  );
  return outcomes;
}
