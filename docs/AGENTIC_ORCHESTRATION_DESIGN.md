# Agentic Orchestration Routing and Costing Design

This document is the implementation plan for moving SkillEngine from a DAG
workflow runner to an agentic orchestration platform whose runner decides:

1. Which work is ready based on dependencies.
2. Which model tier should perform each LLM task.
3. Why that route was selected.
4. What the call was expected to cost and what it actually cost.

The dependency axis already exists in `lib/agentic/runner.ts`. The transition
now is to make the capability axis real: deterministic model routing, cost
attribution, quality floors, and inspectable decisions.

## Current State

| Capability | Status |
| --- | --- |
| DAG execution with parallel rounds | Present in `lib/agentic/runner.ts` |
| Structured output extraction | Present in `lib/agentic/extractor.ts` |
| Selective context handoff | Present via `contextRequirements` |
| Skip rules | Present via `skipIf` |
| LLM-driven planning | Present in `lib/agentic/planner.ts` |
| Hand-authored DAGs | Present in `lib/agentic/contracts/` |
| Persistence to `agentic.*` | Present but cost attribution is incomplete |
| Early model registry and router | Present but not fully wired into runtime |
| Runner model routing | Incomplete: runner currently hard-codes `balanced` |
| Routing/cost persistence | Incomplete |
| Cost Explorer | Not started |
| Open-ended tool-calling sub-agent | Phase 2, after routing is stable |

## Accuracy Corrections

The older draft used speculative model names such as `claude-sonnet-4-6` and
`claude-opus-4-7`. Do not put speculative provider IDs in code. The registry
must mirror models the current provider adapters can actually call, and prices
must be treated as versioned config.

Pricing sources to verify before changing the registry:

- Anthropic: https://docs.anthropic.com/en/docs/about-claude/pricing
- OpenAI: https://platform.openai.com/docs/pricing/
- Google Gemini: https://ai.google.dev/gemini-api/docs/pricing

As of the April 2026 review, the project provider adapters expose:

- Claude aliases: `haiku`, `sonnet`, `opus`
- OpenAI models: `gpt-4o-mini`, `gpt-4o`, `o1-preview`, `o1-mini`
- Gemini model: `gemini-2.0-flash`

That means the first implementation should route over these supported choices.
Add newer provider models only after updating `lib/claude.ts`, `lib/chatgpt.ts`,
or `lib/gemini.ts` to call them.

## Non-Goals for This Phase

- Do not replace the existing DAG runner.
- Do not use an LLM to choose the model.
- Do not let budget pressure route below a task's minimum quality floor.
- Do not build the open-ended sub-agent until routing, costing, and persistence
  are stable.
- Do not assume all providers are available in a single run. The current runner
  receives one provider and one API key, so runtime routing is provider-scoped
  until multi-provider credential support exists.

## Core Types

The current implementation keeps these types in `lib/agentic/costing.ts` and
`lib/agentic/orchestrator.ts`. That is acceptable for now. A later cleanup can
move shared types into `lib/agentic/modelTypes.ts`.

Required task classification fields:

```ts
type TaskComplexity = 'trivial' | 'routine' | 'complex' | 'strategic';
type TaskKind =
  | 'extraction'
  | 'classification'
  | 'transformation'
  | 'summarization'
  | 'analysis'
  | 'synthesis'
  | 'generation'
  | 'reasoning'
  | 'creative'
  | 'evaluation';
type TaskStakes = 'internal' | 'team' | 'client' | 'leadership';
type DataSensitivity = 'public' | 'internal' | 'client-confidential' | 'regulated';
type ModelTierKey = 'fast' | 'balanced' | 'smart' | 'reasoning';
type Provider = 'claude' | 'gemini' | 'chatgpt';

interface TaskClassification {
  complexity: TaskComplexity;
  kind: TaskKind;
  stakes: TaskStakes;
  reversible: boolean;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  isIntermediate: boolean;

  minTier?: ModelTierKey;
  maxTier?: ModelTierKey;
  preferredTier?: ModelTierKey;
  allowedProviders?: Provider[];
  forbiddenProviders?: Provider[];
  requiresJson?: boolean;
  requiresToolCalling?: boolean;
  requiresStreaming?: boolean;
  dataSensitivity?: DataSensitivity;
}
```

Required model profile fields:

```ts
interface ModelProfile {
  id: string;
  displayName: string;
  provider: Provider;
  providerModelId: string;
  tier: ModelTierKey;
  active: boolean;
  priceSnapshotId: string;

  goodFor: TaskKind[];
  acceptableFor: TaskKind[];
  avoidFor: TaskKind[];

  inputPricePerMTokensCents: number;
  outputPricePerMTokensCents: number;
  cacheReadPricePerMTokensCents?: number;
  cacheWritePricePerMTokensCents?: number;
  reasoningPricePerMTokensCents?: number;

  typicalLatencyMs: number;
  supportsJson: boolean;
  supportsStreaming: boolean;
  supportsExtendedThinking: boolean;
  supportsToolCalling: boolean;
  supportsPromptCaching: boolean;

  maxInputTokens: number;
  maxOutputTokens: number;
  maxConcurrentRequests: number;
}
```

## Routing Rules

`routeModel(task, context)` is a pure function. It must not call an LLM or a
provider API.

Routing order:

1. Start from active models only.
2. Apply hard constraints: provider policy, task provider restrictions, JSON
   support, tool-calling support, streaming support, context window, and model
   `avoidFor`.
3. Compute a baseline tier:
   - `trivial` -> `fast`
   - `routine` -> `fast` if intermediate, otherwise `balanced`
   - `complex` -> `balanced`
   - `strategic` -> `smart`
   - strategic `reasoning` -> `reasoning`
4. Apply `preferredTier`, `minTier`, and `maxTier`.
5. Promote one tier for client or leadership stakes when the output is terminal
   or irreversible.
6. Demote at most one tier for reversible intermediate work, but never below
   `minTier`.
7. Pick the cheapest eligible model in the selected tier, preferring `goodFor`
   over `acceptableFor`.
8. If no model exists in the selected tier, try higher tiers first when the
   task has a quality floor. Only try lower tiers when still above `minTier`.
9. If a budget cap would be exceeded, try cheaper eligible models that still
   satisfy `minTier`.
10. If no eligible model satisfies both quality and budget constraints, throw
    `RoutingBudgetExceededError`. Never silently downshift below quality.
11. Return a `ModelChoice` with estimated usage, estimated cost, routing reason,
    and rejected candidates.

## Runtime Integration

The current runner accepts one provider and one API key. Therefore the first
runtime integration should constrain routing to that provider:

```ts
const classification = classifyStep({ step, dag, inputsText });
const modelChoice = routeModel(classification, {
  preferredProviders: [options.provider],
  allowedProviders: [options.provider],
  // budget and policy fields as available
});
await invokeSkill({ ..., modelChoice });
```

This gives immediate tier routing without pretending the runner can switch
providers mid-run. Multi-provider routing becomes a later credential-envelope
change.

`invokeSkill` should pass the selected tier to `runPrompt`. Provider adapters
should map:

- Claude `fast` -> `haiku`, `balanced` -> `sonnet`, `smart`/`reasoning` -> `opus`
- OpenAI `fast` -> `gpt-4o-mini`, `balanced`/`smart` -> `gpt-4o`,
  `reasoning` -> `o1-preview`
- Gemini all tiers -> `gemini-2.0-flash` until additional Gemini models are
  supported by `lib/gemini.ts`

## Persistence

Add an idempotent migration after `20260424_agentic_schema.sql`:

```sql
ALTER TABLE agentic.skill_executions
  ADD COLUMN IF NOT EXISTS model_id TEXT,
  ADD COLUMN IF NOT EXISTS model_provider TEXT,
  ADD COLUMN IF NOT EXISTS model_tier TEXT,
  ADD COLUMN IF NOT EXISTS price_snapshot_id TEXT,
  ADD COLUMN IF NOT EXISTS estimated_cost_cents NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_cost_cents NUMERIC,
  ADD COLUMN IF NOT EXISTS tokens_in INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_out INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_cached_read INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_cached_write INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_reasoning INTEGER,
  ADD COLUMN IF NOT EXISTS routing_reason TEXT,
  ADD COLUMN IF NOT EXISTS routing_rejected_candidates JSONB;
```

Until provider wrappers return authoritative token usage, persist estimated
usage as `tokens_in` and `tokens_out`, set `estimated_cost_cents`, and mirror it
to `actual_cost_cents` only when actual provider usage is unavailable. Keep the
field names separate now so real attribution can land later without another
shape change.

## Cost Explorer

The first Cost Explorer should be table-first:

1. Skill table: skill, calls, average tokens, average cost, total cost.
2. Workflow projector: DAG steps with model choice and estimated cost.
3. System table: spend by day, tier, provider, workflow, and agent.

Charts are optional until persistence is proven.

## Tests

Add or update tests for:

- Cost calculation including cache and reasoning tokens.
- Registry entries having active flags and price snapshots.
- Routine intermediate extraction routing to `fast`.
- Client-facing generation routing to at least `balanced`.
- Strategic reasoning routing to `reasoning` when available, otherwise highest
  allowed supported tier.
- Provider restrictions preventing cross-provider selection.
- JSON/tool-calling/streaming requirements filtering candidates.
- Budget pressure never violating `minTier`.
- Budget exhaustion throwing `RoutingBudgetExceededError`.
- Runner invoking a step with a routed tier instead of hard-coded `balanced`.
- Persistence accepting routing fields.

## Rollout Order

1. Harden `costing.ts`, `orchestrator.ts`, and `taskClassifier.ts`.
2. Wire route decisions into `runner.ts` and `skillTool.ts` for provider-scoped
   tier routing.
3. Add the migration and persistence fields.
4. Add Cost Explorer read APIs and a table-first page.
5. Add provider usage extraction when wrappers expose token counts.
6. Add multi-provider credential envelopes.
7. Build the open-ended tool-calling sub-agent.

## Acceptance Criteria

- Every routed step has a deterministic `ModelChoice`.
- Runtime skill calls no longer hard-code `balanced`.
- Routing cannot cross the currently selected provider unless the runner has
  credentials for that provider.
- Budget enforcement cannot violate `minTier`.
- Every persisted skill execution can store model ID, tier, price snapshot,
  token estimates, estimated cost, actual cost, and routing reason.
- The design and implementation use only provider models supported by the
  current adapters or explicitly update those adapters first.
