/**
 * Prompt Cache Layer
 *
 * Provides in-memory caching for skill prompts to reduce database queries.
 * Uses a simple TTL-based cache with automatic expiration.
 *
 * Benefits:
 * - Reduces Supabase query load for frequently accessed skills
 * - Improves response times for skill execution
 * - Automatically invalidates on prompt improvements
 */

import { SkillPrompt } from './supabaseGrading';
import { logger } from '../logger';

// ═══════════════════════════════════════════════════════════════════════════
// CACHE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

interface CacheEntry {
  prompt: SkillPrompt | null;
  timestamp: number;
}

interface CacheConfig {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttlMs: number;
  /** Maximum number of entries to cache (default: 500) */
  maxEntries: number;
  /** Enable debug logging */
  debug: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  ttlMs: 5 * 60 * 1000, // 5 minutes
  maxEntries: 500,
  debug: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// CACHE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

class PromptCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private hits = 0;
  private misses = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get a cached prompt if it exists and hasn't expired
   */
  get(skillId: string): SkillPrompt | null | undefined {
    const entry = this.cache.get(skillId);

    if (!entry) {
      this.misses++;
      if (this.config.debug) {
        logger.debug(`[PromptCache] MISS: ${skillId}`);
      }
      return undefined; // Not in cache
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.config.ttlMs) {
      this.cache.delete(skillId);
      this.misses++;
      if (this.config.debug) {
        logger.debug(`[PromptCache] EXPIRED: ${skillId} (age: ${age}ms)`);
      }
      return undefined;
    }

    this.hits++;
    if (this.config.debug) {
      logger.debug(`[PromptCache] HIT: ${skillId} (age: ${age}ms)`);
    }
    return entry.prompt;
  }

  /**
   * Store a prompt in the cache
   */
  set(skillId: string, prompt: SkillPrompt | null): void {
    // Enforce max entries with LRU-like behavior
    if (this.cache.size >= this.config.maxEntries) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        if (this.config.debug) {
          logger.debug(`[PromptCache] EVICTED: ${oldestKey} (max entries reached)`);
        }
      }
    }

    this.cache.set(skillId, {
      prompt,
      timestamp: Date.now(),
    });

    if (this.config.debug) {
      logger.debug(`[PromptCache] SET: ${skillId}`);
    }
  }

  /**
   * Invalidate a specific skill's cached prompt
   * Call this when a prompt is improved/updated
   */
  invalidate(skillId: string): void {
    const deleted = this.cache.delete(skillId);
    if (this.config.debug && deleted) {
      logger.debug(`[PromptCache] INVALIDATED: ${skillId}`);
    }
  }

  /**
   * Invalidate all cached prompts
   * Call this on deployment or major changes
   */
  invalidateAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    if (this.config.debug) {
      logger.debug(`[PromptCache] INVALIDATED ALL: ${size} entries cleared`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    maxEntries: number;
    ttlMs: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      maxEntries: this.config.maxEntries,
      ttlMs: this.config.ttlMs,
    };
  }

  /**
   * Reset cache statistics (for monitoring periods)
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Update cache configuration at runtime
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.config.debug) {
      logger.debug('[PromptCache] Config updated', this.config);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

// Global cache instance
const promptCache = new PromptCache({
  ttlMs: 5 * 60 * 1000, // 5 minutes
  maxEntries: 500,
  debug: process.env.NODE_ENV === 'development',
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { promptCache, PromptCache };
export type { CacheConfig };
