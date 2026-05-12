import { describe, expect, it } from 'vitest';
import {
  MODEL_REGISTRY,
  calculateCost,
  centsToDollarString,
  estimateCost,
  estimateTokens,
  formatCostCompact,
  getModel,
  listModels,
  modelsByTier,
  type ModelProfile,
} from '../../lib/agentic/costing';
import { normalizeProviderTokenUsage, preferActualTokenUsage } from '../../lib/agentic/tokenUsage';

describe('MODEL_REGISTRY', () => {
  it('contains entries for all three providers', () => {
    const providers = new Set(listModels().map((m) => m.provider));
    expect(providers.has('claude')).toBe(true);
    expect(providers.has('gemini')).toBe(true);
    expect(providers.has('chatgpt')).toBe(true);
  });

  it('every active entry has the required fields populated', () => {
    listModels().forEach((m) => {
      expect(m.id).toBeTruthy();
      expect(m.displayName).toBeTruthy();
      expect(m.providerModelId).toBeTruthy();
      expect(m.active).toBe(true);
      expect(m.priceSnapshotId).toBeTruthy();
      expect(['fast', 'balanced', 'smart', 'reasoning']).toContain(m.tier);
      expect(m.inputPricePerMTokensCents).toBeGreaterThan(0);
      expect(m.outputPricePerMTokensCents).toBeGreaterThan(0);
      expect(m.maxInputTokens).toBeGreaterThan(0);
      expect(m.maxOutputTokens).toBeGreaterThan(0);
    });
  });

  it('Opus output is at least 10x Haiku output', () => {
    const haiku = MODEL_REGISTRY['claude-3-5-haiku-latest'];
    const opus = MODEL_REGISTRY['claude-3-opus-latest'];
    expect(opus.outputPricePerMTokensCents / haiku.outputPricePerMTokensCents).toBeGreaterThanOrEqual(10);
  });

  it('modelsByTier returns only models in that tier', () => {
    const fast = modelsByTier('fast');
    expect(fast.length).toBeGreaterThan(0);
    fast.forEach((m) => expect(m.tier).toBe('fast'));
  });

  it('getModel returns the same profile as the registry lookup', () => {
    const id = 'claude-3-5-sonnet-latest';
    expect(getModel(id)).toBe(MODEL_REGISTRY[id]);
  });
});

describe('calculateCost', () => {
  const haiku = MODEL_REGISTRY['claude-3-5-haiku-latest'];

  it('returns zero when usage is zero', () => {
    const cost = calculateCost({ inputTokens: 0, outputTokens: 0 }, haiku);
    expect(cost.totalCents).toBe(0);
    expect(cost.reasoningCents).toBe(0);
  });

  it('scales linearly with token count', () => {
    const a = calculateCost({ inputTokens: 1000, outputTokens: 1000 }, haiku);
    const b = calculateCost({ inputTokens: 2000, outputTokens: 2000 }, haiku);
    expect(b.totalCents).toBeCloseTo(a.totalCents * 2, 8);
  });

  it('input and output are summed correctly for Haiku at 1M tokens each', () => {
    const cost = calculateCost(
      { inputTokens: 1_000_000, outputTokens: 1_000_000 },
      haiku,
    );
    expect(cost.inputCents).toBeCloseTo(80, 6);
    expect(cost.outputCents).toBeCloseTo(400, 6);
    expect(cost.totalCents).toBeCloseTo(480, 6);
  });

  it('counts cache read/write when supplied and supported', () => {
    const cost = calculateCost(
      {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 1_000_000,
        cacheWriteTokens: 1_000_000,
      },
      haiku,
    );
    expect(cost.cacheReadCents).toBeGreaterThan(0);
    expect(cost.cacheWriteCents).toBeGreaterThan(0);
  });

  it('skips cache costs when the model has no cache pricing', () => {
    const noCache: ModelProfile = { ...haiku, cacheReadPricePerMTokensCents: undefined };
    const cost = calculateCost(
      { inputTokens: 0, outputTokens: 0, cacheReadTokens: 1_000_000 },
      noCache,
    );
    expect(cost.cacheReadCents).toBe(0);
  });

  it('bills reasoning tokens when supplied', () => {
    const o1 = MODEL_REGISTRY.o1;
    const cost = calculateCost(
      { inputTokens: 0, outputTokens: 0, reasoningTokens: 1_000_000 },
      o1,
    );
    expect(cost.reasoningCents).toBe(o1.reasoningPricePerMTokensCents);
    expect(cost.totalCents).toBe(cost.reasoningCents);
  });

  it('higher Claude tiers cost more for identical token usage', () => {
    const sonnet = MODEL_REGISTRY['claude-3-5-sonnet-latest'];
    const opus = MODEL_REGISTRY['claude-3-opus-latest'];
    const usage = { inputTokens: 5000, outputTokens: 1500 };
    expect(calculateCost(usage, sonnet).totalCents).toBeGreaterThan(
      calculateCost(usage, haiku).totalCents,
    );
    expect(calculateCost(usage, opus).totalCents).toBeGreaterThan(
      calculateCost(usage, sonnet).totalCents,
    );
  });
});

describe('estimateTokens', () => {
  it('returns 0 for empty input', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('uses the roughly 4 chars per token heuristic', () => {
    expect(estimateTokens('a'.repeat(40))).toBe(10);
  });

  it('rounds up partial tokens', () => {
    expect(estimateTokens('a'.repeat(5))).toBe(2);
  });
});

describe('estimateCost', () => {
  it('returns both usage and cost for a sample prompt', () => {
    const haiku = MODEL_REGISTRY['claude-3-5-haiku-latest'];
    const result = estimateCost({
      systemInstruction: 'You are an extractor.',
      userPrompt: 'Extract fields from this text. '.repeat(50),
      estimatedOutputTokens: 500,
      model: haiku,
    });
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.usage.outputTokens).toBe(500);
    expect(result.cost.totalCents).toBeGreaterThan(0);
  });

  it('uses 1500 as the default output token estimate', () => {
    const haiku = MODEL_REGISTRY['claude-3-5-haiku-latest'];
    const r = estimateCost({
      systemInstruction: '',
      userPrompt: 'short',
      model: haiku,
    });
    expect(r.usage.outputTokens).toBe(1500);
  });
});

describe('provider token usage normalization', () => {
  it('normalizes Claude usage including prompt cache tokens', () => {
    const usage = normalizeProviderTokenUsage('claude', {
      input_tokens: 1200,
      output_tokens: 340,
      cache_read_input_tokens: 100,
      cache_creation_input_tokens: 50,
    });

    expect(usage).toEqual({
      inputTokens: 1200,
      outputTokens: 340,
      cacheReadTokens: 100,
      cacheWriteTokens: 50,
    });
  });

  it('normalizes OpenAI usage including reasoning tokens', () => {
    const usage = normalizeProviderTokenUsage('chatgpt', {
      prompt_tokens: 900,
      completion_tokens: 200,
      prompt_tokens_details: { cached_tokens: 75 },
      completion_tokens_details: { reasoning_tokens: 40 },
    });

    expect(usage).toEqual({
      inputTokens: 900,
      outputTokens: 200,
      cacheReadTokens: 75,
      reasoningTokens: 40,
    });
  });

  it('normalizes Gemini usage metadata and prefers actual usage over estimates', () => {
    const actual = normalizeProviderTokenUsage('gemini', {
      promptTokenCount: 500,
      candidatesTokenCount: 125,
      cachedContentTokenCount: 25,
    });

    expect(actual).toEqual({
      inputTokens: 500,
      outputTokens: 125,
      cacheReadTokens: 25,
    });
    expect(preferActualTokenUsage({ inputTokens: 10, outputTokens: 10 }, actual)).toBe(actual);
  });
});

describe('display helpers', () => {
  it('centsToDollarString formats cents as a dollar string', () => {
    expect(centsToDollarString(0)).toBe('$0.00');
    expect(centsToDollarString(150)).toBe('$1.5000');
    expect(centsToDollarString(150, 2)).toBe('$1.50');
  });

  it('formatCostCompact picks units appropriately', () => {
    expect(formatCostCompact(0)).toBe('$0');
    expect(formatCostCompact(0.3)).toBe('0.30 cents');
    expect(formatCostCompact(15)).toBe('15.0 cents');
    expect(formatCostCompact(225)).toBe('$2.25');
  });
});

describe('cost ratio sanity', () => {
  const haiku = MODEL_REGISTRY['claude-3-5-haiku-latest'];
  const sonnet = MODEL_REGISTRY['claude-3-5-sonnet-latest'];
  const opus = MODEL_REGISTRY['claude-3-opus-latest'];
  const stepUsage = { inputTokens: 5000, outputTokens: 2000 };
  const blanketOpus = calculateCost(stepUsage, opus).totalCents * 7;

  it('blanket Opus is more than 3x a mostly-Sonnet routed run', () => {
    const mostlySonnet =
      calculateCost(stepUsage, opus).totalCents * 1 +
      calculateCost(stepUsage, sonnet).totalCents * 4 +
      calculateCost(stepUsage, haiku).totalCents * 2;
    expect(blanketOpus / mostlySonnet).toBeGreaterThan(3);
  });

  it('blanket Opus is more than 3x a Haiku-heavy routed run', () => {
    const haikuHeavy =
      calculateCost(stepUsage, opus).totalCents * 1 +
      calculateCost(stepUsage, sonnet).totalCents * 1 +
      calculateCost(stepUsage, haiku).totalCents * 5;
    expect(blanketOpus / haikuHeavy).toBeGreaterThan(3);
  });

  it('blanket Sonnet is more than 2x a routine Haiku-heavy run', () => {
    const blanketSonnet = calculateCost(stepUsage, sonnet).totalCents * 7;
    const haikuHeavy =
      calculateCost(stepUsage, sonnet).totalCents * 1 +
      calculateCost(stepUsage, haiku).totalCents * 6;
    expect(blanketSonnet / haikuHeavy).toBeGreaterThan(2);
  });
});
