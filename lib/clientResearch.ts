/**
 * AI-Powered Client Research Assistant
 *
 * One-click research for clients:
 * - Company overview from website
 * - LinkedIn profile data
 * - Recent news and mentions
 * - Tech stack identification
 * - Pain point suggestions
 * - Skill/workflow recommendations
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from './logger';
import type { Client, ClientIndustry } from './storage/types';
import { getPersonalizedSkillRecommendations, getPersonalizedWorkflowRecommendations } from './clientRecommendations';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ResearchType =
  | 'company_overview'
  | 'linkedin_profile'
  | 'recent_news'
  | 'tech_stack'
  | 'pain_points'
  | 'competitor_analysis'
  | 'contact_enrichment';

export interface ClientResearch {
  id: string;
  clientId: string;
  researchType: ResearchType;
  rawData?: Record<string, unknown>;
  summary?: string;
  keyInsights?: string[];
  suggestedSkills?: string[];
  suggestedWorkflows?: string[];
  confidenceScore?: number;
  sourceUrl?: string;
  sourceName?: string;
  researchedAt: string;
  expiresAt?: string;
}

export interface ResearchResult {
  success: boolean;
  research?: ClientResearch;
  error?: string;
}

export interface CompanyOverview {
  description: string;
  services: string[];
  targetMarkets: string[];
  keyDifferentiators: string[];
  companySize?: string;
  founded?: string;
  headquarters?: string;
}

export interface PainPointAnalysis {
  painPoints: string[];
  opportunities: string[];
  suggestedApproach: string;
  keyUseCases: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// RESEARCH PROMPTS
// ═══════════════════════════════════════════════════════════════════════════

const COMPANY_OVERVIEW_PROMPT = `Analyze this company website content and extract:
1. Company description (2-3 sentences)
2. Main services/offerings (bullet list)
3. Target markets/customers
4. Key differentiators
5. Company size if mentioned
6. Founding year if mentioned
7. Headquarters location if mentioned

Format as JSON with these fields: description, services[], targetMarkets[], keyDifferentiators[], companySize, founded, headquarters`;

const PAIN_POINT_PROMPT = `Based on this company information, identify:
1. 3-5 likely operational pain points they face
2. 3-5 opportunities where AI automation could help
3. Recommended approach for outreach
4. 3-5 specific use cases for AI skills

Consider their industry, services, and typical challenges for companies of this type.

Format as JSON with: painPoints[], opportunities[], suggestedApproach, keyUseCases[]`;

const TECH_STACK_PROMPT = `Analyze this company information to identify:
1. Likely technology stack (CRM, marketing tools, etc.)
2. Process maturity level (startup, growing, established)
3. Automation readiness
4. Integration opportunities

Format as JSON with: techStack[], maturityLevel, automationReadiness (1-5), integrationOpportunities[]`;

// ═══════════════════════════════════════════════════════════════════════════
// WEBSITE SCRAPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch website content via proxy (to avoid CORS)
 * In production, this would use a server-side endpoint
 */
async function fetchWebsiteContent(url: string): Promise<string | null> {
  try {
    // For now, we'll use a simple approach
    // In production, this should go through a server-side proxy
    logger.info('Fetching website content', { url });

    // Try using a CORS proxy or server-side function
    // This is a placeholder - implement proper scraping on server
    const proxyUrl = `/api/scrape?url=${encodeURIComponent(url)}`;

    // For local development, return null and rely on manual input
    logger.warn('Website scraping requires server-side implementation');
    return null;
  } catch (error) {
    logger.error('Failed to fetch website content', { url, error });
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AI ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Call AI to analyze content
 * Uses the portal proxy for AI calls
 */
async function analyzeWithAI(
  prompt: string,
  content: string,
  portalSlug: string = 'research'
): Promise<string | null> {
  try {
    // Import callPortalProxy dynamically to avoid circular dependencies
    const { callPortalProxy } = await import('./portalProxy');

    const response = await callPortalProxy({
      prompt: `${prompt}\n\n---\nContent to analyze:\n${content}`,
      systemPrompt: 'You are a business analyst assistant. Analyze the provided content and respond with structured JSON only. No markdown, no explanations - just valid JSON.',
      maxTokens: 1024,
      portalSlug,
    });

    return response.output || null;
  } catch (error) {
    logger.error('AI analysis failed', { error });
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESEARCH FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Research a company from their website
 */
export async function researchCompanyWebsite(
  client: Client,
  websiteContent?: string
): Promise<ResearchResult> {
  const content = websiteContent || await fetchWebsiteContent(client.website || '');

  if (!content) {
    // Fall back to analyzing based on existing client data
    return analyzeClientData(client);
  }

  const analysisResult = await analyzeWithAI(
    COMPANY_OVERVIEW_PROMPT,
    content,
    client.portalSlug
  );

  if (!analysisResult) {
    return { success: false, error: 'AI analysis failed' };
  }

  try {
    const overview = JSON.parse(analysisResult) as CompanyOverview;

    // Save to database
    const research = await saveResearch({
      clientId: client.id,
      researchType: 'company_overview',
      rawData: overview,
      summary: overview.description,
      keyInsights: [
        ...overview.services.slice(0, 3).map(s => `Service: ${s}`),
        ...overview.keyDifferentiators.slice(0, 2).map(d => `Differentiator: ${d}`),
      ],
      sourceUrl: client.website,
      sourceName: 'website_scrape',
    });

    return { success: true, research };
  } catch (error) {
    logger.error('Failed to parse AI response', { error });
    return { success: false, error: 'Failed to parse research results' };
  }
}

/**
 * Analyze existing client data to generate insights
 */
export async function analyzeClientData(client: Client): Promise<ResearchResult> {
  // Build context from existing client data
  const context = [
    `Company: ${client.companyName}`,
    `Industry: ${client.industry}`,
    client.description ? `Description: ${client.description}` : '',
    client.services ? `Services: ${client.services}` : '',
    client.companyType ? `Type: ${client.companyType}` : '',
    client.employeeCount ? `Size: ${client.employeeCount} employees` : '',
    client.location ? `Location: ${client.location}` : '',
  ].filter(Boolean).join('\n');

  const analysisResult = await analyzeWithAI(
    PAIN_POINT_PROMPT,
    context,
    client.portalSlug
  );

  if (!analysisResult) {
    // Generate fallback based on industry
    return generateFallbackResearch(client);
  }

  try {
    const analysis = JSON.parse(analysisResult) as PainPointAnalysis;

    // Get personalized skill/workflow recommendations
    const suggestedSkills = getPersonalizedSkillRecommendations(client);
    const suggestedWorkflows = getPersonalizedWorkflowRecommendations(client);

    const research = await saveResearch({
      clientId: client.id,
      researchType: 'pain_points',
      rawData: analysis,
      summary: analysis.suggestedApproach,
      keyInsights: [
        ...analysis.painPoints.slice(0, 3).map(p => `Pain: ${p}`),
        ...analysis.opportunities.slice(0, 2).map(o => `Opportunity: ${o}`),
      ],
      suggestedSkills,
      suggestedWorkflows,
      sourceName: 'ai_analysis',
    });

    return { success: true, research };
  } catch (error) {
    logger.error('Failed to parse pain point analysis', { error });
    return generateFallbackResearch(client);
  }
}

/**
 * Generate fallback research based on industry patterns
 */
function generateFallbackResearch(client: Client): ResearchResult {
  const industryPainPoints = getIndustryPainPoints(client.industry);
  const suggestedSkills = getPersonalizedSkillRecommendations(client);
  const suggestedWorkflows = getPersonalizedWorkflowRecommendations(client);

  return {
    success: true,
    research: {
      id: 'fallback',
      clientId: client.id,
      researchType: 'pain_points',
      summary: `${client.companyName} is a ${client.industry.replace(/_/g, ' ')} company that could benefit from AI automation.`,
      keyInsights: industryPainPoints.slice(0, 5),
      suggestedSkills,
      suggestedWorkflows,
      confidenceScore: 0.6,
      sourceName: 'industry_template',
      researchedAt: new Date().toISOString(),
    },
  };
}

/**
 * Get common pain points for an industry
 */
function getIndustryPainPoints(industry: ClientIndustry): string[] {
  const painPointsByIndustry: Record<string, string[]> = {
    marketing_advertising: [
      'Campaign performance tracking across multiple channels',
      'Client reporting consolidation and automation',
      'Creative brief management and approval workflows',
      'A/B test analysis and insights generation',
      'Time tracking and resource allocation',
    ],
    professional_services: [
      'Proposal and SOW generation',
      'RFP response management',
      'Project documentation and status updates',
      'Client communication and meeting notes',
      'Knowledge management and reuse',
    ],
    insurance: [
      'Policy document review and compliance',
      'Claims processing documentation',
      'Client risk assessments',
      'Regulatory compliance tracking',
      'Cross-selling opportunity identification',
    ],
    technology: [
      'Technical documentation and API docs',
      'Product requirements and specs',
      'Incident postmortems and analysis',
      'Code review and feedback',
      'Sprint planning and delivery tracking',
    ],
    healthcare: [
      'HIPAA compliance documentation',
      'Clinical procedure documentation',
      'Staff training and onboarding',
      'Patient communication templates',
      'Quality assurance processes',
    ],
    financial_services: [
      'Regulatory compliance reporting',
      'Client portfolio reviews',
      'Risk assessment documentation',
      'Investment proposal generation',
      'Audit preparation and response',
    ],
    other: [
      'Process documentation and SOPs',
      'Meeting notes and action tracking',
      'Proposal and pitch creation',
      'Customer communication',
      'Performance reporting',
    ],
  };

  return painPointsByIndustry[industry] || painPointsByIndustry.other;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save research to database
 */
async function saveResearch(input: {
  clientId: string;
  researchType: ResearchType;
  rawData?: Record<string, unknown>;
  summary?: string;
  keyInsights?: string[];
  suggestedSkills?: string[];
  suggestedWorkflows?: string[];
  confidenceScore?: number;
  sourceUrl?: string;
  sourceName?: string;
  expiresAt?: string;
}): Promise<ClientResearch | null> {
  if (!isSupabaseConfigured() || !supabase) {
    // Return in-memory research if no database
    return {
      id: `temp_${Date.now()}`,
      clientId: input.clientId,
      researchType: input.researchType,
      rawData: input.rawData,
      summary: input.summary,
      keyInsights: input.keyInsights,
      suggestedSkills: input.suggestedSkills,
      suggestedWorkflows: input.suggestedWorkflows,
      confidenceScore: input.confidenceScore,
      sourceUrl: input.sourceUrl,
      sourceName: input.sourceName,
      researchedAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    };
  }

  const { data, error } = await supabase
    .from('client_research')
    .upsert({
      client_id: input.clientId,
      research_type: input.researchType,
      raw_data: input.rawData,
      summary: input.summary,
      key_insights: input.keyInsights,
      suggested_skills: input.suggestedSkills,
      suggested_workflows: input.suggestedWorkflows,
      confidence_score: input.confidenceScore,
      source_url: input.sourceUrl,
      source_name: input.sourceName,
      expires_at: input.expiresAt,
      researched_at: new Date().toISOString(),
    }, {
      onConflict: 'client_id,research_type',
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to save research', { error: error.message });
    return null;
  }

  return {
    id: data.id,
    clientId: data.client_id,
    researchType: data.research_type,
    rawData: data.raw_data,
    summary: data.summary,
    keyInsights: data.key_insights,
    suggestedSkills: data.suggested_skills,
    suggestedWorkflows: data.suggested_workflows,
    confidenceScore: data.confidence_score,
    sourceUrl: data.source_url,
    sourceName: data.source_name,
    researchedAt: data.researched_at,
    expiresAt: data.expires_at,
  };
}

/**
 * Get all research for a client
 */
export async function getClientResearch(clientId: string): Promise<ClientResearch[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('client_research')
    .select('*')
    .eq('client_id', clientId)
    .order('researched_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch client research', { error: error.message });
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    clientId: row.client_id,
    researchType: row.research_type,
    rawData: row.raw_data,
    summary: row.summary,
    keyInsights: row.key_insights,
    suggestedSkills: row.suggested_skills,
    suggestedWorkflows: row.suggested_workflows,
    confidenceScore: row.confidence_score,
    sourceUrl: row.source_url,
    sourceName: row.source_name,
    researchedAt: row.researched_at,
    expiresAt: row.expires_at,
  }));
}

/**
 * Get specific research type for a client
 */
export async function getResearchByType(
  clientId: string,
  researchType: ResearchType
): Promise<ClientResearch | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from('client_research')
    .select('*')
    .eq('client_id', clientId)
    .eq('research_type', researchType)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is ok
      logger.error('Failed to fetch research', { error: error.message });
    }
    return null;
  }

  return {
    id: data.id,
    clientId: data.client_id,
    researchType: data.research_type,
    rawData: data.raw_data,
    summary: data.summary,
    keyInsights: data.key_insights,
    suggestedSkills: data.suggested_skills,
    suggestedWorkflows: data.suggested_workflows,
    confidenceScore: data.confidence_score,
    sourceUrl: data.source_url,
    sourceName: data.source_name,
    researchedAt: data.researched_at,
    expiresAt: data.expires_at,
  };
}

/**
 * Delete research for a client
 */
export async function deleteClientResearch(clientId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from('client_research')
    .delete()
    .eq('client_id', clientId);

  if (error) {
    logger.error('Failed to delete client research', { error: error.message });
    return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// ONE-CLICK RESEARCH
// ═══════════════════════════════════════════════════════════════════════════

export interface FullResearchResult {
  success: boolean;
  overview?: ClientResearch;
  painPoints?: ClientResearch;
  suggestedUpdates: {
    description?: string;
    painPoints?: string;
    keyUseCases?: string[];
    companyTechnicalInfo?: string;
    selectedSkillIds?: string[];
    selectedWorkflowIds?: string[];
  };
  errors: string[];
}

/**
 * Run full research for a client (one-click)
 */
export async function runFullClientResearch(client: Client): Promise<FullResearchResult> {
  const result: FullResearchResult = {
    success: false,
    suggestedUpdates: {},
    errors: [],
  };

  try {
    // Run pain points analysis (this works without website scraping)
    const painPointsResult = await analyzeClientData(client);
    if (painPointsResult.success && painPointsResult.research) {
      result.painPoints = painPointsResult.research;

      // Extract suggested updates
      if (painPointsResult.research.summary) {
        result.suggestedUpdates.description = painPointsResult.research.summary;
      }
      if (painPointsResult.research.keyInsights) {
        const painPoints = painPointsResult.research.keyInsights
          .filter(i => i.startsWith('Pain:'))
          .map(i => i.replace('Pain: ', ''));
        if (painPoints.length > 0) {
          result.suggestedUpdates.painPoints = painPoints.join('. ');
        }
      }
      if (painPointsResult.research.rawData) {
        const rawData = painPointsResult.research.rawData as PainPointAnalysis;
        if (rawData.keyUseCases) {
          result.suggestedUpdates.keyUseCases = rawData.keyUseCases;
        }
      }
      if (painPointsResult.research.suggestedSkills) {
        result.suggestedUpdates.selectedSkillIds = painPointsResult.research.suggestedSkills;
      }
      if (painPointsResult.research.suggestedWorkflows) {
        result.suggestedUpdates.selectedWorkflowIds = painPointsResult.research.suggestedWorkflows;
      }
    } else {
      result.errors.push('Pain points analysis failed');
    }

    // Try website research if URL available
    if (client.website) {
      const overviewResult = await researchCompanyWebsite(client);
      if (overviewResult.success && overviewResult.research) {
        result.overview = overviewResult.research;
      }
    }

    result.success = result.painPoints !== undefined;
  } catch (error) {
    logger.error('Full research failed', { error, clientId: client.id });
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

/**
 * Quick research - just get skill/workflow recommendations without AI
 */
export function getQuickRecommendations(client: Client): {
  suggestedSkills: string[];
  suggestedWorkflows: string[];
  industryPainPoints: string[];
} {
  return {
    suggestedSkills: getPersonalizedSkillRecommendations(client),
    suggestedWorkflows: getPersonalizedWorkflowRecommendations(client),
    industryPainPoints: getIndustryPainPoints(client.industry),
  };
}
