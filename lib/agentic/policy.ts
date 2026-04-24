/**
 * policy.ts — agentic policy engine.
 *
 * Evaluates a proposed action against the active set of policies and returns
 * one of: allow, require-approval, deny. Policies are declarative JSON
 * objects loaded from agentic.policies; this module ships a small set of
 * built-in defaults so the system has sane guardrails before any custom
 * policies are authored.
 *
 * This is Phase 4 of the roadmap. The interface is stable; the policy DSL
 * intentionally starts minimal and grows as concrete needs emerge.
 */

export type ProposedActionKind =
  | 'send_email'           // draft a client-facing email
  | 'modify_ad_account'    // change a Google Ads account setting
  | 'create_doc'           // produce a deliverable artifact
  | 'spawn_run'            // start a downstream agent run
  | 'tool_call';           // generic tool invocation

export interface ProposedAction {
  kind: ProposedActionKind;
  agentId: string;
  description: string;
  payload?: Record<string, unknown>;
  /** Estimated cost in cents — used for budget rules. */
  estimatedCostCents?: number;
  /** Soft references — entity types/ids the action would affect. */
  affects?: Array<{ type: string; id: string }>;
}

export type PolicyDecision = 'allow' | 'require-approval' | 'deny';

export interface PolicyEvaluation {
  decision: PolicyDecision;
  matchedRules: string[];
  reason?: string;
}

export interface PolicyRule {
  id: string;
  description: string;
  appliesTo: ProposedActionKind[] | 'all';
  evaluate: (action: ProposedAction, ctx: PolicyContext) => PolicyDecision | null;
}

export interface PolicyContext {
  /** Cumulative cost spent by this agent today, in cents. */
  agentSpendTodayCents: number;
  /** Daily budget cap for this agent, in cents (0 = no cap). */
  agentDailyBudgetCents: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in default rules
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_RULES: PolicyRule[] = [
  {
    id: 'never-send-without-review',
    description: 'Outbound emails always require human approval during the beta.',
    appliesTo: ['send_email'],
    evaluate: () => 'require-approval',
  },
  {
    id: 'modify-ad-account-requires-approval',
    description: 'Any change to a live ad account requires explicit approval.',
    appliesTo: ['modify_ad_account'],
    evaluate: () => 'require-approval',
  },
  {
    id: 'daily-budget-cap',
    description: 'Block actions that would push the agent over its daily AI spend cap.',
    appliesTo: 'all',
    evaluate: (action, ctx) => {
      if (!ctx.agentDailyBudgetCents) return null;
      const projected = ctx.agentSpendTodayCents + (action.estimatedCostCents ?? 0);
      if (projected > ctx.agentDailyBudgetCents) return 'deny';
      return null;
    },
  },
  {
    id: 'allow-create-doc',
    description: 'Creating documents (deliverables, change logs) is permitted by default.',
    appliesTo: ['create_doc'],
    evaluate: () => 'allow',
  },
];

// Highest-precedence-first; deny wins over require-approval, which wins over allow.
const PRECEDENCE: Record<PolicyDecision, number> = {
  deny: 3,
  'require-approval': 2,
  allow: 1,
};

export function evaluateAction(
  action: ProposedAction,
  ctx: PolicyContext,
  rules: PolicyRule[] = DEFAULT_RULES,
): PolicyEvaluation {
  let bestDecision: PolicyDecision = 'allow';
  const matchedRules: string[] = [];
  const reasons: string[] = [];

  for (const rule of rules) {
    if (rule.appliesTo !== 'all' && !rule.appliesTo.includes(action.kind)) continue;
    const decision = rule.evaluate(action, ctx);
    if (!decision) continue;
    matchedRules.push(rule.id);
    reasons.push(rule.description);
    if (PRECEDENCE[decision] > PRECEDENCE[bestDecision]) {
      bestDecision = decision;
    }
  }

  return {
    decision: bestDecision,
    matchedRules,
    reason: reasons.length > 0 ? reasons.join(' ') : undefined,
  };
}
