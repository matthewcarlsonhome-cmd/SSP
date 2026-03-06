import { callClaude, extractTextContent, parseJsonFromResponse } from "@/lib/claude";
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

const BATCH_SIZE = 5; // Pages per Agent 3 call

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

async function runAgentWithRetry(
  config: AgentConfig,
  jobId: string,
  userMessage: string,
  retries = 2
): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await updateJob(jobId, {
        status: config.statusLabel,
        progress: config.progressStart,
        current_step: `Running ${config.name}...`,
      });

      const response = await callClaude({
        model: config.model || "claude-sonnet-4-20250514",
        maxTokens: config.maxTokens || 16000,
        system: config.systemPrompt,
        tools: [
          { type: "web_search_20250305", name: "web_search" },
        ],
        messages: [{ role: "user", content: userMessage }],
      });

      const text = extractTextContent(response);
      const output = parseJsonFromResponse(text);

      await updateJob(jobId, {
        [config.outputField]: output,
        progress: config.progressEnd,
        current_step: `${config.name} complete`,
      });

      return output;
    } catch (error) {
      if (attempt === retries) {
        await updateJob(jobId, {
          status: "failed",
          error_message: `${config.name} failed after ${retries + 1} attempts: ${error instanceof Error ? error.message : String(error)}`,
        });
        throw error;
      }
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
    }
  }
}

export async function runPipeline(jobId: string) {
  const supabase = getServiceClient();

  // Fetch job and client data
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

  try {
    // Agent 1: Site Crawler & Scorer
    const crawlResults = await runAgentWithRetry(
      {
        name: "Site Crawler & Scorer",
        systemPrompt: AGENT_1_SYSTEM_PROMPT,
        statusLabel: "crawling",
        progressStart: 5,
        progressEnd: 25,
        outputField: "site_crawl_results",
      },
      jobId,
      buildAgent1UserMessage(brief)
    );

    // Agent 2: Competitor Intelligence
    const competitorAnalysis = await runAgentWithRetry(
      {
        name: "Competitor Intelligence",
        systemPrompt: AGENT_2_SYSTEM_PROMPT,
        statusLabel: "analyzing_competitors",
        progressStart: 25,
        progressEnd: 45,
        outputField: "competitor_analysis",
        maxTokens: 16000,
      },
      jobId,
      buildAgent2UserMessage(brief, crawlResults)
    );

    // Store gap analysis separately
    const analysis = competitorAnalysis as Record<string, unknown>;
    if (analysis.gap_analysis) {
      await updateJob(jobId, { gap_analysis: analysis.gap_analysis });
    }

    // Agent 3: Page Optimizer (batched)
    const crawl = crawlResults as { pages?: Array<{ url: string }> };
    const pageUrls = crawl.pages?.map((p) => p.url) || [];
    const allOptimizations: unknown[] = [];

    for (let i = 0; i < pageUrls.length; i += BATCH_SIZE) {
      const batch = pageUrls.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(pageUrls.length / BATCH_SIZE);
      const batchProgress = 45 + ((i / pageUrls.length) * 30);

      await updateJob(jobId, {
        status: "optimizing_pages",
        progress: Math.round(batchProgress),
        current_step: `Optimizing pages batch ${batchNum}/${totalBatches} (${batch.length} pages)`,
      });

      const batchResult = await runAgentWithRetry(
        {
          name: `Page Optimizer (batch ${batchNum}/${totalBatches})`,
          systemPrompt: AGENT_3_SYSTEM_PROMPT,
          statusLabel: "optimizing_pages",
          progressStart: Math.round(batchProgress),
          progressEnd: Math.round(batchProgress + (30 / totalBatches)),
          outputField: "page_optimizations",
          maxTokens: 16000,
        },
        jobId,
        buildAgent3UserMessage(brief, crawlResults, competitorAnalysis, batch)
      );

      const result = batchResult as {
        page_optimizations?: unknown[];
        topical_architecture?: unknown;
      };
      if (result.page_optimizations) {
        allOptimizations.push(...result.page_optimizations);
      }
      // Store topical architecture from first batch
      if (i === 0 && result.topical_architecture) {
        await updateJob(jobId, { topical_architecture: result.topical_architecture });
      }
    }

    // Store all page optimizations
    await updateJob(jobId, { page_optimizations: allOptimizations });

    // Store individual page audits in the page_audits table
    for (const opt of allOptimizations) {
      const page = opt as Record<string, unknown>;
      const titleTag = page.title_tag as { current?: string; recommended?: string } | undefined;
      const metaDesc = page.meta_description as { current?: string; recommended?: string } | undefined;
      const schemaCode = page.schema_code as Array<{ type: string; json_ld: string }> | undefined;

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
    }

    // Agent 4: Off-Page Strategist
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
      buildAgent4UserMessage(brief, crawlResults, competitorAnalysis, allOptimizations)
    );

    const offpage = offpageResult as Record<string, unknown>;
    if (offpage.roadmap) await updateJob(jobId, { roadmap: offpage.roadmap });
    if (offpage.measurement_framework) {
      await updateJob(jobId, { measurement_framework: offpage.measurement_framework });
    }
    if (offpage.technical_audit) {
      await updateJob(jobId, { technical_audit: offpage.technical_audit });
    }

    // Store link opportunities
    const linkBuilding = (offpage.offpage_strategy as Record<string, unknown>)?.link_building as {
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
        await supabase.from("link_opportunities").insert({
          job_id: jobId,
          target_url: ((l.domain || l.opportunity || "") as string),
          target_domain: ((l.domain || "") as string),
          opportunity_type: (l.opportunity_type as string),
          priority: ((l.priority || "medium") as string),
          outreach_approach: ((l.approach || "") as string),
        });
      }
    }

    // Store citation tasks
    const citationStrategy = (offpage.offpage_strategy as Record<string, unknown>)?.citation_strategy as {
      priority_directories?: Array<Record<string, unknown>>;
    };
    if (citationStrategy?.priority_directories) {
      for (const dir of citationStrategy.priority_directories) {
        await supabase.from("citation_tasks").insert({
          job_id: jobId,
          directory_name: dir.name as string,
          directory_url: dir.url as string,
          current_status: dir.status as string,
          action_needed: dir.action as string,
          priority: "medium",
        });
      }
    }

    // Report generation phase
    await updateJob(jobId, {
      status: "generating_report",
      progress: 90,
      current_step: "Generating downloadable reports...",
    });

    // TODO: Call report generators (DOCX, PDF, CSV, ZIP)
    // For now, mark as complete

    await updateJob(jobId, {
      status: "completed",
      progress: 100,
      current_step: "Audit complete",
      completed_at: new Date().toISOString(),
      total_pages_audited: pageUrls.length,
    });
  } catch (error) {
    await updateJob(jobId, {
      status: "failed",
      error_message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
