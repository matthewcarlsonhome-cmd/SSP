/**
 * Russellian Validation Types
 *
 * Defines error types and validation result structures
 * for skill and composition validation.
 *
 * @module russellian/types/validation
 */

/**
 * Severity levels for validation issues.
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Categories of validation errors for filtering.
 */
export type ValidationCategory =
  | 'composition'    // Invalid axiom connections
  | 'level'          // Type level violations
  | 'structure'      // Graph structure issues (cycles, orphans)
  | 'schema'         // Input/output schema mismatches
  | 'reference'      // Missing or invalid references
  | 'semantic'       // Logical issues (unreachable code, etc.)
  | 'security';      // Potential security concerns

/**
 * Location of a validation error within a skill definition.
 */
export interface ValidationLocation {
  /** The step ID where the error occurred */
  stepId?: string;

  /** The connection index if error is in a connection */
  connectionIndex?: number;

  /** The specific field name if applicable */
  field?: string;

  /** Line number in source (if parsed from file) */
  line?: number;

  /** Column number in source (if parsed from file) */
  column?: number;
}

/**
 * A single validation error or warning.
 */
export interface ValidationError {
  /** Error code for programmatic handling */
  code: string;

  /** Severity level */
  severity: ValidationSeverity;

  /** Human-readable error message */
  message: string;

  /** Error category for filtering */
  category: ValidationCategory;

  /** Location in the skill definition */
  location?: ValidationLocation;

  /** Additional context or data */
  context?: Record<string, unknown>;

  /** Suggested fix if applicable */
  suggestion?: string;

  /** Documentation link for more info */
  docsUrl?: string;
}

/**
 * Result of validating a skill or composition.
 */
export interface ValidationResult {
  /** Whether validation passed (no errors, warnings allowed) */
  isValid: boolean;

  /** All validation issues found */
  errors: ValidationError[];

  /** Count of each severity level */
  counts: {
    error: number;
    warning: number;
    info: number;
  };

  /** Time taken to validate in milliseconds */
  validationTimeMs: number;

  /** The skill ID that was validated */
  skillId?: string;

  /** Timestamp of validation */
  validatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Code Constants
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard error codes for composition violations.
 */
export const COMPOSITION_ERROR_CODES = {
  FORBIDDEN_CONNECTION: 'E_COMP_001',
  INVALID_AXIOM: 'E_COMP_002',
  MISSING_TRANSFORMATION: 'E_COMP_003',
  UNVALIDATED_OUTPUT: 'E_COMP_004',
} as const;

/**
 * Standard error codes for level violations.
 */
export const LEVEL_ERROR_CODES = {
  INSUFFICIENT_LEVEL: 'E_LEVEL_001',
  INVALID_INVOCATION: 'E_LEVEL_002',
  LEVEL_MISMATCH: 'E_LEVEL_003',
  APPROVAL_REQUIRED: 'E_LEVEL_004',
} as const;

/**
 * Standard error codes for structure violations.
 */
export const STRUCTURE_ERROR_CODES = {
  CYCLE_DETECTED: 'E_STRUCT_001',
  ORPHAN_STEP: 'E_STRUCT_002',
  MISSING_ENTRY: 'E_STRUCT_003',
  MISSING_EXIT: 'E_STRUCT_004',
  UNREACHABLE_STEP: 'E_STRUCT_005',
  DEAD_END: 'E_STRUCT_006',
} as const;

/**
 * Standard error codes for reference violations.
 */
export const REFERENCE_ERROR_CODES = {
  UNKNOWN_STEP: 'E_REF_001',
  UNKNOWN_SKILL: 'E_REF_002',
  MISSING_CREDENTIAL: 'E_REF_003',
  DUPLICATE_ID: 'E_REF_004',
} as const;

/**
 * Standard error codes for schema violations.
 */
export const SCHEMA_ERROR_CODES = {
  TYPE_MISMATCH: 'E_SCHEMA_001',
  MISSING_REQUIRED: 'E_SCHEMA_002',
  INVALID_FORMAT: 'E_SCHEMA_003',
  SCHEMA_VALIDATION_FAILED: 'E_SCHEMA_004',
} as const;

/**
 * Standard warning codes.
 */
export const WARNING_CODES = {
  DEPRECATED_AXIOM: 'W_001',
  PERFORMANCE_CONCERN: 'W_002',
  MISSING_DESCRIPTION: 'W_003',
  UNUSED_STEP: 'W_004',
  IMPLICIT_TYPE: 'W_005',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a validation error.
 *
 * @param code - Error code
 * @param message - Human-readable message
 * @param category - Error category
 * @param options - Additional options
 * @returns A ValidationError
 */
export function createValidationError(
  code: string,
  message: string,
  category: ValidationCategory,
  options: {
    severity?: ValidationSeverity;
    location?: ValidationLocation;
    suggestion?: string;
    context?: Record<string, unknown>;
  } = {}
): ValidationError {
  return {
    code,
    message,
    category,
    severity: options.severity ?? 'error',
    location: options.location,
    suggestion: options.suggestion,
    context: options.context,
  };
}

/**
 * Create an empty validation result.
 *
 * @param skillId - Optional skill ID
 * @returns An empty ValidationResult
 */
export function createEmptyValidationResult(skillId?: string): ValidationResult {
  return {
    isValid: true,
    errors: [],
    counts: { error: 0, warning: 0, info: 0 },
    validationTimeMs: 0,
    skillId,
    validatedAt: new Date().toISOString(),
  };
}

/**
 * Add an error to a validation result.
 * Automatically updates counts and isValid.
 *
 * @param result - The result to modify
 * @param error - The error to add
 */
export function addValidationError(
  result: ValidationResult,
  error: ValidationError
): void {
  result.errors.push(error);
  result.counts[error.severity]++;

  if (error.severity === 'error') {
    result.isValid = false;
  }
}

/**
 * Merge multiple validation results.
 *
 * @param results - Results to merge
 * @returns Combined ValidationResult
 */
export function mergeValidationResults(results: ValidationResult[]): ValidationResult {
  const merged = createEmptyValidationResult();
  merged.validationTimeMs = 0;

  for (const result of results) {
    merged.errors.push(...result.errors);
    merged.counts.error += result.counts.error;
    merged.counts.warning += result.counts.warning;
    merged.counts.info += result.counts.info;
    merged.validationTimeMs += result.validationTimeMs;

    if (!result.isValid) {
      merged.isValid = false;
    }
  }

  return merged;
}

/**
 * Filter validation errors by severity.
 *
 * @param result - The validation result
 * @param severity - The severity to filter by
 * @returns Array of matching errors
 */
export function filterBySeverity(
  result: ValidationResult,
  severity: ValidationSeverity
): ValidationError[] {
  return result.errors.filter((e) => e.severity === severity);
}

/**
 * Filter validation errors by category.
 *
 * @param result - The validation result
 * @param category - The category to filter by
 * @returns Array of matching errors
 */
export function filterByCategory(
  result: ValidationResult,
  category: ValidationCategory
): ValidationError[] {
  return result.errors.filter((e) => e.category === category);
}

/**
 * Get errors for a specific step.
 *
 * @param result - The validation result
 * @param stepId - The step ID to filter by
 * @returns Array of matching errors
 */
export function getErrorsForStep(
  result: ValidationResult,
  stepId: string
): ValidationError[] {
  return result.errors.filter((e) => e.location?.stepId === stepId);
}

/**
 * Format a validation result for display.
 *
 * @param result - The validation result
 * @returns Formatted string summary
 */
export function formatValidationResult(result: ValidationResult): string {
  const status = result.isValid ? '✓ VALID' : '✗ INVALID';
  const lines = [
    `Validation ${status}`,
    `  Errors: ${result.counts.error}`,
    `  Warnings: ${result.counts.warning}`,
    `  Info: ${result.counts.info}`,
    `  Time: ${result.validationTimeMs}ms`,
  ];

  if (result.errors.length > 0) {
    lines.push('', 'Issues:');
    for (const error of result.errors) {
      const prefix = error.severity === 'error' ? '✗' : error.severity === 'warning' ? '⚠' : 'ℹ';
      const location = error.location?.stepId ? ` [${error.location.stepId}]` : '';
      lines.push(`  ${prefix} ${error.code}${location}: ${error.message}`);
      if (error.suggestion) {
        lines.push(`    → ${error.suggestion}`);
      }
    }
  }

  return lines.join('\n');
}
