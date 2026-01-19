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
// PERSONALIZED RECOMMENDATIONS ENGINE
// Goes beyond industry-only matching to consider client-specific attributes
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Keyword -> Skill mappings for pain points, services, and descriptions
 */
const KEYWORD_SKILL_MAPPING: Record<string, string[]> = {
  // Marketing & Analytics Keywords
  'performance tracking': ['excel-marketing-dashboard', 'ab-test-analysis-reporter'],
  'analytics': ['excel-data-analyzer', 'excel-marketing-dashboard', 'ab-test-analysis-reporter'],
  'reporting': ['excel-data-analyzer', 'budget-variance-narrator', 'board-presentation-builder'],
  'dashboard': ['excel-marketing-dashboard', 'excel-data-analyzer'],
  'a/b test': ['ab-test-analysis-reporter'],
  'campaign': ['excel-marketing-dashboard', 'ab-test-analysis-reporter'],
  'multi-channel': ['excel-marketing-dashboard', 'ab-test-analysis-reporter'],
  'digital': ['excel-marketing-dashboard', 'ab-test-analysis-reporter'],
  'seo': ['seo-content-optimizer', 'competitive-landscape-mapper'],
  'content': ['seo-content-optimizer', 'content-calendar-planner'],
  'social media': ['content-calendar-planner', 'excel-marketing-dashboard'],
  'email': ['email-sequence-creator', 'ab-test-analysis-reporter'],
  'ppc': ['excel-marketing-dashboard', 'ab-test-analysis-reporter'],
  'paid media': ['excel-marketing-dashboard', 'ab-test-analysis-reporter'],

  // Sales & Business Development Keywords
  'sales': ['sales-call-prep-pro', 'competitive-battle-card', 'customer-health-scorecard'],
  'client retention': ['customer-health-scorecard', 'email-sequence-creator'],
  'client management': ['customer-health-scorecard', 'meeting-minutes-pro'],
  'proposal': ['proposal-builder', 'rfp-response-generator'],
  'rfp': ['rfp-response-generator', 'proposal-builder'],
  'bid': ['rfp-response-generator', 'proposal-builder'],
  'pitch': ['proposal-builder', 'board-presentation-builder'],
  'presentation': ['board-presentation-builder', 'executive-communication-pack'],

  // Operations & Process Keywords
  'workflow': ['process-automation-spec', 'automation-opportunity-assessment', 'sop-documentation-builder'],
  'automation': ['automation-opportunity-assessment', 'process-automation-spec'],
  'process': ['sop-documentation-builder', 'process-automation-spec', 'automation-opportunity-assessment'],
  'efficiency': ['automation-opportunity-assessment', 'process-automation-spec'],
  'operations': ['sop-documentation-builder', 'process-automation-spec'],
  'sop': ['sop-documentation-builder'],
  'documentation': ['sop-documentation-builder', 'meeting-minutes-pro'],
  'approval': ['process-automation-spec', 'automation-opportunity-assessment'],

  // Compliance & Legal Keywords
  'compliance': ['compliance-audit-prep-assistant', 'policy-document-generator'],
  'regulatory': ['compliance-audit-prep-assistant', 'policy-document-generator'],
  'audit': ['compliance-audit-prep-assistant'],
  'contract': ['contract-review-accelerator'],
  'legal': ['contract-review-accelerator', 'policy-document-generator'],
  'policy': ['policy-document-generator', 'compliance-audit-prep-assistant'],
  'hipaa': ['compliance-audit-prep-assistant', 'policy-document-generator'],
  'gdpr': ['compliance-audit-prep-assistant', 'policy-document-generator'],

  // HR & People Keywords
  'hiring': ['job-description-optimizer', 'employee-onboarding-planner'],
  'onboarding': ['employee-onboarding-planner'],
  'training': ['employee-onboarding-planner', 'sop-documentation-builder'],
  'recruiting': ['job-description-optimizer', 'email-sequence-creator'],
  'hr': ['job-description-optimizer', 'employee-onboarding-planner', 'policy-document-generator'],

  // Technical Keywords
  'api': ['api-documentation-generator', 'technical-spec-writer'],
  'technical': ['technical-spec-writer', 'api-documentation-generator'],
  'development': ['technical-spec-writer', 'prd-writer', 'code-review-feedback-generator'],
  'product': ['prd-writer', 'competitive-landscape-mapper'],
  'software': ['technical-spec-writer', 'prd-writer', 'incident-postmortem-pro'],
  'incident': ['incident-postmortem-pro', 'incident-postmortem-generator', 'crisis-communication-playbook'],
  'code': ['code-review-feedback-generator'],

  // Finance Keywords
  'budget': ['budget-variance-narrator', 'excel-data-analyzer'],
  'financial': ['excel-data-analyzer', 'budget-variance-narrator', 'board-presentation-builder'],
  'forecast': ['excel-data-analyzer', 'budget-variance-narrator'],
  'revenue': ['excel-data-analyzer', 'customer-health-scorecard'],

  // Strategy & Research Keywords
  'competitive': ['competitive-landscape-mapper', 'competitive-battle-card'],
  'market research': ['competitive-landscape-mapper', 'market-sizing-analyst'],
  'market analysis': ['market-sizing-analyst', 'competitive-landscape-mapper'],
  'strategy': ['competitive-landscape-mapper', 'board-presentation-builder'],
  'positioning': ['competitive-battle-card', 'competitive-landscape-mapper'],

  // Communication Keywords
  'communication': ['executive-communication-pack', 'email-sequence-creator'],
  'executive': ['executive-communication-pack', 'board-presentation-builder'],
  'board': ['board-presentation-builder', 'executive-communication-pack'],
  'stakeholder': ['executive-communication-pack', 'meeting-minutes-pro'],
  'meeting': ['meeting-minutes-pro', 'sales-call-prep-pro'],

  // Vendor & Supplier Keywords
  'vendor': ['vendor-comparison-matrix'],
  'supplier': ['vendor-comparison-matrix'],
  'procurement': ['vendor-comparison-matrix', 'contract-review-accelerator'],
};

/**
 * Keyword -> Workflow mappings
 */
const KEYWORD_WORKFLOW_MAPPING: Record<string, string[]> = {
  // Marketing Workflows
  'campaign': ['marketing-campaign', 'marketing-campaign-launch'],
  'marketing': ['marketing-campaign', 'marketing-campaign-launch', 'digital-marketing-audit'],
  'launch': ['product-launch-gtm', 'marketing-campaign-launch'],
  'brand': ['brand-development'],
  'content': ['marketing-campaign'],

  // Sales Workflows
  'sales': ['sales-account-pursuit', 'enterprise-account-expansion'],
  'account': ['sales-account-pursuit', 'enterprise-account-expansion'],
  'pursuit': ['sales-account-pursuit'],
  'enterprise': ['enterprise-account-expansion'],
  'churn': ['customer-churn-prevention'],
  'retention': ['customer-churn-prevention'],

  // Operations Workflows
  'process improvement': ['process-improvement'],
  'efficiency': ['process-improvement', 'revops-optimization'],
  'operations': ['process-improvement', 'revops-optimization'],
  'onboarding': ['new-hire-onboarding'],
  'hiring': ['new-hire-onboarding'],

  // Compliance Workflows
  'compliance': ['compliance-program-builder', 'ai-governance-implementation'],
  'regulatory': ['compliance-program-builder'],
  'governance': ['ai-governance-implementation', 'program-governance-pack'],

  // Project Workflows
  'project': ['project-initiation', 'sprint-delivery'],
  'agile': ['sprint-delivery'],
  'sprint': ['sprint-delivery'],

  // Analysis Workflows
  'competitive': ['competitive-intelligence'],
  'market': ['competitive-intelligence', 'marketing-analytics-dashboard'],
  'analysis': ['competitive-intelligence', 'financial-analysis-pack'],
  'financial': ['financial-analysis-pack'],

  // Consulting Workflows
  'consulting': ['consulting-engagement'],
  'engagement': ['consulting-engagement'],
  'rfp': ['rfp-response-center'],
  'proposal': ['rfp-response-center'],

  // Technical Workflows
  'tech debt': ['tech-debt-assessment'],
  'technical': ['tech-debt-assessment'],
  'ai': ['ai-implementation', 'ai-governance-implementation'],
  'implementation': ['ai-implementation'],
};

/**
 * Company size modifiers - enterprise vs SMB needs different skills
 */
const ENTERPRISE_SKILLS = [
  'board-presentation-builder',
  'executive-communication-pack',
  'compliance-audit-prep-assistant',
  'program-governance-pack',
  'budget-variance-narrator',
];

const SMB_SKILLS = [
  'sales-call-prep-pro',
  'proposal-builder',
  'automation-opportunity-assessment',
  'email-sequence-creator',
];

/**
 * Parse employee count string to determine company size category
 */
function getCompanySize(employeeCount?: string): 'enterprise' | 'mid-market' | 'smb' | 'unknown' {
  if (!employeeCount) return 'unknown';

  const normalized = employeeCount.toLowerCase().replace(/[,\s]/g, '');

  // Extract numbers
  const match = normalized.match(/(\d+)/);
  if (!match) return 'unknown';

  const count = parseInt(match[1], 10);

  if (count >= 1000 || normalized.includes('1000+') || normalized.includes('5000+')) {
    return 'enterprise';
  } else if (count >= 100 || normalized.includes('100-') || normalized.includes('500')) {
    return 'mid-market';
  } else {
    return 'smb';
  }
}

/**
 * Extract keywords from client text fields
 */
function extractKeywords(text: string): string[] {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[,;.!?()]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

/**
 * Get personalized skill recommendations based on ALL client attributes
 * This is the NEW intelligent recommendation function
 */
export function getPersonalizedSkillRecommendations(client: {
  industry: ClientIndustry;
  painPoints?: string;
  services?: string;
  description?: string;
  companyType?: string;
  employeeCount?: string;
  revenue?: string;
}): string[] {
  // Start with industry baseline (first 5 skills only - leave room for personalization)
  const industrySkills = INDUSTRY_SKILL_MAPPING[client.industry] || INDUSTRY_SKILL_MAPPING.other;
  const baseSkills = new Set<string>(industrySkills.slice(0, 5));

  // Combine all text for keyword extraction
  const allText = [
    client.painPoints || '',
    client.services || '',
    client.description || '',
    client.companyType || '',
  ].join(' ').toLowerCase();

  // Score skills based on keyword matches
  const skillScores = new Map<string, number>();

  // Initialize with industry skills having base score
  industrySkills.forEach((skill, index) => {
    skillScores.set(skill, 10 - index); // Higher score for earlier industry skills
  });

  // Add scores based on keyword matches
  for (const [keyword, skills] of Object.entries(KEYWORD_SKILL_MAPPING)) {
    if (allText.includes(keyword)) {
      skills.forEach(skill => {
        const currentScore = skillScores.get(skill) || 0;
        skillScores.set(skill, currentScore + 5); // Boost matched skills
      });
    }
  }

  // Add company size modifiers
  const companySize = getCompanySize(client.employeeCount);
  if (companySize === 'enterprise') {
    ENTERPRISE_SKILLS.forEach(skill => {
      const currentScore = skillScores.get(skill) || 0;
      skillScores.set(skill, currentScore + 3);
    });
  } else if (companySize === 'smb') {
    SMB_SKILLS.forEach(skill => {
      const currentScore = skillScores.get(skill) || 0;
      skillScores.set(skill, currentScore + 3);
    });
  }

  // Sort by score and take top 9
  const sortedSkills = Array.from(skillScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([skill]) => skill)
    .slice(0, MAX_DEFAULT_SKILLS);

  return sortedSkills;
}

/**
 * Get personalized workflow recommendations based on ALL client attributes
 */
export function getPersonalizedWorkflowRecommendations(client: {
  industry: ClientIndustry;
  painPoints?: string;
  services?: string;
  description?: string;
  companyType?: string;
}): string[] {
  // Start with industry baseline (first 1-2 workflows)
  const industryWorkflows = INDUSTRY_WORKFLOW_MAPPING[client.industry] || INDUSTRY_WORKFLOW_MAPPING.other;

  // Combine all text for keyword extraction
  const allText = [
    client.painPoints || '',
    client.services || '',
    client.description || '',
    client.companyType || '',
  ].join(' ').toLowerCase();

  // Score workflows based on keyword matches
  const workflowScores = new Map<string, number>();

  // Initialize with industry workflows having base score
  industryWorkflows.forEach((workflow, index) => {
    workflowScores.set(workflow, 10 - index);
  });

  // Add scores based on keyword matches
  for (const [keyword, workflows] of Object.entries(KEYWORD_WORKFLOW_MAPPING)) {
    if (allText.includes(keyword)) {
      workflows.forEach(workflow => {
        const currentScore = workflowScores.get(workflow) || 0;
        workflowScores.set(workflow, currentScore + 5);
      });
    }
  }

  // Sort by score and take top 3
  const sortedWorkflows = Array.from(workflowScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([workflow]) => workflow)
    .slice(0, MAX_DEFAULT_WORKFLOWS);

  return sortedWorkflows;
}
