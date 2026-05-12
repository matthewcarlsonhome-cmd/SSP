/**
 * Local business lookup and CRM prospect normalization.
 *
 * This module turns local-business directory results into the existing
 * prospecting pipeline shape so imported records get CRM enrichment, contacts,
 * portal messaging, selected skills, and workflow recommendations.
 */

import { supabase } from './supabase';
import {
  detectIndustry,
  enrichProspect,
  type DiscoveredProspect,
  type EnrichedProspect,
} from './prospecting';
import type { Client, ClientContact, ClientIndustry } from './storage/types';

export type LocalBusinessLookupProvider = 'demo' | 'google_places' | 'supabase_proxy';

export interface LocalBusinessLookupQuery {
  businessType: string;
  location: string;
  industry?: ClientIndustry;
  provider?: LocalBusinessLookupProvider;
  maxResults?: number;
  minRating?: number;
  openNow?: boolean;
  includedType?: string;
  apiKey?: string;
}

export interface LocalBusinessRecord {
  externalId?: string;
  source: LocalBusinessLookupProvider | 'google_places_edge';
  sourceLabel: string;
  companyName: string;
  website?: string;
  phone?: string;
  formattedAddress?: string;
  locality?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  categories: string[];
  primaryCategory?: string;
  rating?: number;
  reviewCount?: number;
  businessStatus?: string;
  mapsUrl?: string;
  description?: string;
  contactEmail?: string;
  primaryContactName?: string;
  primaryContactTitle?: string;
  confidence: number;
  raw?: unknown;
}

export interface LocalBusinessLookupResult {
  provider: LocalBusinessLookupProvider;
  query: string;
  records: LocalBusinessRecord[];
  warnings: string[];
}

export interface AutomationCampaignFit {
  score: number;
  level: 'strong' | 'good' | 'research' | 'weak';
  reasons: string[];
  missing: string[];
  recommendedAngle: string;
}

export interface GooglePlace {
  id?: string;
  name?: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  businessStatus?: string;
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
}

const GOOGLE_PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.businessStatus',
  'places.types',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
].join(',');

const DEMO_PHONE_PREFIXES = ['414', '608', '262', '920', '715', '815'];

function clampMaxResults(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return 12;
  return Math.max(1, Math.min(20, Math.round(value)));
}

function textQuery(query: LocalBusinessLookupQuery): string {
  const businessType = query.businessType.trim();
  const location = query.location.trim();
  return location ? `${businessType} in ${location}` : businessType;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeBusinessName(value: string): string {
  return normalizeKey(value).replace(/\b(llc|inc|corp|co|company|ltd|group)\b$/i, '').trim();
}

export function normalizeCompanyNameForMatch(value: string | undefined): string {
  return normalizeBusinessName(value ?? '');
}

export function normalizeDomainForMatch(value: string | undefined): string {
  if (!value) return '';
  try {
    const url = new URL(ensureAbsoluteUrl(value) ?? value);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
  }
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function compact<T>(values: Array<T | null | undefined>): T[] {
  return values.filter((value): value is T => value !== null && value !== undefined);
}

function ensureAbsoluteUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function confidenceForRecord(record: Omit<LocalBusinessRecord, 'confidence'>): number {
  let score = 0.48;
  if (record.website) score += 0.16;
  if (record.phone) score += 0.14;
  if (record.formattedAddress) score += 0.1;
  if (record.rating && record.rating >= 4) score += 0.05;
  if (record.reviewCount && record.reviewCount >= 10) score += 0.04;
  if (record.categories.length > 0) score += 0.03;
  return Math.min(0.96, Number(score.toFixed(2)));
}

function labelForPlaceType(type: string | undefined): string | undefined {
  if (!type) return undefined;
  return titleCase(type.replace(/_/g, ' '));
}

function splitAddress(address: string | undefined): Pick<LocalBusinessRecord, 'locality' | 'region' | 'country'> {
  if (!address) return {};
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  const regionPart = parts.find((part) => /\b[A-Z]{2}\b/.test(part));
  return {
    locality: parts.length >= 3 ? parts[parts.length - 3] : undefined,
    region: regionPart?.match(/\b[A-Z]{2}\b/)?.[0],
    country: parts[parts.length - 1],
  };
}

export function googlePlaceToLocalBusinessRecord(place: GooglePlace): LocalBusinessRecord | null {
  const companyName = place.displayName?.text?.trim();
  if (!companyName) return null;

  const categories = compact([
    labelForPlaceType(place.primaryType),
    place.primaryTypeDisplayName?.text,
    ...(place.types ?? []).map(labelForPlaceType),
  ]);
  const uniqueCategories = Array.from(new Set(categories));
  const addressParts = splitAddress(place.formattedAddress);
  const phone = place.nationalPhoneNumber ?? place.internationalPhoneNumber;
  const base: Omit<LocalBusinessRecord, 'confidence'> = {
    externalId: place.id ?? place.name,
    source: 'google_places',
    sourceLabel: 'Google Places',
    companyName,
    website: ensureAbsoluteUrl(place.websiteUri),
    phone,
    formattedAddress: place.formattedAddress,
    ...addressParts,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    categories: uniqueCategories,
    primaryCategory: uniqueCategories[0],
    rating: place.rating,
    reviewCount: place.userRatingCount,
    businessStatus: place.businessStatus,
    mapsUrl: place.googleMapsUri,
    description: uniqueCategories.length > 0
      ? `${companyName} matched as ${uniqueCategories.slice(0, 3).join(', ')}.`
      : `${companyName} matched through local business lookup.`,
    raw: place,
  };

  return { ...base, confidence: confidenceForRecord(base) };
}

export function googlePlacesToLocalBusinessRecords(places: GooglePlace[]): LocalBusinessRecord[] {
  return dedupeLocalBusinessRecords(compact(places.map(googlePlaceToLocalBusinessRecord)));
}

export function dedupeLocalBusinessRecords(records: LocalBusinessRecord[]): LocalBusinessRecord[] {
  const seen = new Set<string>();
  const deduped: LocalBusinessRecord[] = [];

  for (const record of records) {
    const key = record.externalId
      ? `${record.source}:${record.externalId}`
      : `${normalizeBusinessName(record.companyName)}:${normalizeKey(record.formattedAddress ?? record.locality ?? '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(record);
  }

  return deduped;
}

async function lookupGooglePlacesDirect(query: LocalBusinessLookupQuery): Promise<LocalBusinessLookupResult> {
  if (!query.apiKey?.trim()) {
    throw new Error('Google Places API key is required for direct Google Places lookup.');
  }

  const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': query.apiKey.trim(),
      'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: textQuery(query),
      maxResultCount: clampMaxResults(query.maxResults),
      includedType: query.includedType || undefined,
      openNow: query.openNow || undefined,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`Google Places lookup failed (${response.status}): ${message.slice(0, 240)}`);
  }

  const data = await response.json() as { places?: GooglePlace[] };
  const records = googlePlacesToLocalBusinessRecords(data.places ?? [])
    .filter((record) => !query.minRating || (record.rating ?? 0) >= query.minRating);

  return {
    provider: 'google_places',
    query: textQuery(query),
    records,
    warnings: [
      'Direct browser lookup is best for local development. Production should use the Supabase local-business-lookup function so API keys stay server-side.',
    ],
  };
}

async function lookupViaSupabaseProxy(query: LocalBusinessLookupQuery): Promise<LocalBusinessLookupResult> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Use demo lookup or configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.functions.invoke('local-business-lookup', {
    body: {
      businessType: query.businessType,
      location: query.location,
      maxResults: clampMaxResults(query.maxResults),
      minRating: query.minRating,
      openNow: query.openNow,
      includedType: query.includedType,
    },
  });

  if (error) {
    throw new Error(error.message || 'Supabase local business lookup failed.');
  }

  const payload = data as Partial<LocalBusinessLookupResult> & { records?: LocalBusinessRecord[] };
  return {
    provider: 'supabase_proxy',
    query: payload.query ?? textQuery(query),
    records: dedupeLocalBusinessRecords(payload.records ?? []),
    warnings: payload.warnings ?? [],
  };
}

function buildDemoLocalBusinessRecords(query: LocalBusinessLookupQuery): LocalBusinessRecord[] {
  const maxResults = clampMaxResults(query.maxResults);
  const baseType = titleCase(query.businessType || 'Local Business');
  const city = (query.location.split(',')[0] || 'Local').trim();
  const category = labelForPlaceType(query.includedType) ?? baseType;
  const names = [
    `${city} ${baseType} Group`,
    `North Shore ${baseType}`,
    `${baseType} Partners of ${city}`,
    `Lakeview ${baseType} Co.`,
    `${city} Business Automation Candidate`,
    `Summit ${baseType} Services`,
    `Riverfront ${baseType} Studio`,
    `${city} Growth Operators`,
    `Harbor ${baseType} Collective`,
    `Prairie ${baseType} Advisors`,
  ];

  return names.slice(0, maxResults).map((name, index) => {
    const phonePrefix = DEMO_PHONE_PREFIXES[index % DEMO_PHONE_PREFIXES.length];
    const base: Omit<LocalBusinessRecord, 'confidence'> = {
      externalId: `demo-${normalizeKey(query.businessType)}-${normalizeKey(query.location)}-${index + 1}`,
      source: 'demo',
      sourceLabel: 'Demo lookup',
      companyName: name,
      website: `https://${normalizeKey(name).replace(/\s+/g, '')}.example.com`,
      phone: `(${phonePrefix}) 555-01${String(index + 10).slice(-2)}`,
      formattedAddress: `${100 + index * 17} Main St, ${query.location}`,
      locality: city,
      region: query.location.match(/\b[A-Z]{2}\b/)?.[0],
      categories: [category, 'Professional Services', 'Local Business'],
      primaryCategory: category,
      rating: Number((4.1 + (index % 5) * 0.16).toFixed(1)),
      reviewCount: 12 + index * 7,
      businessStatus: 'OPERATIONAL',
      description: `${name} is a demo local prospect generated for campaign planning and CRM import testing.`,
    };
    return { ...base, confidence: confidenceForRecord(base) };
  });
}

export async function lookupLocalBusinesses(query: LocalBusinessLookupQuery): Promise<LocalBusinessLookupResult> {
  const provider = query.provider ?? 'demo';
  if (!query.businessType.trim()) throw new Error('Business type is required.');

  if (provider === 'google_places') {
    return lookupGooglePlacesDirect(query);
  }

  if (provider === 'supabase_proxy') {
    return lookupViaSupabaseProxy(query);
  }

  return {
    provider: 'demo',
    query: textQuery(query),
    records: buildDemoLocalBusinessRecords(query),
    warnings: ['Demo lookup uses generated records for local development. Switch to Supabase lookup for production data.'],
  };
}

export function localBusinessRecordToDiscoveredProspect(
  record: LocalBusinessRecord,
  defaultIndustry: ClientIndustry = 'other',
): DiscoveredProspect {
  const combinedText = [
    record.companyName,
    record.primaryCategory,
    record.categories.join(' '),
    record.description,
  ].join(' ');
  const industry = detectIndustry(combinedText, defaultIndustry);
  const contacts: Partial<ClientContact>[] = [];

  if (record.primaryContactName || record.contactEmail || record.phone) {
    contacts.push({
      name: record.primaryContactName ?? 'Main Office',
      title: record.primaryContactTitle ?? 'Main Contact',
      email: record.contactEmail,
      phone: record.phone,
      isPrimary: true,
    });
  }

  return {
    companyName: record.companyName,
    website: record.website,
    description: record.description,
    industry,
    location: record.formattedAddress ?? (compact([record.locality, record.region]).join(', ') || undefined),
    phone: record.phone,
    services: record.categories.join(', '),
    contacts,
    sourceUrl: record.website ?? record.mapsUrl,
    sourceProvider: record.source,
    sourceExternalId: record.externalId,
    lookupRaw: record.raw ?? record,
    confidence: record.confidence,
  };
}

export function localBusinessRecordsToEnrichedProspects(
  records: LocalBusinessRecord[],
  defaultIndustry: ClientIndustry = 'other',
): EnrichedProspect[] {
  return records.map((record) => enrichProspect(localBusinessRecordToDiscoveredProspect(record, defaultIndustry)));
}

export function assessAutomationCampaignFit(input: LocalBusinessRecord | DiscoveredProspect): AutomationCampaignFit {
  const hasWebsite = Boolean(input.website);
  const hasPhone = Boolean('phone' in input && input.phone);
  const hasContacts = 'contacts' in input && input.contacts.length > 0;
  const services = 'categories' in input ? input.categories.join(' ') : input.services ?? '';
  const description = input.description ?? '';
  const text = `${services} ${description}`.toLowerCase();
  const automationSignals = [
    'agency',
    'consulting',
    'legal',
    'insurance',
    'financial',
    'staffing',
    'marketing',
    'contractor',
    'service',
    'professional',
  ];
  const signalHits = automationSignals.filter((signal) => text.includes(signal));

  let score = 30;
  const reasons: string[] = [];
  const missing: string[] = [];

  if (hasWebsite) {
    score += 20;
    reasons.push('Website available for campaign personalization.');
  } else {
    missing.push('website');
  }

  if (hasPhone || hasContacts) {
    score += 18;
    reasons.push('Contact path available for outreach.');
  } else {
    missing.push('phone or contact');
  }

  if (signalHits.length > 0) {
    score += Math.min(22, signalHits.length * 6);
    reasons.push(`Automation-fit signals: ${signalHits.slice(0, 4).join(', ')}.`);
  } else {
    missing.push('clear automation-fit signal');
  }

  if ('rating' in input && input.rating && input.rating >= 4) {
    score += 8;
    reasons.push('Strong public rating indicates active reputation management.');
  }

  if ('reviewCount' in input && input.reviewCount && input.reviewCount >= 10) {
    score += 6;
    reasons.push('Review volume suggests enough customer operations to improve.');
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  const level: AutomationCampaignFit['level'] =
    boundedScore >= 80 ? 'strong' :
    boundedScore >= 62 ? 'good' :
    boundedScore >= 45 ? 'research' :
    'weak';

  return {
    score: boundedScore,
    level,
    reasons,
    missing,
    recommendedAngle:
      level === 'strong' || level === 'good'
        ? 'Lead with time savings, faster client/customer follow-up, and better operating visibility.'
        : 'Research the business model and identify a narrow admin or outreach workflow before pitching.',
  };
}

export interface ClientDuplicateMatch {
  clientId: string;
  companyName: string;
  reason: 'source-external-id' | 'website-domain' | 'company-name' | 'phone';
  confidence: 'exact' | 'likely';
}

export interface ClientProspectImportPreviewRow {
  prospect: EnrichedProspect;
  duplicateMatches: ClientDuplicateMatch[];
  recommendation: 'import' | 'review' | 'skip';
}

export interface ClientProspectImportPreview {
  rows: ClientProspectImportPreviewRow[];
  totalProspects: number;
  importableCount: number;
  reviewCount: number;
  skipCount: number;
}

function phoneDigits(value: string | undefined): string {
  return (value ?? '').replace(/\D/g, '').slice(-10);
}

export function findDuplicateClientMatches(prospect: EnrichedProspect, clients: Client[]): ClientDuplicateMatch[] {
  const matches: ClientDuplicateMatch[] = [];
  const prospectDomain = normalizeDomainForMatch(prospect.website);
  const prospectName = normalizeCompanyNameForMatch(prospect.companyName);
  const prospectPhone = phoneDigits(prospect.phone || prospect.contacts.find((contact) => contact.phone)?.phone);

  for (const client of clients) {
    if (
      prospect.sourceProvider &&
      prospect.sourceExternalId &&
      client.sourceProvider === prospect.sourceProvider &&
      client.sourceExternalId === prospect.sourceExternalId
    ) {
      matches.push({
        clientId: client.id,
        companyName: client.companyName,
        reason: 'source-external-id',
        confidence: 'exact',
      });
      continue;
    }

    const clientDomain = normalizeDomainForMatch(client.website);
    if (prospectDomain && clientDomain && prospectDomain === clientDomain) {
      matches.push({
        clientId: client.id,
        companyName: client.companyName,
        reason: 'website-domain',
        confidence: 'exact',
      });
      continue;
    }

    const clientPhone = phoneDigits(client.contacts.find((contact) => contact.phone)?.phone);
    if (prospectPhone && clientPhone && prospectPhone === clientPhone) {
      matches.push({
        clientId: client.id,
        companyName: client.companyName,
        reason: 'phone',
        confidence: 'exact',
      });
      continue;
    }

    const clientName = normalizeCompanyNameForMatch(client.companyName);
    if (prospectName && clientName && prospectName === clientName) {
      matches.push({
        clientId: client.id,
        companyName: client.companyName,
        reason: 'company-name',
        confidence: 'likely',
      });
    }
  }

  return matches;
}

export function buildClientProspectImportPreview(
  prospects: EnrichedProspect[],
  clients: Client[],
): ClientProspectImportPreview {
  const rows = prospects.map((prospect): ClientProspectImportPreviewRow => {
    const duplicateMatches = findDuplicateClientMatches(prospect, clients);
    const hasExact = duplicateMatches.some((match) => match.confidence === 'exact');
    return {
      prospect,
      duplicateMatches,
      recommendation: hasExact ? 'skip' : duplicateMatches.length > 0 ? 'review' : 'import',
    };
  });

  return {
    rows,
    totalProspects: rows.length,
    importableCount: rows.filter((row) => row.recommendation === 'import').length,
    reviewCount: rows.filter((row) => row.recommendation === 'review').length,
    skipCount: rows.filter((row) => row.recommendation === 'skip').length,
  };
}
