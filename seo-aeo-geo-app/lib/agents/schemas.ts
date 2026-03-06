import { z } from "zod";

/**
 * Zod schemas for validating agent outputs.
 * Used to ensure structured data integrity before storing in Supabase.
 */

export const PageSchema = z.object({
  url: z.string(),
  page_type: z.string(),
  title_tag: z.string().optional(),
  meta_description: z.string().optional(),
  h1: z.string().optional(),
  heading_structure: z.array(z.object({ level: z.string(), text: z.string() })).optional(),
  word_count_estimate: z.number().optional(),
  has_answer_block: z.boolean().optional(),
  has_faq: z.boolean().optional(),
  has_comparison_table: z.boolean().optional(),
  schema_types_found: z.array(z.string()).optional(),
  internal_links_out: z.number().optional(),
  image_count: z.number().optional(),
  alt_text_quality: z.string().optional(),
  health_score: z.number().min(0).max(100),
  score_breakdown: z.record(z.string(), z.number()).optional(),
  issues: z.array(z.string()).optional(),
  quick_wins: z.array(z.string()).optional(),
});

export const CrawlResultsSchema = z.object({
  site_overview: z.object({
    total_pages_found: z.number(),
    cms_detected: z.string().optional(),
    https: z.boolean(),
    has_sitemap: z.boolean().optional(),
    robots_txt_issues: z.array(z.string()).optional(),
    ai_bots_blocked: z.array(z.string()).optional(),
    site_speed_indicators: z.string().optional(),
  }),
  pages: z.array(PageSchema),
  technical_flags: z.array(z.object({
    issue: z.string(),
    severity: z.string(),
    fix: z.string(),
  })).optional(),
});

export const CompetitorAnalysisSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    url: z.string(),
    indexed_pages_estimate: z.number().optional(),
    review_count: z.number().optional(),
    average_rating: z.number().optional(),
    strengths: z.array(z.string()).optional(),
    weaknesses: z.array(z.string()).optional(),
  })),
  gap_analysis: z.record(z.string(), z.unknown()),
  ai_citation_audit: z.record(z.string(), z.unknown()).optional(),
});

export const PageOptimizationSchema = z.object({
  topical_architecture: z.record(z.string(), z.unknown()).optional(),
  page_optimizations: z.array(z.object({
    url: z.string(),
    health_score: z.number().optional(),
    search_intent: z.string().optional(),
    primary_keyword: z.string().optional(),
    title_tag: z.object({
      current: z.string().optional(),
      recommended: z.string(),
    }).optional(),
    meta_description: z.object({
      current: z.string().optional(),
      recommended: z.string(),
    }).optional(),
    answer_block: z.string().optional(),
    schema_code: z.array(z.object({
      type: z.string(),
      json_ld: z.string(),
    })).optional(),
  })),
});

export const OffPageStrategySchema = z.object({
  technical_audit: z.record(z.string(), z.unknown()).optional(),
  offpage_strategy: z.record(z.string(), z.unknown()),
  roadmap: z.record(z.string(), z.unknown()),
  measurement_framework: z.record(z.string(), z.unknown()).optional(),
});
