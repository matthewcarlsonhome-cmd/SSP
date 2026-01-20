/**
 * Wittgensteinian Layer - Main Entry Point
 *
 * Provides contextual validation through language games, family resemblance,
 * grammar checking, and exemplar alignment.
 *
 * @module wittgenstein
 *
 * @example
 * ```typescript
 * import {
 *   dualValidator,
 *   validateSkill,
 *   canRegisterSkill,
 *   languageGameRegistry,
 *   familyResemblanceEngine,
 *   grammarEngine
 * } from '../lib/wittgenstein';
 *
 * // Full dual validation
 * const result = validateSkill(mySkill, {
 *   intendedGame: 'sales-automation',
 *   intendedClusters: ['data-transformers']
 * });
 *
 * if (result.overall.shouldRegister) {
 *   console.log('Skill passes both formal and contextual validation');
 * }
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export * from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Language Games
// ═══════════════════════════════════════════════════════════════════════════

export {
  LanguageGameRegistry,
  languageGameRegistry,
} from './games/registry';

// ═══════════════════════════════════════════════════════════════════════════
// Family Resemblance
// ═══════════════════════════════════════════════════════════════════════════

export {
  FamilyResemblanceEngine,
  familyResemblanceEngine,
} from './family/engine';

// ═══════════════════════════════════════════════════════════════════════════
// Grammar
// ═══════════════════════════════════════════════════════════════════════════

export {
  GrammarEngine,
  grammarEngine,
} from './grammar/engine';

// ═══════════════════════════════════════════════════════════════════════════
// Dual Validation
// ═══════════════════════════════════════════════════════════════════════════

export {
  DualValidator,
  dualValidator,
  validateSkill,
  canRegisterSkill,
} from './validation/dual-validator';
