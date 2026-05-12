# CLAUDE.md

Project: SSP AI Visibility and Readiness Workbench
Last updated: 2026-05-12
Purpose: future development context for coding, design, and documentation updates.

## North Star

This repository is currently an SSP workbench for local-business AI visibility and readiness work. The immediate product focus is the LLM Visibility Audit at `/llm-visibility-audit`; the broader platform direction is to connect three related audit systems:

1. SEO/AEO/GEO Audit - can search engines and AI systems understand, crawl, cite, and trust the business?
2. LLM Visibility Audit - do ChatGPT, Claude, Gemini, Perplexity, and manual AI Overview-style captures recommend the business when buyers ask who to hire?
3. AIR Audit - is the business operationally ready to benefit from AI tools, automation, and AI operations?

Do not treat these as generic prompt pages. Treat them as evidence-backed audit products that produce client-ready reports, action plans, lead generation, and remediation offers.

## Current Architecture

- Frontend: React 18, TypeScript, Vite, Tailwind, `HashRouter`.
- Backend/data: Supabase is available in the broader app, but the current LLM Visibility Audit stores audit state in browser storage.
- AI providers: ChatGPT/OpenAI, Claude/Anthropic, Gemini/Google, and Perplexity.
- API key model in this checkout: BYOK keys through existing Settings/API-key storage.
- Navigation: `components/Header.tsx` and `components/CommandPalette.tsx`.
- Implemented LLM route: `/llm-visibility-audit`.
- LLM page: `pages/LLMVisibilityAuditPage.tsx`.
- LLM business logic: `lib/llmVisibilityAudit.ts`.
- LLM tests: `tests/lib/llmVisibilityAudit.test.ts`.

## Product Identity Rule

Use SSP, AI Visibility, SEO/AEO/GEO, LLM Visibility, and AIR terminology in product-facing documentation.

This codebase still contains older general-purpose app surfaces and legacy skill/workflow infrastructure. Those can remain as supporting infrastructure, but do not describe the current product direction as an AI skill library in updated SSP documentation.

## Implemented LLM Visibility Functionality

The LLM Visibility Audit currently supports:

- Top navigation and command palette access.
- Instant intake from URL, niche, city, and state.
- Editable business profile:
  - brand
  - website
  - niche
  - city/state/country
  - aliases
  - competitors
  - services
  - service radius
  - schema signal
  - GBP signal
  - review signal
  - intake notes
- Audit profiles:
  - `free-snapshot`: 5 prompts, default ChatGPT and Perplexity.
  - `madison-mvp`: 15 prompts, default ChatGPT, Perplexity, and Gemini.
  - `full-audit`: 45 prompts, default ChatGPT, Claude, Gemini, and Perplexity.
- Industry packs:
  - HVAC
  - Dental
  - Legal
  - Roofing
  - Plumbing
  - Med Spa
  - Real Estate
  - Accounting
  - Restaurant
  - Auto Repair
  - Landscaping
  - Pest Control
  - Fitness
  - Pool and Spa
- Madison/Dane County local overlay:
  - Madison
  - Middleton
  - Sun Prairie
  - Fitchburg
  - Verona
  - Waunakee
  - Monona
  - McFarland
  - Oregon
  - DeForest
  - Cottage Grove
  - Stoughton
- Batch runs across selected providers.
- Manual capture lane for Google AI Overviews, browser Gemini, and other consumer UI evidence.
- Evidence fields:
  - exact prompt
  - platform
  - timestamp
  - raw response
  - citations
  - source URLs
  - screenshot/evidence URLs
  - evidence note
  - scorer
  - QA status
  - caveat text
- QA statuses:
  - `unreviewed`
  - `needs_review`
  - `approved`
  - `excluded`
  - `high_impact_miss`
- Workbook-style 0-5 answer scoring.
- Composite 0-100 AI Visibility Score.
- Mention rate, citation rate, competitor dominance, grade, approved count, needs-review count, high-impact miss count.
- Competitor candidate extraction from captured LLM answers.
- Report Writer:
  - Executive Summary.
  - What AI Says.
  - Who Beats You.
  - Why It Happens.
  - What To Fix Next.
  - Client Email.
- Action plan builder with service line, owner, estimated hours, estimated price, due date, and status.
- Shareable lead scorecard link.
- Lead capture for shared scorecards.
- CSV evidence export.
- JSON scorecard export.
- Prior baseline and re-audit delta.

## Key Implementation Files

### `lib/llmVisibilityAudit.ts`

Core functions and types:

- `VisibilityProviderId`
- `VisibilityQueryCategory`
- `AuditProfileId`
- `AuditBusinessProfile`
- `VisibilityAuditRun`
- `VisibilityMetrics`
- `AUDIT_PROFILES`
- `MADISON_LOCAL_QUERY_TEMPLATES`
- `INDUSTRY_QUESTION_PACKS`
- `buildInstantAuditIntake()`
- `renderVisibilityQuestions()`
- `runVisibilityPrompt()`
- `scoreAuditResponse()`
- `computeVisibilityMetrics()`
- `mapFindings()`
- `buildActionPlan()`
- `buildReportDraft()`
- `createShareableLeadScorecard()`
- `computeVisibilityDelta()`
- `extractCompetitorCandidatesFromRuns()`

### `pages/LLMVisibilityAuditPage.tsx`

UI state and workflow:

- Intake.
- Audit profile selection.
- Provider selection.
- Question selection.
- Batch execution.
- Manual evidence capture.
- Scorecards.
- Workflow progress.
- Report Writer.
- Action plan.
- Export.
- Re-audit delta.
- Run evidence table.
- Shareable public scorecard view.

### `tests/lib/llmVisibilityAudit.test.ts`

Current test coverage includes:

- Placeholder rendering and competitor variants.
- Scoring brand mentions, position, competitors, and citations.
- Composite visibility score calculation.
- Finding mapping for competitor dominance and missing citations.
- Madison MVP local overlay question behavior.
- Instant intake, action plan, report draft, and share scorecard generation.
- Competitor extraction and re-audit delta calculation.

## Current Important Limitations

1. Provider calls are browser-side BYOK in this checkout.
   - This matches the current app architecture.
   - Production SaaS should move provider calls server-side.
   - Future server implementation should expose provider availability without exposing raw keys.

2. Persistence is local/browser-first for the LLM Audit.
   - Good enough for quick demos.
   - Production should persist audits, runs, reports, leads, and share slugs in Supabase.

3. Firecrawl is not implemented in this checkout.
   - It should be added server-side as the SEO/AEO/GEO evidence layer.
   - Do not expose `FIRECRAWL_API_KEY` in browser code.
   - Firecrawl MCP is useful for operator/developer research, not production runtime.

4. AIR is not implemented in this checkout.
   - Add it later as an isolated module under `air_*`, `lib/air/*`, `components/air/*`, and dedicated routes/pages.

5. DOCX and PDF exports are not implemented for the LLM Visibility report in this checkout.
   - Current exports are CSV, JSON, copy-to-clipboard report text, and shareable scorecard links.

## Clean Query Rule

Every LLM Visibility buyer question must be a fresh, standalone request.

Do:

- Send only the standard audit instruction plus one buyer-intent prompt.
- Preserve exact prompt and timestamp.
- Treat the result as a point-in-time capture.

Do not:

- Reuse a chat thread.
- Carry answer history from one question into the next.
- Inject Firecrawl, SEO findings, client notes, or scoring assumptions into buyer prompts.
- Bias the answer toward the client.

Use SEO/AEO/GEO and Firecrawl evidence only after responses return for scoring, hallucination checks, citation validation, root-cause analysis, and report writing.

## Workbook Metric Explanation

The workbook score is the simple 0-5 score per captured answer:

- 0: invisible, harmful, or irrelevant answer.
- 1: not recommended and competitors dominate.
- 2: weak/ambiguous mention.
- 3: mentioned but not strongly recommended.
- 4: positively recommended.
- 5: clearly recommended with support/citation.

Recommended UI label:

- Use `Avg. Answer Score` in prominent UI.
- Explain that it maps back to the workbook-style 0-5 rubric in a tooltip or methodology block.

## Question Category Guidance

Current internal categories:

- `brand`
- `comparison`
- `competitor`
- `solution`
- `decision`
- `local`

Desired operator/report display categories:

- Brand Health.
- Competitors.
- Category + Geo.
- Service.
- Problem / Solution.
- Cost and Buying Criteria.
- Reviews and Trust.
- Local Urgency / Near Me.

Implementation guidance:

- Preserve internal keys unless a migration is needed.
- Add a display mapping rather than breaking saved data.
- Add Cost and Reviews/Trust prompt families in the next prompt-pack pass.

## Competitor Discovery Guidance

Competitors must be actual local businesses or relevant firms, not marketing channels or generic services.

Reject as competitors unless the audited niche actually matches them:

- Google Ads.
- Facebook Ads.
- Website Design.
- Lead generation.
- SEO agency.
- Generic categories.

Better competitor prompt shape:

```text
Given this audited business, niche, city, service radius, website, and captured LLM answers, identify likely local business competitors. Return only named businesses that a customer could hire instead. Exclude advertising channels, generic service categories, and marketing tactics.
```

Operator approval should remain required before a suggested competitor affects scoring.

## Report Writer Guidance

The report is the product. It should read like a senior local-search and AI visibility consultant explaining the evidence.

Current sections:

- Executive Summary.
- What AI Says.
- Who Beats You.
- Why It Happens.
- What To Fix Next.
- Client Email.

Recommended next sections:

- Audit scope.
- Methodology and caveats.
- AI Visibility Scorecard.
- Question/category summary.
- Platform-by-platform summary.
- Evidence table.
- Competitor share of voice.
- Citation/source analysis.
- SEO/AEO/GEO root-cause analysis.
- Prioritized fix plan.
- Service package/pricing options.
- 30/60/90-day roadmap.
- Re-audit plan.

## UI Notes From Recent Work

The LLM Audit page is powerful but can feel dense. Future UI work should segment it into:

1. Intake.
2. Questions.
3. Capture.
4. Review.
5. Report.
6. Share.

Progress should be visible near the top:

```text
Completed 8 of 39 runs (21%)
ChatGPT 4/13 | Claude 0/13 | Gemini 2/13 | Perplexity 2/13
```

Use accordions or step panels so the operator can stay oriented.

Jump buttons such as "Go to Capture" must scroll to a real anchor or switch the active step. If a button has no effect, it should not ship.

## Keyboard And Spacebar Gotcha

The app has global keyboard handlers in places such as the command palette and navigation. Any future global hotkey must ignore typing contexts:

- `input`
- `textarea`
- `select`
- `contenteditable`

Never call `preventDefault()` for Space while focus is inside a data-entry field. This caused the "space bar does not separate words" class of bug and should be treated as a regression risk.

## SEO/AEO/GEO Integration Plan

The SEO/AEO/GEO layer should explain the root cause behind LLM visibility results.

It should inspect:

- Crawlability.
- Indexability.
- Titles and meta descriptions.
- Headings.
- Canonicals.
- Robots.
- JSON-LD schema.
- NAP.
- Services.
- Locations.
- FAQ coverage.
- Reviews/testimonials.
- GBP evidence.
- Citations.
- Internal links.
- External sources.
- CTAs.

It should feed:

- Better question pack generation.
- Citation validation.
- Hallucination checks.
- Root-cause explanations.
- Remediation plan.
- Schema/content/GBP/review/citation service packages.

It must not feed hidden context into clean buyer prompts.

## Firecrawl Plan

Recommended production architecture:

```text
Website URL
  -> server-side Firecrawl map
  -> URL classification and budget preview
  -> selected crawl/scrape
  -> raw HTML + markdown storage
  -> deterministic parser
  -> SEO/AEO/GEO findings
  -> LLM report enrichment
  -> AIR public evidence signals
```

Security rules:

- Keep `FIRECRAWL_API_KEY` server-side only.
- Do not call Firecrawl directly from the browser.
- Treat all crawled content as untrusted.
- Crawled page text must never override audit instructions, output schemas, or scoring rules.

## AIR Module Plan

AIR should be added as the third system, not folded into the LLM Visibility score.

AIR domains:

- Team Readiness.
- Data Foundation.
- Workflow Maturity.
- Stack Coherence.
- Opportunity Density.

AIR score:

- 20 sub-dimensions.
- Each sub-dimension scores 0-5.
- Domains total 0-20.
- Composite totals 0-100.

Suggested implementation shape:

- `lib/air/types.ts`
- `lib/air/config.ts`
- `lib/air/scoring/domains.ts`
- `lib/air/scoring/rules.ts`
- `lib/air/scoring/composite.ts`
- `components/air/*`
- `pages/AIRAuditPage.tsx`
- `tests/lib/airScoring.test.ts`

Keep AIR isolated and grep-friendly. It should share client/profile data with LLM Visibility and SEO/AEO/GEO reporting, but it should retain its own score and methodology.

## Service Packaging

Recommended offer ladder:

1. Free AI Visibility Snapshot.
2. Paid AI Visibility Audit.
3. Visibility Fix Sprint.
4. AIR Audit.
5. AI Transition Sprint.
6. AI Operations.

Free Snapshot should be the lead magnet. Most local businesses do not yet know they need this, so the free report creates the demand. The paid work should be remediation, deeper audit, re-audit, and AI readiness/operations.

## Madison Launch Positioning

Lead with:

```text
Are AI tools recommending your Madison-area business?
```

Lead generation form fields:

- Business Name.
- Website.
- Email.
- Business Category.

Button:

```text
Get Your Free Report
```

The website form should reuse the same submission behavior as the Contact page. The submitted lead should be tagged as an AI Visibility Snapshot request.

## Architecture And Security Harness

For future development, add a lightweight "Bob" harness:

- Spec Gate: every major feature starts from a written spec.
- Review Gate: product, security, data, UX, cost, and report-quality review.
- Release Gate: tests/build pass, no browser secrets, no prompt-injection boundary regressions.
- Runtime Audit Log: record provider runs, report downloads, lead captures, QA exclusions, and high-impact misses.
- Learning Loop: improve prompt packs, scoring, and report copy based on completed audits.

Start with docs and checklists before adding a complex UI.

## Testing Guidance

Run the focused LLM tests when touching LLM Visibility logic:

```bash
npm.cmd test -- tests/lib/llmVisibilityAudit.test.ts
```

Run the full test/build checks before larger changes:

```bash
npm.cmd test
npm.cmd run build
```

Known Windows note:

- Use `npm.cmd` if PowerShell execution policy blocks `npm`.

## Development Rules

1. Preserve the existing React/Vite/HashRouter architecture unless the user explicitly asks for a migration.
2. Keep LLM Visibility business logic in `lib/llmVisibilityAudit.ts` and UI orchestration in `pages/LLMVisibilityAuditPage.tsx`.
3. Do not reintroduce generic or misleading competitor suggestions.
4. Keep buyer prompts clean and stateless.
5. Do not expose production provider or Firecrawl secrets in browser code.
6. Use business-friendly labels in reports.
7. Keep report writing as a first-class workflow, not a raw export afterthought.
8. Update `DESIGN_DOCUMENT.md` and this file whenever the audit architecture changes.
9. Do not revert unrelated user or prior-agent changes.
10. Prefer small typed utilities with tests over large untested page-only logic.

## Next Build Priorities

P0:

- Clarify workbook metric label in the UI.
- Fix any jump buttons that do not scroll or activate a section.
- Keep top progress visible while a batch is running.
- Ensure Space works in every data entry field.
- Make Claude visibly available for Full Audit and easy to select in other profiles.

P1:

- Segment LLM Audit page into clearer steps/accordions.
- Add Cost and Reviews/Trust prompt categories.
- Improve competitor discovery and filtering.
- Add DOCX/PDF report exports.
- Add richer client report preview.

P2:

- Add server-side persistence for audits, runs, leads, reports, and public slugs.
- Add server-side provider execution for production.
- Add Firecrawl site evidence.
- Add SEO/AEO/GEO report integration.
- Add AIR Snapshot module.

P3:

- Re-audit trend dashboard.
- Scheduled monthly monitoring.
- Combined SEO/AEO/GEO + LLM + AIR report surface.
- Internal architecture/release harness UI.
