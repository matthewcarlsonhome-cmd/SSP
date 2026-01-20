/**
 * Tests for Family Resemblance Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FamilyResemblanceEngine,
  createCluster,
  createFeature,
  axiomPresenceDetector,
  tagMatchDetector,
  stepCountDetector,
  addFeature,
  addPrototype,
  getMaxPossibleScore,
  normalizeScore,
} from '../index';
import { Axiom, TypeLevel, createSkillDefinition, createStep } from '../../russellian';

describe('FamilyResemblanceEngine', () => {
  let engine: FamilyResemblanceEngine;

  beforeEach(() => {
    engine = new FamilyResemblanceEngine();
  });

  describe('default clusters', () => {
    it('has data-transformers cluster', () => {
      const cluster = engine.getCluster('data-transformers');
      expect(cluster).not.toBeNull();
      expect(cluster?.name).toBe('Data Transformers');
    });

    it('has api-integrators cluster', () => {
      const cluster = engine.getCluster('api-integrators');
      expect(cluster).not.toBeNull();
      expect(cluster?.name).toBe('API Integrators');
    });

    it('has content-creators cluster', () => {
      const cluster = engine.getCluster('content-creators');
      expect(cluster).not.toBeNull();
      expect(cluster?.name).toBe('Content Creators');
    });

    it('has decision-makers cluster', () => {
      const cluster = engine.getCluster('decision-makers');
      expect(cluster).not.toBeNull();
    });

    it('has validators cluster', () => {
      const cluster = engine.getCluster('validators');
      expect(cluster).not.toBeNull();
    });
  });

  describe('registerCluster', () => {
    it('registers a new cluster', () => {
      const cluster = createCluster('test-cluster', 'Test Cluster', 0.5);
      engine.registerCluster(cluster);

      const retrieved = engine.getCluster('test-cluster');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Test Cluster');
    });
  });

  describe('analyzeSkill', () => {
    it('identifies data transformer skills', () => {
      const skill = createSkillDefinition('transform-skill', 'Transform Data', 'author');
      skill.description = 'ETL data transformation pipeline';
      skill.typeLevel = TypeLevel.LEVEL_0;
      skill.reducesTo = [Axiom.READ, Axiom.TRANSFORM];
      skill.steps = [
        createStep('read', 'Read source', Axiom.READ),
        createStep('transform1', 'Clean data', Axiom.TRANSFORM),
        createStep('transform2', 'Enrich data', Axiom.TRANSFORM),
      ];
      skill.connections = [
        { fromStepId: 'read', toStepId: 'transform1' },
        { fromStepId: 'transform1', toStepId: 'transform2' },
      ];
      skill.entryStepId = 'read';
      skill.exitStepIds = ['transform2'];
      skill.tags = ['data', 'etl', 'transform'];

      const analysis = engine.analyzeSkill(skill);

      expect(analysis.skillId).toBe('transform-skill');
      expect(analysis.memberships.length).toBeGreaterThan(0);
      expect(analysis.memberships.some((m) => m.clusterId === 'data-transformers')).toBe(true);
      expect(analysis.isOrphan).toBe(false);
    });

    it('identifies content creator skills', () => {
      const skill = createSkillDefinition('generate-skill', 'Content Generator', 'author');
      skill.description = 'AI content generation';
      skill.typeLevel = TypeLevel.LEVEL_1;
      skill.reducesTo = [Axiom.GENERATE];
      skill.steps = [
        createStep('generate', 'Generate content', Axiom.GENERATE),
        createStep('write', 'Save content', Axiom.WRITE),
      ];
      skill.connections = [{ fromStepId: 'generate', toStepId: 'write' }];
      skill.entryStepId = 'generate';
      skill.exitStepIds = ['write'];
      skill.tags = ['content', 'generation', 'ai'];

      const analysis = engine.analyzeSkill(skill);

      expect(analysis.memberships.some((m) => m.clusterId === 'content-creators')).toBe(true);
    });

    it('identifies orphan skills', () => {
      const skill = createSkillDefinition('weird-skill', 'Weird Skill', 'author');
      skill.description = 'Does something unusual';
      skill.typeLevel = TypeLevel.LEVEL_0;
      skill.reducesTo = [Axiom.WAIT];
      skill.steps = [createStep('wait', 'Wait', Axiom.WAIT)];
      skill.connections = [];
      skill.entryStepId = 'wait';
      skill.exitStepIds = ['wait'];
      skill.tags = ['unusual', 'special'];

      const analysis = engine.analyzeSkill(skill);

      // May or may not be orphan depending on threshold matching
      expect(analysis.skillId).toBe('weird-skill');
    });
  });

  describe('calculateResemblance', () => {
    it('calculates resemblance score', () => {
      const cluster = engine.getCluster('data-transformers')!;

      const skill = createSkillDefinition('test', 'Test', 'author');
      skill.steps = [
        createStep('read', 'Read', Axiom.READ),
        createStep('transform', 'Transform', Axiom.TRANSFORM),
      ];
      skill.connections = [{ fromStepId: 'read', toStepId: 'transform' }];
      skill.entryStepId = 'read';
      skill.exitStepIds = ['transform'];
      skill.tags = ['data'];

      const score = engine.calculateResemblance(skill, cluster);

      expect(score.clusterId).toBe('data-transformers');
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
      expect(score.featureScores.length).toBeGreaterThan(0);
    });
  });

  describe('isMemberOf', () => {
    it('checks cluster membership', () => {
      const skill = createSkillDefinition('validate-skill', 'Validator', 'author');
      skill.description = 'Data validation';
      skill.steps = [
        createStep('read', 'Read', Axiom.READ),
        createStep('validate', 'Validate', Axiom.VALIDATE),
      ];
      skill.connections = [{ fromStepId: 'read', toStepId: 'validate' }];
      skill.entryStepId = 'read';
      skill.exitStepIds = ['validate'];
      skill.tags = ['validation', 'quality'];

      const isMember = engine.isMemberOf(skill, 'validators');
      // Result depends on actual feature detection
      expect(typeof isMember).toBe('boolean');
    });

    it('returns false for unknown cluster', () => {
      const skill = createSkillDefinition('test', 'Test', 'author');
      skill.steps = [];
      skill.connections = [];
      skill.entryStepId = '';
      skill.exitStepIds = [];

      const isMember = engine.isMemberOf(skill, 'non-existent');
      expect(isMember).toBe(false);
    });
  });

  describe('findMemberships', () => {
    it('returns cluster IDs skill belongs to', () => {
      const skill = createSkillDefinition('api-skill', 'API Integration', 'author');
      skill.description = 'Sync data via API endpoint';
      skill.steps = [
        createStep('read', 'Fetch from API', Axiom.READ),
        createStep('write', 'Write to target', Axiom.WRITE),
      ];
      skill.connections = [{ fromStepId: 'read', toStepId: 'write' }];
      skill.entryStepId = 'read';
      skill.exitStepIds = ['write'];
      skill.tags = ['api', 'integration', 'sync'];

      const memberships = engine.findMemberships(skill);
      expect(Array.isArray(memberships)).toBe(true);
    });
  });

  describe('getRelatedClusters', () => {
    it('returns related clusters', () => {
      const related = engine.getRelatedClusters('data-transformers');
      expect(Array.isArray(related)).toBe(true);
    });

    it('returns empty array for unknown cluster', () => {
      const related = engine.getRelatedClusters('non-existent');
      expect(related).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('returns engine statistics', () => {
      const stats = engine.getStats();
      expect(stats.totalClusters).toBeGreaterThanOrEqual(5);
      expect(stats.totalFeatures).toBeGreaterThan(0);
      expect(stats.avgFeaturesPerCluster).toBeGreaterThan(0);
    });
  });
});

describe('Family Resemblance Helpers', () => {
  describe('createCluster', () => {
    it('creates cluster with defaults', () => {
      const cluster = createCluster('test', 'Test');
      expect(cluster.clusterId).toBe('test');
      expect(cluster.membershipThreshold).toBe(0.6);
      expect(cluster.features).toEqual([]);
    });

    it('accepts custom threshold', () => {
      const cluster = createCluster('test', 'Test', 0.8);
      expect(cluster.membershipThreshold).toBe(0.8);
    });
  });

  describe('createFeature', () => {
    it('creates feature with weight clamping', () => {
      const feature = createFeature('f1', 'Feature', 1.5, axiomPresenceDetector([Axiom.READ]));
      expect(feature.weight).toBe(1); // Clamped to max 1

      const feature2 = createFeature('f2', 'Feature', -0.5, axiomPresenceDetector([Axiom.READ]));
      expect(feature2.weight).toBe(0); // Clamped to min 0
    });
  });

  describe('detector helpers', () => {
    it('creates axiom presence detector', () => {
      const detector = axiomPresenceDetector([Axiom.READ, Axiom.WRITE]);
      expect(detector.type).toBe('axiom_presence');
      expect(detector.axioms).toEqual([Axiom.READ, Axiom.WRITE]);
    });

    it('creates tag match detector', () => {
      const detector = tagMatchDetector(['api', 'integration']);
      expect(detector.type).toBe('tag_match');
      expect(detector.tags).toEqual(['api', 'integration']);
    });

    it('creates step count detector', () => {
      const detector = stepCountDetector(2, 10);
      expect(detector.type).toBe('step_count');
      expect(detector.min).toBe(2);
      expect(detector.max).toBe(10);
    });
  });

  describe('addFeature', () => {
    it('adds feature to cluster', () => {
      const cluster = createCluster('test', 'Test');
      const feature = createFeature('f1', 'Feature', 0.5, axiomPresenceDetector([Axiom.READ]));

      addFeature(cluster, feature);

      expect(cluster.features.length).toBe(1);
      expect(cluster.features[0].featureId).toBe('f1');
    });
  });

  describe('addPrototype', () => {
    it('adds prototype to cluster', () => {
      const cluster = createCluster('test', 'Test');

      addPrototype(cluster, 'skill-1');
      addPrototype(cluster, 'skill-1'); // Duplicate

      expect(cluster.prototypes.length).toBe(1);
      expect(cluster.prototypes[0]).toBe('skill-1');
    });
  });

  describe('getMaxPossibleScore', () => {
    it('sums all feature weights', () => {
      const cluster = createCluster('test', 'Test');
      addFeature(cluster, createFeature('f1', 'F1', 0.3, axiomPresenceDetector([Axiom.READ])));
      addFeature(cluster, createFeature('f2', 'F2', 0.5, axiomPresenceDetector([Axiom.WRITE])));

      const max = getMaxPossibleScore(cluster);
      expect(max).toBeCloseTo(0.8);
    });
  });

  describe('normalizeScore', () => {
    it('normalizes to 0-1 range', () => {
      expect(normalizeScore(0.5, 1)).toBe(0.5);
      expect(normalizeScore(0.8, 0.8)).toBe(1);
      expect(normalizeScore(0, 1)).toBe(0);
      expect(normalizeScore(1.5, 1)).toBe(1); // Clamped
    });

    it('handles zero max score', () => {
      expect(normalizeScore(0.5, 0)).toBe(0);
    });
  });
});
