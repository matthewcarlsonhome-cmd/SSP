import type { AirTierId } from "../types";

export const TIER_DESCRIPTIONS: Record<
  AirTierId,
  { headline: string; summary: string; whatYouGet: string[]; whatYouDont: string[]; bestFor: string }
> = {
  air_snapshot: {
    headline: "AIR Snapshot",
    summary: "Your readiness score, from public data, in 48 hours.",
    whatYouGet: ["1-page AIR Score", "Five-domain breakdown", "3 prioritized quick wins"],
    whatYouDont: ["Stakeholder interviews", "CRM audit", "Workflow mapping", "90-day roadmap"],
    bestFor: "A first look to decide whether the full Audit is worth the time.",
  },
  air_audit: {
    headline: "AIR Audit",
    summary: "Full diagnostic and 90-day roadmap, delivered as a working document.",
    whatYouGet: ["Stakeholder interviews", "CRM audit", "Tool inventory", "Workflow swimlanes", "Opportunity matrix", "90-day roadmap"],
    whatYouDont: ["Implementation; that belongs in the Sprint."],
    bestFor: "Owners ready to commit to a serious diagnosis and a real plan.",
  },
  air_foundation_sprint: {
    headline: "Foundation Sprint",
    summary: "60-day engagement that fixes data and workflow before AI is layered on.",
    whatYouGet: ["CRM hygiene", "Workflow documentation", "One standardized workflow", "Automated weekly reporting", "AIR re-score"],
    whatYouDont: ["Major AI deployment before the foundation is ready."],
    bestFor: "Audit clients who scored 20-39 and want to get ready.",
  },
  air_transition_sprint: {
    headline: "Transition Sprint",
    summary: "90-day implementation. We install what the Audit recommended.",
    whatYouGet: ["Lead Hub setup", "MLH AI Employees", "3-5 custom automations", "Team training", "Day 60 and Day 90 re-scoring"],
    whatYouDont: ["Broad marketing strategy work as part of this module."],
    bestFor: "Clients in Foundation Strong or AI-Native Ready bands.",
  },
  air_operations: {
    headline: "AI Operations",
    summary: "Ongoing managed services for businesses past their Sprint.",
    whatYouGet: ["Monitoring", "Quarterly AIR re-scores", "Prompt tuning", "New automations", "Executive briefings"],
    whatYouDont: ["New full Audits unless separately scoped."],
    bestFor: "Post-Sprint clients who want to compound the gains.",
  },
};
