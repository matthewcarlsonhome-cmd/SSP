/**
 * Prompt Composer - Assembles atoms into complete prompts
 *
 * This is the core composition engine that:
 * 1. Combines atoms based on skill requirements
 * 2. Applies language game context to methodologies
 * 3. Caches composed prompts for faster subsequent loads
 * 4. Supports lazy loading for large prompt segments
 *
 * PERFORMANCE BENEFITS:
 * - Atoms are small, cacheable units (~100-500 bytes each)
 * - Full prompts are composed on-demand
 * - Common atom combinations can be pre-cached
 * - Unused atoms are never loaded
 */

import {
  ComposedPrompt,
  CompositionOptions,
  GameContext,
  LanguageGame,
  PromptAtom,
  PromptMolecule,
} from './types';
import {
  RoleId,
  ExpertiseId,
  MethodologyId,
  OutputId,
  ConstraintId,
  ROLES,
  EXPERTISE,
  METHODOLOGIES,
  OUTPUTS,
  renderConstraints,
} from './atoms';

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT CACHE
// ═══════════════════════════════════════════════════════════════════════════════

const promptCache = new Map<string, ComposedPrompt>();
const MAX_CACHE_SIZE = 100;

function getCacheKey(recipe: PromptRecipe, context: GameContext): string {
  return JSON.stringify({ recipe, context });
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT RECIPE - Declarative prompt composition
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A recipe describes HOW to compose a prompt.
 * Skills define recipes rather than raw prompts.
 */
export interface PromptRecipe {
  readonly role: RoleId;
  readonly expertise: readonly ExpertiseId[];
  readonly methodologies: readonly MethodologyId[];
  readonly output: OutputId;
  readonly constraints: readonly ConstraintId[];
  readonly customSections?: readonly CustomSection[];
}

export interface CustomSection {
  readonly title: string;
  readonly content: string;
  readonly position: 'before-methodology' | 'after-methodology' | 'before-output' | 'after-output';
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compose a prompt from a recipe.
 *
 * @param recipe - The composition recipe
 * @param context - The language game context
 * @param options - Additional composition options
 * @returns The composed prompt ready for execution
 */
export function composePrompt(
  recipe: PromptRecipe,
  context: GameContext,
  options: Partial<CompositionOptions> = {}
): ComposedPrompt {
  const cacheKey = getCacheKey(recipe, context);

  // Check cache first
  if (!options.cacheKey && promptCache.has(cacheKey)) {
    return promptCache.get(cacheKey)!;
  }

  // Collect all atoms used
  const atoms: PromptAtom[] = [];

  // Build prompt sections
  const sections: string[] = [];

  // 1. Role section
  const roleAtom = ROLES[recipe.role];
  atoms.push(roleAtom);

  if (options.includeCredentials !== false) {
    sections.push(roleAtom.render());
  }

  // 2. Expertise section
  if (recipe.expertise.length > 0) {
    sections.push('\n═══════════════════════════════════════════════════════════════════════════════');
    sections.push('YOUR EXPERTISE AND KNOWLEDGE');
    sections.push('═══════════════════════════════════════════════════════════════════════════════\n');

    for (const expertiseId of recipe.expertise) {
      const expertiseAtom = EXPERTISE[expertiseId];
      atoms.push(expertiseAtom);
      sections.push(expertiseAtom.render());
      sections.push('');
    }
  }

  // 3. Custom sections (before methodology)
  const beforeMethodology = recipe.customSections?.filter(
    (s) => s.position === 'before-methodology'
  );
  if (beforeMethodology?.length) {
    for (const section of beforeMethodology) {
      sections.push(`\n**${section.title.toUpperCase()}:**`);
      sections.push(section.content);
    }
  }

  // 4. Methodology section
  if (recipe.methodologies.length > 0) {
    sections.push('\n═══════════════════════════════════════════════════════════════════════════════');
    sections.push('METHODOLOGY AND APPROACH');
    sections.push('═══════════════════════════════════════════════════════════════════════════════\n');

    for (const methodologyId of recipe.methodologies) {
      const methodologyAtom = METHODOLOGIES[methodologyId];
      atoms.push(methodologyAtom);
      sections.push(methodologyAtom.render(context.game));
      sections.push('');
    }
  }

  // 5. Custom sections (after methodology)
  const afterMethodology = recipe.customSections?.filter(
    (s) => s.position === 'after-methodology'
  );
  if (afterMethodology?.length) {
    for (const section of afterMethodology) {
      sections.push(`\n**${section.title.toUpperCase()}:**`);
      sections.push(section.content);
    }
  }

  // 6. Custom sections (before output)
  const beforeOutput = recipe.customSections?.filter(
    (s) => s.position === 'before-output'
  );
  if (beforeOutput?.length) {
    for (const section of beforeOutput) {
      sections.push(`\n**${section.title.toUpperCase()}:**`);
      sections.push(section.content);
    }
  }

  // 7. Output section
  sections.push('\n═══════════════════════════════════════════════════════════════════════════════');
  sections.push('OUTPUT REQUIREMENTS');
  sections.push('═══════════════════════════════════════════════════════════════════════════════\n');

  const outputAtom = OUTPUTS[recipe.output];
  atoms.push(outputAtom);
  sections.push(outputAtom.render());

  // 8. Custom sections (after output)
  const afterOutput = recipe.customSections?.filter(
    (s) => s.position === 'after-output'
  );
  if (afterOutput?.length) {
    for (const section of afterOutput) {
      sections.push(`\n**${section.title.toUpperCase()}:**`);
      sections.push(section.content);
    }
  }

  // 9. Constraints section
  if (recipe.constraints.length > 0) {
    sections.push('\n═══════════════════════════════════════════════════════════════════════════════');
    sections.push('RULES AND CONSTRAINTS');
    sections.push('═══════════════════════════════════════════════════════════════════════════════\n');

    for (const constraintId of recipe.constraints) {
      atoms.push(CONSTRAINTS[constraintId] as PromptAtom);
    }
    sections.push(renderConstraints(recipe.constraints as ConstraintId[]));
  }

  // Compose final prompt
  const systemInstruction = sections.join('\n');

  const composed: ComposedPrompt = {
    systemInstruction,
    atoms,
    molecules: [], // For future molecule-level composition
    hash: hashString(systemInstruction),
    byteSize: new TextEncoder().encode(systemInstruction).length,
  };

  // Cache the result
  if (promptCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const firstKey = promptCache.keys().next().value;
    if (firstKey) promptCache.delete(firstKey);
  }
  promptCache.set(cacheKey, composed);

  return composed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builder for creating prompt recipes fluently.
 */
export class PromptRecipeBuilder {
  private recipe: Partial<PromptRecipe> = {
    expertise: [],
    methodologies: [],
    constraints: [],
    customSections: [],
  };

  role(role: RoleId): this {
    this.recipe.role = role;
    return this;
  }

  expertise(...ids: ExpertiseId[]): this {
    this.recipe.expertise = [...(this.recipe.expertise || []), ...ids];
    return this;
  }

  methodology(...ids: MethodologyId[]): this {
    this.recipe.methodologies = [...(this.recipe.methodologies || []), ...ids];
    return this;
  }

  output(id: OutputId): this {
    this.recipe.output = id;
    return this;
  }

  constraints(...ids: ConstraintId[]): this {
    this.recipe.constraints = [...(this.recipe.constraints || []), ...ids];
    return this;
  }

  customSection(section: CustomSection): this {
    this.recipe.customSections = [...(this.recipe.customSections || []), section];
    return this;
  }

  build(): PromptRecipe {
    if (!this.recipe.role) {
      throw new Error('Role is required');
    }
    if (!this.recipe.output) {
      throw new Error('Output format is required');
    }
    return this.recipe as PromptRecipe;
  }
}

/**
 * Create a new recipe builder.
 */
export function recipe(): PromptRecipeBuilder {
  return new PromptRecipeBuilder();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-COMPOSED RECIPES FOR COMMON SKILL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

import { CONSTRAINTS } from './atoms/constraints';

export const SKILL_RECIPES = {
  /**
   * Job readiness scoring skill
   */
  jobReadinessScore: recipe()
    .role('careerStrategist')
    .expertise('talentAssessment', 'resumeWriting')
    .methodology('weightedScoring', 'gapAnalysis')
    .output('scoreCard')
    .constraints('evidenceBacked', 'honestAssessment', 'quantifyWhenPossible', 'actionableRecommendations', 'noFalseHope')
    .build(),

  /**
   * ATS optimization skill
   */
  atsChecker: recipe()
    .role('atsSpecialist')
    .expertise('atsOptimization', 'resumeWriting')
    .methodology('gapAnalysis', 'rubricScoring')
    .output('gapReport')
    .constraints('evidenceBacked', 'actionableRecommendations', 'quantifyWhenPossible')
    .build(),

  /**
   * Cover letter generation
   */
  coverLetterGenerator: recipe()
    .role('executiveCommunications')
    .expertise('resumeWriting', 'networking')
    .methodology('starMethod')
    .output('coverLetter')
    .constraints('noAssumptions', 'professionalTone', 'ethicalBoundaries')
    .build(),

  /**
   * Company research
   */
  companyResearch: recipe()
    .role('businessIntelligence')
    .expertise('talentAssessment')
    .methodology('swotAnalysis', 'pestelAnalysis')
    .output('companyBrief')
    .constraints('evidenceBacked', 'marketRealistic', 'completeAnalysis')
    .build(),

  /**
   * Salary negotiation
   */
  salaryNegotiation: recipe()
    .role('compensationExpert')
    .expertise('compensation')
    .methodology('gapAnalysis')
    .output('negotiationPlaybook')
    .constraints('marketRealistic', 'actionableRecommendations', 'honestAssessment')
    .build(),

  /**
   * Technical spec writing
   */
  technicalSpec: recipe()
    .role('softwareArchitect')
    .expertise('systemDesign', 'security')
    .methodology('gapAnalysis')
    .output('technicalSpec')
    .constraints('completeAnalysis', 'formatConsistency')
    .build(),

  /**
   * Incident postmortem
   */
  incidentPostmortem: recipe()
    .role('siteReliabilityEngineer')
    .expertise('siteReliability')
    .methodology('blamelessPostmortem', 'fiveWhys')
    .output('incidentReport')
    .constraints('evidenceBacked', 'constructiveFeedback', 'actionableRecommendations')
    .build(),
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export function clearPromptCache(): void {
  promptCache.clear();
}

export function getPromptCacheStats(): { size: number; maxSize: number } {
  return { size: promptCache.size, maxSize: MAX_CACHE_SIZE };
}

/**
 * Pre-warm cache with common recipes for faster initial loads.
 */
export function prewarmCache(): void {
  const defaultContext: GameContext = {
    game: 'analysis',
    tone: 'professional',
    depth: 'standard',
    audience: 'professional',
  };

  for (const recipeKey of Object.keys(SKILL_RECIPES) as (keyof typeof SKILL_RECIPES)[]) {
    composePrompt(SKILL_RECIPES[recipeKey], defaultContext);
  }
}
