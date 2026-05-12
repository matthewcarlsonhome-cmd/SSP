export type VisibilityProviderId = 'chatgpt' | 'claude' | 'gemini' | 'perplexity';

export type VisibilityQueryCategory =
  | 'brand_health'
  | 'competitors'
  | 'category_geo'
  | 'service'
  | 'problem_solution'
  | 'cost'
  | 'decision'
  | 'local_proof';

export interface VisibilityQuestionCategoryMeta {
  label: string;
  workbookBucket: string;
  description: string;
  order: number;
}

export const QUESTION_CATEGORY_META: Record<VisibilityQueryCategory, VisibilityQuestionCategoryMeta> = {
  brand_health: {
    label: 'Brand Health',
    workbookBucket: 'Brand',
    description: 'Brand reputation, reviews, complaints, trust, proof points, and entity knowledge.',
    order: 1,
  },
  competitors: {
    label: 'Competitors',
    workbookBucket: 'Comparative',
    description: 'Head-to-head prompts and open competitor shortlists where the client may be displaced.',
    order: 2,
  },
  category_geo: {
    label: 'Category + Geo',
    workbookBucket: 'Category+Geo',
    description: 'Best-in-market, suburb, near-me, and service-area discovery questions.',
    order: 3,
  },
  service: {
    label: 'Service',
    workbookBucket: 'Service',
    description: 'Specific service-line and high-value job prompts tied to revenue opportunities.',
    order: 4,
  },
  problem_solution: {
    label: 'Problem / Solutions',
    workbookBucket: 'Problem',
    description: 'Educational buyer questions where AI may recommend solutions and vendors.',
    order: 5,
  },
  cost: {
    label: 'Cost',
    workbookBucket: 'Cost',
    description: 'Price, financing, estimate, and value questions that often precede a sales call.',
    order: 6,
  },
  decision: {
    label: 'Decision',
    workbookBucket: 'Decision',
    description: 'Bottom-funnel validation prompts about whether to choose the business.',
    order: 7,
  },
  local_proof: {
    label: 'Local Proof',
    workbookBucket: 'Local',
    description: 'Reviews, licenses, authority, local proof, and near-me reputation prompts.',
    order: 8,
  },
};

export const QUESTION_CATEGORY_ORDER = Object.entries(QUESTION_CATEGORY_META)
  .sort(([, left], [, right]) => left.order - right.order)
  .map(([category]) => category as VisibilityQueryCategory);

export type AuditRunStatus = 'pending' | 'running' | 'captured' | 'error' | 'manual';
export type AuditQaStatus = 'unreviewed' | 'needs_review' | 'approved' | 'excluded' | 'high_impact_miss';
export type AuditCaptureMode = 'api' | 'manual' | 'hybrid';
export type AuditProfileId = 'free-snapshot' | 'madison-mvp' | 'full-audit';

export interface AuditBusinessProfile {
  brand: string;
  website?: string;
  niche: string;
  city: string;
  state: string;
  country?: string;
  aliases: string[];
  competitors: string[];
  services?: string[];
  serviceRadiusMiles?: number;
  schemaStatus?: 'unknown' | 'found' | 'thin' | 'missing' | 'blocked';
  gbpSignal?: 'unknown' | 'strong' | 'average' | 'weak';
  reviewSignal?: 'unknown' | 'strong' | 'average' | 'weak';
  seoAuditSignals?: SeoAuditSignals;
  intakeNotes?: string[];
}

export interface SeoAuditSignals {
  lastAuditUrl?: string;
  technicalHealthScore?: number;
  pagesAnalyzed?: number;
  pagesWithSchema?: number;
  thinContentPages?: number;
  missingMetaCount?: number;
  aiBotsBlocked?: boolean;
  localLandingPages?: number;
  reviewCount?: number;
  averageRating?: number;
  competitorReviewGap?: number;
  notes?: string[];
}

export interface VisibilityQueryTemplate {
  code: string;
  category: VisibilityQueryCategory;
  template: string;
  description: string;
  industryPackId?: string;
}

export interface RenderedVisibilityQuery {
  id: string;
  code: string;
  category: VisibilityQueryCategory;
  prompt: string;
  template: string;
  competitor?: string;
  industryPackId?: string;
}

export interface Citation {
  url: string;
  title?: string;
  snippet?: string;
}

export interface NormalizedVisibilityResponse {
  rawText: string;
  rawJson: unknown;
  citations: Citation[];
  modelId: string;
  ranAt: string;
  warnings?: string[];
}

export interface VisibilityScore {
  brandMentioned: boolean;
  brandPosition: 1 | 2 | 3 | null;
  brandSentiment: 'positive' | 'neutral' | 'negative';
  brandWithCitation: boolean;
  competitorsMentioned: string[];
  competitorCount: number;
  recencySignal: boolean;
  hallucinationFlag: boolean;
  workbookScore: 0 | 1 | 2 | 3 | 4 | 5;
  confidence: number;
  notes: string;
}

export interface VisibilityRunEvidence {
  exactPrompt: string;
  platform: VisibilityProviderId;
  capturedAt: string;
  rawResponse: string;
  citations: Citation[];
  sourceUrls: string[];
  screenshotUrls: string[];
  evidenceNote: string;
  caveatText: string;
  scorer: string;
}

export interface VisibilityAuditRun {
  id: string;
  query: RenderedVisibilityQuery;
  provider: VisibilityProviderId;
  status: AuditRunStatus;
  captureMode?: AuditCaptureMode;
  qaStatus?: AuditQaStatus;
  scorer?: string;
  screenshotUrls?: string[];
  evidenceNote?: string;
  caveatText?: string;
  response?: NormalizedVisibilityResponse;
  score?: VisibilityScore;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface VisibilityMetrics {
  visibilityScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  workbookAverage: number;
  dominantCount: number;
  topThreeCount: number;
  harmfulCount: number;
  excludedCount: number;
  highImpactMissCount: number;
  approvedCount: number;
  needsReviewCount: number;
  mentionRate: number;
  positionScore: number;
  sentimentScore: number;
  citationRate: number;
  competitorDominanceRatio: number;
  runCount: number;
  capturedCount: number;
  brandMentionCount: number;
  citationCount: number;
}

export interface RootCauseFinding {
  code: string;
  category: 'technical' | 'content' | 'reputation' | 'local' | 'authority' | 'competitive';
  title: string;
  severity: 1 | 2 | 3;
  description: string;
  evidence: string[];
  recommendedFix: FixPlaybook;
}

export interface FixPlaybook {
  title: string;
  effort: 'low' | 'medium' | 'high';
  expectedLift: string;
  steps: Array<{ step: string; detail: string; owner: 'agency' | 'client' }>;
}

export interface AuditProfileConfig {
  id: AuditProfileId;
  label: string;
  queryLimit: number;
  providerDefaults: VisibilityProviderId[];
  description: string;
  delivery: string;
  manualCaptureGuidance: string;
}

export interface InstantAuditIntakeResult {
  profile: AuditBusinessProfile;
  suggestedCompetitors: string[];
  warnings: string[];
  confidence: number;
}

export interface AuditActionPlanItem {
  id: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  rootCauseCode: string;
  sourceFindingTitle: string;
  recommendedAction: string;
  serviceLine: string;
  estimatedHours: number;
  estimatedPrice: number;
  owner: 'agency' | 'client';
  dueInDays: number;
  status: 'recommended' | 'accepted' | 'in_progress' | 'done' | 'wont_fix';
}

export interface AuditReportSection {
  title: string;
  body: string;
  bullets?: string[];
}

export interface AuditReportDraft {
  executiveSummary: string;
  aiVisibilityNarrative: string;
  competitorStory: string;
  whyItHappens: string;
  whatToFixNext: string;
  clientEmail: string;
  caveats: string[];
  sections: AuditReportSection[];
}

export interface VisibilityMetricDelta {
  visibilityScoreDelta: number;
  mentionRateDelta: number;
  citationRateDelta: number;
  workbookAverageDelta: number;
  summary: string;
}

export interface ShareableLeadScorecard {
  slug: string;
  createdAt: string;
  businessName: string;
  website?: string;
  geo: string;
  niche: string;
  visibilityScore: number;
  grade: VisibilityMetrics['grade'];
  mentionRate: number;
  capturedCount: number;
  topFindings: string[];
  callToAction: string;
  caveat: string;
}

export interface IndustryQuestionPack {
  id: string;
  label: string;
  niche: string;
  targetNotes?: string;
  keywords?: string[];
  questions: VisibilityQueryTemplate[];
}

export interface ProviderRunOptions {
  provider: VisibilityProviderId;
  prompt: string;
  apiKey: string;
  business: AuditBusinessProfile;
  maxTokens?: number;
}

const SYSTEM_AUDIT_INSTRUCTION =
  'Answer as a consumer-facing AI assistant responding to a real buyer. Recommend specific local businesses when relevant, explain why, and include citations or source links when your platform supports them. Do not mention that this is an audit.';

export const DEFAULT_AUDIT_CAVEAT =
  'AI answers vary by platform, model, location, account state, and time of capture. Treat this as a point-in-time visibility snapshot, not a guaranteed ranking.';

export const PROVIDER_LABELS: Record<VisibilityProviderId, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
};

export const PROVIDER_MODELS: Record<VisibilityProviderId, string> = {
  chatgpt: 'gpt-4o-mini',
  claude: 'claude-sonnet-4-6',
  gemini: 'gemini-2.0-flash',
  perplexity: 'sonar',
};

export const AUDIT_PROFILES: AuditProfileConfig[] = [
  {
    id: 'free-snapshot',
    label: 'Free Snapshot',
    queryLimit: 5,
    providerDefaults: ['chatgpt', 'perplexity'],
    description: 'Fast lead magnet: 5 buyer-intent prompts across 1-2 platforms.',
    delivery: 'Shareable scorecard link and short follow-up email.',
    manualCaptureGuidance: 'Optional paste from Google AI Overview or Gemini browser output for extra evidence.',
  },
  {
    id: 'madison-mvp',
    label: 'Madison MVP',
    queryLimit: 15,
    providerDefaults: ['chatgpt', 'claude', 'gemini', 'perplexity'],
    description: 'Pilot-ready Madison/Dane County audit: 15 prompts across ChatGPT, Claude, Gemini, and Perplexity.',
    delivery: 'One-page local scorecard, competitor story, top fixes, and sales follow-up.',
    manualCaptureGuidance: 'Use the manual lane for Google AI Overviews or logged-out Gemini when live SERP evidence matters.',
  },
  {
    id: 'full-audit',
    label: 'Full Audit',
    queryLimit: 45,
    providerDefaults: ['chatgpt', 'claude', 'gemini', 'perplexity'],
    description: 'Production audit with broader question coverage and a manual Google AI Overview lane.',
    delivery: 'Full scorecard, evidence locker, action plan, re-audit baseline, and report draft.',
    manualCaptureGuidance: 'Treat Google AI Overviews as manual evidence; API captures are not a perfect substitute for live UI.',
  },
];

export const MADISON_SERVICE_AREAS = [
  'Madison, WI',
  'Middleton, WI',
  'Sun Prairie, WI',
  'Fitchburg, WI',
  'Verona, WI',
  'Waunakee, WI',
  'Monona, WI',
  'McFarland, WI',
  'Oregon, WI',
  'DeForest, WI',
  'Cottage Grove, WI',
  'Stoughton, WI',
];

export const MADISON_LOCAL_QUERY_TEMPLATES: VisibilityQueryTemplate[] = [
  packQuestion('madison-local', 'MAD01', 'category_geo', 'Best {niche} in Madison, WI - who should I call?', 'Madison core buyer query'),
  packQuestion('madison-local', 'MAD02', 'category_geo', 'Recommend a reputable {niche} near Middleton, WI.', 'Middleton service-area discovery'),
  packQuestion('madison-local', 'MAD03', 'local_proof', 'Best {niche} near Sun Prairie, WI with strong reviews.', 'Sun Prairie review-led query'),
  packQuestion('madison-local', 'MAD04', 'category_geo', 'Top-rated {niche} serving Fitchburg, WI.', 'Fitchburg service-area query'),
  packQuestion('madison-local', 'MAD05', 'category_geo', 'Who is the best {niche} for homeowners in Verona, WI?', 'Verona homeowner query'),
  packQuestion('madison-local', 'MAD06', 'category_geo', 'Best {niche} near Waunakee, WI.', 'Waunakee local discovery'),
  packQuestion('madison-local', 'MAD07', 'local_proof', 'Recommend a trusted {niche} around Monona, WI.', 'Monona trust query'),
  packQuestion('madison-local', 'MAD08', 'category_geo', 'Best {niche} near McFarland, WI.', 'McFarland local query'),
  packQuestion('madison-local', 'MAD09', 'category_geo', 'Top {niche} serving Oregon, WI.', 'Oregon service-area query'),
  packQuestion('madison-local', 'MAD10', 'category_geo', 'Best {niche} near DeForest, WI.', 'DeForest local query'),
  packQuestion('madison-local', 'MAD11', 'category_geo', 'Recommend a {niche} serving Cottage Grove, WI.', 'Cottage Grove query'),
  packQuestion('madison-local', 'MAD12', 'category_geo', 'Best {niche} around Stoughton, WI.', 'Stoughton local query'),
  packQuestion('madison-local', 'MAD13', 'category_geo', 'I need a {niche} in Dane County. Who should I hire?', 'Dane County broader market query'),
  packQuestion('madison-local', 'MAD14', 'competitors', 'Best {niche} companies in the Madison area - give a ranked list.', 'Madison ranked-list prompt'),
  packQuestion('madison-local', 'MAD15', 'decision', 'Is {brand} one of the best {niche} options in the Madison area?', 'Brand decision in Madison market'),
];

export const CORE_QUERY_TEMPLATES: VisibilityQueryTemplate[] = [
  { code: 'B01', category: 'brand_health', template: 'Is {brand} a good {niche}?', description: 'Direct reputation baseline' },
  { code: 'B02', category: 'brand_health', template: '{brand} reviews in {geo}. What do customers say?', description: 'Review aggregation and local reputation' },
  { code: 'B03', category: 'brand_health', template: '{brand} complaints or problems customers mention.', description: 'Negative-framing defense' },
  { code: 'B04', category: 'brand_health', template: 'Is {brand} reputable and trustworthy?', description: 'Trust signal test' },
  { code: 'B05', category: 'brand_health', template: 'How long has {brand} been in business and what are they known for?', description: 'History and entity confidence' },
  { code: 'B06', category: 'brand_health', template: '{brand} awards, certifications, reviews, and proof points.', description: 'Authority proof recall' },
  { code: 'B07', category: 'brand_health', template: 'What services does {brand} offer?', description: 'Service understanding and entity completeness' },
  { code: 'B08', category: 'brand_health', template: 'What makes {brand} different from other {niche} options?', description: 'Differentiator recall' },
  { code: 'C01', category: 'category_geo', template: 'Best {niche} in {geo}.', description: 'Core local shortlist query' },
  { code: 'C02', category: 'category_geo', template: 'Top {niche} companies in {geo}.', description: 'Variant local shortlist phrasing' },
  { code: 'C03', category: 'category_geo', template: 'Best custom or high-end {niche} in {geo}.', description: 'Premium positioning test' },
  { code: 'C04', category: 'category_geo', template: 'Top-rated {niche} serving {geo}.', description: 'Review-led category search' },
  { code: 'C05', category: 'category_geo', template: 'Best family-owned or locally owned {niche} in {geo}.', description: 'Local ownership differentiator' },
  { code: 'C06', category: 'category_geo', template: 'Award-winning {niche} in {geo}.', description: 'Award and authority positioning' },
  { code: 'C07', category: 'category_geo', template: 'Licensed and insured {niche} near {geo}.', description: 'Compliance and trust filter' },
  { code: 'C08', category: 'category_geo', template: 'Best {niche} near me - I am in {geo}.', description: 'Near-me local intent' },
  { code: 'C09', category: 'category_geo', template: 'Recommended {niche} for homeowners in {geo}.', description: 'Residential buyer segment' },
  { code: 'C10', category: 'category_geo', template: 'Best {niche} for small businesses in {geo}.', description: 'Commercial buyer segment' },
  { code: 'C11', category: 'category_geo', template: 'Which {niche} in {geo} has the strongest reviews and online reputation?', description: 'Review-led shortlist' },
  { code: 'CP01', category: 'competitors', template: '{brand} vs {competitor} - which is better?', description: 'Head-to-head recommendation' },
  { code: 'CP02', category: 'competitors', template: 'Compare {brand} and {competitor} for {niche} in {geo}.', description: 'Geo and niche comparison' },
  { code: 'CP03', category: 'competitors', template: '{competitor} vs {brand} reviews and reputation.', description: 'Review-framed head-to-head' },
  { code: 'CP04', category: 'competitors', template: 'Alternatives to {competitor} for {niche} in {geo}.', description: 'Alternative provider discovery' },
  { code: 'CP05', category: 'competitors', template: 'Best {niche} companies in {geo} compared side by side.', description: 'Open comparison list query' },
  { code: 'CP06', category: 'competitors', template: 'Who are the main competitors for {brand} in {geo}?', description: 'Competitor graph and market adjacency' },
  { code: 'S01', category: 'service', template: 'Best {niche} for {job_to_be_done} in {geo}.', description: 'Job-to-be-done discovery' },
  { code: 'S02', category: 'service', template: 'Who should I hire for {job_to_be_done} near {geo}?', description: 'High-intent service recommendation' },
  { code: 'S03', category: 'service', template: 'Best company for emergency {niche} help in {geo}.', description: 'Urgent service need' },
  { code: 'S04', category: 'service', template: 'Best {niche} for replacement, repair, or installation in {geo}.', description: 'Core service-line bundle' },
  { code: 'S05', category: 'service', template: 'Which {niche} offers free estimates or consultations in {geo}?', description: 'Estimate/consultation intent' },
  { code: 'S06', category: 'service', template: 'Best {niche} for recurring maintenance or ongoing service in {geo}.', description: 'Recurring service opportunity' },
  { code: 'S07', category: 'service', template: 'Which {niche} is best for premium or complex projects in {geo}?', description: 'High-value project intent' },
  { code: 'S08', category: 'service', template: 'Does {brand} offer {job_to_be_done}, and are they a good fit?', description: 'Brand-service fit validation' },
  { code: 'S09', category: 'service', template: 'Best {niche} for fast scheduling in {geo}.', description: 'Speed and availability intent' },
  { code: 'S10', category: 'service', template: 'Best {niche} for warranty-backed work in {geo}.', description: 'Warranty and risk reduction' },
  { code: 'P01', category: 'problem_solution', template: 'How do I choose a {niche} in {geo}? Recommend specific companies.', description: 'Education plus named recommendations' },
  { code: 'P02', category: 'problem_solution', template: 'What should I look for before hiring a {niche}?', description: 'Buyer education' },
  { code: 'P03', category: 'problem_solution', template: 'What are red flags when choosing a {niche}?', description: 'Trust-risk education' },
  { code: 'P04', category: 'problem_solution', template: 'What is the best solution for {job_to_be_done} in {geo}?', description: 'Problem-to-vendor bridge' },
  { code: 'P05', category: 'problem_solution', template: 'Should I repair, replace, or hire a professional {niche} for {job_to_be_done}?', description: 'Solution evaluation' },
  { code: 'D01', category: 'cost', template: 'How much does hiring a {niche} cost in {geo}?', description: 'Highest-intent cost query' },
  { code: 'D02', category: 'cost', template: 'Average price for {job_to_be_done} in {geo}.', description: 'Service-specific price query' },
  { code: 'D03', category: 'cost', template: 'What should I budget for a reputable {niche} in {geo}?', description: 'Budget planning prompt' },
  { code: 'D04', category: 'cost', template: 'Which {niche} in {geo} offers financing, payment plans, or good value?', description: 'Finance and value intent' },
  { code: 'D05', category: 'cost', template: 'Is {brand} expensive compared with other {niche} options?', description: 'Brand price perception' },
  { code: 'Q01', category: 'decision', template: 'Is it worth hiring {brand} for {niche}?', description: 'Bottom-funnel decision validation' },
  { code: 'Q02', category: 'decision', template: 'Should I choose {brand} or {competitor}?', description: 'Final choice prompt' },
  { code: 'L01', category: 'local_proof', template: 'Which {niche} near {geo} has the best reviews and proof of quality?', description: 'Local proof and review strength' },
  { code: 'L02', category: 'local_proof', template: 'Recommend a trusted, local {niche} near {geo}.', description: 'Trust-led local discovery' },
];

function packQuestion(
  industryPackId: string,
  code: string,
  category: VisibilityQueryCategory,
  template: string,
  description: string
): VisibilityQueryTemplate {
  return { code, category, template, description, industryPackId };
}

export const INDUSTRY_QUESTION_PACKS: IndustryQuestionPack[] = [
  {
    id: 'hvac',
    label: 'HVAC',
    niche: 'HVAC contractor',
    questions: [
      packQuestion('hvac', 'HVAC01', 'service', 'Who should I call for emergency AC repair in {geo}?', 'Emergency service discovery'),
      packQuestion('hvac', 'HVAC02', 'cost', 'Best company for furnace replacement financing in {geo}.', 'High-ticket financing query'),
      packQuestion('hvac', 'HVAC03', 'decision', 'Is {brand} a good HVAC company for heat pump installation?', 'Service-line brand decision'),
      packQuestion('hvac', 'HVAC04', 'local_proof', 'Top-rated HVAC maintenance plan near {geo}.', 'Recurring maintenance intent'),
    ],
  },
  {
    id: 'dental',
    label: 'Dental',
    niche: 'dentist',
    questions: [
      packQuestion('dental', 'DEN01', 'category_geo', 'Best family dentist accepting new patients in {geo}.', 'New patient acquisition'),
      packQuestion('dental', 'DEN02', 'service', 'Who offers emergency dental care near {geo}?', 'Emergency dental intent'),
      packQuestion('dental', 'DEN03', 'decision', 'Is {brand} good for cosmetic dentistry?', 'Cosmetic service decision'),
      packQuestion('dental', 'DEN04', 'local_proof', 'Dentist near me with strong patient reviews in {geo}.', 'Review-led local query'),
    ],
  },
  {
    id: 'legal',
    label: 'Legal',
    niche: 'law firm',
    questions: [
      packQuestion('legal', 'LAW01', 'service', 'Best {niche} for personal injury cases in {geo}.', 'Practice area recommendation'),
      packQuestion('legal', 'LAW02', 'cost', 'Who is a reputable attorney near {geo} for a free consultation?', 'Consultation intent'),
      packQuestion('legal', 'LAW03', 'decision', 'Is {brand} a good choice for a local legal matter?', 'Firm trust check'),
      packQuestion('legal', 'LAW04', 'competitors', 'Compare {brand} and {competitor} for client outcomes and reputation.', 'Trust comparison'),
    ],
  },
  {
    id: 'roofing',
    label: 'Roofing',
    niche: 'roofing contractor',
    questions: [
      packQuestion('roofing', 'ROOF01', 'problem_solution', 'Best roof repair company after storm damage in {geo}.', 'Storm response intent'),
      packQuestion('roofing', 'ROOF02', 'service', 'Who should I hire for a roof replacement estimate in {geo}?', 'Estimate request intent'),
      packQuestion('roofing', 'ROOF03', 'decision', 'Is {brand} reliable for insurance roof claims?', 'Claims-specific decision'),
      packQuestion('roofing', 'ROOF04', 'local_proof', 'Top-rated licensed roofers near {geo}.', 'Licensed local discovery'),
    ],
  },
  {
    id: 'plumbing',
    label: 'Plumbing',
    niche: 'plumber',
    questions: [
      packQuestion('plumbing', 'PLUMB01', 'service', 'Who offers emergency plumbing service in {geo}?', 'Emergency lead capture'),
      packQuestion('plumbing', 'PLUMB02', 'service', 'Best plumber for water heater replacement near {geo}.', 'Service-line query'),
      packQuestion('plumbing', 'PLUMB03', 'decision', 'Is {brand} a trustworthy plumber for homeowners?', 'Homeowner trust'),
      packQuestion('plumbing', 'PLUMB04', 'category_geo', 'Drain cleaning company near me in {geo}.', 'Near-me service intent'),
    ],
  },
  {
    id: 'med-spa',
    label: 'Med Spa',
    niche: 'medical spa',
    questions: [
      packQuestion('med-spa', 'MED01', 'service', 'Best med spa for Botox in {geo}.', 'Treatment-specific discovery'),
      packQuestion('med-spa', 'MED02', 'local_proof', 'Who has the best reviews for laser treatments near {geo}?', 'Review-led aesthetic query'),
      packQuestion('med-spa', 'MED03', 'decision', 'Is {brand} a safe and reputable medical spa?', 'Safety and credibility'),
      packQuestion('med-spa', 'MED04', 'competitors', 'Compare {brand} and {competitor} for injectables in {geo}.', 'Competitive treatment comparison'),
    ],
  },
  {
    id: 'real-estate',
    label: 'Real Estate',
    niche: 'real estate agent',
    questions: [
      packQuestion('real-estate', 'RE01', 'service', 'Best real estate agent to sell a home in {geo}.', 'Seller intent'),
      packQuestion('real-estate', 'RE02', 'service', 'Who is a top buyer agent for first-time homebuyers in {geo}?', 'Buyer intent'),
      packQuestion('real-estate', 'RE03', 'decision', 'Is {brand} a good real estate team?', 'Brand trust'),
      packQuestion('real-estate', 'RE04', 'local_proof', 'Top local realtors near {geo} with strong reviews.', 'Review-led local query'),
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    niche: 'accounting firm',
    questions: [
      packQuestion('accounting', 'ACC01', 'service', 'Best CPA for small business taxes in {geo}.', 'SMB tax intent'),
      packQuestion('accounting', 'ACC02', 'service', 'Who provides bookkeeping for local businesses near {geo}?', 'Bookkeeping discovery'),
      packQuestion('accounting', 'ACC03', 'decision', 'Is {brand} a good accounting firm for small business owners?', 'Firm decision'),
      packQuestion('accounting', 'ACC04', 'competitors', 'Compare {brand} and {competitor} for tax planning.', 'Service comparison'),
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    niche: 'restaurant',
    questions: [
      packQuestion('restaurant', 'REST01', 'category_geo', 'Best restaurant near me in {geo} for a date night.', 'Occasion-based discovery'),
      packQuestion('restaurant', 'REST02', 'local_proof', 'Where should I eat in {geo} with great reviews?', 'General local recommendation'),
      packQuestion('restaurant', 'REST03', 'decision', 'Is {brand} worth visiting for dinner?', 'Visit decision'),
      packQuestion('restaurant', 'REST04', 'competitors', 'Compare {brand} and {competitor} for food, service, and atmosphere.', 'Experience comparison'),
    ],
  },
  {
    id: 'auto-repair',
    label: 'Auto Repair',
    niche: 'auto repair shop',
    questions: [
      packQuestion('auto-repair', 'AUTO01', 'service', 'Best mechanic for brake repair in {geo}.', 'Service-line repair query'),
      packQuestion('auto-repair', 'AUTO02', 'local_proof', 'Trustworthy auto repair shop near {geo}.', 'Trust-led discovery'),
      packQuestion('auto-repair', 'AUTO03', 'decision', 'Is {brand} honest and reliable for auto repair?', 'Reputation decision'),
      packQuestion('auto-repair', 'AUTO04', 'service', 'Oil change and inspection near me in {geo}.', 'Routine service query'),
    ],
  },
  {
    id: 'landscaping',
    label: 'Landscaping',
    niche: 'landscaping company',
    questions: [
      packQuestion('landscaping', 'LAND01', 'service', 'Best landscaping company for weekly lawn care in {geo}.', 'Recurring service intent'),
      packQuestion('landscaping', 'LAND02', 'service', 'Who should I hire for landscape design near {geo}?', 'Project discovery'),
      packQuestion('landscaping', 'LAND03', 'decision', 'Is {brand} good for residential landscaping?', 'Residential decision'),
      packQuestion('landscaping', 'LAND04', 'category_geo', 'Top-rated landscapers near me in {geo}.', 'Near-me local query'),
    ],
  },
  {
    id: 'pest-control',
    label: 'Pest Control',
    niche: 'pest control company',
    questions: [
      packQuestion('pest-control', 'PEST01', 'service', 'Best pest control company for termites in {geo}.', 'Termite service query'),
      packQuestion('pest-control', 'PEST02', 'problem_solution', 'Who offers safe pest control for families and pets near {geo}?', 'Safety-driven query'),
      packQuestion('pest-control', 'PEST03', 'decision', 'Is {brand} reliable for pest control service?', 'Brand trust'),
      packQuestion('pest-control', 'PEST04', 'local_proof', 'Exterminator near me in {geo} with strong reviews.', 'Near-me review query'),
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness',
    niche: 'fitness studio',
    questions: [
      packQuestion('fitness', 'FIT01', 'category_geo', 'Best fitness studio near me in {geo}.', 'Local discovery'),
      packQuestion('fitness', 'FIT02', 'service', 'Who has the best personal training in {geo}?', 'Personal training intent'),
      packQuestion('fitness', 'FIT03', 'decision', 'Is {brand} a good gym for beginners?', 'Beginner decision'),
      packQuestion('fitness', 'FIT04', 'competitors', 'Compare {brand} and {competitor} for classes, coaching, and value.', 'Fitness comparison'),
    ],
  },
  {
    id: 'pool-spa',
    label: 'Pool and Spa',
    niche: 'pool and spa company',
    targetNotes: 'High-ticket installations plus recurring maintenance make this a strong paid audit target.',
    keywords: ['pool builder', 'hot tub repair', 'pool maintenance', 'spa service'],
    questions: [
      packQuestion('pool-spa', 'POOL01', 'category_geo', 'Best pool builder in {geo}.', 'Builder discovery'),
      packQuestion('pool-spa', 'POOL02', 'service', 'Who should I hire for hot tub repair near {geo}?', 'Spa repair query'),
      packQuestion('pool-spa', 'POOL03', 'decision', 'Is {brand} reliable for pool installation and service?', 'Brand decision'),
      packQuestion('pool-spa', 'POOL04', 'service', 'Pool maintenance company near me in {geo}.', 'Recurring service local query'),
    ],
  },
  {
    id: 'electrician',
    label: 'Electrical',
    niche: 'electrician',
    targetNotes: 'Emergency calls, panel upgrades, EV chargers, and remodel work create urgent local buyer intent.',
    keywords: ['electrician', 'panel upgrade', 'EV charger installer', 'emergency electrical repair'],
    questions: [
      packQuestion('electrician', 'ELEC01', 'service', 'Best electrician for emergency repairs in {geo}.', 'Emergency electrical intent'),
      packQuestion('electrician', 'ELEC02', 'service', 'Who should I hire for an EV charger installation near {geo}?', 'EV charger opportunity'),
      packQuestion('electrician', 'ELEC03', 'cost', 'How much does an electrical panel upgrade cost in {geo}?', 'Panel upgrade cost query'),
      packQuestion('electrician', 'ELEC04', 'decision', 'Is {brand} a reliable electrician for homeowners?', 'Residential trust check'),
    ],
  },
  {
    id: 'remodeling',
    label: 'Remodeling',
    niche: 'home remodeling contractor',
    targetNotes: 'Kitchen, bath, basement, and whole-home projects have large ticket sizes and heavy comparison behavior.',
    keywords: ['home remodeler', 'kitchen remodel', 'bathroom remodel', 'basement finishing'],
    questions: [
      packQuestion('remodeling', 'REM01', 'category_geo', 'Best home remodeling contractors in {geo}.', 'Core remodeling shortlist'),
      packQuestion('remodeling', 'REM02', 'service', 'Who should I hire for a kitchen remodel near {geo}?', 'Kitchen project intent'),
      packQuestion('remodeling', 'REM03', 'cost', 'What should I budget for a bathroom remodel in {geo}?', 'Bathroom budget query'),
      packQuestion('remodeling', 'REM04', 'competitors', 'Compare {brand} and {competitor} for remodeling quality, communication, and value.', 'Remodeler comparison'),
    ],
  },
  {
    id: 'garage-door',
    label: 'Garage Door',
    niche: 'garage door company',
    targetNotes: 'Broken springs and replacement doors are urgent, local, and review-sensitive.',
    keywords: ['garage door repair', 'garage door spring repair', 'garage door replacement'],
    questions: [
      packQuestion('garage-door', 'GAR01', 'service', 'Best garage door repair company near {geo}.', 'Repair shortlist'),
      packQuestion('garage-door', 'GAR02', 'service', 'Who offers same-day garage door spring repair in {geo}?', 'Same-day service intent'),
      packQuestion('garage-door', 'GAR03', 'cost', 'How much does garage door replacement cost in {geo}?', 'Replacement cost query'),
      packQuestion('garage-door', 'GAR04', 'local_proof', 'Top-rated garage door company near me in {geo}.', 'Review-led local query'),
    ],
  },
  {
    id: 'tree-service',
    label: 'Tree Service',
    niche: 'tree service company',
    targetNotes: 'Storm cleanup, removal, trimming, and emergency work are strong Madison-area seasonal plays.',
    keywords: ['tree removal', 'tree trimming', 'emergency tree service', 'arborist'],
    questions: [
      packQuestion('tree-service', 'TREE01', 'service', 'Best tree removal company in {geo}.', 'Removal discovery'),
      packQuestion('tree-service', 'TREE02', 'problem_solution', 'Who should I call for storm-damaged tree cleanup near {geo}?', 'Storm cleanup intent'),
      packQuestion('tree-service', 'TREE03', 'cost', 'How much does tree removal cost in {geo}?', 'Removal cost query'),
      packQuestion('tree-service', 'TREE04', 'decision', 'Is {brand} a safe and reputable tree service?', 'Safety trust check'),
    ],
  },
  {
    id: 'restoration',
    label: 'Restoration',
    niche: 'water damage restoration company',
    targetNotes: 'Emergency restoration is high-value, fast-decision, and dominated by local trust/citation signals.',
    keywords: ['water damage restoration', 'mold remediation', 'fire damage restoration', 'emergency restoration'],
    questions: [
      packQuestion('restoration', 'RESTO01', 'service', 'Who should I call for emergency water damage restoration in {geo}?', 'Emergency restoration intent'),
      packQuestion('restoration', 'RESTO02', 'service', 'Best mold remediation company near {geo}.', 'Mold service query'),
      packQuestion('restoration', 'RESTO03', 'local_proof', 'Top-rated restoration company near me with 24/7 service in {geo}.', '24/7 proof query'),
      packQuestion('restoration', 'RESTO04', 'competitors', 'Compare {brand} and {competitor} for water damage response time and reputation.', 'Restoration comparison'),
    ],
  },
  {
    id: 'moving',
    label: 'Moving',
    niche: 'moving company',
    targetNotes: 'Residential moves, apartment moves, and storage create frequent local searches with review risk.',
    keywords: ['movers', 'moving company', 'local movers', 'storage movers'],
    questions: [
      packQuestion('moving', 'MOVE01', 'category_geo', 'Best moving company in {geo}.', 'Moving shortlist'),
      packQuestion('moving', 'MOVE02', 'service', 'Who should I hire for a local apartment move near {geo}?', 'Apartment moving intent'),
      packQuestion('moving', 'MOVE03', 'cost', 'How much do local movers cost in {geo}?', 'Moving cost query'),
      packQuestion('moving', 'MOVE04', 'local_proof', 'Trustworthy movers near me in {geo} with strong reviews.', 'Trust-led moving query'),
    ],
  },
  {
    id: 'senior-care',
    label: 'Senior Care',
    niche: 'home care agency',
    targetNotes: 'Families ask AI for trusted care options; proof, reviews, and local reputation matter heavily.',
    keywords: ['home care agency', 'senior care', 'in-home care', 'caregiver services'],
    questions: [
      packQuestion('senior-care', 'CARE01', 'category_geo', 'Best home care agencies for seniors in {geo}.', 'Senior care shortlist'),
      packQuestion('senior-care', 'CARE02', 'service', 'Who provides reliable in-home caregiver services near {geo}?', 'Caregiver service intent'),
      packQuestion('senior-care', 'CARE03', 'decision', 'Is {brand} a trustworthy home care agency?', 'Care trust check'),
      packQuestion('senior-care', 'CARE04', 'cost', 'How much does senior home care cost in {geo}?', 'Care cost query'),
    ],
  },
  {
    id: 'child-care',
    label: 'Child Care',
    niche: 'child care center',
    targetNotes: 'Parents compare trust, licensing, reviews, and availability before calling.',
    keywords: ['daycare', 'child care center', 'preschool', 'early learning'],
    questions: [
      packQuestion('child-care', 'CHILD01', 'category_geo', 'Best daycare or child care centers in {geo}.', 'Child care shortlist'),
      packQuestion('child-care', 'CHILD02', 'local_proof', 'Child care near me in {geo} with strong parent reviews.', 'Parent review query'),
      packQuestion('child-care', 'CHILD03', 'decision', 'Is {brand} a good child care option for families?', 'Family decision query'),
      packQuestion('child-care', 'CHILD04', 'problem_solution', 'What should I look for in a daycare in {geo}? Recommend specific centers.', 'Buyer education query'),
    ],
  },
  {
    id: 'chiropractic',
    label: 'Chiropractic',
    niche: 'chiropractor',
    targetNotes: 'Patients search by pain problem, proximity, reviews, insurance, and trust.',
    keywords: ['chiropractor', 'back pain chiropractor', 'sports injury chiropractor'],
    questions: [
      packQuestion('chiropractic', 'CHIRO01', 'category_geo', 'Best chiropractor in {geo}.', 'Chiropractor shortlist'),
      packQuestion('chiropractic', 'CHIRO02', 'problem_solution', 'Who should I see for back pain near {geo}?', 'Pain/problem query'),
      packQuestion('chiropractic', 'CHIRO03', 'decision', 'Is {brand} a reputable chiropractor?', 'Provider trust query'),
      packQuestion('chiropractic', 'CHIRO04', 'local_proof', 'Chiropractor near me with great reviews in {geo}.', 'Review-led near-me query'),
    ],
  },
  {
    id: 'veterinary',
    label: 'Veterinary',
    niche: 'veterinary clinic',
    targetNotes: 'Pet owners ask for trusted local recommendations, emergency care, and review-backed clinics.',
    keywords: ['veterinarian', 'animal hospital', 'emergency vet', 'pet clinic'],
    questions: [
      packQuestion('veterinary', 'VET01', 'category_geo', 'Best veterinary clinic in {geo}.', 'Vet shortlist'),
      packQuestion('veterinary', 'VET02', 'service', 'Who offers emergency vet care near {geo}?', 'Emergency vet intent'),
      packQuestion('veterinary', 'VET03', 'decision', 'Is {brand} a good animal hospital for pets?', 'Animal hospital trust query'),
      packQuestion('veterinary', 'VET04', 'local_proof', 'Vet near me in {geo} with strong reviews.', 'Near-me review query'),
    ],
  },
  {
    id: 'insurance',
    label: 'Insurance Agency',
    niche: 'insurance agency',
    targetNotes: 'Independent agencies compete on local trust, bundled products, and comparison searches.',
    keywords: ['insurance agency', 'auto insurance', 'home insurance', 'business insurance'],
    questions: [
      packQuestion('insurance', 'INS01', 'category_geo', 'Best independent insurance agencies in {geo}.', 'Agency shortlist'),
      packQuestion('insurance', 'INS02', 'service', 'Who can help compare home and auto insurance near {geo}?', 'Bundle comparison intent'),
      packQuestion('insurance', 'INS03', 'decision', 'Is {brand} a good insurance agency?', 'Agency trust query'),
      packQuestion('insurance', 'INS04', 'competitors', 'Compare {brand} and {competitor} for local insurance advice and value.', 'Agency comparison'),
    ],
  },
  {
    id: 'financial-advisor',
    label: 'Financial Advisor',
    niche: 'financial advisor',
    targetNotes: 'Advisory firms sell trust; AI visibility depends on authority, credentials, and third-party proof.',
    keywords: ['financial advisor', 'retirement planning', 'wealth management', 'fiduciary advisor'],
    questions: [
      packQuestion('financial-advisor', 'FIN01', 'category_geo', 'Best financial advisors in {geo}.', 'Advisor shortlist'),
      packQuestion('financial-advisor', 'FIN02', 'service', 'Who should I hire for retirement planning near {geo}?', 'Retirement planning query'),
      packQuestion('financial-advisor', 'FIN03', 'decision', 'Is {brand} a reputable financial advisor?', 'Advisor trust query'),
      packQuestion('financial-advisor', 'FIN04', 'problem_solution', 'What should I look for in a fiduciary financial advisor?', 'Education plus advisor recommendation'),
    ],
  },
  {
    id: 'wedding',
    label: 'Wedding Services',
    niche: 'wedding venue or vendor',
    targetNotes: 'Venues, planners, photographers, florists, and caterers win from comparison-heavy local AI answers.',
    keywords: ['wedding venue', 'wedding planner', 'wedding photographer', 'wedding florist'],
    questions: [
      packQuestion('wedding', 'WED01', 'category_geo', 'Best wedding venues and vendors in {geo}.', 'Wedding vendor shortlist'),
      packQuestion('wedding', 'WED02', 'service', 'Who should I hire for a wedding near {geo}?', 'Wedding planning intent'),
      packQuestion('wedding', 'WED03', 'cost', 'How much should I budget for a wedding vendor in {geo}?', 'Wedding budget query'),
      packQuestion('wedding', 'WED04', 'competitors', 'Compare {brand} and {competitor} for wedding experience, reviews, and value.', 'Wedding vendor comparison'),
    ],
  },
  {
    id: 'marketing-agency',
    label: 'Marketing Agency',
    niche: 'marketing agency',
    targetNotes: 'Useful when selling the service to local agencies, web designers, PPC firms, and SEO providers.',
    keywords: ['marketing agency', 'SEO agency', 'web design agency', 'PPC agency'],
    questions: [
      packQuestion('marketing-agency', 'MKT01', 'category_geo', 'Best marketing agencies in {geo}.', 'Agency shortlist'),
      packQuestion('marketing-agency', 'MKT02', 'service', 'Who should I hire for SEO and AI search visibility near {geo}?', 'SEO and AI search intent'),
      packQuestion('marketing-agency', 'MKT03', 'decision', 'Is {brand} a good marketing agency for local businesses?', 'Agency trust query'),
      packQuestion('marketing-agency', 'MKT04', 'competitors', 'Compare {brand} and {competitor} for SEO, paid ads, and website strategy.', 'Agency comparison'),
    ],
  },
];

export const TIER_QUERY_LIMITS: Record<1 | 2 | 3, number> = {
  1: 5,
  2: 15,
  3: 45,
};

export function getGeo(profile: AuditBusinessProfile): string {
  return [profile.city, profile.state].filter(Boolean).join(', ') || 'the local area';
}

export function normalizeDomain(url?: string): string {
  if (!url) return '';
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  }
}

export function renderVisibilityQuestions(
  profile: AuditBusinessProfile,
  templates: VisibilityQueryTemplate[],
  options?: { limit?: number; jobToBeDone?: string }
): RenderedVisibilityQuery[] {
  const geo = getGeo(profile);
  const jobToBeDone = options?.jobToBeDone || 'the most common customer project';
  const rendered: RenderedVisibilityQuery[] = [];

  for (const template of templates) {
    const needsCompetitor = template.template.includes('{competitor}');
    const competitors = needsCompetitor ? sanitizeCompetitorSuggestions(profile.competitors.filter(Boolean), profile) : [undefined];
    if (needsCompetitor && competitors.length === 0) continue;
    if (template.template.includes('{geo}') && !geo) continue;
    if (template.template.includes('{niche}') && !profile.niche.trim()) continue;

    for (const competitor of competitors) {
      const prompt = template.template
        .replaceAll('{brand}', profile.brand.trim() || 'the business')
        .replaceAll('{competitor}', competitor || 'a competitor')
        .replaceAll('{geo}', geo)
        .replaceAll('{niche}', profile.niche.trim() || 'local business')
        .replaceAll('{job_to_be_done}', jobToBeDone);

      rendered.push({
        id: `${template.code}-${competitor || 'base'}`,
        code: template.code,
        category: template.category,
        prompt,
        template: template.template,
        competitor,
        industryPackId: template.industryPackId,
      });
    }
  }

  return typeof options?.limit === 'number' ? selectQuestionSample(rendered, options.limit) : rendered;
}

function selectQuestionSample(questions: RenderedVisibilityQuery[], limit: number): RenderedVisibilityQuery[] {
  if (limit >= questions.length) return questions;

  const byCategory = QUESTION_CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = questions.filter(question => question.category === category);
    return acc;
  }, {} as Record<VisibilityQueryCategory, RenderedVisibilityQuery[]>);
  const targets = getCategoryTargets(limit);
  const selected: RenderedVisibilityQuery[] = [];
  const selectedIds = new Set<string>();

  const takeFromCategory = (category: VisibilityQueryCategory, count: number) => {
    for (const question of byCategory[category]) {
      if (selected.length >= limit || count <= 0) return;
      if (selectedIds.has(question.id)) continue;
      selected.push(question);
      selectedIds.add(question.id);
      count -= 1;
    }
  };

  for (const category of QUESTION_CATEGORY_ORDER) {
    takeFromCategory(category, targets[category] || 0);
  }

  while (selected.length < limit) {
    const before = selected.length;
    for (const category of QUESTION_CATEGORY_ORDER) {
      takeFromCategory(category, 1);
      if (selected.length >= limit) break;
    }
    if (selected.length === before) break;
  }

  return selected.slice(0, limit);
}

function getCategoryTargets(limit: number): Partial<Record<VisibilityQueryCategory, number>> {
  if (limit <= 5) {
    return {
      brand_health: 1,
      category_geo: 1,
      competitors: 1,
      service: 1,
      cost: 1,
    };
  }

  if (limit <= 20) {
    return {
      brand_health: 3,
      category_geo: 4,
      competitors: 2,
      service: 3,
      problem_solution: 1,
      cost: 2,
      decision: Math.max(0, limit - 15),
    };
  }

  return {
    brand_health: 8,
    category_geo: 11,
    competitors: 6,
    service: 10,
    problem_solution: 5,
    cost: 5,
  };
}

export function getQuestionTemplatesForPack(packId: string): VisibilityQueryTemplate[] {
  const pack = INDUSTRY_QUESTION_PACKS.find(item => item.id === packId);
  return [...CORE_QUERY_TEMPLATES, ...(pack?.questions || [])];
}

export function getTemplatesForAuditProfile(packId: string, auditProfileId: AuditProfileId): VisibilityQueryTemplate[] {
  const base = getQuestionTemplatesForPack(packId);
  if (auditProfileId === 'madison-mvp' || auditProfileId === 'full-audit') {
    return [...base, ...MADISON_LOCAL_QUERY_TEMPLATES];
  }
  return base;
}

export function getAuditProfileConfig(auditProfileId: AuditProfileId): AuditProfileConfig {
  return AUDIT_PROFILES.find(profile => profile.id === auditProfileId) || AUDIT_PROFILES[0];
}

export function findBestIndustryPack(niche: string): IndustryQuestionPack {
  const normalized = niche.toLowerCase();
  return (
    INDUSTRY_QUESTION_PACKS.find(pack => {
      const label = pack.label.toLowerCase();
      const packNiche = pack.niche.toLowerCase();
      const keywords = (pack.keywords || []).map(keyword => keyword.toLowerCase());
      return (
        normalized.includes(label) ||
        normalized.includes(packNiche) ||
        label.includes(normalized) ||
        keywords.some(keyword => normalized.includes(keyword) || keyword.includes(normalized))
      );
    }) || INDUSTRY_QUESTION_PACKS[0]
  );
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createAuditRun(query: RenderedVisibilityQuery, provider: VisibilityProviderId): VisibilityAuditRun {
  return {
    id: createId(`${query.id}-${provider}`),
    query,
    provider,
    status: 'pending',
    captureMode: 'api',
    qaStatus: 'unreviewed',
    caveatText: DEFAULT_AUDIT_CAVEAT,
  };
}

export function scoreAuditResponse(
  responseText: string,
  profile: AuditBusinessProfile,
  citations: Citation[] = []
): VisibilityScore {
  const text = responseText || '';
  const normalizedText = text.toLowerCase();
  const brandTerms = [profile.brand, ...(profile.aliases || [])].map(term => term.trim()).filter(Boolean);
  const brandTerm = brandTerms.find(term => normalizedText.includes(term.toLowerCase()));
  const brandMentioned = Boolean(brandTerm);
  const competitorsMentioned = sanitizeCompetitorSuggestions(profile.competitors, profile)
    .filter(name => normalizedText.includes(name.toLowerCase()));

  const brandPosition = getBrandPosition(normalizedText, brandTerm, competitorsMentioned);
  const brandSentiment = detectSentiment(normalizedText, brandTerm);
  const domain = normalizeDomain(profile.website);
  const brandWithCitation =
    brandMentioned &&
    citations.some(citation => {
      const citationDomain = normalizeDomain(citation.url);
      return Boolean(domain && citationDomain.includes(domain));
    });

  const recencySignal = /\b(2026|2025|recent|updated|latest|this year|new review|current)\b/i.test(text);
  const hallucinationFlag =
    brandMentioned &&
    /\b(closed|permanently closed|out of business|bankrupt|no longer operating)\b/i.test(text);

  const notes = [
    brandMentioned ? `Brand mentioned${brandPosition ? ` in position tier ${brandPosition}` : ''}` : 'Brand not mentioned',
    competitorsMentioned.length ? `${competitorsMentioned.length} competitor mention(s)` : 'No configured competitors mentioned',
    brandWithCitation ? 'Brand citation found' : 'No brand citation found',
  ].join('. ');

  const workbookScore = deriveWorkbookScore({
    brandMentioned,
    brandPosition,
    brandSentiment,
    brandWithCitation,
    competitorCount: competitorsMentioned.length,
    hallucinationFlag,
  });

  return {
    brandMentioned,
    brandPosition,
    brandSentiment,
    brandWithCitation,
    competitorsMentioned,
    competitorCount: competitorsMentioned.length,
    recencySignal,
    hallucinationFlag,
    workbookScore,
    confidence: deriveScoreConfidence(text, citations, brandMentioned, competitorsMentioned.length),
    notes,
  };
}

function deriveWorkbookScore(input: {
  brandMentioned: boolean;
  brandPosition: 1 | 2 | 3 | null;
  brandSentiment: 'positive' | 'neutral' | 'negative';
  brandWithCitation: boolean;
  competitorCount: number;
  hallucinationFlag: boolean;
}): 0 | 1 | 2 | 3 | 4 | 5 {
  if (input.hallucinationFlag || (input.brandMentioned && input.brandSentiment === 'negative')) return 0;
  if (input.brandMentioned && input.brandPosition === 1 && input.brandWithCitation && input.brandSentiment === 'positive') return 5;
  if (input.brandMentioned && input.brandPosition && input.brandPosition <= 2 && input.brandWithCitation) return 4;
  if (input.brandMentioned) return 3;
  if (input.competitorCount > 0) return 1;
  return 2;
}

function deriveScoreConfidence(
  responseText: string,
  citations: Citation[],
  brandMentioned: boolean,
  competitorCount: number
): number {
  let confidence = 0.56;
  if (responseText.length > 600) confidence += 0.12;
  if (citations.length > 0) confidence += 0.12;
  if (brandMentioned) confidence += 0.1;
  if (competitorCount > 0) confidence += 0.06;
  return roundToTwo(Math.min(0.96, confidence));
}

function getBrandPosition(
  normalizedText: string,
  brandTerm: string | undefined,
  competitorsMentioned: string[]
): 1 | 2 | 3 | null {
  if (!brandTerm) return null;
  const brandIndex = normalizedText.indexOf(brandTerm.toLowerCase());
  const competitorIndexes = competitorsMentioned
    .map(name => normalizedText.indexOf(name.toLowerCase()))
    .filter(index => index >= 0);
  const firstCompetitorIndex = competitorIndexes.length ? Math.min(...competitorIndexes) : Number.POSITIVE_INFINITY;

  if (brandIndex <= 450 || brandIndex < firstCompetitorIndex) return 1;
  if (brandIndex <= 1200) return 2;
  return 3;
}

function detectSentiment(
  normalizedText: string,
  brandTerm: string | undefined
): 'positive' | 'neutral' | 'negative' {
  if (!brandTerm) return 'neutral';
  const index = normalizedText.indexOf(brandTerm.toLowerCase());
  const windowText = normalizedText.slice(Math.max(0, index - 220), index + 520);
  const negativeHits = [
    'complaint',
    'poor',
    'bad',
    'negative',
    'unreliable',
    'avoid',
    'lawsuit',
    'expensive',
    'slow',
    'inconsistent',
  ].filter(term => windowText.includes(term)).length;
  const positiveHits = [
    'reliable',
    'recommended',
    'reputable',
    'highly rated',
    'strong reviews',
    'trusted',
    'professional',
    'excellent',
    'best',
    'top-rated',
  ].filter(term => windowText.includes(term)).length;

  if (negativeHits > positiveHits) return 'negative';
  if (positiveHits > 0) return 'positive';
  return 'neutral';
}

export function computeVisibilityMetrics(runs: VisibilityAuditRun[]): VisibilityMetrics {
  const excludedCount = runs.filter(run => run.qaStatus === 'excluded').length;
  const scoredRuns = runs.filter(
    run => run.score && run.qaStatus !== 'excluded' && (run.status === 'captured' || run.status === 'manual')
  );
  const runCount = runs.length;
  const capturedCount = scoredRuns.length;

  if (capturedCount === 0) {
    return {
      visibilityScore: 0,
      grade: 'F',
      workbookAverage: 0,
      dominantCount: 0,
      topThreeCount: 0,
      harmfulCount: 0,
      excludedCount,
      highImpactMissCount: runs.filter(run => run.qaStatus === 'high_impact_miss').length,
      approvedCount: runs.filter(run => run.qaStatus === 'approved').length,
      needsReviewCount: runs.filter(run => run.qaStatus === 'needs_review').length,
      mentionRate: 0,
      positionScore: 0,
      sentimentScore: 0,
      citationRate: 0,
      competitorDominanceRatio: 0,
      runCount,
      capturedCount,
      brandMentionCount: 0,
      citationCount: 0,
    };
  }

  const brandMentionCount = scoredRuns.filter(run => run.score?.brandMentioned).length;
  const citationCount = scoredRuns.filter(run => run.score?.brandWithCitation).length;
  const workbookAverage = roundToTwo(
    scoredRuns.reduce((sum, run) => sum + (run.score?.workbookScore ?? 0), 0) / capturedCount
  );
  const dominantCount = scoredRuns.filter(run => run.score?.workbookScore === 5).length;
  const topThreeCount = scoredRuns.filter(run => (run.score?.workbookScore ?? 0) >= 4).length;
  const harmfulCount = scoredRuns.filter(run => run.score?.workbookScore === 0).length;
  const mentionRate = brandMentionCount / capturedCount;
  const positionScore =
    scoredRuns.reduce((sum, run) => {
      switch (run.score?.brandPosition) {
        case 1:
          return sum + 1;
        case 2:
          return sum + 0.6;
        case 3:
          return sum + 0.3;
        default:
          return sum;
      }
    }, 0) / capturedCount;
  const sentimentScore =
    scoredRuns.reduce((sum, run) => {
      switch (run.score?.brandSentiment) {
        case 'positive':
          return sum + 1;
        case 'neutral':
          return sum + 0.6;
        case 'negative':
          return sum;
        default:
          return sum;
      }
    }, 0) / capturedCount;
  const citationRate = citationCount / capturedCount;
  const competitorMentionCount = scoredRuns.reduce((sum, run) => sum + (run.score?.competitorCount || 0), 0);
  const totalMentionSignals = brandMentionCount + competitorMentionCount;
  const competitorDominanceRatio = totalMentionSignals > 0 ? competitorMentionCount / totalMentionSignals : 0;

  const visibilityScore = roundToTwo(
    (0.4 * mentionRate +
      0.25 * positionScore +
      0.15 * sentimentScore +
      0.1 * citationRate +
      0.1 * (1 - competitorDominanceRatio)) *
      100
  );

  return {
    visibilityScore,
    grade: getGrade(visibilityScore),
    workbookAverage,
    dominantCount,
    topThreeCount,
    harmfulCount,
    excludedCount,
    highImpactMissCount: runs.filter(run => run.qaStatus === 'high_impact_miss').length,
    approvedCount: runs.filter(run => run.qaStatus === 'approved').length,
    needsReviewCount: runs.filter(run => run.qaStatus === 'needs_review').length,
    mentionRate,
    positionScore,
    sentimentScore,
    citationRate,
    competitorDominanceRatio,
    runCount,
    capturedCount,
    brandMentionCount,
    citationCount,
  };
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getGrade(score: number): VisibilityMetrics['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

const FIX_PLAYBOOKS: Record<string, FixPlaybook> = {
  NO_SCHEMA: {
    title: 'Add LocalBusiness and service schema',
    effort: 'medium',
    expectedLift: 'Improves entity confidence and citation eligibility',
    steps: [
      { step: 'Audit existing schema', detail: 'Validate homepage, location, and top service pages.', owner: 'agency' },
      { step: 'Add LocalBusiness schema', detail: 'Include name, address, hours, services, sameAs, and geo.', owner: 'agency' },
      { step: 'Add FAQ schema', detail: 'Publish buyer-intent Q&A on top service pages.', owner: 'agency' },
      { step: 'Validate and resubmit', detail: 'Use Schema.org validator and resubmit sitemap.', owner: 'agency' },
    ],
  },
  WEAK_ENTITIES: {
    title: 'Strengthen entity associations',
    effort: 'medium',
    expectedLift: 'Helps LLMs connect the brand to services, locations, and proof points',
    steps: [
      { step: 'Standardize NAP', detail: 'Use one canonical name, address, phone, and website across profiles.', owner: 'agency' },
      { step: 'Add sameAs links', detail: 'Connect GBP, social profiles, directories, and review platforms.', owner: 'agency' },
      { step: 'Build entity page copy', detail: 'Use consistent service, location, founder, and credential language.', owner: 'agency' },
    ],
  },
  NO_AUTHORITY_LINKS: {
    title: 'Build authoritative citations',
    effort: 'high',
    expectedLift: 'Creates third-party evidence that search-grounded models can cite',
    steps: [
      { step: 'Map citation gaps', detail: 'Check whether top LLM answers cite competitors, directories, or publishers.', owner: 'agency' },
      { step: 'Claim authoritative profiles', detail: 'Complete listings on high-authority niche and local directories.', owner: 'agency' },
      { step: 'Earn local mentions', detail: 'Pursue chamber, sponsor, association, and local news mentions.', owner: 'client' },
    ],
  },
  WEAK_GBP: {
    title: 'Optimize Google Business Profile',
    effort: 'medium',
    expectedLift: 'Improves local near-me discovery and confidence signals',
    steps: [
      { step: 'Complete GBP fields', detail: 'Audit categories, services, description, photos, hours, and service area.', owner: 'agency' },
      { step: 'Publish weekly updates', detail: 'Add posts and photos tied to priority services.', owner: 'client' },
      { step: 'Seed Q&A', detail: 'Answer common buyer questions directly on GBP.', owner: 'agency' },
    ],
  },
  NO_LOCAL_CONTENT: {
    title: 'Publish location-specific service pages',
    effort: 'medium',
    expectedLift: 'Expands local relevance for high-intent geographic prompts',
    steps: [
      { step: 'Prioritize service areas', detail: 'Choose the highest-value city and neighborhood combinations.', owner: 'agency' },
      { step: 'Create local pages', detail: 'Add proof, photos, FAQs, reviews, and service details for each location.', owner: 'agency' },
      { step: 'Internally link pages', detail: 'Link location pages from navigation and relevant service pages.', owner: 'agency' },
    ],
  },
  LOW_REVIEW_VELOCITY: {
    title: 'Increase review velocity and diversity',
    effort: 'low',
    expectedLift: 'Improves trust language and reduces negative-answer risk',
    steps: [
      { step: 'Launch review request flow', detail: 'Ask recent happy customers on Google and vertical platforms.', owner: 'client' },
      { step: 'Respond to reviews', detail: 'Reply to new and old reviews with service and location detail.', owner: 'client' },
      { step: 'Diversify sources', detail: 'Add reviews on BBB, Yelp, Angi, Avvo, Healthgrades, or niche sites as relevant.', owner: 'agency' },
    ],
  },
  OUTDATED_INFO: {
    title: 'Clean up inconsistent business facts',
    effort: 'low',
    expectedLift: 'Reduces hallucinated hours, service, location, or status claims',
    steps: [
      { step: 'Audit facts', detail: 'Check hours, address, services, phone, and founder names across top sources.', owner: 'agency' },
      { step: 'Fix high-risk profiles', detail: 'Update GBP, Yelp, Facebook, directories, and website footer.', owner: 'agency' },
      { step: 'Publish current proof', detail: 'Add recent project, review, or news content dated this quarter.', owner: 'client' },
    ],
  },
  COMPETITOR_DOMINANCE: {
    title: 'Build competitor displacement pages',
    effort: 'high',
    expectedLift: 'Gives models a reason to mention the brand in comparison and best-of answers',
    steps: [
      { step: 'Identify dominant competitors', detail: 'List the competitors most often recommended ahead of the brand.', owner: 'agency' },
      { step: 'Create comparison content', detail: 'Publish fair comparison pages and alternatives pages with proof points.', owner: 'agency' },
      { step: 'Add third-party proof', detail: 'Support claims with reviews, awards, certifications, and case studies.', owner: 'client' },
    ],
  },
  THIN_CONTENT: {
    title: 'Expand thin service and proof pages',
    effort: 'medium',
    expectedLift: 'Gives AI systems more answer-ready facts, services, FAQs, and local proof to quote',
    steps: [
      { step: 'Identify thin pages', detail: 'Use the SEO audit page list to find services below 600 useful words or missing proof.', owner: 'agency' },
      { step: 'Add answer-ready sections', detail: 'Add FAQs, pricing factors, process, before/after proof, reviews, and city/service examples.', owner: 'agency' },
      { step: 'Link from core pages', detail: 'Use internal links from homepage, service hub, and location pages.', owner: 'agency' },
    ],
  },
  WEBSITE_PERFORMANCE: {
    title: 'Fix crawlability and technical health issues',
    effort: 'medium',
    expectedLift: 'Improves search accessibility and reduces the chance that answer engines miss important site evidence',
    steps: [
      { step: 'Review technical audit', detail: 'Check failing pages, missing metadata, canonical issues, speed warnings, and crawl blockers.', owner: 'agency' },
      { step: 'Fix high-impact templates', detail: 'Prioritize homepage, service pages, location pages, and conversion pages.', owner: 'agency' },
      { step: 'Re-crawl and re-audit', detail: 'Confirm the SEO audit health score improves before the LLM re-audit.', owner: 'agency' },
    ],
  },
  AI_BOT_BLOCKED: {
    title: 'Review robots.txt and AI/search bot access',
    effort: 'low',
    expectedLift: 'Reduces avoidable source-access problems for search-grounded AI answers',
    steps: [
      { step: 'Inspect robots.txt', detail: 'Check GPTBot, ClaudeBot, PerplexityBot, Googlebot, and Bingbot directives.', owner: 'agency' },
      { step: 'Unblock where appropriate', detail: 'Coordinate with the client on policy, then remove accidental blocks for desired crawlers.', owner: 'agency' },
      { step: 'Resubmit sitemap', detail: 'Make the most important pages easy to discover after policy changes.', owner: 'agency' },
    ],
  },
};

export function mapFindings(runs: VisibilityAuditRun[], metrics: VisibilityMetrics, profile?: AuditBusinessProfile): RootCauseFinding[] {
  const scoredRuns = runs.filter(
    run => run.score && run.qaStatus !== 'excluded' && (run.status === 'captured' || run.status === 'manual')
  );
  const findings: RootCauseFinding[] = [];
  const evidence = (predicate: (run: VisibilityAuditRun) => boolean) =>
    scoredRuns.filter(predicate).slice(0, 3).map(run => `${PROVIDER_LABELS[run.provider]}: ${run.query.prompt}`);
  const pushFinding = (finding: RootCauseFinding) => {
    if (!findings.some(existing => existing.code === finding.code)) findings.push(finding);
  };

  if (metrics.mentionRate < 0.3 && metrics.competitorDominanceRatio > 0.6) {
    pushFinding({
      code: 'COMPETITOR_DOMINANCE',
      category: 'competitive',
      title: 'Competitors crowd out the brand',
      severity: 3,
      description: 'The brand is absent in most answers while configured competitors appear frequently.',
      evidence: evidence(run => Boolean(run.score && !run.score.brandMentioned && run.score.competitorCount > 0)),
      recommendedFix: FIX_PLAYBOOKS.COMPETITOR_DOMINANCE,
    });
  }

  if (metrics.citationRate === 0 && scoredRuns.length > 0) {
    pushFinding({
      code: 'NO_AUTHORITY_LINKS',
      category: 'authority',
      title: 'No citations support the brand',
      severity: 2,
      description: 'Captured answers did not cite the client website or another source supporting brand claims.',
      evidence: evidence(run => Boolean(run.score && !run.score.brandWithCitation)),
      recommendedFix: FIX_PLAYBOOKS.NO_AUTHORITY_LINKS,
    });
    pushFinding({
      code: 'NO_SCHEMA',
      category: 'technical',
      title: 'Likely missing structured entity signals',
      severity: 2,
      description: 'A lack of brand citations often indicates weak schema, sameAs, and entity confidence signals.',
      evidence: evidence(run => Boolean(run.score && run.score.brandMentioned && !run.score.brandWithCitation)),
      recommendedFix: FIX_PLAYBOOKS.NO_SCHEMA,
    });
  } else if (metrics.citationRate < 0.25 && metrics.mentionRate >= 0.3) {
    pushFinding({
      code: 'WEAK_ENTITIES',
      category: 'technical',
      title: 'Brand appears without strong source backing',
      severity: 2,
      description: 'The brand is mentioned, but answers rarely cite sources that validate the recommendation.',
      evidence: evidence(run => Boolean(run.score && run.score.brandMentioned && !run.score.brandWithCitation)),
      recommendedFix: FIX_PLAYBOOKS.WEAK_ENTITIES,
    });
  }

  const localRuns = scoredRuns.filter(run => ['category_geo', 'local_proof', 'local'].includes(run.query.category as string));
  const localMentionRate = localRuns.length
    ? localRuns.filter(run => run.score?.brandMentioned).length / localRuns.length
    : 1;
  if (localRuns.length > 0 && localMentionRate < 0.5) {
    pushFinding({
      code: 'WEAK_GBP',
      category: 'local',
      title: 'Weak near-me visibility',
      severity: 2,
      description: 'The brand is not consistently recommended for local near-me prompts.',
      evidence: localRuns.slice(0, 3).map(run => `${PROVIDER_LABELS[run.provider]}: ${run.query.prompt}`),
      recommendedFix: FIX_PLAYBOOKS.WEAK_GBP,
    });
    pushFinding({
      code: 'NO_LOCAL_CONTENT',
      category: 'local',
      title: 'Insufficient location-specific content',
      severity: 2,
      description: 'Local prompts need stronger city, service area, and proof content.',
      evidence: localRuns.slice(0, 3).map(run => `${PROVIDER_LABELS[run.provider]}: ${run.query.prompt}`),
      recommendedFix: FIX_PLAYBOOKS.NO_LOCAL_CONTENT,
    });
  }

  if (scoredRuns.some(run => run.score?.brandSentiment === 'negative')) {
    pushFinding({
      code: 'LOW_REVIEW_VELOCITY',
      category: 'reputation',
      title: 'Reputation language needs reinforcement',
      severity: 2,
      description: 'At least one answer frames the brand negatively or surfaces complaints.',
      evidence: evidence(run => run.score?.brandSentiment === 'negative'),
      recommendedFix: FIX_PLAYBOOKS.LOW_REVIEW_VELOCITY,
    });
  }

  if (scoredRuns.some(run => run.score?.hallucinationFlag)) {
    pushFinding({
      code: 'OUTDATED_INFO',
      category: 'technical',
      title: 'Possible outdated or incorrect business facts',
      severity: 3,
      description: 'At least one answer appears to contain a serious factual error about the brand.',
      evidence: evidence(run => Boolean(run.score?.hallucinationFlag)),
      recommendedFix: FIX_PLAYBOOKS.OUTDATED_INFO,
    });
  }

  const seo = profile?.seoAuditSignals;
  if (profile?.schemaStatus === 'missing' || profile?.schemaStatus === 'thin' || (seo?.pagesAnalyzed && (seo.pagesWithSchema || 0) === 0)) {
    pushFinding({
      code: 'NO_SCHEMA',
      category: 'technical',
      title: 'SEO audit shows weak structured data',
      severity: profile?.schemaStatus === 'missing' ? 3 : 2,
      description: 'The SEO audit context indicates missing or thin schema on pages that should help AI systems understand the business entity.',
      evidence: [`SEO signal: schema status is ${profile?.schemaStatus || 'unknown'}; pages with schema ${seo?.pagesWithSchema ?? 'unknown'} of ${seo?.pagesAnalyzed ?? 'unknown'}.`],
      recommendedFix: FIX_PLAYBOOKS.NO_SCHEMA,
    });
  }

  if (profile?.gbpSignal === 'weak') {
    pushFinding({
      code: 'WEAK_GBP',
      category: 'local',
      title: 'SEO audit shows weak Google Business Profile signals',
      severity: 2,
      description: 'The local SEO context marks GBP strength as weak, which can suppress near-me recommendation confidence.',
      evidence: ['SEO signal: Google Business Profile is marked weak.'],
      recommendedFix: FIX_PLAYBOOKS.WEAK_GBP,
    });
  }

  if (profile?.reviewSignal === 'weak' || (seo?.competitorReviewGap || 0) > 0) {
    pushFinding({
      code: 'LOW_REVIEW_VELOCITY',
      category: 'reputation',
      title: 'SEO audit shows review proof gap',
      severity: 2,
      description: 'The SEO audit context indicates weak review proof or a review-count gap versus competitors.',
      evidence: [`SEO signal: ${seo?.reviewCount ?? 'unknown'} reviews, ${seo?.averageRating ?? 'unknown'} average rating, competitor review gap ${seo?.competitorReviewGap ?? 'unknown'}.`],
      recommendedFix: FIX_PLAYBOOKS.LOW_REVIEW_VELOCITY,
    });
  }

  if ((seo?.thinContentPages || 0) > 0) {
    pushFinding({
      code: 'THIN_CONTENT',
      category: 'content',
      title: 'SEO audit shows thin content pages',
      severity: 2,
      description: 'Thin service or location pages leave models with too little evidence to answer buyer questions confidently.',
      evidence: [`SEO signal: ${seo?.thinContentPages} thin content page${seo?.thinContentPages === 1 ? '' : 's'} flagged.`],
      recommendedFix: FIX_PLAYBOOKS.THIN_CONTENT,
    });
  }

  if ((seo?.technicalHealthScore || 100) < 70 || (seo?.missingMetaCount || 0) > 0) {
    pushFinding({
      code: 'WEBSITE_PERFORMANCE',
      category: 'technical',
      title: 'SEO audit shows technical health gaps',
      severity: (seo?.technicalHealthScore || 100) < 50 ? 3 : 2,
      description: 'Technical SEO problems can make the site less crawlable and less usable as source evidence.',
      evidence: [`SEO signal: technical health ${seo?.technicalHealthScore ?? 'unknown'}/100, missing metadata count ${seo?.missingMetaCount ?? 'unknown'}.`],
      recommendedFix: FIX_PLAYBOOKS.WEBSITE_PERFORMANCE,
    });
  }

  if (seo?.aiBotsBlocked) {
    pushFinding({
      code: 'AI_BOT_BLOCKED',
      category: 'technical',
      title: 'SEO audit shows possible AI/search bot blocking',
      severity: 3,
      description: 'If key crawlers are blocked, answer engines may have less access to current site evidence.',
      evidence: ['SEO signal: AI/search crawler blocking is marked in the audit context.'],
      recommendedFix: FIX_PLAYBOOKS.AI_BOT_BLOCKED,
    });
  }

  return findings.slice(0, 8);
}

export async function runVisibilityPrompt(options: ProviderRunOptions): Promise<NormalizedVisibilityResponse> {
  if (!options.apiKey.trim()) {
    throw new Error(`${PROVIDER_LABELS[options.provider]} API key is missing`);
  }

  switch (options.provider) {
    case 'chatgpt':
      return runOpenAIVisibilityPrompt(options);
    case 'claude':
      return runClaudeVisibilityPrompt(options);
    case 'gemini':
      return runGeminiVisibilityPrompt(options);
    case 'perplexity':
      return runPerplexityVisibilityPrompt(options);
  }
}

async function runOpenAIVisibilityPrompt(options: ProviderRunOptions): Promise<NormalizedVisibilityResponse> {
  const modelId = PROVIDER_MODELS.chatgpt;
  const commonPayload = {
    model: modelId,
    instructions: SYSTEM_AUDIT_INSTRUCTION,
    input: options.prompt,
    max_output_tokens: options.maxTokens || 1400,
    tool_choice: 'auto',
    include: ['web_search_call.action.sources'],
  };
  const webSearchTool = {
    type: 'web_search',
    user_location: getOpenAILocation(options.business),
  };

  try {
    const data = await fetchJson('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...commonPayload,
        tools: [webSearchTool],
      }),
    }, 'OpenAI Responses API');

    return {
      rawText: extractOpenAIText(data),
      rawJson: data,
      citations: extractOpenAICitations(data),
      modelId,
      ranAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/web_search|tool|responses|400|404|invalid/i.test(message)) throw error;

    try {
      const data = await fetchJson('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...commonPayload,
          tools: [{ ...webSearchTool, type: 'web_search_preview' }],
        }),
      }, 'OpenAI Responses API');

      return {
        rawText: extractOpenAIText(data),
        rawJson: data,
        citations: extractOpenAICitations(data),
        modelId,
        ranAt: new Date().toISOString(),
        warnings: ['Used OpenAI web_search_preview fallback.'],
      };
    } catch {
      const data = await fetchJson('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: SYSTEM_AUDIT_INSTRUCTION },
            { role: 'user', content: options.prompt },
          ],
          max_tokens: options.maxTokens || 1400,
          temperature: 0.2,
        }),
      }, 'OpenAI Chat Completions API');

      return {
        rawText: data?.choices?.[0]?.message?.content || '',
        rawJson: data,
        citations: [],
        modelId,
        ranAt: new Date().toISOString(),
        warnings: ['OpenAI web search was unavailable; used Chat Completions fallback without web citations.'],
      };
    }
  }
}

async function runClaudeVisibilityPrompt(options: ProviderRunOptions): Promise<NormalizedVisibilityResponse> {
  const modelId = PROVIDER_MODELS.claude;
  const body = {
    model: modelId,
    max_tokens: options.maxTokens || 1400,
    system: SYSTEM_AUDIT_INSTRUCTION,
    messages: [{ role: 'user', content: options.prompt }],
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3,
        user_location: getClaudeLocation(options.business),
      },
    ],
  };

  try {
    const data = await fetchJson('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    }, 'Claude Messages API');

    return {
      rawText: extractClaudeText(data),
      rawJson: data,
      citations: extractClaudeCitations(data),
      modelId,
      ranAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/web_search|tool|model|400|404/i.test(message)) throw error;

    const fallbackModel = 'claude-3-5-haiku-latest';
    const data = await fetchJson('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: fallbackModel,
        max_tokens: options.maxTokens || 1400,
        system: SYSTEM_AUDIT_INSTRUCTION,
        messages: [{ role: 'user', content: options.prompt }],
      }),
    }, 'Claude Messages API');

    return {
      rawText: extractClaudeText(data),
      rawJson: data,
      citations: extractClaudeCitations(data),
      modelId: fallbackModel,
      ranAt: new Date().toISOString(),
      warnings: ['Claude web search was unavailable; used a non-search fallback model.'],
    };
  }
}

async function runGeminiVisibilityPrompt(options: ProviderRunOptions): Promise<NormalizedVisibilityResponse> {
  const modelId = PROVIDER_MODELS.gemini;
  const data = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': options.apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_AUDIT_INSTRUCTION}\n\nBuyer query: ${options.prompt}` }],
        },
      ],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: options.maxTokens || 1400,
      },
    }),
  }, 'Gemini API');

  return {
    rawText: extractGeminiText(data),
    rawJson: data,
    citations: extractGeminiCitations(data),
    modelId,
    ranAt: new Date().toISOString(),
  };
}

async function runPerplexityVisibilityPrompt(options: ProviderRunOptions): Promise<NormalizedVisibilityResponse> {
  const modelId = PROVIDER_MODELS.perplexity;
  const payload = {
    model: modelId,
    messages: [
      { role: 'system', content: SYSTEM_AUDIT_INSTRUCTION },
      { role: 'user', content: options.prompt },
    ],
    max_tokens: options.maxTokens || 1400,
    temperature: 0.2,
    web_search_options: {
      search_mode: 'web',
      return_related_questions: false,
      enable_search_classifier: false,
    },
  };

  try {
    const data = await fetchJson('https://api.perplexity.ai/v1/sonar', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }, 'Perplexity Sonar API');

    return {
      rawText: data?.choices?.[0]?.message?.content || '',
      rawJson: data,
      citations: extractPerplexityCitations(data),
      modelId: data?.model || modelId,
      ranAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/404|405|sonar/i.test(message)) throw error;

    const data = await fetchJson('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }, 'Perplexity Chat Completions API');

    return {
      rawText: data?.choices?.[0]?.message?.content || '',
      rawJson: data,
      citations: extractPerplexityCitations(data),
      modelId: data?.model || modelId,
      ranAt: new Date().toISOString(),
      warnings: ['Used legacy Perplexity chat completions endpoint fallback.'],
    };
  }
}

async function fetchJson(url: string, init: RequestInit, label: string): Promise<any> {
  const response = await fetch(url, init);
  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const detail = data?.error?.message || data?.message || data?.raw || response.statusText;
    throw new Error(`${label} failed (${response.status}): ${detail}`);
  }

  return data;
}

function getOpenAILocation(profile: AuditBusinessProfile): Record<string, unknown> | undefined {
  if (!profile.city && !profile.state && !profile.country) return undefined;
  return {
    type: 'approximate',
    country: (profile.country || 'US').slice(0, 2).toUpperCase(),
    city: profile.city || undefined,
    region: profile.state || undefined,
  };
}

function getClaudeLocation(profile: AuditBusinessProfile): Record<string, unknown> | undefined {
  if (!profile.city && !profile.state && !profile.country) return undefined;
  return {
    type: 'approximate',
    country: (profile.country || 'US').slice(0, 2).toUpperCase(),
    city: profile.city || undefined,
    region: profile.state || undefined,
  };
}

function extractOpenAIText(data: any): string {
  if (typeof data?.output_text === 'string') return data.output_text;
  const chunks: string[] = [];
  for (const item of data?.output || []) {
    if (item?.type === 'message') {
      for (const content of item.content || []) {
        if (typeof content?.text === 'string') chunks.push(content.text);
      }
    }
  }
  return chunks.join('\n').trim();
}

function extractOpenAICitations(data: any): Citation[] {
  const citations: Citation[] = [];
  for (const item of data?.output || []) {
    if (item?.type === 'message') {
      for (const content of item.content || []) {
        for (const annotation of content?.annotations || []) {
          if (annotation?.type === 'url_citation' && annotation?.url) {
            citations.push({
              url: annotation.url,
              title: annotation.title,
            });
          }
        }
      }
    }
    for (const source of item?.action?.sources || []) {
      if (source?.url) {
        citations.push({ url: source.url, title: source.title });
      }
    }
  }
  return uniqueCitations(citations);
}

function extractClaudeText(data: any): string {
  return (data?.content || [])
    .filter((block: any) => block?.type === 'text' && typeof block?.text === 'string')
    .map((block: any) => block.text)
    .join('\n')
    .trim();
}

function extractClaudeCitations(data: any): Citation[] {
  const citations: Citation[] = [];
  for (const block of data?.content || []) {
    if (Array.isArray(block?.citations)) {
      for (const citation of block.citations) {
        if (citation?.url) {
          citations.push({
            url: citation.url,
            title: citation.title,
            snippet: citation.cited_text,
          });
        }
      }
    }
    if (block?.type === 'web_search_tool_result') {
      const content = Array.isArray(block.content) ? block.content : [block.content];
      for (const result of content) {
        if (result?.url) {
          citations.push({
            url: result.url,
            title: result.title,
            snippet: result.page_age,
          });
        }
      }
    }
  }
  return uniqueCitations(citations);
}

function extractGeminiText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part: any) => part?.text || '').join('\n').trim();
}

function extractGeminiCitations(data: any): Citation[] {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return uniqueCitations(
    chunks
      .map((chunk: any) => ({
        url: chunk?.web?.uri || chunk?.retrievedContext?.uri,
        title: chunk?.web?.title || chunk?.retrievedContext?.title,
      }))
      .filter((citation: Citation) => Boolean(citation.url))
  );
}

function extractPerplexityCitations(data: any): Citation[] {
  const citations: Citation[] = [];
  for (const url of data?.citations || []) {
    if (typeof url === 'string') citations.push({ url });
  }
  for (const result of data?.search_results || []) {
    if (result?.url) {
      citations.push({
        url: result.url,
        title: result.title,
        snippet: result.snippet || result.date || result.last_updated,
      });
    }
  }
  return uniqueCitations(citations);
}

function uniqueCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const unique: Citation[] = [];
  for (const citation of citations) {
    if (!citation.url || seen.has(citation.url)) continue;
    seen.add(citation.url);
    unique.push(citation);
  }
  return unique.slice(0, 12);
}

export function summarizeQueryPerformance(runs: VisibilityAuditRun[]): Array<{
  query: RenderedVisibilityQuery;
  mentionRate: number;
  capturedCount: number;
  averagePosition: number | null;
}> {
  const byQuery = new Map<string, VisibilityAuditRun[]>();
  for (const run of runs) {
    if (!run.score || run.qaStatus === 'excluded') continue;
    byQuery.set(run.query.id, [...(byQuery.get(run.query.id) || []), run]);
  }

  return Array.from(byQuery.values())
    .map(queryRuns => {
      const capturedCount = queryRuns.length;
      const mentioned = queryRuns.filter(run => run.score?.brandMentioned);
      const positionValues = mentioned
        .map(run => run.score?.brandPosition)
        .filter((position): position is 1 | 2 | 3 => Boolean(position));
      return {
        query: queryRuns[0].query,
        mentionRate: capturedCount ? mentioned.length / capturedCount : 0,
        capturedCount,
        averagePosition: positionValues.length
          ? roundToTwo(positionValues.reduce((sum, value) => sum + value, 0) / positionValues.length)
          : null,
      };
    })
    .sort((a, b) => b.mentionRate - a.mentionRate);
}

export function buildCsvExport(runs: VisibilityAuditRun[]): string {
  const headers = [
    'query_code',
    'category',
    'provider',
    'status',
    'capture_mode',
    'qa_status',
    'scorer',
    'workbook_score',
    'confidence',
    'brand_mentioned',
    'brand_position',
    'sentiment',
    'brand_with_citation',
    'competitor_count',
    'screenshot_urls',
    'evidence_note',
    'caveat',
    'prompt',
    'response',
    'citations',
  ];
  const rows = runs.map(run => [
    run.query.code,
    run.query.category,
    run.provider,
    run.status,
    run.captureMode ?? '',
    run.qaStatus ?? '',
    run.scorer ?? '',
    run.score?.workbookScore ?? '',
    run.score?.confidence ?? '',
    run.score?.brandMentioned ?? '',
    run.score?.brandPosition ?? '',
    run.score?.brandSentiment ?? '',
    run.score?.brandWithCitation ?? '',
    run.score?.competitorCount ?? '',
    (run.screenshotUrls || []).join(' | '),
    run.evidenceNote ?? '',
    run.caveatText ?? DEFAULT_AUDIT_CAVEAT,
    run.query.prompt,
    run.response?.rawText ?? run.errorMessage ?? '',
    (run.response?.citations || []).map(citation => citation.url).join(' | '),
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function buildInstantAuditIntake(input: {
  website: string;
  niche?: string;
  city?: string;
  state?: string;
  currentProfile?: AuditBusinessProfile;
}): InstantAuditIntakeResult {
  const domain = normalizeDomain(input.website);
  const current = input.currentProfile;
  const inferredBrand = current?.brand?.trim() || inferBusinessNameFromWebsite(domain);
  const niche = input.niche?.trim() || current?.niche || inferNicheFromDomain(domain);
  const city = input.city?.trim() || current?.city || 'Madison';
  const state = input.state?.trim() || current?.state || 'WI';
  const services = inferServicesForNiche(niche);
  const cleanedExistingCompetitors = sanitizeCompetitorSuggestions(current?.competitors || [], {
    brand: inferredBrand,
    niche,
    city,
    state,
    country: current?.country || 'US',
    aliases: current?.aliases || [],
    competitors: [],
  });
  const suggestedCompetitors = cleanedExistingCompetitors.length
    ? []
    : suggestLocalCompetitors({
        brand: inferredBrand,
        niche,
        city,
        state,
        existingCompetitors: [],
      });
  const warnings = [
    'Website inspection is a fast intake heuristic. Verify GBP, reviews, schema, and competitors before selling the report.',
    'Competitor suggestions are intentionally restricted to named local businesses. Generic services like Google Ads, Facebook Ads, pool builders, or website design are filtered out.',
    'Live Google AI Overview and logged-out browser results should be manually pasted when they matter for evidence.',
  ];

  return {
    profile: {
      brand: inferredBrand,
      website: input.website,
      niche,
      city,
      state,
      country: current?.country || 'US',
      aliases: Array.from(new Set([...(current?.aliases || []), inferredBrand.replace(/\b(llc|inc|co|company)\b/gi, '').trim()].filter(Boolean))),
      competitors: cleanedExistingCompetitors.length ? cleanedExistingCompetitors : suggestedCompetitors.slice(0, 4),
      services,
      serviceRadiusMiles: current?.serviceRadiusMiles || 25,
      schemaStatus: current?.schemaStatus || 'unknown',
      gbpSignal: current?.gbpSignal || 'unknown',
      reviewSignal: current?.reviewSignal || 'unknown',
      seoAuditSignals: current?.seoAuditSignals,
      intakeNotes: warnings,
    },
    suggestedCompetitors,
    warnings,
    confidence: domain ? 0.72 : 0.45,
  };
}

function inferBusinessNameFromWebsite(domain: string): string {
  const base = domain.split('.')[0] || 'Local Business';
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\b(wi|madison|llc|inc)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ') || 'Local Business';
}

function inferNicheFromDomain(domain: string): string {
  const candidates: Array<[RegExp, string]> = [
    [/hvac|heating|cooling|furnace|air/i, 'HVAC contractor'],
    [/dent|smile|ortho/i, 'dentist'],
    [/roof/i, 'roofing contractor'],
    [/plumb|drain/i, 'plumber'],
    [/law|legal|attorney/i, 'law firm'],
    [/spa|aesthetic|botox|laser/i, 'medical spa'],
    [/realty|realtor|homes|properties/i, 'real estate agent'],
    [/tax|cpa|account/i, 'accounting firm'],
    [/auto|mechanic|brake|tire/i, 'auto repair shop'],
    [/landscape|lawn|yard/i, 'landscaping company'],
  ];
  return candidates.find(([pattern]) => pattern.test(domain))?.[1] || 'local service business';
}

function inferServicesForNiche(niche: string): string[] {
  const normalized = niche.toLowerCase();
  if (normalized.includes('hvac')) return ['AC repair', 'furnace replacement', 'heat pumps', 'maintenance plans'];
  if (normalized.includes('dent')) return ['family dentistry', 'emergency dentistry', 'cosmetic dentistry', 'new patient exams'];
  if (normalized.includes('roof')) return ['roof repair', 'roof replacement', 'storm damage', 'insurance claims'];
  if (normalized.includes('plumb')) return ['emergency plumbing', 'water heaters', 'drain cleaning', 'fixture repair'];
  if (normalized.includes('law') || normalized.includes('attorney')) return ['consultations', 'case reviews', 'local legal services'];
  if (normalized.includes('spa')) return ['injectables', 'laser treatments', 'skin care', 'consultations'];
  return ['core services', 'emergency service', 'high-value projects', 'consultations'];
}

export function suggestLocalCompetitors(input: {
  brand: string;
  niche: string;
  city: string;
  state: string;
  existingCompetitors?: string[];
}): string[] {
  return sanitizeCompetitorSuggestions(input.existingCompetitors || [], {
    brand: input.brand,
    niche: input.niche,
    city: input.city,
    state: input.state,
    country: 'US',
    aliases: [],
    competitors: [],
  });
}

const GENERIC_COMPETITOR_PHRASES = [
  'google ads',
  'facebook ads',
  'meta ads',
  'instagram ads',
  'paid search',
  'ppc',
  'seo',
  'local seo',
  'website design',
  'web design',
  'digital marketing',
  'social media',
  'pool builders',
  'spa builders',
  'pool builder',
  'hot tub repair',
  'hvac contractor',
  'plumber',
  'dentist',
  'law firm',
  'near me',
  'best reviewed',
  'top-rated',
  'leaders',
  'pros',
  'companies',
  'contractors',
  'services',
  'category',
  'industry',
];

const BUSINESS_NAME_HINTS = [
  'llc',
  'inc',
  'co',
  'company',
  'group',
  'studio',
  'agency',
  'partners',
  'associates',
  'family',
  'clinic',
  'center',
  'care',
  'dental',
  'smiles',
  'heating',
  'cooling',
  'plumbing',
  'electric',
  'roofing',
  'builders',
  'construction',
  'landscaping',
  'restoration',
  'automotive',
  'repair',
  'financial',
  'insurance',
  'veterinary',
  'digital',
  'media',
  'marketing',
  'design',
];

export function buildCompetitorDiscoveryPrompt(profile: AuditBusinessProfile): string {
  const geo = getGeo(profile);
  const services = profile.services?.length ? profile.services.join(', ') : profile.niche;
  return [
    `Find real direct competitors for ${profile.brand} (${profile.website || 'website unknown'}).`,
    `Business category: ${profile.niche}.`,
    `Primary market: ${geo}.`,
    `Services to match: ${services}.`,
    '',
    'Return ONLY a JSON array. Each item must use this shape:',
    '[{"name":"Actual Business Name","website":"https://example.com","city":"Madison","reason":"Why this is a direct competitor"}]',
    '',
    'Rules:',
    '- Include only named businesses that appear to sell the same or very similar service in the same local market.',
    '- Do not include advertising channels, service categories, search terms, directories, marketplaces, or tactics.',
    '- Reject generic entries such as Google Ads, Facebook Ads, Website Design, SEO, Pool Builders, Spa Builders, or Top-Rated Contractors.',
    '- Prefer businesses with their own website or Google Business Profile.',
    '- Do not include the audited brand or its aliases.',
    '- Return 6 to 10 candidates when possible.',
  ].join('\n');
}

export function parseCompetitorDiscoveryResponse(responseText: string, profile: AuditBusinessProfile): string[] {
  const names: string[] = [];
  const jsonText = extractJsonArrayText(responseText);

  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string') names.push(item);
          if (item && typeof item === 'object') {
            const candidate = item as Record<string, unknown>;
            const name = candidate.name || candidate.business || candidate.company || candidate.title;
            if (typeof name === 'string') names.push(name);
          }
        }
      }
    } catch {
      // Fall back to line parsing below.
    }
  }

  if (!names.length) {
    for (const line of responseText.split('\n')) {
      const cleaned = line
        .replace(/^[\s*+\-\d.)]+/, '')
        .replace(/\s+-\s+.*$/, '')
        .replace(/\s+\|\s+.*$/, '')
        .trim();
      if (cleaned) names.push(cleaned);
    }
  }

  return sanitizeCompetitorSuggestions(names, profile);
}

function extractJsonArrayText(value: string): string {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const source = fenced || value;
  const start = source.indexOf('[');
  const end = source.lastIndexOf(']');
  return start >= 0 && end > start ? source.slice(start, end + 1) : '';
}

export function sanitizeCompetitorSuggestions(candidates: string[], profile: AuditBusinessProfile): string[] {
  const seen = new Set<string>();
  const rejected = new Set(
    [
      profile.brand,
      ...(profile.aliases || []),
      profile.city,
      profile.state,
      'Google',
      'Facebook',
      'Meta',
      'Yelp',
      'Angi',
      'HomeAdvisor',
      'Thumbtack',
    ]
      .filter(Boolean)
      .map(value => value.toLowerCase())
  );

  return candidates
    .map(cleanCompetitorName)
    .filter(name => {
      const key = name.toLowerCase();
      if (!name || seen.has(key) || rejected.has(key)) return false;
      if (profile.brand && key.includes(profile.brand.toLowerCase())) return false;
      if (!isLikelyActualCompetitorName(name, profile)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function cleanCompetitorName(value: string): string {
  return value
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\([^)]*(?:ad|keyword|category|service|search term|not a business)[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyActualCompetitorName(name: string, profile: AuditBusinessProfile): boolean {
  const lower = name.toLowerCase().trim();
  if (name.length < 4 || name.length > 80) return false;
  if (/https?:\/\//i.test(name) || /[@{}[\]]/.test(name)) return false;
  if (/^(best|top|recommended|trusted|local|nearby)\b/i.test(name)) return false;
  if (GENERIC_COMPETITOR_PHRASES.some(phrase => lower === phrase || lower === `${profile.city.toLowerCase()} ${phrase}`)) return false;
  if (/\b(near me|search term|keyword|category|channel|campaign|ads?|services? only)\b/i.test(name)) return false;
  if (/\b(leaders|pros|companies|contractors|providers|options)\b/i.test(name)) return false;

  const words = lower.split(/\s+/).filter(Boolean);
  const genericWordCount = words.filter(word => GENERIC_COMPETITOR_PHRASES.includes(word)).length;
  const hasBusinessHint = BUSINESS_NAME_HINTS.some(hint => lower.includes(hint));
  const hasBrandShape = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}\b/.test(name) || /\b[A-Z]{2,}\b/.test(name);

  if (words.length <= 2 && genericWordCount === words.length && !hasBusinessHint) return false;
  if (!hasBrandShape && !hasBusinessHint) return false;

  return true;
}

export function extractCompetitorCandidatesFromRuns(runs: VisibilityAuditRun[], profile: AuditBusinessProfile): string[] {
  const excluded = new Set(
    [
      profile.brand,
      ...(profile.aliases || []),
      profile.city,
      profile.state,
      'ChatGPT',
      'Claude',
      'Gemini',
      'Perplexity',
      'Google',
      'Madison',
      'Dane County',
    ]
      .filter(Boolean)
      .map(value => value.toLowerCase())
  );
  const counts = new Map<string, number>();

  for (const run of runs) {
    const text = run.response?.rawText || '';
    const matches = text.match(/\b[A-Z][A-Za-z&'.-]+(?:\s+[A-Z][A-Za-z&'.-]+){1,4}\b/g) || [];
    for (const match of matches) {
      const cleaned = match.replace(/\s+/g, ' ').trim();
      const key = cleaned.toLowerCase();
      if (cleaned.length < 5 || excluded.has(key)) continue;
      if (/\b(LLM|AI|FAQ|SEO|URL|WI|US)\b/.test(cleaned)) continue;
      counts.set(cleaned, (counts.get(cleaned) || 0) + 1);
    }
  }

  return sanitizeCompetitorSuggestions(
    Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
      .slice(0, 12),
    profile
  ).slice(0, 8);
}

export function buildRunEvidence(run: VisibilityAuditRun): VisibilityRunEvidence {
  return {
    exactPrompt: run.query.prompt,
    platform: run.provider,
    capturedAt: run.completedAt || run.response?.ranAt || new Date().toISOString(),
    rawResponse: run.response?.rawText || run.errorMessage || '',
    citations: run.response?.citations || [],
    sourceUrls: (run.response?.citations || []).map(citation => citation.url),
    screenshotUrls: run.screenshotUrls || [],
    evidenceNote: run.evidenceNote || '',
    caveatText: run.caveatText || DEFAULT_AUDIT_CAVEAT,
    scorer: run.scorer || 'Auto-score',
  };
}

const ACTION_PACKAGE_BY_ROOT_CAUSE: Record<string, Omit<AuditActionPlanItem, 'id' | 'rootCauseCode' | 'sourceFindingTitle' | 'recommendedAction' | 'status'>> = {
  NO_SCHEMA: { priority: 'high', serviceLine: 'Schema and entity SEO', estimatedHours: 5, estimatedPrice: 750, owner: 'agency', dueInDays: 14 },
  WEAK_ENTITIES: { priority: 'high', serviceLine: 'Entity cleanup', estimatedHours: 4, estimatedPrice: 650, owner: 'agency', dueInDays: 14 },
  NO_AUTHORITY_LINKS: { priority: 'high', serviceLine: 'Citation building', estimatedHours: 8, estimatedPrice: 1200, owner: 'agency', dueInDays: 30 },
  WEAK_GBP: { priority: 'urgent', serviceLine: 'Google Business Profile', estimatedHours: 4, estimatedPrice: 600, owner: 'agency', dueInDays: 7 },
  NO_LOCAL_CONTENT: { priority: 'high', serviceLine: 'Local content pages', estimatedHours: 10, estimatedPrice: 1500, owner: 'agency', dueInDays: 30 },
  LOW_REVIEW_VELOCITY: { priority: 'medium', serviceLine: 'Review growth system', estimatedHours: 3, estimatedPrice: 450, owner: 'client', dueInDays: 21 },
  OUTDATED_INFO: { priority: 'urgent', serviceLine: 'Business data cleanup', estimatedHours: 3, estimatedPrice: 400, owner: 'agency', dueInDays: 7 },
  COMPETITOR_DOMINANCE: { priority: 'urgent', serviceLine: 'Competitor displacement content', estimatedHours: 12, estimatedPrice: 2200, owner: 'agency', dueInDays: 30 },
  THIN_CONTENT: { priority: 'high', serviceLine: 'Service-page content expansion', estimatedHours: 8, estimatedPrice: 1400, owner: 'agency', dueInDays: 30 },
  WEBSITE_PERFORMANCE: { priority: 'high', serviceLine: 'Technical SEO cleanup', estimatedHours: 6, estimatedPrice: 950, owner: 'agency', dueInDays: 21 },
  AI_BOT_BLOCKED: { priority: 'urgent', serviceLine: 'Crawl access and robots.txt review', estimatedHours: 2, estimatedPrice: 350, owner: 'agency', dueInDays: 7 },
};

export function buildActionPlan(findings: RootCauseFinding[]): AuditActionPlanItem[] {
  return findings.map((finding, index) => {
    const packageDefaults = ACTION_PACKAGE_BY_ROOT_CAUSE[finding.code] || {
      priority: 'medium' as const,
      serviceLine: 'Visibility improvement',
      estimatedHours: 4,
      estimatedPrice: 600,
      owner: 'agency' as const,
      dueInDays: 21,
    };
    return {
      id: `${finding.code}-${index + 1}`,
      rootCauseCode: finding.code,
      sourceFindingTitle: finding.title,
      recommendedAction: finding.recommendedFix.title,
      status: 'recommended',
      ...packageDefaults,
    };
  });
}

export function buildReportDraft(
  profile: AuditBusinessProfile,
  metrics: VisibilityMetrics,
  findings: RootCauseFinding[],
  runs: VisibilityAuditRun[],
  actionPlan: AuditActionPlanItem[]
): AuditReportDraft {
  const scoredRuns = runs.filter(run => run.score && run.qaStatus !== 'excluded');
  const competitorCounts = topCompetitorMentions(runs);
  const strongestCompetitor = competitorCounts[0]?.name;
  const queryPerformance = summarizeQueryPerformance(runs);
  const winningQueries = queryPerformance.filter(item => item.mentionRate > 0).slice(0, 5);
  const missingQueries = queryPerformance.filter(item => item.mentionRate === 0).slice(0, 8);
  const reportActions = actionPlan.slice(0, 8);
  const categoryLines = summarizeRunsByCategory(scoredRuns);
  const platformLines = summarizeRunsByPlatform(scoredRuns);
  const citationDomains = summarizeCitationDomains(scoredRuns);
  const evidenceHighlights = summarizeEvidenceHighlights(scoredRuns);
  const seoAuditLines = summarizeSeoAuditSignals(profile);
  const qaFlags = [
    metrics.highImpactMissCount ? `${metrics.highImpactMissCount} high-impact miss${metrics.highImpactMissCount === 1 ? '' : 'es'}` : '',
    metrics.needsReviewCount ? `${metrics.needsReviewCount} run${metrics.needsReviewCount === 1 ? '' : 's'} need review` : '',
    metrics.excludedCount ? `${metrics.excludedCount} excluded run${metrics.excludedCount === 1 ? '' : 's'}` : '',
  ].filter(Boolean);

  const scoreExplanation = [
    'The 0-5 Audit Avg is the simple workbook rubric averaged across captured answers.',
    '5 = dominant cited recommendation.',
    '4 = top mention with citation.',
    '3 = mentioned without strong dominance or citation.',
    '2 = category answer with the brand absent.',
    '1 = competitors appear while the brand is absent.',
    '0 = harmful, negative, or likely incorrect brand information.',
  ];

  const cleanCaptureProtocol = [
    'API captures are sent as fresh, standalone requests: one system instruction plus one buyer prompt.',
    'The app does not send prior prompts, prior responses, thread IDs, conversation IDs, or stored chat history into the next run.',
    'Manual browser evidence should be captured in an incognito/private window or logged-out session when the goal is maximum consumer-query cleanliness.',
    'Each stored evidence row keeps the exact prompt, platform, timestamp, raw response, citations, screenshot URLs, scorer, QA status, and caveat text.',
  ];

  const sections: AuditReportSection[] = [
    {
      title: '1. Executive Summary',
      body: `${profile.brand} was tested against buyer-intent AI questions for ${profile.niche} in ${getGeo(profile)}. The business appeared in ${metrics.brandMentionCount} of ${metrics.capturedCount} captured answers. The composite AI Visibility Score is ${metrics.visibilityScore}/100 (${metrics.grade}); the simpler 0-5 Audit Avg is ${metrics.workbookAverage}/5.`,
      bullets: [
        `Mention rate: ${formatPercent(metrics.mentionRate)}.`,
        `Brand citation rate: ${formatPercent(metrics.citationRate)}.`,
        `Dominant cited answers: ${metrics.dominantCount}.`,
        `Competitor dominance ratio: ${formatPercent(metrics.competitorDominanceRatio)}.`,
        qaFlags.length ? `QA flags: ${qaFlags.join(', ')}.` : 'QA flags: no high-impact misses or excluded runs currently flagged.',
      ],
    },
    {
      title: '2. What The Scores Mean',
      body: 'The report intentionally includes both a composite 0-100 score and the workbook-style 0-5 audit score. The 0-100 score is useful for trend reporting. The 0-5 score is easier to explain in a client meeting because it maps directly to what happened in each answer.',
      bullets: scoreExplanation,
    },
    {
      title: '3. Clean Query Methodology',
      body: 'Each platform run is designed to approximate a fresh buyer question rather than a continuing conversation.',
      bullets: cleanCaptureProtocol,
    },
    {
      title: '4. SEO/AEO/GEO Audit Context',
      body: seoAuditLines.length
        ? 'The LLM Visibility Audit is interpreted alongside the site-level SEO/AEO/GEO audit context. These signals explain why answer engines may or may not trust the business as a source.'
        : 'No SEO audit context has been attached yet. Add the SEO audit health score, schema count, thin-page count, review gap, crawl blockers, and local page coverage to make this report more diagnostic.',
      bullets: seoAuditLines.length
        ? seoAuditLines
        : [
            'Run the full SEO/AEO/GEO audit in this application, then paste the key metrics into the LLM audit intake.',
            'At minimum, capture technical health score, pages analyzed, schema coverage, missing metadata, thin content, GBP strength, review count, competitor review gap, and crawler blocking.',
          ],
    },
    {
      title: '5. Platform Findings',
      body: platformLines.length
        ? 'Platform-level performance shows whether the business is visible consistently or only in one answer engine.'
        : 'No captured platform data is available yet.',
      bullets: platformLines,
    },
    {
      title: '6. Question Category Findings',
      body: categoryLines.length
        ? 'The workbook categories reveal where the brand wins or disappears across the buyer journey.'
        : 'Run the category-balanced question set to populate category findings.',
      bullets: categoryLines,
    },
    {
      title: '7. Winning And Missing Buyer Questions',
      body: 'These prompts are the easiest way to show a client where AI is helping them and where it is sending demand elsewhere.',
      bullets: [
        ...winningQueries.map(item => `Win: ${item.query.code} (${QUESTION_CATEGORY_META[item.query.category].label}) - ${formatPercent(item.mentionRate)} mention rate - ${item.query.prompt}`),
        ...missingQueries.map(item => `Miss: ${item.query.code} (${QUESTION_CATEGORY_META[item.query.category].label}) - ${item.query.prompt}`),
      ].slice(0, 12),
    },
    {
      title: '8. Competitor Story',
      body: strongestCompetitor
        ? `${strongestCompetitor} is the strongest competitor signal in this evidence set. Competitors were mentioned in ${formatPercent(metrics.competitorDominanceRatio)} of total brand/competitor mention signals.`
        : 'No single configured competitor dominated the returned answers, but unconfigured competitors may still appear in raw responses.',
      bullets: competitorCounts.slice(0, 8).map(item => `${item.name}: ${item.count} mention${item.count === 1 ? '' : 's'}`),
    },
    {
      title: '9. Citations And Evidence',
      body: citationDomains.length
        ? 'Citation domains show which sources AI tools leaned on when composing answers. Brand-owned and authoritative third-party citations are especially important.'
        : 'No brand-supporting citations were detected. That usually points to weak source eligibility, thin entity signals, or insufficient third-party validation.',
      bullets: [
        ...citationDomains,
        ...evidenceHighlights,
      ].slice(0, 14),
    },
    {
      title: '10. Likely Root Causes',
      body: findings.length
        ? 'These are heuristic root causes inferred from the scored responses and evidence patterns.'
        : 'No root-cause findings are available yet. Capture and score more answers to generate a fix plan.',
      bullets: findings.slice(0, 8).map(finding => `${finding.code}: ${finding.title} - ${finding.description}`),
    },
    {
      title: '11. Precise Next Steps',
      body: reportActions.length
        ? 'Prioritize fixes that improve entity confidence, local proof, citation eligibility, and answer-ready service content. Re-audit after implementation so the client can see before/after movement.'
        : 'Run the full capture and approve scoring before finalizing paid fixes.',
      bullets: reportActions.map(action => `${action.priority.toUpperCase()}: ${action.serviceLine} - ${action.recommendedAction}. Owner: ${action.owner}. Estimate: ${action.estimatedHours} hours / $${action.estimatedPrice.toLocaleString()}. Due: ${action.dueInDays} days.`),
    },
    {
      title: '12. 30/60/90-Day Fix Roadmap',
      body: 'Use this as the client-facing implementation cadence after the audit.',
      bullets: [
        'Days 0-30: Fix schema, GBP/category data, inconsistent business facts, core citations, and the top missing service/category pages.',
        'Days 31-60: Publish FAQ and buyer-question content for missed prompts; add city/service proof pages for Madison-area suburbs; build review velocity.',
        'Days 61-90: Add third-party proof, partner citations, local PR/awards pages, video/transcript proof, and run the re-audit delta report.',
      ],
    },
    {
      title: '13. Caveats',
      body: 'AI answers are point-in-time evidence, not a guaranteed ranking report.',
      bullets: [
        DEFAULT_AUDIT_CAVEAT,
        'API captures and consumer web UI captures can differ; manual Google AI Overview evidence should be preserved for client-facing claims.',
        'Recommendations are based on captured answer behavior and visible evidence, not inside knowledge of any model ranking system.',
      ],
    },
    {
      title: '14. Client Email Draft',
      body: 'Use this as the follow-up message after the report is reviewed.',
      bullets: [],
    },
  ];

  const whatToFixNext = reportActions.length
    ? reportActions.map((action, index) => `${index + 1}. ${action.serviceLine}: ${action.recommendedAction} (${action.estimatedHours} hrs, est. $${action.estimatedPrice.toLocaleString()}, ${action.dueInDays} days).`).join('\n')
    : 'Run the full Madison MVP capture and approve scoring before recommending paid fixes.';

  const clientEmail = [
    `Subject: Your AI visibility snapshot for ${profile.brand}`,
    '',
    `I ran a point-in-time audit of how AI tools answer buyer questions about ${profile.niche} options in ${getGeo(profile)}.`,
    `Your current AI Visibility Score is ${metrics.visibilityScore}/100 (${metrics.grade}). You appeared in ${metrics.brandMentionCount} of ${metrics.capturedCount} captured answers, with a 0-5 Audit Avg of ${metrics.workbookAverage}/5.`,
    missingQueries.length ? `The biggest missed questions were:\n${missingQueries.slice(0, 3).map(item => `- ${item.query.prompt}`).join('\n')}` : '',
    reportActions.length ? `The first fixes I would prioritize are:\n${reportActions.slice(0, 3).map(action => `- ${action.recommendedAction}`).join('\n')}` : '',
    'Each API query was captured as a fresh standalone request, and manual browser evidence should be captured in a clean/incognito session for maximum neutrality.',
    'This is a snapshot, not a guaranteed ranking, because AI answers change by tool, time, account state, and location.',
  ].filter(Boolean).join('\n');

  return {
    executiveSummary: sections[0].body,
    aiVisibilityNarrative: metrics.mentionRate > 0
      ? `AI tools can identify ${profile.brand} in some prompts, but the brand is not consistently dominant across buyer-intent searches in ${getGeo(profile)}. The strongest opportunities are the missed prompts, weak citation coverage, and categories where competitors are named more often.`
      : `${profile.brand} is currently invisible in the captured AI answers, which means buyers asking for recommendations may never see the business before competitors are named.`,
    competitorStory: strongestCompetitor
      ? `${strongestCompetitor} is the most frequent competitor signal in this audit. Competitors were mentioned in ${formatPercent(metrics.competitorDominanceRatio)} of total brand/competitor mention signals.`
      : 'No single competitor dominated the captured responses, but the brand still needs stronger answer-ready proof signals.',
    whyItHappens: findings.length
      ? `The likely causes are ${findings.slice(0, 3).map(finding => finding.title.toLowerCase()).join(', ')}. These usually map to schema, local proof, third-party citations, content depth, reviews, and GBP freshness.`
      : 'The current evidence set does not show a severe root cause yet. A larger sample or manual Google AI Overview capture may reveal more.',
    whatToFixNext,
    clientEmail,
    caveats: [
      DEFAULT_AUDIT_CAVEAT,
      'API captures and consumer web UI captures can differ; manual Google AI Overview evidence should be preserved for client-facing claims.',
      'Recommendations are based on captured answer behavior and visible evidence, not inside knowledge of any model ranking system.',
    ],
    sections: sections.map(section => section.title === '14. Client Email Draft' ? { ...section, body: clientEmail } : section),
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function summarizeRunsByPlatform(runs: VisibilityAuditRun[]): string[] {
  return (Object.keys(PROVIDER_LABELS) as VisibilityProviderId[])
    .map(provider => {
      const providerRuns = runs.filter(run => run.provider === provider);
      if (!providerRuns.length) return '';
      const mentioned = providerRuns.filter(run => run.score?.brandMentioned).length;
      const citations = providerRuns.filter(run => run.score?.brandWithCitation).length;
      const avgScore = roundToTwo(providerRuns.reduce((sum, run) => sum + (run.score?.workbookScore || 0), 0) / providerRuns.length);
      return `${PROVIDER_LABELS[provider]}: ${mentioned}/${providerRuns.length} mentions, ${citations} brand citations, 0-5 avg ${avgScore}.`;
    })
    .filter(Boolean);
}

function summarizeRunsByCategory(runs: VisibilityAuditRun[]): string[] {
  return QUESTION_CATEGORY_ORDER
    .map(category => {
      const categoryRuns = runs.filter(run => run.query.category === category);
      if (!categoryRuns.length) return '';
      const mentioned = categoryRuns.filter(run => run.score?.brandMentioned).length;
      const top = categoryRuns.filter(run => (run.score?.workbookScore || 0) >= 4).length;
      const competitors = categoryRuns.reduce((sum, run) => sum + (run.score?.competitorCount || 0), 0);
      const avgScore = roundToTwo(categoryRuns.reduce((sum, run) => sum + (run.score?.workbookScore || 0), 0) / categoryRuns.length);
      return `${QUESTION_CATEGORY_META[category].label}: ${mentioned}/${categoryRuns.length} mentions, ${top} top/cited answers, ${competitors} competitor mentions, 0-5 avg ${avgScore}.`;
    })
    .filter(Boolean);
}

function summarizeCitationDomains(runs: VisibilityAuditRun[]): string[] {
  const counts = new Map<string, number>();
  for (const run of runs) {
    for (const citation of run.response?.citations || []) {
      const domain = normalizeDomain(citation.url);
      if (!domain) continue;
      counts.set(domain, (counts.get(domain) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([domain, count]) => `${domain}: ${count} citation${count === 1 ? '' : 's'}`);
}

function summarizeEvidenceHighlights(runs: VisibilityAuditRun[]): string[] {
  return runs
    .filter(run => run.response?.rawText)
    .slice(0, 6)
    .map(run => {
      const text = (run.response?.rawText || '').replace(/\s+/g, ' ').trim();
      const excerpt = text.length > 180 ? `${text.slice(0, 180)}...` : text;
      return `${PROVIDER_LABELS[run.provider]} / ${run.query.code}: ${excerpt}`;
    });
}

function summarizeSeoAuditSignals(profile: AuditBusinessProfile): string[] {
  const seo = profile.seoAuditSignals;
  const lines: string[] = [];

  lines.push(`Schema signal: ${profile.schemaStatus || 'unknown'}.`);
  lines.push(`Google Business Profile signal: ${profile.gbpSignal || 'unknown'}.`);
  lines.push(`Review signal: ${profile.reviewSignal || 'unknown'}.`);

  if (!seo) return lines.filter(line => !line.endsWith('unknown.'));

  if (typeof seo.technicalHealthScore === 'number') lines.push(`Technical health score: ${seo.technicalHealthScore}/100.`);
  if (typeof seo.pagesAnalyzed === 'number') lines.push(`Pages analyzed in SEO audit: ${seo.pagesAnalyzed}.`);
  if (typeof seo.pagesWithSchema === 'number') lines.push(`Pages with detected schema: ${seo.pagesWithSchema}.`);
  if (typeof seo.thinContentPages === 'number') lines.push(`Thin content pages flagged: ${seo.thinContentPages}.`);
  if (typeof seo.missingMetaCount === 'number') lines.push(`Pages/items missing important metadata: ${seo.missingMetaCount}.`);
  if (typeof seo.localLandingPages === 'number') lines.push(`Local landing/service-area pages: ${seo.localLandingPages}.`);
  if (typeof seo.reviewCount === 'number') lines.push(`Review count: ${seo.reviewCount}.`);
  if (typeof seo.averageRating === 'number') lines.push(`Average rating: ${seo.averageRating}.`);
  if (typeof seo.competitorReviewGap === 'number') lines.push(`Competitor review gap: ${seo.competitorReviewGap} reviews.`);
  if (seo.aiBotsBlocked) lines.push('Crawler access: AI/search bots may be blocked in robots.txt.');
  if (seo.lastAuditUrl) lines.push(`Full SEO audit reference: ${seo.lastAuditUrl}.`);
  for (const note of seo.notes || []) {
    if (note.trim()) lines.push(`SEO audit note: ${note.trim()}`);
  }

  return lines;
}

export function topCompetitorMentions(runs: VisibilityAuditRun[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const run of runs) {
    if (!run.score || run.qaStatus === 'excluded') continue;
    for (const competitor of run.score.competitorsMentioned) {
      counts.set(competitor, (counts.get(competitor) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeVisibilityDelta(current: VisibilityMetrics, prior?: VisibilityMetrics): VisibilityMetricDelta | null {
  if (!prior) return null;
  const visibilityScoreDelta = roundToTwo(current.visibilityScore - prior.visibilityScore);
  const mentionRateDelta = roundToTwo(current.mentionRate - prior.mentionRate);
  const citationRateDelta = roundToTwo(current.citationRate - prior.citationRate);
  const workbookAverageDelta = roundToTwo(current.workbookAverage - prior.workbookAverage);
  const direction = visibilityScoreDelta > 0 ? 'up' : visibilityScoreDelta < 0 ? 'down' : 'flat';
  return {
    visibilityScoreDelta,
    mentionRateDelta,
    citationRateDelta,
    workbookAverageDelta,
    summary: `Visibility is ${direction} ${Math.abs(visibilityScoreDelta)} points vs. the prior cycle.`,
  };
}

export function createShareableLeadScorecard(
  profile: AuditBusinessProfile,
  metrics: VisibilityMetrics,
  findings: RootCauseFinding[]
): ShareableLeadScorecard {
  return {
    slug: `${slugify(profile.brand || 'local-business')}-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    businessName: profile.brand,
    website: profile.website,
    geo: getGeo(profile),
    niche: profile.niche,
    visibilityScore: metrics.visibilityScore,
    grade: metrics.grade,
    mentionRate: metrics.mentionRate,
    capturedCount: metrics.capturedCount,
    topFindings: findings.slice(0, 3).map(finding => finding.title),
    callToAction: 'Book a 15-minute review to see the full evidence and fix plan.',
    caveat: DEFAULT_AUDIT_CAVEAT,
  };
}

export function encodeShareableLeadScorecard(scorecard: ShareableLeadScorecard): string {
  const json = JSON.stringify(scorecard);
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(json)));
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf8').toString('base64');
  }
  return encodeURIComponent(json);
}

export function decodeShareableLeadScorecard(encoded: string): ShareableLeadScorecard | null {
  try {
    let json = '';
    if (typeof atob === 'function') {
      json = decodeURIComponent(escape(atob(encoded)));
    } else if (typeof Buffer !== 'undefined') {
      json = Buffer.from(encoded, 'base64').toString('utf8');
    } else {
      json = decodeURIComponent(encoded);
    }
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'scorecard';
}

export const VISIBILITY_AUDIT_STORAGE_KEY = 'skillengine_llm_visibility_audit';

export interface StoredVisibilityAudit {
  profile: AuditBusinessProfile;
  packId: string;
  auditProfileId?: AuditProfileId;
  providers: VisibilityProviderId[];
  runs: VisibilityAuditRun[];
  priorMetrics?: VisibilityMetrics;
  reportDraft?: AuditReportDraft;
  actionPlan?: AuditActionPlanItem[];
  savedAt: string;
}

export function saveVisibilityAudit(snapshot: StoredVisibilityAudit): void {
  localStorage.setItem(VISIBILITY_AUDIT_STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadVisibilityAudit(): StoredVisibilityAudit | null {
  try {
    const stored = localStorage.getItem(VISIBILITY_AUDIT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
