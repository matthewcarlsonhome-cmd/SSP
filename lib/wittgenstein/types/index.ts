/**
 * Wittgensteinian Type System - Re-exports
 *
 * This module re-exports all types from the Wittgensteinian
 * type system for convenient importing.
 *
 * @module wittgenstein/types
 *
 * @example
 * ```typescript
 * import {
 *   LanguageGame,
 *   FamilyResemblanceCluster,
 *   GrammaticalRule,
 *   SkillExemplar,
 *   FormOfLife,
 *   DualValidationResult
 * } from '../lib/wittgenstein/types';
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// Language Games
// ═══════════════════════════════════════════════════════════════════════════

export {
  type VocabularyEntry,
  type AxiomContextualMeaning,
  type SuccessCriterion,
  type LanguageGame,
  type GameCompatibility,
  createLanguageGame,
  createVocabularyEntry,
  createSuccessCriterion,
  addVocabulary,
  setAxiomMeaning,
  addSuccessCriterion,
  hasVocabulary,
  lookupVocabulary,
} from './language-game';

// ═══════════════════════════════════════════════════════════════════════════
// Family Resemblance
// ═══════════════════════════════════════════════════════════════════════════

export {
  type FeatureDetector,
  type ClusterFeature,
  type FamilyResemblanceCluster,
  type ResemblanceScore,
  type ResemblanceAnalysis,
  createCluster,
  createFeature,
  axiomPresenceDetector,
  axiomPatternDetector,
  tagMatchDetector,
  stepCountDetector,
  addFeature,
  addPrototype,
  getMaxPossibleScore,
  normalizeScore,
  meetsMembership,
} from './family';

// ═══════════════════════════════════════════════════════════════════════════
// Grammar
// ═══════════════════════════════════════════════════════════════════════════

export {
  type ViolationSeverity,
  type GrammaticalScope,
  type GrammaticalCheck,
  type GrammaticalRule,
  type GrammaticalViolation,
  type GrammarCheckResult,
  createGrammaticalRule,
  requiresPredecessor,
  requiresSuccessor,
  forbiddenInContext,
  requiresVocabulary,
  outputMustBeUsed,
  createViolation,
  createEmptyGrammarResult,
  addViolationToResult,
  hasNonsense,
  hasViolations,
  getViolationsBySeverity,
  formatViolation,
} from './grammar';

// ═══════════════════════════════════════════════════════════════════════════
// Exemplars
// ═══════════════════════════════════════════════════════════════════════════

export {
  type ExemplarQuality,
  type ExemplarAnnotation,
  type SkillExemplar,
  type CommonMistake,
  type SkillTrainingSet,
  type ExemplarAlignment,
  createExemplar,
  createTrainingSet,
  addExemplarToTrainingSet,
  addCommonMistake,
  annotateExemplar,
  getCanonicalExemplars,
  getExemplarsByQuality,
  calculateSimilarity,
} from './exemplar';

// ═══════════════════════════════════════════════════════════════════════════
// Forms of Life
// ═══════════════════════════════════════════════════════════════════════════

export {
  type Practice,
  type FormOfLife,
  createFormOfLife,
  createPractice,
  addPractice,
  addLanguageGame,
  addBackgroundAssumption,
  addValue,
  addUltimateGoal,
  getAllPractices,
  findPractice,
  hasLanguageGame,
  summarizeFormOfLife,
} from './form-of-life';

// ═══════════════════════════════════════════════════════════════════════════
// Dual Validation
// ═══════════════════════════════════════════════════════════════════════════

export {
  type RussellianValidation,
  type WittgensteinianValidation,
  type OverallVerdict,
  type DualValidationResult,
  type DualValidationOptions,
  createEmptyRussellianValidation,
  createEmptyWittgensteinianValidation,
  createEmptyVerdict,
  createEmptyDualValidationResult,
  calculateConfidence,
  determineRiskLevel,
  generateRecommendations,
  generateSummary,
} from './dual-validation';
