import {
  callClaude,
  extractTextContent,
  parseJsonFromResponse,
  getTokenUsage,
} from "@/lib/claude";
import { getServiceClient } from "@/lib/supabase";
import { fetchSiteSignals, formatSiteSignalsForPrompt } from "@/lib/utils/html-fetcher";
import { isFirecrawlConfigured } from "@/lib/firecrawl/client";
import { buildSeoGeoFindings, runFirecrawlSiteCrawl } from "@/lib/site-crawl/firecrawl-ingest";
import {
  replaceClientRecommendations,
  upsertClientToolRun,
  type ClientRecommendationInput,
} from "@/lib/client-workbench";
import {
  AGENT_1_SYSTEM_PROMPT,
  AGENT_2_SYSTEM_PROMPT,
  AGENT_3_SYSTEM_PROMPT,
  AGENT_4_SYSTEM_PROMPT,
  AGENT_5_SYSTEM_PROMPT,
  buildAgent1UserMessage,
  buildAgent2UserMessage,
  buildAgent3UserMessage,
  buildAgent4UserMessage,
  buildAgent5UserMessage,
} from "./prompts";

const BATCH_SIZE = 5;
const AGENT_TIMEOUT_MS = 600_000; // 10 minutes — rate limit waits can be 5min+
const BATCH_TIMEOUT_MS = 300_000; // 5 minutes per batch
const INTER_BATCH_DELAY_MS = 5_000; // delay between batches to avoid rate limits
const INTER_AGENT_DELAY_MS = 10_000; // delay between agents to avoid rate limits

// Model IDs — resolved per-job based on user's model selection
const MODEL_BATCH = "claude-haiku-4-5-20251001";
const MODEL_DEEP_SONNET = "claude-sonnet-4-20250514";
const MODEL_CHOICES = {
  haiku: MODEL_BATCH,
  sonnet: MODEL_DEEP_SONNET,
} as const;

type AgentConfig = {
  name: string;
  systemPrompt: string;
  statusLabel: string;
  progressStart: number;
  progressEnd: number;
  outputField: string;
  model?: string;
  maxTokens?: number;
  useWebSearch?: boolean;
  maxWebSearches?: number;
};

async function updateJob(
  jobId: string,
  updates: Record<string, unknown>
) {
  const supabase = getServiceClient();
  await supabase.from("audit_jobs").update(updates).eq("id", jobId);
}

async function writeLog(
  jobId: string,
  level: "info" | "warn" | "error" | "success" | "skip",
  message: string,
  agent?: string,
  detail?: string,
  pageUrl?: string
) {
  const supabase = getServiceClient();
  await supabase.from("audit_logs").insert({
    job_id: jobId,
    level,
    message,
    agent: agent || null,
    detail: detail || null,
    page_url: pageUrl || null,
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

async function runAgentWithRetry(
  config: AgentConfig,
  jobId: string,
  userMessage: string,
  defaultModel: string,
  timeoutMs: number = AGENT_TIMEOUT_MS,
  retries = 2
): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await updateJob(jobId, {
        status: config.statusLabel,
        progress: config.progressStart,
        current_step: `Running ${config.name}...`,
      });

      const effectiveModel = config.model || defaultModel;
      await writeLog(
        jobId,
        "info",
        `Starting ${config.name}${attempt > 0 ? ` (retry ${attempt})` : ""} [model: ${effectiveModel}, maxTokens: ${config.maxTokens || 16000}, webSearch: ${config.useWebSearch !== false}, maxSearches: ${config.maxWebSearches || "unlimited"}]`,
        config.name
      );

      console.log(`\n[PIPELINE] Agent: ${config.name} | Model: ${effectiveModel} | WebSearch: ${config.useWebSearch !== false} | MaxSearches: ${config.maxWebSearches || "unlimited"}`);
      console.log(`[PIPELINE] User message size: ${userMessage.length} chars`);

      const claudeOptions: Parameters<typeof callClaude>[0] = {
        model: effectiveModel,
        maxTokens: config.maxTokens || 16000,
        system: config.systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      };
      // Only include web_search when the agent actually needs it (Agents 1, 2, 4)
      // Use max_uses to cap how many searches each agent can make to control token usage
      if (config.useWebSearch !== false) {
        const webSearchTool = {
          type: "web_search_20250305",
          name: "web_search",
          ...(config.maxWebSearches ? { max_uses: config.maxWebSearches } : {}),
        };
        claudeOptions.tools = [webSearchTool];
      }

      const response = await withTimeout(
        callClaude(claudeOptions),
        timeoutMs,
        config.name
      );

      const text = extractTextContent(response);
      const stopReason = (response as Record<string, unknown>).stop_reason as string | undefined;
      const output = parseJsonFromResponse(text, stopReason);

      const wasTruncated = stopReason === "max_tokens";
      await updateJob(jobId, {
        [config.outputField]: output,
        progress: config.progressEnd,
        current_step: `${config.name} complete${wasTruncated ? " (output truncated)" : ""}`,
      });

      await writeLog(
        jobId,
        wasTruncated ? "warn" : "success",
        `${config.name} completed${wasTruncated ? " — output was truncated by max_tokens limit, some data may be incomplete" : ""}`,
        config.name
      );

      return output;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await writeLog(
        jobId,
        attempt === retries ? "error" : "warn",
        `${config.name} failed: ${msg}`,
        config.name
      );

      if (attempt === retries) {
        throw error;
      }
      const waitMs = 2000 * Math.pow(2, attempt);
      await writeLog(jobId, "info", `Retrying in ${waitMs / 1000}s...`, config.name);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw new Error("Unreachable");
}

export async function runPipeline(jobId: string) {
  const supabase = getServiceClient();

  const { data: job } = await supabase
    .from("audit_jobs")
    .select("*, clients(*)")
    .eq("id", jobId)
    .single();

  if (!job) throw new Error(`Job ${jobId} not found`);

  const brief = job.input_brief as Record<string, unknown>;
  const clientId = job.client_id as string;
  const organizationId = (job.clients as { organization_id?: string } | null)?.organization_id;

  // Resolve model based on job's model_used field (set at job creation from user's selection)
  const modelChoice = (job.model_used === "sonnet" ? "sonnet" : "haiku") as keyof typeof MODEL_CHOICES;
  const MODEL_DEEP = MODEL_CHOICES[modelChoice];
  const modelLabel = modelChoice === "sonnet" ? "Sonnet (premium)" : "Haiku (standard)";

  await updateJob(jobId, {
    started_at: new Date().toISOString(),
    status: "crawling",
    progress: 1,
    current_step: `Pipeline started — using ${modelLabel}...`,
  });

  await writeLog(jobId, "info", `Pipeline started — 5-agent sequence using ${modelLabel}`);
  await writeLog(jobId, "info", `Client: ${(brief.business_name || brief.client_name || brief.website_url || "Unknown")} | Model: ${MODEL_DEEP}`);

  if (organizationId) {
    await upsertClientToolRun({
      organizationId,
      clientId,
      toolKey: "seo_geo",
      status: "running",
      progressPercent: 1,
      sourceTable: "audit_jobs",
      sourceId: jobId,
      metricsJson: { model: modelLabel, currentStep: "Pipeline started" },
    }).catch((error) => console.warn("[Workbench] Could not update SEO run status:", error));
  }

  try {
    // Pre-fetch: Firecrawl site evidence layer, with lightweight HTML fallback.
    await updateJob(jobId, {
      current_step: "Building site evidence layer for technical analysis...",
      progress: 2,
    });

    let siteSignalsText = "";
    const siteCrawlConfig = (brief.site_crawl || {}) as { enabled?: boolean; profile?: string };
    const firecrawlEnabled = siteCrawlConfig.enabled !== false && isFirecrawlConfigured();

    if (firecrawlEnabled && brief.website_url) {
      try {
        await writeLog(jobId, "info", `Using Firecrawl server-side crawl for ${brief.website_url}...`, "Firecrawl");
        if (organizationId) {
          await upsertClientToolRun({
            organizationId,
            clientId,
            toolKey: "firecrawl",
            status: "running",
            progressPercent: 20,
            configJson: { profile: siteCrawlConfig.profile || "standard", seedUrl: brief.website_url },
          }).catch((error) => console.warn("[Workbench] Could not mark Firecrawl running:", error));
        }
        const firecrawlResult = await runFirecrawlSiteCrawl({
          jobId,
          clientId,
          seedUrl: brief.website_url as string,
          profile: siteCrawlConfig.profile || "standard",
          writeLog: (level, message, agent, detail, pageUrl) =>
            writeLog(jobId, level, message, agent, detail, pageUrl),
        });
        siteSignalsText = firecrawlResult.promptSummary;
        if (organizationId) {
          await upsertClientToolRun({
            organizationId,
            clientId,
            toolKey: "firecrawl",
            status: "completed",
            progressPercent: 100,
            sourceTable: "client_site_crawl",
            sourceId: firecrawlResult.crawlId || null,
            metricsJson: {
              capturedPages: firecrawlResult.pages.length,
              creditsUsed: firecrawlResult.creditsUsed,
              firecrawlJobId: firecrawlResult.firecrawlJobId,
              services: firecrawlResult.voiceProfile.services,
            },
            completedAt: new Date().toISOString(),
          }).catch((error) => console.warn("[Workbench] Could not mark Firecrawl complete:", error));

          const recommendations: ClientRecommendationInput[] = buildSeoGeoFindings(firecrawlResult.pages).map((finding) => ({
            sourceTool: "firecrawl",
            category: finding.category,
            priority: finding.severity >= 3 ? "high" : finding.severity === 2 ? "medium" : "low",
            title: finding.title,
            description: finding.evidence.join(" "),
            recommendedFix: finding.recommendedFix,
          }));
          await replaceClientRecommendations({
            organizationId,
            clientId,
            sourceTool: "firecrawl",
            recommendations,
          }).catch((error) => console.warn("[Workbench] Could not store Firecrawl recommendations:", error));
        }
        await writeLog(
          jobId,
          "success",
          `Firecrawl evidence ready: ${firecrawlResult.pages.length} pages, ${firecrawlResult.creditsUsed} credits, crawl job ${firecrawlResult.firecrawlJobId}`,
          "Firecrawl"
        );
      } catch (firecrawlError) {
        const msg = firecrawlError instanceof Error ? firecrawlError.message : String(firecrawlError);
        await writeLog(jobId, "warn", `Firecrawl crawl failed (${msg}) - falling back to lightweight HTML fetch`, "Firecrawl");
        if (organizationId) {
          await upsertClientToolRun({
            organizationId,
            clientId,
            toolKey: "firecrawl",
            status: "failed",
            progressPercent: 100,
            errorMessage: msg,
          }).catch((error) => console.warn("[Workbench] Could not mark Firecrawl failed:", error));
        }
      }
    } else if (siteCrawlConfig.enabled !== false) {
      await writeLog(jobId, "warn", "FIRECRAWL_API_KEY is not configured - using lightweight HTML fetch fallback", "Firecrawl");
    } else {
      await writeLog(jobId, "info", "Firecrawl site crawl disabled for this audit run", "Firecrawl");
    }

    if (!siteSignalsText) {
      await writeLog(jobId, "info", `Fetching actual HTML from ${brief.website_url}...`, "HTML Fetcher");
      try {
        const siteSignals = await fetchSiteSignals(brief.website_url as string, 4);
        siteSignalsText = formatSiteSignalsForPrompt(siteSignals);

        const schemaCount = [siteSignals.homepage, ...siteSignals.subpages]
          .filter(Boolean)
          .reduce((sum, p) => sum + (p?.schemaObjects.length || 0), 0);
        const pagesFetched = (siteSignals.homepage ? 1 : 0) + siteSignals.subpages.length;

        await writeLog(
          jobId,
          "success",
          `Fetched ${pagesFetched} pages | ${schemaCount} schema objects found | robots.txt: ${siteSignals.robotsTxt.exists ? "found" : "missing"}`,
          "HTML Fetcher"
        );
      } catch (fetchError) {
        const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        await writeLog(jobId, "warn", `HTML fetch failed (${msg}) — Agent 1 will rely on web search only`, "HTML Fetcher");
      }
    }

    // ─── Agent 1: Site Crawler & Scorer ───
    const agent1Message = siteSignalsText
      ? `${buildAgent1UserMessage(brief)}\n\n${siteSignalsText}`
      : buildAgent1UserMessage(brief);

    const crawlResults = await runAgentWithRetry(
      {
        name: "Site Crawler",
        systemPrompt: AGENT_1_SYSTEM_PROMPT,
        statusLabel: "crawling",
        progressStart: 5,
        progressEnd: 25,
        outputField: "site_crawl_results",
        maxTokens: 16000,
        maxWebSearches: 5,
      },
      jobId,
      agent1Message,
      MODEL_DEEP,
      AGENT_TIMEOUT_MS
    );

    const crawl = crawlResults as {
      site_overview?: { total_pages_found?: number };
      pages?: Array<{ url: string }>;
    };
    const pageCount = crawl.pages?.length || 0;
    await writeLog(jobId, "info", `Found ${pageCount} pages to analyze`, "Site Crawler");

    // Delay between agents to avoid back-to-back rate limits
    await new Promise((r) => setTimeout(r, INTER_AGENT_DELAY_MS));

    // ─── Agent 2: Competitor Intelligence ───
    const competitorAnalysis = await runAgentWithRetry(
      {
        name: "Competitor Intel",
        systemPrompt: AGENT_2_SYSTEM_PROMPT,
        statusLabel: "analyzing_competitors",
        progressStart: 25,
        progressEnd: 45,
        outputField: "competitor_analysis",
        maxTokens: 16000,
        maxWebSearches: 5, // Limit competitor lookups
      },
      jobId,
      buildAgent2UserMessage(brief, crawlResults),
      MODEL_DEEP,
      AGENT_TIMEOUT_MS
    );

    const analysis = competitorAnalysis as Record<string, unknown>;
    if (analysis.gap_analysis) {
      await updateJob(jobId, { gap_analysis: analysis.gap_analysis });
    }
    const competitorCount = (
      analysis.competitors as Array<unknown> | undefined
    )?.length;
    if (competitorCount) {
      await writeLog(
        jobId,
        "info",
        `Analyzed ${competitorCount} competitors`,
        "Competitor Intel"
      );
    }

    // ─── Agent 3: Page Optimizer (batched with skip-on-failure) ───
    const pageUrls = crawl.pages?.map((p) => p.url) || [];
    const allOptimizations: unknown[] = [];
    const totalBatches = Math.ceil(pageUrls.length / BATCH_SIZE);

    for (let i = 0; i < pageUrls.length; i += BATCH_SIZE) {
      const batch = pageUrls.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const batchProgress = 45 + (i / pageUrls.length) * 30;

      await updateJob(jobId, {
        status: "optimizing_pages",
        progress: Math.round(batchProgress),
        current_step: `Optimizing pages batch ${batchNum}/${totalBatches} (${batch.join(", ")})`,
      });

      await writeLog(
        jobId,
        "info",
        `Optimizing batch ${batchNum}/${totalBatches}: ${batch.join(", ")}`,
        "Page Optimizer"
      );

      // Delay between batches to avoid rate limits
      if (i > 0) {
        await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
      }

      try {
        const batchResult = await withTimeout(
          runAgentWithRetry(
            {
              name: `Page Optimizer (${batchNum}/${totalBatches})`,
              systemPrompt: AGENT_3_SYSTEM_PROMPT,
              statusLabel: "optimizing_pages",
              progressStart: Math.round(batchProgress),
              progressEnd: Math.round(batchProgress + 30 / totalBatches),
              outputField: "page_optimizations",
              model: MODEL_BATCH,
              maxTokens: 16000,
              useWebSearch: false, // Page optimizer works from crawl data, no web search needed
            },
            jobId,
            buildAgent3UserMessage(
              brief,
              crawlResults,
              competitorAnalysis,
              batch
            ),
            MODEL_DEEP,
            BATCH_TIMEOUT_MS,
            1 // fewer retries per batch
          ),
          BATCH_TIMEOUT_MS,
          `Batch ${batchNum}`
        );

        const result = batchResult as {
          page_optimizations?: unknown[];
          topical_architecture?: unknown;
        };
        if (result.page_optimizations) {
          allOptimizations.push(...result.page_optimizations);
          await writeLog(
            jobId,
            "success",
            `Batch ${batchNum} complete: ${result.page_optimizations.length} pages optimized`,
            "Page Optimizer"
          );
        }
        if (i === 0 && result.topical_architecture) {
          await updateJob(jobId, {
            topical_architecture: result.topical_architecture,
          });
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await writeLog(
          jobId,
          "skip",
          `Skipping batch ${batchNum}/${totalBatches}: ${msg}`,
          "Page Optimizer"
        );
        // Continue to next batch instead of failing entire pipeline
      }
    }

    // Store all page optimizations
    await updateJob(jobId, { page_optimizations: allOptimizations });

    // Store individual page audits
    for (const opt of allOptimizations) {
      const page = opt as Record<string, unknown>;
      const titleTag = page.title_tag as
        | { current?: string; recommended?: string }
        | undefined;
      const metaDesc = page.meta_description as
        | { current?: string; recommended?: string }
        | undefined;
      const schemaCode = page.schema_code as
        | Array<{ type: string; json_ld: string }>
        | undefined;

      try {
        await supabase.from("page_audits").insert({
          job_id: jobId,
          page_url: page.url as string,
          page_type: page.page_type as string,
          health_score: page.health_score as number,
          cluster_role: page.cluster_role as string,
          primary_keyword: page.primary_keyword as string,
          search_intent: page.search_intent as string,
          current_title_tag: titleTag?.current,
          recommended_title: titleTag?.recommended,
          current_meta_description: metaDesc?.current,
          recommended_meta: metaDesc?.recommended,
          recommended_h1: page.h1_tag as string,
          answer_block_text: page.answer_block as string,
          heading_structure: page.heading_structure,
          content_requirements: page.content_requirements,
          internal_linking_plan: page.internal_linking,
          optimization_spec: page,
          generated_schema_code: schemaCode
            ? schemaCode.map((s) => s.json_ld).join("\n\n")
            : null,
        });
      } catch {
        await writeLog(
          jobId,
          "warn",
          `Failed to store page audit for ${page.url}`,
          "Page Optimizer",
          undefined,
          page.url as string
        );
      }
    }

    await writeLog(
      jobId,
      "info",
      `Total pages optimized: ${allOptimizations.length}/${pageUrls.length}`,
      "Page Optimizer"
    );

    // Delay before Agent 4
    await new Promise((r) => setTimeout(r, INTER_AGENT_DELAY_MS));

    // ─── Agent 4: Off-Page Strategist ───
    const offpageResult = await runAgentWithRetry(
      {
        name: "Off-Page Strategist",
        systemPrompt: AGENT_4_SYSTEM_PROMPT,
        statusLabel: "generating_report",
        progressStart: 75,
        progressEnd: 90,
        outputField: "offpage_strategy",
        maxTokens: 32000,
        maxWebSearches: 3, // Minimal searches — mostly synthesis from prior data
      },
      jobId,
      buildAgent4UserMessage(
        brief,
        crawlResults,
        competitorAnalysis,
        allOptimizations
      ),
      MODEL_DEEP,
      AGENT_TIMEOUT_MS
    );

    const offpage = offpageResult as Record<string, unknown>;
    if (offpage.roadmap)
      await updateJob(jobId, { roadmap: offpage.roadmap });
    if (offpage.measurement_framework) {
      await updateJob(jobId, {
        measurement_framework: offpage.measurement_framework,
      });
    }
    if (offpage.technical_audit) {
      await updateJob(jobId, { technical_audit: offpage.technical_audit });
    }

    // Store link opportunities
    const linkBuilding = (
      offpage.offpage_strategy as Record<string, unknown>
    )?.link_building as {
      intersection_targets?: Array<Record<string, unknown>>;
      local_opportunities?: Array<Record<string, unknown>>;
      industry_opportunities?: Array<Record<string, unknown>>;
    };
    if (linkBuilding) {
      const allLinks = [
        ...(linkBuilding.intersection_targets || []).map((l) => ({
          ...l,
          opportunity_type: "intersection",
        })),
        ...(linkBuilding.local_opportunities || []).map((l) => ({
          ...l,
          opportunity_type: "local",
        })),
        ...(linkBuilding.industry_opportunities || []).map((l) => ({
          ...l,
          opportunity_type: "industry",
        })),
      ];

      for (const link of allLinks) {
        const l = link as Record<string, unknown>;
        try {
          await supabase.from("link_opportunities").insert({
            job_id: jobId,
            target_url: (l.domain || l.opportunity || "") as string,
            target_domain: (l.domain || "") as string,
            opportunity_type: l.opportunity_type as string,
            priority: (l.priority || "medium") as string,
            outreach_approach: (l.approach || "") as string,
          });
        } catch {
          // Non-critical, continue
        }
      }
      await writeLog(
        jobId,
        "info",
        `Stored ${allLinks.length} link opportunities`,
        "Off-Page Strategist"
      );
    }

    // Store citation tasks
    const citationStrategy = (
      offpage.offpage_strategy as Record<string, unknown>
    )?.citation_strategy as {
      priority_directories?: Array<Record<string, unknown>>;
    };
    if (citationStrategy?.priority_directories) {
      for (const dir of citationStrategy.priority_directories) {
        try {
          await supabase.from("citation_tasks").insert({
            job_id: jobId,
            directory_name: dir.name as string,
            directory_url: dir.url as string,
            current_status: dir.status as string,
            action_needed: dir.action as string,
            priority: "medium",
          });
        } catch {
          // Non-critical, continue
        }
      }
    }

    // ─── Agent 5: Report Formatter ───
    await updateJob(jobId, {
      status: "formatting_report",
      progress: 90,
      current_step: "Formatting professional report with Agent 5...",
    });
    await writeLog(jobId, "info", "Starting Report Formatter (Agent 5) — generating polished Markdown report", "Report Formatter");

    // Delay before Agent 5
    await new Promise((r) => setTimeout(r, INTER_AGENT_DELAY_MS));

    let formattedReport = "";
    try {
      const agent5Message = buildAgent5UserMessage(
        brief,
        crawlResults,
        competitorAnalysis,
        allOptimizations,
        offpageResult,
        offpage.technical_audit || null,
        offpage.roadmap || null,
        offpage.measurement_framework || null,
        job.topical_architecture || null
      );

      console.log(`\n[PIPELINE] Agent: Report Formatter | Model: ${MODEL_DEEP} | WebSearch: false`);
      console.log(`[PIPELINE] User message size: ${agent5Message.length} chars`);

      const agent5Response = await withTimeout(
        callClaude({
          model: MODEL_DEEP,
          maxTokens: 32000,
          system: AGENT_5_SYSTEM_PROMPT,
          messages: [{ role: "user", content: agent5Message }],
        }),
        AGENT_TIMEOUT_MS,
        "Report Formatter"
      );

      formattedReport = extractTextContent(agent5Response);

      await updateJob(jobId, {
        formatted_report: formattedReport,
        progress: 98,
        current_step: "Report formatted successfully",
      });

      await writeLog(jobId, "success", `Report formatted — ${formattedReport.length} characters of polished Markdown`, "Report Formatter");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await writeLog(jobId, "warn", `Report formatting failed (${msg}) — raw data still available`, "Report Formatter");
      // Non-fatal — pipeline continues with raw data
    }

    // Log total token usage for this pipeline run
    const tokenUsage = getTokenUsage();
    await writeLog(
      jobId,
      "info",
      `Token usage: ${tokenUsage.input} input + ${tokenUsage.output} output = ${tokenUsage.total} total`
    );

    // Mark complete
    await updateJob(jobId, {
      status: "completed",
      progress: 100,
      current_step: "Audit complete",
      completed_at: new Date().toISOString(),
      total_pages_audited: pageUrls.length,
      total_tokens_used: tokenUsage.total,
    });

    await writeLog(
      jobId,
      "success",
      `Pipeline complete. ${allOptimizations.length} pages optimized, reports ready for download.`
    );

    if (organizationId) {
      await upsertClientToolRun({
        organizationId,
        clientId,
        toolKey: "seo_geo",
        status: "completed",
        progressPercent: 100,
        sourceTable: "audit_jobs",
        sourceId: jobId,
        metricsJson: {
          pagesOptimized: allOptimizations.length,
          pagesFound: pageUrls.length,
          tokenUsage,
          roadmapItems: countRoadmapItems(offpage.roadmap),
        },
        completedAt: new Date().toISOString(),
      }).catch((error) => console.warn("[Workbench] Could not mark SEO complete:", error));

      await replaceClientRecommendations({
        organizationId,
        clientId,
        sourceTool: "seo_geo",
        recommendations: buildSeoGeoRecommendations(allOptimizations, offpage),
      }).catch((error) => console.warn("[Workbench] Could not store SEO recommendations:", error));
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await writeLog(jobId, "error", `Pipeline failed: ${msg}`);
    await updateJob(jobId, {
      status: "failed",
      error_message: msg,
    });
    if (organizationId) {
      await upsertClientToolRun({
        organizationId,
        clientId,
        toolKey: "seo_geo",
        status: "failed",
        progressPercent: 100,
        sourceTable: "audit_jobs",
        sourceId: jobId,
        errorMessage: msg,
      }).catch((workbenchError) => console.warn("[Workbench] Could not mark SEO failed:", workbenchError));
    }
    throw error;
  }
}

function buildSeoGeoRecommendations(allOptimizations: unknown[], offpage: Record<string, unknown>): ClientRecommendationInput[] {
  const pageFixes = allOptimizations
    .map((item) => item as Record<string, unknown>)
    .filter((page) => typeof page.url === "string")
    .sort((a, b) => Number(a.health_score || 100) - Number(b.health_score || 100))
    .slice(0, 12)
    .map((page): ClientRecommendationInput => {
      const titleTag = page.title_tag as { recommended?: string } | undefined;
      const metaDescription = page.meta_description as { recommended?: string } | undefined;
      return {
        sourceTool: "seo_geo",
        category: String(page.page_type || "page optimization"),
        priority: Number(page.health_score || 100) < 60 ? "high" : "medium",
        title: `Optimize ${String(page.page_type || "priority")} page`,
        description: `${page.url} scored ${page.health_score || "unknown"} and targets ${page.primary_keyword || "buyer-intent visibility"}.`,
        recommendedFix:
          [
            titleTag?.recommended ? `Title: ${titleTag.recommended}` : null,
            metaDescription?.recommended ? `Meta: ${metaDescription.recommended}` : null,
            page.answer_block ? "Add or refine the answer block." : null,
          ]
            .filter(Boolean)
            .join(" ") || "Refresh title, meta, headings, answer blocks, schema, and internal links for this priority page.",
      };
    });

  const roadmapItems = flattenRoadmap(offpage.roadmap).slice(0, 8).map((item, index): ClientRecommendationInput => ({
    sourceTool: "seo_geo",
    category: "roadmap",
    priority: index < 3 ? "high" : "medium",
    title: String(item.title || item.action || `Roadmap item ${index + 1}`),
    description: String(item.description || item.rationale || item.details || ""),
    recommendedFix: String(item.recommended_fix || item.recommendedFix || item.action || ""),
  }));

  return [...pageFixes, ...roadmapItems].slice(0, 20);
}

function flattenRoadmap(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .flatMap((item) => (Array.isArray(item) ? item : []))
      .filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
  }
  return [];
}

function countRoadmapItems(value: unknown) {
  return flattenRoadmap(value).length;
}
