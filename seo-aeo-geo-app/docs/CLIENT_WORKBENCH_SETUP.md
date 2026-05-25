# Client Workbench Setup

The Client Workbench is the shared reporting layer for the SSP platform. It connects Firecrawl, SEO/AEO/GEO, LLM Visibility, and AIR into one client dashboard.

## What It Adds

- A client-level results dashboard at `/clients/[id]`.
- A printable integrated client report at `/clients/[id]/report`.
- A stored crawl browser at `/clients/[id]/crawl`.
- Cross-tool run progress for:
  - Firecrawl Site Crawl
  - SEO/AEO/GEO Audit
  - LLM Visibility Audit
  - AIR Audit
- A combined optimization backlog sourced from:
  - Firecrawl deterministic site findings
  - SEO/AEO/GEO page and roadmap recommendations
  - LLM Visibility action plans
  - AIR Snapshot quick wins
- A client-bound Firecrawl endpoint at `/api/clients/[id]/site-crawl/run`.
- A standalone persisted Firecrawl endpoint at `/api/site-crawl/run` that creates or reuses a lightweight crawl-only client record.
- A standalone stored crawl browser at `/site-crawl/stored/[crawlId]`.
- A page artifact endpoint at `/api/clients/[id]/site-crawl/pages/[pageId]`.
- A generic page artifact endpoint at `/api/site-crawl/crawls/[crawlId]/pages/[pageId]`.
- A client-bound Firecrawl design export at `/api/clients/[id]/site-crawl/download`.
- A dashboard aggregation endpoint at `/api/clients/[id]/workbench`.
- A deterministic `workbench.executiveReport` object with integrated score, key insights, module summaries, evidence inventory, and top actions.

## Database Install

Run the new migration after the existing migrations:

```text
supabase/migrations/008_client_workbench_dashboard.sql
```

It creates:

- `client_audit_cycles`
- `client_tool_runs`
- `client_recommendations`

All three tables are organization-scoped through RLS using the existing `users.organization_id` pattern.

## Render Environment Variables

No new secrets are required for the workbench itself. It reads from existing tables and uses existing server-side keys.

Required for full functionality:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
PERPLEXITY_API_KEY=

FIRECRAWL_API_KEY=
FIRECRAWL_API_URL=https://api.firecrawl.dev/v2
NEXT_PUBLIC_APP_URL=
```

## Data Flow

```text
Client
  -> Firecrawl crawl
      -> client_site_crawl / client_site_page / client_schema_item / client_voice_profile / seo_geo_finding
      -> client_tool_runs + client_recommendations
  -> SEO/AEO/GEO pipeline
      -> audit_jobs / page_audits / link_opportunities / citation_tasks
      -> client_tool_runs + client_recommendations
  -> LLM Visibility audit
      -> llm_visibility_audits / llm_visibility_runs
      -> client_tool_runs + client_recommendations
  -> AIR audit
      -> air_audits / air_audit_scores / air_audit_deliverables
      -> client_tool_runs + client_recommendations
  -> /api/clients/[id]/workbench
      -> /clients/[id] dashboard
      -> /clients/[id]/report integrated report
```

## How Firecrawl Context Is Used

Firecrawl data is safe to use as site evidence for SEO/AEO/GEO and reporting. It can also be used after LLM responses return to verify citations, hallucinations, missing service/location coverage, and root causes.

Do not inject Firecrawl evidence into the buyer-intent prompts sent to ChatGPT, Claude, Gemini, or Perplexity. Those prompts must remain clean, stateless, and unbiased.

## Operator Workflow

Client-bound workflow:

1. Open a client at `/clients/[id]`.
2. Review the four tool status cards.
3. Click `Run Firecrawl` to capture a crawl for that client.
4. Click `Design ZIP` when you need raw HTML/CSS/schema/markdown for Claude Design recreation.
5. Click `View Stored Pages` to inspect each persisted page's markdown, clean HTML, raw HTML, schema, and metadata.
6. Run SEO/AEO/GEO, LLM Visibility, or AIR from their normal workspaces.
7. Return to `/clients/[id]` to see the updated evidence, scores, and combined action plan.
8. Open `/clients/[id]/report` for the executive-level client report and use `Print / Save PDF` for client-ready sharing.

Standalone crawl workflow:

1. Open `/site-crawl`.
2. Enter any website URL and choose a crawl profile.
3. Preview the map if desired, then click `Run Crawl`.
4. The app creates or reuses a lightweight crawl-only client record for that URL. This is only to satisfy the existing client-scoped crawl schema; no SEO audit is created.
5. Use the post-run `Stored Pages` button or the `Recent Stored Crawls` panel to open `/site-crawl/stored/[crawlId]`.
6. Inspect page markdown, clean HTML, raw HTML, schema, metadata, and download the Design ZIP directly from the standalone crawl workspace.

## Design Export Contents

The Firecrawl design ZIP includes:

- `crawl-summary.json`
- `all-pages.json`
- `all-schema.json`
- Per-page `metadata.json`
- Per-page `schema.json`
- Per-page `page.md`
- Per-page `raw.html`
- Per-page `clean.html` for new crawls
- Per-page `styles/inline.css`
- Per-page linked stylesheet URLs and fetched CSS files when reachable
- Per-page `design-brief.md` for Claude Design

## Where Crawl Data Lives

- Crawl metadata: `client_site_crawl`
- Page inventory and extracted signals: `client_site_page`
- JSON-LD schema rows: `client_schema_item`
- Voice profile: `client_voice_profile`
- Crawl findings: `seo_geo_finding`
- Markdown/raw HTML/clean HTML artifacts: private Supabase Storage bucket `site-crawl-artifacts`

The standalone `/site-crawl` workspace now persists crawls too. It stores artifacts in the same `client_site_*` tables by creating or reusing a lightweight crawl-only client record for the submitted URL. This keeps one storage model while removing the need to start a full client audit just to inspect captured pages.

## Integrated Client Report

The workbench API now returns `workbench.executiveReport`, generated server-side from stored module data. It does not require a new table because it is a read model over:

- latest Firecrawl crawl and findings
- latest SEO/AEO/GEO job
- latest LLM Visibility audit and runs
- latest AIR audit/deliverable
- combined `client_recommendations`

The report route `/clients/[id]/report` renders:

- integrated executive score
- readiness label
- cross-module metrics
- key insights
- module summaries
- evidence inventory
- grouped next-step action plan
- prioritized next actions

The route is intentionally tied to the client record, not to one audit job, so the report remains useful as more modules are run over time.

Recommendation behavior:

- Stored `client_recommendations` remain the first source of truth when modules write recommendations.
- The workbench also derives recommendations directly from raw audit evidence so the report is never empty when data exists.
- Derived next steps include site updates, marketing ideas, competitor gap actions, outreach/citation ideas, and operations/AIR steps.
- Competitor recommendations use `client_competitors` plus latest SEO competitor analysis when available.

## Implementation Notes

- `lib/client-workbench.ts` is the shared aggregation and persistence layer.
- `client_tool_runs.source_table` and `source_id` preserve the originating record for drill-downs.
- `client_recommendations` is intentionally source-agnostic so the dashboard can compare actions from all modules.
- The dashboard synthesizes status from older records when no `client_tool_runs` row exists yet, so historical clients are still useful after applying the migration.
