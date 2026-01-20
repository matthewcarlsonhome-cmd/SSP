/**
 * Tests for DerivationCertificateGenerator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DerivationCertificateGenerator,
  Axiom,
  TypeLevel,
  type SkillDefinition,
  createSkillDefinition,
  createStep,
} from '../index';

describe('DerivationCertificateGenerator', () => {
  let generator: DerivationCertificateGenerator;
  let testSkill: SkillDefinition;

  beforeEach(() => {
    generator = new DerivationCertificateGenerator();

    testSkill = createSkillDefinition('test-skill', 'Test Skill', 'test-author');
    testSkill.version = '1.0.0';
    testSkill.typeLevel = TypeLevel.LEVEL_2;
    testSkill.reducesTo = [Axiom.READ, Axiom.TRANSFORM, Axiom.WRITE];
    testSkill.steps = [
      createStep('step1', 'Read Data', Axiom.READ),
      createStep('step2', 'Transform Data', Axiom.TRANSFORM),
      createStep('step3', 'Write Data', Axiom.WRITE),
    ];
  });

  describe('beginExecution', () => {
    it('generates unique execution IDs', () => {
      const ctx1 = generator.beginExecution(testSkill, 'user:test', 'test');
      const ctx2 = generator.beginExecution(testSkill, 'user:test', 'test');

      expect(ctx1.executionId).not.toBe(ctx2.executionId);
    });

    it('captures skill metadata', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'production');

      expect(ctx.skillId).toBe('test-skill');
      expect(ctx.skillName).toBe('Test Skill');
      expect(ctx.skillVersion).toBe('1.0.0');
      expect(ctx.skillTypeLevel).toBe(TypeLevel.LEVEL_2);
      expect(ctx.triggeredBy).toBe('user:test');
      expect(ctx.environment).toBe('production');
    });

    it('stores previous certificate hash if provided', () => {
      const prevHash = 'abc123';
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test', prevHash);

      expect(ctx.previousCertificateHash).toBe(prevHash);
    });
  });

  describe('recordStep', () => {
    it('records step with correct data', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test');
      const step = testSkill.steps[0];

      generator.recordStep(
        ctx,
        step,
        { source: 'api' },
        { data: [1, 2, 3] },
        'success',
        'rule_001'
      );

      expect(ctx.steps.length).toBe(1);
      expect(ctx.steps[0].stepId).toBe('step1');
      expect(ctx.steps[0].stepName).toBe('Read Data');
      expect(ctx.steps[0].axiom).toBe(Axiom.READ);
      expect(ctx.steps[0].status).toBe('success');
      expect(ctx.steps[0].compositionRuleApplied).toBe('rule_001');
    });

    it('hashes inputs and outputs correctly', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test');
      const step = testSkill.steps[0];
      const input = { key: 'value' };
      const output = { result: 'data' };

      generator.recordStep(ctx, step, input, output, 'success', 'rule_001');

      // Hashes should be non-empty strings
      expect(ctx.steps[0].inputHash).toBeTruthy();
      expect(ctx.steps[0].outputHash).toBeTruthy();
      expect(typeof ctx.steps[0].inputHash).toBe('string');
      expect(typeof ctx.steps[0].outputHash).toBe('string');
    });

    it('truncates samples to reasonable length', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test');
      const step = testSkill.steps[0];
      const longInput = { data: 'x'.repeat(500) };
      const longOutput = { result: 'y'.repeat(500) };

      generator.recordStep(ctx, step, longInput, longOutput, 'success', 'rule_001');

      // Samples should be truncated
      expect(ctx.steps[0].inputSample).toBeTruthy();
      expect(ctx.steps[0].inputSample!.length).toBeLessThanOrEqual(103); // 100 + "..."
      expect(ctx.steps[0].outputSample!.length).toBeLessThanOrEqual(103);
    });

    it('handles array samples correctly', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test');
      const step = testSkill.steps[0];
      const arrayInput = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      generator.recordStep(ctx, step, arrayInput, [], 'success', 'rule_001');

      // Should show first few items
      expect(ctx.steps[0].inputSample).toContain('[1,2,3');
    });

    it('records failure status and error message', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test');
      const step = testSkill.steps[0];

      generator.recordStep(
        ctx,
        step,
        {},
        {},
        'failure',
        'rule_001',
        'Connection timeout'
      );

      expect(ctx.steps[0].status).toBe('failure');
      expect(ctx.steps[0].errorMessage).toBe('Connection timeout');
    });

    it('performs level check correctly', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test');
      const step = testSkill.steps[0]; // READ axiom

      generator.recordStep(ctx, step, {}, {}, 'success', 'rule_001');

      expect(ctx.steps[0].levelCheck.skillLevel).toBe(TypeLevel.LEVEL_2);
      expect(ctx.steps[0].levelCheck.requiredLevel).toBe(TypeLevel.LEVEL_1); // READ requires LEVEL_1
      expect(ctx.steps[0].levelCheck.passed).toBe(true);
    });
  });

  describe('finalize', () => {
    it('computes valid certificate hash', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test');

      generator.recordStep(ctx, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      generator.recordStep(ctx, testSkill.steps[1], {}, {}, 'success', 'rule_002');
      generator.recordStep(ctx, testSkill.steps[2], {}, {}, 'success', 'rule_003');

      const cert = generator.finalize(ctx, 'completed');

      expect(cert.certificateHash).toBeTruthy();
      expect(cert.certificateHash.length).toBe(64); // SHA-256 hex length
    });

    it('counts axiom usage correctly', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test');

      generator.recordStep(ctx, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      generator.recordStep(ctx, testSkill.steps[1], {}, {}, 'success', 'rule_002');
      generator.recordStep(ctx, testSkill.steps[2], {}, {}, 'success', 'rule_003');

      const cert = generator.finalize(ctx, 'completed');

      expect(cert.axiomUsage[Axiom.READ]).toBe(1);
      expect(cert.axiomUsage[Axiom.TRANSFORM]).toBe(1);
      expect(cert.axiomUsage[Axiom.WRITE]).toBe(1);
      expect(cert.axiomUsage[Axiom.GENERATE]).toBe(0);
    });

    it('counts successful steps correctly', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test');

      generator.recordStep(ctx, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      generator.recordStep(ctx, testSkill.steps[1], {}, {}, 'failure', 'rule_002', 'Error');
      generator.recordStep(ctx, testSkill.steps[2], {}, {}, 'skipped', 'rule_003');

      const cert = generator.finalize(ctx, 'failed');

      expect(cert.totalSteps).toBe(3);
      expect(cert.successfulSteps).toBe(1);
      expect(cert.status).toBe('failed');
    });

    it('chains certificates via previousCertificateHash', () => {
      // First execution
      const ctx1 = generator.beginExecution(testSkill, 'user:test', 'test');
      generator.recordStep(ctx1, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      const cert1 = generator.finalize(ctx1, 'completed');

      // Second execution, chained
      const ctx2 = generator.beginExecution(testSkill, 'user:test', 'test', cert1.certificateHash);
      generator.recordStep(ctx2, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      const cert2 = generator.finalize(ctx2, 'completed');

      expect(cert2.previousCertificateHash).toBe(cert1.certificateHash);
    });
  });

  describe('verifyCertificate', () => {
    it('verifies unmodified certificates', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test');
      generator.recordStep(ctx, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      const cert = generator.finalize(ctx, 'completed');

      const isValid = generator.verifyCertificate(cert);
      expect(isValid).toBe(true);
    });

    it('rejects tampered certificates', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test');
      generator.recordStep(ctx, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      const cert = generator.finalize(ctx, 'completed');

      // Tamper with the certificate
      cert.successfulSteps = 999;

      const isValid = generator.verifyCertificate(cert);
      expect(isValid).toBe(false);
    });

    it('rejects certificate with modified step', () => {
      const ctx = generator.beginExecution(testSkill, 'user:test', 'test');
      generator.recordStep(ctx, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      const cert = generator.finalize(ctx, 'completed');

      // Tamper with a step
      cert.steps[0].status = 'failure';

      const isValid = generator.verifyCertificate(cert);
      expect(isValid).toBe(false);
    });
  });

  describe('verifyCertificateChain', () => {
    it('verifies valid certificate chain', () => {
      const ctx1 = generator.beginExecution(testSkill, 'user:test', 'test');
      generator.recordStep(ctx1, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      const cert1 = generator.finalize(ctx1, 'completed');

      const ctx2 = generator.beginExecution(testSkill, 'user:test', 'test', cert1.certificateHash);
      generator.recordStep(ctx2, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      const cert2 = generator.finalize(ctx2, 'completed');

      const ctx3 = generator.beginExecution(testSkill, 'user:test', 'test', cert2.certificateHash);
      generator.recordStep(ctx3, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      const cert3 = generator.finalize(ctx3, 'completed');

      const isValid = generator.verifyCertificateChain([cert1, cert2, cert3]);
      expect(isValid).toBe(true);
    });

    it('rejects broken certificate chain', () => {
      const ctx1 = generator.beginExecution(testSkill, 'user:test', 'test');
      generator.recordStep(ctx1, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      const cert1 = generator.finalize(ctx1, 'completed');

      // Second cert doesn't link to first
      const ctx2 = generator.beginExecution(testSkill, 'user:test', 'test', 'wrong-hash');
      generator.recordStep(ctx2, testSkill.steps[0], {}, {}, 'success', 'rule_001');
      const cert2 = generator.finalize(ctx2, 'completed');

      const isValid = generator.verifyCertificateChain([cert1, cert2]);
      expect(isValid).toBe(false);
    });
  });
});
