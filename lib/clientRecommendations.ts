/**
 * clientRecommendations.ts - Auto-curated Skill & Workflow Recommendations
 *
 * Maps industries and company types to relevant skills and workflows
 * for B2B client outreach with curated selections.
 *
 * IMPORTANT: Keep selections focused and limited:
 * - MAX 6 skills per industry (avoid overwhelming first-touch prospects)
 * - MAX 3 workflows per industry
 * - Focus on universal skills that work standalone (no third-party platform dependencies)
 */

import type { ClientIndustry } from './storage/types';

// Maximum defaults per industry - avoid overwhelming first-touch prospects
const MAX_DEFAULT_SKILLS = 6;
const MAX_DEFAULT_WORKFLOWS = 3;

// ═══════════════════════════════════════════════════════════════════════════
// SKILL RECOMMENDATIONS BY INDUSTRY
// Limited to 6 most impactful, universal skills per industry
// ═══════════════════════════════════════════════════════════════════════════

export const INDUSTRY_SKILL_MAPPING: Record<ClientIndustry, string[]> = {
  insurance: [
    'sales-call-prep-pro',         // Sales prep before client calls
    'proposal-builder',            // Create winning proposals
    'compliance-audit-prep-assistant', // Insurance compliance
    'contract-review-accelerator', // Speed up policy/contract review
    'excel-data-analyzer',         // Analyze claims/performance data
    'executive-communication-pack', // Board & leadership comms
  ],

  financial_services: [
    'sales-call-prep-pro',         // Client meeting prep
    'proposal-builder',            // Investment/advisory proposals
    'compliance-audit-prep-assistant', // Regulatory compliance
    'excel-data-analyzer',         // Financial data analysis
    'executive-communication-pack', // Stakeholder communications
    'budget-variance-narrator',    // Financial reporting
  ],

  healthcare: [
    'compliance-audit-prep-assistant', // HIPAA and regulatory compliance
    'sop-documentation-builder',   // Clinical procedure documentation
    'policy-document-generator',   // Policy and procedure docs
    'sales-call-prep-pro',         // Provider/partner outreach
    'executive-communication-pack', // Leadership communications
    'employee-onboarding-planner', // Staff onboarding
  ],

  technology: [
    'technical-spec-writer',       // Technical documentation
    'prd-writer',                  // Product requirements
    'sales-call-prep-pro',         // Sales and partner calls
    'proposal-builder',            // Tech proposals and SOWs
    'competitive-battle-card',     // Competitive positioning
    'incident-postmortem-pro',     // Post-incident analysis
  ],

  marketing_advertising: [
    'excel-marketing-dashboard',   // Campaign performance tracking
    'ab-test-analysis-reporter',   // Test analysis and insights
    'sales-call-prep-pro',         // Client meeting prep
    'proposal-builder',            // Campaign proposals
    'competitive-landscape-mapper', // Market research
    'automation-opportunity-assessment', // Process optimization
  ],

  professional_services: [
    'sales-call-prep-pro',         // Client meeting prep
    'proposal-builder',            // Engagement proposals
    'rfp-response-generator',      // RFP/RFI responses
    'sop-documentation-builder',   // Process documentation
    'contract-review-accelerator', // Contract analysis
    'executive-communication-pack', // Client communications
  ],

  retail: [
    'excel-marketing-dashboard',   // Sales & marketing analytics
    'customer-health-scorecard',   // Customer retention analysis
    'sales-call-prep-pro',         // Vendor/partner meetings
    'sop-documentation-builder',   // Store operations
    'competitive-landscape-mapper', // Market positioning
    'process-automation-spec',     // Operational efficiency
  ],

  manufacturing: [
    'sop-documentation-builder',   // Production procedures
    'process-automation-spec',     // Automation planning
    'compliance-audit-prep-assistant', // Quality & safety compliance
    'vendor-comparison-matrix',    // Supplier evaluation
    'excel-data-analyzer',         // Production analytics
    'incident-postmortem-generator', // Issue analysis
  ],

  real_estate: [
    'sales-call-prep-pro',         // Buyer/seller meetings
    'proposal-builder',            // Listing presentations
    'contract-review-accelerator', // Contract review
    'market-sizing-analyst',       // Market analysis
    'excel-marketing-dashboard',   // Performance tracking
    'customer-health-scorecard',   // Client relationship tracking
  ],

  hospitality: [
    'sop-documentation-builder',   // Service standards
    'employee-onboarding-planner', // Staff training
    'excel-marketing-dashboard',   // Revenue analytics
    'customer-health-scorecard',   // Guest satisfaction
    'job-description-optimizer',   // Hiring
    'process-automation-spec',     // Operational efficiency
  ],

  education: [
    'sop-documentation-builder',   // Academic procedures
    'employee-onboarding-planner', // Faculty/staff onboarding
    'policy-document-generator',   // Institutional policies
    'meeting-minutes-pro',         // Committee meetings
    'executive-communication-pack', // Stakeholder comms
    'excel-data-analyzer',         // Performance analytics
  ],

  nonprofit: [
    'proposal-builder',            // Grant proposals
    'sales-call-prep-pro',         // Donor meetings
    'board-presentation-builder',  // Board reporting
    'budget-variance-narrator',    // Financial reporting
    'sop-documentation-builder',   // Program documentation
    'executive-communication-pack', // Stakeholder comms
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL INDUSTRIES FOR MADISON-AREA BUSINESSES
  // ═══════════════════════════════════════════════════════════════════════════

  construction: [
    'sop-documentation-builder',   // Safety & procedures
    'rfp-response-generator',      // Bid responses
    'vendor-comparison-matrix',    // Subcontractor evaluation
    'contract-review-accelerator', // Contract review
    'excel-data-analyzer',         // Project analytics
    'incident-postmortem-generator', // Safety incident analysis
  ],

  automotive: [
    'sales-call-prep-pro',         // Customer interactions
    'customer-health-scorecard',   // Customer retention
    'sop-documentation-builder',   // Service procedures
    'excel-marketing-dashboard',   // Sales performance
    'competitive-battle-card',     // Competitive positioning
    'employee-onboarding-planner', // Sales & service training
  ],

  food_beverage: [
    'sop-documentation-builder',   // Food safety procedures
    'employee-onboarding-planner', // Staff training
    'compliance-audit-prep-assistant', // Food safety compliance
    'excel-marketing-dashboard',   // Sales analytics
    'vendor-comparison-matrix',    // Supplier management
    'customer-health-scorecard',   // Franchisee/customer health
  ],

  utilities: [
    'compliance-audit-prep-assistant', // Regulatory compliance
    'sop-documentation-builder',   // Operations procedures
    'incident-postmortem-generator', // Outage analysis
    'crisis-communication-playbook', // Emergency communications
    'excel-data-analyzer',         // Usage analytics
    'executive-communication-pack', // Regulatory comms
  ],

  biotechnology: [
    'technical-spec-writer',       // R&D documentation
    'compliance-audit-prep-assistant', // FDA/regulatory compliance
    'sop-documentation-builder',   // Lab procedures
    'sales-call-prep-pro',         // Partner/investor meetings
    'prd-writer',                  // Product requirements
    'board-presentation-builder',  // Investor communications
  ],

  other: [
    'sales-call-prep-pro',         // Business development
    'proposal-builder',            // Business proposals
    'sop-documentation-builder',   // Process documentation
    'excel-data-analyzer',         // Data analysis
    'executive-communication-pack', // Leadership comms
    'automation-opportunity-assessment', // Process optimization
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW RECOMMENDATIONS BY INDUSTRY
// Limited to 3 most impactful workflows per industry
// ═══════════════════════════════════════════════════════════════════════════

export const INDUSTRY_WORKFLOW_MAPPING: Record<ClientIndustry, string[]> = {
  insurance: [
    'sales-account-pursuit',       // Account planning and pursuit
    'compliance-program-builder',  // Regulatory compliance
    'customer-churn-prevention',   // Client retention
  ],

  financial_services: [
    'sales-account-pursuit',       // Client acquisition
    'financial-analysis-pack',     // Financial reporting
    'compliance-program-builder',  // Regulatory compliance
  ],

  healthcare: [
    'compliance-program-builder',  // HIPAA and regulatory
    'new-hire-onboarding',         // Staff training
    'process-improvement',         // Operational efficiency
  ],

  technology: [
    'sales-account-pursuit',       // Sales pipeline
    'product-launch-gtm',          // Product launches
    'sprint-delivery',             // Development cycles
  ],

  marketing_advertising: [
    'marketing-campaign',          // Campaign planning
    'consulting-engagement',       // Client engagements
    'competitive-intelligence',    // Market analysis
  ],

  professional_services: [
    'consulting-engagement',       // Client delivery
    'sales-account-pursuit',       // Business development
    'rfp-response-center',         // Proposal management
  ],

  retail: [
    'marketing-campaign',          // Marketing initiatives
    'customer-churn-prevention',   // Customer retention
    'process-improvement',         // Operations optimization
  ],

  manufacturing: [
    'process-improvement',         // Manufacturing efficiency
    'vendor-evaluation-pipeline',  // Supplier management
    'incident-to-improvement',     // Quality improvements
  ],

  real_estate: [
    'sales-account-pursuit',       // Client acquisition
    'marketing-campaign',          // Property marketing
    'customer-churn-prevention',   // Client retention
  ],

  hospitality: [
    'new-hire-onboarding',         // Staff training
    'marketing-campaign',          // Promotions and marketing
    'customer-churn-prevention',   // Guest loyalty
  ],

  education: [
    'new-hire-onboarding',         // Faculty/staff onboarding
    'process-improvement',         // Administrative efficiency
    'training-workshop',           // Professional development
  ],

  nonprofit: [
    'sales-account-pursuit',       // Donor cultivation
    'marketing-campaign',          // Fundraising campaigns
    'business-case-development',   // Grant proposals
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL INDUSTRIES FOR MADISON-AREA BUSINESSES
  // ═══════════════════════════════════════════════════════════════════════════

  construction: [
    'project-initiation',          // Project kickoff
    'vendor-evaluation-pipeline',  // Subcontractor selection
    'rfp-response-center',         // Bid management
  ],

  automotive: [
    'sales-account-pursuit',       // Sales process
    'customer-churn-prevention',   // Customer retention
    'new-hire-onboarding',         // Staff training
  ],

  food_beverage: [
    'new-hire-onboarding',         // Staff training
    'compliance-program-builder',  // Food safety compliance
    'process-improvement',         // Operations efficiency
  ],

  utilities: [
    'compliance-program-builder',  // Regulatory compliance
    'incident-to-improvement',     // Outage response
    'process-improvement',         // Operations efficiency
  ],

  biotechnology: [
    'compliance-program-builder',  // FDA/regulatory
    'sales-account-pursuit',       // Partner/investor outreach
    'product-launch-gtm',          // Product commercialization
  ],

  other: [
    'sales-account-pursuit',       // Business development
    'process-improvement',         // Operational efficiency
    'consulting-engagement',       // Client delivery
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get recommended skills for a given industry
 */
export function getRecommendedSkills(industry: ClientIndustry): string[] {
  return INDUSTRY_SKILL_MAPPING[industry] || INDUSTRY_SKILL_MAPPING.other;
}

/**
 * Get recommended workflows for a given industry
 */
export function getRecommendedWorkflows(industry: ClientIndustry): string[] {
  return INDUSTRY_WORKFLOW_MAPPING[industry] || INDUSTRY_WORKFLOW_MAPPING.other;
}

/**
 * Apply recommendations to a client partial (for use with DEFAULT_TARGET_COMPANIES)
 */
export function applyIndustryRecommendations(
  company: { companyName: string; industry: ClientIndustry }
): {
  companyName: string;
  industry: ClientIndustry;
  selectedSkillIds: string[];
  selectedWorkflowIds: string[];
} {
  return {
    ...company,
    selectedSkillIds: getRecommendedSkills(company.industry),
    selectedWorkflowIds: getRecommendedWorkflows(company.industry),
  };
}
