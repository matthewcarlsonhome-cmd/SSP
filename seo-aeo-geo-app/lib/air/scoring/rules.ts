import type {
  AdsPayload,
  AirAuditInput,
  AirDomain,
  AirTierId,
  CrmAuditPayload,
  ReviewsPayload,
  TechStackPayload,
  ToolInventoryPayload,
  WebsiteAuditPayload,
} from "../types";

export interface ScoringContext {
  inputs: AirAuditInput[];
  tier: AirTierId;
}

export interface ScoringResult {
  score: number;
  confidence: "high" | "medium" | "low";
  evidenceRefs: string[];
  reasoning: string;
}

export type ScoringRule = (ctx: ScoringContext) => ScoringResult;

export const teamReadinessRules: Record<string, ScoringRule> = {
  leadership_buy_in: (ctx) => {
    const ownerInterview = findInput(ctx, "interview_owner");
    if (!ownerInterview) return defaultPrivateScore(ctx, "No owner interview captured.");
    const p = ownerInterview.payload as Record<string, unknown>;
    let score = 0;
    if (truthy(p.budget_allocated) || truthy(p.budgetAllocated)) score += 2;
    if (truthy(p.championing_change) || truthy(p.championingChange)) score += 2;
    if (truthy(p.articulates_problem) || truthy(p.articulatesProblem)) score += 1;
    return {
      score: clamp(score),
      confidence: "high",
      evidenceRefs: [ownerInterview.id],
      reasoning: "Scored from owner interview budget, championing, and clarity signals.",
    };
  },
  curiosity_openness: (ctx) => scoreInterviewSignal(ctx, "interview_owner", ["past_tool_adoption", "boring_repetitive"], "No curiosity signals captured."),
  capability_baseline: (ctx) => scoreToolCapability(ctx),
  change_tolerance: (ctx) => scoreInterviewSignal(ctx, "interview_ops", ["sops_exist", "sops_kept_current", "broken_integrations"], "No change-tolerance signals captured."),
};

export const dataFoundationRules: Record<string, ScoringRule> = {
  crm_completeness: (ctx) => {
    const crmAudit = findInput(ctx, "crm_audit");
    if (!crmAudit) return defaultPrivateScore(ctx, "CRM not directly audited.");
    const p = crmAudit.payload as unknown as CrmAuditPayload;
    let score = 0;
    if (p.duplicateRate < 0.02 && p.completenessRate > 0.85) score = 5;
    else if (p.duplicateRate < 0.05 && p.completenessRate > 0.7) score = 4;
    else if (p.duplicateRate < 0.1 && p.completenessRate > 0.5) score = 3;
    else if (p.duplicateRate < 0.2 && p.completenessRate > 0.3) score = 2;
    else if (p.duplicateRate < 0.4 || p.completenessRate > 0.15) score = 1;
    return {
      score,
      confidence: "high",
      evidenceRefs: [crmAudit.id],
      reasoning: `Duplicate rate ${(p.duplicateRate * 100).toFixed(1)}%; completeness ${(p.completenessRate * 100).toFixed(1)}%.`,
    };
  },
  attribution_clarity: (ctx) => {
    const webInput = findInput(ctx, "public_website");
    const crmAudit = findInput(ctx, "crm_audit");
    let score = 2.5;
    const evidence: string[] = [];
    const reasons: string[] = [];
    if (webInput) {
      evidence.push(webInput.id);
      const p = webInput.payload as WebsiteAuditPayload;
      if (p.hasGoogleAnalytics4) score += 0.5;
      if (p.hasGoogleTagManager) score += 0.25;
      if (p.hasCallTracking) score += 0.5;
      if (p.utmParametersDetected) score += 0.5;
      reasons.push(`GA4: ${Boolean(p.hasGoogleAnalytics4)}, GTM: ${Boolean(p.hasGoogleTagManager)}, call tracking: ${Boolean(p.hasCallTracking)}, UTM tagging: ${Boolean(p.utmParametersDetected)}.`);
    }
    if (crmAudit) {
      evidence.push(crmAudit.id);
      const p = crmAudit.payload as unknown as CrmAuditPayload;
      if (p.leadSourceFieldPopulated > 0.7) score += 1;
      else if (p.leadSourceFieldPopulated > 0.4) score += 0.5;
      reasons.push(`CRM lead source populated: ${(p.leadSourceFieldPopulated * 100).toFixed(0)}%.`);
    }
    return {
      score: clamp(score),
      confidence: crmAudit ? "high" : "medium",
      evidenceRefs: evidence,
      reasoning: reasons.join(" ") || "No attribution signals captured.",
    };
  },
  reporting_infrastructure: (ctx) => {
    const webInput = findInput(ctx, "public_website");
    let score = 1;
    const evidence: string[] = [];
    if (webInput) {
      evidence.push(webInput.id);
      const p = webInput.payload as WebsiteAuditPayload;
      if (p.hasGoogleAnalytics4) score += 1;
      if (p.hasFormAnalytics) score += 1;
      if (p.hasDashboardEvidence) score += 1;
    }
    const reportSamples = findAllInputs(ctx, "report_sample");
    if (reportSamples.length > 0) {
      const automated = reportSamples.filter((s) => Boolean((s.payload as Record<string, unknown>).isAutomated));
      if (automated.length / reportSamples.length > 0.5) score += 1;
      evidence.push(...reportSamples.map((s) => s.id));
    }
    return {
      score: clamp(score),
      confidence: reportSamples.length > 0 ? "high" : "medium",
      evidenceRefs: evidence,
      reasoning: `Reporting signals from website and ${reportSamples.length} report sample(s).`,
    };
  },
  data_accessibility: (ctx) => {
    const tools = findAllInputs(ctx, "tool_inventory");
    if (tools.length === 0) return defaultPrivateScore(ctx, "No tool inventory.");
    const integrationCount = tools.reduce((acc, t) => acc + (((t.payload as unknown as ToolInventoryPayload).integratedWith || []).length), 0);
    const ratio = tools.length ? integrationCount / tools.length : 0;
    return {
      score: scoreByThreshold(ratio, [2.5, 1.5, 0.8, 0.3]),
      confidence: "high",
      evidenceRefs: tools.map((t) => t.id),
      reasoning: `Average integrations per tool: ${ratio.toFixed(1)}.`,
    };
  },
};

export const workflowMaturityRules: Record<string, ScoringRule> = {
  documentation: (ctx) => {
    const workflows = findAllInputs(ctx, /^workflow_/);
    const opsInterview = findInput(ctx, "interview_ops");
    if (workflows.length === 0 && !opsInterview) return defaultPrivateScore(ctx, "No workflows documented.");
    let score = Math.min(5, workflows.length);
    const p = (opsInterview?.payload || {}) as Record<string, unknown>;
    if (truthy(p.sops_exist) || truthy(p.sopsExistCurrent)) score += 1;
    if (truthy(p.sops_kept_current) || truthy(p.sopsKeptCurrent)) score += 1;
    return {
      score: clamp(score),
      confidence: "high",
      evidenceRefs: [...workflows.map((w) => w.id), opsInterview?.id].filter(Boolean) as string[],
      reasoning: `${workflows.length} workflows documented. SOPs current: ${truthy(p.sops_kept_current) || truthy(p.sopsKeptCurrent)}.`,
    };
  },
  standardization: (ctx) => scoreWorkflowQuality(ctx, "standardization"),
  handoff_clarity: (ctx) => scoreWorkflowQuality(ctx, "handoff_clarity"),
  friction_visibility: (ctx) => scoreWorkflowQuality(ctx, "friction_visibility"),
};

export const stackCoherenceRules: Record<string, ScoringRule> = {
  sprawl: (ctx) => {
    const tools = findAllInputs(ctx, "tool_inventory");
    if (tools.length === 0) {
      const techInput = findInput(ctx, "public_tech_stack");
      if (!techInput) return defaultPrivateScore(ctx, "No tool inventory.");
      const detected = ((techInput.payload as unknown as TechStackPayload).detectedTools || []).length;
      return {
        score: detected > 30 ? 1 : detected > 20 ? 2 : detected > 12 ? 3 : detected > 6 ? 4 : 5,
        confidence: "medium",
        evidenceRefs: [techInput.id],
        reasoning: `${detected} tools detected on public website.`,
      };
    }
    const activelyUsed = tools.filter((t) => ["daily", "weekly"].includes(String((t.payload as unknown as ToolInventoryPayload).lastMeaningfulUse || ""))).length;
    const ratio = activelyUsed / tools.length;
    let score = 1;
    if (ratio > 0.85 && tools.length < 12) score = 5;
    else if (ratio > 0.7 && tools.length < 18) score = 4;
    else if (ratio > 0.5 && tools.length < 25) score = 3;
    else if (ratio > 0.3) score = 2;
    return {
      score,
      confidence: "high",
      evidenceRefs: tools.map((t) => t.id),
      reasoning: `${activelyUsed}/${tools.length} tools actively used.`,
    };
  },
  integration: (ctx) => {
    const tools = findAllInputs(ctx, "tool_inventory");
    const tech = findInput(ctx, "public_tech_stack");
    const evidence = [...tools.map((t) => t.id), tech?.id].filter(Boolean) as string[];
    if (!tools.length && !tech) return defaultPrivateScore(ctx, "No integration signals.");
    const inventorySignals = tools.reduce((sum, t) => sum + (((t.payload as unknown as ToolInventoryPayload).integratedWith || []).length), 0);
    const publicSignals = Number((tech?.payload as unknown as TechStackPayload | undefined)?.integrationSignals || 0);
    const signalScore = inventorySignals + publicSignals;
    return {
      score: scoreByThreshold(signalScore, [12, 8, 4, 1]),
      confidence: tools.length ? "high" : "medium",
      evidenceRefs: evidence,
      reasoning: `${signalScore} integration signals detected.`,
    };
  },
  redundancy: (ctx) => {
    const tools = findAllInputs(ctx, "tool_inventory");
    if (!tools.length) return defaultPrivateScore(ctx, "No tool inventory.");
    const overlaps = tools.reduce((sum, t) => sum + (((t.payload as unknown as ToolInventoryPayload).overlapsWith || []).length), 0);
    return {
      score: overlaps === 0 ? 5 : overlaps <= 2 ? 4 : overlaps <= 5 ? 3 : overlaps <= 9 ? 2 : 1,
      confidence: "high",
      evidenceRefs: tools.map((t) => t.id),
      reasoning: `${overlaps} overlap signals recorded.`,
    };
  },
  cost_coherence: (ctx) => {
    const tools = findAllInputs(ctx, "tool_inventory");
    if (!tools.length) return defaultPrivateScore(ctx, "No tool inventory.");
    const withCost = tools.filter((t) => Number((t.payload as unknown as ToolInventoryPayload).monthlyCostUsd || 0) > 0).length;
    const ratio = withCost / tools.length;
    return {
      score: scoreByThreshold(ratio, [0.9, 0.7, 0.5, 0.25]),
      confidence: "high",
      evidenceRefs: tools.map((t) => t.id),
      reasoning: `${withCost}/${tools.length} tools have known monthly cost.`,
    };
  },
};

export const opportunityDensityRules: Record<string, ScoringRule> = {
  repetitive_task_volume: (ctx) => {
    const webInput = findInput(ctx, "public_website");
    const adsInput = findInput(ctx, "public_ads");
    const reviewsInput = findInput(ctx, "public_reviews");
    let score = 0;
    const evidence: string[] = [];
    if (adsInput) {
      const p = adsInput.payload as AdsPayload;
      evidence.push(adsInput.id);
      if (p.activeAdsDetected) score += 1;
      if (p.adsVolume === "high") score += 1;
      else if (p.adsVolume === "medium") score += 0.5;
    }
    if (reviewsInput) {
      const p = reviewsInput.payload as ReviewsPayload;
      evidence.push(reviewsInput.id);
      if ((p.totalReviews || 0) > 200) score += 1;
      if ((p.reviewVelocityMonthly || 0) > 5) score += 1;
    }
    if (webInput) {
      const p = webInput.payload as WebsiteAuditPayload;
      evidence.push(webInput.id);
      if ((p.formCount || 0) > 3) score += 1;
      if ((p.leadCaptureSignals || 0) > 2) score += 0.5;
    }
    return {
      score: clamp(score),
      confidence: "medium",
      evidenceRefs: evidence,
      reasoning: "Estimated from public lead-volume proxies.",
    };
  },
  response_time_sensitivity: (ctx) => ({
    score: 4.5,
    confidence: "medium",
    evidenceRefs: findInput(ctx, "public_website") ? [findInput(ctx, "public_website")!.id] : [],
    reasoning: "Home improvement services are response-time sensitive; speed-to-lead materially affects conversion.",
  }),
  content_production_need: (ctx) => {
    const webInput = findInput(ctx, "public_website");
    if (!webInput) return { score: 3, confidence: "low", evidenceRefs: [], reasoning: "Default content-production opportunity for snapshot." };
    const p = webInput.payload as WebsiteAuditPayload;
    let score = 2;
    if ((p.servicePages || 0) >= 5) score += 1;
    if ((p.locationPages || 0) >= 3) score += 1;
    if ((p.faqCount || 0) < 5) score += 1;
    return {
      score: clamp(score),
      confidence: "medium",
      evidenceRefs: [webInput.id],
      reasoning: `Detected ${p.servicePages || 0} service pages, ${p.locationPages || 0} location pages, and ${p.faqCount || 0} FAQs.`,
    };
  },
  customer_interaction_vol: (ctx) => {
    const reviewsInput = findInput(ctx, "public_reviews");
    const webInput = findInput(ctx, "public_website");
    const reviewCount = Number((reviewsInput?.payload as ReviewsPayload | undefined)?.totalReviews || 0);
    const formCount = Number((webInput?.payload as WebsiteAuditPayload | undefined)?.formCount || 0);
    return {
      score: clamp((reviewCount > 300 ? 2 : reviewCount > 100 ? 1 : 0) + (formCount > 3 ? 1.5 : formCount > 0 ? 1 : 0) + 1.5),
      confidence: reviewsInput || webInput ? "medium" : "low",
      evidenceRefs: [reviewsInput?.id, webInput?.id].filter(Boolean) as string[],
      reasoning: `Estimated from ${reviewCount} reviews and ${formCount} public lead forms.`,
    };
  },
};

export function getAllRules(): Record<AirDomain, Record<string, ScoringRule>> {
  return {
    team_readiness: teamReadinessRules,
    data_foundation: dataFoundationRules,
    workflow_maturity: workflowMaturityRules,
    stack_coherence: stackCoherenceRules,
    opportunity_density: opportunityDensityRules,
  };
}

function defaultPrivateScore(ctx: ScoringContext, reasoning: string): ScoringResult {
  return {
    score: ctx.tier === "air_snapshot" ? 2.5 : 0.5,
    confidence: "low",
    evidenceRefs: [],
    reasoning,
  };
}

function scoreInterviewSignal(ctx: ScoringContext, inputType: string, keys: string[], missingReason: string): ScoringResult {
  const input = findInput(ctx, inputType);
  if (!input) return defaultPrivateScore(ctx, missingReason);
  const payload = input.payload as Record<string, unknown>;
  const answered = keys.filter((key) => String(payload[key] || "").trim().length > 0 || truthy(payload[key])).length;
  return {
    score: clamp(2 + answered),
    confidence: "medium",
    evidenceRefs: [input.id],
    reasoning: `${answered}/${keys.length} interview signals captured.`,
  };
}

function scoreToolCapability(ctx: ScoringContext): ScoringResult {
  const tools = findAllInputs(ctx, "tool_inventory");
  if (!tools.length) return defaultPrivateScore(ctx, "No tool usage or capability signals captured.");
  const activeTools = tools.filter((t) => ["daily", "weekly"].includes(String((t.payload as unknown as ToolInventoryPayload).lastMeaningfulUse || ""))).length;
  return {
    score: clamp(1 + activeTools / 2),
    confidence: "medium",
    evidenceRefs: tools.map((t) => t.id),
    reasoning: `${activeTools} actively-used tools signal baseline tool capability.`,
  };
}

function scoreWorkflowQuality(ctx: ScoringContext, dimension: string): ScoringResult {
  const workflows = findAllInputs(ctx, /^workflow_/);
  if (!workflows.length) return defaultPrivateScore(ctx, `No workflows captured for ${dimension}.`);
  const totalFriction = workflows.reduce((sum, workflow) => {
    const payload = workflow.payload as { steps?: Array<{ friction?: string }>; bottleneck_notes?: string };
    const stepFriction = (payload.steps || []).filter((step) => String(step.friction || "").trim().length > 0).length;
    return sum + stepFriction + (payload.bottleneck_notes ? 1 : 0);
  }, 0);
  const base = Math.min(5, workflows.length + 1);
  const penalty = Math.min(2, totalFriction / 5);
  return {
    score: clamp(base - penalty),
    confidence: "medium",
    evidenceRefs: workflows.map((w) => w.id),
    reasoning: `${workflows.length} workflows captured with ${totalFriction} friction notes.`,
  };
}

function findInput(ctx: ScoringContext, type: string): AirAuditInput | undefined {
  return ctx.inputs.find((i) => i.input_type === type);
}

function findAllInputs(ctx: ScoringContext, type: string | RegExp): AirAuditInput[] {
  if (type instanceof RegExp) return ctx.inputs.filter((i) => type.test(i.input_type));
  return ctx.inputs.filter((i) => i.input_type === type);
}

function scoreByThreshold(value: number, thresholds: [number, number, number, number]) {
  if (value > thresholds[0]) return 5;
  if (value > thresholds[1]) return 4;
  if (value > thresholds[2]) return 3;
  if (value > thresholds[3]) return 2;
  return 1;
}

function clamp(value: number) {
  return Math.max(0, Math.min(5, Math.round(value * 10) / 10));
}

function truthy(value: unknown) {
  return value === true || value === "true" || value === "yes" || value === "Yes" || value === 1;
}
