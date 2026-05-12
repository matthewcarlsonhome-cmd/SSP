import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const supabase = getServiceClient();
    const { data: audit, error } = await supabase
      .from("air_audits")
      .select("id, tier_id, published_at")
      .eq("public_slug", slug)
      .eq("status", "published")
      .single();
    if (error || !audit) return NextResponse.json({ error: "Published AIR report not found" }, { status: 404 });

    const { data: deliverable, error: deliverableError } = await supabase
      .from("air_audit_deliverables")
      .select("kind, content, generated_at")
      .eq("audit_id", audit.id)
      .eq("is_latest", true)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();
    if (deliverableError || !deliverable) return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });

    return NextResponse.json({
      tier: audit.tier_id,
      publishedAt: audit.published_at,
      kind: deliverable.kind,
      content: deliverable.content,
    });
  } catch (error) {
    console.error("Failed to load public AIR report:", error);
    return NextResponse.json({ error: "Failed to load public AIR report" }, { status: 500 });
  }
}
