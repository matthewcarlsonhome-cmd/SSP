/**
 * API Key Storage - Securely store and retrieve API keys
 *
 * SECURITY IMPROVEMENTS:
 * - Uses AES-GCM authenticated encryption via Web Crypto API
 * - Keys are encrypted with a device-specific derived key
 * - Each save uses a unique IV (Initialization Vector)
 * - Provides both confidentiality and integrity protection
 *
 * NOTE: For maximum security, API keys should be stored server-side.
 * This client-side encryption is a defense-in-depth measure that
 * significantly improves upon plaintext or simple obfuscation.
 */

import { encrypt, decrypt, isCryptoAvailable } from './crypto';
import { logger } from './logger';

const STORAGE_KEY = 'skillengine_api_keys';
const LEGACY_STORAGE_KEY = 'skillengine_api_keys'; // Same key for migration
const ENCRYPTION_VERSION = 'v2'; // Version marker for encrypted format

interface StoredKeys {
  gemini?: string;
  claude?: string;
  chatgpt?: string;
  perplexity?: string;
  lastUpdated?: string;
  _version?: string; // Encryption version marker
}

export type StoredApiKeyProvider = 'gemini' | 'claude' | 'chatgpt' | 'perplexity';

// Legacy XOR key for migration from old format
const LEGACY_OBFUSCATION_KEY = 'sk1ll3ng1n3';

/**
 * Legacy deobfuscation for migrating old keys
 * @deprecated Only used for one-time migration
 */
function legacyDeobfuscate(encoded: string): string {
  try {
    const decoded = atob(encoded);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^
          LEGACY_OBFUSCATION_KEY.charCodeAt(i % LEGACY_OBFUSCATION_KEY.length)
      );
    }
    return result;
  } catch {
    return '';
  }
}

/**
 * Check if a stored value is in the legacy format
 */
function isLegacyFormat(stored: StoredKeys): boolean {
  return !stored._version || stored._version !== ENCRYPTION_VERSION;
}

/**
 * Migrate keys from legacy format to new encrypted format
 */
async function migrateLegacyKeys(): Promise<void> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const parsed: StoredKeys = JSON.parse(stored);
    if (!isLegacyFormat(parsed)) return; // Already migrated

    logger.info('Migrating API keys to encrypted format...');

    const providers: StoredApiKeyProvider[] = [
      'gemini',
      'claude',
      'chatgpt',
      'perplexity',
    ];
    const migrated: StoredKeys = {
      lastUpdated: new Date().toISOString(),
      _version: ENCRYPTION_VERSION,
    };

    for (const provider of providers) {
      const legacyKey = parsed[provider];
      if (legacyKey) {
        // Decrypt with legacy method
        const plainKey = legacyDeobfuscate(legacyKey);
        if (plainKey && plainKey.length > 0) {
          // Re-encrypt with new method
          migrated[provider] = await encrypt(plainKey);
        }
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    logger.info('API key migration complete');
  } catch (error) {
    logger.error('Failed to migrate legacy keys', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Initialize the storage module - call on app startup
 */
export async function initializeApiKeyStorage(): Promise<void> {
  if (!isCryptoAvailable()) {
    logger.warn('Web Crypto API not available - API key encryption will be limited');
    return;
  }

  await migrateLegacyKeys();
}

/**
 * Save an API key securely
 */
export async function saveApiKey(
  provider: StoredApiKeyProvider,
  key: string
): Promise<void> {
  try {
    if (!isCryptoAvailable()) {
      throw new Error('Secure storage not available');
    }

    const existing = await getStoredKeysInternal();
    const encryptedKey = await encrypt(key);

    const updated: StoredKeys = {
      ...existing,
      [provider]: encryptedKey,
      lastUpdated: new Date().toISOString(),
      _version: ENCRYPTION_VERSION,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    logger.error('Failed to save API key', { error: error instanceof Error ? error.message : String(error) });
    throw new Error('Failed to save API key securely');
  }
}

/**
 * Get stored keys object (internal use)
 */
async function getStoredKeysInternal(): Promise<StoredKeys> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error('Failed to parse stored keys', { error: error instanceof Error ? error.message : String(error) });
  }
  return { _version: ENCRYPTION_VERSION };
}

/**
 * Retrieve a decrypted API key
 */
export async function getApiKey(
  provider: StoredApiKeyProvider
): Promise<string> {
  try {
    const stored = await getStoredKeysInternal();
    const encryptedKey = stored[provider];

    if (!encryptedKey) {
      return '';
    }

    // Handle legacy format
    if (isLegacyFormat(stored)) {
      return legacyDeobfuscate(encryptedKey);
    }

    // Decrypt with new method
    return await decrypt(encryptedKey);
  } catch (error) {
    logger.error('Failed to retrieve API key', { error: error instanceof Error ? error.message : String(error) });
    return '';
  }
}

/**
 * Synchronous version for backward compatibility
 * NOTE: This returns empty string if crypto is async. Use getApiKey() instead.
 * @deprecated Use async getApiKey() instead
 */
export function getApiKeySync(
  provider: StoredApiKeyProvider
): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return '';

    const parsed: StoredKeys = JSON.parse(stored);
    const key = parsed[provider];
    if (!key) return '';

    // For sync access, only legacy format works
    if (isLegacyFormat(parsed)) {
      return legacyDeobfuscate(key);
    }

    // For new format, we can't decrypt synchronously
    // Return empty and log warning
    logger.warn('getApiKeySync called on encrypted keys - use async getApiKey() instead');
    return '';
  } catch {
    return '';
  }
}

/**
 * Get raw stored keys object (for UI display of which keys exist)
 */
export function getStoredKeys(): StoredKeys {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Return a safe version without actual encrypted values
      return {
        gemini: parsed.gemini ? '[encrypted]' : undefined,
        claude: parsed.claude ? '[encrypted]' : undefined,
        chatgpt: parsed.chatgpt ? '[encrypted]' : undefined,
        perplexity: parsed.perplexity ? '[encrypted]' : undefined,
        lastUpdated: parsed.lastUpdated,
        _version: parsed._version,
      };
    }
  } catch (error) {
    logger.error('Failed to parse stored keys', { error: error instanceof Error ? error.message : String(error) });
  }
  return {};
}

/**
 * Check if a key exists for a provider
 */
export function hasStoredKey(provider: StoredApiKeyProvider): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: StoredKeys = JSON.parse(stored);
      return !!parsed[provider];
    }
  } catch {
    // Ignore parse errors
  }
  return false;
}

/**
 * Clear a specific API key
 */
export async function clearApiKey(
  provider: StoredApiKeyProvider
): Promise<void> {
  try {
    const existing = await getStoredKeysInternal();
    delete existing[provider];
    existing.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    logger.error('Failed to clear API key', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Clear all stored API keys
 */
export function clearAllApiKeys(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logger.error('Failed to clear all API keys', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Get the timestamp of the last update
 */
export function getLastUpdated(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: StoredKeys = JSON.parse(stored);
      return parsed.lastUpdated || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Validate API key format (basic checks)
 */
export function isValidApiKeyFormat(
  provider: StoredApiKeyProvider,
  key: string
): { valid: boolean; error?: string } {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: 'API key cannot be empty' };
  }

  if (key.length < 10) {
    return { valid: false, error: 'API key appears too short' };
  }

  if (key.length > 500) {
    return { valid: false, error: 'API key appears too long' };
  }

  // Provider-specific format checks
  switch (provider) {
    case 'gemini':
      if (!key.startsWith('AIza')) {
        return {
          valid: false,
          error: 'Gemini API keys typically start with "AIza"',
        };
      }
      break;
    case 'claude':
      if (!key.startsWith('sk-ant-')) {
        return {
          valid: false,
          error: 'Anthropic API keys typically start with "sk-ant-"',
        };
      }
      break;
    case 'chatgpt':
      if (!key.startsWith('sk-')) {
        return {
          valid: false,
          error: 'OpenAI API keys typically start with "sk-"',
        };
      }
      break;
    case 'perplexity':
      if (!key.startsWith('pplx-')) {
        return {
          valid: false,
          error: 'Perplexity API keys typically start with "pplx-"',
        };
      }
      break;
  }

  return { valid: true };
}
