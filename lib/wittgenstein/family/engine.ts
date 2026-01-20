/**
 * Family Resemblance Engine
 *
 * Analyzes skill membership in clusters based on weighted features.
 * Skills don't need all features - they share "family resemblance."
 *
 * @module wittgenstein/family/engine
 */

import type { Axiom, SkillDefinition } from '../../russellian/types';
import type {
  FamilyResemblanceCluster,
  ClusterFeature,
  FeatureDetector,
  ResemblanceScore,
  ResemblanceAnalysis,
} from '../types';
import {
  createCluster,
  createFeature,
  axiomPresenceDetector,
  axiomPatternDetector,
  tagMatchDetector,
  stepCountDetector,
  getMaxPossibleScore,
  normalizeScore,
} from '../types';

/**
 * Engine for analyzing family resemblance.
 */
export class FamilyResemblanceEngine {
  private clusters: Map<string, FamilyResemblanceCluster> = new Map();

  constructor() {
    this.registerDefaultClusters();
  }

  /**
   * Register a cluster.
   *
   * @param cluster - The cluster to register
   */
  registerCluster(cluster: FamilyResemblanceCluster): void {
    this.clusters.set(cluster.clusterId, cluster);
  }

  /**
   * Get a cluster by ID.
   *
   * @param clusterId - The cluster ID
   * @returns The cluster, or null if not found
   */
  getCluster(clusterId: string): FamilyResemblanceCluster | null {
    return this.clusters.get(clusterId) || null;
  }

  /**
   * Get all registered clusters.
   */
  getAllClusters(): FamilyResemblanceCluster[] {
    return Array.from(this.clusters.values());
  }

  /**
   * Analyze a skill's resemblance to all clusters.
   *
   * @param skill - The skill to analyze
   * @returns Full resemblance analysis
   */
  analyzeSkill(skill: SkillDefinition): ResemblanceAnalysis {
    const memberships: ResemblanceScore[] = [];
    const nearMisses: ResemblanceScore[] = [];

    for (const cluster of this.clusters.values()) {
      const score = this.calculateResemblance(skill, cluster);

      if (score.isMember) {
        memberships.push(score);
      } else if (score.score >= cluster.membershipThreshold * 0.7) {
        // Near miss if within 70% of threshold
        nearMisses.push(score);
      }
    }

    // Sort by score descending
    memberships.sort((a, b) => b.score - a.score);
    nearMisses.sort((a, b) => b.score - a.score);

    // Generate suggestions for orphans
    const suggestions: Array<{ clusterId: string; reason: string }> = [];
    if (memberships.length === 0 && nearMisses.length > 0) {
      for (const miss of nearMisses.slice(0, 3)) {
        const missingFeatureNames = miss.missingFeatures.slice(0, 2);
        suggestions.push({
          clusterId: miss.clusterId,
          reason: `Add features: ${missingFeatureNames.join(', ')} to join ${miss.clusterName}`,
        });
      }
    }

    return {
      skillId: skill.skillId,
      memberships,
      nearMisses: nearMisses.slice(0, 5),
      isOrphan: memberships.length === 0,
      suggestions,
    };
  }

  /**
   * Calculate resemblance score for a skill against a specific cluster.
   *
   * @param skill - The skill to check
   * @param cluster - The cluster to check against
   * @returns Resemblance score
   */
  calculateResemblance(
    skill: SkillDefinition,
    cluster: FamilyResemblanceCluster
  ): ResemblanceScore {
    const featureScores: ResemblanceScore['featureScores'] = [];
    const detectedFeatures: string[] = [];
    const missingFeatures: string[] = [];

    let rawScore = 0;

    for (const feature of cluster.features) {
      const detected = this.detectFeature(skill, feature.detector);
      const contribution = detected ? feature.weight : 0;

      featureScores.push({
        featureId: feature.featureId,
        featureName: feature.name,
        detected,
        weight: feature.weight,
        contribution,
      });

      if (detected) {
        rawScore += feature.weight;
        detectedFeatures.push(feature.name);
      } else {
        missingFeatures.push(feature.name);
      }
    }

    const maxScore = getMaxPossibleScore(cluster);
    const normalizedScore = normalizeScore(rawScore, maxScore);

    return {
      clusterId: cluster.clusterId,
      clusterName: cluster.name,
      score: normalizedScore,
      isMember: normalizedScore >= cluster.membershipThreshold,
      featureScores,
      detectedFeatures,
      missingFeatures,
    };
  }

  /**
   * Find clusters a skill belongs to.
   *
   * @param skill - The skill to check
   * @returns Array of cluster IDs
   */
  findMemberships(skill: SkillDefinition): string[] {
    const analysis = this.analyzeSkill(skill);
    return analysis.memberships.map((m) => m.clusterId);
  }

  /**
   * Check if a skill belongs to a specific cluster.
   *
   * @param skill - The skill to check
   * @param clusterId - The cluster ID
   * @returns True if the skill is a member
   */
  isMemberOf(skill: SkillDefinition, clusterId: string): boolean {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return false;

    const score = this.calculateResemblance(skill, cluster);
    return score.isMember;
  }

  /**
   * Get related clusters for a cluster.
   *
   * @param clusterId - The cluster ID
   * @returns Related clusters
   */
  getRelatedClusters(clusterId: string): FamilyResemblanceCluster[] {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return [];

    return cluster.relatedClusters
      .map((id) => this.clusters.get(id))
      .filter((c): c is FamilyResemblanceCluster => c !== undefined);
  }

  /**
   * Unregister a cluster.
   *
   * @param clusterId - The cluster ID
   * @returns True if removed
   */
  unregisterCluster(clusterId: string): boolean {
    return this.clusters.delete(clusterId);
  }

  /**
   * Get statistics about the registry.
   */
  getStats(): {
    totalClusters: number;
    totalFeatures: number;
    avgFeaturesPerCluster: number;
  } {
    const clusters = Array.from(this.clusters.values());
    const totalFeatures = clusters.reduce((sum, c) => sum + c.features.length, 0);

    return {
      totalClusters: clusters.length,
      totalFeatures,
      avgFeaturesPerCluster: clusters.length > 0 ? totalFeatures / clusters.length : 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Detect if a skill has a specific feature.
   */
  private detectFeature(skill: SkillDefinition, detector: FeatureDetector): boolean {
    switch (detector.type) {
      case 'axiom_presence':
        return this.detectAxiomPresence(skill, detector.axioms);

      case 'axiom_pattern':
        return this.detectAxiomPattern(skill, detector.pattern, detector.ordered ?? true);

      case 'axiom_count':
        return this.detectAxiomCount(skill, detector.axiom, detector.min, detector.max);

      case 'tag_match':
        return this.detectTagMatch(skill, detector.tags);

      case 'vocabulary_use':
        return this.detectVocabularyUse(skill, detector.terms);

      case 'input_schema':
        return this.detectInputSchema(skill, detector.schemaPattern);

      case 'output_schema':
        return this.detectOutputSchema(skill, detector.schemaPattern);

      case 'invokes_skills':
        return this.detectInvokesSkills(skill, detector.skillPatterns);

      case 'step_count':
        return this.detectStepCount(skill, detector.min, detector.max);

      case 'custom':
        // Custom evaluators would need runtime evaluation
        // For now, we don't detect custom features
        return false;

      default:
        return false;
    }
  }

  private detectAxiomPresence(skill: SkillDefinition, axioms: Axiom[]): boolean {
    const skillAxioms = new Set(skill.steps.map((s) => s.axiom));
    return axioms.every((a) => skillAxioms.has(a));
  }

  private detectAxiomPattern(
    skill: SkillDefinition,
    pattern: Axiom[],
    ordered: boolean
  ): boolean {
    const skillAxioms = skill.steps.map((s) => s.axiom);

    if (ordered) {
      // Check for subsequence
      let patternIdx = 0;
      for (const axiom of skillAxioms) {
        if (axiom === pattern[patternIdx]) {
          patternIdx++;
          if (patternIdx === pattern.length) return true;
        }
      }
      return false;
    } else {
      // Just check all axioms are present
      const skillAxiomSet = new Set(skillAxioms);
      return pattern.every((a) => skillAxiomSet.has(a));
    }
  }

  private detectAxiomCount(
    skill: SkillDefinition,
    axiom: Axiom,
    min?: number,
    max?: number
  ): boolean {
    const count = skill.steps.filter((s) => s.axiom === axiom).length;
    if (min !== undefined && count < min) return false;
    if (max !== undefined && count > max) return false;
    return true;
  }

  private detectTagMatch(skill: SkillDefinition, tags: string[]): boolean {
    const skillTags = new Set(skill.tags.map((t) => t.toLowerCase()));
    return tags.some((t) => skillTags.has(t.toLowerCase()));
  }

  private detectVocabularyUse(skill: SkillDefinition, terms: string[]): boolean {
    const text = `${skill.name} ${skill.description}`.toLowerCase();
    return terms.some((term) => text.includes(term.toLowerCase()));
  }

  private detectInputSchema(
    skill: SkillDefinition,
    schemaPattern: Record<string, unknown>
  ): boolean {
    // Simplified: check if any step has matching input type pattern
    const patternKeys = Object.keys(schemaPattern);
    for (const step of skill.steps) {
      if (typeof step.inputType === 'object' && step.inputType !== null) {
        const inputObj = step.inputType as Record<string, unknown>;
        if (patternKeys.some((k) => k in inputObj)) {
          return true;
        }
      }
    }
    return false;
  }

  private detectOutputSchema(
    skill: SkillDefinition,
    schemaPattern: Record<string, unknown>
  ): boolean {
    // Simplified: check if any step has matching output type pattern
    const patternKeys = Object.keys(schemaPattern);
    for (const step of skill.steps) {
      if (typeof step.outputType === 'object' && step.outputType !== null) {
        const outputObj = step.outputType as Record<string, unknown>;
        if (patternKeys.some((k) => k in outputObj)) {
          return true;
        }
      }
    }
    return false;
  }

  private detectInvokesSkills(
    skill: SkillDefinition,
    skillPatterns: string[]
  ): boolean {
    if (!skill.invokesSkills) return false;
    return skillPatterns.some((pattern) => {
      const regex = new RegExp(pattern);
      return skill.invokesSkills!.some((id) => regex.test(id));
    });
  }

  private detectStepCount(
    skill: SkillDefinition,
    min?: number,
    max?: number
  ): boolean {
    const count = skill.steps.length;
    if (min !== undefined && count < min) return false;
    if (max !== undefined && count > max) return false;
    return true;
  }

  /**
   * Register default clusters.
   */
  private registerDefaultClusters(): void {
    // Data Transformers cluster
    const dataTransformers = this.createDataTransformersCluster();
    this.clusters.set(dataTransformers.clusterId, dataTransformers);

    // API Integrators cluster
    const apiIntegrators = this.createApiIntegratorsCluster();
    this.clusters.set(apiIntegrators.clusterId, apiIntegrators);

    // Content Creators cluster
    const contentCreators = this.createContentCreatorsCluster();
    this.clusters.set(contentCreators.clusterId, contentCreators);

    // Decision Makers cluster
    const decisionMakers = this.createDecisionMakersCluster();
    this.clusters.set(decisionMakers.clusterId, decisionMakers);

    // Validators cluster
    const validators = this.createValidatorsCluster();
    this.clusters.set(validators.clusterId, validators);
  }

  private createDataTransformersCluster(): FamilyResemblanceCluster {
    const cluster = createCluster('data-transformers', 'Data Transformers', 0.6);
    cluster.description = 'Skills that primarily transform and reshape data';

    cluster.features = [
      createFeature(
        'has-transform',
        'Uses TRANSFORM axiom',
        0.4,
        axiomPresenceDetector(['TRANSFORM' as Axiom])
      ),
      createFeature(
        'read-transform-pattern',
        'READ followed by TRANSFORM',
        0.3,
        axiomPatternDetector(['READ' as Axiom, 'TRANSFORM' as Axiom], true)
      ),
      createFeature(
        'data-tag',
        'Tagged as data/etl/transform',
        0.2,
        tagMatchDetector(['data', 'etl', 'transform', 'pipeline'])
      ),
      createFeature(
        'multiple-transforms',
        'Multiple TRANSFORM steps',
        0.1,
        { type: 'axiom_count', axiom: 'TRANSFORM' as Axiom, min: 2 }
      ),
    ];

    cluster.relatedClusters = ['api-integrators', 'validators'];
    cluster.tags = ['data', 'transform', 'etl'];

    return cluster;
  }

  private createApiIntegratorsCluster(): FamilyResemblanceCluster {
    const cluster = createCluster('api-integrators', 'API Integrators', 0.55);
    cluster.description = 'Skills that integrate with external APIs';

    cluster.features = [
      createFeature(
        'has-read-write',
        'Uses both READ and WRITE',
        0.35,
        axiomPresenceDetector(['READ' as Axiom, 'WRITE' as Axiom])
      ),
      createFeature(
        'api-vocabulary',
        'Uses API terminology',
        0.25,
        { type: 'vocabulary_use', terms: ['api', 'endpoint', 'request', 'response', 'webhook'] }
      ),
      createFeature(
        'integration-tag',
        'Tagged as integration/api/sync',
        0.25,
        tagMatchDetector(['integration', 'api', 'sync', 'connector'])
      ),
      createFeature(
        'has-validate',
        'Includes validation',
        0.15,
        axiomPresenceDetector(['VALIDATE' as Axiom])
      ),
    ];

    cluster.relatedClusters = ['data-transformers'];
    cluster.tags = ['api', 'integration', 'external'];

    return cluster;
  }

  private createContentCreatorsCluster(): FamilyResemblanceCluster {
    const cluster = createCluster('content-creators', 'Content Creators', 0.6);
    cluster.description = 'Skills that generate or modify content';

    cluster.features = [
      createFeature(
        'has-generate',
        'Uses GENERATE axiom',
        0.4,
        axiomPresenceDetector(['GENERATE' as Axiom])
      ),
      createFeature(
        'content-vocabulary',
        'Uses content terminology',
        0.25,
        { type: 'vocabulary_use', terms: ['content', 'generate', 'create', 'write', 'draft', 'text'] }
      ),
      createFeature(
        'content-tag',
        'Tagged as content/generation/ai',
        0.2,
        tagMatchDetector(['content', 'generation', 'ai', 'text', 'copy'])
      ),
      createFeature(
        'generate-write-pattern',
        'GENERATE followed by WRITE',
        0.15,
        axiomPatternDetector(['GENERATE' as Axiom, 'WRITE' as Axiom], true)
      ),
    ];

    cluster.relatedClusters = ['decision-makers'];
    cluster.tags = ['content', 'generation', 'ai'];

    return cluster;
  }

  private createDecisionMakersCluster(): FamilyResemblanceCluster {
    const cluster = createCluster('decision-makers', 'Decision Makers', 0.55);
    cluster.description = 'Skills that make decisions and route data';

    cluster.features = [
      createFeature(
        'has-decide',
        'Uses DECIDE axiom',
        0.4,
        axiomPresenceDetector(['DECIDE' as Axiom])
      ),
      createFeature(
        'decision-vocabulary',
        'Uses decision terminology',
        0.2,
        { type: 'vocabulary_use', terms: ['decide', 'route', 'branch', 'if', 'condition', 'rule'] }
      ),
      createFeature(
        'branching-tag',
        'Tagged as routing/decision/logic',
        0.2,
        tagMatchDetector(['routing', 'decision', 'logic', 'conditional', 'branch'])
      ),
      createFeature(
        'multiple-exits',
        'Skill with multiple exit points',
        0.2,
        { type: 'custom', evaluator: 'multiple_exits', description: 'Has more than one exit step' }
      ),
    ];

    cluster.relatedClusters = ['content-creators', 'validators'];
    cluster.tags = ['decision', 'routing', 'logic'];

    return cluster;
  }

  private createValidatorsCluster(): FamilyResemblanceCluster {
    const cluster = createCluster('validators', 'Validators', 0.6);
    cluster.description = 'Skills that validate and verify data';

    cluster.features = [
      createFeature(
        'has-validate',
        'Uses VALIDATE axiom',
        0.45,
        axiomPresenceDetector(['VALIDATE' as Axiom])
      ),
      createFeature(
        'validation-vocabulary',
        'Uses validation terminology',
        0.25,
        { type: 'vocabulary_use', terms: ['validate', 'verify', 'check', 'ensure', 'assert', 'schema'] }
      ),
      createFeature(
        'validation-tag',
        'Tagged as validation/verification',
        0.2,
        tagMatchDetector(['validation', 'verification', 'quality', 'check'])
      ),
      createFeature(
        'read-validate-pattern',
        'READ followed by VALIDATE',
        0.1,
        axiomPatternDetector(['READ' as Axiom, 'VALIDATE' as Axiom], true)
      ),
    ];

    cluster.relatedClusters = ['data-transformers', 'decision-makers'];
    cluster.tags = ['validation', 'quality', 'verification'];

    return cluster;
  }
}

/**
 * Singleton instance of the family resemblance engine.
 */
export const familyResemblanceEngine = new FamilyResemblanceEngine();
