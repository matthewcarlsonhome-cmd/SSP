# Firecrawl Site Crawl Setup

This app uses Firecrawl as the production crawl engine for the SEO/AEO/GEO audit and as the site evidence layer for LLM Visibility Audit enrichment. The app calls Firecrawl directly from server-side Next.js code. The Firecrawl MCP server is optional and should only be used by internal operators or developers while researching/debugging.

## What The Integration Adds

- Maps the submitted client website before crawling.
- Selects priority URLs by page type and audit profile.
- Runs a budgeted crawl with markdown, HTML, raw HTML, and links.
- Stores large crawl artifacts in Supabase Storage.
- Parses title tags, meta descriptions, canonicals, robots meta, headings, links, images, JSON-LD schema, NAP, CTAs, FAQs, service signals, and location signals.
- Builds a client voice profile for report writing.
- Creates SEO/AEO/GEO findings that feed the final report and fix plan.
- Updates the client workbench run status and combined recommendation backlog.
- Exports a design handoff ZIP with raw HTML, cleaned HTML, markdown, schema JSON, CSS artifacts, metadata, and Claude Design recreation briefs.
- Persists standalone `/site-crawl` runs by creating or reusing a lightweight crawl-only client record, so stored pages are available without launching a full SEO audit.
- Keeps LLM visibility prompts clean: crawl data is used for scoring, report writing, hallucination checks, and remediation, not injected into buyer prompts.

## 1. Add Environment Variables

Add these to `.env.local` and to the hosting environment:

```bash
FIRECRAWL_API_KEY=fc-your-firecrawl-api-key
FIRECRAWL_API_URL=https://api.firecrawl.dev/v2
```

Important: do not prefix the key with `NEXT_PUBLIC_`. The Firecrawl key must stay server-side.

## 2. Run The Database Migration

Apply:

```bash
supabase db push
```

or run the SQL in:

```text
supabase/migrations/005_firecrawl_site_crawl.sql
```

For the client dashboard integration, also apply:

```text
supabase/migrations/008_client_workbench_dashboard.sql
```

The migration creates:

- `client_site_crawl`
- `client_site_page`
- `client_schema_item`
- `client_voice_profile`
- `seo_geo_finding`

The tables use RLS policies scoped through the existing `clients.organization_id -> users.organization_id` relationship. Server-side jobs use the Supabase service role client.

## 3. Create The Storage Bucket

Create a private Supabase Storage bucket named:

```text
site-crawl-artifacts
```

Recommended settings:

- Private bucket
- No public uploads
- Store markdown, cleaned HTML, raw HTML, and derived design artifacts

If the bucket is missing, the crawl still completes, but markdown/HTML artifact uploads are skipped and the app logs a warning.

## 4. Audit Profiles And Crawl Budgets

The app exposes these site crawl profiles on the new audit form:

| Profile | Limit | Depth | Typical Use |
| --- | ---: | ---: | --- |
| Free Snapshot | 10 pages | 1 | Lead magnet or quick diagnostic |
| Standard Audit | 50 pages | 2 | Paid local SEO/AEO/GEO audit |
| Full Audit | 150 pages | 3 | Deep remediation planning |

Every run maps first, previews selected pages and estimated credits, then crawls with the selected budget.

## 5. UI Workflow

1. Open New Audit.
2. Enter or auto-populate the client website.
3. Leave "Site Crawl Evidence Layer" enabled.
4. Select the audit profile.
5. Click "Preview Crawl" to see discovered URLs, selected priority URLs, and estimated credits.
6. Start the audit.
7. Open the completed report and select the "Site Crawl" tab to review:
   - Captured pages
   - Discovered URLs
   - Schema items
   - Credits used
   - Client voice profile
   - SEO/AEO/GEO findings
   - Page inventory

Standalone client crawl:

1. Open a client profile at `/clients/[id]`.
2. Click `Run Firecrawl`.
3. The app runs a client-bound crawl through `/api/clients/[id]/site-crawl/run`.
4. The crawl artifacts, voice profile, schema inventory, findings, run status, and recommended fixes appear in the Client Results Dashboard.
5. Click `Design ZIP` to download:
   - `raw.html`
   - `clean.html`
   - `page.md`
   - page-level `schema.json`
   - combined `all-schema.json`
   - inline CSS blocks
   - fetched linked CSS files when reachable
   - `metadata.json`
   - `design-brief.md` for Claude Design recreation
6. Click `View Stored Pages` to open `/clients/[id]/crawl`, where each persisted page can be inspected by Markdown, clean HTML, raw HTML, schema, and metadata tabs.

Standalone site crawl without first creating a client:

1. Open `/site-crawl`.
2. Enter any site URL and choose Free Snapshot, Standard, or Full Audit.
3. Click `Run Crawl`.
4. The app creates or reuses a lightweight crawl-only client record for storage, but no SEO audit job is created.
5. Click `Stored Pages` after the run or use the `Recent Stored Crawls` panel.
6. Open `/site-crawl/stored/[crawlId]` to inspect every stored page by Markdown, clean HTML, raw HTML, schema, and metadata.
7. Download the Design ZIP from the same stored crawl page when you need raw HTML/CSS/schema/markdown for Claude Design recreation.

The design ZIP is served from:

```text
GET /api/clients/[id]/site-crawl/download?crawlId=<crawl_id>
```

Per-page artifacts are served from:

```text
GET /api/clients/[id]/site-crawl/pages/[pageId]
```

Standalone stored crawls are listed and served from:

```text
GET /api/site-crawl/crawls
GET /api/site-crawl/crawls/[crawlId]
GET /api/site-crawl/crawls/[crawlId]/pages/[pageId]
```

## 6. How It Feeds Existing Audit Agents

The pipeline now tries this order:

1. Firecrawl site evidence layer.
2. Lightweight HTML fetch fallback if Firecrawl is not configured or fails.
3. Agent 1 consumes the evidence as factual crawl context for SEO/AEO/GEO analysis.
4. Later agents use that analysis for competitor comparison, technical findings, roadmaps, and the formatted report.

For LLM Visibility Audit work, keep buyer prompts independent. Use crawl evidence only after the LLM responses return:

- Generate cleaner question packs from real services and locations.
- Check whether LLM citations point to real client pages.
- Flag hallucinated services or wrong business facts.
- Explain why the business is absent from AI recommendations.
- Build a remediation plan around schema, service pages, local pages, FAQs, reviews, GBP, citations, and re-audits.

## 7. MCP Guidance

Use the Firecrawl MCP server only for internal operator/developer workflows, such as:

- Manually researching a strange client website.
- Debugging a crawl edge case.
- Asking an agent to inspect a page before changing code.

Do not make MCP a production runtime dependency. The production app should continue using direct server-side Firecrawl API calls so jobs are reliable, observable, testable, and deployable.

## 8. Security Notes

- Keep `FIRECRAWL_API_KEY` server-side only.
- Store large markdown/raw HTML in Storage, not Postgres.
- Respect robots.txt unless the client has explicitly approved a crawl exception.
- If adding Firecrawl webhooks later, verify webhook HMAC signatures before trusting status updates.
- Do not inject crawl evidence into live LLM visibility buyer prompts; that biases the visibility test.

## 9. Future Design Artifacts

Firecrawl can also return screenshots, image lists, and branding data. The current production crawl stores raw HTML, cleaned HTML, markdown, links, schema, and parsed page signals. If deeper visual recreation becomes a regular workflow, add a dedicated design-capture profile that requests Firecrawl `screenshot`, `images`, and `branding` formats and stores those URLs/objects with the page artifacts.
