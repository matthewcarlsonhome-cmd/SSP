import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { data: job, error } = await supabase
      .from("audit_jobs")
      .select(
        `
        *,
        clients (id, name, website_url, target_geography, industry, business_type),
        page_audits (*),
        link_opportunities (*),
        citation_tasks (*)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Fetch audit logs (bypasses RLS since we use service client)
    const { data: logs } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("job_id", id)
      .order("timestamp", { ascending: true });

    const { data: siteCrawls, error: siteCrawlError } = await supabase
      .from("client_site_crawl")
      .select(
        `
        *,
        client_site_page (*, client_schema_item (*)),
        client_voice_profile (*),
        seo_geo_finding (*)
      `
      )
      .eq("job_id", id)
      .order("created_at", { ascending: false });

    if (siteCrawlError) {
      console.warn("Failed to fetch Firecrawl site evidence:", siteCrawlError.message);
    }

    return NextResponse.json({
      ...job,
      audit_logs: logs || [],
      site_crawls: siteCrawls || [],
    });
  } catch (error) {
    console.error("Failed to fetch job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    // Verify job exists
    const { data: job, error: fetchError } = await supabase
      .from("audit_jobs")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Delete the job — related records (page_audits, logs, etc.) cascade automatically
    const { error: deleteError } = await supabase
      .from("audit_jobs")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Failed to delete job:", error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
}
