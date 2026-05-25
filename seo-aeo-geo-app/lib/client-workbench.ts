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
    competitorResult,
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
    supabase
      .from("client_competitors")
      .select("id, name, website_url, review_count, average_rating, notes")
      .eq("client_id", clientId),
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
  const schemaTypes = Array.from(new Set(schemaItems.map((item: any) => item.schema_type).filter(Boolean))) as string[];
  const voiceProfile = voiceResult.data || null;
  const llmActionPlan = Array.isArray(latestLlmAudit?.action_plan_json) ? latestLlmAudit.action_plan_json : [];
  const airQuickWins = latestAirAudit?.air_audit_quick_wins || [];
  const competitors = competitorResult.data || [];

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
    ...buildDerivedRecommendations({
      client,
      pages,
      findings,
      schemaTypes,
      voiceProfile,
      latestSeoJob,
      latestLlmAudit,
      latestAirAudit,
      competitors,
      llmRuns: llmRunsResult.data || [],
    }),
  ]);

  const latestAirDeliverable = (latestAirAudit?.air_audit_deliverables || [])
    .filter((deliverable: any) => deliverable.is_latest !== false)
    .sort((a: any, b: any) => String(b.generated_at || "").localeCompare(String(a.generated_at || "")))[0];
  const airComposite = latestAirDeliverable?.content?.composite?.composite ?? null;
  const executiveReport = buildExecutiveReport({
    client,
    toolRuns,
    latestSeoJob,
    latestCrawl,
    latestLlmAudit,
    latestAirAudit,
    airComposite,
    airBand: latestAirDeliverable?.content?.composite?.bandLabel || latestAirDeliverable?.content?.composite?.band || null,
    pages,
    findings,
    schemaTypes,
    voiceProfile,
    recommendations,
    llmRuns: llmRunsResult.data || [],
    competitors,
  });

  return {
    client: client as Client,
    audits: auditsResult.data || [],
    cycle,
    workbench: {
      executiveReport,
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
      competitors,
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

function buildExecutiveReport(args: {
  client: any;
  toolRuns: ReturnType<typeof buildToolRunCards>;
  latestSeoJob: any;
  latestCrawl: any;
  latestLlmAudit: any;
  latestAirAudit: any;
  airComposite: number | null;
  airBand: string | null;
  pages: any[];
  findings: any[];
  schemaTypes: string[];
  voiceProfile: any;
  recommendations: ReturnType<typeof normalizeRecommendations>;
  llmRuns: any[];
  competitors: any[];
}) {
  const seoScore = averagePageHealth(args.latestSeoJob?.page_optimizations);
  const visibilityScore = numericOrNull(args.latestLlmAudit?.visibility_score);
  const workbookAverage = numericOrNull(args.latestLlmAudit?.workbook_average);
  const airScore = numericOrNull(args.airComposite);
  const siteEvidenceScore = scoreSiteEvidence({
    pageCount: args.pages.length,
    schemaCount: args.schemaTypes.length,
    findingCount: args.findings.length,
    crawlStatus: args.latestCrawl?.status,
  });
  const availableScores = [seoScore, visibilityScore, airScore, siteEvidenceScore].filter(
    (score): score is number => typeof score === "number" && Number.isFinite(score)
  );
  const executiveScore = availableScores.length
    ? Math.round(availableScores.reduce((sum, score) => sum + score, 0) / availableScores.length)
    : 0;
  const completedModules = args.toolRuns.filter((run) => run.status === "completed").length;
  const highPriorityActions = args.recommendations.filter((item) => ["urgent", "high"].includes(item.priority)).length;
  const approvedLlmRuns = args.llmRuns.filter((run) => run.qa_status === "approved").length;

  const metrics = [
    {
      key: "executive_score",
      label: "Executive Score",
      value: availableScores.length ? `${executiveScore}/100` : "No score yet",
      detail: "Average of available SEO, site evidence, LLM visibility, and AIR signals.",
      status: scoreStatus(executiveScore),
    },
    {
      key: "modules_complete",
      label: "Modules Complete",
      value: `${completedModules}/4`,
      detail: "Firecrawl, SEO/AEO/GEO, LLM Visibility, and AIR.",
      status: completedModules >= 3 ? "good" : completedModules >= 1 ? "watch" : "missing",
    },
    {
      key: "open_actions",
      label: "Open Actions",
      value: String(args.recommendations.filter((item) => item.status !== "done").length),
      detail: `${highPriorityActions} high-priority actions need attention.`,
      status: highPriorityActions > 0 ? "watch" : "good",
    },
    {
      key: "evidence_depth",
      label: "Evidence Depth",
      value: `${args.pages.length} pages`,
      detail: `${args.schemaTypes.length} schema types, ${args.findings.length} crawl findings.`,
      status: args.pages.length >= 5 ? "good" : args.pages.length > 0 ? "watch" : "missing",
    },
    {
      key: "llm_visibility",
      label: "LLM Visibility",
      value: visibilityScore === null ? "Not run" : `${Math.round(visibilityScore)}/100`,
      detail: `${args.llmRuns.length} stored responses, ${approvedLlmRuns} approved.`,
      status: visibilityScore === null ? "missing" : scoreStatus(visibilityScore),
    },
    {
      key: "air_readiness",
      label: "AIR Readiness",
      value: airScore === null ? "Not run" : `${Math.round(airScore)}/100`,
      detail: args.airBand || "No AIR band yet.",
      status: airScore === null ? "missing" : scoreStatus(airScore),
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    headline: executiveHeadline(executiveScore, completedModules, availableScores.length),
    executiveScore,
    readinessLabel: readinessLabel(executiveScore, availableScores.length),
    metrics,
    keyInsights: buildKeyInsights({
      seoScore,
      visibilityScore,
      workbookAverage,
      airScore,
      siteEvidenceScore,
      findings: args.findings,
      schemaTypes: args.schemaTypes,
      pages: args.pages,
      recommendations: args.recommendations,
      voiceProfile: args.voiceProfile,
      competitors: args.competitors,
    }),
    moduleSummaries: [
      {
        key: "firecrawl",
        label: "Firecrawl Site Evidence",
        status: args.latestCrawl ? mapCrawlStatus(args.latestCrawl.status) : "not_started",
        score: siteEvidenceScore,
        summary: args.latestCrawl
          ? `${args.pages.length} pages captured with ${args.schemaTypes.length} schema types and ${args.findings.length} deterministic findings.`
          : "No stored crawl evidence yet.",
        nextStep: args.latestCrawl
          ? nextFirecrawlStep(args.findings.length, args.schemaTypes.length)
          : "Run Firecrawl to capture sitemap, page, schema, HTML, and client voice evidence.",
      },
      {
        key: "seo_geo",
        label: "SEO/AEO/GEO",
        status: args.latestSeoJob ? mapSeoStatus(args.latestSeoJob.status) : "not_started",
        score: seoScore,
        summary: args.latestSeoJob
          ? `${countPageOptimizations(args.latestSeoJob.page_optimizations)} page optimizations and ${countRoadmapItems(args.latestSeoJob.roadmap)} roadmap items are available.`
          : "No SEO/AEO/GEO audit has been run for this client.",
        nextStep: args.latestSeoJob
          ? "Review implementation-ready title, meta, schema, FAQ, citation, and roadmap outputs."
          : "Run the SEO/AEO/GEO audit after Firecrawl evidence is captured.",
      },
      {
        key: "llm_visibility",
        label: "LLM Visibility",
        status: args.latestLlmAudit ? "completed" : "not_started",
        score: visibilityScore,
        summary: args.latestLlmAudit
          ? `${args.llmRuns.length} AI answer captures across ${new Set(args.llmRuns.map((run) => run.provider)).size} providers. Workbook average: ${workbookAverage ?? "n/a"}.`
          : "No LLM Visibility audit has been stored for this client.",
        nextStep: args.latestLlmAudit
          ? "Review share of voice, competitor mentions, citations, and high-impact misses."
          : "Run clean buyer-intent prompts for the client's category, services, and geography.",
      },
      {
        key: "air",
        label: "AIR Readiness",
        status: args.latestAirAudit ? "completed" : "not_started",
        score: airScore,
        summary: args.latestAirAudit
          ? `AIR score ${airScore ?? "n/a"}${args.airBand ? ` in ${args.airBand}` : ""}.`
          : "No AIR Snapshot or AIR Audit has been created for this client.",
        nextStep: args.latestAirAudit
          ? "Use AIR quick wins to position foundation, transition, or operations work."
          : "Create an AIR Snapshot when operational AI readiness becomes part of the sales conversation.",
      },
    ],
    evidenceInventory: {
      crawlPages: args.pages.length,
      schemaTypes: args.schemaTypes,
      llmRuns: args.llmRuns.length,
      competitors: args.competitors.map((competitor) => ({
        name: competitor.name || competitor.website_url,
        websiteUrl: competitor.website_url,
        reviewCount: competitor.review_count,
        averageRating: competitor.average_rating,
      })),
      recommendations: args.recommendations.length,
      services: args.voiceProfile?.services || [],
      differentiators: args.voiceProfile?.differentiators || [],
    },
    actionPlan: groupActionPlan(args.recommendations),
    topActions: args.recommendations.slice(0, 8),
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

function averagePageHealth(pageOptimizations: unknown) {
  const pages = normalizePageOptimizations(pageOptimizations);
  const scores = pages
    .map((page) => numericOrNull(page.health_score ?? page.healthScore))
    .filter((score): score is number => score !== null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function normalizePageOptimizations(pageOptimizations: unknown): Array<Record<string, any>> {
  if (Array.isArray(pageOptimizations)) return pageOptimizations as Array<Record<string, any>>;
  if (pageOptimizations && typeof pageOptimizations === "object") {
    const maybeNested = (pageOptimizations as Record<string, unknown>).page_optimizations;
    if (Array.isArray(maybeNested)) return maybeNested as Array<Record<string, any>>;
  }
  return [];
}

function countPageOptimizations(pageOptimizations: unknown) {
  return normalizePageOptimizations(pageOptimizations).length;
}

function numericOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function scoreSiteEvidence(input: {
  pageCount: number;
  schemaCount: number;
  findingCount: number;
  crawlStatus?: string | null;
}) {
  if (!input.crawlStatus) return null;
  if (input.crawlStatus !== "complete") return 35;
  let score = 30;
  if (input.pageCount >= 3) score += 20;
  if (input.pageCount >= 10) score += 15;
  if (input.schemaCount >= 1) score += 15;
  if (input.schemaCount >= 3) score += 10;
  if (input.findingCount === 0) score += 10;
  if (input.findingCount >= 5) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function scoreStatus(score: number): "good" | "watch" | "risk" | "missing" {
  if (score >= 75) return "good";
  if (score >= 50) return "watch";
  return "risk";
}

function readinessLabel(score: number, scoreCount: number) {
  if (!scoreCount) return "No integrated report yet";
  if (score >= 80) return "Strong visibility foundation";
  if (score >= 65) return "Solid but improvable";
  if (score >= 45) return "Needs focused remediation";
  return "High-risk visibility gap";
}

function executiveHeadline(score: number, completedModules: number, scoreCount: number) {
  if (!scoreCount) return "Run at least one module to generate the integrated client report.";
  if (completedModules < 2) return "Early evidence is available, but the client needs more modules run for a complete read.";
  if (score >= 75) return "The client has a strong foundation with clear opportunities to compound visibility.";
  if (score >= 55) return "The client has usable evidence, but priority fixes are needed before results are dependable.";
  return "The client has material visibility and readiness gaps that should be addressed before scaling spend.";
}

function buildKeyInsights(args: {
  seoScore: number | null;
  visibilityScore: number | null;
  workbookAverage: number | null;
  airScore: number | null;
  siteEvidenceScore: number | null;
  findings: any[];
  schemaTypes: string[];
  pages: any[];
  recommendations: ReturnType<typeof normalizeRecommendations>;
  voiceProfile: any;
  competitors: any[];
}) {
  const insights: Array<{
    title: string;
    body: string;
    source: WorkbenchToolKey | "workbench";
    severity: "positive" | "watch" | "risk";
  }> = [];

  if (args.pages.length) {
    insights.push({
      title: "Site evidence is captured",
      body: `${args.pages.length} pages are stored with ${args.schemaTypes.length} schema types and ${args.findings.length} deterministic findings.`,
      source: "firecrawl",
      severity: args.findings.length >= 4 ? "watch" : "positive",
    });
  } else {
    insights.push({
      title: "Site evidence is missing",
      body: "Run Firecrawl first so every report can reference stored pages, schema, raw HTML, and client voice.",
      source: "firecrawl",
      severity: "risk",
    });
  }

  if (!args.schemaTypes.length) {
    insights.push({
      title: "Schema is not yet supporting AI answers",
      body: "No schema inventory is available from the latest crawl, which weakens SEO, AEO, GEO, and LLM citation confidence.",
      source: "firecrawl",
      severity: "risk",
    });
  }

  if (args.visibilityScore !== null) {
    insights.push({
      title: "LLM visibility has a baseline",
      body: `The current AI Visibility Score is ${Math.round(args.visibilityScore)}/100${args.workbookAverage !== null ? ` with a workbook average of ${args.workbookAverage.toFixed(1)}/5` : ""}.`,
      source: "llm_visibility",
      severity: args.visibilityScore >= 60 ? "positive" : "watch",
    });
  }

  if (args.seoScore !== null) {
    insights.push({
      title: "SEO/AEO/GEO score is available",
      body: `Implementation-ready page optimization output averages ${Math.round(args.seoScore)}/100 across scored pages.`,
      source: "seo_geo",
      severity: args.seoScore >= 70 ? "positive" : "watch",
    });
  }

  if (args.airScore !== null) {
    insights.push({
      title: "AIR readiness is scored",
      body: `The current AIR score is ${Math.round(args.airScore)}/100, helping frame whether to sell remediation, foundation work, or AI operations.`,
      source: "air",
      severity: args.airScore >= 60 ? "positive" : "watch",
    });
  }

  const competitorNames = args.competitors
    .map((competitor) => competitor.name || competitor.website_url)
    .filter(Boolean)
    .slice(0, 4);
  if (competitorNames.length) {
    insights.push({
      title: "Competitor set is available",
      body: `The report can compare against ${competitorNames.join(", ")} for local positioning, content gaps, reviews, and outreach opportunities.`,
      source: "seo_geo",
      severity: "positive",
    });
  }

  const topAction = args.recommendations.find((item) => ["urgent", "high"].includes(item.priority)) || args.recommendations[0];
  if (topAction) {
    insights.push({
      title: "Top recommended action is clear",
      body: `${topAction.title}: ${topAction.recommendedFix || topAction.description || "Review this recommendation in the combined backlog."}`,
      source: (topAction.sourceTool as WorkbenchToolKey) || "workbench",
      severity: ["urgent", "high"].includes(topAction.priority) ? "risk" : "watch",
    });
  }

  const services = args.voiceProfile?.services || [];
  if (services.length) {
    insights.push({
      title: "Client service language is reusable",
      body: `The crawl detected service signals including ${services.slice(0, 5).join(", ")}.`,
      source: "firecrawl",
      severity: "positive",
    });
  }

  return insights.slice(0, 8);
}

function nextFirecrawlStep(findingCount: number, schemaCount: number) {
  if (!schemaCount) return "Add LocalBusiness, Organization, Service, FAQPage, and sameAs schema where appropriate.";
  if (findingCount) return "Review crawl findings and turn the highest severity issues into implementation tasks.";
  return "Use stored pages, schema, and client voice as source evidence for SEO/AEO/GEO and report writing.";
}

function buildDerivedRecommendations(args: {
  client: any;
  pages: any[];
  findings: any[];
  schemaTypes: string[];
  voiceProfile: any;
  latestSeoJob: any;
  latestLlmAudit: any;
  latestAirAudit: any;
  competitors: any[];
  llmRuns: any[];
}) {
  const recommendations: any[] = [];
  const services = normalizeStringArray(args.voiceProfile?.services).slice(0, 8);
  const geography = args.client.target_geography || "the target service area";
  const businessType = args.client.business_type || args.client.industry || "the business";
  const competitorNames = args.competitors
    .map((competitor) => competitor.name || hostname(competitor.website_url))
    .filter(Boolean);
  const competitorList = competitorNames.length ? competitorNames.slice(0, 4).join(", ") : "approved local competitors";

  if (!args.pages.length) {
    recommendations.push({
      id: "derived-firecrawl-run",
      source_tool: "firecrawl",
      category: "site_update",
      priority: "high",
      title: "Run the site evidence crawl first",
      description: "The integrated report needs stored pages, schema, raw HTML, and client voice before recommendations can be fully grounded.",
      recommended_fix: "Run Firecrawl, then use the stored page browser to confirm priority pages, schema coverage, and crawl findings.",
      owner: "agency",
      estimated_hours: 1,
      status: "recommended",
    });
    return recommendations;
  }

  if (!args.schemaTypes.length) {
    recommendations.push({
      id: "derived-schema-foundation",
      source_tool: "firecrawl",
      category: "site_update",
      priority: "high",
      title: "Install local entity schema",
      description: `The latest crawl found ${args.pages.length} stored pages but no schema inventory.`,
      recommended_fix: "Add Organization or LocalBusiness schema on the home page, Service schema on service pages, FAQPage schema where FAQs exist, and sameAs links to GBP/social profiles.",
      owner: "agency",
      estimated_hours: 3,
      status: "recommended",
    });
  }

  const thinPriorityPages = args.pages
    .filter((page) => ["home", "service", "location"].includes(page.page_type || page.pageType))
    .filter((page) => Number(page.word_count || page.wordCount || 0) < 550)
    .slice(0, 4);
  for (const page of thinPriorityPages) {
    recommendations.push({
      id: `derived-thin-page-${stableKey(page.url)}`,
      source_tool: "seo_geo",
      category: "site_update",
      priority: "high",
      title: `Expand ${page.page_type || page.pageType || "priority"} page content`,
      description: `${page.title || page.h1 || page.url} has ${page.word_count || page.wordCount || 0} words, which is light for answer-engine and AI citation readiness.`,
      recommended_fix: "Add a buyer-intent summary, service details, local proof, FAQs, internal links, and a short comparison section that explains why the business is credible in this market.",
      owner: "agency",
      estimated_hours: 4,
      status: "recommended",
    });
  }

  const missingFaqPages = args.pages
    .filter((page) => ["service", "location"].includes(page.page_type || page.pageType))
    .filter((page) => (page.seo_signals?.faqQuestions || []).length === 0)
    .slice(0, 3);
  if (missingFaqPages.length) {
    recommendations.push({
      id: "derived-faq-answer-blocks",
      source_tool: "seo_geo",
      category: "site_update",
      priority: "medium",
      title: "Add answer-ready FAQ sections",
      description: `${missingFaqPages.length} service/location pages have no detected FAQ questions.`,
      recommended_fix: "Add 4-6 plain-English FAQs per service/location page covering cost, timing, process, service area, warranties, and what makes the business different.",
      owner: "agency",
      estimated_hours: 3,
      status: "recommended",
    });
  }

  if (services.length) {
    const uncoveredServices = services.filter((service) => !pageMentionsService(args.pages, service)).slice(0, 4);
    if (uncoveredServices.length) {
      recommendations.push({
        id: "derived-service-page-gaps",
        source_tool: "seo_geo",
        category: "site_update",
        priority: "high",
        title: "Create dedicated service pages",
        description: `The crawl detected services without obvious dedicated page coverage: ${uncoveredServices.join(", ")}.`,
        recommended_fix: `Build dedicated pages for ${uncoveredServices.join(", ")} with local proof, FAQs, before/after examples, and internal links from the home page and related service pages.`,
        owner: "agency",
        estimated_hours: uncoveredServices.length * 3,
        status: "recommended",
      });
    }
  }

  const competitorGapItems = extractCompetitorGapRecommendations(args.latestSeoJob?.competitor_analysis, competitorList);
  recommendations.push(...competitorGapItems);

  if (args.competitors.length) {
    recommendations.push({
      id: "derived-competitor-positioning",
      source_tool: "seo_geo",
      category: "marketing",
      priority: "medium",
      title: "Build a local competitor positioning brief",
      description: `Approved competitors include ${competitorList}. The sales story should explain where ${args.client.name} is more specific, more trusted, faster, or more locally relevant.`,
      recommended_fix: "Create a one-page messaging brief, then reuse it across service pages, GBP posts, review requests, LLM report narrative, and follow-up sales emails.",
      owner: "agency",
      estimated_hours: 2,
      status: "recommended",
    });
  }

  const visibilityScore = numericOrNull(args.latestLlmAudit?.visibility_score);
  const runCount = args.llmRuns.length;
  if (visibilityScore === null) {
    recommendations.push({
      id: "derived-run-llm-visibility",
      source_tool: "llm_visibility",
      category: "marketing",
      priority: "high",
      title: "Run buyer-intent LLM visibility tests",
      description: "No stored LLM Visibility audit is attached to this client yet.",
      recommended_fix: `Run clean local prompts for ${businessType} in ${geography}, including brand health, competitors, category + geo, service, problem/solution, and cost questions.`,
      owner: "agency",
      estimated_hours: 1.5,
      status: "recommended",
    });
  } else if (visibilityScore < 60) {
    recommendations.push({
      id: "derived-llm-visibility-remediation",
      source_tool: "llm_visibility",
      category: "marketing",
      priority: "high",
      title: "Turn LLM misses into content and citation fixes",
      description: `The current AI Visibility Score is ${Math.round(visibilityScore)}/100 across ${runCount} stored answer captures.`,
      recommended_fix: "For each high-impact miss, add supporting service-page copy, strengthen GBP/review signals, add schema, and pursue local citations that AI tools are likely to trust.",
      owner: "agency",
      estimated_hours: 5,
      status: "recommended",
    });
  }

  recommendations.push({
    id: "derived-gbp-content-cadence",
    source_tool: "seo_geo",
    category: "marketing",
    priority: "medium",
    title: "Start a weekly local proof cadence",
    description: `The report should give ${args.client.name} ongoing proof assets AI/search systems can understand, especially around ${geography}.`,
    recommended_fix: "Publish one GBP post, one short project/customer proof item, and one FAQ/social post per week. Tie each post to a service, city/suburb, problem solved, and review/testimonial when available.",
    owner: "agency",
    estimated_hours: 2,
    status: "recommended",
  });

  recommendations.push({
    id: "derived-outreach-citations",
    source_tool: "seo_geo",
    category: "outreach",
    priority: "medium",
    title: "Build local authority and citation targets",
    description: `Competitors and local AI answers usually benefit from trusted third-party mentions, not just website copy.`,
    recommended_fix: "Prioritize chamber pages, local associations, sponsor pages, niche directories, supplier/manufacturer dealer pages, neighborhood publications, and partner pages that can mention the business name, services, and location.",
    owner: "agency",
    estimated_hours: 4,
    status: "recommended",
  });

  const airScore = extractAirScore(args.latestAirAudit);
  if (!args.latestAirAudit) {
    recommendations.push({
      id: "derived-air-snapshot",
      source_tool: "air",
      category: "operations",
      priority: "low",
      title: "Add an AIR Snapshot before selling automation",
      description: "No AI Readiness score is attached to this client yet.",
      recommended_fix: "Run AIR Snapshot to decide whether the next offer should be visibility remediation, data/workflow foundation work, or an AI operations sprint.",
      owner: "agency",
      estimated_hours: 1,
      status: "recommended",
    });
  } else if (airScore !== null && airScore < 60) {
    recommendations.push({
      id: "derived-air-foundation",
      source_tool: "air",
      category: "operations",
      priority: "medium",
      title: "Sequence AI work behind foundation fixes",
      description: `The AIR score is ${Math.round(airScore)}/100, so operational readiness may limit the value of AI automation.`,
      recommended_fix: "Prioritize CRM hygiene, workflow documentation, lead-source tracking, and response-time process fixes before selling a heavier AI implementation.",
      owner: "agency",
      estimated_hours: 6,
      status: "recommended",
    });
  }

  return recommendations;
}

function extractCompetitorGapRecommendations(competitorAnalysis: unknown, competitorList: string) {
  const analysis = competitorAnalysis && typeof competitorAnalysis === "object"
    ? competitorAnalysis as Record<string, any>
    : null;
  if (!analysis) return [];

  const gap = analysis.gap_analysis && typeof analysis.gap_analysis === "object"
    ? analysis.gap_analysis as Record<string, any>
    : {};
  const recommendations: any[] = [];

  const rankingGap = firstArrayItem(gap.ranking_gaps);
  if (rankingGap) {
    recommendations.push({
      id: "derived-ranking-gap",
      source_tool: "seo_geo",
      category: "competitor_gap",
      priority: "high",
      title: "Close the highest-value ranking gap",
      description: `${rankingGap.competitor || competitorList} appears to have an advantage around ${rankingGap.keyword || "a buyer-intent topic"}.`,
      recommended_fix: rankingGap.action || "Create or improve the relevant service/local page, then add internal links, FAQs, schema, and supporting GBP/social proof.",
      owner: "agency",
      estimated_hours: 5,
      status: "recommended",
    });
  }

  const contentGap = firstArrayItem(gap.content_depth_gaps);
  if (contentGap) {
    recommendations.push({
      id: "derived-content-depth-gap",
      source_tool: "seo_geo",
      category: "competitor_gap",
      priority: "medium",
      title: "Match competitor content depth where it matters",
      description: `${contentGap.competitor || competitorList} has deeper content for ${contentGap.page || "a priority page"}.`,
      recommended_fix: "Expand the client page with service specifics, local examples, FAQs, trust proof, and a clear conversion path instead of adding generic copy.",
      owner: "agency",
      estimated_hours: 4,
      status: "recommended",
    });
  }

  const linkGap = firstArrayItem(gap.link_gaps);
  if (linkGap) {
    recommendations.push({
      id: "derived-link-gap",
      source_tool: "seo_geo",
      category: "outreach",
      priority: "medium",
      title: "Pursue competitor-linked authority sources",
      description: `${linkGap.domain || "A local/source domain"} links to competitors including ${(linkGap.links_to_competitors || []).join(", ") || competitorList}.`,
      recommended_fix: linkGap.approach || "Create a small outreach list from competitor-linked domains and pitch a supplier, partner, sponsorship, resource, or local proof angle.",
      owner: "agency",
      estimated_hours: 3,
      status: "recommended",
    });
  }

  const reviewGap = gap.review_gap;
  if (reviewGap && typeof reviewGap === "object" && Number(reviewGap.gap_to_close || 0) > 0) {
    recommendations.push({
      id: "derived-review-gap",
      source_tool: "seo_geo",
      category: "marketing",
      priority: "medium",
      title: "Close the review proof gap",
      description: `Competitor average reviews appear ahead by about ${reviewGap.gap_to_close} reviews.`,
      recommended_fix: "Launch a post-job review request sequence, reply to new reviews, and add review snippets to service/location pages and GBP posts.",
      owner: "agency",
      estimated_hours: 3,
      status: "recommended",
    });
  }

  const schemaGap = firstArrayItem(gap.schema_gaps);
  if (schemaGap && schemaGap.client_has === false) {
    recommendations.push({
      id: "derived-schema-gap",
      source_tool: "seo_geo",
      category: "competitor_gap",
      priority: "medium",
      title: `Add ${schemaGap.schema_type || "missing"} schema competitors use`,
      description: `${(schemaGap.competitors_using || []).join(", ") || competitorList} appear to use schema that the client lacks.`,
      recommended_fix: "Add the missing schema type only where it is accurate and supported by visible page content.",
      owner: "agency",
      estimated_hours: 2,
      status: "recommended",
    });
  }

  return recommendations;
}

function groupActionPlan(recommendations: ReturnType<typeof normalizeRecommendations>) {
  const categories = [
    { key: "site_updates", label: "Site Updates", match: ["site_update", "schema", "content", "aeo", "technical", "media"] },
    { key: "marketing", label: "Marketing Ideas", match: ["marketing", "visibility", "reviews", "gbp"] },
    { key: "competitors", label: "Competitor Gaps", match: ["competitor_gap", "roadmap"] },
    { key: "outreach", label: "Outreach Ideas", match: ["outreach", "citations", "links"] },
    { key: "operations", label: "Operations / AIR", match: ["operations", "ai readiness"] },
  ];

  return categories.map((category) => ({
    ...category,
    items: recommendations
      .filter((item) => category.match.some((match) => item.category.toLowerCase().includes(match)))
      .slice(0, 5),
  })).filter((category) => category.items.length);
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

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function pageMentionsService(pages: any[], service: string) {
  const needle = service.toLowerCase();
  return pages.some((page) =>
    [
      page.url,
      page.title,
      page.h1,
      page.description,
      page.page_type,
      ...(normalizeStringArray(page.seo_signals?.serviceSignals)),
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  );
}

function firstArrayItem(value: unknown) {
  return Array.isArray(value) && value.length ? value[0] : null;
}

function stableKey(value: unknown) {
  return String(value || "item")
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function hostname(url: unknown) {
  try {
    return new URL(String(url)).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "");
  }
}

function extractAirScore(audit: any) {
  const deliverables = audit?.air_audit_deliverables || [];
  const latest = Array.isArray(deliverables)
    ? deliverables
        .filter((deliverable: any) => deliverable.is_latest !== false)
        .sort((a: any, b: any) => String(b.generated_at || "").localeCompare(String(a.generated_at || "")))[0]
    : null;
  return numericOrNull(latest?.content?.composite?.composite);
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
