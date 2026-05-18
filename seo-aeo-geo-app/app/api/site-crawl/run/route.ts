import { NextRequest, NextResponse } from "next/server";
import { replaceClientRecommendations, upsertClientToolRun, type ClientRecommendationInput } from "@/lib/client-workbench";
import { isFirecrawlConfigured } from "@/lib/firecrawl/client";
import { resolveRequestContext } from "@/lib/request-context";
import { getServiceClient } from "@/lib/supabase";
import { normalizeAuditUrl, type ParsedPageSignals } from "@/lib/site-crawl/analyzer";
import { buildSeoGeoFindings, runFirecrawlSiteCrawl } from "@/lib/site-crawl/firecrawl-ingest";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let stage = "initializing";
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

    const normalizedUrl = normalizeAuditUrl(url);
    const { userId, organizationId } = await resolveRequestContext(request);
    const supabase = getServiceClient();
    if (!organizationId) {
      return NextResponse.json({ error: "Unable to resolve organization for stored crawl" }, { status: 400 });
    }

    stage = "creating crawl-only client";
    const client = await findOrCreateCrawlClient({
      organizationId,
      websiteUrl: normalizedUrl,
      requestedName: body.clientName,
    });

    stage = "marking crawl running";
    await upsertClientToolRun({
      organizationId,
      clientId: client.id,
      toolKey: "firecrawl",
      status: "running",
      progressPercent: 20,
      configJson: { seedUrl: normalizedUrl, profile, standalone: true, source: "site-crawl-page" },
      createdBy: userId,
    }).catch((error) => console.warn("[Workbench] Could not mark standalone Firecrawl running:", error));

    stage = "running Firecrawl crawl";
    const result = await runFirecrawlSiteCrawl({
      jobId: null,
      clientId: client.id,
      seedUrl: normalizedUrl,
      profile,
    });

    stage = "saving workbench status";
    await upsertClientToolRun({
      organizationId,
      clientId: client.id,
      toolKey: "firecrawl",
      status: "completed",
      progressPercent: 100,
      sourceTable: "client_site_crawl",
      sourceId: result.crawlId || null,
      configJson: { seedUrl: normalizedUrl, profile, standalone: true, source: "site-crawl-page" },
      metricsJson: {
        capturedPages: result.pages.length,
        creditsUsed: result.creditsUsed,
        firecrawlJobId: result.firecrawlJobId,
        services: result.voiceProfile.services,
        schemaTypes: Array.from(new Set(result.pages.flatMap((page) => page.schemaItems.map((schema) => schema.type)))),
      },
      completedAt: new Date().toISOString(),
      createdBy: userId,
    }).catch((error) => console.warn("[Workbench] Could not mark standalone Firecrawl complete:", error));

    const recommendations: ClientRecommendationInput[] = buildSeoGeoFindings(result.pages).map((finding) => ({
      sourceTool: "firecrawl",
      category: finding.category,
      priority: finding.severity >= 3 ? "high" : finding.severity === 2 ? "medium" : "low",
      title: finding.title,
      description: finding.evidence.join(" "),
      recommendedFix: finding.recommendedFix,
    }));

    await replaceClientRecommendations({
      organizationId,
      clientId: client.id,
      sourceTool: "firecrawl",
      recommendations,
      createdBy: userId,
    }).catch((error) => console.warn("[Workbench] Could not store standalone Firecrawl recommendations:", error));

    await supabase.from("clients").update({ updated_at: new Date().toISOString() }).eq("id", client.id);

    return NextResponse.json({
      auditProfile: result.auditProfile,
      firecrawlJobId: result.firecrawlJobId,
      clientId: client.id,
      crawlId: result.crawlId,
      stored: Boolean(result.crawlId),
      storedPagesUrl: result.crawlId ? `/site-crawl/stored/${result.crawlId}` : null,
      designZipUrl: result.crawlId ? `/api/clients/${client.id}/site-crawl/download?crawlId=${result.crawlId}` : null,
      discoveredCount: result.discoveredCount,
      selectedCount: result.selectedCount,
      selectedUrls: result.selectedUrls,
      capturedCount: result.pages.length,
      creditsUsed: result.creditsUsed,
      completedAt: new Date().toISOString(),
      pageTypeCounts: countBy(result.pages.map((page) => page.pageType)),
      schemaInventory: summarizeSchema(result.pages),
      voiceProfile: result.voiceProfile,
      findings: buildSeoGeoFindings(result.pages),
      pages: result.pages.map((page) => ({
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
    console.error("[site-crawl-run]", stage, message);
    return NextResponse.json({ error: message, stage }, { status: 500 });
  }
}

async function findOrCreateCrawlClient(args: {
  organizationId: string;
  websiteUrl: string;
  requestedName?: string;
}) {
  const supabase = getServiceClient();
  const { data: existing } = await supabase
    .from("clients")
    .select("id, organization_id, name, website_url")
    .eq("organization_id", args.organizationId)
    .eq("website_url", args.websiteUrl)
    .maybeSingle();

  if (existing?.id) return existing;

  const host = safeHost(args.websiteUrl);
  const { data, error } = await supabase
    .from("clients")
    .insert({
      organization_id: args.organizationId,
      name: args.requestedName || host || "Standalone Site Crawl",
      website_url: args.websiteUrl,
      business_type: "Standalone site crawl",
      industry: "Site crawl",
      primary_goal: "Stored Firecrawl evidence",
    })
    .select("id, organization_id, name, website_url")
    .single();

  if (error) throw error;
  return data!;
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

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || "";
  }
}
