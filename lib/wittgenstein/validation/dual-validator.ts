/**
 * Dual Validator
 *
 * Combines Russellian (formal) and Wittgensteinian (contextual) validation
 * to provide a comprehensive assessment of skill validity and sensibility.
 *
 * @module wittgenstein/validation/dual-validator
 */

import type { SkillDefinition, ValidationResult } from '../../russellian/types';
import { RussellianValidator } from '../../russellian/validation/engine';
import type {
  DualValidationResult,
  DualValidationOptions,
  RussellianValidation,
  WittgensteinianValidation,
  OverallVerdict,
  SkillExemplar,
  ExemplarAlignment,
} from '../types';
import {
  createEmptyRussellianValidation,
  createEmptyWittgensteinianValidation,
  createEmptyVerdict,
  createEmptyDualValidationResult,
  calculateConfidence,
  determineRiskLevel,
  generateRecommendations,
  generateSummary,
} from '../types';
import { LanguageGameRegistry, languageGameRegistry } from '../games/registry';
import { FamilyResemblanceEngine, familyResemblanceEngine } from '../family/engine';
import { GrammarEngine, grammarEngine } from '../grammar/engine';

/**
 * Dual validator combining Russell and Wittgenstein approaches.
 */
export class DualValidator {
  private russellianValidator: RussellianValidator;
  private gameRegistry: LanguageGameRegistry;
  private familyEngine: FamilyResemblanceEngine;
  private grammarEngine: GrammarEngine;

  constructor(
    russellianValidator?: RussellianValidator,
    gameRegistry?: LanguageGameRegistry,
    familyEngine?: FamilyResemblanceEngine,
    grammarEngineInstance?: GrammarEngine
  ) {
    this.russellianValidator = russellianValidator || new RussellianValidator();
    this.gameRegistry = gameRegistry || languageGameRegistry;
    this.familyEngine = familyEngine || familyResemblanceEngine;
    this.grammarEngine = grammarEngineInstance || grammarEngine;
  }

  /**
   * Perform full dual validation on a skill.
   *
   * @param skill - The skill to validate
   * @param options - Validation options
   * @returns Complete dual validation result
   */
  validate(
    skill: SkillDefinition,
    options: DualValidationOptions = {}
  ): DualValidationResult {
    const startTime = Date.now();

    // Start with empty result
    const result = createEmptyDualValidationResult(skill.skillId, skill.name);

    // Set context
    result.context = {
      intendedGame: options.intendedGame,
      intendedClusters: options.intendedClusters,
      formOfLife: options.formOfLife,
    };

    // Russellian validation
    if (!options.skipRussellian) {
      result.russellian = this.performRussellianValidation(skill);
    }

    // Wittgensteinian validation
    result.wittgensteinian = this.performWittgensteinianValidation(
      skill,
      options
    );

    // Calculate overall verdict
    result.overall = this.calculateOverallVerdict(result);

    // Finalize
    result.validatedAt = new Date().toISOString();
    result.validationTimeMs = Date.now() - startTime;

    return result;
  }

  /**
   * Quick check for registration eligibility.
   *
   * @param skill - The skill to check
   * @returns Object with canRegister and shouldRegister flags
   */
  quickCheck(skill: SkillDefinition): {
    canRegister: boolean;
    shouldRegister: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Russellian check
    const russellianResult = this.russellianValidator.validateSkill(skill);
    const canRegister = russellianResult.isValid;

    if (!canRegister) {
      issues.push(
        `Formal validation failed with ${russellianResult.errors.length} error(s)`
      );
    }

    // Quick Wittgensteinian check
    const grammarResult = this.grammarEngine.checkGrammar(skill);
    const familyResult = this.familyEngine.analyzeSkill(skill);

    let shouldRegister = canRegister;

    if (grammarResult.violationCounts.nonsense > 0) {
      shouldRegister = false;
      issues.push('Skill contains grammatical nonsense');
    }

    if (familyResult.isOrphan) {
      issues.push('Skill does not fit any known cluster (orphan)');
    }

    if (grammarResult.violationCounts.odd > 2) {
      shouldRegister = false;
      issues.push('Skill has multiple odd grammatical patterns');
    }

    return { canRegister, shouldRegister, issues };
  }

  /**
   * Validate a skill against a specific language game.
   *
   * @param skill - The skill to validate
   * @param gameId - The game to validate against
   * @returns Dual validation result focused on the game
   */
  validateForGame(
    skill: SkillDefinition,
    gameId: string
  ): DualValidationResult {
    return this.validate(skill, { intendedGame: gameId });
  }

  /**
   * Check if a skill makes sense without running full validation.
   *
   * @param skill - The skill to check
   * @returns True if the skill makes contextual sense
   */
  makesSense(skill: SkillDefinition): boolean {
    const grammarResult = this.grammarEngine.checkGrammar(skill);
    return grammarResult.isGrammatical;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Perform Russellian (formal) validation.
   */
  private performRussellianValidation(
    skill: SkillDefinition
  ): RussellianValidation {
    const fullResult = this.russellianValidator.validateSkill(skill);

    // Categorize errors
    const compositionErrors = fullResult.errors.filter(
      (e) => e.category === 'composition'
    );
    const typeLevelErrors = fullResult.errors.filter(
      (e) => e.category === 'type_level'
    );

    // Detect circular dependencies
    const circularDependencies: string[] = [];
    if (skill.invokesSkills && skill.invokesSkills.length > 0) {
      // This would need the registry to detect real circular deps
      // For now, just check self-reference
      if (skill.invokesSkills.includes(skill.skillId)) {
        circularDependencies.push(skill.skillId);
      }
    }

    return {
      isValid: fullResult.isValid,
      compositionErrors,
      typeLevelErrors,
      circularDependencies,
      allErrors: fullResult.errors,
      fullResult,
    };
  }

  /**
   * Perform Wittgensteinian (contextual) validation.
   */
  private performWittgensteinianValidation(
    skill: SkillDefinition,
    options: DualValidationOptions
  ): WittgensteinianValidation {
    const result = createEmptyWittgensteinianValidation(skill.skillId);

    // Grammar check
    if (!options.skipGrammar) {
      result.grammarResult = this.grammarEngine.checkGrammar(skill, {
        gameId: options.intendedGame,
        clusterId: options.intendedClusters?.[0],
      });
      result.grammaticalIssues = result.grammarResult.violations;
      result.makesSense = result.grammarResult.isGrammatical;
    }

    // Game compatibility
    if (options.intendedGame) {
      result.gameCompatibility = this.gameRegistry.checkCompatibility(
        skill,
        options.intendedGame
      );

      // Add contextual warnings from game compatibility
      if (result.gameCompatibility.compatibilityScore < 0.7) {
        result.contextualWarnings.push(
          `Low compatibility (${(result.gameCompatibility.compatibilityScore * 100).toFixed(0)}%) with game "${options.intendedGame}"`
        );
      }

      if (result.gameCompatibility.atypicalAxiomUse.length > 0) {
        result.contextualWarnings.push(
          `Atypical axiom usage for this game: ${result.gameCompatibility.atypicalAxiomUse.map((a) => a.axiom).join(', ')}`
        );
      }
    }

    // Family resemblance
    if (!options.skipFamily) {
      result.familyResemblance = this.familyEngine.analyzeSkill(skill);

      if (result.familyResemblance.isOrphan) {
        result.contextualWarnings.push(
          'Skill does not strongly belong to any known cluster'
        );
      }

      // Check intended clusters
      if (options.intendedClusters) {
        const actualMemberships = result.familyResemblance.memberships.map(
          (m) => m.clusterId
        );
        const missingClusters = options.intendedClusters.filter(
          (c) => !actualMemberships.includes(c)
        );
        if (missingClusters.length > 0) {
          result.contextualWarnings.push(
            `Not a member of intended clusters: ${missingClusters.join(', ')}`
          );
        }
      }
    }

    // Exemplar alignment
    if (!options.skipExemplars && options.exemplarsToMatch) {
      result.exemplarAlignment = this.checkExemplarAlignment(
        skill,
        options.exemplarsToMatch
      );

      if (
        result.exemplarAlignment &&
        result.exemplarAlignment.alignmentScore < 0.5
      ) {
        result.contextualWarnings.push(
          `Low alignment (${(result.exemplarAlignment.alignmentScore * 100).toFixed(0)}%) with provided exemplars`
        );
      }
    }

    // Update makesSense based on all factors
    if (!result.makesSense) {
      // Already false from grammar
    } else if (result.grammarResult.violationCounts.nonsense > 0) {
      result.makesSense = false;
    } else if (
      result.gameCompatibility &&
      result.gameCompatibility.compatibilityScore < 0.3
    ) {
      result.makesSense = false;
    }

    return result;
  }

  /**
   * Calculate overall verdict from validation results.
   */
  private calculateOverallVerdict(result: DualValidationResult): OverallVerdict {
    const verdict = createEmptyVerdict();

    // canRegister = formal validity
    verdict.canRegister = result.russellian.isValid;

    // shouldRegister = formal validity + makes sense
    verdict.shouldRegister =
      result.russellian.isValid && result.wittgensteinian.makesSense;

    // Calculate confidence
    verdict.confidence = calculateConfidence(result);

    // Determine risk level
    verdict.riskLevel = determineRiskLevel(result);

    // Generate recommendations
    verdict.recommendations = generateRecommendations(result);

    // Generate summary
    verdict.summary = generateSummary(result);

    return verdict;
  }

  /**
   * Check alignment with provided exemplars.
   */
  private checkExemplarAlignment(
    skill: SkillDefinition,
    exemplars: SkillExemplar[]
  ): ExemplarAlignment {
    // Simplified alignment check
    // In a full implementation, this would compare skill structure to exemplars

    const closestExemplars: ExemplarAlignment['closestExemplars'] = [];
    const deviations: string[] = [];
    const matchedMistakes: ExemplarAlignment['matchedMistakes'] = [];
    const suggestions: string[] = [];

    // Calculate simple alignment based on shared characteristics
    let totalSimilarity = 0;

    for (const exemplar of exemplars.slice(0, 5)) {
      // Compare basic structure
      let similarity = 0;

      // Same skill ID is perfect match
      if (exemplar.skillId === skill.skillId) {
        similarity = 1.0;
      } else {
        // Compare based on tags, axioms used, etc.
        const exemplarTags = new Set(exemplar.tags);
        const skillTags = new Set(skill.tags);
        const commonTags = [...skillTags].filter((t) => exemplarTags.has(t));
        similarity = commonTags.length / Math.max(skillTags.size, 1);
      }

      closestExemplars.push({ exemplar, similarity });
      totalSimilarity += similarity;
    }

    // Sort by similarity
    closestExemplars.sort((a, b) => b.similarity - a.similarity);

    const alignmentScore =
      exemplars.length > 0 ? totalSimilarity / exemplars.length : 0;

    // Generate suggestions if alignment is low
    if (alignmentScore < 0.5 && closestExemplars.length > 0) {
      const bestMatch = closestExemplars[0];
      suggestions.push(
        `Review exemplar "${bestMatch.exemplar.exemplarId}" for guidance`
      );
    }

    return {
      skillId: skill.skillId,
      alignmentScore,
      closestExemplars: closestExemplars.slice(0, 3),
      deviations,
      matchedMistakes,
      suggestions,
    };
  }
}

/**
 * Singleton instance of the dual validator.
 */
export const dualValidator = new DualValidator();

/**
 * Convenience function for quick dual validation.
 *
 * @param skill - The skill to validate
 * @param options - Validation options
 * @returns Dual validation result
 */
export function validateSkill(
  skill: SkillDefinition,
  options?: DualValidationOptions
): DualValidationResult {
  return dualValidator.validate(skill, options);
}

/**
 * Convenience function for quick registration check.
 *
 * @param skill - The skill to check
 * @returns Registration eligibility
 */
export function canRegisterSkill(skill: SkillDefinition): {
  canRegister: boolean;
  shouldRegister: boolean;
  issues: string[];
} {
  return dualValidator.quickCheck(skill);
}
