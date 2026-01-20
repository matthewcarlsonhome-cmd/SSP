/**
 * Russellian Architecture - Main Entry Point
 *
 * A formal validation system inspired by Russell & Whitehead's Principia Mathematica.
 * Makes skill definitions "valid by construction" through:
 * - Primitive axioms (irreducible operations)
 * - Type levels (stratification preventing circular invocations)
 * - Composition rules (what axioms can connect to what)
 * - Derivation certificates (cryptographic audit trails)
 *
 * @module russellian
 *
 * @example
 * ```typescript
 * import {
 *   Axiom,
 *   TypeLevel,
 *   validator,
 *   registry,
 *   isValidComposition,
 *   getRequiredLevel
 * } from './lib/russellian';
 *
 * // Check if READ -> TRANSFORM is valid
 * const result = validator.validateComposition(Axiom.READ, Axiom.TRANSFORM);
 * console.log(result.allowed); // true
 *
 * // Quick composition check
 * if (isValidComposition(Axiom.GENERATE, Axiom.WRITE)) {
 *   // This won't run - GENERATE -> WRITE is forbidden
 * }
 *
 * // Get minimum level for axioms
 * const level = getRequiredLevel([Axiom.READ, Axiom.WRITE]);
 * console.log(level); // TypeLevel.LEVEL_2
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// Re-export all types
// ═══════════════════════════════════════════════════════════════════════════

export * from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Export classes
// ═══════════════════════════════════════════════════════════════════════════

export {
  RussellianValidator,
  validator,
  isValidComposition,
  canInvokeLevel,
  type CompositionValidationResult,
  type InvocationValidationResult,
  type CycleDetectionResult,
} from './validation/engine';

export {
  DerivationCertificateGenerator,
  certificateGenerator,
  type ExecutionContext,
} from './audit/certificate';

export {
  SkillRegistry,
  registry,
  type RegistrationResult,
  type RegistryExport,
  type ImportResult,
} from './registry';

// ═══════════════════════════════════════════════════════════════════════════
// Import for helper functions
// ═══════════════════════════════════════════════════════════════════════════

import {
  Axiom,
  TypeLevel,
  type AxiomDefinition,
  type TypeLevelDefinition,
  getAxiomDefinition,
  getTypeLevelDefinition,
  getMinimumLevelForAxioms,
  isCompositionAllowed,
  canInvoke,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a composition between two axioms is valid.
 * This is a convenience wrapper around the composition rules.
 *
 * @param from - Source axiom
 * @param to - Destination axiom
 * @returns True if the composition is allowed
 *
 * @example
 * ```typescript
 * isCompositionValid(Axiom.READ, Axiom.TRANSFORM); // true
 * isCompositionValid(Axiom.GENERATE, Axiom.WRITE); // false
 * ```
 */
export function isCompositionValid(from: Axiom, to: Axiom): boolean {
  return isCompositionAllowed(from, to);
}

/**
 * Check if one type level can invoke another.
 *
 * @param callerLevel - The calling skill's type level
 * @param targetLevel - The target skill's type level
 * @returns True if invocation is allowed
 *
 * @example
 * ```typescript
 * canInvokeSkill(TypeLevel.LEVEL_3, TypeLevel.LEVEL_2); // true
 * canInvokeSkill(TypeLevel.LEVEL_2, TypeLevel.LEVEL_2); // false
 * ```
 */
export function canInvokeSkill(callerLevel: TypeLevel, targetLevel: TypeLevel): boolean {
  return canInvoke(callerLevel, targetLevel);
}

/**
 * Get the minimum required type level for a set of axioms.
 *
 * @param axioms - Array of axioms to check
 * @returns The minimum TypeLevel required
 *
 * @example
 * ```typescript
 * getRequiredLevel([Axiom.TRANSFORM]); // TypeLevel.LEVEL_0
 * getRequiredLevel([Axiom.READ]); // TypeLevel.LEVEL_1
 * getRequiredLevel([Axiom.WRITE]); // TypeLevel.LEVEL_2
 * ```
 */
export function getRequiredLevel(axioms: Axiom[]): TypeLevel {
  return getMinimumLevelForAxioms(axioms);
}

/**
 * Get information about an axiom.
 *
 * @param axiom - The axiom to look up
 * @returns The axiom's definition
 *
 * @example
 * ```typescript
 * const info = getAxiomInfo(Axiom.WRITE);
 * console.log(info.hasSideEffects); // true
 * ```
 */
export function getAxiomInfo(axiom: Axiom): AxiomDefinition {
  return getAxiomDefinition(axiom);
}

/**
 * Get information about a type level.
 *
 * @param level - The type level to look up
 * @returns The level's definition
 *
 * @example
 * ```typescript
 * const info = getLevelInfo(TypeLevel.LEVEL_2);
 * console.log(info.name); // "Writer"
 * ```
 */
export function getLevelInfo(level: TypeLevel): TypeLevelDefinition {
  return getTypeLevelDefinition(level);
}

/**
 * Validate a skill and register it if valid.
 * Convenience function combining validation and registration.
 *
 * @param skill - The skill to validate and register
 * @returns Registration result
 */
export function validateAndRegister(skill: import('./types').SkillDefinition): import('./registry').RegistrationResult {
  const { registry: reg } = require('./registry');
  return reg.register(skill);
}

// ═══════════════════════════════════════════════════════════════════════════
// Version and Metadata
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Version of the Russellian architecture.
 */
export const RUSSELLIAN_VERSION = '1.0.0';

/**
 * Architecture metadata.
 */
export const RUSSELLIAN_METADATA = {
  name: 'Russellian Architecture',
  version: RUSSELLIAN_VERSION,
  description: 'Formal validation system for skill definitions',
  inspired_by: 'Russell & Whitehead\'s Principia Mathematica',
  axiom_count: Object.keys(Axiom).length / 2, // Enum has both keys and values
  level_count: 6, // LEVEL_0 through LEVEL_5
};
