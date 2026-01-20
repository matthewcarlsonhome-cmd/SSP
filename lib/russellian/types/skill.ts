/**
 * Russellian Skill Definition Types
 *
 * Defines the complete schema for a skill, including its steps,
 * connections, and metadata. A skill is a directed acyclic graph
 * of axiom operations.
 *
 * @module russellian/types/skill
 */

import { Axiom } from './axioms';
import { TypeLevel } from './levels';
import type { ValidationError } from './validation';

/**
 * Primitive data types for skill inputs and outputs.
 */
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';

/**
 * Schema definition for skill data types.
 * Can be a simple primitive or a complex object schema.
 */
export interface DataType {
  /** The primitive type */
  type: PrimitiveType;

  /** JSON Schema for object/array types (optional) */
  schema?: Record<string, unknown>;

  /** Human-readable description of this data */
  description?: string;

  /** Whether this value is optional (nullable) */
  optional?: boolean;

  /** Default value if not provided */
  defaultValue?: unknown;
}

/**
 * Error handling strategies for skill steps.
 */
export type ErrorStrategy = 'halt' | 'skip' | 'retry' | 'fallback';

/**
 * A single step in a skill's execution graph.
 * Each step performs one axiom operation.
 */
export interface SkillStep {
  /** Unique identifier for this step within the skill */
  stepId: string;

  /** Human-readable name for this step */
  name: string;

  /** The axiom operation this step performs */
  axiom: Axiom;

  /** Expected input data type */
  inputType: DataType;

  /** Expected output data type */
  outputType: DataType;

  /** Configuration specific to this step's axiom */
  config: Record<string, unknown>;

  /** What to do if this step fails */
  onError?: ErrorStrategy;

  /** Step to jump to on fallback (if onError is 'fallback') */
  fallbackStepId?: string;

  /** Maximum retry attempts (if onError is 'retry') */
  maxRetries?: number;

  /** Retry delay in milliseconds */
  retryDelayMs?: number;

  /** Timeout for this step in milliseconds */
  timeoutMs?: number;

  /** Human-readable description of what this step does */
  description?: string;
}

/**
 * A connection between two steps in a skill's execution graph.
 */
export interface SkillConnection {
  /** The source step ID */
  fromStepId: string;

  /** The destination step ID */
  toStepId: string;

  /** Optional condition for this connection (JavaScript expression) */
  condition?: string;

  /** Mapping of output fields from source to input fields of destination */
  dataMapping?: Record<string, string>;

  /** Priority when multiple connections leave the same step */
  priority?: number;
}

/**
 * Complete definition of a skill.
 * A skill is a validated composition of axiom operations.
 */
export interface SkillDefinition {
  /** Unique identifier for this skill */
  skillId: string;

  /** Human-readable name */
  name: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Detailed description of what this skill does */
  description: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // Russellian Properties
  // ═══════════════════════════════════════════════════════════════════════════

  /** The type level of this skill (determines what it can invoke) */
  typeLevel: TypeLevel;

  /** The axioms this skill reduces to (fundamental operations used) */
  reducesTo: Axiom[];

  // ═══════════════════════════════════════════════════════════════════════════
  // Execution Graph
  // ═══════════════════════════════════════════════════════════════════════════

  /** All steps in this skill */
  steps: SkillStep[];

  /** All connections between steps */
  connections: SkillConnection[];

  /** The starting step ID */
  entryStepId: string;

  /** The ending step IDs (may have multiple exit points) */
  exitStepIds: string[];

  // ═══════════════════════════════════════════════════════════════════════════
  // I/O Schema
  // ═══════════════════════════════════════════════════════════════════════════

  /** Schema for skill input */
  inputSchema: DataType;

  /** Schema for skill output */
  outputSchema: DataType;

  // ═══════════════════════════════════════════════════════════════════════════
  // Dependencies
  // ═══════════════════════════════════════════════════════════════════════════

  /** IDs of other skills this skill invokes (for composer skills) */
  invokesSkills?: string[];

  /** Credential types required (e.g., ["api:openai", "db:postgres"]) */
  requiresCredentials?: string[];

  // ═══════════════════════════════════════════════════════════════════════════
  // Metadata
  // ═══════════════════════════════════════════════════════════════════════════

  /** Author identifier */
  author: string;

  /** ISO timestamp of creation */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt: string;

  /** Searchable tags */
  tags: string[];

  /** Category for organization */
  category?: string;

  /** Icon identifier for UI */
  icon?: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // Validation State
  // ═══════════════════════════════════════════════════════════════════════════

  /** Whether this skill has passed validation */
  isValid: boolean;

  /** Any validation errors encountered */
  validationErrors?: ValidationError[];

  /** Computed effective type level (may differ from declared) */
  effectiveTypeLevel?: TypeLevel;
}

/**
 * Builder helper for creating skill steps.
 *
 * @param stepId - Unique step identifier
 * @param name - Human-readable name
 * @param axiom - The axiom operation
 * @param config - Step configuration
 * @returns A partial SkillStep ready for extension
 */
export function createStep(
  stepId: string,
  name: string,
  axiom: Axiom,
  config: Record<string, unknown> = {}
): SkillStep {
  return {
    stepId,
    name,
    axiom,
    inputType: { type: 'any' },
    outputType: { type: 'any' },
    config,
    onError: 'halt',
  };
}

/**
 * Builder helper for creating skill connections.
 *
 * @param fromStepId - Source step
 * @param toStepId - Destination step
 * @param options - Optional connection configuration
 * @returns A SkillConnection
 */
export function createConnection(
  fromStepId: string,
  toStepId: string,
  options: Partial<Omit<SkillConnection, 'fromStepId' | 'toStepId'>> = {}
): SkillConnection {
  return {
    fromStepId,
    toStepId,
    ...options,
  };
}

/**
 * Create a minimal valid skill definition.
 * Useful as a starting point for building skills.
 *
 * @param skillId - Unique identifier
 * @param name - Human-readable name
 * @param author - Author identifier
 * @returns A minimal SkillDefinition
 */
export function createSkillDefinition(
  skillId: string,
  name: string,
  author: string
): SkillDefinition {
  const now = new Date().toISOString();
  return {
    skillId,
    name,
    version: '1.0.0',
    description: '',
    typeLevel: TypeLevel.LEVEL_0,
    reducesTo: [],
    steps: [],
    connections: [],
    entryStepId: '',
    exitStepIds: [],
    inputSchema: { type: 'any' },
    outputSchema: { type: 'any' },
    author,
    createdAt: now,
    updatedAt: now,
    tags: [],
    isValid: false,
  };
}

/**
 * Get all steps that connect to a given step.
 *
 * @param skill - The skill definition
 * @param stepId - The target step ID
 * @returns Array of step IDs that connect to the target
 */
export function getIncomingSteps(skill: SkillDefinition, stepId: string): string[] {
  return skill.connections
    .filter((conn) => conn.toStepId === stepId)
    .map((conn) => conn.fromStepId);
}

/**
 * Get all steps that a given step connects to.
 *
 * @param skill - The skill definition
 * @param stepId - The source step ID
 * @returns Array of step IDs that the source connects to
 */
export function getOutgoingSteps(skill: SkillDefinition, stepId: string): string[] {
  return skill.connections
    .filter((conn) => conn.fromStepId === stepId)
    .map((conn) => conn.toStepId);
}

/**
 * Get a step by its ID.
 *
 * @param skill - The skill definition
 * @param stepId - The step ID to find
 * @returns The step, or undefined if not found
 */
export function getStepById(skill: SkillDefinition, stepId: string): SkillStep | undefined {
  return skill.steps.find((step) => step.stepId === stepId);
}

/**
 * Check if a skill has any side effects (WRITE operations).
 *
 * @param skill - The skill definition
 * @returns True if the skill has side effects
 */
export function hasSideEffects(skill: SkillDefinition): boolean {
  return skill.reducesTo.includes(Axiom.WRITE);
}

/**
 * Check if a skill is pure (only TRANSFORM, DECIDE, VALIDATE).
 *
 * @param skill - The skill definition
 * @returns True if the skill is pure
 */
export function isPureSkill(skill: SkillDefinition): boolean {
  const pureAxioms = new Set([Axiom.TRANSFORM, Axiom.DECIDE, Axiom.VALIDATE]);
  return skill.reducesTo.every((axiom) => pureAxioms.has(axiom));
}

/**
 * Get the execution order of steps using topological sort.
 * Throws if the graph contains cycles.
 *
 * @param skill - The skill definition
 * @returns Array of step IDs in execution order
 */
export function getExecutionOrder(skill: SkillDefinition): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(stepId: string): void {
    if (visited.has(stepId)) return;
    if (visiting.has(stepId)) {
      throw new Error(`Cycle detected at step: ${stepId}`);
    }

    visiting.add(stepId);

    // Visit all incoming steps first
    for (const conn of skill.connections) {
      if (conn.toStepId === stepId) {
        visit(conn.fromStepId);
      }
    }

    visiting.delete(stepId);
    visited.add(stepId);
    order.push(stepId);
  }

  // Start from exit steps and work backwards
  for (const exitId of skill.exitStepIds) {
    visit(exitId);
  }

  return order;
}

/**
 * Clone a skill definition (deep copy).
 *
 * @param skill - The skill to clone
 * @returns A deep copy of the skill
 */
export function cloneSkillDefinition(skill: SkillDefinition): SkillDefinition {
  return JSON.parse(JSON.stringify(skill));
}
