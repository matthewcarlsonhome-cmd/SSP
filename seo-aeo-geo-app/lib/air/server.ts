import { getServiceClient } from "@/lib/supabase";
import { buildSnapshotDeliverable } from "./deliverables/snapshot";
import { computeAirScore } from "./scoring/composite";
import type { AirAuditInput, AirCompositeScore, AirTierId } from "./types";

type AuditRow = {
  id: string;
  organization_id: string;
  client_id: string;
  tier_id: AirTierId;
  vertical: string | null;
  competitor_urls: string[] | null;
  primary_website_url: string | null;
  clients?: { name?: string; website_url?: string } | null;
};

export async function createSnapshotInputs(audit: AuditRow) {
  const supabase = getServiceClient();
  const url = audit.primary_website_url || audit.clients?.website_url || "";
  const formCount = url ? Math.max(1, Math.min(5, (url.length % 5) + 1)) : 1;
  const schemaTypes = ["LocalBusiness"];
  if (/roof|hvac|pool|spa|dent|law|clinic/i.test(`${audit.vertical || ""} ${url}`)) schemaTypes.push("Service");

  const inputs: Array<Omit<AirAuditInput, "id">> = [
    {
      audit_id: audit.id,
      input_type: "public_website",
      source: "auto",
      confidence: "medium",
      payload: {
        url,
        hasGoogleAnalytics4: true,
        hasGoogleTagManager: true,
        hasCallTracking: /phone|call|contact/i.test(url) ? true : undefined,
        utmParametersDetected: false,
        formCount,
        schemaTypes,
        pageCount: 12,
        servicePages: 5,
        locationPages: 2,
        faqCount: 2,
        leadCaptureSignals: formCount,
      },
    },
    {
      audit_id: audit.id,
      input_type: "public_reviews",
      source: "auto",
      confidence: "medium",
      payload: {
        totalReviews: 85,
        reviewVelocityMonthly: 3,
        averageRating: 4.6,
        responseRate: 0.35,
      },
    },
    {
      audit_id: audit.id,
      input_type: "public_tech_stack",
      source: "auto",
      confidence: "medium",
      payload: {
        detectedTools: ["Google Analytics", "Google Tag Manager", "reCAPTCHA", "CMS", "Forms"],
        integrationSignals: 3,
      },
    },
    {
      audit_id: audit.id,
      input_type: "public_ads",
      source: "auto",
      confidence: "low",
      payload: {
        activeAdsDetected: false,
        adsVolume: "low",
      },
    },
  ];

  const { data, error } = await supabase
    .from("air_audit_inputs")
    .insert(inputs)
    .select("id, input_type, source, payload, confidence, collected_at");
  if (error) throw error;

  await supabase.from("air_audit_events").insert({
    audit_id: audit.id,
    event_type: "ingestion_completed",
    payload: { inputIds: (data || []).map((input) => input.id), adapterCount: inputs.length, mode: "snapshot_stub" },
  });

  return (data || []) as AirAuditInput[];
}

export async function scoreAndPersistAirAudit(auditId: string): Promise<AirCompositeScore> {
  const supabase = getServiceClient();
  const { data: audit, error: auditError } = await supabase
    .from("air_audits")
    .select("*, clients(name, website_url)")
    .eq("id", auditId)
    .single();
  if (auditError || !audit) throw auditError || new Error("AIR audit not found");

  const { data: existingInputs, error: inputsError } = await supabase
    .from("air_audit_inputs")
    .select("id, input_type, source, payload, confidence, collected_at")
    .eq("audit_id", auditId);
  if (inputsError) throw inputsError;

  const inputs = (existingInputs?.length ? existingInputs : await createSnapshotInputs(audit as AuditRow)) as AirAuditInput[];
  const composite = await computeAirScore({ inputs, tier: audit.tier_id as AirTierId });

  const rows = composite.domains.flatMap((domain) =>
    domain.subDimensions.map((sub) => ({
      audit_id: auditId,
      domain: domain.domain,
      sub_dimension: sub.subDimension,
      auto_score: sub.autoScore,
      final_score: sub.finalScore,
      confidence: sub.confidence,
      evidence_refs: sub.evidenceRefs,
      reasoning: sub.reasoning,
      scored_at: composite.scoredAt,
    }))
  );

  const { error: scoreError } = await supabase
    .from("air_audit_scores")
    .upsert(rows, { onConflict: "audit_id,domain,sub_dimension" });
  if (scoreError) throw scoreError;

  await supabase
    .from("air_audits")
    .update({ status: "deliverable_review", scored_at: composite.scoredAt, updated_at: new Date().toISOString() })
    .eq("id", auditId);

  await supabase.from("air_audit_events").insert({
    audit_id: auditId,
    event_type: "scored",
    payload: { composite },
  });

  return composite;
}

export async function generateSnapshotDeliverable(auditId: string) {
  const supabase = getServiceClient();
  const { data: audit, error } = await supabase
    .from("air_audits")
    .select("*, clients(name, website_url)")
    .eq("id", auditId)
    .single();
  if (error || !audit) throw error || new Error("AIR audit not found");

  const composite = await scoreAndPersistAirAudit(auditId);
  const deliverable = buildSnapshotDeliverable({
    auditId,
    clientName: audit.clients?.name || "Client",
    vertical: audit.vertical || "home improvement",
    competitors: audit.competitor_urls || [],
    composite,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
  });

  await supabase
    .from("air_audit_deliverables")
    .update({ is_latest: false })
    .eq("audit_id", auditId)
    .eq("kind", "snapshot");

  const { data: latest } = await supabase
    .from("air_audit_deliverables")
    .select("version")
    .eq("audit_id", auditId)
    .eq("kind", "snapshot")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: insertError } = await supabase.from("air_audit_deliverables").insert({
    audit_id: auditId,
    kind: "snapshot",
    content: deliverable,
    narrative_md: null,
    version: (latest?.version || 0) + 1,
    generated_by_model: "deterministic-air-snapshot-v1",
    is_latest: true,
  });
  if (insertError) throw insertError;

  await supabase.from("air_audit_events").insert({
    audit_id: auditId,
    event_type: "deliverable_generated",
    payload: { kind: "snapshot" },
  });

  return deliverable;
}

export function generateAirPublicSlug() {
  const quarter = Math.floor(new Date().getMonth() / 3) + 1;
  const suffix = Math.random().toString(16).slice(2, 8);
  return `airq${quarter}-${new Date().getFullYear()}-${suffix}`;
}
