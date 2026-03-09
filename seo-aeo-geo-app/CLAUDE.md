# CLAUDE.md — SEO/AEO/GEO Optimizer Project Knowledge Base

> **Review this file at the start of every development session.**
> Last updated: 2026-03-08

---

## 1. Project Overview

The SEO/AEO/GEO Optimizer is a web application built for SSP (a digital marketing agency managing 30-40 client accounts). It accepts a client brief, orchestrates a 4-agent AI pipeline using the Claude API, and produces a complete, implementation-ready SEO/AEO/GEO optimization package.

**Core promise:** Upload or enter client info → wait 5-10 minutes → download a complete optimization package that would take a senior SEO strategist 20-40 hours to produce manually.

**Repository:** `matthewcarlsonhome-cmd/SSP`
**App directory:** `seo-aeo-geo-app/`
**Deployment:** Render (Web Service) + Supabase (database/auth/storage)

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.1.6 |
| Language | TypeScript | 5.9.3 |
| UI | React 19 + Tailwind CSS 4 | |
| Components | Custom (shadcn/ui pattern) + Lucide icons | |
| Database | Supabase (Postgres) | |
| AI | Claude API (Anthropic) | anthropic-version: 2023-06-01 |
| Report Gen | docx, jsPDF, JSZip, PapaParse | |
| Validation | Zod 4 | |
| Auth | Supabase Auth (planned, not yet implemented) | |

---

## 3. Architecture

```
Frontend (Next.js App Router)
├── Dashboard (/) — audit list, stats, stale job cleanup
├── New Audit (/audits/new) — client brief intake form
├── Audit Progress (/audits/[id]) — real-time pipeline status + logs
├── Report Viewer (/audits/[id]/report) — 8-tab interactive report
├── Clients (/clients) — client list with search
└── Client Detail (/clients/[id]) — profile + audit history

API Layer (Next.js API Routes)
├── POST/GET /api/jobs — create/list audit jobs
├── GET /api/jobs/[id] — job detail with relational data
├── DELETE /api/jobs/[id] — delete with cascade
├── GET /api/jobs/[id]/download — DOCX, Markdown, CSV (roadmap/links/citations), Schema ZIP
├── POST /api/pipeline/run — trigger async pipeline
├── POST /api/parse-upload — document parsing via Claude
├── GET/POST /api/clients — client CRUD
└── GET /api/clients/[id] — client detail

AI Pipeline (lib/agents/)
├── pipeline.ts — sequential orchestration engine
├── prompts.ts — all 4 agent system prompts + message builders
└── schemas.ts — Zod validation schemas for agent outputs

Data Layer (Supabase)
├── 10 tables (organizations, users, clients, client_competitors,
│   client_keywords, audit_jobs, page_audits, link_opportunities,
│   citation_tasks, audit_logs)
├── Row-Level Security policies
├── Real-time subscriptions (audit_jobs, audit_logs)
└── Indexes for performance
```

---

## 4. AI Agent Pipeline

The pipeline runs 4 agents sequentially, each building on the output of the previous:

### Agent 1: Site Crawler & Scorer
- **Model:** Configurable (MODEL_DEEP constant)
- **Web searches:** Max 5 (homepage + 2-3 key pages)
- **Max tokens:** 16,000
- **Output:** `site_crawl_results` — pages array with 15-factor health scores (0-100)
- **Key behavior:** Scores against rubric covering title tags, answer blocks, schema, E-E-A-T, GEO extractability

### Agent 2: Competitor Intelligence
- **Model:** MODEL_DEEP
- **Web searches:** Max 5
- **Max tokens:** 16,000
- **Output:** `competitor_analysis` — competitor profiles + 10-type gap analysis + AI citation audit
- **Key behavior:** Searches for competitors, analyzes content architecture, identifies SERP feature gaps

### Agent 3: Page Optimizer (Batched)
- **Model:** MODEL_BATCH (currently Haiku for cost savings)
- **Web searches:** Disabled (works from crawl data)
- **Max tokens:** 16,000 per batch
- **Batch size:** 5 pages per API call
- **Output:** `page_optimizations` — per-page specs with ACTUAL written content
- **Key behavior:** Generates real answer blocks, FAQ answers, JSON-LD schema code, heading structures
- **Resilience:** Skip-on-failure per batch — one failed batch doesn't kill the pipeline

### Agent 4: Off-Page Strategist
- **Model:** MODEL_DEEP
- **Web searches:** Max 3
- **Max tokens:** 32,000
- **Output:** `offpage_strategy`, `roadmap`, `measurement_framework`, `technical_audit`
- **Key behavior:** Synthesizes all prior data into GBP plan, review strategy, link building, roadmap

### Agent 5: Report Formatter
- **Model:** MODEL_DEEP (use Sonnet for production — this is the client-facing output)
- **Web searches:** None
- **Max tokens:** 32,000
- **Output:** `formatted_report` — polished Markdown with narrative prose, tables, step-by-step implementation checklists
- **Key behavior:** Takes raw JSON from all prior agents and transforms it into a professional, readable report
- **Non-fatal:** If Agent 5 fails, the pipeline still completes — raw data is available via the structured report viewer tabs
- **Why it exists:** Eliminates the "run raw output through a separate Claude session" step. Agent 5 produces the polished report automatically.

### Pipeline Timing Constants
```
BATCH_SIZE = 5 pages
AGENT_TIMEOUT = 600s (10 min)
BATCH_TIMEOUT = 300s (5 min)
INTER_BATCH_DELAY = 5s
INTER_AGENT_DELAY = 10s
```

### Model Configuration
```typescript
// In lib/agents/pipeline.ts — change these for production vs. testing
const MODEL_DEEP = "claude-haiku-4-5-20251001";   // For agents 1, 2, 4, 5
const MODEL_BATCH = "claude-haiku-4-5-20251001";  // For agent 3 batches

// Production settings (higher quality, higher cost):
// MODEL_DEEP = "claude-sonnet-4-20250514"       // CRITICAL for Agent 5 report quality
// MODEL_BATCH = "claude-haiku-4-5-20251001"     // Keep Haiku for batches to spread rate limit load
```

---

## 5. Database Schema

**10 tables** across 3 migrations:

| Table | Purpose |
|-------|---------|
| `organizations` | Agency/team grouping |
| `users` | Team members (references auth.users) |
| `clients` | Reusable client profiles |
| `client_competitors` | Competitors per client |
| `client_keywords` | Target keywords per client |
| `audit_jobs` | Each pipeline run — stores all agent JSONB outputs |
| `page_audits` | Individual page results (one row per page per job) |
| `link_opportunities` | Backlink targets identified by Agent 4 |
| `citation_tasks` | Directory/citation action items |
| `audit_logs` | Real-time pipeline log messages |

**Key design decisions:**
- Agent outputs stored as JSONB on `audit_jobs` for flexibility (schema-free AI output)
- `page_audits` duplicates key fields from JSONB for queryability
- `audit_logs` enables real-time progress streaming via polling
- All tables have RLS policies scoped to organization membership
- Migrations in `supabase/migrations/` — run manually via Supabase SQL editor

---

## 6. File Structure

```
seo-aeo-geo-app/
├── app/
│   ├── layout.tsx                          # Root layout with navigation
│   ├── page.tsx                            # Dashboard
│   ├── globals.css                         # Tailwind + custom styles
│   ├── audits/
│   │   ├── new/page.tsx                    # Client brief intake form
│   │   └── [id]/
│   │       ├── page.tsx                    # Audit progress view
│   │       └── report/page.tsx             # 8-tab report viewer
│   ├── clients/
│   │   ├── page.tsx                        # Client list
│   │   └── [id]/page.tsx                   # Client profile
│   └── api/
│       ├── jobs/route.ts                   # POST create / GET list
│       ├── jobs/[id]/route.ts              # GET detail / DELETE
│       ├── jobs/[id]/download/route.ts     # File downloads
│       ├── pipeline/run/route.ts           # Trigger pipeline
│       ├── parse-upload/route.ts           # Document parsing
│       ├── clients/route.ts                # Client CRUD
│       └── clients/[id]/route.ts           # Client detail
├── components/
│   ├── navigation.tsx                      # Top nav bar
│   └── ui/                                 # shadcn-style components
│       ├── badge.tsx, button.tsx, card.tsx
│       ├── input.tsx, label.tsx, select.tsx
│       ├── progress.tsx, textarea.tsx
├── lib/
│   ├── claude.ts                           # Claude API wrapper with retry/logging
│   ├── supabase.ts                         # Supabase client + types + stale cleanup
│   ├── utils.ts                            # cn() utility
│   ├── agents/
│   │   ├── pipeline.ts                     # Pipeline orchestration engine
│   │   ├── prompts.ts                      # All 5 agent prompts + message builders
│   │   └── schemas.ts                      # Zod output validation schemas
│   ├── reports/
│   │   ├── docx-generator.ts               # Word report builder
│   │   ├── markdown-generator.ts           # Markdown report (Agent 5 or fallback)
│   │   ├── pdf-generator.ts                # PDF summary builder
│   │   ├── schema-packager.ts              # JSON-LD ZIP with CMS instructions
│   │   └── roadmap-csv.ts                  # CSV exports (roadmap, links, citations)
│   └── utils/
│       ├── scoring.ts                      # Health score calculator
│       └── validators.ts                   # Input validation
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql          # Core 9 tables + RLS + indexes
│       ├── 002_audit_logs.sql              # audit_logs table
│       ├── 003_formatted_report.sql        # formatted_report TEXT column on audit_jobs
│       └── 004_auth_and_billing.sql        # user_profiles, credit_transactions, credit_packages
├── skill/
│   └── references/schema-templates.md      # JSON-LD schema templates
├── package.json
├── next.config.ts
├── tsconfig.json
└── .env.example
```

---

## 7. Environment Variables

```bash
# Required — set in Render dashboard under Environment
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional — for Stripe billing (not required for demo)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is used server-side only (in pipeline and API routes) to bypass RLS. Never expose it to the client.

---

## 8. Problems Encountered & Solutions

### Problem 1: Hardcoded Demo Data Persisting in UI
**Symptom:** Dashboard and pages showed "Blue Lagoon Pools" demo data even after connecting to real database.
**Root cause:** Initial build included hardcoded sample data in page components for UI development.
**Solution:** Removed ALL hardcoded data from every page. Added proper loading states, error states, and empty states. All pages now fetch from API endpoints backed by Supabase.
**Commit:** `a81a009` — "Remove all hardcoded demo data"

### Problem 2: Next.js Route Caching Serving Stale Data
**Symptom:** After running an audit, the dashboard still showed old data. Hard refresh fixed it.
**Root cause:** Next.js aggressively caches API route responses and fetch() calls by default.
**Solution:** Added `export const dynamic = 'force-dynamic'` to ALL API route handlers. Added `cache: 'no-store'` to ALL client-side `fetch()` calls.
**Commit:** `589a3ca` — "Fix persistent cached data"
**Rule:** Every new API route MUST include `export const dynamic = 'force-dynamic'`. Every new `fetch()` call MUST include `{ cache: 'no-store' }`.

### Problem 3: Claude API Rate Limiting (429 Errors)
**Symptom:** Pipeline failed mid-run with 429 rate limit errors, especially during Agent 1 and page optimization batches.
**Root cause:** Agent 1 was performing 15-20+ web searches per call (220K+ input tokens), burning the entire per-minute token budget in one call. Subsequent agents hit rate limits.
**Solution (multi-step):**
1. Added `max_uses` to web_search tool: Agent 1 (5), Agent 2 (5), Agent 4 (3)
2. Reduced Agent 1 scope to homepage + 2-3 key pages (not exhaustive crawl)
3. Added efficiency instructions to agent prompts
4. Added inter-agent delay (10s) and inter-batch delay (5s)
5. Moved Agent 3 to Haiku model to spread load across rate limit pools
6. Removed pretty-printed JSON from context (30-40% token savings)
7. Summarized prior agent output instead of passing full JSON
8. Disabled web_search on Agent 3 (works from crawl data only)
9. Added retry with `Retry-After` header for 429, exponential backoff for 529
**Commits:** `6bdb817`, `451f8bb`, `b52ba66`
**Result:** ~75% reduction in per-run token usage (850K → ~200K tokens)

### Problem 4: Truncated JSON from Agent Responses
**Symptom:** Agents returned invalid JSON, causing pipeline failures. Particularly Agent 3 (page optimizer) and Agent 4 (off-page strategist).
**Root cause:** Agent output exceeded `max_tokens` limit. Response was cut mid-JSON with `stop_reason: "max_tokens"`.
**Solution:**
1. Increased max_tokens: Agent 1 & 3 to 16K, Agent 4 to 32K
2. Built a JSON repair function (`repairTruncatedJson`) that detects when `stop_reason === "max_tokens"` and auto-closes open brackets/braces/strings
3. Pipeline logs a warning when output was truncated so users know data may be incomplete
**Commit:** `fa910af` — "Fix truncated JSON failures"
**Location:** `lib/claude.ts:183-256`

### Problem 5: Supabase Realtime Not Delivering Updates
**Symptom:** Audit progress page stuck on "Initializing audit..." even though pipeline was running. Logs not appearing.
**Root cause:** Supabase Realtime requires specific project configuration that may not be enabled. The subscription was silently failing.
**Solution:** Replaced Supabase Realtime subscriptions with 5-second polling interval for both job status and audit logs. More reliable, works with any Supabase config.
**Commit:** `fa910af`
**Note:** If Supabase Realtime is properly configured in the future, polling can be replaced with subscriptions for lower latency.

### Problem 6: Phantom "Running" Jobs After Server Restart
**Symptom:** Jobs showed as "running" on the dashboard even though no pipeline was actually executing. Occurred after server restarts/redeployments.
**Root cause:** Pipeline runs in-process. When the server restarts, running jobs are abandoned but their status remains non-terminal in the database.
**Solution:** Added `cleanupStaleJobs()` function that runs on first dashboard load. It marks any non-terminal jobs older than 10 minutes as "failed" with a message to re-run.
**Commit:** `580b3c8` — "Add audit management"
**Location:** `lib/supabase.ts:74-99`

### Problem 7: High API Costs During Development
**Symptom:** Each test audit cost $1.50-3.00 using Sonnet, adding up quickly during debugging.
**Solution:** Added dual model constants (`MODEL_DEEP` and `MODEL_BATCH`) in `pipeline.ts`. Set both to `claude-haiku-4-5-20251001` for testing (~10x cheaper). Switch `MODEL_DEEP` to `claude-sonnet-4-20250514` for production quality.
**Commit:** `92d0f97` — "Switch all agents to Haiku for cheap testing"
**Rule:** Always use Haiku during development/debugging. Only switch to Sonnet for production or quality testing.

### Problem 8: No Visibility into API Calls During Debugging
**Symptom:** When pipeline failed, impossible to tell which agent failed, what it sent, or what it received.
**Solution:** Added comprehensive logging to `callClaude()`: request body size, model, max_tokens, tools, response timing, token counts (per-call and cumulative), content block types, web search count, first 500 chars preview.
**Commit:** `0924172` — "Add detailed API request/response logging"
**Location:** `lib/claude.ts:37-167`

### Problem 9: Unformatted, Unusable Raw Output
**Symptom:** Report viewer displayed huge unformatted blocks of JSON data. Users had to copy raw output into a separate Claude Opus session to get a polished report.
**Root cause:** No formatting layer existed between raw JSON agent output and the UI. The `renderJsonSection()` helper was doing `JSON.stringify()` on nested objects.
**Solution (multi-part):**
1. Added **Agent 5 (Report Formatter)** — transforms raw JSON from all 4 agents into polished Markdown with narrative prose, tables, and step-by-step implementation guides
2. Added **markdown-generator.ts** — code-generated fallback if Agent 5 fails, ensuring reports are always formatted
3. **Rebuilt the entire report viewer** — replaced generic JSON dumper with structured components: per-page implementation checklists (Steps 1-9), character count validation, schema code blocks with copy buttons, proper tables for all data
4. Added **Schema code with `<script>` wrappers** and CMS-specific installation instructions (WordPress, Shopify, Squarespace, Wix)
5. Added **Markdown export** as a download format
**Key files:** `lib/agents/prompts.ts` (Agent 5 prompt), `lib/agents/pipeline.ts` (Agent 5 execution), `lib/reports/markdown-generator.ts`, `lib/reports/schema-packager.ts`, `app/audits/[id]/report/page.tsx`

---

## 9. Key Design Decisions & Rationale

### Why sequential agents, not parallel?
Each agent depends on the prior agent's output. Agent 3 can't optimize pages without knowing competitor gaps. The only parallelism opportunity is within Agent 3 (batched pages), which we exploit.

### Why JSONB storage for agent outputs?
AI outputs are schema-flexible. Storing as JSONB avoids brittle column mappings that break when prompts evolve. Key fields are duplicated to `page_audits` for queryability.

### Why generate actual content, not just recommendations?
The gap between "add an answer block" and "here is your answer block, paste it" is the gap between a report that sits in a drawer and one that gets deployed. All Agent 3 output is copy-paste ready.

### Why Haiku for Agent 3 batches?
Two reasons: (1) spreading API calls across model rate limit pools reduces 429 errors, and (2) page optimization is more formulaic than the analytical work Agents 1/2/4 do — Haiku handles it well at 1/10th the cost.

### Why polling instead of Supabase Realtime?
Realtime requires specific Supabase project configuration. Polling at 5s intervals is universally reliable and the UX difference is negligible for a progress tracker.

### Why `force-dynamic` on all API routes?
Next.js App Router aggressively caches by default. For a data-driven app where every response depends on current database state, caching causes stale data bugs that are hard to diagnose. The performance cost of `force-dynamic` is negligible for our use case.

---

## 10. Current State & Known Limitations

### Working
- Full 5-agent pipeline executes end-to-end (Agent 5 = Report Formatter)
- **User-selectable AI model** (Haiku or Sonnet) on the audit form with cost comparison
- Dashboard with audit list, stats, delete, re-run
- Client brief intake form with auto-populate from URL and document upload
- Real-time progress tracking with polling + live output logs
- 8-tab interactive report viewer with "Full Report" Markdown tab
- Per-page implementation checklists (Steps 1-9) with character count validation
- Client management (list, detail, search, delete)
- DOCX report generation
- Markdown report generation (Agent 5 polished or code-generated fallback)
- CSV exports: roadmap, link opportunities, citation tasks
- Schema code ZIP with `<script>` wrappers + CMS-specific installation instructions
- Copy buttons on schema code blocks
- Stale job cleanup on dashboard load
- Truncated JSON auto-repair
- Comprehensive API logging
- HTML pre-fetcher for ground-truth SEO signal extraction (schema, meta, headings)
- **Authentication UI** (Google OAuth via Supabase Auth) — optional, app works without login
- **Billing page** with pricing tiers, credit packages, and transaction history UI
- **Navigation** with auth state, credits badge, and Billing link

### Not Yet Implemented
- **Stripe integration:** Checkout route is a placeholder — needs `STRIPE_SECRET_KEY` and webhook for actual payment processing.
- **Credit enforcement:** Credits are tracked but not deducted/enforced on audit creation. App currently allows unlimited runs.
- **PDF report generation:** `pdf-generator.ts` exists but may need refinement.
- **Supabase Realtime:** Replaced with polling. Can be re-enabled when Supabase project is configured.
- **Agency branding:** No logo customization on reports.
- **Batch client processing:** No "run all 34 clients" feature yet.
- **Delta comparison:** No before/after comparison between audit runs.
- **Google Search Console integration:** No real ranking/traffic data.
- **AI citation monitoring:** No automated testing across ChatGPT/Perplexity/etc.
- **Client portal:** No shareable report links for clients.

---

## 11. Development Workflow

### Local Development
```bash
cd seo-aeo-geo-app
cp .env.example .env.local    # Fill in real keys
npm install
npm run dev                   # http://localhost:3000
```

### Deployment (Render)
- **Build command:** `npm run build`
- **Start command:** `npm run start`
- **Environment:** Set all 4 env vars in Render dashboard
- **Branch:** Deploy from `main` or feature branch

### Testing an Audit
1. Go to `/audits/new`
2. Fill in client name, website URL, business type, industry, geography, goal
3. Add at least 1-2 keywords
4. Click "Run Audit"
5. Monitor progress at `/audits/[id]`
6. View results at `/audits/[id]/report`

### Model Selection
Model is now user-selectable on the New Audit form (Haiku or Sonnet). The choice is stored on the `audit_jobs.model_used` column and the pipeline reads it at runtime.

```typescript
// In lib/agents/pipeline.ts — models are resolved per-job:
const MODELS = {
  haiku: "claude-haiku-4-5-20251001",    // ~$0.15-0.30 per audit, 1 credit
  sonnet: "claude-sonnet-4-20250514",    // ~$1.50-3.00 per audit, 5 credits
};
```

---

## 12. Critical Rules for Development

1. **Every API route** must have `export const dynamic = 'force-dynamic'`
2. **Every client-side fetch()** must include `{ cache: 'no-store' }`
3. **Use Haiku models** during development — switch to Sonnet only for production
4. **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to client-side code
5. **Agent prompts** must instruct Claude to return "valid JSON only, no markdown, no preamble"
6. **Web search limits** must be set via `max_uses` on the web_search tool to prevent token budget blowout
7. **Inter-agent delays** (10s) and inter-batch delays (5s) are required to avoid rate limiting
8. **Truncated JSON** is expected — the repair function in `lib/claude.ts` handles it, but agents with large outputs need sufficient `maxTokens`
9. **New database tables** need: RLS policy, index on foreign keys, and addition to `supabase_realtime` publication if polling/subscriptions are needed
10. **Agent 5 (Report Formatter)** must use MODEL_DEEP (Sonnet in production) — it produces the client-facing output. Haiku produces noticeably lower quality reports.
11. **The pipeline runs in-process** (not in a background worker). Long-running audits tie up a server process. If the server restarts, the job is abandoned and `cleanupStaleJobs()` marks it failed on next dashboard load.

---

## 13. Git History Summary

| Date | Commit | Description |
|------|--------|-------------|
| Mar 3 | `a36a819` | Initial repo — Google Campaign Report upload |
| Mar 3 | `af7937d` | Weekly Account Updates analysis from campaign data |
| Mar 6 | `dbd0c00` | Design document upload |
| Mar 6 | `ece77b6` | **Full app build** — 45 files, 8,627 lines. Complete frontend, API, pipeline, report gen |
| Mar 7 | `a81a009` | Remove demo data, add pipeline resilience, real-time streaming, audit_logs |
| Mar 8 | `589a3ca` | Fix Next.js caching — force-dynamic on all routes |
| Mar 8 | `6bdb817` | Fix rate limiting — Haiku for batch optimization |
| Mar 8 | `451f8bb` | Reduce token usage — compact JSON, summarized context, disable unused web search |
| Mar 8 | `580b3c8` | Audit management — delete, re-run, stale job cleanup |
| Mar 8 | `b52ba66` | Cap web searches per agent — max_uses on web_search tool |
| Mar 8 | `0924172` | Add detailed API request/response logging |
| Mar 8 | `92d0f97` | Switch all agents to Haiku for cheap testing |
| Mar 8 | `fa910af` | Fix truncated JSON — repair function, increase max_tokens, polling replaces realtime |
| Mar 8 | — | Agent 5 report formatter, schema packager rewrite, Markdown export, rebuilt report viewer, character count validation |

---

## 14. Estimated API Costs

### Per-Audit Token Usage (Haiku — testing mode)
~200K total tokens → ~$0.15-0.30 per audit

### Per-Audit Token Usage (Sonnet — production mode)
~200K total tokens → ~$1.70-3.20 per audit

### Cost Factors
- Number of pages crawled (Agent 1 scope)
- Number of competitors (Agent 2 web searches)
- Number of pages optimized (Agent 3 batches × batch size)
- Agent 4 output size (32K max_tokens for comprehensive strategy)

---

## 15. Future Roadmap

### Near-term (Next sessions)
- [ ] Add authentication UI (login/signup with Supabase Auth)
- [ ] Wire up file upload mode in brief form
- [ ] Display token usage and cost estimate on completed audits
- [ ] Add model selector (Haiku/Sonnet toggle) in the audit form UI

### Medium-term
- [ ] Batch processing (audit multiple clients in sequence)
- [ ] Delta comparison between audit runs
- [ ] Client portal with shareable report links
- [ ] Google Search Console API integration
- [ ] Agency branding (logo on reports)

### Long-term
- [ ] AI citation monitoring (automated ChatGPT/Perplexity/Gemini testing)
- [ ] GA4 traffic data integration
- [ ] White-label mode for client-facing reports
- [ ] Background job queue (Bull + Redis or Supabase Edge Functions) to replace in-process pipeline
