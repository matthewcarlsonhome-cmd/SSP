import { describe, it, expect } from "vitest";
import { generateMarkdownReport } from "@/lib/reports/markdown-generator";

// Minimal mock job data to test the fallback generator
const mockJob = {
  id: "test-job-123",
  status: "completed",
  progress: 100,
  created_at: "2026-03-08T12:00:00Z",
  started_at: "2026-03-08T12:00:00Z",
  completed_at: "2026-03-08T12:10:00Z",
  formatted_report: null,
  clients: {
    name: "Test Business",
    website_url: "https://testbiz.com",
    target_geography: "Austin, TX",
    industry: "Home Services",
  },
  site_crawl_results: {
    site_overview: {
      total_pages_found: 5,
      cms_detected: "WordPress",
      https: true,
    },
    pages: [
      {
        url: "https://testbiz.com",
        page_type: "homepage",
        title_tag: "Test Business | Home Services Austin",
        health_score: 65,
        issues: ["No answer block", "Missing FAQ"],
      },
      {
        url: "https://testbiz.com/services",
        page_type: "service",
        title_tag: "Services | Test Business",
        health_score: 45,
        issues: ["Thin content", "No schema"],
      },
    ],
  },
  competitor_analysis: {
    competitors: [
      { name: "Competitor A", url: "https://compa.com", review_count: 200 },
    ],
    gap_analysis: {
      content_gaps: ["Missing FAQ pages"],
      schema_gaps: ["No LocalBusiness schema"],
    },
  },
  page_optimizations: {
    page_optimizations: [
      {
        url: "https://testbiz.com",
        primary_keyword: "home services austin",
        title_tag: {
          current: "Test Business | Home Services Austin",
          recommended: "Home Services Austin TX | #1 Rated | Test Business",
        },
        meta_description: {
          current: "",
          recommended: "Top-rated home services in Austin, TX. Free estimates. Call today.",
        },
        answer_block: "Test Business provides professional home services in Austin, TX.",
        schema_code: [
          { type: "LocalBusiness", json_ld: '{"@type": "LocalBusiness", "name": "Test Business"}' },
        ],
      },
    ],
  },
  offpage_strategy: {
    gbp_optimization: { tasks: ["Verify listing", "Add photos"] },
    link_building: { targets: [] },
  },
  technical_audit: {
    crawl_index_health: { indexable_pages: 5 },
  },
  roadmap: {
    phases: [
      { name: "Foundation", weeks: "1-4", tasks: [{ task: "Fix title tags", priority: "high" }] },
    ],
  },
  measurement_framework: {
    seo_metrics: [{ metric: "Organic traffic", target: "+20%" }],
  },
};

describe("generateMarkdownReport", () => {
  it("returns formatted_report when available and long enough", () => {
    // formatted_report must be > 500 chars to be used
    const longReport = "# My Polished Report\n\n" + "This is a professional SEO audit report with comprehensive analysis. ".repeat(20);
    const jobWithReport = {
      ...mockJob,
      formatted_report: longReport,
    };
    const result = generateMarkdownReport(jobWithReport as Record<string, unknown>);
    expect(result).toBe(longReport);
  });

  it("falls back when formatted_report is too short", () => {
    const jobWithShortReport = {
      ...mockJob,
      formatted_report: "Too short",
    };
    const result = generateMarkdownReport(jobWithShortReport as Record<string, unknown>);
    expect(result).toContain("Test Business");
    expect(result).not.toBe("Too short");
  });

  it("generates fallback report when formatted_report is null", () => {
    const result = generateMarkdownReport(mockJob as Record<string, unknown>);
    expect(result).toContain("Test Business");
    expect(result).toContain("SEO");
    expect(result).toContain("testbiz.com");
  });

  it("fallback report includes site health table", () => {
    const result = generateMarkdownReport(mockJob as Record<string, unknown>);
    expect(result).toContain("Page");
    expect(result).toContain("Score");
    expect(result).toContain("homepage");
  });

  it("fallback report includes page optimization section", () => {
    const result = generateMarkdownReport(mockJob as Record<string, unknown>);
    // The fallback generator iterates over page_optimizations (which may be a nested structure)
    // It should at minimum contain "Optimization" or "Implementation" in the headings
    expect(result).toContain("Optimization");
  });

  it("fallback report includes competitor info", () => {
    const result = generateMarkdownReport(mockJob as Record<string, unknown>);
    expect(result).toContain("Competitor");
    expect(result).toContain("Competitor A");
  });

  it("handles job with minimal data gracefully", () => {
    const minimalJob = {
      id: "test",
      status: "completed",
      formatted_report: null,
      clients: { name: "Minimal", website_url: "https://min.com" },
      site_crawl_results: null,
      competitor_analysis: null,
      page_optimizations: null,
      offpage_strategy: null,
      roadmap: null,
      measurement_framework: null,
      technical_audit: null,
    };
    const result = generateMarkdownReport(minimalJob as Record<string, unknown>);
    expect(result).toContain("Minimal");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(50);
  });
});
