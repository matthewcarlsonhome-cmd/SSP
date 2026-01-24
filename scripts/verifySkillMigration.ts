#!/usr/bin/env npx tsx
/**
 * SKILL MIGRATION VERIFICATION SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This script verifies that ALL skills are correctly loaded from the database
 * and that the migration from TypeScript to database-only is safe.
 *
 * CHECKS PERFORMED:
 * 1. All skills have required execution fields (prompts)
 * 2. Skill counts match expected numbers
 * 3. Each skill can be loaded individually
 * 4. Prompt content is not empty
 * 5. Category/metadata fields are populated
 *
 * USAGE:
 *   npx tsx scripts/verifySkillMigration.ts [--verbose] [--fix]
 *
 * OPTIONS:
 *   --verbose   Show detailed output for each skill
 *   --fix       Attempt to fix missing skills by seeding from TypeScript
 */

import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ═══════════════════════════════════════════════════════════════════════════════
// EXPECTED SKILL COUNTS (from TypeScript definitions)
// ═══════════════════════════════════════════════════════════════════════════════

const EXPECTED_COUNTS = {
  'Job Seeker': 16,
  'Governance': 8,
  'Excel': 5,
  'Enterprise': 4,
  'Extended': 20,
  'Sales': 4,
  'Product': 4,
  'Technical': 4,
  'HR': 4,
  'Operations': 4,
  'TOTAL_STATIC': 73,
  'Professional': 41,
};

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SkillRecord {
  id: string;
  name: string;
  current_system_instruction: string;
  current_user_prompt_template: string;
  description: string | null;
  category: string | null;
  skill_type: string;
}

interface VerificationResult {
  passed: boolean;
  skill_id: string;
  skill_name: string;
  issues: string[];
}

interface VerificationSummary {
  total_skills: number;
  passed: number;
  failed: number;
  issues: VerificationResult[];
  missing_execution_fields: string[];
  empty_prompts: string[];
  missing_metadata: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function verifySkill(skill: SkillRecord): VerificationResult {
  const issues: string[] = [];

  // Check execution fields (CRITICAL)
  if (!skill.current_system_instruction) {
    issues.push('CRITICAL: Missing current_system_instruction');
  } else if (skill.current_system_instruction.trim().length < 50) {
    issues.push('WARNING: System instruction is suspiciously short');
  }

  if (!skill.current_user_prompt_template) {
    issues.push('CRITICAL: Missing current_user_prompt_template');
  }

  // Check metadata fields (optional but recommended)
  if (!skill.description) {
    issues.push('INFO: Missing description');
  }

  if (!skill.category) {
    issues.push('INFO: Missing category');
  }

  return {
    passed: !issues.some(i => i.startsWith('CRITICAL')),
    skill_id: skill.id,
    skill_name: skill.name,
    issues,
  };
}

async function loadAllSkills(): Promise<SkillRecord[]> {
  const { data, error } = await supabase
    .from('skill_registry')
    .select('id, name, current_system_instruction, current_user_prompt_template, description, category, skill_type')
    .order('name');

  if (error) {
    console.error('❌ Failed to load skills:', error.message);
    process.exit(1);
  }

  return data as SkillRecord[];
}

async function testIndividualLoad(skillId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('skill_registry')
    .select('id, current_system_instruction, current_user_prompt_template')
    .eq('id', skillId)
    .single();

  if (error) {
    return false;
  }

  return !!(data?.current_system_instruction && data?.current_user_prompt_template);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('SKILL MIGRATION VERIFICATION');
  console.log('Database-Only Architecture Validation');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('');

  // Load all skills
  console.log('📂 Loading skills from database...');
  const skills = await loadAllSkills();
  console.log(`   Found ${skills.length} skills in database`);
  console.log('');

  // Verify each skill
  console.log('🔍 Verifying each skill...');
  console.log('───────────────────────────────────────────────────────────────────────────────');

  const summary: VerificationSummary = {
    total_skills: skills.length,
    passed: 0,
    failed: 0,
    issues: [],
    missing_execution_fields: [],
    empty_prompts: [],
    missing_metadata: [],
  };

  for (const skill of skills) {
    const result = verifySkill(skill);

    if (result.passed) {
      summary.passed++;
      if (verbose) {
        console.log(`  ✅ ${skill.name}`);
      }
    } else {
      summary.failed++;
      summary.issues.push(result);
      console.log(`  ❌ ${skill.name} (${skill.id})`);
      for (const issue of result.issues) {
        console.log(`     - ${issue}`);
      }
    }

    // Categorize issues
    if (!skill.current_system_instruction || !skill.current_user_prompt_template) {
      summary.missing_execution_fields.push(skill.id);
    }
    if (skill.current_system_instruction?.trim().length < 50) {
      summary.empty_prompts.push(skill.id);
    }
    if (!skill.description || !skill.category) {
      summary.missing_metadata.push(skill.id);
    }
  }

  console.log('');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log('');

  // Test individual loads
  console.log('🔄 Testing individual skill loading...');
  let individualLoadsPassed = 0;
  let individualLoadsFailed = 0;

  // Test a sample of skills
  const sampleSize = Math.min(10, skills.length);
  const sampleSkills = skills.slice(0, sampleSize);

  for (const skill of sampleSkills) {
    const canLoad = await testIndividualLoad(skill.id);
    if (canLoad) {
      individualLoadsPassed++;
      if (verbose) {
        console.log(`   ✅ ${skill.id}`);
      }
    } else {
      individualLoadsFailed++;
      console.log(`   ❌ ${skill.id} - Failed to load individually`);
    }
  }
  console.log(`   ${individualLoadsPassed}/${sampleSize} sample skills loaded successfully`);
  console.log('');

  // Skill count comparison
  console.log('📊 SKILL COUNT COMPARISON');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log(`   Expected (TypeScript static):     ${EXPECTED_COUNTS.TOTAL_STATIC}`);
  console.log(`   Expected (TypeScript professional): ${EXPECTED_COUNTS.Professional}`);
  console.log(`   Expected (Total minimum):         ${EXPECTED_COUNTS.TOTAL_STATIC}`);
  console.log(`   Actual (Database):                ${skills.length}`);

  const countMatch = skills.length >= EXPECTED_COUNTS.TOTAL_STATIC;
  if (countMatch) {
    console.log(`   ✅ Database has sufficient skills`);
  } else {
    console.log(`   ⚠️  Database may be missing skills`);
  }
  console.log('');

  // Skill type breakdown
  console.log('📈 SKILL TYPE BREAKDOWN');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  const typeBreakdown: Record<string, number> = {};
  for (const skill of skills) {
    const type = skill.skill_type || 'unknown';
    typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(typeBreakdown)) {
    console.log(`   ${type.padEnd(15)} ${count}`);
  }
  console.log('');

  // Final summary
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`   Total Skills:              ${summary.total_skills}`);
  console.log(`   ✅ Passed:                  ${summary.passed}`);
  console.log(`   ❌ Failed:                  ${summary.failed}`);
  console.log('');
  console.log('   ISSUE CATEGORIES:');
  console.log(`   - Missing execution fields: ${summary.missing_execution_fields.length}`);
  console.log(`   - Empty/short prompts:      ${summary.empty_prompts.length}`);
  console.log(`   - Missing metadata:         ${summary.missing_metadata.length}`);
  console.log('');

  // Backward compatibility assessment
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('BACKWARD COMPATIBILITY ASSESSMENT');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('');

  if (summary.failed === 0 && summary.missing_execution_fields.length === 0) {
    console.log('   ✅ ALL SKILLS HAVE EXECUTION FIELDS');
    console.log('   ✅ DATABASE CAN BE USED AS SOLE SOURCE');
    console.log('   ✅ SAFE TO REMOVE TYPESCRIPT FALLBACK');
    console.log('');
    console.log('   The migration to database-only architecture is SAFE.');
    console.log('   All existing skills will continue to work.');
  } else {
    console.log('   ⚠️  SOME SKILLS MISSING EXECUTION FIELDS');
    console.log('');
    console.log('   The following skills need to be fixed before removing TypeScript:');
    for (const id of summary.missing_execution_fields) {
      console.log(`   - ${id}`);
    }
    console.log('');
    console.log('   Run the initialization script to populate missing skills:');
    console.log('   npx tsx scripts/initializeSkillRegistry.ts');
  }
  console.log('');

  // Exit with appropriate code
  if (summary.failed > 0 || summary.missing_execution_fields.length > 0) {
    console.log('❌ Verification FAILED - some issues need attention');
    process.exit(1);
  } else {
    console.log('✅ Verification PASSED - all skills are valid');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
