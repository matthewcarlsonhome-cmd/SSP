import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext } from "@/lib/request-context";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ crawlId: string }> }
) {
  try {
    const { crawlId } = await params;
    const { organizationId } = await resolveRequestContext(request);
    const supabase = getServiceClient();
    if (!organizationId) {
      return NextResponse.json({ error: "Stored crawl not found" }, { status: 404 });
    }

    const { data: crawl, error } = await supabase
      .from("client_site_crawl")
      .select("*, clients(id, name, website_url, organization_id), client_site_page(*, client_schema_item(*)), client_voice_profile(*), seo_geo_finding(*)")
      .eq("id", crawlId)
      .single();

    if (error || !crawl) {
      return NextResponse.json({ error: "Stored crawl not found" }, { status: 404 });
    }

    const client = Array.isArray(crawl.clients) ? crawl.clients[0] : crawl.clients;
    if (client?.organization_id && client.organization_id !== organizationId) {
      return NextResponse.json({ error: "Stored crawl not found" }, { status: 404 });
    }

    const pages = crawl.client_site_page || [];
    const schemaItems = pages.flatMap((page: any) => page.client_schema_item || []);

    return NextResponse.json({
      crawl: {
        id: crawl.id,
        clientId: crawl.client_id,
        seedUrl: crawl.seed_url,
        firecrawlJobId: crawl.firecrawl_job_id,
        status: crawl.status,
        creditsUsed: crawl.credits_used,
        discoveredUrlCount: crawl.discovered_url_count,
        selectedUrlCount: crawl.selected_url_count,
        selectedUrls: crawl.selected_urls || [],
        startedAt: crawl.started_at,
        completedAt: crawl.completed_at,
        createdAt: crawl.created_at,
      },
      client,
      voiceProfile: Array.isArray(crawl.client_voice_profile) ? crawl.client_voice_profile[0] : crawl.client_voice_profile,
      findings: crawl.seo_geo_finding || [],
      schemaTypes: Array.from(new Set(schemaItems.map((item: any) => item.schema_type).filter(Boolean))),
      schemaCount: schemaItems.length,
      pages: pages
        .sort((a: any, b: any) => String(a.url).localeCompare(String(b.url)))
        .map((page: any) => ({
          id: page.id,
          url: page.url,
          canonicalUrl: page.canonical_url,
          statusCode: page.status_code,
          title: page.title,
          description: page.description,
          h1: page.h1,
          pageType: page.page_type,
          wordCount: page.word_count,
          indexabilityStatus: page.indexability_status,
          schemaTypes: (page.client_schema_item || []).map((item: any) => item.schema_type),
          artifactPaths: page.seo_signals?.artifactPaths || {},
        })),
    });
  } catch (error) {
    console.error("Failed to load stored crawl:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load stored crawl" },
      { status: 500 }
    );
  }
}
