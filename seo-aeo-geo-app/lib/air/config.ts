import type { AirBand, AirDomain, AirTierId } from "./types";

export const AIR_SCORE_VERSION = "1.0";

export const AIR_DOMAINS: Record<AirDomain, { label: string; order: number }> = {
  team_readiness: { label: "Team Readiness", order: 1 },
  data_foundation: { label: "Data Foundation", order: 2 },
  workflow_maturity: { label: "Workflow Maturity", order: 3 },
  stack_coherence: { label: "Stack Coherence", order: 4 },
  opportunity_density: { label: "Opportunity Density", order: 5 },
};

export const AIR_BANDS: Record<
  AirBand,
  {
    label: string;
    scoreMin: number;
    scoreMax: number;
    recommendedTier: AirTierId;
    shortRec: string;
  }
> = {
  ai_native_ready: {
    label: "AI-Native Ready",
    scoreMin: 80,
    scoreMax: 100,
    recommendedTier: "air_transition_sprint",
    shortRec: "Transition Sprint + AI Operations",
  },
  foundation_strong: {
    label: "Foundation Strong",
    scoreMin: 60,
    scoreMax: 79,
    recommendedTier: "air_transition_sprint",
    shortRec: "Standard Transition Sprint",
  },
  catch_up: {
    label: "Catch-Up Phase",
    scoreMin: 40,
    scoreMax: 59,
    recommendedTier: "air_transition_sprint",
    shortRec: "Scoped Sprint, foundations first",
  },
  stabilization_first: {
    label: "Stabilization First",
    scoreMin: 20,
    scoreMax: 39,
    recommendedTier: "air_foundation_sprint",
    shortRec: "Foundation Sprint ($12.5K-$18K)",
  },
  pre_ai: {
    label: "Pre-AI",
    scoreMin: 0,
    scoreMax: 19,
    recommendedTier: "air_audit",
    shortRec: "Refuse engagement. Refer out.",
  },
};

export const AIR_TIER_CONFIGS: Array<{
  id: AirTierId;
  displayName: string;
  priceDisplay: string;
  durationLabel: string;
  description: string;
  deliverableKind: string;
  requiresIntake: boolean;
  isPublic: boolean;
}> = [
  {
    id: "air_snapshot",
    displayName: "AIR Snapshot",
    priceDisplay: "Free",
    durationLabel: "48 hours",
    description: "Public-data readiness score with three fast, practical quick wins.",
    deliverableKind: "snapshot",
    requiresIntake: false,
    isPublic: true,
  },
  {
    id: "air_audit",
    displayName: "AIR Audit",
    priceDisplay: "$7,500",
    durationLabel: "30 days",
    description: "Full intake, stakeholder interviews, CRM/tool audit, opportunity matrix, and 90-day roadmap.",
    deliverableKind: "audit",
    requiresIntake: true,
    isPublic: false,
  },
  {
    id: "air_foundation_sprint",
    displayName: "Foundation Sprint",
    priceDisplay: "$12,500-$18,000",
    durationLabel: "60 days",
    description: "Data hygiene, workflow documentation, and one standardized workflow before heavier AI work.",
    deliverableKind: "foundation_sprint",
    requiresIntake: true,
    isPublic: false,
  },
  {
    id: "air_transition_sprint",
    displayName: "Transition Sprint",
    priceDisplay: "$25,000-$50,000",
    durationLabel: "90 days",
    description: "Implementation sprint for clients ready to install the highest-value AI workflows.",
    deliverableKind: "transition_sprint",
    requiresIntake: true,
    isPublic: false,
  },
  {
    id: "air_operations",
    displayName: "AI Operations",
    priceDisplay: "$2,000-$5,000/mo",
    durationLabel: "Ongoing",
    description: "Quarterly re-scoring, optimization, new automations, and executive briefings.",
    deliverableKind: "operations",
    requiresIntake: true,
    isPublic: false,
  },
];

export const airTokens = {
  charcoal: "#1C1C1A",
  charcoalDeep: "#0F0F0E",
  sand: "#F4F1EA",
  sandLight: "#FAF7F0",
  gold: "#C5BE9F",
  goldDeep: "#A89766",
  forest: "#2D5F3F",
  amber: "#C49B3F",
  rust: "#A8423B",
  textDark: "#1C1C1A",
  textMuted: "#6B6B66",
  textLight: "#D9D5C8",
  border: "#E8E4DA",
};

export function bandForScore(score: number): AirBand {
  if (score >= 80) return "ai_native_ready";
  if (score >= 60) return "foundation_strong";
  if (score >= 40) return "catch_up";
  if (score >= 20) return "stabilization_first";
  return "pre_ai";
}
