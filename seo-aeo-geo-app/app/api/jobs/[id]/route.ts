import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

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

    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to fetch job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}
