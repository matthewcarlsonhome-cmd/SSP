# SSP AI Visibility and Readiness Workbench Design Document

Version: 2026-05-12
Status: living product, service, and implementation design for the SSP local-business audit platform.

## 1. Executive Summary

SSP is being shaped into a three-part local-business AI visibility and readiness workbench. The application should help an operator take any local business website, collect structured evidence, test what AI answer engines say, explain why the results are happening, and turn the findings into a client-ready report plus a remediation or implementation offer.

The three systems are:

1. SEO/AEO/GEO Audit
   - Measures whether the website and business entity are understandable, crawlable, schema-ready, locally credible, and answer-ready.
   - Explains the root causes behind AI visibility gaps: weak service pages, missing schema, thin FAQ coverage, poor local evidence, citations, GBP, reviews, and entity clarity.

2. LLM Visibility Audit
   - Measures whether ChatGPT, Claude, Gemini, Perplexity, and manual AI Overview-style captures recommend the business when buyers ask local hiring questions.
   - Captures exact prompts, raw answers, citations, source URLs, screenshots/manual evidence, QA status, workbook scores, composite visibility scores, competitors, findings, reports, and action plans.

3. AIR Audit
   - Measures whether the business is operationally ready to benefit from AI infrastructure and automation.
   - Scores Team Readiness, Data Foundation, Workflow Maturity, Stack Coherence, and Opportunity Density into a 0-100 AI Readiness score.

Together they answer three questions a local business owner actually cares about:

```text
Can search engines and AI systems understand my business?
Do AI tools recommend my business when local customers ask who to hire?
Is my business ready to profit from AI automation and operations?
```

The preferred service motion is:

```text
Free AI Visibility Snapshot
  -> paid LLM Visibility + SEO/AEO/GEO Audit
  -> remediation sprint for schema, content, GBP, reviews, citations, and service pages
  -> AIR Audit for larger clients ready to invest in AI operations
  -> AI transition sprint or ongoing managed operations
```

## 2. Current Implementation Snapshot

This repository is a React 18, TypeScript, Vite, Tailwind, HashRouter application. The LLM Visibility Audit is implemented as a production-style frontend workflow inside the existing application shell.

Current implemented route:

- `/llm-visibility-audit`

Current key files:

- `App.tsx`
- `components/Header.tsx`
- `components/CommandPalette.tsx`
- `pages/LLMVisibilityAuditPage.tsx`
- `lib/llmVisibilityAudit.ts`
- `tests/lib/llmVisibilityAudit.test.ts`
- `pages/SettingsPage.tsx`
- `lib/apiKeyStorage.ts`

Current implemented LLM Visibility capabilities:

- Top navigation and command palette entry for the LLM Visibility Audit.
- Instant intake from website URL, niche, city, and state.
- Editable business profile: brand, website, niche, city, state, aliases, competitors, services, service radius, schema signal, GBP signal, review signal, and notes.
- Audit profiles:
  - Free Snapshot: 5 prompts, default ChatGPT and Perplexity.
  - Madison MVP: 15 prompts, default ChatGPT, Perplexity, and Gemini.
  - Full Audit: 45 prompts, default ChatGPT, Claude, Gemini, and Perplexity.
- Industry question packs:
  - HVAC.
  - Dental.
  - Legal.
  - Roofing.
  - Plumbing.
  - Med Spa.
  - Real Estate.
  - Accounting.
  - Restaurant.
  - Auto Repair.
  - Landscaping.
  - Pest Control.
  - Fitness.
  - Pool and Spa.
- Madison and Dane County local prompt overlay:
  - Madison.
  - Middleton.
  - Sun Prairie.
  - Fitchburg.
  - Verona.
  - Waunakee.
  - Monona.
  - McFarland.
  - Oregon.
  - DeForest.
  - Cottage Grove.
  - Stoughton.
- Batch execution across selected providers.
- Manual capture lane for Google AI Overviews, Gemini browser output, and other consumer UI evidence.
- Evidence capture for exact prompt, platform, timestamp, raw response, citations, source URLs, screenshots, scorer, QA status, caveat text, and evidence notes.
- Workbook-style 0-5 scoring.
- Composite 0-100 AI Visibility Score.
- Mention rate, citation rate, competitor dominance, high-impact miss count, approved count, needs-review count, and visibility grade.
- Competitor candidate extraction from captured LLM answers.
- Action plan builder with service line, estimated hours, price, owner, priority, due date, and status.
- Report Writer sections:
  - Executive Summary.
  - What AI Says.
  - Who Beats You.
  - Why It Happens.
  - What To Fix Next.
  - Client Email.
- Shareable lead scorecard link with lead capture.
- CSV export of evidence runs.
- JSON export of scorecard/report data.
- Current scorecard can be saved as a prior baseline for re-audit delta.

Current important limitation:

- Provider API keys are configured through the existing Settings/BYOK model and read from browser storage. That matches the current app architecture, but the production SaaS version should move provider execution to server-side API routes with encrypted organization-level provider keys or Render environment variables.

## 3. Product Positioning

Do not position this as a generic AI tool. Position it as a practical evidence-backed audit service for local businesses.

Primary promise:

```text
Find out whether AI tools recommend your business when local customers ask who to hire.
```

Expanded promise:

```text
See what AI tools say, who they recommend instead, why your business is or is not visible, and what to fix first.
```

Primary operator outcome:

```text
Complete a credible initial AI visibility snapshot in 30 minutes or less, then use the report to sell remediation, SEO/AEO/GEO fixes, or AI readiness work.
```

Primary client outcome:

```text
A plain-English report showing the questions tested, the answers AI tools gave, where the business appeared, which competitors appeared instead, and the precise next steps to improve.
```

Target market for Madison launch:

- Home services.
- Contractors.
- HVAC.
- Plumbing.
- Roofing.
- Dental.
- Med spas.
- Legal.
- Accounting.
- Real estate.
- Restaurants.
- Auto repair.
- Landscaping.
- Pest control.
- Fitness studios.
- Pool and spa businesses.

## 4. How The Three Systems Relate

The three systems should remain distinct because they measure different truths.

```text
SEO/AEO/GEO = Can machines understand and cite the business?
LLM Visibility = Do AI answer engines recommend the business right now?
AIR = Can the business operationally absorb and profit from AI?
```

Combined client story:

```text
1. AI tools are already making local recommendations.
2. We tested whether your business appears.
3. We captured the exact prompts, answers, competitors, citations, and misses.
4. We diagnosed why this is happening.
5. We mapped the visibility gaps to concrete fixes.
6. For larger clients, we also scored whether the business is ready for AI operations.
```

How data should flow:

```text
Client website + business profile
  -> SEO/AEO/GEO crawl and entity evidence
  -> LLM buyer-question generation and visibility testing
  -> evidence scoring and competitor share of voice
  -> report writer and action plan
  -> AIR readiness evaluation when operational AI work is in scope
```

Important boundary:

- Do not inject SEO crawl evidence, Firecrawl output, private client notes, or remediation assumptions into the actual LLM buyer prompts.
- The LLM Visibility test should simulate a clean buyer question.
- Site evidence should be used after responses return for scoring, citation validation, hallucination checks, explanation, and remediation planning.

## 5. LLM Visibility Audit Functional Specification

### Intake

The audit starts with a business profile:

- Business name.
- Website.
- Business category/niche.
- City and state.
- Service radius.
- Services.
- Brand aliases.
- Approved competitors.
- Schema status.
- GBP signal.
- Review signal.
- Intake notes.

Current implementation supports a lightweight instant intake from URL and niche. It drafts the brand name, services, aliases, and competitor suggestions. The operator must still approve or edit the profile.

### Audit Profiles

Free Snapshot:

- 5 prompts.
- 1 to 2 platforms by default.
- Best for lead generation, cold outreach, and quick sales-call prep.
- Output should be a short public scorecard and follow-up email.

Madison MVP:

- 15 prompts.
- 3 platforms by default.
- Madison and Dane County prompt overlay.
- Best for the first serious local pilot audit.

Full Audit:

- 45 prompts.
- 4 providers by default, including Claude.
- Manual Google AI Overview lane.
- Best for paid audit delivery.
- Output should include the full evidence locker, competitor story, action plan, and re-audit baseline.

### Platforms

Current provider labels:

- ChatGPT.
- Claude.
- Gemini.
- Perplexity.

Current implementation:

- Provider keys are retrieved through `lib/apiKeyStorage.ts`.
- The page shows key readiness and links to `/settings`.
- Batch runs skip providers without configured keys and show an error per run.

Production recommendation:

- Move provider execution to server-side API routes.
- Store platform keys as Render environment variables for system-owned keys or encrypted organization-level keys for BYOK.
- Browser should only see provider availability, not raw secrets.

### Clean Query Rule

Each question must be sent as a fresh standalone request.

Rules:

- No reused conversation.
- No hidden prior prompt context.
- No thread reuse.
- No memory state.
- No prior answer included in the next prompt.
- The request should contain only the standard audit instruction, optional platform/geography context, and the one buyer question being tested.

Why this matters:

- The service is selling an unbiased point-in-time visibility test.
- A contaminated chat history would make the result less defensible.

### Question Categories

Current code categories:

- `brand`.
- `comparison`.
- `competitor`.
- `solution`.
- `decision`.
- `local`.

Workbook-style reporting categories should be presented to the operator as:

- Brand Health.
- Competitors.
- Category + Geo.
- Service.
- Problem / Solution.
- Cost and Buying Criteria.
- Reviews and Trust.
- Local Urgency / Near Me.

Implementation note:

- The current category keys can remain stable internally.
- Add a display mapping so the page and exports use business-friendly workbook labels.
- Add Cost and Reviews/Trust prompt families as first-class categories in the next prompt-pack expansion.

### Evidence Locker

Every run should preserve:

- Exact rendered prompt.
- Query code and category.
- Platform.
- Capture mode: API, manual, or hybrid.
- Timestamp.
- Raw response text.
- Raw provider JSON when available.
- Citations.
- Source URLs.
- Screenshot or uploaded evidence URLs.
- Evidence note.
- Scorer.
- QA status.
- Caveat text.
- Error message when a run fails.

QA statuses:

- `unreviewed`.
- `needs_review`.
- `approved`.
- `excluded`.
- `high_impact_miss`.

### Workbook Score

The workbook score is the simple 0-5 score per captured answer.

Suggested client-facing explanation:

```text
Workbook score is the simple per-answer score: 0 means the business was invisible or harmed; 5 means the business was clearly recommended, supported, and cited.
```

Recommended UI change:

- Rename the metric card from `Workbook` to `Avg. Answer Score`.
- Keep `Workbook score` in tooltips or detailed methodology.

### Composite AI Visibility Score

The 0-100 AI Visibility Score should summarize:

- Brand mention rate.
- Position when mentioned.
- Sentiment.
- Citation/support rate.
- Competitor dominance.
- Harmful or high-impact misses.
- Excluded runs.
- Approved/reviewed evidence confidence.

The 0-100 score is useful for trend tracking, but the operator should always pair it with plain-English counts:

```text
You appeared in 4 of 15 captured AI recommendation moments.
Competitors appeared in 11 of 15.
Your website was cited 1 time.
```

### Competitor Discovery

Current implementation:

- Competitors can be entered manually.
- Instant intake suggests plausible competitors.
- Captured LLM answers can be scanned for new competitor candidates.

Important correction:

- Competitor suggestions should be businesses, not ad channels or marketing services.
- Prompts and extraction logic should reject terms such as Google Ads, Facebook Ads, Website Design, generic lead generation, and service categories unless the audited business is actually in that category.

Future production improvement:

- Add a competitor research step that uses the website, city, niche, service radius, and LLM answer text to propose local business competitors.
- Require operator approval before competitors are added to the scoring model.

### Report Writer

The report should not merely export raw data. It should draft a persuasive client narrative.

Current report sections:

- Executive Summary.
- What AI Says.
- Who Beats You.
- Why It Happens.
- What To Fix Next.
- Client Email.

Production report sections should include:

1. Cover and audit scope.
2. Executive summary.
3. AI Visibility Scorecard.
4. What AI says about the business.
5. Where the business appears.
6. Where the business is missing.
7. Who beats the business.
8. Competitor share of voice.
9. Evidence table by question and platform.
10. SEO/AEO/GEO root cause analysis.
11. Citation and source analysis.
12. QA caveats and methodology.
13. Prioritized fix plan.
14. Pricing/service package options.
15. 30/60/90-day roadmap.
16. Client follow-up email.
17. Re-audit baseline and delta plan.

Current exports:

- Copy report to clipboard.
- CSV evidence export.
- JSON scorecard export.
- Shareable lead scorecard link.

Target exports:

- DOCX.
- PDF.
- CSV evidence table.
- JSON archive.
- Public lead scorecard.

## 6. SEO/AEO/GEO Integration

The SEO/AEO/GEO layer explains why LLM visibility is weak and what to fix.

It should inspect:

- Crawlability.
- Indexability.
- Title tags.
- Meta descriptions.
- Canonicals.
- Robots meta.
- H1/H2/H3 structure.
- Open Graph data.
- JSON-LD schema.
- LocalBusiness, Organization, Service, FAQPage, Review, BreadcrumbList, and sameAs schema.
- NAP consistency.
- Service page depth.
- Location page coverage.
- FAQ and answer-ready content.
- Review and reputation evidence.
- GBP completeness.
- Citation and directory coverage.
- Internal linking.
- External source opportunities.
- Conversion CTAs.

How it supports LLM Visibility:

- Helps generate better service/category prompts.
- Verifies whether cited URLs are real client pages.
- Checks whether LLM answers hallucinate services the client does not offer.
- Explains missing citations.
- Maps visibility gaps to concrete fixes.
- Builds the remediation plan.

Do not use SEO/AEO/GEO evidence to bias the LLM buyer prompts. Use it after capture.

## 7. Firecrawl Integration Design

Firecrawl should become the production site evidence layer for SEO/AEO/GEO and for post-capture LLM analysis.

Recommended design:

```text
Client URL
  -> Firecrawl map
  -> URL classification and crawl budget preview
  -> selected Firecrawl crawl or scrape
  -> raw HTML + markdown artifacts
  -> deterministic parser
  -> SEO/AEO/GEO findings
  -> LLM report enrichment
  -> AIR public-data signals
```

Use Firecrawl for:

- Sitemap-backed URL discovery.
- Page crawling.
- JavaScript-rendered content.
- Markdown extraction.
- Raw HTML capture.
- Screenshots where useful.
- Links.
- Page inventory.

Parse deterministically:

- Title.
- Meta description.
- Canonical.
- Robots.
- Headings.
- Internal links.
- External links.
- Images and alt text.
- JSON-LD.
- Microdata/RDFa where possible.
- NAP.
- Services.
- Locations.
- FAQs.
- Testimonials/reviews.
- CTAs.

Security rule:

- Crawled content is untrusted.
- Page copy, markdown, raw HTML, schema, and scripts must never override system instructions, audit rubrics, scoring rules, or report output formats.

Recommended environment:

- Firecrawl API key should be server-side only.
- Do not expose `FIRECRAWL_API_KEY` as a browser variable.
- In a deployed SaaS version, use a backend/edge function or server API route for crawl calls.

Current repo note:

- Firecrawl is not yet implemented in this checkout.
- The design target is clear: add it as a server-side evidence layer, not as an MCP-only dependency and not as a browser-exposed key.

## 8. AIR Audit Design

AIR stands for AI Readiness. It is the third system in the platform.

Purpose:

- The LLM Visibility Audit tells the client whether AI recommends them.
- SEO/AEO/GEO tells the client what visibility foundation needs to improve.
- AIR tells the client whether their business can operationally benefit from AI tools, automations, and workflows.

AIR domains:

1. Team Readiness
   - Leadership buy-in.
   - Curiosity and openness.
   - Capability baseline.
   - Change tolerance.

2. Data Foundation
   - CRM completeness.
   - Attribution clarity.
   - Reporting infrastructure.
   - Data accessibility.

3. Workflow Maturity
   - Documentation.
   - Standardization.
   - Handoff clarity.
   - Friction visibility.

4. Stack Coherence
   - Tool sprawl.
   - Integration.
   - Redundancy.
   - Cost coherence.

5. Opportunity Density
   - Repetitive task volume.
   - Response-time sensitivity.
   - Content production need.
   - Customer interaction volume.

AIR score:

- 20 sub-dimensions.
- Each sub-dimension scores 0-5.
- Each domain totals 0-20.
- Composite totals 0-100.

AIR tiers:

- AIR Snapshot: free or low-cost public-data snapshot.
- AIR Audit: paid full diagnostic with interviews, CRM/tool review, workflow mapping, and roadmap.
- Foundation Sprint: fixes data and workflow gaps before major AI automation.
- Transition Sprint: implementation engagement for AI-ready clients.
- AI Operations: ongoing quarterly re-scoring, optimization, and new automation builds.

AIR current state in this checkout:

- Not implemented as a code module yet.
- It should be added later under clearly isolated names:
  - `lib/air/*`
  - `components/air/*`
  - `pages/AIRAudit*`
  - `air_*` data structures or tables
  - tests under `tests/lib/air*`

## 9. Service Packaging

Recommended offer ladder:

1. Free AI Visibility Snapshot
   - 5 to 7 questions.
   - 1 to 2 platforms.
   - One page scorecard.
   - Lead capture and booking CTA.
   - Goal: create urgency.

2. Paid AI Visibility Audit
   - 15 to 45 questions.
   - 3 to 4 providers plus manual captures.
   - Evidence table.
   - Competitor share of voice.
   - SEO/AEO/GEO cross-check.
   - Client-ready report.
   - Action plan and price anchors.

3. Visibility Fix Sprint
   - Schema.
   - GBP optimization.
   - Review automation.
   - Service pages.
   - FAQ and answer blocks.
   - Local landing pages.
   - Citations.
   - Re-audit.

4. AIR Audit
   - For larger or operationally complex businesses.
   - Scores AI readiness beyond marketing visibility.
   - Produces 90-day roadmap.

5. AI Transition Sprint / Operations
   - Implements automations.
   - Cleans data.
   - Improves workflows.
   - Provides re-scoring and quarterly optimization.

## 10. Madison Lead Generation Page Spec

Recommended positioning:

```text
Are AI tools recommending your Madison-area business?
```

Supporting copy:

```text
Customers are starting to ask ChatGPT, Gemini, Claude, Perplexity, and Google AI results who to hire locally. I will run a free snapshot to see whether your business appears, who shows up instead, and what may be holding you back.
```

Form fields:

- Business Name.
- Website.
- Email.
- Business Category.

Button:

```text
Get Your Free Report
```

Recommended flow:

1. Visitor submits form.
2. Form creates a lead record using the same functionality as the Contact page.
3. Operator runs Free Snapshot in SSP.
4. Operator sends a short report and booking link.
5. Follow-up offer is a paid audit or remediation sprint.

Recommendation:

- Lead with a free report, not a paid audit.
- The local market is not yet educated enough to buy "LLM visibility audits" cold.
- The free report creates surprise and urgency because most local businesses have never checked AI answer visibility.
- Monetize on remediation and re-audit.

## 11. Architecture And Security Harness

The "Bob" idea should become a lightweight architecture and release harness inside the platform and development workflow.

Recommended components:

1. Spec Gate
   - Every major feature starts from a short spec.
   - The spec states user value, data touched, routes, tables/storage, risks, and acceptance criteria.

2. Multi-Reviewer Gate
   - Product reviewer.
   - Security reviewer.
   - Data/RLS reviewer.
   - UX reviewer.
   - Cost reviewer.
   - Report-quality reviewer.

3. Release Gate
   - Tests pass.
   - Build passes.
   - No browser secrets added.
   - No prompt injection boundary removed.
   - No public report route ships without caveats and rate-limit plan.

4. Runtime Audit Log
   - Record audit runs.
   - Record provider costs where available.
   - Record report downloads.
   - Record public scorecard leads.
   - Record high-impact misses and QA exclusions.

5. Learning Loop
   - Review completed reports and lead outcomes.
   - Improve question packs.
   - Improve scoring.
   - Improve service packaging.

Near-term implementation:

- Add a simple `docs/architecture-review-template.md`.
- Add release checklist to pull request descriptions.
- Add tests for prompt rendering, scoring, report generation, and share scorecard encoding.
- Add a future internal page for architecture reviews only after the product flow stabilizes.

## 12. UI And Workflow Recommendations

The LLM Audit page should stay fast but less visually overwhelming.

Recommended page segmentation:

1. Intake.
2. Questions.
3. Capture.
4. Review.
5. Report.
6. Share.

Recommended UI pattern:

- Use accordions or step panels.
- Keep top progress visible.
- Show total planned runs, completed runs, failed runs, and percent complete in the top bar.
- Provide jump buttons that scroll to anchors reliably.
- Keep evidence detail collapsed until needed.
- Use business-friendly labels rather than internal terms where possible.

Spacebar/keyboard rule:

- Global hotkeys and command palette handlers must ignore typing inside `input`, `textarea`, `select`, and `contenteditable` elements.
- Never call `preventDefault()` for Space while the user is typing in a field.

## 13. Current Gaps And Next Build Priorities

P0 documentation and reliability:

- Keep this design document and `CLAUDE.md` updated whenever the LLM Audit changes.
- Add UI tooltip explaining `Avg. Answer Score` / workbook score.
- Ensure top progress shows completed runs out of total planned runs and percent complete.
- Ensure all jump buttons scroll to the correct section.
- Keep Claude visible as a supported provider, especially in Full Audit.

P1 reporting:

- Add DOCX export.
- Add PDF export.
- Add clearer report section boundaries.
- Add generated follow-up email variants.
- Add service-package/pricing blocks to the report.

P1 prompt/category expansion:

- Add explicit Cost and Buying Criteria category.
- Add Reviews and Trust category.
- Add display category mapping to Brand Health, Competitors, Category + Geo, Service, Problem / Solution, Cost, Reviews, and Local Urgency.

P1 competitor discovery:

- Improve competitor suggestions to use actual local business names.
- Reject generic marketing channels and non-business entities.
- Add operator approval before competitors affect scoring.

P2 Firecrawl:

- Add server-side Firecrawl site map/crawl preview.
- Add deterministic SEO/AEO/GEO parser.
- Use crawl evidence for report root-cause analysis, not for prompt biasing.

P2 AIR:

- Add AIR Snapshot scoring library.
- Add AIR Snapshot page.
- Add public AIR deliverable.
- Add full AIR Audit intake later.

P2 persistence:

- Move LLM audit persistence from local browser storage to Supabase.
- Add durable evidence tables.
- Add lead capture table.
- Add public scorecard slug storage.

## 14. Acceptance Criteria

LLM Visibility Audit is done for MVP when:

- Operator can open `/llm-visibility-audit` from top nav and command palette.
- Operator can paste a website and draft an intake profile.
- Operator can select an industry pack and audit profile.
- Operator can run selected questions against selected configured providers.
- Each query is a clean standalone request.
- Manual captures can be added and scored.
- Evidence includes exact prompt, platform, timestamp, raw response, citations, screenshot URLs, scorer, QA status, and caveat text.
- Review page shows workbook/answer score, visibility score, mention counts, citation counts, competitor dominance, QA flags, and re-audit delta.
- Report Writer creates clear sections and client email copy.
- Action plan includes root cause, recommended action, owner, hours, price, due date, and service line.
- CSV and JSON exports work.
- Shareable lead scorecard link works.

Production version is done when:

- Provider keys are server-side or encrypted organization-level secrets.
- Firecrawl crawl evidence powers SEO/AEO/GEO root cause analysis.
- DOCX and PDF reports are available.
- Durable Supabase persistence replaces local-only storage.
- AIR Snapshot exists as a connected third module.
- Public lead capture is stored durably and can trigger follow-up.
- QA and caveats are visible in every client-facing report.

## 15. Design Principle

The product should make AI visibility concrete. Local business owners do not need model jargon. They need to see:

- The exact questions tested.
- The answers AI tools gave.
- Whether their business appeared.
- Which competitors appeared instead.
- Why the result likely happened.
- What should be fixed first.
- What it will cost.
- When to re-audit.

That is the product.
