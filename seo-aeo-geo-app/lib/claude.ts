const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

// Track cumulative token usage across all API calls in this process
let _totalInputTokens = 0;
let _totalOutputTokens = 0;
let _callCount = 0;

export function getTokenUsage() {
  return { input: _totalInputTokens, output: _totalOutputTokens, total: _totalInputTokens + _totalOutputTokens };
}

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

function formatBytes(str: string): string {
  const bytes = new TextEncoder().encode(str).length;
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

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

  _callCount++;
  const callId = _callCount;
  const startTime = Date.now();

  // Log request details
  const systemLen = system ? system.length : 0;
  const msgLen = messages.reduce((sum, m) => sum + m.content.length, 0);
  const toolNames = tools?.map(t => {
    const maxUses = (t as Record<string, unknown>).max_uses;
    return maxUses ? `${t.name}(max:${maxUses})` : t.name;
  }).join(", ") || "none";

  console.log(`\n${"=".repeat(80)}`);
  console.log(`[API #${callId}] REQUEST`);
  console.log(`  Model:      ${model}`);
  console.log(`  Max tokens: ${maxTokens}`);
  console.log(`  Tools:      ${toolNames}`);
  console.log(`  System:     ${formatBytes(system || "")} (${systemLen} chars)`);
  console.log(`  Messages:   ${formatBytes(JSON.stringify(messages))} (${msgLen} chars content)`);
  console.log(`  Total body: ${formatBytes(JSON.stringify({ model, max_tokens: maxTokens, system, tools, messages }))}`);
  console.log(`  Sending...`);

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
    const attemptStart = Date.now();

    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const elapsed = ((Date.now() - attemptStart) / 1000).toFixed(1);

    if (response.ok) {
      const data = await response.json();
      const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Track token usage
      const inputTok = data.usage?.input_tokens || 0;
      const outputTok = data.usage?.output_tokens || 0;
      _totalInputTokens += inputTok;
      _totalOutputTokens += outputTok;

      // Log response details
      const contentTypes = (data.content as Array<{ type: string }>)?.map(c => c.type) || [];
      const textBlocks = (data.content as Array<{ type: string; text?: string }>)
        ?.filter(c => c.type === "text") || [];
      const textLen = textBlocks.reduce((sum, b) => sum + (b.text?.length || 0), 0);
      const webSearchCount = contentTypes.filter(t => t === "web_search_tool_result").length;

      console.log(`[API #${callId}] RESPONSE (${elapsed}s fetch, ${totalElapsed}s total)`);
      console.log(`  Status:       ${data.stop_reason || "unknown"}`);
      console.log(`  Tokens:       ${inputTok.toLocaleString()} in / ${outputTok.toLocaleString()} out`);
      console.log(`  Cumulative:   ${_totalInputTokens.toLocaleString()} in / ${_totalOutputTokens.toLocaleString()} out`);
      console.log(`  Content:      ${contentTypes.length} blocks [${[...new Set(contentTypes)].join(", ")}]`);
      console.log(`  Text output:  ${textLen} chars`);
      if (webSearchCount > 0) {
        console.log(`  Web searches: ${webSearchCount} performed`);
      }
      // Show first 500 chars of text output for debugging
      if (textBlocks.length > 0) {
        const preview = textBlocks[0].text?.substring(0, 500) || "";
        console.log(`  Preview:      ${preview}${(textBlocks[0].text?.length || 0) > 500 ? "..." : ""}`);
      }
      console.log(`${"=".repeat(80)}\n`);

      return data;
    }

    // Handle rate limits with Retry-After header
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const errorBody = await response.text();
      const waitMs = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.min(60000, 5000 * Math.pow(2, attempt));

      console.log(`[API #${callId}] RATE LIMITED (attempt ${attempt + 1}/${maxRetries + 1}, ${elapsed}s)`);
      console.log(`  Retry-After:  ${retryAfter || "not set"}`);
      console.log(`  Wait:         ${(waitMs / 1000).toFixed(0)}s`);
      console.log(`  Error:        ${errorBody.substring(0, 200)}`);

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
    }

    // Handle overloaded (529)
    if (response.status === 529 && attempt < maxRetries) {
      const waitMs = 10000 * Math.pow(2, attempt);
      console.log(`[API #${callId}] OVERLOADED (attempt ${attempt + 1}, wait ${waitMs / 1000}s)`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    const error = await response.text();
    console.log(`[API #${callId}] ERROR ${response.status}: ${error.substring(0, 300)}`);
    console.log(`${"=".repeat(80)}\n`);
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

/**
 * Try to repair truncated JSON by closing open brackets/braces.
 * This handles the common case where max_tokens cuts off a response mid-JSON.
 */
function repairTruncatedJson(text: string): string {
  // Track open brackets
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (const ch of text) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  // If we're mid-string, close it
  let repaired = text;
  if (inString) repaired += '"';

  // Remove any trailing incomplete key-value (e.g. `"key": ` or `"key": "val`)
  // by trimming back to the last complete value
  repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, "");
  repaired = repaired.replace(/,\s*$/, "");

  // Close all open brackets in reverse order
  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
}

export function parseJsonFromResponse(text: string, stopReason?: string): unknown {
  // Extract JSON from markdown code block or raw text
  let jsonText = text;
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  } else {
    const braceMatch = text.match(/\{[\s\S]*/);
    if (braceMatch) jsonText = braceMatch[0];
  }

  // Try parsing as-is first
  try {
    return JSON.parse(jsonText);
  } catch {
    // If it was truncated (max_tokens), try to repair
    if (stopReason === "max_tokens") {
      console.log(`[JSON] Response was truncated (max_tokens). Attempting repair...`);
      try {
        const repaired = repairTruncatedJson(jsonText);
        const result = JSON.parse(repaired);
        console.log(`[JSON] Repair successful — parsed truncated JSON`);
        return result;
      } catch (repairError) {
        console.log(`[JSON] Repair failed: ${repairError}`);
      }
    }
    // Re-throw original error
    return JSON.parse(jsonText);
  }
}

export async function runAgentWithRetry(
  options: ClaudeOptions,
  retries = 2
): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await callClaude(options);
      const text = extractTextContent(response);
      const stopReason = (response as Record<string, unknown>).stop_reason as string | undefined;
      return parseJsonFromResponse(text, stopReason);
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
    }
  }
}
