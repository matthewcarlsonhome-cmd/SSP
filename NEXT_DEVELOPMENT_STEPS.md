# Next Development Steps

Version: 2026-04-29
Purpose: current-state readout and implementation framework for continuing the transition from SkillEngine into a fully agentic business-running platform.

Companion install checklist: `NEXT_INSTALL_STEPS.md`. Use that document before testing hosted behavior, because several completed features require SQL migrations, Supabase schema exposure, Edge Function deployment, and provider secrets before they are live outside local/demo mode.

## North Star

SkillEngine is moving from "user picks a skill or workflow" to "user gives a business goal and the agent plans, routes, executes, validates, remembers, and renders the work." The core product direction is a business agent that can:

- accept a goal plus business context;
- retrieve relevant memory about clients, accounts, deals, projects, people, and documents;
- select typed capabilities rather than UI pages;
- build a DAG with maximum safe parallelism;
- route each model call to the lowest-cost model that satisfies quality, policy, and provider constraints;
- evaluate outputs against contracts;
- retry, escalate, or replan when quality fails;
- require approval for side effects;
- persist facts, costs, routing reasons, and quality traces;
- produce polished business deliverables.

## Current Application State

The app is a React, TypeScript, Vite, Tailwind, Supabase application using `HashRouter`. It still contains the original job-search and skill-library surfaces, and now also contains an isolated Agentic Lab.

Existing product surfaces include:

- home, dashboard, profile, account, API key, pricing, settings, and admin pages;
- static skills, library skills, role-template skills, dynamic/custom skills, community skills, and batch skill execution;
- classic workflow browsing and workflow execution;
- client portal pages;
- Agentic Lab routes under `/agentic`.

Agentic Lab routes now include:

- `/agentic` for the lab home;
- `/agentic/compare` and `/agentic/compare/:workflowId`;
- `/agentic/run/:workflowId`;
- `/agentic/side-by-side/:workflowId`;
- `/agentic/control-tower`;
- `/agentic/entities`;
- `/agentic/approvals`;
- `/agentic/agents` and `/agentic/agents/:agentId`;
- `/agentic/goals`;
- `/agentic/capabilities`;
- `/agentic/costs`.

The codebase now has the main building blocks for a business agent:

- model registry, pricing, token estimation, and cost calculation in `lib/agentic/costing.ts`;
- deterministic model routing in `lib/agentic/orchestrator.ts`;
- step classification in `lib/agentic/taskClassifier.ts`;
- DAG execution, provider-scoped routing, route metadata capture, and optional quality gates in `lib/agentic/runner.ts`;
- skill invocation and structured extraction in `lib/agentic/skillTool.ts` and `lib/agentic/extractor.ts`;
- output contracts, DAG contracts, context requirements, and hand-authored workflows in `lib/agentic/contracts`;
- persistence helpers and fact extraction integration in `lib/agentic/persistence.ts`;
- policy and approval boundaries in `lib/agentic/policy.ts`;
- goal planning and dynamic DAG construction in `lib/agentic/goalPlanner.ts`;
- tool capability registry, LibrarySkill adapters, database skill adapters, capability search, and coverage rows in `lib/agentic/toolRegistry.ts`;
- deterministic evaluator/replanner framework in `lib/agentic/replanner.ts`;
- shared memory/fact policy helpers in `lib/agentic/memory.ts`;
- connector metadata, side-effect boundaries, approval diffs, and implementation order in `lib/agentic/connectors.ts`;
- Business Agent console state types in `lib/agentic/businessConsole.ts`;
- Cost Explorer, Goal Console, and Capability Coverage pages.

The Clients CRM is now the first concrete business-agent acquisition surface:

- Client records already store company metadata, services, location, priority, pain points, key use cases, contacts, selected skills/workflows, portal messaging, status, notes, and Supabase/localStorage persistence.
- Prospect Discovery can now perform local business lookup by business type and location, normalize records, score automation-campaign fit, enrich prospects, and bulk import them into Client records.
- `lib/localBusinessLookup.ts` provides the agent-ready lookup normalization layer.
- `lib/crmAgentTools.ts` executes CRM lookup, enrichment, scoring, import, contact extraction, outreach draft, and campaign worklist capabilities.
- `supabase/functions/local-business-lookup` provides the production path for Google Places lookup without exposing provider keys in the browser.
- `supabase/migrations/20260429_client_lookup_provenance.sql` adds first-class lookup provenance to Client records.
- `docs/CLIENT_CRM_LOCAL_PROSPECTING_DESIGN.md` defines the local prospecting architecture, provider constraints, CRM mapping, errors, and roadmap.
- `docs/AGENTIC_BUSINESS_AGENT_DESIGN_UPDATE.md` captures the current agentic business-agent design after CRM capabilities were made executable.
- `NEXT_INSTALL_STEPS.md` lists the exact SQL, Edge Function, secrets, and hosted smoke tests required to make the implemented functionality live.

## What Was Completed Since The Previous Roadmap

The previous next-steps document still described several already-built items as future work. Current code now includes:

- Goal Console UI with goal text, context controls, plan preview, validation messages, routing/cost preview, and run button wiring.
- `/agentic/goals` route and Agentic Home tile.
- Runner quality gate options with deterministic evaluation, retry decisions, and route-tier escalation after repeated failures.
- Shared memory fact extraction policies used by persistence.
- Goal planner memory envelope creation and first-step memory input handoff.
- Cost Explorer extensions for actual-row grouping, tier mix, quality proxies, retry/escalation proxies, and shadow downshift rows.
- Capability Coverage dashboard route and table.
- Connector implementation order and draft/propose vs external side-effect boundary helpers.
- PPC classic workflow output keys repaired so every workflow step has a unique output artifact name.
- Capability coverage now inventories the broader library skill surface, not only the already-registered capability list.
- Quality telemetry now has a first-class `agentic.quality_events` migration, typed Supabase helpers, post-run contract assessment persistence, and Cost Explorer reads that prefer real quality rows when present.
- Local CRM prospecting now has lookup provider abstraction, demo/local development records, Google Places normalization, Supabase Edge Function proxy, campaign-fit scoring, UI integration, and tests.
- The ToolCapability registry now includes executable CRM local prospecting capabilities for finding businesses, enriching prospects, scoring campaign fit, importing approved prospects, extracting website contact info, drafting outreach, and building campaign worklists.
- The Agentic DAG runner can execute supported CRM internal/renderer capabilities directly, which is the first bridge from searchable capabilities to composable non-LLM tools.
- Provider token usage is now normalized into `TokenUsage` when Claude/OpenAI/Gemini wrappers expose usage metadata, and routed step attribution prefers actual usage/cost over estimates.
- The runner emits structured attempt-level quality telemetry between rounds and can persist it to `agentic.quality_events` when an `agentRunId` is supplied.
- Goal planning now has readiness inspection/revision helpers and the Goal Console blocks execution when source material or first-step inputs are missing.
- Goal planning retrieves and ranks entity memory facts by confidence, recency, entity match, expiry, and goal overlap before building the context envelope.
- `/agentic/console` now provides the first Business Agent Console operator shell.
- Connector execution stubs now produce local-first document/task/email/spreadsheet/proposal artifacts without external writes and stop true external actions at integration/approval boundaries.
- Capability Coverage now has filters, readiness scores, recommendations, and CSV export for migration workbench use.
- The first 12 anchor agent tools are now ready executable internal/renderer capabilities in `lib/agentic/businessTools.ts`; the runner can execute them without invoking a monolithic UI skill.
- The Skill and Capability Roadmap families are now represented in `lib/agentic/toolRegistry.ts` as small typed planned capabilities across business intake, research, finance, sales/customer success, marketing, governance, people/recruiting, deliverable renderers, and quality/evaluator work.
- Capability roadmap coverage can now be summarized with `summarizeCapabilityRoadmapCoverage()`, which gives an implementation-status readout by family.

## Roadmap Status By Phase

### Phase 1: Stabilize Routing And Costing

Created:

- model registry and active price snapshot;
- `calculateCost`, `estimateCost`, token-counting heuristic;
- deterministic `routeModel`;
- provider-scoped runtime routing in the runner;
- persisted model id, provider, tier, token estimates, cost estimates, and routing reasons;
- Cost Explorer projection and actual-row overlays;
- tests for routing, costing, persistence row shape, and budget constraints.

Still needed:

- broader verification against live Claude, Gemini, and ChatGPT response shapes as provider SDKs evolve;
- unified pricing bridge between `lib/billing.ts`, `lib/platformKeys.ts`, and `lib/agentic/costing.ts`;
- multi-provider credential envelope so one run can route across providers safely;
- pre-created run persistence for Goal Console so attempt-level quality rows can be written during every user-triggered run.

### Phase 2: Tool Capability Registry

Created:

- `ToolCapability`, `ToolCapabilitySearchQuery`, and search results;
- adapters from `LibrarySkill` and database skill metadata;
- manual descriptors for PPC, RFP, CRM local prospecting, the first 12 executable internal/renderer agent tools, and the broader planned business capability roadmap;
- search by goal, verb, domain, language game, family, output fields, side-effect safety, and routing constraints;
- capability coverage rows and admin UI.
- direct execution for the first 12 anchor business tools plus CRM local prospecting tools.

Still needed:

- database-backed capability loading once `skill_registry` coverage is mature;
- admin capability editor for adding output contracts, axioms, language games, examples, and side-effect declarations;
- deeper executable implementations for the planned roadmap descriptors where deterministic logic is not enough;
- broaden connector-backed execution for documents, tasks, emails, spreadsheets, calendar, CRM, and ad-account proposal workflows.

### Phase 3: Goal Planner And Dynamic DAG Builder

Created:

- goal intake schema and context envelope;
- deterministic domain/workflow inference;
- candidate capability retrieval;
- DAG creation from hand-authored DAGs, RFP capabilities, or generic capability search;
- generic business-agent DAG construction from the executable first 12 anchor tools;
- Russellian composition validation;
- Wittgensteinian contextual-fit warnings;
- inspectable execution plan suitable for `agentic.agent_runs.plan`;
- first production-ish weekly PPC operating packet flow.

Still needed:

- deeper planner revision loop that can insert intake steps, remove optional steps, or split ambiguous goals;
- persisted planner traces before execution starts;
- dynamic DAG renderer selection for final deliverables.

### Phase 4: Evaluator And Replanner

Created:

- deterministic contract evaluator;
- retry/escalation planner;
- shadow-route candidate planning;
- router tuning metric helpers;
- optional runner quality gate.
- `agentic.quality_events` migration plus typed read/write helpers;
- post-run quality assessment persistence when `persistRun` receives the executed DAG;
- Cost Explorer fallback hierarchy: persisted quality events first, execution-row proxies second.

Still needed:

- wiring Goal Console and Agentic Runner to create `agent_runs` before execution when attempt-level quality persistence is required;
- LLM evaluator option for high-stakes final deliverables after deterministic data is gathered;
- replay harness for comparing outputs across route tiers.

### Phase 5: Memory And Entity Intelligence

Created:

- shared memory/fact policy helpers;
- active fact filtering;
- memory context envelope builder;
- correction event type;
- persistence uses shared fact extraction policies.

Still needed:

- entity graph expansion for clients, accounts, deals, campaigns, projects, documents, and people;
- confidence, expiry, and correction provenance surfaced in Entity Inspector;
- memory retrieval UI controls for accepted/ignored facts in the plan preview.

### Phase 6: Side-Effect Connectors

Created:

- connector metadata framework;
- implementation order;
- policy classification for draft/propose vs external state changes;
- approval diff generation.

Still needed:

- live external connector adapters for `calendar.create_event`, `crm.update_record`, `ads.propose_change`, and `email.send`;
- connector execution audit log;
- credential availability checks;
- approval UX that shows before/after payload diffs.

### Phase 7: Business Agent Console

Created:

- state types for goal inbox, run timeline, cost trace, quality trace, approval summaries, memory summaries, recurring goals, team policies, and dashboard cards.

Still needed:

- goal inbox connected to persisted runs;
- live run timeline from `agentic.agent_runs` and `agentic.skill_executions`;
- approval queue, memory view, saved recurring goals, team policies, and client/account dashboard cards.

## Recommended Next Development Passes

### Pass 0: Install The Completed Infrastructure

Goal: make the code that already exists live in the hosted project.

Deliverables:

- run `20260429_agentic_routing_costs.sql`;
- run `20260429_agentic_quality_events.sql`;
- run `20260429_client_lookup_provenance.sql`;
- expose the `agentic` schema in Supabase API/PostgREST settings;
- deploy `supabase/functions/local-business-lookup`;
- set `GOOGLE_PLACES_API_KEY` in Supabase function secrets;
- redeploy the frontend with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`;
- run the smoke tests listed in `NEXT_INSTALL_STEPS.md`.

### Pass 1: Quality Persistence And Real Cost Attribution

Goal: complete the attribution layer now that quality events exist.

Already created in the latest pass:

- create `supabase/migrations/*_agentic_quality_events.sql`;
- add `agentic.quality_events` with run id, step id, workflow id, model id, tier, evaluator id, completeness score, missing required fields, retry count, escalation tier, decision, and created timestamp;
- add `recordQualityEvent`, `recordQualityEvents`, and `toQualityEventRow` in `lib/agentic/supabaseClient.ts`;
- call the writer from `persistRun` when the executed DAG is available, producing post-run contract assessment rows;
- update Cost Explorer to prefer actual quality rows, falling back to estimates/proxies.

Created in this pass:

- move quality-event emission into the runner's between-round quality loop;
- normalize provider response token usage into a shared `TokenUsage` object;
- replace token estimates with actual usage when providers expose it;

Remaining deliverables:

- create agent run rows before Goal Console execution when live attempt-level persistence is required;
- add actual cost attribution by provider/model/day from real token usage;
- bridge `lib/billing.ts` and `lib/agentic/costing.ts` so model prices have one source of truth.

Tests:

- row-shape test for `toQualityEventRow`;
- runner test proving quality event payload is emitted or persisted after an evaluation;
- cost attribution test proving actual token usage overrides estimates.

### Pass 2: Planner Revision Loop

Goal: make open-ended goals safer by detecting missing inputs before execution and proposing a revised plan.

Created in this pass:

- add `inspectGoalPlanReadiness(plan, userInputs)` in `lib/agentic/goalPlanner.ts`;
- return missing global inputs, missing capability inputs, validation errors, warnings, and suggested clarifying questions;
- update Goal Console to show readiness before enabling run;
- add `reviseGoalPlan` helper for merging supplied inputs and rechecking readiness.

Remaining deliverables:

- extend `reviseGoalPlan` to insert intake steps or remove optional steps;
- persist readiness status in the planner trace.

Tests:

- weekly PPC goal missing account/client context returns actionable missing inputs;
- invalid Russellian chain blocks run;
- ambiguous domain produces clarifying questions instead of a brittle generic DAG.

### Pass 3: Memory Retrieval Into Goal Planning

Goal: use past runs so the agent becomes less amnesiac.

Created in this pass:

- add `retrieveMemoryForGoal({ entity, goal, domainHints })`;
- rank facts by confidence, expiry, goal-token overlap, recency, and focus entity;
- update Goal Console to fetch memory when entity fields are present;
- include memory summary and memory keys in planner context and first-step input;

Remaining deliverables:

- show retrieved memory in the plan preview.

Tests:

- expired facts are not included;
- high-confidence matching facts outrank stale or unrelated facts;
- plan first step receives memory keys and summary.

### Pass 4: Business Agent Console

Goal: move from admin lab screens to an operator cockpit.

Created in this pass:

- create `pages/agentic/BusinessAgentConsolePage.tsx`;
- add `/agentic/console` route and Agentic Home tile;
- sections: goal inbox, active runs, recent completed runs, approval queue, cost/quality trace, memory highlights, recurring goals, team policies, client/account dashboard cards;
- start with local/mock state from `lib/agentic/businessConsole.ts`;

Remaining deliverables:

- progressively replace each section with Supabase-backed queries.

Tests:

- page renders without Supabase;
- active run cards show status, cost, and quality placeholders;
- approval queue separates draft/propose work from external side-effect work.

### Pass 5: Connector Execution Stubs

Goal: let the agent prepare real work products without unsafe external writes.

Created in this pass:

- implement read-only/local first adapters for `document.create`, `task.create`, `email.draft`, `spreadsheet.create`, and `ads.propose_change`;
- create `executeConnectorAction` with policy check, approval check, credential checks, and dry-run support;
- side effects that change external state must return an approval requirement until credentials and approval are present;
- return connector audit event payloads for proposed/drafted/denied/integration-required actions.

Remaining deliverables:

- persist connector audit events in a first-class table;
- implement live external adapters behind approvals.

Tests:

- `email.draft` is allowed as draft/propose without external credentials;
- `email.send` is blocked without approval;
- external write connectors produce an approval diff and do not execute by default.

### Pass 6: Capability Migration Workbench

Goal: migrate the full 73 seeded skills and broader 270+ library surface into agent-ready capabilities without rewriting every skill.

Created in this pass:

- add coverage filters by missing output contract, missing axioms, missing language games, missing side effects, missing examples, and default tier;
- add readiness scoring, recommendations, and CSV export;

Remaining deliverables:

- add family/domain grouping;
- add recommended metadata generated from `capabilityFromLibrarySkill`;
- create an editor path that writes metadata back to `skill_registry` when database mode is available;

Tests:

- coverage includes library skills without manual capability descriptors;
- generated recommendations preserve source skill ids;
- side-effect fields default to read-only unless declared.

## Skill And Capability Roadmap

Prioritize small typed capabilities over whole UI skills. The agent should compose the best part of each skill rather than call large monolithic prompts blindly.

Highest-value capability families:

- business intake and planning: goal clarification, stakeholder identification, deadline extraction, constraint extraction, project decomposition;
- research and intelligence: account intelligence, competitor research, market scan, regulatory scan, customer voice synthesis;
- financial and operating analysis: budget review, forecast variance, unit economics, scenario modeling, ROI narrative;
- sales and customer success: account pursuit, discovery prep, objection handling, QBR prep, churn intervention, renewal and expansion planning;
- marketing and content operations: campaign strategy, editorial calendar, paid media audit, SEO/GEO analysis, landing page critique, email sequence generation;
- legal, compliance, and governance: contract issue spotting, RFP compliance matrix, AI risk assessment, data handling classification, policy comparison;
- people and recruiting: job intake, candidate screening rubric, interview plan, performance review synthesis, staffing client update;
- deliverable renderers: executive memo, client email, board brief, QBR deck outline, spreadsheet model spec, dashboard spec, task plan;
- quality/evaluator skills: factual consistency check, contract completeness check, tone/audience fit check, risk/compliance check, source coverage check.

The first 12 agent tools remain the right anchor set:

- `extract-business-goal`;
- `classify-business-context`;
- `retrieve-entity-memory`;
- `summarize-source-material`;
- `identify-risks-and-open-questions`;
- `prioritize-actions`;
- `build-client-brief`;
- `build-executive-brief`;
- `build-email-draft`;
- `build-work-plan`;
- `evaluate-output-contract`;
- `persist-business-facts`.

## Current Verification Notes

The latest focused verification after the capability-roadmap pass passed:

- `tests/lib/agenticGoalPlanner.test.ts`;
- `tests/lib/agenticToolRegistry.test.ts`;
- `tests/lib/crmAgentTools.test.ts`.

Run the full suite after each broad capability pass because registry changes affect planning, routing, coverage, and admin dashboard assumptions.

## Immediate Implementation Checklist

1. Keep fixing validation blockers that affect the transition from skills to capabilities.
2. Move quality-event capture into the runner retry loop.
3. Add actual provider usage extraction.
4. Add planner readiness and revision.
5. Add memory retrieval into Goal Console.
6. Add Business Agent Console route.
7. Add connector execution stubs behind policy and approval.
8. Expand capability metadata coverage family by family.
9. Convert the highest-value planned roadmap capabilities into executable internal tools or connector-backed tools, starting with research/account intelligence, sales discovery prep, campaign strategy, and deliverable renderers.

The guiding rule: every new feature should make the agent more capable of taking a goal, choosing the right typed tools, routing each call economically, validating its work, and leaving durable business memory behind.
