import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext } from "@/lib/request-context";
import { getServiceClient } from "@/lib/supabase";
import { AIR_TIER_CONFIGS } from "@/lib/air/config";
import { generateSnapshotDeliverable } from "@/lib/air/server";
import type { AirTierId } from "@/lib/air/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveRequestContext(request);
    const tierId = request.nextUrl.searchParams.get("tierId");
    const status = request.nextUrl.searchParams.get("status");
    const supabase = getServiceClient();

    let query = supabase
      .from("air_audits")
      .select("*, clients(name, website_url)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (tierId) query = query.eq("tier_id", tierId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to list AIR audits:", error);
    return NextResponse.json({ error: "Failed to list AIR audits" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tierId = (body.tierId || "air_snapshot") as AirTierId;
    if (!AIR_TIER_CONFIGS.some((tier) => tier.id === tierId)) {
      return NextResponse.json({ error: `Unknown AIR tier: ${tierId}` }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { userId, organizationId } = await resolveRequestContext(request, body.clientId);
    let clientId = body.clientId as string | undefined;

    if (!clientId) {
      if (!body.clientName && !body.primaryWebsiteUrl) {
        return NextResponse.json({ error: "clientId, clientName, or primaryWebsiteUrl is required" }, { status: 400 });
      }
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          organization_id: organizationId,
          name: body.clientName || body.businessName || "AIR Snapshot Client",
          website_url: body.primaryWebsiteUrl || body.websiteUrl || "",
          business_type: body.vertical || body.businessCategory || null,
          industry: body.vertical || body.businessCategory || null,
          target_geography: body.city || null,
        })
        .select("id")
        .single();
      if (clientError) throw clientError;
      clientId = client!.id;
    }

    const { data: audit, error } = await supabase
      .from("air_audits")
      .insert({
        organization_id: organizationId,
        client_id: clientId,
        tier_id: tierId,
        status: tierId === "air_snapshot" ? "scoring" : "intake_in_progress",
        title: body.title || null,
        vertical: body.vertical || body.businessCategory || null,
        primary_website_url: body.primaryWebsiteUrl || body.websiteUrl || null,
        competitor_urls: Array.isArray(body.competitorUrls) ? body.competitorUrls : [],
        created_by: userId,
        intake_started_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabase.from("air_audit_events").insert({
      audit_id: audit!.id,
      event_type: "created",
      payload: { tierId },
      actor_user_id: userId,
    });

    if (tierId === "air_snapshot") {
      await generateSnapshotDeliverable(audit!.id);
    }

    return NextResponse.json({ ...audit, estimatedCompletionAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
  } catch (error) {
    console.error("Failed to create AIR audit:", error);
    return NextResponse.json({ error: "Failed to create AIR audit" }, { status: 500 });
  }
}
