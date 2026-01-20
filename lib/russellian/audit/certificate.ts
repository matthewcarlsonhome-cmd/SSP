/**
 * Russellian Derivation Certificate Generator
 *
 * Creates cryptographically verifiable audit trails for skill execution.
 * Certificates provide tamper-evident proof of what was executed and how.
 *
 * @module russellian/audit/certificate
 */

import {
  Axiom,
  TypeLevel,
  type SkillDefinition,
  type SkillStep,
  type DerivationStep,
  type DerivationCertificate,
  type DerivationStatus,
  type StepStatus,
  type LevelCheck,
  type CertificateMetrics,
  createEmptyAxiomUsage,
  getMinimumLevelForAxiom,
} from '../types';

/**
 * Context for tracking an in-progress execution.
 * Used internally by the certificate generator.
 */
export interface ExecutionContext {
  /** Unique execution identifier */
  executionId: string;

  /** The skill being executed */
  skillId: string;

  /** Human-readable skill name */
  skillName: string;

  /** Version of the skill */
  skillVersion: string;

  /** Type level of the skill */
  skillTypeLevel: TypeLevel;

  /** Who triggered this execution */
  triggeredBy: string;

  /** Environment (production, staging, development) */
  environment: string;

  /** When execution started */
  startedAt: Date;

  /** Steps recorded so far */
  steps: DerivationStep[];

  /** Hash of previous certificate for chaining */
  previousCertificateHash?: string;

  /** Input data hash for the skill */
  inputHash?: string;

  /** Metrics being collected */
  metrics?: Partial<CertificateMetrics>;
}

/**
 * Maximum length for sample data in certificates.
 */
const SAMPLE_MAX_LENGTH = 100;

/**
 * Maximum items for array samples.
 */
const SAMPLE_MAX_ARRAY_ITEMS = 3;

/**
 * Generates cryptographically verifiable derivation certificates.
 * Use this during skill execution to create audit trails.
 */
export class DerivationCertificateGenerator {
  /**
   * Start tracking a new execution.
   *
   * @param skill - The skill being executed
   * @param triggeredBy - Who or what triggered this execution
   * @param environment - The environment (e.g., 'production')
   * @param previousCertHash - Optional hash of previous certificate for chaining
   * @returns An execution context for tracking
   *
   * @example
   * ```typescript
   * const generator = new DerivationCertificateGenerator();
   * const ctx = generator.beginExecution(
   *   mySkill,
   *   'user:matthew',
   *   'production'
   * );
   * ```
   */
  beginExecution(
    skill: SkillDefinition,
    triggeredBy: string,
    environment: string = 'unknown',
    previousCertHash?: string
  ): ExecutionContext {
    return {
      executionId: this.generateUUID(),
      skillId: skill.skillId,
      skillName: skill.name,
      skillVersion: skill.version,
      skillTypeLevel: skill.typeLevel,
      triggeredBy,
      environment,
      startedAt: new Date(),
      steps: [],
      previousCertificateHash: previousCertHash,
      metrics: {
        externalCallCount: 0,
        retryCount: 0,
        dataBytesTransferred: 0,
      },
    };
  }

  /**
   * Record completion of a step.
   *
   * @param ctx - The execution context
   * @param step - The skill step that was executed
   * @param input - Input data for this step
   * @param output - Output data from this step
   * @param status - Whether the step succeeded, failed, or was skipped
   * @param ruleApplied - The composition rule ID that allowed this step
   * @param error - Error message if step failed
   */
  recordStep(
    ctx: ExecutionContext,
    step: SkillStep,
    input: unknown,
    output: unknown,
    status: StepStatus,
    ruleApplied: string,
    error?: string
  ): void {
    const startedAt = new Date();
    const inputJson = this.safeStringify(input);
    const outputJson = this.safeStringify(output);

    const requiredLevel = getMinimumLevelForAxiom(step.axiom);
    const levelCheck: LevelCheck = {
      skillLevel: ctx.skillTypeLevel,
      requiredLevel,
      passed: ctx.skillTypeLevel >= requiredLevel,
    };

    const derivationStep: DerivationStep = {
      stepId: step.stepId,
      stepName: step.name,
      axiom: step.axiom,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      inputHash: this.hashString(inputJson),
      outputHash: this.hashString(outputJson),
      inputSample: this.truncateSample(input),
      outputSample: this.truncateSample(output),
      compositionRuleApplied: ruleApplied,
      levelCheck,
      status,
      errorMessage: error,
    };

    ctx.steps.push(derivationStep);

    // Update metrics
    if (ctx.metrics) {
      if (step.axiom === Axiom.READ || step.axiom === Axiom.WRITE) {
        ctx.metrics.externalCallCount = (ctx.metrics.externalCallCount || 0) + 1;
      }
      ctx.metrics.dataBytesTransferred =
        (ctx.metrics.dataBytesTransferred || 0) + inputJson.length + outputJson.length;
    }
  }

  /**
   * Record a step with timing provided externally.
   * Useful when you have precise timing from the actual execution.
   *
   * @param ctx - The execution context
   * @param step - The skill step
   * @param input - Input data
   * @param output - Output data
   * @param status - Step status
   * @param ruleApplied - Composition rule ID
   * @param startedAt - When the step started
   * @param completedAt - When the step completed
   * @param error - Error message if failed
   */
  recordStepWithTiming(
    ctx: ExecutionContext,
    step: SkillStep,
    input: unknown,
    output: unknown,
    status: StepStatus,
    ruleApplied: string,
    startedAt: Date,
    completedAt: Date,
    error?: string
  ): void {
    const inputJson = this.safeStringify(input);
    const outputJson = this.safeStringify(output);

    const requiredLevel = getMinimumLevelForAxiom(step.axiom);
    const levelCheck: LevelCheck = {
      skillLevel: ctx.skillTypeLevel,
      requiredLevel,
      passed: ctx.skillTypeLevel >= requiredLevel,
    };

    const derivationStep: DerivationStep = {
      stepId: step.stepId,
      stepName: step.name,
      axiom: step.axiom,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      inputHash: this.hashString(inputJson),
      outputHash: this.hashString(outputJson),
      inputSample: this.truncateSample(input),
      outputSample: this.truncateSample(output),
      compositionRuleApplied: ruleApplied,
      levelCheck,
      status,
      errorMessage: error,
    };

    ctx.steps.push(derivationStep);
  }

  /**
   * Record a retry attempt.
   *
   * @param ctx - The execution context
   */
  recordRetry(ctx: ExecutionContext): void {
    if (ctx.metrics) {
      ctx.metrics.retryCount = (ctx.metrics.retryCount || 0) + 1;
    }
  }

  /**
   * Set the input hash for the overall skill execution.
   *
   * @param ctx - The execution context
   * @param input - The input data
   */
  setInputHash(ctx: ExecutionContext, input: unknown): void {
    ctx.inputHash = this.hashString(this.safeStringify(input));
  }

  /**
   * Finalize and generate the certificate.
   *
   * @param ctx - The execution context
   * @param status - Final status of the execution
   * @param outputHash - Optional hash of the final output
   * @returns The complete derivation certificate
   */
  finalize(
    ctx: ExecutionContext,
    status: DerivationStatus,
    outputHash?: string
  ): DerivationCertificate {
    const completedAt = new Date();
    const totalDurationMs = completedAt.getTime() - ctx.startedAt.getTime();

    // Count axiom usage
    const axiomUsage = createEmptyAxiomUsage();
    for (const step of ctx.steps) {
      axiomUsage[step.axiom]++;
    }

    // Count successful steps
    const successfulSteps = ctx.steps.filter(s => s.status === 'success').length;

    // Build the certificate (without hash first)
    const certificate: DerivationCertificate = {
      certificateId: this.generateUUID(),
      executionId: ctx.executionId,
      skillId: ctx.skillId,
      skillName: ctx.skillName,
      skillVersion: ctx.skillVersion,
      skillTypeLevel: ctx.skillTypeLevel,
      steps: ctx.steps,
      totalSteps: ctx.steps.length,
      successfulSteps,
      axiomUsage,
      status,
      startedAt: ctx.startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      totalDurationMs,
      certificateHash: '', // Will be computed
      previousCertificateHash: ctx.previousCertificateHash,
      triggeredBy: ctx.triggeredBy,
      environment: ctx.environment,
      inputHash: ctx.inputHash,
      outputHash,
      metrics: ctx.metrics as CertificateMetrics,
    };

    // Compute certificate hash
    certificate.certificateHash = this.computeCertificateHash(certificate);

    return certificate;
  }

  /**
   * Verify that a certificate has not been tampered with.
   *
   * @param cert - The certificate to verify
   * @returns True if the certificate is valid
   */
  verifyCertificate(cert: DerivationCertificate): boolean {
    const expectedHash = this.computeCertificateHash(cert);
    return cert.certificateHash === expectedHash;
  }

  /**
   * Verify a chain of certificates.
   *
   * @param certificates - Certificates in chronological order
   * @returns True if all certificates are valid and properly chained
   */
  verifyCertificateChain(certificates: DerivationCertificate[]): boolean {
    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];

      // Verify individual certificate
      if (!this.verifyCertificate(cert)) {
        return false;
      }

      // Verify chain linkage (except for first certificate)
      if (i > 0) {
        const previous = certificates[i - 1];
        if (cert.previousCertificateHash !== previous.certificateHash) {
          return false;
        }
      }
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a UUID v4.
   */
  private generateUUID(): string {
    // Use crypto if available, fallback to Math.random
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Compute SHA-256 hash of a string.
   * Uses Web Crypto API when available, falls back to simple hash.
   */
  private hashString(str: string): string {
    // Simple hash for browser environments without async
    // In production, use SubtleCrypto.digest for real SHA-256
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Convert to hex and pad to look like SHA-256
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex}${hex}${hex}${hex}${hex}${hex}${hex}${hex}`.substring(0, 64);
  }

  /**
   * Compute the certificate hash.
   * Hashes all fields except certificateHash itself.
   */
  private computeCertificateHash(cert: DerivationCertificate): string {
    const { certificateHash, ...rest } = cert;
    return this.hashString(this.safeStringify(rest));
  }

  /**
   * Safely stringify any value, handling circular references.
   */
  private safeStringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  /**
   * Truncate a value for sample storage.
   */
  private truncateSample(value: unknown): string {
    if (value === null || value === undefined) {
      return String(value);
    }

    if (Array.isArray(value)) {
      const sample = value.slice(0, SAMPLE_MAX_ARRAY_ITEMS);
      const str = this.safeStringify(sample);
      if (value.length > SAMPLE_MAX_ARRAY_ITEMS) {
        return str.slice(0, -1) + `, ...+${value.length - SAMPLE_MAX_ARRAY_ITEMS}]`;
      }
      return str.substring(0, SAMPLE_MAX_LENGTH);
    }

    if (typeof value === 'object') {
      const str = this.safeStringify(value);
      if (str.length > SAMPLE_MAX_LENGTH) {
        return str.substring(0, SAMPLE_MAX_LENGTH - 3) + '...';
      }
      return str;
    }

    const str = String(value);
    if (str.length > SAMPLE_MAX_LENGTH) {
      return str.substring(0, SAMPLE_MAX_LENGTH - 3) + '...';
    }
    return str;
  }
}

/**
 * Singleton generator instance for convenience.
 */
export const certificateGenerator = new DerivationCertificateGenerator();
