import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

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
