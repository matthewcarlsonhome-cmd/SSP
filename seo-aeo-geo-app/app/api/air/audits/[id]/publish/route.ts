import { NextRequest, NextResponse } from "next/server";
import { generateAirPublicSlug } from "@/lib/air/server";
import { resolveRequestContext } from "@/lib/request-context";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { organizationId } = await resolveRequestContext(request);
    const supabase = getServiceClient();
    const slug = generateAirPublicSlug();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("air_audits")
      .update({ public_slug: slug, status: "published", published_at: now, updated_at: now })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select("public_slug")
      .single();
    if (error) throw error;

    await supabase.from("air_audit_events").insert({
      audit_id: id,
      event_type: "published",
      payload: { publicSlug: slug },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.json({ publicUrl: `${baseUrl}/public-air/${data!.public_slug}` });
  } catch (error) {
    console.error("Failed to publish AIR audit:", error);
    return NextResponse.json({ error: "Failed to publish AIR audit" }, { status: 500 });
  }
}
