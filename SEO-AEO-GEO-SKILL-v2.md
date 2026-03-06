---
name: seo-aeo-geo-optimizer
description: >-
  Comprehensive single-shot SEO, AEO, and GEO audit and page-level rewrite system for any website.
  Use whenever the user mentions SEO audit, site optimization, page optimization, ranking improvement,
  content optimization for search, AI search visibility, answer engine optimization, generative engine
  optimization, AEO, GEO, LLMO, featured snippets, schema markup strategy, local SEO, Google Business
  Profile optimization, review strategy, competitor analysis for SEO, or any request to improve organic
  search visibility or AI citation rates. Also trigger when the user provides a URL and asks for
  recommendations to improve traffic, rankings, or visibility. Covers traditional SEO, answer engine
  optimization (snippets and voice), and generative engine optimization (cited by ChatGPT, Perplexity,
  Google AI Overviews, Gemini, Claude). Generates page-by-page rewrite recommendations, competitor gap
  analysis, schema markup, review acquisition strategy, and a prioritized implementation roadmap.
---

# SEO + AEO + GEO Single-Shot Page Optimizer

## Purpose

This skill produces an implementation-ready audit and page-level rewrite plan for every significant page on a client website. It simultaneously addresses three optimization layers:

1. **SEO** — Rankings, technical health, on-page signals, link equity, local visibility, topical authority
2. **AEO** — Featured snippets, People Also Ask, voice search, zero-click answers, knowledge panels
3. **GEO** — Citation by ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude, and agentic AI workflows

The deliverable is a single coordinated package: page rewrites, generated schema code, off-page strategy, and a time-phased roadmap.

---

## Required Inputs

### Tier 1 — Required
- **Client website URL**
- **Business type / industry**
- **Target geography** — City, metro, state, multi-state, national, or international
- **Primary goal** — Leads, e-commerce sales, phone calls, foot traffic, brand awareness

### Tier 2 — Strongly Recommended
- **Top 3-5 competitors** (URLs or names) — Claude will identify via search if not provided
- **Target keywords / services** — Core terms the client wants to own
- **Google Business Profile status** — Claimed? Review count and average rating?
- **Analytics snapshot** — Monthly organic sessions, top pages, conversion rate
- **Known pain points** — Dropped rankings, new site, specific competitor overtaking them

### Tier 3 — Enhancing
- **Google Search Console export** (CSV or screenshots of top queries, pages, coverage)
- **CMS platform** — WordPress, Shopify, Squarespace, custom, headless
- **Existing schema markup** — Any structured data currently deployed
- **Budget and team capacity** — Pages updatable per week, developer availability
- **Previous SEO work** — Past agencies, link building history, content produced

---

## Execution Workflow

### Phase 1: Discovery & Competitive Intelligence

This phase produces the strategic foundation. Every recommendation in later phases traces back to specific findings here. Use web_search and web_fetch aggressively. Do not skip sub-steps or generate generic advice.

#### 1A. Client Site Crawl & Scoring

Fetch the homepage and every primary service/product page, about page, contact page, and 3-5 blog posts. For each page, score against this rubric:

**Page Health Score (0-100 scale):**

| Factor | Weight | Criteria |
|--------|--------|----------|
| Title tag optimization | 8 | Keyword-front-loaded, ≤60 chars, unique, compelling |
| Meta description | 5 | ≤155 chars, contains value prop + CTA, includes target query |
| H1 tag | 5 | Single H1, contains primary keyword, differs from title |
| Answer block present | 10 | 40-60 word direct answer within first 200 words |
| Heading hierarchy | 8 | Logical H2/H3 nesting, H2s as questions where appropriate |
| Content depth | 10 | Word count competitive with ranking pages, covers subtopics |
| Search intent alignment | 10 | Page type matches what Google ranks (informational vs. commercial vs. transactional) |
| Internal links (inbound) | 5 | Receives links from related pages with descriptive anchors |
| Internal links (outbound) | 5 | Links to related pages, no orphan status |
| Schema markup | 8 | Appropriate types implemented and valid |
| E-E-A-T signals | 8 | Author bio, credentials, citations, experience evidence |
| FAQ section | 5 | Present with real customer questions, concise answers |
| Media quality | 3 | Relevant images with descriptive alt text, proper compression |
| Freshness signal | 5 | "Last updated" date, content reflects current year |
| GEO extractability | 5 | Sections standalone, facts cite-ready, entity clarity |

Document findings per page. This score drives prioritization — lowest-scoring high-value pages get optimized first.

**Site-Wide Technical Flags:**
- Crawlability: Check robots.txt for blocked AI bots (GPTBot, ClaudeBot, PerplexityBot, Bingbot)
- Indexation: Look for noindex tags on pages that should be indexed
- Canonical tags: Identify missing or self-referencing canonicals
- HTTPS: Full encryption, no mixed content
- Page speed indicators: Heavy images, render-blocking scripts, excessive DOM
- Mobile viewport: Responsive meta tag present
- Semantic HTML: Proper use of `<article>`, `<section>`, `<nav>`, `<main>`, `<aside>`, `<time>`, `<address>` elements
- JavaScript dependency: Content visible without JS execution (critical for AI crawlers)
- Redirect issues: Chains, loops, 302s that should be 301s
- Image SEO: File naming conventions, WebP/AVIF usage, image sitemap presence
- Orphan pages: Pages with no internal links pointing to them
- Cannibalization: Multiple pages targeting the same keyword

#### 1B. Search Intent Mapping

Before optimizing any page, classify the search intent behind every target keyword. Google ranks different page types for different intents, and misalignment is a common reason pages fail to rank despite good on-page optimization.

**Intent Classification Framework:**

| Intent | User Goal | Page Type That Ranks | Signals |
|--------|-----------|---------------------|---------|
| Informational | Learn something | Blog posts, guides, how-tos, FAQ pages | "what is," "how to," "why," "guide" |
| Commercial Investigation | Compare options before buying | Comparison pages, "best of" lists, reviews | "best," "vs," "review," "top," "comparison" |
| Transactional | Take action / buy | Service pages, product pages, landing pages | "buy," "hire," "cost," "near me," "quote" |
| Navigational | Find a specific site/brand | Homepage, brand pages | Brand name, specific product name |
| Local | Find nearby business | GBP listing, location pages, map pack | "near me," city names, "open now" |

**For each target keyword**: Search it in Google. Look at what page types occupy positions 1-5. If Google ranks comparison articles and you have a service page, you need a comparison article. If Google ranks service pages and you have a blog post, you need a dedicated service page. Mismatched intent is the #1 invisible ranking failure.

#### 1C. Competitor Deep Analysis

For each top 3-5 competitor:

**Content Architecture Analysis:**
- Total indexed pages (site:competitor.com in Google)
- Number and depth of service/product pages vs. client
- Blog publishing frequency (check last 10 blog posts for date range)
- Topical cluster structure — do they organize content around pillar/cluster architecture?
- Content formats the client lacks: calculators, comparison tables, cost guides, video, downloadable resources, interactive tools

**On-Page Analysis (fetch their top-ranking pages):**
- Title tag patterns and keyword placement
- Content length on key pages vs. client's equivalent pages
- Heading structure — question-format H2s? FAQ sections?
- Answer blocks in first 200 words?
- Schema markup types deployed (inspect page source for `application/ld+json`)
- Internal linking density and anchor text patterns
- E-E-A-T signals: author bios, credentials displayed, citations to sources

**Authority Analysis:**
- Review count and average rating on Google (directly check GBP)
- Estimated domain authority indicators (presence on authoritative sites, news mentions)
- Link intersection: Which sites link to multiple competitors but NOT to the client? These are the highest-probability link targets.
- Industry directory presence vs. client
- Social proof: testimonials displayed, case studies, certifications shown

**GEO/AEO Analysis:**
- Does competitor content appear in featured snippets for target queries?
- What content characteristics correlate with snippet ownership? (tables, lists, direct definitions, numbered steps)
- How would AI engines likely process their content vs. client's?

#### 1D. AI Citation Audit — Specific Protocol

Do not "mentally simulate" — run actual searches and analyze results. For 5-10 priority queries:

**Testing Protocol:**
1. Search each query in Google and document: Which sites appear in AI Overviews? Which appear in featured snippets? Which appear in People Also Ask?
2. For each target query, construct the AI prompt version: "What is the best [service] in [city]?" / "How much does [service] cost in [region]?" / "Who should I hire for [service] in [location]?"
3. Document which characteristics the cited sites share: content structure, word count, data density, schema types, freshness, authority signals
4. Identify the specific content gaps: What do cited sites have that the client site lacks?

**Platform-Specific Signals (document which matter for this client):**
- **Google AI Overviews**: Pulls from Google's own index. Strong traditional SEO directly feeds AI Overview visibility. Sites ranking in positions 1-10 are the citation pool.
- **ChatGPT**: Uses web search (SerpAPI/Bing). Favors comprehensive, well-sourced content. Brands mentioned across multiple credible sources get recommended. Displays blue links, maps, product cards.
- **Perplexity**: Indexes content daily. Rewards clarity, recency, cited sources, and factual density. Strong preference for recent timestamps.
- **Gemini**: Integrated with Google Knowledge Graph. Strong GBP signals, entity clarity, and SameAs consistency matter disproportionately.
- **Agentic AI (2026 trend)**: AI agents performing multi-step workflows (comparing options, checking reviews, initiating contact) require structured data, clear pricing/availability, and machine-readable content. Sites optimized for agent consumption will capture growing traffic.

#### 1E. Competitive Gap Synthesis

Produce a structured gap analysis answering these specific questions:

1. **Ranking Gap**: Which keywords do competitors rank for that the client doesn't have pages for?
2. **Content Depth Gap**: Where competitor pages are 2,000+ words and client pages are 300?
3. **Content Format Gap**: What content types (comparison tables, cost guides, calculators, video) do competitors use that the client doesn't?
4. **Topical Authority Gap**: How many interconnected pages does each competitor have per topic cluster vs. client?
5. **Schema Gap**: Which schema types are competitors deploying that the client isn't?
6. **Review Gap**: What is the review count and rating differential?
7. **Link Gap**: Which authoritative sites link to competitors but not the client?
8. **Freshness Gap**: When were competitor pages last updated vs. client pages?
9. **Entity Gap**: How consistently is the client's business entity represented across the web vs. competitors?
10. **SERP Feature Gap**: Which rich results (local pack, featured snippets, PAA, image pack, video carousel, knowledge panel) do competitors occupy?

---

### Phase 2: Topical Authority Architecture

Before optimizing individual pages, design the site's topical architecture. This is the structural layer that determines whether the site builds compounding authority or remains a collection of disconnected pages.

#### 2A. Topical Map

Define the complete topic universe the site should own. For a service business, this typically means:

**Pillar Topics** (one per core service, 3,000-5,000 word comprehensive page):
- Each pillar page covers the full scope of one major service area
- Links to all cluster pages within that topic
- Targets the head keyword (e.g., "pool construction [city]")

**Cluster Pages** (8-15 per pillar, 1,000-2,500 words each):
- Each targets a specific subtopic, long-tail keyword, or question
- Links back to pillar page AND to 2-3 related cluster pages
- Examples for a pool company: "fiberglass vs. concrete pools," "pool cost guide [city]," "pool permits [city]," "best pool shape for small backyard," "pool maintenance schedule," "saltwater vs. chlorine pool"

**Supporting Content** (FAQ pages, cost guides, location pages, seasonal content):
- Fills topical gaps and captures long-tail queries
- Reinforces cluster themes
- Provides AI-citeable factual content (prices, timelines, comparisons)

#### 2B. Internal Linking Blueprint

Design the link architecture before writing content:

- Every cluster page links to its pillar with keyword-rich anchor text
- Pillar pages link to every cluster page in a logical flow
- Cluster pages cross-link to 2-3 related clusters (within and across pillars where relevant)
- Homepage links to all pillar pages
- Service pages link to relevant blog content and vice versa
- No orphan pages — every page receives at least 3 internal links
- Anchor text is descriptive and varied, never "click here" or "learn more"

#### 2C. Content Gap Filling Plan

Based on competitive analysis, list every new page that needs to be created:

| New Page Needed | Type | Target Keyword | Priority | Rationale |
|----------------|------|----------------|----------|-----------|
| [Page title] | [Pillar/Cluster/Support] | [keyword] | [High/Med/Low] | [Why: competitor has it, SERP opportunity, topical gap] |

---

### Phase 3: Page-Level Optimization Matrix

For every existing page AND every new page identified in Phase 2, generate this optimization spec. This is the core deliverable.

#### Page Optimization Template:

```
PAGE: [URL or page title for new pages]
PAGE HEALTH SCORE: [X/100 — from Phase 1A rubric]
SEARCH INTENT: [Informational / Commercial / Transactional / Local]
CLUSTER ROLE: [Pillar / Cluster / Supporting / Standalone]
PRIMARY KEYWORD: [main keyword target]
SECONDARY KEYWORDS: [3-5 supporting terms]
PROMPT TARGETS: [2-3 specific AI prompts this page should be cited for]
FAN-OUT SUB-QUERIES: [3-5 decomposed queries AI will search to answer the prompt targets]

--- TITLE TAG ---
Current: [existing or N/A for new pages]
Recommended: [new title, ≤60 chars, primary keyword front-loaded]
Rationale: [why]

--- META DESCRIPTION ---
Current: [existing]
Recommended: [≤155 chars, includes question framing + value prop + CTA]

--- H1 TAG ---
Recommended: [single H1, contains primary keyword, differs from title tag]

--- ANSWER BLOCK (first 200 words — AEO/GEO critical) ---
[Write the actual 40-60 word answer paragraph. This is not a placeholder — write 
the real content. It must:
- Directly answer the primary query in the first sentence
- Include the business name, service, and location naturally
- Contain a specific fact (price range, timeline, measurement)
- Be extractable as a standalone snippet by any AI engine
- Use plain language, no marketing jargon]

--- HEADING STRUCTURE ---
[Complete H2/H3 hierarchy. H2s should be phrased as questions matching real 
user queries and AI prompts wherever the intent is informational or commercial.]

H2: [Question-format heading matching a real PAA or AI prompt]
  → Direct answer: [2-3 sentence factual answer — this IS the snippet target]
  → Content guidance: [What to cover in 200-400 words, specific points to make]
  H3: [Sub-topic]
  H3: [Sub-topic]
H2: [Next heading]
  → Direct answer: [2-3 sentences]
  → Content guidance: [details]
[...continue for all sections]

--- CONTENT REQUIREMENTS ---
Target word count: [based on competitor page analysis — be specific]
Search intent match: [Confirm the content format matches what Google ranks]

Required elements:
  □ Comparison table: [What to compare — e.g., "fiberglass vs concrete vs vinyl pools"]
  □ Statistics with inline citations: [specific data points to include with sources]
  □ Step-by-step process: [if applicable, what process to walk through]
  □ Cost/pricing information: [ranges, factors that affect cost — critical for GEO]
  □ FAQ section: [5-8 specific questions — write the actual questions]
  □ Author byline: [name, title, credentials, years of experience]
  □ "Last updated" timestamp: [visible on page, updated with every refresh]
  □ Unique first-hand experience: [specific project examples, photos from actual work, case study reference]

--- SCHEMA MARKUP (generate actual JSON-LD) ---
[Do not just list schema types. Generate the complete, ready-to-paste JSON-LD 
code block for this specific page using the client's real business information.
See references/schema-templates.md for base templates.]

Required schema for this page:
  □ [Type 1]: [generated JSON-LD code]
  □ [Type 2]: [generated JSON-LD code]
  □ FAQPage: [generated with the actual FAQ Q&A pairs]

--- E-E-A-T SIGNALS ---
  □ Author: [specific person, their title, credentials]
  □ Experience evidence: [what project photos, case studies, or examples to include]
  □ Expertise signals: [certifications, training, years in business to mention]
  □ Authority signals: [awards, media mentions, industry affiliations]
  □ Trust signals: [review rating, BBB status, license numbers, guarantees/warranties]
  □ External citations: [2-3 specific authoritative sources to reference]

--- SEMANTIC HTML GUIDANCE ---
  □ Wrap main content in <article> or <main>
  □ Use <section> for each major content block
  □ Use <time datetime="YYYY-MM-DD"> for dates
  □ Use <address> for business contact info
  □ Use <figure>/<figcaption> for images with captions
  □ Use HTML <table> for data (never image-based tables)

--- IMAGE SEO ---
  □ Hero image: [description, recommended dimensions]
  □ Supporting images: [count, types — e.g., "3 project photos, 1 process diagram"]
  □ File naming: [descriptive-keyword-filename.webp format]
  □ Alt text: [write actual alt text for each recommended image]
  □ Format: WebP with JPEG fallback, compressed to <100KB where possible
  □ Lazy loading: Apply to below-fold images

--- INTERNAL LINKING ---
Link TO this page from: [specific pages with suggested anchor text]
Link FROM this page to: [specific pages with suggested anchor text]
Cluster relationships: [which pillar this belongs to, which clusters to cross-link]

--- GEO-SPECIFIC OPTIMIZATIONS ---
  □ Every H2 section is self-contained and extractable as a standalone AI citation
  □ Fan-out sub-queries covered: [list specific decomposed queries]
  □ Citation-ready facts present: [specific numbers, prices, timelines, measurements]
  □ Entity clarity: Business name + service + location stated explicitly (not just assumed)
  □ Conversational passages: [at least 2-3 paragraphs written in natural Q&A style for ChatGPT preference]
  □ Structured comparison data: [tables/lists for "X vs Y" and "best X for Y" queries]
  □ Source citations: [inline attribution format, e.g., "According to [Authority], [fact]"]
  □ Cross-platform entity consistency: Page content aligns with GBP description, directory listings, social bios
```

---

### Phase 4: Technical SEO & AI Readiness

Generate a site-wide technical checklist. These are not aspirational — each item should have a current status and specific fix.

#### Crawl & Index Health
- [ ] robots.txt: AI bots NOT blocked (GPTBot, ClaudeBot, PerplexityBot, Bingbot, Googlebot)
- [ ] llms.txt: Created at site root to guide AI crawlers (see references/schema-templates.md for template)
- [ ] XML sitemap: Present, accurate, all important pages included, submitted to GSC
- [ ] Canonical tags: Correct on every page, no conflicting canonicals
- [ ] Index bloat: Identify thin/duplicate/tag/archive pages that waste crawl budget — noindex or consolidate
- [ ] Orphan pages: Every page has ≥3 internal links pointing to it
- [ ] Redirect health: No chains (A→B→C), no loops, 302s converted to 301s where permanent
- [ ] JavaScript rendering: Critical content visible without JS (test with "cache:" or "view source")

#### Core Web Vitals (specific targets)
- [ ] LCP (Largest Contentful Paint): < 2.5 seconds
- [ ] INP (Interaction to Next Paint): < 200 milliseconds
- [ ] CLS (Cumulative Layout Shift): < 0.1
- [ ] TTFB (Time to First Byte): < 800ms
- [ ] Mobile page speed: < 3 seconds total load

#### Site-Wide Schema Strategy
Deploy a complete schema layer. For most service businesses:
- [ ] **LocalBusiness** (specific sub-type) on homepage — with SameAs, areaServed, AggregateRating
- [ ] **Organization** on every page (via @graph nesting)
- [ ] **Service** on each service page — with provider, areaServed, serviceType
- [ ] **FAQPage** on every page containing an FAQ section
- [ ] **HowTo** on process/instructional pages
- [ ] **BreadcrumbList** on every page
- [ ] **Article** or **BlogPosting** on content pages — with author, datePublished, dateModified
- [ ] **WebSite** with SearchAction on homepage (only if site has search function)
- [ ] **Product** on e-commerce product pages
- [ ] **AggregateRating** where legitimate reviews exist
- [ ] **VideoObject** on pages with embedded video

See `references/schema-templates.md` for complete JSON-LD templates.

#### Content Architecture for AI Extractability
- [ ] Every page opens with 40-60 word answer block within first 200 words
- [ ] H2 headings formatted as questions matching real user/AI prompts
- [ ] Each H2 section is self-contained (extractable as standalone citation)
- [ ] Data tables use clean HTML `<table>` markup, never images of tables
- [ ] Statistics include inline citations with source names
- [ ] FAQ sections have proper heading hierarchy AND FAQPage schema
- [ ] Content uses semantic HTML elements (article, section, time, address, figure)
- [ ] No content locked behind tabs, accordions, or JavaScript that AI crawlers can't access

---

### Phase 5: Off-Page & Operational Strategy

#### 5A. Google Business Profile Optimization

For local/service-area businesses, GBP is often the single highest-impact lever. Google treats it as a primary data source for AI Overviews, the local map pack, and voice responses.

**Profile Foundation:**
- Business name: Exact legal name, no keyword stuffing (Google will suspend)
- Primary category: Research competitor categories — this is the #1 local ranking signal
- Secondary categories: All legitimately relevant (max ~10)
- Address: Exact match across all web properties. For SABs, set service area and hide address
- Phone: Dedicated trackable number that matches website
- Hours: Accurate, including special hours for holidays
- Website: Primary URL, not a landing page
- Business description: 750 chars max, naturally include primary services and service area

**Content & Engagement:**
- Services section: Every individual service listed with descriptions
- Products section: Add if applicable with photos and descriptions
- Photos: 15+ high-quality, updated monthly (exterior, interior, team, work in progress, completed projects). Geotag photos to service area.
- Posts: 1-2 per week (offers, tips, project showcases, seasonal content)
- Q&A: Seed 15-20 real customer questions with detailed answers
- Messaging: Enabled, responses within 24 hours (Google monitors and penalizes slow response)
- Booking: Add direct booking/scheduling link if available

#### 5B. Review Strategy

Reviews are now simultaneously a ranking signal, an AI training input, and conversion content. Google AI Overviews literally extract sentences from reviews when summarizing local businesses.

**Velocity Targets:**
- New businesses: 3-5 new reviews per week for first 90 days
- Established businesses: 2-4 new reviews per month minimum
- Competitive threshold: Audit top 3 competitors' review counts and plan to reach parity within 6 months

**Acquisition System:**
1. Generate a direct Google review link from GBP and create a short URL
2. Embed the link in: email signatures, SMS follow-ups, printed cards, invoice footers, website thank-you pages
3. Ask at peak satisfaction: immediately after job completion, problem resolution, or delivery
4. Automate: Send SMS/email follow-up within 2 hours of service completion
5. Train staff script: "We'd really appreciate a Google review — it helps other [homeowners/customers] find us. Can I text you the link right now?"
6. Respond to every review within 24 hours — personalized, specific, never canned

**Review Content Coaching (for AI visibility):**
- Encourage customers to mention: specific service received, location/neighborhood, problem that was solved, and outcome
- Reviews containing service keywords naturally boost ranking for those terms
- Descriptive reviews provide richer AI training data ("They replaced our old pool pump with a variable-speed model and cut our energy bill by 40%")
- Never buy, incentivize, or gate reviews — Google's 2025 spam updates aggressively penalize this

**Multi-Platform Review Strategy:**
Priority platforms beyond Google: Yelp, Facebook, BBB, industry-specific (HomeAdvisor, Houzz, Angi for home services; Healthgrades for medical; Avvo for legal; etc.)

#### 5C. Citation & Entity Consistency

NAP consistency across the web is how you build entity authority — the signal that tells both Google and AI engines "this is a real, established, trustworthy business."

**Priority Directory Submissions:**
1. Google Business Profile
2. Bing Places
3. Apple Maps / Apple Business Connect
4. Yelp
5. Facebook Business
6. BBB (Better Business Bureau)
7. Industry-specific directories (HomeAdvisor, Angi, Houzz, Thumbtack, etc.)
8. Local Chamber of Commerce
9. Data aggregators (Data Axle, Neustar/Localeze, Foursquare)
10. Local business associations and trade organizations

**Entity Consistency Audit:**
- Business name, address, phone, website URL must be IDENTICAL everywhere (even "St." vs "Street")
- Business description should convey the same positioning across all profiles
- Run citation audit (BrightLocal, Moz Local, or Whitespark)
- Fix every discrepancy, merge duplicates, remove outdated listings
- Ensure SameAs links in schema match all active profile URLs

#### 5D. Link Building Strategy

Backlinks are the #2 ranking factor and determine whether AI engines consider your domain authoritative enough to cite. Prioritize quality and relevance over volume.

**Link Intersection Targets (highest probability):**
- Search for "sites linking to [competitor A] AND [competitor B] but NOT [client]"
- These sites already link in the industry and are the most likely to link to the client
- Approach with a specific value proposition (better resource, updated data, local angle)

**Local Link Opportunities:**
- Sponsorships (youth sports, community events, nonprofit partnerships)
- Local news features (pitch community impact stories, industry expertise)
- Local business roundups and "best of" lists
- Chamber of Commerce and business association memberships
- University or school partnerships

**Industry Link Opportunities:**
- Trade association directories and partner pages
- Manufacturer/supplier partner pages
- Industry publications (bylined articles, expert quotes)
- Podcast appearances and interviews
- Conference speaker pages

**Content-Driven Links:**
- Original research and data studies (local market data, industry surveys)
- Free tools and calculators (cost estimators, sizing guides, ROI calculators)
- Comprehensive guides that become reference resources
- Infographics with embed codes

**Unlinked Brand Mentions:**
- Search Google for: `"business name" -site:clientsite.com -site:facebook.com -site:yelp.com`
- Contact sites that mention the business without linking and request a link

#### 5E. Content Velocity & Topical Authority Plan

Topical authority is now the primary trust signal for both rankings and AI citations. A site with 25-30 interlinked articles on one topic will outrank a stronger domain with scattered content.

**Publishing cadence**: Based on competitor publishing velocity analysis. Minimum: 2-4 new pages per month.

**Content types to prioritize (in order of SEO/AEO/GEO impact):**
1. Service pillar pages (comprehensive, 3,000+ words, owns head terms)
2. Comparison/versus pages (highest GEO visibility impact — 50%+ citation increase)
3. Cost/pricing guides (high commercial intent, strong AEO snippet performance)
4. FAQ/how-to content (direct AEO targets, PAA coverage)
5. Location pages (one per service area, unique content per page — never duplicate)
6. Seasonal/timely content (captures trending queries, demonstrates freshness)
7. Case studies and project showcases (E-E-A-T, first-hand experience, review reinforcement)

**Content refresh cadence**: Update cornerstone content quarterly. Add new data, current-year references, fresh examples, updated "Last updated" timestamp.

---

### Phase 6: Prioritized Roadmap

#### Week 1-2: Foundation Sprint
- Fix critical technical issues (blocked bots, broken pages, missing HTTPS, redirect chains)
- Complete GBP optimization (all fields, correct primary category, 15+ photos, services listed)
- Launch review acquisition system
- Update title tags + meta descriptions on top 5 pages
- Add answer blocks to top 5 pages
- Implement LocalBusiness + Organization schema site-wide
- Submit/update XML sitemap in GSC
- Create llms.txt file
- Begin citation audit

#### Week 3-4: Page Optimization Sprint
- Rewrite homepage per optimization template
- Rewrite top 3-5 service pages with full template (answer blocks, question H2s, FAQs, schema)
- Implement FAQPage + Service schema on all optimized pages
- Fix top-priority citation inconsistencies
- Publish 2 new content pieces targeting highest-priority gaps
- Complete internal linking updates for optimized pages

#### Month 2: Expansion
- Optimize remaining service/product pages
- Implement full schema strategy across all page types
- Complete citation cleanup and new directory submissions
- Begin link building outreach (link intersection targets first)
- Publish 4 new pages (comparison content, cost guides, FAQ pages)
- Add structured comparison tables to competitive pages
- Continue review acquisition (target: 20+ new reviews)

#### Month 3: Acceleration
- Create new pillar/cluster pages from topical map
- Build location-specific pages for service areas
- Expand content clusters with supporting articles
- Intensify link building (local + industry targets)
- First AI citation audit — test queries across ChatGPT, Perplexity, Google AI Overviews
- Analyze GSC data: which pages gained impressions/clicks, which didn't
- Refresh any pages not showing improvement

#### Month 4+: Compounding
- Monthly content publishing (2-4 pages)
- Quarterly cornerstone content refresh
- Ongoing review acquisition and response
- Weekly GBP posts
- Monthly AI citation monitoring
- Quarterly competitive re-analysis
- Scale what's working, cut what isn't

---

### Phase 7: Measurement Framework

#### SEO Metrics
- Organic sessions (GA4), keyword rankings (GSC/Semrush/Ahrefs)
- Impressions + CTR by page (GSC)
- Indexed pages, crawl stats (GSC)
- Core Web Vitals pass rate (GSC)
- Backlink growth (Ahrefs/Semrush)
- Domain authority trend

#### AEO Metrics
- Featured snippet ownership per target query
- People Also Ask appearances
- Zero-click impression share (high impressions + low clicks = snippet ownership)
- Position 0 / position 1 tracking

#### GEO Metrics
- Monthly AI citation test: Run 10-20 prompts across ChatGPT, Perplexity, Google AI Overviews, Gemini
- AI referral traffic in GA4 (source/medium filtering)
- Brand mention accuracy and sentiment in AI answers
- Citation rate vs. competitors per query
- Time-to-citation for new content

#### Local Metrics
- GBP: Impressions, discovery vs. direct searches, actions (calls, directions, website clicks)
- Map pack position for target queries
- Review count, average rating, review velocity (new reviews per week)
- Citation score / NAP consistency percentage

---

## Output Format

Deliver as a structured document:

1. **Executive Summary** — Current state, top 3 opportunities, expected impact, recommended investment
2. **Competitive Intelligence** — Who's winning, specific reasons why, gap analysis table
3. **Topical Authority Architecture** — Topical map, pillar/cluster plan, internal linking blueprint
4. **Page-by-Page Optimization Matrix** — Full template for every page
5. **Generated Schema Code** — Copy-paste JSON-LD for every page
6. **Technical Audit Checklist** — Every item with current status and specific fix
7. **Off-Page Strategy** — GBP, reviews, citations, links, content plan
8. **Prioritized Roadmap** — Week-by-week and month-by-month
9. **Measurement Framework** — KPIs, tools, tracking cadence

---

## Reference Files

- `references/schema-templates.md` — Complete JSON-LD templates with llms.txt template and validation checklist
