/**
 * Grammar Engine
 *
 * Checks if skills "make sense" beyond formal validity.
 * A skill can be formally valid but grammatically odd.
 *
 * @module wittgenstein/grammar/engine
 */

import type { Axiom, SkillDefinition } from '../../russellian/types';
import type {
  GrammaticalRule,
  GrammaticalViolation,
  GrammaticalCheck,
  GrammarCheckResult,
  ViolationSeverity,
} from '../types';
import {
  createGrammaticalRule,
  requiresPredecessor,
  requiresSuccessor,
  forbiddenInContext,
  outputMustBeUsed,
  createViolation,
  createEmptyGrammarResult,
  addViolationToResult,
} from '../types';

/**
 * Engine for checking grammatical sense.
 */
export class GrammarEngine {
  private rules: Map<string, GrammaticalRule> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * Register a grammatical rule.
   *
   * @param rule - The rule to register
   */
  registerRule(rule: GrammaticalRule): void {
    this.rules.set(rule.ruleId, rule);
  }

  /**
   * Get a rule by ID.
   *
   * @param ruleId - The rule ID
   * @returns The rule, or null
   */
  getRule(ruleId: string): GrammaticalRule | null {
    return this.rules.get(ruleId) || null;
  }

  /**
   * Get all registered rules.
   */
  getAllRules(): GrammaticalRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by scope type.
   *
   * @param scopeType - The scope type to filter by
   */
  getRulesByScope(scopeType: string): GrammaticalRule[] {
    return Array.from(this.rules.values()).filter(
      (r) => r.appliesTo.type === scopeType
    );
  }

  /**
   * Check a skill against all applicable rules.
   *
   * @param skill - The skill to check
   * @param context - Optional context for scoped rules
   * @returns Grammar check result
   */
  checkGrammar(
    skill: SkillDefinition,
    context?: { gameId?: string; clusterId?: string }
  ): GrammarCheckResult {
    const result = createEmptyGrammarResult(skill.skillId);
    result.context = context;

    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        result.skippedRules.push(rule.ruleId);
        continue;
      }

      // Check if rule applies to this context
      if (!this.ruleApplies(rule, context)) {
        result.skippedRules.push(rule.ruleId);
        continue;
      }

      // Check the rule
      const violation = this.checkRule(skill, rule);
      if (violation) {
        addViolationToResult(result, violation);
      } else {
        result.passedRules.push(rule.ruleId);
      }
    }

    return result;
  }

  /**
   * Check a specific rule against a skill.
   *
   * @param skill - The skill to check
   * @param rule - The rule to check
   * @returns Violation if rule is violated, null otherwise
   */
  checkRule(skill: SkillDefinition, rule: GrammaticalRule): GrammaticalViolation | null {
    const check = rule.check;

    switch (check.type) {
      case 'requires_predecessor':
        return this.checkRequiresPredecessor(skill, rule, check);

      case 'requires_successor':
        return this.checkRequiresSuccessor(skill, rule, check);

      case 'forbidden_in_context':
        return this.checkForbiddenInContext(skill, rule, check);

      case 'requires_vocabulary':
        return this.checkRequiresVocabulary(skill, rule, check);

      case 'output_must_be_used':
        return this.checkOutputMustBeUsed(skill, rule, check);

      case 'minimum_steps':
        return this.checkMinimumSteps(skill, rule, check);

      case 'maximum_steps':
        return this.checkMaximumSteps(skill, rule, check);

      case 'must_have_exit':
        return this.checkMustHaveExit(skill, rule, check);

      case 'custom':
        // Custom checks would need runtime evaluation
        return null;

      default:
        return null;
    }
  }

  /**
   * Enable a rule.
   *
   * @param ruleId - The rule ID
   */
  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  /**
   * Disable a rule.
   *
   * @param ruleId - The rule ID
   */
  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  /**
   * Unregister a rule.
   *
   * @param ruleId - The rule ID
   * @returns True if removed
   */
  unregisterRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get statistics about the engine.
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    rulesBySeverity: Record<ViolationSeverity, number>;
  } {
    const rules = Array.from(this.rules.values());
    const rulesBySeverity: Record<ViolationSeverity, number> = {
      nonsense: 0,
      odd: 0,
      suspicious: 0,
    };

    for (const rule of rules) {
      rulesBySeverity[rule.violation]++;
    }

    return {
      totalRules: rules.length,
      enabledRules: rules.filter((r) => r.enabled).length,
      rulesBySeverity,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if a rule applies given the context.
   */
  private ruleApplies(
    rule: GrammaticalRule,
    context?: { gameId?: string; clusterId?: string }
  ): boolean {
    const scope = rule.appliesTo;

    switch (scope.type) {
      case 'global':
        return true;

      case 'game':
        return context?.gameId === scope.gameId;

      case 'cluster':
        return context?.clusterId === scope.clusterId;

      case 'skill_pattern':
        // Would need to match skill ID/name pattern
        return true;

      case 'form_of_life':
        // Would need form of life context
        return true;

      default:
        return true;
    }
  }

  /**
   * Check requires_predecessor rule.
   */
  private checkRequiresPredecessor(
    skill: SkillDefinition,
    rule: GrammaticalRule,
    check: { type: 'requires_predecessor'; axiom: Axiom; predecessors: Axiom[] }
  ): GrammaticalViolation | null {
    // Find steps with the target axiom
    const targetSteps = skill.steps.filter((s) => s.axiom === check.axiom);

    for (const step of targetSteps) {
      // Find predecessors of this step
      const incomingConnections = skill.connections.filter(
        (c) => c.toStepId === step.stepId
      );

      if (incomingConnections.length === 0) {
        // Step has no predecessors - check if it's the entry
        if (step.stepId !== skill.entryStepId) {
          // Orphan step with required predecessor
          return createViolation(
            rule,
            step.stepId,
            `${check.axiom} at ${step.stepId} has no predecessor but requires one of: ${check.predecessors.join(', ')}`
          );
        }
        // Entry step - might be OK or might need a predecessor
        // For now, allow entry steps without predecessors
        continue;
      }

      // Check if any predecessor is in the allowed list
      const hasValidPredecessor = incomingConnections.some((conn) => {
        const fromStep = skill.steps.find((s) => s.stepId === conn.fromStepId);
        return fromStep && check.predecessors.includes(fromStep.axiom);
      });

      if (!hasValidPredecessor) {
        const actualPredecessors = incomingConnections
          .map((conn) => {
            const fromStep = skill.steps.find((s) => s.stepId === conn.fromStepId);
            return fromStep?.axiom || 'unknown';
          })
          .join(', ');

        return createViolation(
          rule,
          step.stepId,
          `${check.axiom} at ${step.stepId} has predecessors [${actualPredecessors}] but requires: ${check.predecessors.join(', ')}`
        );
      }
    }

    return null;
  }

  /**
   * Check requires_successor rule.
   */
  private checkRequiresSuccessor(
    skill: SkillDefinition,
    rule: GrammaticalRule,
    check: { type: 'requires_successor'; axiom: Axiom; successors: Axiom[] }
  ): GrammaticalViolation | null {
    const targetSteps = skill.steps.filter((s) => s.axiom === check.axiom);

    for (const step of targetSteps) {
      // Find successors of this step
      const outgoingConnections = skill.connections.filter(
        (c) => c.fromStepId === step.stepId
      );

      if (outgoingConnections.length === 0) {
        // Check if it's an exit step
        if (!skill.exitStepIds.includes(step.stepId)) {
          return createViolation(
            rule,
            step.stepId,
            `${check.axiom} at ${step.stepId} has no successor but requires one of: ${check.successors.join(', ')}`
          );
        }
        // Exit step - might be OK
        continue;
      }

      // Check if any successor is in the allowed list
      const hasValidSuccessor = outgoingConnections.some((conn) => {
        const toStep = skill.steps.find((s) => s.stepId === conn.toStepId);
        return toStep && check.successors.includes(toStep.axiom);
      });

      if (!hasValidSuccessor) {
        const actualSuccessors = outgoingConnections
          .map((conn) => {
            const toStep = skill.steps.find((s) => s.stepId === conn.toStepId);
            return toStep?.axiom || 'unknown';
          })
          .join(', ');

        return createViolation(
          rule,
          step.stepId,
          `${check.axiom} at ${step.stepId} has successors [${actualSuccessors}] but requires: ${check.successors.join(', ')}`
        );
      }
    }

    return null;
  }

  /**
   * Check forbidden_in_context rule.
   */
  private checkForbiddenInContext(
    skill: SkillDefinition,
    rule: GrammaticalRule,
    check: { type: 'forbidden_in_context'; axiom: Axiom; context: string }
  ): GrammaticalViolation | null {
    const hasAxiom = skill.steps.some((s) => s.axiom === check.axiom);

    if (hasAxiom) {
      // Check if context applies (simplified - check tags/name)
      const skillText = `${skill.name} ${skill.description} ${skill.tags.join(' ')}`.toLowerCase();
      if (skillText.includes(check.context.toLowerCase())) {
        const step = skill.steps.find((s) => s.axiom === check.axiom);
        return createViolation(
          rule,
          step?.stepId || 'unknown',
          `${check.axiom} is forbidden in context "${check.context}"`
        );
      }
    }

    return null;
  }

  /**
   * Check requires_vocabulary rule.
   */
  private checkRequiresVocabulary(
    skill: SkillDefinition,
    rule: GrammaticalRule,
    check: { type: 'requires_vocabulary'; terms: string[] }
  ): GrammaticalViolation | null {
    const skillText = `${skill.name} ${skill.description}`.toLowerCase();
    const missingTerms = check.terms.filter(
      (term) => !skillText.includes(term.toLowerCase())
    );

    if (missingTerms.length > 0) {
      return createViolation(
        rule,
        'skill',
        `Skill is missing required vocabulary: ${missingTerms.join(', ')}`
      );
    }

    return null;
  }

  /**
   * Check output_must_be_used rule.
   */
  private checkOutputMustBeUsed(
    skill: SkillDefinition,
    rule: GrammaticalRule,
    check: { type: 'output_must_be_used'; axiom: Axiom }
  ): GrammaticalViolation | null {
    const targetSteps = skill.steps.filter((s) => s.axiom === check.axiom);

    for (const step of targetSteps) {
      // Check if this step's output is used (has outgoing connections)
      const hasOutgoing = skill.connections.some(
        (c) => c.fromStepId === step.stepId
      );
      const isExit = skill.exitStepIds.includes(step.stepId);

      if (!hasOutgoing && !isExit) {
        return createViolation(
          rule,
          step.stepId,
          `Output of ${check.axiom} at ${step.stepId} is not used`
        );
      }
    }

    return null;
  }

  /**
   * Check minimum_steps rule.
   */
  private checkMinimumSteps(
    skill: SkillDefinition,
    rule: GrammaticalRule,
    check: { type: 'minimum_steps'; axiom: Axiom; count: number }
  ): GrammaticalViolation | null {
    const count = skill.steps.filter((s) => s.axiom === check.axiom).length;

    if (count < check.count) {
      return createViolation(
        rule,
        'skill',
        `Skill has ${count} ${check.axiom} step(s) but requires at least ${check.count}`
      );
    }

    return null;
  }

  /**
   * Check maximum_steps rule.
   */
  private checkMaximumSteps(
    skill: SkillDefinition,
    rule: GrammaticalRule,
    check: { type: 'maximum_steps'; axiom: Axiom; count: number }
  ): GrammaticalViolation | null {
    const count = skill.steps.filter((s) => s.axiom === check.axiom).length;

    if (count > check.count) {
      return createViolation(
        rule,
        'skill',
        `Skill has ${count} ${check.axiom} step(s) but maximum is ${check.count}`
      );
    }

    return null;
  }

  /**
   * Check must_have_exit rule.
   */
  private checkMustHaveExit(
    skill: SkillDefinition,
    rule: GrammaticalRule,
    check: { type: 'must_have_exit'; afterAxiom: Axiom }
  ): GrammaticalViolation | null {
    const targetSteps = skill.steps.filter((s) => s.axiom === check.afterAxiom);

    for (const step of targetSteps) {
      // Check if this step leads to an exit (directly or transitively)
      const leadsToExit = this.leadsToExit(skill, step.stepId, new Set());

      if (!leadsToExit) {
        return createViolation(
          rule,
          step.stepId,
          `${check.afterAxiom} at ${step.stepId} does not lead to an exit`
        );
      }
    }

    return null;
  }

  /**
   * Check if a step leads to an exit (DFS).
   */
  private leadsToExit(
    skill: SkillDefinition,
    stepId: string,
    visited: Set<string>
  ): boolean {
    if (visited.has(stepId)) return false;
    if (skill.exitStepIds.includes(stepId)) return true;

    visited.add(stepId);

    const outgoing = skill.connections.filter((c) => c.fromStepId === stepId);
    return outgoing.some((conn) => this.leadsToExit(skill, conn.toStepId, visited));
  }

  /**
   * Register default grammar rules.
   */
  private registerDefaultRules(): void {
    // Rule: WRITE should usually follow READ or TRANSFORM
    const writeAfterDataRule = createGrammaticalRule(
      'write-after-data',
      'WRITE needs data source',
      requiresPredecessor('WRITE' as Axiom, ['READ' as Axiom, 'TRANSFORM' as Axiom, 'GENERATE' as Axiom, 'DECIDE' as Axiom]),
      'odd'
    );
    writeAfterDataRule.description = 'WRITE should receive data from a data-producing step';
    writeAfterDataRule.explanation = 'Writing without reading or transforming data first is unusual';
    writeAfterDataRule.examples = {
      grammatical: ['READ → TRANSFORM → WRITE', 'GENERATE → WRITE'],
      ungrammatical: ['WRITE (alone)', 'VALIDATE → WRITE (without data)'],
    };
    this.rules.set(writeAfterDataRule.ruleId, writeAfterDataRule);

    // Rule: GENERATE output should be used
    const generateOutputUsedRule = createGrammaticalRule(
      'generate-output-used',
      'GENERATE output must be used',
      outputMustBeUsed('GENERATE' as Axiom),
      'suspicious'
    );
    generateOutputUsedRule.description = 'Generated content should be written or transformed';
    generateOutputUsedRule.explanation = 'Generating content that is never used is wasteful';
    generateOutputUsedRule.examples = {
      grammatical: ['GENERATE → WRITE', 'GENERATE → VALIDATE → WRITE'],
      ungrammatical: ['GENERATE (dead end)'],
    };
    this.rules.set(generateOutputUsedRule.ruleId, generateOutputUsedRule);

    // Rule: VALIDATE should have successor
    const validateHasSuccessorRule = createGrammaticalRule(
      'validate-has-successor',
      'VALIDATE needs handling',
      requiresSuccessor('VALIDATE' as Axiom, ['DECIDE' as Axiom, 'WRITE' as Axiom, 'TRANSFORM' as Axiom]),
      'odd'
    );
    validateHasSuccessorRule.description = 'Validation results should be acted upon';
    validateHasSuccessorRule.explanation = 'Validating without handling the result is pointless';
    validateHasSuccessorRule.examples = {
      grammatical: ['VALIDATE → DECIDE', 'VALIDATE → WRITE'],
      ungrammatical: ['VALIDATE (alone at end)'],
    };
    this.rules.set(validateHasSuccessorRule.ruleId, validateHasSuccessorRule);

    // Rule: Don't GENERATE then immediately GENERATE (redundant)
    const noDoubleGenerateRule = createGrammaticalRule(
      'no-double-generate',
      'No consecutive GENERATE',
      { type: 'maximum_steps', axiom: 'GENERATE' as Axiom, count: 2 },
      'suspicious'
    );
    noDoubleGenerateRule.description = 'Multiple GENERATE steps in sequence is usually redundant';
    noDoubleGenerateRule.explanation = 'Consider combining generation steps or adding transformation between them';
    this.rules.set(noDoubleGenerateRule.ruleId, noDoubleGenerateRule);

    // Rule: READ output should be used
    const readOutputUsedRule = createGrammaticalRule(
      'read-output-used',
      'READ output must be used',
      outputMustBeUsed('READ' as Axiom),
      'nonsense'
    );
    readOutputUsedRule.description = 'Data read should be processed or written';
    readOutputUsedRule.explanation = 'Reading data that is never used makes no sense';
    readOutputUsedRule.examples = {
      grammatical: ['READ → TRANSFORM', 'READ → WRITE'],
      ungrammatical: ['READ (dead end)'],
    };
    this.rules.set(readOutputUsedRule.ruleId, readOutputUsedRule);

    // Rule: DECIDE should lead to different paths
    const decideHasBranchingRule = createGrammaticalRule(
      'decide-should-branch',
      'DECIDE should have multiple paths',
      requiresSuccessor('DECIDE' as Axiom, ['WRITE' as Axiom, 'TRANSFORM' as Axiom, 'GENERATE' as Axiom, 'READ' as Axiom, 'VALIDATE' as Axiom, 'WAIT' as Axiom]),
      'odd'
    );
    decideHasBranchingRule.description = 'DECIDE should route to different actions';
    decideHasBranchingRule.explanation = 'A decision point that does not affect flow is unnecessary';
    this.rules.set(decideHasBranchingRule.ruleId, decideHasBranchingRule);

    // Rule: WAIT should have something after it
    const waitHasSuccessorRule = createGrammaticalRule(
      'wait-has-successor',
      'WAIT needs continuation',
      requiresSuccessor('WAIT' as Axiom, ['READ' as Axiom, 'WRITE' as Axiom, 'TRANSFORM' as Axiom, 'GENERATE' as Axiom, 'DECIDE' as Axiom, 'VALIDATE' as Axiom]),
      'nonsense'
    );
    waitHasSuccessorRule.description = 'Waiting should be followed by an action';
    waitHasSuccessorRule.explanation = 'Waiting at the end of a skill makes no sense';
    this.rules.set(waitHasSuccessorRule.ruleId, waitHasSuccessorRule);
  }
}

/**
 * Singleton instance of the grammar engine.
 */
export const grammarEngine = new GrammarEngine();
