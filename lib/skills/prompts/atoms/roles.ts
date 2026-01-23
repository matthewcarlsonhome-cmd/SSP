/**
 * Role Atoms - Irreducible identity predicates
 *
 * Russellian Principle: Each role is a clear, unambiguous predicate
 * that can be composed without contradiction.
 *
 * Usage:
 *   import { ROLES } from './roles';
 *   const careerRole = ROLES.careerStrategist.render();
 */

import { RoleAtom } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Create role atom with consistent structure
// ═══════════════════════════════════════════════════════════════════════════════

function createRoleAtom(config: Omit<RoleAtom, 'type' | 'render'>): RoleAtom {
  return {
    type: 'role',
    ...config,
    render: () => {
      const orgList = config.organizations.join(', ');
      const credList = config.credentials.length > 0
        ? ` You hold ${config.credentials.join(', ')} certifications.`
        : '';

      return `You are a ${config.title} with ${config.yearsExperience}+ years of experience at ${orgList}.${credList}`;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAREER & TALENT ROLES
// ═══════════════════════════════════════════════════════════════════════════════

export const ROLES = {
  // Career & Talent
  careerStrategist: createRoleAtom({
    id: 'career-strategist',
    title: 'Principal Career Strategist',
    yearsExperience: 25,
    organizations: ['McKinsey', 'Bain', 'Goldman Sachs', 'Google', 'Korn Ferry'],
    credentials: ['SHRM-SCP', 'ICF PCC'],
  }),

  talentAssessor: createRoleAtom({
    id: 'talent-assessor',
    title: 'Senior Talent Assessment Expert',
    yearsExperience: 20,
    organizations: ['Spencer Stuart', 'Heidrick & Struggles', 'Russell Reynolds'],
    credentials: ['SHL Certified', 'Hogan Certified'],
  }),

  atsSpecialist: createRoleAtom({
    id: 'ats-specialist',
    title: 'Senior ATS Optimization Specialist',
    yearsExperience: 15,
    organizations: ['Workday', 'Greenhouse', 'Lever', 'Taleo'],
    credentials: [],
  }),

  compensationExpert: createRoleAtom({
    id: 'compensation-expert',
    title: 'Senior Compensation Strategist',
    yearsExperience: 18,
    organizations: ['Mercer', 'Willis Towers Watson', 'Goldman Sachs'],
    credentials: ['CCP', 'GRP'],
  }),

  networkingStrategist: createRoleAtom({
    id: 'networking-strategist',
    title: 'Senior Professional Networking Strategist',
    yearsExperience: 18,
    organizations: ['LinkedIn', 'McKinsey', 'Andreessen Horowitz'],
    credentials: [],
  }),

  // Technical Roles
  softwareArchitect: createRoleAtom({
    id: 'software-architect',
    title: 'Principal Software Architect',
    yearsExperience: 22,
    organizations: ['Google', 'Amazon', 'Netflix', 'Stripe'],
    credentials: [],
  }),

  siteReliabilityEngineer: createRoleAtom({
    id: 'sre',
    title: 'Principal Site Reliability Engineer',
    yearsExperience: 18,
    organizations: ['Google', 'Netflix', 'Amazon', 'Uber'],
    credentials: [],
  }),

  securityArchitect: createRoleAtom({
    id: 'security-architect',
    title: 'Chief Information Security Officer',
    yearsExperience: 20,
    organizations: ['Microsoft', 'Google', 'Goldman Sachs'],
    credentials: ['CISSP', 'CISM', 'CRISC', 'CCSP'],
  }),

  // Business Roles
  businessIntelligence: createRoleAtom({
    id: 'business-intelligence',
    title: 'Senior Business Intelligence Analyst',
    yearsExperience: 15,
    organizations: ['McKinsey', 'Bain', 'Deloitte', 'Goldman Sachs'],
    credentials: [],
  }),

  financePlanning: createRoleAtom({
    id: 'finance-planning',
    title: 'Chief Financial Planning Officer',
    yearsExperience: 22,
    organizations: ['Amazon', 'Microsoft', 'Goldman Sachs'],
    credentials: ['CPA', 'CFA', 'FP&A'],
  }),

  productManager: createRoleAtom({
    id: 'product-manager',
    title: 'Senior Product Manager',
    yearsExperience: 15,
    organizations: ['Google', 'Meta', 'Stripe', 'Airbnb'],
    credentials: [],
  }),

  // HR Roles
  chiefPeopleOfficer: createRoleAtom({
    id: 'chief-people-officer',
    title: 'Chief People Officer',
    yearsExperience: 20,
    organizations: ['Google', 'Netflix', 'Stripe', 'LinkedIn'],
    credentials: ['SHRM-SCP'],
  }),

  performanceManagement: createRoleAtom({
    id: 'performance-management',
    title: 'Senior Performance Management Expert',
    yearsExperience: 22,
    organizations: ['Google', 'Microsoft', 'Netflix'],
    credentials: [],
  }),

  // Governance & Compliance
  aiGovernance: createRoleAtom({
    id: 'ai-governance',
    title: 'Senior AI Governance Strategist',
    yearsExperience: 15,
    organizations: ['Google', 'Microsoft', 'OpenAI', 'Anthropic'],
    credentials: [],
  }),

  complianceOfficer: createRoleAtom({
    id: 'compliance-officer',
    title: 'Senior Compliance & Audit Consultant',
    yearsExperience: 18,
    organizations: ['Deloitte', 'KPMG', 'PwC', 'EY'],
    credentials: ['CIA', 'CISA', 'CRISC'],
  }),

  // Communications
  executiveCommunications: createRoleAtom({
    id: 'executive-communications',
    title: 'Senior Executive Communications Strategist',
    yearsExperience: 20,
    organizations: ['McKinsey', 'Goldman Sachs', 'Google'],
    credentials: [],
  }),

  // Generic/Flexible
  domainExpert: createRoleAtom({
    id: 'domain-expert',
    title: 'Senior Domain Expert',
    yearsExperience: 15,
    organizations: ['Fortune 500 companies'],
    credentials: [],
  }),
} as const;

// Type for role IDs
export type RoleId = keyof typeof ROLES;

// Get role by ID
export function getRole(id: RoleId): RoleAtom {
  return ROLES[id];
}

// List all available roles
export function listRoles(): RoleId[] {
  return Object.keys(ROLES) as RoleId[];
}
