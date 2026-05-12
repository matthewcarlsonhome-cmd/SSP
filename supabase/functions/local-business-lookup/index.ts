/**
 * Local Business Lookup Edge Function
 *
 * Secure Google Places proxy for CRM prospect discovery. Keep
 * GOOGLE_PLACES_API_KEY server-side and return normalized business records
 * that the React CRM can enrich/import.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface LookupRequest {
  businessType?: string;
  location?: string;
  maxResults?: number;
  minRating?: number;
  openNow?: boolean;
  includedType?: string;
}

interface GooglePlace {
  id?: string;
  name?: string;
  displayName?: { text?: string };
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clampMaxResults(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return 12;
  return Math.max(1, Math.min(20, Math.round(value)));
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeBusinessName(value: string): string {
  return normalizeKey(value).replace(/\b(llc|inc|corp|co|company|ltd|group)\b$/i, '').trim();
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

function labelForPlaceType(type: string | undefined): string | undefined {
  if (!type) return undefined;
  return titleCase(type.replace(/_/g, ' '));
}

function ensureAbsoluteUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function splitAddress(address: string | undefined): { locality?: string; region?: string; country?: string } {
  if (!address) return {};
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  const regionPart = parts.find((part) => /\b[A-Z]{2}\b/.test(part));
  return {
    locality: parts.length >= 3 ? parts[parts.length - 3] : undefined,
    region: regionPart?.match(/\b[A-Z]{2}\b/)?.[0],
    country: parts[parts.length - 1],
  };
}

function confidenceForRecord(record: {
  website?: string;
  phone?: string;
  formattedAddress?: string;
  rating?: number;
  reviewCount?: number;
  categories: string[];
}): number {
  let score = 0.48;
  if (record.website) score += 0.16;
  if (record.phone) score += 0.14;
  if (record.formattedAddress) score += 0.1;
  if (record.rating && record.rating >= 4) score += 0.05;
  if (record.reviewCount && record.reviewCount >= 10) score += 0.04;
  if (record.categories.length > 0) score += 0.03;
  return Math.min(0.96, Number(score.toFixed(2)));
}

function placeToRecord(place: GooglePlace) {
  const companyName = place.displayName?.text?.trim();
  if (!companyName) return null;

  const categories = compact([
    labelForPlaceType(place.primaryType),
    place.primaryTypeDisplayName?.text,
    ...(place.types ?? []).map(labelForPlaceType),
  ]);
  const uniqueCategories = Array.from(new Set(categories));
  const phone = place.nationalPhoneNumber ?? place.internationalPhoneNumber;
  const record = {
    externalId: place.id ?? place.name,
    source: 'google_places_edge',
    sourceLabel: 'Google Places',
    companyName,
    website: ensureAbsoluteUrl(place.websiteUri),
    phone,
    formattedAddress: place.formattedAddress,
    ...splitAddress(place.formattedAddress),
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

  return { ...record, confidence: confidenceForRecord(record) };
}

function dedupe(records: Array<ReturnType<typeof placeToRecord>>) {
  const seen = new Set<string>();
  const out = [];
  for (const record of compact(records)) {
    const key = record.externalId
      ? `${record.source}:${record.externalId}`
      : `${normalizeBusinessName(record.companyName)}:${normalizeKey(record.formattedAddress ?? record.locality ?? '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(record);
  }
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) return jsonResponse({ error: 'Supabase environment not configured' }, 503);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: 'Invalid authentication' }, 401);

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) return jsonResponse({ error: 'GOOGLE_PLACES_API_KEY is not configured' }, 503);

    const body: LookupRequest = await req.json();
    const businessType = body.businessType?.trim();
    const location = body.location?.trim();
    if (!businessType) return jsonResponse({ error: 'businessType is required' }, 400);

    const query = location ? `${businessType} in ${location}` : businessType;
    const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: clampMaxResults(body.maxResults),
        includedType: body.includedType || undefined,
        openNow: body.openNow || undefined,
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      return jsonResponse({ error: `Google Places lookup failed (${response.status}): ${message.slice(0, 240)}` }, response.status);
    }

    const data = await response.json() as { places?: GooglePlace[] };
    const records = dedupe((data.places ?? []).map(placeToRecord))
      .filter((record) => !body.minRating || (record.rating ?? 0) >= body.minRating);

    return jsonResponse({
      provider: 'supabase_proxy',
      query,
      records,
      warnings: [],
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Lookup failed' }, 500);
  }
});
