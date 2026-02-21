/**
 * SEO Specialist Skills Module
 *
 * Contains 5 standalone SEO skills:
 * - Backlink Acquisition & Outreach Strategy Generator
 * - E-Commerce Product Page SEO Optimizer
 * - Competitor SEO Analysis & Gap Report
 * - SEO Reporting & ROI Dashboard Generator
 * - Site Architecture & Internal Linking Optimizer
 */

export { SEO_SKILLS } from './skills';

export const SEO_SKILL_IDS = [
  'backlink-acquisition-strategy-generator',
  'ecommerce-product-page-seo-optimizer',
  'competitor-seo-analysis-report',
  'seo-reporting-roi-dashboard-generator',
  'site-architecture-internal-linking-optimizer',
] as const;

export type SEOSkillId = typeof SEO_SKILL_IDS[number];
