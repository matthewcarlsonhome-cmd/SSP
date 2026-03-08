import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getServiceClient();

    const { data: clients, error } = await supabase
      .from("clients")
      .select(
        `
        id, name, website_url, industry, target_geography, primary_goal,
        gbp_average_rating, gbp_review_count, cms_platform,
        created_at, updated_at
      `
      )
      .order("updated_at", { ascending: false });

    if (error) throw error;

    // For each client, get audit count and latest audit info
    const clientIds = (clients || []).map((c) => c.id);
    const { data: audits } = await supabase
      .from("audit_jobs")
      .select("id, client_id, status, created_at, total_pages_audited")
      .in("client_id", clientIds.length > 0 ? clientIds : ["__none__"])
      .order("created_at", { ascending: false });

    const clientsWithAudits = (clients || []).map((client) => {
      const clientAudits = (audits || []).filter(
        (a) => a.client_id === client.id
      );
      return {
        ...client,
        audit_count: clientAudits.length,
        last_audit_date: clientAudits[0]?.created_at || null,
        last_audit_status: clientAudits[0]?.status || null,
      };
    });

    return NextResponse.json(clientsWithAudits);
  } catch (error) {
    console.error("Failed to list clients:", error);
    return NextResponse.json(
      { error: "Failed to list clients" },
      { status: 500 }
    );
  }
}
