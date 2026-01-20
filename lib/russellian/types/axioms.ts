/**
 * Russellian Axioms - Primitive Operations
 *
 * Inspired by Russell & Whitehead's Principia Mathematica, axioms represent
 * the irreducible primitive operations from which all skills are composed.
 * Every skill ultimately reduces to a sequence of these axioms.
 *
 * @module russellian/types/axioms
 */

/**
 * The seven primitive axioms that form the foundation of all skill operations.
 * These are analogous to logical axioms - irreducible operations from which
 * all complex behaviors are derived.
 */
export enum Axiom {
  /** Retrieve data from an external source (API, database, file) */
  READ = 'READ',

  /** Pure function: transform data without side effects */
  TRANSFORM = 'TRANSFORM',

  /** Send data to an external destination (API, database, file) */
  WRITE = 'WRITE',

  /** Branch execution based on a condition */
  DECIDE = 'DECIDE',

  /** Create new content via LLM generation */
  GENERATE = 'GENERATE',

  /** Pause execution for an event or time duration */
  WAIT = 'WAIT',

  /** Assert a condition, halt execution if false */
  VALIDATE = 'VALIDATE',
}

/**
 * Complete definition of an axiom's properties and constraints.
 * Used by the validation engine to enforce composition rules.
 */
export interface AxiomDefinition {
  /** The axiom being defined */
  axiom: Axiom;

  /** Human-readable description of what this axiom does */
  description: string;

  /** Whether this axiom can modify external state */
  hasSideEffects: boolean;

  /** Whether calling this axiom multiple times with same input yields same result */
  isIdempotent: boolean;

  /** Whether this axiom requires input data to execute */
  inputRequired: boolean;

  /** Whether this axiom guarantees output (vs. potentially failing) */
  outputGuaranteed: boolean;
}

/**
 * Registry of all axiom definitions.
 * This is the authoritative source of truth for axiom properties.
 */
export const AXIOM_REGISTRY: Record<Axiom, AxiomDefinition> = {
  [Axiom.READ]: {
    axiom: Axiom.READ,
    description: 'Retrieve data from external source',
    hasSideEffects: false,
    isIdempotent: true,
    inputRequired: true, // Needs source specification
    outputGuaranteed: false, // External source may fail
  },

  [Axiom.TRANSFORM]: {
    axiom: Axiom.TRANSFORM,
    description: 'Pure transformation of data',
    hasSideEffects: false,
    isIdempotent: true,
    inputRequired: true,
    outputGuaranteed: true, // Pure functions always produce output
  },

  [Axiom.WRITE]: {
    axiom: Axiom.WRITE,
    description: 'Send data to external destination',
    hasSideEffects: true, // Modifies external state
    isIdempotent: false, // Multiple writes may have different effects
    inputRequired: true,
    outputGuaranteed: false, // External destination may fail
  },

  [Axiom.DECIDE]: {
    axiom: Axiom.DECIDE,
    description: 'Branch based on condition',
    hasSideEffects: false,
    isIdempotent: true,
    inputRequired: true, // Needs condition to evaluate
    outputGuaranteed: true, // Always produces a branch selection
  },

  [Axiom.GENERATE]: {
    axiom: Axiom.GENERATE,
    description: 'Create new content via LLM',
    hasSideEffects: false, // LLM call doesn't modify external state
    isIdempotent: false, // Same prompt may yield different results
    inputRequired: true, // Needs prompt/context
    outputGuaranteed: false, // LLM may fail or refuse
  },

  [Axiom.WAIT]: {
    axiom: Axiom.WAIT,
    description: 'Pause execution',
    hasSideEffects: false,
    isIdempotent: true,
    inputRequired: false, // Can wait without input (e.g., fixed duration)
    outputGuaranteed: true, // Wait always completes (or times out)
  },

  [Axiom.VALIDATE]: {
    axiom: Axiom.VALIDATE,
    description: 'Assert condition or halt',
    hasSideEffects: false,
    isIdempotent: true,
    inputRequired: true, // Needs condition to check
    outputGuaranteed: false, // Halts if validation fails
  },
};

/**
 * Get the definition for a specific axiom.
 *
 * @param axiom - The axiom to look up
 * @returns The axiom's definition
 *
 * @example
 * ```typescript
 * const readDef = getAxiomDefinition(Axiom.READ);
 * console.log(readDef.hasSideEffects); // false
 * ```
 */
export function getAxiomDefinition(axiom: Axiom): AxiomDefinition {
  return AXIOM_REGISTRY[axiom];
}

/**
 * Get all axioms that have side effects.
 * Useful for identifying operations that modify external state.
 *
 * @returns Array of axioms with side effects
 */
export function getAxiomsWithSideEffects(): Axiom[] {
  return Object.values(AXIOM_REGISTRY)
    .filter((def) => def.hasSideEffects)
    .map((def) => def.axiom);
}

/**
 * Get all idempotent axioms.
 * Useful for identifying operations safe to retry.
 *
 * @returns Array of idempotent axioms
 */
export function getIdempotentAxioms(): Axiom[] {
  return Object.values(AXIOM_REGISTRY)
    .filter((def) => def.isIdempotent)
    .map((def) => def.axiom);
}

/**
 * Check if an axiom requires input to execute.
 *
 * @param axiom - The axiom to check
 * @returns True if input is required
 */
export function axiomRequiresInput(axiom: Axiom): boolean {
  return AXIOM_REGISTRY[axiom].inputRequired;
}

/**
 * Check if an axiom guarantees output.
 *
 * @param axiom - The axiom to check
 * @returns True if output is guaranteed
 */
export function axiomGuaranteesOutput(axiom: Axiom): boolean {
  return AXIOM_REGISTRY[axiom].outputGuaranteed;
}

/**
 * Get all axiom values as an array.
 * Useful for iteration and validation.
 *
 * @returns Array of all Axiom enum values
 */
export function getAllAxioms(): Axiom[] {
  return Object.values(Axiom);
}

/**
 * Check if a string is a valid axiom.
 *
 * @param value - String to check
 * @returns True if the string is a valid Axiom
 */
export function isValidAxiom(value: string): value is Axiom {
  return Object.values(Axiom).includes(value as Axiom);
}
