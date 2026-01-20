/**
 * Tests for RussellianValidator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RussellianValidator,
  Axiom,
  TypeLevel,
  type SkillDefinition,
  createSkillDefinition,
  createStep,
  createConnection,
} from '../index';

describe('RussellianValidator', () => {
  let validator: RussellianValidator;

  beforeEach(() => {
    validator = new RussellianValidator();
  });

  describe('validateComposition', () => {
    it('allows READ -> TRANSFORM', () => {
      const result = validator.validateComposition(Axiom.READ, Axiom.TRANSFORM);
      expect(result.allowed).toBe(true);
      expect(result.rule).not.toBeNull();
      expect(result.rule?.id).toBe('rule_001');
    });

    it('allows TRANSFORM -> TRANSFORM', () => {
      const result = validator.validateComposition(Axiom.TRANSFORM, Axiom.TRANSFORM);
      expect(result.allowed).toBe(true);
      expect(result.rule?.id).toBe('rule_002');
    });

    it('allows TRANSFORM -> WRITE', () => {
      const result = validator.validateComposition(Axiom.TRANSFORM, Axiom.WRITE);
      expect(result.allowed).toBe(true);
    });

    it('allows READ -> GENERATE', () => {
      const result = validator.validateComposition(Axiom.READ, Axiom.GENERATE);
      expect(result.allowed).toBe(true);
    });

    it('forbids GENERATE -> GENERATE', () => {
      const result = validator.validateComposition(Axiom.GENERATE, Axiom.GENERATE);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('LLM output must be processed');
    });

    it('forbids READ -> WRITE (must transform first)', () => {
      const result = validator.validateComposition(Axiom.READ, Axiom.WRITE);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('transformed before writing');
    });

    it('forbids GENERATE -> WRITE (must validate first)', () => {
      const result = validator.validateComposition(Axiom.GENERATE, Axiom.WRITE);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('validated before writing');
    });

    it('forbids WRITE -> WRITE', () => {
      const result = validator.validateComposition(Axiom.WRITE, Axiom.WRITE);
      expect(result.allowed).toBe(false);
    });

    it('forbids DECIDE -> DECIDE', () => {
      const result = validator.validateComposition(Axiom.DECIDE, Axiom.DECIDE);
      expect(result.allowed).toBe(false);
    });

    it('handles wildcard rules correctly - DECIDE can go to anything', () => {
      // DECIDE -> READ should be allowed via rule_005 (decide_to_any)
      const result = validator.validateComposition(Axiom.DECIDE, Axiom.READ);
      expect(result.allowed).toBe(true);
    });

    it('handles wildcard rules correctly - anything can go to VALIDATE', () => {
      // GENERATE -> VALIDATE should be allowed via rule_010 (any_to_validate)
      const result = validator.validateComposition(Axiom.GENERATE, Axiom.VALIDATE);
      expect(result.allowed).toBe(true);
    });

    it('handles wildcard rules correctly - WAIT can go anywhere', () => {
      const result = validator.validateComposition(Axiom.WAIT, Axiom.WRITE);
      expect(result.allowed).toBe(true);
    });
  });

  describe('validateInvocation', () => {
    it('allows LEVEL_3 to invoke LEVEL_2', () => {
      const result = validator.validateInvocation(TypeLevel.LEVEL_3, TypeLevel.LEVEL_2);
      expect(result.allowed).toBe(true);
    });

    it('allows LEVEL_3 to invoke LEVEL_1', () => {
      const result = validator.validateInvocation(TypeLevel.LEVEL_3, TypeLevel.LEVEL_1);
      expect(result.allowed).toBe(true);
    });

    it('allows LEVEL_3 to invoke LEVEL_0', () => {
      const result = validator.validateInvocation(TypeLevel.LEVEL_3, TypeLevel.LEVEL_0);
      expect(result.allowed).toBe(true);
    });

    it('forbids LEVEL_2 to invoke LEVEL_2 (same level)', () => {
      const result = validator.validateInvocation(TypeLevel.LEVEL_2, TypeLevel.LEVEL_2);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Same-level');
    });

    it('forbids LEVEL_1 to invoke LEVEL_2 (lower invoking higher)', () => {
      const result = validator.validateInvocation(TypeLevel.LEVEL_1, TypeLevel.LEVEL_2);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cannot invoke');
    });

    it('forbids LEVEL_0 to invoke anything', () => {
      const result = validator.validateInvocation(TypeLevel.LEVEL_0, TypeLevel.LEVEL_0);
      expect(result.allowed).toBe(false);
    });
  });

  describe('computeEffectiveLevel', () => {
    it('returns LEVEL_0 for pure TRANSFORM skills', () => {
      const skill = createSkillDefinition('test', 'Test', 'author');
      skill.reducesTo = [Axiom.TRANSFORM];
      skill.typeLevel = TypeLevel.LEVEL_0;

      const level = validator.computeEffectiveLevel(skill);
      expect(level).toBe(TypeLevel.LEVEL_0);
    });

    it('returns LEVEL_1 for skills with READ', () => {
      const skill = createSkillDefinition('test', 'Test', 'author');
      skill.reducesTo = [Axiom.READ, Axiom.TRANSFORM];

      const level = validator.computeEffectiveLevel(skill);
      expect(level).toBe(TypeLevel.LEVEL_1);
    });

    it('returns LEVEL_2 for skills with WRITE', () => {
      const skill = createSkillDefinition('test', 'Test', 'author');
      skill.reducesTo = [Axiom.READ, Axiom.TRANSFORM, Axiom.WRITE];

      const level = validator.computeEffectiveLevel(skill);
      expect(level).toBe(TypeLevel.LEVEL_2);
    });

    it('returns LEVEL_2 for skills with GENERATE', () => {
      const skill = createSkillDefinition('test', 'Test', 'author');
      skill.reducesTo = [Axiom.READ, Axiom.GENERATE];

      const level = validator.computeEffectiveLevel(skill);
      expect(level).toBe(TypeLevel.LEVEL_2);
    });

    it('returns invoked_level + 1 for composer skills', () => {
      const skill = createSkillDefinition('test', 'Test', 'author');
      skill.reducesTo = [Axiom.TRANSFORM];
      skill.invokesSkills = ['level-2-skill'];

      // Mock getSkillLevel to return LEVEL_2 for the invoked skill
      const level = validator.computeEffectiveLevel(
        skill,
        (id) => (id === 'level-2-skill' ? TypeLevel.LEVEL_2 : null)
      );
      expect(level).toBe(TypeLevel.LEVEL_3);
    });
  });

  describe('validateSkill', () => {
    it('validates a valid pure TRANSFORM skill', () => {
      const skill = createSkillDefinition('pure-test', 'Pure Test', 'author');
      skill.description = 'A pure transformation skill';
      skill.typeLevel = TypeLevel.LEVEL_0;
      skill.reducesTo = [Axiom.TRANSFORM];

      skill.steps = [
        createStep('step1', 'Transform 1', Axiom.TRANSFORM),
        createStep('step2', 'Transform 2', Axiom.TRANSFORM),
      ];

      skill.connections = [
        createConnection('step1', 'step2'),
      ];

      skill.entryStepId = 'step1';
      skill.exitStepIds = ['step2'];

      const result = validator.validateSkill(skill);
      expect(result.isValid).toBe(true);
    });

    it('rejects skill with forbidden composition', () => {
      const skill = createSkillDefinition('invalid', 'Invalid', 'author');
      skill.typeLevel = TypeLevel.LEVEL_2;
      skill.reducesTo = [Axiom.GENERATE, Axiom.WRITE];

      skill.steps = [
        createStep('step1', 'Generate', Axiom.GENERATE),
        createStep('step2', 'Write', Axiom.WRITE),
      ];

      skill.connections = [
        createConnection('step1', 'step2'), // GENERATE -> WRITE is forbidden
      ];

      skill.entryStepId = 'step1';
      skill.exitStepIds = ['step2'];

      const result = validator.validateSkill(skill);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_COMP_001')).toBe(true);
    });

    it('rejects skill with insufficient type level', () => {
      const skill = createSkillDefinition('low-level', 'Low Level', 'author');
      skill.typeLevel = TypeLevel.LEVEL_0; // Declared as pure
      skill.reducesTo = [Axiom.WRITE]; // But uses WRITE!

      skill.steps = [createStep('step1', 'Write', Axiom.WRITE)];
      skill.entryStepId = 'step1';
      skill.exitStepIds = ['step1'];

      const result = validator.validateSkill(skill);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'E_LEVEL_001')).toBe(true);
    });

    it('rejects skill with missing entry step', () => {
      const skill = createSkillDefinition('no-entry', 'No Entry', 'author');
      skill.typeLevel = TypeLevel.LEVEL_0;
      skill.reducesTo = [Axiom.TRANSFORM];
      skill.steps = [createStep('step1', 'Step', Axiom.TRANSFORM)];
      skill.exitStepIds = ['step1'];
      // Missing entryStepId

      const result = validator.validateSkill(skill);
      expect(result.isValid).toBe(false);
    });

    it('rejects skill with duplicate step IDs', () => {
      const skill = createSkillDefinition('duplicate', 'Duplicate', 'author');
      skill.typeLevel = TypeLevel.LEVEL_0;
      skill.reducesTo = [Axiom.TRANSFORM];
      skill.steps = [
        createStep('step1', 'Step A', Axiom.TRANSFORM),
        createStep('step1', 'Step B', Axiom.TRANSFORM), // Same ID!
      ];
      skill.entryStepId = 'step1';
      skill.exitStepIds = ['step1'];

      const result = validator.validateSkill(skill);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Duplicate'))).toBe(true);
    });
  });

  describe('detectCircularDependencies', () => {
    it('detects A -> B -> A cycle', () => {
      const skillA = createSkillDefinition('skill-a', 'Skill A', 'author');
      skillA.invokesSkills = ['skill-b'];

      const skillB = createSkillDefinition('skill-b', 'Skill B', 'author');
      skillB.invokesSkills = ['skill-a'];

      const getSkill = (id: string) => {
        if (id === 'skill-a') return skillA;
        if (id === 'skill-b') return skillB;
        return null;
      };

      const result = validator.detectCircularDependencies('skill-a', getSkill);
      expect(result.hasCycle).toBe(true);
    });

    it('detects A -> B -> C -> A cycle', () => {
      const skillA = createSkillDefinition('skill-a', 'Skill A', 'author');
      skillA.invokesSkills = ['skill-b'];

      const skillB = createSkillDefinition('skill-b', 'Skill B', 'author');
      skillB.invokesSkills = ['skill-c'];

      const skillC = createSkillDefinition('skill-c', 'Skill C', 'author');
      skillC.invokesSkills = ['skill-a'];

      const getSkill = (id: string) => {
        if (id === 'skill-a') return skillA;
        if (id === 'skill-b') return skillB;
        if (id === 'skill-c') return skillC;
        return null;
      };

      const result = validator.detectCircularDependencies('skill-a', getSkill);
      expect(result.hasCycle).toBe(true);
    });

    it('allows A -> B, A -> C (diamond, no cycle)', () => {
      const skillA = createSkillDefinition('skill-a', 'Skill A', 'author');
      skillA.invokesSkills = ['skill-b', 'skill-c'];

      const skillB = createSkillDefinition('skill-b', 'Skill B', 'author');
      const skillC = createSkillDefinition('skill-c', 'Skill C', 'author');

      const getSkill = (id: string) => {
        if (id === 'skill-a') return skillA;
        if (id === 'skill-b') return skillB;
        if (id === 'skill-c') return skillC;
        return null;
      };

      const result = validator.detectCircularDependencies('skill-a', getSkill);
      expect(result.hasCycle).toBe(false);
    });

    it('handles skill with no dependencies', () => {
      const skill = createSkillDefinition('standalone', 'Standalone', 'author');

      const result = validator.detectCircularDependencies('standalone', () => skill);
      expect(result.hasCycle).toBe(false);
    });
  });
});
