import { describe, it, expect } from "vitest";
import {
  calculateHealthScore,
  getScoreLabel,
  getScoreGrade,
  getTopIssues,
  type ScoreBreakdown,
} from "@/lib/utils/scoring";

const perfectScore: ScoreBreakdown = {
  title_tag: 10,
  meta_description: 10,
  h1: 10,
  answer_block: 10,
  heading_hierarchy: 10,
  content_depth: 10,
  intent_alignment: 10,
  internal_links_in: 10,
  internal_links_out: 10,
  schema: 10,
  eeat: 10,
  faq: 10,
  media: 10,
  freshness: 10,
  geo_extractability: 10,
};

const zeroScore: ScoreBreakdown = {
  title_tag: 0,
  meta_description: 0,
  h1: 0,
  answer_block: 0,
  heading_hierarchy: 0,
  content_depth: 0,
  intent_alignment: 0,
  internal_links_in: 0,
  internal_links_out: 0,
  schema: 0,
  eeat: 0,
  faq: 0,
  media: 0,
  freshness: 0,
  geo_extractability: 0,
};

describe("calculateHealthScore", () => {
  it("returns 100 for perfect scores", () => {
    expect(calculateHealthScore(perfectScore)).toBe(100);
  });

  it("returns 0 for zero scores", () => {
    expect(calculateHealthScore(zeroScore)).toBe(0);
  });

  it("clamps values to 0-10 range", () => {
    const overScore = { ...perfectScore, title_tag: 15 };
    expect(calculateHealthScore(overScore)).toBe(100); // clamped to 10

    const underScore = { ...perfectScore, title_tag: -5 };
    // title_tag weight is 8, so missing 8 points from 100
    expect(calculateHealthScore(underScore)).toBe(92);
  });

  it("weights answer_block and content_depth highest", () => {
    // Only answer_block at 10, everything else 0
    const answerOnly = { ...zeroScore, answer_block: 10 };
    expect(calculateHealthScore(answerOnly)).toBe(10); // weight is 10

    const contentOnly = { ...zeroScore, content_depth: 10 };
    expect(calculateHealthScore(contentOnly)).toBe(10); // weight is 10

    // Media has lowest weight (3)
    const mediaOnly = { ...zeroScore, media: 10 };
    expect(calculateHealthScore(mediaOnly)).toBe(3);
  });

  it("returns a number between 0 and 100", () => {
    const midScore: ScoreBreakdown = {
      title_tag: 5,
      meta_description: 5,
      h1: 5,
      answer_block: 5,
      heading_hierarchy: 5,
      content_depth: 5,
      intent_alignment: 5,
      internal_links_in: 5,
      internal_links_out: 5,
      schema: 5,
      eeat: 5,
      faq: 5,
      media: 5,
      freshness: 5,
      geo_extractability: 5,
    };
    const result = calculateHealthScore(midScore);
    expect(result).toBe(50);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe("getScoreLabel", () => {
  it("returns correct labels for score ranges", () => {
    expect(getScoreLabel(95)).toBe("Excellent");
    expect(getScoreLabel(85)).toBe("Good");
    expect(getScoreLabel(75)).toBe("Fair");
    expect(getScoreLabel(55)).toBe("Needs Work");
    expect(getScoreLabel(30)).toBe("Poor");
  });

  it("handles boundary values", () => {
    expect(getScoreLabel(90)).toBe("Excellent");
    expect(getScoreLabel(80)).toBe("Good");
    expect(getScoreLabel(70)).toBe("Fair");
    expect(getScoreLabel(50)).toBe("Needs Work");
    expect(getScoreLabel(49)).toBe("Poor");
  });
});

describe("getScoreGrade", () => {
  it("returns correct grades", () => {
    expect(getScoreGrade(95)).toBe("A");
    expect(getScoreGrade(85)).toBe("B");
    expect(getScoreGrade(75)).toBe("C");
    expect(getScoreGrade(65)).toBe("D");
    expect(getScoreGrade(50)).toBe("F");
  });
});

describe("getTopIssues", () => {
  it("returns all issues for zero scores", () => {
    const issues = getTopIssues(zeroScore);
    expect(issues.length).toBeGreaterThan(5);
    expect(issues.some((i) => i.includes("answer block"))).toBe(true);
    expect(issues.some((i) => i.includes("schema"))).toBe(true);
    expect(issues.some((i) => i.includes("Title tag"))).toBe(true);
  });

  it("returns no issues for perfect scores", () => {
    const issues = getTopIssues(perfectScore);
    expect(issues.length).toBe(0);
  });

  it("returns specific issues based on thresholds", () => {
    const partialScore = { ...perfectScore, answer_block: 2, schema: 2 };
    const issues = getTopIssues(partialScore);
    expect(issues.length).toBe(2);
    expect(issues.some((i) => i.includes("answer block"))).toBe(true);
    expect(issues.some((i) => i.includes("schema"))).toBe(true);
  });
});
