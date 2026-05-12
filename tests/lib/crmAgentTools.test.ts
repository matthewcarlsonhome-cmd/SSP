import { beforeEach, describe, expect, it } from 'vitest';
import {
  runAgenticDAG,
  buildLocalCampaignWorklist,
  canExecuteCrmCapability,
  draftLocalAutomationOutreach,
  executeCrmCapability,
  extractWebsiteContactInfoFromHtml,
  type AgenticDAG,
} from '../../lib/agentic';
import { localBusinessRecordsToEnrichedProspects, type LocalBusinessRecord } from '../../lib/localBusinessLookup';

const STORAGE_KEY = 'skillengine_clients';

function sampleRecord(overrides: Partial<LocalBusinessRecord> = {}): LocalBusinessRecord {
  return {
    externalId: 'demo-law-1',
    source: 'demo',
    sourceLabel: 'Demo',
    companyName: 'Milwaukee Legal Group',
    website: 'https://milwaukeelegal.example.com',
    phone: '(414) 555-0101',
    formattedAddress: '100 Main St, Milwaukee, WI',
    categories: ['Law Firm', 'Professional Services'],
    confidence: 0.9,
    ...overrides,
  };
}

describe('CRM agent tools', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('executes local business lookup as a typed CRM capability', async () => {
    const result = await executeCrmCapability('crm.find-local-businesses', {
      businessType: 'law firms',
      location: 'Milwaukee, WI',
      provider: 'demo',
      maxResults: 2,
    });

    expect(result.capabilityId).toBe('crm.find-local-businesses');
    expect(result.structuredFields.records).toHaveLength(2);
    expect(result.rawOutput).toContain('Milwaukee');
  });

  it('enriches records and imports approved prospects with provenance', async () => {
    const enrich = await executeCrmCapability('crm.enrich-local-prospects', {
      records: [sampleRecord()],
      defaultIndustry: 'legal',
    });
    const prospects = enrich.structuredFields.prospects as unknown[];
    expect(prospects).toHaveLength(1);

    const imported = await executeCrmCapability('crm.import-client-prospects', {
      prospects,
      priority: 'HIGH',
    });

    expect(imported.structuredFields.created_client_ids).toHaveLength(1);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    expect(stored[0]).toMatchObject({
      companyName: 'Milwaukee Legal Group',
      sourceProvider: 'demo',
      sourceExternalId: 'demo-law-1',
      lookupConfidence: expect.any(Number),
    });
  });

  it('extracts public contact details from website HTML', () => {
    const result = extractWebsiteContactInfoFromHtml(`
      <a href="mailto:hello@example.com">Email us</a>
      <a href="/contact">Contact</a>
      <a href="tel:4145550199">Call</a>
      <section>Jane Smith - Founder</section>
    `, 'https://example.com');

    expect(result.emails).toContain('hello@example.com');
    expect(result.phones.join(' ')).toContain('414');
    expect(result.contactPageUrls).toContain('https://example.com/contact');
    expect(result.people[0]).toMatchObject({ name: 'Jane Smith', title: 'Founder' });
  });

  it('drafts outreach and builds a prioritized local campaign worklist', () => {
    const prospect = localBusinessRecordsToEnrichedProspects([sampleRecord()], 'legal')[0];
    const draft = draftLocalAutomationOutreach({
      prospect,
      senderName: 'Matthew',
      proofPoints: ['We focus on small workflow wins before large transformations.'],
    });
    expect(draft.emailDraft).toContain('Milwaukee Legal Group');
    expect(draft.linkedinNote.length).toBeLessThanOrEqual(300);

    const worklist = buildLocalCampaignWorklist({
      campaignGoal: 'Two-week legal automation outreach campaign',
      prospects: [prospect],
      days: 5,
      dailyCapacity: 2,
    });
    expect(worklist.dailyWorklist).toHaveLength(1);
    expect(worklist.successMetrics).toContain('Meetings booked');
  });

  it('advertises only supported CRM capability IDs as executable', () => {
    expect(canExecuteCrmCapability('crm.find-local-businesses')).toBe(true);
    expect(canExecuteCrmCapability('crm.not-real')).toBe(false);
  });

  it('runs a CRM capability step inside the agentic DAG runner without an LLM skill', async () => {
    const dag: AgenticDAG = {
      id: 'crm-local-lookup-dag',
      name: 'CRM Lookup DAG',
      description: 'Runs deterministic CRM lookup as an internal capability.',
      steps: [{
        id: 'find-local-businesses',
        skillId: 'crm.find-local-businesses',
        capabilityId: 'crm.find-local-businesses',
        executionMode: 'internal',
        name: 'Find Local Businesses',
        dependsOn: [],
        outputContract: { fields: [{ key: 'records', description: 'Records', format: 'json', required: true }] },
      }],
    };

    const qualityEvents: unknown[] = [];
    const results = await runAgenticDAG(dag, {
      provider: 'claude',
      apiKey: 'unused',
      userInputs: {
        businessType: 'law firms',
        location: 'Milwaukee, WI',
        provider: 'demo',
        maxResults: 1,
      },
      quality: {
        enabled: true,
        onQualityEvents: (events) => qualityEvents.push(...events),
      },
    });

    expect(results['find-local-businesses'].status).toBe('succeeded');
    expect(results['find-local-businesses'].structuredFields.records).toHaveLength(1);
    expect(qualityEvents).toHaveLength(1);
    expect(qualityEvents[0]).toMatchObject({
      workflowId: 'crm-local-lookup-dag',
      stepId: 'find-local-businesses',
      decision: 'proceed',
      contractCompleteness: 1,
      evaluatorId: 'runner-round-quality-gate',
    });
  });
});
