/**
 * Atomic Prompt Composition System
 *
 * A composable, cacheable prompt architecture based on:
 * - Russellian Logical Atomism: Prompts built from irreducible, clear units
 * - Wittgensteinian Language Games: Context-dependent meaning and behavior
 *
 * BENEFITS:
 * 1. Faster load times: Only load atoms needed for specific skill
 * 2. Better caching: Common patterns cached and reused
 * 3. Easier maintenance: Update one atom, affect all skills using it
 * 4. More testable: Test atoms in isolation
 * 5. Composability: Mix and match atoms for new skills
 *
 * USAGE:
 *
 * ```typescript
 * import { recipe, composePrompt, SKILL_RECIPES } from './prompts';
 *
 * // Use pre-composed recipe
 * const prompt = composePrompt(SKILL_RECIPES.jobReadinessScore, {
 *   game: 'analysis',
 *   tone: 'professional',
 *   depth: 'comprehensive',
 *   audience: 'professional',
 * });
 *
 * // Or build custom recipe
 * const customRecipe = recipe()
 *   .role('careerStrategist')
 *   .expertise('resumeWriting', 'atsOptimization')
 *   .methodology('gapAnalysis')
 *   .output('scoreCard')
 *   .constraints('evidenceBacked', 'actionableRecommendations')
 *   .build();
 *
 * const customPrompt = composePrompt(customRecipe, context);
 * ```
 */

// Types
export type {
  RoleAtom,
  ExpertiseAtom,
  MethodologyAtom,
  ConstraintAtom,
  OutputAtom,
  PromptAtom,
  LanguageGame,
  GameContext,
  PromptMolecule,
  ComposedPrompt,
  CompositionOptions,
  OutputSection,
  AtomRef,
  LazyPromptTemplate,
} from './types';

// Atoms
export {
  ROLES,
  getRole,
  listRoles,
  type RoleId,
} from './atoms/roles';

export {
  EXPERTISE,
  getExpertise,
  combineExpertise,
  type ExpertiseId,
} from './atoms/expertise';

export {
  METHODOLOGIES,
  getMethodology,
  renderMethodology,
  type MethodologyId,
} from './atoms/methodologies';

export {
  OUTPUTS,
  getOutput,
  combineOutputSections,
  type OutputId,
} from './atoms/outputs';

export {
  CONSTRAINTS,
  getConstraint,
  renderConstraints,
  CONSTRAINT_SETS,
  type ConstraintId,
} from './atoms/constraints';

// Composition
export {
  composePrompt,
  recipe,
  PromptRecipeBuilder,
  SKILL_RECIPES,
  clearPromptCache,
  getPromptCacheStats,
  prewarmCache,
  type PromptRecipe,
  type CustomSection,
} from './composer';
