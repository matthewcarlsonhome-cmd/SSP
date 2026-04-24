/**
 * Hand-authored AgenticDAGs for the remaining five priority workflows:
 *   - sales-account-pursuit (SSP Tier 1 — sales)
 *   - customer-churn-prevention (SSP Tier 1 — book retention)
 *   - seo-client-onboarding (PoolMarketingSite Tier 2)
 *   - marketing-campaign (PoolMarketingSite Tier 2)
 *   - digital-marketing-audit (PoolMarketingSite Tier 2 — also see workflow id)
 *
 * Each declares:
 *   - dependsOn array per step (real dependency graph, not "chain by index")
 *   - outputContract on every step (structured fields downstream can consume)
 *   - contextRequirements on dependent steps (selective field passing)
 *
 * Skill ids are pulled directly from the existing workflow definitions in
 * lib/workflows/index.ts so these stay in sync without duplicating the
 * skill catalog.
 */

import type { AgenticDAG, AgenticStep, OutputContract } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Reusable contract fragments
// ─────────────────────────────────────────────────────────────────────────────

const SUMMARY_ONLY: OutputContract = {
  fields: [{ key: 'summary', format: 'text', required: true, description: 'One-paragraph summary of this step.' }],
};

// ─────────────────────────────────────────────────────────────────────────────
// Sales Account Pursuit
// Original: 6 sequential steps. Real shape: 3 rounds.
//   R1: account-intel
//   R2: discovery + objection + roi (all only need account intel)
//   R3: proposal + followup-strategy (proposal merges; followup needs proposal)
// ─────────────────────────────────────────────────────────────────────────────

const ACCOUNT_INTEL_CONTRACT: OutputContract = {
  fields: [
    { key: 'company_summary',   format: 'text',          required: true,  description: 'Company overview, size, industry.' },
    { key: 'pain_points',       format: 'json',          description: 'Identified pain points / opportunities.' },
    { key: 'stakeholder_map',   format: 'json',          description: 'Key contacts, roles, and influence.' },
    { key: 'recent_signals',    format: 'markdown-list', description: 'Recent news / signals worth referencing.' },
    { key: 'summary',           format: 'text',          required: true,  description: 'One-paragraph executive summary.' },
  ],
};

const SALES_ACCOUNT_PURSUIT_STEPS: AgenticStep[] = [
  {
    id: 'step-account-intel',
    skillId: 'sales-representative-target-account-intelligence-research',
    name: 'Account Intelligence',
    dependsOn: [],
    outputContract: ACCOUNT_INTEL_CONTRACT,
  },
  {
    id: 'step-discovery-framework',
    skillId: 'sales-representative-discovery-call-preparation',
    name: 'Discovery Call Framework',
    dependsOn: ['step-account-intel'],
    outputContract: {
      fields: [
        { key: 'questions',     format: 'json', required: true, description: 'Tailored discovery questions grouped by topic.' },
        { key: 'agenda',        format: 'markdown-list', description: 'Suggested call agenda.' },
        { key: 'summary',       format: 'text', description: 'Discovery framework summary.' },
      ],
    },
    contextRequirements: [
      { fromStep: 'step-account-intel', fields: ['company_summary', 'pain_points', 'stakeholder_map'] },
    ],
  },
  {
    id: 'step-objection-handling',
    skillId: 'sales-representative-sales-objection-mastery-playbook',
    name: 'Objection Handling Playbook',
    dependsOn: ['step-account-intel'],
    outputContract: {
      fields: [
        { key: 'objections',     format: 'json', required: true, description: 'Anticipated objections with responses.' },
        { key: 'summary',        format: 'text', description: 'Playbook summary.' },
      ],
    },
    contextRequirements: [
      { fromStep: 'step-account-intel', fields: ['pain_points', 'company_summary'] },
    ],
  },
  {
    id: 'step-roi-calculator',
    skillId: 'sales-representative-value-proposition-roi-calculator-generator',
    name: 'ROI Value Proposition',
    dependsOn: ['step-account-intel'],
    outputContract: {
      fields: [
        { key: 'roi_estimate',   format: 'text',          required: true, description: 'ROI calculation with assumptions.' },
        { key: 'value_pillars',  format: 'json',          description: 'Top value pillars to anchor the pitch.' },
        { key: 'summary',        format: 'text',          description: 'ROI summary.' },
      ],
    },
    contextRequirements: [
      { fromStep: 'step-account-intel', fields: ['pain_points', 'company_summary'] },
    ],
  },
  {
    id: 'step-proposal',
    skillId: 'sales-representative-enterprise-sales-proposal-generator',
    name: 'Sales Proposal',
    dependsOn: ['step-account-intel', 'step-roi-calculator', 'step-objection-handling'],
    outputContract: {
      fields: [
        { key: 'proposal_markdown', format: 'markdown-list', required: true, description: 'Full proposal in markdown.' },
        { key: 'summary',           format: 'text',          description: 'Proposal summary.' },
      ],
    },
    contextRequirements: [
      { fromStep: 'step-account-intel',     fields: ['company_summary', 'stakeholder_map'] },
      { fromStep: 'step-roi-calculator',    fields: ['roi_estimate', 'value_pillars'] },
      { fromStep: 'step-objection-handling',fields: ['objections'] },
    ],
  },
  {
    id: 'step-followup-strategy',
    skillId: 'sales-representative-deal-strategy-next-steps-planner',
    name: 'Follow-Up Strategy',
    dependsOn: ['step-discovery-framework', 'step-proposal'],
    outputContract: {
      fields: [
        { key: 'next_steps', format: 'markdown-list', required: true, description: 'Sequenced next-step plan.' },
        { key: 'summary',    format: 'text',          description: 'Follow-up strategy summary.' },
      ],
    },
    contextRequirements: [
      { fromStep: 'step-discovery-framework', fields: ['summary', 'agenda'] },
      { fromStep: 'step-proposal',            fields: ['summary'] },
    ],
  },
];

export const SALES_ACCOUNT_PURSUIT_DAG: AgenticDAG = {
  id: 'sales-account-pursuit',
  name: 'Sales Account Pursuit',
  description:
    'Hand-authored agentic version. Account intel runs first; discovery, objection, and ROI ' +
    'all run in parallel from intel; proposal merges them; follow-up uses discovery + proposal.',
  steps: SALES_ACCOUNT_PURSUIT_STEPS,
};

// ─────────────────────────────────────────────────────────────────────────────
// Customer Churn Prevention
// Original: 4 sequential steps. Real shape: 3 rounds.
//   R1: churn analysis
//   R2: escalation brief + retention playbook + win-back (all from analysis)
//   Note: original linear chain has retention depending on escalation; we
//   keep that hard dependency to preserve narrative coherence.
// ─────────────────────────────────────────────────────────────────────────────

const CHURN_ANALYSIS_CONTRACT: OutputContract = {
  fields: [
    { key: 'at_risk_accounts',   format: 'json', required: true, description: 'At-risk accounts with risk score and reason.' },
    { key: 'critical_count',     format: 'number', description: 'Number of critical accounts.' },
    { key: 'summary',            format: 'text', required: true, description: 'Churn analysis summary.' },
  ],
};

const CHURN_PREVENTION_STEPS: AgenticStep[] = [
  {
    id: 'step-churn-analysis',
    skillId: 'customer-success-manager-churn-risk-early-warning-system',
    name: 'Analyze Churn Risk',
    dependsOn: [],
    outputContract: CHURN_ANALYSIS_CONTRACT,
  },
  {
    id: 'step-escalation-brief',
    skillId: 'customer-success-manager-at-risk-account-escalation-brief',
    name: 'Executive Escalation Brief',
    dependsOn: ['step-churn-analysis'],
    outputContract: {
      fields: [
        { key: 'brief_markdown', format: 'markdown-list', required: true, description: 'Leadership-ready brief.' },
        { key: 'summary',        format: 'text',          description: 'Brief summary.' },
      ],
    },
    contextRequirements: [
      { fromStep: 'step-churn-analysis', fields: ['at_risk_accounts', 'summary'] },
    ],
    // Skip if no critical accounts surfaced.
    skipIf: { field: 'step-churn-analysis.critical_count', operator: 'equals', value: 0 },
  },
  {
    id: 'step-retention-playbook',
    skillId: 'customer-success-manager-renewal-playbook-generator',
    name: 'Retention Playbook',
    dependsOn: ['step-escalation-brief'],
    outputContract: {
      fields: [
        { key: 'playbook_markdown', format: 'markdown-list', required: true, description: 'Retention playbook.' },
        { key: 'summary',           format: 'text',          description: 'Playbook summary.' },
      ],
    },
    contextRequirements: [
      { fromStep: 'step-escalation-brief', fields: ['summary'] },
    ],
  },
  {
    id: 'step-winback-campaign',
    skillId: 'customer-success-manager-win-back-campaign-generator',
    name: 'Win-Back Campaign',
    dependsOn: ['step-churn-analysis'],
    outputContract: {
      fields: [
        { key: 'campaign_markdown', format: 'markdown-list', required: true, description: 'Win-back campaign content.' },
        { key: 'summary',           format: 'text',          description: 'Campaign summary.' },
      ],
    },
    contextRequirements: [
      { fromStep: 'step-churn-analysis', fields: ['at_risk_accounts', 'summary'] },
    ],
  },
];

export const CUSTOMER_CHURN_PREVENTION_DAG: AgenticDAG = {
  id: 'customer-churn-prevention',
  name: 'Customer Churn Prevention',
  description:
    'Hand-authored agentic version. Risk analysis first; escalation brief / retention playbook / ' +
    'win-back campaign branch in parallel. Skip escalation if no critical accounts.',
  steps: CHURN_PREVENTION_STEPS,
};

// ─────────────────────────────────────────────────────────────────────────────
// SEO/GEO Client Onboarding (PoolMarketingSite Tier 2)
// Original 6 sequential steps. Real shape: 3 rounds.
//   R1: technical audit (foundation)
//   R2: keyword research + AI search opt + competitive analysis (parallel)
//   R3: content priorities + content briefs (sequential merge)
// ─────────────────────────────────────────────────────────────────────────────

const SEO_ONBOARDING_STEPS: AgenticStep[] = [
  {
    id: 'step-technical-audit',
    skillId: 'seo-specialist-technical-seo-audit-checklist',
    name: 'Technical SEO Audit',
    dependsOn: [],
    outputContract: SUMMARY_ONLY,
  },
  {
    id: 'step-keyword-research',
    skillId: 'seo-specialist-keyword-research-strategy',
    name: 'Keyword Research',
    dependsOn: ['step-technical-audit'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [{ fromStep: 'step-technical-audit', fields: ['summary'] }],
  },
  {
    id: 'step-ai-search-optimization',
    skillId: 'seo-specialist-generative-engine-optimization',
    name: 'AI Search Optimization',
    dependsOn: ['step-technical-audit'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [{ fromStep: 'step-technical-audit', fields: ['summary'] }],
  },
  {
    id: 'step-competitive-analysis',
    skillId: 'seo-specialist-competitive-seo-analysis',
    name: 'Competitive SEO Analysis',
    dependsOn: ['step-technical-audit'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [{ fromStep: 'step-technical-audit', fields: ['summary'] }],
  },
  {
    id: 'step-content-priorities',
    skillId: 'seo-specialist-content-refresh-prioritization',
    name: 'Content Priorities',
    dependsOn: ['step-keyword-research', 'step-ai-search-optimization', 'step-competitive-analysis'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [
      { fromStep: 'step-keyword-research',       fields: ['summary'] },
      { fromStep: 'step-ai-search-optimization', fields: ['summary'] },
      { fromStep: 'step-competitive-analysis',   fields: ['summary'] },
    ],
  },
  {
    id: 'step-content-briefs',
    skillId: 'seo-specialist-seo-content-brief',
    name: 'Content Briefs',
    dependsOn: ['step-content-priorities'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [{ fromStep: 'step-content-priorities', fields: ['summary'] }],
  },
];

export const SEO_CLIENT_ONBOARDING_DAG: AgenticDAG = {
  id: 'seo-client-onboarding',
  name: 'SEO/GEO Client Onboarding',
  description:
    'Hand-authored agentic version. Technical audit first; keyword research, AI search opt, and ' +
    'competitive analysis run in parallel; content priorities merge then briefs.',
  steps: SEO_ONBOARDING_STEPS,
};

// ─────────────────────────────────────────────────────────────────────────────
// Marketing Campaign Launch
// Original 6 steps including competitive research → content strategy → calendar → social → email → ads
// Real shape: research first; strategy depends on it; calendar/social/email/ads can largely run in parallel from strategy.
// ─────────────────────────────────────────────────────────────────────────────

const MARKETING_CAMPAIGN_STEPS: AgenticStep[] = [
  {
    id: 'step-competitive-research',
    skillId: 'marketer-competitive-market-research',
    name: 'Competitive Research',
    dependsOn: [],
    outputContract: SUMMARY_ONLY,
  },
  {
    id: 'step-content-strategy',
    skillId: 'marketer-content-strategy-generator',
    name: 'Content Strategy',
    dependsOn: ['step-competitive-research'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [{ fromStep: 'step-competitive-research', fields: ['summary'] }],
  },
  {
    id: 'step-content-calendar',
    skillId: 'marketer-content-calendar-builder',
    name: 'Content Calendar',
    dependsOn: ['step-content-strategy'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [{ fromStep: 'step-content-strategy', fields: ['summary'] }],
  },
  {
    id: 'step-social-content',
    skillId: 'marketer-social-media-content-generator',
    name: 'Social Media Content',
    dependsOn: ['step-content-strategy'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [{ fromStep: 'step-content-strategy', fields: ['summary'] }],
  },
  {
    id: 'step-email-sequences',
    skillId: 'marketer-email-marketing-campaigns',
    name: 'Email Sequences',
    dependsOn: ['step-content-strategy'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [{ fromStep: 'step-content-strategy', fields: ['summary'] }],
  },
  {
    id: 'step-ad-campaigns',
    skillId: 'marketer-paid-media-campaign-builder',
    name: 'Ad Campaigns',
    dependsOn: ['step-content-strategy'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [{ fromStep: 'step-content-strategy', fields: ['summary'] }],
  },
];

export const MARKETING_CAMPAIGN_DAG: AgenticDAG = {
  id: 'marketing-campaign',
  name: 'Marketing Campaign Launch',
  description:
    'Hand-authored agentic version. Competitive research → content strategy → ' +
    'calendar / social / email / ads all in parallel from strategy.',
  steps: MARKETING_CAMPAIGN_STEPS,
};

// ─────────────────────────────────────────────────────────────────────────────
// Digital Marketing Audit
// Original linear; real shape: discovery sets context → 4 audit areas (SEO,
// paid, social, automation) all run in parallel → recommendations merge.
// Workflow id in the registry: digital-marketing-audit (in professional.ts).
// ─────────────────────────────────────────────────────────────────────────────

const DIGITAL_AUDIT_STEPS: AgenticStep[] = [
  {
    id: 'step-discovery',
    skillId: 'digital-marketing-audit-discovery',
    name: 'Discovery',
    dependsOn: [],
    outputContract: SUMMARY_ONLY,
  },
  {
    id: 'step-seo-audit',
    skillId: 'seo-specialist-technical-seo-audit-checklist',
    name: 'SEO Audit',
    dependsOn: ['step-discovery'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [{ fromStep: 'step-discovery', fields: ['summary'] }],
  },
  {
    id: 'step-paid-audit',
    skillId: 'ppc-recommendations-audit',
    name: 'Paid Media Audit',
    dependsOn: ['step-discovery'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [{ fromStep: 'step-discovery', fields: ['summary'] }],
  },
  {
    id: 'step-social-audit',
    skillId: 'marketer-social-media-content-generator',
    name: 'Social Media Audit',
    dependsOn: ['step-discovery'],
    outputContract: SUMMARY_ONLY,
    contextRequirements: [{ fromStep: 'step-discovery', fields: ['summary'] }],
  },
  {
    id: 'step-recommendations',
    skillId: 'marketer-content-strategy-generator',
    name: 'Synthesized Recommendations',
    dependsOn: ['step-seo-audit', 'step-paid-audit', 'step-social-audit'],
    outputContract: {
      fields: [
        { key: 'priorities',  format: 'markdown-list', required: true, description: 'Prioritized recommendations.' },
        { key: 'summary',     format: 'text',          description: 'Recommendations summary.' },
      ],
    },
    contextRequirements: [
      { fromStep: 'step-seo-audit',    fields: ['summary'] },
      { fromStep: 'step-paid-audit',   fields: ['summary'] },
      { fromStep: 'step-social-audit', fields: ['summary'] },
    ],
  },
];

export const DIGITAL_MARKETING_AUDIT_DAG: AgenticDAG = {
  id: 'digital-marketing-audit',
  name: 'Digital Marketing Audit',
  description:
    'Hand-authored agentic version. Discovery → 3 audit areas in parallel → recommendations merge. ' +
    'Skill ids may need updating once the actual audit-specific skills are registered.',
  steps: DIGITAL_AUDIT_STEPS,
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry — keys match the workflow ids in lib/workflows so HAND_AUTHORED_DAGS
// is a unified lookup the runner uses to prefer hand-authored over inferred.
// ─────────────────────────────────────────────────────────────────────────────

export const TIER_2_HAND_AUTHORED_DAGS: Record<string, AgenticDAG> = {
  [SALES_ACCOUNT_PURSUIT_DAG.id]:      SALES_ACCOUNT_PURSUIT_DAG,
  [CUSTOMER_CHURN_PREVENTION_DAG.id]:  CUSTOMER_CHURN_PREVENTION_DAG,
  [SEO_CLIENT_ONBOARDING_DAG.id]:      SEO_CLIENT_ONBOARDING_DAG,
  [MARKETING_CAMPAIGN_DAG.id]:         MARKETING_CAMPAIGN_DAG,
  [DIGITAL_MARKETING_AUDIT_DAG.id]:    DIGITAL_MARKETING_AUDIT_DAG,
};
