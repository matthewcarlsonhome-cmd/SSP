export type VisibilityProviderId = 'chatgpt' | 'claude' | 'gemini' | 'perplexity';

export type VisibilityQueryCategory =
  | 'brand'
  | 'comparison'
  | 'competitor'
  | 'solution'
  | 'decision'
  | 'local';

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
  intakeNotes?: string[];
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

export interface AuditReportDraft {
  executiveSummary: string;
  aiVisibilityNarrative: string;
  competitorStory: string;
  whyItHappens: string;
  whatToFixNext: string;
  clientEmail: string;
  caveats: string[];
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
  packQuestion('madison-local', 'MAD01', 'local', 'Best {niche} in Madison, WI - who should I call?', 'Madison core buyer query'),
  packQuestion('madison-local', 'MAD02', 'local', 'Recommend a reputable {niche} near Middleton, WI.', 'Middleton service-area discovery'),
  packQuestion('madison-local', 'MAD03', 'local', 'Best {niche} near Sun Prairie, WI with strong reviews.', 'Sun Prairie review-led query'),
  packQuestion('madison-local', 'MAD04', 'local', 'Top-rated {niche} serving Fitchburg, WI.', 'Fitchburg service-area query'),
  packQuestion('madison-local', 'MAD05', 'local', 'Who is the best {niche} for homeowners in Verona, WI?', 'Verona homeowner query'),
  packQuestion('madison-local', 'MAD06', 'local', 'Best {niche} near Waunakee, WI.', 'Waunakee local discovery'),
  packQuestion('madison-local', 'MAD07', 'local', 'Recommend a trusted {niche} around Monona, WI.', 'Monona trust query'),
  packQuestion('madison-local', 'MAD08', 'local', 'Best {niche} near McFarland, WI.', 'McFarland local query'),
  packQuestion('madison-local', 'MAD09', 'local', 'Top {niche} serving Oregon, WI.', 'Oregon service-area query'),
  packQuestion('madison-local', 'MAD10', 'local', 'Best {niche} near DeForest, WI.', 'DeForest local query'),
  packQuestion('madison-local', 'MAD11', 'local', 'Recommend a {niche} serving Cottage Grove, WI.', 'Cottage Grove query'),
  packQuestion('madison-local', 'MAD12', 'local', 'Best {niche} around Stoughton, WI.', 'Stoughton local query'),
  packQuestion('madison-local', 'MAD13', 'solution', 'I need a {niche} in Dane County. Who should I hire?', 'Dane County broader market query'),
  packQuestion('madison-local', 'MAD14', 'comparison', 'Best {niche} companies in the Madison area - give a ranked list.', 'Madison ranked-list prompt'),
  packQuestion('madison-local', 'MAD15', 'decision', 'Is {brand} one of the best {niche} options in the Madison area?', 'Brand decision in Madison market'),
];

export const CORE_QUERY_TEMPLATES: VisibilityQueryTemplate[] = [
  {
    code: 'B01',
    category: 'brand',
    template: 'Tell me about {brand}. What do they do and how are they regarded?',
    description: 'Baseline brand knowledge and reputation',
  },
  {
    code: 'B02',
    category: 'brand',
    template: 'Is {brand} reliable? What do customers say about them?',
    description: 'Trust and review signal',
  },
  {
    code: 'B03',
    category: 'brand',
    template: 'What are common complaints about {brand}?',
    description: 'Negative sentiment and reputation risk',
  },
  {
    code: 'C01',
    category: 'comparison',
    template: '{brand} vs {competitor} - which is better?',
    description: 'Head-to-head recommendation',
  },
  {
    code: 'C02',
    category: 'comparison',
    template: 'Compare {brand} and {competitor} for {niche} in {geo}.',
    description: 'Geo and niche comparison',
  },
  {
    code: 'C03',
    category: 'comparison',
    template: 'Best {niche} companies in {geo} - give a ranked list.',
    description: 'Ranked local list visibility',
  },
  {
    code: 'CP01',
    category: 'competitor',
    template: 'Who are the main competitors of {competitor} in {geo}?',
    description: 'Competitor graph and category adjacency',
  },
  {
    code: 'CP02',
    category: 'competitor',
    template: 'Alternatives to {competitor} for {niche}.',
    description: 'Alternative provider discovery',
  },
  {
    code: 'S01',
    category: 'solution',
    template: 'I need a {niche} in {geo}. Who should I hire?',
    description: 'High-intent local hire query',
  },
  {
    code: 'S02',
    category: 'solution',
    template: 'Recommend a reputable {niche} near {geo}.',
    description: 'Short recommendation prompt',
  },
  {
    code: 'S03',
    category: 'solution',
    template: 'What should I look for when choosing a {niche}? Recommend specific companies in {geo}.',
    description: 'Advice plus named recommendations',
  },
  {
    code: 'S04',
    category: 'solution',
    template: 'Top {niche} for {job_to_be_done} in {geo}.',
    description: 'Job-to-be-done discovery',
  },
  {
    code: 'D01',
    category: 'decision',
    template: 'Is it worth hiring {brand} for {niche}?',
    description: 'Bottom-funnel decision validation',
  },
  {
    code: 'D02',
    category: 'decision',
    template: 'Should I choose {brand} or {competitor}?',
    description: 'Final choice prompt',
  },
  {
    code: 'L01',
    category: 'local',
    template: "Best {niche} near me - I'm in {geo}.",
    description: 'Near-me local pack visibility',
  },
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
      packQuestion('hvac', 'HVAC01', 'solution', 'Who should I call for emergency AC repair in {geo}?', 'Emergency service discovery'),
      packQuestion('hvac', 'HVAC02', 'solution', 'Best company for furnace replacement financing in {geo}.', 'High-ticket financing query'),
      packQuestion('hvac', 'HVAC03', 'decision', 'Is {brand} a good HVAC company for heat pump installation?', 'Service-line brand decision'),
      packQuestion('hvac', 'HVAC04', 'local', 'Top-rated HVAC maintenance plan near {geo}.', 'Recurring maintenance intent'),
    ],
  },
  {
    id: 'dental',
    label: 'Dental',
    niche: 'dentist',
    questions: [
      packQuestion('dental', 'DEN01', 'solution', 'Best family dentist accepting new patients in {geo}.', 'New patient acquisition'),
      packQuestion('dental', 'DEN02', 'solution', 'Who offers emergency dental care near {geo}?', 'Emergency dental intent'),
      packQuestion('dental', 'DEN03', 'decision', 'Is {brand} good for cosmetic dentistry?', 'Cosmetic service decision'),
      packQuestion('dental', 'DEN04', 'local', 'Dentist near me with strong patient reviews in {geo}.', 'Review-led local query'),
    ],
  },
  {
    id: 'legal',
    label: 'Legal',
    niche: 'law firm',
    questions: [
      packQuestion('legal', 'LAW01', 'solution', 'Best {niche} for personal injury cases in {geo}.', 'Practice area recommendation'),
      packQuestion('legal', 'LAW02', 'solution', 'Who is a reputable attorney near {geo} for a free consultation?', 'Consultation intent'),
      packQuestion('legal', 'LAW03', 'decision', 'Is {brand} a good choice for a local legal matter?', 'Firm trust check'),
      packQuestion('legal', 'LAW04', 'comparison', 'Compare {brand} and {competitor} for client outcomes and reputation.', 'Trust comparison'),
    ],
  },
  {
    id: 'roofing',
    label: 'Roofing',
    niche: 'roofing contractor',
    questions: [
      packQuestion('roofing', 'ROOF01', 'solution', 'Best roof repair company after storm damage in {geo}.', 'Storm response intent'),
      packQuestion('roofing', 'ROOF02', 'solution', 'Who should I hire for a roof replacement estimate in {geo}?', 'Estimate request intent'),
      packQuestion('roofing', 'ROOF03', 'decision', 'Is {brand} reliable for insurance roof claims?', 'Claims-specific decision'),
      packQuestion('roofing', 'ROOF04', 'local', 'Top-rated licensed roofers near {geo}.', 'Licensed local discovery'),
    ],
  },
  {
    id: 'plumbing',
    label: 'Plumbing',
    niche: 'plumber',
    questions: [
      packQuestion('plumbing', 'PLUMB01', 'solution', 'Who offers emergency plumbing service in {geo}?', 'Emergency lead capture'),
      packQuestion('plumbing', 'PLUMB02', 'solution', 'Best plumber for water heater replacement near {geo}.', 'Service-line query'),
      packQuestion('plumbing', 'PLUMB03', 'decision', 'Is {brand} a trustworthy plumber for homeowners?', 'Homeowner trust'),
      packQuestion('plumbing', 'PLUMB04', 'local', 'Drain cleaning company near me in {geo}.', 'Near-me service intent'),
    ],
  },
  {
    id: 'med-spa',
    label: 'Med Spa',
    niche: 'medical spa',
    questions: [
      packQuestion('med-spa', 'MED01', 'solution', 'Best med spa for Botox in {geo}.', 'Treatment-specific discovery'),
      packQuestion('med-spa', 'MED02', 'solution', 'Who has the best reviews for laser treatments near {geo}?', 'Review-led aesthetic query'),
      packQuestion('med-spa', 'MED03', 'decision', 'Is {brand} a safe and reputable medical spa?', 'Safety and credibility'),
      packQuestion('med-spa', 'MED04', 'comparison', 'Compare {brand} and {competitor} for injectables in {geo}.', 'Competitive treatment comparison'),
    ],
  },
  {
    id: 'real-estate',
    label: 'Real Estate',
    niche: 'real estate agent',
    questions: [
      packQuestion('real-estate', 'RE01', 'solution', 'Best real estate agent to sell a home in {geo}.', 'Seller intent'),
      packQuestion('real-estate', 'RE02', 'solution', 'Who is a top buyer agent for first-time homebuyers in {geo}?', 'Buyer intent'),
      packQuestion('real-estate', 'RE03', 'decision', 'Is {brand} a good real estate team?', 'Brand trust'),
      packQuestion('real-estate', 'RE04', 'local', 'Top local realtors near {geo} with strong reviews.', 'Review-led local query'),
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    niche: 'accounting firm',
    questions: [
      packQuestion('accounting', 'ACC01', 'solution', 'Best CPA for small business taxes in {geo}.', 'SMB tax intent'),
      packQuestion('accounting', 'ACC02', 'solution', 'Who provides bookkeeping for local businesses near {geo}?', 'Bookkeeping discovery'),
      packQuestion('accounting', 'ACC03', 'decision', 'Is {brand} a good accounting firm for small business owners?', 'Firm decision'),
      packQuestion('accounting', 'ACC04', 'comparison', 'Compare {brand} and {competitor} for tax planning.', 'Service comparison'),
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    niche: 'restaurant',
    questions: [
      packQuestion('restaurant', 'REST01', 'local', 'Best restaurant near me in {geo} for a date night.', 'Occasion-based discovery'),
      packQuestion('restaurant', 'REST02', 'solution', 'Where should I eat in {geo} with great reviews?', 'General local recommendation'),
      packQuestion('restaurant', 'REST03', 'decision', 'Is {brand} worth visiting for dinner?', 'Visit decision'),
      packQuestion('restaurant', 'REST04', 'comparison', 'Compare {brand} and {competitor} for food, service, and atmosphere.', 'Experience comparison'),
    ],
  },
  {
    id: 'auto-repair',
    label: 'Auto Repair',
    niche: 'auto repair shop',
    questions: [
      packQuestion('auto-repair', 'AUTO01', 'solution', 'Best mechanic for brake repair in {geo}.', 'Service-line repair query'),
      packQuestion('auto-repair', 'AUTO02', 'solution', 'Trustworthy auto repair shop near {geo}.', 'Trust-led discovery'),
      packQuestion('auto-repair', 'AUTO03', 'decision', 'Is {brand} honest and reliable for auto repair?', 'Reputation decision'),
      packQuestion('auto-repair', 'AUTO04', 'local', 'Oil change and inspection near me in {geo}.', 'Routine service query'),
    ],
  },
  {
    id: 'landscaping',
    label: 'Landscaping',
    niche: 'landscaping company',
    questions: [
      packQuestion('landscaping', 'LAND01', 'solution', 'Best landscaping company for weekly lawn care in {geo}.', 'Recurring service intent'),
      packQuestion('landscaping', 'LAND02', 'solution', 'Who should I hire for landscape design near {geo}?', 'Project discovery'),
      packQuestion('landscaping', 'LAND03', 'decision', 'Is {brand} good for residential landscaping?', 'Residential decision'),
      packQuestion('landscaping', 'LAND04', 'local', 'Top-rated landscapers near me in {geo}.', 'Near-me local query'),
    ],
  },
  {
    id: 'pest-control',
    label: 'Pest Control',
    niche: 'pest control company',
    questions: [
      packQuestion('pest-control', 'PEST01', 'solution', 'Best pest control company for termites in {geo}.', 'Termite service query'),
      packQuestion('pest-control', 'PEST02', 'solution', 'Who offers safe pest control for families and pets near {geo}?', 'Safety-driven query'),
      packQuestion('pest-control', 'PEST03', 'decision', 'Is {brand} reliable for pest control service?', 'Brand trust'),
      packQuestion('pest-control', 'PEST04', 'local', 'Exterminator near me in {geo} with strong reviews.', 'Near-me review query'),
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness',
    niche: 'fitness studio',
    questions: [
      packQuestion('fitness', 'FIT01', 'local', 'Best fitness studio near me in {geo}.', 'Local discovery'),
      packQuestion('fitness', 'FIT02', 'solution', 'Who has the best personal training in {geo}?', 'Personal training intent'),
      packQuestion('fitness', 'FIT03', 'decision', 'Is {brand} a good gym for beginners?', 'Beginner decision'),
      packQuestion('fitness', 'FIT04', 'comparison', 'Compare {brand} and {competitor} for classes, coaching, and value.', 'Fitness comparison'),
    ],
  },
  {
    id: 'pool-spa',
    label: 'Pool and Spa',
    niche: 'pool and spa company',
    questions: [
      packQuestion('pool-spa', 'POOL01', 'solution', 'Best pool builder in {geo}.', 'Builder discovery'),
      packQuestion('pool-spa', 'POOL02', 'solution', 'Who should I hire for hot tub repair near {geo}?', 'Spa repair query'),
      packQuestion('pool-spa', 'POOL03', 'decision', 'Is {brand} reliable for pool installation and service?', 'Brand decision'),
      packQuestion('pool-spa', 'POOL04', 'local', 'Pool maintenance company near me in {geo}.', 'Recurring service local query'),
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
    const competitors = needsCompetitor ? profile.competitors.filter(Boolean) : [undefined];
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

  return typeof options?.limit === 'number' ? rendered.slice(0, options.limit) : rendered;
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
      return normalized.includes(label) || normalized.includes(packNiche) || label.includes(normalized);
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
  const brandTerms = [profile.brand, ...profile.aliases].map(term => term.trim()).filter(Boolean);
  const brandTerm = brandTerms.find(term => normalizedText.includes(term.toLowerCase()));
  const brandMentioned = Boolean(brandTerm);
  const competitorsMentioned = profile.competitors
    .map(name => name.trim())
    .filter(Boolean)
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
};

export function mapFindings(runs: VisibilityAuditRun[], metrics: VisibilityMetrics): RootCauseFinding[] {
  const scoredRuns = runs.filter(
    run => run.score && run.qaStatus !== 'excluded' && (run.status === 'captured' || run.status === 'manual')
  );
  const findings: RootCauseFinding[] = [];
  const evidence = (predicate: (run: VisibilityAuditRun) => boolean) =>
    scoredRuns.filter(predicate).slice(0, 3).map(run => `${PROVIDER_LABELS[run.provider]}: ${run.query.prompt}`);

  if (metrics.mentionRate < 0.3 && metrics.competitorDominanceRatio > 0.6) {
    findings.push({
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
    findings.push({
      code: 'NO_AUTHORITY_LINKS',
      category: 'authority',
      title: 'No citations support the brand',
      severity: 2,
      description: 'Captured answers did not cite the client website or another source supporting brand claims.',
      evidence: evidence(run => Boolean(run.score && !run.score.brandWithCitation)),
      recommendedFix: FIX_PLAYBOOKS.NO_AUTHORITY_LINKS,
    });
    findings.push({
      code: 'NO_SCHEMA',
      category: 'technical',
      title: 'Likely missing structured entity signals',
      severity: 2,
      description: 'A lack of brand citations often indicates weak schema, sameAs, and entity confidence signals.',
      evidence: evidence(run => Boolean(run.score && run.score.brandMentioned && !run.score.brandWithCitation)),
      recommendedFix: FIX_PLAYBOOKS.NO_SCHEMA,
    });
  } else if (metrics.citationRate < 0.25 && metrics.mentionRate >= 0.3) {
    findings.push({
      code: 'WEAK_ENTITIES',
      category: 'technical',
      title: 'Brand appears without strong source backing',
      severity: 2,
      description: 'The brand is mentioned, but answers rarely cite sources that validate the recommendation.',
      evidence: evidence(run => Boolean(run.score && run.score.brandMentioned && !run.score.brandWithCitation)),
      recommendedFix: FIX_PLAYBOOKS.WEAK_ENTITIES,
    });
  }

  const localRuns = scoredRuns.filter(run => run.query.category === 'local');
  const localMentionRate = localRuns.length
    ? localRuns.filter(run => run.score?.brandMentioned).length / localRuns.length
    : 1;
  if (localRuns.length > 0 && localMentionRate < 0.5) {
    findings.push({
      code: 'WEAK_GBP',
      category: 'local',
      title: 'Weak near-me visibility',
      severity: 2,
      description: 'The brand is not consistently recommended for local near-me prompts.',
      evidence: localRuns.slice(0, 3).map(run => `${PROVIDER_LABELS[run.provider]}: ${run.query.prompt}`),
      recommendedFix: FIX_PLAYBOOKS.WEAK_GBP,
    });
    findings.push({
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
    findings.push({
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
    findings.push({
      code: 'OUTDATED_INFO',
      category: 'technical',
      title: 'Possible outdated or incorrect business facts',
      severity: 3,
      description: 'At least one answer appears to contain a serious factual error about the brand.',
      evidence: evidence(run => Boolean(run.score?.hallucinationFlag)),
      recommendedFix: FIX_PLAYBOOKS.OUTDATED_INFO,
    });
  }

  return findings.slice(0, 6);
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
        'anthropic-dangerous-direct-browser-access': 'true',
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
        'anthropic-dangerous-direct-browser-access': 'true',
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
  const suggestedCompetitors = suggestLocalCompetitors({
    brand: inferredBrand,
    niche,
    city,
    state,
    existingCompetitors: current?.competitors || [],
  });
  const warnings = [
    'Website inspection is a fast intake heuristic. Verify GBP, reviews, schema, and competitors before selling the report.',
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
      competitors: current?.competitors?.length ? current.competitors : suggestedCompetitors.slice(0, 4),
      services,
      serviceRadiusMiles: current?.serviceRadiusMiles || 25,
      schemaStatus: current?.schemaStatus || 'unknown',
      gbpSignal: current?.gbpSignal || 'unknown',
      reviewSignal: current?.reviewSignal || 'unknown',
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
  const normalizedBrand = input.brand.toLowerCase();
  const normalizedExisting = new Set((input.existingCompetitors || []).map(item => item.toLowerCase()));
  const city = input.city || 'Madison';
  const niche = input.niche || 'local business';
  const generic = [
    `${city} ${niche} leaders`,
    `Top-rated ${niche} near ${city}`,
    `${city} ${niche} pros`,
    `Best reviewed ${niche} in ${input.state || 'WI'}`,
  ];

  return generic
    .filter(name => !name.toLowerCase().includes(normalizedBrand))
    .filter(name => !normalizedExisting.has(name.toLowerCase()))
    .slice(0, 6);
}

export function extractCompetitorCandidatesFromRuns(runs: VisibilityAuditRun[], profile: AuditBusinessProfile): string[] {
  const excluded = new Set(
    [
      profile.brand,
      ...profile.aliases,
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

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 8);
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
  const competitorCounts = topCompetitorMentions(runs);
  const strongestCompetitor = competitorCounts[0]?.name;
  const missingQueries = summarizeQueryPerformance(runs)
    .filter(item => item.mentionRate === 0)
    .slice(0, 3)
    .map(item => item.query.prompt);
  const topActions = actionPlan.slice(0, 3);

  return {
    executiveSummary: `${profile.brand} appeared in ${metrics.brandMentionCount} of ${metrics.capturedCount} captured AI recommendation moments. The current AI Visibility Score is ${metrics.visibilityScore}/100 (${metrics.grade}), with a workbook average of ${metrics.workbookAverage}/5.`,
    aiVisibilityNarrative: metrics.mentionRate > 0
      ? `AI tools can identify ${profile.brand} in some prompts, but the brand is not consistently dominant across buyer-intent searches in ${getGeo(profile)}.`
      : `${profile.brand} is currently invisible in the captured AI answers, which means buyers asking for recommendations may never see the business before competitors are named.`,
    competitorStory: strongestCompetitor
      ? `${strongestCompetitor} is the most frequent competitor signal in this audit. Competitors were mentioned in ${Math.round(metrics.competitorDominanceRatio * 100)}% of total brand/competitor mention signals.`
      : 'No single competitor dominated the captured responses, but the brand still needs stronger answer-ready proof signals.',
    whyItHappens: findings.length
      ? `The likely causes are ${findings.slice(0, 3).map(finding => finding.title.toLowerCase()).join(', ')}. These usually map to schema, local proof, third-party citations, content depth, reviews, and GBP freshness.`
      : 'The current evidence set does not show a severe root cause yet. A larger sample or manual Google AI Overview capture may reveal more.',
    whatToFixNext: topActions.length
      ? topActions.map(action => `${action.serviceLine}: ${action.recommendedAction} (${action.estimatedHours} hrs, est. $${action.estimatedPrice}).`).join('\n')
      : 'Run the full Madison MVP capture and approve scoring before recommending paid fixes.',
    clientEmail: [
      `Subject: Your AI visibility snapshot for ${profile.brand}`,
      '',
      `I ran a point-in-time audit of how AI tools answer buyer questions about ${profile.niche} options in ${getGeo(profile)}.`,
      `Your current visibility score is ${metrics.visibilityScore}/100 (${metrics.grade}). You appeared in ${metrics.brandMentionCount} of ${metrics.capturedCount} captured answers.`,
      missingQueries.length ? `The biggest missed questions were:\n${missingQueries.map(query => `- ${query}`).join('\n')}` : '',
      topActions.length ? `The first fixes I would prioritize are:\n${topActions.map(action => `- ${action.recommendedAction}`).join('\n')}` : '',
      'This is a snapshot, not a guaranteed ranking, because AI answers change by tool, time, account state, and location.',
    ].filter(Boolean).join('\n'),
    caveats: [
      DEFAULT_AUDIT_CAVEAT,
      'API captures and consumer web UI captures can differ; manual Google AI Overview evidence should be preserved for client-facing claims.',
      'Recommendations are based on captured answer behavior and visible evidence, not inside knowledge of any model ranking system.',
    ],
  };
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
