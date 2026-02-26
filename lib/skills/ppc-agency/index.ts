/**
 * PPC Agency Skills Module
 *
 * Contains 7 PPC agency workflow skills for managing 45+ Google Ads accounts:
 * - PPC Weekly Account Triage
 * - Search Terms & Negative Keyword Manager
 * - Google Ads Recommendations Audit
 * - PPC Deliverables Generator
 * - Looker Studio Dashboard & Report Builder
 * - PMax Asset Hygiene Auditor
 * - Google Ads Scripts Setup & Manager
 */

export { PPC_AGENCY_SKILLS } from './skills';

export const PPC_AGENCY_SKILL_IDS = [
  'ppc-weekly-triage',
  'ppc-search-terms-negatives',
  'ppc-recommendations-audit',
  'ppc-deliverables-generator',
  'ppc-looker-studio-setup',
  'ppc-pmax-hygiene-auditor',
  'ppc-ads-scripts-manager',
] as const;

export type PPCAgencySkillId = typeof PPC_AGENCY_SKILL_IDS[number];
