import { NextRequest, NextResponse } from "next/server";
import {
  buildSeoGeoFindings,
  runFirecrawlSiteCrawl,
} from "@/lib/site-crawl/firecrawl-ingest";
import {
  replaceClientRecommendations,
  upsertClientToolRun,
  type ClientRecommendationInput,
} from "@/lib/client-workbench";
import { resolveRequestContext } from "@/lib/request-context";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let runContext: { organizationId: string; clientId: string } | null = null;
  let stage = "initializing";
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const supabase = getServiceClient();

    stage = "loading client";
    const { data: client, error } = await supabase
      .from("clients")
      .select("id, organization_id, website_url, name")
      .eq("id", id)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    let organizationId = client.organization_id as string | null;
    if (!organizationId) {
      const context = await resolveRequestContext(request, client.id);
      organizationId = context.organizationId;
      await supabase
        .from("clients")
        .update({ organization_id: organizationId, updated_at: new Date().toISOString() })
        .eq("id", client.id);
    }
    if (!organizationId) {
      return NextResponse.json({ error: "Unable to resolve organization for client" }, { status: 400 });
    }
    runContext = { organizationId, clientId: client.id };

    const seedUrl = body.seedUrl || body.url || client.website_url;
    if (!seedUrl) {
      return NextResponse.json({ error: "Client website URL is required" }, { status: 400 });
    }

    const crawlProfile = body.profile || "free-snapshot";

    stage = "marking crawl running";
    await upsertClientToolRun({
      organizationId,
      clientId: client.id,
      toolKey: "firecrawl",
      status: "running",
      progressPercent: 20,
      configJson: { seedUrl, profile: crawlProfile, standalone: true },
    }).catch((workbenchError) => {
      console.warn("[Workbench] Could not mark client Firecrawl running:", workbenchError);
    });

    stage = "running Firecrawl crawl";
    const result = await runFirecrawlSiteCrawl({
      jobId: null,
      clientId: client.id,
      seedUrl,
      profile: crawlProfile,
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
      configJson: { seedUrl, profile: crawlProfile, standalone: true },
      metricsJson: {
        capturedPages: result.pages.length,
        creditsUsed: result.creditsUsed,
        firecrawlJobId: result.firecrawlJobId,
        services: result.voiceProfile.services,
        schemaTypes: Array.from(new Set(result.pages.flatMap((page) => page.schemaItems.map((schema) => schema.type)))),
      },
      completedAt: new Date().toISOString(),
    }).catch((workbenchError) => {
      console.warn("[Workbench] Could not mark client Firecrawl complete:", workbenchError);
    });

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
    }).catch((workbenchError) => {
      console.warn("[Workbench] Could not store client Firecrawl recommendations:", workbenchError);
    });

    await supabase
      .from("clients")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", client.id);

    return NextResponse.json({
      success: true,
      crawlId: result.crawlId,
      capturedPages: result.pages.length,
      creditsUsed: result.creditsUsed,
      voiceProfile: result.voiceProfile,
      recommendations: recommendations.length,
    });
  } catch (error) {
    console.error("Client Firecrawl crawl failed:", error);
    if (runContext) {
      await upsertClientToolRun({
        organizationId: runContext.organizationId,
        clientId: runContext.clientId,
        toolKey: "firecrawl",
        status: "failed",
        progressPercent: 100,
        errorMessage: error instanceof Error ? error.message : "Client Firecrawl crawl failed",
      }).catch((workbenchError) => console.warn("[Workbench] Could not mark client Firecrawl failed:", workbenchError));
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Client Firecrawl crawl failed",
        stage,
      },
      { status: 500 }
    );
  }
}
