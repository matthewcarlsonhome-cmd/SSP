/**
 * Dual Validation Result Types
 *
 * Combines Russellian (formal) and Wittgensteinian (contextual) validation
 * into a comprehensive assessment of skill validity and sensibility.
 *
 * @module wittgenstein/types/dual-validation
 */

import type { ValidationResult, ValidationError } from '../../russellian/types';
import type { GrammaticalViolation, GrammarCheckResult } from './grammar';
import type { GameCompatibility } from './language-game';
import type { ResemblanceAnalysis, ResemblanceScore } from './family';
import type { ExemplarAlignment, SkillExemplar } from './exemplar';

/**
 * Russellian (formal) validation results.
 */
export interface RussellianValidation {
  /** Whether the skill passes formal validation */
  isValid: boolean;

  /** Composition rule violations */
  compositionErrors: ValidationError[];

  /** Type level violations */
  typeLevelErrors: ValidationError[];

  /** Detected circular dependencies */
  circularDependencies: string[];

  /** All validation errors */
  allErrors: ValidationError[];

  /** The full validation result */
  fullResult: ValidationResult;
}

/**
 * Wittgensteinian (contextual) validation results.
 */
export interface WittgensteinianValidation {
  /** Whether the skill "makes sense" in context */
  makesSense: boolean;

  /** Grammar check results */
  grammarResult: GrammarCheckResult;

  /** Grammatical violations found */
  grammaticalIssues: GrammaticalViolation[];

  /** Compatibility with intended language game */
  gameCompatibility: GameCompatibility | null;

  /** Family resemblance analysis */
  familyResemblance: ResemblanceAnalysis;

  /** How well the skill aligns with exemplars */
  exemplarAlignment: ExemplarAlignment | null;

  /** Contextual warnings (not errors, but worth noting) */
  contextualWarnings: string[];
}

/**
 * Overall combined verdict.
 */
export interface OverallVerdict {
  /** Whether the skill passes formal validation (can be registered) */
  canRegister: boolean;

  /** Whether the skill makes contextual sense (should be registered) */
  shouldRegister: boolean;

  /** Confidence in this assessment (0-1) */
  confidence: number;

  /** Actionable recommendations */
  recommendations: string[];

  /** Summary explanation */
  summary: string;

  /** Risk level based on combined analysis */
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Complete dual validation result.
 */
export interface DualValidationResult {
  /** Skill ID that was validated */
  skillId: string;

  /** Skill name for display */
  skillName: string;

  /** Russellian (formal) validation */
  russellian: RussellianValidation;

  /** Wittgensteinian (contextual) validation */
  wittgensteinian: WittgensteinianValidation;

  /** Combined verdict */
  overall: OverallVerdict;

  /** Context used for validation */
  context: {
    intendedGame?: string;
    intendedClusters?: string[];
    formOfLife?: string;
  };

  /** When validation was performed */
  validatedAt: string;

  /** Time taken for validation (ms) */
  validationTimeMs: number;
}

/**
 * Options for dual validation.
 */
export interface DualValidationOptions {
  /** The language game to validate against */
  intendedGame?: string;

  /** Clusters the skill should belong to */
  intendedClusters?: string[];

  /** Exemplars to match against */
  exemplarsToMatch?: SkillExemplar[];

  /** Form of life context */
  formOfLife?: string;

  /** Skip Russellian validation (use if already validated) */
  skipRussellian?: boolean;

  /** Skip grammar checks */
  skipGrammar?: boolean;

  /** Skip family resemblance analysis */
  skipFamily?: boolean;

  /** Skip exemplar alignment */
  skipExemplars?: boolean;
}

/**
 * Create an empty Russellian validation result.
 */
export function createEmptyRussellianValidation(): RussellianValidation {
  return {
    isValid: true,
    compositionErrors: [],
    typeLevelErrors: [],
    circularDependencies: [],
    allErrors: [],
    fullResult: {
      isValid: true,
      errors: [],
      counts: { error: 0, warning: 0, info: 0 },
      validationTimeMs: 0,
      validatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Create an empty Wittgensteinian validation result.
 *
 * @param skillId - The skill being validated
 */
export function createEmptyWittgensteinianValidation(
  skillId: string
): WittgensteinianValidation {
  return {
    makesSense: true,
    grammarResult: {
      skillId,
      isGrammatical: true,
      violations: [],
      violationCounts: { nonsense: 0, odd: 0, suspicious: 0 },
      passedRules: [],
      skippedRules: [],
    },
    grammaticalIssues: [],
    gameCompatibility: null,
    familyResemblance: {
      skillId,
      memberships: [],
      nearMisses: [],
      isOrphan: false,
      suggestions: [],
    },
    exemplarAlignment: null,
    contextualWarnings: [],
  };
}

/**
 * Create an empty overall verdict.
 */
export function createEmptyVerdict(): OverallVerdict {
  return {
    canRegister: true,
    shouldRegister: true,
    confidence: 1.0,
    recommendations: [],
    summary: 'Skill passes all validation checks.',
    riskLevel: 'low',
  };
}

/**
 * Create an empty dual validation result.
 *
 * @param skillId - The skill ID
 * @param skillName - The skill name
 */
export function createEmptyDualValidationResult(
  skillId: string,
  skillName: string
): DualValidationResult {
  return {
    skillId,
    skillName,
    russellian: createEmptyRussellianValidation(),
    wittgensteinian: createEmptyWittgensteinianValidation(skillId),
    overall: createEmptyVerdict(),
    context: {},
    validatedAt: new Date().toISOString(),
    validationTimeMs: 0,
  };
}

/**
 * Calculate confidence score based on validation results.
 *
 * @param result - The dual validation result
 * @returns Confidence score (0-1)
 */
export function calculateConfidence(result: DualValidationResult): number {
  let confidence = 1.0;

  // Deduct for Russellian errors
  if (!result.russellian.isValid) {
    confidence -= 0.5;
  }

  // Deduct for grammar issues
  const grammarPenalty = (
    result.wittgensteinian.grammarResult.violationCounts.nonsense * 0.3 +
    result.wittgensteinian.grammarResult.violationCounts.odd * 0.1 +
    result.wittgensteinian.grammarResult.violationCounts.suspicious * 0.05
  );
  confidence -= Math.min(0.3, grammarPenalty);

  // Deduct for poor game compatibility
  if (result.wittgensteinian.gameCompatibility) {
    const gameScore = result.wittgensteinian.gameCompatibility.compatibilityScore;
    if (gameScore < 0.5) {
      confidence -= (0.5 - gameScore) * 0.2;
    }
  }

  // Deduct for being an orphan
  if (result.wittgensteinian.familyResemblance.isOrphan) {
    confidence -= 0.1;
  }

  // Deduct for poor exemplar alignment
  if (result.wittgensteinian.exemplarAlignment) {
    const alignScore = result.wittgensteinian.exemplarAlignment.alignmentScore;
    if (alignScore < 0.5) {
      confidence -= (0.5 - alignScore) * 0.1;
    }
  }

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Determine risk level based on validation results.
 *
 * @param result - The dual validation result
 * @returns Risk level
 */
export function determineRiskLevel(
  result: DualValidationResult
): 'low' | 'medium' | 'high' {
  if (!result.russellian.isValid) {
    return 'high';
  }

  if (result.wittgensteinian.grammarResult.violationCounts.nonsense > 0) {
    return 'high';
  }

  if (
    result.wittgensteinian.grammarResult.violationCounts.odd > 2 ||
    result.wittgensteinian.contextualWarnings.length > 3
  ) {
    return 'medium';
  }

  if (
    result.wittgensteinian.familyResemblance.isOrphan ||
    result.wittgensteinian.grammarResult.violationCounts.suspicious > 0
  ) {
    return 'medium';
  }

  return 'low';
}

/**
 * Generate recommendations based on validation results.
 *
 * @param result - The dual validation result
 * @returns Array of recommendation strings
 */
export function generateRecommendations(
  result: DualValidationResult
): string[] {
  const recommendations: string[] = [];

  // Russellian recommendations
  if (!result.russellian.isValid) {
    recommendations.push('Fix composition errors before registering');
    if (result.russellian.typeLevelErrors.length > 0) {
      recommendations.push('Review and correct type level assignment');
    }
    if (result.russellian.circularDependencies.length > 0) {
      recommendations.push('Break circular dependency chain');
    }
  }

  // Grammar recommendations
  if (result.wittgensteinian.grammarResult.violationCounts.nonsense > 0) {
    recommendations.push('Address nonsense grammar violations - skill makes no sense');
  }
  if (result.wittgensteinian.grammarResult.violationCounts.odd > 0) {
    recommendations.push('Review odd grammar patterns - may be intentional but risky');
  }

  // Game compatibility recommendations
  if (result.wittgensteinian.gameCompatibility) {
    const compat = result.wittgensteinian.gameCompatibility;
    if (compat.compatibilityScore < 0.5) {
      recommendations.push(`Consider adapting skill for ${compat.gameId} game`);
    }
    if (compat.missingVocabulary.length > 0) {
      recommendations.push(`Add vocabulary terms: ${compat.missingVocabulary.slice(0, 3).join(', ')}`);
    }
  }

  // Family resemblance recommendations
  if (result.wittgensteinian.familyResemblance.isOrphan) {
    recommendations.push('Skill doesn\'t fit any cluster - may be unique or poorly designed');
    const suggestions = result.wittgensteinian.familyResemblance.suggestions;
    if (suggestions.length > 0) {
      recommendations.push(`Consider: ${suggestions[0].reason}`);
    }
  }

  return recommendations;
}

/**
 * Generate a summary of the validation result.
 *
 * @param result - The dual validation result
 * @returns Summary string
 */
export function generateSummary(result: DualValidationResult): string {
  if (!result.russellian.isValid) {
    return `Skill fails formal validation with ${result.russellian.allErrors.length} error(s). Cannot be registered.`;
  }

  if (!result.wittgensteinian.makesSense) {
    return `Skill is formally valid but grammatically unsound. Registration not recommended.`;
  }

  const confidence = result.overall.confidence;
  if (confidence >= 0.9) {
    return 'Skill passes all validation checks with high confidence. Ready for registration.';
  } else if (confidence >= 0.7) {
    return 'Skill is valid but has minor contextual concerns. Review recommendations before registering.';
  } else if (confidence >= 0.5) {
    return 'Skill is valid but has significant contextual issues. Consider revisions.';
  } else {
    return 'Skill has major issues despite passing formal validation. Strongly recommend review.';
  }
}
