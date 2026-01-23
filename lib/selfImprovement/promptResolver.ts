/**
 * Prompt Resolver
 *
 * Resolves skill prompts from the database registry.
 * The database is the SINGLE SOURCE OF TRUTH for all skill prompts.
 *
 * All skills must be registered in skill_registry before they can be used.
 * There are no code-defined fallbacks - this ensures:
 * 1. All prompts are version controlled in the database
 * 2. Prompt improvements are immediately available
 * 3. No drift between code and database versions
 */

import { getSkillPrompt, skillExistsInRegistry } from './supabaseGrading';
import { logger } from '../logger';

export interface ResolvedPrompt {
  systemInstruction: string;
  userPrompt: string;
  version: number;
  source: 'registry';
}

/**
 * Get the prompt for a skill from the database registry
 *
 * @param skillId - The skill identifier
 * @param interpolatedUserPrompt - If provided, use this as the user prompt (already interpolated with user inputs)
 * @throws Error if skill is not found in registry
 */
export async function getEffectivePrompt(
  skillId: string,
  _fallbackPrompt?: {
    systemInstruction: string;
    userPrompt: string;
  },
  interpolatedUserPrompt?: string
): Promise<ResolvedPrompt> {
  // Get prompt from database (the single source of truth)
  const registryPrompt = await getSkillPrompt(skillId);

  if (!registryPrompt) {
    logger.error(`Skill ${skillId} not found in registry. All skills must be registered in the database.`);
    throw new Error(`Skill "${skillId}" is not registered. Please ensure the skill is seeded in the skill_registry table.`);
  }

  return {
    systemInstruction: registryPrompt.systemInstruction,
    // For user prompt: use the interpolated version if provided,
    // otherwise use the template from registry (caller needs to interpolate)
    userPrompt: interpolatedUserPrompt || registryPrompt.userPromptTemplate,
    version: registryPrompt.version,
    source: 'registry',
  };
}

/**
 * Get the prompt for a skill, returning null if not found (non-throwing version)
 *
 * @param skillId - The skill identifier
 * @param interpolatedUserPrompt - If provided, use this as the user prompt
 */
export async function getEffectivePromptSafe(
  skillId: string,
  interpolatedUserPrompt?: string
): Promise<ResolvedPrompt | null> {
  const registryPrompt = await getSkillPrompt(skillId);

  if (!registryPrompt) {
    return null;
  }

  return {
    systemInstruction: registryPrompt.systemInstruction,
    userPrompt: interpolatedUserPrompt || registryPrompt.userPromptTemplate,
    version: registryPrompt.version,
    source: 'registry',
  };
}

/**
 * Check if a skill has been improved (version > 1)
 */
export async function hasImprovedPrompt(skillId: string): Promise<boolean> {
  const prompt = await getSkillPrompt(skillId);
  return prompt !== null && prompt.version > 1;
}

/**
 * Get prompt version for a skill
 * Returns 0 if skill not found (indicates unregistered skill)
 */
export async function getPromptVersion(skillId: string): Promise<number> {
  const prompt = await getSkillPrompt(skillId);
  return prompt?.version ?? 0;
}

/**
 * Check if a skill is registered in the database
 */
export async function isSkillRegistered(skillId: string): Promise<boolean> {
  return skillExistsInRegistry(skillId);
}

/**
 * Interpolate a template with values
 * Replaces {{key}} placeholders with corresponding values
 */
export function interpolateTemplate(
  template: string,
  values: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = values[key];
    if (value === undefined || value === null) {
      return match; // Keep placeholder if value not found
    }
    return String(value);
  });
}

/**
 * Create a prompt generator that fetches from the database registry
 *
 * @param skillId - The skill identifier
 * @param inputInterpolator - Function to interpolate user inputs into the user prompt template
 */
export function createRegistryPromptGenerator(
  skillId: string,
  inputInterpolator?: (template: string, inputs: Record<string, unknown>) => string
): (inputs: Record<string, unknown>) => Promise<ResolvedPrompt> {
  return async (inputs: Record<string, unknown>) => {
    const registryPrompt = await getSkillPrompt(skillId);

    if (!registryPrompt) {
      throw new Error(`Skill "${skillId}" is not registered in the database.`);
    }

    // Interpolate user inputs into the template if an interpolator is provided
    const userPrompt = inputInterpolator
      ? inputInterpolator(registryPrompt.userPromptTemplate, inputs)
      : interpolateTemplate(registryPrompt.userPromptTemplate, inputs);

    return {
      systemInstruction: registryPrompt.systemInstruction,
      userPrompt,
      version: registryPrompt.version,
      source: 'registry',
    };
  };
}

/**
 * @deprecated Use createRegistryPromptGenerator instead
 * Kept for backwards compatibility during migration
 */
export function createRegistryAwarePromptGenerator(
  skillId: string,
  codeDefinedGenerator: (inputs: Record<string, unknown>) => {
    systemInstruction: string;
    userPrompt: string;
  }
): (inputs: Record<string, unknown>) => Promise<ResolvedPrompt> {
  return async (inputs: Record<string, unknown>) => {
    // Generate the user prompt using the code-defined generator for interpolation
    const codePrompt = codeDefinedGenerator(inputs);

    // Get system instruction from registry, but use code-generated user prompt
    // This maintains backwards compatibility during migration
    return getEffectivePrompt(skillId, undefined, codePrompt.userPrompt);
  };
}
