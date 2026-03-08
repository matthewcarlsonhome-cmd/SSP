import { describe, it, expect } from "vitest";
import { extractTextContent, parseJsonFromResponse } from "@/lib/claude";

describe("extractTextContent", () => {
  it("extracts text from a single text block", () => {
    const response = {
      content: [{ type: "text", text: "Hello world" }],
    };
    expect(extractTextContent(response)).toBe("Hello world");
  });

  it("concatenates multiple text blocks", () => {
    const response = {
      content: [
        { type: "text", text: "Hello " },
        { type: "text", text: "world" },
      ],
    };
    expect(extractTextContent(response)).toBe("Hello world");
  });

  it("skips non-text blocks", () => {
    const response = {
      content: [
        { type: "web_search_tool_result", text: "search stuff" },
        { type: "text", text: "actual content" },
        { type: "tool_use", text: "tool stuff" },
      ],
    };
    expect(extractTextContent(response)).toBe("actual content");
  });

  it("returns empty string when no text blocks", () => {
    const response = {
      content: [{ type: "web_search_tool_result" }],
    };
    expect(extractTextContent(response)).toBe("");
  });

  it("handles empty content array", () => {
    expect(extractTextContent({ content: [] })).toBe("");
  });
});

describe("parseJsonFromResponse", () => {
  it("parses raw JSON", () => {
    const result = parseJsonFromResponse('{"key": "value"}');
    expect(result).toEqual({ key: "value" });
  });

  it("parses JSON from markdown code block", () => {
    const text = 'Some preamble\n```json\n{"key": "value"}\n```\nSome postamble';
    const result = parseJsonFromResponse(text);
    expect(result).toEqual({ key: "value" });
  });

  it("parses JSON starting with brace", () => {
    const text = 'Here is the result: {"key": "value"}';
    const result = parseJsonFromResponse(text);
    expect(result).toEqual({ key: "value" });
  });

  it("parses complex nested JSON", () => {
    const json = {
      pages: [
        { url: "https://example.com", score: 85 },
        { url: "https://example.com/about", score: 72 },
      ],
      summary: { total: 2 },
    };
    const result = parseJsonFromResponse(JSON.stringify(json));
    expect(result).toEqual(json);
  });

  it("throws on invalid JSON without truncation", () => {
    expect(() => parseJsonFromResponse("not json at all")).toThrow();
  });

  it("repairs truncated JSON when stop_reason is max_tokens", () => {
    // Simulates a JSON response cut off mid-way
    const truncated = '{"pages": [{"url": "https://example.com", "score": 85}, {"url": "https://example.com/about"';
    const result = parseJsonFromResponse(truncated, "max_tokens") as Record<string, unknown>;
    expect(result).toBeDefined();
    expect(result.pages).toBeDefined();
    expect(Array.isArray(result.pages)).toBe(true);
  });

  it("handles JSON with arrays", () => {
    const result = parseJsonFromResponse('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it("parses JSON with special characters in strings", () => {
    const json = '{"text": "Hello \\"world\\"", "path": "C:\\\\Users"}';
    const result = parseJsonFromResponse(json) as Record<string, unknown>;
    expect(result.text).toBe('Hello "world"');
  });
});
