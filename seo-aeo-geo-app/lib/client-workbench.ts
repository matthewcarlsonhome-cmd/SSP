import { getServiceClient, type Client } from "@/lib/supabase";

export type WorkbenchToolKey = "firecrawl" | "seo_geo" | "llm_visibility" | "air";
export type WorkbenchRunStatus = "not_started" | "queued" | "running" | "completed" | "failed" | "needs_review";
export type RecommendationPriority = "urgent" | "high" | "medium" | "low";

export type ClientToolRunInput = {
  organizationId: string;
  clientId: string;
  cycleId?: string | null;
  toolKey: WorkbenchToolKey;
  status: WorkbenchRunStatus;
  progressPercent?: number;
  sourceTable?: string | null;
  sourceId?: string | null;
  configJson?: Record<string, unknown>;
  metricsJson?: Record<string, unknown>;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdBy?: string | null;
};

export type ClientRecommendationInput = {
  sourceTool: "firecrawl" | "seo_geo" | "llm_visibility" | "air" | "manual";
  category: string;
  priority?: RecommendationPriority;
  title: string;
  description?: string | null;
  evidenceRefs?: unknown[];
  recommendedFix?: string | null;
  owner?: string | null;
  estimatedHours?: number | null;
  estimatedPrice?: number | null;
  status?: "recommended" | "accepted" | "in_progress" | "done" | "wont_fix";
};

type SupabaseLike = ReturnType<typeof getServiceClient>;

const TOOL_LABELS: Record<WorkbenchToolKey, string> = {
  firecrawl: "Firecrawl Site Crawl",
  seo_geo: "SEO/AEO/GEO Audit",
  llm_visibility: "LLM Visibility Audit",
  air: "AI Readiness Audit",
};

const TOOL_DESCRIPTIONS: Record<WorkbenchToolKey, string> = {
  firecrawl: "Site evidence layer: sitemap, pages, schema, voice, and answer-readiness signals.",
  seo_geo: "Technical SEO, answer-engine readiness, entity signals, page fixes, and roadmap.",
  llm_visibility: "Clean buyer-intent prompts across AI answer engines with evidence and share of voice.",
  air: "Operational readiness for AI adoption across team, data, workflow, stack, and opportunity density.",
};

export async function ensureClientAuditCycle(args: {
  organizationId: string;
  clientId: string;
  name?: string;
  createdBy?: string | null;
}) {
  const supabase = getServiceClient();
  const { data: existing } = await supabase
    .from("client_audit_cycles")
    .select("*")
    .eq("organization_id", args.organizationId)
    .eq("client_id", args.clientId)
    .in("status", ["active", "running", "review"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("client_audit_cycles")
    .insert({
      organization_id: args.organizationId,
      client_id: args.clientId,
      name: args.name || "Client visibility cycle",
      status: "active",
      created_by: args.createdBy || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function upsertClientToolRun(input: ClientToolRunInput) {
  const supabase = getServiceClient();
  const cycle =
    input.cycleId
      ? { id: input.cycleId }
      : await ensureClientAuditCycle({
          organizationId: input.organizationId,
          clientId: input.clientId,
          createdBy: input.createdBy || null,
        });

  const normalizedProgress = Math.max(0, Math.min(100, input.progressPercent ?? statusProgress(input.status)));
  const payload = {
    organization_id: input.organizationId,
    client_id: input.clientId,
    cycle_id: cycle.id,
    tool_key: input.toolKey,
    status: input.status,
    progress_percent: normalizedProgress,
    source_table: input.sourceTable || null,
    source_id: input.sourceId || null,
    config_json: input.configJson || {},
    metrics_json: input.metricsJson || {},
    error_message: input.errorMessage || null,
    started_at: input.startedAt || (input.status === "running" ? new Date().toISOString() : null),
    completed_at: input.completedAt || (["completed", "failed", "needs_review"].includes(input.status) ? new Date().toISOString() : null),
    updated_at: new Date().toISOString(),
  };

  let existingId: string | null = null;

  if (input.sourceId && input.sourceTable) {
    const { data } = await supabase
      .from("client_tool_runs")
      .select("id")
      .eq("client_id", input.clientId)
      .eq("tool_key", input.toolKey)
      .eq("source_table", input.sourceTable)
      .eq("source_id", input.sourceId)
      .maybeSingle();
    existingId = data?.id || null;
  }

  if (!existingId) {
    const { data } = await supabase
      .from("client_tool_runs")
      .select("id")
      .eq("client_id", input.clientId)
      .eq("cycle_id", cycle.id)
      .eq("tool_key", input.toolKey)
      .is("source_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    existingId = data?.id || null;
  }

  if (existingId) {
    const { error } = await supabase.from("client_tool_runs").update(payload).eq("id", existingId);
    if (error) throw error;
    return { id: existingId, cycleId: cycle.id };
  }

  const { data, error } = await supabase.from("client_tool_runs").insert(payload).select("id").single();
  if (error) throw error;
  return { id: data.id as string, cycleId: cycle.id };
}

export async function replaceClientRecommendations(args: {
  organizationId: string;
  clientId: string;
  cycleId?: string | null;
  sourceTool: ClientRecommendationInput["sourceTool"];
  recommendations: ClientRecommendationInput[];
  createdBy?: string | null;
}) {
  const supabase = getServiceClient();
  const cycle =
    args.cycleId
      ? { id: args.cycleId }
      : await ensureClientAuditCycle({
          organizationId: args.organizationId,
          clientId: args.clientId,
          createdBy: args.createdBy || null,
        });

  await supabase
    .from("client_recommendations")
    .delete()
    .eq("client_id", args.clientId)
    .eq("cycle_id", cycle.id)
    .eq("source_tool", args.sourceTool);

  if (!args.recommendations.length) return { cycleId: cycle.id, inserted: 0 };

  const rows = args.recommendations.slice(0, 30).map((item) => ({
    organization_id: args.organizationId,
    client_id: args.clientId,
    cycle_id: cycle.id,
    source_tool: item.sourceTool,
    category: item.category,
    priority: item.priority || "medium",
    title: item.title,
    description: item.description || null,
    evidence_refs: item.evidenceRefs || [],
    recommended_fix: item.recommendedFix || null,
    owner: item.owner || "agency",
    estimated_hours: item.estimatedHours ?? null,
    estimated_price: item.estimatedPrice ?? null,
    status: item.status || "recommended",
  }));

  const { error } = await supabase.from("client_recommendations").insert(rows);
  if (error) throw error;
  return { cycleId: cycle.id, inserted: rows.length };
}

export async function buildClientWorkbench(clientId: string) {
  const supabase = getServiceClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error || !client) {
    throw new Error("Client not found");
  }

  const organizationId = client.organization_id as string;

  const [
    auditsResult,
    cycleResult,
    seoJobResult,
    crawlResult,
    llmResult,
    airResult,
  ] = await Promise.all([
    supabase
      .from("audit_jobs")
      .select("id, status, progress, current_step, created_at, completed_at, total_pages_audited, estimated_cost, error_message")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_audit_cycles")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("audit_jobs")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("client_site_crawl")
      .select("*, client_site_page(*, client_schema_item(*)), seo_geo_finding(*)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("llm_visibility_audits")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("air_audits")
      .select("*, air_audit_deliverables(*), air_audit_quick_wins(*)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const cycle = cycleResult.data || null;
  const cycleId = cycle?.id || null;

  const [toolRunsResult, storedRecommendationsResult, voiceResult, llmRunsResult] = await Promise.all([
    cycleId
      ? supabase
          .from("client_tool_runs")
          .select("*")
          .eq("cycle_id", cycleId)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    cycleId
      ? supabase
          .from("client_recommendations")
          .select("*")
          .eq("cycle_id", cycleId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    crawlResult.data?.id
      ? supabase
          .from("client_voice_profile")
          .select("*")
          .eq("crawl_id", crawlResult.data.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    llmResult.data?.id
      ? supabase
          .from("llm_visibility_runs")
          .select("id, provider, status, qa_status, score_json, citations, source_urls")
          .eq("audit_id", llmResult.data.id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const latestSeoJob = seoJobResult.data || null;
  const latestCrawl = crawlResult.data || null;
  const latestLlmAudit = llmResult.data || null;
  const latestAirAudit = airResult.data || null;

  const storedRuns = toolRunsResult.data || [];
  const toolRuns = buildToolRunCards(storedRuns, {
    latestSeoJob,
    latestCrawl,
    latestLlmAudit,
    latestAirAudit,
    llmRuns: llmRunsResult.data || [],
  });

  const pages = latestCrawl?.client_site_page || [];
  const findings = latestCrawl?.seo_geo_finding || [];
  const schemaItems = pages.flatMap((page: any) => page.client_schema_item || []);
  const schemaTypes = Array.from(new Set(schemaItems.map((item: any) => item.schema_type).filter(Boolean)));
  const voiceProfile = voiceResult.data || null;
  const llmActionPlan = Array.isArray(latestLlmAudit?.action_plan_json) ? latestLlmAudit.action_plan_json : [];
  const airQuickWins = latestAirAudit?.air_audit_quick_wins || [];

  const recommendations = normalizeRecommendations([
    ...(storedRecommendationsResult.data || []),
    ...findings.map((finding: any) => ({
      id: `finding-${finding.id}`,
      source_tool: "firecrawl",
      category: finding.category || "site evidence",
      priority: severityToPriority(finding.severity),
      title: finding.title,
      description: Array.isArray(finding.evidence) ? finding.evidence.join(" ") : "",
      recommended_fix: finding.recommended_fix,
      status: finding.status === "done" ? "done" : "recommended",
      created_at: finding.created_at,
    })),
    ...llmActionPlan.map((item: any, index: number) => ({
      id: `llm-action-${index}`,
      source_tool: "llm_visibility",
      category: item.category || item.serviceLine || "visibility",
      priority: normalizePriority(item.priority),
      title: item.title || item.recommendedFix || item.action || `LLM visibility fix ${index + 1}`,
      description: item.rationale || item.description || "",
      recommended_fix: item.recommendedFix || item.action || null,
      estimated_hours: item.hours || item.estimatedHours || null,
      estimated_price: item.price || item.estimatedPrice || null,
      status: "recommended",
      created_at: latestLlmAudit?.updated_at || latestLlmAudit?.created_at,
    })),
    ...airQuickWins.map((win: any) => ({
      id: `air-win-${win.id}`,
      source_tool: "air",
      category: win.ssp_service_match || "ai readiness",
      priority: win.rank === 1 ? "high" : "medium",
      title: win.title,
      description: win.body,
      recommended_fix: win.projected_impact,
      status: "recommended",
      created_at: win.created_at,
    })),
  ]);

  const latestAirDeliverable = (latestAirAudit?.air_audit_deliverables || [])
    .filter((deliverable: any) => deliverable.is_latest !== false)
    .sort((a: any, b: any) => String(b.generated_at || "").localeCompare(String(a.generated_at || "")))[0];
  const airComposite = latestAirDeliverable?.content?.composite?.composite ?? null;

  return {
    client: client as Client,
    audits: auditsResult.data || [],
    cycle,
    workbench: {
      summary: {
        organizationId,
        overallProgress: Math.round(toolRuns.reduce((sum, run) => sum + run.progressPercent, 0) / toolRuns.length),
        completedTools: toolRuns.filter((run) => run.status === "completed").length,
        activeTools: toolRuns.filter((run) => ["queued", "running", "needs_review"].includes(run.status)).length,
        recommendedActions: recommendations.filter((rec) => rec.status !== "done").length,
        latestUpdatedAt: latestUpdatedAt([latestSeoJob, latestCrawl, latestLlmAudit, latestAirAudit, cycle]),
      },
      toolRuns,
      firecrawl: {
        crawl: latestCrawl,
        pageCount: pages.length,
        schemaTypes,
        schemaCount: schemaItems.length,
        pages: pages.map((page: any) => ({
          id: page.id,
          url: page.url,
          pageType: page.page_type,
          title: page.title,
          h1: page.h1,
          wordCount: page.word_count,
          indexabilityStatus: page.indexability_status,
          schemaTypes: (page.client_schema_item || []).map((item: any) => item.schema_type),
        })),
        voiceProfile,
        findings,
      },
      seoGeo: {
        latestJob: latestSeoJob,
        pageOptimizations: Array.isArray(latestSeoJob?.page_optimizations) ? latestSeoJob.page_optimizations.length : 0,
        roadmapItems: countRoadmapItems(latestSeoJob?.roadmap),
      },
      llmVisibility: {
        latestAudit: latestLlmAudit,
        runCount: (llmRunsResult.data || []).length,
        providerCount: new Set((llmRunsResult.data || []).map((run: any) => run.provider)).size,
        visibilityScore: latestLlmAudit?.visibility_score ?? null,
        workbookAverage: latestLlmAudit?.workbook_average ?? null,
        mentions: latestLlmAudit?.metrics_json?.clientMentions ?? latestLlmAudit?.metrics_json?.mentions ?? null,
      },
      air: {
        latestAudit: latestAirAudit,
        composite: airComposite,
        band: latestAirDeliverable?.content?.composite?.bandLabel || latestAirDeliverable?.content?.composite?.band || null,
        quickWins: airQuickWins,
      },
      recommendations,
    },
  };
}

function buildToolRunCards(
  storedRuns: any[],
  sources: {
    latestSeoJob: any;
    latestCrawl: any;
    latestLlmAudit: any;
    latestAirAudit: any;
    llmRuns: any[];
  }
) {
  const byTool = new Map<WorkbenchToolKey, any>();
  for (const run of storedRuns) {
    if (!byTool.has(run.tool_key)) byTool.set(run.tool_key, run);
  }

  return (Object.keys(TOOL_LABELS) as WorkbenchToolKey[]).map((toolKey) => {
    const stored = byTool.get(toolKey);
    const derived = deriveToolRun(toolKey, sources);
    const run = stored || derived;
    return {
      toolKey,
      label: TOOL_LABELS[toolKey],
      description: TOOL_DESCRIPTIONS[toolKey],
      status: (run?.status || "not_started") as WorkbenchRunStatus,
      progressPercent: Number(run?.progress_percent ?? run?.progressPercent ?? statusProgress(run?.status || "not_started")),
      sourceTable: run?.source_table || run?.sourceTable || null,
      sourceId: run?.source_id || run?.sourceId || null,
      metrics: run?.metrics_json || run?.metrics || {},
      errorMessage: run?.error_message || run?.errorMessage || null,
      startedAt: run?.started_at || run?.startedAt || null,
      completedAt: run?.completed_at || run?.completedAt || null,
      updatedAt: run?.updated_at || run?.updatedAt || null,
    };
  });
}

function deriveToolRun(toolKey: WorkbenchToolKey, sources: any) {
  if (toolKey === "firecrawl" && sources.latestCrawl) {
    const status = mapCrawlStatus(sources.latestCrawl.status);
    return {
      status,
      progressPercent: statusProgress(status),
      sourceTable: "client_site_crawl",
      sourceId: sources.latestCrawl.id,
      metrics: {
        capturedPages: sources.latestCrawl.client_site_page?.length || 0,
        discoveredUrls: sources.latestCrawl.discovered_url_count || 0,
        selectedUrls: sources.latestCrawl.selected_url_count || 0,
        creditsUsed: sources.latestCrawl.credits_used || 0,
      },
      errorMessage: sources.latestCrawl.error_message,
      startedAt: sources.latestCrawl.started_at,
      completedAt: sources.latestCrawl.completed_at,
      updatedAt: sources.latestCrawl.completed_at || sources.latestCrawl.created_at,
    };
  }
  if (toolKey === "seo_geo" && sources.latestSeoJob) {
    const status = mapSeoStatus(sources.latestSeoJob.status);
    return {
      status,
      progressPercent: sources.latestSeoJob.progress ?? statusProgress(status),
      sourceTable: "audit_jobs",
      sourceId: sources.latestSeoJob.id,
      metrics: {
        pagesAudited: sources.latestSeoJob.total_pages_audited,
        estimatedCost: sources.latestSeoJob.estimated_cost,
        currentStep: sources.latestSeoJob.current_step,
      },
      errorMessage: sources.latestSeoJob.error_message,
      startedAt: sources.latestSeoJob.started_at,
      completedAt: sources.latestSeoJob.completed_at,
      updatedAt: sources.latestSeoJob.completed_at || sources.latestSeoJob.created_at,
    };
  }
  if (toolKey === "llm_visibility" && sources.latestLlmAudit) {
    const status = sources.latestLlmAudit.status === "draft" ? "needs_review" : "completed";
    return {
      status,
      progressPercent: status === "completed" ? 100 : 60,
      sourceTable: "llm_visibility_audits",
      sourceId: sources.latestLlmAudit.id,
      metrics: {
        visibilityScore: sources.latestLlmAudit.visibility_score,
        workbookAverage: sources.latestLlmAudit.workbook_average,
        runCount: sources.llmRuns.length,
        providerCount: new Set(sources.llmRuns.map((run: any) => run.provider)).size,
      },
      updatedAt: sources.latestLlmAudit.updated_at || sources.latestLlmAudit.created_at,
    };
  }
  if (toolKey === "air" && sources.latestAirAudit) {
    const completed = ["deliverable_review", "published", "completed"].includes(sources.latestAirAudit.status);
    return {
      status: completed ? "completed" : "needs_review",
      progressPercent: completed ? 100 : 60,
      sourceTable: "air_audits",
      sourceId: sources.latestAirAudit.id,
      metrics: {
        tierId: sources.latestAirAudit.tier_id,
        status: sources.latestAirAudit.status,
      },
      startedAt: sources.latestAirAudit.intake_started_at,
      completedAt: sources.latestAirAudit.scored_at || sources.latestAirAudit.published_at,
      updatedAt: sources.latestAirAudit.updated_at || sources.latestAirAudit.created_at,
    };
  }
  return { status: "not_started", progressPercent: 0 };
}

function statusProgress(status: string): number {
  if (status === "completed") return 100;
  if (status === "needs_review") return 85;
  if (status === "running") return 50;
  if (status === "queued") return 15;
  if (status === "failed") return 100;
  return 0;
}

function mapCrawlStatus(status: string): WorkbenchRunStatus {
  if (status === "complete") return "completed";
  if (status === "failed" || status === "cancelled") return "failed";
  if (status === "running") return "running";
  if (status === "queued") return "queued";
  return "not_started";
}

function mapSeoStatus(status: string): WorkbenchRunStatus {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "pending") return "queued";
  return "running";
}

function severityToPriority(severity: number): RecommendationPriority {
  if (severity >= 3) return "high";
  if (severity === 2) return "medium";
  return "low";
}

function normalizePriority(priority: unknown): RecommendationPriority {
  const value = String(priority || "").toLowerCase();
  if (["urgent", "high", "medium", "low"].includes(value)) return value as RecommendationPriority;
  return "medium";
}

function normalizeRecommendations(items: any[]) {
  const seen = new Set<string>();
  return items
    .filter((item) => item?.title)
    .map((item) => ({
      id: item.id || `${item.source_tool}-${item.title}`,
      sourceTool: item.source_tool,
      category: item.category || "general",
      priority: normalizePriority(item.priority),
      title: item.title,
      description: item.description || item.body || null,
      recommendedFix: item.recommended_fix || item.recommendedFix || null,
      owner: item.owner || "agency",
      estimatedHours: item.estimated_hours ?? item.estimatedHours ?? null,
      estimatedPrice: item.estimated_price ?? item.estimatedPrice ?? null,
      status: item.status || "recommended",
      createdAt: item.created_at || item.createdAt || null,
    }))
    .filter((item) => {
      const key = `${item.sourceTool}:${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
    .slice(0, 50);
}

function priorityWeight(priority: RecommendationPriority) {
  return { urgent: 4, high: 3, medium: 2, low: 1 }[priority];
}

function latestUpdatedAt(items: any[]) {
  return items
    .map((item) => item?.updated_at || item?.completed_at || item?.created_at)
    .filter(Boolean)
    .sort()
    .pop() || null;
}

function countRoadmapItems(roadmap: unknown) {
  if (Array.isArray(roadmap)) return roadmap.length;
  if (roadmap && typeof roadmap === "object") {
    return Object.values(roadmap as Record<string, unknown>).reduce<number>(
      (sum, value) => sum + (Array.isArray(value) ? value.length : 0),
      0
    );
  }
  return 0;
}
