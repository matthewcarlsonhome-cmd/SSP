# Agentic Orchestration Design

A design specification for evolving SkillEngine from a workflow runner into a
formally agentic business platform — one whose orchestrator decides what work
to do, in what order, and on which model, with cost and quality both first-
class concerns.

## 1. The Insight

> "Thinking that skills or workflows had to be completed in a linear way
> prevented agentic design overall."

That sentence is the spine of this whole document. The current system models
work as a sequence of steps that pass blobs forward, each step blocking the
next. Real business work isn't shaped that way. Some steps depend on each
other; many don't. Some need a strategic model with deep context; others need
a fast model and a sharp prompt. An employee who treats every task identically
— same person, same depth of effort, in serial — would be the worst employee
on the team. The same is true of a software system.

The reframe is two-axis:

1. **Dependency axis** — every task has predecessors it must wait for and
   peers it can run alongside. The orchestrator's job is to compute that
   graph and execute it with maximum parallelism.
2. **Capability axis** — every task has a "depth of cognition" requirement.
   The orchestrator's job is to route each task to the cheapest model that
   meets the quality bar.

A workflow that ignores the dependency axis is sequential when it should be
parallel. A workflow that ignores the capability axis is paying Opus prices
for Haiku-tier work, or paying Haiku prices for Opus-tier work and shipping
mediocre output to clients. The orchestrator must reason on both axes, on
every call.

## 2. What "Orchestrator" Actually Means Here

The orchestrator is a **business-level, full-context worker** that owns the
end-to-end goal, not a single skill or single workflow. It:

- Receives a goal and a context envelope (current business state, deadlines,
  budget caps, who-it's-for stakes).
- Decomposes the goal into a directed acyclic graph of tasks, each of which
  is either a skill invocation or a sub-goal recursively decomposed.
- For each task, selects a tool (which existing skill, or a tool call) and a
  model (which provider + tier + thinking mode) and a context budget.
- Runs the graph, executing parallel-eligible tasks simultaneously, feeding
  structured outputs from upstream tasks selectively into downstream ones.
- Evaluates intermediate outputs against contracts and decides whether to
  proceed, retry, or replan.
- Persists decisions and outputs as facts in the living entity model so
  future runs are not amnesiac.

It is not a workflow. It is the thing that *creates* a workflow shape for
each goal it receives.

## 3. Where We Are Today

| Capability | Status |
|---|---|
| DAG execution with parallel rounds | ✅ `lib/agentic/runner.ts` |
| Structured output extraction (output contracts) | ✅ `lib/agentic/extractor.ts` |
| Selective context handoff between steps | ✅ `contextRequirements` on `AgenticStep` |
| Skip rules per step | ✅ `skipIf` evaluated by runner |
| LLM-driven planner (decide which steps to run / skip) | ✅ `lib/agentic/planner.ts` |
| Hand-authored DAGs for the 6 priority workflows | ✅ `lib/agentic/contracts/` |
| Document-first intake (paste raw context → fields) | ✅ `lib/agentic/intake.ts` |
| Persistence of runs + facts to `agentic.*` schema | ✅ `lib/agentic/persistence.ts` |
| Domain agents (PPC Ops registered, others scaffolded) | ✅ `lib/agentic/agents/` |
| Triggers + dispatcher | ✅ `lib/agentic/triggers.ts` |
| Policy + approvals | ✅ `lib/agentic/policy.ts` + UI |
| **Model router (cost/quality aware routing)** | ❌ this document |
| **Cost modeling per skill / workflow / system** | ❌ this document |
| **Tool-calling sub-agent (open-ended task decomposition)** | ❌ this document |

The first two missing pieces are the focus here. Tool-calling sub-agents are
discussed at the end as the natural extension once routing and costing are
solid.

## 4. The Model Router — Heart of Orchestration

### 4.1 What the router decides

For every LLM call the system is about to make, the router answers:

| Question | Output |
|---|---|
| Which model tier? | `fast` / `balanced` / `smart` / `reasoning` |
| Which provider? | `claude` / `gemini` / `chatgpt` (capability- and cost-aware) |
| Use extended thinking? | yes / no, with thinking-token budget |
| Use prompt caching? | yes / no, cache write or read |
| Use streaming? | yes / no (for UI responsiveness vs. extraction calls) |
| What is the context budget? | max input tokens to pass through |

Output is a `ModelChoice` object. It is computed deterministically from a
`TaskClassification` plus the active policy context. No LLM call to make
this decision — that would be self-referential and slow. The router is a
pure function over a price/capability matrix and a small ruleset.

### 4.2 Task classification

Every task that goes to the router carries a classification. For agentic
runs, the classification is attached to each `AgenticStep`. For ad-hoc tool
calls, it is computed by a small classifier (rule-based, optional Haiku
fallback for ambiguous cases).

```
type TaskComplexity = 'trivial' | 'routine' | 'complex' | 'strategic';

type TaskKind =
  | 'extraction'        // pull structured fields from text
  | 'classification'    // assign a label / score
  | 'transformation'    // reformat / translate / compress
  | 'summarization'     // condense text
  | 'analysis'          // reason over structured data
  | 'synthesis'         // combine multiple inputs into a coherent output
  | 'generation'        // produce client-facing content
  | 'reasoning'         // multi-step planning / optimization
  | 'creative';         // novel ideation under constraints

type TaskStakes = 'internal' | 'team' | 'client' | 'leadership';

interface TaskClassification {
  complexity: TaskComplexity;
  kind: TaskKind;
  stakes: TaskStakes;
  reversible: boolean;          // is the output easily revisable?
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  /** True if the output is part of the agent's reasoning chain rather than
   *  the final user-visible artifact. Reasoning steps can use cheaper models
   *  more aggressively because errors get caught downstream. */
  isIntermediate: boolean;
}
```

### 4.3 Model capability matrix

Every model the system can call is registered in a single table. Adding a
new model is a one-row change.

```
interface ModelProfile {
  id: string;                       // 'claude-haiku-4-5' | 'claude-sonnet-4-6' | 'claude-opus-4-7' | 'gemini-2.0-flash' | 'gpt-4o-mini' | ...
  provider: 'claude' | 'gemini' | 'chatgpt';
  tier: 'fast' | 'balanced' | 'smart' | 'reasoning';

  // Capability profile — what tasks this model is good at.
  goodFor: TaskKind[];
  acceptableFor: TaskKind[];
  avoidFor: TaskKind[];

  // Cost (in cents per million tokens — keep precision so multiplications
  // don't lose information at small token counts).
  inputPricePerMTokensCents: number;
  outputPricePerMTokensCents: number;
  cacheWritePricePerMTokensCents?: number;
  cacheReadPricePerMTokensCents?: number;

  // Latency
  typicalLatencyMs: number;           // wall-clock for a 1k-token response
  supportsStreaming: boolean;
  supportsExtendedThinking: boolean;
  supportsToolCalling: boolean;

  // Context window
  maxInputTokens: number;
  maxOutputTokens: number;

  // Reliability constraints
  maxConcurrentRequests: number;      // for the rate limiter
}
```

Approximate cost ratios (verify against current published prices when
implementing):

| Tier | Provider model | Relative cost vs. Haiku | Best for |
|---|---|---|---|
| fast | Claude Haiku 4.5, Gemini Flash, GPT-4o-mini | 1× | Extraction, classification, simple transformations, intake parsing, structured output extraction (the second-pass extractor) |
| balanced | Claude Sonnet 4.6, GPT-4o | ~3–6× | Most current "skill" workloads — analysis on structured data, client-facing prose generation, summarization that judges importance |
| smart | Claude Opus 4.7 | ~12–25× | Strategic recommendations, multi-domain synthesis, novel scenarios, judgment calls with stakes |
| reasoning | Opus + extended thinking, OpenAI o-series | ~25–60× (thinking tokens dominate) | Optimization, multi-constraint planning, debugging complex issues, budget allocation across competing priorities |

These ratios make the orchestration savings concrete. A 7-step PPC Master
Weekly run with everything blanket-routed to Opus could cost ~$2.00. The
same run intelligently routed (Haiku for extraction, Sonnet for analysis,
Opus only for the strategic merge step) might cost ~$0.20. Over 50 runs/
year × 45 accounts, that's the difference between $4,500 and $450 just on
this one workflow — and the agentic system is going to add many more
workflows.

### 4.4 The routing function

The router is a single pure function:

```
function routeModel(
  task: TaskClassification,
  context: RoutingContext,
): ModelChoice;
```

`RoutingContext` carries the live state that the router needs to know:
running budget today, time-pressure (is this user-facing right now), policy
overrides ("never use a non-Anthropic provider for client-deliverable
tasks"), and configured tier preferences per agent.

The decision logic is short and inspectable, in this priority order:

1. **Hard constraints first.** If `task.kind === 'reasoning'` and complexity
   is `strategic`, only `reasoning`-tier models qualify. If a policy says
   "client-deliverable text must be Sonnet or higher," filter the candidate
   set.
2. **Map complexity → tier baseline.**
   - `trivial` → `fast`
   - `routine` → `fast` if intermediate, `balanced` otherwise
   - `complex` → `balanced`
   - `strategic` → `smart`
3. **Bump up for stakes.** `client` or `leadership` stakes promote the tier
   one notch unless the task is purely intermediate.
4. **Bump down for intermediate.** A reasoning chain step that is going to
   be evaluated downstream can run a tier lower because the evaluator
   catches errors.
5. **Pick the cheapest model in the chosen tier that is `goodFor` the task
   kind**, with provider preference broken by:
   - Provider availability (rate limit headroom)
   - User preference / contract (some accounts forbid certain providers)
   - Latency target (live UI runner vs. background scheduled run)
6. **Compute estimated cost** and check budget. If estimated cost would
   exceed the per-agent daily cap or the per-run cap, downshift one tier
   and retry, logging the downshift reason for the Cost Explorer.
7. **Return the choice with a human-readable reasoning string.** Every
   decision is inspectable: "Routine analysis on intermediate step in PPC
   Triage → fast tier. Cheapest fast model good for analysis = Haiku 4.5.
   Estimated cost: 0.4¢."

### 4.5 Where the router lives in the runner

The runner currently calls `invokeSkill()` in `lib/agentic/skillTool.ts`.
The router slots in immediately before that call. The flow becomes:

```
Step ready to run
    │
    ▼
classifyTask(step)         ← uses step metadata + skill metadata
    │
    ▼
routeModel(class, ctx)     ← deterministic; produces ModelChoice
    │
    ▼
invokeSkill(step, choice)  ← runner now passes ModelChoice through
    │
    ▼
Result + actual cost recorded
    │
    ▼
extractStructured(...)     ← second-pass; routed to 'fast' tier always
```

The extraction call is hard-coded to fast tier — extraction is never the
bottleneck on quality, and extraction-call cost compounds across every
step.

## 5. Cost Modeling System

The user must be able to **see** what the router is saving. Without
visibility, "we're using cheap models when we can" is faith, not engineering.

### 5.1 Three units of analysis

| Level | Question | Surface |
|---|---|---|
| Skill | "What does it cost to run this skill, per call, on each tier?" | Skill detail page in Cost Explorer |
| Workflow / DAG | "What's the cost of one PPC Master Weekly run, broken down per step? What's the cost of this run vs. running every step on Opus?" | DAG cost view |
| System | "What is the SSP team spending per day / week / month across all agentic runs? Where is the spend concentrated?" | Cost Explorer dashboard |

### 5.2 Estimation vs. attribution

Two different operations on the same data model:

- **Estimation** — given a skill / DAG / agent run *about* to happen, predict
  the cost. This is what the runner needs to enforce budget caps and
  surface "this run will cost ~$0.18" to the user before they hit submit.
- **Attribution** — given a run that *did* happen (with logged token usage),
  attribute actual cost to skill, workflow, agent, and time period.

Both share a single price table (the model capability matrix) and a single
cost-calculation function:

```
function calculateCost(usage: TokenUsage, model: ModelProfile): {
  inputCents: number;
  outputCents: number;
  cacheReadCents: number;
  cacheWriteCents: number;
  totalCents: number;
};
```

Estimation feeds the function with predicted token counts; attribution feeds
it with actual token counts from the provider response.

### 5.3 Schema additions

The existing `agentic.skill_executions` table already has `cost_cents`.
Three additional columns formalize cost modeling:

```
ALTER TABLE agentic.skill_executions
  ADD COLUMN model_id TEXT,           -- e.g., 'claude-haiku-4-5'
  ADD COLUMN tier TEXT,               -- 'fast' | 'balanced' | 'smart' | 'reasoning'
  ADD COLUMN tokens_in INTEGER,
  ADD COLUMN tokens_out INTEGER,
  ADD COLUMN tokens_cached_read INTEGER,
  ADD COLUMN tokens_cached_write INTEGER,
  ADD COLUMN routing_reason TEXT;     -- the human-readable router decision
```

This lets the Cost Explorer answer "show me everything Sonnet did this
week" or "what fraction of last month's spend came from extraction calls."
The `routing_reason` column is the audit trail — without it, you can't tell
why a particular call went to a particular model and you can't tune the
ruleset.

### 5.4 Cost Explorer surface

A single new admin page (`/agentic/costs`) with three views:

1. **Per-skill table.** One row per skill, columns: typical input tokens,
   typical output tokens, cost-on-fast, cost-on-balanced, cost-on-smart,
   recommended tier, calls-this-month, total-cost-this-month. Sortable by
   any column.
2. **Per-workflow projector.** Pick a workflow → see its DAG with each step
   annotated with router decision, model, estimated cost. A toggle:
   "blanket Opus" / "blanket Sonnet" / "router-driven" — flips the costs
   live so you can see the savings.
3. **System dashboard.** Time-series chart of daily spend, broken down by
   tier. Top-10 most expensive runs in the period. Top-10 most expensive
   skills. Largest savings achieved by router downshifts (when the router
   picked a cheaper model than the configured ceiling).

## 6. Tool-Calling Sub-Agent — The Open-Ended Extension

Hand-authored DAGs cover the known workflows. The agentic ambition is to
also handle tasks that *don't* have a pre-authored DAG: a CEO asks "draft
the talking points for my Tuesday board meeting given this week's account
situation," and the system has to figure out which skills to call, in what
order, and how to weave the outputs together.

This is tool-calling territory. The implementation approach:

1. **Tool registry.** Every skill is exposed as a tool with a structured
   description (input schema, output schema, typical cost, capability
   profile, latency).
2. **Sub-agent loop.** A `smart`-tier model receives the goal and the tool
   registry, calls tools in sequence (or in parallel via parallel
   tool-calling), reads results, decides next steps. Same loop pattern as
   in the Anthropic SDK / Agents API.
3. **Budget control.** The loop has a maximum-iterations cap, a maximum-cost
   cap, and a router-checkpoint between iterations: the same routing
   function decides what model handles each tool-result-evaluation step.
4. **Approval boundary.** Any tool that produces a side effect (sending
   email, modifying ad accounts) is gated by the existing policy engine.

The sub-agent is a special case of the orchestrator: instead of receiving a
pre-authored DAG, it builds one on the fly. Once the model router exists,
this is mostly a UI loop and a tool description schema — the underlying
machinery is already in place.

## 7. Implementation Plan

Six chunks, each independently shippable.

| Chunk | Output | Why this slot |
|---|---|---|
| 1 | `lib/agentic/costing.ts` — `ModelProfile` type, price registry for the active models, `calculateCost`, `estimateCost`, token-counting heuristic | Everything else depends on having a single source of truth for prices and costs. |
| 2 | `lib/agentic/orchestrator.ts` — `TaskClassification` type, `routeModel` function, `RoutingContext`. `lib/agentic/taskClassifier.ts` for converting an `AgenticStep` to a `TaskClassification` | The router function is the unit that downstream UIs and the runner integrate against. Build it standalone first; wire it in second. |
| 3 | Wire the router into `lib/agentic/runner.ts` so each step's model choice is computed and passed through to `invokeSkill`. Update `recordSkillExecution` to store the routing reason and tier. | Closes the loop — every real run now produces routing data. |
| 4 | Schema migration for the new columns on `agentic.skill_executions`. Update `lib/agentic/persistence.ts` to write them. | Required for the Cost Explorer to show real numbers. |
| 5 | `pages/agentic/CostExplorerPage.tsx` with three views (per-skill / per-workflow / system). Reads from `agentic.skill_executions`. | The visible artifact. |
| 6 | Tool-calling sub-agent — `lib/agentic/subAgent.ts` with the bounded loop, `lib/agentic/toolRegistry.ts` exposing skills as tools with schemas. | The extension that turns this from a workflow runner into a true agentic system. Land after 1–5 are stable. |

Each chunk ends with tests + a build + a commit, same cadence as recent
work.

## 8. Operational Concerns

### 8.1 A/B testing routing rules

Once the router is live, we need a way to evaluate "would Sonnet have been
good enough" for a class of tasks. Pattern: shadow-route 5% of traffic to a
cheaper tier, compare structured outputs against the production tier, score
parity. If parity is high, downshift the rule permanently.

### 8.2 Quality regression detection

Output contracts are the validation surface. Every step's output is
extracted into structured fields; the contract knows which fields are
required. A regression looks like "fast-tier extraction failure rate
climbing from 3% to 12% week over week" — that's a routing-rule bug, not a
prompt bug, and the Cost Explorer should flag it.

### 8.3 Provider availability

The router must handle "this provider is rate-limited / down" gracefully.
The capability matrix's `maxConcurrentRequests` field plus a simple
in-process token bucket lets the router fall back to an alternative
provider in the same tier when the primary is saturated.

### 8.4 Drift in model pricing

Prices change. Periodic verification against the provider's public pricing
page (or programmatic API) keeps the registry honest. Worst-case the cost
numbers shown are slightly stale; nothing breaks. Treat the registry like
any other config: versioned, reviewable, owned.

## 9. Open Questions

1. **Should task classification be ML-driven or rule-driven?** Rule-driven
   first (deterministic, fast, debuggable). If the rules accumulate too
   many edge cases, swap in a small classifier model.
2. **How do we measure "quality" for routing-rule tuning?** Easy proxies:
   contract field completeness, evaluator retry rate. Hard truth:
   user/client feedback on the final deliverable. Both should feed back
   into the router config.
3. **Do we let the user override the router's choice?** Yes for admin
   debugging (force Opus, force Haiku) and no for production runs without
   policy approval. Same pattern as the existing policy engine.
4. **At what point does the orchestrator itself become an AI call?** The
   rule-based router is the right starting point. If the rules fail to
   capture the right routing in 5–10% of cases, an LLM-based router using
   a fast-tier model is the natural escalation. Cost: one extra fast call
   per step (~0.05¢), which the savings on smarter primary calls easily
   covers.

---

This is the plan. The next commit lands chunk 1: cost types, price
registry, and estimator. Each subsequent chunk follows the same cadence
established over this branch — one commit per concrete capability,
boundaries enforced, tests + build clean.
