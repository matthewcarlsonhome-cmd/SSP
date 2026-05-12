import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext } from "@/lib/request-context";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { organizationId } = await resolveRequestContext(request);
    const supabase = getServiceClient();

    const { data: audit, error } = await supabase
      .from("air_audits")
      .select("*, clients(*)")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();
    if (error || !audit) return NextResponse.json({ error: "AIR audit not found" }, { status: 404 });

    const [{ data: scores }, { data: inputs }, { data: events }, { data: deliverables }] = await Promise.all([
      supabase.from("air_audit_scores").select("*").eq("audit_id", id).order("domain"),
      supabase.from("air_audit_inputs").select("*").eq("audit_id", id).order("created_at"),
      supabase.from("air_audit_events").select("*").eq("audit_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("air_audit_deliverables").select("*").eq("audit_id", id).eq("is_latest", true),
    ]);

    return NextResponse.json({ audit, scores: scores || [], inputs: inputs || [], events: events || [], deliverables: deliverables || [] });
  } catch (error) {
    console.error("Failed to get AIR audit:", error);
    return NextResponse.json({ error: "Failed to get AIR audit" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { organizationId } = await resolveRequestContext(request);
    const body = await request.json();
    const supabase = getServiceClient();

    const allowed = ["title", "assigned_lead", "notes", "status", "vertical", "competitor_urls", "primary_website_url"];
    const updates = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("air_audits")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select("*")
      .single();
    if (error) throw error;

    await supabase.from("air_audit_events").insert({
      audit_id: id,
      event_type: "status_changed",
      payload: { updates },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to update AIR audit:", error);
    return NextResponse.json({ error: "Failed to update AIR audit" }, { status: 500 });
  }
}
