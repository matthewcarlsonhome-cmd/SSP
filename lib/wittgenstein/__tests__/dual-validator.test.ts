/**
 * Tests for Dual Validator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DualValidator,
  dualValidator,
  validateSkill,
  canRegisterSkill,
} from '../index';
import { Axiom, TypeLevel, createSkillDefinition, createStep, createConnection } from '../../russellian';

describe('DualValidator', () => {
  let validator: DualValidator;

  beforeEach(() => {
    validator = new DualValidator();
  });

  describe('validate', () => {
    it('validates well-formed skill', () => {
      const skill = createSkillDefinition('good-skill', 'Good Skill', 'author');
      skill.description = 'Reads, transforms, and writes data';
      skill.typeLevel = TypeLevel.LEVEL_2; // LEVEL_2 allows READ, TRANSFORM, WRITE
      skill.reducesTo = [Axiom.READ, Axiom.TRANSFORM, Axiom.WRITE];
      skill.steps = [
        createStep('read', 'Read data', Axiom.READ),
        createStep('transform', 'Transform data', Axiom.TRANSFORM),
        createStep('write', 'Write data', Axiom.WRITE),
      ];
      skill.connections = [
        createConnection('read', 'transform'),
        createConnection('transform', 'write'),
      ];
      skill.entryStepId = 'read';
      skill.exitStepIds = ['write'];
      skill.tags = ['data', 'etl'];

      const result = validator.validate(skill);

      expect(result.skillId).toBe('good-skill');
      expect(result.skillName).toBe('Good Skill');
      expect(result.russellian.isValid).toBe(true);
      expect(result.overall.canRegister).toBe(true);
      expect(result.validationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('rejects formally invalid skill', () => {
      const skill = createSkillDefinition('bad-skill', 'Bad Skill', 'author');
      // Missing required fields makes it invalid
      skill.typeLevel = TypeLevel.LEVEL_0;
      skill.steps = [];
      skill.connections = [];
      skill.entryStepId = 'nonexistent';
      skill.exitStepIds = [];

      const result = validator.validate(skill);

      expect(result.russellian.isValid).toBe(false);
      expect(result.overall.canRegister).toBe(false);
    });

    it('validates with game context', () => {
      const skill = createSkillDefinition('sales-skill', 'Sales Lead Processor', 'author');
      skill.description = 'Lead qualification and CRM sync';
      skill.typeLevel = TypeLevel.LEVEL_2; // LEVEL_2 for READ, TRANSFORM, WRITE
      skill.reducesTo = [Axiom.READ, Axiom.TRANSFORM, Axiom.WRITE];
      skill.steps = [
        createStep('read', 'Read lead', Axiom.READ),
        createStep('transform', 'Qualify lead', Axiom.TRANSFORM),
        createStep('write', 'Update CRM', Axiom.WRITE),
      ];
      skill.connections = [
        createConnection('read', 'transform'),
        createConnection('transform', 'write'),
      ];
      skill.entryStepId = 'read';
      skill.exitStepIds = ['write'];
      skill.tags = ['sales', 'crm', 'lead'];

      const result = validator.validate(skill, {
        intendedGame: 'sales-automation',
      });

      expect(result.context.intendedGame).toBe('sales-automation');
      expect(result.wittgensteinian.gameCompatibility).not.toBeNull();
    });

    it('validates with cluster context', () => {
      const skill = createSkillDefinition('transform-skill', 'Data Transformer', 'author');
      skill.description = 'ETL data transformation';
      skill.typeLevel = TypeLevel.LEVEL_1; // LEVEL_1 for READ, TRANSFORM
      skill.reducesTo = [Axiom.READ, Axiom.TRANSFORM];
      skill.steps = [
        createStep('read', 'Read source', Axiom.READ),
        createStep('transform', 'Transform', Axiom.TRANSFORM),
      ];
      skill.connections = [createConnection('read', 'transform')];
      skill.entryStepId = 'read';
      skill.exitStepIds = ['transform'];
      skill.tags = ['data', 'transform', 'etl'];

      const result = validator.validate(skill, {
        intendedClusters: ['data-transformers'],
      });

      expect(result.context.intendedClusters).toContain('data-transformers');
      expect(result.wittgensteinian.familyResemblance).toBeDefined();
    });

    it('skips Russellian validation when requested', () => {
      const skill = createSkillDefinition('skip-russell', 'Skip Russell', 'author');
      skill.typeLevel = TypeLevel.LEVEL_1; // LEVEL_1 for READ
      skill.steps = [createStep('read', 'Read', Axiom.READ)];
      skill.connections = [];
      skill.entryStepId = 'read';
      skill.exitStepIds = ['read'];

      const result = validator.validate(skill, { skipRussellian: true });

      // Russellian result should be empty/default
      expect(result.russellian.isValid).toBe(true);
      expect(result.russellian.allErrors.length).toBe(0);
    });
  });

  describe('quickCheck', () => {
    it('performs quick eligibility check', () => {
      const skill = createSkillDefinition('quick-skill', 'Quick Skill', 'author');
      skill.description = 'A quick skill';
      skill.typeLevel = TypeLevel.LEVEL_1; // LEVEL_1 for READ, TRANSFORM
      skill.reducesTo = [Axiom.READ, Axiom.TRANSFORM];
      skill.steps = [
        createStep('read', 'Read', Axiom.READ),
        createStep('transform', 'Transform', Axiom.TRANSFORM),
      ];
      skill.connections = [createConnection('read', 'transform')];
      skill.entryStepId = 'read';
      skill.exitStepIds = ['transform'];
      skill.tags = [];

      const check = validator.quickCheck(skill);

      expect(typeof check.canRegister).toBe('boolean');
      expect(typeof check.shouldRegister).toBe('boolean');
      expect(Array.isArray(check.issues)).toBe(true);
    });

    it('returns false canRegister for invalid skill', () => {
      const skill = createSkillDefinition('invalid', 'Invalid', 'author');
      skill.steps = [];
      skill.connections = [];
      skill.entryStepId = 'nonexistent';
      skill.exitStepIds = [];

      const check = validator.quickCheck(skill);

      expect(check.canRegister).toBe(false);
      expect(check.issues.length).toBeGreaterThan(0);
    });
  });

  describe('validateForGame', () => {
    it('validates skill for specific game', () => {
      const skill = createSkillDefinition('support-skill', 'Support Ticket Handler', 'author');
      skill.description = 'Customer support ticket processing';
      skill.typeLevel = TypeLevel.LEVEL_2; // LEVEL_2 for READ, GENERATE, WRITE
      skill.reducesTo = [Axiom.READ, Axiom.GENERATE, Axiom.WRITE];
      skill.steps = [
        createStep('read', 'Read ticket', Axiom.READ),
        createStep('generate', 'Generate response', Axiom.GENERATE),
        createStep('write', 'Send response', Axiom.WRITE),
      ];
      skill.connections = [
        createConnection('read', 'generate'),
        createConnection('generate', 'write'),
      ];
      skill.entryStepId = 'read';
      skill.exitStepIds = ['write'];
      skill.tags = ['support', 'ticket'];

      const result = validator.validateForGame(skill, 'customer-support');

      expect(result.context.intendedGame).toBe('customer-support');
      expect(result.wittgensteinian.gameCompatibility).not.toBeNull();
    });
  });

  describe('makesSense', () => {
    it('checks if skill makes contextual sense', () => {
      const skill = createSkillDefinition('sensible', 'Sensible', 'author');
      skill.description = 'Does something sensible';
      skill.typeLevel = TypeLevel.LEVEL_1; // LEVEL_1 for READ, TRANSFORM
      skill.reducesTo = [Axiom.READ, Axiom.TRANSFORM];
      skill.steps = [
        createStep('read', 'Read', Axiom.READ),
        createStep('transform', 'Transform', Axiom.TRANSFORM),
      ];
      skill.connections = [createConnection('read', 'transform')];
      skill.entryStepId = 'read';
      skill.exitStepIds = ['transform'];

      const makesSense = validator.makesSense(skill);

      expect(typeof makesSense).toBe('boolean');
    });
  });
});

describe('Dual Validator Convenience Functions', () => {
  describe('validateSkill', () => {
    it('uses singleton validator', () => {
      const skill = createSkillDefinition('singleton-test', 'Test', 'author');
      skill.description = 'Test skill';
      skill.typeLevel = TypeLevel.LEVEL_0;
      skill.reducesTo = [Axiom.TRANSFORM];
      skill.steps = [createStep('transform', 'Transform', Axiom.TRANSFORM)];
      skill.connections = [];
      skill.entryStepId = 'transform';
      skill.exitStepIds = ['transform'];

      const result = validateSkill(skill);

      expect(result.skillId).toBe('singleton-test');
    });
  });

  describe('canRegisterSkill', () => {
    it('uses singleton validator for quick check', () => {
      const skill = createSkillDefinition('quick-test', 'Test', 'author');
      skill.description = 'Test skill';
      skill.typeLevel = TypeLevel.LEVEL_0;
      skill.reducesTo = [Axiom.TRANSFORM];
      skill.steps = [createStep('transform', 'Transform', Axiom.TRANSFORM)];
      skill.connections = [];
      skill.entryStepId = 'transform';
      skill.exitStepIds = ['transform'];

      const check = canRegisterSkill(skill);

      expect(typeof check.canRegister).toBe('boolean');
      expect(typeof check.shouldRegister).toBe('boolean');
    });
  });
});

describe('Dual Validation Result Structure', () => {
  it('has correct structure', () => {
    const skill = createSkillDefinition('struct-test', 'Structure Test', 'author');
    skill.description = 'Testing result structure';
    skill.typeLevel = TypeLevel.LEVEL_1; // LEVEL_1 for READ
    skill.reducesTo = [Axiom.READ];
    skill.steps = [createStep('read', 'Read', Axiom.READ)];
    skill.connections = [];
    skill.entryStepId = 'read';
    skill.exitStepIds = ['read'];

    const result = validateSkill(skill);

    // Check structure
    expect(result).toHaveProperty('skillId');
    expect(result).toHaveProperty('skillName');
    expect(result).toHaveProperty('russellian');
    expect(result).toHaveProperty('wittgensteinian');
    expect(result).toHaveProperty('overall');
    expect(result).toHaveProperty('context');
    expect(result).toHaveProperty('validatedAt');
    expect(result).toHaveProperty('validationTimeMs');

    // Russellian structure
    expect(result.russellian).toHaveProperty('isValid');
    expect(result.russellian).toHaveProperty('compositionErrors');
    expect(result.russellian).toHaveProperty('typeLevelErrors');
    expect(result.russellian).toHaveProperty('circularDependencies');
    expect(result.russellian).toHaveProperty('allErrors');
    expect(result.russellian).toHaveProperty('fullResult');

    // Wittgensteinian structure
    expect(result.wittgensteinian).toHaveProperty('makesSense');
    expect(result.wittgensteinian).toHaveProperty('grammarResult');
    expect(result.wittgensteinian).toHaveProperty('grammaticalIssues');
    expect(result.wittgensteinian).toHaveProperty('gameCompatibility');
    expect(result.wittgensteinian).toHaveProperty('familyResemblance');
    expect(result.wittgensteinian).toHaveProperty('contextualWarnings');

    // Overall structure
    expect(result.overall).toHaveProperty('canRegister');
    expect(result.overall).toHaveProperty('shouldRegister');
    expect(result.overall).toHaveProperty('confidence');
    expect(result.overall).toHaveProperty('recommendations');
    expect(result.overall).toHaveProperty('summary');
    expect(result.overall).toHaveProperty('riskLevel');
  });
});
