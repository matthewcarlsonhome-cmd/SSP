/**
 * Model registry and cost calculation for agentic routing.
 *
 * Prices are stored as cents per million tokens. Convert to dollars only at
 * the display layer. Registry entries should mirror models the provider
 * adapters can actually call; update lib/claude.ts, lib/chatgpt.ts, or
 * lib/gemini.ts before adding newer provider model IDs here.
 *
 * Pricing snapshot verified 2026-04-29 against:
 * - https://docs.anthropic.com/en/docs/about-claude/pricing
 * - https://platform.openai.com/docs/pricing/
 * - https://ai.google.dev/gemini-api/docs/pricing
 */

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
  | 'creative'
  | 'evaluation';

export type TaskStakes = 'internal' | 'team' | 'client' | 'leadership';
export type DataSensitivity = 'public' | 'internal' | 'client-confidential' | 'regulated';
export type ModelTierKey = 'fast' | 'balanced' | 'smart' | 'reasoning';
export type Provider = 'claude' | 'gemini' | 'chatgpt';

export interface TaskClassification {
  complexity: TaskComplexity;
  kind: TaskKind;
  stakes: TaskStakes;
  reversible: boolean;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  isIntermediate: boolean;

  minTier?: ModelTierKey;
  maxTier?: ModelTierKey;
  preferredTier?: ModelTierKey;
  allowedProviders?: Provider[];
  forbiddenProviders?: Provider[];
  requiresJson?: boolean;
  requiresToolCalling?: boolean;
  requiresStreaming?: boolean;
  dataSensitivity?: DataSensitivity;
}

export interface ModelProfile {
  id: string;
  displayName: string;
  provider: Provider;
  providerModelId: string;
  tier: ModelTierKey;
  active: boolean;
  priceSnapshotId: string;

  goodFor: TaskKind[];
  acceptableFor: TaskKind[];
  avoidFor: TaskKind[];

  inputPricePerMTokensCents: number;
  outputPricePerMTokensCents: number;
  cacheReadPricePerMTokensCents?: number;
  cacheWritePricePerMTokensCents?: number;
  reasoningPricePerMTokensCents?: number;

  typicalLatencyMs: number;
  supportsJson: boolean;
  supportsStreaming: boolean;
  supportsExtendedThinking: boolean;
  supportsToolCalling: boolean;
  supportsPromptCaching: boolean;

  maxInputTokens: number;
  maxOutputTokens: number;
  maxConcurrentRequests: number;
}

const PRICE_SNAPSHOT_ID = 'official-pricing-2026-04-29';

const CLAUDE_HAIKU: ModelProfile = {
  id: 'claude-3-5-haiku-latest',
  displayName: 'Claude 3.5 Haiku',
  provider: 'claude',
  providerModelId: 'claude-3-5-haiku-latest',
  tier: 'fast',
  active: true,
  priceSnapshotId: PRICE_SNAPSHOT_ID,
  goodFor: ['extraction', 'classification', 'transformation', 'summarization', 'evaluation'],
  acceptableFor: ['analysis', 'generation'],
  avoidFor: ['reasoning', 'creative'],
  inputPricePerMTokensCents: 80,
  outputPricePerMTokensCents: 400,
  cacheReadPricePerMTokensCents: 8,
  cacheWritePricePerMTokensCents: 100,
  typicalLatencyMs: 1500,
  supportsJson: true,
  supportsStreaming: true,
  supportsExtendedThinking: false,
  supportsToolCalling: true,
  supportsPromptCaching: true,
  maxInputTokens: 200_000,
  maxOutputTokens: 8_192,
  maxConcurrentRequests: 50,
};

const CLAUDE_SONNET: ModelProfile = {
  id: 'claude-3-5-sonnet-latest',
  displayName: 'Claude 3.5 Sonnet',
  provider: 'claude',
  providerModelId: 'claude-3-5-sonnet-latest',
  tier: 'balanced',
  active: true,
  priceSnapshotId: PRICE_SNAPSHOT_ID,
  goodFor: ['analysis', 'synthesis', 'generation', 'summarization', 'transformation', 'evaluation'],
  acceptableFor: ['extraction', 'classification', 'reasoning', 'creative'],
  avoidFor: [],
  inputPricePerMTokensCents: 300,
  outputPricePerMTokensCents: 1500,
  cacheReadPricePerMTokensCents: 30,
  cacheWritePricePerMTokensCents: 375,
  typicalLatencyMs: 3500,
  supportsJson: true,
  supportsStreaming: true,
  supportsExtendedThinking: false,
  supportsToolCalling: true,
  supportsPromptCaching: true,
  maxInputTokens: 200_000,
  maxOutputTokens: 8_192,
  maxConcurrentRequests: 30,
};

const CLAUDE_OPUS: ModelProfile = {
  id: 'claude-3-opus-latest',
  displayName: 'Claude 3 Opus',
  provider: 'claude',
  providerModelId: 'claude-3-opus-latest',
  tier: 'smart',
  active: true,
  priceSnapshotId: PRICE_SNAPSHOT_ID,
  goodFor: ['reasoning', 'synthesis', 'analysis', 'creative', 'generation', 'evaluation'],
  acceptableFor: ['summarization'],
  avoidFor: ['extraction', 'classification', 'transformation'],
  inputPricePerMTokensCents: 1500,
  outputPricePerMTokensCents: 7500,
  cacheReadPricePerMTokensCents: 150,
  cacheWritePricePerMTokensCents: 1875,
  typicalLatencyMs: 9000,
  supportsJson: true,
  supportsStreaming: true,
  supportsExtendedThinking: false,
  supportsToolCalling: true,
  supportsPromptCaching: true,
  maxInputTokens: 200_000,
  maxOutputTokens: 4_096,
  maxConcurrentRequests: 10,
};

const GEMINI_FLASH: ModelProfile = {
  id: 'gemini-2.0-flash',
  displayName: 'Gemini 2.0 Flash',
  provider: 'gemini',
  providerModelId: 'gemini-2.0-flash',
  tier: 'fast',
  active: true,
  priceSnapshotId: PRICE_SNAPSHOT_ID,
  goodFor: ['extraction', 'classification', 'summarization', 'transformation', 'evaluation'],
  acceptableFor: ['analysis', 'generation', 'synthesis'],
  avoidFor: ['reasoning', 'creative'],
  inputPricePerMTokensCents: 10,
  outputPricePerMTokensCents: 40,
  cacheReadPricePerMTokensCents: 2.5,
  typicalLatencyMs: 1200,
  supportsJson: true,
  supportsStreaming: true,
  supportsExtendedThinking: false,
  supportsToolCalling: true,
  supportsPromptCaching: true,
  maxInputTokens: 1_000_000,
  maxOutputTokens: 8_192,
  maxConcurrentRequests: 60,
};

const GPT_4O_MINI: ModelProfile = {
  id: 'gpt-4o-mini',
  displayName: 'GPT-4o Mini',
  provider: 'chatgpt',
  providerModelId: 'gpt-4o-mini',
  tier: 'fast',
  active: true,
  priceSnapshotId: PRICE_SNAPSHOT_ID,
  goodFor: ['extraction', 'classification', 'summarization', 'transformation', 'evaluation'],
  acceptableFor: ['analysis', 'generation'],
  avoidFor: ['reasoning', 'creative'],
  inputPricePerMTokensCents: 15,
  outputPricePerMTokensCents: 60,
  cacheReadPricePerMTokensCents: 7.5,
  typicalLatencyMs: 1300,
  supportsJson: true,
  supportsStreaming: true,
  supportsExtendedThinking: false,
  supportsToolCalling: true,
  supportsPromptCaching: true,
  maxInputTokens: 128_000,
  maxOutputTokens: 16_384,
  maxConcurrentRequests: 50,
};

const GPT_4O: ModelProfile = {
  id: 'gpt-4o',
  displayName: 'GPT-4o',
  provider: 'chatgpt',
  providerModelId: 'gpt-4o',
  tier: 'balanced',
  active: true,
  priceSnapshotId: PRICE_SNAPSHOT_ID,
  goodFor: ['analysis', 'synthesis', 'generation', 'summarization', 'evaluation'],
  acceptableFor: ['extraction', 'classification', 'reasoning', 'creative'],
  avoidFor: [],
  inputPricePerMTokensCents: 250,
  outputPricePerMTokensCents: 1000,
  cacheReadPricePerMTokensCents: 125,
  typicalLatencyMs: 4000,
  supportsJson: true,
  supportsStreaming: true,
  supportsExtendedThinking: false,
  supportsToolCalling: true,
  supportsPromptCaching: true,
  maxInputTokens: 128_000,
  maxOutputTokens: 16_384,
  maxConcurrentRequests: 25,
};

const OPENAI_O1: ModelProfile = {
  id: 'o1',
  displayName: 'OpenAI o1',
  provider: 'chatgpt',
  providerModelId: 'o1',
  tier: 'reasoning',
  active: true,
  priceSnapshotId: PRICE_SNAPSHOT_ID,
  goodFor: ['reasoning', 'analysis', 'synthesis', 'evaluation'],
  acceptableFor: ['generation', 'creative'],
  avoidFor: ['extraction', 'classification', 'transformation'],
  inputPricePerMTokensCents: 1500,
  outputPricePerMTokensCents: 6000,
  cacheReadPricePerMTokensCents: 750,
  reasoningPricePerMTokensCents: 6000,
  typicalLatencyMs: 12000,
  supportsJson: true,
  supportsStreaming: false,
  supportsExtendedThinking: true,
  supportsToolCalling: false,
  supportsPromptCaching: true,
  maxInputTokens: 200_000,
  maxOutputTokens: 100_000,
  maxConcurrentRequests: 5,
};

export const MODEL_REGISTRY: Record<string, ModelProfile> = {
  [CLAUDE_HAIKU.id]: CLAUDE_HAIKU,
  [CLAUDE_SONNET.id]: CLAUDE_SONNET,
  [CLAUDE_OPUS.id]: CLAUDE_OPUS,
  [GEMINI_FLASH.id]: GEMINI_FLASH,
  [GPT_4O_MINI.id]: GPT_4O_MINI,
  [GPT_4O.id]: GPT_4O,
  [OPENAI_O1.id]: OPENAI_O1,
};

export function listModels(options?: { includeInactive?: boolean }): ModelProfile[] {
  const models = Object.values(MODEL_REGISTRY);
  return options?.includeInactive ? models : models.filter((m) => m.active);
}

export function getModel(id: string): ModelProfile | undefined {
  return MODEL_REGISTRY[id];
}

export function modelsByTier(tier: ModelTierKey): ModelProfile[] {
  return listModels().filter((m) => m.tier === tier);
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
}

export interface CostBreakdown {
  inputCents: number;
  outputCents: number;
  cacheReadCents: number;
  cacheWriteCents: number;
  reasoningCents: number;
  totalCents: number;
}

export function calculateCost(usage: TokenUsage, model: ModelProfile): CostBreakdown {
  const million = 1_000_000;
  const inputCents = (usage.inputTokens / million) * model.inputPricePerMTokensCents;
  const outputCents = (usage.outputTokens / million) * model.outputPricePerMTokensCents;
  const cacheReadCents =
    usage.cacheReadTokens && model.cacheReadPricePerMTokensCents
      ? (usage.cacheReadTokens / million) * model.cacheReadPricePerMTokensCents
      : 0;
  const cacheWriteCents =
    usage.cacheWriteTokens && model.cacheWritePricePerMTokensCents
      ? (usage.cacheWriteTokens / million) * model.cacheWritePricePerMTokensCents
      : 0;
  const reasoningCents =
    usage.reasoningTokens
      ? (usage.reasoningTokens / million) *
        (model.reasoningPricePerMTokensCents ?? model.outputPricePerMTokensCents)
      : 0;
  const totalCents = inputCents + outputCents + cacheReadCents + cacheWriteCents + reasoningCents;
  return { inputCents, outputCents, cacheReadCents, cacheWriteCents, reasoningCents, totalCents };
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

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

export function centsToDollarString(cents: number, decimals = 4): string {
  if (cents === 0) return '$0.00';
  return '$' + (cents / 100).toFixed(decimals);
}

export function formatCostCompact(cents: number): string {
  if (cents === 0) return '$0';
  if (cents < 1) return cents.toFixed(2) + ' cents';
  if (cents < 100) return cents.toFixed(1) + ' cents';
  return '$' + (cents / 100).toFixed(2);
}
