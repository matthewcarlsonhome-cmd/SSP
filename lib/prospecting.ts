/**
 * prospecting.ts - Bulk Prospect Discovery and Enrichment
 *
 * Enables rapid prospect list building by:
 * 1. Searching for companies by industry/location/criteria
 * 2. Auto-enriching company data (contacts, details, etc.)
 * 3. Creating fully populated client records
 */

import { logger } from './logger';
import { createClientAsync } from './clients';
import { getPersonalizedSkillRecommendations, getPersonalizedWorkflowRecommendations } from './clientRecommendations';
import type { Client, ClientIndustry, ClientContact, ClientPriority } from './storage/types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ProspectSearchQuery {
  query: string;           // e.g., "Milwaukee marketing agencies"
  industry?: ClientIndustry;
  location?: string;       // e.g., "Milwaukee, WI"
  maxResults?: number;     // Default 10
}

export interface DiscoveredProspect {
  companyName: string;
  website?: string;
  description?: string;
  industry: ClientIndustry;
  location?: string;
  phone?: string;
  employeeCount?: string;
  services?: string;
  linkedInUrl?: string;
  contacts: Partial<ClientContact>[];
  sourceUrl?: string;
  confidence: number;      // 0-1 score of data quality
}

export interface EnrichedProspect extends DiscoveredProspect {
  painPoints?: string;
  keyUseCases?: string[];
  estimatedTimeSavings?: string;
  estimatedCostSavings?: string;
  companyType?: string;
  revenue?: string;
  suggestedSkillIds: string[];
  suggestedWorkflowIds: string[];
}

export interface ProspectSearchResult {
  success: boolean;
  prospects: DiscoveredProspect[];
  totalFound: number;
  searchQuery: string;
  error?: string;
}

export interface ProspectEnrichResult {
  success: boolean;
  enriched: EnrichedProspect;
  error?: string;
}

export interface BulkCreateResult {
  success: boolean;
  created: Client[];
  failed: { prospect: DiscoveredProspect; error: string }[];
  totalCreated: number;
  totalFailed: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// INDUSTRY DETECTION
// ═══════════════════════════════════════════════════════════════════════════

const INDUSTRY_KEYWORDS: Record<ClientIndustry, string[]> = {
  marketing_advertising: ['marketing', 'advertising', 'agency', 'creative', 'branding', 'digital marketing', 'media', 'PR', 'public relations', 'social media'],
  insurance: ['insurance', 'underwriting', 'claims', 'actuarial', 'risk management', 'broker'],
  financial_services: ['financial', 'banking', 'investment', 'wealth management', 'accounting', 'CPA', 'tax', 'advisory'],
  healthcare: ['healthcare', 'medical', 'hospital', 'clinic', 'health', 'dental', 'pharma', 'biotech'],
  technology: ['software', 'technology', 'tech', 'IT', 'SaaS', 'cloud', 'development', 'engineering', 'AI', 'data'],
  retail: ['retail', 'store', 'shop', 'e-commerce', 'ecommerce', 'wholesale'],
  manufacturing: ['manufacturing', 'factory', 'production', 'industrial', 'assembly'],
  professional_services: ['consulting', 'professional services', 'advisory', 'management consulting'],
  real_estate: ['real estate', 'property', 'realty', 'mortgage', 'commercial real estate'],
  hospitality: ['hotel', 'restaurant', 'hospitality', 'tourism', 'travel', 'food service'],
  education: ['education', 'school', 'university', 'college', 'training', 'learning'],
  nonprofit: ['nonprofit', 'non-profit', 'charity', 'foundation', 'NGO'],
  construction: ['construction', 'contractor', 'builder', 'architecture', 'engineering'],
  automotive: ['automotive', 'auto', 'car', 'vehicle', 'dealership'],
  food_beverage: ['food', 'beverage', 'restaurant', 'catering', 'brewery', 'winery'],
  utilities: ['utility', 'energy', 'power', 'electric', 'gas', 'water'],
  biotechnology: ['biotech', 'biotechnology', 'life sciences', 'pharmaceutical'],
  legal: ['law', 'legal', 'attorney', 'lawyer', 'firm'],
  staffing: ['staffing', 'recruiting', 'recruitment', 'HR', 'human resources', 'talent'],
  engineering: ['engineering', 'engineer', 'civil', 'mechanical', 'electrical'],
  other: [],
};

export function detectIndustry(text: string, defaultIndustry?: ClientIndustry): ClientIndustry {
  const lowerText = text.toLowerCase();

  let bestMatch: ClientIndustry = defaultIndustry || 'other';
  let bestScore = 0;

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += keyword.length; // Longer keywords = more specific match
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = industry as ClientIndustry;
    }
  }

  return bestMatch;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH RESULT PARSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse web search results into prospect data
 * This parses the structured data returned from a web search
 */
export function parseSearchResults(
  searchData: Array<{
    title: string;
    url: string;
    snippet: string;
    displayUrl?: string;
  }>,
  defaultIndustry: ClientIndustry,
  defaultLocation?: string
): DiscoveredProspect[] {
  const prospects: DiscoveredProspect[] = [];
  const seenNames = new Set<string>();

  for (const result of searchData) {
    // Extract company name from title (usually format: "Company Name - Description" or "Company Name | ...")
    let companyName = result.title
      .split(/[-–|:]/)[0]
      .trim()
      .replace(/\s+(LLC|Inc|Corp|Co|Ltd|Company|Group)\.?$/i, '')
      .trim();

    // Skip if we've already seen this company
    const normalizedName = companyName.toLowerCase();
    if (seenNames.has(normalizedName) || companyName.length < 2) {
      continue;
    }
    seenNames.add(normalizedName);

    // Extract website
    let website = result.url;
    try {
      const urlObj = new URL(website);
      website = `${urlObj.protocol}//${urlObj.hostname}`;
    } catch {
      // Keep original URL
    }

    // Detect industry from content
    const combinedText = `${result.title} ${result.snippet}`;
    const industry = detectIndustry(combinedText, defaultIndustry);

    // Extract description
    const description = result.snippet.substring(0, 500);

    // Try to extract phone number from snippet
    const phoneMatch = result.snippet.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : undefined;

    // Try to extract location from snippet
    const locationPatterns = [
      /(?:in|located in|based in|serving)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*(?:WI|Wisconsin|IL|Illinois|MN|Minnesota|MI|Michigan))/i,
      /([A-Z][a-z]+,?\s*(?:WI|Wisconsin))/,
    ];
    let location = defaultLocation;
    for (const pattern of locationPatterns) {
      const match = result.snippet.match(pattern);
      if (match) {
        location = match[1];
        break;
      }
    }

    // Extract services mentioned
    const servicesMatch = result.snippet.match(/(?:services?|specializ(?:e|ing) in|offering?)[:.]?\s*([^.]+)/i);
    const services = servicesMatch ? servicesMatch[1].trim() : undefined;

    prospects.push({
      companyName,
      website,
      description,
      industry,
      location,
      phone,
      services,
      contacts: [],
      sourceUrl: result.url,
      confidence: 0.7, // Base confidence for search results
    });
  }

  return prospects;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROSPECT ENRICHMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Industry-specific pain points for enrichment
 */
const INDUSTRY_PAIN_POINTS: Record<ClientIndustry, string[]> = {
  marketing_advertising: [
    'Campaign performance tracking across multiple channels',
    'Client reporting consolidation and automation',
    'Creative brief management and approvals',
    'A/B test analysis and optimization',
    'Time tracking and resource allocation',
  ],
  insurance: [
    'Policy document review and compliance',
    'Claims processing efficiency',
    'Client risk assessment automation',
    'Regulatory compliance tracking',
    'Cross-selling opportunity identification',
  ],
  financial_services: [
    'Regulatory compliance documentation',
    'Client portfolio performance reporting',
    'Risk assessment and documentation',
    'Investment proposal generation',
    'Audit preparation and response',
  ],
  professional_services: [
    'Proposal and SOW generation efficiency',
    'RFP response management',
    'Project documentation and status tracking',
    'Client communication management',
    'Knowledge capture and reuse',
  ],
  technology: [
    'Technical documentation and API docs',
    'Product requirements and specifications',
    'Incident analysis and postmortems',
    'Code review and feedback processes',
    'Sprint planning and delivery tracking',
  ],
  healthcare: [
    'HIPAA compliance documentation',
    'Clinical procedure standardization',
    'Staff training and onboarding',
    'Patient communication templates',
    'Quality assurance processes',
  ],
  retail: [
    'Inventory reporting and analysis',
    'Customer feedback analysis',
    'Marketing campaign performance',
    'Sales forecasting accuracy',
    'Supplier communication management',
  ],
  manufacturing: [
    'Quality control documentation',
    'Production reporting and analysis',
    'Equipment maintenance tracking',
    'Safety compliance documentation',
    'Supply chain communication',
  ],
  real_estate: [
    'Property listing management',
    'Market analysis and reporting',
    'Client communication templates',
    'Contract and document management',
    'Marketing material creation',
  ],
  hospitality: [
    'Guest experience documentation',
    'Staff training and procedures',
    'Marketing and promotion management',
    'Review response and reputation',
    'Event planning and coordination',
  ],
  education: [
    'Curriculum documentation',
    'Student communication templates',
    'Assessment and grading efficiency',
    'Administrative reporting',
    'Program compliance documentation',
  ],
  nonprofit: [
    'Grant application writing',
    'Donor communication and reporting',
    'Impact measurement and reporting',
    'Volunteer coordination',
    'Compliance documentation',
  ],
  construction: [
    'Project documentation and bids',
    'Safety compliance tracking',
    'Change order management',
    'Client communication',
    'Permit and inspection tracking',
  ],
  automotive: [
    'Service documentation',
    'Customer follow-up management',
    'Inventory and pricing analysis',
    'Marketing campaign tracking',
    'Compliance documentation',
  ],
  food_beverage: [
    'Menu and recipe documentation',
    'Health and safety compliance',
    'Inventory and cost analysis',
    'Marketing and promotions',
    'Staff training procedures',
  ],
  utilities: [
    'Regulatory compliance reporting',
    'Customer communication templates',
    'Outage and incident documentation',
    'Maintenance scheduling',
    'Safety procedure documentation',
  ],
  biotechnology: [
    'Research documentation and protocols',
    'Regulatory submission preparation',
    'Clinical trial documentation',
    'Patent and IP documentation',
    'Collaboration and communication',
  ],
  legal: [
    'Legal research and case analysis',
    'Document review and summarization',
    'Client communication management',
    'Contract analysis and drafting',
    'Compliance tracking',
  ],
  staffing: [
    'Candidate screening and evaluation',
    'Job description optimization',
    'Client requirement documentation',
    'Placement tracking and reporting',
    'Compliance documentation',
  ],
  engineering: [
    'Technical specification documentation',
    'Project reporting and analysis',
    'Design review processes',
    'Client communication management',
    'Compliance and certification tracking',
  ],
  other: [
    'Process documentation and SOPs',
    'Meeting notes and action tracking',
    'Proposal and pitch creation',
    'Customer communication',
    'Performance reporting',
  ],
};

/**
 * Estimate time/cost savings based on industry and company size
 */
function estimateSavings(industry: ClientIndustry, employeeCount?: string): { time: string; cost: string } {
  // Base savings by industry
  const industrySavings: Record<string, { minHours: number; maxHours: number; hourlyRate: number }> = {
    marketing_advertising: { minHours: 20, maxHours: 35, hourlyRate: 85 },
    insurance: { minHours: 25, maxHours: 40, hourlyRate: 95 },
    financial_services: { minHours: 25, maxHours: 45, hourlyRate: 120 },
    professional_services: { minHours: 20, maxHours: 35, hourlyRate: 150 },
    technology: { minHours: 25, maxHours: 40, hourlyRate: 110 },
    legal: { minHours: 30, maxHours: 50, hourlyRate: 200 },
    healthcare: { minHours: 20, maxHours: 35, hourlyRate: 90 },
    default: { minHours: 15, maxHours: 30, hourlyRate: 75 },
  };

  const savings = industrySavings[industry] || industrySavings.default;

  // Adjust for company size
  let sizeMultiplier = 1;
  if (employeeCount) {
    const count = parseInt(employeeCount.replace(/[^0-9]/g, ''));
    if (count > 500) sizeMultiplier = 1.5;
    else if (count > 100) sizeMultiplier = 1.3;
    else if (count > 50) sizeMultiplier = 1.2;
  }

  const minHours = Math.round(savings.minHours * sizeMultiplier);
  const maxHours = Math.round(savings.maxHours * sizeMultiplier);
  const minCost = Math.round(minHours * savings.hourlyRate / 100) * 100;
  const maxCost = Math.round(maxHours * savings.hourlyRate / 100) * 100;

  return {
    time: `${minHours}-${maxHours} hrs/month`,
    cost: `$${minCost.toLocaleString()}-$${maxCost.toLocaleString()}/month`,
  };
}

/**
 * Enrich a discovered prospect with additional data
 */
export function enrichProspect(prospect: DiscoveredProspect): EnrichedProspect {
  const painPoints = INDUSTRY_PAIN_POINTS[prospect.industry] || INDUSTRY_PAIN_POINTS.other;
  const { time, cost } = estimateSavings(prospect.industry, prospect.employeeCount);

  // Get skill/workflow recommendations
  const suggestedSkillIds = getPersonalizedSkillRecommendations({
    companyName: prospect.companyName,
    industry: prospect.industry,
    painPoints: painPoints.slice(0, 3).join('. '),
    services: prospect.services,
  });

  const suggestedWorkflowIds = getPersonalizedWorkflowRecommendations({
    companyName: prospect.companyName,
    industry: prospect.industry,
    painPoints: painPoints.slice(0, 3).join('. '),
    services: prospect.services,
  });

  // Determine company type based on industry
  const companyTypes: Record<string, string> = {
    marketing_advertising: 'Marketing Agency',
    insurance: 'Insurance Company',
    financial_services: 'Financial Services Firm',
    professional_services: 'Professional Services Firm',
    technology: 'Technology Company',
    legal: 'Law Firm',
    healthcare: 'Healthcare Provider',
    real_estate: 'Real Estate Company',
    staffing: 'Staffing Agency',
    engineering: 'Engineering Firm',
  };

  return {
    ...prospect,
    painPoints: painPoints.slice(0, 3).join('. '),
    keyUseCases: painPoints.slice(0, 5),
    estimatedTimeSavings: time,
    estimatedCostSavings: cost,
    companyType: companyTypes[prospect.industry] || undefined,
    suggestedSkillIds,
    suggestedWorkflowIds,
    confidence: Math.min(prospect.confidence + 0.1, 1.0), // Boost confidence after enrichment
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create clients from enriched prospects
 */
export async function createClientsFromProspects(
  prospects: EnrichedProspect[],
  options: {
    priority?: ClientPriority;
    portalEnabled?: boolean;
  } = {}
): Promise<BulkCreateResult> {
  const created: Client[] = [];
  const failed: { prospect: DiscoveredProspect; error: string }[] = [];

  for (const prospect of prospects) {
    try {
      // Build contacts array
      const contacts: ClientContact[] = prospect.contacts
        .filter(c => c.name)
        .map((c, index) => ({
          id: crypto.randomUUID(),
          name: c.name || '',
          title: c.title,
          email: c.email,
          phone: c.phone,
          linkedinUrl: c.linkedinUrl,
          isPrimary: index === 0,
          contactStatus: 'not_contacted' as const,
        }));

      // Create the client
      const client = await createClientAsync({
        companyName: prospect.companyName,
        industry: prospect.industry,
        website: prospect.website,
        description: prospect.description,
        companyType: prospect.companyType,
        services: prospect.services,
        revenue: prospect.revenue,
        employeeCount: prospect.employeeCount,
        location: prospect.location,
        priority: options.priority || 'RESEARCH',
        linkedInUrl: prospect.linkedInUrl,
        estimatedTimeSavings: prospect.estimatedTimeSavings,
        estimatedCostSavings: prospect.estimatedCostSavings,
        painPoints: prospect.painPoints,
        keyUseCases: prospect.keyUseCases,
        contacts,
        selectedSkillIds: prospect.suggestedSkillIds,
        selectedWorkflowIds: prospect.suggestedWorkflowIds,
        portalEnabled: options.portalEnabled ?? false,
        status: 'prospect',
        notes: `Discovered via prospecting search. Source: ${prospect.sourceUrl || 'N/A'}. Confidence: ${Math.round(prospect.confidence * 100)}%`,
      });

      created.push(client);
      logger.info('Created client from prospect', { companyName: prospect.companyName, clientId: client.id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      failed.push({ prospect, error: errorMessage });
      logger.error('Failed to create client from prospect', { companyName: prospect.companyName, error: errorMessage });
    }
  }

  return {
    success: failed.length === 0,
    created,
    failed,
    totalCreated: created.length,
    totalFailed: failed.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH QUERY BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build an optimized search query for prospect discovery
 */
export function buildSearchQuery(params: {
  industry?: string;
  location?: string;
  companyType?: string;
  additionalTerms?: string;
}): string {
  const parts: string[] = [];

  if (params.location) {
    parts.push(params.location);
  }

  if (params.industry) {
    parts.push(params.industry);
  }

  if (params.companyType) {
    parts.push(params.companyType);
  } else if (params.industry) {
    // Add default company type based on industry
    const defaultTypes: Record<string, string> = {
      marketing_advertising: 'agencies',
      insurance: 'companies',
      legal: 'firms',
      professional_services: 'firms',
      staffing: 'agencies',
    };
    const defaultType = defaultTypes[params.industry];
    if (defaultType) {
      parts.push(defaultType);
    }
  }

  if (params.additionalTerms) {
    parts.push(params.additionalTerms);
  }

  return parts.join(' ');
}

/**
 * Suggested search queries based on industry
 */
export function getSuggestedQueries(industry: ClientIndustry, location?: string): string[] {
  const baseLocation = location || 'Milwaukee';

  const industryQueries: Record<string, string[]> = {
    marketing_advertising: [
      `${baseLocation} marketing agencies`,
      `${baseLocation} digital marketing companies`,
      `${baseLocation} advertising agencies`,
      `${baseLocation} creative agencies`,
      `${baseLocation} PR firms`,
    ],
    insurance: [
      `${baseLocation} insurance agencies`,
      `${baseLocation} insurance brokers`,
      `${baseLocation} insurance companies`,
    ],
    financial_services: [
      `${baseLocation} financial advisors`,
      `${baseLocation} accounting firms`,
      `${baseLocation} wealth management`,
      `${baseLocation} CPA firms`,
    ],
    professional_services: [
      `${baseLocation} consulting firms`,
      `${baseLocation} management consulting`,
      `${baseLocation} business consulting`,
    ],
    technology: [
      `${baseLocation} software companies`,
      `${baseLocation} IT companies`,
      `${baseLocation} tech startups`,
      `${baseLocation} SaaS companies`,
    ],
    legal: [
      `${baseLocation} law firms`,
      `${baseLocation} corporate lawyers`,
      `${baseLocation} business attorneys`,
    ],
    staffing: [
      `${baseLocation} staffing agencies`,
      `${baseLocation} recruiting firms`,
      `${baseLocation} talent agencies`,
    ],
  };

  return industryQueries[industry] || [
    `${baseLocation} ${industry.replace(/_/g, ' ')} companies`,
    `${baseLocation} ${industry.replace(/_/g, ' ')} businesses`,
  ];
}
