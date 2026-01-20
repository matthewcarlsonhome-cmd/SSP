/**
 * Wittgensteinian Exemplars
 *
 * Exemplars are examples that teach meaning through use, not definition.
 * We understand skills by seeing good and bad examples in action.
 *
 * @module wittgenstein/types/exemplar
 */

/**
 * Quality rating for an exemplar.
 */
export type ExemplarQuality = 'canonical' | 'good' | 'acceptable' | 'edge_case';

/**
 * Annotation on an exemplar.
 */
export interface ExemplarAnnotation {
  /** Step ID if the annotation is about a specific step */
  stepId?: string;

  /** The annotation text */
  note: string;

  /** Rule or pattern this annotation highlights */
  highlightsRule?: string;

  /** Author of the annotation */
  author?: string;

  /** When the annotation was added */
  createdAt?: string;
}

/**
 * A single example of skill usage.
 */
export interface SkillExemplar {
  /** Unique identifier */
  exemplarId: string;

  /** The skill this exemplar is for */
  skillId: string;

  /** Example input data */
  input: unknown;

  /** Example output data */
  output: unknown;

  /** What this example demonstrates */
  demonstrates: string[];

  /** Quality rating */
  quality: ExemplarQuality;

  /** Annotations explaining the example */
  annotations: ExemplarAnnotation[];

  /** Whether this is a positive or negative example */
  isPositive: boolean;

  /** Tags for categorization */
  tags: string[];

  /** When this exemplar was created */
  createdAt: string;

  /** Who created this exemplar */
  createdBy?: string;

  /** Execution context if from a real run */
  executionContext?: {
    certificateId?: string;
    environment?: string;
    timestamp?: string;
  };
}

/**
 * A common mistake pattern.
 */
export interface CommonMistake {
  /** Description of the mistake */
  description: string;

  /** Example of the mistake */
  exemplar: SkillExemplar;

  /** How to correct the mistake */
  correction: string;

  /** Why this mistake happens */
  whyItHappens: string;

  /** How common this mistake is (1-10) */
  frequency: number;
}

/**
 * Complete training set for a skill.
 */
export interface SkillTrainingSet {
  /** The skill this training set is for */
  skillId: string;

  /** Skill name for display */
  skillName: string;

  /** Examples of correct usage */
  positiveExemplars: SkillExemplar[];

  /** Examples of incorrect usage */
  negativeExemplars: SkillExemplar[];

  /** Edge cases that require special handling */
  edgeCases: SkillExemplar[];

  /** Common mistakes and how to fix them */
  commonMistakes: CommonMistake[];

  /** When this training set was last updated */
  updatedAt: string;

  /** Total number of exemplars */
  totalExemplars: number;

  /** Metadata */
  metadata?: {
    version: string;
    author: string;
    description: string;
  };
}

/**
 * Result of aligning input/output against exemplars.
 */
export interface ExemplarAlignment {
  /** Skill being checked */
  skillId: string;

  /** How well the input/output aligns with exemplars (0-1) */
  alignmentScore: number;

  /** Closest matching exemplars */
  closestExemplars: Array<{
    exemplar: SkillExemplar;
    similarity: number;
  }>;

  /** Where the input/output deviates from expectations */
  deviations: string[];

  /** Whether this matches a known mistake pattern */
  matchedMistakes: CommonMistake[];

  /** Suggestions based on exemplar analysis */
  suggestions: string[];
}

/**
 * Create a skill exemplar.
 *
 * @param skillId - The skill this is for
 * @param input - Example input
 * @param output - Example output
 * @param quality - Quality rating
 * @param isPositive - Whether this is a positive example
 * @returns A SkillExemplar
 */
export function createExemplar(
  skillId: string,
  input: unknown,
  output: unknown,
  quality: ExemplarQuality = 'good',
  isPositive: boolean = true
): SkillExemplar {
  return {
    exemplarId: generateId(),
    skillId,
    input,
    output,
    demonstrates: [],
    quality,
    annotations: [],
    isPositive,
    tags: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create a training set for a skill.
 *
 * @param skillId - The skill ID
 * @param skillName - The skill name
 * @returns An empty SkillTrainingSet
 */
export function createTrainingSet(
  skillId: string,
  skillName: string
): SkillTrainingSet {
  return {
    skillId,
    skillName,
    positiveExemplars: [],
    negativeExemplars: [],
    edgeCases: [],
    commonMistakes: [],
    updatedAt: new Date().toISOString(),
    totalExemplars: 0,
  };
}

/**
 * Add an exemplar to a training set.
 *
 * @param trainingSet - The training set to modify
 * @param exemplar - The exemplar to add
 * @param type - What kind of exemplar this is
 */
export function addExemplarToTrainingSet(
  trainingSet: SkillTrainingSet,
  exemplar: SkillExemplar,
  type: 'positive' | 'negative' | 'edge_case'
): void {
  switch (type) {
    case 'positive':
      trainingSet.positiveExemplars.push(exemplar);
      break;
    case 'negative':
      trainingSet.negativeExemplars.push(exemplar);
      break;
    case 'edge_case':
      trainingSet.edgeCases.push(exemplar);
      break;
  }
  trainingSet.totalExemplars++;
  trainingSet.updatedAt = new Date().toISOString();
}

/**
 * Add a common mistake to a training set.
 *
 * @param trainingSet - The training set to modify
 * @param mistake - The mistake to add
 */
export function addCommonMistake(
  trainingSet: SkillTrainingSet,
  mistake: CommonMistake
): void {
  trainingSet.commonMistakes.push(mistake);
  trainingSet.updatedAt = new Date().toISOString();
}

/**
 * Add an annotation to an exemplar.
 *
 * @param exemplar - The exemplar to annotate
 * @param note - The annotation text
 * @param options - Additional annotation options
 */
export function annotateExemplar(
  exemplar: SkillExemplar,
  note: string,
  options?: {
    stepId?: string;
    highlightsRule?: string;
    author?: string;
  }
): void {
  exemplar.annotations.push({
    note,
    stepId: options?.stepId,
    highlightsRule: options?.highlightsRule,
    author: options?.author,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Get canonical exemplars from a training set.
 *
 * @param trainingSet - The training set to search
 * @returns Canonical exemplars
 */
export function getCanonicalExemplars(
  trainingSet: SkillTrainingSet
): SkillExemplar[] {
  return trainingSet.positiveExemplars.filter((e) => e.quality === 'canonical');
}

/**
 * Get exemplars by quality level.
 *
 * @param trainingSet - The training set to search
 * @param quality - The quality level to filter by
 * @returns Matching exemplars
 */
export function getExemplarsByQuality(
  trainingSet: SkillTrainingSet,
  quality: ExemplarQuality
): SkillExemplar[] {
  const all = [
    ...trainingSet.positiveExemplars,
    ...trainingSet.negativeExemplars,
    ...trainingSet.edgeCases,
  ];
  return all.filter((e) => e.quality === quality);
}

/**
 * Calculate simple similarity between two values.
 * Uses structural comparison.
 *
 * @param a - First value
 * @param b - Second value
 * @returns Similarity score (0-1)
 */
export function calculateSimilarity(a: unknown, b: unknown): number {
  if (a === b) return 1;
  if (a === null || b === null) return 0;
  if (a === undefined || b === undefined) return 0;

  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA !== typeB) return 0;

  if (typeA === 'object') {
    const aStr = JSON.stringify(a);
    const bStr = JSON.stringify(b);

    // Simple string similarity
    const maxLen = Math.max(aStr.length, bStr.length);
    if (maxLen === 0) return 1;

    let matches = 0;
    const minLen = Math.min(aStr.length, bStr.length);
    for (let i = 0; i < minLen; i++) {
      if (aStr[i] === bStr[i]) matches++;
    }

    return matches / maxLen;
  }

  if (typeA === 'string') {
    const strA = a as string;
    const strB = b as string;
    const maxLen = Math.max(strA.length, strB.length);
    if (maxLen === 0) return 1;

    let matches = 0;
    const minLen = Math.min(strA.length, strB.length);
    for (let i = 0; i < minLen; i++) {
      if (strA[i] === strB[i]) matches++;
    }

    return matches / maxLen;
  }

  if (typeA === 'number') {
    const numA = a as number;
    const numB = b as number;
    const diff = Math.abs(numA - numB);
    const max = Math.max(Math.abs(numA), Math.abs(numB), 1);
    return Math.max(0, 1 - diff / max);
  }

  return 0;
}

/**
 * Generate a unique ID.
 */
function generateId(): string {
  return `ex_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
