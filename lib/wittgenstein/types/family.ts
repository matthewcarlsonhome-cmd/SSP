/**
 * Wittgensteinian Family Resemblance
 *
 * Family resemblance allows flexible categorization without rigid taxonomies.
 * Members of a "family" share overlapping features, but no single feature
 * is essential to all members.
 *
 * @module wittgenstein/types/family
 */

import type { Axiom } from '../../russellian/types';

/**
 * Feature detector types.
 * Each detector checks for a specific kind of feature in a skill.
 */
export type FeatureDetector =
  | { type: 'axiom_presence'; axioms: Axiom[] }
  | { type: 'axiom_pattern'; pattern: Axiom[]; ordered?: boolean }
  | { type: 'axiom_count'; axiom: Axiom; min?: number; max?: number }
  | { type: 'tag_match'; tags: string[] }
  | { type: 'vocabulary_use'; terms: string[] }
  | { type: 'input_schema'; schemaPattern: Record<string, unknown> }
  | { type: 'output_schema'; schemaPattern: Record<string, unknown> }
  | { type: 'invokes_skills'; skillPatterns: string[] }
  | { type: 'step_count'; min?: number; max?: number }
  | { type: 'custom'; evaluator: string; description?: string };

/**
 * A single feature that contributes to cluster membership.
 * Features are weighted; no single feature is essential.
 */
export interface ClusterFeature {
  /** Unique identifier for this feature */
  featureId: string;

  /** Human-readable name */
  name: string;

  /** Description of what this feature represents */
  description: string;

  /** Weight of this feature (0-1) */
  weight: number;

  /** How to detect this feature */
  detector: FeatureDetector;
}

/**
 * A cluster of skills that share family resemblance.
 * Skills don't need all features, just enough similarity.
 */
export interface FamilyResemblanceCluster {
  /** Unique identifier */
  clusterId: string;

  /** Human-readable name */
  name: string;

  /** Description of this cluster */
  description: string;

  /** Weighted features that define resemblance */
  features: ClusterFeature[];

  /** Minimum weighted score for membership (0-1) */
  membershipThreshold: number;

  /** Skill IDs that are prototypical members */
  prototypes: string[];

  /** Skill IDs that are peripheral/weak members */
  peripheralMembers: string[];

  /** Related clusters (skills may belong to multiple) */
  relatedClusters: string[];

  /** Tags for categorization */
  tags: string[];
}

/**
 * Result of analyzing a skill's resemblance to a cluster.
 */
export interface ResemblanceScore {
  /** The cluster being compared to */
  clusterId: string;

  /** The cluster name for display */
  clusterName: string;

  /** Overall resemblance score (0-1) */
  score: number;

  /** Whether the skill meets the membership threshold */
  isMember: boolean;

  /** Breakdown of feature scores */
  featureScores: Array<{
    featureId: string;
    featureName: string;
    detected: boolean;
    weight: number;
    contribution: number;
  }>;

  /** Features that were detected */
  detectedFeatures: string[];

  /** Features that were not detected */
  missingFeatures: string[];
}

/**
 * Analysis of a skill's cluster memberships.
 */
export interface ResemblanceAnalysis {
  /** Skill ID being analyzed */
  skillId: string;

  /** Clusters the skill belongs to (above threshold) */
  memberships: ResemblanceScore[];

  /** Clusters the skill is close to but not a member of */
  nearMisses: ResemblanceScore[];

  /** Whether the skill doesn't fit well into any cluster */
  isOrphan: boolean;

  /** Suggested clusters based on partial matches */
  suggestions: Array<{
    clusterId: string;
    reason: string;
  }>;
}

/**
 * Create a new cluster.
 *
 * @param clusterId - Unique identifier
 * @param name - Human-readable name
 * @param threshold - Membership threshold (0-1)
 * @returns A minimal FamilyResemblanceCluster
 */
export function createCluster(
  clusterId: string,
  name: string,
  threshold: number = 0.6
): FamilyResemblanceCluster {
  return {
    clusterId,
    name,
    description: '',
    features: [],
    membershipThreshold: threshold,
    prototypes: [],
    peripheralMembers: [],
    relatedClusters: [],
    tags: [],
  };
}

/**
 * Create a cluster feature.
 *
 * @param featureId - Unique identifier
 * @param name - Human-readable name
 * @param weight - Feature weight (0-1)
 * @param detector - How to detect this feature
 * @returns A ClusterFeature
 */
export function createFeature(
  featureId: string,
  name: string,
  weight: number,
  detector: FeatureDetector
): ClusterFeature {
  return {
    featureId,
    name,
    description: '',
    weight: Math.max(0, Math.min(1, weight)), // Clamp to 0-1
    detector,
  };
}

/**
 * Create an axiom presence detector.
 *
 * @param axioms - Axioms that must be present
 * @returns A FeatureDetector
 */
export function axiomPresenceDetector(axioms: Axiom[]): FeatureDetector {
  return { type: 'axiom_presence', axioms };
}

/**
 * Create an axiom pattern detector.
 *
 * @param pattern - Axiom sequence to match
 * @param ordered - Whether order matters
 * @returns A FeatureDetector
 */
export function axiomPatternDetector(
  pattern: Axiom[],
  ordered: boolean = true
): FeatureDetector {
  return { type: 'axiom_pattern', pattern, ordered };
}

/**
 * Create a tag match detector.
 *
 * @param tags - Tags to check for
 * @returns A FeatureDetector
 */
export function tagMatchDetector(tags: string[]): FeatureDetector {
  return { type: 'tag_match', tags };
}

/**
 * Create a step count detector.
 *
 * @param min - Minimum steps
 * @param max - Maximum steps
 * @returns A FeatureDetector
 */
export function stepCountDetector(min?: number, max?: number): FeatureDetector {
  return { type: 'step_count', min, max };
}

/**
 * Add a feature to a cluster.
 *
 * @param cluster - The cluster to modify
 * @param feature - The feature to add
 */
export function addFeature(
  cluster: FamilyResemblanceCluster,
  feature: ClusterFeature
): void {
  cluster.features.push(feature);
}

/**
 * Add a prototype to a cluster.
 *
 * @param cluster - The cluster to modify
 * @param skillId - The prototype skill ID
 */
export function addPrototype(
  cluster: FamilyResemblanceCluster,
  skillId: string
): void {
  if (!cluster.prototypes.includes(skillId)) {
    cluster.prototypes.push(skillId);
  }
}

/**
 * Calculate the maximum possible score for a cluster.
 *
 * @param cluster - The cluster to analyze
 * @returns Maximum possible weighted score
 */
export function getMaxPossibleScore(cluster: FamilyResemblanceCluster): number {
  return cluster.features.reduce((sum, f) => sum + f.weight, 0);
}

/**
 * Normalize a raw score to 0-1 range.
 *
 * @param rawScore - Unnormalized score
 * @param maxScore - Maximum possible score
 * @returns Normalized score (0-1)
 */
export function normalizeScore(rawScore: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.max(0, Math.min(1, rawScore / maxScore));
}

/**
 * Check if a resemblance score qualifies for membership.
 *
 * @param score - The resemblance score
 * @param threshold - Membership threshold
 * @returns True if the score meets the threshold
 */
export function meetsMembership(
  score: ResemblanceScore,
  threshold?: number
): boolean {
  const effectiveThreshold = threshold ?? score.score;
  return score.score >= effectiveThreshold;
}
