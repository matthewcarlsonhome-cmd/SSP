import { NextRequest, NextResponse } from "next/server";
import { scoreAndPersistAirAudit } from "@/lib/air/server";
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
      .select("id")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();
    if (!audit) return NextResponse.json({ error: "AIR audit not found" }, { status: 404 });

    const composite = await scoreAndPersistAirAudit(id);
    return NextResponse.json(composite);
  } catch (error) {
    console.error("Failed to score AIR audit:", error);
    return NextResponse.json({ error: "Failed to score AIR audit" }, { status: 500 });
  }
}
