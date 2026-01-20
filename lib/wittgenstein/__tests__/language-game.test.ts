/**
 * Tests for Language Game Registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LanguageGameRegistry,
  createLanguageGame,
  createVocabularyEntry,
  addVocabulary,
  createSuccessCriterion,
  addSuccessCriterion,
  hasVocabulary,
  lookupVocabulary,
} from '../index';
import { Axiom, TypeLevel, createSkillDefinition, createStep } from '../../russellian';

describe('LanguageGameRegistry', () => {
  let registry: LanguageGameRegistry;

  beforeEach(() => {
    registry = new LanguageGameRegistry();
  });

  describe('default games', () => {
    it('has sales-automation game registered', () => {
      const game = registry.getGame('sales-automation');
      expect(game).not.toBeNull();
      expect(game?.name).toBe('Sales Automation');
    });

    it('has data-pipeline game registered', () => {
      const game = registry.getGame('data-pipeline');
      expect(game).not.toBeNull();
      expect(game?.name).toBe('Data Pipeline');
    });

    it('has content-generation game registered', () => {
      const game = registry.getGame('content-generation');
      expect(game).not.toBeNull();
      expect(game?.name).toBe('Content Generation');
    });

    it('has customer-support game registered', () => {
      const game = registry.getGame('customer-support');
      expect(game).not.toBeNull();
      expect(game?.name).toBe('Customer Support');
    });
  });

  describe('registerGame', () => {
    it('registers a new game', () => {
      const game = createLanguageGame('test-game', 'Test Game', 'test-form');
      registry.registerGame(game);

      const retrieved = registry.getGame('test-game');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Test Game');
    });

    it('throws on duplicate game ID', () => {
      const game = createLanguageGame('duplicate', 'First', 'form');
      registry.registerGame(game);

      const duplicate = createLanguageGame('duplicate', 'Second', 'form');
      expect(() => registry.registerGame(duplicate)).toThrow();
    });
  });

  describe('getRelatedGames', () => {
    it('returns related games', () => {
      const salesGame = registry.getGame('sales-automation');
      expect(salesGame?.relatedGames).toContain('content-generation');

      const related = registry.getRelatedGames('sales-automation');
      expect(related.length).toBeGreaterThan(0);
      expect(related.some((g) => g.gameId === 'content-generation')).toBe(true);
    });

    it('returns empty array for unknown game', () => {
      const related = registry.getRelatedGames('non-existent');
      expect(related).toEqual([]);
    });
  });

  describe('getAxiomMeaning', () => {
    it('returns axiom meaning for game', () => {
      const meaning = registry.getAxiomMeaning(Axiom.READ, 'sales-automation');
      expect(meaning).not.toBeNull();
      expect(meaning?.axiom).toBe(Axiom.READ);
      expect(meaning?.meaningInGame).toContain('CRM');
    });

    it('returns null for unknown game', () => {
      const meaning = registry.getAxiomMeaning(Axiom.READ, 'non-existent');
      expect(meaning).toBeNull();
    });
  });

  describe('lookupTerm', () => {
    it('finds vocabulary term in game', () => {
      const term = registry.lookupTerm('lead', 'sales-automation');
      expect(term).not.toBeNull();
      expect(term?.term).toBe('lead');
    });

    it('returns null for unknown term', () => {
      const term = registry.lookupTerm('foobar', 'sales-automation');
      expect(term).toBeNull();
    });
  });

  describe('checkCompatibility', () => {
    it('checks skill compatibility with game', () => {
      const skill = createSkillDefinition('sales-skill', 'Sales Skill', 'author');
      skill.description = 'Lead qualification and outreach';
      skill.typeLevel = TypeLevel.LEVEL_0;
      skill.reducesTo = [Axiom.READ, Axiom.TRANSFORM];
      skill.steps = [
        createStep('read', 'Read CRM', Axiom.READ),
        createStep('transform', 'Qualify lead', Axiom.TRANSFORM),
      ];
      skill.connections = [{ fromStepId: 'read', toStepId: 'transform' }];
      skill.entryStepId = 'read';
      skill.exitStepIds = ['transform'];
      skill.tags = ['sales', 'crm'];

      const compatibility = registry.checkCompatibility(skill, 'sales-automation');

      expect(compatibility.gameId).toBe('sales-automation');
      expect(compatibility.compatibilityScore).toBeGreaterThan(0);
    });

    it('returns low score for non-existent game', () => {
      const skill = createSkillDefinition('test', 'Test', 'author');
      skill.steps = [];
      skill.connections = [];
      skill.entryStepId = '';
      skill.exitStepIds = [];

      const compatibility = registry.checkCompatibility(skill, 'non-existent');

      expect(compatibility.compatibilityScore).toBe(0);
      expect(compatibility.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('getEffectiveRules', () => {
    it('returns base rules for unknown game', () => {
      const rules = registry.getEffectiveRules('non-existent');
      expect(rules.length).toBeGreaterThan(0);
    });

    it('returns rules for known game', () => {
      const rules = registry.getEffectiveRules('sales-automation');
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('getAllGames', () => {
    it('returns all registered games', () => {
      const games = registry.getAllGames();
      expect(games.length).toBeGreaterThanOrEqual(4); // Default games
    });
  });

  describe('getStats', () => {
    it('returns registry statistics', () => {
      const stats = registry.getStats();
      expect(stats.totalGames).toBeGreaterThanOrEqual(4);
      expect(stats.gamesByForm).toBeDefined();
    });
  });
});

describe('Language Game Helpers', () => {
  describe('createLanguageGame', () => {
    it('creates a game with required fields', () => {
      const game = createLanguageGame('test', 'Test Game', 'test-form');
      expect(game.gameId).toBe('test');
      expect(game.name).toBe('Test Game');
      expect(game.formOfLife).toBe('test-form');
      expect(game.vocabulary).toEqual({});
    });
  });

  describe('vocabulary helpers', () => {
    it('adds vocabulary to game', () => {
      const game = createLanguageGame('test', 'Test', 'form');
      const entry = createVocabularyEntry('term', 'meaning');

      addVocabulary(game, entry);

      expect(hasVocabulary(game, 'term')).toBe(true);
      expect(lookupVocabulary(game, 'term')).toBe(entry);
    });
  });

  describe('success criteria helpers', () => {
    it('adds success criterion to game', () => {
      const game = createLanguageGame('test', 'Test', 'form');
      const criterion = createSuccessCriterion('crit', 'Success happens', 'automatic');

      addSuccessCriterion(game, criterion);

      expect(game.successCriteria.length).toBe(1);
      expect(game.successCriteria[0].criterionId).toBe('crit');
    });
  });
});
