/**
 * Staffing / Recruiting Workflows
 *
 * 5 production-ready workflows for staffing agencies and recruiting firms:
 * 1. New Job Order Pipeline - Requirements doc, market intelligence, and sourcing strategy
 * 2. Candidate Submission Package - Scorecard, success prediction, and market context
 * 3. Client Acquisition Campaign - Market research, requirements framework, and capability deck
 * 4. Placement & Retention Workflow - Risk assessment and alignment verification
 * 5. Recruiting Performance Review - Performance dashboard and market-adjusted context
 *
 * SKILLS REFERENCED:
 * - candidate-screening-scorecard
 * - client-intake-requirements-builder
 * - candidate-market-intelligence-brief
 * - placement-success-predictor
 * - recruiting-pipeline-dashboard-designer
 */

import type { Workflow } from '../storage/types';

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 1: NEW JOB ORDER PIPELINE
// Requirements doc → Market intelligence → Sourcing strategy & pipeline plan
// ═══════════════════════════════════════════════════════════════════════════

const NEW_JOB_ORDER_PIPELINE_WORKFLOW: Workflow = {
  id: 'new-job-order-pipeline',
  name: 'New Job Order Pipeline',
  description: 'Transform a client intake call into a structured job order with market intelligence and sourcing plan',
  longDescription: 'This workflow takes raw notes from a client intake conversation and produces a complete job order package. It structures the requirements into a professional document, generates market intelligence on talent availability and compensation benchmarks, and creates a sourcing strategy with pipeline milestones. Ideal for account managers and recruiters who need to move quickly from client call to active sourcing.',
  icon: 'ClipboardList',
  color: 'cyan',
  estimatedTime: '12-18 minutes',

  outputs: [
    'Structured Job Requirements Document',
    'Market Intelligence Brief',
    'Sourcing Strategy & Pipeline Plan',
  ],

  globalInputs: [
    {
      id: 'clientCompany',
      label: 'Client Company',
      type: 'text',
      placeholder: 'e.g., Apex Financial Services',
      required: true,
    },
    {
      id: 'roleTitle',
      label: 'Role Title',
      type: 'text',
      placeholder: 'e.g., Senior Data Engineer',
      required: true,
    },
    {
      id: 'intakeNotes',
      label: 'Intake Notes',
      type: 'textarea',
      placeholder: 'Paste your raw notes from the client conversation: role details, team structure, must-haves, nice-to-haves, culture fit, timeline...',
      helpText: 'Include everything discussed. The more detail, the better the requirements doc.',
      required: true,
      rows: 8,
    },
    {
      id: 'hiringUrgency',
      label: 'Hiring Urgency',
      type: 'select',
      options: ['Backfill-Immediate', 'New Headcount-Standard', 'Pipeline Building', 'Confidential Search'],
      required: true,
    },
    {
      id: 'compensationBudget',
      label: 'Compensation Budget',
      type: 'text',
      placeholder: 'e.g., $120K-$145K base + 15% bonus, or $75-$85/hr contract',
      required: false,
    },
    {
      id: 'accountHistory',
      label: 'Account History',
      type: 'textarea',
      placeholder: 'Relationship history with this client: past placements, hiring patterns, feedback themes, key contacts...',
      required: false,
      rows: 3,
    },
  ],

  steps: [
    {
      id: 'step-requirements-doc',
      skillId: 'client-intake-requirements-builder',
      name: 'Build Structured Requirements Document',
      description: 'Transform raw intake notes into a professional, structured job requirements document',
      inputMappings: {
        clientCompany: { type: 'global', inputId: 'clientCompany' },
        roleTitle: { type: 'global', inputId: 'roleTitle' },
        intakeNotes: { type: 'global', inputId: 'intakeNotes' },
        hiringUrgency: { type: 'global', inputId: 'hiringUrgency' },
        compensationBudget: { type: 'global', inputId: 'compensationBudget' },
        accountHistory: { type: 'global', inputId: 'accountHistory' },
      },
      outputKey: 'requirementsDoc',
    },
    {
      id: 'step-market-brief',
      skillId: 'candidate-market-intelligence-brief',
      name: 'Generate Market Intelligence Brief',
      description: 'Research talent market conditions, compensation benchmarks, and candidate availability for this role',
      inputMappings: {
        roleTitle: { type: 'global', inputId: 'roleTitle' },
        clientCompany: { type: 'global', inputId: 'clientCompany' },
        requirements: { type: 'previous', stepId: 'step-requirements-doc', outputKey: 'requirementsDoc' },
        compensationBudget: { type: 'global', inputId: 'compensationBudget' },
        hiringUrgency: { type: 'global', inputId: 'hiringUrgency' },
      },
      outputKey: 'marketBrief',
    },
    {
      id: 'step-pipeline-plan',
      skillId: 'recruiting-pipeline-dashboard-designer',
      name: 'Create Sourcing Strategy & Pipeline Plan',
      description: 'Design a sourcing strategy with channel recommendations, pipeline stages, and timeline targets',
      inputMappings: {
        roleTitle: { type: 'global', inputId: 'roleTitle' },
        clientCompany: { type: 'global', inputId: 'clientCompany' },
        requirements: { type: 'previous', stepId: 'step-requirements-doc', outputKey: 'requirementsDoc' },
        marketIntelligence: { type: 'previous', stepId: 'step-market-brief', outputKey: 'marketBrief' },
        hiringUrgency: { type: 'global', inputId: 'hiringUrgency' },
        compensationBudget: { type: 'global', inputId: 'compensationBudget' },
        dashboardType: { type: 'static', value: 'Sourcing Strategy & Pipeline Plan' },
      },
      outputKey: 'pipelinePlan',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 2: CANDIDATE SUBMISSION PACKAGE
// Scorecard → Success prediction → Market context
// ═══════════════════════════════════════════════════════════════════════════

const CANDIDATE_SUBMISSION_PACKAGE_WORKFLOW: Workflow = {
  id: 'candidate-submission-package',
  name: 'Candidate Submission Package',
  description: 'Build a comprehensive candidate presentation with scoring, success prediction, and market positioning',
  longDescription: 'This workflow creates a professional candidate submission package for client presentation. It scores and evaluates the candidate against job requirements, predicts placement success with risk factors, and provides market context for positioning the candidate competitively. Helps recruiters make compelling, data-informed candidate presentations that win client trust and accelerate hiring decisions.',
  icon: 'UserCheck',
  color: 'indigo',
  estimatedTime: '10-15 minutes',

  outputs: [
    'Candidate Scorecard & Fit Analysis',
    'Placement Success Prediction',
    'Market Context for Positioning',
  ],

  globalInputs: [
    {
      id: 'jobRequirements',
      label: 'Job Requirements',
      type: 'textarea',
      placeholder: 'Paste the job requirements for the position (skills, experience, qualifications, responsibilities...)',
      helpText: 'Use the structured requirements doc if you have one from the Job Order Pipeline workflow.',
      required: true,
      rows: 8,
    },
    {
      id: 'candidateResume',
      label: 'Candidate Resume',
      type: 'textarea',
      placeholder: 'Paste the candidate resume or profile summary...',
      helpText: 'Include work history, skills, education, and any relevant certifications.',
      required: true,
      rows: 10,
    },
    {
      id: 'roleLevel',
      label: 'Role Level',
      type: 'select',
      options: ['Entry', 'Mid', 'Senior', 'Lead', 'Director', 'C-Suite'],
      required: true,
    },
    {
      id: 'clientPreferences',
      label: 'Client Preferences',
      type: 'textarea',
      placeholder: 'Hiring manager preferences, culture notes, team dynamics, interview style...',
      required: false,
      rows: 3,
    },
    {
      id: 'compensationRange',
      label: 'Compensation Range',
      type: 'text',
      placeholder: 'e.g., $130K-$155K base, or $70-$80/hr',
      required: false,
    },
    {
      id: 'interviewProcess',
      label: 'Interview Process',
      type: 'textarea',
      placeholder: 'Known interview stages and format (e.g., phone screen, technical assessment, panel interview, final round...)',
      required: false,
      rows: 3,
    },
  ],

  steps: [
    {
      id: 'step-candidate-score',
      skillId: 'candidate-screening-scorecard',
      name: 'Score and Evaluate Candidate',
      description: 'Generate a detailed scorecard evaluating candidate fit against job requirements',
      inputMappings: {
        jobRequirements: { type: 'global', inputId: 'jobRequirements' },
        candidateResume: { type: 'global', inputId: 'candidateResume' },
        roleLevel: { type: 'global', inputId: 'roleLevel' },
        clientPreferences: { type: 'global', inputId: 'clientPreferences' },
        compensationRange: { type: 'global', inputId: 'compensationRange' },
      },
      outputKey: 'candidateScore',
    },
    {
      id: 'step-success-prediction',
      skillId: 'placement-success-predictor',
      name: 'Predict Placement Success',
      description: 'Analyze placement success probability with risk factors and retention indicators',
      inputMappings: {
        jobRequirements: { type: 'global', inputId: 'jobRequirements' },
        candidateResume: { type: 'global', inputId: 'candidateResume' },
        roleLevel: { type: 'global', inputId: 'roleLevel' },
        candidateScore: { type: 'previous', stepId: 'step-candidate-score', outputKey: 'candidateScore' },
        clientPreferences: { type: 'global', inputId: 'clientPreferences' },
        interviewProcess: { type: 'global', inputId: 'interviewProcess' },
      },
      outputKey: 'successPrediction',
    },
    {
      id: 'step-market-context',
      skillId: 'candidate-market-intelligence-brief',
      name: 'Provide Market Context',
      description: 'Generate market context data for positioning the candidate competitively to the client',
      inputMappings: {
        roleTitle: { type: 'computed', template: 'Role at {{roleLevel}} level based on requirements' },
        requirements: { type: 'global', inputId: 'jobRequirements' },
        compensationBudget: { type: 'global', inputId: 'compensationRange' },
        candidateProfile: { type: 'previous', stepId: 'step-candidate-score', outputKey: 'candidateScore' },
        briefType: { type: 'static', value: 'Candidate Positioning Context' },
      },
      outputKey: 'marketContext',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 3: CLIENT ACQUISITION CAMPAIGN
// Market research → Proactive requirements framework → Capability presentation
// ═══════════════════════════════════════════════════════════════════════════

const CLIENT_ACQUISITION_CAMPAIGN_WORKFLOW: Workflow = {
  id: 'client-acquisition-campaign',
  name: 'Client Acquisition Campaign',
  description: 'Create a targeted business development package with market research and capability presentation',
  longDescription: 'This workflow helps staffing firms win new clients through a data-driven approach. It researches the target market for the roles you want to fill, builds a proactive requirements framework showing you understand their hiring needs before they tell you, and creates a capability presentation with metrics and case studies. Perfect for business development managers and agency owners pursuing strategic accounts.',
  icon: 'Target',
  color: 'orange',
  estimatedTime: '12-18 minutes',

  outputs: [
    'Target Market Research',
    'Proactive Requirements Framework',
    'Firm Capabilities Presentation',
  ],

  globalInputs: [
    {
      id: 'targetCompany',
      label: 'Target Company',
      type: 'text',
      placeholder: 'e.g., NovaTech Solutions',
      required: true,
    },
    {
      id: 'targetIndustry',
      label: 'Target Industry',
      type: 'text',
      placeholder: 'e.g., FinTech, Healthcare IT, Manufacturing',
      required: true,
    },
    {
      id: 'targetRoles',
      label: 'Target Roles',
      type: 'textarea',
      placeholder: 'Types of roles you want to fill for this client (e.g., software engineers, data analysts, project managers, DevOps...)',
      helpText: 'Include role families and levels you specialize in for this industry.',
      required: true,
      rows: 4,
    },
    {
      id: 'firmSpecialization',
      label: 'Firm Specialization & Differentiators',
      type: 'textarea',
      placeholder: 'Your firm\'s niche, differentiators, notable placements, fill rates, retention stats, industry expertise...',
      helpText: 'Highlight what makes your firm the best choice for these types of roles.',
      required: true,
      rows: 5,
    },
    {
      id: 'competitiveIntel',
      label: 'Competitive Intelligence',
      type: 'textarea',
      placeholder: 'Known incumbent staffing providers, pain points with current vendors, contract renewal timing...',
      required: false,
      rows: 3,
    },
    {
      id: 'marketPosition',
      label: 'Market Positioning',
      type: 'textarea',
      placeholder: 'Why this client should work with your firm: unique access to talent pools, speed to fill, quality guarantees...',
      required: false,
      rows: 3,
    },
  ],

  steps: [
    {
      id: 'step-market-research',
      skillId: 'candidate-market-intelligence-brief',
      name: 'Research Target Market',
      description: 'Conduct market research on talent availability, compensation trends, and hiring patterns for target roles',
      inputMappings: {
        roleTitle: { type: 'computed', template: 'Multiple roles for {{targetCompany}}: {{targetRoles}}' },
        clientCompany: { type: 'global', inputId: 'targetCompany' },
        industry: { type: 'global', inputId: 'targetIndustry' },
        competitiveIntel: { type: 'global', inputId: 'competitiveIntel' },
        briefType: { type: 'static', value: 'Client Acquisition Market Research' },
      },
      outputKey: 'marketResearch',
    },
    {
      id: 'step-requirements-framework',
      skillId: 'client-intake-requirements-builder',
      name: 'Build Proactive Requirements Framework',
      description: 'Create a requirements framework demonstrating deep understanding of the target company hiring needs',
      inputMappings: {
        clientCompany: { type: 'global', inputId: 'targetCompany' },
        roleTitle: { type: 'computed', template: 'Proactive framework for: {{targetRoles}}' },
        intakeNotes: { type: 'computed', template: 'PROACTIVE REQUIREMENTS FRAMEWORK\n\nTarget Company: {{targetCompany}}\nIndustry: {{targetIndustry}}\n\nTarget Roles:\n{{targetRoles}}\n\nMarket Research:\n{{marketResearch}}\n\nCompetitive Intel:\n{{competitiveIntel}}' },
        hiringUrgency: { type: 'static', value: 'Pipeline Building' },
        frameworkType: { type: 'static', value: 'Proactive Client Acquisition' },
      },
      outputKey: 'requirementsFramework',
    },
    {
      id: 'step-capability-deck',
      skillId: 'recruiting-pipeline-dashboard-designer',
      name: 'Create Capability Presentation',
      description: 'Build a firm capabilities presentation with metrics, case studies, and service-level commitments',
      inputMappings: {
        targetCompany: { type: 'global', inputId: 'targetCompany' },
        targetRoles: { type: 'global', inputId: 'targetRoles' },
        firmSpecialization: { type: 'global', inputId: 'firmSpecialization' },
        marketResearch: { type: 'previous', stepId: 'step-market-research', outputKey: 'marketResearch' },
        requirementsFramework: { type: 'previous', stepId: 'step-requirements-framework', outputKey: 'requirementsFramework' },
        marketPosition: { type: 'global', inputId: 'marketPosition' },
        dashboardType: { type: 'static', value: 'Firm Capabilities Presentation' },
      },
      outputKey: 'capabilityDeck',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 4: PLACEMENT & RETENTION WORKFLOW
// Comprehensive risk assessment → Alignment verification & retention plan
// ═══════════════════════════════════════════════════════════════════════════

const PLACEMENT_RETENTION_WORKFLOW: Workflow = {
  id: 'placement-retention-workflow',
  name: 'Placement & Retention Workflow',
  description: 'Assess placement risk and create a retention plan to protect your guarantee period',
  longDescription: 'This workflow helps staffing firms protect their placements and guarantee periods. It generates a comprehensive risk assessment identifying potential falloff triggers and retention concerns, then verifies role-candidate alignment with a structured retention plan including check-in schedules and intervention strategies. Essential for placement coordinators and account managers managing active placements.',
  icon: 'Shield',
  color: 'purple',
  estimatedTime: '8-12 minutes',

  outputs: [
    'Placement Risk Assessment',
    'Alignment Verification & Retention Plan',
  ],

  globalInputs: [
    {
      id: 'candidateName',
      label: 'Candidate Name',
      type: 'text',
      placeholder: 'e.g., Sarah Martinez',
      required: true,
    },
    {
      id: 'placedRole',
      label: 'Placed Role',
      type: 'text',
      placeholder: 'e.g., Senior Software Engineer',
      required: true,
    },
    {
      id: 'clientCompany',
      label: 'Client Company',
      type: 'text',
      placeholder: 'e.g., TechCorp Industries',
      required: true,
    },
    {
      id: 'placementDetails',
      label: 'Placement Details',
      type: 'textarea',
      placeholder: 'Start date, compensation agreed, placement type (direct/contract/contract-to-hire), guarantee period, fee structure...',
      helpText: 'Include all contractual details relevant to retention tracking.',
      required: true,
      rows: 5,
    },
    {
      id: 'candidateProfile',
      label: 'Candidate Profile',
      type: 'textarea',
      placeholder: 'Candidate background, motivations, concerns raised during process, counteroffer risk, relocation involved, career goals...',
      helpText: 'Include soft factors that could affect retention.',
      required: true,
      rows: 5,
    },
    {
      id: 'roleEnvironment',
      label: 'Role Environment',
      type: 'textarea',
      placeholder: 'Team size, reporting structure, manager style, company culture, remote/hybrid/onsite, onboarding process...',
      required: false,
      rows: 4,
    },
  ],

  steps: [
    {
      id: 'step-risk-assessment',
      skillId: 'placement-success-predictor',
      name: 'Comprehensive Risk Assessment',
      description: 'Evaluate placement risk factors including retention probability, falloff triggers, and early warning signs',
      inputMappings: {
        candidateName: { type: 'global', inputId: 'candidateName' },
        placedRole: { type: 'global', inputId: 'placedRole' },
        clientCompany: { type: 'global', inputId: 'clientCompany' },
        placementDetails: { type: 'global', inputId: 'placementDetails' },
        candidateProfile: { type: 'global', inputId: 'candidateProfile' },
        roleEnvironment: { type: 'global', inputId: 'roleEnvironment' },
        predictionType: { type: 'static', value: 'Post-Placement Risk Assessment' },
      },
      outputKey: 'riskAssessment',
    },
    {
      id: 'step-alignment-check',
      skillId: 'candidate-screening-scorecard',
      name: 'Verify Alignment & Build Retention Plan',
      description: 'Verify role-candidate alignment and create a structured retention plan with check-in cadence',
      inputMappings: {
        candidateName: { type: 'global', inputId: 'candidateName' },
        jobRequirements: { type: 'computed', template: 'Placed Role: {{placedRole}} at {{clientCompany}}\n\nPlacement Details:\n{{placementDetails}}\n\nRole Environment:\n{{roleEnvironment}}' },
        candidateResume: { type: 'global', inputId: 'candidateProfile' },
        riskAssessment: { type: 'previous', stepId: 'step-risk-assessment', outputKey: 'riskAssessment' },
        scorecardType: { type: 'static', value: 'Alignment Verification & Retention Plan' },
      },
      outputKey: 'alignmentCheck',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 5: RECRUITING PERFORMANCE REVIEW
// Performance dashboard → Market-adjusted performance context
// ═══════════════════════════════════════════════════════════════════════════

const RECRUITING_PERFORMANCE_REVIEW_WORKFLOW: Workflow = {
  id: 'recruiting-performance-review',
  name: 'Recruiting Performance Review',
  description: 'Generate a performance dashboard with market-adjusted analysis for recruiting teams',
  longDescription: 'This workflow creates a comprehensive recruiting performance review for team leads and agency owners. It builds a performance dashboard analyzing individual and team metrics against targets, then layers in market context to distinguish between recruiter performance and market conditions. Helps identify top performers, coaching opportunities, and strategic adjustments needed for the next period.',
  icon: 'BarChart',
  color: 'rose',
  estimatedTime: '10-15 minutes',

  outputs: [
    'Performance Dashboard & Analysis',
    'Market-Adjusted Performance Context',
  ],

  globalInputs: [
    {
      id: 'teamData',
      label: 'Team Data',
      type: 'textarea',
      placeholder: 'Recruiter names, desks/specializations, tenure, current capacity... (e.g., Lisa Chen - IT Desk, 3 yrs; Mark Rivera - Finance Desk, 1 yr...)',
      helpText: 'Include all team members and their areas of focus.',
      required: true,
      rows: 6,
    },
    {
      id: 'pipelineMetrics',
      label: 'Pipeline Metrics',
      type: 'textarea',
      placeholder: 'Current pipeline data by recruiter: submittals, interviews scheduled, offers extended, starts... (e.g., Lisa: 45 submittals, 12 interviews, 4 offers, 3 starts)',
      helpText: 'Include metrics for each stage of the recruiting funnel.',
      required: true,
      rows: 6,
    },
    {
      id: 'revenueData',
      label: 'Revenue Data',
      type: 'textarea',
      placeholder: 'Revenue, margins, fill rates by recruiter and desk (e.g., IT Desk: $420K revenue, 22% margin, 68% fill rate)',
      helpText: 'Include both individual and team-level financial metrics.',
      required: true,
      rows: 5,
    },
    {
      id: 'businessGoals',
      label: 'Business Goals',
      type: 'textarea',
      placeholder: 'Firm revenue targets, growth objectives, headcount goals, new desk plans...',
      helpText: 'What are you measuring performance against?',
      required: true,
      rows: 4,
    },
    {
      id: 'challenges',
      label: 'Known Challenges',
      type: 'textarea',
      placeholder: 'Known challenges, bottlenecks, areas of concern (e.g., slow client feedback, candidate ghosting, specific desk underperformance...)',
      required: false,
      rows: 3,
    },
    {
      id: 'benchmarkPeriod',
      label: 'Benchmark Period',
      type: 'select',
      options: ['Monthly Review', 'Quarterly Review', 'Semi-Annual Review', 'Annual Review'],
      required: true,
    },
  ],

  steps: [
    {
      id: 'step-performance-dashboard',
      skillId: 'recruiting-pipeline-dashboard-designer',
      name: 'Build Performance Dashboard & Analysis',
      description: 'Create a comprehensive performance dashboard with individual and team metrics analysis',
      inputMappings: {
        teamData: { type: 'global', inputId: 'teamData' },
        pipelineMetrics: { type: 'global', inputId: 'pipelineMetrics' },
        revenueData: { type: 'global', inputId: 'revenueData' },
        businessGoals: { type: 'global', inputId: 'businessGoals' },
        challenges: { type: 'global', inputId: 'challenges' },
        benchmarkPeriod: { type: 'global', inputId: 'benchmarkPeriod' },
        dashboardType: { type: 'static', value: 'Recruiting Performance Review Dashboard' },
      },
      outputKey: 'performanceDashboard',
    },
    {
      id: 'step-market-context',
      skillId: 'candidate-market-intelligence-brief',
      name: 'Add Market-Adjusted Performance Context',
      description: 'Provide market context to distinguish between recruiter performance and external market conditions',
      inputMappings: {
        teamData: { type: 'global', inputId: 'teamData' },
        performanceData: { type: 'previous', stepId: 'step-performance-dashboard', outputKey: 'performanceDashboard' },
        businessGoals: { type: 'global', inputId: 'businessGoals' },
        challenges: { type: 'global', inputId: 'challenges' },
        benchmarkPeriod: { type: 'global', inputId: 'benchmarkPeriod' },
        briefType: { type: 'static', value: 'Performance Review Market Context' },
      },
      outputKey: 'marketContext',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL STAFFING WORKFLOWS
// ═══════════════════════════════════════════════════════════════════════════

export const STAFFING_WORKFLOWS: Record<string, Workflow> = {
  'new-job-order-pipeline': NEW_JOB_ORDER_PIPELINE_WORKFLOW,
  'candidate-submission-package': CANDIDATE_SUBMISSION_PACKAGE_WORKFLOW,
  'client-acquisition-campaign': CLIENT_ACQUISITION_CAMPAIGN_WORKFLOW,
  'placement-retention-workflow': PLACEMENT_RETENTION_WORKFLOW,
  'recruiting-performance-review': RECRUITING_PERFORMANCE_REVIEW_WORKFLOW,
};

export const STAFFING_WORKFLOW_LIST: Workflow[] = Object.values(STAFFING_WORKFLOWS);
