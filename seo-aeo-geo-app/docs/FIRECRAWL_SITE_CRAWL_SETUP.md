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
- Store markdown and raw HTML artifacts only

If the bucket is missing, the crawl still completes, but markdown/raw HTML artifact uploads are skipped and the app logs a warning.

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
