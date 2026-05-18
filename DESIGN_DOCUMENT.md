# SSP AI Visibility and Readiness Workbench Design Document

Version: 2026-05-18
Status: living product, service, and implementation design for the SSP local-business audit platform.

## 1. Executive Summary

SSP is now a three-module workbench for local-business AI visibility, search readiness, and operational AI readiness. The platform helps an operator take any local business website, collect defensible evidence, test what AI systems say, explain why the results are happening, and turn the findings into a paid remediation or implementation offer.

The three modules are:

1. SEO/AEO/GEO Audit
   - Measures whether the client website is crawlable, structured, schema-ready, answer-ready, locally credible, and useful as source evidence for search and AI systems.
   - Produces page recommendations, schema code, FAQ/answer blocks, citation tasks, local content opportunities, roadmap items, and exportable reports.

2. LLM Visibility Audit
   - Measures whether ChatGPT, Claude, Gemini, Perplexity, and manual AI Overview-style captures mention, recommend, cite, or ignore the business for buyer-intent local questions.
   - Stores exact prompts, platforms, timestamps, raw answers, citations, scores, QA status, caveats, and report/action-plan context.

3. AIR Audit
   - Measures whether the business is operationally ready to benefit from AI.
   - Scores Team Readiness, Data Foundation, Workflow Maturity, Stack Coherence, and Opportunity Density into a 0-100 AIR Score.
   - Produces an AIR Snapshot now, with the full AIR Audit, Sprint, Operations, and re-score workflows staged as the next implementation layers.

Together, the platform answers three business questions:

```text
Can search engines and AI systems understand my business?
Do AI answer engines actually recommend me when buyers ask who to hire?
Is my business operationally ready to benefit from AI implementation?
```

The service motion should be:

```text
Free or low-cost Snapshot
  -> paid full SEO/AEO/GEO + LLM Visibility Audit
  -> AIR Audit when operational readiness matters
  -> remediation sprint, AI transition sprint, or managed operations
```

The newest implementation layer is the Client Results Dashboard plus a persisted standalone Site Crawl workspace. Each client now has a shared workbench view that stores run progress and recommendations across Firecrawl, SEO/AEO/GEO, LLM Visibility, and AIR. Operators can also crawl any website from `/site-crawl`, inspect stored pages and artifacts, and download a design handoff ZIP without starting a full SEO audit first. This makes the platform useful as an ongoing reporting and account-management tool, not only a set of separate audit pages.

## 2. Product Positioning

SSP should be positioned as an evidence-based AI visibility and readiness audit service for local businesses, not as a generic AI tool or an SEO report generator.

Primary promise:

```text
Find out whether search engines and AI tools understand, trust, and recommend your business - and what to fix next.
```

Primary operator outcome:

```text
Complete a credible local-business visibility and readiness snapshot quickly, then use durable evidence to sell remediation, AI readiness work, or ongoing operations.
```

Primary client outcome:

```text
A plain-English report showing what AI/search systems see, where the business appears or disappears, who appears instead, why it is happening, and what should be fixed first.
```

Target users:

- SSP operators running audits for Madison and Dane County local businesses.
- Local consultants and agencies selling SEO, AEO, GEO, AI visibility, and AI operations services.
- Local business owners receiving scorecards, reports, fix plans, and follow-up offers.

## 3. Module Map

### SEO/AEO/GEO Audit

Purpose:

- Explain the website and local-search foundation.
- Diagnose whether the business has enough structured, crawlable, answer-ready evidence to be understood by search and AI systems.

Primary inputs:

- Website URL and client brief.
- Firecrawl site map and crawl output.
- Uploaded files or pasted business context.
- Competitors, keywords, geography, GBP details, and pain points.

Core outputs:

- Site health score.
- Page-level SEO/AEO/GEO recommendations.
- Title tags, meta descriptions, H1/H2/H3 guidance.
- FAQ and answer-block drafts.
- JSON-LD schema package.
- Citation tasks.
- Link/source opportunities.
- Technical issues.
- Roadmap and measurement framework.
- Formatted report.

Current implementation:

- New Audit form at `/audits/new`.
- Audit job API at `/api/jobs`.
- Pipeline in `lib/agents/pipeline.ts`.
- Firecrawl evidence layer in `lib/site-crawl/firecrawl-ingest.ts`.
- SEO run progress and selected recommendations now write into `client_tool_runs` and `client_recommendations`.
- Report viewer at `/audits/[id]/report`.
- Downloads: Markdown, DOCX, PDF, roadmap CSV, link CSV, citation CSV, schema ZIP.

### LLM Visibility Audit

Purpose:

- Measure actual AI-answer visibility.
- Show whether AI platforms recommend the client, cite the client, recommend competitors instead, or omit local business names entirely.

Primary inputs:

- Business profile.
- Approved competitors.
- Industry pack.
- Audit profile.
- Query category selection.
- Server-side LLM provider keys.
- Manual captures for browser-only AI results.

Core outputs:

- Exact query evidence by platform.
- Raw LLM response.
- Citations/source URLs.
- Manual screenshots/evidence URLs.
- 0-5 workbook score.
- 0-100 AI Visibility Score.
- Share of voice.
- QA status: unreviewed, needs review, approved, excluded, high-impact miss.
- Report draft.
- Action plan with owners, hours, service lines, due dates, and estimated price anchors.
- DOCX and PDF client exports.
- Shareable lead scorecard.

Current implementation:

- Workbench at `/llm-visibility-audit`.
- Provider status route at `/api/llm-visibility/provider-status`.
- Provider execution route at `/api/llm-visibility/run`.
- Durable audit persistence route at `/api/llm-visibility/audits`.
- Durable lead capture route at `/api/llm-visibility/leads`.
- Database migration `006_llm_visibility_persistence_and_harness.sql`.
- Persisted LLM audits now update the unified client workbench run status and write LLM action-plan items into the combined optimization backlog.

Important implementation rule:

- LLM Visibility buyer prompts must stay clean. Do not inject Firecrawl, SEO, client notes, or score context into the provider prompts. Each query should be a fresh stateless API request with no app-side chat history. Use crawl and SEO evidence only after the response returns.

### AIR Audit

Purpose:

- Measure whether the client business is ready to benefit from AI infrastructure and automation.
- Bridge the gap between "AI visibility" and "AI operations."

AIR domains:

- Team Readiness.
- Data Foundation.
- Workflow Maturity.
- Stack Coherence.
- Opportunity Density.

AIR tiers:

- `air_snapshot`: free public-data Snapshot.
- `air_audit`: paid full Audit with interviews, CRM review, workflow mapping, and roadmap.
- `air_foundation_sprint`: 60-day data/workflow foundation engagement.
- `air_transition_sprint`: 90-day implementation engagement.
- `air_operations`: ongoing managed AI operations and quarterly re-scoring.

Current implementation:

- Database migration `007_air_audit_module.sql`.
- AIR routes:
  - `/air-audits`
  - `/air-audits/new`
  - `/air-audits/[id]`
  - `/air-audits/[id]/intake`
  - `/air-audits/[id]/scoring`
  - `/air-audits/[id]/deliverable`
  - `/air-audits/[id]/rescore`
  - `/air-audits/methodology`
  - `/public-air/[slug]`
- AIR API routes:
  - `/api/air/audits`
  - `/api/air/audits/[id]`
  - `/api/air/audits/[id]/score`
  - `/api/air/audits/[id]/generate-deliverable`
  - `/api/air/audits/[id]/publish`
  - `/api/air/public/[slug]`
- AIR code:
  - `lib/air/types.ts`
  - `lib/air/config.ts`
  - `lib/air/scoring/*`
  - `lib/air/copy/*`
  - `lib/air/deliverables/snapshot.ts`
  - `lib/air/server.ts`
  - `components/air/*`
- Test coverage:
  - `__tests__/air-scoring.test.ts`
  - fixtures in `lib/air/scoring/fixtures.ts`
- AIR scoring and Snapshot generation now update the unified client workbench and add AIR quick wins to the combined optimization backlog.

Current AIR limitation:

- Snapshot public-data ingestion is scaffolded and deterministic. The next implementation pass should replace stub signals with live Firecrawl, GBP, reviews, ads, and tech-stack adapters.

## 4. How The Three Modules Support Each Other

The modules should not collapse into one score. They measure different truths:

```text
SEO/AEO/GEO = Can machines understand and cite the site?
LLM Visibility = Do AI answer engines recommend the business right now?
AIR = Can the business operationally absorb and profit from AI work?
```

Their value comes from combining them in the report and sales motion:

```text
Firecrawl site evidence
  -> feeds SEO/AEO/GEO diagnosis
  -> informs LLM report root-cause analysis
  -> supplies public evidence for AIR Snapshot scoring

SEO/AEO/GEO findings
  -> explain why LLM visibility is weak
  -> identify schema, content, technical, citation, GBP, and local-page fixes
  -> produce implementation assets

LLM Visibility evidence
  -> creates urgency with real AI answers
  -> identifies who AI recommends instead
  -> validates whether search/entity work is translating into AI visibility

AIR scoring
  -> identifies whether the client is ready for AI operations
  -> supports higher-ticket offers beyond visibility remediation
  -> tells the operator whether to sell visibility fixes, foundation work, transition sprint, or ongoing operations

Client Results Dashboard
  -> stores which tools have run, their progress, their latest source records, and their key metrics
  -> brings Firecrawl findings, SEO fixes, LLM action-plan items, and AIR quick wins into one backlog
  -> gives the operator a single place to explain status, evidence, and next steps to a client
```

Recommended combined client story:

```text
1. AI tools are or are not recommending you.
2. Your website and local entity evidence explain much of why.
3. Your operational readiness determines which fixes will actually stick.
4. Here is the 30/60/90-day plan.
```

## 5. End-To-End Operator Workflow

The target workflow remains a 30-minute operator path for a first snapshot:

```text
1. Paste website URL.
2. Auto-fill business profile where possible.
3. Confirm business category, city, services, and competitors.
4. Select audit profile.
5. Preview Firecrawl site map and crawl budget when using SEO/AEO/GEO.
6. Run SEO/AEO/GEO diagnostic where appropriate.
7. Run clean LLM Visibility prompts across selected platforms.
8. Paste manual AI Overview or browser-only evidence.
9. Review evidence, scores, QA flags, and competitor share of voice.
10. Generate report draft, PDF/DOCX, action plan, and follow-up email.
11. If selling AI operations, create AIR Snapshot or AIR Audit.
12. For a crawl-only diagnostic, open `/site-crawl`, run Firecrawl, then inspect `/site-crawl/stored/[crawlId]` for stored pages and artifacts.
13. Open the client dashboard to review run status, evidence, results, and the combined optimization backlog.
```

The AIR workflow extends this:

```text
1. Create AIR Snapshot from `/air-audits/new`.
2. Public data is converted into initial AIR inputs.
3. `computeAirScore()` produces 20 sub-dimension scores and a composite band.
4. Snapshot deliverable is generated and can be published.
5. Full Audit tier will add CRM, tool inventory, interviews, workflows, and report samples.
```

## 6. Firecrawl Site Evidence Layer

Firecrawl is the production crawl engine. The deployed app should call Firecrawl API/SDK server-side. The Firecrawl MCP server is useful for internal developer/operator research but is not a production runtime dependency.

Current implementation:

- Server-side key: `FIRECRAWL_API_KEY`.
- Optional API URL: `FIRECRAWL_API_URL`.
- Preview endpoint: `/api/site-crawl/preview`.
- Standalone crawl workspace: `/site-crawl`.
- Standalone persisted crawl endpoint: `/api/site-crawl/run`.
- Standalone stored crawl list endpoint: `/api/site-crawl/crawls`.
- Standalone stored crawl browser: `/site-crawl/stored/[crawlId]`.
- Standalone per-page artifact endpoint: `/api/site-crawl/crawls/[crawlId]/pages/[pageId]`.
- Client-bound crawl endpoint: `/api/clients/[id]/site-crawl/run`.
- Stored crawl browser: `/clients/[id]/crawl`.
- Per-page artifact endpoint: `/api/clients/[id]/site-crawl/pages/[pageId]`.
- Client-bound design export endpoint: `/api/clients/[id]/site-crawl/download`.
- Pipeline integration: `runPipeline()` tries Firecrawl first and falls back to lightweight HTML fetch.
- Storage:
  - `client_site_crawl`
  - `client_site_page`
  - `client_schema_item`
  - `client_voice_profile`
  - `seo_geo_finding`
- Supabase Storage bucket `site-crawl-artifacts`
- Client dashboard aggregation through `/api/clients/[id]/workbench`.

Standalone persistence behavior:

- `/site-crawl` no longer returns only ephemeral browser output.
- A standalone run creates or reuses a lightweight crawl-only `clients` row for the submitted URL, then stores the crawl in the existing client-scoped Firecrawl tables.
- No SEO audit job is created for crawl-only usage.
- The recent stored-crawls panel on `/site-crawl` gives direct access to stored pages, raw artifacts, and design ZIP downloads.
- A future v2 may add dedicated standalone crawl tables if crawl-only records should be hidden from the client directory.

Data extracted deterministically:

- Title.
- Meta description.
- Canonical.
- Robots meta.
- Headings.
- Internal and external links.
- Images and alt text.
- JSON-LD schema.
- NAP signals.
- Service and location terms.
- FAQ blocks.
- CTA language.
- Client voice signals.
- Design handoff artifacts for Claude Design:
  - raw HTML,
  - cleaned HTML for new crawls,
  - markdown,
  - schema JSON,
  - metadata,
  - inline CSS,
  - linked CSS files when reachable,
  - Claude Design recreation brief.

Security boundary:

- Crawled content is untrusted.
- Firecrawl markdown, HTML, raw HTML, summaries, and extracted page copy must never override system, developer, prompt, scoring, or output-format instructions.
- This boundary is now stated in the Firecrawl prompt summary and Agent 1 system prompt.

LLM Visibility boundary:

- Do not put Firecrawl evidence into buyer prompts.
- Use Firecrawl after capture for:
  - query generation,
  - citation checks,
  - hallucination checks,
  - competitor/entity comparison,
  - "why this happened" report sections,
  - remediation planning.

AIR boundary:

- AIR Snapshot can use Firecrawl-derived public signals.
- Full AIR Audit should add private operational evidence before treating the score as sales-grade.

## 7. Provider Key And Render Configuration

LLM Visibility provider calls are now server-side.

The browser UI no longer stores or asks for ChatGPT, Claude, Gemini, or Perplexity API keys. The UI reads key availability from:

```text
GET /api/llm-visibility/provider-status
```

Actual provider calls run through:

```text
POST /api/llm-visibility/run
```

Required Render environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=       # GEMINI_API_KEY also supported
PERPLEXITY_API_KEY=

FIRECRAWL_API_KEY=
FIRECRAWL_API_URL=https://api.firecrawl.dev/v2

NEXT_PUBLIC_APP_URL=
STRIPE_SECRET_KEY=       # optional until billing is completed
STRIPE_WEBHOOK_SECRET=   # optional until billing is completed
```

Clean-query guarantee:

- Each LLM Visibility capture is a new stateless API request.
- The app does not create a multi-turn conversation or carry previous answer history between questions.
- Provider-side account state cannot be made fully anonymous through API calls, but the application itself is not adding chat history.

## 8. Data Model Summary

### Existing Core Tables

- `organizations`
- `users`
- `clients`
- `client_competitors`
- `client_keywords`
- `audit_jobs`
- `page_audits`
- `link_opportunities`
- `citation_tasks`
- `audit_logs`
- billing/user profile tables

### Firecrawl Tables

- `client_site_crawl`
- `client_site_page`
- `client_schema_item`
- `client_voice_profile`
- `seo_geo_finding`

Standalone `/site-crawl` runs use these same tables. Because `client_site_crawl` is client-scoped, the app creates or reuses a lightweight crawl-only client record for the URL. This avoids a second storage model while allowing page artifacts to be viewed without a full audit.

### Client Workbench Tables

Migration: `008_client_workbench_dashboard.sql`

- `client_audit_cycles`
- `client_tool_runs`
- `client_recommendations`

Purpose:

- Track per-client run status across Firecrawl, SEO/AEO/GEO, LLM Visibility, and AIR.
- Preserve the source table and source record for the latest run of each tool.
- Store a combined optimization backlog with source tool, priority, category, status, owner, estimated hours, estimated price, and fix recommendation.
- Support the client detail dashboard at `/clients/[id]` and the aggregation route at `/api/clients/[id]/workbench`.

### LLM Visibility Tables

Migration: `006_llm_visibility_persistence_and_harness.sql`

- `llm_visibility_audits`
- `llm_visibility_runs`
- `llm_visibility_leads`
- `llm_provider_keys`

Purpose:

- Move beyond localStorage by storing audit runs, raw evidence, report/action-plan state, and shareable scorecard leads durably.
- Maintain organization-level ownership.
- Preserve exact prompts and responses for QA and client trust.

### Architecture Harness Tables

Migration: `006_llm_visibility_persistence_and_harness.sql`

- `architecture_specs`
- `architecture_reviews`
- `release_gates`
- `runtime_audit_events`

Purpose:

- Create a lightweight internal "Bob" system:
  - spec before code,
  - review before merge,
  - release gate before deploy,
  - runtime audit after ship.

### AIR Tables

Migration: `007_air_audit_module.sql`

- `air_tier_configs`
- `air_audits`
- `air_audit_inputs`
- `air_audit_scores`
- `air_audit_observations`
- `air_audit_quick_wins`
- `air_audit_roadmap_items`
- `air_audit_opportunity_matrix`
- `air_audit_tool_inventory`
- `air_audit_workflows`
- `air_audit_deliverables`
- `air_audit_events`
- `air_ingestion_cache`

Important adaptation:

- The AIR source spec used `tenants`.
- This application uses `organizations`.
- All AIR tables use `organization_id` for tenant isolation.

## 9. Reporting And Export Functionality

### SEO/AEO/GEO Reports

Current exports:

- Markdown.
- DOCX.
- PDF.
- Roadmap CSV.
- Link opportunities CSV.
- Citation tasks CSV.
- Schema ZIP.
- Firecrawl Design ZIP with raw HTML, clean HTML, markdown, schema JSON, inline CSS, linked CSS when reachable, page metadata, and a Claude Design recreation brief.

PDF support is now implemented through:

```text
lib/reports/pdf-generator.ts
app/api/jobs/[id]/download?format=pdf
```

The report page now exposes a PDF download button.

### LLM Visibility Reports

Current report sections:

- Executive summary.
- What AI says about the business.
- Who beats the business.
- Why this is happening.
- SEO/AEO/GEO context.
- Precise next steps.
- 30/60/90-day remediation path.
- Caveats.
- Client follow-up email.

Current exports:

- DOCX from the browser report writer.
- PDF from the browser report writer.
- CSV run export.
- JSON scorecard export.
- Shareable lead scorecard link.

Durable persistence is now available server-side, but the UI still preserves local browser fallback for quick demo use.

### AIR Reports

Current AIR Snapshot deliverable includes:

- Bridge AIR Snapshot header.
- Client identity block.
- AIR Score dial.
- Threshold band.
- Five-domain breakdown.
- Three quick wins.
- Observations.
- "What public data cannot see" limitations.
- CTA panel.
- Public report route with noindex metadata.
- Print button.

Next AIR reporting work:

- Full Audit deliverable with narrative.
- Opportunity matrix.
- 90-day roadmap.
- Tool plan.
- Workflow summaries.
- Foundation Sprint and Transition Sprint deliverables.
- Re-score delta report.

## 10. Scoring Models

### SEO/AEO/GEO

SEO/AEO/GEO scoring remains page and site oriented. It evaluates crawlability, content, metadata, schema, answer-readiness, local entity clarity, and technical blockers.

### LLM Visibility

LLM Visibility preserves two scoring systems because they explain different things:

- Workbook 0-5 score:
  - Easy for owners to understand.
  - Example: "You appeared in 4 of 15 buyer questions."
  - Best for client conversations.

- AI Visibility Score 0-100:
  - Better for trend reporting.
  - Combines mention rate, recommendation strength, citation rate, competitor dominance, and QA-adjusted answer quality.
  - Best for re-audit deltas.

### AIR Score

AIR Score is deterministic:

```text
5 domains x 4 sub-dimensions x 0-5 points = 100 points
```

Bands:

- 0-19: Pre-AI.
- 20-39: Stabilization First.
- 40-59: Catch-Up Phase.
- 60-79: Foundation Strong.
- 80-100: AI-Native Ready.

Testing:

- `__tests__/air-scoring.test.ts` verifies band thresholds, fixture scoring, domain count, and sub-dimension count.
- `lib/air/scoring/fixtures.ts` stores representative scoring fixtures.

## 11. Service Packaging

Recommended offer ladder:

1. Free AI Visibility / AIR Snapshot
   - Lead magnet.
   - Public-data only.
   - Shows a score and top three quick wins.
   - CTA: "Get Your Free Report."

2. Standard SEO/AEO/GEO + LLM Visibility Audit
   - Paid diagnostic.
   - Tests AI answers and explains root causes through site evidence.
   - Best offer for most local businesses.

3. Remediation Sprint
   - Schema.
   - GBP optimization.
   - Reviews/reputation automation.
   - Service-page content.
   - FAQ/answer-ready pages.
   - Citations and local source-building.
   - Technical SEO fixes.

4. AIR Audit
   - Higher-ticket operational readiness diagnostic.
   - Best for home improvement businesses with enough size, staff, leads, and tooling to benefit from AI operations.

5. Foundation Sprint
   - Data hygiene.
   - Workflow documentation.
   - Tool inventory cleanup.
   - Reporting foundation.

6. Transition Sprint
   - Lead Hub setup.
   - MLH AI employees.
   - Custom automations.
   - Training.
   - Day 60 and Day 90 re-scores.

7. AI Operations
   - Ongoing optimization.
   - Quarterly AIR and LLM visibility re-scoring.
   - New automations.
   - Executive briefing.

Sales recommendation:

- Keep the front-end pitch simple: "Free AI Visibility Report."
- Use the first report to sell remediation.
- Introduce AIR when the client asks about AI tools, automation, lead handling, workflow, CRM, or staff capacity.

## 12. Lead Generation Page Specification

The consulting website should have a dedicated lead generation page for the free report.

Positioning:

```text
No one is checking what AI says when customers ask who to hire. I will check it for you.
```

Page purpose:

- Capture qualified local-business leads.
- Promise a free initial report.
- Route the operator into the SSP workbench.
- Create a natural follow-up offer for remediation.

Form fields:

- Business Name.
- Website.
- Email.
- Business Category.

Button copy:

```text
Get Your Free Report
```

Implementation note:

- The form should match the existing Contact page design system.
- Leads should be persisted durably, not only emailed or stored in local browser state.
- The app now includes `llm_visibility_leads`; the consulting website can post into a CRM, webhook, or future public intake endpoint.

## 13. Architecture And Security Harness

The platform should implement a lightweight internal control system inspired by the "Bob" concept:

1. SpecGate
   - Create and store a feature spec before code.
   - Output: scope, user story, data impact, API impact, UI impact, security risks, acceptance criteria, and tests.

2. BuildLoop
   - Break approved specs into small branches.
   - Require tests, TypeScript, build, migration review, and changed-file summary.

3. ReviewOrchestra
   - Use role-based review:
     - security,
     - product,
     - data,
     - UX,
     - cost.

4. AuditLoop
   - Compare shipped behavior to spec and telemetry.
   - Create follow-up specs or fixes.

Current implementation:

- Database tables exist:
  - `architecture_specs`
  - `architecture_reviews`
  - `release_gates`
  - `runtime_audit_events`

Next implementation:

- Build an internal UI page for specs, reviews, gates, and runtime findings.
- Add release-gate creation after tests/build.
- Add runtime events for failed jobs, runaway credit usage, provider failures, and repeated manual report edits.

Security guardrails:

- Provider keys stay server-only.
- Firecrawl content stays untrusted.
- LLM Visibility prompts stay clean and stateless.
- RLS policies should be tested for all organization-scoped tables.
- Public AIR reports are noindexed.
- Report approval gates should be added before client links are sent.
- Cost estimates should be shown before Firecrawl, LLM, and AIR batch operations.

## 14. Current Implementation Status

Implemented and verified:

- AIR schema and seed tiers.
- AIR scoring engine and fixtures.
- AIR Snapshot generation and public report page.
- AIR navigation and first workbench pages.
- Client Results Dashboard at `/clients/[id]` with run status, Firecrawl evidence, results snapshot, and combined optimization backlog.
- Persisted standalone Site Crawl workflow:
  - `/site-crawl`
  - `/api/site-crawl/run`
  - `/api/site-crawl/crawls`
  - `/api/site-crawl/crawls/[crawlId]`
  - `/api/site-crawl/crawls/[crawlId]/pages/[pageId]`
  - `/site-crawl/stored/[crawlId]`
- Client workbench schema and aggregation route:
  - `008_client_workbench_dashboard.sql`
  - `/api/clients/[id]/workbench`
  - `/api/clients/[id]/site-crawl/run`
  - `lib/client-workbench.ts`
- Server-side LLM Visibility provider execution.
- LLM Visibility provider status route.
- Durable LLM Visibility audit/run/lead schema and persistence routes.
- Architecture harness schema.
- Firecrawl prompt-injection security boundary.
- SEO/AEO/GEO PDF export.
- Documentation updates in this design document and `CLAUDE.md`.

Verification performed:

- `npm.cmd test`: 91 tests passing.
- `npm.cmd run build`: production build passing.
- Local route smoke: `/air-audits` returned HTTP 200 from the dev server.

Known limitation:

- Browser plugin smoke check was blocked by the local browser with `ERR_BLOCKED_BY_CLIENT`, but HTTP route and production build verification both passed.

## 15. Remaining Production Work

Highest priority:

- Apply migrations in Supabase, including `008_client_workbench_dashboard.sql`.
- Set Render env vars for OpenAI, Anthropic, Gemini/Google, Perplexity, Firecrawl, and app URL.
- Replace AIR Snapshot stub ingestion with live Firecrawl, GBP, reviews, ads, and tech-stack adapters.
- Build AIR intake save endpoints and editors:
  - interviews,
  - CRM CSV mapping,
  - tool inventory,
  - workflow swimlanes,
  - report samples.
- Add AIR analyst override endpoint and event logging.
- Add Claude-generated AIR observations, quick wins, roadmap, and narrative.
- Add cost/credit guardrails.
- Add architecture harness UI.
- Connect public lead gen form to durable lead capture or CRM automation.

Medium priority:

- Server-side LLM Visibility DOCX/PDF export.
- Durable screenshot/file upload for LLM evidence locker.
- Combined SEO/AEO/GEO + LLM + AIR exportable report view using the new client workbench data layer.
- Client longitudinal dashboard for LLM visibility and AIR score history.
- Re-audit and re-score delta persistence.
- Stripe billing and credit enforcement.
- Email notifications and report delivery.

Deferred:

- Public AIR methodology website.
- Vanity public report URLs.
- Multi-location AIR scoring.
- Spanish-language reports.
- HubSpot, Pipedrive, Keap, and Salesforce connectors.
- Benchmark percentiles after enough AIR audits exist.

## 16. Acceptance Criteria

The current platform is working when:

- SEO/AEO/GEO audits can be created, run, viewed, and exported.
- Firecrawl evidence appears in the SEO/AEO/GEO report when enabled.
- LLM Visibility can run selected clean prompts through server-side provider routes.
- LLM Visibility reports include exact prompts, provider, response, citations, score, QA status, and caveat language.
- LLM Visibility provider keys are not entered or stored in the browser.
- AIR Snapshot can be created, scored, rendered, and published.
- Public AIR report is accessible without auth and marked noindex.
- PDF export works for SEO/AEO/GEO reports.
- Design docs and `CLAUDE.md` describe the current architecture and known limits.
- Client dashboard shows run progress and consolidated recommendations across all completed modules.
- Standalone Site Crawl stores pages and exposes Markdown, clean HTML, raw HTML, schema, metadata, and design export without requiring a full client audit.
- Tests and build pass before deployment.

The full production platform is complete when:

- All three modules share durable client history.
- Combined report explains what happened, why it happened, readiness level, and exact next steps.
- Public lead form creates a durable lead and workbench intake.
- Cost guardrails prevent runaway provider/Firecrawl usage.
- QA approval gates protect client-facing reports.
- Scheduled re-audits and delta reports work across SEO, LLM Visibility, and AIR.

## 17. Design Principle

SSP should make AI visibility and AI readiness concrete for local businesses. The app should not overwhelm owners with model jargon. It should show the exact questions tested, the answers AI tools gave, who was recommended instead, what the website evidence says, whether the business is operationally ready, and the practical work needed to improve.

The operator should always be able to answer:

```text
What did we test?
What evidence did we capture?
What did AI/search systems say?
Why did that happen?
What should the client do first?
What service should we offer next?
```
