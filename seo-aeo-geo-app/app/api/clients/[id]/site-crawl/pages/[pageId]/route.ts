import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const { id: clientId, pageId } = await params;
    const supabase = getServiceClient();

    const { data: page, error: pageError } = await supabase
      .from("client_site_page")
      .select("*, client_schema_item(*)")
      .eq("id", pageId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: "Crawl page not found" }, { status: 404 });
    }

    const { data: crawl, error: crawlError } = await supabase
      .from("client_site_crawl")
      .select("id, client_id, seed_url, firecrawl_job_id, status, created_at")
      .eq("id", page.crawl_id)
      .eq("client_id", clientId)
      .single();

    if (crawlError || !crawl) {
      return NextResponse.json({ error: "Crawl page does not belong to this client" }, { status: 404 });
    }

    const [markdown, rawHtml, cleanHtml] = await Promise.all([
      downloadArtifact(page.markdown_storage_path),
      downloadArtifact(page.raw_html_storage_path),
      downloadArtifact(page.seo_signals?.artifactPaths?.html || deriveCleanHtmlPath(page.raw_html_storage_path)),
    ]);

    return NextResponse.json({
      crawl,
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
    console.error("Failed to load crawl page content:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load crawl page content" },
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
