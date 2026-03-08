import { describe, it, expect } from "vitest";
import {
  CrawlResultsSchema,
  CompetitorAnalysisSchema,
  PageOptimizationSchema,
  OffPageStrategySchema,
  PageSchema,
} from "@/lib/agents/schemas";

describe("PageSchema", () => {
  it("validates a minimal page", () => {
    const result = PageSchema.safeParse({
      url: "https://example.com",
      page_type: "homepage",
      health_score: 75,
    });
    expect(result.success).toBe(true);
  });

  it("validates a full page with all optional fields", () => {
    const result = PageSchema.safeParse({
      url: "https://example.com/services",
      page_type: "service",
      title_tag: "Pool Services | Example Co",
      meta_description: "Professional pool services in Houston",
      h1: "Pool Services",
      heading_structure: [
        { level: "h2", text: "Our Services" },
        { level: "h3", text: "Pool Cleaning" },
      ],
      word_count_estimate: 1500,
      has_answer_block: true,
      has_faq: true,
      has_comparison_table: false,
      schema_types_found: ["LocalBusiness", "Service"],
      internal_links_out: 8,
      image_count: 5,
      alt_text_quality: "good",
      health_score: 82,
      score_breakdown: { title_tag: 9, content_depth: 7 },
      issues: ["No FAQ schema"],
      quick_wins: ["Add FAQ section"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects health_score out of range", () => {
    expect(
      PageSchema.safeParse({ url: "https://x.com", page_type: "homepage", health_score: 150 }).success
    ).toBe(false);
    expect(
      PageSchema.safeParse({ url: "https://x.com", page_type: "homepage", health_score: -5 }).success
    ).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(PageSchema.safeParse({ url: "https://x.com" }).success).toBe(false);
    expect(PageSchema.safeParse({ page_type: "homepage", health_score: 50 }).success).toBe(false);
  });
});

describe("CrawlResultsSchema", () => {
  it("validates a minimal crawl result", () => {
    const result = CrawlResultsSchema.safeParse({
      site_overview: {
        total_pages_found: 10,
        https: true,
      },
      pages: [
        { url: "https://example.com", page_type: "homepage", health_score: 75 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing site_overview", () => {
    expect(
      CrawlResultsSchema.safeParse({ pages: [] }).success
    ).toBe(false);
  });
});

describe("CompetitorAnalysisSchema", () => {
  it("validates competitor analysis", () => {
    const result = CompetitorAnalysisSchema.safeParse({
      competitors: [
        { name: "Comp 1", url: "https://comp1.com", review_count: 150 },
        { name: "Comp 2", url: "https://comp2.com" },
      ],
      gap_analysis: {
        content_gaps: ["Missing FAQ pages"],
        schema_gaps: ["No LocalBusiness schema"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("requires at least the competitors and gap_analysis fields", () => {
    expect(CompetitorAnalysisSchema.safeParse({}).success).toBe(false);
    expect(
      CompetitorAnalysisSchema.safeParse({ competitors: [] }).success
    ).toBe(false);
  });
});

describe("PageOptimizationSchema", () => {
  it("validates page optimizations", () => {
    const result = PageOptimizationSchema.safeParse({
      page_optimizations: [
        {
          url: "https://example.com",
          primary_keyword: "pool builder houston",
          title_tag: {
            current: "Home | Example",
            recommended: "Pool Builder Houston | #1 Rated | Example Co",
          },
          meta_description: {
            recommended: "Top-rated pool builder in Houston, TX.",
          },
          answer_block: "Example Co is a top-rated pool builder...",
          schema_code: [
            { type: "LocalBusiness", json_ld: '{"@type": "LocalBusiness"}' },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("OffPageStrategySchema", () => {
  it("validates off-page strategy", () => {
    const result = OffPageStrategySchema.safeParse({
      offpage_strategy: {
        link_building: { targets: [] },
        gbp_optimization: { tasks: [] },
      },
      roadmap: {
        phases: [
          { name: "Phase 1", weeks: "1-4", tasks: [] },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it("allows optional fields", () => {
    const result = OffPageStrategySchema.safeParse({
      offpage_strategy: { strategy: "link building" },
      roadmap: { phase1: "do stuff" },
      technical_audit: { issues: [] },
      measurement_framework: { kpis: [] },
    });
    expect(result.success).toBe(true);
  });
});
