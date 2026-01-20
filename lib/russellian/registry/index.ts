/**
 * Russellian Skill Registry
 *
 * Manages registration, lookup, and dependency tracking of validated skills.
 * Skills must pass validation before registration.
 *
 * @module russellian/registry
 */

import {
  TypeLevel,
  type SkillDefinition,
  type ValidationResult,
  type ValidationError,
} from '../types';
import { RussellianValidator } from '../validation/engine';

/**
 * Result of a skill registration attempt.
 */
export interface RegistrationResult {
  /** Whether registration succeeded */
  success: boolean;

  /** The skill ID if successful */
  skillId?: string;

  /** Validation errors if failed */
  errors?: ValidationError[];

  /** The validation result */
  validationResult?: ValidationResult;
}

/**
 * Export format for the registry.
 */
export interface RegistryExport {
  /** Export format version */
  version: string;

  /** When the export was created */
  exportedAt: string;

  /** All registered skills */
  skills: SkillDefinition[];

  /** Registry metadata */
  metadata?: {
    totalSkills: number;
    skillsByLevel: Record<TypeLevel, number>;
  };
}

/**
 * Import result for bulk skill imports.
 */
export interface ImportResult {
  /** Whether import was fully successful */
  success: boolean;

  /** Number of skills successfully imported */
  imported: number;

  /** Skills that failed to import */
  failed: Array<{
    skillId: string;
    errors: ValidationError[];
  }>;

  /** Skills that were skipped (already exist) */
  skipped: string[];
}

/**
 * The Skill Registry manages validated skill definitions.
 * All skills must pass Russellian validation before registration.
 */
export class SkillRegistry {
  private skills: Map<string, SkillDefinition>;
  private validator: RussellianValidator;

  constructor(validator?: RussellianValidator) {
    this.skills = new Map();
    this.validator = validator ?? new RussellianValidator();
  }

  /**
   * Register a skill after validation.
   * The skill must pass all validation checks.
   *
   * @param skill - The skill to register
   * @param skipValidation - Skip validation (use with caution)
   * @returns Registration result
   *
   * @example
   * ```typescript
   * const result = registry.register(mySkill);
   * if (result.success) {
   *   console.log(`Registered: ${result.skillId}`);
   * } else {
   *   console.log('Errors:', result.errors);
   * }
   * ```
   */
  register(skill: SkillDefinition, skipValidation = false): RegistrationResult {
    // Check for duplicate ID
    if (this.skills.has(skill.skillId)) {
      return {
        success: false,
        errors: [
          {
            code: 'E_DUPLICATE',
            severity: 'error',
            message: `Skill with ID '${skill.skillId}' already exists`,
            category: 'reference',
          },
        ],
      };
    }

    // Validate unless explicitly skipped
    if (!skipValidation) {
      const validationResult = this.validator.validateSkill(
        skill,
        (id) => this.get(id)
      );

      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors.filter((e) => e.severity === 'error'),
          validationResult,
        };
      }

      // Update skill with validation status
      skill.isValid = true;
      skill.validationErrors = validationResult.errors;
    }

    // Register the skill
    this.skills.set(skill.skillId, skill);

    return {
      success: true,
      skillId: skill.skillId,
    };
  }

  /**
   * Get a skill by its ID.
   *
   * @param skillId - The skill ID to look up
   * @returns The skill, or null if not found
   */
  get(skillId: string): SkillDefinition | null {
    return this.skills.get(skillId) ?? null;
  }

  /**
   * Check if a skill exists in the registry.
   *
   * @param skillId - The skill ID to check
   * @returns True if the skill exists
   */
  has(skillId: string): boolean {
    return this.skills.has(skillId);
  }

  /**
   * Get all registered skills.
   *
   * @returns Array of all skill definitions
   */
  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get all skills at a specific type level.
   *
   * @param level - The type level to filter by
   * @returns Array of skills at that level
   */
  getByLevel(level: TypeLevel): SkillDefinition[] {
    return this.getAll().filter((skill) => skill.typeLevel === level);
  }

  /**
   * Get all skills with a specific tag.
   *
   * @param tag - The tag to filter by
   * @returns Array of skills with that tag
   */
  getByTag(tag: string): SkillDefinition[] {
    return this.getAll().filter((skill) => skill.tags.includes(tag));
  }

  /**
   * Search skills by name or description.
   *
   * @param query - Search query
   * @returns Array of matching skills
   */
  search(query: string): SkillDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (skill) =>
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Find all skills that depend on a given skill.
   * These are skills that have the given skill in their invokesSkills list.
   *
   * @param skillId - The skill ID to find dependents of
   * @returns Array of dependent skill definitions
   */
  getDependents(skillId: string): SkillDefinition[] {
    return this.getAll().filter((skill) =>
      skill.invokesSkills?.includes(skillId)
    );
  }

  /**
   * Get all skills that a given skill depends on (direct dependencies only).
   *
   * @param skillId - The skill ID to find dependencies of
   * @returns Array of dependency skill definitions
   */
  getDependencies(skillId: string): SkillDefinition[] {
    const skill = this.get(skillId);
    if (!skill?.invokesSkills) {
      return [];
    }

    return skill.invokesSkills
      .map((id) => this.get(id))
      .filter((s): s is SkillDefinition => s !== null);
  }

  /**
   * Get all transitive dependencies of a skill.
   *
   * @param skillId - The skill ID to find all dependencies of
   * @returns Array of all dependency skill definitions (transitive)
   */
  getAllDependencies(skillId: string): SkillDefinition[] {
    const visited = new Set<string>();
    const result: SkillDefinition[] = [];

    const collect = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const skill = this.get(id);
      if (skill?.invokesSkills) {
        for (const depId of skill.invokesSkills) {
          const dep = this.get(depId);
          if (dep && !visited.has(depId)) {
            result.push(dep);
            collect(depId);
          }
        }
      }
    };

    collect(skillId);
    return result;
  }

  /**
   * Unregister a skill.
   * Fails if other skills depend on this skill.
   *
   * @param skillId - The skill ID to unregister
   * @param force - Force unregistration even with dependents
   * @returns Result with success status
   */
  unregister(skillId: string, force = false): { success: boolean; reason?: string } {
    if (!this.skills.has(skillId)) {
      return {
        success: false,
        reason: `Skill '${skillId}' not found`,
      };
    }

    // Check for dependents
    const dependents = this.getDependents(skillId);
    if (dependents.length > 0 && !force) {
      return {
        success: false,
        reason: `Cannot unregister: ${dependents.length} skill(s) depend on this skill: ${dependents.map((s) => s.skillId).join(', ')}`,
      };
    }

    this.skills.delete(skillId);
    return { success: true };
  }

  /**
   * Update a registered skill.
   * The updated skill must pass validation.
   *
   * @param skill - The updated skill definition
   * @returns Registration result
   */
  update(skill: SkillDefinition): RegistrationResult {
    if (!this.skills.has(skill.skillId)) {
      return {
        success: false,
        errors: [
          {
            code: 'E_NOT_FOUND',
            severity: 'error',
            message: `Skill '${skill.skillId}' not found. Use register() for new skills.`,
            category: 'reference',
          },
        ],
      };
    }

    // Validate the update
    const validationResult = this.validator.validateSkill(
      skill,
      (id) => (id === skill.skillId ? skill : this.get(id))
    );

    if (!validationResult.isValid) {
      return {
        success: false,
        errors: validationResult.errors.filter((e) => e.severity === 'error'),
        validationResult,
      };
    }

    // Update skill
    skill.isValid = true;
    skill.validationErrors = validationResult.errors;
    skill.updatedAt = new Date().toISOString();
    this.skills.set(skill.skillId, skill);

    return {
      success: true,
      skillId: skill.skillId,
    };
  }

  /**
   * Export the registry to JSON format.
   *
   * @returns Export object with all skills
   */
  export(): RegistryExport {
    const skills = this.getAll();

    // Count skills by level
    const skillsByLevel: Record<TypeLevel, number> = {
      [TypeLevel.LEVEL_0]: 0,
      [TypeLevel.LEVEL_1]: 0,
      [TypeLevel.LEVEL_2]: 0,
      [TypeLevel.LEVEL_3]: 0,
      [TypeLevel.LEVEL_4]: 0,
      [TypeLevel.LEVEL_5]: 0,
    };

    for (const skill of skills) {
      skillsByLevel[skill.typeLevel]++;
    }

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      skills,
      metadata: {
        totalSkills: skills.length,
        skillsByLevel,
      },
    };
  }

  /**
   * Import skills from an export.
   * All skills are validated before import.
   *
   * @param data - The export data to import
   * @param overwrite - Whether to overwrite existing skills
   * @returns Import result with success/failure details
   */
  import(data: RegistryExport, overwrite = false): ImportResult {
    const result: ImportResult = {
      success: true,
      imported: 0,
      failed: [],
      skipped: [],
    };

    for (const skill of data.skills) {
      // Check if skill already exists
      if (this.has(skill.skillId) && !overwrite) {
        result.skipped.push(skill.skillId);
        continue;
      }

      // Remove if overwriting
      if (this.has(skill.skillId)) {
        this.skills.delete(skill.skillId);
      }

      // Register the skill
      const regResult = this.register(skill);

      if (regResult.success) {
        result.imported++;
      } else {
        result.failed.push({
          skillId: skill.skillId,
          errors: regResult.errors ?? [],
        });
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Clear all skills from the registry.
   */
  clear(): void {
    this.skills.clear();
  }

  /**
   * Get statistics about the registry.
   */
  getStats(): {
    total: number;
    byLevel: Record<TypeLevel, number>;
    withDependencies: number;
    orphans: number;
  } {
    const skills = this.getAll();
    const byLevel: Record<TypeLevel, number> = {
      [TypeLevel.LEVEL_0]: 0,
      [TypeLevel.LEVEL_1]: 0,
      [TypeLevel.LEVEL_2]: 0,
      [TypeLevel.LEVEL_3]: 0,
      [TypeLevel.LEVEL_4]: 0,
      [TypeLevel.LEVEL_5]: 0,
    };

    let withDependencies = 0;
    let orphans = 0;

    for (const skill of skills) {
      byLevel[skill.typeLevel]++;

      if (skill.invokesSkills && skill.invokesSkills.length > 0) {
        withDependencies++;
      }

      // Check if any skill depends on this one
      const dependents = this.getDependents(skill.skillId);
      if (dependents.length === 0 && (!skill.invokesSkills || skill.invokesSkills.length === 0)) {
        orphans++;
      }
    }

    return {
      total: skills.length,
      byLevel,
      withDependencies,
      orphans,
    };
  }
}

/**
 * Singleton registry instance for convenience.
 */
export const registry = new SkillRegistry();
