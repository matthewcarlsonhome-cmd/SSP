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

    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get audit history for this client
    const { data: audits } = await supabase
      .from("audit_jobs")
      .select(
        "id, status, progress, current_step, created_at, completed_at, total_pages_audited, estimated_cost"
      )
      .eq("client_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ ...client, audits: audits || [] });
  } catch (error) {
    console.error("Failed to fetch client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
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

    // Verify client exists
    const { data: client, error: fetchError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", id)
      .single();

    if (fetchError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Delete related audit jobs first (audit_jobs.client_id has no ON DELETE CASCADE)
    // This also cascades to: page_audits, link_opportunities, citation_tasks, audit_logs
    const { error: auditDeleteError } = await supabase
      .from("audit_jobs")
      .delete()
      .eq("client_id", id);

    if (auditDeleteError) {
      console.error("Failed to delete client audits:", auditDeleteError);
      throw auditDeleteError;
    }

    // Delete the client — client_competitors and client_keywords cascade automatically
    const { error: deleteError } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, id, name: client.name });
  } catch (error) {
    console.error("Failed to delete client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
