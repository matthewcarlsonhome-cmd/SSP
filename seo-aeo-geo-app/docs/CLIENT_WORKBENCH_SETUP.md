# Client Workbench Setup

The Client Workbench is the shared reporting layer for the SSP platform. It connects Firecrawl, SEO/AEO/GEO, LLM Visibility, and AIR into one client dashboard.

## What It Adds

- A client-level results dashboard at `/clients/[id]`.
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
- A page artifact endpoint at `/api/clients/[id]/site-crawl/pages/[pageId]`.
- A client-bound Firecrawl design export at `/api/clients/[id]/site-crawl/download`.
- A dashboard aggregation endpoint at `/api/clients/[id]/workbench`.

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
```

## How Firecrawl Context Is Used

Firecrawl data is safe to use as site evidence for SEO/AEO/GEO and reporting. It can also be used after LLM responses return to verify citations, hallucinations, missing service/location coverage, and root causes.

Do not inject Firecrawl evidence into the buyer-intent prompts sent to ChatGPT, Claude, Gemini, or Perplexity. Those prompts must remain clean, stateless, and unbiased.

## Operator Workflow

1. Open a client at `/clients/[id]`.
2. Review the four tool status cards.
3. Click `Run Firecrawl` to capture a standalone crawl for the client.
4. Click `Design ZIP` when you need raw HTML/CSS/schema/markdown for Claude Design recreation.
5. Click `View Stored Pages` to inspect each persisted page's markdown, clean HTML, raw HTML, schema, and metadata.
6. Run SEO/AEO/GEO, LLM Visibility, or AIR from their normal workspaces.
7. Return to `/clients/[id]` to see the updated evidence, scores, and combined action plan.

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

The standalone `/site-crawl` workspace is an inspection tool. It returns the crawl summary to the browser but does not attach the crawl to a client. To persist and view pages later, run Firecrawl from `/clients/[id]`.

## Implementation Notes

- `lib/client-workbench.ts` is the shared aggregation and persistence layer.
- `client_tool_runs.source_table` and `source_id` preserve the originating record for drill-downs.
- `client_recommendations` is intentionally source-agnostic so the dashboard can compare actions from all modules.
- The dashboard synthesizes status from older records when no `client_tool_runs` row exists yet, so historical clients are still useful after applying the migration.
