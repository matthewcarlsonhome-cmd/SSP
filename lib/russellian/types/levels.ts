/**
 * Russellian Type Levels - Stratification System
 *
 * Implements Russell's theory of types to prevent self-reference paradoxes.
 * Skills at level N can only invoke skills at levels < N, preventing
 * circular dependencies and privilege escalation.
 *
 * @module russellian/types/levels
 */

import { Axiom } from './axioms';

/**
 * Type levels form a strict hierarchy where higher levels can invoke lower levels,
 * but never same-or-higher levels. This prevents paradoxes and ensures
 * well-founded execution graphs.
 */
export enum TypeLevel {
  /** Pure functions only - no external interaction */
  LEVEL_0 = 0,

  /** Can read from external sources */
  LEVEL_1 = 1,

  /** Can write to external destinations */
  LEVEL_2 = 2,

  /** Can compose and orchestrate other skills */
  LEVEL_3 = 3,

  /** Meta-skills that can create or modify other skills */
  LEVEL_4 = 4,

  /** System reserved - internal platform operations only */
  LEVEL_5 = 5,
}

/**
 * Complete definition of a type level's properties and constraints.
 */
export interface TypeLevelDefinition {
  /** The level being defined */
  level: TypeLevel;

  /** Short human-readable name */
  name: string;

  /** Detailed description of this level's capabilities */
  description: string;

  /** Which axioms can be used at this level */
  allowedAxioms: Axiom[];

  /** Which lower levels this level can invoke */
  canInvokeLevel: TypeLevel[];

  /** Whether operations at this level require explicit approval */
  requiresApproval: boolean;
}

/**
 * Registry of all type level definitions.
 * This is the authoritative source of truth for level capabilities.
 */
export const TYPE_LEVEL_REGISTRY: Record<TypeLevel, TypeLevelDefinition> = {
  [TypeLevel.LEVEL_0]: {
    level: TypeLevel.LEVEL_0,
    name: 'Pure',
    description: 'Pure transformations, no external interaction',
    allowedAxioms: [Axiom.TRANSFORM, Axiom.DECIDE, Axiom.VALIDATE],
    canInvokeLevel: [], // Cannot invoke any other levels
    requiresApproval: false,
  },

  [TypeLevel.LEVEL_1]: {
    level: TypeLevel.LEVEL_1,
    name: 'Reader',
    description: 'Can read from external sources',
    allowedAxioms: [
      Axiom.READ,
      Axiom.TRANSFORM,
      Axiom.DECIDE,
      Axiom.VALIDATE,
      Axiom.WAIT,
    ],
    canInvokeLevel: [TypeLevel.LEVEL_0],
    requiresApproval: false,
  },

  [TypeLevel.LEVEL_2]: {
    level: TypeLevel.LEVEL_2,
    name: 'Writer',
    description: 'Can write to external destinations',
    allowedAxioms: [
      Axiom.READ,
      Axiom.WRITE,
      Axiom.TRANSFORM,
      Axiom.DECIDE,
      Axiom.VALIDATE,
      Axiom.WAIT,
      Axiom.GENERATE,
    ],
    canInvokeLevel: [TypeLevel.LEVEL_0, TypeLevel.LEVEL_1],
    requiresApproval: false,
  },

  [TypeLevel.LEVEL_3]: {
    level: TypeLevel.LEVEL_3,
    name: 'Composer',
    description: 'Can invoke and orchestrate other skills',
    allowedAxioms: [
      Axiom.READ,
      Axiom.WRITE,
      Axiom.TRANSFORM,
      Axiom.DECIDE,
      Axiom.VALIDATE,
      Axiom.WAIT,
      Axiom.GENERATE,
    ],
    canInvokeLevel: [TypeLevel.LEVEL_0, TypeLevel.LEVEL_1, TypeLevel.LEVEL_2],
    requiresApproval: false,
  },

  [TypeLevel.LEVEL_4]: {
    level: TypeLevel.LEVEL_4,
    name: 'Meta',
    description: 'Can create or modify other skills',
    allowedAxioms: [
      Axiom.READ,
      Axiom.WRITE,
      Axiom.TRANSFORM,
      Axiom.DECIDE,
      Axiom.VALIDATE,
      Axiom.WAIT,
      Axiom.GENERATE,
    ],
    canInvokeLevel: [
      TypeLevel.LEVEL_0,
      TypeLevel.LEVEL_1,
      TypeLevel.LEVEL_2,
      TypeLevel.LEVEL_3,
    ],
    requiresApproval: true, // Meta-operations need approval
  },

  [TypeLevel.LEVEL_5]: {
    level: TypeLevel.LEVEL_5,
    name: 'System',
    description: 'RESERVED - System-level operations only',
    allowedAxioms: [], // No user-defined axiom usage
    canInvokeLevel: [
      TypeLevel.LEVEL_0,
      TypeLevel.LEVEL_1,
      TypeLevel.LEVEL_2,
      TypeLevel.LEVEL_3,
      TypeLevel.LEVEL_4,
    ],
    requiresApproval: true,
  },
};

/**
 * Get the definition for a specific type level.
 *
 * @param level - The type level to look up
 * @returns The level's definition
 *
 * @example
 * ```typescript
 * const writerDef = getTypeLevelDefinition(TypeLevel.LEVEL_2);
 * console.log(writerDef.name); // "Writer"
 * ```
 */
export function getTypeLevelDefinition(level: TypeLevel): TypeLevelDefinition {
  return TYPE_LEVEL_REGISTRY[level];
}

/**
 * Check if a caller level can invoke a target level.
 * Rule: callerLevel must be strictly greater than targetLevel.
 *
 * @param callerLevel - The level of the invoking skill
 * @param targetLevel - The level of the skill being invoked
 * @returns True if invocation is allowed
 *
 * @example
 * ```typescript
 * canInvoke(TypeLevel.LEVEL_3, TypeLevel.LEVEL_2); // true
 * canInvoke(TypeLevel.LEVEL_2, TypeLevel.LEVEL_2); // false (same level)
 * canInvoke(TypeLevel.LEVEL_1, TypeLevel.LEVEL_2); // false (lower invoking higher)
 * ```
 */
export function canInvoke(callerLevel: TypeLevel, targetLevel: TypeLevel): boolean {
  const callerDef = TYPE_LEVEL_REGISTRY[callerLevel];
  return callerDef.canInvokeLevel.includes(targetLevel);
}

/**
 * Check if an axiom is allowed at a given type level.
 *
 * @param level - The type level to check
 * @param axiom - The axiom to check
 * @returns True if the axiom is allowed at this level
 */
export function isAxiomAllowedAtLevel(level: TypeLevel, axiom: Axiom): boolean {
  return TYPE_LEVEL_REGISTRY[level].allowedAxioms.includes(axiom);
}

/**
 * Get the minimum type level required to use a specific axiom.
 *
 * @param axiom - The axiom to check
 * @returns The minimum TypeLevel required
 */
export function getMinimumLevelForAxiom(axiom: Axiom): TypeLevel {
  for (const level of [
    TypeLevel.LEVEL_0,
    TypeLevel.LEVEL_1,
    TypeLevel.LEVEL_2,
    TypeLevel.LEVEL_3,
    TypeLevel.LEVEL_4,
    TypeLevel.LEVEL_5,
  ]) {
    if (TYPE_LEVEL_REGISTRY[level].allowedAxioms.includes(axiom)) {
      return level;
    }
  }
  // Should never reach here if all axioms are properly registered
  return TypeLevel.LEVEL_5;
}

/**
 * Get the minimum type level required for a set of axioms.
 * Returns the maximum of individual axiom requirements.
 *
 * @param axioms - Array of axioms to check
 * @returns The minimum TypeLevel required to use all axioms
 */
export function getMinimumLevelForAxioms(axioms: Axiom[]): TypeLevel {
  if (axioms.length === 0) {
    return TypeLevel.LEVEL_0;
  }

  let maxLevel = TypeLevel.LEVEL_0;
  for (const axiom of axioms) {
    const requiredLevel = getMinimumLevelForAxiom(axiom);
    if (requiredLevel > maxLevel) {
      maxLevel = requiredLevel;
    }
  }
  return maxLevel;
}

/**
 * Check if a type level requires explicit approval.
 *
 * @param level - The type level to check
 * @returns True if operations at this level require approval
 */
export function levelRequiresApproval(level: TypeLevel): boolean {
  return TYPE_LEVEL_REGISTRY[level].requiresApproval;
}

/**
 * Get all type levels as an array, ordered from lowest to highest.
 *
 * @returns Array of all TypeLevel enum values
 */
export function getAllTypeLevels(): TypeLevel[] {
  return [
    TypeLevel.LEVEL_0,
    TypeLevel.LEVEL_1,
    TypeLevel.LEVEL_2,
    TypeLevel.LEVEL_3,
    TypeLevel.LEVEL_4,
    TypeLevel.LEVEL_5,
  ];
}

/**
 * Get the human-readable name for a type level.
 *
 * @param level - The type level
 * @returns Human-readable name (e.g., "Pure", "Reader", "Writer")
 */
export function getTypeLevelName(level: TypeLevel): string {
  return TYPE_LEVEL_REGISTRY[level].name;
}

/**
 * Check if a value is a valid TypeLevel.
 *
 * @param value - Value to check
 * @returns True if the value is a valid TypeLevel
 */
export function isValidTypeLevel(value: number): value is TypeLevel {
  return value >= TypeLevel.LEVEL_0 && value <= TypeLevel.LEVEL_5;
}

/**
 * Compare two type levels.
 *
 * @param a - First level
 * @param b - Second level
 * @returns Negative if a < b, 0 if equal, positive if a > b
 */
export function compareTypeLevels(a: TypeLevel, b: TypeLevel): number {
  return a - b;
}
