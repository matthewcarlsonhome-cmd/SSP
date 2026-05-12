export type AirTierId =
  | "air_snapshot"
  | "air_audit"
  | "air_foundation_sprint"
  | "air_transition_sprint"
  | "air_operations";

export type AirDomain =
  | "team_readiness"
  | "data_foundation"
  | "workflow_maturity"
  | "stack_coherence"
  | "opportunity_density";

export type AirBand =
  | "pre_ai"
  | "stabilization_first"
  | "catch_up"
  | "foundation_strong"
  | "ai_native_ready";

export type AirAuditStatus =
  | "draft"
  | "intake_in_progress"
  | "scoring"
  | "deliverable_review"
  | "published"
  | "completed"
  | "archived";

export type AirConfidence = "high" | "medium" | "low";

export interface AirAuditInput<TPayload = Record<string, unknown>> {
  id: string;
  audit_id?: string;
  input_type: string;
  source?: string;
  payload: TPayload;
  confidence?: AirConfidence;
  collected_at?: string;
}

export interface AirSubDimensionScore {
  domain: AirDomain;
  subDimension: string;
  finalScore: number;
  autoScore?: number;
  analystScore?: number;
  confidence: AirConfidence;
  evidenceRefs: string[];
  reasoning?: string;
  overrideReason?: string;
}

export interface AirDomainScore {
  domain: AirDomain;
  totalScore: number;
  subDimensions: AirSubDimensionScore[];
  confidence: AirConfidence;
}

export interface AirCompositeScore {
  composite: number;
  band: AirBand;
  bandLabel: string;
  recommendedTier: AirTierId;
  domains: AirDomainScore[];
  confidence: AirConfidence;
  scoredAt: string;
}

export interface AirQuickWin {
  rank: number;
  title: string;
  body: string;
  effortLabel: "LOW" | "MEDIUM" | "HIGH";
  timelineLabel: string;
  projectedImpact: string;
  sspServiceMatch?: string;
}

export interface AirObservation {
  id: string;
  kind: "strength" | "gap" | "risk" | "opportunity" | "context";
  domain?: AirDomain;
  title: string;
  body?: string;
  rank: number;
}

export interface AirSnapshotDeliverable {
  clientName: string;
  vertical: string;
  competitors: string[];
  generatedAt: string;
  reportNumber: string;
  composite: AirCompositeScore;
  quickWins: AirQuickWin[];
  observations: AirObservation[];
  whatCannotBeSeen: string[];
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
}

export interface AirRoadmapItem {
  id: string;
  phase: "month_1" | "month_2" | "month_3";
  title: string;
  body: string;
  ownerRole?: string;
  successMetric?: string;
  effortHoursEst?: number;
  monthlySavingsEst?: number;
  monthlyRevenueEst?: number;
  sspServiceMatch?: string;
}

export interface AirOpportunityMatrixItem {
  rank: number;
  title: string;
  description: string;
  hoursRecapturedMo: number;
  revenueImpactMo: number;
  implementationEffort: "low" | "medium" | "high";
  risk: "low" | "medium" | "high";
  dataDependency?: string;
  compositeScore: number;
}

export interface AirToolInventoryItem {
  toolName: string;
  category?: string;
  monthlyCostUsd?: number;
  annualCostUsd?: number;
  primaryUser?: string;
  primaryPurpose?: string;
  lastMeaningfulUse?: string;
  recommendation: "keep" | "replace" | "retire" | "investigate";
  recommendationNote?: string;
}

export interface AirWorkflowStep {
  label: string;
  owner: string;
  tool: string;
  hours: number;
  friction: string;
}

export interface AirWorkflowSummary {
  workflowKind: string;
  totalHoursPerWeek: number;
  steps: AirWorkflowStep[];
  bottleneckNotes?: string;
}

export interface AirAuditDeliverable extends AirSnapshotDeliverable {
  opportunityMatrix: AirOpportunityMatrixItem[];
  roadmap: AirRoadmapItem[];
  toolInventory: AirToolInventoryItem[];
  workflows: AirWorkflowSummary[];
  narrativeMd?: string;
}

export interface WebsiteAuditPayload {
  url?: string;
  hasGoogleAnalytics4?: boolean;
  hasGoogleTagManager?: boolean;
  hasCallTracking?: boolean;
  hasFormAnalytics?: boolean;
  hasDashboardEvidence?: boolean;
  utmParametersDetected?: boolean;
  formCount?: number;
  schemaTypes?: string[];
  pageCount?: number;
  servicePages?: number;
  locationPages?: number;
  faqCount?: number;
  leadCaptureSignals?: number;
  hasOnlineBooking?: boolean;
}

export interface CrmAuditPayload {
  source: "csv_upload" | "mlh_api" | "hubspot_api" | "manual";
  contactCount: number;
  duplicateCount: number;
  duplicateRate: number;
  completenessRate: number;
  leadSourceFieldPopulated: number;
  emailFieldPopulated: number;
  phoneFieldPopulated: number;
  lastContactDatePresent: number;
  tagsUsedCount: number;
  segmentsDefined: number;
  notes?: string;
}

export interface ToolInventoryPayload {
  toolName: string;
  category?: string;
  monthlyCostUsd?: number;
  lastMeaningfulUse?: string;
  integratedWith?: string[];
  overlapsWith?: string[];
  recommendation?: string;
}

export interface ReviewsPayload {
  totalReviews?: number;
  reviewVelocityMonthly?: number;
  averageRating?: number;
  responseRate?: number;
}

export interface AdsPayload {
  activeAdsDetected?: boolean;
  adsVolume?: "none" | "low" | "medium" | "high";
}

export interface TechStackPayload {
  detectedTools: string[];
  integrationSignals?: number;
}
