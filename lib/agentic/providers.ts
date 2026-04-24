/**
 * providers.ts — single entry point for invoking an LLM from agentic code.
 *
 * Wraps the existing per-provider modules behind a uniform async function
 * that returns a complete text response. The agentic runner does not need
 * to know which provider is being used or how that provider streams.
 *
 * Streaming is consumed internally and surfaced via an optional onChunk
 * callback so UIs can render progressively without dealing with three
 * different stream shapes.
 *
 * IMPORTANT: this file does not import from lib/workflows. It only depends
 * on the provider modules in lib/* which existing skill runners also use.
 */

import { runSkillStream as runClaude } from '../claude';
import { runSkillStream as runGemini } from '../gemini';
import { runSkillStream as runChatGPT, type ChatGPTModelType } from '../chatgpt';
import { logger } from '../logger';

export type AgenticProvider = 'claude' | 'gemini' | 'chatgpt';

/**
 * Generic model tier — agentic code asks for "fast" or "smart" rather than a
 * specific model name, and we map that to the right model on each provider.
 * Avoids hardcoding "claude-3-5-haiku-latest" in twenty places.
 */
export type ModelTier = 'fast' | 'balanced' | 'smart';

interface RunPromptArgs {
  provider: AgenticProvider;
  apiKey: string;
  systemInstruction: string;
  userPrompt: string;
  modelTier?: ModelTier;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

interface RunPromptResult {
  text: string;
  durationMs: number;
}

/**
 * Map a generic ModelTier to a provider-specific model identifier.
 */
function modelFor(provider: AgenticProvider, tier: ModelTier): string {
  if (provider === 'claude') {
    if (tier === 'fast') return 'haiku';
    if (tier === 'balanced') return 'sonnet';
    return 'sonnet';
  }
  if (provider === 'chatgpt') {
    if (tier === 'fast') return 'gpt-4o-mini';
    return 'gpt-4o';
  }
  // gemini ignores the tier — single model exposed today
  return 'gemini-2.0-flash';
}

// ─────────────────────────────────────────────────────────────────────────────
// Stream consumers — each provider returns a different shape; reduce to text.
// ─────────────────────────────────────────────────────────────────────────────

async function consumeClaudeStream(response: Response, onChunk?: (s: string) => void): Promise<string> {
  if (!response.body) throw new Error('Claude response has no body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === 'content_block_delta' && evt.delta?.text) {
          full += evt.delta.text;
          onChunk?.(evt.delta.text);
        }
      } catch {
        // partial JSON — wait for more chunks
      }
    }
  }
  return full;
}

async function consumeOpenAIStream(response: Response, onChunk?: (s: string) => void): Promise<string> {
  if (!response.body) throw new Error('OpenAI response has no body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const evt = JSON.parse(payload);
        const delta = evt.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onChunk?.(delta);
        }
      } catch {
        // partial
      }
    }
  }
  return full;
}

async function consumeGeminiStream(
  result: { stream: AsyncIterable<{ text(): string }> },
  onChunk?: (s: string) => void,
): Promise<string> {
  let full = '';
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      full += text;
      onChunk?.(text);
    }
  }
  return full;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function runPrompt(args: RunPromptArgs): Promise<RunPromptResult> {
  const tier = args.modelTier ?? 'balanced';
  const promptData = { systemInstruction: args.systemInstruction, userPrompt: args.userPrompt };
  const startedAt = Date.now();

  try {
    if (args.provider === 'claude') {
      const model = modelFor('claude', tier) as 'haiku' | 'sonnet' | 'opus';
      const response = await runClaude(args.apiKey, promptData, model);
      const text = await consumeClaudeStream(response, args.onChunk);
      return { text, durationMs: Date.now() - startedAt };
    }

    if (args.provider === 'chatgpt') {
      const model = modelFor('chatgpt', tier) as ChatGPTModelType;
      const response = await runChatGPT(args.apiKey, promptData, model);
      const text = await consumeOpenAIStream(response, args.onChunk);
      return { text, durationMs: Date.now() - startedAt };
    }

    // gemini
    const result = await runGemini(args.apiKey, promptData);
    const text = await consumeGeminiStream(result, args.onChunk);
    return { text, durationMs: Date.now() - startedAt };
  } catch (err) {
    logger.error('agentic.runPrompt failed', {
      provider: args.provider,
      tier,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
