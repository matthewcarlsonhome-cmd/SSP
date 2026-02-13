/**
 * CPA / Accounting Skills Module
 *
 * Contains 6 accounting and CPA firm skills:
 * - Tax Season Workflow Optimizer
 * - Client Financial Health Summary
 * - Client Engagement Letter Generator
 * - Audit Workpaper Reviewer
 * - Year-End Close Checklist Generator
 * - 1099/W-2 Compliance Tracker
 */
export { ACCOUNTING_SKILLS } from './skills';

export const ACCOUNTING_SKILL_IDS = [
  'tax-season-workflow-optimizer',
  'client-financial-health-summary',
  'engagement-letter-generator',
  'audit-workpaper-reviewer',
  'year-end-close-checklist-generator',
  '1099-w2-compliance-tracker',
] as const;

export type AccountingSkillId = typeof ACCOUNTING_SKILL_IDS[number];
