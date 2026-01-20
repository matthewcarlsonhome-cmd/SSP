/**
 * Russellian Validation Engine
 *
 * Provides comprehensive validation of skill definitions against
 * the Russellian type system rules. Catches errors at design time
 * before execution.
 *
 * @module russellian/validation/engine
 */

import {
  Axiom,
  TypeLevel,
  type SkillDefinition,
  type SkillStep,
  type SkillConnection,
  type CompositionRule,
  type ValidationResult,
  type ValidationError,
  findCompositionRule,
  isAxiomAllowedAtLevel,
  getMinimumLevelForAxioms,
  canInvoke,
  getTypeLevelDefinition,
  createEmptyValidationResult,
  addValidationError,
  createValidationError,
  COMPOSITION_ERROR_CODES,
  LEVEL_ERROR_CODES,
  STRUCTURE_ERROR_CODES,
  REFERENCE_ERROR_CODES,
  WARNING_CODES,
} from '../types';

/**
 * Result of a composition validation check.
 */
export interface CompositionValidationResult {
  /** Whether the composition is allowed */
  allowed: boolean;

  /** The rule that determined the result */
  rule: CompositionRule | null;

  /** Explanation if not allowed */
  reason?: string;
}

/**
 * Result of an invocation validation check.
 */
export interface InvocationValidationResult {
  /** Whether the invocation is allowed */
  allowed: boolean;

  /** Explanation of the result */
  reason: string;
}

/**
 * Result of circular dependency detection.
 */
export interface CycleDetectionResult {
  /** Whether a cycle was detected */
  hasCycle: boolean;

  /** The path of the cycle if found */
  cyclePath?: string[];
}

/**
 * The Russellian Validator enforces all composition and type level rules.
 * Use this to validate skill definitions before registration or execution.
 */
export class RussellianValidator {
  /**
   * Check if two axioms can be connected in sequence.
   *
   * @param from - The source axiom
   * @param to - The destination axiom
   * @returns Validation result with rule and reason
   *
   * @example
   * ```typescript
   * const validator = new RussellianValidator();
   * const result = validator.validateComposition(Axiom.READ, Axiom.TRANSFORM);
   * // { allowed: true, rule: { id: 'rule_001', ... } }
   *
   * const result2 = validator.validateComposition(Axiom.GENERATE, Axiom.WRITE);
   * // { allowed: false, rule: { id: 'rule_105', ... }, reason: 'LLM output must be validated...' }
   * ```
   */
  validateComposition(from: Axiom, to: Axiom): CompositionValidationResult {
    const rule = findCompositionRule(from, to);

    if (rule === null) {
      return {
        allowed: false,
        rule: null,
        reason: `No composition rule found for ${from} -> ${to}. This connection is not explicitly allowed.`,
      };
    }

    return {
      allowed: rule.allowed,
      rule,
      reason: rule.allowed ? undefined : rule.reason,
    };
  }

  /**
   * Check if a caller at one level can invoke a skill at another level.
   * Rule: callerLevel must be strictly greater than targetLevel.
   *
   * @param callerLevel - The type level of the invoking skill
   * @param targetLevel - The type level of the skill being invoked
   * @returns Validation result with explanation
   *
   * @example
   * ```typescript
   * validator.validateInvocation(TypeLevel.LEVEL_3, TypeLevel.LEVEL_2);
   * // { allowed: true, reason: 'LEVEL_3 (Composer) can invoke LEVEL_2 (Writer)' }
   *
   * validator.validateInvocation(TypeLevel.LEVEL_2, TypeLevel.LEVEL_2);
   * // { allowed: false, reason: 'Same-level invocation is forbidden...' }
   * ```
   */
  validateInvocation(callerLevel: TypeLevel, targetLevel: TypeLevel): InvocationValidationResult {
    if (callerLevel === targetLevel) {
      return {
        allowed: false,
        reason: `Same-level invocation is forbidden. ${getTypeLevelDefinition(callerLevel).name} (LEVEL_${callerLevel}) cannot invoke itself or same-level skills.`,
      };
    }

    if (callerLevel < targetLevel) {
      return {
        allowed: false,
        reason: `Lower level cannot invoke higher level. ${getTypeLevelDefinition(callerLevel).name} (LEVEL_${callerLevel}) cannot invoke ${getTypeLevelDefinition(targetLevel).name} (LEVEL_${targetLevel}).`,
      };
    }

    if (!canInvoke(callerLevel, targetLevel)) {
      return {
        allowed: false,
        reason: `${getTypeLevelDefinition(callerLevel).name} (LEVEL_${callerLevel}) is not configured to invoke ${getTypeLevelDefinition(targetLevel).name} (LEVEL_${targetLevel}).`,
      };
    }

    return {
      allowed: true,
      reason: `${getTypeLevelDefinition(callerLevel).name} (LEVEL_${callerLevel}) can invoke ${getTypeLevelDefinition(targetLevel).name} (LEVEL_${targetLevel}).`,
    };
  }

  /**
   * Compute the minimum required type level for a skill based on:
   * 1. The axioms it uses
   * 2. The levels of skills it invokes (if any)
   *
   * The effective level is max(axiom requirements, max(invoked levels) + 1).
   *
   * @param skill - The skill definition
   * @param getSkillLevel - Optional function to look up invoked skill levels
   * @returns The computed minimum TypeLevel
   */
  computeEffectiveLevel(
    skill: SkillDefinition,
    getSkillLevel?: (skillId: string) => TypeLevel | null
  ): TypeLevel {
    // Get minimum level required by axioms used
    const axiomLevel = getMinimumLevelForAxioms(skill.reducesTo);

    // If this skill invokes other skills, we need to be at least one level above
    let invokedMaxLevel = TypeLevel.LEVEL_0;

    if (skill.invokesSkills && skill.invokesSkills.length > 0 && getSkillLevel) {
      for (const invokedId of skill.invokesSkills) {
        const invokedLevel = getSkillLevel(invokedId);
        if (invokedLevel !== null && invokedLevel >= invokedMaxLevel) {
          invokedMaxLevel = invokedLevel;
        }
      }
      // Must be at least one level above the highest invoked skill
      invokedMaxLevel = Math.min(invokedMaxLevel + 1, TypeLevel.LEVEL_5) as TypeLevel;
    }

    // Return the maximum of the two requirements
    return Math.max(axiomLevel, invokedMaxLevel) as TypeLevel;
  }

  /**
   * Perform full validation of a skill definition.
   * Checks composition rules, type levels, structure, and references.
   *
   * @param skill - The skill definition to validate
   * @param getSkill - Optional function to look up other skills for dependency checking
   * @returns Complete validation result
   */
  validateSkill(
    skill: SkillDefinition,
    getSkill?: (skillId: string) => SkillDefinition | null
  ): ValidationResult {
    const startTime = performance.now();
    const result = createEmptyValidationResult(skill.skillId);

    // 1. Validate basic structure
    this.validateStructure(skill, result);

    // 2. Validate axiom usage against declared level
    this.validateAxiomUsage(skill, result);

    // 3. Validate all connections
    this.validateConnections(skill, result);

    // 4. Validate type level
    this.validateTypeLevel(skill, result, getSkill);

    // 5. Check for cycles in the execution graph
    this.validateNoCycles(skill, result);

    // 6. Check for orphaned or unreachable steps
    this.validateReachability(skill, result);

    // 7. Validate references to other skills
    if (skill.invokesSkills && getSkill) {
      this.validateSkillReferences(skill, result, getSkill);
    }

    // 8. Add warnings for best practices
    this.addWarnings(skill, result);

    result.validationTimeMs = performance.now() - startTime;
    return result;
  }

  /**
   * Detect circular dependencies in skill invocations.
   *
   * @param skillId - The starting skill ID
   * @param getSkill - Function to look up skills by ID
   * @returns Detection result with cycle path if found
   */
  detectCircularDependencies(
    skillId: string,
    getSkill: (id: string) => SkillDefinition | null
  ): CycleDetectionResult {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const path: string[] = [];

    const hasCycle = (id: string): boolean => {
      if (visiting.has(id)) {
        // Found a cycle - extract the cycle path
        const cycleStart = path.indexOf(id);
        return true;
      }

      if (visited.has(id)) {
        return false;
      }

      visiting.add(id);
      path.push(id);

      const skill = getSkill(id);
      if (skill?.invokesSkills) {
        for (const invokedId of skill.invokesSkills) {
          if (hasCycle(invokedId)) {
            return true;
          }
        }
      }

      visiting.delete(id);
      visited.add(id);
      path.pop();
      return false;
    };

    if (hasCycle(skillId)) {
      // Find where the cycle starts in the path
      const skill = getSkill(skillId);
      if (skill?.invokesSkills) {
        for (const invokedId of skill.invokesSkills) {
          if (visiting.has(invokedId) || path.includes(invokedId)) {
            const cycleStart = path.indexOf(invokedId);
            const cyclePath = cycleStart >= 0
              ? [...path.slice(cycleStart), invokedId]
              : [skillId, invokedId];
            return { hasCycle: true, cyclePath };
          }
        }
      }
      return { hasCycle: true, cyclePath: path };
    }

    return { hasCycle: false };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Validation Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private validateStructure(skill: SkillDefinition, result: ValidationResult): void {
    // Check for required fields
    if (!skill.skillId || skill.skillId.trim() === '') {
      addValidationError(result, createValidationError(
        REFERENCE_ERROR_CODES.DUPLICATE_ID,
        'Skill ID is required',
        'reference',
        { severity: 'error' }
      ));
    }

    if (!skill.name || skill.name.trim() === '') {
      addValidationError(result, createValidationError(
        SCHEMA_ERROR_CODES.MISSING_REQUIRED,
        'Skill name is required',
        'schema',
        { severity: 'error' }
      ));
    }

    // Check for entry point
    if (!skill.entryStepId) {
      addValidationError(result, createValidationError(
        STRUCTURE_ERROR_CODES.MISSING_ENTRY,
        'Entry step ID is required',
        'structure',
        { severity: 'error' }
      ));
    } else if (!skill.steps.find(s => s.stepId === skill.entryStepId)) {
      addValidationError(result, createValidationError(
        REFERENCE_ERROR_CODES.UNKNOWN_STEP,
        `Entry step '${skill.entryStepId}' not found in steps`,
        'reference',
        { severity: 'error', location: { field: 'entryStepId' } }
      ));
    }

    // Check for exit points
    if (!skill.exitStepIds || skill.exitStepIds.length === 0) {
      addValidationError(result, createValidationError(
        STRUCTURE_ERROR_CODES.MISSING_EXIT,
        'At least one exit step ID is required',
        'structure',
        { severity: 'error' }
      ));
    } else {
      for (const exitId of skill.exitStepIds) {
        if (!skill.steps.find(s => s.stepId === exitId)) {
          addValidationError(result, createValidationError(
            REFERENCE_ERROR_CODES.UNKNOWN_STEP,
            `Exit step '${exitId}' not found in steps`,
            'reference',
            { severity: 'error', location: { field: 'exitStepIds' } }
          ));
        }
      }
    }

    // Check for duplicate step IDs
    const stepIds = new Set<string>();
    for (const step of skill.steps) {
      if (stepIds.has(step.stepId)) {
        addValidationError(result, createValidationError(
          REFERENCE_ERROR_CODES.DUPLICATE_ID,
          `Duplicate step ID: '${step.stepId}'`,
          'reference',
          { severity: 'error', location: { stepId: step.stepId } }
        ));
      }
      stepIds.add(step.stepId);
    }
  }

  private validateAxiomUsage(skill: SkillDefinition, result: ValidationResult): void {
    for (const step of skill.steps) {
      if (!isAxiomAllowedAtLevel(skill.typeLevel, step.axiom)) {
        addValidationError(result, createValidationError(
          LEVEL_ERROR_CODES.INSUFFICIENT_LEVEL,
          `Axiom ${step.axiom} is not allowed at type level ${skill.typeLevel} (${getTypeLevelDefinition(skill.typeLevel).name})`,
          'level',
          {
            severity: 'error',
            location: { stepId: step.stepId },
            suggestion: `Increase skill type level or use a different axiom`,
          }
        ));
      }
    }
  }

  private validateConnections(skill: SkillDefinition, result: ValidationResult): void {
    for (let i = 0; i < skill.connections.length; i++) {
      const conn = skill.connections[i];

      // Check that source and destination steps exist
      const fromStep = skill.steps.find(s => s.stepId === conn.fromStepId);
      const toStep = skill.steps.find(s => s.stepId === conn.toStepId);

      if (!fromStep) {
        addValidationError(result, createValidationError(
          REFERENCE_ERROR_CODES.UNKNOWN_STEP,
          `Connection source step '${conn.fromStepId}' not found`,
          'reference',
          { severity: 'error', location: { connectionIndex: i } }
        ));
        continue;
      }

      if (!toStep) {
        addValidationError(result, createValidationError(
          REFERENCE_ERROR_CODES.UNKNOWN_STEP,
          `Connection destination step '${conn.toStepId}' not found`,
          'reference',
          { severity: 'error', location: { connectionIndex: i } }
        ));
        continue;
      }

      // Validate the axiom composition
      const compositionResult = this.validateComposition(fromStep.axiom, toStep.axiom);
      if (!compositionResult.allowed) {
        addValidationError(result, createValidationError(
          COMPOSITION_ERROR_CODES.FORBIDDEN_CONNECTION,
          `Invalid composition: ${fromStep.axiom} -> ${toStep.axiom}. ${compositionResult.reason}`,
          'composition',
          {
            severity: 'error',
            location: { connectionIndex: i },
            context: { rule: compositionResult.rule?.id },
          }
        ));
      }
    }
  }

  private validateTypeLevel(
    skill: SkillDefinition,
    result: ValidationResult,
    getSkill?: (skillId: string) => SkillDefinition | null
  ): void {
    const getSkillLevel = getSkill
      ? (id: string) => getSkill(id)?.typeLevel ?? null
      : undefined;

    const effectiveLevel = this.computeEffectiveLevel(skill, getSkillLevel);

    if (skill.typeLevel < effectiveLevel) {
      addValidationError(result, createValidationError(
        LEVEL_ERROR_CODES.LEVEL_MISMATCH,
        `Declared type level ${skill.typeLevel} is insufficient. Based on axioms and invoked skills, effective level is ${effectiveLevel}.`,
        'level',
        {
          severity: 'error',
          suggestion: `Change typeLevel to ${effectiveLevel} or higher`,
          context: { effectiveLevel, declaredLevel: skill.typeLevel },
        }
      ));
    }

    // Validate skill invocations
    if (skill.invokesSkills && getSkill) {
      for (const invokedId of skill.invokesSkills) {
        const invokedSkill = getSkill(invokedId);
        if (invokedSkill) {
          const invocationResult = this.validateInvocation(skill.typeLevel, invokedSkill.typeLevel);
          if (!invocationResult.allowed) {
            addValidationError(result, createValidationError(
              LEVEL_ERROR_CODES.INVALID_INVOCATION,
              `Cannot invoke skill '${invokedId}': ${invocationResult.reason}`,
              'level',
              { severity: 'error' }
            ));
          }
        }
      }
    }
  }

  private validateNoCycles(skill: SkillDefinition, result: ValidationResult): void {
    // Check for cycles in the internal step graph (not skill invocations)
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const hasCycle = (stepId: string, path: string[]): string[] | null => {
      if (visiting.has(stepId)) {
        return [...path, stepId];
      }
      if (visited.has(stepId)) {
        return null;
      }

      visiting.add(stepId);
      path.push(stepId);

      for (const conn of skill.connections) {
        if (conn.fromStepId === stepId) {
          const cyclePath = hasCycle(conn.toStepId, path);
          if (cyclePath) {
            return cyclePath;
          }
        }
      }

      visiting.delete(stepId);
      visited.add(stepId);
      path.pop();
      return null;
    };

    if (skill.entryStepId) {
      const cyclePath = hasCycle(skill.entryStepId, []);
      if (cyclePath) {
        addValidationError(result, createValidationError(
          STRUCTURE_ERROR_CODES.CYCLE_DETECTED,
          `Cycle detected in execution graph: ${cyclePath.join(' -> ')}`,
          'structure',
          { severity: 'error', context: { cyclePath } }
        ));
      }
    }
  }

  private validateReachability(skill: SkillDefinition, result: ValidationResult): void {
    if (!skill.entryStepId || skill.steps.length === 0) {
      return;
    }

    // Find all reachable steps from entry
    const reachable = new Set<string>();
    const queue = [skill.entryStepId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      for (const conn of skill.connections) {
        if (conn.fromStepId === current && !reachable.has(conn.toStepId)) {
          queue.push(conn.toStepId);
        }
      }
    }

    // Check for unreachable steps
    for (const step of skill.steps) {
      if (!reachable.has(step.stepId)) {
        addValidationError(result, createValidationError(
          STRUCTURE_ERROR_CODES.UNREACHABLE_STEP,
          `Step '${step.stepId}' is not reachable from entry point`,
          'structure',
          { severity: 'warning', location: { stepId: step.stepId } }
        ));
      }
    }

    // Check for dead-end steps (not exit steps but no outgoing connections)
    const exitSet = new Set(skill.exitStepIds);
    for (const step of skill.steps) {
      if (!exitSet.has(step.stepId)) {
        const hasOutgoing = skill.connections.some(c => c.fromStepId === step.stepId);
        if (!hasOutgoing && reachable.has(step.stepId)) {
          addValidationError(result, createValidationError(
            STRUCTURE_ERROR_CODES.DEAD_END,
            `Step '${step.stepId}' has no outgoing connections and is not an exit step`,
            'structure',
            { severity: 'warning', location: { stepId: step.stepId } }
          ));
        }
      }
    }
  }

  private validateSkillReferences(
    skill: SkillDefinition,
    result: ValidationResult,
    getSkill: (skillId: string) => SkillDefinition | null
  ): void {
    if (!skill.invokesSkills) return;

    for (const invokedId of skill.invokesSkills) {
      const invokedSkill = getSkill(invokedId);
      if (!invokedSkill) {
        addValidationError(result, createValidationError(
          REFERENCE_ERROR_CODES.UNKNOWN_SKILL,
          `Referenced skill '${invokedId}' not found in registry`,
          'reference',
          { severity: 'error' }
        ));
      } else if (!invokedSkill.isValid) {
        addValidationError(result, createValidationError(
          REFERENCE_ERROR_CODES.UNKNOWN_SKILL,
          `Referenced skill '${invokedId}' is not valid`,
          'reference',
          { severity: 'warning' }
        ));
      }
    }

    // Check for circular dependencies
    const cycleResult = this.detectCircularDependencies(skill.skillId, getSkill);
    if (cycleResult.hasCycle) {
      addValidationError(result, createValidationError(
        STRUCTURE_ERROR_CODES.CYCLE_DETECTED,
        `Circular dependency detected: ${cycleResult.cyclePath?.join(' -> ')}`,
        'structure',
        { severity: 'error', context: { cyclePath: cycleResult.cyclePath } }
      ));
    }
  }

  private addWarnings(skill: SkillDefinition, result: ValidationResult): void {
    // Warn about missing description
    if (!skill.description || skill.description.trim() === '') {
      addValidationError(result, createValidationError(
        WARNING_CODES.MISSING_DESCRIPTION,
        'Skill has no description',
        'semantic',
        { severity: 'warning', suggestion: 'Add a description for better discoverability' }
      ));
    }

    // Warn about steps without descriptions
    for (const step of skill.steps) {
      if (!step.description) {
        addValidationError(result, createValidationError(
          WARNING_CODES.MISSING_DESCRIPTION,
          `Step '${step.stepId}' has no description`,
          'semantic',
          { severity: 'info', location: { stepId: step.stepId } }
        ));
      }
    }

    // Warn about implicit types
    if (skill.inputSchema.type === 'any') {
      addValidationError(result, createValidationError(
        WARNING_CODES.IMPLICIT_TYPE,
        'Skill input uses implicit \'any\' type',
        'schema',
        { severity: 'info', suggestion: 'Consider specifying a concrete input schema' }
      ));
    }

    if (skill.outputSchema.type === 'any') {
      addValidationError(result, createValidationError(
        WARNING_CODES.IMPLICIT_TYPE,
        'Skill output uses implicit \'any\' type',
        'schema',
        { severity: 'info', suggestion: 'Consider specifying a concrete output schema' }
      ));
    }
  }
}

/**
 * Singleton validator instance for convenience.
 */
export const validator = new RussellianValidator();

/**
 * Quick check if a composition is allowed.
 *
 * @param from - Source axiom
 * @param to - Destination axiom
 * @returns True if allowed
 */
export function isValidComposition(from: Axiom, to: Axiom): boolean {
  return validator.validateComposition(from, to).allowed;
}

/**
 * Quick check if an invocation is allowed.
 *
 * @param callerLevel - Caller's type level
 * @param targetLevel - Target's type level
 * @returns True if allowed
 */
export function canInvokeLevel(callerLevel: TypeLevel, targetLevel: TypeLevel): boolean {
  return validator.validateInvocation(callerLevel, targetLevel).allowed;
}
