/**
 * Platform Key Management System
 *
 * Manages admin-configured API keys for platform-wide use.
 * Users can either use platform-provided keys (with usage tracking)
 * or bring their own keys (BYOK mode).
 *
 * SECURITY NOTE: Platform keys are never exposed to the client.
 * All platform key operations go through secure Edge Functions.
 */

import { getApiKey, hasStoredKey } from './apiKeyStorage';
import { supabase, getSession } from './supabase';
import { logger } from './logger';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ApiProvider = 'gemini' | 'claude' | 'chatgpt';
export type KeyMode = 'platform' | 'personal';

export interface PlatformKeyConfig {
  provider: ApiProvider;
  isAvailable: boolean;
  balance?: number; // Remaining credits/balance in cents
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface KeyModeSelection {
  mode: KeyMode;
  provider: ApiProvider;
  model: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  costPer1kTokens: number; // in cents
  speedTier: 'fast' | 'standard' | 'slow';
  qualityTier: 'basic' | 'standard' | 'premium';
  maxTokens: number;
  supportsStreaming: boolean;
  isDefault?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const GEMINI_MODELS: ModelOption[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Fast, efficient model for most tasks',
    costPer1kTokens: 0.01,
    speedTier: 'fast',
    qualityTier: 'standard',
    maxTokens: 8192,
    supportsStreaming: true,
    isDefault: true,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'High-quality model with large context window',
    costPer1kTokens: 0.125,
    speedTier: 'standard',
    qualityTier: 'premium',
    maxTokens: 8192,
    supportsStreaming: true,
  },
];

export const CLAUDE_MODELS: ModelOption[] = [
  {
    id: 'haiku',
    name: 'Claude 3.5 Haiku',
    description: 'Fast and cost-effective for simple tasks',
    costPer1kTokens: 0.08,
    speedTier: 'fast',
    qualityTier: 'basic',
    maxTokens: 8192,
    supportsStreaming: true,
    isDefault: true,
  },
  {
    id: 'sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Balanced performance and quality',
    costPer1kTokens: 0.3,
    speedTier: 'standard',
    qualityTier: 'standard',
    maxTokens: 8192,
    supportsStreaming: true,
  },
  {
    id: 'opus',
    name: 'Claude Opus 4',
    description: 'Most capable model for complex tasks',
    costPer1kTokens: 0.09, // $15/1M in, $75/1M out = ~$0.09/1K average
    speedTier: 'slow',
    qualityTier: 'premium',
    maxTokens: 4096,
    supportsStreaming: true,
  },
];

export const CHATGPT_MODELS: ModelOption[] = [
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast and affordable for most tasks',
    costPer1kTokens: 0.015,
    speedTier: 'fast',
    qualityTier: 'standard',
    maxTokens: 4096,
    supportsStreaming: true,
    isDefault: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable GPT-4 model',
    costPer1kTokens: 0.5,
    speedTier: 'standard',
    qualityTier: 'premium',
    maxTokens: 4096,
    supportsStreaming: true,
  },
  {
    id: 'o1-mini',
    name: 'o1-mini',
    description: 'Reasoning model for complex problems',
    costPer1kTokens: 0.3,
    speedTier: 'slow',
    qualityTier: 'premium',
    maxTokens: 4096,
    supportsStreaming: false,
  },
  {
    id: 'o1-preview',
    name: 'o1-preview',
    description: 'Advanced reasoning (preview)',
    costPer1kTokens: 1.5,
    speedTier: 'slow',
    qualityTier: 'premium',
    maxTokens: 4096,
    supportsStreaming: false,
  },
];

export function getModelsForProvider(provider: ApiProvider): ModelOption[] {
  switch (provider) {
    case 'gemini':
      return GEMINI_MODELS;
    case 'claude':
      return CLAUDE_MODELS;
    case 'chatgpt':
      return CHATGPT_MODELS;
    default:
      return [];
  }
}

export function getDefaultModel(provider: ApiProvider): ModelOption | undefined {
  const models = getModelsForProvider(provider);
  return models.find(m => m.isDefault) || models[0];
}

export function getModelById(provider: ApiProvider, modelId: string): ModelOption | undefined {
  const models = getModelsForProvider(provider);
  return models.find(m => m.id === modelId);
}

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM KEY STATUS (simulated - would be backend in production)
// ═══════════════════════════════════════════════════════════════════════════

const PLATFORM_KEY_STORAGE = 'skillengine_platform_config';

interface PlatformConfig {
  geminiEnabled: boolean;
  claudeEnabled: boolean;
  chatgptEnabled: boolean;
  balances: {
    gemini: number;
    claude: number;
    chatgpt: number;
  };
  lastUpdated: string;
}

function getDefaultPlatformConfig(): PlatformConfig {
  return {
    geminiEnabled: false,
    claudeEnabled: false,
    chatgptEnabled: false,
    balances: {
      gemini: 0,
      claude: 0,
      chatgpt: 0,
    },
    lastUpdated: new Date().toISOString(),
  };
}

export function getPlatformConfig(): PlatformConfig {
  try {
    const stored = localStorage.getItem(PLATFORM_KEY_STORAGE);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error('Failed to load platform config', { error: error instanceof Error ? error.message : String(error) });
  }
  return getDefaultPlatformConfig();
}

export function savePlatformConfig(config: Partial<PlatformConfig>): void {
  try {
    const existing = getPlatformConfig();
    const updated = {
      ...existing,
      ...config,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(PLATFORM_KEY_STORAGE, JSON.stringify(updated));
  } catch (error) {
    logger.error('Failed to save platform config', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Check if platform keys are available for a provider
 */
export function isPlatformKeyAvailable(provider: ApiProvider): boolean {
  const config = getPlatformConfig();
  switch (provider) {
    case 'gemini':
      return config.geminiEnabled && config.balances.gemini > 0;
    case 'claude':
      return config.claudeEnabled && config.balances.claude > 0;
    case 'chatgpt':
      return config.chatgptEnabled && config.balances.chatgpt > 0;
    default:
      return false;
  }
}

/**
 * Get platform balance for a provider (in cents)
 */
export function getPlatformBalance(provider: ApiProvider): number {
  const config = getPlatformConfig();
  return config.balances[provider] || 0;
}

/**
 * Deduct from platform balance (returns new balance)
 */
export function deductPlatformBalance(provider: ApiProvider, amount: number): number {
  const config = getPlatformConfig();
  const newBalance = Math.max(0, (config.balances[provider] || 0) - amount);
  savePlatformConfig({
    balances: {
      ...config.balances,
      [provider]: newBalance,
    },
  });
  return newBalance;
}

// ═══════════════════════════════════════════════════════════════════════════
// KEY MODE SELECTION
// ═══════════════════════════════════════════════════════════════════════════

const KEY_MODE_STORAGE = 'skillengine_key_mode';

interface StoredKeyMode {
  mode: KeyMode;
  provider: ApiProvider;
  models: Record<ApiProvider, string>;
}

export function getStoredKeyMode(): StoredKeyMode {
  try {
    const stored = localStorage.getItem(KEY_MODE_STORAGE);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error('Failed to load key mode', { error: error instanceof Error ? error.message : String(error) });
  }
  return {
    mode: 'personal', // Default to personal keys until platform is set up
    provider: 'chatgpt', // ChatGPT 4o-Mini for fast streaming and structured output
    models: {
      gemini: 'gemini-2.0-flash',
      claude: 'haiku',
      chatgpt: 'gpt-4o-mini',
    },
  };
}

export function saveKeyMode(mode: KeyMode): void {
  const existing = getStoredKeyMode();
  localStorage.setItem(KEY_MODE_STORAGE, JSON.stringify({
    ...existing,
    mode,
  }));
}

export function saveSelectedProvider(provider: ApiProvider): void {
  const existing = getStoredKeyMode();
  localStorage.setItem(KEY_MODE_STORAGE, JSON.stringify({
    ...existing,
    provider,
  }));
}

export function saveSelectedModel(provider: ApiProvider, modelId: string): void {
  const existing = getStoredKeyMode();
  localStorage.setItem(KEY_MODE_STORAGE, JSON.stringify({
    ...existing,
    models: {
      ...existing.models,
      [provider]: modelId,
    },
  }));
}

export function getSelectedModel(provider: ApiProvider): string {
  const stored = getStoredKeyMode();
  return stored.models[provider] || getDefaultModel(provider)?.id || '';
}

// ═══════════════════════════════════════════════════════════════════════════
// KEY RESOLUTION (determines which key to use)
// ═══════════════════════════════════════════════════════════════════════════

export interface ResolvedKey {
  key: string;
  source: 'platform' | 'personal';
  provider: ApiProvider;
  model: string;
  costEstimate?: number;
}

/**
 * Resolve which API key to use based on current mode and availability
 */
export function resolveApiKey(
  provider: ApiProvider,
  personalKeyOverride?: string
): ResolvedKey | null {
  const stored = getStoredKeyMode();
  const model = stored.models[provider] || getDefaultModel(provider)?.id || '';

  // If personal key provided directly, use it
  if (personalKeyOverride) {
    return {
      key: personalKeyOverride,
      source: 'personal',
      provider,
      model,
    };
  }

  // Check mode preference
  if (stored.mode === 'platform') {
    // Platform keys are handled via the AI Proxy Edge Function.
    // The key is never exposed to the client - use callAIProxy() instead.
    // This function returns a marker indicating platform mode is active.
    if (isPlatformKeyAvailable(provider)) {
      return {
        key: '__PLATFORM_KEY__', // Marker - use callAIProxy() for actual API calls
        source: 'platform',
        provider,
        model,
      };
    }
  }

  // Fall back to personal key
  const personalKey = getApiKey(provider);
  if (personalKey) {
    return {
      key: personalKey,
      source: 'personal',
      provider,
      model,
    };
  }

  return null;
}

/**
 * Check if user can run a skill with current configuration
 */
export function canRunSkill(provider: ApiProvider): {
  canRun: boolean;
  reason?: string;
  suggestion?: string;
} {
  const stored = getStoredKeyMode();

  if (stored.mode === 'platform') {
    if (isPlatformKeyAvailable(provider)) {
      return { canRun: true };
    }
    // Check if personal key available as fallback
    if (hasStoredKey(provider)) {
      return {
        canRun: true,
        reason: 'Platform key unavailable, using your personal key',
      };
    }
    return {
      canRun: false,
      reason: `Platform credits not available for ${provider}`,
      suggestion: 'Switch to "Use my key" mode or contact admin to add credits',
    };
  }

  // Personal key mode
  if (hasStoredKey(provider)) {
    return { canRun: true };
  }

  return {
    canRun: false,
    reason: `No ${provider} API key configured`,
    suggestion: `Add your ${provider} API key in Settings, or switch to platform mode`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Admin: Enable platform key for a provider
 */
export function adminEnablePlatformKey(provider: ApiProvider, initialBalance: number): void {
  const config = getPlatformConfig();
  savePlatformConfig({
    [`${provider}Enabled`]: true,
    balances: {
      ...config.balances,
      [provider]: initialBalance,
    },
  });
}

/**
 * Admin: Add credits to platform balance
 */
export function adminAddCredits(provider: ApiProvider, amount: number): void {
  const config = getPlatformConfig();
  savePlatformConfig({
    balances: {
      ...config.balances,
      [provider]: (config.balances[provider] || 0) + amount,
    },
  });
}

/**
 * Admin: Disable platform key for a provider
 */
export function adminDisablePlatformKey(provider: ApiProvider): void {
  savePlatformConfig({
    [`${provider}Enabled`]: false,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKEND INTEGRATION (Secure Platform Key Operations)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cache for platform status to avoid repeated API calls
 */
interface PlatformStatusCache {
  data: PlatformStatusResponse | null;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface PlatformStatusResponse {
  available: boolean;
  providers: {
    gemini: boolean;
    claude: boolean;
    openai: boolean;
  };
}

const platformStatusCache: PlatformStatusCache = {
  data: null,
  timestamp: 0,
  ttl: 60000, // Cache for 1 minute
};

/**
 * Fetch platform key availability from the backend
 * This calls the platform-status Edge Function to check which providers
 * have platform keys configured (without exposing the keys).
 */
export async function fetchPlatformStatus(): Promise<PlatformStatusResponse> {
  // Check cache first
  const now = Date.now();
  if (platformStatusCache.data && now - platformStatusCache.timestamp < platformStatusCache.ttl) {
    return platformStatusCache.data;
  }

  if (!supabase) {
    return { available: false, providers: { gemini: false, claude: false, openai: false } };
  }

  try {
    const { data, error } = await supabase.functions.invoke('platform-status');

    if (error) {
      logger.error('Failed to fetch platform status', { error: error instanceof Error ? error.message : String(error) });
      return { available: false, providers: { gemini: false, claude: false, openai: false } };
    }

    const response: PlatformStatusResponse = {
      available: data?.available ?? false,
      providers: {
        gemini: data?.providers?.gemini ?? false,
        claude: data?.providers?.claude ?? false,
        openai: data?.providers?.openai ?? false,
      },
    };

    // Update cache
    platformStatusCache.data = response;
    platformStatusCache.timestamp = now;

    // Sync with local config
    if (response.available) {
      savePlatformConfig({
        geminiEnabled: response.providers.gemini,
        claudeEnabled: response.providers.claude,
        chatgptEnabled: response.providers.openai,
      });
    }

    return response;
  } catch (err) {
    logger.error('Platform status fetch error', { error: err instanceof Error ? err.message : String(err) });
    return { available: false, providers: { gemini: false, claude: false, openai: false } };
  }
}

/**
 * Map internal provider names to Edge Function provider names
 */
function mapProviderName(provider: ApiProvider): 'gemini' | 'claude' | 'openai' {
  return provider === 'chatgpt' ? 'openai' : provider;
}

/**
 * Check if platform key is available for a provider (async version)
 * Uses the backend to verify availability
 */
export async function checkPlatformKeyAvailable(provider: ApiProvider): Promise<boolean> {
  const status = await fetchPlatformStatus();
  const mappedProvider = mapProviderName(provider);
  return status.providers[mappedProvider] ?? false;
}

/**
 * AI Proxy Response from Edge Function
 */
export interface AIProxyResponse {
  output: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    costCents: number;
  };
  model: string;
}

/**
 * Call the AI Proxy Edge Function to use platform keys
 * This is the secure way to use platform-provided API keys.
 * The actual keys never leave the server.
 */
export async function callAIProxy(options: {
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<AIProxyResponse> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const session = await getSession();
  if (!session) {
    throw new Error('Must be signed in to use platform keys');
  }

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      model: options.model,
      prompt: options.prompt,
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
    },
  });

  if (error) {
    // Handle specific error types
    if (error.message?.includes('Insufficient credits')) {
      throw new Error('Insufficient platform credits. Please add credits or switch to personal key mode.');
    }
    if (error.message?.includes('Invalid authentication')) {
      throw new Error('Authentication expired. Please sign in again.');
    }
    throw new Error(`AI Proxy error: ${error.message}`);
  }

  if (!data?.output) {
    throw new Error('Invalid response from AI Proxy');
  }

  return {
    output: data.output,
    usage: {
      inputTokens: data.usage?.inputTokens ?? 0,
      outputTokens: data.usage?.outputTokens ?? 0,
      costCents: data.usage?.costCents ?? 0,
    },
    model: data.model ?? options.model,
  };
}

/**
 * Stream AI response through platform-managed API keys.
 * Returns an async generator that yields content chunks in real-time.
 */
export async function* streamAIProxy(options: {
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}): AsyncGenerator<string, void, unknown> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const session = await getSession();
  if (!session) {
    throw new Error('Must be signed in to use platform keys');
  }

  // Use direct fetch for streaming (supabase.functions.invoke doesn't support streaming)
  const supabaseUrl = supabase.supabaseUrl;
  const response = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      model: options.model,
      prompt: options.prompt,
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (response.status === 402) {
      throw new Error('Insufficient platform credits. Please add credits or switch to personal key mode.');
    }
    if (response.status === 401) {
      throw new Error('Authentication expired. Please sign in again.');
    }
    throw new Error(errorData.error || `AI Proxy error: ${response.status}`);
  }

  // Check if we got a streaming response
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    // Non-streaming fallback
    const data = await response.json();
    yield data.output || '';
    return;
  }

  // Process SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);

            // Handle OpenAI format
            const openaiContent = data.choices?.[0]?.delta?.content;
            if (openaiContent) {
              yield openaiContent;
              continue;
            }

            // Handle Claude format
            if (data.type === 'content_block_delta' && data.delta?.text) {
              yield data.delta.text;
              continue;
            }
          } catch {
            // Ignore JSON parse errors for partial chunks
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.startsWith('data: ')) {
      const jsonStr = buffer.slice(6).trim();
      if (jsonStr && jsonStr !== '[DONE]') {
        try {
          const data = JSON.parse(jsonStr);
          const content = data.choices?.[0]?.delta?.content || data.delta?.text;
          if (content) {
            yield content;
          }
        } catch {
          // Ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Check if the current user can use platform keys
 * Requires authentication and available platform keys
 */
export async function canUsePlatformKeys(provider: ApiProvider): Promise<{
  canUse: boolean;
  reason?: string;
}> {
  if (!supabase) {
    return { canUse: false, reason: 'Supabase not configured' };
  }

  const session = await getSession();
  if (!session) {
    return { canUse: false, reason: 'Sign in required to use platform keys' };
  }

  const isAvailable = await checkPlatformKeyAvailable(provider);
  if (!isAvailable) {
    return { canUse: false, reason: `Platform key not available for ${provider}` };
  }

  return { canUse: true };
}

/**
 * Get current user's platform credit balance
 */
export async function getUserCreditBalance(): Promise<number> {
  if (!supabase) {
    return 0;
  }

  const session = await getSession();
  if (!session) {
    return 0;
  }

  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      logger.error('Failed to fetch credit balance', { error: error instanceof Error ? error.message : String(error) });
      return 0;
    }

    return data?.balance ?? 0;
  } catch (err) {
    logger.error('Credit balance fetch error', { error: err instanceof Error ? err.message : String(err) });
    return 0;
  }
}

/**
 * Initialize platform key system
 * Call this on app startup to check platform availability
 */
export async function initializePlatformKeys(): Promise<void> {
  try {
    await fetchPlatformStatus();
  } catch (err) {
    logger.warn('Failed to initialize platform keys', { error: err instanceof Error ? err.message : String(err) });
  }
}
