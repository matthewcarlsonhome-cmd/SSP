import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const supabase = getServiceClient();
    const { error } = await supabase.from("llm_visibility_leads").insert({
      audit_id: body.auditId || null,
      public_slug: body.publicSlug || null,
      name: body.name || null,
      email: body.email,
      phone: body.phone || null,
      business_name: body.business || body.businessName || null,
      website_url: body.website || null,
      business_category: body.businessCategory || null,
      payload_json: body.scorecard ? { scorecard: body.scorecard } : {},
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to capture LLM visibility lead:", error);
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}
