# SEO/AEO/GEO Optimizer — Implementation Guide

## Quick Start

```bash
cd seo-aeo-geo-app
npm install
cp .env.example .env.local    # Then fill in your keys
npm run dev                    # Open http://localhost:3000
```

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Supabase Configuration](#3-supabase-configuration)
4. [Anthropic API Setup](#4-anthropic-api-setup)
5. [Running the Application](#5-running-the-application)
6. [Application Architecture](#6-application-architecture)
7. [How the AI Pipeline Works](#7-how-the-ai-pipeline-works)
8. [SKILL v2 Integration](#8-skill-v2-integration)
9. [Report Generation](#9-report-generation)
10. [Deployment](#10-deployment)
11. [Cost Estimates](#11-cost-estimates)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** — [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **A Supabase account** — [Sign up free](https://supabase.com)
- **An Anthropic API key** — [Get one here](https://console.anthropic.com)
- **Git** for version control

---

## 2. Environment Setup

### Step 1: Clone and install

```bash
git clone <your-repo-url>
cd seo-aeo-geo-app
npm install
```

### Step 2: Create your environment file

```bash
cp .env.example .env.local
```

### Step 3: Fill in your environment variables

Open `.env.local` and add your values:

```env
# Supabase — from your project settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...your-service-role-key

# Anthropic — from console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-api03-...your-key
```

**Where to find these values:**

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Project Settings > API > `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Project Settings > API > `service_role` key (keep secret!) |
| `ANTHROPIC_API_KEY` | console.anthropic.com > API Keys > Create Key |

---

## 3. Supabase Configuration

### Step 1: Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization, name the project (e.g., "seo-optimizer"), and set a database password
4. Wait for the project to be provisioned (~2 minutes)

### Step 2: Run the database migration

Option A — **Via Supabase SQL Editor** (easiest):

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click "New query"
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL editor
6. Click "Run"

Option B — **Via Supabase CLI**:

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-id
supabase db push
```

### Step 3: Verify tables created

After running the migration, go to **Table Editor** in Supabase. You should see these tables:

| Table | Purpose |
|-------|---------|
| `organizations` | Agency/team container |
| `users` | Team members |
| `clients` | Client profiles (reusable) |
| `client_competitors` | Competitor URLs per client |
| `client_keywords` | Target keywords per client |
| `audit_jobs` | Each audit run with all AI outputs |
| `page_audits` | Per-page audit results |
| `link_opportunities` | Backlink targets |
| `citation_tasks` | Directory listing tasks |

### Step 4: Enable Realtime (for live audit progress)

1. Go to **Database** > **Replication** in Supabase
2. Find the `audit_jobs` table
3. Enable realtime for `INSERT`, `UPDATE`, and `DELETE`

This enables the live progress tracking on the audit progress page.

### Step 5: Set up authentication (optional for development)

For development, the app works without auth. For production:

1. Go to **Authentication** > **Providers** in Supabase
2. Enable **Email** provider
3. Create your first user via the Auth dashboard or the sign-up flow

---

## 4. Anthropic API Setup

### Step 1: Get your API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to **API Keys**
3. Click **Create Key**
4. Copy the key — it starts with `sk-ant-api03-`
5. Add it to your `.env.local` file

### Step 2: Ensure sufficient credits

Each audit costs approximately **$1.70 - $3.20** using Claude Sonnet. The pipeline makes 4-8 API calls per audit depending on the number of pages.

| Agent | Est. Cost | Notes |
|-------|-----------|-------|
| Site Crawler | ~$0.15 | 1 call with web search |
| Competitor Intel | ~$0.25 | 1-2 calls with web search |
| Page Optimizer | ~$1.00-2.50 | 3-8 calls (batches of 5 pages) |
| Off-Page Strategy | ~$0.30 | 1 call |

### Step 3: Enable web search (required)

The pipeline uses Claude's `web_search` tool to crawl sites and research competitors. This is included in the standard API — no additional setup needed.

---

## 5. Running the Application

### Development mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll see the Dashboard with demo data.

### Production build

```bash
npm run build
npm start
```

### What you'll see

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Overview of all audits with stats |
| New Audit | `/audits/new` | Client brief intake form |
| Audit Progress | `/audits/[id]` | Live progress during audit |
| Report Viewer | `/audits/[id]/report` | Interactive report with tabs |
| Clients | `/clients` | Client portfolio grid |
| Client Profile | `/clients/[id]` | Individual client + audit history |

---

## 6. Application Architecture

```
seo-aeo-geo-app/
├── app/                              # Next.js App Router pages
│   ├── layout.tsx                    # Root layout + navigation
│   ├── page.tsx                      # Dashboard (home)
│   ├── globals.css                   # Tailwind theme + global styles
│   ├── audits/
│   │   ├── new/page.tsx              # Client brief intake form
│   │   ├── [id]/page.tsx             # Audit progress (real-time)
│   │   └── [id]/report/page.tsx      # Interactive report viewer
│   ├── clients/
│   │   ├── page.tsx                  # Client list grid
│   │   └── [id]/page.tsx             # Client profile + history
│   └── api/
│       ├── jobs/route.ts             # POST (create) / GET (list) jobs
│       ├── jobs/[id]/route.ts        # GET job details
│       ├── jobs/[id]/download/route.ts  # File downloads (DOCX, CSV, ZIP)
│       ├── pipeline/run/route.ts     # Trigger the AI pipeline
│       └── parse-upload/route.ts     # Document upload parser
├── components/
│   ├── navigation.tsx                # Top nav bar
│   └── ui/                           # Reusable UI components
│       ├── button.tsx, card.tsx, input.tsx, badge.tsx,
│       ├── progress.tsx, select.tsx, textarea.tsx, label.tsx
├── lib/
│   ├── claude.ts                     # Claude API wrapper
│   ├── supabase.ts                   # Supabase client + types
│   ├── utils.ts                      # Utility functions (cn, formatDate, etc.)
│   ├── agents/
│   │   ├── prompts.ts                # All 4 agent system prompts (SKILL v2)
│   │   ├── schemas.ts                # Zod validation for agent outputs
│   │   └── pipeline.ts               # Sequential agent orchestration
│   ├── reports/
│   │   ├── docx-generator.ts         # Word document builder
│   │   ├── pdf-generator.ts          # PDF builder
│   │   ├── roadmap-csv.ts            # CSV exports (roadmap, links, citations)
│   │   └── schema-packager.ts        # JSON-LD ZIP builder
│   └── utils/
│       ├── scoring.ts                # 15-factor health score calculator
│       └── validators.ts             # Input validation (Zod)
├── skill/
│   ├── SKILL.md                      # SEO/AEO/GEO SKILL v2 methodology
│   └── references/
│       └── schema-templates.md       # JSON-LD templates + llms.txt
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Full database schema
├── .env.example                      # Environment variable template
├── package.json                      # Dependencies + scripts
├── tsconfig.json                     # TypeScript config
├── next.config.ts                    # Next.js config
└── postcss.config.mjs                # PostCSS/Tailwind config
```

---

## 7. How the AI Pipeline Works

When a user submits the intake form, this sequence runs:

```
User submits form
       │
       ▼
POST /api/jobs ──────────────────── Creates client + audit_job in Supabase
       │
       ▼
POST /api/pipeline/run ──────────── Triggers async pipeline
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Agent 1: Site Crawler & Scorer                           │
│ • Fetches every page on the client site                  │
│ • Scores each page with 15-factor rubric (0-100)         │
│ • Checks robots.txt, schema, semantic HTML               │
│ • Maps search intent for target keywords                 │
│ • Detects cannibalization, orphans, index bloat          │
│ Output → site_crawl_results (JSONB in audit_jobs)        │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ Agent 2: Competitor Intelligence                         │
│ • Deep-analyzes 3-5 competitors                          │
│ • Content architecture, on-page, authority, GEO/AEO      │
│ • Runs AI citation audit across 5-10 queries             │
│ • Produces 10-type gap analysis                          │
│ Output → competitor_analysis + gap_analysis              │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ Agent 3: Page Optimizer (batched, 5 pages per call)      │
│ • Designs topical authority architecture                 │
│ • For EVERY page, generates:                             │
│   - Optimized title, meta, H1                            │
│   - ACTUAL answer block text (40-60 words)               │
│   - Full heading structure with direct answers           │
│   - ACTUAL FAQ Q&As                                      │
│   - Complete JSON-LD schema code                         │
│   - E-E-A-T signals, image SEO, internal linking plan    │
│   - GEO optimizations (fan-out queries, entity clarity)  │
│ Output → page_optimizations + topical_architecture       │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ Agent 4: Off-Page Strategist                             │
│ • Technical audit checklist with fixes                   │
│ • GBP optimization plan                                  │
│ • Review strategy with velocity targets and scripts      │
│ • Citation/NAP consistency audit                         │
│ • Link building plan (intersection, local, industry)     │
│ • Content velocity plan with 3-month calendar            │
│ • Week-by-week implementation roadmap                    │
│ • Measurement framework (SEO, AEO, GEO, Local KPIs)     │
│ Output → offpage_strategy + roadmap + measurement        │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ Report Generator (code, not AI)                          │
│ • Assembles DOCX report (docx npm package)               │
│ • Generates PDF summary (jsPDF)                          │
│ • Creates schema code ZIP (JSZip)                        │
│ • Exports roadmap CSV (PapaParse)                        │
│ • Bundles full package ZIP                               │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
            Audit Complete!
```

### Real-Time Progress

The audit_jobs table updates progress in real-time. The frontend subscribes via Supabase Realtime to show live updates:

```typescript
// Example: Subscribe to job updates
const subscription = supabase
  .channel('audit-progress')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'audit_jobs',
    filter: `id=eq.${jobId}`
  }, (payload) => {
    setJob(payload.new);
  })
  .subscribe();
```

---

## 8. SKILL v2 Integration

The application implements the complete SEO/AEO/GEO SKILL v2 methodology. Here's how each SKILL phase maps to the codebase:

| SKILL Phase | Implementation | File |
|-------------|---------------|------|
| Phase 1A: Site Crawl & Scoring | Agent 1 system prompt includes full 15-factor rubric | `lib/agents/prompts.ts` |
| Phase 1B: Search Intent Mapping | Agent 2 classifies intent for every keyword | `lib/agents/prompts.ts` |
| Phase 1C: Competitor Deep Analysis | Agent 2 analyzes content, on-page, authority, GEO | `lib/agents/prompts.ts` |
| Phase 1D: AI Citation Audit | Agent 2 tests queries across AI platforms | `lib/agents/prompts.ts` |
| Phase 1E: Gap Synthesis | Agent 2 produces 10-type gap analysis | `lib/agents/prompts.ts` |
| Phase 2: Topical Architecture | Agent 3 designs pillars, clusters, internal linking | `lib/agents/prompts.ts` |
| Phase 3: Page Optimization | Agent 3 generates full spec per page | `lib/agents/prompts.ts` |
| Phase 4: Technical Audit | Agent 4 produces checklist with fixes | `lib/agents/prompts.ts` |
| Phase 5: Off-Page Strategy | Agent 4: GBP, reviews, citations, links, content | `lib/agents/prompts.ts` |
| Phase 6: Roadmap | Agent 4 generates phased week/month plan | `lib/agents/prompts.ts` |
| Phase 7: Measurement | Agent 4 defines KPIs for SEO, AEO, GEO, Local | `lib/agents/prompts.ts` |

### Key SKILL Requirements Verified

The agent prompts enforce these critical SKILL v2 requirements:

- **15-factor Page Health Score (0-100)** with weighted rubric
- **Search intent classification** for every keyword with page-type matching
- **10-type competitive gap analysis** (ranking, depth, format, topical, schema, review, link, freshness, entity, SERP features)
- **AI citation audit** across Google AI Overviews, ChatGPT, Perplexity, Gemini
- **Topical pillar/cluster architecture** with internal linking blueprint
- **ACTUAL written content** for answer blocks, FAQ answers, and heading direct answers
- **ACTUAL generated JSON-LD schema code** (not just type names)
- **Fan-out sub-query mapping** for GEO optimization
- **E-E-A-T signals** per page (author, experience, expertise, authority, trust)
- **Semantic HTML guidance** per page
- **Image SEO** with actual alt text written
- **GBP optimization** with complete field-by-field checklist
- **Review strategy** with velocity targets and coaching scripts
- **Citation/NAP audit** across priority directories
- **Link intersection analysis** (highest-probability targets)
- **Content velocity plan** with 3-month publishing calendar
- **agentic AI readiness** (structured data for AI agents)

---

## 9. Report Generation

### Downloadable Files

| File | Format | Content |
|------|--------|---------|
| Full Report | .docx | 9-section comprehensive report |
| PDF Summary | .pdf | Score overview + technical issues |
| Schema Code | .zip | Individual JSON-LD files per page + llms.txt |
| Roadmap | .csv | Task list importable to Asana/Monday/ClickUp |
| Link Opportunities | .csv | Backlink targets with approach |
| Citation Tasks | .csv | Directory listings with status |
| Full Package | .zip | Everything bundled |

### Report Sections (DOCX)

1. Executive Summary
2. Competitive Intelligence
3. Topical Authority Architecture
4. Page-by-Page Optimization
5. Schema Code Package
6. Technical Audit
7. Off-Page Strategy
8. Implementation Roadmap
9. Measurement Framework

---

## 10. Deployment

### Deploy to Vercel (recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Settings > Environment Variables > Add all from .env.example
```

### Deploy to any Node.js host

```bash
npm run build
npm start        # Starts on port 3000
```

### Required environment variables in production

All variables from `.env.example` must be set in your hosting platform's environment variable settings.

---

## 11. Cost Estimates

### Per Audit

| Component | Cost |
|-----------|------|
| Claude Sonnet (4 agents) | $1.70 - $3.20 |
| Supabase (free tier) | $0.00 |
| Vercel (free tier) | $0.00 |
| **Total per audit** | **~$1.70 - $3.20** |

### Monthly (30-40 clients)

| Scenario | Cost |
|----------|------|
| One audit per client per month | $51 - $128 |
| Supabase Pro (if needed) | $25/mo |
| Vercel Pro (if needed) | $20/mo |
| **Total monthly** | **~$96 - $173** |

### Opus Mode (higher quality)

Toggle to Claude Opus for high-value clients. Cost is ~5x Sonnet.

---

## 12. Troubleshooting

### "NEXT_PUBLIC_SUPABASE_URL is not set"
Make sure `.env.local` exists and has the correct values. Restart the dev server after changing env vars.

### "ANTHROPIC_API_KEY is not set"
The API key must be set in `.env.local`. It starts with `sk-ant-api03-`.

### "Claude API error (429)"
Rate limited. The pipeline includes exponential backoff retry logic. If persistent, check your API usage limits.

### "Pipeline failed — Invalid output"
An agent returned malformed JSON. The pipeline retries twice automatically. Check the `error_message` field on the audit_job record in Supabase.

### Pages not loading
Run `npm run build` to check for TypeScript errors. Common issues:
- Missing imports
- Type mismatches in Supabase queries

### Supabase RLS blocking queries
During development, you can temporarily disable RLS:
```sql
ALTER TABLE audit_jobs DISABLE ROW LEVEL SECURITY;
```
Re-enable for production with proper policies.

---

## Development Phases

### Phase 1: MVP (Current)
- Client brief intake form
- 4-agent AI pipeline with SKILL v2 methodology
- Dashboard with job tracking
- Report viewer with tabs
- DOCX, CSV, ZIP downloads
- Supabase database with full schema

### Phase 2: Full Pipeline
- Supabase Realtime progress tracking (wiring frontend subscriptions)
- Upload brief parsing (DOCX/PDF via Claude extraction)
- Full report generation (all DOCX sections populated)
- PDF generation with charts
- Auth integration (login/signup)

### Phase 3: Polish & Scale
- Saved client profiles with pre-populated re-runs
- Batch processing (all clients at once)
- Monthly re-audit with delta comparison
- Agency branding on reports
- Client portal (shareable report links)

### Phase 4: Expansion
- Google Search Console API integration
- GA4 integration
- AI citation monitoring (automated prompt testing)
- Asana/Monday integration for roadmap import
- White-label output
