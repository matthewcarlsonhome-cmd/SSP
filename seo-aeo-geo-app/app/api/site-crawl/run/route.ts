import { NextRequest, NextResponse } from "next/server";
import {
  buildDefaultCrawlConfig,
  getFirecrawlAuditProfile,
  isFirecrawlConfigured,
  mapWebsite,
  startCrawl,
  waitForCrawl,
  type FirecrawlDocument,
} from "@/lib/firecrawl/client";
import {
  buildClientVoiceProfile,
  parsePageSignals,
  pickAuditUrls,
  type ParsedPageSignals,
} from "@/lib/site-crawl/analyzer";
import { buildSeoGeoFindings } from "@/lib/site-crawl/firecrawl-ingest";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!isFirecrawlConfigured()) {
      return NextResponse.json(
        { error: "FIRECRAWL_API_KEY is not configured on the server." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const profile = typeof body.profile === "string" ? body.profile : "free-snapshot";

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const auditProfile = getFirecrawlAuditProfile(profile);
    const links = await mapWebsite(url, { limit: 500, sitemap: "include" });
    const selectedUrls = pickAuditUrls(links, url, auditProfile.limit);
    const started = await startCrawl(buildDefaultCrawlConfig(url, auditProfile.id));
    const crawlStatus = await waitForCrawl(started.id, {
      timeoutMs: auditProfile.id === "full-audit" ? 300000 : 240000,
      pollIntervalMs: 5000,
    });

    const markdownByUrl = new Map<string, string>();
    const pages = (crawlStatus.data || [])
      .map((doc) => parseFirecrawlDocument(doc, markdownByUrl))
      .filter((page): page is ParsedPageSignals => Boolean(page));

    const voiceProfile = buildClientVoiceProfile(pages, markdownByUrl);
    const findings = buildSeoGeoFindings(pages);
    const schemaInventory = summarizeSchema(pages);
    const pageTypeCounts = countBy(pages.map((page) => page.pageType));

    return NextResponse.json({
      auditProfile,
      firecrawlJobId: started.id,
      discoveredCount: links.length,
      selectedCount: selectedUrls.length,
      selectedUrls,
      capturedCount: pages.length,
      creditsUsed: crawlStatus.creditsUsed || pages.length,
      completedAt: new Date().toISOString(),
      pageTypeCounts,
      schemaInventory,
      voiceProfile,
      findings,
      pages: pages.map((page) => ({
        url: page.url,
        title: page.title,
        description: page.description,
        h1: page.h1,
        pageType: page.pageType,
        statusCode: page.statusCode,
        indexabilityStatus: page.indexabilityStatus,
        wordCount: page.wordCount,
        schemaTypes: page.schemaItems.map((schema) => schema.type),
        faqCount: page.faqQuestions.length,
        internalLinkCount: page.internalLinks.length,
        externalLinkCount: page.externalLinks.length,
        images: page.images,
        ctas: page.ctas.slice(0, 8),
        services: page.serviceSignals.slice(0, 8),
        locations: page.locationSignals.slice(0, 8),
        phones: page.napSignals.phones.slice(0, 4),
        emails: page.napSignals.emails.slice(0, 4),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run Firecrawl crawl";
    console.error("[site-crawl-run]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseFirecrawlDocument(doc: FirecrawlDocument, markdownByUrl: Map<string, string>) {
  const sourceUrl = doc.metadata?.url || doc.metadata?.sourceURL || "";
  if (!sourceUrl) return null;

  const parsed = parsePageSignals({
    url: sourceUrl,
    finalUrl: doc.metadata?.url || sourceUrl,
    statusCode: doc.metadata?.statusCode || null,
    html: doc.html,
    rawHtml: doc.rawHtml,
    markdown: doc.markdown,
    title: asString(doc.metadata?.title),
    description: asString(doc.metadata?.description),
  });

  markdownByUrl.set(parsed.url, doc.markdown || "");
  return parsed;
}

function summarizeSchema(pages: ParsedPageSignals[]) {
  const counts: Record<string, number> = {};
  for (const page of pages) {
    for (const schema of page.schemaItems) {
      counts[schema.type] = (counts[schema.type] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

function countBy(items: string[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
}

function asString(value: unknown) {
  if (Array.isArray(value)) return value.join(" ");
  return typeof value === "string" ? value : null;
}
