/**
 * Lazy Loading System for Skills
 *
 * Instead of loading all 100+ skill definitions at startup,
 * this module provides on-demand loading:
 *
 * 1. Skill metadata index (lightweight) - loaded once
 * 2. Full skill definitions - loaded only when needed
 * 3. Prompts - fetched from database (single source of truth)
 *
 * Benefits:
 * - Faster initial page load
 * - Lower memory usage (only used skills loaded)
 * - Scales to 1000+ skills without performance impact
 */

import type { LibrarySkill, SkillCategory, SkillLevel, SkillUseCase } from './types';
import { getSkillPrompt } from '../selfImprovement/supabaseGrading';
import { logger } from '../logger';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lightweight skill metadata for browsing/filtering
 * This is what we load upfront - no prompts, minimal data
 */
export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  useCases: SkillUseCase[];
  level: SkillLevel;
  source: 'builtin' | 'role-template' | 'community' | 'professional';
  estimatedTimeSaved?: string;
  iconName?: string;
  theme?: {
    primary: string;
    secondary: string;
    gradient: string;
  };
}

/**
 * Full skill definition with all details
 * Loaded on-demand when user selects a skill
 */
export interface FullSkillDefinition extends SkillMetadata {
  longDescription?: string;
  whatYouGet?: string[];
  inputs: Array<{
    id: string;
    label: string;
    type: string;
    placeholder?: string;
    options?: string[] | Array<{ label: string; value: string }>;
    required?: boolean;
    validation?: Record<string, unknown>;
    rows?: number;
  }>;
  config: {
    recommendedModel: 'gemini' | 'claude' | 'any';
    useWebSearch: boolean;
    maxTokens: number;
    temperature: number;
  };
}

/**
 * Skill with prompts from database
 */
export interface ExecutableSkill extends FullSkillDefinition {
  prompts: {
    systemInstruction: string;
    userPromptTemplate: string;
    version: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SKILL METADATA CACHE
// Loaded once, used for browsing and filtering
// ═══════════════════════════════════════════════════════════════════════════

let _metadataCache: Map<string, SkillMetadata> | null = null;
let _metadataLoadPromise: Promise<Map<string, SkillMetadata>> | null = null;

/**
 * Load all skill metadata (lightweight, for browsing)
 * This is cached and only loaded once
 */
export async function loadSkillMetadata(): Promise<Map<string, SkillMetadata>> {
  if (_metadataCache) {
    return _metadataCache;
  }

  // Prevent multiple concurrent loads
  if (_metadataLoadPromise) {
    return _metadataLoadPromise;
  }

  _metadataLoadPromise = (async () => {
    const metadata = new Map<string, SkillMetadata>();

    // Load metadata from each source in parallel
    const [staticMeta, roleTemplateMeta, professionalMeta] = await Promise.all([
      loadStaticSkillMetadata(),
      loadRoleTemplateSkillMetadata(),
      loadProfessionalSkillMetadata(),
    ]);

    // Combine all metadata
    for (const m of [...staticMeta, ...roleTemplateMeta, ...professionalMeta]) {
      metadata.set(m.id, m);
    }

    _metadataCache = metadata;
    logger.info(`Loaded metadata for ${metadata.size} skills`);

    return metadata;
  })();

  return _metadataLoadPromise;
}

/**
 * Get metadata for a single skill
 */
export async function getSkillMetadata(skillId: string): Promise<SkillMetadata | null> {
  const metadata = await loadSkillMetadata();
  return metadata.get(skillId) || null;
}

/**
 * Get all skill metadata as an array
 */
export async function getAllSkillMetadata(): Promise<SkillMetadata[]> {
  const metadata = await loadSkillMetadata();
  return Array.from(metadata.values());
}

// ═══════════════════════════════════════════════════════════════════════════
// FULL SKILL DEFINITION CACHE
// Loaded on-demand when user selects a skill
// ═══════════════════════════════════════════════════════════════════════════

const _fullDefinitionCache = new Map<string, FullSkillDefinition>();

/**
 * Load full skill definition (on-demand)
 */
export async function loadFullSkillDefinition(skillId: string): Promise<FullSkillDefinition | null> {
  // Check cache first
  if (_fullDefinitionCache.has(skillId)) {
    return _fullDefinitionCache.get(skillId)!;
  }

  // Determine source from metadata
  const metadata = await getSkillMetadata(skillId);
  if (!metadata) {
    logger.warn(`Skill ${skillId} not found in metadata`);
    return null;
  }

  try {
    let fullDef: FullSkillDefinition | null = null;

    switch (metadata.source) {
      case 'builtin':
        fullDef = await loadStaticSkillDefinition(skillId);
        break;
      case 'role-template':
        fullDef = await loadRoleTemplateSkillDefinition(skillId);
        break;
      case 'professional':
        fullDef = await loadProfessionalSkillDefinition(skillId);
        break;
      default:
        logger.warn(`Unknown skill source: ${metadata.source}`);
        return null;
    }

    if (fullDef) {
      _fullDefinitionCache.set(skillId, fullDef);
    }

    return fullDef;
  } catch (err) {
    logger.error(`Failed to load full definition for ${skillId}`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Load executable skill with prompts from database
 */
export async function loadExecutableSkill(skillId: string): Promise<ExecutableSkill | null> {
  const fullDef = await loadFullSkillDefinition(skillId);
  if (!fullDef) {
    return null;
  }

  // Get prompts from database (single source of truth)
  const prompts = await getSkillPrompt(skillId);
  if (!prompts) {
    logger.error(`Skill ${skillId} has no prompts in database. Run initializeSkillRegistry.ts first.`);
    return null;
  }

  return {
    ...fullDef,
    prompts: {
      systemInstruction: prompts.systemInstruction,
      userPromptTemplate: prompts.userPromptTemplate,
      version: prompts.version,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// METADATA EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function loadStaticSkillMetadata(): Promise<SkillMetadata[]> {
  try {
    const { SKILLS } = await import('../skills/static');
    return Object.entries(SKILLS).map(([id, skill]: [string, any]) => ({
      id,
      name: skill.name,
      description: skill.description,
      category: inferCategory(id, skill.name),
      useCases: inferUseCases(id, skill.description),
      level: 'intermediate' as SkillLevel,
      source: 'builtin' as const,
      estimatedTimeSaved: skill.estimatedTimeSaved,
      iconName: skill.icon?.name,
      theme: skill.theme,
    }));
  } catch (err) {
    logger.warn('Failed to load static skill metadata', { error: String(err) });
    return [];
  }
}

async function loadRoleTemplateSkillMetadata(): Promise<SkillMetadata[]> {
  try {
    const { ROLE_TEMPLATES } = await import('../roleTemplates');
    const metadata: SkillMetadata[] = [];

    for (const template of ROLE_TEMPLATES as any[]) {
      for (const skill of template.dynamicSkills || []) {
        const id = `${template.id}-${skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
        metadata.push({
          id,
          name: skill.name,
          description: skill.description,
          category: (skill.category as SkillCategory) || 'generation',
          useCases: inferUseCases(id, skill.description),
          level: 'intermediate',
          source: 'role-template',
          estimatedTimeSaved: skill.estimatedTimeSaved,
          iconName: skill.theme?.iconName,
          theme: skill.theme,
        });
      }
    }

    return metadata;
  } catch (err) {
    logger.warn('Failed to load role template skill metadata', { error: String(err) });
    return [];
  }
}

async function loadProfessionalSkillMetadata(): Promise<SkillMetadata[]> {
  try {
    const { ALL_PROFESSIONAL_SKILLS } = await import('../skills/professional');
    return (ALL_PROFESSIONAL_SKILLS as any[]).map((skill) => {
      const id = `professional-${skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      return {
        id,
        name: skill.name,
        description: skill.description,
        category: (skill.category as SkillCategory) || 'generation',
        useCases: inferUseCases(id, skill.description),
        level: 'intermediate' as SkillLevel,
        source: 'professional' as const,
        estimatedTimeSaved: skill.estimatedTimeSaved,
        iconName: skill.theme?.iconName,
        theme: skill.theme,
      };
    });
  } catch (err) {
    logger.warn('Failed to load professional skill metadata', { error: String(err) });
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FULL DEFINITION LOADERS
// ═══════════════════════════════════════════════════════════════════════════

async function loadStaticSkillDefinition(skillId: string): Promise<FullSkillDefinition | null> {
  const { SKILLS } = await import('../skills/static');
  const skill = SKILLS[skillId];
  if (!skill) return null;

  return {
    id: skillId,
    name: skill.name,
    description: skill.description,
    longDescription: skill.longDescription,
    whatYouGet: skill.whatYouGet,
    category: inferCategory(skillId, skill.name),
    useCases: inferUseCases(skillId, skill.description),
    level: 'intermediate',
    source: 'builtin',
    estimatedTimeSaved: skill.estimatedTimeSaved,
    iconName: skill.icon?.name,
    theme: skill.theme,
    inputs: skill.inputs || [],
    config: {
      recommendedModel: 'any',
      useWebSearch: skill.useGoogleSearch || false,
      maxTokens: 4096,
      temperature: 0.4,
    },
  };
}

async function loadRoleTemplateSkillDefinition(skillId: string): Promise<FullSkillDefinition | null> {
  const { ROLE_TEMPLATES } = await import('../roleTemplates');

  for (const template of ROLE_TEMPLATES as any[]) {
    for (const skill of template.dynamicSkills || []) {
      const id = `${template.id}-${skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      if (id === skillId) {
        return {
          id,
          name: skill.name,
          description: skill.description,
          longDescription: skill.longDescription,
          category: skill.category || 'generation',
          useCases: inferUseCases(id, skill.description),
          level: 'intermediate',
          source: 'role-template',
          estimatedTimeSaved: skill.estimatedTimeSaved,
          iconName: skill.theme?.iconName,
          theme: skill.theme,
          inputs: skill.inputs || [],
          config: {
            recommendedModel: skill.config?.recommendedModel || 'any',
            useWebSearch: skill.config?.useWebSearch || false,
            maxTokens: skill.config?.maxTokens || 4096,
            temperature: skill.config?.temperature || 0.4,
          },
        };
      }
    }
  }

  return null;
}

async function loadProfessionalSkillDefinition(skillId: string): Promise<FullSkillDefinition | null> {
  const { ALL_PROFESSIONAL_SKILLS } = await import('../skills/professional');

  for (const skill of ALL_PROFESSIONAL_SKILLS as any[]) {
    const id = `professional-${skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    if (id === skillId) {
      return {
        id,
        name: skill.name,
        description: skill.description,
        longDescription: skill.longDescription,
        category: skill.category || 'generation',
        useCases: inferUseCases(id, skill.description),
        level: 'intermediate',
        source: 'professional',
        estimatedTimeSaved: skill.estimatedTimeSaved,
        iconName: skill.theme?.iconName,
        theme: skill.theme,
        inputs: skill.inputs || [],
        config: {
          recommendedModel: 'any',
          useWebSearch: false,
          maxTokens: 4096,
          temperature: 0.4,
        },
      };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function inferCategory(id: string, name: string): SkillCategory {
  const text = `${id} ${name}`.toLowerCase();

  if (text.includes('analyz') || text.includes('score') || text.includes('assess')) return 'analysis';
  if (text.includes('research') || text.includes('compan')) return 'research';
  if (text.includes('optim') || text.includes('ats')) return 'optimization';
  if (text.includes('automat')) return 'automation';
  if (text.includes('communicat') || text.includes('email') || text.includes('message')) return 'communication';

  return 'generation';
}

function inferUseCases(id: string, description: string): SkillUseCase[] {
  const text = `${id} ${description}`.toLowerCase();
  const useCases: SkillUseCase[] = [];

  if (text.includes('job') || text.includes('resume') || text.includes('career')) useCases.push('job-search');
  if (text.includes('interview')) useCases.push('interview-prep');
  if (text.includes('network') || text.includes('linkedin')) useCases.push('networking');
  if (text.includes('onboard')) useCases.push('onboarding');
  if (text.includes('growth') || text.includes('develop')) useCases.push('career-growth');

  return useCases.length > 0 ? useCases : ['daily-work'];
}

// ═══════════════════════════════════════════════════════════════════════════
// CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clear all caches (useful for testing or when skills are updated)
 */
export function clearSkillCaches(): void {
  _metadataCache = null;
  _metadataLoadPromise = null;
  _fullDefinitionCache.clear();
  logger.info('Skill caches cleared');
}

/**
 * Preload metadata (call on app startup for faster browsing)
 */
export function preloadSkillMetadata(): void {
  loadSkillMetadata().catch((err) => {
    logger.warn('Failed to preload skill metadata', { error: String(err) });
  });
}
