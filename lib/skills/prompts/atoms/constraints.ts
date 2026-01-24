/**
 * Constraint Atoms - Behavioral boundaries and rules
 *
 * These define LIMITS on what the AI should do.
 * Essential for consistent, reliable outputs.
 */

import { ConstraintAtom } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Create constraint atom
// ═══════════════════════════════════════════════════════════════════════════════

function createConstraintAtom(
  config: Omit<ConstraintAtom, 'type' | 'render'>
): ConstraintAtom {
  return {
    type: 'constraint',
    ...config,
    render: () => {
      const prefix =
        config.severity === 'must'
          ? 'MUST'
          : config.severity === 'should'
            ? 'SHOULD'
            : 'PREFER TO';
      return `- ${prefix}: ${config.rule}`;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE & ACCURACY CONSTRAINTS
// ═══════════════════════════════════════════════════════════════════════════════

export const CONSTRAINTS = {
  // Evidence Requirements
  evidenceBacked: createConstraintAtom({
    id: 'evidence-backed',
    rule: 'Back every claim with specific evidence from the provided materials. Never fabricate or assume information.',
    severity: 'must',
  }),

  noAssumptions: createConstraintAtom({
    id: 'no-assumptions',
    rule: 'Explicitly state when information is not provided rather than making assumptions. Use phrases like "Based on the provided materials..." or "Not mentioned in the input..."',
    severity: 'must',
  }),

  quantifyWhenPossible: createConstraintAtom({
    id: 'quantify-when-possible',
    rule: 'Use specific numbers, percentages, and metrics when available. Avoid vague qualifiers like "many", "often", "significant".',
    severity: 'should',
  }),

  // Honesty & Realism
  honestAssessment: createConstraintAtom({
    id: 'honest-assessment',
    rule: 'Provide accurate, honest assessments even if they are not what the user wants to hear. Do not inflate scores or minimize gaps.',
    severity: 'must',
  }),

  marketRealistic: createConstraintAtom({
    id: 'market-realistic',
    rule: 'Ground recommendations in actual market realities and competitive landscapes. Avoid overly optimistic projections.',
    severity: 'should',
  }),

  acknowledgeUncertainty: createConstraintAtom({
    id: 'acknowledge-uncertainty',
    rule: 'Clearly indicate when analysis involves uncertainty or when multiple interpretations are possible.',
    severity: 'should',
  }),

  // Actionability
  actionableRecommendations: createConstraintAtom({
    id: 'actionable-recommendations',
    rule: 'Every recommendation must be specific and actionable. Avoid generic advice like "improve your skills" - specify WHICH skills and HOW.',
    severity: 'must',
  }),

  prioritizedActions: createConstraintAtom({
    id: 'prioritized-actions',
    rule: 'Prioritize recommendations by impact and effort. Help user focus on highest-leverage improvements first.',
    severity: 'should',
  }),

  // Tone & Style
  professionalTone: createConstraintAtom({
    id: 'professional-tone',
    rule: 'Maintain a professional, expert tone. Be direct but supportive. Avoid overly casual language.',
    severity: 'should',
  }),

  constructiveFeedback: createConstraintAtom({
    id: 'constructive-feedback',
    rule: 'Frame negative findings as opportunities for improvement. Be honest but not harsh.',
    severity: 'should',
  }),

  noFalseHope: createConstraintAtom({
    id: 'no-false-hope',
    rule: 'Do not provide false hope or unrealistic encouragement. Honest assessment helps users make better decisions.',
    severity: 'must',
  }),

  // Scope & Focus
  stayOnTopic: createConstraintAtom({
    id: 'stay-on-topic',
    rule: 'Focus on the specific request. Do not provide unrequested tangential advice or analysis.',
    severity: 'should',
  }),

  respectInputs: createConstraintAtom({
    id: 'respect-inputs',
    rule: 'Base analysis on the provided inputs. Do not request additional information that was not provided.',
    severity: 'must',
  }),

  completeAnalysis: createConstraintAtom({
    id: 'complete-analysis',
    rule: 'Provide comprehensive analysis covering all aspects of the request. Do not truncate or summarize prematurely.',
    severity: 'should',
  }),

  // Safety & Ethics
  noPII: createConstraintAtom({
    id: 'no-pii',
    rule: 'Do not store, repeat, or ask for unnecessary personal identifying information beyond what is needed for the task.',
    severity: 'must',
  }),

  ethicalBoundaries: createConstraintAtom({
    id: 'ethical-boundaries',
    rule: 'Do not help with deception, fraud, or misrepresentation. Refuse requests to fabricate credentials or experiences.',
    severity: 'must',
  }),

  // Technical Constraints
  noCodeExecution: createConstraintAtom({
    id: 'no-code-execution',
    rule: 'Do not attempt to execute code or access external systems unless explicitly enabled.',
    severity: 'must',
  }),

  formatConsistency: createConstraintAtom({
    id: 'format-consistency',
    rule: 'Follow the specified output format exactly. Use consistent heading levels, bullet styles, and structure.',
    severity: 'should',
  }),
} as const;

// Type for constraint IDs
export type ConstraintId = keyof typeof CONSTRAINTS;

// Get constraint by ID
export function getConstraint(id: ConstraintId): ConstraintAtom {
  return CONSTRAINTS[id];
}

// Render multiple constraints as a list
export function renderConstraints(ids: ConstraintId[]): string {
  const grouped = {
    must: [] as string[],
    should: [] as string[],
    prefer: [] as string[],
  };

  for (const id of ids) {
    const constraint = CONSTRAINTS[id];
    grouped[constraint.severity].push(constraint.rule);
  }

  let result = '';

  if (grouped.must.length > 0) {
    result += '**MANDATORY RULES:**\n';
    result += grouped.must.map((r) => `- MUST: ${r}`).join('\n');
    result += '\n\n';
  }

  if (grouped.should.length > 0) {
    result += '**STRONG GUIDELINES:**\n';
    result += grouped.should.map((r) => `- SHOULD: ${r}`).join('\n');
    result += '\n\n';
  }

  if (grouped.prefer.length > 0) {
    result += '**PREFERENCES:**\n';
    result += grouped.prefer.map((r) => `- PREFER: ${r}`).join('\n');
  }

  return result.trim();
}

// Pre-composed constraint sets for common use cases
export const CONSTRAINT_SETS = {
  assessment: [
    'evidenceBacked',
    'honestAssessment',
    'quantifyWhenPossible',
    'actionableRecommendations',
    'noFalseHope',
  ] as ConstraintId[],

  generation: [
    'noAssumptions',
    'respectInputs',
    'professionalTone',
    'formatConsistency',
    'ethicalBoundaries',
  ] as ConstraintId[],

  coaching: [
    'honestAssessment',
    'constructiveFeedback',
    'actionableRecommendations',
    'prioritizedActions',
    'acknowledgeUncertainty',
  ] as ConstraintId[],

  research: [
    'evidenceBacked',
    'marketRealistic',
    'acknowledgeUncertainty',
    'completeAnalysis',
    'stayOnTopic',
  ] as ConstraintId[],
} as const;
