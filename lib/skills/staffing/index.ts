/**
 * Staffing / Recruiting Skills Module
 *
 * Contains 5 staffing and recruiting firm skills:
 * - Candidate Screening Scorecard
 * - Client Intake & Requirements Builder
 * - Candidate Market Intelligence Brief
 * - Placement Success Predictor
 * - Recruiting Pipeline Dashboard Designer
 */
export { STAFFING_SKILLS } from './skills';

export const STAFFING_SKILL_IDS = [
  'candidate-screening-scorecard',
  'client-intake-requirements-builder',
  'candidate-market-intelligence-brief',
  'placement-success-predictor',
  'recruiting-pipeline-dashboard-designer',
] as const;

export type StaffingSkillId = typeof STAFFING_SKILL_IDS[number];
