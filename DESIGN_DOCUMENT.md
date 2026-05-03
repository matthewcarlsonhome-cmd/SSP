# SkillEngine Agentic Business OS Design Document

Version: 2026-05-03
Status: living design document for the current transition from skill library and workflow runner to routed agentic business platform.

## 1. Executive Readout

SkillEngine is no longer best described as a collection of AI skills. The stronger design is a business operating agent that receives a goal, understands the business context, chooses the right capabilities, routes each model call to the lowest-cost model that satisfies the quality bar, validates outputs, asks for approval before side effects, and remembers the facts it learned for the next run.

The existing application already contains many of the required pieces:

- A large skill library with built-in, role-template, dynamic, library, and community skill surfaces.
- Workflow definitions that chain skills into professional business deliverables.
- A database-first `skill_registry` migration path with Russellian formal validation metadata and Wittgensteinian contextual metadata.
- An isolated `agentic` namespace with events, runs, skill executions, entity context, policy, and approvals.
- A DAG runner that can execute parallel-ready agentic steps.
- Output contracts and two-pass extraction for structured handoff.
- Admin-only Agentic Lab pages for comparing, running, inspecting, approving, and exploring cost.
- A new deterministic model registry, costing layer, task classifier, and model router foundation.

The core shift now is conceptual and architectural: skills should stop being treated as only end-user pages or monolithic prompts. The agent needs a tool catalog made from the best productive cores of those skills: typed inputs, typed outputs, task kind, cost hints, validation metadata, side-effect declarations, context requirements, and deliverable-rendering guidance.

The destination is:

```text
Goal + business context
  -> planner decomposes work into a DAG
  -> tool registry offers typed capabilities from existing skills
  -> router selects model per task
  -> runner executes parallel rounds
  -> contracts extract structured facts
  -> evaluators decide proceed, retry, escalate, or replan
  -> renderer produces polished deliverable
  -> memory persists durable business facts
```

Current implementation update:

- The first typed CRM acquisition tools are now executable capabilities, not just UI concepts.
- A local prospecting goal can be planned into CRM capabilities for lookup, scoring, enrichment, import, campaign worklist creation, and outreach drafting.
- The runner can execute supported CRM internal/renderer tools directly instead of forcing deterministic work through an LLM call.
- The runner now emits structured quality telemetry between rounds and records actual provider token usage/cost when providers expose usage metadata.
- The Goal Console now checks plan readiness and retrieves ranked entity memory before execution.
- The Business Agent Console shell exists at `/agentic/console`.
- Connector execution can create local-first document/task/email/spreadsheet/proposal artifacts while blocking unsafe external writes behind policy and approvals.
- Capability Coverage is now a migration workbench with filters, readiness scores, recommendations, and CSV export.
- Client lookup provenance, routing/cost attribution, and quality telemetry have SQL migrations ready for hosted install.
- Production rollout steps are tracked in `NEXT_INSTALL_STEPS.md`; the broader current-state design readout is in `docs/AGENTIC_BUSINESS_AGENT_DESIGN_UPDATE.md`.

## 2. Current Application State

### Runtime and Product Shell

SkillEngine is a React, TypeScript, Vite, Tailwind, and Supabase application using `HashRouter` for static hosting compatibility. The root app is `App.tsx`, with route-level error boundaries around major pages.

The user-facing product currently includes:

- Home, dashboard, onboarding, user profile, settings, account, pricing, and API key setup pages.
- Skill browsing and running through static skills, library skills, dynamic skills, and community skills.
- Role templates, skill discovery, import/export, batch processing, and workspace flows.
- Workflow browsing, workflow running, and batch workflow execution.
- Business modules such as client portal, company notes, market insights, daily planner, CRM-adjacent client pages, security modules, and admin/improvement pages.
- Admin-only Agentic Lab routes under `/agentic`.

The product began with a career and job-search surface, then expanded into professional and business workflows. The strongest future framing is not "job search helper" or "prompt library"; it is "business productivity and operating agent with a large reusable capability base."

### Clients CRM and Local Prospecting

The Clients CRM is now the first concrete business-agent operating surface. It supports client/prospect records, contacts, selected skills/workflows, portal settings, notes, outreach status, bulk import/export, and local prospect discovery.

The latest build adds:

- local business lookup normalization in `lib/localBusinessLookup.ts`;
- a Supabase Edge Function proxy at `supabase/functions/local-business-lookup`;
- duplicate-aware import preview in `components/ProspectingPanel.tsx`;
- first-class lookup provenance fields on Client records;
- executable CRM agent tools in `lib/crmAgentTools.ts`;
- CRM capabilities in `lib/agentic/toolRegistry.ts`;
- goal planner recognition of local prospecting goals;
- runner execution for supported CRM internal/renderer capabilities.

This makes the CRM more than a page. It is now a tool surface the business agent can compose for goals like "Find 40 local law firms around Milwaukee and draft a two-week automation outreach campaign."

### AI Providers and Keys

The app supports Claude, Gemini, and ChatGPT provider paths. The account and platform-key architecture supports user-provided keys and platform-managed keys. Existing billing and model access logic lives in `lib/billing.ts` and provider model definitions live around `lib/platformKeys.ts`.

Important current distinction:

- `lib/billing.ts` is a user-facing billing and credit cost layer.
- `lib/agentic/costing.ts` is the new agentic routing and attribution source of truth.

These should eventually converge into one shared model-price registry or have a deliberate adapter between them. Until then, changes to model prices must not be made in one layer while forgetting the other.

### Skill System

There are several overlapping skill systems:

- `lib/skills/static.ts` and `lib/skills/registry.ts` for static and dynamic skills.
- `lib/skillLibrary/*` for the unified library schema, database loading, lazy loading, and browse metadata.
- `scripts/initializeSkillRegistry.ts` for seeding `skill_registry`; it documents 73 built-in static skills as the seed source.
- UI copy markets 270+ production-ready skills when role templates, expanded professional skills, and library surfaces are included.
- Community and dynamic skill pages add user-created and imported skills.

This overlap is valuable, but it creates a design risk: the app has many skill surfaces, while the agent needs one clean capability interface. The recommendation is to preserve existing UI surfaces but create a `ToolCapability` layer above the skill registry so the agent can select small, typed, composable capabilities without loading whole human-facing pages or broad prompt shells.

### Workflows

Classic workflows live in `lib/workflows/*`. They are ordered skill chains with input mappings, output keys, optional parallel settings, and conditional behavior. Current workflow domains include job application, interview prep, post-interview follow-up, training, SEO, marketing, consulting, startup investor pitch, sales, customer success, account expansion, RFP response, RevOps, technical debt, AI implementation, enterprise, governance, professional, accounting, staffing, and PPC agency work.

Classic workflows remain useful as:

- Human-visible repeatable processes.
- Source material for agentic DAGs.
- Training examples for goal decomposition.
- Collections of known high-value business deliverables.

They should not be the only execution model. Many real goals require partial workflow reuse, branching, parallelism, and tool choice based on context.

### Agentic Layer

The agentic code is isolated under `lib/agentic` and database schema `agentic.*`.

Current capabilities include:

- `runner.ts`: DAG execution by topological rounds, parallel sibling execution with `Promise.allSettled`, skip rules, context handoff, model routing integration, skill invocation, and structured extraction.
- `types.ts`: `AgenticDAG`, `AgenticStep`, output contracts, context requirements, execution plans, and runtime status types.
- `extractor.ts`: two-pass extraction into structured contract fields.
- `planner.ts`: LLM-assisted planning for deciding which steps to run or skip.
- `policy.ts`: approval and side-effect policy evaluation.
- `persistence.ts` and `supabaseClient.ts`: run persistence, skill execution persistence, entity fact persistence, and local degradation when Supabase is unavailable.
- `contracts/`: hand-authored AgenticDAGs, including the PPC Master Weekly workflow and five additional priority workflow DAGs.
- `agents/`: first domain agent, PPC Ops, with scaffolding for additional long-lived agents.
- `triggers.ts`: event dispatch and trigger handling.
- `costing.ts`, `orchestrator.ts`, `taskClassifier.ts`: model registry, cost calculation, deterministic routing, and step classification.
- `providers.ts` and `skillTool.ts`: provider abstraction and skill invocation path used by agentic runs.
- `toolRegistry.ts`: first agent-facing capability registry with adapters from existing skills, searchable capability descriptors, and the initial internal/renderer agent-tool shapes.
- `goalPlanner.ts`: first deterministic goal planner that maps open business goals to hand-authored DAGs or capability-assembled DAGs, with Russellian and Wittgensteinian validation readouts.

Agentic UI routes already exist:

- `/agentic`: Agentic Lab home.
- `/agentic/compare`: workflow-to-DAG comparison.
- `/agentic/run/:workflowId`: agentic runner.
- `/agentic/side-by-side/:workflowId`: shadow comparison.
- `/agentic/control-tower`: run and event visibility.
- `/agentic/entities`: entity memory inspection.
- `/agentic/approvals`: human approval queue.
- `/agentic/agents`: agent console.
- `/agentic/costs`: model and workflow cost explorer.

### Database State

The main skill migration path adds metadata to `skill_registry` while preserving existing execution fields:

- `current_system_instruction`
- `current_user_prompt_template`

The Russellian/Wittgensteinian migration adds nullable metadata:

- Russellian: `axioms`, `type_level`, `validation_certificate`.
- Wittgensteinian: `language_games`, `family_clusters`, `vocabulary_terms`, `form_of_life`.
- Prompt composition: `prompt_recipe`, `prompt_hash`, `prompt_byte_size`.

The agentic schema adds:

- `agentic.events`
- `agentic.agent_runs`
- `agentic.skill_executions`
- `agentic.entity_context`
- `agentic.policies`
- `agentic.approvals`

The routing migration adds model attribution fields to `agentic.skill_executions`:

- `model_id`
- `model_provider`
- `model_tier`
- `price_snapshot_id`
- `estimated_cost_cents`
- `actual_cost_cents`
- token fields
- `routing_reason`
- `routing_rejected_candidates`

### Validation State

Russellian validation provides formal safety constraints:

- Primitive operations: `READ`, `TRANSFORM`, `WRITE`, `DECIDE`, `GENERATE`, `WAIT`, `VALIDATE`.
- Type levels for stratification.
- Composition rules that prevent unsafe direct transitions, such as `GENERATE -> WRITE` without validation.
- Derivation certificates for valid compositions.

Wittgensteinian validation provides contextual fit:

- Language games.
- Family resemblance clusters.
- Grammar and vocabulary checks.
- Form-of-life context.
- Dual validation that combines formal validity with contextual "makes sense" scoring.

This combination matters because a business agent needs both safety and judgment. Russellian rules answer "can these operations compose safely?" Wittgensteinian rules answer "does this capability make sense in this business context?"

## 3. Accuracy and Coherence Review of the Orchestration Plan

The orchestration plan is directionally correct and coherent. The two-axis insight is the right spine:

- Dependency axis: compute a graph and run maximum safe parallelism.
- Capability axis: route each node to the cheapest model that satisfies the quality floor.

Key corrections and stability improvements:

1. Provider model names must not be speculative. The registry should only include provider IDs the adapters can actually call, with pricing snapshots and source links.
2. Runtime routing is provider-scoped until the runner receives a multi-provider credential envelope. The current agentic runner accepts one provider and one API key, so it can route tiers within that provider but should not silently switch providers mid-run.
3. "Extraction is never the bottleneck" should be softened. Extraction should default to fast models, but contract failure, malformed JSON, missing required fields, or high-stakes regulated extraction should trigger retry or escalation.
4. Budget pressure must never violate the minimum quality tier. If no eligible model fits both quality and budget, the system should stop, explain, and ask for approval or a budget change.
5. Cost Explorer should separate projections from attribution. The current page can project from the registry and DAGs; the next step is overlaying actual persisted executions.
6. The sub-agent should not arrive before the tool registry is typed. Open-ended tool use without tool contracts would turn the current skill library into a noisy prompt menu.
7. The skill concept needs decomposition. Monolithic skills are too broad for agentic planning; typed capability atoms are the right bridge.

## 4. Product North Star

SkillEngine should become a business agentic agent that can:

- Accept a business goal in natural language.
- Infer the relevant business entity: client, account, deal, role, project, campaign, document, meeting, or workflow.
- Pull current context from the living entity model and connected tools.
- Select capabilities from the tool registry.
- Execute tasks in parallel where safe.
- Route each LLM task by complexity, stakes, reversibility, data sensitivity, and budget.
- Validate intermediate outputs against explicit contracts.
- Replan when evidence changes or outputs fail validation.
- Produce professional deliverables: briefs, decks, spreadsheets, emails, dashboards, plans, proposals, and operating cadences.
- Persist facts, decisions, costs, and routing reasons.
- Require approval before external side effects.

The agent should feel like a practical business operator: careful with money, honest about confidence, fast on routine work, thoughtful on strategic work, and polished in its final outputs.

## 5. Main Use Cases

### Core Best Use

The best initial use case is recurring business operations that combine analysis, synthesis, and deliverable creation:

- Weekly PPC account review and client update.
- Customer churn risk triage and escalation plan.
- Sales account pursuit plan.
- QBR preparation.
- Marketing campaign launch.
- RFP response center.
- RevOps pipeline diagnosis.
- Technical debt executive brief.
- AI implementation planning.

These use cases are ideal because they have repeatable structure, measurable quality, clear stakes, and obvious cost benefits from routing.

### High-Value Goal Examples

- "Prepare my Monday PPC operating packet for all priority accounts."
- "Draft board talking points using this week's account situation, risks, and wins."
- "Turn this RFP into a compliance matrix, response outline, and executive summary."
- "Find churn risk across these accounts and prepare customer-success intervention briefs."
- "Create a complete campaign launch package from this product brief."
- "Analyze this sales opportunity and prepare discovery questions, ROI narrative, objections, proposal, and follow-up plan."
- "Review our AI implementation plan and produce a risk-adjusted roadmap."

## 6. Core Architecture

```text
Business Goal
  |
  v
Context Envelope
  - user, role, client/account/deal/project
  - deadlines, stakes, budget, policies
  - available credentials and data sensitivity
  |
  v
Goal Planner
  - decomposes goal into task graph
  - selects candidate capabilities
  - asks policy engine about side effects
  |
  v
Tool Capability Registry
  - adapted from skill_registry and workflows
  - typed inputs and outputs
  - Russellian axioms and type level
  - Wittgensteinian context
  - routing hints and cost profile
  |
  v
Model Router
  - deterministic
  - cost and quality aware
  - provider scoped until multi-provider credentials exist
  |
  v
DAG Runner
  - parallel rounds
  - selective context handoff
  - retries, skips, extraction, evaluation
  |
  v
Deliverable Renderer
  - memo, email, deck, sheet, dashboard, task list, client update
  |
  v
Persistence and Memory
  - agent runs, skill executions, facts, decisions, cost, approvals
```

## 7. Novel Design Considerations

### Skills Are Assets, Not the Agent Interface

The existing skills are extremely valuable, but the agent should not reason over them as human-facing pages. A skill page often combines:

- User-facing title and marketing description.
- Form fields.
- Prompt text.
- Implied model preference.
- Output formatting.
- Human workflow assumptions.

The agent needs a smaller unit:

- What business operation can this perform?
- What inputs does it require?
- What structured output does it promise?
- What side effects can it cause?
- What quality floor does it need?
- What validation rules apply?
- What context does it consume?
- What context does it produce?

Recommendation: create a `ToolCapability` adapter layer and gradually annotate existing skills into capabilities.

### Separate Capability From Renderer

Professional and beautiful output should not require every skill to become a perfect writer. Split work into:

- Capability atoms: extract, classify, analyze, score, prioritize, generate options, validate, summarize.
- Renderer capabilities: turn structured facts into a client memo, board brief, email, deck outline, spreadsheet, implementation plan, or dashboard spec.

This makes the agent more flexible. It can use cheap models for data prep and higher-tier models for the final synthesis and voice.

### Structured Handoff Beats Blob Handoff

The agent should not pass whole raw outputs downstream by default. Every useful intermediate step should produce contracted fields that can be selectively passed to later tasks.

This lowers cost, improves stability, reduces hallucinated dependencies, and creates facts the memory layer can persist.

### The Router Is a Quality Contract, Not Just a Cost Tool

The router should save money, but not by making the system brittle. A routing decision is only good if it satisfies:

- Task kind.
- Complexity.
- Stakes.
- Reversibility.
- Data sensitivity.
- Minimum tier.
- Provider policy.
- Budget.
- Context window.

The router should log its reasoning in a human-readable field so failures can be tuned.

### Formal Validation and Contextual Meaning Work Together

Russellian validation should prevent unsafe capability chains:

- No generated content directly writing to external systems without validation.
- No same-level circular orchestration.
- No unvalidated read-to-write paths.

Wittgensteinian validation should improve selection:

- Does this capability belong in this language game?
- Is this business vocabulary being used in the right context?
- Does a similar skill family already exist?
- Is the proposed skill name misleading?

Together they let the agent discover tools semantically while still obeying formal safety constraints.

## 8. Recommended Skill and Tool Model

Add a tool capability descriptor that can be produced from existing skills:

```ts
export interface ToolCapability {
  id: string;
  sourceSkillId?: string;
  name: string;
  description: string;

  goalVerbs: string[];
  businessDomains: string[];
  languageGames: string[];
  familyClusters: string[];
  formOfLife: string;

  inputSchema: Record<string, unknown>;
  outputContract: OutputContract;
  contextRequirements?: ContextRequirement[];

  task: {
    kind: TaskKind;
    complexity: TaskComplexity;
    defaultStakes: TaskStakes;
    reversible: boolean;
    isIntermediateDefault: boolean;
  };

  routing: {
    minTier: ModelTierKey;
    preferredTier?: ModelTierKey;
    maxTier?: ModelTierKey;
    allowedProviders?: Provider[];
    requiresJson?: boolean;
    requiresToolCalling?: boolean;
    dataSensitivity: DataSensitivity;
  };

  safety: {
    axioms: RussellianAxiom[];
    typeLevel: number;
    sideEffects: Array<'none' | 'email' | 'database-write' | 'external-api-write'>;
    approvalRequired: boolean;
  };

  economics: {
    typicalInputTokens: number;
    typicalOutputTokens: number;
    typicalLatencyMs?: number;
  };

  examples: Array<{
    goal: string;
    inputs: Record<string, unknown>;
    expectedOutputs: string[];
  }>;
}
```

This descriptor can be stored in code first, then migrated into `skill_registry` metadata as the database-first architecture matures.

### How to Use Existing Skills Efficiently

Do not rewrite all skills immediately. Use this sequence:

1. Inventory the highest-value workflow skills.
2. Add output contracts to the steps already used in agentic DAGs.
3. Generate capability descriptors from those skills.
4. Split only the skills that are too broad for reliable routing.
5. Keep the existing skill UI as the human product shell.
6. Let the agent use the capability descriptors as tool affordances.
7. Add renderer capabilities for final deliverables.

### When to Split a Skill

Split a skill when:

- It asks one model to research, analyze, decide, write, and format in one call.
- Different parts clearly need different model tiers.
- Downstream tasks only need one field from the output.
- The skill has side effects mixed with generation.
- The prompt contains reusable expertise that would serve several workflows.

Do not split a skill when:

- It is a narrow one-shot transformation.
- It is mainly a final renderer.
- It is already stable, cheap, and not used by downstream tasks.

## 9. Model Routing Design

The model router should remain deterministic for now.

Inputs:

- `TaskClassification`
- `RoutingContext`
- `ModelProfile` registry
- policy constraints
- budget constraints

Outputs:

- selected model
- selected tier
- streaming flag
- prompt caching flag
- extended thinking flag and budget where supported
- estimated usage and cost
- routing reason
- rejected candidates

Baseline tier rules:

- `trivial` -> `fast`
- `routine` -> `fast` if intermediate, otherwise `balanced`
- `complex` -> `balanced`
- `strategic` -> `smart`
- strategic `reasoning` -> `reasoning`

Promotion and demotion:

- Promote terminal client or leadership outputs one tier unless explicitly capped.
- Demote reversible intermediate work at most one tier.
- Never route below `minTier`.
- Never violate provider restrictions or data policy.
- If budget is insufficient, fail with a useful error instead of silently lowering quality.

### Provider Scope

Current runtime routing should be provider-scoped:

```ts
routeModel(classification, {
  preferredProviders: [options.provider],
  allowedProviders: [options.provider],
});
```

True cross-provider routing needs a credential envelope:

```ts
interface ProviderCredentialEnvelope {
  claude?: { apiKey: string; available: boolean };
  gemini?: { apiKey: string; available: boolean };
  chatgpt?: { apiKey: string; available: boolean };
}
```

Until that exists, the system can compare costs across providers in projections but should not claim runtime provider switching.

## 10. Error Handling and Stability

### Current Error Handling

The application already has several stability layers:

- Route and page error boundaries in `components/ErrorBoundary.tsx`.
- Centralized logger in `lib/logger.ts`.
- Provider wrappers that normalize provider invocation paths.
- Database loaders that log failures and avoid crashing browse surfaces where possible.
- Agentic runner execution with `Promise.allSettled` so sibling failures are isolated.
- Skip rules for optional or irrelevant DAG steps.
- Structured extraction fallback behavior in runner context gathering.
- Policy and approval tables for side-effect gates.
- Supabase persistence that can degrade when agentic tables are unavailable.

### Desired Agentic Error Model

Every agentic task should end in one of these outcomes:

- `succeeded`: output contract satisfied.
- `skipped`: skip rule or planner decision made it irrelevant.
- `retrying`: transient provider, extraction, or validation failure.
- `failed`: unrecoverable error or max retries exceeded.
- `awaiting_approval`: side effect or budget escalation requires human decision.
- `replanned`: output invalidated assumptions and planner changed the graph.

### Error Classes to Formalize

- `ProviderInvocationError`: provider unavailable, invalid key, rate limit, or API error.
- `RoutingBudgetExceededError`: no eligible model fits quality and budget.
- `RoutingNoEligibleModelError`: no model meets hard constraints.
- `OutputContractError`: missing or malformed required fields.
- `PolicyDeniedError`: requested side effect blocked by policy.
- `ApprovalRequiredError`: side effect or budget change requires human approval.
- `ToolCapabilityInputError`: tool selected but required inputs are missing.
- `PersistenceDegradedWarning`: run can continue but facts/costs may not persist.

### Retry and Escalation Rules

- Provider rate limit: retry with backoff, then same-tier fallback if credentials permit.
- Output extraction failure: retry fast extractor once, then escalate to balanced if required fields remain missing.
- Contract failure on intermediate work: retry or replan depending on dependency count.
- Contract failure on final deliverable: escalate one tier and run evaluator.
- Budget exceeded: stop and ask for approval; do not downshift below quality floor.
- Side effect: create approval request before execution.
- Persistence failure: continue only if the action is read-only and user-visible output is not lost; otherwise stop.

## 11. Issues Overcome in Development

The project has already overcome several important development constraints:

- Multiple skill sources evolved over time. The database-first migration gives the app a path back to one source of truth without breaking old execution.
- The original workflow model was too linear. Agentic DAGs now model real dependency graphs and parallel execution.
- Blob handoff made downstream work brittle. Output contracts and selective context requirements create structured handoff.
- Cost was opaque. The new registry and router make model cost inspectable per step.
- Provider models drift. The routing design now requires price snapshots and adapter-supported model IDs.
- Safety and meaning were blended into prompt text. Russellian and Wittgensteinian metadata separate formal validity from contextual usefulness.
- Side effects needed a gate. The agentic policy and approval schema provide a human-in-the-loop boundary.
- Agent state was ephemeral. `agentic.agent_runs`, `skill_executions`, and `entity_context` create a memory path.
- The existing UI has many valuable skill surfaces. The new recommendation preserves them while adding a tool-capability layer for agents.

Known current technical issues:

- Documentation and comments contain encoding artifacts in some files. New docs should stay plain ASCII unless a file already requires Unicode.
- `npm run typecheck` currently lacks a usable `tsconfig.json` and prints TypeScript help instead of performing a project typecheck.
- The full test suite has one known unrelated workflow failure about duplicate output keys in `tests/lib/workflows.test.ts`.
- The model price registry and billing price registry are separate and must be reconciled.
- Cost Explorer currently projects from registry/DAGs; actual persisted cost overlay is the next step.

## 12. Future Development Roadmap

### Phase 1: Stabilize Routing and Costing

Goal: every agentic skill execution has a routed model, estimated cost, and persisted routing reason.

Status: mostly created in code; hosted installs must apply `20260429_agentic_routing_costs.sql`. Remaining work is actual provider token usage extraction, a shared pricing bridge with billing, and multi-provider credential envelopes.

Deliverables:

- Finish provider-scoped runtime routing.
- Persist route metadata and estimated token usage.
- Add tests for routing constraints, budget failure, and persistence shape.
- Update Cost Explorer to distinguish projection from attribution.
- Add provider usage extraction when provider wrappers expose token counts.

### Phase 2: Create Tool Capability Registry

Goal: let the agent pick capabilities by contract instead of picking UI skills by name.

Status: created in code for library/database adapters, PPC, RFP, CRM local prospecting, the first 12 executable internal/renderer agent tools, and the broader planned business capability roadmap. Remaining work is database-backed capability editing/loading and deeper executable implementations for the planned family descriptors.

Deliverables:

- `lib/agentic/toolRegistry.ts`
- `ToolCapability` type.
- Adapter from `skill_registry` and `LibrarySkill` into `ToolCapability`.
- Capability search by goal verbs, domain, language game, output contract, and side-effect profile.
- First capability descriptors for PPC, sales, customer success, SEO, marketing, and RFP workflows.

### Phase 3: Goal Planner and Dynamic DAG Builder

Goal: accept an open-ended goal and build a safe executable DAG.

Status: created in code with deterministic intake, capability retrieval, DAG construction, Russellian validation, Wittgensteinian warnings, PPC/RFP/CRM flows, generic first-12 business-agent DAGs, readiness/revision, memory retrieval, and Goal Console integration. Remaining work is persisted pre-execution planner traces and richer dynamic renderer selection.

Deliverables:

- `lib/agentic/goalPlanner.ts`
- Goal intake schema.
- Candidate capability retrieval.
- DAG construction and validation.
- Russellian composition check before execution.
- Wittgensteinian context check before finalizing tool choices.
- Planner trace persisted in `agentic.agent_runs.plan`.

### Phase 4: Evaluator and Replanner

Goal: improve quality without overpaying for every call.

Status: deterministic evaluator, retry/escalation policy, shadow-route helpers, optional runner quality gate, quality-events migration, and Cost Explorer quality reads exist. Remaining work is attempt-level quality telemetry from inside the runner loop.

Deliverables:

- Contract-aware evaluator.
- Retry and escalation policy.
- Shadow-route experiments for cheaper tiers.
- Quality metrics: contract completeness, evaluator retry rate, final approval edits, user feedback.
- Router tuning dashboard.

### Phase 5: Memory and Entity Intelligence

Goal: make future runs smarter because past runs taught the system durable facts.

Status: shared fact policies and memory-envelope builders exist. Remaining work is Supabase-backed retrieval into the Goal Console/planner and a richer entity graph.

Deliverables:

- Fact extraction policy from structured outputs.
- Entity graph for clients, accounts, deals, campaigns, projects, documents, and people.
- Confidence and expiry handling.
- Memory retrieval into context envelopes.
- User-visible memory inspector with correction controls.

### Phase 6: Side-Effect Connectors

Goal: let the agent not only advise but operate, with approvals.

Status: connector metadata and approval-boundary helpers exist. Remaining work is executable adapters and audit logs.

Deliverables:

- Email draft/send connector.
- Calendar and meeting brief connector.
- CRM connector.
- Google Ads or ad account connector.
- Spreadsheet and document creation connector.
- Task/project management connector.
- Approval UX for side-effect diffs.

### Phase 7: Business Agent Console

Goal: move from admin lab to production operator.

Status: console state types and lab/admin pages exist. Remaining work is a production console route backed by persisted runs, approvals, memory, recurring goals, and client/account dashboards.

Deliverables:

- Goal inbox.
- Agent run timeline.
- Cost and quality trace.
- Approval queue.
- Memory view.
- Saved recurring goals.
- Team policies.
- Client/account dashboards.

## 13. Skill and Capability Roadmap

Current implementation state: the first 12 anchor tools are ready executable internal/renderer capabilities, CRM prospecting capabilities are ready executable CRM tools, and the highest-impact family roadmap below is now represented as typed planned `ToolCapability` descriptors. The planned descriptors are intentionally small capability atoms, not whole UI pages, so the agent can search, validate, route, and eventually execute only the most useful portion of each business function.

### Highest-Impact Capability Families

1. Business intake and planning
   - Goal clarification.
   - Stakeholder identification.
   - Deadline and constraint extraction.
   - Project decomposition.

2. Research and intelligence
   - Account intelligence.
   - Competitor research.
   - Market scan.
   - Regulatory scan.
   - Customer voice synthesis.

3. Financial and operating analysis
   - Budget review.
   - Forecast variance.
   - Unit economics.
   - Scenario modeling.
   - ROI narrative.

4. Sales and customer success
   - Account pursuit.
   - Discovery prep.
   - Objection handling.
   - QBR preparation.
   - Churn intervention.
   - Renewal and expansion planning.

5. Marketing and content operations
   - Campaign strategy.
   - Editorial calendar.
   - Paid media audit.
   - SEO/GEO analysis.
   - Landing page critique.
   - Email sequence generation.

6. Legal, compliance, and governance
   - Contract issue spotting.
   - RFP compliance matrix.
   - AI risk assessment.
   - Data handling classification.
   - Policy comparison.

7. People and recruiting
   - Job intake.
   - Candidate screening rubric.
   - Interview plan.
   - Performance review synthesis.
   - Staffing client update.

8. Deliverable renderers
   - Executive memo.
   - Client email.
   - Board brief.
   - QBR deck outline.
   - Spreadsheet model spec.
   - Dashboard spec.
   - Task plan.

9. Quality and evaluator skills
   - Factual consistency check.
   - Contract completeness check.
   - Tone and audience fit check.
   - Risk and compliance check.
   - Source coverage check.

### Recommended First 12 Agent Tools

These should be small typed capabilities, not whole UI pages:

1. `extract-business-goal`
2. `classify-business-context`
3. `retrieve-entity-memory`
4. `summarize-source-material`
5. `identify-risks-and-open-questions`
6. `prioritize-actions`
7. `build-client-brief`
8. `build-executive-brief`
9. `build-email-draft`
10. `build-work-plan`
11. `evaluate-output-contract`
12. `persist-business-facts`

## 14. Implementation Spec to Paste Into Codex

Original bootstrap sequence, now mostly completed:

1. Create `lib/agentic/toolRegistry.ts`.
2. Add `ToolCapability` and `ToolCapabilitySearchQuery` types.
3. Implement `capabilityFromLibrarySkill(skill: LibrarySkill): ToolCapability`.
4. Implement `searchCapabilities(query)` using:
   - goal verbs
   - business domain
   - language games
   - family clusters
   - output contract fields
   - side-effect safety
   - routing constraints
5. Add first manual descriptors for the six hand-authored DAG families.
6. Update `AgenticStep` to optionally reference `capabilityId` as well as `skillId`.
7. Add a `goalPlanner.ts` that:
   - accepts a goal and context envelope
   - retrieves candidate capabilities
   - drafts a DAG
   - validates Russellian composition
   - validates Wittgensteinian contextual fit
   - returns an inspectable plan
8. Add tests proving:
   - capabilities can be adapted from existing skills
   - side-effect capabilities require approval
   - planner cannot compose invalid Russellian chains
   - context search finds capabilities without exact skill-name match
   - model routing honors capability routing constraints
9. Update Cost Explorer to show actual `agentic.skill_executions` rows when Supabase is configured, while keeping offline projections as fallback.
10. Add a first production-ish goal flow:
    - "Create a weekly PPC operating packet"
    - planner selects PPC capabilities
    - runner executes DAG
    - renderer produces client-ready update
    - facts persist to entity context

Current continuation sequence:

1. Complete the hosted install checklist in `NEXT_INSTALL_STEPS.md`.
2. Create agent run rows before Goal Console execution when live attempt-level quality persistence is required.
3. Move website contact extraction to a server-side Edge Function.
4. Add durable CRM campaign, campaign member, outreach step, and suppression-list tables.
5. Persist connector audit events and approval diffs.
6. Replace Business Agent Console demo state with Supabase-backed goal inbox, run timeline, approvals, memory, and client/account dashboards.
7. Add database-backed capability editing from `skill_registry`.
8. Add multi-provider credential envelopes for true cross-provider runtime routing.

## 15. Acceptance Criteria for the Agentic Direction

The transition is working when:

- A user can state a business goal without choosing a specific workflow.
- The system can explain which capabilities it selected and why.
- The selected graph contains parallel branches when dependencies allow it.
- Each LLM call has a model route, cost estimate, and quality rationale.
- Downstream tasks receive structured fields, not raw blobs by default.
- Side effects are impossible without policy approval.
- Final outputs are polished for the audience and format requested.
- The system remembers durable facts for future runs.
- Cost Explorer can show projected and actual spend by model, tier, skill, workflow, agent, and time period.
- The old skill library remains usable while the new tool-capability layer makes it agentic.

## 16. LLM Visibility Audit and Local AI Search Service

### Strategic Positioning

The LLM Visibility Audit is the first tightly packaged service product built on top of the broader SkillEngine capability base. It turns the abstract value of SEO, AEO, GEO, local prospecting, reporting, and remediation planning into a service a local business owner can understand quickly:

```text
When people ask ChatGPT, Claude, Gemini, Perplexity, or Google AI results who to hire in your category, does your business show up?
```

The service should be sold as a practical local visibility check, not as a technical AI consulting engagement. The strongest offer is:

```text
Free AI Visibility Snapshot
See whether AI tools recommend your business when local buyers ask who to hire.
```

The free offer should be a limited snapshot, not the full paid audit. It should show enough pain to create urgency while preserving the deeper diagnosis, evidence package, and remediation plan for the paid service.

### Product Role Inside the Complete App

The complete application should treat LLM Visibility Audit as a connected module, not a standalone page:

- The Clients CRM stores businesses, contacts, categories, service areas, competitors, outreach status, and follow-up notes.
- Local prospecting finds Madison-area businesses that are good candidates for the offer.
- The LLM Visibility Audit tests whether AI answer engines mention, recommend, cite, or ignore those businesses.
- The SEO/AEO/GEO audit explains why the visibility problem exists by checking schema, content depth, technical health, Google Business Profile signals, reviews, citations, crawlability, and answer-ready content.
- The agentic reporting layer drafts the client narrative, service proposal, follow-up email, and remediation plan.
- The action-plan layer turns findings into scoped work with owner, hours, due date, service line, and price anchor.
- Re-audit deltas prove before/after lift after remediation.

This creates a full consulting motion:

```text
Lead/prospect -> free snapshot -> paid audit -> remediation sprint -> re-audit proof -> ongoing local visibility retainer
```

### Core LLM Visibility Audit Functionality

The production module should support a 30-minute operator workflow for any local business website:

1. Instant intake
   - Paste a website URL.
   - Auto-fill business name, website, niche, city, state, services, service radius, aliases, schema status, GBP/review signals, and likely competitors.
   - Let the operator approve or edit every inferred field before running.

2. Audit profile selection
   - `Free Snapshot`: 5 questions across ChatGPT and Perplexity, with optional manual Google/Gemini paste.
   - `Madison MVP`: 15 questions across ChatGPT, Gemini, and Perplexity for Madison/Dane County lead generation.
   - `Full Audit`: 45 questions across ChatGPT, Claude, Gemini, Perplexity, plus manual Google AI Overview evidence.

3. Question categories
   - Brand Health: "Tell me about {brand}" and reliability/reputation prompts.
   - Competitors: "Who are the main competitors?" and "Alternatives to {competitor}" prompts.
   - Category + Geo: "Best {niche} in {geo}" and Madison-area service-area prompts.
   - Service: service-line prompts for emergency, high-ticket, and recurring services.
   - Problem/Solution: "I need help with {job_to_be_done}; who should I hire?"
   - Cost/Value: pricing, financing, estimate, and value-comparison prompts.
   - Decision: "Should I choose {brand} or {competitor}?"
   - Reputation/Trust: reviews, complaints, reliability, safety, and credibility prompts.
   - Local Intent: "near me" and specific suburb prompts.

4. Madison question pack
   - Default local geography should include Madison, Middleton, Sun Prairie, Fitchburg, Verona, Waunakee, Monona, McFarland, Oregon, DeForest, Cottage Grove, and Stoughton.
   - The pack should be reusable for HVAC, dental, legal, roofing, plumbing, med spa, real estate, accounting, restaurant, auto repair, landscaping, pest control, fitness, pool/spa, home remodeling, assisted living, childcare, veterinary, insurance, financial advisor, and cleaning services.

5. Provider execution
   - Supported platforms: ChatGPT/OpenAI, Claude/Anthropic, Gemini/Google, and Perplexity.
   - Each API query must be a clean one-shot request with no conversation thread, no retained chat history, and no reused prompt state beyond the explicit system instruction and buyer question.
   - Browser-only or UI-sensitive surfaces such as Google AI Overviews remain manual or hybrid in v1 because API output may not match the consumer result.
   - Every run records provider, model, prompt, timestamp, raw response, citations, warnings, status, score, and QA status.

6. Evidence locker
   - Exact prompt.
   - Platform and model.
   - Capture mode: API, manual, or hybrid.
   - Timestamp.
   - Raw response.
   - Raw provider JSON when available.
   - Citations and source URLs.
   - Screenshot/upload URL or manual evidence reference.
   - Scorer name.
   - QA status: unreviewed, needs review, approved, excluded, high-impact miss.
   - Caveat text explaining that AI answers vary by platform, location, account state, and time.

7. Scoring
   - Keep the simple workbook score because it is client-readable:
     - 0: harmful or wrong mention.
     - 1: not mentioned.
     - 2: weak/uncited/indirect mention.
     - 3: mentioned neutrally.
     - 4: recommended but not dominant.
     - 5: dominant recommendation with supportive evidence.
   - Also keep the SaaS-style 0-100 AI Visibility Score:
     - mention rate
     - position score
     - sentiment
     - citation rate
     - competitor dominance ratio
   - Always show the plain-English count beside composite scores: "You appeared in 4 of 15 buyer questions."

8. Competitor share of voice
   - Competitors should be discovered from the website, category, service area, approved competitor list, and actual LLM responses.
   - Bad generic tokens such as "Google Ads" or "Facebook Ads" must be filtered out unless the audited category is actually advertising services.
   - The app should show which named competitors appear most often, in which query categories, and on which platforms.

9. Report writer
   - Generate an executive summary.
   - Explain what AI says about the business.
   - Explain who beats the business and where.
   - Explain why this is likely happening using SEO/AEO/GEO evidence.
   - List precise fixes with owner, effort, hours, and price range.
   - Draft the client email.
   - Export cleanly to copyable text, PDF, DOCX, CSV, and JSON.

10. Action plan builder
   - Recommended fix.
   - Root cause.
   - Owner.
   - Estimated hours.
   - Due date.
   - Service line.
   - Estimated price.
   - Status.

11. Shareable lead scorecard
   - Public or shareable link for the free snapshot.
   - Lead capture at the bottom.
   - CTA to book a full audit or remediation call.
   - Snapshot-level caveat so prospects understand it is directional.

12. Re-audit proof
   - Set a baseline after the first run.
   - Re-run after fixes.
   - Show deltas for visibility score, mention rate, citation rate, workbook score, and competitor share.

### Relationship to SEO/AEO/GEO Audit

The LLM audit answers "What do AI tools say when buyers ask?" The existing SEO/AEO/GEO audit answers "Why are they saying that?"

The two modules should share a single client profile and produce a combined report:

- LLM Visibility Audit:
  - AI recommendation presence.
  - Brand mentions.
  - Brand position.
  - Citations in AI answers.
  - Competitor share of voice.
  - Query category winners and misses.
  - Manual Google AI Overview/Gemini evidence.

- SEO/AEO/GEO Audit:
  - Technical crawlability.
  - Title/meta/H1 quality.
  - Schema.org LocalBusiness, Service, FAQ, Review, and sameAs coverage.
  - Content depth and answer blocks.
  - GBP and review signals.
  - Citation consistency.
  - Local landing page coverage.
  - Authority links and topical mentions.

Combined recommendation logic:

- If the business is missing from LLM answers and has weak schema, recommend schema remediation and entity reinforcement.
- If competitors dominate local prompts and the business has thin service pages, recommend service-page and FAQ content.
- If the business is mentioned without citations, recommend source/citation building and sameAs cleanup.
- If "near me" prompts miss the business, recommend GBP optimization, reviews, local landing pages, and citation consistency.
- If the business appears but is outranked by competitors, recommend review velocity, authority proof, comparison content, and category-specific evidence pages.

### Service Offer Recommendation

The recommended sales model is a free limited snapshot followed by a paid diagnostic and remediation offer.

Do not give away the full report free. A full report requires enough evidence and narrative value that it should be paid or bundled into a remediation sale. The free snapshot should create the "I did not know AI was already choosing vendors" moment.

Offer ladder:

1. Free AI Visibility Snapshot
   - 5 to 7 buyer questions.
   - 1 to 2 platforms.
   - Simple scorecard.
   - Mention count.
   - Top 1 to 3 gaps.
   - Short email summary.
   - CTA: "Book a 20-minute review."

2. Paid AI Visibility Audit
   - 15 to 30 questions.
   - 3 to 4 platforms.
   - Approved competitor list.
   - Evidence locker.
   - Competitor share-of-voice.
   - SEO/AEO/GEO cross-check.
   - PDF/DOCX report.
   - Prioritized fix plan.
   - Suggested Madison price: $299 to $750 one-time depending category and depth.

3. AI Visibility Fix Sprint
   - Schema implementation.
   - GBP optimization.
   - Review strategy.
   - Service page and local landing page content.
   - FAQ/answer-block content.
   - Citation cleanup and source-building.
   - Re-audit at 30 to 60 days.
   - Suggested price: $1,500 to $5,000 for small fixes, $5,000 to $15,000 for comprehensive local-market remediation.

4. Ongoing AI Visibility Monitoring
   - Monthly or quarterly re-audit.
   - New competitor watch.
   - New content/fix recommendations.
   - Before/after reporting.
   - Suggested price: $199 to $750/month depending number of locations and query volume.

### Madison Target Segments

The highest-probability Madison-area targets are local categories where one new customer is worth enough to justify a paid fix sprint:

- HVAC, plumbing, roofing, electrical, pest control, landscaping, cleaning, remodeling, pool/spa.
- Dental, med spa, chiropractic, physical therapy, veterinary, assisted living, childcare.
- Legal, accounting, insurance, financial advisors, real estate teams.
- Auto repair, restaurants, event venues, fitness studios, specialty retail.

Initial outreach should prioritize businesses that already spend on SEO, paid search, directories, or social ads because they understand lead value but may not know AI answers are becoming a new recommendation surface.

### Consulting Website Lead Generation Recommendation

Pitch the website offer as a free report, but make the scope clear:

```text
Get a free AI Visibility Snapshot
We will check whether ChatGPT, Gemini, Claude, Perplexity, and Google-style AI answers are recommending your business when local customers ask who to hire.
```

Recommended page positioning:

- Avoid "LLM audit" as the primary consumer headline. Use "AI Visibility" or "AI Search Visibility."
- Lead with the risk: buyers are asking AI who to hire and most local businesses have no idea whether they show up.
- Promise a snapshot, not a guaranteed ranking or comprehensive SEO audit.
- Make the form extremely short.
- Follow up with a short personalized email and a booking CTA.

Lead form fields:

- Business Name
- Website
- Email
- Business Category

Button:

```text
Get Your Free Report
```

Hidden metadata:

- `lead_source`: `ai_visibility_snapshot`
- `offer`: `free_snapshot`
- `market`: `madison_wi`
- `requested_report_type`: `llm_visibility_snapshot`

### Lead Generation Page Spec for Claude Code

Use this spec in the consulting website repository to create the new lead generation page. Reuse the current Contact page form mechanics, validation, submission endpoint, spam protection, toast/success handling, and visual button style. Do not invent a second lead delivery path if the Contact page already has one.

```text
Build a new consulting website page for an AI Visibility Snapshot lead magnet.

Goal:
Create a conversion-focused lead generation page that offers a free local AI visibility report for businesses in the Madison, WI area. The page should match the existing site design system and reuse the same form submission behavior as the existing Contact page.

Route:
Use /ai-visibility-audit or /ai-visibility-report, whichever matches the site's route naming conventions.

Primary page promise:
"Find out if AI tools recommend your business when local customers ask who to hire."

Hero:
- H1: Are AI tools recommending your business?
- Supporting copy: "Customers are starting to ask ChatGPT, Gemini, Claude, Perplexity, and Google AI results who to hire locally. I will run a free snapshot to see whether your business appears, who shows up instead, and what may be holding you back."
- Primary CTA: "Get Your Free Report"
- Secondary trust/caveat line: "Free snapshot for Madison-area businesses. No obligation. AI results vary by platform and date, so every report includes the exact prompts and evidence used."

Lead form:
Reuse the existing Contact page submission function/component/style if possible.
Fields:
- businessName: text, required, label "Business Name"
- website: url/text, required, label "Website"
- email: email, required, label "Email"
- businessCategory: text or select, required, label "Business Category"

Hidden fields:
- leadSource: "ai_visibility_snapshot"
- offer: "free_snapshot"
- market: "madison_wi"
- requestedReportType: "llm_visibility_snapshot"

Submit button:
- Text: "Get Your Free Report"
- Use the same visual variant, sizing, hover state, loading state, disabled state, and success state as the Contact page primary submit button.

Validation:
- Email must be valid.
- Website must not be empty and should be normalized with https:// if the user omits the protocol.
- Business category must not be empty.
- Show validation errors using the site's existing Contact page pattern.

Post-submit behavior:
- Use the same backend/API/contact action used by the Contact page.
- Include all visible and hidden fields in the payload/message.
- Show a success state: "Thanks. I will review your AI visibility and send the snapshot to your email."
- Optional secondary CTA after success: "Book a quick review call" using the site's existing booking link if one exists.

Sections:
1. Hero with lead form.
2. "What I check" section with four concise items:
   - Whether your business appears in AI answers.
   - Which competitors are recommended instead.
   - Whether AI cites your website or other sources.
   - What quick fixes could improve visibility.
3. "Why this matters" section:
   - Local buyers are using AI as a recommendation engine.
   - AI answers often name only a few businesses.
   - Traditional SEO tools do not clearly show whether AI recommends you.
4. "What you get free" section:
   - 5 to 7 buyer-intent questions.
   - 1 to 2 AI platforms.
   - Mention count.
   - Top competitor mentions.
   - Top 1 to 3 next-step recommendations.
5. "Full audit and fixes" section:
   - Explain that the paid audit adds more questions, more platforms, screenshots/evidence, SEO/AEO/GEO diagnosis, and a prioritized remediation plan.
6. FAQ:
   - Is this SEO?
   - Which AI tools do you check?
   - Is the free report automated?
   - How long does it take?
   - What happens if my business does not show up?

Tone:
Plain-English, local, consultative, and direct. Avoid heavy jargon like "LLM" in the main headline. Use "AI tools", "AI search", and "AI recommendations" for business owners.

Design:
- Follow existing consulting site spacing, typography, colors, form styling, and button styling.
- Keep the hero immediately actionable.
- Do not bury the form below a long explanation.
- Use restrained proof points and avoid exaggerated claims.
- Make the page work well on mobile.

Acceptance criteria:
- Page builds without TypeScript or lint errors.
- Form submits through the same path as the Contact page.
- Payload clearly identifies the lead as an AI Visibility Snapshot request.
- Button text is "Get Your Free Report".
- Required fields are Business Name, Website, Email, and Business Category.
- Success message appears after submit.
- Page copy clearly explains that the free deliverable is a snapshot and the full audit/remediation is the next step.
```

### Production Readiness Gaps

The current LLM Visibility Audit module is strong enough for operator-assisted MVP use, but production service quality requires:

- Server-side provider calls so API keys are not exposed in the browser.
- Durable storage for evidence, screenshots, reports, leads, and re-audit history.
- PDF and DOCX generation rather than only copy/CSV/JSON export.
- Better competitor entity extraction with category-aware filtering.
- Integration from the LLM audit scorecard into the SEO/AEO/GEO audit report.
- CRM lead creation from the public scorecard and consulting website form.
- Operator QA checklist before sending any report.
- A booking integration or CRM task for every submitted lead.
- Cost guardrails per audit profile.
- A disclosure/caveat block in every report.

## 17. Final Design Principle

The business agent should not be a bigger prompt. It should be an operating system for business work: typed tools, validated composition, contextual judgment, routed cognition, visible cost, human approval, and durable memory. Existing skills are the asset base. The next step is to make their best parts callable, composable, and inspectable.
