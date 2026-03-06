/**
 * Page Health Score Calculator
 *
 * Implements the 15-factor weighted scoring rubric from the SKILL v2 methodology.
 * Each factor is scored 0-10, then weighted to produce a 0-100 composite.
 */

export type ScoreBreakdown = {
  title_tag: number;
  meta_description: number;
  h1: number;
  answer_block: number;
  heading_hierarchy: number;
  content_depth: number;
  intent_alignment: number;
  internal_links_in: number;
  internal_links_out: number;
  schema: number;
  eeat: number;
  faq: number;
  media: number;
  freshness: number;
  geo_extractability: number;
};

const WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  title_tag: 8,
  meta_description: 5,
  h1: 5,
  answer_block: 10,
  heading_hierarchy: 8,
  content_depth: 10,
  intent_alignment: 10,
  internal_links_in: 5,
  internal_links_out: 5,
  schema: 8,
  eeat: 8,
  faq: 5,
  media: 3,
  freshness: 5,
  geo_extractability: 5,
};

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0); // 100

export function calculateHealthScore(breakdown: ScoreBreakdown): number {
  let score = 0;
  for (const [factor, value] of Object.entries(breakdown)) {
    const weight = WEIGHTS[factor as keyof ScoreBreakdown] || 0;
    // Each factor is scored 0-10, weighted
    score += (Math.min(10, Math.max(0, value)) / 10) * weight;
  }
  return Math.round(score);
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

export function getScoreGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function getTopIssues(breakdown: ScoreBreakdown): string[] {
  const issues: string[] = [];

  if (breakdown.answer_block < 3)
    issues.push("Missing answer block in first 200 words (critical for AEO/GEO)");
  if (breakdown.schema < 3)
    issues.push("No structured data / schema markup found");
  if (breakdown.title_tag < 5)
    issues.push("Title tag not keyword-optimized or missing");
  if (breakdown.intent_alignment < 5)
    issues.push("Page type may not match search intent for target keyword");
  if (breakdown.content_depth < 5)
    issues.push("Content significantly thinner than competitor pages");
  if (breakdown.heading_hierarchy < 5)
    issues.push("Heading structure lacks question-format H2s");
  if (breakdown.faq < 3)
    issues.push("No FAQ section present");
  if (breakdown.eeat < 5)
    issues.push("Weak E-E-A-T signals (no author, credentials, or citations)");
  if (breakdown.internal_links_in < 3)
    issues.push("Page is poorly linked — potential orphan page");
  if (breakdown.freshness < 3)
    issues.push("No freshness signal (no last-updated date, outdated content)");
  if (breakdown.geo_extractability < 5)
    issues.push("Content not structured for AI extraction (sections not self-contained)");
  if (breakdown.meta_description < 3)
    issues.push("Meta description missing or not optimized");
  if (breakdown.media < 3)
    issues.push("Images missing alt text or insufficient media");

  return issues;
}
