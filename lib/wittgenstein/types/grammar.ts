/**
 * Wittgensteinian Grammar
 *
 * Grammar defines what "makes sense" in a context, beyond formal validity.
 * A skill can be formally valid (Russellian) but grammatically odd
 * (Wittgensteinian) - like saying "the time is heavy."
 *
 * @module wittgenstein/types/grammar
 */

import type { Axiom } from '../../russellian/types';

/**
 * Severity levels for grammatical violations.
 * - nonsense: Makes no sense at all, should never be allowed
 * - odd: Unusual/suspicious, warrants investigation
 * - suspicious: Possibly intentional but risky
 */
export type ViolationSeverity = 'nonsense' | 'odd' | 'suspicious';

/**
 * Where a grammatical rule applies.
 */
export type GrammaticalScope =
  | { type: 'global' }
  | { type: 'game'; gameId: string }
  | { type: 'cluster'; clusterId: string }
  | { type: 'skill_pattern'; pattern: string }
  | { type: 'form_of_life'; formId: string };

/**
 * Types of grammatical checks.
 */
export type GrammaticalCheck =
  | { type: 'requires_predecessor'; axiom: Axiom; predecessors: Axiom[] }
  | { type: 'requires_successor'; axiom: Axiom; successors: Axiom[] }
  | { type: 'forbidden_in_context'; axiom: Axiom; context: string }
  | { type: 'requires_vocabulary'; terms: string[] }
  | { type: 'output_must_be_used'; axiom: Axiom }
  | { type: 'minimum_steps'; axiom: Axiom; count: number }
  | { type: 'maximum_steps'; axiom: Axiom; count: number }
  | { type: 'must_have_exit'; afterAxiom: Axiom }
  | { type: 'custom'; evaluator: string; description?: string };

/**
 * A grammatical rule defining what "makes sense."
 */
export interface GrammaticalRule {
  /** Unique identifier */
  ruleId: string;

  /** Human-readable name */
  name: string;

  /** Description of what this rule checks */
  description: string;

  /** Where this rule applies */
  appliesTo: GrammaticalScope;

  /** The check to perform */
  check: GrammaticalCheck;

  /** How serious a violation is */
  violation: ViolationSeverity;

  /** Explanation of why this rule exists */
  explanation: string;

  /** Examples of grammatical and ungrammatical usage */
  examples: {
    /** Examples that pass this rule */
    grammatical: string[];
    /** Examples that fail this rule */
    ungrammatical: string[];
  };

  /** Whether this rule is currently active */
  enabled: boolean;

  /** Priority when multiple rules conflict */
  priority?: number;
}

/**
 * A violation of a grammatical rule.
 */
export interface GrammaticalViolation {
  /** The rule that was violated */
  rule: GrammaticalRule;

  /** Where in the skill the violation occurred */
  location: string;

  /** Severity of the violation */
  severity: ViolationSeverity;

  /** Human-readable explanation */
  explanation: string;

  /** The specific check that failed */
  failedCheck: GrammaticalCheck;

  /** Suggestions for fixing the violation */
  suggestions: string[];
}

/**
 * Result of checking grammar.
 */
export interface GrammarCheckResult {
  /** The skill that was checked */
  skillId: string;

  /** Whether the skill is grammatically sound */
  isGrammatical: boolean;

  /** All violations found */
  violations: GrammaticalViolation[];

  /** Violations by severity */
  violationCounts: {
    nonsense: number;
    odd: number;
    suspicious: number;
  };

  /** Rules that passed */
  passedRules: string[];

  /** Rules that were skipped (not applicable) */
  skippedRules: string[];

  /** Context used for the check */
  context?: {
    gameId?: string;
    clusterId?: string;
  };
}

/**
 * Create a grammatical rule.
 *
 * @param ruleId - Unique identifier
 * @param name - Human-readable name
 * @param check - The check to perform
 * @param violation - Severity level
 * @returns A minimal GrammaticalRule
 */
export function createGrammaticalRule(
  ruleId: string,
  name: string,
  check: GrammaticalCheck,
  violation: ViolationSeverity
): GrammaticalRule {
  return {
    ruleId,
    name,
    description: '',
    appliesTo: { type: 'global' },
    check,
    violation,
    explanation: '',
    examples: { grammatical: [], ungrammatical: [] },
    enabled: true,
  };
}

/**
 * Create a "requires predecessor" check.
 *
 * @param axiom - The axiom that needs a predecessor
 * @param predecessors - Valid predecessors
 * @returns A GrammaticalCheck
 */
export function requiresPredecessor(
  axiom: Axiom,
  predecessors: Axiom[]
): GrammaticalCheck {
  return { type: 'requires_predecessor', axiom, predecessors };
}

/**
 * Create a "requires successor" check.
 *
 * @param axiom - The axiom that needs a successor
 * @param successors - Valid successors
 * @returns A GrammaticalCheck
 */
export function requiresSuccessor(
  axiom: Axiom,
  successors: Axiom[]
): GrammaticalCheck {
  return { type: 'requires_successor', axiom, successors };
}

/**
 * Create a "forbidden in context" check.
 *
 * @param axiom - The axiom to forbid
 * @param context - Description of the forbidden context
 * @returns A GrammaticalCheck
 */
export function forbiddenInContext(
  axiom: Axiom,
  context: string
): GrammaticalCheck {
  return { type: 'forbidden_in_context', axiom, context };
}

/**
 * Create a "requires vocabulary" check.
 *
 * @param terms - Terms that must be in the vocabulary
 * @returns A GrammaticalCheck
 */
export function requiresVocabulary(terms: string[]): GrammaticalCheck {
  return { type: 'requires_vocabulary', terms };
}

/**
 * Create a "output must be used" check.
 *
 * @param axiom - The axiom whose output must be consumed
 * @returns A GrammaticalCheck
 */
export function outputMustBeUsed(axiom: Axiom): GrammaticalCheck {
  return { type: 'output_must_be_used', axiom };
}

/**
 * Create a violation.
 *
 * @param rule - The violated rule
 * @param location - Where the violation occurred
 * @param explanation - What went wrong
 * @returns A GrammaticalViolation
 */
export function createViolation(
  rule: GrammaticalRule,
  location: string,
  explanation: string
): GrammaticalViolation {
  return {
    rule,
    location,
    severity: rule.violation,
    explanation,
    failedCheck: rule.check,
    suggestions: [],
  };
}

/**
 * Create an empty grammar check result.
 *
 * @param skillId - The skill being checked
 * @returns An empty GrammarCheckResult
 */
export function createEmptyGrammarResult(skillId: string): GrammarCheckResult {
  return {
    skillId,
    isGrammatical: true,
    violations: [],
    violationCounts: { nonsense: 0, odd: 0, suspicious: 0 },
    passedRules: [],
    skippedRules: [],
  };
}

/**
 * Add a violation to a grammar check result.
 *
 * @param result - The result to modify
 * @param violation - The violation to add
 */
export function addViolationToResult(
  result: GrammarCheckResult,
  violation: GrammaticalViolation
): void {
  result.violations.push(violation);
  result.violationCounts[violation.severity]++;

  // Any violation makes it ungrammatical
  if (violation.severity === 'nonsense') {
    result.isGrammatical = false;
  }
}

/**
 * Check if a result has any nonsense violations.
 *
 * @param result - The result to check
 * @returns True if there are nonsense violations
 */
export function hasNonsense(result: GrammarCheckResult): boolean {
  return result.violationCounts.nonsense > 0;
}

/**
 * Check if a result has any violations.
 *
 * @param result - The result to check
 * @returns True if there are any violations
 */
export function hasViolations(result: GrammarCheckResult): boolean {
  return result.violations.length > 0;
}

/**
 * Get violations of a specific severity.
 *
 * @param result - The result to filter
 * @param severity - The severity to filter by
 * @returns Violations of that severity
 */
export function getViolationsBySeverity(
  result: GrammarCheckResult,
  severity: ViolationSeverity
): GrammaticalViolation[] {
  return result.violations.filter((v) => v.severity === severity);
}

/**
 * Format a violation for display.
 *
 * @param violation - The violation to format
 * @returns Formatted string
 */
export function formatViolation(violation: GrammaticalViolation): string {
  const icon = violation.severity === 'nonsense' ? '✗' :
    violation.severity === 'odd' ? '⚠' : '?';
  return `${icon} [${violation.rule.ruleId}] ${violation.explanation} (at ${violation.location})`;
}
