import type { AirAuditInput } from "../types";

let idCounter = 0;
const id = (prefix: string) => `${prefix}-${++idCounter}`;

export const AIR_SCORING_FIXTURES: Record<string, { label: string; expected: number; tolerance: number; inputs: AirAuditInput[] }> = {
  aiNativeReady: {
    label: "AI-Native Ready",
    expected: 92,
    tolerance: 8,
    inputs: [
      {
        id: id("owner"),
        input_type: "interview_owner",
        payload: { budget_allocated: true, championing_change: true, articulates_problem: true, past_tool_adoption: "Successful CRM rollout", boring_repetitive: "Lead follow-up" },
      },
      {
        id: id("ops"),
        input_type: "interview_ops",
        payload: { sops_exist: true, sops_kept_current: true, broken_integrations: "Rare" },
      },
      {
        id: id("crm"),
        input_type: "crm_audit",
        payload: { source: "manual", contactCount: 8500, duplicateCount: 80, duplicateRate: 0.01, completenessRate: 0.9, leadSourceFieldPopulated: 0.85, emailFieldPopulated: 0.9, phoneFieldPopulated: 0.95, lastContactDatePresent: 0.8, tagsUsedCount: 40, segmentsDefined: 12 },
      },
      { id: id("web"), input_type: "public_website", payload: { hasGoogleAnalytics4: true, hasGoogleTagManager: true, hasCallTracking: true, utmParametersDetected: true, hasFormAnalytics: true, formCount: 6, servicePages: 12, locationPages: 8, faqCount: 12, leadCaptureSignals: 5 } },
      { id: id("tech"), input_type: "public_tech_stack", payload: { detectedTools: ["GA4", "GTM", "CRM", "CallRail", "Forms", "Scheduler"], integrationSignals: 10 } },
      { id: id("reviews"), input_type: "public_reviews", payload: { totalReviews: 550, reviewVelocityMonthly: 12, averageRating: 4.8, responseRate: 0.8 } },
      { id: id("ads"), input_type: "public_ads", payload: { activeAdsDetected: true, adsVolume: "high" } },
      ...Array.from({ length: 5 }, (_, index) => ({ id: id("workflow"), input_type: `workflow_${index}`, payload: { steps: [{ friction: "" }], bottleneck_notes: "" } })),
      ...Array.from({ length: 9 }, (_, index) => ({ id: id("tool"), input_type: "tool_inventory", payload: { toolName: `Tool ${index}`, lastMeaningfulUse: "daily", monthlyCostUsd: 100, integratedWith: ["CRM", "Analytics"], overlapsWith: [] } })),
    ],
  },
  catchUp: {
    label: "Catch-Up Phase",
    expected: 48,
    tolerance: 8,
    inputs: [
      { id: id("owner"), input_type: "interview_owner", payload: { budget_allocated: false, championing_change: true, articulates_problem: true, past_tool_adoption: "Mixed" } },
      { id: id("crm"), input_type: "crm_audit", payload: { source: "manual", contactCount: 1800, duplicateCount: 220, duplicateRate: 0.12, completenessRate: 0.45, leadSourceFieldPopulated: 0.35, emailFieldPopulated: 0.65, phoneFieldPopulated: 0.75, lastContactDatePresent: 0.3, tagsUsedCount: 8, segmentsDefined: 2 } },
      { id: id("web"), input_type: "public_website", payload: { hasGoogleAnalytics4: true, hasGoogleTagManager: false, hasCallTracking: false, utmParametersDetected: false, formCount: 2, servicePages: 4, locationPages: 1, faqCount: 1, leadCaptureSignals: 1 } },
      { id: id("tech"), input_type: "public_tech_stack", payload: { detectedTools: Array.from({ length: 18 }, (_, index) => `Tool ${index}`), integrationSignals: 2 } },
      { id: id("reviews"), input_type: "public_reviews", payload: { totalReviews: 115, reviewVelocityMonthly: 3, averageRating: 4.5, responseRate: 0.25 } },
      { id: id("ads"), input_type: "public_ads", payload: { activeAdsDetected: true, adsVolume: "medium" } },
      { id: id("workflow"), input_type: "workflow_intake_to_qualification", payload: { steps: [{ friction: "Manual handoff" }, { friction: "Duplicate entry" }], bottleneck_notes: "Estimator delay" } },
      ...Array.from({ length: 14 }, (_, index) => ({ id: id("tool"), input_type: "tool_inventory", payload: { toolName: `Tool ${index}`, lastMeaningfulUse: index < 6 ? "weekly" : "rarely", monthlyCostUsd: index < 6 ? 80 : undefined, integratedWith: index < 3 ? ["CRM"] : [], overlapsWith: index > 8 ? ["CRM"] : [] } })),
    ],
  },
  preAi: {
    label: "Pre-AI",
    expected: 22,
    tolerance: 10,
    inputs: [
      { id: id("web"), input_type: "public_website", payload: { hasGoogleAnalytics4: false, hasGoogleTagManager: false, hasCallTracking: false, utmParametersDetected: false, formCount: 1, servicePages: 1, locationPages: 0, faqCount: 0, leadCaptureSignals: 0 } },
      { id: id("tech"), input_type: "public_tech_stack", payload: { detectedTools: Array.from({ length: 28 }, (_, index) => `Tool ${index}`), integrationSignals: 0 } },
      { id: id("reviews"), input_type: "public_reviews", payload: { totalReviews: 9, reviewVelocityMonthly: 0, averageRating: 4.1, responseRate: 0 } },
      { id: id("ads"), input_type: "public_ads", payload: { activeAdsDetected: false, adsVolume: "none" } },
    ],
  },
};
