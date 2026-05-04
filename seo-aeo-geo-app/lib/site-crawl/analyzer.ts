export type SitePageType =
  | "home"
  | "service"
  | "location"
  | "about"
  | "contact"
  | "faq"
  | "reviews"
  | "blog"
  | "legal"
  | "gallery"
  | "other";

export type ParsedSchemaItem = {
  type: string;
  raw: Record<string, unknown> | string;
  detectedEntities: string[];
  warnings: string[];
};

export type ParsedPageSignals = {
  url: string;
  canonicalUrl: string | null;
  statusCode: number | null;
  title: string | null;
  description: string | null;
  h1: string | null;
  headings: Array<{ level: string; text: string }>;
  pageType: SitePageType;
  wordCount: number;
  indexabilityStatus: "indexable" | "noindex" | "blocked" | "error" | "unknown";
  robotsMeta: string | null;
  internalLinks: string[];
  externalLinks: string[];
  images: { total: number; withAlt: number; withoutAlt: number };
  ctas: string[];
  faqQuestions: string[];
  serviceSignals: string[];
  locationSignals: string[];
  napSignals: { phones: string[]; emails: string[]; addressLike: string[] };
  schemaItems: ParsedSchemaItem[];
};

const SERVICE_TERMS = [
  "repair",
  "installation",
  "replacement",
  "maintenance",
  "service",
  "services",
  "emergency",
  "consultation",
  "estimate",
  "inspection",
  "financing",
];

const CTA_TERMS = [
  "call",
  "contact",
  "schedule",
  "book",
  "request",
  "get a quote",
  "free estimate",
  "learn more",
  "get started",
];

export function normalizeAuditUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function classifyUrl(url: string, title = ""): SitePageType {
  try {
    const parsed = new URL(normalizeAuditUrl(url));
    const path = parsed.pathname.toLowerCase().replace(/\/$/, "");
    const haystack = `${path} ${title}`.toLowerCase();

    if (!path || path === "/") return "home";
    if (/\b(contact|locations?|directions|get-in-touch)\b/.test(haystack)) return "contact";
    if (/\b(about|our-story|team|staff)\b/.test(haystack)) return "about";
    if (/\b(faq|faqs|questions|help)\b/.test(haystack)) return "faq";
    if (/\b(review|reviews|testimonial|testimonials)\b/.test(haystack)) return "reviews";
    if (/\b(blog|news|article|articles|resources|guide|guides)\b/.test(haystack)) return "blog";
    if (/\b(privacy|terms|accessibility|legal|cookie)\b/.test(haystack)) return "legal";
    if (/\b(gallery|portfolio|photos|projects|work)\b/.test(haystack)) return "gallery";
    if (/\b(areas-we-serve|service-area|locations?|near-me)\b/.test(haystack)) return "location";
    if (SERVICE_TERMS.some((term) => haystack.includes(term)) || /\bservices?\b/.test(haystack)) return "service";
    if (/\b(madison|middleton|sun-prairie|fitchburg|verona|waunakee|monona|mcfarland|oregon|deforest|cottage-grove|stoughton)\b/.test(haystack)) return "location";
    return "other";
  } catch {
    return "other";
  }
}

export function pickAuditUrls(
  links: Array<{ url: string; title?: string; description?: string }>,
  seedUrl: string,
  limit: number
) {
  const seen = new Set<string>();
  const normalizedSeed = normalizeAuditUrl(seedUrl).replace(/\/$/, "");
  const candidates = [{ url: normalizedSeed, title: "Home" }, ...links]
    .map((link) => ({
      ...link,
      url: normalizeAuditUrl(link.url).split("#")[0].replace(/\/$/, ""),
    }))
    .filter((link) => {
      if (!link.url || seen.has(link.url)) return false;
      seen.add(link.url);
      try {
        const seedHost = new URL(normalizedSeed).hostname.replace(/^www\./, "");
        const linkHost = new URL(link.url).hostname.replace(/^www\./, "");
        return seedHost === linkHost;
      } catch {
        return false;
      }
    });

  const weighted = candidates.map((link) => {
    const pageType = classifyUrl(link.url, link.title);
    const score = pageTypeWeight(pageType);
    return { ...link, pageType, score };
  });

  return weighted
    .sort((a, b) => b.score - a.score || a.url.length - b.url.length)
    .slice(0, limit);
}

function pageTypeWeight(type: SitePageType) {
  const weights: Record<SitePageType, number> = {
    home: 100,
    service: 90,
    location: 85,
    about: 75,
    contact: 72,
    faq: 70,
    reviews: 68,
    gallery: 45,
    blog: 40,
    other: 20,
    legal: 5,
  };
  return weights[type] ?? 0;
}

export function parsePageSignals(input: {
  url: string;
  finalUrl?: string;
  statusCode?: number | null;
  html?: string | null;
  rawHtml?: string | null;
  markdown?: string | null;
  title?: string | null;
  description?: string | null;
}): ParsedPageSignals {
  const html = input.rawHtml || input.html || "";
  const markdown = input.markdown || "";
  const title = input.title || extractText(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || null;
  const description =
    input.description ||
    extractMeta(html, "description") ||
    extractMeta(html, "og:description") ||
    null;
  const canonicalUrl = extractAttribute(html, /<link[^>]+rel=["']canonical["'][^>]*>/i, "href");
  const robotsMeta = extractMeta(html, "robots");
  const headings = extractHeadings(html);
  const h1 = headings.find((heading) => heading.level === "h1")?.text || null;
  const links = extractLinks(html, input.finalUrl || input.url);
  const images = extractImages(html);
  const visibleText = [markdown, stripTags(html)].filter(Boolean).join("\n");
  const pageType = classifyUrl(input.finalUrl || input.url, title || "");
  const schemaItems = extractSchemaItems(html);

  return {
    url: input.finalUrl || input.url,
    canonicalUrl,
    statusCode: input.statusCode ?? null,
    title,
    description,
    h1,
    headings,
    pageType,
    wordCount: countWords(visibleText),
    indexabilityStatus: getIndexabilityStatus(input.statusCode ?? null, robotsMeta),
    robotsMeta,
    internalLinks: links.internal,
    externalLinks: links.external,
    images,
    ctas: extractCtas(visibleText),
    faqQuestions: extractFaqQuestions(visibleText),
    serviceSignals: extractSignals(visibleText, SERVICE_TERMS),
    locationSignals: extractLocationSignals(visibleText),
    napSignals: extractNapSignals(visibleText),
    schemaItems,
  };
}

export function buildClientVoiceProfile(pages: ParsedPageSignals[], markdownByUrl: Map<string, string>) {
  const text = pages
    .slice(0, 12)
    .map((page) => markdownByUrl.get(page.url) || "")
    .join("\n")
    .replace(/\s+/g, " ")
    .slice(0, 12000);

  const serviceTerms = unique(pages.flatMap((page) => page.serviceSignals)).slice(0, 12);
  const locationTerms = unique(pages.flatMap((page) => page.locationSignals)).slice(0, 12);
  const ctas = unique(pages.flatMap((page) => page.ctas)).slice(0, 10);
  const proofPoints = extractProofPoints(text);

  return {
    tone: inferTone(text),
    differentiators: extractDifferentiators(text),
    valueProps: extractValueProps(text),
    proofPoints,
    audiences: inferAudiences(text),
    services: serviceTerms,
    ctas,
    phrasesToReuse: extractPhrasesToReuse(text),
    locationSignals: locationTerms,
  };
}

function extractText(html: string, regex: RegExp): string {
  const match = html.match(regex);
  return match ? decodeEntities(stripTags(match[1]).trim()) : "";
}

function extractMeta(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    extractAttribute(html, new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i"), "content") ||
    extractAttribute(html, new RegExp(`<meta[^>]+content=["'][^"']*["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i"), "content")
  );
}

function extractAttribute(html: string, tagRegex: RegExp, attribute: string): string | null {
  const tag = html.match(tagRegex)?.[0];
  if (!tag) return null;
  const attr = tag.match(new RegExp(`${attribute}\\s*=\\s*["']([^"']*)["']`, "i"));
  return attr ? decodeEntities(attr[1]) : null;
}

function extractHeadings(html: string) {
  const headings: Array<{ level: string; text: string }> = [];
  const regex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = decodeEntities(stripTags(match[2]).trim());
    if (text) headings.push({ level: match[1].toLowerCase(), text });
  }
  return headings;
}

function extractLinks(html: string, baseUrl: string) {
  const internal = new Set<string>();
  const external = new Set<string>();
  let baseHost = "";
  try {
    baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");
  } catch {
    return { internal: [], external: [] };
  }

  const regex = /<a\s+[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const href = new URL(match[1], baseUrl);
      const normalized = href.href.split("#")[0].replace(/\/$/, "");
      const host = href.hostname.replace(/^www\./, "");
      if (host === baseHost) internal.add(normalized);
      else if (href.protocol.startsWith("http")) external.add(normalized);
    } catch {
      // skip invalid URLs
    }
  }
  return { internal: Array.from(internal), external: Array.from(external) };
}

function extractImages(html: string) {
  const images = html.match(/<img\s[^>]*>/gi) || [];
  const withAlt = images.filter((img) => /alt\s*=\s*["'][^"']+["']/i.test(img)).length;
  return { total: images.length, withAlt, withoutAlt: images.length - withAlt };
}

function extractSchemaItems(html: string): ParsedSchemaItem[] {
  const items: ParsedSchemaItem[] = [];
  const regex = /<script\s+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const typeValue = Array.isArray(node?.["@type"]) ? node["@type"].join(", ") : node?.["@type"] || "Unknown";
        items.push({
          type: String(typeValue),
          raw: node,
          detectedEntities: extractSchemaEntities(node),
          warnings: schemaWarnings(node),
        });
      }
    } catch {
      items.push({ type: "ParseError", raw, detectedEntities: [], warnings: ["Invalid JSON-LD could not be parsed."] });
    }
  }
  return items;
}

function extractSchemaEntities(node: Record<string, unknown>) {
  return unique(
    ["name", "url", "telephone", "address", "areaServed", "sameAs"]
      .flatMap((key) => {
        const value = node?.[key];
        if (Array.isArray(value)) return value.map(String);
        if (typeof value === "object" && value) return Object.values(value as Record<string, unknown>).map(String);
        return value ? [String(value)] : [];
      })
      .filter(Boolean)
  );
}

function schemaWarnings(node: Record<string, unknown>) {
  const warnings: string[] = [];
  const type = String(node?.["@type"] || "");
  if (/LocalBusiness|Organization|Service/i.test(type)) {
    if (!node.name) warnings.push("Missing name.");
    if (!node.url) warnings.push("Missing url.");
    if (!node.sameAs) warnings.push("Missing sameAs links.");
    if (!node.address) warnings.push("Missing address.");
  }
  return warnings;
}

function getIndexabilityStatus(statusCode: number | null, robotsMeta: string | null): ParsedPageSignals["indexabilityStatus"] {
  if (statusCode && statusCode >= 400) return "error";
  if (robotsMeta && /noindex/i.test(robotsMeta)) return "noindex";
  if (robotsMeta && /none/i.test(robotsMeta)) return "blocked";
  if (statusCode && statusCode >= 200 && statusCode < 400) return "indexable";
  return "unknown";
}

function extractCtas(text: string) {
  const lower = text.toLowerCase();
  return CTA_TERMS.filter((term) => lower.includes(term));
}

function extractFaqQuestions(text: string) {
  return unique((text.match(/[^.!?\n]{8,120}\?/g) || []).map((item) => item.trim())).slice(0, 12);
}

function extractSignals(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term));
}

function extractLocationSignals(text: string) {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s?(?:WI|IL|MN|IA|MI)\b/g) || [];
  return unique(matches).slice(0, 20);
}

function extractNapSignals(text: string) {
  return {
    phones: unique(text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || []).slice(0, 6),
    emails: unique(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).slice(0, 6),
    addressLike: unique(text.match(/\b\d{2,6}\s+[A-Za-z0-9.' -]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Court|Ct)\b/gi) || []).slice(0, 6),
  };
}

function countWords(text: string) {
  return stripTags(text).split(/\s+/).filter((word) => word.length > 1).length;
}

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

function inferTone(text: string) {
  const lower = text.toLowerCase();
  if (/luxury|premium|bespoke|white glove/.test(lower)) return "premium and polished";
  if (/family|friendly|neighbors|community|local/.test(lower)) return "local and friendly";
  if (/emergency|fast|same day|24\/7/.test(lower)) return "urgent and service-oriented";
  if (/trusted|licensed|certified|experienced/.test(lower)) return "trust-led and professional";
  return "professional and helpful";
}

function inferAudiences(text: string) {
  const audiences = [];
  if (/homeowner|residential|family/.test(text.toLowerCase())) audiences.push("homeowners");
  if (/business|commercial|office/.test(text.toLowerCase())) audiences.push("local businesses");
  if (/patient|client|customer/.test(text.toLowerCase())) audiences.push("prospective customers");
  return audiences.length ? audiences : ["local buyers"];
}

function extractProofPoints(text: string) {
  const patterns = [
    /\b\d+\+?\s+(?:years|reviews|customers|clients|projects|homes)\b/gi,
    /\b(?:licensed|insured|certified|award-winning|locally owned|family owned)\b/gi,
  ];
  return unique(patterns.flatMap((pattern) => text.match(pattern) || [])).slice(0, 12);
}

function extractDifferentiators(text: string) {
  const sentences = text.match(/[^.!?]{20,180}[.!?]/g) || [];
  return sentences
    .filter((sentence) => /specialize|trusted|local|family|licensed|certified|experience|guarantee|custom|expert/i.test(sentence))
    .map((sentence) => sentence.trim())
    .slice(0, 6);
}

function extractValueProps(text: string) {
  const sentences = text.match(/[^.!?]{20,160}[.!?]/g) || [];
  return sentences
    .filter((sentence) => /help|provide|offer|deliver|serve|protect|improve|save|quality/i.test(sentence))
    .map((sentence) => sentence.trim())
    .slice(0, 6);
}

function extractPhrasesToReuse(text: string) {
  return unique((text.match(/\b[A-Z][A-Za-z]+(?:\s+[A-Za-z&'-]+){2,6}\b/g) || []).map((item) => item.trim()))
    .filter((item) => item.length <= 80)
    .slice(0, 12);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}
