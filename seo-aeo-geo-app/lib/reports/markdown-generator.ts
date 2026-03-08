/**
 * Markdown Report Generator
 *
 * If Agent 5 produced a formatted_report, we serve that directly.
 * Otherwise, this generates a clean Markdown report from raw JSON data
 * as a fallback (e.g., for audits run before Agent 5 was added).
 */

type JobData = Record<string, unknown>;

function charCount(text: string | undefined | null): string {
  if (!text) return "(missing)";
  return `(${text.length} chars)`;
}

function scoreEmoji(score: number): string {
  if (score >= 80) return "🟢";
  if (score >= 60) return "🟡";
  return "🔴";
}

function wrapSchema(jsonLd: string): string {
  try {
    const parsed = JSON.parse(jsonLd);
    return `<script type="application/ld+json">\n${JSON.stringify(parsed, null, 2)}\n</script>`;
  } catch {
    return `<script type="application/ld+json">\n${jsonLd}\n</script>`;
  }
}

export function generateMarkdownReport(job: JobData): string {
  // If Agent 5 already produced a formatted report, return it
  if (job.formatted_report && typeof job.formatted_report === "string" && job.formatted_report.length > 500) {
    return job.formatted_report as string;
  }

  // Fallback: generate from raw data
  const client = job.clients as Record<string, unknown>;
  const brief = job.input_brief as Record<string, unknown> | undefined;
  const clientName = (client?.name as string) || "Client";
  const websiteUrl = (client?.website_url as string) || "";
  const cmsPlatform = (brief?.cms_platform as string) || "Unknown";
  const crawlResults = job.site_crawl_results as Record<string, unknown>;
  const competitorAnalysis = job.competitor_analysis as Record<string, unknown>;
  const pageOptimizations = (job.page_optimizations || []) as Array<Record<string, unknown>>;
  const offpageStrategy = job.offpage_strategy as Record<string, unknown>;
  const technicalAudit = job.technical_audit as Record<string, unknown>;
  const roadmap = job.roadmap as Record<string, unknown>;
  const measurementFramework = job.measurement_framework as Record<string, unknown>;

  const sections: string[] = [];

  // Header
  sections.push(`# SEO / AEO / GEO Optimization Report`);
  sections.push(`## ${clientName}`);
  sections.push(`**Website:** ${websiteUrl}  `);
  sections.push(`**Date:** ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}  `);
  sections.push(`**CMS:** ${cmsPlatform}`);
  sections.push("");

  // Executive Summary
  const siteOverview = crawlResults?.site_overview as Record<string, unknown>;
  const pages = (crawlResults?.pages || []) as Array<Record<string, unknown>>;
  const avgScore = pages.length
    ? Math.round(pages.reduce((s, p) => s + ((p.health_score as number) || 0), 0) / pages.length)
    : 0;

  sections.push("---");
  sections.push("## 1. Executive Summary");
  sections.push("");
  sections.push(`This report provides a comprehensive SEO, AEO (Answer Engine Optimization), and GEO (Generative Engine Optimization) audit for **${clientName}** (${websiteUrl}). The audit analyzed **${pages.length} pages** with an average health score of **${avgScore}/100**.`);
  sections.push("");

  // Site Health Table
  sections.push("---");
  sections.push("## 2. Site Health Overview");
  sections.push("");
  sections.push("| Page URL | Type | Score | Primary Issue |");
  sections.push("|----------|------|-------|---------------|");
  for (const page of pages) {
    const score = (page.health_score as number) || 0;
    const issues = (page.issues as string[]) || [];
    sections.push(`| ${page.url} | ${page.page_type || "—"} | ${scoreEmoji(score)} ${score}/100 | ${issues[0] || "—"} |`);
  }
  sections.push("");

  // Competitor Analysis
  if (competitorAnalysis) {
    sections.push("---");
    sections.push("## 3. Competitive Intelligence");
    sections.push("");
    const competitors = (competitorAnalysis.competitors || []) as Array<Record<string, unknown>>;
    if (competitors.length) {
      sections.push("| Competitor | Reviews | Rating | Strengths |");
      sections.push("|-----------|---------|--------|-----------|");
      for (const comp of competitors) {
        const strengths = (comp.strengths as string[]) || [];
        sections.push(`| [${comp.name}](${comp.url}) | ${comp.review_count || "—"} | ${comp.average_rating || "—"}/5 | ${strengths.slice(0, 3).join(", ") || "—"} |`);
      }
      sections.push("");
    }

    const gaps = competitorAnalysis.gap_analysis as Record<string, unknown>;
    if (gaps) {
      sections.push("### Gap Analysis");
      sections.push("");
      for (const [gapType, gapData] of Object.entries(gaps)) {
        const label = gapType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        sections.push(`**${label}:**`);
        if (Array.isArray(gapData)) {
          for (const item of gapData.slice(0, 5)) {
            if (typeof item === "object" && item !== null) {
              const obj = item as Record<string, unknown>;
              const parts = Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(" | ");
              sections.push(`- ${parts}`);
            } else {
              sections.push(`- ${item}`);
            }
          }
        } else if (typeof gapData === "object" && gapData !== null) {
          for (const [k, v] of Object.entries(gapData as Record<string, unknown>)) {
            sections.push(`- **${k.replace(/_/g, " ")}:** ${v}`);
          }
        }
        sections.push("");
      }
    }
  }

  // Page-by-Page Implementation
  if (pageOptimizations.length) {
    sections.push("---");
    sections.push("## 4. Page-by-Page Implementation Guide");
    sections.push("");

    for (const page of pageOptimizations) {
      const url = page.url as string;
      const score = (page.health_score as number) || 0;
      const titleTag = page.title_tag as { current?: string; recommended?: string } | undefined;
      const metaDesc = page.meta_description as { current?: string; recommended?: string } | undefined;
      const schemaCode = page.schema_code as Array<{ type: string; json_ld: string }> | undefined;
      const headings = page.heading_structure as Array<{ level: string; text: string; direct_answer?: string }> | undefined;
      const contentReqs = page.content_requirements as Record<string, unknown> | undefined;
      const internalLinks = page.internal_linking as { link_to_this_page?: Array<Record<string, unknown>>; link_from_this_page?: Array<Record<string, unknown>> } | undefined;

      sections.push(`### ${url}`);
      sections.push(`**Score:** ${scoreEmoji(score)} ${score}/100 | **Type:** ${page.page_type || "—"} | **Intent:** ${page.search_intent || "—"} | **Keyword:** ${page.primary_keyword || "—"}`);
      sections.push("");

      let step = 1;

      // Title Tag
      if (titleTag) {
        sections.push(`**${step}. Title Tag** ${charCount(titleTag.recommended)}`);
        sections.push(`- Current: \`${titleTag.current || "(missing)"}\` ${charCount(titleTag.current)}`);
        sections.push(`- **Change to:** \`${titleTag.recommended || "—"}\``);
        sections.push("");
        step++;
      }

      // Meta Description
      if (metaDesc) {
        sections.push(`**${step}. Meta Description** ${charCount(metaDesc.recommended)}`);
        sections.push(`- Current: \`${metaDesc.current || "(missing)"}\` ${charCount(metaDesc.current)}`);
        sections.push(`- **Change to:** \`${metaDesc.recommended || "—"}\``);
        sections.push("");
        step++;
      }

      // H1
      if (page.h1_tag) {
        sections.push(`**${step}. H1 Tag**`);
        sections.push(`- **Set to:** \`${page.h1_tag}\``);
        sections.push("");
        step++;
      }

      // Answer Block
      if (page.answer_block) {
        sections.push(`**${step}. Answer Block** — paste as the first paragraph after the H1:`);
        sections.push(`> ${page.answer_block}`);
        sections.push("");
        step++;
      }

      // Heading Structure
      if (headings?.length) {
        sections.push(`**${step}. Heading Structure:**`);
        for (const h of headings) {
          const indent = h.level === "h3" ? "  " : "";
          sections.push(`${indent}- **${h.level.toUpperCase()}:** ${h.text}`);
          if (h.direct_answer) {
            sections.push(`${indent}  *${h.direct_answer}*`);
          }
        }
        sections.push("");
        step++;
      }

      // FAQ
      const faqQuestions = contentReqs?.faq_questions as Array<{ question: string; answer: string }> | undefined;
      if (faqQuestions?.length) {
        sections.push(`**${step}. FAQ Section** — add near the bottom of the page:`);
        for (const faq of faqQuestions) {
          sections.push(`**Q: ${faq.question}**  `);
          sections.push(`A: ${faq.answer}`);
          sections.push("");
        }
        step++;
      }

      // Schema Code
      if (schemaCode?.length) {
        sections.push(`**${step}. Schema Markup** — add to the page \`<head>\`:`);
        for (const schema of schemaCode) {
          sections.push(`*${schema.type}:*`);
          sections.push("```html");
          sections.push(wrapSchema(schema.json_ld));
          sections.push("```");
          sections.push("");
        }
        step++;
      }

      // Internal Links
      if (internalLinks) {
        sections.push(`**${step}. Internal Links:**`);
        const linkTo = internalLinks.link_from_this_page || [];
        const linkFrom = internalLinks.link_to_this_page || [];
        if (linkTo.length) {
          sections.push("*Add links FROM this page to:*");
          for (const link of linkTo) {
            sections.push(`- Link to **${link.to}** with anchor text: "${link.anchor_text}"`);
          }
        }
        if (linkFrom.length) {
          sections.push("*Add links TO this page from:*");
          for (const link of linkFrom) {
            sections.push(`- Link from **${link.from}** with anchor text: "${link.anchor_text}"`);
          }
        }
        sections.push("");
        step++;
      }

      // Content Requirements
      if (contentReqs) {
        sections.push(`**${step}. Content Requirements:**`);
        if (contentReqs.target_word_count) sections.push(`- Target word count: **${contentReqs.target_word_count}** words`);
        if (contentReqs.comparison_table) sections.push(`- Add comparison table: ${contentReqs.comparison_table}`);
        if (contentReqs.author_byline) sections.push(`- Author byline: ${contentReqs.author_byline}`);
        const stats = contentReqs.statistics_needed as string[] | undefined;
        if (stats?.length) sections.push(`- Statistics to include: ${stats.join(", ")}`);
        sections.push("");
      }

      sections.push("---");
      sections.push("");
    }
  }

  // Technical Audit
  if (technicalAudit) {
    sections.push("## 5. Technical Audit Checklist");
    sections.push("");
    const crawlIndex = (technicalAudit as Record<string, unknown>).crawl_index as Array<Record<string, unknown>>;
    if (crawlIndex) {
      sections.push("| Status | Issue | Severity | Fix |");
      sections.push("|--------|-------|----------|-----|");
      for (const item of crawlIndex) {
        const statusEmoji = item.status === "pass" ? "✅" : item.status === "fail" ? "❌" : "⚠️";
        sections.push(`| ${statusEmoji} | ${item.item} | ${item.priority || item.severity || "—"} | ${item.fix || "No action needed"} |`);
      }
      sections.push("");
    }
  }

  // Off-Page Strategy
  if (offpageStrategy) {
    sections.push("---");
    sections.push("## 6. Off-Page Strategy");
    sections.push("");

    const strategy = offpageStrategy as Record<string, unknown>;

    // GBP
    const gbp = strategy.gbp_optimization as Record<string, unknown>;
    if (gbp) {
      sections.push("### Google Business Profile");
      const tasks = (gbp.tasks || []) as Array<Record<string, unknown>>;
      for (const task of tasks) {
        const statusEmoji = task.status === "done" ? "✅" : task.status === "partial" ? "🟡" : "❌";
        sections.push(`- ${statusEmoji} ${task.task} *(${task.priority})*`);
      }
      sections.push("");
    }

    // Reviews
    const reviews = strategy.review_strategy as Record<string, unknown>;
    if (reviews) {
      sections.push("### Review Strategy");
      sections.push(`- Current: **${reviews.current_reviews}** reviews, **${reviews.current_rating}**/5 rating`);
      sections.push(`- 90-day target: **${reviews.target_reviews_90_days}** reviews`);
      const tips = reviews.review_coaching_tips as string[];
      if (tips?.length) {
        sections.push("- Tips:");
        for (const tip of tips) sections.push(`  - ${tip}`);
      }
      sections.push("");
    }

    // Citations
    const citations = strategy.citation_strategy as Record<string, unknown>;
    if (citations) {
      const dirs = (citations.priority_directories || []) as Array<Record<string, unknown>>;
      if (dirs.length) {
        sections.push("### Citation/Directory Tasks");
        sections.push("| Directory | Status | Action |");
        sections.push("|-----------|--------|--------|");
        for (const dir of dirs) {
          const statusEmoji = dir.status === "listed" ? "✅" : dir.status === "inconsistent" ? "⚠️" : "❌";
          sections.push(`| ${dir.name} | ${statusEmoji} ${dir.status} | ${dir.action || "—"} |`);
        }
        sections.push("");
      }
    }

    // Link Building
    const links = strategy.link_building as Record<string, unknown>;
    if (links) {
      sections.push("### Link Building Targets");
      const allTargets: Array<Record<string, unknown>> = [
        ...((links.intersection_targets || []) as Array<Record<string, unknown>>).map(l => ({ ...l, _type: "Intersection" })),
        ...((links.local_opportunities || []) as Array<Record<string, unknown>>).map(l => ({ ...l, _type: "Local" })),
        ...((links.industry_opportunities || []) as Array<Record<string, unknown>>).map(l => ({ ...l, _type: "Industry" })),
      ];
      if (allTargets.length) {
        sections.push("| Target | Type | Approach | Priority |");
        sections.push("|--------|------|----------|----------|");
        for (const t of allTargets) {
          sections.push(`| ${t.domain || t.opportunity || "—"} | ${t._type} | ${t.approach || "—"} | ${t.priority || "medium"} |`);
        }
        sections.push("");
      }
    }

    // Content Velocity
    const content = strategy.content_velocity as Record<string, unknown>;
    if (content) {
      sections.push("### Content Velocity Plan");
      sections.push(`**Recommended cadence:** ${content.recommended_cadence || "—"}`);
      const calendar = (content.content_calendar_3_months || []) as Array<Record<string, unknown>>;
      if (calendar.length) {
        sections.push("");
        for (const month of calendar) {
          sections.push(`**Month ${month.month}:**`);
          const pieces = (month.pieces || []) as Array<Record<string, unknown>>;
          for (const piece of pieces) {
            sections.push(`- ${piece.title} *(${piece.type})* — keyword: ${piece.target_keyword || "—"}`);
          }
          sections.push("");
        }
      }
    }
  }

  // Roadmap
  if (roadmap) {
    sections.push("---");
    sections.push("## 7. Implementation Roadmap");
    sections.push("");
    const phases = ((roadmap as Record<string, unknown>).phases || []) as Array<Record<string, unknown>>;
    for (const phase of phases) {
      sections.push(`### ${phase.name} — ${phase.timeframe}`);
      sections.push("");
      const tasks = (phase.tasks || []) as Array<Record<string, unknown>>;
      if (tasks.length) {
        sections.push("| # | Task | Priority | Assignee | Page/URL | Est. Hours |");
        sections.push("|---|------|----------|----------|----------|------------|");
        tasks.forEach((task, i) => {
          sections.push(`| ${i + 1} | ${task.task} | ${task.priority || "—"} | ${task.assignee_role || "—"} | ${task.page_url || "—"} | ${task.estimated_hours || "—"} |`);
        });
        sections.push("");
      }
    }
  }

  // Measurement
  if (measurementFramework) {
    sections.push("---");
    sections.push("## 8. Measurement Framework");
    sections.push("");
    const mf = measurementFramework as Record<string, unknown>;
    for (const category of ["seo_metrics", "aeo_metrics", "geo_metrics", "local_metrics"]) {
      const metrics = mf[category] as Array<Record<string, unknown>>;
      if (metrics?.length) {
        const label = category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        sections.push(`### ${label}`);
        sections.push("| Metric | Tool | Frequency | Target |");
        sections.push("|--------|------|-----------|--------|");
        for (const m of metrics) {
          sections.push(`| ${m.metric} | ${m.tool} | ${m.frequency} | ${m.target} |`);
        }
        sections.push("");
      }
    }
  }

  sections.push("---");
  sections.push(`*Report generated on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} by SEO/AEO/GEO Optimizer*`);

  return sections.join("\n");
}
