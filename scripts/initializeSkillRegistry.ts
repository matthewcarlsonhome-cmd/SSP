#!/usr/bin/env npx ts-node
/**
 * Initialize Skill Registry
 *
 * Seeds the skill_registry table with ALL skill prompts from the codebase.
 * The database is the SINGLE SOURCE OF TRUTH for all prompts.
 *
 * This script:
 * 1. Extracts prompts from built-in static skills (73 skills)
 * 2. Extracts prompts from role templates (dynamic skills)
 * 3. Extracts prompts from professional skills (41 skills)
 * 4. Upserts all to skill_registry (preserving improved versions)
 *
 * Usage:
 *   npx ts-node scripts/initializeSkillRegistry.ts
 *   npx ts-node scripts/initializeSkillRegistry.ts --dry-run
 *   npx ts-node scripts/initializeSkillRegistry.ts --force  # Overwrite all, including improved
 *
 * Environment variables:
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

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

interface ExtractionResult {
  entries: SkillRegistryEntry[];
  successCount: number;
  errorCount: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract prompts from built-in static skills (SKILLS object)
 */
async function extractStaticSkills(): Promise<ExtractionResult> {
  const entries: SkillRegistryEntry[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  console.log('📦 Extracting built-in static skills...\n');

  try {
    const { SKILLS } = await import('../lib/skills/static');

    for (const [skillId, skill] of Object.entries(SKILLS) as [string, any][]) {
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
          throw new Error('Missing systemInstruction');
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

        console.log(`  ✓ ${skillId}`);
        successCount++;
      } catch (err) {
        const msg = `  ✗ ${skillId}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(msg);
        errors.push(msg);
        errorCount++;
      }
    }
  } catch (err) {
    const msg = `Failed to import SKILLS: ${err instanceof Error ? err.message : String(err)}`;
    console.error(msg);
    errors.push(msg);
  }

  console.log(`\n  Static skills: ${successCount} extracted, ${errorCount} errors\n`);
  return { entries, successCount, errorCount, errors };
}

/**
 * Extract prompts from role template dynamic skills
 */
async function extractRoleTemplateSkills(): Promise<ExtractionResult> {
  const entries: SkillRegistryEntry[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  console.log('📦 Extracting role template skills...\n');

  try {
    const { ROLE_TEMPLATES } = await import('../lib/roleTemplates');

    for (const template of ROLE_TEMPLATES as any[]) {
      for (const dynamicSkill of template.dynamicSkills || []) {
        const skillId = `${template.id}-${dynamicSkill.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}`;

        try {
          if (!dynamicSkill.prompts?.systemInstruction) {
            throw new Error('Missing systemInstruction in prompts object');
          }

          entries.push({
            id: skillId,
            name: `${dynamicSkill.name}`,
            skill_type: 'library',
            current_system_instruction: dynamicSkill.prompts.systemInstruction,
            current_user_prompt_template: dynamicSkill.prompts.userPromptTemplate || '',
            current_version: 1,
            min_grades_for_improvement: 50,
            improvement_threshold: 3.5,
          });

          console.log(`  ✓ ${skillId}`);
          successCount++;
        } catch (err) {
          const msg = `  ✗ ${skillId}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(msg);
          errors.push(msg);
          errorCount++;
        }
      }
    }
  } catch (err) {
    const msg = `Failed to import ROLE_TEMPLATES: ${err instanceof Error ? err.message : String(err)}`;
    console.error(msg);
    errors.push(msg);
  }

  console.log(`\n  Role template skills: ${successCount} extracted, ${errorCount} errors\n`);
  return { entries, successCount, errorCount, errors };
}

/**
 * Extract prompts from professional skills
 */
async function extractProfessionalSkills(): Promise<ExtractionResult> {
  const entries: SkillRegistryEntry[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  console.log('📦 Extracting professional skills...\n');

  try {
    const { ALL_PROFESSIONAL_SKILLS } = await import('../lib/skills/professional');

    for (const skill of ALL_PROFESSIONAL_SKILLS as any[]) {
      const skillId = `professional-${skill.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`;

      try {
        if (!skill.prompts?.systemInstruction) {
          throw new Error('Missing systemInstruction in prompts object');
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

        console.log(`  ✓ ${skillId}`);
        successCount++;
      } catch (err) {
        const msg = `  ✗ ${skillId}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(msg);
        errors.push(msg);
        errorCount++;
      }
    }
  } catch (err) {
    const msg = `Failed to import ALL_PROFESSIONAL_SKILLS: ${err instanceof Error ? err.message : String(err)}`;
    console.error(msg);
    errors.push(msg);
  }

  console.log(`\n  Professional skills: ${successCount} extracted, ${errorCount} errors\n`);
  return { entries, successCount, errorCount, errors };
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get existing skills that have been improved (version > 1)
 * These should NOT be overwritten unless --force is used
 */
async function getImprovedSkillIds(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('skill_registry')
    .select('id')
    .gt('current_version', 1);

  if (error) {
    console.warn('Warning: Could not check for improved skills:', error.message);
    return new Set();
  }

  return new Set((data || []).map((row) => row.id));
}

/**
 * Upsert entries to database, optionally preserving improved versions
 */
async function upsertEntries(
  supabase: SupabaseClient,
  entries: SkillRegistryEntry[],
  options: { force: boolean; dryRun: boolean }
): Promise<{ upserted: number; skipped: number; errors: number }> {
  if (options.dryRun) {
    console.log('🔍 DRY RUN - No changes will be made\n');
    console.log(`Would upsert ${entries.length} skills to skill_registry`);
    return { upserted: entries.length, skipped: 0, errors: 0 };
  }

  let upserted = 0;
  let skipped = 0;
  let errorCount = 0;

  // Get improved skills to protect (unless force is used)
  const improvedSkillIds = options.force ? new Set<string>() : await getImprovedSkillIds(supabase);

  if (improvedSkillIds.size > 0) {
    console.log(`\n🛡️  Protecting ${improvedSkillIds.size} improved skills (use --force to overwrite)\n`);
  }

  // Filter out improved skills
  const entriesToUpsert = entries.filter((entry) => {
    if (improvedSkillIds.has(entry.id)) {
      console.log(`  ⏭️  Skipping ${entry.id} (has improvements)`);
      skipped++;
      return false;
    }
    return true;
  });

  // Batch upsert in chunks
  const chunkSize = 50;

  for (let i = 0; i < entriesToUpsert.length; i += chunkSize) {
    const chunk = entriesToUpsert.slice(i, i + chunkSize);
    const chunkNum = Math.floor(i / chunkSize) + 1;
    const totalChunks = Math.ceil(entriesToUpsert.length / chunkSize);

    const { error } = await supabase.from('skill_registry').upsert(chunk, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });

    if (error) {
      console.error(`  ❌ Chunk ${chunkNum}/${totalChunks} failed: ${error.message}`);
      errorCount += chunk.length;
    } else {
      console.log(`  ✅ Chunk ${chunkNum}/${totalChunks} upserted (${chunk.length} skills)`);
      upserted += chunk.length;
    }
  }

  return { upserted, skipped, errors: errorCount };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SKILL REGISTRY INITIALIZATION');
  console.log('  Database is the SINGLE SOURCE OF TRUTH for all prompts');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No database changes will be made\n');
  }
  if (force) {
    console.log('⚠️  FORCE MODE - Will overwrite improved prompts\n');
  }

  // Validate environment
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!dryRun && (!supabaseUrl || !supabaseServiceKey)) {
    console.error('❌ Error: Missing required environment variables');
    console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nUsage:');
    console.error('  SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx ts-node scripts/initializeSkillRegistry.ts');
    console.error('  npx ts-node scripts/initializeSkillRegistry.ts --dry-run');
    process.exit(1);
  }

  // Extract all skills
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  PHASE 1: EXTRACTING PROMPTS FROM CODE');
  console.log('───────────────────────────────────────────────────────────────\n');

  const [staticResult, roleTemplateResult, professionalResult] = await Promise.all([
    extractStaticSkills(),
    extractRoleTemplateSkills(),
    extractProfessionalSkills(),
  ]);

  // Combine all entries
  const allEntries = [
    ...staticResult.entries,
    ...roleTemplateResult.entries,
    ...professionalResult.entries,
  ];

  const totalExtracted =
    staticResult.successCount + roleTemplateResult.successCount + professionalResult.successCount;
  const totalErrors =
    staticResult.errorCount + roleTemplateResult.errorCount + professionalResult.errorCount;

  console.log('───────────────────────────────────────────────────────────────');
  console.log('  EXTRACTION SUMMARY');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  Static skills:        ${staticResult.successCount}`);
  console.log(`  Role template skills: ${roleTemplateResult.successCount}`);
  console.log(`  Professional skills:  ${professionalResult.successCount}`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Total extracted:      ${totalExtracted}`);
  console.log(`  Total errors:         ${totalErrors}\n`);

  if (allEntries.length === 0) {
    console.error('❌ No skills extracted. Cannot proceed.');
    process.exit(1);
  }

  // Upsert to database
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  PHASE 2: UPSERTING TO DATABASE');
  console.log('───────────────────────────────────────────────────────────────\n');

  let upsertResult = { upserted: 0, skipped: 0, errors: 0 };

  if (!dryRun) {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    upsertResult = await upsertEntries(supabase, allEntries, { force, dryRun });
  } else {
    upsertResult = { upserted: allEntries.length, skipped: 0, errors: 0 };
    console.log(`  Would upsert ${allEntries.length} skills`);
  }

  // Final summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`  Skills extracted:    ${totalExtracted}`);
  console.log(`  Extraction errors:   ${totalErrors}`);
  console.log(`  Skills upserted:     ${upsertResult.upserted}`);
  console.log(`  Skills skipped:      ${upsertResult.skipped} (improved, preserved)`);
  console.log(`  Upsert errors:       ${upsertResult.errors}`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN COMPLETE - No changes were made');
    console.log('   Run without --dry-run to apply changes');
  } else if (upsertResult.errors === 0 && upsertResult.upserted > 0) {
    console.log('\n✅ Skill registry initialization complete!');
    console.log('   All prompts are now stored in the database.');
  } else if (upsertResult.upserted > 0) {
    console.log('\n⚠️  Initialization completed with some errors.');
  } else {
    console.log('\n❌ Initialization failed.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
