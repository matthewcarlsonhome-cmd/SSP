/**
 * Agent registry. Add new agents here so the trigger dispatcher and the
 * Control Tower / Agent Console pages can enumerate them.
 */

import type { Agent } from './types';
import { PPC_OPS_AGENT } from './ppcOps';

export const AGENTS: Record<string, Agent> = {
  [PPC_OPS_AGENT.id]: PPC_OPS_AGENT,
};

export function listAgents(): Agent[] {
  return Object.values(AGENTS);
}

export function getAgent(id: string): Agent | undefined {
  return AGENTS[id];
}

export type { Agent, AgentRunInput, AgentRunOutcome, AgentTriggerSpec } from './types';
export { PPC_OPS_AGENT };
