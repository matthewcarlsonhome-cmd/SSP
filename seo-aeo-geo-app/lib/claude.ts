const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

type ClaudeMessage = {
  role: "user" | "assistant";
  content: string;
};

type ClaudeToolResult = {
  type: string;
  name: string;
  [key: string]: unknown;
};

type ClaudeOptions = {
  model?: string;
  maxTokens?: number;
  system?: string;
  tools?: ClaudeToolResult[];
  messages: ClaudeMessage[];
};

export async function callClaude(options: ClaudeOptions) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const {
    model = "claude-sonnet-4-20250514", // default; pipeline overrides per-agent
    maxTokens = 16000,
    system,
    tools,
    messages,
  } = options;

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages,
  };

  if (system) body.system = system;
  if (tools?.length) body.tools = tools;

  // Retry with backoff for rate limits (429)
  const maxRetries = 5;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return response.json();
    }

    // Handle rate limits with Retry-After header
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const waitMs = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.min(60000, 5000 * Math.pow(2, attempt)); // 5s, 10s, 20s, 40s, 60s
      console.log(`Rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Waiting ${waitMs / 1000}s...`);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
    }

    // Handle overloaded (529)
    if (response.status === 529 && attempt < maxRetries) {
      const waitMs = 10000 * Math.pow(2, attempt);
      console.log(`API overloaded (attempt ${attempt + 1}). Waiting ${waitMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    const error = await response.text();
    throw new Error(`Claude API error (${response.status}): ${error}`);
  }

  throw new Error("Claude API: max retries exceeded");
}

export function extractTextContent(
  response: Record<string, unknown>
): string {
  const content = response.content as Array<{ type: string; text?: string }>;
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text || "")
    .join("");
}

export function parseJsonFromResponse(text: string): unknown {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) return JSON.parse(jsonMatch[1]);

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return JSON.parse(braceMatch[0]);

  return JSON.parse(text);
}

export async function runAgentWithRetry(
  options: ClaudeOptions,
  retries = 2
): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await callClaude(options);
      const text = extractTextContent(response);
      return parseJsonFromResponse(text);
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
    }
  }
}
