/**
 * clientRecommendations.ts - Auto-curated Skill & Workflow Recommendations
 *
 * Maps industries and company types to relevant skills and workflows
 * for B2B client outreach with curated selections.
 *
 * IMPORTANT: Keep selections focused and limited:
 * - MAX 9 skills per industry (balanced to show value without overwhelming)
 * - MAX 3 workflows per industry
 * - Focus on universal skills that work standalone (no third-party platform dependencies)
 */

import type { ClientIndustry } from './storage/types';

// Maximum defaults per industry
const MAX_DEFAULT_SKILLS = 9;
const MAX_DEFAULT_WORKFLOWS = 3;

// ═══════════════════════════════════════════════════════════════════════════
// SKILL RECOMMENDATIONS BY INDUSTRY
// 9 most impactful, universal skills per industry
// ═══════════════════════════════════════════════════════════════════════════

export const INDUSTRY_SKILL_MAPPING: Record<ClientIndustry, string[]> = {
  insurance: [
    'sales-call-prep-pro',         // Sales prep before client calls
    'proposal-builder',            // Create winning proposals
    'compliance-audit-prep-assistant', // Insurance compliance
    'contract-review-accelerator', // Speed up policy/contract review
    'excel-data-analyzer',         // Analyze claims/performance data
    'executive-communication-pack', // Board & leadership comms
    'customer-health-scorecard',   // Client retention tracking
    'rfp-response-generator',      // RFP/bid responses
    'meeting-minutes-pro',         // Meeting documentation
  ],

  financial_services: [
    'sales-call-prep-pro',         // Client meeting prep
    'proposal-builder',            // Investment/advisory proposals
    'compliance-audit-prep-assistant', // Regulatory compliance
    'excel-data-analyzer',         // Financial data analysis
    'executive-communication-pack', // Stakeholder communications
    'budget-variance-narrator',    // Financial reporting
    'board-presentation-builder',  // Board presentations
    'customer-health-scorecard',   // Client relationship tracking
    'contract-review-accelerator', // Legal document review
  ],

  healthcare: [
    'compliance-audit-prep-assistant', // HIPAA and regulatory compliance
    'sop-documentation-builder',   // Clinical procedure documentation
    'policy-document-generator',   // Policy and procedure docs
    'sales-call-prep-pro',         // Provider/partner outreach
    'executive-communication-pack', // Leadership communications
    'employee-onboarding-planner', // Staff onboarding
    'meeting-minutes-pro',         // Committee meetings
    'job-description-optimizer',   // Healthcare hiring
    'incident-postmortem-generator', // Patient safety reviews
  ],

  technology: [
    'technical-spec-writer',       // Technical documentation
    'prd-writer',                  // Product requirements
    'sales-call-prep-pro',         // Sales and partner calls
    'proposal-builder',            // Tech proposals and SOWs
    'competitive-battle-card',     // Competitive positioning
    'incident-postmortem-pro',     // Post-incident analysis
    'api-documentation-generator', // API docs
    'code-review-feedback-generator', // Code review
    'automation-opportunity-assessment', // Process automation
  ],

  marketing_advertising: [
    'excel-marketing-dashboard',   // Campaign performance tracking
    'ab-test-analysis-reporter',   // Test analysis and insights
    'sales-call-prep-pro',         // Client meeting prep
    'proposal-builder',            // Campaign proposals
    'competitive-landscape-mapper', // Market research
    'automation-opportunity-assessment', // Process optimization
    'customer-health-scorecard',   // Client retention tracking
    'meeting-minutes-pro',         // Client meeting notes
    'sop-documentation-builder',   // Agency process docs
  ],

  professional_services: [
    'sales-call-prep-pro',         // Client meeting prep
    'proposal-builder',            // Engagement proposals
    'rfp-response-generator',      // RFP/RFI responses
    'sop-documentation-builder',   // Process documentation
    'contract-review-accelerator', // Contract analysis
    'executive-communication-pack', // Client communications
    'meeting-minutes-pro',         // Engagement documentation
    'customer-health-scorecard',   // Client health tracking
    'automation-opportunity-assessment', // Efficiency consulting
  ],

  retail: [
    'excel-marketing-dashboard',   // Sales & marketing analytics
    'customer-health-scorecard',   // Customer retention analysis
    'sales-call-prep-pro',         // Vendor/partner meetings
    'sop-documentation-builder',   // Store operations
    'competitive-landscape-mapper', // Market positioning
    'process-automation-spec',     // Operational efficiency
    'employee-onboarding-planner', // Staff training
    'vendor-comparison-matrix',    // Supplier evaluation
    'ab-test-analysis-reporter',   // Promotion testing
  ],

  manufacturing: [
    'sop-documentation-builder',   // Production procedures
    'process-automation-spec',     // Automation planning
    'compliance-audit-prep-assistant', // Quality & safety compliance
    'vendor-comparison-matrix',    // Supplier evaluation
    'excel-data-analyzer',         // Production analytics
    'incident-postmortem-generator', // Issue analysis
    'employee-onboarding-planner', // Worker training
    'meeting-minutes-pro',         // Shift/ops meetings
    'contract-review-accelerator', // Vendor contracts
  ],

  real_estate: [
    'sales-call-prep-pro',         // Buyer/seller meetings
    'proposal-builder',            // Listing presentations
    'contract-review-accelerator', // Contract review
    'market-sizing-analyst',       // Market analysis
    'excel-marketing-dashboard',   // Performance tracking
    'customer-health-scorecard',   // Client relationship tracking
    'competitive-landscape-mapper', // Market research
    'meeting-minutes-pro',         // Transaction notes
    'email-sequence-creator',      // Lead nurturing
  ],

  hospitality: [
    'sop-documentation-builder',   // Service standards
    'employee-onboarding-planner', // Staff training
    'excel-marketing-dashboard',   // Revenue analytics
    'customer-health-scorecard',   // Guest satisfaction
    'job-description-optimizer',   // Hiring
    'process-automation-spec',     // Operational efficiency
    'crisis-communication-playbook', // Guest issues
    'competitive-landscape-mapper', // Market positioning
    'meeting-minutes-pro',         // Staff meetings
  ],

  education: [
    'sop-documentation-builder',   // Academic procedures
    'employee-onboarding-planner', // Faculty/staff onboarding
    'policy-document-generator',   // Institutional policies
    'meeting-minutes-pro',         // Committee meetings
    'executive-communication-pack', // Stakeholder comms
    'excel-data-analyzer',         // Performance analytics
    'job-description-optimizer',   // Academic hiring
    'proposal-builder',            // Grant proposals
    'budget-variance-narrator',    // Budget reporting
  ],

  nonprofit: [
    'proposal-builder',            // Grant proposals
    'sales-call-prep-pro',         // Donor meetings
    'board-presentation-builder',  // Board reporting
    'budget-variance-narrator',    // Financial reporting
    'sop-documentation-builder',   // Program documentation
    'executive-communication-pack', // Stakeholder comms
    'meeting-minutes-pro',         // Board meetings
    'customer-health-scorecard',   // Donor tracking
    'employee-onboarding-planner', // Volunteer onboarding
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
    'meeting-minutes-pro',         // Job site meetings
    'compliance-audit-prep-assistant', // Safety compliance
    'proposal-builder',            // Project bids
  ],

  automotive: [
    'sales-call-prep-pro',         // Customer interactions
    'customer-health-scorecard',   // Customer retention
    'sop-documentation-builder',   // Service procedures
    'excel-marketing-dashboard',   // Sales performance
    'competitive-battle-card',     // Competitive positioning
    'employee-onboarding-planner', // Sales & service training
    'proposal-builder',            // Fleet/commercial proposals
    'meeting-minutes-pro',         // Sales meetings
    'job-description-optimizer',   // Tech hiring
  ],

  food_beverage: [
    'sop-documentation-builder',   // Food safety procedures
    'employee-onboarding-planner', // Staff training
    'compliance-audit-prep-assistant', // Food safety compliance
    'excel-marketing-dashboard',   // Sales analytics
    'vendor-comparison-matrix',    // Supplier management
    'customer-health-scorecard',   // Franchisee/customer health
    'job-description-optimizer',   // Restaurant hiring
    'meeting-minutes-pro',         // Manager meetings
    'crisis-communication-playbook', // Food safety crises
  ],

  utilities: [
    'compliance-audit-prep-assistant', // Regulatory compliance
    'sop-documentation-builder',   // Operations procedures
    'incident-postmortem-generator', // Outage analysis
    'crisis-communication-playbook', // Emergency communications
    'excel-data-analyzer',         // Usage analytics
    'executive-communication-pack', // Regulatory comms
    'meeting-minutes-pro',         // Operations meetings
    'employee-onboarding-planner', // Safety training
    'policy-document-generator',   // Compliance policies
  ],

  biotechnology: [
    'technical-spec-writer',       // R&D documentation
    'compliance-audit-prep-assistant', // FDA/regulatory compliance
    'sop-documentation-builder',   // Lab procedures
    'sales-call-prep-pro',         // Partner/investor meetings
    'prd-writer',                  // Product requirements
    'board-presentation-builder',  // Investor communications
    'meeting-minutes-pro',         // Research meetings
    'proposal-builder',            // Grant/funding proposals
    'data-quality-assessment',     // Research data validation
  ],

  legal: [
    'contract-review-accelerator', // Contract analysis & review
    'sales-call-prep-pro',         // Client meeting prep
    'proposal-builder',            // Engagement letters/proposals
    'compliance-audit-prep-assistant', // Regulatory compliance
    'meeting-minutes-pro',         // Case/meeting documentation
    'executive-communication-pack', // Client communications
    'rfp-response-generator',      // RFP/RFI responses
    'sop-documentation-builder',   // Legal procedures
    'customer-health-scorecard',   // Client relationship tracking
  ],

  staffing: [
    'job-description-optimizer',   // Job posting optimization
    'sales-call-prep-pro',         // Client meeting prep
    'proposal-builder',            // Staffing proposals
    'customer-health-scorecard',   // Client health tracking
    'contract-review-accelerator', // Employment contracts
    'meeting-minutes-pro',         // Client meeting notes
    'email-sequence-creator',      // Candidate outreach
    'sop-documentation-builder',   // Recruitment procedures
    'competitive-battle-card',     // Market positioning
  ],

  engineering: [
    'technical-spec-writer',       // Engineering specifications
    'rfp-response-generator',      // Bid/proposal responses
    'sop-documentation-builder',   // Technical procedures
    'proposal-builder',            // Project proposals
    'compliance-audit-prep-assistant', // Regulatory compliance
    'excel-data-analyzer',         // Project analytics
    'meeting-minutes-pro',         // Project meetings
    'contract-review-accelerator', // Contract review
    'vendor-comparison-matrix',    // Supplier evaluation
  ],

  other: [
    'sales-call-prep-pro',         // Business development
    'proposal-builder',            // Business proposals
    'sop-documentation-builder',   // Process documentation
    'excel-data-analyzer',         // Data analysis
    'executive-communication-pack', // Leadership comms
    'automation-opportunity-assessment', // Process optimization
    'meeting-minutes-pro',         // Team meetings
    'customer-health-scorecard',   // Client tracking
    'employee-onboarding-planner', // New hire training
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

  legal: [
    'consulting-engagement',       // Client matter management
    'sales-account-pursuit',       // Business development
    'rfp-response-center',         // RFP/proposal management
  ],

  staffing: [
    'sales-account-pursuit',       // Client acquisition
    'customer-churn-prevention',   // Client retention
    'new-hire-onboarding',         // Recruiter training
  ],

  engineering: [
    'rfp-response-center',         // Bid/proposal management
    'project-initiation',          // Project kickoff
    'consulting-engagement',       // Client engagements
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
