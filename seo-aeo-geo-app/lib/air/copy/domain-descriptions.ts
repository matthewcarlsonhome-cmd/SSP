import type { AirDomain } from "../types";

export const DOMAIN_DESCRIPTIONS: Record<
  AirDomain,
  { short: string; long: string; whyItMatters: string; redFlags: string[] }
> = {
  team_readiness: {
    short: "Curiosity, capability, change tolerance, and leadership buy-in.",
    long: "Whether the people who will live with new tools can actually adopt them.",
    whyItMatters: "Without leadership buy-in and team change tolerance, even well-designed automation gets abandoned.",
    redFlags: [
      "Owner cannot articulate the problem AI would solve.",
      "Past tool rollouts quietly failed.",
      "Multiple change initiatives were started and abandoned.",
    ],
  },
  data_foundation: {
    short: "CRM hygiene, attribution clarity, and reporting infrastructure.",
    long: "Whether the underlying data can support AI-driven optimization.",
    whyItMatters: "AI does not fix bad data; it amplifies the consequences of bad data.",
    redFlags: [
      "CRM contains more than 15% duplicate contacts.",
      "Lead source is populated on fewer than 60% of records.",
      "Reports are manually rebuilt every week.",
    ],
  },
  workflow_maturity: {
    short: "Documentation, standardization, handoff clarity, and friction visibility.",
    long: "Whether repeated work is documented enough to be automated.",
    whyItMatters: "If we cannot draw the swimlane today, AI cannot enforce it tomorrow.",
    redFlags: [
      "No written SOPs for lead-to-revenue workflows.",
      "Every job runs slightly differently.",
      "Handoffs depend on verbal updates.",
    ],
  },
  stack_coherence: {
    short: "Tool sprawl, integration, redundancy, and total cost coherence.",
    long: "Whether the existing tech stack is a foundation to build on or a stack to simplify first.",
    whyItMatters: "Adding AI on top of a chaotic stack makes the chaos faster.",
    redFlags: [
      "More than 20 tools paid for, fewer than 12 actively used.",
      "Multiple tools do the same job.",
      "Critical integrations break weekly.",
    ],
  },
  opportunity_density: {
    short: "Surface area of high-leverage automatable workflows.",
    long: "How much repeatable, response-time-sensitive, content-heavy, or customer-interaction-heavy work exists.",
    whyItMatters: "Opportunity density determines whether automation has enough volume to pay back.",
    redFlags: [
      "Lead volume is too low to justify automation.",
      "Customer interactions are mostly one-off.",
      "No volume spikes are being mishandled.",
    ],
  },
};
