/**
 * Output contracts and skip rules for the PPC Master Weekly workflow.
 *
 * The original workflow definition in lib/workflows/ppc-agency.ts is read
 * unmodified. This file enriches it: it declares which structured fields
 * each step produces, which fields downstream steps need from upstream
 * outputs, and which steps can be skipped based on prior findings.
 *
 * The result is a pure AgenticDAG with explicit dependencies, contracts,
 * and skip rules — the production-grade form of the inferred DAG that
 * adaptWorkflowToDAG generates automatically.
 */

import type { AgenticDAG, AgenticStep, OutputContract } from '../types';

const TRIAGE_CONTRACT: OutputContract = {
  fields: [
    { key: 'p1_accounts',  format: 'json',          required: true,  description: 'Array of P1 (highest priority) accounts with reason and recommended action.' },
    { key: 'p2_accounts',  format: 'json',          description: 'Array of P2 (medium priority) accounts.' },
    { key: 'p3_accounts',  format: 'json',          description: 'Array of P3 (low priority / monitor) accounts.' },
    { key: 'anomalies',    format: 'markdown-list', description: 'Notable week-over-week anomalies detected across the portfolio.' },
    { key: 'summary',      format: 'text',          description: 'One-paragraph executive summary of triage findings.' },
  ],
};

const RECOMMENDATIONS_CONTRACT: OutputContract = {
  fields: [
    { key: 'accept',  format: 'json', required: true, description: 'Recommendations to accept, with rationale.' },
    { key: 'reject',  format: 'json', required: true, description: 'Recommendations to reject, with rationale.' },
    { key: 'defer',   format: 'json', description: 'Recommendations to revisit later.' },
    { key: 'summary', format: 'text', description: 'Audit summary, one paragraph.' },
  ],
};

const SEARCH_TERMS_CONTRACT: OutputContract = {
  fields: [
    { key: 'new_negatives',         format: 'json', description: 'Negative keywords to add, grouped by account.' },
    { key: 'wasted_spend_estimate', format: 'number', description: 'Estimated weekly wasted spend in dollars from waste detected.' },
    { key: 'queries_reviewed',      format: 'number', description: 'Number of search queries reviewed.' },
    { key: 'summary',               format: 'text', description: 'Search-terms review summary.' },
  ],
};

const PMAX_CONTRACT: OutputContract = {
  fields: [
    { key: 'underperforming_assets', format: 'json', description: 'Assets to pause / replace.' },
    { key: 'audience_signals',       format: 'json', description: 'Audience-signal updates recommended.' },
    { key: 'cannibalization_risk',   format: 'text', description: 'Search cannibalization risk assessment.' },
    { key: 'summary',                format: 'text', description: 'PMax audit summary.' },
  ],
};

const DELIVERABLES_CONTRACT: OutputContract = {
  fields: [
    { key: 'narratives',     format: 'json', required: true, description: 'Per-client 4-part narratives ready for client calls.' },
    { key: 'open_questions', format: 'json', description: 'Questions that need stakeholder input before sending.' },
    { key: 'summary',        format: 'text', description: 'Deliverables status summary.' },
  ],
};

const DASHBOARD_CONTRACT: OutputContract = {
  fields: [
    { key: 'threshold_changes', format: 'json', description: 'Conditional-formatting threshold updates.' },
    { key: 'data_issues',       format: 'markdown-list', description: 'Data freshness / quality issues to address.' },
    { key: 'summary',           format: 'text', description: 'Dashboard review summary.' },
  ],
};

const CHANGE_LOG_CONTRACT: OutputContract = {
  fields: [
    { key: 'change_log_markdown', format: 'markdown-list', required: true, description: 'Final change-log markdown for the period.' },
    { key: 'summary',             format: 'text', description: 'Period-end summary.' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// The hand-authored agentic DAG. Mirrors the existing workflow's step ids so
// runs are directly comparable in the side-by-side view.
// ─────────────────────────────────────────────────────────────────────────────

const STEPS: AgenticStep[] = [
  {
    id: 'step-1-triage',
    skillId: 'ppc-weekly-triage',
    name: 'Monday Triage & Prioritization',
    description: 'Build P1/P2/P3 priority matrix from anomaly alerts + dashboard flags.',
    dependsOn: [],
    outputContract: TRIAGE_CONTRACT,
  },
  {
    id: 'step-2-recommendations',
    skillId: 'ppc-recommendations-audit',
    name: 'Recommendations Audit & Scoring',
    description: 'Score Google Ads recommendations across the portfolio.',
    dependsOn: ['step-1-triage'],
    outputContract: RECOMMENDATIONS_CONTRACT,
    contextRequirements: [
      { fromStep: 'step-1-triage', fields: ['p1_accounts', 'summary'] },
    ],
  },
  {
    id: 'step-3-search-terms',
    skillId: 'ppc-search-terms-negatives',
    name: 'Search Terms & Negatives Review',
    description: 'Review search terms, identify waste, add negatives.',
    dependsOn: ['step-1-triage'],
    outputContract: SEARCH_TERMS_CONTRACT,
    contextRequirements: [
      { fromStep: 'step-1-triage', fields: ['p1_accounts', 'summary'] },
    ],
    // Skip if there are no P1 accounts and no upcoming client calls — no
    // urgency to do a fresh review this week.
    skipIf: { field: 'step-1-triage.p1_accounts', operator: 'notExists' },
  },
  {
    id: 'step-4-pmax',
    skillId: 'ppc-pmax-hygiene-auditor',
    name: 'PMax Asset Hygiene Audit',
    description: 'Audit PMax asset groups, prune underperformers, check for cannibalization.',
    dependsOn: ['step-1-triage'],
    outputContract: PMAX_CONTRACT,
    contextRequirements: [
      { fromStep: 'step-1-triage', fields: ['p1_accounts', 'anomalies'] },
    ],
  },
  {
    id: 'step-5-deliverables',
    skillId: 'ppc-deliverables-generator',
    name: 'Client Report Narratives & Call Prep',
    description: 'Generate 4-part narratives for upcoming client calls.',
    // Real merge point — needs the prioritized list, the recommendations
    // outcomes, the search-term findings, AND the PMax notes to produce
    // narratives that hold up.
    dependsOn: ['step-1-triage', 'step-2-recommendations', 'step-3-search-terms', 'step-4-pmax'],
    outputContract: DELIVERABLES_CONTRACT,
    contextRequirements: [
      { fromStep: 'step-1-triage',          fields: ['p1_accounts'] },
      { fromStep: 'step-2-recommendations', fields: ['accept', 'reject', 'summary'] },
      { fromStep: 'step-3-search-terms',    fields: ['summary', 'new_negatives'] },
      { fromStep: 'step-4-pmax',            fields: ['summary', 'underperforming_assets'] },
    ],
  },
  {
    id: 'step-6-dashboard',
    skillId: 'ppc-looker-studio-setup',
    name: 'Dashboard Review & Updates',
    description: 'Review portfolio dashboard, update thresholds, prepare client report exports.',
    // Only needs Triage — runs fully in parallel with steps 2-5.
    dependsOn: ['step-1-triage'],
    outputContract: DASHBOARD_CONTRACT,
    contextRequirements: [
      { fromStep: 'step-1-triage', fields: ['summary', 'anomalies'] },
    ],
  },
  {
    id: 'step-7-change-log',
    skillId: 'ppc-deliverables-generator',
    name: 'Weekly Change Log & Documentation',
    description: 'Generate the Account Change Log summarizing this week\'s changes.',
    dependsOn: ['step-3-search-terms', 'step-5-deliverables'],
    outputContract: CHANGE_LOG_CONTRACT,
    contextRequirements: [
      { fromStep: 'step-3-search-terms', fields: ['new_negatives', 'summary'] },
      { fromStep: 'step-5-deliverables', fields: ['summary'] },
    ],
  },
];

export const PPC_MASTER_WEEKLY_DAG: AgenticDAG = {
  id: 'ppc-master-weekly-workflow',
  name: 'PPC Master Weekly Workflow',
  description:
    'Hand-authored agentic version of the SSP Monday-to-Friday operating cadence. ' +
    'Same skills as the existing linear workflow, regrouped into a parallel DAG ' +
    'with structured outputs and selective context handoff.',
  steps: STEPS,
};

/**
 * Registry of hand-authored agentic DAGs. As more workflows are upgraded from
 * inferred-only to fully authored contracts, register them here.
 */
export const HAND_AUTHORED_DAGS: Record<string, AgenticDAG> = {
  'ppc-master-weekly-workflow': PPC_MASTER_WEEKLY_DAG,
};
