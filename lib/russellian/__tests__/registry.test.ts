/**
 * Tests for SkillRegistry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SkillRegistry,
  Axiom,
  TypeLevel,
  type SkillDefinition,
  createSkillDefinition,
  createStep,
  createConnection,
} from '../index';

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  function createValidSkill(id: string, name: string): SkillDefinition {
    const skill = createSkillDefinition(id, name, 'test-author');
    skill.description = `Test skill: ${name}`;
    skill.typeLevel = TypeLevel.LEVEL_0;
    skill.reducesTo = [Axiom.TRANSFORM];
    skill.steps = [
      createStep('step1', 'Transform', Axiom.TRANSFORM),
    ];
    skill.connections = [];
    skill.entryStepId = 'step1';
    skill.exitStepIds = ['step1'];
    skill.tags = ['test'];
    return skill;
  }

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  describe('register', () => {
    it('validates skills before registration', () => {
      const skill = createValidSkill('test-skill', 'Test Skill');
      const result = registry.register(skill);

      expect(result.success).toBe(true);
      expect(result.skillId).toBe('test-skill');
    });

    it('rejects invalid skills', () => {
      const skill = createSkillDefinition('invalid', 'Invalid', 'author');
      // Missing required fields

      const result = registry.register(skill);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('prevents duplicate skill IDs', () => {
      const skill1 = createValidSkill('duplicate', 'Skill 1');
      const skill2 = createValidSkill('duplicate', 'Skill 2');

      registry.register(skill1);
      const result = registry.register(skill2);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]?.code).toBe('E_DUPLICATE');
    });

    it('allows skipValidation for trusted imports', () => {
      const skill = createSkillDefinition('skip-val', 'Skip Validation', 'author');
      skill.isValid = true; // Pretend it's valid

      const result = registry.register(skill, true);

      expect(result.success).toBe(true);
    });
  });

  describe('get', () => {
    it('retrieves registered skill by ID', () => {
      const skill = createValidSkill('get-test', 'Get Test');
      registry.register(skill);

      const retrieved = registry.get('get-test');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.skillId).toBe('get-test');
      expect(retrieved?.name).toBe('Get Test');
    });

    it('returns null for non-existent skill', () => {
      const retrieved = registry.get('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('getByLevel', () => {
    it('finds skills by level', () => {
      const skill0 = createValidSkill('level-0-skill', 'Level 0');
      skill0.typeLevel = TypeLevel.LEVEL_0;

      const skill1 = createValidSkill('level-1-skill', 'Level 1');
      skill1.typeLevel = TypeLevel.LEVEL_1;
      skill1.reducesTo = [Axiom.READ];

      const skill2 = createValidSkill('level-2-skill', 'Level 2');
      skill2.typeLevel = TypeLevel.LEVEL_2;
      skill2.reducesTo = [Axiom.WRITE];

      registry.register(skill0);
      registry.register(skill1);
      registry.register(skill2);

      const level0Skills = registry.getByLevel(TypeLevel.LEVEL_0);
      const level1Skills = registry.getByLevel(TypeLevel.LEVEL_1);

      expect(level0Skills.length).toBe(1);
      expect(level0Skills[0].skillId).toBe('level-0-skill');
      expect(level1Skills.length).toBe(1);
      expect(level1Skills[0].skillId).toBe('level-1-skill');
    });
  });

  describe('getDependents', () => {
    it('finds dependents correctly', () => {
      const baseSkill = createValidSkill('base-skill', 'Base Skill');

      const dependentSkill = createValidSkill('dependent-skill', 'Dependent Skill');
      dependentSkill.typeLevel = TypeLevel.LEVEL_3;
      dependentSkill.invokesSkills = ['base-skill'];

      registry.register(baseSkill);
      registry.register(dependentSkill);

      const dependents = registry.getDependents('base-skill');

      expect(dependents.length).toBe(1);
      expect(dependents[0].skillId).toBe('dependent-skill');
    });

    it('returns empty array for skill with no dependents', () => {
      const skill = createValidSkill('no-deps', 'No Deps');
      registry.register(skill);

      const dependents = registry.getDependents('no-deps');
      expect(dependents.length).toBe(0);
    });
  });

  describe('getDependencies', () => {
    it('finds direct dependencies', () => {
      const dep1 = createValidSkill('dep-1', 'Dependency 1');
      const dep2 = createValidSkill('dep-2', 'Dependency 2');

      const skill = createValidSkill('with-deps', 'With Dependencies');
      skill.typeLevel = TypeLevel.LEVEL_3;
      skill.invokesSkills = ['dep-1', 'dep-2'];

      registry.register(dep1);
      registry.register(dep2);
      registry.register(skill);

      const deps = registry.getDependencies('with-deps');

      expect(deps.length).toBe(2);
      expect(deps.map((d) => d.skillId)).toContain('dep-1');
      expect(deps.map((d) => d.skillId)).toContain('dep-2');
    });
  });

  describe('getAllDependencies', () => {
    it('finds transitive dependencies', () => {
      const deepDep = createValidSkill('deep-dep', 'Deep Dependency');

      const midDep = createValidSkill('mid-dep', 'Mid Dependency');
      midDep.typeLevel = TypeLevel.LEVEL_3;
      midDep.invokesSkills = ['deep-dep'];

      const topSkill = createValidSkill('top-skill', 'Top Skill');
      topSkill.typeLevel = TypeLevel.LEVEL_4;
      topSkill.invokesSkills = ['mid-dep'];

      registry.register(deepDep);
      registry.register(midDep);
      registry.register(topSkill);

      const allDeps = registry.getAllDependencies('top-skill');

      expect(allDeps.length).toBe(2);
      expect(allDeps.map((d) => d.skillId)).toContain('mid-dep');
      expect(allDeps.map((d) => d.skillId)).toContain('deep-dep');
    });
  });

  describe('unregister', () => {
    it('prevents unregistering skills with dependents', () => {
      const baseSkill = createValidSkill('base', 'Base');
      const dependentSkill = createValidSkill('dependent', 'Dependent');
      dependentSkill.typeLevel = TypeLevel.LEVEL_3;
      dependentSkill.invokesSkills = ['base'];

      registry.register(baseSkill);
      registry.register(dependentSkill);

      const result = registry.unregister('base');

      expect(result.success).toBe(false);
      expect(result.reason).toContain('depend on this skill');
    });

    it('allows force unregister', () => {
      const baseSkill = createValidSkill('base', 'Base');
      const dependentSkill = createValidSkill('dependent', 'Dependent');
      dependentSkill.typeLevel = TypeLevel.LEVEL_3;
      dependentSkill.invokesSkills = ['base'];

      registry.register(baseSkill);
      registry.register(dependentSkill);

      const result = registry.unregister('base', true);

      expect(result.success).toBe(true);
      expect(registry.get('base')).toBeNull();
    });

    it('succeeds for skill with no dependents', () => {
      const skill = createValidSkill('solo', 'Solo');
      registry.register(skill);

      const result = registry.unregister('solo');

      expect(result.success).toBe(true);
      expect(registry.get('solo')).toBeNull();
    });

    it('fails for non-existent skill', () => {
      const result = registry.unregister('non-existent');
      expect(result.success).toBe(false);
    });
  });

  describe('export', () => {
    it('exports all registered skills', () => {
      registry.register(createValidSkill('skill-1', 'Skill 1'));
      registry.register(createValidSkill('skill-2', 'Skill 2'));
      registry.register(createValidSkill('skill-3', 'Skill 3'));

      const exported = registry.export();

      expect(exported.version).toBe('1.0.0');
      expect(exported.skills.length).toBe(3);
      expect(exported.metadata?.totalSkills).toBe(3);
    });

    it('includes level breakdown in metadata', () => {
      const skill0 = createValidSkill('level-0', 'Level 0');
      skill0.typeLevel = TypeLevel.LEVEL_0;

      const skill1 = createValidSkill('level-1', 'Level 1');
      skill1.typeLevel = TypeLevel.LEVEL_1;
      skill1.reducesTo = [Axiom.READ];

      registry.register(skill0);
      registry.register(skill1);

      const exported = registry.export();

      expect(exported.metadata?.skillsByLevel[TypeLevel.LEVEL_0]).toBe(1);
      expect(exported.metadata?.skillsByLevel[TypeLevel.LEVEL_1]).toBe(1);
    });
  });

  describe('import', () => {
    it('imports skills from export', () => {
      // Create source registry
      const sourceRegistry = new SkillRegistry();
      sourceRegistry.register(createValidSkill('import-1', 'Import 1'));
      sourceRegistry.register(createValidSkill('import-2', 'Import 2'));

      const exported = sourceRegistry.export();

      // Import into target registry
      const result = registry.import(exported);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(registry.get('import-1')).not.toBeNull();
      expect(registry.get('import-2')).not.toBeNull();
    });

    it('skips existing skills unless overwrite', () => {
      registry.register(createValidSkill('existing', 'Existing'));

      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        skills: [createValidSkill('existing', 'New Version')],
      };

      const result = registry.import(exportData);

      expect(result.skipped.length).toBe(1);
      expect(result.skipped[0]).toBe('existing');
      expect(result.imported).toBe(0);
    });

    it('overwrites when flag is set', () => {
      registry.register(createValidSkill('overwrite-me', 'Original'));

      const newSkill = createValidSkill('overwrite-me', 'Updated');
      newSkill.description = 'Updated description';

      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        skills: [newSkill],
      };

      const result = registry.import(exportData, true);

      expect(result.imported).toBe(1);
      expect(registry.get('overwrite-me')?.description).toBe('Updated description');
    });

    it('reports failed imports', () => {
      const invalidSkill = createSkillDefinition('invalid', 'Invalid', 'author');
      // Missing required fields - will fail validation

      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        skills: [invalidSkill, createValidSkill('valid', 'Valid')],
      };

      const result = registry.import(exportData);

      expect(result.success).toBe(false);
      expect(result.imported).toBe(1);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].skillId).toBe('invalid');
    });
  });

  describe('getStats', () => {
    it('returns accurate statistics', () => {
      const skill0 = createValidSkill('skill-0', 'Skill 0');
      skill0.typeLevel = TypeLevel.LEVEL_0;

      const skill1 = createValidSkill('skill-1', 'Skill 1');
      skill1.typeLevel = TypeLevel.LEVEL_1;
      skill1.reducesTo = [Axiom.READ];

      const skill2 = createValidSkill('skill-2', 'Skill 2');
      skill2.typeLevel = TypeLevel.LEVEL_3;
      skill2.invokesSkills = ['skill-0'];

      registry.register(skill0);
      registry.register(skill1);
      registry.register(skill2);

      const stats = registry.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byLevel[TypeLevel.LEVEL_0]).toBe(1);
      expect(stats.byLevel[TypeLevel.LEVEL_1]).toBe(1);
      expect(stats.byLevel[TypeLevel.LEVEL_3]).toBe(1);
      expect(stats.withDependencies).toBe(1);
    });
  });

  describe('search', () => {
    it('finds skills by name', () => {
      registry.register(createValidSkill('alpha', 'Alpha Search'));
      registry.register(createValidSkill('beta', 'Beta Test'));
      registry.register(createValidSkill('gamma', 'Gamma Search'));

      const results = registry.search('search');

      expect(results.length).toBe(2);
      expect(results.map((s) => s.skillId)).toContain('alpha');
      expect(results.map((s) => s.skillId)).toContain('gamma');
    });

    it('finds skills by description', () => {
      const skill = createValidSkill('descriptive', 'Descriptive');
      skill.description = 'This skill handles customer data processing';
      registry.register(skill);

      const results = registry.search('customer');

      expect(results.length).toBe(1);
      expect(results[0].skillId).toBe('descriptive');
    });
  });

  describe('getByTag', () => {
    it('finds skills by tag', () => {
      const skill1 = createValidSkill('tagged-1', 'Tagged 1');
      skill1.tags = ['important', 'production'];

      const skill2 = createValidSkill('tagged-2', 'Tagged 2');
      skill2.tags = ['development'];

      registry.register(skill1);
      registry.register(skill2);

      const results = registry.getByTag('production');

      expect(results.length).toBe(1);
      expect(results[0].skillId).toBe('tagged-1');
    });
  });
});
