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
    model = "claude-sonnet-4-20250514",
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

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error (${response.status}): ${error}`);
  }

  return response.json();
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
