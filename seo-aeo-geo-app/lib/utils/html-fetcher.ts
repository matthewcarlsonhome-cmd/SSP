/**
 * HTML Fetcher & SEO Signal Extractor
 *
 * Fetches actual page HTML and extracts structured SEO signals that
 * web search cannot see: schema markup, meta tags, heading structure,
 * robots.txt, sitemap, etc.
 */

export type PageSignals = {
  url: string;
  fetchedAt: string;
  status: number;
  title: string;
  metaDescription: string;
  metaRobots: string;
  canonical: string;
  h1: string[];
  headings: { level: string; text: string }[];
  schemaObjects: SchemaObject[];
  ogTags: Record<string, string>;
  internalLinks: string[];
  imageCount: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  wordCountEstimate: number;
  hasViewportMeta: boolean;
  lang: string;
  semanticElements: string[];
  scripts: number;
  stylesheets: number;
};

export type SchemaObject = {
  type: string;
  raw: string;
  properties: Record<string, unknown>;
};

export type RobotsTxtSignals = {
  exists: boolean;
  content: string;
  blockedBots: string[];
  sitemapUrls: string[];
};

export type SiteSignals = {
  homepage: PageSignals | null;
  subpages: PageSignals[];
  robotsTxt: RobotsTxtSignals;
  sitemapUrls: string[];
};

const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML_LENGTH = 500_000; // 500KB max per page
const USER_AGENT = "Mozilla/5.0 (compatible; SEOAuditBot/1.0)";

// AI bots to check in robots.txt
const AI_BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Bingbot", "Googlebot", "Bytespider", "CCBot"];

async function fetchWithTimeout(url: string, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function extractText(html: string, regex: RegExp): string {
  const match = html.match(regex);
  return match ? decodeEntities(match[1].trim()) : "";
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function extractAllMatches(html: string, regex: RegExp): string[] {
  const results: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extract all JSON-LD schema objects from page HTML
 */
function extractSchemaObjects(html: string): SchemaObject[] {
  const schemas: SchemaObject[] = [];
  const regex = /<script\s+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    try {
      const parsed = JSON.parse(raw);

      // Handle @graph arrays
      if (parsed["@graph"] && Array.isArray(parsed["@graph"])) {
        for (const item of parsed["@graph"]) {
          schemas.push({
            type: item["@type"] || "Unknown",
            raw: JSON.stringify(item, null, 2),
            properties: item,
          });
        }
      } else {
        schemas.push({
          type: parsed["@type"] || "Unknown",
          raw: JSON.stringify(parsed, null, 2),
          properties: parsed,
        });
      }
    } catch {
      // Invalid JSON-LD — still record it
      schemas.push({
        type: "ParseError",
        raw,
        properties: {},
      });
    }
  }

  return schemas;
}

/**
 * Extract headings (h1-h6) from HTML
 */
function extractHeadings(html: string): { level: string; text: string }[] {
  const headings: { level: string; text: string }[] = [];
  const regex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const text = stripTags(match[2]).trim();
    if (text) {
      headings.push({ level: match[1].toLowerCase(), text });
    }
  }

  return headings;
}

/**
 * Extract Open Graph / Twitter meta tags
 */
function extractOgTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const regex = /<meta\s+(?:property|name)\s*=\s*["'](og:|twitter:)([^"']+)["']\s+content\s*=\s*["']([^"']*)["'][^>]*>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    tags[`${match[1]}${match[2]}`] = match[3];
  }

  return tags;
}

/**
 * Extract internal links from page
 */
function extractInternalLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const hostname = new URL(baseUrl).hostname;
  const regex = /<a\s+[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    let href = match[1].trim();
    try {
      // Resolve relative URLs
      if (href.startsWith("/")) {
        href = new URL(href, baseUrl).href;
      }
      const linkUrl = new URL(href);
      if (linkUrl.hostname === hostname || linkUrl.hostname === `www.${hostname}` || hostname === `www.${linkUrl.hostname}`) {
        links.add(linkUrl.href.replace(/\/$/, ""));
      }
    } catch {
      // Invalid URL — skip
    }
  }

  return Array.from(links);
}

/**
 * Check which semantic HTML elements are used
 */
function extractSemanticElements(html: string): string[] {
  const semanticTags = ["article", "section", "nav", "main", "aside", "header", "footer", "figure", "figcaption", "time", "address", "details", "summary", "mark"];
  return semanticTags.filter((tag) => new RegExp(`<${tag}[\\s>]`, "i").test(html));
}

/**
 * Fetch and extract SEO signals from a single page
 */
export async function fetchPageSignals(url: string): Promise<PageSignals | null> {
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      console.log(`[HTML Fetcher] ${url} returned ${response.status}`);
      return null;
    }

    let html = await response.text();
    if (html.length > MAX_HTML_LENGTH) {
      html = html.substring(0, MAX_HTML_LENGTH);
    }

    const title = extractText(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDesc = extractText(html, /<meta\s+name\s*=\s*["']description["']\s+content\s*=\s*["']([\s\S]*?)["'][^>]*>/i)
      || extractText(html, /<meta\s+content\s*=\s*["']([\s\S]*?)["']\s+name\s*=\s*["']description["'][^>]*>/i);
    const metaRobots = extractText(html, /<meta\s+name\s*=\s*["']robots["']\s+content\s*=\s*["']([^"']*)["'][^>]*>/i);
    const canonical = extractText(html, /<link\s+rel\s*=\s*["']canonical["']\s+href\s*=\s*["']([^"']*)["'][^>]*>/i);
    const headings = extractHeadings(html);
    const h1s = headings.filter((h) => h.level === "h1").map((h) => h.text);
    const schemaObjects = extractSchemaObjects(html);
    const ogTags = extractOgTags(html);
    const internalLinks = extractInternalLinks(html, url);
    const hasViewportMeta = /<meta\s+[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(html);
    const langMatch = html.match(/<html[^>]*\slang\s*=\s*["']([^"']*)["']/i);
    const lang = langMatch ? langMatch[1] : "";

    // Image analysis
    const imgMatches = html.match(/<img\s[^>]*>/gi) || [];
    const imageCount = imgMatches.length;
    const imagesWithAlt = imgMatches.filter((img) => /alt\s*=\s*["'][^"']+["']/i.test(img)).length;
    const imagesWithoutAlt = imageCount - imagesWithAlt;

    // Word count (strip HTML, count words in body)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyText = bodyMatch ? stripTags(bodyMatch[1]) : stripTags(html);
    const wordCountEstimate = bodyText.split(/\s+/).filter((w) => w.length > 0).length;

    const semanticElements = extractSemanticElements(html);
    const scripts = (html.match(/<script[\s>]/gi) || []).length;
    const stylesheets = (html.match(/<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi) || []).length;

    return {
      url,
      fetchedAt: new Date().toISOString(),
      status: response.status,
      title,
      metaDescription: metaDesc,
      metaRobots,
      canonical,
      h1: h1s,
      headings: headings.filter((h) => h.level !== "h1"), // h2+ only (h1 is separate)
      schemaObjects,
      ogTags,
      internalLinks,
      imageCount,
      imagesWithAlt,
      imagesWithoutAlt,
      wordCountEstimate,
      hasViewportMeta,
      lang,
      semanticElements,
      scripts,
      stylesheets,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`[HTML Fetcher] Failed to fetch ${url}: ${msg}`);
    return null;
  }
}

/**
 * Fetch and parse robots.txt
 */
export async function fetchRobotsTxt(baseUrl: string): Promise<RobotsTxtSignals> {
  try {
    const url = new URL("/robots.txt", baseUrl).href;
    const response = await fetchWithTimeout(url, 10000);

    if (!response.ok) {
      return { exists: false, content: "", blockedBots: [], sitemapUrls: [] };
    }

    const content = await response.text();
    const blockedBots: string[] = [];

    // Check each AI bot
    for (const bot of AI_BOTS) {
      const botRegex = new RegExp(`User-agent:\\s*${bot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?Disallow:\\s*/`, "i");
      if (botRegex.test(content)) {
        blockedBots.push(bot);
      }
    }

    // Also check for blanket "Disallow: /" under "User-agent: *"
    if (/User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*$/m.test(content)) {
      blockedBots.push("* (all bots)");
    }

    // Extract sitemap URLs
    const sitemapUrls: string[] = [];
    const sitemapRegex = /Sitemap:\s*(.+)/gi;
    let match;
    while ((match = sitemapRegex.exec(content)) !== null) {
      sitemapUrls.push(match[1].trim());
    }

    return { exists: true, content: content.substring(0, 5000), blockedBots, sitemapUrls };
  } catch {
    return { exists: false, content: "", blockedBots: [], sitemapUrls: [] };
  }
}

/**
 * Discover subpage URLs from sitemap.xml
 */
async function fetchSitemapUrls(baseUrl: string, sitemapUrls: string[]): Promise<string[]> {
  const urls = new Set<string>();

  // Try provided sitemap URLs first, then default
  const sitemapsToCheck = sitemapUrls.length > 0
    ? sitemapUrls
    : [new URL("/sitemap.xml", baseUrl).href];

  for (const sitemapUrl of sitemapsToCheck.slice(0, 2)) { // max 2 sitemaps
    try {
      const response = await fetchWithTimeout(sitemapUrl, 10000);
      if (!response.ok) continue;

      const xml = await response.text();

      // Extract <loc> URLs
      const locRegex = /<loc>([^<]+)<\/loc>/gi;
      let match;
      while ((match = locRegex.exec(xml)) !== null) {
        urls.add(match[1].trim());
      }
    } catch {
      // Skip failed sitemaps
    }
  }

  return Array.from(urls);
}

/**
 * Main function: Fetch homepage + discover and fetch key subpages
 * Returns structured signals for all pages
 */
export async function fetchSiteSignals(websiteUrl: string, maxSubpages: number = 4): Promise<SiteSignals> {
  console.log(`[HTML Fetcher] Starting site analysis for: ${websiteUrl}`);

  // Normalize URL
  let baseUrl = websiteUrl.trim();
  if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
  baseUrl = baseUrl.replace(/\/$/, "");

  // Step 1: Fetch robots.txt
  const robotsTxt = await fetchRobotsTxt(baseUrl);
  console.log(`[HTML Fetcher] robots.txt: ${robotsTxt.exists ? "found" : "not found"}, blocked bots: [${robotsTxt.blockedBots.join(", ")}]`);

  // Step 2: Fetch homepage
  const homepage = await fetchPageSignals(baseUrl);
  if (homepage) {
    console.log(`[HTML Fetcher] Homepage: ${homepage.title} | ${homepage.schemaObjects.length} schema objects | ${homepage.wordCountEstimate} words`);
  } else {
    console.log(`[HTML Fetcher] WARNING: Could not fetch homepage`);
  }

  // Step 3: Discover subpages from sitemap + homepage links
  let candidateUrls: string[] = [];

  // From sitemap
  const sitemapUrls = await fetchSitemapUrls(baseUrl, robotsTxt.sitemapUrls);
  candidateUrls.push(...sitemapUrls);
  console.log(`[HTML Fetcher] Sitemap URLs found: ${sitemapUrls.length}`);

  // From homepage internal links
  if (homepage) {
    candidateUrls.push(...homepage.internalLinks);
  }

  // Deduplicate and filter
  const seenUrls = new Set<string>([baseUrl, `${baseUrl}/`]);
  candidateUrls = candidateUrls.filter((url) => {
    const normalized = url.replace(/\/$/, "");
    if (seenUrls.has(normalized)) return false;
    seenUrls.add(normalized);
    // Skip non-content pages
    if (/\.(pdf|jpg|png|gif|svg|css|js|xml|json|ico|woff|woff2|ttf|eot)$/i.test(url)) return false;
    if (/\?(utm_|fbclid|gclid)/.test(url)) return false;
    if (/(\/tag\/|\/category\/|\/author\/|\/page\/\d|\/wp-admin|\/wp-login|\/feed|\/cart|\/checkout|\/account)/i.test(url)) return false;
    return true;
  });

  // Prioritize: service pages, about, blog, contact over deep pages
  const prioritized = candidateUrls.sort((a, b) => {
    const scoreUrl = (u: string) => {
      const path = new URL(u).pathname.toLowerCase();
      if (/^\/(services?|what-we-do|solutions?)/.test(path)) return 0;
      if (/^\/(about|who-we-are|team|our-story)/.test(path)) return 1;
      if (/^\/(contact|get-in-touch|location)/.test(path)) return 2;
      if (/^\/(blog|news|resources|insights)/.test(path)) return 3;
      if (/^\/(pricing|plans|packages)/.test(path)) return 4;
      if (path.split("/").filter(Boolean).length <= 1) return 5; // Top-level pages
      return 10;
    };
    return scoreUrl(a) - scoreUrl(b);
  });

  // Step 4: Fetch top subpages (parallel, limited)
  const subpageUrls = prioritized.slice(0, maxSubpages);
  console.log(`[HTML Fetcher] Fetching ${subpageUrls.length} subpages: ${subpageUrls.map((u) => new URL(u).pathname).join(", ")}`);

  const subpagePromises = subpageUrls.map((url) => fetchPageSignals(url));
  const subpageResults = await Promise.all(subpagePromises);
  const subpages = subpageResults.filter(Boolean) as PageSignals[];

  console.log(`[HTML Fetcher] Successfully fetched ${subpages.length} subpages`);
  for (const page of subpages) {
    console.log(`  - ${page.url}: ${page.schemaObjects.length} schema objects, ${page.wordCountEstimate} words`);
  }

  return {
    homepage,
    subpages,
    robotsTxt,
    sitemapUrls,
  };
}

/**
 * Format site signals into a concise text block for the Agent 1 user message.
 * This gives the AI REAL data instead of guesses from web search.
 */
export function formatSiteSignalsForPrompt(signals: SiteSignals): string {
  const sections: string[] = [];

  sections.push("## Pre-Fetched Site Data (from actual HTML source)");
  sections.push("The following data was extracted by fetching the actual page HTML. Use this as ground truth — it is more accurate than web search for technical signals.\n");

  // Robots.txt
  sections.push("### robots.txt");
  if (signals.robotsTxt.exists) {
    if (signals.robotsTxt.blockedBots.length > 0) {
      sections.push(`**BLOCKED BOTS:** ${signals.robotsTxt.blockedBots.join(", ")}`);
    } else {
      sections.push("No AI bots blocked.");
    }
    if (signals.robotsTxt.sitemapUrls.length > 0) {
      sections.push(`Sitemaps: ${signals.robotsTxt.sitemapUrls.join(", ")}`);
    }
  } else {
    sections.push("robots.txt not found.");
  }

  // Sitemap
  sections.push(`\n### Sitemap: ${signals.sitemapUrls.length} URLs discovered`);

  // Pages
  const allPages = [signals.homepage, ...signals.subpages].filter(Boolean) as PageSignals[];

  for (const page of allPages) {
    const isHome = page === signals.homepage;
    sections.push(`\n### ${isHome ? "HOMEPAGE" : "PAGE"}: ${page.url}`);
    sections.push(`- **Title tag:** "${page.title}" (${page.title.length} chars)`);
    sections.push(`- **Meta description:** "${page.metaDescription}" (${page.metaDescription.length} chars)`);
    if (page.metaRobots) sections.push(`- **Meta robots:** ${page.metaRobots}`);
    if (page.canonical) sections.push(`- **Canonical:** ${page.canonical}`);
    sections.push(`- **H1 tags:** ${page.h1.length > 0 ? page.h1.map((h) => `"${h}"`).join(", ") : "NONE"}`);
    sections.push(`- **Heading structure:** ${page.headings.slice(0, 15).map((h) => `${h.level}: "${h.text}"`).join(" | ") || "None found"}`);
    sections.push(`- **Word count:** ~${page.wordCountEstimate}`);
    sections.push(`- **Images:** ${page.imageCount} total, ${page.imagesWithAlt} with alt text, ${page.imagesWithoutAlt} without`);
    sections.push(`- **Internal links out:** ${page.internalLinks.length}`);
    sections.push(`- **Viewport meta:** ${page.hasViewportMeta ? "Yes" : "No"}`);
    sections.push(`- **Language:** ${page.lang || "Not set"}`);
    sections.push(`- **Semantic HTML:** ${page.semanticElements.length > 0 ? page.semanticElements.join(", ") : "None"}`);
    sections.push(`- **Scripts:** ${page.scripts} | Stylesheets: ${page.stylesheets}`);

    // Schema — the critical part
    if (page.schemaObjects.length > 0) {
      sections.push(`- **Schema markup: ${page.schemaObjects.length} JSON-LD objects found:**`);
      for (const schema of page.schemaObjects) {
        sections.push(`  - Type: **${schema.type}**`);
        // Include key properties but keep it concise
        const props = schema.properties;
        const keyFields: string[] = [];
        if (props.name) keyFields.push(`name: "${props.name}"`);
        if (props.url) keyFields.push(`url: "${props.url}"`);
        if (props.description) keyFields.push(`description: "${String(props.description).substring(0, 100)}..."`);
        if (props.address) keyFields.push(`address: present`);
        if (props.telephone) keyFields.push(`telephone: "${props.telephone}"`);
        if (props.aggregateRating) keyFields.push(`aggregateRating: present`);
        if (props.review) keyFields.push(`reviews: ${Array.isArray(props.review) ? props.review.length : "present"}`);
        if (props.openingHours || props.openingHoursSpecification) keyFields.push(`hours: present`);
        if (props.geo) keyFields.push(`geo: present`);
        if (props.sameAs) keyFields.push(`sameAs: ${Array.isArray(props.sameAs) ? props.sameAs.length + " profiles" : "present"}`);
        if (keyFields.length > 0) {
          sections.push(`    Properties: ${keyFields.join(", ")}`);
        }
      }
    } else {
      sections.push(`- **Schema markup: NONE found** (no <script type="application/ld+json"> tags)`);
    }

    // OG tags
    if (Object.keys(page.ogTags).length > 0) {
      sections.push(`- **Open Graph tags:** ${Object.entries(page.ogTags).map(([k, v]) => `${k}="${v.substring(0, 80)}"`).join(", ")}`);
    }
  }

  return sections.join("\n");
}
