/**
 * Skill Time Savings Calculator
 *
 * Provides time savings estimates for skills based on category and specific overrides.
 * Used for dynamic ROI calculation on client portal pages.
 *
 * Time savings are expressed as MONTHLY hours saved for regular use.
 */

import type { Skill } from '../types';
import type { Workflow } from './storage/types';

// ═══════════════════════════════════════════════════════════════════════════
// TIME SAVINGS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default monthly time savings by skill category (in hours)
 * These represent typical monthly savings for regular use of skills in each category.
 */
export const CATEGORY_TIME_SAVINGS: Record<string, { min: number; max: number }> = {
  // Job seeker skills - used periodically during job search
  'job-seeker': { min: 2, max: 4 },

  // Governance skills - regular compliance and policy work
  'governance': { min: 3, max: 5 },

  // Excel/analytics skills - frequent data analysis tasks
  'excel': { min: 4, max: 8 },

  // Enterprise skills - executive communication, contracts
  'enterprise': { min: 3, max: 6 },

  // Sales skills - proposals, customer success
  'sales': { min: 4, max: 8 },

  // Product skills - strategy, OKRs, roadmaps
  'product': { min: 3, max: 6 },

  // Technical skills - specs, postmortems, reviews
  'technical': { min: 4, max: 7 },

  // HR skills - onboarding, performance reviews
  'hr': { min: 3, max: 5 },

  // Operations skills - SOPs, vendor management
  'operations': { min: 3, max: 6 },

  // Marketing skills - campaigns, content, analytics
  'marketing': { min: 4, max: 8 },

  // Extended/professional skills
  'extended': { min: 3, max: 6 },

  // Default for unknown categories
  'default': { min: 2, max: 4 },
};

/**
 * Specific skill time savings overrides (monthly hours)
 * These override category defaults for skills with known values.
 */
export const SKILL_TIME_SAVINGS_OVERRIDES: Record<string, { min: number; max: number }> = {
  // High-impact job seeker skills
  'job-readiness-score': { min: 2, max: 3 },
  'skills-gap-analyzer': { min: 3, max: 4 },
  'resume-customizer': { min: 4, max: 6 },
  'linkedin-optimizer': { min: 3, max: 5 },
  'cover-letter-generator': { min: 4, max: 6 },
  'interview-prep': { min: 4, max: 6 },
  'company-researcher': { min: 2, max: 4 },

  // Enterprise skills
  'executive-communication-pack': { min: 4, max: 7 },
  'steering-committee-pack': { min: 3, max: 5 },
  'contract-review-accelerator': { min: 5, max: 8 },
  'automation-opportunity-assessment': { min: 4, max: 6 },

  // Excel/analytics skills
  'excel-formula-generator': { min: 6, max: 10 },
  'data-cleanup-assistant': { min: 5, max: 8 },
  'chart-recommendation-engine': { min: 3, max: 5 },

  // Sales skills
  'sales-proposal-generator': { min: 6, max: 10 },
  'customer-success-playbook': { min: 4, max: 7 },
  'win-loss-analyzer': { min: 3, max: 5 },

  // Product skills
  'product-requirements-doc': { min: 6, max: 10 },
  'okr-generator': { min: 3, max: 5 },
  'roadmap-prioritizer': { min: 4, max: 6 },
};

/**
 * Workflow time savings (monthly hours)
 * Workflows typically save more time as they chain multiple skills together.
 */
export const WORKFLOW_TIME_SAVINGS: Record<string, { min: number; max: number }> = {
  // Job search workflows
  'full-application-package': { min: 6, max: 10 },
  'interview-mastery-prep': { min: 5, max: 8 },
  'networking-outreach': { min: 4, max: 6 },
  'career-pivot-explorer': { min: 5, max: 8 },

  // Business workflows
  'business-case-builder': { min: 8, max: 12 },
  'proposal-generator': { min: 6, max: 10 },
  'market-research': { min: 5, max: 8 },

  // Default for unknown workflows
  'default': { min: 4, max: 7 },
};

// ═══════════════════════════════════════════════════════════════════════════
// TIME SAVINGS CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract category from skill ID
 * e.g., "job-seeker-resume" -> "job-seeker"
 */
function getCategoryFromSkillId(skillId: string): string {
  // Common category prefixes
  const categories = [
    'job-seeker',
    'governance',
    'excel',
    'enterprise',
    'sales',
    'product',
    'technical',
    'hr',
    'operations',
    'extended',
    'marketing',
  ];

  for (const category of categories) {
    if (skillId.startsWith(category + '-')) {
      return category;
    }
  }

  // Check for other patterns
  if (skillId.includes('resume') || skillId.includes('interview') || skillId.includes('linkedin')) {
    return 'job-seeker';
  }
  if (skillId.includes('excel') || skillId.includes('data') || skillId.includes('chart')) {
    return 'excel';
  }
  if (skillId.includes('sales') || skillId.includes('proposal') || skillId.includes('customer')) {
    return 'sales';
  }
  if (skillId.includes('marketing') || skillId.includes('campaign') || skillId.includes('content')) {
    return 'marketing';
  }

  return 'default';
}

/**
 * Get time savings for a single skill (monthly hours)
 */
export function getSkillTimeSavings(skill: Skill | { id: string }): { min: number; max: number } {
  // Check for specific override
  if (SKILL_TIME_SAVINGS_OVERRIDES[skill.id]) {
    return SKILL_TIME_SAVINGS_OVERRIDES[skill.id];
  }

  // Fall back to category defaults
  const category = getCategoryFromSkillId(skill.id);
  return CATEGORY_TIME_SAVINGS[category] || CATEGORY_TIME_SAVINGS['default'];
}

/**
 * Get time savings for a workflow (monthly hours)
 */
export function getWorkflowTimeSavings(workflow: Workflow | { id: string }): { min: number; max: number } {
  if (WORKFLOW_TIME_SAVINGS[workflow.id]) {
    return WORKFLOW_TIME_SAVINGS[workflow.id];
  }
  return WORKFLOW_TIME_SAVINGS['default'];
}

/**
 * Calculate total time savings for a set of skills and workflows (monthly hours)
 */
export function calculateTotalTimeSavings(
  skills: (Skill | { id: string })[],
  workflows: (Workflow | { id: string })[]
): { minHours: number; maxHours: number; avgHours: number } {
  let minHours = 0;
  let maxHours = 0;

  // Add skill time savings
  for (const skill of skills) {
    const savings = getSkillTimeSavings(skill);
    minHours += savings.min;
    maxHours += savings.max;
  }

  // Add workflow time savings
  for (const workflow of workflows) {
    const savings = getWorkflowTimeSavings(workflow);
    minHours += savings.min;
    maxHours += savings.max;
  }

  return {
    minHours,
    maxHours,
    avgHours: (minHours + maxHours) / 2,
  };
}

/**
 * Calculate cost savings based on time savings and hourly rate
 */
export function calculateCostSavings(
  timeSavings: { minHours: number; maxHours: number },
  hourlyRate: number = 50
): { minCost: number; maxCost: number; avgCost: number } {
  return {
    minCost: timeSavings.minHours * hourlyRate,
    maxCost: timeSavings.maxHours * hourlyRate,
    avgCost: ((timeSavings.minHours + timeSavings.maxHours) / 2) * hourlyRate,
  };
}

/**
 * Format time savings as a string (e.g., "18-28 hrs")
 */
export function formatTimeSavings(savings: { minHours: number; maxHours: number }): string {
  if (savings.minHours === savings.maxHours) {
    return `${Math.round(savings.minHours)} hrs`;
  }
  return `${Math.round(savings.minHours)}-${Math.round(savings.maxHours)} hrs`;
}

/**
 * Format cost savings as a string (e.g., "$4,500-$11,200")
 */
export function formatCostSavings(savings: { minCost: number; maxCost: number }): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  if (savings.minCost === savings.maxCost) {
    return formatter.format(savings.minCost);
  }
  return `${formatter.format(savings.minCost)}-${formatter.format(savings.maxCost)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE ROI CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

export interface ROICalculation {
  // Monthly figures
  monthlyHours: { min: number; max: number; avg: number };
  monthlyCost: { min: number; max: number; avg: number };

  // Annualized figures
  annualHours: { min: number; max: number; avg: number };
  annualCost: { min: number; max: number; avg: number };

  // 5-year figures
  fiveYearCost: { min: number; max: number; avg: number };

  // FTE equivalent (based on 2080 hours/year)
  fteEquivalent: number;

  // Formatted strings for display
  formatted: {
    monthlyHours: string;
    monthlyCost: string;
    annualHours: string;
    annualCost: string;
    fiveYearCost: string;
  };

  // Skill and workflow counts
  skillCount: number;
  workflowCount: number;
}

/**
 * Calculate complete ROI for a set of skills and workflows
 *
 * @param skills - Array of selected skills
 * @param workflows - Array of selected workflows
 * @param hourlyRate - Assumed hourly rate for cost calculations (default: $50)
 */
export function calculateROI(
  skills: (Skill | { id: string })[],
  workflows: (Workflow | { id: string })[],
  hourlyRate: number = 50
): ROICalculation {
  // Calculate monthly time savings
  const timeSavings = calculateTotalTimeSavings(skills, workflows);

  // Calculate monthly cost savings
  const costSavings = calculateCostSavings(timeSavings, hourlyRate);

  // Annualize
  const annualHours = {
    min: timeSavings.minHours * 12,
    max: timeSavings.maxHours * 12,
    avg: timeSavings.avgHours * 12,
  };

  const annualCost = {
    min: costSavings.minCost * 12,
    max: costSavings.maxCost * 12,
    avg: costSavings.avgCost * 12,
  };

  // 5-year projection
  const fiveYearCost = {
    min: annualCost.min * 5,
    max: annualCost.max * 5,
    avg: annualCost.avg * 5,
  };

  // FTE equivalent (2080 hours per year)
  const fteEquivalent = annualHours.avg / 2080;

  // Format for display
  const formatted = {
    monthlyHours: formatTimeSavings(timeSavings),
    monthlyCost: formatCostSavings(costSavings),
    annualHours: formatTimeSavings(annualHours),
    annualCost: formatCostSavings(annualCost),
    fiveYearCost: formatCostSavings(fiveYearCost),
  };

  return {
    monthlyHours: timeSavings,
    monthlyCost: costSavings,
    annualHours,
    annualCost,
    fiveYearCost,
    fteEquivalent,
    formatted,
    skillCount: skills.length,
    workflowCount: workflows.length,
  };
}
