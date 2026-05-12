# Agentic Business Agent Design Update

Last updated: 2026-04-29

## Purpose

This document captures the current implementation state after the routing,
costing, capability registry, goal-planning, and CRM prospecting work. The
product direction is no longer "pick a skill page and run a prompt." The
direction is a business agent that receives a goal, selects typed tools,
routes model calls by cost and quality, executes a dependency graph, validates
outputs, asks for approval before side effects, persists memory, and renders a
professional business artifact.

## Current Application State

SkillEngine is a React, TypeScript, Vite, Tailwind, Supabase application. It
uses `HashRouter` and still supports the original skill-library, workflow,
client portal, account, pricing, and admin surfaces.

The agentic layer is isolated under `lib/agentic` and the `agentic.*` database
schema. Current agentic surfaces include:

- Agentic home, workflow comparison, runner, side-by-side, control tower,
  entities, approvals, agents, goal console, capability coverage, and cost
  explorer pages.
- Deterministic model pricing and cost estimation in
  `lib/agentic/costing.ts`.
- Deterministic model routing in `lib/agentic/orchestrator.ts`.
- DAG execution and provider-scoped runtime routing in
  `lib/agentic/runner.ts`.
- Optional quality gate, retry, and escalation mechanics through
  `lib/agentic/replanner.ts`.
- Output contracts and hand-authored DAGs in `lib/agentic/contracts`.
- Tool capability registry and skill adapters in `lib/agentic/toolRegistry.ts`.
- Goal intake, capability retrieval, dynamic DAG construction, Russellian
  composition checks, and Wittgensteinian context checks in
  `lib/agentic/goalPlanner.ts`.
- Persistence, cost attribution fields, quality telemetry, approvals, and
  entity memory helpers in the agentic persistence layer.
- Provider usage normalization and actual-cost attribution are now wired into
  routed skill calls when provider wrappers expose token usage.
- Goal plan readiness and memory retrieval now run before execution in the
  Goal Console.
- A first Business Agent Console shell exists at `/agentic/console`.
- Connector execution stubs can create local-first draft artifacts while
  preserving approval boundaries for external writes.
- Capability Coverage now acts as a migration workbench with filters,
  readiness scoring, recommendations, and CSV export.

The Clients CRM is now the first production-shaped business-agent domain:

- `components/ProspectingPanel.tsx` supports local lookup, enrichment,
  duplicate-aware preview, and bulk import.
- `lib/localBusinessLookup.ts` normalizes provider records, dedupes them,
  scores automation-campaign fit, and builds import previews.
- `lib/crmAgentTools.ts` executes agent-callable CRM tools.
- `supabase/functions/local-business-lookup` is the Google Places proxy for
  production lookup without exposing provider keys in the browser.
- `supabase/migrations/20260429_client_lookup_provenance.sql` adds first-class
  lookup provenance fields to Client records.

## Agentic Capability Architecture

The system should prefer small typed capabilities over large UI skills. A
`ToolCapability` describes:

- what business goal verbs it serves;
- which domains and language games it belongs to;
- what structured input it accepts;
- what output contract it promises;
- what model tier and provider constraints apply;
- whether it is reversible, intermediate, or client-facing;
- whether it has side effects and therefore requires approval;
- which Russellian axioms and type level make it composable.

The best mental model is:

```text
Goal + context
  -> capability search
  -> dynamic DAG
  -> formal composition validation
  -> contextual fit validation
  -> model routing or deterministic tool execution
  -> structured output extraction
  -> quality evaluation and retry/escalation
  -> persistence, memory, and rendered deliverable
```

This means existing skills are useful raw material, but they are not the final
agent interface. The agent should call the narrowest productive unit of work:
lookup, extract, score, enrich, compare, draft, render, persist, or request
approval.

## CRM Prospecting Capability Set

The CRM prospecting flow is now decomposed into composable tools:

- `crm.find-local-businesses`: external-read lookup by business type, location,
  max results, and filters.
- `crm.score-automation-campaign-fit`: pure scoring of a prospect or local
  business record.
- `crm.enrich-local-prospects`: pure enrichment into pain points, use cases,
  savings, and recommended SkillEngine capabilities.
- `crm.extract-website-contact-info`: external-read extraction of public
  emails, phones, contact/about/team URLs, and leadership-name candidates.
- `crm.import-client-prospects`: database-write import of approved enriched
  prospects into Clients, with duplicate preview.
- `crm.build-local-campaign-worklist`: pure campaign sequencing and priority
  planning.
- `crm.draft-local-automation-outreach`: pure renderer for email, LinkedIn
  note, and call opener.

The intended dynamic DAG for a goal like "Find 40 local law firms around
Milwaukee and draft a two-week automation outreach campaign" is:

```text
find local businesses
  -> score fit
  -> enrich prospects
  -> extract public contact paths
  -> import approved prospects
  -> build campaign worklist
  -> draft outreach
  -> persist facts
  -> queue approvals only for send/task side effects
```

## Current Live Boundaries

Implemented in code and covered by tests:

- local lookup normalization and dedupe;
- duplicate-aware Client import preview;
- CRM prospect enrichment and campaign scoring;
- executable CRM capability dispatcher;
- runner bridge for supported CRM internal/renderer tools;
- planner selection for local prospecting goals;
- inferred local prospecting inputs such as business type, location, and max
  result count from goal text;
- provenance fields in TypeScript Client types and Supabase mapping;
- attempt-level quality telemetry and normalized provider usage plumbing;
- memory ranking/retrieval for goal planning;
- connector draft execution stubs;
- design docs and tests for the CRM capability set.

Not live until deployment/install steps are completed:

- hosted database columns for routing/cost, quality events, and Client lookup
  provenance;
- hosted `local-business-lookup` Edge Function;
- Google Places production lookup through Supabase;
- `agentic` schema reads through PostgREST if the schema is not exposed;
- production website-contact crawling with server-side robots/rate-limit
  controls;
- persisted campaign/worklist entities.

## Error Handling Design

Errors should be explicit and recoverable:

- missing lookup inputs block lookup before provider calls;
- missing Supabase config falls back to demo/local paths where possible;
- missing `GOOGLE_PLACES_API_KEY` returns a provider setup error;
- provider failures surface provider status and message;
- empty lookup results keep the user in the lookup form with broader-query
  guidance;
- missing emails are not fabricated;
- exact duplicates are skipped automatically, while likely duplicates are
  marked for review;
- database-write and external-send actions remain approval-boundary events;
- routing failures should explain the hard constraint or budget cap.

## Novel Design Insights

The important shift is that CRM, skills, and workflows are not separate
products. They are different surfaces over the same agent substrate.

- A CRM record is an entity in memory, not just a row in a table.
- A skill is a capability source, not necessarily the unit the agent should
  call.
- A workflow is a reusable graph pattern, not the only allowed graph.
- A renderer is a separate role from an analyzer.
- Cost control comes from routing each task, not from choosing one cheap model
  for the whole system.
- Quality control comes from output contracts, retry/escalation, and approval
  boundaries, not from hoping a single large prompt is good enough.

## Near-Term Roadmap

1. Apply the install/deploy steps in `NEXT_INSTALL_STEPS.md`.
2. Pre-create agent run rows for Goal Console executions that need live
   attempt-level quality persistence.
3. Move website contact extraction to a server-side Edge Function.
4. Add durable CRM campaign tables: campaign, campaign member, outreach step,
   and suppression list.
5. Persist connector audit events and approval diffs.
6. Add connector-backed document, task, email draft, calendar, CRM update,
   spreadsheet, ads proposal, and email-send tools behind policy/approval.
7. Replace Business Agent Console demo state with persisted run, approval,
   memory, and dashboard reads.
8. Add database-backed capability editing from `skill_registry`.
