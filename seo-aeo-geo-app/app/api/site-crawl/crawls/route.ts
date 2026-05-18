import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext } from "@/lib/request-context";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveRequestContext(request);
    const supabase = getServiceClient();
    if (!organizationId) {
      return NextResponse.json({ error: "Unable to resolve organization for stored crawls" }, { status: 400 });
    }

    const { data: clients, error: clientError } = await supabase
      .from("clients")
      .select("id, name, website_url, business_type")
      .eq("organization_id", organizationId);

    if (clientError) throw clientError;

    const clientRows = clients || [];
    const clientIds = clientRows.map((client) => client.id);
    if (!clientIds.length) {
      return NextResponse.json({ crawls: [] });
    }

    const clientById = new Map(clientRows.map((client) => [client.id, client]));
    const { data: crawls, error } = await supabase
      .from("client_site_crawl")
      .select("*, client_site_page(id, client_schema_item(id))")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) throw error;

    return NextResponse.json({
      crawls: (crawls || []).map((crawl: any) => {
        const client = clientById.get(crawl.client_id) || null;
        const pages = crawl.client_site_page || [];
        const schemaCount = pages.reduce(
          (sum: number, page: any) => sum + ((page.client_schema_item || []).length || 0),
          0
        );

        return {
          id: crawl.id,
          clientId: crawl.client_id,
          seedUrl: crawl.seed_url,
          status: crawl.status,
          creditsUsed: crawl.credits_used,
          discoveredUrlCount: crawl.discovered_url_count,
          selectedUrlCount: crawl.selected_url_count,
          pageCount: pages.length,
          schemaCount,
          createdAt: crawl.created_at,
          completedAt: crawl.completed_at,
          client,
          storedPagesUrl: `/site-crawl/stored/${crawl.id}`,
          designZipUrl: `/api/clients/${crawl.client_id}/site-crawl/download?crawlId=${crawl.id}`,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to list stored crawls:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list stored crawls" },
      { status: 500 }
    );
  }
}
