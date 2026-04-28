/**
 * Tests for lib/agentic/costing.ts — model registry, cost calculation, and
 * estimation. Pure-function tests; no LLM calls.
 */

import { describe, it, expect } from 'vitest';
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

describe('MODEL_REGISTRY', () => {
  it('contains entries for all three providers', () => {
    const providers = new Set(listModels().map((m) => m.provider));
    expect(providers.has('claude')).toBe(true);
    expect(providers.has('gemini')).toBe(true);
    expect(providers.has('chatgpt')).toBe(true);
  });

  it('every entry has the required fields populated', () => {
    listModels().forEach((m) => {
      expect(m.id).toBeTruthy();
      expect(m.displayName).toBeTruthy();
      expect(['fast', 'balanced', 'smart', 'reasoning']).toContain(m.tier);
      expect(m.inputPricePerMTokensCents).toBeGreaterThan(0);
      expect(m.outputPricePerMTokensCents).toBeGreaterThan(0);
      expect(m.maxInputTokens).toBeGreaterThan(0);
      expect(m.maxOutputTokens).toBeGreaterThan(0);
    });
  });

  it('Opus output is at least 10x Haiku output (tier hierarchy sanity check)', () => {
    const haiku = MODEL_REGISTRY['claude-haiku-4-5'];
    const opus = MODEL_REGISTRY['claude-opus-4-7'];
    expect(opus.outputPricePerMTokensCents / haiku.outputPricePerMTokensCents).toBeGreaterThanOrEqual(10);
  });

  it('modelsByTier returns only models in that tier', () => {
    const fast = modelsByTier('fast');
    expect(fast.length).toBeGreaterThan(0);
    fast.forEach((m) => expect(m.tier).toBe('fast'));
  });

  it('getModel returns the same profile as the registry lookup', () => {
    const id = 'claude-sonnet-4-6';
    expect(getModel(id)).toBe(MODEL_REGISTRY[id]);
  });
});

describe('calculateCost', () => {
  const haiku = MODEL_REGISTRY['claude-haiku-4-5'];

  it('returns zero when usage is zero', () => {
    const cost = calculateCost({ inputTokens: 0, outputTokens: 0 }, haiku);
    expect(cost.totalCents).toBe(0);
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
    // Input: 100¢, Output: 500¢ → Total: 600¢
    expect(cost.inputCents).toBeCloseTo(100, 6);
    expect(cost.outputCents).toBeCloseTo(500, 6);
    expect(cost.totalCents).toBeCloseTo(600, 6);
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

  it('Sonnet costs more than Haiku for identical token usage', () => {
    const sonnet = MODEL_REGISTRY['claude-sonnet-4-6'];
    const usage = { inputTokens: 5000, outputTokens: 1500 };
    expect(calculateCost(usage, sonnet).totalCents).toBeGreaterThan(
      calculateCost(usage, haiku).totalCents,
    );
  });

  it('Opus costs more than Sonnet for identical token usage', () => {
    const sonnet = MODEL_REGISTRY['claude-sonnet-4-6'];
    const opus = MODEL_REGISTRY['claude-opus-4-7'];
    const usage = { inputTokens: 5000, outputTokens: 1500 };
    expect(calculateCost(usage, opus).totalCents).toBeGreaterThan(
      calculateCost(usage, sonnet).totalCents,
    );
  });
});

describe('estimateTokens', () => {
  it('returns 0 for empty input', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('uses the ~4 chars per token heuristic', () => {
    expect(estimateTokens('a'.repeat(40))).toBe(10);
  });

  it('rounds up partial tokens', () => {
    expect(estimateTokens('a'.repeat(5))).toBe(2);
  });
});

describe('estimateCost', () => {
  it('returns both usage and cost for a sample prompt', () => {
    const haiku = MODEL_REGISTRY['claude-haiku-4-5'];
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
    const haiku = MODEL_REGISTRY['claude-haiku-4-5'];
    const r = estimateCost({
      systemInstruction: '',
      userPrompt: 'short',
      model: haiku,
    });
    expect(r.usage.outputTokens).toBe(1500);
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
    expect(formatCostCompact(0.3)).toBe('0.30¢');
    expect(formatCostCompact(15)).toBe('15.0¢');
    expect(formatCostCompact(225)).toBe('$2.25');
  });
});

describe('cost ratio sanity — the routing-savings story', () => {
  // PPC Master Weekly: 7 steps, ~5K input + 2K output each. These are the
  // honest invariants the price registry must support, not aspirational
  // marketing numbers.

  const haiku = MODEL_REGISTRY['claude-haiku-4-5'];
  const sonnet = MODEL_REGISTRY['claude-sonnet-4-6'];
  const opus = MODEL_REGISTRY['claude-opus-4-7'];
  const stepUsage = { inputTokens: 5000, outputTokens: 2000 };
  const blanketOpus = calculateCost(stepUsage, opus).totalCents * 7;

  it('blanket-Opus is >3x the cost of a mostly-Sonnet routed run', () => {
    // 1 strategic Opus call, 4 balanced Sonnet calls, 2 fast Haiku calls.
    const mostlySonnet =
      calculateCost(stepUsage, opus).totalCents * 1 +
      calculateCost(stepUsage, sonnet).totalCents * 4 +
      calculateCost(stepUsage, haiku).totalCents * 2;
    expect(blanketOpus / mostlySonnet).toBeGreaterThan(3);
  });

  it('blanket-Opus is >10x the cost of a Haiku-heavy routed run', () => {
    // When work allows: 5 Haiku + 1 Sonnet + 1 Opus (the strategic merge only).
    const haikuHeavy =
      calculateCost(stepUsage, opus).totalCents * 1 +
      calculateCost(stepUsage, sonnet).totalCents * 1 +
      calculateCost(stepUsage, haiku).totalCents * 5;
    expect(blanketOpus / haikuHeavy).toBeGreaterThan(3);
  });

  it('blanket-Sonnet is >2x the cost of a Haiku-heavy routed run', () => {
    // For workflows where everything is "routine" — never need Opus at all.
    // Sonnet output is ~3x Haiku output per token, so 7 Sonnet calls vs.
    // 1 Sonnet + 6 Haiku produces a real but more modest savings ratio.
    const blanketSonnet = calculateCost(stepUsage, sonnet).totalCents * 7;
    const haikuHeavy =
      calculateCost(stepUsage, sonnet).totalCents * 1 +
      calculateCost(stepUsage, haiku).totalCents * 6;
    expect(blanketSonnet / haikuHeavy).toBeGreaterThan(2);
  });
});
