/**
 * Google Ads / PPC Management Skills Module
 *
 * Contains 5 Google Ads campaign management skills:
 * - Google Ads Account Auditor
 * - Search Term Analysis & Negative Keyword Engine
 * - Client Report Narrative Generator
 * - RSA & Ad Copy Generator for Local Services
 * - PMax Asset Health Monitor & Refresh Planner
 */
export { GOOGLE_ADS_SKILLS } from './skills';

export const GOOGLE_ADS_SKILL_IDS = [
  'google-ads-account-auditor',
  'search-term-negative-keyword-engine',
  'client-report-narrative-generator',
  'rsa-ad-copy-generator',
  'pmax-asset-health-monitor',
] as const;

export type GoogleAdsSkillId = typeof GOOGLE_ADS_SKILL_IDS[number];
