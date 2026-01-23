/**
 * Database-First Skill Loader
 *
 * This module loads ALL skill data from the database (single source of truth).
 * It replaces the TypeScript-based skill loading with a simpler, unified approach.
 *
 * Benefits:
 * - Single source of truth (database)
 * - No code/DB sync issues
 * - Skills can be managed via Admin UI
 * - Simplified architecture
 *
 * How it works:
 * 1. Skill metadata loaded from skill_library view (public, lightweight)
 * 2. Full skill definition loaded from skill_registry (on-demand)
 * 3. Results cached for performance
 */

import { supabase } from '../supabase';
import { logger } from '../logger';
import type { SkillCategory, SkillLevel, SkillUseCase, SkillSource } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (DB Schema)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Skill metadata for browsing (lightweight, loaded upfront)
 * Matches the skill_library view
 */
export interface DbSkillMetadata {
  id: string;
  name: string;
  description: string | null;
  long_description: string | null;
  what_you_get: string[] | null;
  estimated_time_saved: string | null;

  // Categorization
  category: SkillCategory | null;
  use_cases: string[] | null;
  level: SkillLevel | null;
  roles: string[] | null;
  custom_tags: string[] | null;

  // Visual
  theme: {
    primary: string;
    secondary: string;
    gradient: string;
  } | null;
  icon_name: string | null;

  // Source
  skill_type: 'built-in' | 'dynamic' | 'community' | 'library';
  source: SkillSource | null;
  source_role_id: string | null;

  // Execution (without prompts)
  inputs: Array<{
    id: string;
    label: string;
    type: string;
    placeholder?: string;
    options?: string[];
    defaultValue?: string | boolean | number;
    validation?: { required?: boolean; minLength?: number; maxLength?: number };
  }> | null;
  output_format: 'markdown' | 'json' | 'table' | null;
  recommended_model: 'gemini' | 'claude' | 'any' | null;
  use_web_search: boolean | null;

  // Metrics
  use_count: number | null;
  total_grades: number | null;
  avg_overall_score: number | null;

  // Timestamps
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Full skill with prompts (for execution)
 */
export interface DbExecutableSkill extends DbSkillMetadata {
  current_system_instruction: string;
  current_user_prompt_template: string;
  current_version: number;
  max_tokens: number | null;
  temperature: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CACHING
// ═══════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const METADATA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const SKILL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

let _metadataCache: CacheEntry<Map<string, DbSkillMetadata>> | null = null;
let _metadataLoadPromise: Promise<Map<string, DbSkillMetadata>> | null = null;
const _skillCache = new Map<string, CacheEntry<DbExecutableSkill>>();

function isCacheValid<T>(cache: CacheEntry<T> | null, ttl: number): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < ttl;
}

// ═══════════════════════════════════════════════════════════════════════════
// METADATA LOADING (for browsing/filtering)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load all skill metadata from the database
 * This is lightweight and used for skill browsing/filtering
 */
export async function loadAllSkillMetadata(): Promise<Map<string, DbSkillMetadata>> {
  // Return cached if valid
  if (isCacheValid(_metadataCache, METADATA_CACHE_TTL)) {
    return _metadataCache!.data;
  }

  // Prevent concurrent loads
  if (_metadataLoadPromise) {
    return _metadataLoadPromise;
  }

  _metadataLoadPromise = (async () => {
    try {
      // Use the skill_library view (excludes prompts for public access)
      const { data, error } = await supabase
        .from('skill_library')
        .select('*')
        .order('use_count', { ascending: false });

      if (error) {
        logger.error('Failed to load skill metadata from database', { error: error.message });
        // Return cached data if available, even if stale
        if (_metadataCache) {
          return _metadataCache.data;
        }
        throw error;
      }

      const metadata = new Map<string, DbSkillMetadata>();
      for (const skill of data || []) {
        metadata.set(skill.id, skill as DbSkillMetadata);
      }

      _metadataCache = { data: metadata, timestamp: Date.now() };
      logger.info(`Loaded ${metadata.size} skills from database`);

      return metadata;
    } finally {
      _metadataLoadPromise = null;
    }
  })();

  return _metadataLoadPromise;
}

/**
 * Get metadata for a single skill
 */
export async function getSkillMetadata(skillId: string): Promise<DbSkillMetadata | null> {
  const metadata = await loadAllSkillMetadata();
  return metadata.get(skillId) || null;
}

/**
 * Get all skill metadata as an array
 */
export async function getAllSkillMetadataArray(): Promise<DbSkillMetadata[]> {
  const metadata = await loadAllSkillMetadata();
  return Array.from(metadata.values());
}

// ═══════════════════════════════════════════════════════════════════════════
// FULL SKILL LOADING (for execution)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load a single skill with prompts (for execution)
 */
export async function loadExecutableSkill(skillId: string): Promise<DbExecutableSkill | null> {
  // Check cache
  const cached = _skillCache.get(skillId);
  if (cached && isCacheValid(cached, SKILL_CACHE_TTL)) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .from('skill_registry')
      .select('*')
      .eq('id', skillId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        logger.warn(`Skill not found: ${skillId}`);
        return null;
      }
      logger.error(`Failed to load skill ${skillId}`, { error: error.message });
      throw error;
    }

    const skill = data as DbExecutableSkill;

    // Cache the result
    _skillCache.set(skillId, { data: skill, timestamp: Date.now() });

    return skill;
  } catch (err) {
    logger.error(`Error loading skill ${skillId}`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Load multiple skills at once (batch loading)
 */
export async function loadExecutableSkills(skillIds: string[]): Promise<Map<string, DbExecutableSkill>> {
  const result = new Map<string, DbExecutableSkill>();

  // Check which skills need to be loaded
  const idsToLoad: string[] = [];
  for (const id of skillIds) {
    const cached = _skillCache.get(id);
    if (cached && isCacheValid(cached, SKILL_CACHE_TTL)) {
      result.set(id, cached.data);
    } else {
      idsToLoad.push(id);
    }
  }

  if (idsToLoad.length === 0) {
    return result;
  }

  try {
    const { data, error } = await supabase
      .from('skill_registry')
      .select('*')
      .in('id', idsToLoad);

    if (error) {
      logger.error('Failed to batch load skills', { error: error.message });
      throw error;
    }

    for (const skill of data || []) {
      const executableSkill = skill as DbExecutableSkill;
      result.set(skill.id, executableSkill);
      _skillCache.set(skill.id, { data: executableSkill, timestamp: Date.now() });
    }
  } catch (err) {
    logger.error('Error batch loading skills', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTERED QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export interface SkillFilters {
  category?: SkillCategory;
  level?: SkillLevel;
  source?: SkillSource;
  roles?: string[];
  useCases?: string[];
  search?: string;
}

/**
 * Filter skills by criteria (in-memory, uses cached metadata)
 */
export async function filterSkills(filters: SkillFilters): Promise<DbSkillMetadata[]> {
  const allSkills = await getAllSkillMetadataArray();

  return allSkills.filter((skill) => {
    // Category filter
    if (filters.category && skill.category !== filters.category) {
      return false;
    }

    // Level filter
    if (filters.level && skill.level !== filters.level) {
      return false;
    }

    // Source filter
    if (filters.source && skill.source !== filters.source) {
      return false;
    }

    // Roles filter (any match)
    if (filters.roles && filters.roles.length > 0) {
      const skillRoles = skill.roles || [];
      if (!filters.roles.some((r) => skillRoles.includes(r))) {
        return false;
      }
    }

    // Use cases filter (any match)
    if (filters.useCases && filters.useCases.length > 0) {
      const skillUseCases = skill.use_cases || [];
      if (!filters.useCases.some((uc) => skillUseCases.includes(uc))) {
        return false;
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const nameMatch = skill.name.toLowerCase().includes(searchLower);
      const descMatch = skill.description?.toLowerCase().includes(searchLower);
      if (!nameMatch && !descMatch) {
        return false;
      }
    }

    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE TRACKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Increment skill usage count (fire and forget)
 */
export function trackSkillUsage(skillId: string): void {
  supabase.rpc('increment_skill_use_count', { p_skill_id: skillId }).then(({ error }) => {
    if (error) {
      logger.warn(`Failed to increment usage for ${skillId}`, { error: error.message });
    }
  });

  // Also update local cache if present
  const cached = _skillCache.get(skillId);
  if (cached) {
    cached.data.use_count = (cached.data.use_count || 0) + 1;
  }

  // Update metadata cache too
  if (_metadataCache) {
    const metadata = _metadataCache.data.get(skillId);
    if (metadata) {
      metadata.use_count = (metadata.use_count || 0) + 1;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clear all caches (useful when skills are updated)
 */
export function clearAllCaches(): void {
  _metadataCache = null;
  _metadataLoadPromise = null;
  _skillCache.clear();
  logger.info('DB skill caches cleared');
}

/**
 * Clear cache for a specific skill
 */
export function clearSkillCache(skillId: string): void {
  _skillCache.delete(skillId);

  // Also clear from metadata cache
  if (_metadataCache) {
    _metadataCache.data.delete(skillId);
  }
}

/**
 * Preload skill metadata (call on app startup)
 */
export function preloadSkillMetadata(): void {
  loadAllSkillMetadata().catch((err) => {
    logger.warn('Failed to preload skill metadata', {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSION HELPERS
// (For backward compatibility with existing code that expects LibrarySkill format)
// ═══════════════════════════════════════════════════════════════════════════

import type { LibrarySkill, SkillTags } from './types';

/**
 * Convert DbSkillMetadata to LibrarySkill format
 * For backward compatibility with existing components
 */
export function toLibrarySkill(dbSkill: DbSkillMetadata): LibrarySkill {
  const tags: SkillTags = {
    roles: dbSkill.roles || [],
    category: dbSkill.category || 'generation',
    useCases: (dbSkill.use_cases || ['daily-work']) as SkillUseCase[],
    level: dbSkill.level || 'intermediate',
    custom: dbSkill.custom_tags || [],
  };

  return {
    id: dbSkill.id,
    name: dbSkill.name,
    description: dbSkill.description || '',
    longDescription: dbSkill.long_description || undefined,
    whatYouGet: dbSkill.what_you_get || undefined,
    estimatedTimeSaved: dbSkill.estimated_time_saved || undefined,

    tags,
    source: (dbSkill.source || 'builtin') as 'builtin' | 'role-template' | 'community',
    sourceRoleId: dbSkill.source_role_id || undefined,

    theme: dbSkill.theme || {
      primary: 'text-blue-400',
      secondary: 'bg-blue-900/20',
      gradient: 'from-blue-500/20 to-transparent',
      iconName: dbSkill.icon_name || 'Sparkles',
    },

    inputs: (dbSkill.inputs || []).map((input) => ({
      id: input.id,
      label: input.label,
      type: input.type as 'text' | 'textarea' | 'select' | 'checkbox' | 'number',
      placeholder: input.placeholder,
      options: input.options,
      defaultValue: input.defaultValue,
      validation: input.validation,
    })),

    prompts: {
      systemInstruction: '', // Not loaded in metadata
      userPromptTemplate: '',
      outputFormat: dbSkill.output_format || 'markdown',
    },

    config: {
      recommendedModel: dbSkill.recommended_model || 'any',
      useWebSearch: dbSkill.use_web_search || false,
      maxTokens: 4096,
      temperature: 0.7,
    },

    useCount: dbSkill.use_count || 0,
    rating: {
      sum: (dbSkill.avg_overall_score || 0) * (dbSkill.total_grades || 0),
      count: dbSkill.total_grades || 0,
    },

    createdAt: dbSkill.created_at || undefined,
  };
}

/**
 * Convert DbExecutableSkill to LibrarySkill with prompts
 */
export function toExecutableLibrarySkill(dbSkill: DbExecutableSkill): LibrarySkill {
  const librarySkill = toLibrarySkill(dbSkill);

  // Add prompts
  librarySkill.prompts = {
    systemInstruction: dbSkill.current_system_instruction,
    userPromptTemplate: dbSkill.current_user_prompt_template,
    outputFormat: dbSkill.output_format || 'markdown',
  };

  // Add full config
  librarySkill.config = {
    recommendedModel: dbSkill.recommended_model || 'any',
    useWebSearch: dbSkill.use_web_search || false,
    maxTokens: dbSkill.max_tokens || 4096,
    temperature: dbSkill.temperature || 0.7,
  };

  return librarySkill;
}
