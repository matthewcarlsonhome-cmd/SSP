import {
  callClaude,
  extractTextContent,
  parseJsonFromResponse,
} from "@/lib/claude";
import { getServiceClient } from "@/lib/supabase";
import {
  AGENT_1_SYSTEM_PROMPT,
  AGENT_2_SYSTEM_PROMPT,
  AGENT_3_SYSTEM_PROMPT,
  AGENT_4_SYSTEM_PROMPT,
  buildAgent1UserMessage,
  buildAgent2UserMessage,
  buildAgent3UserMessage,
  buildAgent4UserMessage,
} from "./prompts";

const BATCH_SIZE = 5;
const AGENT_TIMEOUT_MS = 120_000; // 2 minutes per agent call
const BATCH_TIMEOUT_MS = 90_000; // 90 seconds per batch

type AgentConfig = {
  name: string;
  systemPrompt: string;
  statusLabel: string;
  progressStart: number;
  progressEnd: number;
  outputField: string;
  model?: string;
  maxTokens?: number;
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

      await writeLog(
        jobId,
        "info",
        `Starting ${config.name}${attempt > 0 ? ` (retry ${attempt})` : ""}`,
        config.name
      );

      const response = await withTimeout(
        callClaude({
          model: config.model || "claude-sonnet-4-20250514",
          maxTokens: config.maxTokens || 16000,
          system: config.systemPrompt,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: userMessage }],
        }),
        timeoutMs,
        config.name
      );

      const text = extractTextContent(response);
      const output = parseJsonFromResponse(text);

      await updateJob(jobId, {
        [config.outputField]: output,
        progress: config.progressEnd,
        current_step: `${config.name} complete`,
      });

      await writeLog(jobId, "success", `${config.name} completed`, config.name);

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

  await updateJob(jobId, {
    started_at: new Date().toISOString(),
    status: "crawling",
    progress: 0,
  });

  await writeLog(jobId, "info", "Pipeline started");

  try {
    // ─── Agent 1: Site Crawler & Scorer ───
    const crawlResults = await runAgentWithRetry(
      {
        name: "Site Crawler",
        systemPrompt: AGENT_1_SYSTEM_PROMPT,
        statusLabel: "crawling",
        progressStart: 5,
        progressEnd: 25,
        outputField: "site_crawl_results",
      },
      jobId,
      buildAgent1UserMessage(brief),
      AGENT_TIMEOUT_MS
    );

    const crawl = crawlResults as {
      site_overview?: { total_pages_found?: number };
      pages?: Array<{ url: string }>;
    };
    const pageCount = crawl.pages?.length || 0;
    await writeLog(jobId, "info", `Found ${pageCount} pages to analyze`, "Site Crawler");

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
      },
      jobId,
      buildAgent2UserMessage(brief, crawlResults),
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
              maxTokens: 16000,
            },
            jobId,
            buildAgent3UserMessage(
              brief,
              crawlResults,
              competitorAnalysis,
              batch
            ),
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

    // ─── Agent 4: Off-Page Strategist ───
    const offpageResult = await runAgentWithRetry(
      {
        name: "Off-Page Strategist",
        systemPrompt: AGENT_4_SYSTEM_PROMPT,
        statusLabel: "generating_report",
        progressStart: 75,
        progressEnd: 90,
        outputField: "offpage_strategy",
        maxTokens: 16000,
      },
      jobId,
      buildAgent4UserMessage(
        brief,
        crawlResults,
        competitorAnalysis,
        allOptimizations
      ),
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

    // ─── Report Generation ───
    await updateJob(jobId, {
      status: "generating_report",
      progress: 90,
      current_step: "Generating downloadable reports...",
    });
    await writeLog(jobId, "info", "Generating report package");

    // Mark complete
    await updateJob(jobId, {
      status: "completed",
      progress: 100,
      current_step: "Audit complete",
      completed_at: new Date().toISOString(),
      total_pages_audited: pageUrls.length,
    });

    await writeLog(
      jobId,
      "success",
      `Pipeline complete. ${allOptimizations.length} pages optimized, reports ready for download.`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await writeLog(jobId, "error", `Pipeline failed: ${msg}`);
    await updateJob(jobId, {
      status: "failed",
      error_message: msg,
    });
    throw error;
  }
}
