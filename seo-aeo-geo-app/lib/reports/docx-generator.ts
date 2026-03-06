import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer,
  ShadingType,
} from "docx";

type JobData = Record<string, unknown>;

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({ text, heading: level, spacing: { before: 400, after: 200 } });
}

function para(text: string, options?: { bold?: boolean; italic?: boolean; size?: number; color?: string }) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        italics: options?.italic,
        size: options?.size || 22,
        color: options?.color,
        font: "Calibri",
      }),
    ],
    spacing: { after: 120 },
  });
}

function tableRow(cells: string[], isHeader = false) {
  return new TableRow({
    children: cells.map(
      (text) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text,
                  bold: isHeader,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            }),
          ],
          width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE },
          shading: isHeader
            ? { type: ShadingType.SOLID, color: "2563EB", fill: "2563EB" }
            : undefined,
        })
    ),
  });
}

export async function generateDocxReport(job: JobData): Promise<Buffer> {
  const client = job.clients as Record<string, unknown>;
  const clientName = (client?.name as string) || "Client";
  const websiteUrl = (client?.website_url as string) || "";
  const crawlResults = job.site_crawl_results as Record<string, unknown>;
  const competitorAnalysis = job.competitor_analysis as Record<string, unknown>;
  const pageOptimizations = job.page_optimizations as Array<Record<string, unknown>>;
  const offpageStrategy = job.offpage_strategy as Record<string, unknown>;
  const roadmap = job.roadmap as Record<string, unknown>;
  const measurementFramework = job.measurement_framework as Record<string, unknown>;
  const technicalAudit = job.technical_audit as Record<string, unknown>;

  const sections: Paragraph[] = [];

  // Cover Page
  sections.push(new Paragraph({ spacing: { before: 3000 } }));
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "SEO / AEO / GEO",
          bold: true,
          size: 56,
          color: "2563EB",
          font: "Calibri",
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Optimization Report",
          bold: true,
          size: 40,
          color: "334155",
          font: "Calibri",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );
  sections.push(para(clientName, { bold: true, size: 32 }));
  sections.push(para(websiteUrl, { size: 24, color: "64748B" }));
  sections.push(para(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), { size: 24, color: "64748B" }));

  // 1. Executive Summary
  sections.push(heading("1. Executive Summary", HeadingLevel.HEADING_1));

  const siteOverview = crawlResults?.site_overview as Record<string, unknown>;
  const pages = (crawlResults?.pages || []) as Array<Record<string, unknown>>;
  const avgScore = pages.length
    ? Math.round(pages.reduce((s, p) => s + ((p.health_score as number) || 0), 0) / pages.length)
    : 0;

  sections.push(para(`This report provides a comprehensive SEO, AEO (Answer Engine Optimization), and GEO (Generative Engine Optimization) audit for ${clientName} (${websiteUrl}).`));
  sections.push(para(`Pages audited: ${pages.length}`, { bold: true }));
  sections.push(para(`Average health score: ${avgScore}/100`, { bold: true }));
  sections.push(para(`CMS detected: ${siteOverview?.cms_detected || "Unknown"}`));

  // 2. Competitive Intelligence
  if (competitorAnalysis) {
    sections.push(heading("2. Competitive Intelligence", HeadingLevel.HEADING_1));

    const competitors = (competitorAnalysis.competitors || []) as Array<Record<string, unknown>>;
    if (competitors.length) {
      sections.push(para("Competitor Overview:"));
      for (const comp of competitors) {
        sections.push(para(`${comp.name} (${comp.url})`, { bold: true }));
        if (comp.review_count) sections.push(para(`  Reviews: ${comp.review_count} (${comp.average_rating}/5)`));
        if (comp.strengths) {
          const strengths = comp.strengths as string[];
          sections.push(para(`  Strengths: ${strengths.join(", ")}`));
        }
      }
    }

    const gaps = competitorAnalysis.gap_analysis as Record<string, unknown>;
    if (gaps) {
      sections.push(heading("Gap Analysis", HeadingLevel.HEADING_2));
      for (const [gapType, gapData] of Object.entries(gaps)) {
        sections.push(para(gapType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), { bold: true }));
        if (Array.isArray(gapData)) {
          for (const item of gapData.slice(0, 5)) {
            sections.push(para(`  - ${JSON.stringify(item)}`, { size: 20 }));
          }
        }
      }
    }
  }

  // 3. Topical Authority Architecture
  const topical = job.topical_architecture as Record<string, unknown>;
  if (topical) {
    sections.push(heading("3. Topical Authority Architecture", HeadingLevel.HEADING_1));
    const pillars = (topical.pillars || []) as Array<Record<string, unknown>>;
    for (const pillar of pillars) {
      sections.push(para(`Pillar: ${pillar.topic}`, { bold: true }));
      sections.push(para(`  Target keyword: ${pillar.target_keyword}`));
      const clusters = (pillar.clusters || []) as Array<Record<string, unknown>>;
      for (const cluster of clusters) {
        sections.push(para(`    - ${cluster.topic} (${cluster.target_keyword}) [${cluster.exists ? "Exists" : "New"}]`));
      }
    }
  }

  // 4. Page-by-Page Optimization
  if (pageOptimizations?.length) {
    sections.push(heading("4. Page-by-Page Optimization", HeadingLevel.HEADING_1));

    // Title tag summary table
    sections.push(heading("Title Tag Recommendations", HeadingLevel.HEADING_2));
    for (const page of pageOptimizations) {
      const titleTag = page.title_tag as { current?: string; recommended?: string };
      sections.push(para(`${page.url}`, { bold: true }));
      if (titleTag) {
        sections.push(para(`  Current: ${titleTag.current || "Missing"}`));
        sections.push(para(`  Recommended: ${titleTag.recommended || "N/A"}`, { color: "10B981" }));
      }
    }

    // Individual page specs
    sections.push(heading("Detailed Page Specifications", HeadingLevel.HEADING_2));
    for (const page of pageOptimizations) {
      sections.push(para(`${page.url} — Score: ${page.health_score}/100`, { bold: true, size: 24 }));
      sections.push(para(`Intent: ${page.search_intent} | Role: ${page.cluster_role} | Keyword: ${page.primary_keyword}`));

      if (page.answer_block) {
        sections.push(para("Answer Block:", { bold: true }));
        sections.push(para(page.answer_block as string, { italic: true }));
      }

      const faqQuestions = (page.content_requirements as Record<string, unknown>)?.faq_questions as Array<{ question: string; answer: string }>;
      if (faqQuestions?.length) {
        sections.push(para("FAQ:", { bold: true }));
        for (const faq of faqQuestions) {
          sections.push(para(`Q: ${faq.question}`, { bold: true }));
          sections.push(para(`A: ${faq.answer}`));
        }
      }

      sections.push(new Paragraph({ spacing: { after: 400 } }));
    }
  }

  // 5. Schema Code Package
  if (pageOptimizations?.length) {
    sections.push(heading("5. Schema Code Package", HeadingLevel.HEADING_1));
    sections.push(para("Complete JSON-LD schema code files are included in the separate schema-code.zip download."));

    for (const page of pageOptimizations) {
      const schemaCode = page.schema_code as Array<{ type: string; json_ld: string }>;
      if (schemaCode?.length) {
        sections.push(para(`${page.url}: ${schemaCode.map((s) => s.type).join(", ")}`, { bold: true }));
      }
    }
  }

  // 6. Technical Audit
  if (technicalAudit) {
    sections.push(heading("6. Technical Audit", HeadingLevel.HEADING_1));
    const crawlIndex = (technicalAudit as Record<string, unknown>).crawl_index as Array<Record<string, unknown>>;
    if (crawlIndex) {
      for (const item of crawlIndex) {
        const status = item.status === "pass" ? "[PASS]" : item.status === "fail" ? "[FAIL]" : "[WARN]";
        sections.push(para(`${status} ${item.item}: ${item.fix || "No action needed"}`, {
          color: item.status === "pass" ? "10B981" : item.status === "fail" ? "EF4444" : "F59E0B",
        }));
      }
    }
  }

  // 7. Off-Page Strategy
  if (offpageStrategy) {
    sections.push(heading("7. Off-Page Strategy", HeadingLevel.HEADING_1));

    const strategy = offpageStrategy as Record<string, unknown>;
    const reviewStrategy = strategy.review_strategy as Record<string, unknown>;
    if (reviewStrategy) {
      sections.push(heading("Review Strategy", HeadingLevel.HEADING_2));
      sections.push(para(`Current reviews: ${reviewStrategy.current_reviews}, Rating: ${reviewStrategy.current_rating}`));
      sections.push(para(`Target (90 days): ${reviewStrategy.target_reviews_90_days} reviews`));
      const tips = reviewStrategy.review_coaching_tips as string[];
      if (tips) {
        for (const tip of tips) sections.push(para(`  - ${tip}`));
      }
    }

    const contentVelocity = strategy.content_velocity as Record<string, unknown>;
    if (contentVelocity) {
      sections.push(heading("Content Plan", HeadingLevel.HEADING_2));
      sections.push(para(`Recommended cadence: ${contentVelocity.recommended_cadence}`));
    }
  }

  // 8. Implementation Roadmap
  if (roadmap) {
    sections.push(heading("8. Implementation Roadmap", HeadingLevel.HEADING_1));
    const phases = (roadmap as Record<string, unknown>).phases as Array<Record<string, unknown>>;
    if (phases) {
      for (const phase of phases) {
        sections.push(para(`${phase.name} (${phase.timeframe})`, { bold: true, size: 24 }));
        const tasks = phase.tasks as Array<Record<string, unknown>>;
        if (tasks) {
          for (const task of tasks) {
            sections.push(para(`  [ ] ${task.task} — ${task.priority} priority — ${task.assignee_role}`));
          }
        }
      }
    }
  }

  // 9. Measurement Framework
  if (measurementFramework) {
    sections.push(heading("9. Measurement Framework", HeadingLevel.HEADING_1));
    const mf = measurementFramework as Record<string, unknown>;
    for (const category of ["seo_metrics", "aeo_metrics", "geo_metrics", "local_metrics"]) {
      const metrics = mf[category] as Array<Record<string, unknown>>;
      if (metrics?.length) {
        sections.push(para(category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), { bold: true }));
        for (const m of metrics) {
          sections.push(para(`  - ${m.metric}: ${m.target} (${m.tool}, ${m.frequency})`));
        }
      }
    }
  }

  const doc = new Document({
    sections: [{ children: sections }],
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
