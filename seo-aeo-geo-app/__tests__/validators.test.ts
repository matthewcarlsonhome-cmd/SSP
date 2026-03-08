import { describe, it, expect } from "vitest";
import { validateBrief, ClientBriefSchema } from "@/lib/utils/validators";

describe("validateBrief", () => {
  it("accepts a minimal valid brief", () => {
    const result = validateBrief({
      client_name: "Test Co",
      website_url: "https://example.com",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts a fully populated brief", () => {
    const result = validateBrief({
      client_name: "Blue Lagoon Pools",
      website_url: "https://bluelagoonpools.com",
      business_type: "Pool construction",
      industry: "Home Services",
      target_geography: "Houston, TX",
      primary_goal: "leads",
      competitors: [
        { url: "https://comp1.com", name: "Comp 1" },
        { url: "https://comp2.com" },
      ],
      keywords: [
        { keyword: "pool builder houston", priority: "high", currentRanking: "15" },
        { keyword: "pool renovation", priority: "medium" },
      ],
      gbp: {
        claimed: "yes",
        url: "https://g.page/example",
        reviewCount: "150",
        avgRating: "4.7",
      },
      analytics: {
        monthlyTraffic: "5000",
        conversionRate: "2.5",
        topLandingPages: "/pools, /renovation",
      },
      cms_platform: "WordPress",
      pain_points: "Low organic traffic",
      previous_seo: "None",
      budget: "$2000/mo",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects missing client_name", () => {
    const result = validateBrief({
      website_url: "https://example.com",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects missing website_url", () => {
    const result = validateBrief({
      client_name: "Test Co",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("website_url"))).toBe(true);
  });

  it("rejects invalid URL format", () => {
    const result = validateBrief({
      client_name: "Test Co",
      website_url: "not-a-url",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("url") || e.includes("URL"))).toBe(true);
  });

  it("rejects empty client_name", () => {
    const result = validateBrief({
      client_name: "",
      website_url: "https://example.com",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects completely empty object", () => {
    const result = validateBrief({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects non-object input", () => {
    expect(validateBrief(null).valid).toBe(false);
    expect(validateBrief(undefined).valid).toBe(false);
    expect(validateBrief("string").valid).toBe(false);
  });

  it("validates keyword priority enum", () => {
    const result = validateBrief({
      client_name: "Test",
      website_url: "https://example.com",
      keywords: [{ keyword: "test", priority: "invalid" }],
    });
    expect(result.valid).toBe(false);
  });

  it("accepts valid keyword priorities", () => {
    for (const priority of ["high", "medium", "low"]) {
      const result = validateBrief({
        client_name: "Test",
        website_url: "https://example.com",
        keywords: [{ keyword: "test", priority }],
      });
      expect(result.valid).toBe(true);
    }
  });
});

describe("ClientBriefSchema", () => {
  it("parses valid data correctly", () => {
    const data = {
      client_name: "Test",
      website_url: "https://example.com",
      industry: "SaaS",
    };
    const result = ClientBriefSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.client_name).toBe("Test");
      expect(result.data.industry).toBe("SaaS");
    }
  });
});
