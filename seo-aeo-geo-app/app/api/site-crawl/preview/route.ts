import { NextRequest, NextResponse } from "next/server";
import { isFirecrawlConfigured } from "@/lib/firecrawl/client";
import { previewFirecrawlSiteMap } from "@/lib/site-crawl/firecrawl-ingest";

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
    const url = typeof body.url === "string" ? body.url : "";
    const profile = typeof body.profile === "string" ? body.profile : "standard";
    if (!url.trim()) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const preview = await previewFirecrawlSiteMap(url, profile);
    return NextResponse.json(preview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to preview Firecrawl map";
    console.error("[site-crawl-preview]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
