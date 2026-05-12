import type { AirCompositeScore, AirObservation, AirQuickWin, AirSnapshotDeliverable } from "../types";

export const SNAPSHOT_LIMITATIONS = [
  "CRM data quality requires Audit-tier access.",
  "Workflow maturity requires stakeholder interviews.",
  "True call abandonment rates require phone/CRM data.",
  "Tool overlap and stack spend require inventory capture.",
  "Team capability versus willingness requires interviews.",
];

export function buildSnapshotDeliverable(args: {
  auditId: string;
  clientName: string;
  vertical?: string;
  competitors?: string[];
  composite: AirCompositeScore;
  observations?: AirObservation[];
  quickWins?: AirQuickWin[];
  appUrl?: string;
}): AirSnapshotDeliverable {
  const quickWins = args.quickWins?.length ? args.quickWins : fallbackQuickWins(args.composite);
  const observations = args.observations?.length ? args.observations : fallbackObservations(args.composite);

  return {
    clientName: args.clientName,
    vertical: args.vertical || "home improvement",
    competitors: args.competitors || [],
    generatedAt: new Date().toISOString(),
    reportNumber: `AIR-${new Date().getFullYear()}-${args.auditId.slice(0, 6).toUpperCase()}`,
    composite: args.composite,
    quickWins,
    observations,
    whatCannotBeSeen: SNAPSHOT_LIMITATIONS,
    ctaPrimary: {
      label: "Schedule a 15-minute consultation",
      href: `${args.appUrl || ""}/air-audits/methodology`,
    },
    ctaSecondary: {
      label: "Review the AIR methodology",
      href: `${args.appUrl || ""}/air-audits/methodology`,
    },
  };
}

function fallbackQuickWins(composite: AirCompositeScore): AirQuickWin[] {
  const weakest = [...composite.domains].sort((a, b) => a.totalScore - b.totalScore)[0];
  return [
    {
      rank: 1,
      title: "Verify lead tracking",
      body: "Confirm every form, call, and booking source is captured with a consistent lead source before adding AI workflows.",
      effortLabel: "LOW",
      timelineLabel: "14-DAY",
      projectedImpact: "Projected: cleaner attribution for 80-90% of new leads within one month",
      sspServiceMatch: "attribution_setup",
    },
    {
      rank: 2,
      title: "Document one workflow",
      body: `Start with the workflow most connected to ${weakest?.domain.replaceAll("_", " ") || "readiness"} so the next recommendation has a clear operating map.`,
      effortLabel: "MEDIUM",
      timelineLabel: "21-DAY",
      projectedImpact: "Projected: 3-6 hours/month of avoidable handoff confusion removed",
      sspServiceMatch: "speed_to_lead",
    },
    {
      rank: 3,
      title: "Create review cadence",
      body: "Install a simple post-job review request sequence so public trust signals start compounding before heavier AI work begins.",
      effortLabel: "LOW",
      timelineLabel: "30-DAY",
      projectedImpact: "Projected: 3-8 additional reviews/month once job volume supports it",
      sspServiceMatch: "review_automation",
    },
  ];
}

function fallbackObservations(composite: AirCompositeScore): AirObservation[] {
  const ordered = [...composite.domains].sort((a, b) => a.totalScore - b.totalScore);
  return ordered.slice(0, 5).map((domain, index) => ({
    id: `${domain.domain}-${index}`,
    kind: index === 0 ? "gap" : "context",
    domain: domain.domain,
    title: domain.domain.replaceAll("_", " "),
    body: `Current public-data score is ${domain.totalScore.toFixed(1)}/20. Use the full Audit to replace estimates with direct evidence.`,
    rank: index + 1,
  }));
}
