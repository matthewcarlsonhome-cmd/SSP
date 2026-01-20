/**
 * Russellian Derivation Certificate Types
 *
 * Defines the complete audit trail for skill execution.
 * Certificates provide cryptographic proof of execution
 * and enable post-hoc verification.
 *
 * @module russellian/types/certificate
 */

import { Axiom } from './axioms';
import { TypeLevel } from './levels';

/**
 * Status of an individual derivation step.
 */
export type StepStatus = 'success' | 'failure' | 'skipped';

/**
 * Status of an entire derivation (execution).
 */
export type DerivationStatus = 'completed' | 'failed' | 'halted';

/**
 * Level check result for a step.
 */
export interface LevelCheck {
  /** The type level of the skill being executed */
  skillLevel: TypeLevel;

  /** The minimum level required for this operation */
  requiredLevel: TypeLevel;

  /** Whether the check passed */
  passed: boolean;
}

/**
 * A single step in the execution derivation.
 * Records all relevant information for audit.
 */
export interface DerivationStep {
  /** The step ID from the skill definition */
  stepId: string;

  /** Human-readable step name */
  stepName: string;

  /** The axiom executed */
  axiom: Axiom;

  /** ISO timestamp when step started */
  startedAt: string;

  /** ISO timestamp when step completed */
  completedAt: string;

  /** Duration in milliseconds */
  durationMs: number;

  /** SHA-256 hash of the input data */
  inputHash: string;

  /** SHA-256 hash of the output data */
  outputHash: string;

  /** Truncated sample of input (for debugging) */
  inputSample?: string;

  /** Truncated sample of output (for debugging) */
  outputSample?: string;

  /** The composition rule ID that allowed this transition */
  compositionRuleApplied: string;

  /** Type level verification for this step */
  levelCheck: LevelCheck;

  /** Whether step succeeded, failed, or was skipped */
  status: StepStatus;

  /** Error message if step failed */
  errorMessage?: string;

  /** Stack trace if step failed (debug mode only) */
  errorStack?: string;

  /** Any warnings generated during execution */
  warnings?: string[];

  /** Metadata attached by the step */
  metadata?: Record<string, unknown>;
}

/**
 * Complete derivation certificate for a skill execution.
 * This is the cryptographically verifiable audit trail.
 */
export interface DerivationCertificate {
  /** Unique identifier for this certificate */
  certificateId: string;

  /** Unique identifier for this execution instance */
  executionId: string;

  /** The skill that was executed */
  skillId: string;

  /** Human-readable skill name */
  skillName: string;

  /** The version of the skill executed */
  skillVersion: string;

  /** The type level of the skill */
  skillTypeLevel: TypeLevel;

  /** All steps executed in order */
  steps: DerivationStep[];

  /** Total number of steps defined */
  totalSteps: number;

  /** Number of steps that succeeded */
  successfulSteps: number;

  /** Count of each axiom used */
  axiomUsage: Record<Axiom, number>;

  /** Final status of the execution */
  status: DerivationStatus;

  /** ISO timestamp when execution started */
  startedAt: string;

  /** ISO timestamp when execution completed */
  completedAt: string;

  /** Total duration in milliseconds */
  totalDurationMs: number;

  /** SHA-256 hash of this certificate (excluding this field) */
  certificateHash: string;

  /** Hash of the previous certificate in the chain (optional) */
  previousCertificateHash?: string;

  /** Who or what triggered this execution */
  triggeredBy: string;

  /** Environment where execution occurred */
  environment: string;

  /** Input data hash for the skill */
  inputHash?: string;

  /** Output data hash for the skill */
  outputHash?: string;

  /** Any global errors not tied to specific steps */
  globalErrors?: string[];

  /** Performance metrics */
  metrics?: CertificateMetrics;
}

/**
 * Performance metrics for a certificate.
 */
export interface CertificateMetrics {
  /** Total CPU time in milliseconds */
  cpuTimeMs?: number;

  /** Peak memory usage in bytes */
  peakMemoryBytes?: number;

  /** Number of external API calls */
  externalCallCount?: number;

  /** Total data transferred in bytes */
  dataBytesTransferred?: number;

  /** Number of retries performed */
  retryCount?: number;

  /** Cost estimate in dollars (if applicable) */
  estimatedCostUsd?: number;
}

/**
 * Create an empty axiom usage map with all axioms set to 0.
 *
 * @returns Record with all Axiom keys set to 0
 */
export function createEmptyAxiomUsage(): Record<Axiom, number> {
  return {
    [Axiom.READ]: 0,
    [Axiom.TRANSFORM]: 0,
    [Axiom.WRITE]: 0,
    [Axiom.DECIDE]: 0,
    [Axiom.GENERATE]: 0,
    [Axiom.WAIT]: 0,
    [Axiom.VALIDATE]: 0,
  };
}

/**
 * Create a derivation step with required fields.
 *
 * @param stepId - The step ID
 * @param stepName - Human-readable name
 * @param axiom - The axiom executed
 * @param ruleApplied - The composition rule ID
 * @returns A partial DerivationStep
 */
export function createDerivationStep(
  stepId: string,
  stepName: string,
  axiom: Axiom,
  ruleApplied: string
): Omit<DerivationStep, 'startedAt' | 'completedAt' | 'durationMs' | 'inputHash' | 'outputHash' | 'levelCheck' | 'status'> {
  return {
    stepId,
    stepName,
    axiom,
    compositionRuleApplied: ruleApplied,
  };
}

/**
 * Check if a certificate chain is valid (hashes link correctly).
 *
 * @param certificates - Array of certificates in chronological order
 * @returns True if the chain is valid
 */
export function isCertificateChainValid(certificates: DerivationCertificate[]): boolean {
  for (let i = 1; i < certificates.length; i++) {
    const current = certificates[i];
    const previous = certificates[i - 1];

    if (current.previousCertificateHash !== previous.certificateHash) {
      return false;
    }
  }
  return true;
}

/**
 * Calculate the success rate of a certificate.
 *
 * @param certificate - The certificate to analyze
 * @returns Success rate as a decimal (0-1)
 */
export function getSuccessRate(certificate: DerivationCertificate): number {
  if (certificate.totalSteps === 0) return 1;
  return certificate.successfulSteps / certificate.totalSteps;
}

/**
 * Get all failed steps from a certificate.
 *
 * @param certificate - The certificate to analyze
 * @returns Array of failed DerivationSteps
 */
export function getFailedSteps(certificate: DerivationCertificate): DerivationStep[] {
  return certificate.steps.filter((step) => step.status === 'failure');
}

/**
 * Get all skipped steps from a certificate.
 *
 * @param certificate - The certificate to analyze
 * @returns Array of skipped DerivationSteps
 */
export function getSkippedSteps(certificate: DerivationCertificate): DerivationStep[] {
  return certificate.steps.filter((step) => step.status === 'skipped');
}

/**
 * Get the most used axioms from a certificate.
 *
 * @param certificate - The certificate to analyze
 * @param limit - Maximum number of results
 * @returns Array of [Axiom, count] tuples sorted by count descending
 */
export function getMostUsedAxioms(
  certificate: DerivationCertificate,
  limit: number = 3
): Array<[Axiom, number]> {
  return Object.entries(certificate.axiomUsage)
    .map(([axiom, count]) => [axiom as Axiom, count] as [Axiom, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

/**
 * Summarize a certificate for logging.
 *
 * @param certificate - The certificate to summarize
 * @returns Human-readable summary string
 */
export function summarizeCertificate(certificate: DerivationCertificate): string {
  const successRate = Math.round(getSuccessRate(certificate) * 100);
  return (
    `Certificate ${certificate.certificateId.substring(0, 8)}... | ` +
    `Skill: ${certificate.skillName} v${certificate.skillVersion} | ` +
    `Status: ${certificate.status} | ` +
    `Steps: ${certificate.successfulSteps}/${certificate.totalSteps} (${successRate}%) | ` +
    `Duration: ${certificate.totalDurationMs}ms`
  );
}
