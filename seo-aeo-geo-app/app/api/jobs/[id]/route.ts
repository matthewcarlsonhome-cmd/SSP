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

    return NextResponse.json(job);
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
