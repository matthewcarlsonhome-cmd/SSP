# SEO/AEO/GEO Optimizer — Web Application Design Document

## Version 1.0 | March 2026

---

## 1. Product Vision

A self-contained web application that accepts a client brief (via form entry or file upload), orchestrates a multi-agent AI pipeline against the SEO/AEO/GEO skill, and produces a complete downloadable deliverable package: a full audit report, page-level rewrite specs, generated JSON-LD schema code, backlink/citation acquisition plan, review strategy, and phased implementation roadmap.

**Target user**: An agency team member (like you at SSP) who manages 30-40 client accounts and needs to produce a comprehensive optimization package per client without manually orchestrating each step.

**Core promise**: Upload or enter client info → wait 5-10 minutes → download a complete, implementation-ready optimization package that would take a senior SEO strategist 20-40 hours to produce manually.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Next.js)                │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Client Brief │  │  Dashboard   │  │  Report Viewer    │  │
│  │ Intake Form  │  │  (All Jobs)  │  │  & Download       │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
└─────────┼─────────────────┼────────────────────┼─────────────┘
          │                 │                    │
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER (Next.js API / Express)       │
│                                                             │
│  POST /api/jobs          GET /api/jobs          GET /api/   │
│  (create new audit)      (list all)             jobs/:id    │
│                                                 /download   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  ORCHESTRATION ENGINE                       │
│                                                             │
│  Job Queue (Bull/Redis or Supabase Edge Functions)          │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Agent 1  │  │ Agent 2  │  │ Agent 3  │  │ Agent 4   │  │
│  │ Site     │  │ Compet.  │  │ Page     │  │ Report    │  │
│  │ Crawler  │  │ Analyzer │  │ Optimizer│  │ Generator │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │              │             │               │        │
│       ▼              ▼             ▼               ▼        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Claude API (claude-sonnet-4-6)             │   │
│  │           + Web Search Tool                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                               │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Supabase    │  │  File Store  │  │  Job Queue       │  │
│  │  (Postgres)  │  │  (Supabase   │  │  State Tracking  │  │
│  │              │  │   Storage)   │  │                   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14+ (React) with Tailwind CSS | SSR for dashboard, React for interactive forms, you already know React/TS |
| UI Components | shadcn/ui | Clean, accessible, fast to build with |
| Backend API | Next.js API Routes or standalone Express | Same codebase, serverless-friendly |
| Database | Supabase (Postgres) | You already have the connector, row-level security, real-time subscriptions |
| File Storage | Supabase Storage | Store generated reports, schema files, uploaded briefs |
| AI Orchestration | Claude API (claude-sonnet-4-6) | Best balance of speed, quality, and cost for batch processing |
| Web Search | Claude API web_search tool | Built into API calls, no separate search API needed |
| Site Crawling | Claude API web_fetch (via tool_use) OR server-side fetch + Cheerio | Parse HTML for title tags, schema, heading structure |
| Job Queue | Supabase Edge Functions + pg_cron OR Bull + Redis | Long-running jobs need async processing |
| Report Generation | docx (npm package) for Word, jsPDF for PDF | Downloadable professional documents |
| Auth | Supabase Auth | Email/password for agency team, optional client portal later |
| Deployment | Vercel (frontend) + Supabase (backend) | Free tier gets you started, scales cleanly |

---

## 4. Database Schema (Supabase / Postgres)

```sql
-- Organization / agency
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users (agency team members)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client profiles (reusable across audits)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  business_type TEXT,
  industry TEXT,
  target_geography TEXT,
  primary_goal TEXT,
  gbp_url TEXT,
  gbp_review_count INTEGER,
  gbp_average_rating DECIMAL(2,1),
  cms_platform TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Competitors linked to a client
CREATE TABLE client_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT,
  website_url TEXT NOT NULL,
  review_count INTEGER,
  average_rating DECIMAL(2,1),
  notes TEXT
);

-- Target keywords for a client
CREATE TABLE client_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  search_intent TEXT CHECK (search_intent IN (
    'informational', 'commercial', 'transactional', 'navigational', 'local'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  current_ranking INTEGER,
  notes TEXT
);

-- Audit jobs (each run of the optimizer)
CREATE TABLE audit_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  created_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'crawling', 'analyzing_competitors', 'optimizing_pages',
    'generating_report', 'completed', 'failed'
  )),
  progress INTEGER DEFAULT 0,           -- 0-100 percentage
  current_step TEXT,                     -- Human-readable status message
  
  -- Input overrides for this specific run
  input_brief JSONB,                     -- Full brief data as submitted
  uploaded_file_path TEXT,               -- Path to uploaded brief document
  
  -- Agent outputs (stored as JSONB for flexibility)
  site_crawl_results JSONB,              -- Phase 1A output
  competitor_analysis JSONB,             -- Phase 1B-1C output
  gap_analysis JSONB,                    -- Phase 1D-1E output
  topical_architecture JSONB,            -- Phase 2 output
  page_optimizations JSONB,              -- Phase 3 output (array of page specs)
  technical_audit JSONB,                 -- Phase 4 output
  offpage_strategy JSONB,               -- Phase 5 output
  roadmap JSONB,                         -- Phase 6 output
  measurement_framework JSONB,           -- Phase 7 output
  
  -- Generated file paths
  report_docx_path TEXT,                 -- Word document report
  report_pdf_path TEXT,                  -- PDF report
  schema_zip_path TEXT,                  -- ZIP of all JSON-LD files
  roadmap_csv_path TEXT,                 -- CSV/spreadsheet roadmap
  full_package_zip_path TEXT,            -- Everything bundled
  
  -- Metadata
  total_pages_audited INTEGER,
  total_tokens_used INTEGER,
  estimated_cost DECIMAL(8,4),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual page audit results (one row per page per job)
CREATE TABLE page_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES audit_jobs(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  page_title TEXT,
  page_type TEXT,                         -- homepage, service, blog, about, location, etc.
  health_score INTEGER,                   -- 0-100 from scoring rubric
  cluster_role TEXT,                      -- pillar, cluster, supporting, standalone
  primary_keyword TEXT,
  search_intent TEXT,
  
  -- Current state
  current_title_tag TEXT,
  current_meta_description TEXT,
  current_h1 TEXT,
  current_word_count INTEGER,
  current_schema_types TEXT[],
  has_answer_block BOOLEAN DEFAULT false,
  has_faq_section BOOLEAN DEFAULT false,
  
  -- Recommendations (stored as JSONB for rich structure)
  optimization_spec JSONB,               -- Full page optimization template output
  generated_schema_code TEXT,             -- Ready-to-paste JSON-LD
  recommended_title TEXT,
  recommended_meta TEXT,
  recommended_h1 TEXT,
  answer_block_text TEXT,                 -- Written answer block content
  heading_structure JSONB,               -- Full H2/H3 hierarchy
  content_requirements JSONB,
  internal_linking_plan JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Backlink opportunities identified
CREATE TABLE link_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES audit_jobs(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  target_domain TEXT,
  opportunity_type TEXT,                  -- intersection, local, industry, content, unlinked_mention
  priority TEXT DEFAULT 'medium',
  links_to_competitors TEXT[],           -- Which competitors this site links to
  outreach_approach TEXT,                 -- Suggested pitch angle
  status TEXT DEFAULT 'identified',       -- identified, contacted, secured, declined
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Citation/directory tasks
CREATE TABLE citation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES audit_jobs(id) ON DELETE CASCADE,
  directory_name TEXT NOT NULL,
  directory_url TEXT,
  current_status TEXT,                    -- missing, inconsistent, correct, needs_update
  priority TEXT DEFAULT 'medium',
  action_needed TEXT,                     -- create, update, fix_nap, merge_duplicate
  notes TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Client Brief Intake Form — UI Specification

The form is the entry point. Design for two modes: **direct entry** (filling out form fields) and **upload** (drag-drop a document that gets parsed).

### 5A. Form Layout

```
┌─────────────────────────────────────────────────────────────┐
│                  NEW CLIENT AUDIT                           │
│                                                             │
│  ┌─── Tab: Enter Details ───┐  ┌─── Tab: Upload Brief ───┐ │
│  │                          │  │                          │ │
│  │  [Active form fields]    │  │  [Drag & drop zone]      │ │
│  │                          │  │  Supports: .docx, .pdf,  │ │
│  │                          │  │  .txt, .csv, .xlsx       │ │
│  └──────────────────────────┘  └──────────────────────────┘ │
│                                                             │
│  ═══════════════════════════════════════════════════════     │
│  REQUIRED FIELDS                                            │
│  ─────────────────────────────────────────────────────      │
│                                                             │
│  Client Name          [________________________]            │
│  Website URL          [________________________] [Validate] │
│  Business Type        [________________________]            │
│  Industry             [▼ Dropdown: Home Services, Legal,    │
│                          Medical, E-commerce, SaaS,         │
│                          Restaurant, Real Estate, Auto,     │
│                          Financial, Other: _________ ]      │
│  Target Geography     [________________________]            │
│                       [+ Add additional service areas]      │
│  Primary Goal         (○) Leads  (○) Sales  (○) Calls      │
│                       (○) Foot Traffic  (○) Brand Awareness │
│                                                             │
│  ═══════════════════════════════════════════════════════     │
│  COMPETITORS (auto-discovered if left blank)                │
│  ─────────────────────────────────────────────────────      │
│                                                             │
│  Competitor 1  URL [_______________] Name [___________]     │
│  Competitor 2  URL [_______________] Name [___________]     │
│  Competitor 3  URL [_______________] Name [___________]     │
│  [+ Add competitor]                                         │
│                                                             │
│  ═══════════════════════════════════════════════════════     │
│  TARGET KEYWORDS                                            │
│  ─────────────────────────────────────────────────────      │
│                                                             │
│  [Keyword input with tag chips]                             │
│  Type keyword + Enter to add. Drag to reorder by priority.  │
│                                                             │
│  ┌──────────────────┬──────────┬──────────────────────┐     │
│  │ Keyword          │ Priority │ Current Ranking      │     │
│  ├──────────────────┼──────────┼──────────────────────┤     │
│  │ pool builder     │ ▼ High   │ [__] (optional)      │     │
│  │ pool renovation  │ ▼ Medium │ [__]                 │     │
│  └──────────────────┴──────────┴──────────────────────┘     │
│                                                             │
│  ═══════════════════════════════════════════════════════     │
│  GOOGLE BUSINESS PROFILE                                    │
│  ─────────────────────────────────────────────────────      │
│                                                             │
│  GBP Claimed?         (○) Yes  (○) No  (○) Unknown         │
│  GBP URL              [________________________]            │
│  Review Count          [____]                               │
│  Average Rating        [____] / 5                           │
│                                                             │
│  ═══════════════════════════════════════════════════════     │
│  ANALYTICS (optional)                                       │
│  ─────────────────────────────────────────────────────      │
│                                                             │
│  Monthly Organic Traffic  [________]                        │
│  Current Conversion Rate  [________] %                      │
│  Top Landing Pages        [multiline text area]             │
│                                                             │
│  ═══════════════════════════════════════════════════════     │
│  ADDITIONAL CONTEXT                                         │
│  ─────────────────────────────────────────────────────      │
│                                                             │
│  CMS Platform         [▼ WordPress, Shopify, Squarespace,  │
│                          Wix, Custom, Other ]               │
│  Known Pain Points    [multiline text area ___________]     │
│  Previous SEO Work    [multiline text area ___________]     │
│  Budget / Capacity    [________________________]            │
│                                                             │
│  Upload Supporting Docs  [Drag & drop zone for GSC exports, │
│                           screenshots, existing audits]     │
│                                                             │
│         [ Cancel ]                    [ Run Audit ▶ ]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5B. Upload Mode — Document Parsing

When a user uploads a brief document instead of filling the form:

1. Accept `.docx`, `.pdf`, `.txt`, `.csv`, `.xlsx`
2. Send the file content to Claude API with a structured extraction prompt:

```
Extract the following fields from this client brief document. Return JSON only.
{
  "client_name": "",
  "website_url": "",
  "business_type": "",
  "industry": "",
  "target_geography": [],
  "primary_goal": "",
  "competitors": [{"name": "", "url": ""}],
  "target_keywords": [{"keyword": "", "priority": ""}],
  "gbp_status": "",
  "analytics": {"monthly_organic": null, "conversion_rate": null},
  "pain_points": "",
  "cms_platform": "",
  "additional_context": ""
}
```

3. Pre-fill the form with extracted values
4. Let the user review, correct, and supplement before submitting
5. Store the original upload as a reference attachment on the job

### 5C. Saved Client Profiles

After the first audit, client data persists. Future audits for the same client pre-populate all fields, so the user only needs to update what changed. The client list becomes a reusable portfolio.

---

## 6. AI Agent Pipeline — Detailed Orchestration

The audit runs as a sequence of specialized Claude API calls, each building on the output of the previous. This is the core intellectual engine.

### Pipeline Overview

```
Job Created (status: pending)
    │
    ▼
┌──────────────────────────────────────┐
│ AGENT 1: Site Crawler & Scorer       │  status: crawling
│ Input: client URL                    │  ~2-3 min
│ Tools: web_search, web_fetch         │
│ Output: site_crawl_results JSON      │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ AGENT 2: Competitor Intelligence     │  status: analyzing_competitors
│ Input: crawl results + keywords +    │  ~3-5 min
│        competitor URLs               │
│ Tools: web_search, web_fetch         │
│ Output: competitor_analysis,         │
│         gap_analysis JSON            │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ AGENT 3: Page Optimizer              │  status: optimizing_pages
│ Input: crawl + competitor + gap      │  ~5-10 min (scales with page count)
│        analysis + SKILL.md context   │
│ Output: page_optimizations array,    │
│         topical_architecture,        │
│         generated schema code        │
│ NOTE: May need multiple API calls    │
│       (one per page or batches of 3) │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ AGENT 4: Off-Page Strategist         │  status: generating_report
│ Input: all prior outputs             │  ~2-3 min
│ Tools: web_search                    │
│ Output: offpage_strategy,            │
│         link_opportunities,          │
│         citation_tasks,              │
│         roadmap, measurement         │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ REPORT GENERATOR (code, not AI)      │  status: generating_report
│ Input: all agent outputs             │  ~30 sec
│ Output: .docx report, .pdf report,   │
│         schema .zip, roadmap .csv,   │
│         full package .zip            │
└──────────────┬───────────────────────┘
               │
               ▼
         Job Complete (status: completed)
```

### Agent Prompt Architecture

Each agent gets a carefully structured system prompt that includes the relevant section of the SKILL.md as context, plus the accumulated outputs from prior agents.

#### Agent 1: Site Crawler & Scorer

```javascript
const agent1SystemPrompt = `
You are an expert SEO technical auditor. You will crawl a client website 
and score every significant page against a standardized rubric.

## Your Task
1. Fetch the homepage and identify all primary navigation links
2. Fetch each primary page (services, about, contact, blog index)
3. Fetch 3-5 blog posts if a blog exists
4. For each page, extract and analyze:
   - Title tag, meta description, H1
   - Heading structure (H2/H3 hierarchy)
   - Approximate word count
   - Presence of FAQ sections, comparison tables, answer blocks
   - Schema markup (look for application/ld+json in the HTML)
   - Internal link count (outbound)
   - Image count and alt text quality
   - Whether content follows answer-first structure
   - Semantic HTML usage
5. Score each page against the Page Health Score rubric (0-100)
6. Flag site-wide technical issues

## Output Format
Return valid JSON only. No markdown, no preamble.
{
  "site_overview": {
    "total_pages_found": number,
    "cms_detected": string,
    "https": boolean,
    "has_sitemap": boolean,
    "robots_txt_issues": [string],
    "ai_bots_blocked": [string],
    "site_speed_indicators": string
  },
  "pages": [
    {
      "url": string,
      "page_type": "homepage|service|product|blog|about|contact|location|other",
      "title_tag": string,
      "meta_description": string,
      "h1": string,
      "heading_structure": [{"level": "h2|h3", "text": string}],
      "word_count_estimate": number,
      "has_answer_block": boolean,
      "has_faq": boolean,
      "has_comparison_table": boolean,
      "schema_types_found": [string],
      "internal_links_out": number,
      "image_count": number,
      "alt_text_quality": "good|partial|poor|missing",
      "health_score": number,
      "score_breakdown": {
        "title_tag": number,
        "meta_description": number,
        "h1": number,
        "answer_block": number,
        "heading_hierarchy": number,
        "content_depth": number,
        "intent_alignment": number,
        "internal_links_in": number,
        "internal_links_out": number,
        "schema": number,
        "eeat": number,
        "faq": number,
        "media": number,
        "freshness": number,
        "geo_extractability": number
      },
      "issues": [string],
      "quick_wins": [string]
    }
  ],
  "technical_flags": [
    {"issue": string, "severity": "critical|high|medium|low", "fix": string}
  ]
}
`;

// API call with web tools enabled
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: agent1SystemPrompt,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ 
      role: "user", 
      content: `Crawl and score this website: ${clientUrl}\n\nBusiness type: ${businessType}\nTarget keywords: ${keywords.join(', ')}\nTarget geography: ${geography}` 
    }]
  })
});
```

#### Agent 2: Competitor Intelligence

System prompt includes the full Phase 1B-1E methodology from the SKILL.md, plus Agent 1's crawl results as context. Uses web_search to find and analyze competitors. Outputs structured gap analysis.

#### Agent 3: Page Optimizer

This is the most token-intensive agent. For sites with many pages, split into batches (3-5 pages per API call). Each call gets:
- The SKILL.md Phase 3 template as system context
- The specific pages to optimize
- The client business info, keyword targets
- The competitor analysis and gap analysis from Agent 2
- Instructions to generate actual JSON-LD schema code (not placeholders)
- Instructions to write actual answer block content (not descriptions of what to write)

**Critical design decision**: Agent 3 must output the actual written content (answer blocks, FAQ answers, recommended headings) — not meta-descriptions of what to write. The output should be implementation-ready.

#### Agent 4: Off-Page Strategist

Gets all accumulated outputs and generates the GBP optimization plan, review strategy, citation tasks, link opportunities, content velocity plan, phased roadmap, and measurement framework.

### Error Handling & Retry Logic

```javascript
async function runAgent(agentConfig, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Update job status
      await updateJobStatus(agentConfig.jobId, agentConfig.statusLabel, 
        agentConfig.progressStart);
      
      const response = await callClaudeAPI(agentConfig);
      
      // Parse and validate output
      const output = parseAgentOutput(response);
      if (!output || !validateOutput(output, agentConfig.schema)) {
        throw new Error(`Invalid output from ${agentConfig.name}`);
      }
      
      // Store results
      await storeAgentOutput(agentConfig.jobId, agentConfig.outputField, output);
      return output;
      
    } catch (error) {
      if (attempt === retries) {
        await updateJobStatus(agentConfig.jobId, 'failed', 0);
        await updateJobError(agentConfig.jobId, 
          `${agentConfig.name} failed after ${retries + 1} attempts: ${error.message}`);
        throw error;
      }
      // Wait before retry (exponential backoff)
      await sleep(2000 * Math.pow(2, attempt));
    }
  }
}
```

### Token Budget & Cost Estimation

| Agent | Est. Input Tokens | Est. Output Tokens | Calls per Job | Est. Cost |
|-------|-------------------|--------------------|--------------:|----------:|
| Agent 1: Crawler | ~4,000 + web results | ~8,000 | 1 | ~$0.15 |
| Agent 2: Competitor | ~12,000 (prior output + web) | ~10,000 | 1-2 | ~$0.25 |
| Agent 3: Page Optimizer | ~15,000 per batch | ~12,000 per batch | 3-8 (varies) | ~$1.00-2.50 |
| Agent 4: Off-Page | ~20,000 (all prior) | ~8,000 | 1 | ~$0.30 |
| **Total per audit** | | | | **~$1.70-3.20** |

With Sonnet pricing. Opus would be 5x more but higher quality. Offer both as options.

---

## 7. Report Generation — Output Package

After all agents complete, a non-AI code module assembles the outputs into downloadable files.

### 7A. Word Document Report (.docx)

Generated using the `docx` npm package. Structure:

```
Cover Page
  - Client Name, Website URL, Report Date, Agency Logo
  
Table of Contents (auto-generated)

1. Executive Summary (1 page)
   - Current state assessment
   - Top 3 opportunities with expected impact
   - Recommended investment and timeline
   
2. Competitive Intelligence (3-5 pages)
   - Competitor overview table
   - Gap analysis matrix (visual table with color coding)
   - SERP feature ownership comparison
   - Review comparison chart
   
3. Topical Authority Architecture (2-3 pages)
   - Topical map visualization (hierarchical list or diagram)
   - Pillar/cluster page inventory
   - Internal linking blueprint
   - New pages needed (prioritized table)

4. Page-by-Page Optimization (variable, 1-2 pages per page)
   - Health score dashboard (color-coded summary of all pages)
   - Full optimization spec per page
   - Recommended title tags table (all pages on one page for quick reference)
   - Written answer blocks (ready to paste)
   
5. Schema Code Package (summary + reference to ZIP)
   - Schema types by page (summary table)
   - Note: Full JSON-LD code in separate files
   
6. Technical Audit (2-3 pages)
   - Issue severity matrix
   - Checklist with status indicators
   
7. Off-Page Strategy (4-6 pages)
   - GBP optimization checklist
   - Review strategy with scripts and templates
   - Citation audit results and action items
   - Link building target list
   - Content calendar (3-month view)
   
8. Implementation Roadmap (2-3 pages)
   - Gantt-style timeline (simplified table format)
   - Week-by-week task list (Months 1-2)
   - Monthly milestones (Months 3-6)
   
9. Measurement Framework (1-2 pages)
   - KPI dashboard template
   - Tracking tool recommendations
   - Reporting cadence
```

### 7B. Schema Code Package (.zip)

A ZIP file containing individual JSON-LD files per page:

```
schema-code/
├── homepage-schema.json
├── services/
│   ├── pool-construction-schema.json
│   ├── pool-renovation-schema.json
│   └── pool-maintenance-schema.json
├── site-wide/
│   ├── organization-schema.json
│   ├── breadcrumb-template.json
│   └── website-schema.json
├── llms.txt
└── README.md (implementation instructions)
```

### 7C. Roadmap Spreadsheet (.csv or .xlsx)

A spreadsheet version of the roadmap suitable for importing into Asana, Monday, or any project management tool:

| Task | Phase | Week | Priority | Assignee Role | Status | Page/URL | Category |
|------|-------|------|----------|---------------|--------|----------|----------|
| Fix robots.txt | Foundation | 1 | Critical | Developer | To Do | Site-wide | Technical |
| Optimize GBP primary category | Foundation | 1 | Critical | SEO Manager | To Do | GBP | Local |
| Rewrite homepage title tag | Sprint | 3 | High | Content Writer | To Do | /homepage | On-Page |

### 7D. Full Package (.zip)

Everything bundled:
```
{client-name}-seo-audit-{date}/
├── {client-name}-SEO-AEO-GEO-Report.docx
├── {client-name}-SEO-AEO-GEO-Report.pdf
├── schema-code/
│   └── (all JSON-LD files)
├── roadmap.csv
├── link-opportunities.csv
├── citation-tasks.csv
└── README.md
```

---

## 8. Frontend Pages & User Flows

### 8A. Dashboard (Home)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  SEO/AEO/GEO Optimizer    [+ New Audit]   [User ▼] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Recent Audits                              [Search] [Filter]│
│  ─────────────────────────────────────────────────────      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ● Blue Lagoon Pools        Mar 6, 2026   Completed  │    │
│  │   Houston, TX | Score: 34/100 → 82/100 projected    │    │
│  │   [View Report] [Download] [Re-run]                 │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ ○ Premier Pool Service     Mar 6, 2026   Running    │    │
│  │   Dallas, TX | Progress: ████████░░ 78%             │    │
│  │   Currently: Optimizing pages (6/11)                │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ ● Desert Oasis Pools       Mar 4, 2026   Completed  │    │
│  │   Phoenix, AZ | Score: 22/100 → 74/100 projected    │    │
│  │   [View Report] [Download] [Re-run]                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Clients (8)                                [Manage ▶]      │
│  ─────────────────────────────────────────────────────      │
│  Quick stats: 8 clients, 12 audits run, avg score 31→77    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8B. Audit Progress (real-time updates via Supabase subscription)

```
┌─────────────────────────────────────────────────────────────┐
│  Audit: Blue Lagoon Pools                                   │
│  Started: 2:34 PM | Elapsed: 4m 22s                        │
│                                                             │
│  ✅ Site Crawl & Scoring ─────────────── 100% (12 pages)   │
│  ✅ Competitor Intelligence ───────────── 100% (4 competitors)│
│  🔄 Page Optimization ────────────────── 67% (8/12 pages)  │
│  ⬚ Off-Page Strategy ─────────────────── Pending           │
│  ⬚ Report Generation ─────────────────── Pending           │
│                                                             │
│  Live Output Preview:                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Currently optimizing: /services/pool-renovation       │  │
│  │ Health Score: 28/100                                  │  │
│  │ Issues found: Missing answer block, no schema,        │  │
│  │   thin content (340 words vs competitor avg 2,100),   │  │
│  │   no FAQ section, title not keyword-optimized         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Estimated time remaining: ~3 minutes                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8C. Report Viewer (post-completion)

Interactive web view of the report with:
- Tab navigation between report sections
- Health score visualization (bar chart or radial gauges per page)
- Expandable/collapsible page optimization specs
- Copy-to-clipboard for individual schema code blocks
- Side-by-side current vs. recommended for title tags, metas
- Download buttons for individual components or full package

---

## 9. Implementation Phases

### Phase 1: MVP (Weeks 1-3)
**Goal**: Working end-to-end pipeline with basic UI

- Supabase project setup (tables, auth, storage)
- Client brief intake form (direct entry only, no upload parsing yet)
- Agent 1 (Site Crawler) with real Claude API integration
- Agent 3 (Page Optimizer) for top 5 pages only
- Basic report generation (Markdown output, not DOCX yet)
- Dashboard showing job status and results
- Download as Markdown

### Phase 2: Full Pipeline (Weeks 4-6)
**Goal**: All agents running, professional output

- Agent 2 (Competitor Intelligence) with web search
- Agent 4 (Off-Page Strategy)
- Full Agent 3 coverage (all pages, batched)
- DOCX report generation with formatting
- Schema code ZIP generation
- Roadmap CSV generation
- Progress tracking with Supabase real-time subscriptions
- Full package download

### Phase 3: Polish & Scale (Weeks 7-10)
**Goal**: Upload parsing, client management, production quality

- Upload brief parsing (DOCX/PDF → Claude extraction → form pre-fill)
- Saved client profiles with re-run capability
- Report viewer web interface
- PDF generation
- Error recovery and retry logic
- Token usage tracking and cost display
- Agency branding customization (logo on reports)
- Asana integration for roadmap task import

### Phase 4: Expansion (Future)
- Batch processing (run audits for all 34 SSP clients)
- Monthly re-audit with delta comparison (what improved, what didn't)
- Google Search Console API integration (pull real data)
- GA4 integration for traffic data
- AI citation monitoring (automated prompt testing across ChatGPT, Perplexity)
- Client portal (share reports with clients via link)
- White-label output (client never sees the tool, only the report)

---

## 10. Key Technical Decisions & Tradeoffs

### Why Sonnet over Opus for agents?
Cost: At 30-40 clients, running Opus on every audit would cost $8-16 per run vs. $1.70-3.20 for Sonnet. Sonnet handles structured extraction and writing extremely well. Offer an "Opus mode" toggle for high-value clients where quality justifies the cost.

### Why sequential agents instead of parallel?
Each agent depends on the output of the prior agent. Agent 3 can't optimize pages without knowing what competitors do. The only parallelism opportunity is within Agent 3 (batch pages simultaneously), which we should exploit.

### Why Supabase over a simpler stack?
You already have the MCP connector. Postgres gives you relational integrity for the client → audit → page_audit → link_opportunity chain. Real-time subscriptions give you live progress updates for free. Storage handles file uploads and generated reports. Auth handles team access. It's the whole backend in one service.

### Why generate actual content (answer blocks, FAQs) instead of just recommendations?
The gap between "add an answer block" and "here is your answer block, paste it" is the gap between a recommendation report and an implementation package. The former sits in a drawer. The latter gets deployed. Every Agent 3 output should be copy-paste ready.

---

## 11. Skill Improvements Integrated (v1 → v2 Delta)

The v2 SKILL.md addresses these critical gaps found in the v1 review:

| Gap in v1 | Added in v2 | Why It Matters |
|-----------|-------------|----------------|
| No page scoring rubric | 15-factor weighted Page Health Score (0-100) | Enables quantitative prioritization across pages |
| No search intent mapping | Full intent classification framework with page-type matching | #1 invisible ranking failure is intent mismatch |
| Topical authority mentioned but no methodology | Full Phase 2: topical map, pillar/cluster architecture, internal linking blueprint | Topical authority is now the primary trust signal, surpassing backlinks |
| Competitor analysis too vague | Structured per-competitor checklist with specific factors to investigate | "They have more content" isn't actionable; "they have 2,100 words with comparison table and 4 FAQs" is |
| AI citation audit said "mentally simulate" | Specific testing protocol with platform-by-platform signals | You need actual evidence, not assumptions |
| No content cannibalization detection | Added to site crawl checklist | Multiple pages targeting same keyword split authority |
| No orphan page detection | Added to technical audit | Pages with zero internal links are invisible to crawlers |
| No index bloat awareness | Added thin/duplicate page identification | Wasted crawl budget dilutes site authority |
| No redirect audit | Added chain, loop, and 302→301 detection | Redirect issues leak link equity |
| No semantic HTML guidance | Added per-page semantic HTML spec | article, section, time, address elements help AI parsing |
| No image SEO | Full image optimization spec per page | File naming, WebP, alt text, lazy loading, image sitemaps |
| Schema output was "list types needed" | Changed to "generate actual JSON-LD code per page" | Implementation-ready vs. recommendation-only |
| Answer blocks said "write one" | Changed to "write the actual content" | The skill now demands real written output |
| No fan-out sub-query coverage | Added per-page fan-out query mapping | AI breaks prompts into sub-searches; your content needs to match those |
| No entity disambiguation | Added cross-platform entity consistency checks | SameAs, consistent descriptions, knowledge graph alignment |
| No agentic AI consideration | Added 2026 agentic AI trend (agents performing multi-step workflows) | Future-proofing for AI agents that compare, check reviews, and initiate contact |
| Missing competitive gap categories | Expanded from 4 questions to 10 specific gap types | More precise gap identification drives more precise action |
| Link building too generic | Added link intersection analysis methodology | "Who links to competitors but not us" is highest-probability link acquisition |
| Content velocity was an afterthought | Elevated to strategic pillar with publishing cadence targets | 25-30 interlinked articles = topical authority threshold |

---

## 12. File Structure

```
seo-aeo-geo-app/
├── app/                              # Next.js app directory
│   ├── layout.tsx                    # Root layout with auth
│   ├── page.tsx                      # Dashboard
│   ├── audits/
│   │   ├── new/page.tsx              # Client brief intake form
│   │   ├── [id]/page.tsx             # Audit progress & results
│   │   └── [id]/report/page.tsx      # Interactive report viewer
│   ├── clients/
│   │   ├── page.tsx                  # Client list
│   │   └── [id]/page.tsx             # Client profile & audit history
│   └── api/
│       ├── jobs/route.ts             # Create / list jobs
│       ├── jobs/[id]/route.ts        # Job status / results
│       ├── jobs/[id]/download/route.ts  # File downloads
│       ├── agents/
│       │   ├── crawler.ts            # Agent 1 logic
│       │   ├── competitor.ts         # Agent 2 logic
│       │   ├── optimizer.ts          # Agent 3 logic
│       │   └── offpage.ts            # Agent 4 logic
│       ├── pipeline/run.ts           # Orchestration engine
│       └── parse-upload/route.ts     # Brief document parser
├── lib/
│   ├── claude.ts                     # Claude API wrapper
│   ├── supabase.ts                   # Supabase client
│   ├── agents/
│   │   ├── prompts.ts                # All agent system prompts
│   │   ├── schemas.ts                # Zod schemas for agent outputs
│   │   └── pipeline.ts               # Sequential agent runner
│   ├── reports/
│   │   ├── docx-generator.ts         # Word report builder
│   │   ├── pdf-generator.ts          # PDF report builder
│   │   ├── schema-packager.ts        # JSON-LD ZIP builder
│   │   └── roadmap-csv.ts            # CSV roadmap builder
│   └── utils/
│       ├── scoring.ts                # Page health score calculator
│       └── validators.ts             # Input validation
├── components/
│   ├── brief-form/                   # Client intake form components
│   ├── dashboard/                    # Dashboard components
│   ├── report-viewer/                # Interactive report viewer
│   └── ui/                           # shadcn/ui components
├── supabase/
│   └── migrations/                   # Database migrations
├── skill/
│   ├── SKILL.md                      # The SEO/AEO/GEO skill (embedded in prompts)
│   └── references/
│       └── schema-templates.md       # Schema templates (used by Agent 3)
└── package.json
```
