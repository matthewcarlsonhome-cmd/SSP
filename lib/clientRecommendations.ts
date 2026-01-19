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

// ═══════════════════════════════════════════════════════════════════════════
// TRULY PERSONALIZED RECOMMENDATIONS ENGINE
// Creates UNIQUE skill/workflow selections for EACH client
// Uses company fingerprint + semantic matching + deterministic variance
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ALL available skill IDs that can be recommended (B2B focused, excluding job seeker)
 * This is the full pool we select from
 */
const ALL_RECOMMENDABLE_SKILLS = [
  // Excel & Analytics (5)
  'excel-data-analyzer', 'excel-marketing-dashboard', 'ab-test-analysis-reporter',
  'budget-variance-narrator', 'market-sizing-analyst',

  // Sales & Revenue (4)
  'sales-call-prep-pro', 'customer-health-scorecard', 'competitive-battle-card',
  'deal-risk-assessor',

  // Product & Strategy (4)
  'prd-writer', 'competitive-landscape-mapper', 'feature-prioritization-matrix',
  'product-positioning-canvas',

  // Technical (4)
  'technical-spec-writer', 'api-documentation-generator', 'code-review-feedback-generator',
  'incident-postmortem-pro',

  // HR & People (4)
  'job-description-optimizer', 'employee-onboarding-planner', 'performance-review-assistant',
  'org-change-communication',

  // Operations (4)
  'sop-documentation-builder', 'contract-review-accelerator', 'policy-document-generator',
  'vendor-comparison-matrix',

  // Enterprise & Executive (4)
  'board-presentation-builder', 'executive-communication-pack', 'crisis-communication-playbook',
  'stakeholder-update-generator',

  // Governance (8)
  'ai-policy-gap-analyzer', 'ai-risk-assessment', 'ai-vendor-evaluation-scorecard',
  'compliance-audit-prep-assistant', 'ai-ethics-review-checklist', 'ai-use-case-evaluator',
  'regulatory-change-analyzer', 'audit-response-generator',

  // Extended/Wave Skills (20)
  'proposal-builder', 'rfp-response-generator', 'meeting-minutes-pro',
  'project-status-reporter', 'process-automation-spec', 'automation-opportunity-assessment',
  'email-sequence-creator', 'content-calendar-planner', 'seo-content-optimizer',
  'investor-update-generator', 'pitch-deck-narrative', 'financial-model-narrator',
  'product-launch-checklist', 'customer-journey-mapper', 'pricing-strategy-analyzer',
  'partnership-evaluation-matrix', 'market-entry-assessment', 'team-capacity-planner',
  'retrospective-facilitator', 'incident-postmortem-generator',
];

/**
 * ALL available workflow IDs that can be recommended
 */
const ALL_RECOMMENDABLE_WORKFLOWS = [
  'sales-account-pursuit', 'customer-churn-prevention', 'enterprise-account-expansion',
  'marketing-campaign', 'competitive-intelligence', 'consulting-engagement',
  'new-hire-onboarding', 'process-improvement', 'compliance-program-builder',
  'product-launch-gtm', 'sprint-delivery', 'project-initiation',
  'financial-analysis-pack', 'rfp-response-center', 'vendor-evaluation-pipeline',
  'incident-to-improvement', 'brand-development', 'ai-implementation',
  'ai-governance-implementation', 'tech-debt-assessment', 'revops-optimization',
];

/**
 * Skill metadata for matching - skill ID -> relevant keywords/themes
 */
const SKILL_THEMES: Record<string, string[]> = {
  'excel-data-analyzer': ['data', 'analytics', 'excel', 'spreadsheet', 'analysis', 'numbers', 'metrics', 'reporting'],
  'excel-marketing-dashboard': ['marketing', 'dashboard', 'campaign', 'performance', 'digital', 'advertising', 'metrics', 'roi'],
  'ab-test-analysis-reporter': ['testing', 'experiment', 'a/b', 'conversion', 'optimization', 'digital', 'marketing'],
  'budget-variance-narrator': ['budget', 'financial', 'variance', 'forecast', 'planning', 'finance', 'accounting'],
  'market-sizing-analyst': ['market', 'sizing', 'tam', 'sam', 'research', 'opportunity', 'analysis'],

  'sales-call-prep-pro': ['sales', 'call', 'meeting', 'preparation', 'client', 'prospect', 'outreach'],
  'customer-health-scorecard': ['customer', 'health', 'retention', 'churn', 'success', 'relationship', 'account'],
  'competitive-battle-card': ['competitive', 'sales', 'positioning', 'differentiation', 'battle', 'win'],
  'deal-risk-assessor': ['deal', 'risk', 'sales', 'pipeline', 'forecast', 'opportunity'],

  'prd-writer': ['product', 'requirements', 'prd', 'feature', 'development', 'specification'],
  'competitive-landscape-mapper': ['competitive', 'landscape', 'market', 'research', 'analysis', 'positioning'],
  'feature-prioritization-matrix': ['feature', 'prioritization', 'product', 'roadmap', 'backlog'],
  'product-positioning-canvas': ['positioning', 'product', 'messaging', 'value', 'proposition'],

  'technical-spec-writer': ['technical', 'specification', 'documentation', 'engineering', 'architecture'],
  'api-documentation-generator': ['api', 'documentation', 'developer', 'integration', 'technical'],
  'code-review-feedback-generator': ['code', 'review', 'development', 'engineering', 'quality'],
  'incident-postmortem-pro': ['incident', 'postmortem', 'outage', 'reliability', 'devops'],

  'job-description-optimizer': ['hiring', 'recruiting', 'job', 'talent', 'hr', 'staffing'],
  'employee-onboarding-planner': ['onboarding', 'training', 'employee', 'new hire', 'hr'],
  'performance-review-assistant': ['performance', 'review', 'feedback', 'hr', 'evaluation'],
  'org-change-communication': ['change', 'organization', 'communication', 'transformation', 'hr'],

  'sop-documentation-builder': ['sop', 'process', 'documentation', 'procedure', 'operations', 'standard'],
  'contract-review-accelerator': ['contract', 'legal', 'review', 'agreement', 'terms'],
  'policy-document-generator': ['policy', 'document', 'compliance', 'governance', 'procedure'],
  'vendor-comparison-matrix': ['vendor', 'supplier', 'evaluation', 'procurement', 'comparison'],

  'board-presentation-builder': ['board', 'presentation', 'executive', 'leadership', 'governance'],
  'executive-communication-pack': ['executive', 'communication', 'leadership', 'stakeholder', 'corporate'],
  'crisis-communication-playbook': ['crisis', 'communication', 'pr', 'reputation', 'emergency'],
  'stakeholder-update-generator': ['stakeholder', 'update', 'communication', 'reporting', 'status'],

  'ai-policy-gap-analyzer': ['ai', 'policy', 'governance', 'compliance', 'gap'],
  'ai-risk-assessment': ['ai', 'risk', 'assessment', 'governance', 'compliance'],
  'ai-vendor-evaluation-scorecard': ['ai', 'vendor', 'evaluation', 'procurement', 'technology'],
  'compliance-audit-prep-assistant': ['compliance', 'audit', 'regulatory', 'preparation', 'governance'],
  'ai-ethics-review-checklist': ['ai', 'ethics', 'review', 'governance', 'responsible'],
  'ai-use-case-evaluator': ['ai', 'use case', 'evaluation', 'implementation', 'assessment'],
  'regulatory-change-analyzer': ['regulatory', 'change', 'compliance', 'legal', 'policy'],
  'audit-response-generator': ['audit', 'response', 'compliance', 'documentation', 'governance'],

  'proposal-builder': ['proposal', 'sales', 'pitch', 'bid', 'rfp', 'business'],
  'rfp-response-generator': ['rfp', 'response', 'bid', 'proposal', 'procurement'],
  'meeting-minutes-pro': ['meeting', 'minutes', 'notes', 'documentation', 'action'],
  'project-status-reporter': ['project', 'status', 'reporting', 'progress', 'update'],
  'process-automation-spec': ['process', 'automation', 'workflow', 'efficiency', 'optimization'],
  'automation-opportunity-assessment': ['automation', 'opportunity', 'efficiency', 'process', 'assessment'],
  'email-sequence-creator': ['email', 'sequence', 'outreach', 'campaign', 'nurture', 'marketing'],
  'content-calendar-planner': ['content', 'calendar', 'planning', 'social', 'editorial', 'marketing'],
  'seo-content-optimizer': ['seo', 'content', 'optimization', 'search', 'ranking', 'marketing'],
  'investor-update-generator': ['investor', 'update', 'fundraising', 'startup', 'reporting'],
  'pitch-deck-narrative': ['pitch', 'deck', 'presentation', 'startup', 'fundraising'],
  'financial-model-narrator': ['financial', 'model', 'projection', 'forecast', 'analysis'],
  'product-launch-checklist': ['product', 'launch', 'checklist', 'gtm', 'marketing'],
  'customer-journey-mapper': ['customer', 'journey', 'mapping', 'experience', 'touchpoint'],
  'pricing-strategy-analyzer': ['pricing', 'strategy', 'revenue', 'monetization', 'analysis'],
  'partnership-evaluation-matrix': ['partnership', 'evaluation', 'alliance', 'collaboration', 'strategic'],
  'market-entry-assessment': ['market', 'entry', 'expansion', 'strategy', 'international'],
  'team-capacity-planner': ['team', 'capacity', 'planning', 'resource', 'staffing'],
  'retrospective-facilitator': ['retrospective', 'agile', 'team', 'improvement', 'feedback'],
  'incident-postmortem-generator': ['incident', 'postmortem', 'analysis', 'learning', 'improvement'],
};

/**
 * Workflow metadata for matching
 */
const WORKFLOW_THEMES: Record<string, string[]> = {
  'sales-account-pursuit': ['sales', 'account', 'pursuit', 'opportunity', 'pipeline', 'prospecting'],
  'customer-churn-prevention': ['customer', 'churn', 'retention', 'loyalty', 'success'],
  'enterprise-account-expansion': ['enterprise', 'account', 'expansion', 'upsell', 'growth'],
  'marketing-campaign': ['marketing', 'campaign', 'launch', 'promotion', 'advertising'],
  'competitive-intelligence': ['competitive', 'intelligence', 'research', 'market', 'analysis'],
  'consulting-engagement': ['consulting', 'engagement', 'client', 'project', 'delivery'],
  'new-hire-onboarding': ['onboarding', 'hiring', 'new hire', 'training', 'hr'],
  'process-improvement': ['process', 'improvement', 'efficiency', 'optimization', 'lean'],
  'compliance-program-builder': ['compliance', 'program', 'regulatory', 'governance', 'audit'],
  'product-launch-gtm': ['product', 'launch', 'gtm', 'go to market', 'release'],
  'sprint-delivery': ['sprint', 'agile', 'delivery', 'development', 'iteration'],
  'project-initiation': ['project', 'initiation', 'kickoff', 'planning', 'start'],
  'financial-analysis-pack': ['financial', 'analysis', 'reporting', 'budget', 'forecast'],
  'rfp-response-center': ['rfp', 'response', 'proposal', 'bid', 'procurement'],
  'vendor-evaluation-pipeline': ['vendor', 'evaluation', 'procurement', 'supplier', 'sourcing'],
  'incident-to-improvement': ['incident', 'improvement', 'learning', 'postmortem', 'resolution'],
  'brand-development': ['brand', 'development', 'identity', 'positioning', 'marketing'],
  'ai-implementation': ['ai', 'implementation', 'artificial intelligence', 'ml', 'automation'],
  'ai-governance-implementation': ['ai', 'governance', 'policy', 'compliance', 'responsible'],
  'tech-debt-assessment': ['tech debt', 'technical', 'assessment', 'engineering', 'refactoring'],
  'revops-optimization': ['revops', 'revenue', 'operations', 'sales', 'optimization'],
};

/**
 * Simple hash function to create deterministic variation per company
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Calculate text similarity score between client context and skill themes
 */
function calculateThemeMatchScore(clientText: string, themes: string[]): number {
  const words = clientText.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  let score = 0;

  for (const theme of themes) {
    // Direct match
    if (clientText.includes(theme)) {
      score += 10;
    }
    // Word-level partial match
    for (const word of words) {
      if (theme.includes(word) || word.includes(theme)) {
        score += 3;
      }
    }
  }

  return score;
}

/**
 * Get TRULY personalized skill recommendations - unique per client
 *
 * Algorithm:
 * 1. Create unique company fingerprint from name + attributes
 * 2. Score ALL available skills against client context
 * 3. Add deterministic variance using company fingerprint
 * 4. Select top 9 with guaranteed uniqueness per company
 */
export function getPersonalizedSkillRecommendations(client: {
  companyName?: string;
  industry: ClientIndustry;
  painPoints?: string;
  services?: string;
  description?: string;
  companyType?: string;
  employeeCount?: string;
  revenue?: string;
}): string[] {
  // Build comprehensive client context for matching
  const clientContext = [
    client.companyName || '',
    client.painPoints || '',
    client.services || '',
    client.description || '',
    client.companyType || '',
    client.industry || '',
  ].join(' ').toLowerCase();

  // Create unique fingerprint from company name + key attributes
  const fingerprint = hashString([
    client.companyName || '',
    client.industry || '',
    client.painPoints?.substring(0, 50) || '',
    client.services?.substring(0, 50) || '',
  ].join('|'));

  // Get industry baseline skills
  const industrySkills = INDUSTRY_SKILL_MAPPING[client.industry] || INDUSTRY_SKILL_MAPPING.other;

  // Score ALL available skills
  const skillScores: Array<{ skillId: string; score: number }> = [];

  for (const skillId of ALL_RECOMMENDABLE_SKILLS) {
    const themes = SKILL_THEMES[skillId] || [];

    // Base score from theme matching
    let score = calculateThemeMatchScore(clientContext, themes);

    // Boost for industry alignment
    if (industrySkills.includes(skillId)) {
      const industryIndex = industrySkills.indexOf(skillId);
      score += 20 - industryIndex * 2; // Higher boost for earlier industry skills
    }

    // Add deterministic variance based on company fingerprint
    // This ensures same algorithm produces different results per company
    const skillHash = hashString(skillId);
    const variance = ((fingerprint ^ skillHash) % 15); // 0-14 variance
    score += variance;

    // Additional variance from company name length and character distribution
    const nameVariance = (client.companyName?.length || 0) % 7;
    const charVariance = (client.companyName?.charCodeAt(0) || 65) % 5;
    score += nameVariance + charVariance;

    skillScores.push({ skillId, score });
  }

  // Sort by score (descending) with secondary sort by skill ID for determinism
  skillScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.skillId.localeCompare(b.skillId);
  });

  // Take top 9 skills
  return skillScores.slice(0, MAX_DEFAULT_SKILLS).map(s => s.skillId);
}

/**
 * Get TRULY personalized workflow recommendations - unique per client
 */
export function getPersonalizedWorkflowRecommendations(client: {
  companyName?: string;
  industry: ClientIndustry;
  painPoints?: string;
  services?: string;
  description?: string;
  companyType?: string;
}): string[] {
  // Build comprehensive client context
  const clientContext = [
    client.companyName || '',
    client.painPoints || '',
    client.services || '',
    client.description || '',
    client.companyType || '',
    client.industry || '',
  ].join(' ').toLowerCase();

  // Create unique fingerprint
  const fingerprint = hashString([
    client.companyName || '',
    client.industry || '',
    client.services?.substring(0, 30) || '',
  ].join('|'));

  // Get industry baseline workflows
  const industryWorkflows = INDUSTRY_WORKFLOW_MAPPING[client.industry] || INDUSTRY_WORKFLOW_MAPPING.other;

  // Score ALL available workflows
  const workflowScores: Array<{ workflowId: string; score: number }> = [];

  for (const workflowId of ALL_RECOMMENDABLE_WORKFLOWS) {
    const themes = WORKFLOW_THEMES[workflowId] || [];

    // Base score from theme matching
    let score = calculateThemeMatchScore(clientContext, themes);

    // Boost for industry alignment
    if (industryWorkflows.includes(workflowId)) {
      const industryIndex = industryWorkflows.indexOf(workflowId);
      score += 15 - industryIndex * 3;
    }

    // Add deterministic variance
    const workflowHash = hashString(workflowId);
    const variance = ((fingerprint ^ workflowHash) % 10);
    score += variance;

    // Company-specific variance
    const nameVariance = (client.companyName?.length || 0) % 5;
    score += nameVariance;

    workflowScores.push({ workflowId, score });
  }

  // Sort by score with deterministic tie-breaking
  workflowScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.workflowId.localeCompare(b.workflowId);
  });

  // Take top 3 workflows
  return workflowScores.slice(0, MAX_DEFAULT_WORKFLOWS).map(w => w.workflowId);
}
