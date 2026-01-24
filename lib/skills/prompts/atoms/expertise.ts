/**
 * Expertise Atoms - Domain knowledge predicates
 *
 * Russellian Principle: Expertise blocks are composable without conflict.
 * Multiple expertise atoms can be combined to create hybrid experts.
 *
 * Usage:
 *   import { EXPERTISE } from './expertise';
 *   const combined = EXPERTISE.atsOptimization.render() + '\n' + EXPERTISE.resumeWriting.render();
 */

import { ExpertiseAtom } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Create expertise atom with consistent structure
// ═══════════════════════════════════════════════════════════════════════════════

function createExpertiseAtom(config: Omit<ExpertiseAtom, 'type' | 'render'>): ExpertiseAtom {
  return {
    type: 'expertise',
    ...config,
    render: () => {
      const subdomainList = config.subdomains.join(', ');
      const knowledgePoints = config.specificKnowledge
        .map((k) => `- ${k}`)
        .join('\n');

      return `**${config.domain.toUpperCase()} EXPERTISE:**
Core Areas: ${subdomainList}

Specific Knowledge:
${knowledgePoints}`;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAREER & TALENT EXPERTISE
// ═══════════════════════════════════════════════════════════════════════════════

export const EXPERTISE = {
  // ATS & Resume
  atsOptimization: createExpertiseAtom({
    id: 'ats-optimization',
    domain: 'Applicant Tracking Systems',
    subdomains: ['keyword optimization', 'parsing algorithms', 'ATS-friendly formatting'],
    specificKnowledge: [
      'Workday, Greenhouse, Lever, Taleo, iCIMS architecture',
      'Keyword density and semantic matching algorithms',
      'Section recognition and parsing hierarchies',
      'Boolean search optimization for recruiter queries',
      'Score thresholds and auto-rejection patterns',
    ],
  }),

  resumeWriting: createExpertiseAtom({
    id: 'resume-writing',
    domain: 'Resume Optimization',
    subdomains: ['achievement quantification', 'impact-driven content', 'format optimization'],
    specificKnowledge: [
      'STAR and CAR achievement frameworks',
      'Industry-specific keyword banks',
      'Accomplishment quantification techniques',
      'Visual hierarchy and scanability principles',
      'ATS-human dual optimization strategies',
    ],
  }),

  talentAssessment: createExpertiseAtom({
    id: 'talent-assessment',
    domain: 'Talent Assessment',
    subdomains: ['competency mapping', 'skills gap analysis', 'interview prediction'],
    specificKnowledge: [
      'SHL, Hogan, Korn Ferry assessment frameworks',
      'Behavioral competency taxonomies',
      'Experience relevance scoring methodologies',
      'Soft skills evidence evaluation',
      'Career trajectory pattern recognition',
    ],
  }),

  compensation: createExpertiseAtom({
    id: 'compensation',
    domain: 'Compensation & Total Rewards',
    subdomains: ['salary benchmarking', 'negotiation strategy', 'total compensation analysis'],
    specificKnowledge: [
      'Market compensation data sources (Levels.fyi, Glassdoor, Payscale)',
      'Equity compensation valuation (RSUs, options, refresh grants)',
      'Benefits monetization and comparison',
      'Negotiation psychology and tactics',
      'Counter-offer evaluation frameworks',
    ],
  }),

  networking: createExpertiseAtom({
    id: 'networking',
    domain: 'Professional Networking',
    subdomains: ['relationship building', 'outreach strategy', 'network activation'],
    specificKnowledge: [
      'Cold outreach personalization techniques',
      'LinkedIn connection and messaging best practices',
      'Warm introduction request frameworks',
      'Information interview methodology',
      'Follow-up cadence optimization',
    ],
  }),

  interviewing: createExpertiseAtom({
    id: 'interviewing',
    domain: 'Interview Preparation',
    subdomains: ['behavioral interviews', 'technical interviews', 'case interviews'],
    specificKnowledge: [
      'STAR method response structuring',
      'Common question patterns by role and level',
      'Company-specific interview process knowledge',
      'Panel and loop interview dynamics',
      'Executive presence and communication coaching',
    ],
  }),

  // Technical Expertise
  systemDesign: createExpertiseAtom({
    id: 'system-design',
    domain: 'System Design & Architecture',
    subdomains: ['distributed systems', 'API design', 'scalability patterns'],
    specificKnowledge: [
      'CAP theorem and consistency models',
      'Microservices vs monolith trade-offs',
      'Database selection and sharding strategies',
      'Caching patterns (write-through, write-behind, cache-aside)',
      'Load balancing and service discovery',
    ],
  }),

  siteReliability: createExpertiseAtom({
    id: 'site-reliability',
    domain: 'Site Reliability Engineering',
    subdomains: ['incident management', 'observability', 'chaos engineering'],
    specificKnowledge: [
      'SLO/SLI/SLA definition and monitoring',
      'Blameless postmortem facilitation',
      'On-call best practices and escalation',
      'Incident classification and severity levels',
      'Reliability metrics and error budgets',
    ],
  }),

  security: createExpertiseAtom({
    id: 'security',
    domain: 'Information Security',
    subdomains: ['application security', 'compliance', 'risk assessment'],
    specificKnowledge: [
      'OWASP Top 10 vulnerabilities and mitigations',
      'SOC 2, ISO 27001, GDPR compliance requirements',
      'Security questionnaire response patterns',
      'Vendor risk assessment frameworks',
      'Data protection and encryption standards',
    ],
  }),

  // Business Expertise
  financialAnalysis: createExpertiseAtom({
    id: 'financial-analysis',
    domain: 'Financial Analysis',
    subdomains: ['budgeting', 'forecasting', 'variance analysis'],
    specificKnowledge: [
      'Three-statement financial modeling',
      'Budget variance attribution methodology',
      'Driver-based forecasting',
      'Executive financial storytelling',
      'KPI definition and tracking',
    ],
  }),

  productManagement: createExpertiseAtom({
    id: 'product-management',
    domain: 'Product Management',
    subdomains: ['roadmap planning', 'user research', 'metrics definition'],
    specificKnowledge: [
      'PRD and specification writing',
      'Prioritization frameworks (RICE, ICE, MoSCoW)',
      'A/B testing and experimentation',
      'Customer journey mapping',
      'Product-market fit assessment',
    ],
  }),

  projectManagement: createExpertiseAtom({
    id: 'project-management',
    domain: 'Project Management',
    subdomains: ['agile methodologies', 'risk management', 'stakeholder communication'],
    specificKnowledge: [
      'Scrum, Kanban, SAFe framework expertise',
      'Risk identification and mitigation planning',
      'Status reporting and executive updates',
      'Resource allocation and capacity planning',
      'Dependency management and critical path analysis',
    ],
  }),

  // AI & Governance
  aiGovernance: createExpertiseAtom({
    id: 'ai-governance',
    domain: 'AI Governance & Ethics',
    subdomains: ['responsible AI', 'policy development', 'risk assessment'],
    specificKnowledge: [
      'NIST AI Risk Management Framework',
      'EU AI Act compliance requirements',
      'Bias detection and mitigation strategies',
      'Model documentation and transparency',
      'Human oversight and accountability frameworks',
    ],
  }),

  compliance: createExpertiseAtom({
    id: 'compliance',
    domain: 'Compliance & Audit',
    subdomains: ['regulatory compliance', 'audit readiness', 'policy documentation'],
    specificKnowledge: [
      'SOC 2 Type I/II audit preparation',
      'Internal control documentation',
      'Evidence collection and retention',
      'Gap analysis methodologies',
      'Remediation planning and tracking',
    ],
  }),
} as const;

// Type for expertise IDs
export type ExpertiseId = keyof typeof EXPERTISE;

// Get expertise by ID
export function getExpertise(id: ExpertiseId): ExpertiseAtom {
  return EXPERTISE[id];
}

// Combine multiple expertise atoms
export function combineExpertise(ids: ExpertiseId[]): string {
  return ids.map((id) => EXPERTISE[id].render()).join('\n\n');
}
