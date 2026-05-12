import type { AirDomain } from "../types";

export interface SubDimensionDef {
  key: string;
  label: string;
  description: string;
  snapshotScoreable: boolean;
  defaultSnapshotScore: number;
}

export const AIR_SUB_DIMENSIONS: Record<AirDomain, SubDimensionDef[]> = {
  team_readiness: [
    {
      key: "leadership_buy_in",
      label: "Leadership buy-in",
      description: "Owner championing and budget allocated.",
      snapshotScoreable: false,
      defaultSnapshotScore: 2.5,
    },
    {
      key: "curiosity_openness",
      label: "Curiosity and openness",
      description: "Team requests new tools instead of resisting them.",
      snapshotScoreable: false,
      defaultSnapshotScore: 2.5,
    },
    {
      key: "capability_baseline",
      label: "Capability baseline",
      description: "Comfort using existing tools well.",
      snapshotScoreable: false,
      defaultSnapshotScore: 2.5,
    },
    {
      key: "change_tolerance",
      label: "Change tolerance",
      description: "History of adopting new processes successfully.",
      snapshotScoreable: false,
      defaultSnapshotScore: 2.5,
    },
  ],
  data_foundation: [
    {
      key: "crm_completeness",
      label: "CRM completeness",
      description: "Customers captured, deduplicated, and structured.",
      snapshotScoreable: false,
      defaultSnapshotScore: 2.5,
    },
    {
      key: "attribution_clarity",
      label: "Attribution clarity",
      description: "Lead source tracked accurately.",
      snapshotScoreable: true,
      defaultSnapshotScore: 2.5,
    },
    {
      key: "reporting_infrastructure",
      label: "Reporting infrastructure",
      description: "Automated dashboards instead of manual pulls.",
      snapshotScoreable: true,
      defaultSnapshotScore: 2.5,
    },
    {
      key: "data_accessibility",
      label: "Data accessibility",
      description: "Integrated single source of truth.",
      snapshotScoreable: false,
      defaultSnapshotScore: 2.5,
    },
  ],
  workflow_maturity: [
    {
      key: "documentation",
      label: "Documentation",
      description: "SOPs exist and are current.",
      snapshotScoreable: false,
      defaultSnapshotScore: 2.5,
    },
    {
      key: "standardization",
      label: "Standardization",
      description: "Common patterns instead of constant exceptions.",
      snapshotScoreable: false,
      defaultSnapshotScore: 2.5,
    },
    {
      key: "handoff_clarity",
      label: "Handoff clarity",
      description: "Crisp ownership at handoffs.",
      snapshotScoreable: false,
      defaultSnapshotScore: 2.5,
    },
    {
      key: "friction_visibility",
      label: "Friction visibility",
      description: "Bottlenecks are known and measured.",
      snapshotScoreable: true,
      defaultSnapshotScore: 2.5,
    },
  ],
  stack_coherence: [
    {
      key: "sprawl",
      label: "Sprawl",
      description: "Number of tools compared with tools actually used.",
      snapshotScoreable: true,
      defaultSnapshotScore: 2.5,
    },
    {
      key: "integration",
      label: "Integration",
      description: "Tools talk to each other.",
      snapshotScoreable: true,
      defaultSnapshotScore: 2.5,
    },
    {
      key: "redundancy",
      label: "Redundancy",
      description: "Multiple tools doing the same job.",
      snapshotScoreable: false,
      defaultSnapshotScore: 2.5,
    },
    {
      key: "cost_coherence",
      label: "Cost coherence",
      description: "Stack spend is known and aligned to value.",
      snapshotScoreable: false,
      defaultSnapshotScore: 2.5,
    },
  ],
  opportunity_density: [
    {
      key: "repetitive_task_volume",
      label: "Repetitive task volume",
      description: "High volume of repeatable work.",
      snapshotScoreable: true,
      defaultSnapshotScore: 3,
    },
    {
      key: "response_time_sensitivity",
      label: "Response-time sensitivity",
      description: "Speed-to-lead is critical to conversion.",
      snapshotScoreable: true,
      defaultSnapshotScore: 3.5,
    },
    {
      key: "content_production_need",
      label: "Content production need",
      description: "High volume across channels.",
      snapshotScoreable: true,
      defaultSnapshotScore: 3,
    },
    {
      key: "customer_interaction_vol",
      label: "Customer interaction volume",
      description: "High inbound customer interaction volume.",
      snapshotScoreable: true,
      defaultSnapshotScore: 3,
    },
  ],
};
