import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext } from "@/lib/request-context";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ crawlId: string; pageId: string }> }
) {
  try {
    const { crawlId, pageId } = await params;
    const { organizationId } = await resolveRequestContext(request);
    const supabase = getServiceClient();
    if (!organizationId) {
      return NextResponse.json({ error: "Stored crawl page not found" }, { status: 404 });
    }

    const { data: page, error } = await supabase
      .from("client_site_page")
      .select("*, client_schema_item(*), client_site_crawl(client_id, clients(organization_id))")
      .eq("id", pageId)
      .eq("crawl_id", crawlId)
      .single();

    if (error || !page) {
      return NextResponse.json({ error: "Stored crawl page not found" }, { status: 404 });
    }

    const crawl = Array.isArray(page.client_site_crawl) ? page.client_site_crawl[0] : page.client_site_crawl;
    const client = Array.isArray(crawl?.clients) ? crawl.clients[0] : crawl?.clients;
    if (client?.organization_id && client.organization_id !== organizationId) {
      return NextResponse.json({ error: "Stored crawl page not found" }, { status: 404 });
    }

    const [markdown, rawHtml, cleanHtml] = await Promise.all([
      downloadArtifact(page.markdown_storage_path),
      downloadArtifact(page.raw_html_storage_path),
      downloadArtifact(page.seo_signals?.artifactPaths?.html || deriveCleanHtmlPath(page.raw_html_storage_path)),
    ]);

    return NextResponse.json({
      page: {
        id: page.id,
        crawlId: page.crawl_id,
        url: page.url,
        canonicalUrl: page.canonical_url,
        statusCode: page.status_code,
        title: page.title,
        description: page.description,
        h1: page.h1,
        pageType: page.page_type,
        wordCount: page.word_count,
        indexabilityStatus: page.indexability_status,
        seoSignals: page.seo_signals || {},
      },
      schema: page.client_schema_item || [],
      artifacts: {
        markdown,
        rawHtml,
        cleanHtml,
        paths: {
          markdown: page.markdown_storage_path,
          rawHtml: page.raw_html_storage_path,
          cleanHtml: page.seo_signals?.artifactPaths?.html || deriveCleanHtmlPath(page.raw_html_storage_path),
        },
      },
    });
  } catch (error) {
    console.error("Failed to load stored crawl page:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load stored crawl page" },
      { status: 500 }
    );
  }
}

async function downloadArtifact(path?: string | null) {
  if (!path) return null;
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage.from("site-crawl-artifacts").download(path);
  if (error || !data) return null;
  return data.text();
}

function deriveCleanHtmlPath(rawPath?: string | null) {
  return rawPath?.replace(/\/raw\.html$/, "/clean.html") || null;
}
