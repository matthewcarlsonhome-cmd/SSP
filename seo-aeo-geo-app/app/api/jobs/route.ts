import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, cleanupStaleJobs } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const brief = await request.json();
    const supabase = getServiceClient();

    // Create or find client
    let clientId: string;
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("website_url", brief.website_url)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
      // Update client info
      await supabase
        .from("clients")
        .update({
          name: brief.client_name,
          business_type: brief.business_type,
          industry: brief.industry,
          target_geography: brief.target_geography,
          primary_goal: brief.primary_goal,
          gbp_url: brief.gbp?.url,
          gbp_review_count: brief.gbp?.reviewCount
            ? parseInt(brief.gbp.reviewCount)
            : null,
          gbp_average_rating: brief.gbp?.avgRating
            ? parseFloat(brief.gbp.avgRating)
            : null,
          cms_platform: brief.cms_platform,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);
    } else {
      const { data: newClient, error } = await supabase
        .from("clients")
        .insert({
          name: brief.client_name,
          website_url: brief.website_url,
          business_type: brief.business_type,
          industry: brief.industry,
          target_geography: brief.target_geography,
          primary_goal: brief.primary_goal,
          gbp_url: brief.gbp?.url,
          gbp_review_count: brief.gbp?.reviewCount
            ? parseInt(brief.gbp.reviewCount)
            : null,
          gbp_average_rating: brief.gbp?.avgRating
            ? parseFloat(brief.gbp.avgRating)
            : null,
          cms_platform: brief.cms_platform,
        })
        .select("id")
        .single();

      if (error) throw error;
      clientId = newClient!.id;
    }

    // Store competitors
    if (brief.competitors?.length) {
      const validCompetitors = brief.competitors.filter(
        (c: { url: string }) => c.url
      );
      if (validCompetitors.length) {
        await supabase.from("client_competitors").upsert(
          validCompetitors.map((c: { url: string; name: string }) => ({
            client_id: clientId,
            website_url: c.url,
            name: c.name,
          }))
        );
      }
    }

    // Store keywords
    if (brief.keywords?.length) {
      const validKeywords = brief.keywords.filter(
        (k: { keyword: string }) => k.keyword
      );
      if (validKeywords.length) {
        await supabase.from("client_keywords").upsert(
          validKeywords.map(
            (k: { keyword: string; priority: string; currentRanking: string }) => ({
              client_id: clientId,
              keyword: k.keyword,
              priority: k.priority || "medium",
              current_ranking: k.currentRanking
                ? parseInt(k.currentRanking)
                : null,
            })
          )
        );
      }
    }

    // Create audit job
    const { data: job, error: jobError } = await supabase
      .from("audit_jobs")
      .insert({
        client_id: clientId,
        status: "pending",
        progress: 0,
        input_brief: brief,
        current_step: "Queued — waiting for pipeline to start...",
      })
      .select("id")
      .single();

    if (jobError) throw jobError;

    // Trigger pipeline (async — fire and forget)
    fetch(`${request.nextUrl.origin}/api/pipeline/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job!.id }),
    }).catch(() => {
      // Pipeline will handle its own errors
    });

    return NextResponse.json({ id: job!.id, clientId });
  } catch (error) {
    console.error("Failed to create job:", error);
    return NextResponse.json(
      { error: "Failed to create audit job" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Clean up any jobs stuck from a previous server session
    await cleanupStaleJobs();

    const supabase = getServiceClient();

    const { data: jobs, error } = await supabase
      .from("audit_jobs")
      .select(
        `
        id, status, progress, current_step, error_message, created_at, started_at, completed_at,
        total_pages_audited, estimated_cost,
        clients (id, name, website_url, target_geography, industry)
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Failed to list jobs:", error);
    return NextResponse.json(
      { error: "Failed to list jobs" },
      { status: 500 }
    );
  }
}
