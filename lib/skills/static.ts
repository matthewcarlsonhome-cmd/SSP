/**
 * static.ts - Static AI Skill Definitions
 *
 * This file combines all skill categories into a single SKILLS export.
 * Skills are organized into modular category files for maintainability.
 *
 * SKILL CATEGORIES:
 * =================
 * 1. JOB SEEKER (16 skills) - ./job-seeker/
 *    Career assessment, resume optimization, interview prep
 *
 * 2. GOVERNANCE (8 skills) - ./governance/
 *    AI governance, compliance, policy management
 *
 * 3. EXCEL (5 skills) - ./excel/
 *    Spreadsheet analysis, data cleaning, visualization
 *
 * 4. ENTERPRISE (4 skills) - ./enterprise/
 *    Executive communication, contract review, automation
 *
 * 5. EXTENDED (20 skills) - ./extended/
 *    Advanced professional skills (Wave 1-5)
 *
 * 6. SALES (4 skills) - ./sales/
 *    Sales enablement, proposals, customer success
 *
 * 7. PRODUCT (4 skills) - ./product/
 *    Product management, strategy, OKRs
 *
 * 8. TECHNICAL (4 skills) - ./technical/
 *    Technical specs, postmortems, code review
 *
 * 9. HR (4 skills) - ./hr/
 *    HR operations, onboarding, performance
 *
 * 10. OPERATIONS (4 skills) - ./operations/
 *     SOPs, vendor management, policies
 *
 * 11. ACCOUNTING (6 skills) - ./accounting/
 *     Tax season optimization, engagement letters, audit workpapers,
 *     financial health summaries, year-end close, 1099/W-2 compliance
 *
 * 12. STAFFING (5 skills) - ./staffing/
 *     Candidate screening, client intake, market intelligence,
 *     placement prediction, pipeline dashboards
 *
 * 13. GOOGLE ADS (5 skills) - ./google-ads/
 *     Account auditing, search term analysis, client reporting,
 *     RSA ad copy generation, PMax asset management
 *
 * TOTAL: 89 skills
 *
 * ADDING NEW SKILLS:
 * ==================
 * 1. Add the skill to the appropriate category module
 * 2. Update the category's index.ts with the new skill ID
 * 3. The skill automatically appears in SKILLS export
 */

import { Skill } from '../../types';

// Import all skill category modules
import { JOB_SEEKER_SKILLS } from './job-seeker';
import { GOVERNANCE_SKILLS } from './governance';
import { EXCEL_SKILLS } from './excel';
import { ENTERPRISE_SKILLS } from './enterprise';
import { EXTENDED_SKILLS } from './extended';
import { SALES_SKILLS } from './sales';
import { PRODUCT_SKILLS } from './product';
import { TECHNICAL_SKILLS } from './technical';
import { HR_SKILLS } from './hr';
import { OPERATIONS_SKILLS } from './operations';
import { ACCOUNTING_SKILLS } from './accounting';
import { STAFFING_SKILLS } from './staffing';
import { GOOGLE_ADS_SKILLS } from './google-ads';

// ─────────────────────────────────────────────────────────────────────────────
// SKILLS EXPORT
// Combines all skill category modules into a single export
// ─────────────────────────────────────────────────────────────────────────────

export const SKILLS: Record<string, Skill> = {
  // Job Seeker Skills (16)
  ...JOB_SEEKER_SKILLS,

  // AI Governance & Compliance Skills (8)
  ...GOVERNANCE_SKILLS,

  // Excel & Analytics Skills (5)
  ...EXCEL_SKILLS,

  // Enterprise Skills (4)
  ...ENTERPRISE_SKILLS,

  // Extended/Wave Skills (20)
  ...EXTENDED_SKILLS,

  // Sales & Revenue Skills (4)
  ...SALES_SKILLS,

  // Product & Strategy Skills (4)
  ...PRODUCT_SKILLS,

  // Technical & Engineering Skills (4)
  ...TECHNICAL_SKILLS,

  // HR & People Operations Skills (4)
  ...HR_SKILLS,

  // Legal & Operations Skills (4)
  ...OPERATIONS_SKILLS,

  // CPA & Accounting Skills (6)
  ...ACCOUNTING_SKILLS,

  // Staffing & Recruiting Skills (5)
  ...STAFFING_SKILLS,

  // Google Ads / PPC Management Skills (5)
  ...GOOGLE_ADS_SKILLS,
};

// Re-export category modules for direct access if needed
export {
  JOB_SEEKER_SKILLS,
  GOVERNANCE_SKILLS,
  EXCEL_SKILLS,
  ENTERPRISE_SKILLS,
  EXTENDED_SKILLS,
  SALES_SKILLS,
  PRODUCT_SKILLS,
  TECHNICAL_SKILLS,
  HR_SKILLS,
  OPERATIONS_SKILLS,
  ACCOUNTING_SKILLS,
  STAFFING_SKILLS,
  GOOGLE_ADS_SKILLS,
};
