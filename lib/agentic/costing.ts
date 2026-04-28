/**
 * costing.ts — single source of truth for model prices, capability profiles,
 * and cost calculation.
 *
 * Adding a new model is a one-row change to MODEL_REGISTRY. The registry is
 * the data the orchestrator reads to decide which model to call and the
 * Cost Explorer reads to compute estimated and actual costs.
 *
 * All prices are stored as cents-per-million-tokens (integer- or
 * decimal-precise) so multiplications by small token counts don't lose
 * information. Convert to dollars only at the display layer.
 *
 * Verify the registry against the providers' published pricing pages
 * periodically. Stale prices don't break anything — they just produce
 * estimates that are off by a few percent.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Task classification — the input to the router. Imported by orchestrator.ts.
// Defined here because both the router and the cost estimator consume it.
// ─────────────────────────────────────────────────────────────────────────────

export type TaskComplexity = 'trivial' | 'routine' | 'complex' | 'strategic';

export type TaskKind =
  | 'extraction'
  | 'classification'
  | 'transformation'
  | 'summarization'
  | 'analysis'
  | 'synthesis'
  | 'generation'
  | 'reasoning'
  | 'creative';

export type TaskStakes = 'internal' | 'team' | 'client' | 'leadership';

export type ModelTierKey = 'fast' | 'balanced' | 'smart' | 'reasoning';

export interface TaskClassification {
  complexity: TaskComplexity;
  kind: TaskKind;
  stakes: TaskStakes;
  reversible: boolean;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  /**
   * True if the output is part of the agent's reasoning chain rather than a
   * final user-visible artifact. Reasoning steps can use cheaper models more
   * aggressively because errors are caught downstream.
   */
  isIntermediate: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model profiles
// ─────────────────────────────────────────────────────────────────────────────

export type Provider = 'claude' | 'gemini' | 'chatgpt';

export interface ModelProfile {
  id: string;
  displayName: string;
  provider: Provider;
  tier: ModelTierKey;

  /** Tasks this model is well-suited for. */
  goodFor: TaskKind[];
  /** Tasks this model can handle but isn't optimal for. */
  acceptableFor: TaskKind[];
  /** Tasks this model should not be used for (will be filtered out). */
  avoidFor: TaskKind[];

  // Pricing — cents per million tokens.
  inputPricePerMTokensCents: number;
  outputPricePerMTokensCents: number;
  cacheReadPricePerMTokensCents?: number;
  cacheWritePricePerMTokensCents?: number;

  // Latency / runtime characteristics.
  typicalLatencyMs: number;        // wall-clock for ~1k output tokens
  supportsStreaming: boolean;
  supportsExtendedThinking: boolean;
  supportsToolCalling: boolean;

  // Window sizes.
  maxInputTokens: number;
  maxOutputTokens: number;

  // Concurrency hint — fed to the rate limiter; 0 means no opinion.
  maxConcurrentRequests: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL REGISTRY
//
// Approximate published prices as of early 2026. Verify against provider
// pricing pages before billing-grade decisions. Numbers are cents per
// million tokens.
//
// Sources to re-check periodically:
//   - https://www.anthropic.com/pricing
//   - https://ai.google.dev/pricing
//   - https://openai.com/api/pricing/
// ─────────────────────────────────────────────────────────────────────────────

const CLAUDE_HAIKU: ModelProfile = {
  id: 'claude-haiku-4-5',
  displayName: 'Claude Haiku 4.5',
  provider: 'claude',
  tier: 'fast',
  goodFor: ['extraction', 'classification', 'transformation', 'summarization'],
  acceptableFor: ['analysis', 'generation'],
  avoidFor: ['reasoning', 'creative'],
  inputPricePerMTokensCents: 100,         // ~$1.00/M
  outputPricePerMTokensCents: 500,        // ~$5.00/M
  cacheReadPricePerMTokensCents: 10,      // ~$0.10/M
  cacheWritePricePerMTokensCents: 125,    // ~$1.25/M
  typicalLatencyMs: 1500,
  supportsStreaming: true,
  supportsExtendedThinking: false,
  supportsToolCalling: true,
  maxInputTokens: 200_000,
  maxOutputTokens: 8_192,
  maxConcurrentRequests: 50,
};

const CLAUDE_SONNET: ModelProfile = {
  id: 'claude-sonnet-4-6',
  displayName: 'Claude Sonnet 4.6',
  provider: 'claude',
  tier: 'balanced',
  goodFor: ['analysis', 'synthesis', 'generation', 'summarization', 'transformation'],
  acceptableFor: ['extraction', 'classification', 'reasoning'],
  avoidFor: [],
  inputPricePerMTokensCents: 300,         // ~$3.00/M
  outputPricePerMTokensCents: 1500,       // ~$15.00/M
  cacheReadPricePerMTokensCents: 30,
  cacheWritePricePerMTokensCents: 375,
  typicalLatencyMs: 3500,
  supportsStreaming: true,
  supportsExtendedThinking: true,
  supportsToolCalling: true,
  maxInputTokens: 200_000,
  maxOutputTokens: 8_192,
  maxConcurrentRequests: 30,
};

const CLAUDE_OPUS: ModelProfile = {
  id: 'claude-opus-4-7',
  displayName: 'Claude Opus 4.7',
  provider: 'claude',
  tier: 'smart',
  goodFor: ['reasoning', 'synthesis', 'analysis', 'creative', 'generation'],
  acceptableFor: ['summarization'],
  avoidFor: ['extraction', 'classification', 'transformation'],
  inputPricePerMTokensCents: 1500,        // ~$15.00/M
  outputPricePerMTokensCents: 7500,       // ~$75.00/M
  cacheReadPricePerMTokensCents: 150,
  cacheWritePricePerMTokensCents: 1875,
  typicalLatencyMs: 9000,
  supportsStreaming: true,
  supportsExtendedThinking: true,
  supportsToolCalling: true,
  maxInputTokens: 200_000,
  maxOutputTokens: 4_096,
  maxConcurrentRequests: 10,
};

const GEMINI_FLASH: ModelProfile = {
  id: 'gemini-2.0-flash',
  displayName: 'Gemini 2.0 Flash',
  provider: 'gemini',
  tier: 'fast',
  goodFor: ['extraction', 'classification', 'summarization', 'transformation'],
  acceptableFor: ['analysis', 'generation'],
  avoidFor: ['reasoning', 'creative'],
  inputPricePerMTokensCents: 10,          // ~$0.10/M
  outputPricePerMTokensCents: 40,         // ~$0.40/M
  typicalLatencyMs: 1200,
  supportsStreaming: true,
  supportsExtendedThinking: false,
  supportsToolCalling: true,
  maxInputTokens: 1_000_000,
  maxOutputTokens: 8_192,
  maxConcurrentRequests: 60,
};

const GPT_4O_MINI: ModelProfile = {
  id: 'gpt-4o-mini',
  displayName: 'GPT-4o Mini',
  provider: 'chatgpt',
  tier: 'fast',
  goodFor: ['extraction', 'classification', 'summarization', 'transformation'],
  acceptableFor: ['analysis', 'generation'],
  avoidFor: ['reasoning', 'creative'],
  inputPricePerMTokensCents: 15,          // ~$0.15/M
  outputPricePerMTokensCents: 60,         // ~$0.60/M
  typicalLatencyMs: 1300,
  supportsStreaming: true,
  supportsExtendedThinking: false,
  supportsToolCalling: true,
  maxInputTokens: 128_000,
  maxOutputTokens: 16_384,
  maxConcurrentRequests: 50,
};

const GPT_4O: ModelProfile = {
  id: 'gpt-4o',
  displayName: 'GPT-4o',
  provider: 'chatgpt',
  tier: 'balanced',
  goodFor: ['analysis', 'synthesis', 'generation', 'summarization'],
  acceptableFor: ['extraction', 'classification', 'reasoning'],
  avoidFor: [],
  inputPricePerMTokensCents: 250,         // ~$2.50/M
  outputPricePerMTokensCents: 1000,       // ~$10.00/M
  typicalLatencyMs: 4000,
  supportsStreaming: true,
  supportsExtendedThinking: false,
  supportsToolCalling: true,
  maxInputTokens: 128_000,
  maxOutputTokens: 16_384,
  maxConcurrentRequests: 25,
};

export const MODEL_REGISTRY: Record<string, ModelProfile> = {
  [CLAUDE_HAIKU.id]: CLAUDE_HAIKU,
  [CLAUDE_SONNET.id]: CLAUDE_SONNET,
  [CLAUDE_OPUS.id]: CLAUDE_OPUS,
  [GEMINI_FLASH.id]: GEMINI_FLASH,
  [GPT_4O_MINI.id]: GPT_4O_MINI,
  [GPT_4O.id]: GPT_4O,
};

export function listModels(): ModelProfile[] {
  return Object.values(MODEL_REGISTRY);
}

export function getModel(id: string): ModelProfile | undefined {
  return MODEL_REGISTRY[id];
}

export function modelsByTier(tier: ModelTierKey): ModelProfile[] {
  return listModels().filter((m) => m.tier === tier);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost calculation — used for both estimation and actual attribution.
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface CostBreakdown {
  inputCents: number;
  outputCents: number;
  cacheReadCents: number;
  cacheWriteCents: number;
  totalCents: number;
}

/**
 * Pure function — given token usage and a model profile, return the cost
 * breakdown in cents. Numbers can be fractional cents; round only at the
 * display layer.
 */
export function calculateCost(usage: TokenUsage, model: ModelProfile): CostBreakdown {
  const M = 1_000_000;
  const inputCents = (usage.inputTokens / M) * model.inputPricePerMTokensCents;
  const outputCents = (usage.outputTokens / M) * model.outputPricePerMTokensCents;
  const cacheReadCents =
    usage.cacheReadTokens && model.cacheReadPricePerMTokensCents
      ? (usage.cacheReadTokens / M) * model.cacheReadPricePerMTokensCents
      : 0;
  const cacheWriteCents =
    usage.cacheWriteTokens && model.cacheWritePricePerMTokensCents
      ? (usage.cacheWriteTokens / M) * model.cacheWritePricePerMTokensCents
      : 0;
  const totalCents = inputCents + outputCents + cacheReadCents + cacheWriteCents;
  return { inputCents, outputCents, cacheReadCents, cacheWriteCents, totalCents };
}

// ─────────────────────────────────────────────────────────────────────────────
// Token estimation — heuristic only. Provider-side counts are authoritative;
// this is for pre-call estimates and the Cost Explorer's projections.
//
// Rule of thumb: ~4 chars per token for English. Keep the implementation
// trivial; if estimation accuracy ever matters more, swap in a real
// tokenizer at this seam without touching call sites.
// ─────────────────────────────────────────────────────────────────────────────

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost for a single model call given the prompt text and an
 * estimated output size. Output is harder to predict than input; callers
 * either pass an empirical average from past runs or use the rule-of-thumb
 * default of 1500 tokens (a typical "skill" response size).
 */
export function estimateCost(args: {
  systemInstruction: string;
  userPrompt: string;
  estimatedOutputTokens?: number;
  model: ModelProfile;
}): { usage: TokenUsage; cost: CostBreakdown } {
  const inputTokens = estimateTokens(args.systemInstruction) + estimateTokens(args.userPrompt);
  const outputTokens = args.estimatedOutputTokens ?? 1500;
  const usage: TokenUsage = { inputTokens, outputTokens };
  return { usage, cost: calculateCost(usage, args.model) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

export function centsToDollarString(cents: number, decimals = 4): string {
  if (cents === 0) return '$0.00';
  return '$' + (cents / 100).toFixed(decimals);
}

/**
 * Compact form for tables — auto-picks units. <1¢ shows as fractional ¢
 * with 2 decimals; <$1 shows as cents; otherwise dollars to 2 decimals.
 */
export function formatCostCompact(cents: number): string {
  if (cents === 0) return '$0';
  if (cents < 1) return cents.toFixed(2) + '¢';
  if (cents < 100) return cents.toFixed(1) + '¢';
  return '$' + (cents / 100).toFixed(2);
}
