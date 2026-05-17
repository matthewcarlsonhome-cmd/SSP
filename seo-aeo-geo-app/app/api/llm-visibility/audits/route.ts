import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext } from "@/lib/request-context";
import { getServiceClient } from "@/lib/supabase";
import {
  replaceClientRecommendations,
  upsertClientToolRun,
  type ClientRecommendationInput,
} from "@/lib/client-workbench";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = body.profile || {};
    const supabase = getServiceClient();
    const { userId, organizationId } = await resolveRequestContext(request);

    let clientId: string | null = null;
    if (profile.website) {
      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("website_url", profile.website)
        .maybeSingle();
      if (existing?.id) {
        clientId = existing.id;
      } else {
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .insert({
            organization_id: organizationId,
            name: profile.brand || "LLM Visibility Client",
            website_url: profile.website,
            business_type: profile.niche || null,
            industry: profile.niche || null,
            target_geography: [profile.city, profile.state].filter(Boolean).join(", ") || null,
          })
          .select("id")
          .single();
        if (clientError) throw clientError;
        clientId = client!.id;
      }
    }

    const auditPayload = {
      organization_id: organizationId,
      client_id: clientId,
      business_name: profile.brand || "LLM Visibility Audit",
      website_url: profile.website || null,
      niche: profile.niche || null,
      city: profile.city || null,
      state: profile.state || null,
      country: profile.country || "US",
      audit_profile_id: body.auditProfileId || "madison-mvp",
      industry_pack_id: body.packId || null,
      selected_providers: body.providers || [],
      status: body.runs?.length ? "review" : "draft",
      visibility_score: body.metrics?.visibilityScore ?? null,
      workbook_average: body.metrics?.workbookAverage ?? null,
      metrics_json: body.metrics || {},
      report_json: body.reportDraft || {},
      action_plan_json: body.actionPlan || [],
      created_by: userId,
      updated_at: new Date().toISOString(),
    };

    let auditId = body.auditId as string | undefined;
    if (auditId) {
      const { error } = await supabase
        .from("llm_visibility_audits")
        .update(auditPayload)
        .eq("id", auditId)
        .eq("organization_id", organizationId);
      if (error) throw error;
      await supabase.from("llm_visibility_runs").delete().eq("audit_id", auditId);
    } else {
      const { data: audit, error } = await supabase
        .from("llm_visibility_audits")
        .insert(auditPayload)
        .select("id")
        .single();
      if (error) throw error;
      auditId = audit!.id;
    }

    const runs = Array.isArray(body.runs) ? body.runs : [];
    if (runs.length) {
      const { error: runError } = await supabase.from("llm_visibility_runs").insert(
        runs.map((run: Record<string, any>) => ({
          audit_id: auditId,
          query_id: run.query?.id || null,
          query_code: run.query?.code || null,
          query_category: run.query?.category || null,
          exact_prompt: run.query?.prompt || "",
          provider: run.provider,
          capture_mode: run.status === "manual" ? "manual" : "api",
          status: run.status,
          qa_status: run.qaStatus || "unreviewed",
          model_id: run.response?.modelId || null,
          raw_response: run.response?.rawText || null,
          raw_response_json: run.response?.rawJson || null,
          citations: run.response?.citations || [],
          source_urls: (run.response?.citations || []).map((citation: { url?: string }) => citation.url).filter(Boolean),
          screenshot_urls: run.screenshotUrls || [],
          scorer: run.scorer || null,
          score_json: run.score || {},
          evidence_note: run.evidenceNote || null,
          caveat_text: run.caveatText || null,
          error_message: run.errorMessage || null,
          started_at: run.startedAt || null,
          completed_at: run.completedAt || null,
        }))
      );
      if (runError) throw runError;
    }

    if (clientId && auditId && organizationId) {
      const completedRuns = runs.filter((run: Record<string, any>) => run.status === "completed" || run.completedAt).length;
      const totalRuns = runs.length || (body.providers?.length || 0) * (body.questions?.length || 0);
      await upsertClientToolRun({
        organizationId,
        clientId,
        toolKey: "llm_visibility",
        status: auditPayload.status === "review" ? "needs_review" : "completed",
        progressPercent: totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 100,
        sourceTable: "llm_visibility_audits",
        sourceId: auditId,
        metricsJson: {
          visibilityScore: auditPayload.visibility_score,
          workbookAverage: auditPayload.workbook_average,
          selectedProviders: auditPayload.selected_providers,
          totalRuns,
          completedRuns,
          metrics: auditPayload.metrics_json,
        },
        completedAt: new Date().toISOString(),
        createdBy: userId,
      }).catch((error) => console.warn("[Workbench] Could not update LLM visibility run:", error));

      await replaceClientRecommendations({
        organizationId,
        clientId,
        sourceTool: "llm_visibility",
        recommendations: buildLlmVisibilityRecommendations(body.actionPlan || []),
        createdBy: userId,
      }).catch((error) => console.warn("[Workbench] Could not store LLM visibility recommendations:", error));
    }

    return NextResponse.json({ id: auditId, persisted: true });
  } catch (error) {
    console.error("Failed to persist LLM visibility audit:", error);
    return NextResponse.json({ error: "Failed to persist LLM visibility audit" }, { status: 500 });
  }
}

function buildLlmVisibilityRecommendations(actionPlan: unknown): ClientRecommendationInput[] {
  if (!Array.isArray(actionPlan)) return [];
  return actionPlan.slice(0, 30).map((item: Record<string, any>, index) => ({
    sourceTool: "llm_visibility",
    category: item.category || item.serviceLine || "visibility",
    priority: normalizePriority(item.priority || (index < 3 ? "high" : "medium")),
    title: item.title || item.recommendedFix || item.action || `LLM visibility fix ${index + 1}`,
    description: item.rationale || item.description || item.why || null,
    recommendedFix: item.recommendedFix || item.action || item.fix || null,
    estimatedHours: item.hours || item.estimatedHours || null,
    estimatedPrice: item.price || item.estimatedPrice || null,
  }));
}

function normalizePriority(priority: unknown): "urgent" | "high" | "medium" | "low" {
  const value = String(priority || "").toLowerCase();
  if (value === "urgent" || value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}
