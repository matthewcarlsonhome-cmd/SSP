/**
 * Russellian Type System - Re-exports
 *
 * This module re-exports all types and constants from the Russellian
 * type system for convenient importing.
 *
 * @module russellian/types
 *
 * @example
 * ```typescript
 * import {
 *   Axiom,
 *   TypeLevel,
 *   SkillDefinition,
 *   DerivationCertificate,
 *   ValidationResult
 * } from '../lib/russellian/types';
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// Axioms
// ═══════════════════════════════════════════════════════════════════════════

export {
  Axiom,
  type AxiomDefinition,
  AXIOM_REGISTRY,
  getAxiomDefinition,
  getAxiomsWithSideEffects,
  getIdempotentAxioms,
  axiomRequiresInput,
  axiomGuaranteesOutput,
  getAllAxioms,
  isValidAxiom,
} from './axioms';

// ═══════════════════════════════════════════════════════════════════════════
// Type Levels
// ═══════════════════════════════════════════════════════════════════════════

export {
  TypeLevel,
  type TypeLevelDefinition,
  TYPE_LEVEL_REGISTRY,
  getTypeLevelDefinition,
  canInvoke,
  isAxiomAllowedAtLevel,
  getMinimumLevelForAxiom,
  getMinimumLevelForAxioms,
  levelRequiresApproval,
  getAllTypeLevels,
  getTypeLevelName,
  isValidTypeLevel,
  compareTypeLevels,
} from './levels';

// ═══════════════════════════════════════════════════════════════════════════
// Composition Rules
// ═══════════════════════════════════════════════════════════════════════════

export {
  type CompositionRule,
  COMPOSITION_RULES,
  findCompositionRule,
  isCompositionAllowed,
  getForbiddenRules,
  getAllowedRules,
  getRulesFromAxiom,
  getRulesToAxiom,
  getRuleById,
  validateRuleConsistency,
} from './rules';

// ═══════════════════════════════════════════════════════════════════════════
// Skill Definition
// ═══════════════════════════════════════════════════════════════════════════

export {
  type PrimitiveType,
  type DataType,
  type ErrorStrategy,
  type SkillStep,
  type SkillConnection,
  type SkillDefinition,
  createStep,
  createConnection,
  createSkillDefinition,
  getIncomingSteps,
  getOutgoingSteps,
  getStepById,
  hasSideEffects,
  isPureSkill,
  getExecutionOrder,
  cloneSkillDefinition,
} from './skill';

// ═══════════════════════════════════════════════════════════════════════════
// Derivation Certificate
// ═══════════════════════════════════════════════════════════════════════════

export {
  type StepStatus,
  type DerivationStatus,
  type LevelCheck,
  type DerivationStep,
  type DerivationCertificate,
  type CertificateMetrics,
  createEmptyAxiomUsage,
  createDerivationStep,
  isCertificateChainValid,
  getSuccessRate,
  getFailedSteps,
  getSkippedSteps,
  getMostUsedAxioms,
  summarizeCertificate,
} from './certificate';

// ═══════════════════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════════════════

export {
  type ValidationSeverity,
  type ValidationCategory,
  type ValidationLocation,
  type ValidationError,
  type ValidationResult,
  COMPOSITION_ERROR_CODES,
  LEVEL_ERROR_CODES,
  STRUCTURE_ERROR_CODES,
  REFERENCE_ERROR_CODES,
  SCHEMA_ERROR_CODES,
  WARNING_CODES,
  createValidationError,
  createEmptyValidationResult,
  addValidationError,
  mergeValidationResults,
  filterBySeverity,
  filterByCategory,
  getErrorsForStep,
  formatValidationResult,
} from './validation';
