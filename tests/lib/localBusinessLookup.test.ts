import { describe, expect, it } from 'vitest';
import {
  assessAutomationCampaignFit,
  buildClientProspectImportPreview,
  dedupeLocalBusinessRecords,
  findDuplicateClientMatches,
  googlePlaceToLocalBusinessRecord,
  localBusinessRecordToDiscoveredProspect,
  localBusinessRecordsToEnrichedProspects,
  lookupLocalBusinesses,
  type LocalBusinessRecord,
} from '../../lib/localBusinessLookup';

describe('local business lookup', () => {
  it('normalizes Google Places records into CRM-ready business records', () => {
    const record = googlePlaceToLocalBusinessRecord({
      id: 'place-1',
      displayName: { text: 'North Shore Legal Group' },
      formattedAddress: '123 Main St, Milwaukee, WI 53202, USA',
      nationalPhoneNumber: '(414) 555-1234',
      websiteUri: 'northshorelegal.example.com',
      primaryType: 'lawyer',
      types: ['lawyer', 'legal_services'],
      rating: 4.7,
      userRatingCount: 42,
      googleMapsUri: 'https://maps.google.com/?cid=1',
    });

    expect(record).toMatchObject({
      externalId: 'place-1',
      source: 'google_places',
      companyName: 'North Shore Legal Group',
      website: 'https://northshorelegal.example.com',
      phone: '(414) 555-1234',
      region: 'WI',
      rating: 4.7,
      reviewCount: 42,
    });
    expect(record?.categories).toContain('Lawyer');
    expect(record?.confidence).toBeGreaterThan(0.8);
  });

  it('dedupes provider records by external id and name/address fallback', () => {
    const base: LocalBusinessRecord = {
      externalId: 'same-id',
      source: 'demo',
      sourceLabel: 'Demo',
      companyName: 'A Firm',
      categories: ['Legal'],
      confidence: 0.8,
    };
    const duplicateByName: LocalBusinessRecord = {
      source: 'demo',
      sourceLabel: 'Demo',
      companyName: 'B Firm LLC',
      formattedAddress: '10 State St, Madison, WI',
      categories: ['Legal'],
      confidence: 0.7,
    };

    const deduped = dedupeLocalBusinessRecords([
      base,
      { ...base, companyName: 'A Firm Duplicate' },
      duplicateByName,
      { ...duplicateByName, companyName: 'B Firm' },
    ]);

    expect(deduped).toHaveLength(2);
  });

  it('converts local records into enriched prospects with contact path and recommendations', () => {
    const prospects = localBusinessRecordsToEnrichedProspects([
      {
        externalId: 'demo-1',
        source: 'demo',
        sourceLabel: 'Demo',
        companyName: 'Madison Roofing Partners',
        website: 'https://madisonroofing.example.com',
        phone: '(608) 555-0199',
        formattedAddress: '101 Main St, Madison, WI',
        categories: ['Contractor', 'Roofing Service'],
        confidence: 0.9,
      },
    ], 'construction');

    expect(prospects).toHaveLength(1);
    expect(prospects[0]).toMatchObject({
      companyName: 'Madison Roofing Partners',
      industry: 'construction',
      phone: '(608) 555-0199',
      companyType: undefined,
    });
    expect(prospects[0].contacts[0]).toMatchObject({
      name: 'Main Office',
      title: 'Main Contact',
      phone: '(608) 555-0199',
    });
    expect(prospects[0]).toMatchObject({
      sourceProvider: 'demo',
      sourceExternalId: 'demo-1',
      sourceUrl: 'https://madisonroofing.example.com',
      lookupRaw: expect.objectContaining({ externalId: 'demo-1' }),
    });
    expect(prospects[0].suggestedSkillIds.length).toBeGreaterThan(0);
  });

  it('scores automation campaign fit with explainable reasons', () => {
    const prospect = localBusinessRecordToDiscoveredProspect({
      source: 'demo',
      sourceLabel: 'Demo',
      companyName: 'Milwaukee Marketing Group',
      website: 'https://milwaukeemarketing.example.com',
      phone: '(414) 555-0101',
      categories: ['Marketing Agency', 'Professional Services'],
      rating: 4.8,
      reviewCount: 36,
      confidence: 0.92,
    }, 'marketing_advertising');

    const fit = assessAutomationCampaignFit(prospect);
    expect(fit.score).toBeGreaterThanOrEqual(80);
    expect(fit.level).toBe('strong');
    expect(fit.reasons.length).toBeGreaterThan(0);
  });

  it('provides deterministic demo lookup for local development', async () => {
    const result = await lookupLocalBusinesses({
      provider: 'demo',
      businessType: 'law firms',
      location: 'Milwaukee, WI',
      maxResults: 3,
    });

    expect(result.provider).toBe('demo');
    expect(result.records).toHaveLength(3);
    expect(result.records[0].companyName).toContain('Milwaukee');
    expect(result.warnings[0]).toContain('Demo lookup');
  });

  it('builds selected import preview rows with duplicate detection', () => {
    const prospect = localBusinessRecordsToEnrichedProspects([
      {
        externalId: 'place-1',
        source: 'google_places',
        sourceLabel: 'Google Places',
        companyName: 'Milwaukee Legal Group',
        website: 'https://milwaukeelegal.example.com',
        phone: '(414) 555-0101',
        categories: ['Law Firm'],
        confidence: 0.9,
      },
    ], 'legal')[0];

    const matches = findDuplicateClientMatches(prospect, [{
      id: 'client-1',
      companyName: 'Milwaukee Legal Group',
      industry: 'legal',
      website: 'https://www.milwaukeelegal.example.com/practice',
      contacts: [],
      selectedSkillIds: [],
      selectedWorkflowIds: [],
      portalSlug: 'milwaukee-legal-group',
      portalEnabled: false,
      status: 'prospect',
      sourceProvider: 'google_places',
      sourceExternalId: 'place-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    expect(matches.some((match) => match.reason === 'source-external-id')).toBe(true);

    const preview = buildClientProspectImportPreview([prospect], [{
      id: 'client-1',
      companyName: 'Milwaukee Legal Group',
      industry: 'legal',
      website: 'https://milwaukeelegal.example.com',
      contacts: [],
      selectedSkillIds: [],
      selectedWorkflowIds: [],
      portalSlug: 'milwaukee-legal-group',
      portalEnabled: false,
      status: 'prospect',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    expect(preview.skipCount).toBe(1);
    expect(preview.rows[0].recommendation).toBe('skip');
  });
});
