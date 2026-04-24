/**
 * Agent abstraction — what every domain agent (PPC Ops, Client Success,
 * Sales, Content) must declare.
 *
 * An Agent is a long-lived behavior, not a one-shot run:
 *   - It declares which event kinds wake it up.
 *   - It declares its skill toolbox (a subset of registered skills).
 *   - It declares its policy boundary (which actions need human approval).
 *   - It exposes a `run(input) -> AgentRunOutcome` for the runner to invoke.
 *
 * This file is the contract; concrete agents live in sibling files
 * (e.g., ./ppcOps.ts).
 */

import type { ExecutionPlan, StepRunResult } from '../types';
import type { AgenticProvider } from '../providers';

export interface AgentTriggerSpec {
  /** Event kinds this agent subscribes to (e.g., 'cron.monday_triage'). */
  eventKinds: string[];
  /** Cron expression for scheduled triggers (UTC). */
  cron?: string;
}

export interface AgentRunInput {
  /** Trigger event id from agentic.events; null for manual runs. */
  triggerEventId?: string | null;
  /** Inputs collected upstream of this run (e.g., from document intake). */
  userInputs: Record<string, unknown>;
  provider: AgenticProvider;
  apiKey: string;
}

export interface AgentRunOutcome {
  agentRunId: string | null;
  status: 'succeeded' | 'failed';
  results: Record<string, StepRunResult>;
  plan: ExecutionPlan;
  summary: string;
}

export interface Agent {
  /** Stable identifier used for agent_runs.agent_id. */
  id: string;
  /** Human-readable name for UI surfaces. */
  name: string;
  /** One-line description. */
  description: string;
  /** Trigger specification — when this agent should fire. */
  trigger: AgentTriggerSpec;
  /** Run the agent. Wraps planning + execution + persistence. */
  run(input: AgentRunInput): Promise<AgentRunOutcome>;
}
