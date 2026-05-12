import { NextRequest, NextResponse } from "next/server";
import { generateSnapshotDeliverable } from "@/lib/air/server";
import { resolveRequestContext } from "@/lib/request-context";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { organizationId } = await resolveRequestContext(request);
    const supabase = getServiceClient();
    const { data: audit } = await supabase
      .from("air_audits")
      .select("id, tier_id")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();
    if (!audit) return NextResponse.json({ error: "AIR audit not found" }, { status: 404 });

    const deliverable = await generateSnapshotDeliverable(id);
    return NextResponse.json(deliverable);
  } catch (error) {
    console.error("Failed to generate AIR deliverable:", error);
    return NextResponse.json({ error: "Failed to generate AIR deliverable" }, { status: 500 });
  }
}
