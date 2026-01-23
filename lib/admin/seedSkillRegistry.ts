/**
 * Seed Skill Registry from Browser
 *
 * This function seeds all skill prompts from the code into the database.
 * It can be triggered from the Admin page UI.
 *
 * The database is the SINGLE SOURCE OF TRUTH for all prompts.
 */

import { supabase } from '../supabase';
import { SKILLS } from '../skills/static';
import { ROLE_TEMPLATES } from '../roleTemplates';
import { ALL_PROFESSIONAL_SKILLS } from '../skills/professional';
import { logger } from '../logger';

interface SkillRegistryEntry {
  id: string;
  name: string;
  skill_type: 'built-in' | 'dynamic' | 'community' | 'library';
  current_system_instruction: string;
  current_user_prompt_template: string;
  current_version: number;
  min_grades_for_improvement: number;
  improvement_threshold: number;
}

interface SeedResult {
  success: boolean;
  totalExtracted: number;
  totalUpserted: number;
  totalSkipped: number;
  totalErrors: number;
  details: {
    static: { extracted: number; errors: number };
    roleTemplate: { extracted: number; errors: number };
    professional: { extracted: number; errors: number };
  };
  errorMessages: string[];
}

/**
 * Extract prompts from built-in static skills
 */
function extractStaticSkills(): { entries: SkillRegistryEntry[]; errors: string[] } {
  const entries: SkillRegistryEntry[] = [];
  const errors: string[] = [];

  for (const [skillId, skill] of Object.entries(SKILLS)) {
    try {
      // Generate dummy inputs to extract the prompt templates
      const dummyInputs: Record<string, string> = {};
      if (skill.inputs && Array.isArray(skill.inputs)) {
        for (const input of skill.inputs) {
          dummyInputs[input.id] = `{{${input.id}}}`;
        }
      }

      const prompt = skill.generatePrompt(dummyInputs);

      if (!prompt.systemInstruction) {
        errors.push(`${skillId}: Missing systemInstruction`);
        continue;
      }

      entries.push({
        id: skillId,
        name: skill.name,
        skill_type: 'built-in',
        current_system_instruction: prompt.systemInstruction,
        current_user_prompt_template: prompt.userPrompt || '',
        current_version: 1,
        min_grades_for_improvement: 50,
        improvement_threshold: 3.5,
      });
    } catch (err) {
      errors.push(`${skillId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { entries, errors };
}

/**
 * Extract prompts from role template dynamic skills
 */
function extractRoleTemplateSkills(): { entries: SkillRegistryEntry[]; errors: string[] } {
  const entries: SkillRegistryEntry[] = [];
  const errors: string[] = [];

  for (const template of ROLE_TEMPLATES) {
    for (const dynamicSkill of template.dynamicSkills || []) {
      const skillId = `${template.id}-${dynamicSkill.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`;

      try {
        if (!dynamicSkill.prompts?.systemInstruction) {
          errors.push(`${skillId}: Missing systemInstruction`);
          continue;
        }

        entries.push({
          id: skillId,
          name: dynamicSkill.name,
          skill_type: 'library',
          current_system_instruction: dynamicSkill.prompts.systemInstruction,
          current_user_prompt_template: dynamicSkill.prompts.userPromptTemplate || '',
          current_version: 1,
          min_grades_for_improvement: 50,
          improvement_threshold: 3.5,
        });
      } catch (err) {
        errors.push(`${skillId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return { entries, errors };
}

/**
 * Extract prompts from professional skills
 */
function extractProfessionalSkills(): { entries: SkillRegistryEntry[]; errors: string[] } {
  const entries: SkillRegistryEntry[] = [];
  const errors: string[] = [];

  for (const skill of ALL_PROFESSIONAL_SKILLS) {
    const skillId = `professional-${skill.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`;

    try {
      if (!skill.prompts?.systemInstruction) {
        errors.push(`${skillId}: Missing systemInstruction`);
        continue;
      }

      entries.push({
        id: skillId,
        name: skill.name,
        skill_type: 'library',
        current_system_instruction: skill.prompts.systemInstruction,
        current_user_prompt_template: skill.prompts.userPromptTemplate || '',
        current_version: 1,
        min_grades_for_improvement: 50,
        improvement_threshold: 3.5,
      });
    } catch (err) {
      errors.push(`${skillId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { entries, errors };
}

/**
 * Get IDs of skills that have been improved (version > 1)
 * These should NOT be overwritten
 */
async function getImprovedSkillIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('skill_registry')
    .select('id')
    .gt('current_version', 1);

  if (error) {
    logger.warn('Could not check for improved skills:', error.message);
    return new Set();
  }

  return new Set((data || []).map((row) => row.id));
}

/**
 * Seed all skill prompts to the database
 *
 * @param force - If true, overwrite improved prompts too
 * @returns Result object with counts and errors
 */
export async function seedSkillRegistry(force: boolean = false): Promise<SeedResult> {
  const errorMessages: string[] = [];

  // Extract from all sources
  const staticResult = extractStaticSkills();
  const roleTemplateResult = extractRoleTemplateSkills();
  const professionalResult = extractProfessionalSkills();

  // Combine all entries
  const allEntries = [
    ...staticResult.entries,
    ...roleTemplateResult.entries,
    ...professionalResult.entries,
  ];

  const totalExtracted = allEntries.length;
  const totalExtractionErrors =
    staticResult.errors.length +
    roleTemplateResult.errors.length +
    professionalResult.errors.length;

  errorMessages.push(...staticResult.errors);
  errorMessages.push(...roleTemplateResult.errors);
  errorMessages.push(...professionalResult.errors);

  if (allEntries.length === 0) {
    return {
      success: false,
      totalExtracted: 0,
      totalUpserted: 0,
      totalSkipped: 0,
      totalErrors: totalExtractionErrors,
      details: {
        static: { extracted: 0, errors: staticResult.errors.length },
        roleTemplate: { extracted: 0, errors: roleTemplateResult.errors.length },
        professional: { extracted: 0, errors: professionalResult.errors.length },
      },
      errorMessages,
    };
  }

  // Get improved skills to protect (unless force)
  const improvedSkillIds = force ? new Set<string>() : await getImprovedSkillIds();

  // Filter out improved skills
  let skipped = 0;
  const entriesToUpsert = allEntries.filter((entry) => {
    if (improvedSkillIds.has(entry.id)) {
      skipped++;
      return false;
    }
    return true;
  });

  // Batch upsert
  let upserted = 0;
  let upsertErrors = 0;
  const chunkSize = 50;

  for (let i = 0; i < entriesToUpsert.length; i += chunkSize) {
    const chunk = entriesToUpsert.slice(i, i + chunkSize);

    const { error } = await supabase.from('skill_registry').upsert(chunk, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });

    if (error) {
      logger.error('Chunk upsert failed:', error.message);
      errorMessages.push(`Chunk ${Math.floor(i / chunkSize) + 1} failed: ${error.message}`);
      upsertErrors += chunk.length;
    } else {
      upserted += chunk.length;
    }
  }

  return {
    success: upsertErrors === 0 && upserted > 0,
    totalExtracted,
    totalUpserted: upserted,
    totalSkipped: skipped,
    totalErrors: totalExtractionErrors + upsertErrors,
    details: {
      static: { extracted: staticResult.entries.length, errors: staticResult.errors.length },
      roleTemplate: { extracted: roleTemplateResult.entries.length, errors: roleTemplateResult.errors.length },
      professional: { extracted: professionalResult.entries.length, errors: professionalResult.errors.length },
    },
    errorMessages,
  };
}

/**
 * Check how many skills are currently in the registry
 */
export async function getSkillRegistryStats(): Promise<{
  totalSkills: number;
  improvedSkills: number;
  byType: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from('skill_registry')
    .select('id, skill_type, current_version');

  if (error || !data) {
    return { totalSkills: 0, improvedSkills: 0, byType: {} };
  }

  const byType: Record<string, number> = {};
  let improvedSkills = 0;

  for (const skill of data) {
    byType[skill.skill_type] = (byType[skill.skill_type] || 0) + 1;
    if (skill.current_version > 1) {
      improvedSkills++;
    }
  }

  return {
    totalSkills: data.length,
    improvedSkills,
    byType,
  };
}
