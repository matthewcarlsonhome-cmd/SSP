/**
 * Executable CRM capabilities for the business agent.
 *
 * These are small typed tools, not UI pages. They let a goal-planned DAG
 * compose CRM prospecting work without routing deterministic operations
 * through an LLM skill prompt.
 */

import { createClientsFromProspects, enrichProspect, type DiscoveredProspect, type EnrichedProspect } from './prospecting';
import { getClients } from './clients';
import {
  assessAutomationCampaignFit,
  buildClientProspectImportPreview,
  localBusinessRecordToDiscoveredProspect,
  localBusinessRecordsToEnrichedProspects,
  lookupLocalBusinesses,
  normalizeDomainForMatch,
  type AutomationCampaignFit,
  type LocalBusinessLookupQuery,
  type LocalBusinessRecord,
} from './localBusinessLookup';
import type { Client, ClientIndustry, ClientPriority } from './storage/types';

export type CrmCapabilityId =
  | 'crm.find-local-businesses'
  | 'crm.enrich-local-prospects'
  | 'crm.score-automation-campaign-fit'
  | 'crm.import-client-prospects'
  | 'crm.extract-website-contact-info'
  | 'crm.draft-local-automation-outreach'
  | 'crm.build-local-campaign-worklist';

export interface CapabilityToolExecutionResult {
  capabilityId: CrmCapabilityId;
  rawOutput: string;
  structuredFields: Record<string, unknown>;
  durationMs: number;
}

export interface WebsiteContactPerson {
  name: string;
  title?: string;
  email?: string;
}

export interface WebsiteContactExtractionResult {
  website: string;
  emails: string[];
  phones: string[];
  contactPageUrls: string[];
  people: WebsiteContactPerson[];
  confidence: number;
  warnings: string[];
}

export interface LocalCampaignWorklistInput {
  campaignGoal?: string;
  prospects?: EnrichedProspect[];
  clients?: Client[];
  days?: number;
  dailyCapacity?: number;
}

export interface LocalCampaignWorklist {
  campaignGoal: string;
  segments: Array<{
    name: string;
    count: number;
    criteria: string;
  }>;
  dailyWorklist: Array<{
    day: number;
    companyName: string;
    action: string;
    channel: 'email' | 'linkedin' | 'phone' | 'research';
    angle: string;
    fitScore: number;
  }>;
  outreachSequence: Array<{
    dayOffset: number;
    channel: 'email' | 'linkedin' | 'phone';
    action: string;
  }>;
  successMetrics: string[];
}

export interface LocalAutomationOutreachDraft {
  companyName: string;
  emailDraft: string;
  linkedinNote: string;
  callOpener: string;
}

const CRM_CAPABILITY_IDS: CrmCapabilityId[] = [
  'crm.find-local-businesses',
  'crm.enrich-local-prospects',
  'crm.score-automation-campaign-fit',
  'crm.import-client-prospects',
  'crm.extract-website-contact-info',
  'crm.draft-local-automation-outreach',
  'crm.build-local-campaign-worklist',
];

export function canExecuteCrmCapability(capabilityId: string | undefined): capabilityId is CrmCapabilityId {
  return Boolean(capabilityId && CRM_CAPABILITY_IDS.includes(capabilityId as CrmCapabilityId));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function findArrayInput<T = unknown>(inputs: Record<string, unknown>, keys: string[]): T[] {
  for (const key of keys) {
    const value = inputs[key];
    if (Array.isArray(value)) return value as T[];
  }
  for (const value of Object.values(inputs)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      for (const key of keys) {
        if (Array.isArray(nested[key])) return nested[key] as T[];
      }
    }
  }
  return [];
}

function findStringInput(inputs: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = inputs[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  for (const value of Object.values(inputs)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      for (const key of keys) {
        const nestedValue = nested[key];
        if (typeof nestedValue === 'string' && nestedValue.trim()) return nestedValue.trim();
      }
    }
  }
  return fallback;
}

function findNumberInput(inputs: Record<string, unknown>, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = inputs[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return fallback;
}

function prospectFromClient(client: Client): EnrichedProspect {
  return enrichProspect({
    companyName: client.companyName,
    website: client.website,
    description: client.description,
    industry: client.industry,
    location: client.location,
    phone: client.contacts.find((contact) => contact.phone)?.phone,
    services: client.services,
    linkedInUrl: client.linkedInUrl,
    contacts: client.contacts,
    sourceUrl: client.sourceUrl ?? client.website,
    sourceProvider: client.sourceProvider,
    sourceExternalId: client.sourceExternalId,
    lookupRaw: client.lookupRaw,
    confidence: client.lookupConfidence ?? 0.7,
  });
}

function ensureEnrichedProspects(inputs: Record<string, unknown>): EnrichedProspect[] {
  const prospects = findArrayInput<EnrichedProspect>(inputs, ['prospects', 'enrichedProspects']);
  if (prospects.length > 0) return prospects;

  const clients = findArrayInput<Client>(inputs, ['clients', 'selectedClients']);
  if (clients.length > 0) return clients.map(prospectFromClient);

  const records = findArrayInput<LocalBusinessRecord>(inputs, ['records', 'localBusinessRecords']);
  if (records.length > 0) {
    const defaultIndustry = findStringInput(inputs, ['defaultIndustry', 'industry'], 'other') as ClientIndustry;
    return localBusinessRecordsToEnrichedProspects(records, defaultIndustry);
  }

  const singleClient = asRecord(inputs.client) as Partial<Client>;
  if (singleClient.companyName && singleClient.industry) return [prospectFromClient(singleClient as Client)];

  const singleProspect = asRecord(inputs.prospect) as Partial<EnrichedProspect>;
  if (singleProspect.companyName && singleProspect.industry) return [singleProspect as EnrichedProspect];

  return [];
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanPersonName(value: string): string {
  return value
    .replace(/^(Call|Email|Contact|Meet|About|Team)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(baseUrl: string, href: string): string | undefined {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

export function extractWebsiteContactInfoFromHtml(
  html: string,
  website: string,
): WebsiteContactExtractionResult {
  const emailMatches = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const mailtoMatches = Array.from(html.matchAll(/mailto:([^"'>?\s]+)/gi)).map((match) => decodeURIComponent(match[1]));
  const phoneMatches = html.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g) ?? [];
  const telMatches = Array.from(html.matchAll(/tel:([^"'>\s]+)/gi)).map((match) => match[1].replace(/[^\d+().\-\s]/g, ''));

  const linkMatches = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map((match) => match[1]);
  const contactPageUrls = unique(
    linkMatches
      .filter((href) => /(contact|about|team|leadership|people|staff)/i.test(href))
      .map((href) => absoluteUrl(website, href))
      .filter((href): href is string => Boolean(href)),
  );

  const text = stripHtml(html);
  const people: WebsiteContactPerson[] = [];
  const titlePattern = /(CEO|Chief Executive Officer|Founder|Owner|President|Managing Partner|Partner|Principal|Director|Operations Manager)/i;
  const forwardMatches = text.matchAll(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*(?:[-|,]|\sis\s|\s-\s)\s*(CEO|Chief Executive Officer|Founder|Owner|President|Managing Partner|Partner|Principal|Director|Operations Manager)/g);
  for (const match of forwardMatches) {
    people.push({ name: cleanPersonName(match[1]), title: match[2] });
  }
  const reverseMatches = text.matchAll(/(CEO|Chief Executive Officer|Founder|Owner|President|Managing Partner|Partner|Principal|Director|Operations Manager)\s*(?:[-|,]|\s)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/g);
  for (const match of reverseMatches) {
    if (titlePattern.test(match[1])) people.push({ name: cleanPersonName(match[2]), title: match[1] });
  }

  const emails = unique([...emailMatches, ...mailtoMatches]);
  const phones = unique([...phoneMatches, ...telMatches]);
  const uniquePeople = people.filter((person, index, all) =>
    all.findIndex((candidate) => candidate.name === person.name && candidate.title === person.title) === index,
  ).slice(0, 8);

  const confidence = Math.min(0.95, Number((
    0.25 +
    (emails.length > 0 ? 0.25 : 0) +
    (phones.length > 0 ? 0.15 : 0) +
    (contactPageUrls.length > 0 ? 0.15 : 0) +
    (uniquePeople.length > 0 ? 0.15 : 0)
  ).toFixed(2)));

  return {
    website,
    emails,
    phones,
    contactPageUrls,
    people: uniquePeople,
    confidence,
    warnings: emails.length === 0 ? ['No public email found on scanned HTML.'] : [],
  };
}

export async function extractWebsiteContactInfo(input: {
  website: string;
  html?: string;
  maxPages?: number;
}): Promise<WebsiteContactExtractionResult> {
  const website = input.website;
  if (!website) throw new Error('website is required for contact extraction.');

  if (input.html) {
    return extractWebsiteContactInfoFromHtml(input.html, website);
  }

  const warnings: string[] = [];
  let mergedHtml = '';
  try {
    const homepage = await fetch(website);
    if (!homepage.ok) throw new Error(`Homepage fetch failed (${homepage.status})`);
    const html = await homepage.text();
    mergedHtml += html;
    const firstPass = extractWebsiteContactInfoFromHtml(html, website);
    const pageLimit = Math.max(1, Math.min(input.maxPages ?? 3, 5));
    for (const url of firstPass.contactPageUrls.slice(0, pageLimit - 1)) {
      try {
        const page = await fetch(url);
        if (page.ok) mergedHtml += `\n${await page.text()}`;
      } catch (error) {
        warnings.push(`Could not fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  const result = extractWebsiteContactInfoFromHtml(mergedHtml, website);
  return {
    ...result,
    warnings: unique([...warnings, ...result.warnings]),
  };
}

export function draftLocalAutomationOutreach(input: {
  client?: Client;
  prospect?: EnrichedProspect;
  automationAngle?: string;
  proofPoints?: string[];
  senderName?: string;
}): LocalAutomationOutreachDraft {
  const prospect = input.prospect ?? (input.client ? prospectFromClient(input.client) : undefined);
  if (!prospect) throw new Error('client or prospect is required for outreach drafting.');

  const fit = assessAutomationCampaignFit(prospect);
  const useCases = prospect.keyUseCases?.slice(0, 3).join(', ') || 'admin follow-up, reporting, and client communication';
  const angle = input.automationAngle || fit.recommendedAngle;
  const proof = input.proofPoints?.length ? input.proofPoints.join(' ') : `Similar teams often reclaim ${prospect.estimatedTimeSavings ?? '15-30 hrs/month'} by tightening repeatable workflows.`;
  const sender = input.senderName || 'Matthew';

  const emailDraft = [
    `Subject: Quick automation idea for ${prospect.companyName}`,
    '',
    `Hi ${prospect.contacts[0]?.name && prospect.contacts[0].name !== 'Main Office' ? prospect.contacts[0].name : 'there'},`,
    '',
    `I was looking at ${prospect.companyName} and noticed a few workflows where practical automation could help: ${useCases}.`,
    '',
    angle,
    '',
    proof,
    '',
    'Would it be worth a quick 15-minute conversation to identify one workflow that could save time without disrupting how your team already works?',
    '',
    `Best,`,
    sender,
  ].join('\n');

  return {
    companyName: prospect.companyName,
    emailDraft,
    linkedinNote: `Hi, I help local teams automate repeatable admin, follow-up, and reporting work. I noticed a few possible fits at ${prospect.companyName} and would enjoy comparing notes.`,
    callOpener: `Hi, this is ${sender}. I help local businesses find one or two workflows where automation can save real staff time. I had a specific idea for ${prospect.companyName} and wanted to see who owns process improvement there.`,
  };
}

export function buildLocalCampaignWorklist(input: LocalCampaignWorklistInput): LocalCampaignWorklist {
  const prospects = input.prospects ?? input.clients?.map(prospectFromClient) ?? [];
  const days = Math.max(1, Math.min(input.days ?? 10, 30));
  const dailyCapacity = Math.max(1, Math.min(input.dailyCapacity ?? 5, 25));
  const scored = prospects
    .map((prospect) => ({ prospect, fit: assessAutomationCampaignFit(prospect) }))
    .sort((a, b) => b.fit.score - a.fit.score || a.prospect.companyName.localeCompare(b.prospect.companyName));

  const segmentFor = (fit: AutomationCampaignFit) =>
    fit.level === 'strong' ? 'Priority automation fit' :
    fit.level === 'good' ? 'Good fit nurture' :
    fit.level === 'research' ? 'Research before outreach' :
    'Hold';

  const dailyWorklist = scored.slice(0, days * dailyCapacity).map(({ prospect, fit }, index) => ({
    day: Math.floor(index / dailyCapacity) + 1,
    companyName: prospect.companyName,
    action:
      fit.level === 'research'
        ? 'Research website/contact path and confirm operational pain point'
        : 'Send first personalized automation outreach',
    channel: (fit.level === 'research' ? 'research' : prospect.contacts.some((contact) => contact.email) ? 'email' : 'phone') as 'email' | 'linkedin' | 'phone' | 'research',
    angle: fit.recommendedAngle,
    fitScore: fit.score,
  }));

  const segmentCounts = new Map<string, number>();
  for (const item of scored) {
    const segment = segmentFor(item.fit);
    segmentCounts.set(segment, (segmentCounts.get(segment) ?? 0) + 1);
  }

  return {
    campaignGoal: input.campaignGoal || 'Local automation prospecting campaign',
    segments: Array.from(segmentCounts.entries()).map(([name, count]) => ({
      name,
      count,
      criteria:
        name === 'Priority automation fit'
          ? 'High fit score with website and contact path present.'
          : name === 'Good fit nurture'
            ? 'Promising fit with enough public data for light personalization.'
            : name === 'Research before outreach'
              ? 'Needs contact or workflow research before outreach.'
              : 'Low confidence or weak fit; do not prioritize.',
    })),
    dailyWorklist,
    outreachSequence: [
      { dayOffset: 0, channel: 'email', action: 'Send concise personalized automation idea.' },
      { dayOffset: 2, channel: 'linkedin', action: 'Connect with short local automation note.' },
      { dayOffset: 5, channel: 'email', action: 'Follow up with one specific workflow example.' },
      { dayOffset: 8, channel: 'phone', action: 'Call to identify process owner and ask for 15-minute fit conversation.' },
    ],
    successMetrics: [
      'Qualified replies per segment',
      'Meetings booked',
      'Contact data completeness',
      'Top repeated workflow pain points',
      'Estimated monthly hours saved in accepted opportunities',
    ],
  };
}

function discoveredFromMaybeRecord(value: unknown, defaultIndustry: ClientIndustry): DiscoveredProspect | null {
  const record = value as Partial<LocalBusinessRecord>;
  if (record.companyName && Array.isArray(record.categories)) {
    return localBusinessRecordToDiscoveredProspect(record as LocalBusinessRecord, defaultIndustry);
  }
  const prospect = value as Partial<DiscoveredProspect>;
  if (prospect.companyName && prospect.industry) return prospect as DiscoveredProspect;
  return null;
}

async function executeStructured(capabilityId: CrmCapabilityId, inputs: Record<string, unknown>): Promise<Record<string, unknown>> {
  switch (capabilityId) {
    case 'crm.find-local-businesses': {
      const query: LocalBusinessLookupQuery = {
        businessType: findStringInput(inputs, ['businessType', 'query', 'searchQuery']),
        location: findStringInput(inputs, ['location']),
        industry: findStringInput(inputs, ['industry'], 'other') as ClientIndustry,
        provider: (findStringInput(inputs, ['provider'], 'demo') as LocalBusinessLookupQuery['provider']),
        maxResults: findNumberInput(inputs, ['maxResults', 'limit'], 12),
        minRating: inputs.minRating !== undefined ? findNumberInput(inputs, ['minRating'], 0) : undefined,
        apiKey: findStringInput(inputs, ['apiKey'], ''),
      };
      const result = await lookupLocalBusinesses(query);
      return { records: result.records, warnings: result.warnings, query: result.query, provider: result.provider };
    }
    case 'crm.enrich-local-prospects': {
      const defaultIndustry = findStringInput(inputs, ['defaultIndustry', 'industry'], 'other') as ClientIndustry;
      const records = findArrayInput<LocalBusinessRecord>(inputs, ['records', 'localBusinessRecords']);
      const discovered = records.length > 0
        ? records.map((record) => localBusinessRecordToDiscoveredProspect(record, defaultIndustry))
        : findArrayInput<unknown>(inputs, ['prospects']).map((value) => discoveredFromMaybeRecord(value, defaultIndustry)).filter(Boolean) as DiscoveredProspect[];
      const prospects = discovered.map(enrichProspect);
      return {
        prospects,
        recommended_skills: unique(prospects.flatMap((prospect) => prospect.suggestedSkillIds)),
        recommended_workflows: unique(prospects.flatMap((prospect) => prospect.suggestedWorkflowIds)),
      };
    }
    case 'crm.score-automation-campaign-fit': {
      const prospects = ensureEnrichedProspects(inputs);
      return {
        scores: prospects.map((prospect) => ({
          companyName: prospect.companyName,
          ...assessAutomationCampaignFit(prospect),
        })),
      };
    }
    case 'crm.import-client-prospects': {
      const prospects = ensureEnrichedProspects(inputs);
      const priority = findStringInput(inputs, ['priority'], 'RESEARCH') as ClientPriority;
      const portalEnabled = Boolean(inputs.portalEnabled);
      const preview = buildClientProspectImportPreview(prospects, getClients());
      const importable = preview.rows
        .filter((row) => row.recommendation !== 'skip')
        .map((row) => row.prospect);
      const result = await createClientsFromProspects(importable, { priority, portalEnabled });
      return {
        created_client_ids: result.created.map((client) => client.id),
        failed_imports: result.failed,
        preview,
        summary: `Created ${result.totalCreated} client prospects. Skipped ${preview.skipCount} exact duplicates.`,
      };
    }
    case 'crm.extract-website-contact-info': {
      const website = findStringInput(inputs, ['website']);
      const html = typeof inputs.html === 'string' ? inputs.html : undefined;
      const result = await extractWebsiteContactInfo({
        website,
        html,
        maxPages: findNumberInput(inputs, ['maxPages'], 3),
      });
      return result as unknown as Record<string, unknown>;
    }
    case 'crm.draft-local-automation-outreach': {
      const result = draftLocalAutomationOutreach({
        client: inputs.client as Client | undefined,
        prospect: ensureEnrichedProspects(inputs)[0],
        automationAngle: findStringInput(inputs, ['automationAngle'], ''),
        proofPoints: findArrayInput<string>(inputs, ['proofPoints']),
        senderName: findStringInput(inputs, ['senderName'], ''),
      });
      return result as unknown as Record<string, unknown>;
    }
    case 'crm.build-local-campaign-worklist': {
      const result = buildLocalCampaignWorklist({
        campaignGoal: findStringInput(inputs, ['campaignGoal', 'goal'], 'Local automation prospecting campaign'),
        prospects: ensureEnrichedProspects(inputs),
        days: findNumberInput(inputs, ['days'], 10),
        dailyCapacity: findNumberInput(inputs, ['dailyCapacity'], 5),
      });
      return result as unknown as Record<string, unknown>;
    }
    default:
      throw new Error(`Unsupported CRM capability: ${capabilityId}`);
  }
}

export async function executeCrmCapability(
  capabilityId: CrmCapabilityId,
  inputs: Record<string, unknown>,
): Promise<CapabilityToolExecutionResult> {
  const startedAt = Date.now();
  const structuredFields = await executeStructured(capabilityId, inputs);
  return {
    capabilityId,
    rawOutput: JSON.stringify(structuredFields, null, 2),
    structuredFields,
    durationMs: Date.now() - startedAt,
  };
}

export function sourceDomainForProspect(prospect: EnrichedProspect): string {
  return normalizeDomainForMatch(prospect.website ?? prospect.sourceUrl);
}
