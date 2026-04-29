# CLAUDE.md — SEO/AEO/GEO Optimizer Knowledge Base

> **Read this file at the start of every development session.**
> Last updated: 2026-04-29

---

## 1. What This Project Is

The SEO/AEO/GEO Optimizer is a SaaS application that accepts a client brief (website URL + business details), runs a 5-agent Claude AI pipeline, and produces an implementation-ready optimization package covering traditional SEO, Answer Engine Optimization (AEO), and Generative Engine Optimization (GEO).

**What makes it novel:** Most SEO tools analyze. This one *writes*. Agent 3 generates actual title tags, meta descriptions, answer blocks, FAQ content, and JSON-LD schema code — ready to paste into a CMS. The output is a complete deliverable, not a list of recommendations.

**Core value proposition:** Enter client info, wait 5-8 minutes, download a package that would take a senior SEO strategist 20-40 hours to produce manually. Cost: $0.15-$3.00 in API fees depending on model choice.

**Repository:** `matthewcarlsonhome-cmd/SSP`
**App directory:** `seo-aeo-geo-app/`
**Live URL:** `https://ssp-43pp.onrender.com`
**Deployment:** Render (Web Service) + Supabase (Postgres + Auth)

---

## 2. Technology Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| Framework | Next.js (App Router) | 16.1.6 | Server-side API routes + React UI in one codebase |
| Language | TypeScript | 5.9.3 | Strict mode — catches agent output mismatches early |
| UI | React 19 + Tailwind CSS 4 | latest | Rapid UI iteration, zero CSS files to manage |
| Components | Custom shadcn/ui pattern + Lucide | | Consistent design system, tree-shakable icons |
| Database | Supabase (Postgres) | | RLS policies, auth integration, JSONB for flexible AI output |
| AI | Claude API (Anthropic) | 2023-06-01 | Web search tool, extended thinking, large context windows |
| Auth | Supabase Auth (Google OAuth) | | Optional — app works without login for demos |
| Report Gen | docx, JSZip, PapaParse | | DOCX reports, schema ZIP packages, CSV exports |
| Validation | Zod 4 | 4.3.6 | Runtime validation of agent outputs + form inputs |
| Testing | Vitest | 4.0.18 | 57 tests across 8 files — scoring, schemas, API, build |

### Key Dependency Choices
- **No remark/rehype for Markdown rendering** — custom line-by-line parser in the report viewer. Simpler, no SSR hydration issues, handles our specific output format.
- **No background job queue** — pipeline runs in-process on Render. Simpler deploy, but jobs are abandoned on server restart (handled by stale job cleanup).
- **No Redis/Bull** — not needed yet. If concurrent users exceed ~3-5, move to Supabase Edge Functions or a worker process.
- **@supabase/ssr** for auth — cookie-based sessions that work with Next.js server components and API routes.

---

## 3. Functional Readout — What Works Today

### Client Intake
- Manual form with 15+ fields (name, URL, industry, geography, competitors, keywords, GBP, analytics, CMS, pain points)
- **Auto-populate from URL** — enters a website URL, AI researches the business via web search and fills all fields (uses Haiku + 5 web searches)
- **Document upload** — drag-and-drop .txt/.csv/.json/.md/.docx/.pdf, AI extracts structured data and populates form
- **Re-run from previous audit** — pre-fills form from a prior job's `input_brief`
- **Model selector** — Haiku (fast/$0.15-0.30, 1 credit) vs Sonnet (premium/$1.50-3.00, 5 credits) with visual cost/speed comparison

### Pipeline Execution
- 5-agent sequential pipeline with HTML pre-fetch stage
- Real-time progress tracking (5-second polling) with step visualization
- **Live Output log** — timestamped, color-coded log entries from each agent
- Stall detection — warns user after 2 minutes of no progress change
- Error persistence — pipeline crashes are caught and saved to DB with user-visible error messages
- Non-fatal Agent 5 — if report formatting fails, pipeline still completes with raw data

### Report Output (6 download formats)
- **Interactive 9-tab report viewer** (Formatted, Executive Summary, Competitive Intel, Page Optimization, Schema Code, Technical Audit, Off-Page Strategy, Roadmap, Measurement)
- **DOCX** — Word document for client delivery
- **Markdown** — Agent 5's polished report or code-generated fallback
- **Schema ZIP** — JSON-LD with `<script>` wrappers + CMS installation instructions (WordPress, Shopify, Squarespace, Wix)
- **Roadmap CSV** — prioritized task table
- **Links CSV** — link building opportunities
- **Citations CSV** — directory/citation action items

### Client Management
- Client list with search filter
- Client detail page with audit history
- Delete client (handles FK constraints — deletes audit_jobs first)
- Delete individual audits

### Authentication & Billing (Framework)
- Google OAuth via Supabase Auth (optional, non-blocking)
- 3 free credits on signup
- Billing page with 3 pricing tiers (Starter $9.99/5cr, Professional $24.99/15cr, Agency $69.99/50cr)
- Transaction history UI
- Credits badge in navigation
- Stripe checkout is a placeholder — needs `STRIPE_SECRET_KEY` to activate
- Credits tracked but not enforced on audit creation (TODO)

### Testing
- 57 tests across 8 files: input validation, scoring logic, agent output schemas, JSON repair, report generation, prompt content, build integrity
- Build test verifies: TypeScript compiles, 30 critical files exist, all API routes have force-dynamic, model constants are valid

---

## 4. Architecture & Pipeline Design

### System Architecture

```
Browser (React)                    Server (Next.js API Routes)
─────────────────                  ─────────────────────────────
                                   
  New Audit Form ──POST /api/jobs──▶ Create audit_job (status=pending)
                                     Spawn runPipeline() (fire-and-forget)
                                     Return job ID immediately
                                   
  Progress Page  ──GET /api/jobs/[id]──▶ Read audit_job + audit_logs
  (polls every 5s)                       Return { job, audit_logs[] }
                                   
  Report Viewer  ──GET /api/jobs/[id]──▶ Read completed job
  (9-tab display)                        agent_outputs JSONB → tabs
                                   
                                   Pipeline (runs in-process)
                                   ─────────────────────────
                                   HTML Pre-fetch → Agent 1 → Agent 2 →
                                   Agent 3 → Agent 4 → Agent 5
                                   Each agent: Claude API call + DB write
```

### Pipeline Data Flow

1. **Job creation** (`POST /api/jobs`) — Validates brief with Zod, inserts `audit_jobs` row, spawns `runPipeline()` as a detached async call, returns job ID to client.

2. **HTML pre-fetch** — Before any agent runs, fetches the client's actual website HTML via `fetch()`. Extracts ground-truth SEO signals (existing `<title>`, meta description, `<h1>`-`<h6>` structure, JSON-LD schema, Open Graph tags, canonical URL). This data is unavailable via Claude's `web_search` tool which only returns text snippets.

3. **Agent execution** — Each agent gets: the client brief, outputs from prior agents, and (for Agent 1) the HTML analysis. Agents use Claude's `web_search` tool for live competitive/market data.

4. **Progress tracking** — Each agent writes timestamped entries to `audit_logs` table. Frontend polls `/api/jobs/[id]` every 5 seconds, receiving both job status and log entries (fetched server-side via service client to bypass RLS).

5. **Output storage** — Each agent's parsed JSON output is stored in `audit_jobs.agent_outputs` (JSONB, keyed by agent number). Final report stored in `audit_jobs.final_report`.

### The 5 Agents

| # | Name | Model | Max Tokens | Web Searches | Progress Range |
|---|------|-------|-----------|-------------|----------------|
| 1 | SEO/AEO/GEO Auditor | MODEL_DEEP | 16,000 | 5 | 5-25% |
| 2 | Competitive Intel | MODEL_DEEP | 16,000 | 10 | 25-45% |
| 3 | Content Optimizer | MODEL_DEEP | 16,000 | 3 | 45-70% |
| 4 | Off-Page Strategist | MODEL_DEEP | 12,000 | 8 | 70-85% |
| 5 | Report Formatter | MODEL_BATCH (Haiku) | 16,000 | 0 | 85-95% |

**MODEL_DEEP** resolves per-job: reads `audit_jobs.model_used` (set by user's Haiku/Sonnet choice at audit creation). Agent 5 always uses Haiku — it's a formatting pass, not analysis.

**Model resolution code** (`lib/agents/pipeline.ts`):
```typescript
const MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-20250514",
} as const;
// MODEL_DEEP resolved from job.model_used at runtime
// MODEL_BATCH always Haiku (formatting only)
```

### Agent Input/Output Details

**Agent 1 — SEO/AEO/GEO Auditor:**
- Input: Client brief + HTML analysis (meta tags, headings, schema, OG tags)
- Output: `currentSeoState`, `aeoReadiness`, `geoPresence`, `technicalIssues[]`, `contentGaps[]`, `healthScore` (0-100, 15-factor weighted rubric)
- Key insight: HTML pre-fetch gives ground truth that web_search alone cannot provide

**Agent 2 — Competitive Intel:**
- Input: Brief + Agent 1 output
- Output: `competitors[]` (up to 5, each with strengths/weaknesses/metrics), `marketGaps[]`, `benchmarks`, `quickWins[]`
- Uses most web searches (10) for thorough competitive analysis

**Agent 3 — Content Optimizer:**
- Input: Brief + Agent 1 + Agent 2 outputs
- Output: `titleTags[]`, `metaDescriptions[]`, `contentRecommendations[]`, `schemaMarkup` (JSON-LD code), `faqContent[]`, `answerBlocks[]`
- **This is the novel differentiator** — generates actual implementation-ready content, not just recommendations

**Agent 4 — Off-Page Strategist:**
- Input: Brief + all prior agent outputs
- Output: `linkBuilding` (targets, strategies), `citations[]`, `socialStrategy`, `contentDistribution`, `localSeo` (if applicable)

**Agent 5 — Report Formatter:**
- Input: All agent outputs
- Output: Polished Markdown report with executive summary, organized sections, prioritized action items
- Always uses Haiku (cost optimization — formatting doesn't need premium model)
- **Non-fatal** — if Agent 5 fails, pipeline still completes with raw agent data

### Health Score Rubric (15 Factors)

The health score (0-100) in Agent 1's output weights these factors:
1. Title tag optimization (8%)
2. Meta description quality (6%)
3. H1/heading structure (7%)
4. Content depth & relevance (8%)
5. Internal linking (5%)
6. Schema markup presence (7%)
7. Mobile responsiveness signals (6%)
8. Page speed indicators (5%)
9. AEO readiness (FAQ, answer blocks) (8%)
10. GEO presence (AI citation likelihood) (8%)
11. Local SEO signals (5%)
12. Technical SEO (crawlability, indexing) (7%)
13. Content freshness (5%)
14. E-E-A-T signals (8%)
15. Competitive positioning (7%)

### Retry & Error Handling

- Each agent call wrapped in `runAgentWithRetry()` — 2 retries with exponential backoff (2s, 4s)
- JSON output parsing with repair: strips markdown fences, fixes trailing commas, handles truncated JSON
- Agent 5 failure is non-fatal: pipeline saves raw data and marks job completed
- Pipeline-level try/catch: any unhandled error → job status set to `failed` with error message saved to DB
- Stale job cleanup: jobs stuck in non-terminal status for >30 minutes can be detected

---

## 5. Database Schema & File Structure

### Database Tables (Supabase Postgres)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `clients` | Client directory | name, website_url, industry, geography, contact_email |
| `audit_jobs` | Pipeline runs | client_id, status, input_brief (JSONB), agent_outputs (JSONB), final_report, model_used, credits_used, user_id |
| `audit_logs` | Real-time progress | job_id, agent_step, message, log_type, timestamp |
| `user_profiles` | Extends auth.users | email, credits, stripe_customer_id, preferred_model |
| `credit_transactions` | Credit audit trail | user_id, amount, balance_after, type, job_id, model_used |
| `credit_packages` | Pricing tiers | name, credits, price_cents, stripe_price_id, popular, active |

**Migrations** (run in order via Supabase SQL editor):
1. `001_initial_schema.sql` — clients, audit_jobs
2. `002_audit_logs.sql` — audit_logs table
3. `003_formatted_report.sql` — formatted_report column on audit_jobs
4. `004_auth_and_billing.sql` — user_profiles, credit_transactions, credit_packages, RLS policies, auto-profile trigger

### File Structure (Annotated)

```
seo-aeo-geo-app/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout — AuthProvider wrapper, Navigation
│   ├── page.tsx                  # Dashboard — client list, recent audits, quick actions
│   ├── globals.css               # Tailwind CSS imports + custom properties
│   ├── api/                      # Server-side API routes (all force-dynamic)
│   │   ├── jobs/
│   │   │   ├── route.ts          # POST: create job + spawn pipeline
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET: job + logs (bypasses RLS)
│   │   │       └── download/
│   │   │           └── route.ts  # GET: DOCX/MD/CSV/ZIP downloads
│   │   ├── clients/
│   │   │   ├── route.ts          # GET/POST clients
│   │   │   └── [id]/route.ts     # GET/DELETE client + cascade
│   │   ├── autopopulate/route.ts # POST: AI fills form from URL
│   │   ├── parse-upload/route.ts # POST: extract data from uploaded docs
│   │   ├── pipeline/run/route.ts # POST: trigger pipeline (alternative entry)
│   │   └── billing/
│   │       ├── checkout/route.ts # POST: Stripe checkout (placeholder)
│   │       └── transactions/route.ts  # GET: credit history
│   ├── audits/
│   │   ├── new/page.tsx          # Audit creation form (model selector, auto-populate)
│   │   └── [id]/
│   │       ├── page.tsx          # Progress tracker (polling, live logs)
│   │       └── report/page.tsx   # 9-tab report viewer + download buttons
│   ├── clients/
│   │   ├── page.tsx              # Client list with search
│   │   └── [id]/page.tsx         # Client detail + audit history
│   ├── billing/page.tsx          # Pricing, credits balance, transactions
│   ├── login/page.tsx            # Google OAuth login
│   └── auth/callback/route.ts    # OAuth callback handler
│
├── components/
│   ├── navigation.tsx            # Top nav — links, auth state, credits badge
│   └── ui/                       # shadcn/ui-style components
│       ├── badge.tsx, button.tsx, card.tsx, input.tsx,
│       ├── label.tsx, progress.tsx, select.tsx, textarea.tsx
│
├── lib/
│   ├── claude.ts                 # Anthropic client initialization
│   ├── supabase.ts               # Supabase service client (server-side, bypasses RLS)
│   ├── supabase-auth.ts          # Supabase browser client (auth-aware)
│   ├── auth-context.tsx          # React context — user, profile, signIn/Out
│   ├── utils.ts                  # cn() classname merger
│   ├── agents/
│   │   ├── pipeline.ts           # 5-agent orchestration, retry logic, model resolution
│   │   ├── prompts.ts            # All agent system/user prompts
│   │   └── schemas.ts            # Zod schemas for agent outputs
│   ├── reports/
│   │   ├── docx-generator.ts     # Word document generation
│   │   ├── markdown-generator.ts # Markdown report builder
│   │   ├── pdf-generator.ts      # PDF generation (if needed)
│   │   ├── roadmap-csv.ts        # Prioritized task CSV
│   │   └── schema-packager.ts    # JSON-LD ZIP with CMS instructions
│   └── utils/
│       ├── html-fetcher.ts       # Fetch + parse HTML for SEO signals
│       ├── scoring.ts            # Health score calculation
│       └── validators.ts         # Input brief validation (Zod)
│
├── __tests__/                    # Vitest test suite (57 tests)
├── supabase/migrations/          # 4 SQL migration files
├── skill/                        # AI skill reference docs
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript strict mode config
└── vitest.config.ts              # Test configuration
```

---

## 6. Problems Encountered & Solutions

This section documents real issues hit during development and how they were resolved. Read this before making changes — many of these are non-obvious.

### 6.1 Live Output Shows "0 entries / Waiting for pipeline to start"

**Symptom:** Pipeline was running (visible in server logs — all 4 API calls completing), but the progress page showed 0 log entries and "Waiting for pipeline to start."

**Root cause:** Supabase Row-Level Security (RLS). The `audit_logs` table had RLS enabled with policies requiring `auth.uid()` to match. The frontend used the Supabase anon key client, which has `auth.uid() = NULL` for unauthenticated users. RLS silently returns 0 rows instead of an error.

**Fix:** Moved log fetching from the browser (direct Supabase query) to the API route (`/api/jobs/[id]`), which uses `getServiceClient()` — the service role key bypasses RLS. The API now returns `{ ...job, audit_logs: logs }` in a single response, and the frontend polls one endpoint instead of two.

**Lesson:** Any time a Supabase query returns empty results unexpectedly, check RLS policies first. The service client in API routes is the bypass for server-side data access.

### 6.2 Agent JSON Output Parsing Failures

**Symptom:** Agents return valid analysis but wrapped in markdown code fences (` ```json ... ``` `) or with trailing commas, causing `JSON.parse()` to fail.

**Fix:** Multi-layer JSON repair in `pipeline.ts`:
1. Strip markdown code fences (`/```json?\n?/` and trailing ` ``` `)
2. Fix trailing commas before `}` or `]`
3. Handle truncated JSON (close open braces/brackets)
4. Zod schema validation with `.passthrough()` to accept extra fields

**Lesson:** Never trust LLM output to be clean JSON. Always strip, repair, then validate.

### 6.3 Pipeline Runs In-Process (No Job Queue)

**Problem:** `runPipeline()` executes as a fire-and-forget async call inside the API route handler. If the Render server restarts mid-pipeline, the job is abandoned.

**Current mitigation:**
- Jobs stuck in non-terminal status for >30 min can be detected
- Error states are caught and persisted to DB
- Agent 5 is non-fatal — even if formatting fails, raw data is preserved

**Future fix:** Move to Supabase Edge Functions or a dedicated worker process with a proper job queue (pg-boss or similar).

### 6.4 HTML Pre-Fetch vs Web Search Gap

**Problem:** Claude's `web_search` tool returns text snippets from search results — it cannot see the actual HTML source of a page. This means critical SEO signals (existing `<title>`, meta tags, JSON-LD schema, heading hierarchy) were invisible to Agent 1.

**Fix:** Added `html-fetcher.ts` — fetches the actual page HTML before any agent runs, parses it with regex/string extraction for: title, meta description, all headings (h1-h6), JSON-LD blocks, Open Graph tags, canonical URL. This "ground truth" is injected into Agent 1's prompt.

**Lesson:** Web search gives market context; HTML fetch gives on-page reality. Both are needed for accurate SEO analysis.

### 6.5 Model Selection Architecture

**Problem:** Initially, model was hardcoded as a constant (`MODEL_DEEP`). Adding Haiku vs Sonnet choice required per-job model resolution without breaking the existing pipeline.

**Fix:** 
- User selects model on the audit creation form
- Choice stored as `audit_jobs.model_used` (TEXT column)
- Pipeline reads `job.model_used` at runtime and resolves to actual model ID
- Agent 5 always uses Haiku regardless of user choice (it's formatting, not analysis)
- `runAgentWithRetry()` accepts `defaultModel` parameter

### 6.6 Supabase Client Confusion (3 Different Clients)

**Problem:** Multiple Supabase client types needed for different contexts, easy to use the wrong one.

**Resolution — the 3 clients:**
| Client | File | Used In | RLS |
|--------|------|---------|-----|
| `getServiceClient()` | `lib/supabase.ts` | API routes, pipeline | Bypasses RLS (service role key) |
| `createAuthClient()` | `lib/supabase-auth.ts` | Browser components | Subject to RLS (anon key + user JWT) |
| `createServerClient()` | `app/auth/callback/route.ts` | Auth callback only | Cookie-based session exchange |

**Rule:** API routes that read/write data → `getServiceClient()`. Browser components reading user's own data → `createAuthClient()`. Auth flow → `createServerClient()` with cookie handlers.

### 6.7 Delete Client Fails on Foreign Key Constraints

**Symptom:** Deleting a client returned a 500 error because `audit_jobs` references `clients(id)`.

**Fix:** Delete cascade — the client delete API route first deletes all `audit_jobs` for the client, then deletes the client. Could alternatively use `ON DELETE CASCADE` in the FK constraint, but explicit deletion gives more control over cleanup (e.g., future file storage cleanup).

### 6.8 Report Viewer Markdown Rendering

**Problem:** Standard markdown libraries (remark/rehype) caused SSR hydration mismatches and added bundle bloat for a specific output format.

**Fix:** Custom line-by-line markdown parser in the report viewer. Handles headers, bold, lists, code blocks, and tables — the exact subset that agent output uses. No hydration issues, smaller bundle, predictable rendering.

### 6.9 Auto-Populate Rate Limits and Cost

**Problem:** Auto-populate (enter URL → AI fills all form fields) could be expensive if it used the same model as audits.

**Fix:** Auto-populate always uses Haiku with 5 web searches — fast and cheap (~$0.01-0.03 per auto-populate). The prompt is structured to extract specific fields, not do deep analysis.

---

## 7. Cost Optimization & Pricing Analysis

### API Cost Breakdown Per Audit

**Haiku pipeline (~$0.15-0.30):**
| Component | Est. Cost | Notes |
|-----------|----------|-------|
| HTML pre-fetch | $0.00 | Direct HTTP, no API call |
| Agent 1 (5 searches) | $0.03-0.05 | Input: brief + HTML analysis |
| Agent 2 (10 searches) | $0.04-0.08 | Most searches, competitive data |
| Agent 3 (3 searches) | $0.03-0.05 | Generates content, fewer searches |
| Agent 4 (8 searches) | $0.03-0.06 | Link building research |
| Agent 5 (0 searches) | $0.02-0.04 | Formatting only, always Haiku |
| **Total** | **$0.15-0.28** | |

**Sonnet pipeline (~$1.50-3.00):**
Same structure but Agents 1-4 use Sonnet pricing (~5x Haiku). Agent 5 stays on Haiku.

### Cost Optimization Strategies Already Implemented

1. **Agent 5 always uses Haiku** — Report formatting doesn't benefit from premium models. Saves ~$0.20-0.40 per Sonnet audit.

2. **Web search count tuning** — Each agent has a calibrated `max_searches` limit. Agent 2 gets 10 (needs broad competitive data), Agent 3 gets 3 (mainly writing, not researching).

3. **Auto-populate uses Haiku** — The URL-to-form-fill feature always uses the cheapest model. Cost: ~$0.01-0.03 per use.

4. **HTML pre-fetch is free** — Direct HTTP fetch + regex parsing instead of an API call. Extracts ground-truth SEO data at zero cost.

5. **Prompt efficiency** — Agent prompts are structured to produce JSON output, reducing unnecessary prose tokens. Zod schemas enforce output structure so agents don't waste tokens on formatting.

### Future Cost Reduction Opportunities

1. **Prompt caching** — Cache system prompts with Anthropic's prompt caching feature. System prompts are ~2000 tokens each × 5 agents = 10K tokens that could be cached across runs. Savings: ~30-40% on input tokens for repeat audits.

2. **Incremental audits** — For re-runs of the same client, only run agents whose inputs changed. If the website hasn't changed, skip Agent 1 and reuse prior output.

3. **Batch API** — For non-urgent audits, use Anthropic's Batch API for 50% cost reduction. Trade-off: results in ~24 hours instead of real-time.

4. **Token budget enforcement** — Set hard `max_tokens` limits per agent. Currently set to 12K-16K; many agents produce 4K-8K. Tighter limits = faster responses + lower cost.

5. **Output streaming** — Stream agent responses to reduce time-to-first-byte. Currently waits for full response before parsing.

### Pricing Model Analysis

Current pricing vs. API costs:

| Package | Price | Credits | Per-Credit | Haiku Cost | Haiku Margin | Sonnet Cost | Sonnet Margin |
|---------|-------|---------|-----------|-----------|-------------|------------|--------------|
| Starter | $9.99 | 5 | $2.00 | $0.28 | 86% | $3.00 | — |
| Professional | $24.99 | 15 | $1.67 | $0.28 | 83% | $3.00 | — |
| Agency | $69.99 | 50 | $1.40 | $0.28 | 80% | $3.00 | — |

Haiku audits have 80-86% margin. Sonnet audits at 5 credits = $7.00-10.00 value, costing $1.50-3.00 in API fees — still healthy 57-78% margin. The 3 free credits on signup cost ~$0.45-0.84 in API fees (assuming all Haiku).

---

## 8. Report Output Recommendations

### The Problem

The current pipeline generates massive, detailed output — the combined agent outputs can be 15,000-30,000 tokens. This is comprehensive but overwhelming for clients. The data is hard to navigate, action items are buried in analysis, and code deliverables (schema markup, meta tags) are mixed in with strategic recommendations.

### Recommended: Tiered Output Architecture

Structure the final deliverable as four distinct tiers, each serving a different audience and use case:

```
Tier 1: Executive Summary (1-2 pages)
  └── Health score, top 3 wins, top 3 risks, estimated impact, cost to implement
  └── Audience: C-suite, client decision-makers
  └── Generated by: Premium model summarizer (Opus/Sonnet) reading all agent outputs

Tier 2: Strategic Recommendations (5-10 pages)
  └── Prioritized action items grouped by: Quick Wins, Medium-Term, Long-Term
  └── Each item: what to do, why, expected impact, difficulty level
  └── Audience: Marketing managers, SEO team leads
  └── Generated by: Agent 5 (restructured prompt)

Tier 3: Detailed Analysis (current full report)
  └── Complete competitive intel, page-by-page optimization, technical audit
  └── Audience: SEO specialists, developers implementing changes
  └── Generated by: Agents 1-4 (existing output, better organized)

Tier 4: Code Deliverables (separate downloads)
  └── Schema markup (JSON-LD) — ready to paste into CMS
  └── Meta tag updates — title/description for each page
  └── FAQ content blocks — structured Q&A for AEO
  └── robots.txt / sitemap recommendations
  └── Audience: Developers, webmasters
  └── Generated by: Agent 3 output, packaged separately
```

### Implementation: Opus Summarizer Pass

Add an optional "Agent 6" — a summarization pass using a premium model (Opus 4.7 or Sonnet) that reads all agent outputs and produces the Executive Summary (Tier 1) and Strategic Recommendations (Tier 2).

**Proposed flow:**
```
Agents 1-4 (analysis) → Agent 5 (formatting) → Agent 6 (summarization)
                                                  ↓
                                          Executive Summary
                                          + Prioritized Action Plan
                                          + Client-Ready PDF Cover Page
```

**Agent 6 prompt structure:**
- Input: All agent outputs (JSONB), client brief, health score
- Instructions: "You are a senior SEO strategist presenting findings to a client. Produce: (1) A 500-word executive summary highlighting the 3 most impactful opportunities and 3 most critical risks. (2) A prioritized action plan with estimated effort and impact for each item. (3) A 90-day roadmap with weekly milestones."
- Model: Opus 4.7 or Sonnet (user choice at audit creation)
- Max tokens: 8,000
- Web searches: 0 (pure synthesis, no new research)

**Cost of Agent 6:**
- Haiku input (reading all outputs): ~15K-30K input tokens
- Opus output: ~4K-6K output tokens
- Estimated cost: $0.30-0.80 per audit (Opus) or $0.08-0.15 (Sonnet)
- Could be an optional premium add-on (e.g., +2 credits)

### Implementation: Separate Code Deliverables

Break Agent 3's output into distinct downloadable packages:

1. **Schema Package (existing)** — JSON-LD files with `<script>` wrappers + CMS-specific installation instructions (WordPress, Shopify, Squarespace, Wix). Already implemented as ZIP download.

2. **Meta Tag Package (new)** — CSV/spreadsheet with columns: Page URL, Current Title, Recommended Title, Current Description, Recommended Description, Priority. Directly importable into CMS bulk editors or Screaming Frog.

3. **Content Package (new)** — FAQ content blocks, answer-optimized paragraphs, and featured snippet targets as separate Markdown files. Each piece labeled with target page and target keyword.

4. **Technical Fixes Package (new)** — From Agent 1's technical issues: specific code changes needed (canonical tags, hreflang, structured data fixes), formatted as a developer task list with before/after code.

### UI Changes for Tiered Output

Update the report viewer to reflect the tiered structure:

```
Tab layout (current 9 tabs → restructured):
  [Summary]  [Action Plan]  [Full Report ▾]  [Downloads ▾]
                               ├── Competitive Intel
                               ├── Page Optimization
                               ├── Technical Audit
                               ├── Off-Page Strategy
                               └── Measurement
                                            ├── Schema ZIP
                                            ├── Meta Tags CSV
                                            ├── Content Package
                                            ├── Roadmap CSV
                                            └── Full DOCX
```

The Summary tab becomes the default landing — clients see the executive summary first, then drill down into details as needed.

---

## 9. Future Design Considerations

### Priority Roadmap

**P0 — Ship blockers (do before launch):**
- [ ] Enforce credit deduction on audit creation (currently tracked but not enforced)
- [ ] Connect Stripe checkout with `STRIPE_SECRET_KEY` for real payments
- [ ] Add webhook handler for Stripe payment confirmation → credit grant
- [ ] Rate limiting on API routes (prevent abuse of free credits)

**P1 — High value improvements:**
- [ ] Implement Agent 6 (Opus summarizer) for executive summaries (see Section 8)
- [ ] Separate code deliverables (meta tag CSV, content package, tech fixes)
- [ ] Prompt caching for 30-40% input token cost reduction
- [ ] Email delivery of completed reports (user enters email, gets report link)
- [ ] Webhook/callback URL for API-first usage (agency integrations)

**P2 — Scale and reliability:**
- [ ] Move pipeline to background worker (pg-boss or Supabase Edge Functions)
- [ ] Add Redis for job queue and rate limiting
- [ ] Implement incremental audits (skip unchanged agents on re-runs)
- [ ] Add retry UI — let users retry failed jobs without re-entering data
- [ ] Multi-tenant support — agency accounts managing multiple client workspaces

**P3 — Growth features:**
- [ ] White-label reports (custom branding, logo, colors)
- [ ] Scheduled audits (monthly monitoring with diff reports)
- [ ] API access tier for programmatic audit submission
- [ ] Competitor tracking over time (trend charts)
- [ ] Integration with Google Search Console and Analytics APIs

### Architectural Decisions to Preserve

1. **Optional auth stays optional** — The app must always work without login for demos and quick evaluations. Auth gates billing and history, not core functionality.

2. **Service client for all server-side reads** — Never use the anon/auth client in API routes. Always `getServiceClient()`. This avoids the RLS silent-empty-result trap.

3. **Agent 5 is always Haiku** — Formatting doesn't justify premium model cost. This is a deliberate cost optimization, not a bug.

4. **Agent 5 is non-fatal** — If the formatter crashes, the pipeline still completes with raw data. The report viewer handles both formatted and raw output. Don't make Agent 5 failure cascade.

5. **JSON repair is mandatory** — Every agent output goes through strip → repair → parse → validate. Don't skip steps even if outputs "usually" come back clean.

6. **Per-job model resolution** — The model is stored on the job row and read at runtime. Don't fall back to a global constant or environment variable.

7. **HTML pre-fetch before agents** — This runs before Agent 1, not inside it. The fetched HTML is passed as context, not discovered via web_search.

### Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=        # Project URL (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Anon key (public, subject to RLS)
SUPABASE_SERVICE_ROLE_KEY=       # Service key (server-only, bypasses RLS)

# Anthropic
ANTHROPIC_API_KEY=               # Claude API key

# Stripe (optional — billing is placeholder without this)
STRIPE_SECRET_KEY=               # Stripe secret key
STRIPE_WEBHOOK_SECRET=           # Stripe webhook signing secret

# App
NEXT_PUBLIC_APP_URL=             # Public URL (for OAuth redirects)
```

### Testing Checklist

Before deploying changes, verify:
1. `npm run build` — TypeScript compiles without errors
2. `npx vitest run` — All 57 tests pass
3. Build test checks: 30 critical files exist, API routes have `force-dynamic`, model constants are valid
4. Manual test: create audit → watch progress → view report → download DOCX
5. If auth changes: test login → credits display → logout → anonymous access still works

### Development Rules

- All API routes must export `const dynamic = "force-dynamic"` (Next.js caching breaks Supabase queries)
- All Supabase queries in API routes use `getServiceClient()`, never the anon client
- Agent prompts live in `lib/agents/prompts.ts` — don't inline prompts in pipeline.ts
- Agent output schemas live in `lib/agents/schemas.ts` — always validate with Zod
- Test files go in `__tests__/` — naming convention: `{feature}.test.ts`
- UI components follow shadcn/ui patterns in `components/ui/`
- No remark/rehype — use the custom markdown parser in the report viewer
- Tailwind CSS 4 — use `@theme` directive, not `tailwind.config.js` (CSS-first configuration)

---

*Last updated: 2026-04-29. Update this file whenever significant features, architecture changes, or new lessons are learned.*
