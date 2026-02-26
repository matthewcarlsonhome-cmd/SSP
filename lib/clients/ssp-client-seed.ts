/**
 * Small Screen Producer (SSP) Client Seed Data
 *
 * Pre-configured client record for SSP agency demo.
 * Use this to initialize the SSP client in the admin panel with
 * custom headline, welcome message, and recommended skills/workflows.
 *
 * To use: Import and call createSSPClient() from the admin panel or
 * use the client import functionality to load this configuration.
 */

import type { Client } from '../storage/types';

/**
 * SSP Client Record Configuration
 *
 * Small Screen Producer is a Houston-based digital marketing agency
 * specializing in pool & spa industry marketing since 2009.
 * Founded by Pam Vinje, they serve 1,000+ pool/spa businesses
 * with website design, social media, content marketing, PPC,
 * video production, and AI automation solutions.
 */
export const SSP_CLIENT_SEED: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
  companyName: 'Small Screen Producer',
  industry: 'Marketing / Advertising' as any,
  website: 'https://www.smallscreenproducer.com',
  description: 'Full-service digital marketing agency specializing in pool & spa, home improvement, and restaurant industries. Since 2009, SSP has helped over 1,000 pool and spa businesses achieve higher visibility, more leads, and greater brand growth through tailored digital strategies. Their Pool Marketing Site division (poolmarketingsite.com) is the industry-leading digital marketing partner for pool builders, service companies, and retailers.',

  companyType: 'Digital Marketing Agency',
  services: 'Google Ads Management, Website Design, Social Media Marketing, Content Marketing, Video Production, SEO, Online Reputation Management, AI Automation, Email Marketing, Branding',
  revenue: '$2-5M',
  employeeCount: '11-50',
  location: 'Houston, TX',
  priority: 'HIGH',

  logoUrl: undefined,
  linkedInUrl: 'https://www.linkedin.com/company/small-screen-producer/',

  estimatedTimeSavings: '120+ hours/month across PPC management, reporting, content, and client deliverables',
  estimatedCostSavings: '$180,000-$350,000/year in operational efficiency and reduced manual work',
  painPoints: 'Managing 45+ Google Ads accounts manually, time-intensive weekly triage and reporting, search term waste elimination across portfolio, PMax campaign hygiene at scale, client report narrative generation, 5 required weekly deliverables, seasonal budget management for pool/spa industry',

  companyTechnicalInfo: 'Google Ads MCC managing 45+ accounts, Looker Studio for dashboards and client reporting, Google Tag Manager for conversion tracking, CallRail for call tracking, GA4 analytics, WordPress and Shopify websites for clients, Canva and Adobe Creative Suite for design, social media management tools',

  keyUseCases: [
    'PPC account triage and prioritization (45+ accounts weekly)',
    'Search term analysis and negative keyword management',
    'Client report narrative generation with 4-part framework',
    'PMax asset hygiene auditing and optimization',
    'Google Ads recommendations audit and scoring',
    'Looker Studio dashboard setup and maintenance',
    'Google Ads MCC automation scripts',
    'RSA ad copy generation for pool/spa businesses',
    'Account auditing with wasted spend identification',
    'SEO content and backlink strategy for client sites',
  ],

  contacts: [
    {
      id: 'ssp-contact-1',
      name: 'Pam Vinje',
      title: 'Founder & CEO',
      email: undefined,
      phone: undefined,
      linkedinUrl: 'https://www.linkedin.com/in/pamvinje/',
      isPrimary: true,
      contactStatus: 'not_contacted',
    },
  ],

  selectedSkillIds: [
    // Google Ads Skills (existing)
    'google-ads-account-auditor',
    'search-term-negative-keyword-engine',
    'client-report-narrative-generator',
    'rsa-ad-copy-generator',
    'pmax-asset-health-monitor',
    // PPC Agency Skills (new)
    'ppc-weekly-triage',
    'ppc-search-terms-negatives',
    'ppc-recommendations-audit',
    'ppc-deliverables-generator',
    'ppc-looker-studio-setup',
    'ppc-pmax-hygiene-auditor',
    'ppc-ads-scripts-manager',
    // SEO Skills
    'backlink-acquisition-strategy-generator',
    'competitor-seo-analysis-report',
    'seo-reporting-roi-dashboard-generator',
    'site-architecture-internal-linking-optimizer',
  ],

  selectedWorkflowIds: [
    'ppc-master-weekly-workflow',
  ],

  customHeadline: 'AI-Powered PPC & Marketing Automation for Small Screen Producer',
  customMessage: 'Welcome to your SkillEngine portal, SSP team! These AI skills are purpose-built for managing your 45+ pool & spa Google Ads accounts at scale. From Monday morning triage to client report narratives, PMax asset hygiene to negative keyword management — every skill is calibrated to the pool/spa industry and your agency workflow. Load test data on any skill to see it in action with realistic SSP account scenarios.',

  portalSlug: 'small-screen-producer',
  portalEnabled: true,

  status: 'demo_scheduled',
  notes: 'Demo presentation for SSP team showcasing SkillEngine PPC automation capabilities. Focus on: weekly triage workflow, search term waste elimination, client reporting narratives, PMax hygiene, and the 7-script automation suite. All test data uses realistic SSP/pool-spa scenarios.',
};

/**
 * List of all skill IDs recommended for SSP demo
 * Use this to quickly check which skills should have test data loaded
 */
export const SSP_DEMO_SKILL_IDS = [
  // Google Ads (5)
  'google-ads-account-auditor',
  'search-term-negative-keyword-engine',
  'client-report-narrative-generator',
  'rsa-ad-copy-generator',
  'pmax-asset-health-monitor',
  // PPC Agency (7)
  'ppc-weekly-triage',
  'ppc-search-terms-negatives',
  'ppc-recommendations-audit',
  'ppc-deliverables-generator',
  'ppc-looker-studio-setup',
  'ppc-pmax-hygiene-auditor',
  'ppc-ads-scripts-manager',
  // SEO (5)
  'backlink-acquisition-strategy-generator',
  'ecommerce-product-page-seo-optimizer',
  'competitor-seo-analysis-report',
  'seo-reporting-roi-dashboard-generator',
  'site-architecture-internal-linking-optimizer',
  // Accounting (6)
  'tax-season-workflow-optimizer',
  'client-financial-health-summary',
  'engagement-letter-generator',
  'audit-workpaper-reviewer',
  'year-end-close-checklist-generator',
  '1099-w2-compliance-tracker',
  // Staffing (5)
  'candidate-screening-scorecard',
  'client-intake-requirements-builder',
  'candidate-market-intelligence-brief',
  'placement-success-predictor',
  'recruiting-pipeline-dashboard-designer',
] as const;
