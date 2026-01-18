/**
 * clientRecommendations.ts - Auto-curated Skill & Workflow Recommendations
 *
 * Maps industries and company types to relevant skills and workflows
 * for B2B client outreach with curated selections.
 */

import type { ClientIndustry } from './storage/types';

// ═══════════════════════════════════════════════════════════════════════════
// SKILL RECOMMENDATIONS BY INDUSTRY
// ═══════════════════════════════════════════════════════════════════════════

export const INDUSTRY_SKILL_MAPPING: Record<ClientIndustry, string[]> = {
  insurance: [
    'sales-call-prep-pro',
    'proposal-builder',
    'customer-health-scorecard',
    'competitive-battle-card',
    'excel-data-analyzer',
    'excel-marketing-dashboard',
    'kpi-framework-designer',
    'ab-test-analysis-reporter',
    'ai-governance-readiness-assessment',
    'compliance-audit-prep-assistant',
    'policy-document-generator',
    'secure-ai-usage-playbook',
    'sop-documentation-builder',
    'contract-review-accelerator',
    'executive-communication-pack',
    'rfp-response-generator',
  ],

  financial_services: [
    'sales-call-prep-pro',
    'proposal-builder',
    'customer-health-scorecard',
    'competitive-battle-card',
    'excel-data-analyzer',
    'budget-variance-narrator',
    'kpi-framework-designer',
    'excel-marketing-dashboard',
    'ai-governance-readiness-assessment',
    'compliance-audit-prep-assistant',
    'ai-data-flow-risk-map',
    'policy-document-generator',
    'executive-communication-pack',
    'board-presentation-builder',
    'steering-committee-pack',
    'executive-decision-memo',
  ],

  healthcare: [
    'ai-governance-readiness-assessment',
    'compliance-audit-prep-assistant',
    'ai-data-flow-risk-map',
    'secure-ai-usage-playbook',
    'policy-document-generator',
    'sop-documentation-builder',
    'process-automation-spec',
    'change-request-doc-builder',
    'sales-call-prep-pro',
    'proposal-builder',
    'customer-health-scorecard',
    'executive-communication-pack',
    'crisis-communication-playbook',
    'job-description-optimizer',
    'employee-onboarding-planner',
  ],

  technology: [
    'technical-spec-writer',
    'api-documentation-generator',
    'code-review-feedback-generator',
    'sql-query-optimizer',
    'ai-governance-readiness-assessment',
    'ml-model-card-generator',
    'rag-system-design',
    'ai-ethics-review',
    'prd-writer',
    'market-sizing-analyst',
    'competitive-landscape-mapper',
    'okr-workshop-facilitator',
    'sales-call-prep-pro',
    'proposal-builder',
    'competitive-battle-card',
    'adr-writer',
    'incident-postmortem-pro',
  ],

  marketing_advertising: [
    'excel-marketing-dashboard',
    'ab-test-analysis-reporter',
    'kpi-framework-designer',
    'excel-data-analyzer',
    'sales-call-prep-pro',
    'proposal-builder',
    'customer-health-scorecard',
    'competitive-battle-card',
    'competitive-landscape-mapper',
    'market-sizing-analyst',
    'sop-documentation-builder',
    'meeting-minutes-pro',
    'vendor-comparison-matrix',
    'process-automation-spec',
    'executive-communication-pack',
    'all-hands-meeting-script',
    'prompt-engineering-optimizer',
    'automation-opportunity-assessment',
  ],

  professional_services: [
    'sales-call-prep-pro',
    'proposal-builder',
    'customer-health-scorecard',
    'rfp-response-generator',
    'excel-data-analyzer',
    'excel-marketing-dashboard',
    'kpi-framework-designer',
    'sop-documentation-builder',
    'meeting-minutes-pro',
    'contract-review-accelerator',
    'executive-communication-pack',
    'steering-committee-pack',
    'board-presentation-builder',
    'process-automation-spec',
    'automation-opportunity-assessment',
    'data-quality-assessment',
  ],

  retail: [
    'excel-marketing-dashboard',
    'ab-test-analysis-reporter',
    'excel-data-analyzer',
    'kpi-framework-designer',
    'sales-call-prep-pro',
    'proposal-builder',
    'customer-health-scorecard',
    'competitive-battle-card',
    'sop-documentation-builder',
    'vendor-comparison-matrix',
    'process-automation-spec',
    'market-sizing-analyst',
    'competitive-landscape-mapper',
    'executive-communication-pack',
    'crisis-communication-playbook',
  ],

  manufacturing: [
    'sop-documentation-builder',
    'process-automation-spec',
    'automation-opportunity-assessment',
    'change-request-doc-builder',
    'compliance-audit-prep-assistant',
    'policy-document-generator',
    'data-quality-assessment',
    'incident-postmortem-generator',
    'vendor-comparison-matrix',
    'contract-review-accelerator',
    'excel-data-analyzer',
    'kpi-framework-designer',
    'budget-variance-narrator',
    'executive-communication-pack',
    'steering-committee-pack',
  ],

  real_estate: [
    'sales-call-prep-pro',
    'proposal-builder',
    'customer-health-scorecard',
    'excel-marketing-dashboard',
    'market-sizing-analyst',
    'competitive-landscape-mapper',
    'contract-review-accelerator',
    'sop-documentation-builder',
    'meeting-minutes-pro',
    'excel-data-analyzer',
    'kpi-framework-designer',
    'executive-communication-pack',
  ],

  hospitality: [
    'sop-documentation-builder',
    'employee-onboarding-planner',
    'process-automation-spec',
    'excel-marketing-dashboard',
    'ab-test-analysis-reporter',
    'competitive-landscape-mapper',
    'job-description-optimizer',
    'performance-review-writer',
    'customer-health-scorecard',
    'crisis-communication-playbook',
    'excel-data-analyzer',
    'kpi-framework-designer',
  ],

  education: [
    'job-description-optimizer',
    'employee-onboarding-planner',
    'performance-review-writer',
    'sop-documentation-builder',
    'policy-document-generator',
    'meeting-minutes-pro',
    'excel-data-analyzer',
    'kpi-framework-designer',
    'executive-communication-pack',
    'all-hands-meeting-script',
    'process-automation-spec',
    'data-quality-assessment',
  ],

  nonprofit: [
    'sales-call-prep-pro',
    'proposal-builder',
    'customer-health-scorecard',
    'sop-documentation-builder',
    'policy-document-generator',
    'meeting-minutes-pro',
    'excel-data-analyzer',
    'kpi-framework-designer',
    'budget-variance-narrator',
    'executive-communication-pack',
    'board-presentation-builder',
    'all-hands-meeting-script',
    'job-description-optimizer',
    'employee-onboarding-planner',
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL INDUSTRIES FOR MADISON-AREA BUSINESSES
  // ═══════════════════════════════════════════════════════════════════════════

  construction: [
    // Project Management
    'sop-documentation-builder',
    'meeting-minutes-pro',
    'process-automation-spec',
    // Safety & Compliance
    'compliance-audit-prep-assistant',
    'policy-document-generator',
    'incident-postmortem-generator',
    'change-request-doc-builder',
    // Vendor & Contract Management
    'vendor-comparison-matrix',
    'contract-review-accelerator',
    'rfp-response-generator',
    // Analytics & Reporting
    'excel-data-analyzer',
    'kpi-framework-designer',
    'budget-variance-narrator',
    // Communication
    'executive-communication-pack',
    'steering-committee-pack',
  ],

  automotive: [
    // Sales & Customer Management
    'sales-call-prep-pro',
    'proposal-builder',
    'customer-health-scorecard',
    'competitive-battle-card',
    // Operations
    'sop-documentation-builder',
    'process-automation-spec',
    'vendor-comparison-matrix',
    // Marketing & Analytics
    'excel-marketing-dashboard',
    'excel-data-analyzer',
    'kpi-framework-designer',
    'competitive-landscape-mapper',
    // HR & Training
    'job-description-optimizer',
    'employee-onboarding-planner',
    'performance-review-writer',
    // Communication
    'executive-communication-pack',
  ],

  food_beverage: [
    // Operations & Compliance
    'sop-documentation-builder',
    'compliance-audit-prep-assistant',
    'policy-document-generator',
    'process-automation-spec',
    // HR & Training
    'job-description-optimizer',
    'employee-onboarding-planner',
    'performance-review-writer',
    // Marketing & Analytics
    'excel-marketing-dashboard',
    'ab-test-analysis-reporter',
    'competitive-landscape-mapper',
    'excel-data-analyzer',
    'kpi-framework-designer',
    // Customer & Crisis Management
    'customer-health-scorecard',
    'crisis-communication-playbook',
    // Vendor Management
    'vendor-comparison-matrix',
  ],

  utilities: [
    // Compliance & Governance
    'compliance-audit-prep-assistant',
    'policy-document-generator',
    'ai-governance-readiness-assessment',
    'secure-ai-usage-playbook',
    // Operations & Safety
    'sop-documentation-builder',
    'incident-postmortem-generator',
    'change-request-doc-builder',
    'process-automation-spec',
    // Analytics & Reporting
    'excel-data-analyzer',
    'kpi-framework-designer',
    'budget-variance-narrator',
    // Communication
    'executive-communication-pack',
    'steering-committee-pack',
    'crisis-communication-playbook',
    // Vendor Management
    'vendor-comparison-matrix',
    'contract-review-accelerator',
  ],

  biotechnology: [
    // R&D & Technical Documentation
    'technical-spec-writer',
    'api-documentation-generator',
    'prd-writer',
    'data-quality-assessment',
    // Compliance & Governance
    'ai-governance-readiness-assessment',
    'compliance-audit-prep-assistant',
    'ai-data-flow-risk-map',
    'policy-document-generator',
    // Operations
    'sop-documentation-builder',
    'process-automation-spec',
    'change-request-doc-builder',
    // Sales & Market
    'sales-call-prep-pro',
    'proposal-builder',
    'competitive-landscape-mapper',
    'market-sizing-analyst',
    // Communication
    'executive-communication-pack',
    'board-presentation-builder',
  ],

  other: [
    'sales-call-prep-pro',
    'proposal-builder',
    'customer-health-scorecard',
    'executive-communication-pack',
    'sop-documentation-builder',
    'meeting-minutes-pro',
    'excel-data-analyzer',
    'kpi-framework-designer',
    'process-automation-spec',
    'automation-opportunity-assessment',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW RECOMMENDATIONS BY INDUSTRY
// ═══════════════════════════════════════════════════════════════════════════

export const INDUSTRY_WORKFLOW_MAPPING: Record<ClientIndustry, string[]> = {
  insurance: [
    'sales-account-pursuit',
    'rfp-response-center',
    'marketing-campaign',
    'financial-analysis-pack',
    'program-governance-pack',
    'compliance-program-builder',
    'customer-churn-prevention',
    'ai-governance-implementation',
  ],

  financial_services: [
    'financial-analysis-pack',
    'sales-account-pursuit',
    'rfp-response-center',
    'compliance-program-builder',
    'ai-governance-implementation',
    'program-governance-pack',
    'quarterly-business-review',
    'customer-churn-prevention',
  ],

  healthcare: [
    'compliance-program-builder',
    'ai-governance-implementation',
    'ai-data-protection-assessment',
    'incident-to-improvement',
    'sales-account-pursuit',
    'process-improvement',
    'new-hire-onboarding',
  ],

  technology: [
    'ai-implementation',
    'tech-debt-assessment',
    'automation-discovery-workflow',
    'sprint-delivery',
    'sales-account-pursuit',
    'product-launch-gtm',
    'startup-investor-pitch',
    'competitive-intelligence',
  ],

  marketing_advertising: [
    'marketing-campaign',
    'marketing-campaign-launch',
    'marketing-analytics-dashboard',
    'digital-marketing-audit',
    'seo-client-onboarding',
    'consulting-engagement',
    'sales-account-pursuit',
    'product-launch-gtm',
    'influencer-campaign',
    'competitive-intelligence',
  ],

  professional_services: [
    'consulting-engagement',
    'sales-account-pursuit',
    'rfp-response-center',
    'project-initiation',
    'business-case-development',
    'requirements-gathering',
    'enterprise-account-expansion',
    'quarterly-business-review',
  ],

  retail: [
    'marketing-campaign',
    'marketing-analytics-dashboard',
    'digital-marketing-audit',
    'customer-churn-prevention',
    'sales-account-pursuit',
    'process-improvement',
    'vendor-evaluation-pipeline',
  ],

  manufacturing: [
    'process-improvement',
    'automation-discovery-workflow',
    'incident-to-improvement',
    'vendor-evaluation-pipeline',
    'project-initiation',
    'compliance-program-builder',
    'quarterly-business-review',
  ],

  real_estate: [
    'sales-account-pursuit',
    'marketing-campaign',
    'digital-marketing-audit',
    'contract-review-workflow',
    'customer-churn-prevention',
    'consulting-engagement',
  ],

  hospitality: [
    'marketing-campaign',
    'digital-marketing-audit',
    'new-hire-onboarding',
    'customer-churn-prevention',
    'process-improvement',
    'marketing-analytics-dashboard',
  ],

  education: [
    'training-workshop',
    'new-hire-onboarding',
    'process-improvement',
    'project-initiation',
    'requirements-gathering',
    'business-case-development',
  ],

  nonprofit: [
    'sales-account-pursuit',
    'marketing-campaign',
    'consulting-engagement',
    'business-case-development',
    'project-initiation',
    'financial-analysis-pack',
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL INDUSTRIES FOR MADISON-AREA BUSINESSES
  // ═══════════════════════════════════════════════════════════════════════════

  construction: [
    'project-initiation',
    'vendor-evaluation-pipeline',
    'process-improvement',
    'incident-to-improvement',
    'compliance-program-builder',
    'quarterly-business-review',
    'rfp-response-center',
  ],

  automotive: [
    'sales-account-pursuit',
    'customer-churn-prevention',
    'marketing-campaign',
    'digital-marketing-audit',
    'new-hire-onboarding',
    'process-improvement',
    'competitive-intelligence',
  ],

  food_beverage: [
    'new-hire-onboarding',
    'process-improvement',
    'marketing-campaign',
    'digital-marketing-audit',
    'customer-churn-prevention',
    'marketing-analytics-dashboard',
    'vendor-evaluation-pipeline',
    'compliance-program-builder',
  ],

  utilities: [
    'compliance-program-builder',
    'ai-governance-implementation',
    'incident-to-improvement',
    'process-improvement',
    'project-initiation',
    'quarterly-business-review',
    'vendor-evaluation-pipeline',
  ],

  biotechnology: [
    'ai-implementation',
    'compliance-program-builder',
    'ai-governance-implementation',
    'ai-data-protection-assessment',
    'sales-account-pursuit',
    'product-launch-gtm',
    'project-initiation',
    'quarterly-business-review',
  ],

  other: [
    'sales-account-pursuit',
    'marketing-campaign',
    'consulting-engagement',
    'process-improvement',
    'project-initiation',
    'automation-discovery-workflow',
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
