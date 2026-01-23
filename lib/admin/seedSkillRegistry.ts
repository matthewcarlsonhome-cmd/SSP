/**
 * Seed Skill Registry from Browser
 *
 * This function seeds ALL skill data from the code into the database.
 * It can be triggered from the Admin page UI.
 *
 * The database is the SINGLE SOURCE OF TRUTH for all skill data.
 *
 * After seeding, skills are loaded entirely from the database,
 * eliminating the need for TypeScript skill definitions.
 */

import { supabase } from '../supabase';
import { SKILLS } from '../skills/static';
import { ROLE_TEMPLATES } from '../roleTemplates';
import { ALL_PROFESSIONAL_SKILLS } from '../skills/professional';
import { logger } from '../logger';
import type { FormInput } from '../../types';
import type { DynamicFormInput } from '../storage/types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Full skill registry entry with all metadata
 * Matches the expanded skill_registry table schema
 */
interface SkillRegistryEntry {
  // Core identification
  id: string;
  name: string;
  skill_type: 'built-in' | 'dynamic' | 'community' | 'library';

  // Prompts
  current_system_instruction: string;
  current_user_prompt_template: string;
  current_version: number;

  // Metadata
  description: string;
  long_description: string | null;
  what_you_get: string[];
  estimated_time_saved: string | null;

  // Form inputs
  inputs: DynamicFormInput[];
  output_format: 'markdown' | 'json' | 'table';

  // Categorization
  category: 'analysis' | 'generation' | 'automation' | 'optimization' | 'communication' | 'research';
  use_cases: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
  roles: string[];
  custom_tags: string[];

  // Visual
  theme: {
    primary: string;
    secondary: string;
    gradient: string;
  };
  icon_name: string;

  // Execution config
  recommended_model: 'gemini' | 'claude' | 'any';
  use_web_search: boolean;
  max_tokens: number;
  temperature: number;

  // Source tracking
  source: 'builtin' | 'role-template' | 'community';
  source_role_id: string | null;

  // Improvement settings
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

// ═══════════════════════════════════════════════════════════════════════════
// ICON MAPPING
// Maps custom icon component names to Lucide icon names
// ═══════════════════════════════════════════════════════════════════════════

const ICON_MAPPING: Record<string, string> = {
  // Job Seeker icons
  ReadinessIcon: 'Gauge',
  SkillsGapIcon: 'GitCompare',
  LinkedInIcon: 'Linkedin',
  KeywordIcon: 'Key',
  ResumeIcon: 'FileText',
  CoverLetterIcon: 'Mail',
  NetworkingIcon: 'Users',
  CompanyResearchIcon: 'Building2',
  InterviewIcon: 'MessageSquare',
  OfferIcon: 'FileCheck',
  SalaryIcon: 'DollarSign',
  OnboardingIcon: 'Rocket',
  DayInLifeIcon: 'Calendar',
  AutomationIcon: 'Bot',
  HealthcareResumeIcon: 'Stethoscope',
  ThankYouIcon: 'Heart',

  // Governance icons
  GovernanceIcon: 'Shield',
  ComplianceIcon: 'ClipboardCheck',
  SecurityIcon: 'Lock',
  AuditIcon: 'Search',
  PolicyIcon: 'FileText',
  RiskIcon: 'AlertTriangle',

  // Excel icons
  ExcelIcon: 'Table',
  ChartIcon: 'BarChart3',
  DataIcon: 'Database',

  // Enterprise icons
  ExecutiveIcon: 'Briefcase',
  ContractIcon: 'FileSignature',
  ProcessIcon: 'Workflow',

  // Extended icons
  MemoIcon: 'FileText',
  PresentationIcon: 'Presentation',
  PromptIcon: 'Sparkles',
  SQLIcon: 'Database',
  APIIcon: 'Code',

  // Sales icons
  SalesIcon: 'TrendingUp',
  ProposalIcon: 'FileText',
  CustomerIcon: 'Users',
  CompetitiveIcon: 'Swords',

  // Product icons
  PRDIcon: 'FileText',
  MarketIcon: 'PieChart',
  OKRIcon: 'Target',

  // Technical icons
  SpecIcon: 'FileCode',
  IncidentIcon: 'AlertCircle',
  CodeReviewIcon: 'GitPullRequest',

  // HR icons
  JobDescIcon: 'FileText',
  PerformanceIcon: 'Star',
  OnboardingPlanIcon: 'ListChecks',

  // Operations icons
  SOPIcon: 'ClipboardList',
  VendorIcon: 'Building',
  PolicyGapIcon: 'Search',

  // Default
  default: 'Sparkles',
};

/**
 * Get Lucide icon name from component name or use iconName if available
 */
function getIconName(iconComponent: unknown, themeIconName?: string): string {
  // If theme has iconName, use it (professional skills do this)
  if (themeIconName) {
    return themeIconName;
  }

  // Try to get component name and map it
  if (iconComponent && typeof iconComponent === 'function') {
    const componentName = iconComponent.name || '';
    return ICON_MAPPING[componentName] || ICON_MAPPING.default;
  }

  return ICON_MAPPING.default;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY INFERENCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Infer category from skill name/description
 */
function inferCategory(
  name: string,
  description: string
): 'analysis' | 'generation' | 'automation' | 'optimization' | 'communication' | 'research' {
  const text = `${name} ${description}`.toLowerCase();

  if (text.includes('analyz') || text.includes('score') || text.includes('assess') || text.includes('evaluat')) {
    return 'analysis';
  }
  if (text.includes('automat') || text.includes('workflow') || text.includes('process')) {
    return 'automation';
  }
  if (text.includes('optimi') || text.includes('improv') || text.includes('enhanc')) {
    return 'optimization';
  }
  if (text.includes('research') || text.includes('discover') || text.includes('find')) {
    return 'research';
  }
  if (text.includes('communicat') || text.includes('email') || text.includes('message') || text.includes('script')) {
    return 'communication';
  }

  // Default to generation (most skills generate content)
  return 'generation';
}

/**
 * Infer use cases from skill context
 */
function inferUseCases(name: string, description: string, skillId: string): string[] {
  const text = `${name} ${description} ${skillId}`.toLowerCase();
  const useCases: string[] = [];

  if (text.includes('job') || text.includes('resume') || text.includes('cover letter') || text.includes('application')) {
    useCases.push('job-search');
  }
  if (text.includes('interview') || text.includes('prep')) {
    useCases.push('interview-prep');
  }
  if (text.includes('daily') || text.includes('workflow') || text.includes('task')) {
    useCases.push('daily-work');
  }
  if (text.includes('onboard') || text.includes('start') || text.includes('new role')) {
    useCases.push('onboarding');
  }
  if (text.includes('career') || text.includes('growth') || text.includes('advance')) {
    useCases.push('career-growth');
  }
  if (text.includes('network') || text.includes('connect') || text.includes('linkedin')) {
    useCases.push('networking');
  }

  // Default to daily-work if no matches
  return useCases.length > 0 ? useCases : ['daily-work'];
}

/**
 * Infer level from skill complexity
 */
function inferLevel(name: string, description: string): 'beginner' | 'intermediate' | 'advanced' {
  const text = `${name} ${description}`.toLowerCase();

  if (text.includes('executive') || text.includes('strategic') || text.includes('advanced') || text.includes('expert')) {
    return 'advanced';
  }
  if (text.includes('basic') || text.includes('simple') || text.includes('beginner') || text.includes('intro')) {
    return 'beginner';
  }

  return 'intermediate';
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT CONVERSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert FormInput (static skills) to DynamicFormInput (DB format)
 */
function convertInputs(inputs: FormInput[]): DynamicFormInput[] {
  return inputs.map((input) => ({
    id: input.id,
    label: input.label,
    type: input.type === 'checkbox' ? 'checkbox' : input.type === 'select' ? 'select' : input.type === 'textarea' ? 'textarea' : 'text',
    placeholder: input.placeholder,
    options: input.options,
    validation: {
      required: input.required ?? false,
    },
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract full skill data from built-in static skills
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

        // Prompts
        current_system_instruction: prompt.systemInstruction,
        current_user_prompt_template: prompt.userPrompt || '',
        current_version: 1,

        // Metadata
        description: skill.description,
        long_description: skill.longDescription || null,
        what_you_get: skill.whatYouGet || [],
        estimated_time_saved: null,

        // Form inputs
        inputs: convertInputs(skill.inputs || []),
        output_format: 'markdown',

        // Categorization (inferred)
        category: inferCategory(skill.name, skill.description),
        use_cases: inferUseCases(skill.name, skill.description, skillId),
        level: inferLevel(skill.name, skill.description),
        roles: [],
        custom_tags: [],

        // Visual
        theme: skill.theme,
        icon_name: getIconName(skill.icon),

        // Execution config
        recommended_model: 'any',
        use_web_search: skill.useGoogleSearch || false,
        max_tokens: 4096,
        temperature: 0.7,

        // Source
        source: 'builtin',
        source_role_id: null,

        // Improvement settings
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
 * Extract full skill data from role template dynamic skills
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

          // Prompts
          current_system_instruction: dynamicSkill.prompts.systemInstruction,
          current_user_prompt_template: dynamicSkill.prompts.userPromptTemplate || '',
          current_version: 1,

          // Metadata
          description: dynamicSkill.description || `${dynamicSkill.name} for ${template.name}`,
          long_description: dynamicSkill.longDescription || null,
          what_you_get: [],
          estimated_time_saved: dynamicSkill.estimatedTimeSaved || null,

          // Form inputs
          inputs: dynamicSkill.inputs || [],
          output_format: dynamicSkill.prompts.outputFormat || 'markdown',

          // Categorization
          category: dynamicSkill.category || inferCategory(dynamicSkill.name, dynamicSkill.description || ''),
          use_cases: inferUseCases(dynamicSkill.name, dynamicSkill.description || '', skillId),
          level: inferLevel(dynamicSkill.name, dynamicSkill.description || ''),
          roles: [template.id],
          custom_tags: [],

          // Visual
          theme: dynamicSkill.theme
            ? {
                primary: dynamicSkill.theme.primary,
                secondary: dynamicSkill.theme.secondary,
                gradient: dynamicSkill.theme.gradient,
              }
            : {
                primary: 'text-blue-400',
                secondary: 'bg-blue-900/20',
                gradient: 'from-blue-500/20 to-transparent',
              },
          icon_name: dynamicSkill.theme?.iconName || ICON_MAPPING.default,

          // Execution config
          recommended_model: dynamicSkill.config?.recommendedModel || 'any',
          use_web_search: dynamicSkill.config?.useWebSearch || false,
          max_tokens: dynamicSkill.config?.maxTokens || 4096,
          temperature: dynamicSkill.config?.temperature || 0.7,

          // Source
          source: 'role-template',
          source_role_id: template.id,

          // Improvement settings
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
 * Extract full skill data from professional skills
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

        // Prompts
        current_system_instruction: skill.prompts.systemInstruction,
        current_user_prompt_template: skill.prompts.userPromptTemplate || '',
        current_version: 1,

        // Metadata
        description: skill.description,
        long_description: skill.longDescription || null,
        what_you_get: [],
        estimated_time_saved: skill.estimatedTimeSaved || null,

        // Form inputs
        inputs: skill.inputs || [],
        output_format: skill.prompts.outputFormat || 'markdown',

        // Categorization
        category: skill.category || inferCategory(skill.name, skill.description),
        use_cases: inferUseCases(skill.name, skill.description, skillId),
        level: inferLevel(skill.name, skill.description),
        roles: [],
        custom_tags: [],

        // Visual
        theme: skill.theme
          ? {
              primary: skill.theme.primary,
              secondary: skill.theme.secondary,
              gradient: skill.theme.gradient,
            }
          : {
              primary: 'text-purple-400',
              secondary: 'bg-purple-900/20',
              gradient: 'from-purple-500/20 to-transparent',
            },
        icon_name: skill.theme?.iconName || ICON_MAPPING.default,

        // Execution config
        recommended_model: skill.config?.recommendedModel || 'any',
        use_web_search: skill.config?.useWebSearch || false,
        max_tokens: skill.config?.maxTokens || 4096,
        temperature: skill.config?.temperature || 0.7,

        // Source
        source: 'builtin',
        source_role_id: null,

        // Improvement settings
        min_grades_for_improvement: 50,
        improvement_threshold: 3.5,
      });
    } catch (err) {
      errors.push(`${skillId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { entries, errors };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SEEDING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

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
 * Seed all skill data to the database
 *
 * @param force - If true, overwrite improved skills too (version > 1)
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
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from('skill_registry')
    .select('id, skill_type, current_version, category, source');

  if (error || !data) {
    return { totalSkills: 0, improvedSkills: 0, byType: {}, byCategory: {}, bySource: {} };
  }

  const byType: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let improvedSkills = 0;

  for (const skill of data) {
    byType[skill.skill_type] = (byType[skill.skill_type] || 0) + 1;
    if (skill.category) {
      byCategory[skill.category] = (byCategory[skill.category] || 0) + 1;
    }
    if (skill.source) {
      bySource[skill.source] = (bySource[skill.source] || 0) + 1;
    }
    if (skill.current_version > 1) {
      improvedSkills++;
    }
  }

  return {
    totalSkills: data.length,
    improvedSkills,
    byType,
    byCategory,
    bySource,
  };
}
