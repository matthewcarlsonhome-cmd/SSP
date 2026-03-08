import { describe, it, expect } from "vitest";
import {
  AGENT_1_SYSTEM_PROMPT,
  AGENT_2_SYSTEM_PROMPT,
  AGENT_3_SYSTEM_PROMPT,
  AGENT_4_SYSTEM_PROMPT,
  AGENT_5_SYSTEM_PROMPT,
  buildAgent1UserMessage,
  buildAgent2UserMessage,
  buildAgent5UserMessage,
} from "@/lib/agents/prompts";

describe("Agent system prompts", () => {
  it("all prompts are non-empty strings", () => {
    expect(AGENT_1_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(AGENT_2_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(AGENT_3_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(AGENT_4_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(AGENT_5_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("Agent 1 prompt mentions JSON and scoring", () => {
    expect(AGENT_1_SYSTEM_PROMPT).toContain("JSON");
    expect(AGENT_1_SYSTEM_PROMPT).toContain("health_score");
  });

  it("Agent 5 prompt mentions Markdown and formatting", () => {
    expect(AGENT_5_SYSTEM_PROMPT).toContain("Markdown");
  });

  it("all prompts instruct for valid JSON or specific output format", () => {
    // Agents 1-4 should mention JSON
    expect(AGENT_1_SYSTEM_PROMPT.toLowerCase()).toContain("json");
    expect(AGENT_2_SYSTEM_PROMPT.toLowerCase()).toContain("json");
    expect(AGENT_3_SYSTEM_PROMPT.toLowerCase()).toContain("json");
    expect(AGENT_4_SYSTEM_PROMPT.toLowerCase()).toContain("json");
    // Agent 5 returns Markdown, not JSON
    expect(AGENT_5_SYSTEM_PROMPT.toLowerCase()).toContain("markdown");
  });
});

describe("buildAgent1UserMessage", () => {
  it("includes client name and URL", () => {
    const brief = {
      client_name: "Test Co",
      website_url: "https://testco.com",
      target_geography: "Dallas, TX",
      keywords: [{ keyword: "test keyword" }],
    };
    const msg = buildAgent1UserMessage(brief);
    expect(msg).toContain("Test Co");
    expect(msg).toContain("https://testco.com");
    expect(msg).toContain("Dallas, TX");
    expect(msg).toContain("test keyword");
  });

  it("handles brief with no keywords", () => {
    const brief = {
      client_name: "Minimal",
      website_url: "https://min.com",
    };
    const msg = buildAgent1UserMessage(brief);
    expect(msg).toContain("Minimal");
    expect(msg).toContain("https://min.com");
  });
});

describe("buildAgent2UserMessage", () => {
  it("includes brief and crawl data", () => {
    const brief = { client_name: "Test", website_url: "https://test.com" };
    const crawl = { pages: [{ url: "https://test.com", health_score: 70 }] };
    const msg = buildAgent2UserMessage(brief, crawl);
    expect(msg).toContain("Test");
    expect(msg).toContain("test.com");
  });
});

describe("buildAgent5UserMessage", () => {
  it("includes brief and all agent data", () => {
    const brief = { client_name: "FiveCo", website_url: "https://five.com" };
    const a1 = { pages: [] };
    const a2 = { competitors: [] };
    const a3 = { page_optimizations: [] };
    const a4offpage = { link_building: {} };
    const techAudit = { issues: [] };
    const roadmap = { phases: [] };
    const measurement = { metrics: [] };
    const topical = { clusters: [] };
    const msg = buildAgent5UserMessage(brief, a1, a2, a3, a4offpage, techAudit, roadmap, measurement, topical);
    expect(msg).toContain("FiveCo");
    expect(msg).toContain("five.com");
  });
});
