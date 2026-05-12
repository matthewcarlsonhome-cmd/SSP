import type { Provider, TokenUsage } from './costing';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const n = asNumber(value);
    if (n !== undefined) return n;
  }
  return undefined;
}

function cleanUsage(usage: TokenUsage): TokenUsage | undefined {
  const cleaned: TokenUsage = {
    inputTokens: Math.max(0, Math.round(usage.inputTokens || 0)),
    outputTokens: Math.max(0, Math.round(usage.outputTokens || 0)),
  };
  if (usage.cacheReadTokens) cleaned.cacheReadTokens = Math.max(0, Math.round(usage.cacheReadTokens));
  if (usage.cacheWriteTokens) cleaned.cacheWriteTokens = Math.max(0, Math.round(usage.cacheWriteTokens));
  if (usage.reasoningTokens) cleaned.reasoningTokens = Math.max(0, Math.round(usage.reasoningTokens));
  return cleaned.inputTokens > 0 || cleaned.outputTokens > 0 || cleaned.reasoningTokens ? cleaned : undefined;
}

export function normalizeProviderTokenUsage(
  provider: Provider,
  rawUsage: unknown,
): TokenUsage | undefined {
  const raw = asRecord(rawUsage);
  if (!raw) return undefined;

  if (provider === 'claude') {
    const inputTokens = firstNumber(raw.input_tokens, raw.inputTokens);
    const outputTokens = firstNumber(raw.output_tokens, raw.outputTokens);
    return cleanUsage({
      inputTokens: inputTokens ?? 0,
      outputTokens: outputTokens ?? 0,
      cacheReadTokens: firstNumber(raw.cache_read_input_tokens, raw.cacheReadTokens),
      cacheWriteTokens: firstNumber(raw.cache_creation_input_tokens, raw.cacheWriteTokens),
    });
  }

  if (provider === 'chatgpt') {
    const promptDetails = asRecord(raw.prompt_tokens_details);
    const completionDetails = asRecord(raw.completion_tokens_details);
    return cleanUsage({
      inputTokens: firstNumber(raw.prompt_tokens, raw.input_tokens, raw.inputTokens) ?? 0,
      outputTokens: firstNumber(raw.completion_tokens, raw.output_tokens, raw.outputTokens) ?? 0,
      cacheReadTokens: firstNumber(promptDetails?.cached_tokens, raw.cached_tokens),
      reasoningTokens: firstNumber(completionDetails?.reasoning_tokens, raw.reasoning_tokens),
    });
  }

  return cleanUsage({
    inputTokens: firstNumber(raw.promptTokenCount, raw.prompt_tokens, raw.inputTokens) ?? 0,
    outputTokens: firstNumber(raw.candidatesTokenCount, raw.completion_tokens, raw.outputTokens) ?? 0,
    cacheReadTokens: firstNumber(raw.cachedContentTokenCount, raw.cacheReadTokens),
    reasoningTokens: firstNumber(raw.thoughtsTokenCount, raw.reasoningTokens),
  });
}

export function mergeTokenUsage(base: TokenUsage | undefined, next: TokenUsage | undefined): TokenUsage | undefined {
  if (!base) return next;
  if (!next) return base;
  return cleanUsage({
    inputTokens: Math.max(base.inputTokens, next.inputTokens),
    outputTokens: Math.max(base.outputTokens, next.outputTokens),
    cacheReadTokens: (base.cacheReadTokens ?? 0) + (next.cacheReadTokens ?? 0),
    cacheWriteTokens: (base.cacheWriteTokens ?? 0) + (next.cacheWriteTokens ?? 0),
    reasoningTokens: (base.reasoningTokens ?? 0) + (next.reasoningTokens ?? 0),
  });
}

export function preferActualTokenUsage(
  estimated: TokenUsage,
  actual: TokenUsage | undefined,
): TokenUsage {
  return actual ?? estimated;
}
