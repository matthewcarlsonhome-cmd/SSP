/**
 * Russellian Composition Rules
 *
 * Defines which axioms can connect to which in a skill definition.
 * These rules encode structural constraints that prevent invalid
 * compositions at design time, before execution.
 *
 * @module russellian/types/rules
 */

import { Axiom } from './axioms';

/**
 * A composition rule defining whether one axiom can connect to another.
 * Wildcards ("*") match any axiom.
 */
export interface CompositionRule {
  /** Unique identifier for this rule */
  id: string;

  /** Short name for the rule */
  name: string;

  /** Human-readable description of what this rule enforces */
  description: string;

  /** The axiom at the source of the connection, or "*" for any */
  fromAxiom: Axiom | '*';

  /** The axiom at the destination of the connection, or "*" for any */
  toAxiom: Axiom | '*';

  /** Whether this connection is allowed */
  allowed: boolean;

  /** Explanation of why this rule exists (for forbidden rules) */
  reason?: string;
}

/**
 * The complete set of composition rules.
 * Rules are checked in order; first matching rule wins.
 * Forbidden rules are checked before allowed rules to ensure safety.
 */
export const COMPOSITION_RULES: CompositionRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // FORBIDDEN RULES (checked first for safety)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'rule_101',
    name: 'no_generate_chain',
    description: 'GENERATE cannot chain to another GENERATE',
    fromAxiom: Axiom.GENERATE,
    toAxiom: Axiom.GENERATE,
    allowed: false,
    reason: 'LLM output must be processed before another LLM call',
  },

  {
    id: 'rule_102',
    name: 'no_decide_chain',
    description: 'DECIDE cannot chain to another DECIDE',
    fromAxiom: Axiom.DECIDE,
    toAxiom: Axiom.DECIDE,
    allowed: false,
    reason: 'Decisions must have actions between them',
  },

  {
    id: 'rule_103',
    name: 'no_write_chain',
    description: 'WRITE cannot chain to another WRITE',
    fromAxiom: Axiom.WRITE,
    toAxiom: Axiom.WRITE,
    allowed: false,
    reason: 'Writes must be batched or explicitly sequenced',
  },

  {
    id: 'rule_104',
    name: 'no_read_to_write',
    description: 'READ cannot directly feed WRITE',
    fromAxiom: Axiom.READ,
    toAxiom: Axiom.WRITE,
    allowed: false,
    reason: 'Data must be transformed before writing',
  },

  {
    id: 'rule_105',
    name: 'no_generate_to_write',
    description: 'GENERATE cannot directly feed WRITE',
    fromAxiom: Axiom.GENERATE,
    toAxiom: Axiom.WRITE,
    allowed: false,
    reason: 'LLM output must be validated before writing',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ALLOWED RULES (specific rules before wildcards)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'rule_001',
    name: 'read_to_transform',
    description: 'READ output can feed TRANSFORM',
    fromAxiom: Axiom.READ,
    toAxiom: Axiom.TRANSFORM,
    allowed: true,
  },

  {
    id: 'rule_002',
    name: 'transform_chain',
    description: 'TRANSFORM can chain to another TRANSFORM',
    fromAxiom: Axiom.TRANSFORM,
    toAxiom: Axiom.TRANSFORM,
    allowed: true,
  },

  {
    id: 'rule_003',
    name: 'transform_to_write',
    description: 'TRANSFORM can feed WRITE',
    fromAxiom: Axiom.TRANSFORM,
    toAxiom: Axiom.WRITE,
    allowed: true,
  },

  {
    id: 'rule_004',
    name: 'transform_to_decide',
    description: 'TRANSFORM can feed DECIDE',
    fromAxiom: Axiom.TRANSFORM,
    toAxiom: Axiom.DECIDE,
    allowed: true,
  },

  {
    id: 'rule_005',
    name: 'decide_to_any',
    description: 'DECIDE branches can lead anywhere',
    fromAxiom: Axiom.DECIDE,
    toAxiom: '*',
    allowed: true,
  },

  {
    id: 'rule_006',
    name: 'generate_to_transform',
    description: 'GENERATE output must be transformed',
    fromAxiom: Axiom.GENERATE,
    toAxiom: Axiom.TRANSFORM,
    allowed: true,
  },

  {
    id: 'rule_007',
    name: 'read_to_generate',
    description: 'READ can feed GENERATE',
    fromAxiom: Axiom.READ,
    toAxiom: Axiom.GENERATE,
    allowed: true,
  },

  {
    id: 'rule_008',
    name: 'transform_to_generate',
    description: 'TRANSFORM can prepare prompts for GENERATE',
    fromAxiom: Axiom.TRANSFORM,
    toAxiom: Axiom.GENERATE,
    allowed: true,
  },

  {
    id: 'rule_009',
    name: 'validate_to_any',
    description: 'VALIDATE can proceed to anything',
    fromAxiom: Axiom.VALIDATE,
    toAxiom: '*',
    allowed: true,
  },

  {
    id: 'rule_010',
    name: 'any_to_validate',
    description: 'Anything can be validated',
    fromAxiom: '*',
    toAxiom: Axiom.VALIDATE,
    allowed: true,
  },

  {
    id: 'rule_011',
    name: 'read_to_read',
    description: 'Sequential reads are allowed',
    fromAxiom: Axiom.READ,
    toAxiom: Axiom.READ,
    allowed: true,
  },

  {
    id: 'rule_012',
    name: 'wait_to_any',
    description: 'WAIT can proceed to anything',
    fromAxiom: Axiom.WAIT,
    toAxiom: '*',
    allowed: true,
  },

  {
    id: 'rule_013',
    name: 'any_to_wait',
    description: 'Anything can precede WAIT',
    fromAxiom: '*',
    toAxiom: Axiom.WAIT,
    allowed: true,
  },

  {
    id: 'rule_014',
    name: 'read_to_decide',
    description: 'READ can feed DECIDE',
    fromAxiom: Axiom.READ,
    toAxiom: Axiom.DECIDE,
    allowed: true,
  },

  {
    id: 'rule_015',
    name: 'generate_to_validate',
    description: 'GENERATE output should be validated',
    fromAxiom: Axiom.GENERATE,
    toAxiom: Axiom.VALIDATE,
    allowed: true,
  },

  {
    id: 'rule_016',
    name: 'generate_to_decide',
    description: 'GENERATE can feed DECIDE for routing',
    fromAxiom: Axiom.GENERATE,
    toAxiom: Axiom.DECIDE,
    allowed: true,
  },

  {
    id: 'rule_017',
    name: 'write_to_read',
    description: 'WRITE can be followed by READ for verification',
    fromAxiom: Axiom.WRITE,
    toAxiom: Axiom.READ,
    allowed: true,
  },

  {
    id: 'rule_018',
    name: 'write_to_validate',
    description: 'WRITE can be followed by VALIDATE to confirm',
    fromAxiom: Axiom.WRITE,
    toAxiom: Axiom.VALIDATE,
    allowed: true,
  },

  {
    id: 'rule_019',
    name: 'write_to_transform',
    description: 'WRITE result can be transformed',
    fromAxiom: Axiom.WRITE,
    toAxiom: Axiom.TRANSFORM,
    allowed: true,
  },

  {
    id: 'rule_020',
    name: 'write_to_decide',
    description: 'WRITE result can feed decision',
    fromAxiom: Axiom.WRITE,
    toAxiom: Axiom.DECIDE,
    allowed: true,
  },
];

/**
 * Find the composition rule that applies to a given axiom pair.
 * Returns the first matching rule (order matters).
 *
 * @param from - The source axiom
 * @param to - The destination axiom
 * @returns The matching rule, or null if no rule matches
 *
 * @example
 * ```typescript
 * const rule = findCompositionRule(Axiom.READ, Axiom.TRANSFORM);
 * // rule_001: allowed
 *
 * const rule2 = findCompositionRule(Axiom.GENERATE, Axiom.GENERATE);
 * // rule_101: forbidden
 * ```
 */
export function findCompositionRule(from: Axiom, to: Axiom): CompositionRule | null {
  for (const rule of COMPOSITION_RULES) {
    const fromMatch = rule.fromAxiom === '*' || rule.fromAxiom === from;
    const toMatch = rule.toAxiom === '*' || rule.toAxiom === to;

    if (fromMatch && toMatch) {
      return rule;
    }
  }
  return null;
}

/**
 * Check if a composition from one axiom to another is allowed.
 *
 * @param from - The source axiom
 * @param to - The destination axiom
 * @returns True if the composition is allowed
 */
export function isCompositionAllowed(from: Axiom, to: Axiom): boolean {
  const rule = findCompositionRule(from, to);
  return rule !== null && rule.allowed;
}

/**
 * Get all forbidden composition rules.
 *
 * @returns Array of forbidden CompositionRules
 */
export function getForbiddenRules(): CompositionRule[] {
  return COMPOSITION_RULES.filter((rule) => !rule.allowed);
}

/**
 * Get all allowed composition rules.
 *
 * @returns Array of allowed CompositionRules
 */
export function getAllowedRules(): CompositionRule[] {
  return COMPOSITION_RULES.filter((rule) => rule.allowed);
}

/**
 * Get all rules that apply to a specific source axiom.
 *
 * @param axiom - The source axiom to filter by
 * @returns Array of rules with this axiom as the source
 */
export function getRulesFromAxiom(axiom: Axiom): CompositionRule[] {
  return COMPOSITION_RULES.filter(
    (rule) => rule.fromAxiom === axiom || rule.fromAxiom === '*'
  );
}

/**
 * Get all rules that apply to a specific destination axiom.
 *
 * @param axiom - The destination axiom to filter by
 * @returns Array of rules with this axiom as the destination
 */
export function getRulesToAxiom(axiom: Axiom): CompositionRule[] {
  return COMPOSITION_RULES.filter(
    (rule) => rule.toAxiom === axiom || rule.toAxiom === '*'
  );
}

/**
 * Get a rule by its ID.
 *
 * @param id - The rule ID (e.g., "rule_001")
 * @returns The rule, or null if not found
 */
export function getRuleById(id: string): CompositionRule | null {
  return COMPOSITION_RULES.find((rule) => rule.id === id) || null;
}

/**
 * Validate that the composition rules are internally consistent.
 * Used for self-testing the rule set.
 *
 * @returns Array of any inconsistency warnings
 */
export function validateRuleConsistency(): string[] {
  const warnings: string[] = [];
  const seenIds = new Set<string>();

  for (const rule of COMPOSITION_RULES) {
    // Check for duplicate IDs
    if (seenIds.has(rule.id)) {
      warnings.push(`Duplicate rule ID: ${rule.id}`);
    }
    seenIds.add(rule.id);

    // Check forbidden rules have reasons
    if (!rule.allowed && !rule.reason) {
      warnings.push(`Forbidden rule ${rule.id} missing reason`);
    }
  }

  return warnings;
}
