import { describe, it, expect } from "vitest";
import { formatDate, getScoreColor, getScoreBgColor, getStatusColor } from "@/lib/utils";

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2026-03-08T12:00:00Z");
    expect(result).toContain("Mar");
    expect(result).toContain("8");
    expect(result).toContain("2026");
  });

  it("formats a Date object", () => {
    const result = formatDate(new Date("2026-01-15T00:00:00Z"));
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });
});

describe("getScoreColor", () => {
  it("returns success for scores >= 80", () => {
    expect(getScoreColor(80)).toBe("text-success");
    expect(getScoreColor(100)).toBe("text-success");
  });

  it("returns warning for scores 60-79", () => {
    expect(getScoreColor(60)).toBe("text-warning");
    expect(getScoreColor(79)).toBe("text-warning");
  });

  it("returns destructive for scores < 60", () => {
    expect(getScoreColor(59)).toBe("text-destructive");
    expect(getScoreColor(0)).toBe("text-destructive");
  });
});

describe("getScoreBgColor", () => {
  it("returns success bg for high scores", () => {
    expect(getScoreBgColor(85)).toContain("success");
  });

  it("returns warning bg for medium scores", () => {
    expect(getScoreBgColor(65)).toContain("warning");
  });

  it("returns destructive bg for low scores", () => {
    expect(getScoreBgColor(30)).toContain("destructive");
  });
});

describe("getStatusColor", () => {
  it("returns correct colors for each status", () => {
    expect(getStatusColor("completed")).toContain("success");
    expect(getStatusColor("failed")).toContain("destructive");
    expect(getStatusColor("pending")).toContain("muted");
    expect(getStatusColor("running")).toContain("info");
  });
});
