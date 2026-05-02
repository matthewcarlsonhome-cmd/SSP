import { describe, expect, it } from 'vitest';
import {
  buildActionPlan,
  buildInstantAuditIntake,
  buildReportDraft,
  CORE_QUERY_TEMPLATES,
  computeVisibilityMetrics,
  computeVisibilityDelta,
  createAuditRun,
  createShareableLeadScorecard,
  extractCompetitorCandidatesFromRuns,
  getAuditProfileConfig,
  getTemplatesForAuditProfile,
  mapFindings,
  renderVisibilityQuestions,
  scoreAuditResponse,
  type AuditBusinessProfile,
} from '../lib/llm-visibility-audit';

const profile: AuditBusinessProfile = {
  brand: 'Northstar Dental',
  website: 'https://northstardental.example.com',
  niche: 'dentist',
  city: 'Denver',
  state: 'CO',
  country: 'US',
  aliases: ['Northstar Family Dental'],
  competitors: ['Peak Dental', 'Mile High Smiles'],
};

describe('LLM Visibility Audit', () => {
  it('renders competitor variants and local placeholders', () => {
    const rendered = renderVisibilityQuestions(profile, CORE_QUERY_TEMPLATES.slice(0, 6), {
      jobToBeDone: 'emergency dental care',
    });

    expect(rendered.some(query => query.prompt.includes('Denver, CO'))).toBe(true);
    expect(rendered.filter(query => query.code === 'C01')).toHaveLength(2);
    expect(rendered.find(query => query.competitor === 'Peak Dental')?.prompt).toContain('Peak Dental');
  });

  it('scores brand mentions, position, competitors, and citations', () => {
    const score = scoreAuditResponse(
      'Northstar Dental is a reliable and top-rated dentist in Denver. Peak Dental is another option.',
      profile,
      [{ url: 'https://northstardental.example.com/reviews', title: 'Reviews' }]
    );

    expect(score.brandMentioned).toBe(true);
    expect(score.brandPosition).toBe(1);
    expect(score.brandSentiment).toBe('positive');
    expect(score.brandWithCitation).toBe(true);
    expect(score.competitorsMentioned).toContain('Peak Dental');
    expect(score.workbookScore).toBe(5);
    expect(score.confidence).toBeGreaterThan(0.7);
  });

  it('computes the composite visibility score', () => {
    const [query] = renderVisibilityQuestions(profile, CORE_QUERY_TEMPLATES.slice(0, 1));
    const run = createAuditRun(query, 'chatgpt');
    const runs = [
      {
        ...run,
        status: 'captured' as const,
        score: scoreAuditResponse('Northstar Dental is highly recommended.', profile, []),
      },
    ];

    const metrics = computeVisibilityMetrics(runs);

    expect(metrics.mentionRate).toBe(1);
    expect(metrics.visibilityScore).toBeGreaterThan(70);
    expect(metrics.grade).toMatch(/[ABC]/);
  });

  it('maps competitor dominance and missing citations into fix findings', () => {
    const [query] = renderVisibilityQuestions(profile, CORE_QUERY_TEMPLATES.slice(0, 1));
    const runs = [
      {
        ...createAuditRun(query, 'perplexity'),
        status: 'captured' as const,
        score: scoreAuditResponse('Peak Dental and Mile High Smiles are commonly recommended.', profile, []),
      },
    ];
    const metrics = computeVisibilityMetrics(runs);
    const findings = mapFindings(runs, metrics);

    expect(findings.map(finding => finding.code)).toContain('COMPETITOR_DOMINANCE');
    expect(findings.map(finding => finding.code)).toContain('NO_AUTHORITY_LINKS');
  });

  it('supports Madison MVP profiles with local overlay questions', () => {
    const auditProfile = getAuditProfileConfig('madison-mvp');
    const rendered = renderVisibilityQuestions(
      { ...profile, city: 'Madison', state: 'WI' },
      getTemplatesForAuditProfile('dental', auditProfile.id),
      { limit: auditProfile.queryLimit }
    );

    expect(auditProfile.queryLimit).toBe(15);
    expect(auditProfile.providerDefaults).toEqual(['chatgpt', 'perplexity', 'gemini']);
    expect(rendered).toHaveLength(15);
    expect(rendered.some(query => query.prompt.includes('Madison, WI'))).toBe(true);
  });

  it('builds instant intake, action plans, report drafts, and share scorecards', () => {
    const intake = buildInstantAuditIntake({
      website: 'https://northstardentalmadison.com',
      niche: 'dentist',
      city: 'Madison',
      state: 'WI',
      currentProfile: { ...profile, competitors: [] },
    });
    expect(intake.profile.brand).toContain('Northstar');
    expect(intake.profile.services?.length).toBeGreaterThan(1);
    expect(intake.suggestedCompetitors.length).toBeGreaterThan(0);

    const [query] = renderVisibilityQuestions(intake.profile, CORE_QUERY_TEMPLATES.slice(0, 1));
    const runs = [
      {
        ...createAuditRun(query, 'chatgpt'),
        status: 'captured' as const,
        response: {
          rawText: 'Peak Dental and Mile High Smiles are often recommended around Madison.',
          rawJson: {},
          citations: [],
          modelId: 'fixture',
          ranAt: new Date().toISOString(),
        },
        score: scoreAuditResponse('Peak Dental and Mile High Smiles are often recommended around Madison.', intake.profile, []),
      },
    ];
    const metrics = computeVisibilityMetrics(runs);
    const findings = mapFindings(runs, metrics);
    const actions = buildActionPlan(findings);
    const report = buildReportDraft(intake.profile, metrics, findings, runs, actions);
    const share = createShareableLeadScorecard(intake.profile, metrics, findings);

    expect(actions[0]?.estimatedPrice).toBeGreaterThan(0);
    expect(report.clientEmail).toContain('Subject:');
    expect(share.callToAction).toContain('15-minute');
  });

  it('extracts competitor candidates and computes re-audit deltas', () => {
    const [query] = renderVisibilityQuestions(profile, CORE_QUERY_TEMPLATES.slice(0, 1));
    const run = {
      ...createAuditRun(query, 'perplexity'),
      status: 'captured' as const,
      response: {
        rawText: 'Prairie Smile Studio and Capital Family Dental are frequently recommended.',
        rawJson: {},
        citations: [],
        modelId: 'fixture',
        ranAt: new Date().toISOString(),
      },
      score: scoreAuditResponse('Northstar Dental is recommended with strong reviews.', profile, []),
    };
    const candidates = extractCompetitorCandidatesFromRuns([run], profile);
    const current = computeVisibilityMetrics([run]);
    const prior = { ...current, visibilityScore: current.visibilityScore - 10, mentionRate: 0, citationRate: 0, workbookAverage: 1 };
    const delta = computeVisibilityDelta(current, prior);

    expect(candidates).toContain('Prairie Smile Studio');
    expect(delta?.visibilityScoreDelta).toBe(10);
    expect(delta?.summary).toContain('up');
  });
});
