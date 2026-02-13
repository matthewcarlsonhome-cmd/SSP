/**
 * CPA / Accounting Workflows
 *
 * 5 production-ready workflows for CPA firms and accounting practices:
 * 1. New Client Onboarding Package - Complete onboarding from engagement letter to service timeline
 * 2. Tax Season Preparation Pipeline - Master assignment plan with compliance tracking
 * 3. Audit Engagement Workflow - Engagement letter through risk assessment and testing procedures
 * 4. Monthly Client Advisory Package - Financial analysis with advisory recommendations
 * 5. Practice Development Proposal Builder - Prospect analysis to engagement letter
 *
 * SKILLS REFERENCED:
 * - engagement-letter-generator
 * - year-end-close-checklist-generator
 * - client-financial-health-summary
 * - tax-season-workflow-optimizer
 * - 1099-w2-compliance-tracker
 * - audit-workpaper-reviewer
 */

import type { Workflow } from '../storage/types';

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 1: NEW CLIENT ONBOARDING PACKAGE
// Engagement letter → Document checklist → Financial assessment → Service timeline
// ═══════════════════════════════════════════════════════════════════════════

const NEW_CLIENT_ONBOARDING_WORKFLOW: Workflow = {
  id: 'new-client-onboarding',
  name: 'New Client Onboarding Package',
  description: 'Generate a complete onboarding package for new accounting clients in one workflow',
  longDescription: 'This workflow creates everything you need to onboard a new accounting client. It generates a customized engagement letter based on entity type and services requested, builds a document request checklist tailored to their situation, produces an initial financial health assessment from available data, and creates a service timeline with key milestones. Perfect for streamlining the intake process at CPA firms of any size.',
  icon: 'UserPlus',
  color: 'emerald',
  estimatedTime: '12-18 minutes',

  outputs: [
    'Customized Engagement Letter',
    'Document Request Checklist',
    'Initial Financial Assessment',
    'Service Timeline & Milestones',
  ],

  globalInputs: [
    {
      id: 'clientName',
      label: 'Client Name',
      type: 'text',
      placeholder: 'e.g., Acme Manufacturing LLC',
      required: true,
    },
    {
      id: 'entityType',
      label: 'Entity Type',
      type: 'select',
      options: ['Individual', 'S-Corp', 'C-Corp', 'Partnership', 'LLC', 'Non-Profit'],
      required: true,
    },
    {
      id: 'industry',
      label: 'Industry',
      type: 'text',
      placeholder: 'e.g., Manufacturing, Real Estate, Healthcare',
      required: false,
    },
    {
      id: 'servicesRequested',
      label: 'Services Requested',
      type: 'textarea',
      placeholder: 'What services does the client need? (e.g., tax preparation, bookkeeping, payroll, advisory, audit...)',
      helpText: 'Be specific about the scope of services to generate an accurate engagement letter.',
      required: true,
      rows: 4,
    },
    {
      id: 'financialOverview',
      label: 'Financial Overview',
      type: 'textarea',
      placeholder: 'Known financial information, revenue range, complexity level, number of entities...',
      helpText: 'Include any available financial data to generate a meaningful initial assessment.',
      required: true,
      rows: 5,
    },
    {
      id: 'specialCircumstances',
      label: 'Special Circumstances (Optional)',
      type: 'textarea',
      placeholder: 'Any special situations: multi-state filings, international operations, prior year amendments, IRS notices, etc.',
      required: false,
      rows: 3,
    },
  ],

  steps: [
    {
      id: 'step-engagement-letter',
      skillId: 'engagement-letter-generator',
      name: 'Generate Engagement Letter',
      description: 'Create a customized engagement letter based on client entity type and requested services',
      inputMappings: {
        clientName: { type: 'global', inputId: 'clientName' },
        entityType: { type: 'global', inputId: 'entityType' },
        servicesRequested: { type: 'global', inputId: 'servicesRequested' },
        industry: { type: 'global', inputId: 'industry' },
        specialCircumstances: { type: 'global', inputId: 'specialCircumstances' },
      },
      outputKey: 'engagementLetter',
    },
    {
      id: 'step-document-checklist',
      skillId: 'year-end-close-checklist-generator',
      name: 'Generate Document Request Checklist',
      description: 'Build a document request checklist customized to the entity type and services',
      inputMappings: {
        entityType: { type: 'global', inputId: 'entityType' },
        clientName: { type: 'global', inputId: 'clientName' },
        industry: { type: 'global', inputId: 'industry' },
        servicesScope: { type: 'global', inputId: 'servicesRequested' },
        specialCircumstances: { type: 'global', inputId: 'specialCircumstances' },
        checklistType: { type: 'static', value: 'New Client Document Request' },
      },
      outputKey: 'documentChecklist',
    },
    {
      id: 'step-initial-assessment',
      skillId: 'client-financial-health-summary',
      name: 'Create Initial Financial Assessment',
      description: 'Generate an initial financial overview and health assessment from available data',
      inputMappings: {
        clientName: { type: 'global', inputId: 'clientName' },
        entityType: { type: 'global', inputId: 'entityType' },
        financialData: { type: 'global', inputId: 'financialOverview' },
        industry: { type: 'global', inputId: 'industry' },
        specialCircumstances: { type: 'global', inputId: 'specialCircumstances' },
        analysisType: { type: 'static', value: 'Initial Client Assessment' },
      },
      outputKey: 'initialAssessment',
    },
    {
      id: 'step-service-timeline',
      skillId: 'tax-season-workflow-optimizer',
      name: 'Create Service Timeline',
      description: 'Build an initial service timeline with key milestones and deadlines',
      inputMappings: {
        clientName: { type: 'global', inputId: 'clientName' },
        entityType: { type: 'global', inputId: 'entityType' },
        servicesRequested: { type: 'global', inputId: 'servicesRequested' },
        financialOverview: { type: 'previous', stepId: 'step-initial-assessment', outputKey: 'initialAssessment' },
        specialCircumstances: { type: 'global', inputId: 'specialCircumstances' },
        planningMode: { type: 'static', value: 'New Client Service Timeline' },
      },
      outputKey: 'serviceTimeline',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 2: TAX SEASON PREPARATION PIPELINE
// Master assignment plan → Information return compliance → Year-end close checklists
// ═══════════════════════════════════════════════════════════════════════════

const TAX_SEASON_PREP_WORKFLOW: Workflow = {
  id: 'tax-season-prep-pipeline',
  name: 'Tax Season Preparation Pipeline',
  description: 'Build a comprehensive tax season plan with staff assignments, compliance tracking, and close checklists',
  longDescription: 'This workflow prepares your firm for tax season from top to bottom. It creates a master staff assignment plan based on your team capacity and return volume, runs an information return compliance check for 1099/W-2 obligations, and generates year-end closing checklists organized by entity type. Designed for firm managers and partners who need to orchestrate a smooth, efficient tax season.',
  icon: 'Calendar',
  color: 'blue',
  estimatedTime: '15-20 minutes',

  outputs: [
    'Master Staff Assignment Plan',
    'Information Return Compliance Matrix',
    'Year-End Close Checklists by Entity Type',
  ],

  globalInputs: [
    {
      id: 'firmSize',
      label: 'Firm Size',
      type: 'select',
      options: ['Solo', '2-5', '6-15', '16-30', '31+'],
      required: true,
    },
    {
      id: 'staffRoster',
      label: 'Staff Roster',
      type: 'textarea',
      placeholder: 'List staff names and experience levels (e.g., Jane Smith - Senior Manager, 10 yrs; Mike Jones - Staff Accountant, 2 yrs...)',
      helpText: 'Include names, titles, years of experience, and any specializations.',
      required: true,
      rows: 6,
    },
    {
      id: 'returnVolume',
      label: 'Expected Return Volume',
      type: 'textarea',
      placeholder: 'Expected returns by type (e.g., 200 individual 1040s, 50 S-Corp 1120S, 30 partnerships 1065, 20 C-Corp 1120...)',
      helpText: 'Break down by return type for optimal staff assignment.',
      required: true,
      rows: 5,
    },
    {
      id: 'priorYearData',
      label: 'Prior Year Data',
      type: 'textarea',
      placeholder: 'Prior year issues, late filings, problem clients, bottlenecks, lessons learned...',
      helpText: 'Help the optimizer learn from past tax seasons.',
      required: false,
      rows: 4,
    },
    {
      id: 'clientPortfolio',
      label: 'Client Portfolio Description',
      type: 'textarea',
      placeholder: 'Description of your client base (industries, complexity mix, high-value clients, recurring vs. new...)',
      required: false,
      rows: 4,
    },
    {
      id: 'targetDates',
      label: 'Key Filing Deadlines & Extension Plans',
      type: 'textarea',
      placeholder: 'Key deadlines, extension strategy, internal review dates, e-filing targets...',
      helpText: 'Include both standard deadlines and your firm-specific milestones.',
      required: false,
      rows: 4,
    },
  ],

  steps: [
    {
      id: 'step-master-plan',
      skillId: 'tax-season-workflow-optimizer',
      name: 'Create Master Staff Assignment Plan',
      description: 'Generate a comprehensive staff assignment plan based on team capacity and return volume',
      inputMappings: {
        firmSize: { type: 'global', inputId: 'firmSize' },
        staffRoster: { type: 'global', inputId: 'staffRoster' },
        returnVolume: { type: 'global', inputId: 'returnVolume' },
        priorYearData: { type: 'global', inputId: 'priorYearData' },
        clientPortfolio: { type: 'global', inputId: 'clientPortfolio' },
        targetDates: { type: 'global', inputId: 'targetDates' },
        planningMode: { type: 'static', value: 'Tax Season Master Plan' },
      },
      outputKey: 'masterPlan',
    },
    {
      id: 'step-compliance-status',
      skillId: '1099-w2-compliance-tracker',
      name: 'Run Information Return Compliance Check',
      description: 'Assess 1099/W-2 information return compliance status across the client portfolio',
      inputMappings: {
        clientPortfolio: { type: 'global', inputId: 'clientPortfolio' },
        returnVolume: { type: 'global', inputId: 'returnVolume' },
        priorYearData: { type: 'global', inputId: 'priorYearData' },
        targetDates: { type: 'global', inputId: 'targetDates' },
        masterPlan: { type: 'previous', stepId: 'step-master-plan', outputKey: 'masterPlan' },
      },
      outputKey: 'complianceStatus',
    },
    {
      id: 'step-close-checklists',
      skillId: 'year-end-close-checklist-generator',
      name: 'Generate Year-End Close Checklists',
      description: 'Create closing checklists organized by entity type for systematic year-end processing',
      inputMappings: {
        returnVolume: { type: 'global', inputId: 'returnVolume' },
        clientPortfolio: { type: 'global', inputId: 'clientPortfolio' },
        priorYearData: { type: 'global', inputId: 'priorYearData' },
        complianceFindings: { type: 'previous', stepId: 'step-compliance-status', outputKey: 'complianceStatus' },
        checklistType: { type: 'static', value: 'Year-End Close by Entity Type' },
      },
      outputKey: 'closeChecklists',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 3: AUDIT ENGAGEMENT WORKFLOW
// Engagement letter → Risk assessment → Testing procedure templates
// ═══════════════════════════════════════════════════════════════════════════

const AUDIT_ENGAGEMENT_WORKFLOW: Workflow = {
  id: 'audit-engagement-workflow',
  name: 'Audit Engagement Workflow',
  description: 'Create a complete audit engagement package from engagement letter through testing procedures',
  longDescription: 'This workflow streamlines the audit engagement setup process. It generates a professional engagement letter tailored to the engagement type and applicable standards, creates a risk assessment and planning memo framework based on entity details and prior findings, and builds testing procedure documentation templates for fieldwork. Ideal for audit managers and partners initiating new assurance engagements.',
  icon: 'FileSearch',
  color: 'violet',
  estimatedTime: '15-20 minutes',

  outputs: [
    'Engagement Letter',
    'Risk Assessment Framework',
    'Testing Procedure Templates',
  ],

  globalInputs: [
    {
      id: 'clientName',
      label: 'Client Name',
      type: 'text',
      placeholder: 'e.g., Springfield Regional Hospital',
      required: true,
    },
    {
      id: 'engagementType',
      label: 'Engagement Type',
      type: 'select',
      options: ['Financial Statement Audit', 'Review', 'Compilation', 'Agreed-Upon Procedures'],
      required: true,
    },
    {
      id: 'auditStandard',
      label: 'Applicable Audit Standard',
      type: 'select',
      options: ['PCAOB', 'AICPA', 'Yellow Book', 'Uniform Guidance'],
      required: true,
    },
    {
      id: 'entityDetails',
      label: 'Entity Details',
      type: 'textarea',
      placeholder: 'Industry, size, complexity, number of locations, key accounting areas, significant transactions...',
      helpText: 'Provide enough detail for a meaningful risk assessment.',
      required: true,
      rows: 5,
    },
    {
      id: 'priorFindings',
      label: 'Prior Year Findings',
      type: 'textarea',
      placeholder: 'Prior year audit findings, management letter points, significant deficiencies, material weaknesses...',
      required: false,
      rows: 4,
    },
    {
      id: 'materialityInfo',
      label: 'Materiality Threshold',
      type: 'text',
      placeholder: 'e.g., $50,000 overall materiality, $25,000 performance materiality',
      required: false,
    },
  ],

  steps: [
    {
      id: 'step-engagement-letter',
      skillId: 'engagement-letter-generator',
      name: 'Create Engagement Letter',
      description: 'Generate a professional engagement letter tailored to the engagement type and audit standard',
      inputMappings: {
        clientName: { type: 'global', inputId: 'clientName' },
        engagementType: { type: 'global', inputId: 'engagementType' },
        auditStandard: { type: 'global', inputId: 'auditStandard' },
        entityDetails: { type: 'global', inputId: 'entityDetails' },
        servicesRequested: { type: 'computed', template: '{{engagementType}} engagement under {{auditStandard}} standards' },
      },
      outputKey: 'engagementLetter',
    },
    {
      id: 'step-risk-assessment',
      skillId: 'audit-workpaper-reviewer',
      name: 'Generate Risk Assessment Framework',
      description: 'Create a risk assessment and planning memo framework based on entity details and prior findings',
      inputMappings: {
        clientName: { type: 'global', inputId: 'clientName' },
        engagementType: { type: 'global', inputId: 'engagementType' },
        auditStandard: { type: 'global', inputId: 'auditStandard' },
        entityDetails: { type: 'global', inputId: 'entityDetails' },
        priorFindings: { type: 'global', inputId: 'priorFindings' },
        materialityInfo: { type: 'global', inputId: 'materialityInfo' },
        reviewType: { type: 'static', value: 'Risk Assessment & Planning Memo' },
      },
      outputKey: 'riskAssessment',
    },
    {
      id: 'step-testing-procedures',
      skillId: 'audit-workpaper-reviewer',
      name: 'Create Testing Procedure Templates',
      description: 'Build testing procedure documentation templates informed by the risk assessment',
      inputMappings: {
        clientName: { type: 'global', inputId: 'clientName' },
        engagementType: { type: 'global', inputId: 'engagementType' },
        auditStandard: { type: 'global', inputId: 'auditStandard' },
        entityDetails: { type: 'global', inputId: 'entityDetails' },
        priorFindings: { type: 'global', inputId: 'priorFindings' },
        materialityInfo: { type: 'global', inputId: 'materialityInfo' },
        riskAssessment: { type: 'previous', stepId: 'step-risk-assessment', outputKey: 'riskAssessment' },
        reviewType: { type: 'static', value: 'Testing Procedure Documentation Templates' },
      },
      outputKey: 'testingProcedures',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 4: MONTHLY CLIENT ADVISORY PACKAGE
// Financial analysis → Advisory recommendations
// ═══════════════════════════════════════════════════════════════════════════

const MONTHLY_ADVISORY_WORKFLOW: Workflow = {
  id: 'monthly-advisory-package',
  name: 'Monthly Client Advisory Package',
  description: 'Create a comprehensive financial analysis and advisory briefing for client meetings',
  longDescription: 'This workflow transforms raw financial statements into a polished advisory package for client meetings. It performs a full financial analysis with trend identification, ratio analysis, and benchmarking, then generates actionable advisory recommendations and discussion points. Perfect for firms offering CAS (Client Advisory Services) or monthly CFO-level engagements.',
  icon: 'TrendingUp',
  color: 'sky',
  estimatedTime: '10-15 minutes',

  outputs: [
    'Financial Statement Analysis',
    'Advisory Briefing with Recommendations',
  ],

  globalInputs: [
    {
      id: 'clientName',
      label: 'Client Name',
      type: 'text',
      placeholder: 'e.g., Midwest Distribution Co.',
      required: true,
    },
    {
      id: 'entityType',
      label: 'Entity Type',
      type: 'select',
      options: ['S-Corp', 'C-Corp', 'Partnership', 'LLC', 'Non-Profit'],
      required: true,
    },
    {
      id: 'financialStatements',
      label: 'Current Period Financial Statements',
      type: 'textarea',
      placeholder: 'Paste current period financial data: income statement, balance sheet, cash flow highlights...',
      helpText: 'Include as much detail as available for a thorough analysis.',
      required: true,
      rows: 8,
    },
    {
      id: 'priorPeriodData',
      label: 'Comparative Prior Period Data',
      type: 'textarea',
      placeholder: 'Prior period financial data for comparison (same period last year, prior month, budget figures...)',
      helpText: 'Comparative data enables trend analysis and variance identification.',
      required: true,
      rows: 6,
    },
    {
      id: 'industryContext',
      label: 'Industry & Competitive Context',
      type: 'textarea',
      placeholder: 'Industry trends, competitive landscape, market conditions affecting the client...',
      required: false,
      rows: 3,
    },
    {
      id: 'clientGoals',
      label: 'Client Goals & Upcoming Decisions',
      type: 'textarea',
      placeholder: 'Known client objectives, upcoming decisions, expansion plans, financing needs...',
      required: false,
      rows: 3,
    },
  ],

  steps: [
    {
      id: 'step-financial-analysis',
      skillId: 'client-financial-health-summary',
      name: 'Perform Full Financial Analysis',
      description: 'Analyze current and comparative financial statements with trend identification and ratio analysis',
      inputMappings: {
        clientName: { type: 'global', inputId: 'clientName' },
        entityType: { type: 'global', inputId: 'entityType' },
        financialData: { type: 'computed', template: 'CURRENT PERIOD:\n{{financialStatements}}\n\nPRIOR PERIOD:\n{{priorPeriodData}}' },
        industry: { type: 'global', inputId: 'industryContext' },
        analysisType: { type: 'static', value: 'Full Financial Statement Analysis' },
      },
      outputKey: 'financialAnalysis',
    },
    {
      id: 'step-advisory-briefing',
      skillId: 'client-financial-health-summary',
      name: 'Generate Advisory Recommendations',
      description: 'Create actionable advisory recommendations and discussion points based on the financial analysis',
      inputMappings: {
        clientName: { type: 'global', inputId: 'clientName' },
        entityType: { type: 'global', inputId: 'entityType' },
        financialData: { type: 'previous', stepId: 'step-financial-analysis', outputKey: 'financialAnalysis' },
        industry: { type: 'global', inputId: 'industryContext' },
        clientGoals: { type: 'global', inputId: 'clientGoals' },
        analysisType: { type: 'static', value: 'Advisory Briefing & Recommendations' },
      },
      outputKey: 'advisoryBriefing',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 5: PRACTICE DEVELOPMENT PROPOSAL BUILDER
// Needs analysis → Service proposal → Draft engagement letter
// ═══════════════════════════════════════════════════════════════════════════

const PRACTICE_DEVELOPMENT_PROPOSAL_WORKFLOW: Workflow = {
  id: 'practice-development-proposal',
  name: 'Practice Development Proposal Builder',
  description: 'Build a complete prospect proposal from needs analysis through draft engagement letter',
  longDescription: 'This workflow helps partners and business development professionals create winning proposals for prospective clients. It analyzes the prospect\'s needs and pain points, generates a customized service proposal highlighting your firm\'s relevant capabilities, and drafts an engagement letter ready for review. Streamlines the entire proposal process from initial meeting to signed engagement.',
  icon: 'Rocket',
  color: 'amber',
  estimatedTime: '12-18 minutes',

  outputs: [
    'Prospect Needs Analysis',
    'Custom Service Proposal',
    'Draft Engagement Letter',
  ],

  globalInputs: [
    {
      id: 'prospectName',
      label: 'Prospect Name',
      type: 'text',
      placeholder: 'e.g., Greenfield Technologies Inc.',
      required: true,
    },
    {
      id: 'prospectIndustry',
      label: 'Prospect Industry',
      type: 'text',
      placeholder: 'e.g., SaaS Technology, Healthcare, Construction',
      required: true,
    },
    {
      id: 'servicesOfInterest',
      label: 'Services of Interest',
      type: 'textarea',
      placeholder: 'What services does the prospect need? (e.g., tax planning, audit, bookkeeping, CFO advisory, payroll...)',
      helpText: 'Include everything discussed or anticipated based on your initial conversations.',
      required: true,
      rows: 4,
    },
    {
      id: 'prospectProfile',
      label: 'Prospect Profile',
      type: 'textarea',
      placeholder: 'Business size, complexity, current accounting situation, revenue range, number of employees, entities...',
      helpText: 'The more context you provide, the more tailored the proposal will be.',
      required: true,
      rows: 5,
    },
    {
      id: 'competitiveSituation',
      label: 'Competitive Situation',
      type: 'textarea',
      placeholder: 'Are they leaving another firm? Why? Are they comparing multiple firms? Known pain points with current provider...',
      required: false,
      rows: 3,
    },
    {
      id: 'firmCapabilities',
      label: 'Your Firm Capabilities & Differentiators',
      type: 'textarea',
      placeholder: 'Your firm\'s relevant experience, industry specializations, technology stack, team credentials, unique value...',
      required: false,
      rows: 4,
    },
  ],

  steps: [
    {
      id: 'step-needs-analysis',
      skillId: 'client-financial-health-summary',
      name: 'Analyze Prospect Needs',
      description: 'Perform a comprehensive needs analysis based on prospect profile and service requirements',
      inputMappings: {
        clientName: { type: 'global', inputId: 'prospectName' },
        financialData: { type: 'global', inputId: 'prospectProfile' },
        industry: { type: 'global', inputId: 'prospectIndustry' },
        servicesContext: { type: 'global', inputId: 'servicesOfInterest' },
        competitiveSituation: { type: 'global', inputId: 'competitiveSituation' },
        analysisType: { type: 'static', value: 'Prospect Needs Analysis' },
      },
      outputKey: 'needsAnalysis',
    },
    {
      id: 'step-service-proposal',
      skillId: 'engagement-letter-generator',
      name: 'Draft Service Proposal',
      description: 'Generate a customized service proposal with pricing framework and value positioning',
      inputMappings: {
        clientName: { type: 'global', inputId: 'prospectName' },
        servicesRequested: { type: 'global', inputId: 'servicesOfInterest' },
        entityDetails: { type: 'global', inputId: 'prospectProfile' },
        industry: { type: 'global', inputId: 'prospectIndustry' },
        needsAnalysis: { type: 'previous', stepId: 'step-needs-analysis', outputKey: 'needsAnalysis' },
        firmCapabilities: { type: 'global', inputId: 'firmCapabilities' },
        documentType: { type: 'static', value: 'Service Proposal' },
      },
      outputKey: 'serviceProposal',
    },
    {
      id: 'step-engagement-letter',
      skillId: 'engagement-letter-generator',
      name: 'Draft Engagement Letter',
      description: 'Create a draft engagement letter ready for partner review and client signature',
      inputMappings: {
        clientName: { type: 'global', inputId: 'prospectName' },
        servicesRequested: { type: 'global', inputId: 'servicesOfInterest' },
        entityDetails: { type: 'global', inputId: 'prospectProfile' },
        industry: { type: 'global', inputId: 'prospectIndustry' },
        needsAnalysis: { type: 'previous', stepId: 'step-needs-analysis', outputKey: 'needsAnalysis' },
        serviceProposal: { type: 'previous', stepId: 'step-service-proposal', outputKey: 'serviceProposal' },
        documentType: { type: 'static', value: 'Engagement Letter' },
      },
      outputKey: 'engagementLetter',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL ACCOUNTING WORKFLOWS
// ═══════════════════════════════════════════════════════════════════════════

export const ACCOUNTING_WORKFLOWS: Record<string, Workflow> = {
  'new-client-onboarding': NEW_CLIENT_ONBOARDING_WORKFLOW,
  'tax-season-prep-pipeline': TAX_SEASON_PREP_WORKFLOW,
  'audit-engagement-workflow': AUDIT_ENGAGEMENT_WORKFLOW,
  'monthly-advisory-package': MONTHLY_ADVISORY_WORKFLOW,
  'practice-development-proposal': PRACTICE_DEVELOPMENT_PROPOSAL_WORKFLOW,
};

export const ACCOUNTING_WORKFLOW_LIST: Workflow[] = Object.values(ACCOUNTING_WORKFLOWS);
