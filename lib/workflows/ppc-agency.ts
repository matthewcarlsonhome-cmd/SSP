/**
 * PPC Agency Workflows
 *
 * Master weekly workflow combining all 7 PPC agency skills into
 * a single end-to-end Monday-through-Friday operating cadence
 * for managing 45+ Google Ads accounts at SSP agency.
 *
 * SKILLS REFERENCED:
 * - ppc-weekly-triage
 * - ppc-search-terms-negatives
 * - ppc-recommendations-audit
 * - ppc-deliverables-generator
 * - ppc-pmax-hygiene-auditor
 * - ppc-looker-studio-setup
 * - ppc-ads-scripts-manager
 */

import type { Workflow } from '../storage/types';

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW: PPC MASTER WEEKLY WORKFLOW
// Monday Triage → Recommendations Audit → Search Terms → PMax Hygiene →
// Client Deliverables → Dashboard Updates → Documentation
// ═══════════════════════════════════════════════════════════════════════════

const PPC_MASTER_WEEKLY_WORKFLOW: Workflow = {
  id: 'ppc-master-weekly-workflow',
  name: 'PPC Master Weekly Workflow',
  description: 'Complete Monday-to-Friday operating cadence for managing 45+ Google Ads accounts at scale',
  longDescription: 'This workflow walks you through the entire weekly PPC management cycle for an agency managing 45+ pool/spa Google Ads accounts. Start with Monday triage (anomaly alerts → priority matrix → deep-dives), move through recommendations audit and search term review, audit PMax assets, generate client deliverables for upcoming calls, and close the week with documentation. Each step feeds into the next — triage findings inform search term review, which informs deliverables, which informs client call prep. Built for the SSP agency cadence: Monday triage, Tue-Thu execute, Friday document.',
  icon: 'Workflow',
  color: 'orange',
  estimatedTime: '25-35 minutes',

  outputs: [
    'Prioritized Account Triage (P1/P2/P3)',
    'Recommendations Audit with Accept/Reject Decisions',
    'Search Terms & Negatives Summary',
    'PMax Asset Hygiene Notes',
    'Client Reporting Narratives (4-part framework)',
    'Weekly Change Log',
    'Dashboard Configuration Guidance',
  ],

  globalInputs: [
    {
      id: 'alertEmails',
      label: 'Script Alert Emails (Monday)',
      type: 'textarea',
      placeholder: 'Paste your Monday morning anomaly alert + budget pacing emails here',
      required: true,
    },
    {
      id: 'accountCount',
      label: 'Active Account Count',
      type: 'text',
      placeholder: 'e.g., 47',
      required: true,
    },
    {
      id: 'seasonalContext',
      label: 'Current Season',
      type: 'select',
      options: ['Peak Season (Spring/Summer)', 'Shoulder Season (Fall)', 'Off-Season (Winter)', 'Ramping (Pre-Season)'],
      required: true,
    },
    {
      id: 'clientCallsThisWeek',
      label: 'Client Calls This Week',
      type: 'textarea',
      placeholder: 'List upcoming client calls with dates/times:\nTuesday 10am: Client Name\nWednesday 2pm: Client Name',
      required: true,
    },
    {
      id: 'searchTermsData',
      label: 'Search Terms Report Data',
      type: 'textarea',
      placeholder: 'Paste search terms data from Google Ads or Script 3 waste scanner email (for search term review step)',
      required: false,
    },
    {
      id: 'recommendationsData',
      label: 'Recommendations Audit Data',
      type: 'textarea',
      placeholder: 'Paste from Script 7 recommendations audit email or Google Ads recommendations (for recommendations step)',
      required: false,
    },
    {
      id: 'pmaxAccountName',
      label: 'PMax Account to Audit',
      type: 'text',
      placeholder: 'e.g., Bluewater Custom Pools - Dallas',
      required: false,
    },
    {
      id: 'pmaxAssetData',
      label: 'PMax Asset Group Data',
      type: 'textarea',
      placeholder: 'Asset groups, performance ratings, audience signals for PMax audit step',
      required: false,
    },
    {
      id: 'clientReportData',
      label: 'Client Report Performance Data',
      type: 'textarea',
      placeholder: 'MTD vs prior month metrics for client reporting step:\nLeads: X vs Y\nCPL: $X vs $Y\nSpend: $X vs $Y',
      required: false,
    },
    {
      id: 'changesThisPeriod',
      label: 'Changes Made This Period',
      type: 'textarea',
      placeholder: 'Account changes for documentation: negatives added, bids adjusted, ads paused, extensions added, etc.',
      required: false,
    },
  ],

  steps: [
    // Step 1: Monday Morning Triage
    {
      id: 'step-1-triage',
      skillId: 'ppc-weekly-triage',
      name: 'Monday Triage & Prioritization',
      description: 'Review anomaly alerts, budget pacing, and dashboard flags to build P1/P2/P3 priority matrix',
      inputMappings: {
        alertEmails: { type: 'global', globalInputId: 'alertEmails' },
        dashboardFlags: { type: 'static', value: 'Review Looker Studio Portfolio Overview for visual flags not caught by scripts. Note any gradual 3-week trends, seasonal transitions, and accounts with upcoming client calls.' },
        accountCount: { type: 'global', globalInputId: 'accountCount' },
        seasonalContext: { type: 'global', globalInputId: 'seasonalContext' },
        upcomingClientCalls: { type: 'global', globalInputId: 'clientCallsThisWeek' },
        additionalContext: { type: 'static', value: 'This is the Monday triage step of the PPC Master Weekly Workflow. Output the ranked priority list and deep-dive findings for P1 accounts.' },
      },
    },
    // Step 2: Recommendations Audit
    {
      id: 'step-2-recommendations',
      skillId: 'ppc-recommendations-audit',
      name: 'Recommendations Audit & Scoring',
      description: 'Score and triage Google Ads recommendations across the portfolio with accept/reject guidance',
      inputMappings: {
        recommendationsData: { type: 'global', globalInputId: 'recommendationsData' },
        accountName: { type: 'static', value: 'SSP MCC Portfolio' },
        conversionVolume: { type: 'static', value: '30-50/mo' },
        trackingHealth: { type: 'static', value: 'Clean and verified' },
        currentBidStrategy: { type: 'static', value: 'Mixed' },
        additionalContext: { type: 'previous', stepId: 'step-1-triage', field: 'summary' },
      },
    },
    // Step 3: Search Terms & Negatives Review
    {
      id: 'step-3-search-terms',
      skillId: 'ppc-search-terms-negatives',
      name: 'Search Terms & Negatives Review',
      description: 'Review search terms, identify waste, add negatives, and generate the biweekly summary',
      inputMappings: {
        searchTermsData: { type: 'global', globalInputId: 'searchTermsData' },
        accountsReviewed: { type: 'static', value: 'Top 12 highest-spend accounts' },
        dateRange: { type: 'computed', expression: 'Last 14 days' },
        existingNegativeThemes: { type: 'static', value: 'Current MCC negatives: pool table, billiard, inflatable, kiddie, above ground, public pool, ymca, carpool, pool noodle, pool float, day spa, massage, beauty spa, diy, how to, build your own, pool jobs, careers, hiring' },
        industryVertical: { type: 'static', value: 'Pool/Spa Construction' },
        additionalContext: { type: 'previous', stepId: 'step-1-triage', field: 'summary' },
      },
    },
    // Step 4: PMax Asset Hygiene Audit
    {
      id: 'step-4-pmax',
      skillId: 'ppc-pmax-hygiene-auditor',
      name: 'PMax Asset Hygiene Audit',
      description: 'Audit PMax asset groups, prune underperformers, update audience signals, check for Search cannibalization',
      inputMappings: {
        accountName: { type: 'global', globalInputId: 'pmaxAccountName' },
        assetGroupData: { type: 'global', globalInputId: 'pmaxAssetData' },
        audienceSignals: { type: 'static', value: 'Review current audience signals and recommend updates based on this week\'s triage findings.' },
        urlExclusions: { type: 'static', value: 'Verify: /about, /team, /careers, /blog, /thank-you excluded. Check for any new pages that should be excluded.' },
        searchCampaignData: { type: 'static', value: 'Compare Search brand impression share and non-brand CPL pre/post PMax launch to detect cannibalization.' },
        conversionActions: { type: 'static', value: 'Primary: Form Submission, Phone Call 60s+. Verify PMax optimizing for correct conversion actions.' },
        additionalContext: { type: 'previous', stepId: 'step-1-triage', field: 'summary' },
      },
    },
    // Step 5: Client Report Narratives
    {
      id: 'step-5-deliverables',
      skillId: 'ppc-deliverables-generator',
      name: 'Client Report Narratives & Call Prep',
      description: 'Generate reporting draft queue with 4-part narratives for upcoming client calls',
      inputMappings: {
        deliverableType: { type: 'static', value: 'Reporting Draft Queue' },
        accountData: { type: 'global', globalInputId: 'clientCallsThisWeek' },
        performanceMetrics: { type: 'global', globalInputId: 'clientReportData' },
        changesThisPeriod: { type: 'global', globalInputId: 'changesThisPeriod' },
        clientName: { type: 'static', value: 'Multiple clients (see calls list)' },
        callDate: { type: 'static', value: 'This week' },
        additionalContext: { type: 'previous', stepId: 'step-1-triage', field: 'summary' },
      },
    },
    // Step 6: Dashboard & Reporting Check
    {
      id: 'step-6-dashboard',
      skillId: 'ppc-looker-studio-setup',
      name: 'Dashboard Review & Updates',
      description: 'Review Looker Studio portfolio dashboard, update conditional formatting thresholds, generate client report exports',
      inputMappings: {
        dashboardType: { type: 'static', value: 'Both' },
        dataSourceInfo: { type: 'static', value: 'Google Ads MCC connected. Review data freshness and any discrepancies flagged during triage.' },
        metricsNeeded: { type: 'static', value: 'Update CPL baseline thresholds for conditional formatting based on this week\'s triage findings. Prepare client report PDFs for upcoming calls.' },
        clientName: { type: 'static', value: 'Portfolio-wide review' },
        reportingPeriod: { type: 'static', value: 'Weekly' },
        knownIssues: { type: 'previous', stepId: 'step-1-triage', field: 'summary' },
        additionalContext: { type: 'static', value: 'This is the Friday dashboard review step. Update any threshold values that need seasonal adjustment.' },
      },
    },
    // Step 7: Weekly Documentation
    {
      id: 'step-7-change-log',
      skillId: 'ppc-deliverables-generator',
      name: 'Weekly Change Log & Documentation',
      description: 'Generate the Account Change Log summarizing all changes made this week',
      inputMappings: {
        deliverableType: { type: 'static', value: 'Account Change Log' },
        accountData: { type: 'static', value: 'Portfolio-wide changes this week' },
        performanceMetrics: { type: 'global', globalInputId: 'clientReportData' },
        changesThisPeriod: { type: 'global', globalInputId: 'changesThisPeriod' },
        clientName: { type: 'static', value: 'All accounts' },
        callDate: { type: 'static', value: '' },
        additionalContext: { type: 'previous', stepId: 'step-3-search-terms', field: 'summary' },
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const PPC_AGENCY_WORKFLOWS: Record<string, Workflow> = {
  'ppc-master-weekly-workflow': PPC_MASTER_WEEKLY_WORKFLOW,
};
