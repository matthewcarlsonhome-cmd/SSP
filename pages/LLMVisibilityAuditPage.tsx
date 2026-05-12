import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Globe,
  Link2,
  Loader2,
  Mail,
  PenLine,
  Play,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Target,
  Trash2,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { useToast } from '../hooks/useToast';
import { getApiKey, hasStoredKey } from '../lib/apiKeyStorage';
import {
  AUDIT_PROFILES,
  DEFAULT_AUDIT_CAVEAT,
  buildActionPlan,
  buildCsvExport,
  buildInstantAuditIntake,
  buildReportDraft,
  buildRunEvidence,
  computeVisibilityMetrics,
  computeVisibilityDelta,
  createAuditRun,
  createShareableLeadScorecard,
  decodeShareableLeadScorecard,
  encodeShareableLeadScorecard,
  extractCompetitorCandidatesFromRuns,
  findBestIndustryPack,
  getAuditProfileConfig,
  getTemplatesForAuditProfile,
  INDUSTRY_QUESTION_PACKS,
  loadVisibilityAudit,
  mapFindings,
  PROVIDER_LABELS,
  renderVisibilityQuestions,
  runVisibilityPrompt,
  saveVisibilityAudit,
  scoreAuditResponse,
  summarizeQueryPerformance,
  topCompetitorMentions,
  type AuditActionPlanItem,
  type AuditBusinessProfile,
  type AuditProfileId,
  type AuditQaStatus,
  type AuditReportDraft,
  type Citation,
  type RenderedVisibilityQuery,
  type ShareableLeadScorecard,
  type VisibilityAuditRun,
  type VisibilityMetrics,
  type VisibilityProviderId,
} from '../lib/llmVisibilityAudit';

const DEFAULT_PROFILE: AuditBusinessProfile = {
  brand: 'Madison Home Services',
  website: 'https://example.com',
  niche: 'HVAC contractor',
  city: 'Madison',
  state: 'WI',
  country: 'US',
  aliases: ['Madison HVAC'],
  competitors: ['Madison HVAC leaders', 'Top-rated HVAC contractor near Madison'],
  services: ['AC repair', 'furnace replacement', 'heat pumps', 'maintenance plans'],
  serviceRadiusMiles: 25,
  schemaStatus: 'unknown',
  gbpSignal: 'unknown',
  reviewSignal: 'unknown',
  intakeNotes: [],
};

const DEFAULT_PROVIDERS: VisibilityProviderId[] = ['chatgpt', 'claude', 'gemini', 'perplexity'];

const PROVIDER_ACCENTS: Record<VisibilityProviderId, string> = {
  chatgpt: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  claude: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  gemini: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  perplexity: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
};

function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatSignedPercent(value: number): string {
  const percent = Math.round(value * 100);
  return `${percent >= 0 ? '+' : ''}${percent}%`;
}

function formatSignedNumber(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function downloadTextFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const LLMVisibilityAuditPage: React.FC = () => {
  const { addToast } = useToast();
  const [profile, setProfile] = useState<AuditBusinessProfile>(DEFAULT_PROFILE);
  const [packId, setPackId] = useState(findBestIndustryPack(DEFAULT_PROFILE.niche).id);
  const [auditProfileId, setAuditProfileId] = useState<AuditProfileId>('madison-mvp');
  const [useFullPack, setUseFullPack] = useState(false);
  const [jobToBeDone, setJobToBeDone] = useState('emergency service or a high-value project');
  const [selectedProviders, setSelectedProviders] = useState<VisibilityProviderId[]>(getAuditProfileConfig('madison-mvp').providerDefaults);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [runs, setRuns] = useState<VisibilityAuditRun[]>([]);
  const [priorMetrics, setPriorMetrics] = useState<VisibilityMetrics | undefined>();
  const [isRunning, setIsRunning] = useState(false);
  const [activeRunLabel, setActiveRunLabel] = useState('');
  const [intakeUrl, setIntakeUrl] = useState(DEFAULT_PROFILE.website || '');
  const [aliasText, setAliasText] = useState(DEFAULT_PROFILE.aliases.join('\n'));
  const [competitorText, setCompetitorText] = useState(DEFAULT_PROFILE.competitors.join('\n'));
  const [servicesText, setServicesText] = useState((DEFAULT_PROFILE.services || []).join('\n'));
  const [competitorSuggestions, setCompetitorSuggestions] = useState<string[]>([]);
  const [manualQueryId, setManualQueryId] = useState('');
  const [manualProvider, setManualProvider] = useState<VisibilityProviderId>('chatgpt');
  const [manualText, setManualText] = useState('');
  const [manualCitationText, setManualCitationText] = useState('');
  const [manualScreenshotText, setManualScreenshotText] = useState('');
  const [manualEvidenceNote, setManualEvidenceNote] = useState('Google AI Overview / Gemini browser capture');
  const [manualScorer, setManualScorer] = useState('Operator');
  const [manualQaStatus, setManualQaStatus] = useState<AuditQaStatus>('needs_review');
  const [manualCaveatText, setManualCaveatText] = useState(DEFAULT_AUDIT_CAVEAT);
  const [shareUrl, setShareUrl] = useState('');
  const [sharedScorecard, setSharedScorecard] = useState<ShareableLeadScorecard | null>(null);
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', business: '' });
  const [keyStatus, setKeyStatus] = useState<Record<VisibilityProviderId, boolean>>({
    chatgpt: hasStoredKey('chatgpt'),
    claude: hasStoredKey('claude'),
    gemini: hasStoredKey('gemini'),
    perplexity: hasStoredKey('perplexity'),
  });

  useEffect(() => {
    const shareParam = new URLSearchParams(window.location.hash.split('?')[1] || '').get('scorecard');
    if (shareParam) {
      setSharedScorecard(decodeShareableLeadScorecard(shareParam));
    }

    const stored = loadVisibilityAudit();
    if (!stored) return;
    setProfile(stored.profile);
    setIntakeUrl(stored.profile.website || '');
    setAliasText(stored.profile.aliases.join('\n'));
    setCompetitorText(stored.profile.competitors.join('\n'));
    setServicesText((stored.profile.services || []).join('\n'));
    setPackId(stored.packId);
    setAuditProfileId(stored.auditProfileId || 'madison-mvp');
    setSelectedProviders(stored.providers);
    setRuns(stored.runs || []);
    setPriorMetrics(stored.priorMetrics);
  }, []);

  useEffect(() => {
    setKeyStatus({
      chatgpt: hasStoredKey('chatgpt'),
      claude: hasStoredKey('claude'),
      gemini: hasStoredKey('gemini'),
      perplexity: hasStoredKey('perplexity'),
    });
  }, []);

  const auditProfile = useMemo(() => getAuditProfileConfig(auditProfileId), [auditProfileId]);
  const templates = useMemo(() => getTemplatesForAuditProfile(packId, auditProfileId), [auditProfileId, packId]);

  const renderedQuestions = useMemo(() => {
    return renderVisibilityQuestions(profile, templates, {
      limit: useFullPack ? undefined : auditProfile.queryLimit,
      jobToBeDone,
    });
  }, [auditProfile.queryLimit, jobToBeDone, profile, templates, useFullPack]);

  const renderedQuestionKey = renderedQuestions.map(question => question.id).join('|');

  useEffect(() => {
    const ids = renderedQuestions.map(question => question.id);
    setSelectedQuestionIds(previous => {
      const stillValid = previous.filter(id => ids.includes(id));
      return stillValid.length ? stillValid : ids;
    });
    if (!manualQueryId && ids[0]) setManualQueryId(ids[0]);
  }, [manualQueryId, renderedQuestionKey, renderedQuestions]);

  const selectedQuestions = useMemo(
    () => renderedQuestions.filter(question => selectedQuestionIds.includes(question.id)),
    [renderedQuestions, selectedQuestionIds]
  );

  const metrics = useMemo(() => computeVisibilityMetrics(runs), [runs]);
  const findings = useMemo(() => mapFindings(runs, metrics), [metrics, runs]);
  const actionPlan = useMemo(() => buildActionPlan(findings), [findings]);
  const reportDraft = useMemo(() => buildReportDraft(profile, metrics, findings, runs, actionPlan), [actionPlan, findings, metrics, profile, runs]);
  const competitorMentionCounts = useMemo(() => topCompetitorMentions(runs), [runs]);
  const reAuditDelta = useMemo(() => computeVisibilityDelta(metrics, priorMetrics), [metrics, priorMetrics]);
  const queryPerformance = useMemo(() => summarizeQueryPerformance(runs), [runs]);
  const winningQueries = queryPerformance.slice(0, 3);
  const losingQueries = [...queryPerformance].reverse().slice(0, 3);

  const runCount = selectedQuestions.length * selectedProviders.length;

  const updateProfile = (updates: Partial<AuditBusinessProfile>) => {
    setProfile(current => ({ ...current, ...updates }));
  };

  const toggleProvider = (provider: VisibilityProviderId) => {
    setSelectedProviders(current =>
      current.includes(provider)
        ? current.filter(item => item !== provider)
        : [...current, provider]
    );
  };

  const toggleQuestion = (question: RenderedVisibilityQuery) => {
    setSelectedQuestionIds(current =>
      current.includes(question.id)
        ? current.filter(id => id !== question.id)
        : [...current, question.id]
    );
  };

  const applyAuditProfile = (nextProfileId: AuditProfileId) => {
    const nextProfile = getAuditProfileConfig(nextProfileId);
    setAuditProfileId(nextProfileId);
    setSelectedProviders(nextProfile.providerDefaults);
    setUseFullPack(false);
    addToast(`${nextProfile.label} profile applied`, 'success');
  };

  const runInstantIntake = () => {
    const intake = buildInstantAuditIntake({
      website: intakeUrl,
      niche: profile.niche,
      city: profile.city,
      state: profile.state,
      currentProfile: profile,
    });
    setProfile(intake.profile);
    setAliasText(intake.profile.aliases.join('\n'));
    setCompetitorText(intake.profile.competitors.join('\n'));
    setServicesText((intake.profile.services || []).join('\n'));
    setPackId(findBestIndustryPack(intake.profile.niche).id);
    setCompetitorSuggestions(intake.suggestedCompetitors);
    addToast(`Instant intake drafted ${intake.profile.brand} with ${intake.suggestedCompetitors.length} competitor suggestions`, 'success');
  };

  const addCompetitor = (name: string) => {
    if (!name.trim()) return;
    const nextCompetitors = Array.from(new Set([...profile.competitors, name.trim()]));
    updateProfile({ competitors: nextCompetitors });
    setCompetitorText(nextCompetitors.join('\n'));
    setCompetitorSuggestions(current => current.filter(item => item !== name));
  };

  const addCandidatesFromRuns = () => {
    const candidates = extractCompetitorCandidatesFromRuns(runs, profile).filter(
      candidate => !profile.competitors.some(existing => existing.toLowerCase() === candidate.toLowerCase())
    );
    setCompetitorSuggestions(candidates);
    addToast(candidates.length ? 'Competitor candidates extracted from captured answers' : 'No new competitor candidates found', candidates.length ? 'success' : 'info');
  };

  const updateRunEvidence = (runId: string, updates: Partial<VisibilityAuditRun>) => {
    const nextRuns = runs.map(run => (run.id === runId ? { ...run, ...updates } : run));
    setRuns(nextRuns);
    persistAudit(nextRuns);
  };

  const setCurrentAsPriorBaseline = () => {
    setPriorMetrics(metrics);
    persistAudit(runs, metrics);
    addToast('Current scorecard saved as prior-cycle baseline', 'success');
  };

  const generateShareLink = async () => {
    const scorecard = createShareableLeadScorecard(profile, metrics, findings);
    const encoded = encodeShareableLeadScorecard(scorecard);
    const url = `${window.location.origin}${window.location.pathname}#/llm-visibility-audit?scorecard=${encoded}`;
    setShareUrl(url);
    await navigator.clipboard.writeText(url);
    addToast('Shareable lead scorecard link copied', 'success');
  };

  const submitShareLead = () => {
    const leads = JSON.parse(localStorage.getItem('skillengine_llm_visibility_leads') || '[]');
    localStorage.setItem(
      'skillengine_llm_visibility_leads',
      JSON.stringify([...leads, { ...leadForm, scorecard: sharedScorecard, capturedAt: new Date().toISOString() }])
    );
    setLeadForm({ name: '', email: '', phone: '', business: '' });
    addToast('Lead captured for follow-up', 'success');
  };

  const refreshKeyStatus = () => {
    setKeyStatus({
      chatgpt: hasStoredKey('chatgpt'),
      claude: hasStoredKey('claude'),
      gemini: hasStoredKey('gemini'),
      perplexity: hasStoredKey('perplexity'),
    });
    addToast('API key status refreshed', 'success');
  };

  const getProviderKeys = async (): Promise<Record<VisibilityProviderId, string>> => ({
    chatgpt: await getApiKey('chatgpt'),
    claude: await getApiKey('claude'),
    gemini: await getApiKey('gemini'),
    perplexity: await getApiKey('perplexity'),
  });

  const persistAudit = (nextRuns: VisibilityAuditRun[] = runs, nextPriorMetrics = priorMetrics) => {
    saveVisibilityAudit({
      profile,
      packId,
      auditProfileId,
      providers: selectedProviders,
      runs: nextRuns,
      priorMetrics: nextPriorMetrics,
      reportDraft,
      actionPlan,
      savedAt: new Date().toISOString(),
    });
  };

  const replaceRun = (
    allRuns: VisibilityAuditRun[],
    updatedRun: VisibilityAuditRun,
    persist = true
  ): VisibilityAuditRun[] => {
    const nextRuns = allRuns.map(run => (run.id === updatedRun.id ? updatedRun : run));
    setRuns(nextRuns);
    if (persist) persistAudit(nextRuns);
    return nextRuns;
  };

  const runBatch = async () => {
    if (!selectedQuestions.length) {
      addToast('Select at least one question before running an audit', 'error');
      return;
    }
    if (!selectedProviders.length) {
      addToast('Select at least one LLM platform before running an audit', 'error');
      return;
    }

    setIsRunning(true);
    const keys = await getProviderKeys();
    let nextRuns = selectedQuestions.flatMap(question =>
      selectedProviders.map(provider => createAuditRun(question, provider))
    );
    setRuns(nextRuns);

    try {
      for (const run of nextRuns) {
        const providerLabel = PROVIDER_LABELS[run.provider];
        setActiveRunLabel(`${providerLabel} - ${run.query.code}`);

        if (!keys[run.provider]) {
          nextRuns = replaceRun(nextRuns, {
            ...run,
            status: 'error',
            errorMessage: `${providerLabel} API key is not configured in Settings.`,
            completedAt: new Date().toISOString(),
          });
          continue;
        }

        const runningRun: VisibilityAuditRun = {
          ...run,
          status: 'running',
          startedAt: new Date().toISOString(),
        };
        nextRuns = replaceRun(nextRuns, runningRun, false);

        try {
          const response = await runVisibilityPrompt({
            provider: run.provider,
            prompt: run.query.prompt,
            apiKey: keys[run.provider],
            business: profile,
          });
          const score = scoreAuditResponse(response.rawText, profile, response.citations);
          const qaStatus: AuditQaStatus = score.workbookScore <= 1 ? 'high_impact_miss' : score.confidence < 0.75 ? 'needs_review' : 'unreviewed';
          nextRuns = replaceRun(nextRuns, {
            ...runningRun,
            status: 'captured',
            qaStatus,
            scorer: 'Auto-score',
            caveatText: DEFAULT_AUDIT_CAVEAT,
            response,
            score,
            completedAt: new Date().toISOString(),
          });
        } catch (error) {
          nextRuns = replaceRun(nextRuns, {
            ...runningRun,
            status: 'error',
            errorMessage: error instanceof Error ? error.message : String(error),
            completedAt: new Date().toISOString(),
          });
        }
      }

      addToast('LLM visibility audit batch complete', 'success');
    } finally {
      setIsRunning(false);
      setActiveRunLabel('');
    }
  };

  const saveManualCapture = () => {
    const query = renderedQuestions.find(item => item.id === manualQueryId);
    if (!query || !manualText.trim()) {
      addToast('Choose a question and paste a response first', 'error');
      return;
    }

    const citations: Citation[] = parseList(manualCitationText).map(url => ({ url }));
    const screenshotUrls = parseList(manualScreenshotText);
    const response = {
      rawText: manualText,
      rawJson: { manual: true, evidenceNote: manualEvidenceNote },
      citations,
      modelId: `${manualProvider}-manual`,
      ranAt: new Date().toISOString(),
    };
    const manualRun: VisibilityAuditRun = {
      id: `manual-${manualProvider}-${query.id}-${Date.now()}`,
      query,
      provider: manualProvider,
      status: 'manual',
      captureMode: 'manual',
      qaStatus: manualQaStatus,
      scorer: manualScorer,
      screenshotUrls,
      evidenceNote: manualEvidenceNote,
      caveatText: manualCaveatText,
      response,
      score: scoreAuditResponse(manualText, profile, citations),
      completedAt: new Date().toISOString(),
    };
    const nextRuns = [...runs.filter(run => !(run.provider === manualProvider && run.query.id === query.id)), manualRun];
    setRuns(nextRuns);
    persistAudit(nextRuns);
    setManualText('');
    setManualCitationText('');
    setManualScreenshotText('');
    addToast('Manual capture scored and saved', 'success');
  };

  const clearResults = () => {
    if (!runs.length || confirm('Clear current LLM Visibility Audit results?')) {
      setRuns([]);
      persistAudit([]);
    }
  };

  const copyScorecard = async () => {
    const summary = [
      `${profile.brand} LLM Visibility Score: ${metrics.visibilityScore} (${metrics.grade})`,
      `Workbook score: ${metrics.workbookAverage}/5`,
      `Appeared in ${metrics.brandMentionCount} of ${metrics.capturedCount} captured AI recommendation moments.`,
      `Mention rate: ${formatPercent(metrics.mentionRate)}`,
      `Citation rate: ${formatPercent(metrics.citationRate)}`,
      `Competitor dominance: ${formatPercent(metrics.competitorDominanceRatio)}`,
      reAuditDelta ? reAuditDelta.summary : '',
      '',
      'Top findings:',
      ...findings.slice(0, 5).map(finding => `- ${finding.title}: ${finding.recommendedFix.title}`),
      '',
      'Top action plan:',
      ...actionPlan.slice(0, 3).map(action => `- ${action.serviceLine}: ${action.recommendedAction} (est. $${action.estimatedPrice})`),
      '',
      DEFAULT_AUDIT_CAVEAT,
    ].filter(Boolean).join('\n');
    await navigator.clipboard.writeText(summary);
    addToast('Scorecard summary copied', 'success');
  };

  const exportCsv = () => {
    downloadTextFile(
      `${profile.brand || 'llm-visibility-audit'}-runs.csv`.replace(/\s+/g, '-').toLowerCase(),
      buildCsvExport(runs),
      'text/csv'
    );
  };

  const exportJson = () => {
    downloadTextFile(
      `${profile.brand || 'llm-visibility-audit'}-scorecard.json`.replace(/\s+/g, '-').toLowerCase(),
      JSON.stringify({ profile, auditProfile, metrics, priorMetrics, reAuditDelta, findings, actionPlan, reportDraft, runs }, null, 2),
      'application/json'
    );
  };

  if (sharedScorecard) {
    return (
      <ShareableScorecardView
        scorecard={sharedScorecard}
        leadForm={leadForm}
        setLeadForm={setLeadForm}
        submitShareLead={submitShareLead}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-muted/20">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <Search className="h-3.5 w-3.5 text-primary" />
                LLM Visibility Audit
              </div>
              <h1 className="text-3xl font-bold tracking-tight">AI answer visibility for local businesses</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                A 30-minute operator workflow for any local website: instant intake, buyer-intent prompts, evidence capture,
                workbook scoring, report writing, action plan pricing, and shareable lead scorecards.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/settings">
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  API Keys
                </Button>
              </Link>
              <Button variant="outline" onClick={refreshKeyStatus} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh Keys
              </Button>
              <Button variant="outline" onClick={generateShareLink} disabled={!runs.length} className="gap-2">
                <Link2 className="h-4 w-4" />
                Share
              </Button>
              <Button onClick={runBatch} disabled={isRunning || runCount === 0} className="gap-2">
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run Batch
              </Button>
            </div>
          </div>
          {isRunning && (
            <div className="mt-5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
              Running {activeRunLabel || 'audit batch'}...
            </div>
          )}
          {shareUrl && (
            <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              Shareable scorecard link copied. This link contains the snapshot payload and includes a lead-capture form.
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 xl:grid-cols-[380px_1fr]">
        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Instant Audit Intake</h2>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Website URL
                <Input className="mt-1" value={intakeUrl} onChange={event => setIntakeUrl(event.target.value)} />
              </label>
              <Button onClick={runInstantIntake} className="w-full gap-2">
                <Wand2 className="h-4 w-4" />
                Auto-fill Audit
              </Button>
              <p className="text-xs text-muted-foreground">
                Drafts the profile, service list, schema/GBP/review placeholders, and competitor suggestions for a fast operator review.
              </p>
              {competitorSuggestions.length ? (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Approve competitors</p>
                  {competitorSuggestions.slice(0, 6).map(name => (
                    <button
                      key={name}
                      onClick={() => addCompetitor(name)}
                      className="block w-full rounded-md bg-background px-3 py-2 text-left text-xs hover:bg-muted"
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Business Profile</h2>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                Business name
                <Input className="mt-1" value={profile.brand} onChange={event => updateProfile({ brand: event.target.value })} />
              </label>
              <label className="block text-sm font-medium">
                Website
                <Input className="mt-1" value={profile.website || ''} onChange={event => updateProfile({ website: event.target.value })} />
              </label>
              <label className="block text-sm font-medium">
                Niche
                <Input className="mt-1" value={profile.niche} onChange={event => updateProfile({ niche: event.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  City
                  <Input className="mt-1" value={profile.city} onChange={event => updateProfile({ city: event.target.value })} />
                </label>
                <label className="block text-sm font-medium">
                  State
                  <Input className="mt-1" value={profile.state} onChange={event => updateProfile({ state: event.target.value })} />
                </label>
              </div>
              <label className="block text-sm font-medium">
                Brand aliases
                <Textarea
                  className="mt-1 min-h-[70px]"
                  value={aliasText}
                  onChange={event => {
                    setAliasText(event.target.value);
                    updateProfile({ aliases: parseList(event.target.value) });
                  }}
                  onBlur={() => {
                    const nextAliases = parseList(aliasText);
                    setAliasText(nextAliases.join('\n'));
                    updateProfile({ aliases: nextAliases });
                  }}
                />
              </label>
              <label className="block text-sm font-medium">
                Competitors
                <Textarea
                  className="mt-1 min-h-[92px]"
                  value={competitorText}
                  onChange={event => {
                    setCompetitorText(event.target.value);
                    updateProfile({ competitors: parseList(event.target.value) });
                  }}
                  onBlur={() => {
                    const nextCompetitors = parseList(competitorText);
                    setCompetitorText(nextCompetitors.join('\n'));
                    updateProfile({ competitors: nextCompetitors });
                  }}
                />
              </label>
              <label className="block text-sm font-medium">
                Services
                <Textarea
                  className="mt-1 min-h-[74px]"
                  value={servicesText}
                  onChange={event => {
                    setServicesText(event.target.value);
                    updateProfile({ services: parseList(event.target.value) });
                  }}
                  onBlur={() => {
                    const nextServices = parseList(servicesText);
                    setServicesText(nextServices.join('\n'));
                    updateProfile({ services: nextServices });
                  }}
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="block text-xs font-medium">
                  Schema
                  <Select className="mt-1" value={profile.schemaStatus || 'unknown'} onChange={event => updateProfile({ schemaStatus: event.target.value as AuditBusinessProfile['schemaStatus'] })}>
                    <option value="unknown">Unknown</option>
                    <option value="found">Found</option>
                    <option value="thin">Thin</option>
                    <option value="missing">Missing</option>
                    <option value="blocked">Blocked</option>
                  </Select>
                </label>
                <label className="block text-xs font-medium">
                  GBP
                  <Select className="mt-1" value={profile.gbpSignal || 'unknown'} onChange={event => updateProfile({ gbpSignal: event.target.value as AuditBusinessProfile['gbpSignal'] })}>
                    <option value="unknown">Unknown</option>
                    <option value="strong">Strong</option>
                    <option value="average">Average</option>
                    <option value="weak">Weak</option>
                  </Select>
                </label>
                <label className="block text-xs font-medium">
                  Reviews
                  <Select className="mt-1" value={profile.reviewSignal || 'unknown'} onChange={event => updateProfile({ reviewSignal: event.target.value as AuditBusinessProfile['reviewSignal'] })}>
                    <option value="unknown">Unknown</option>
                    <option value="strong">Strong</option>
                    <option value="average">Average</option>
                    <option value="weak">Weak</option>
                  </Select>
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Audit Profile</h2>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                Industry pack
                <Select className="mt-1" value={packId} onChange={event => setPackId(event.target.value)}>
                  {INDUSTRY_QUESTION_PACKS.map(pack => (
                    <option key={pack.id} value={pack.id}>
                      {pack.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block text-sm font-medium">
                Audit profile
                <Select className="mt-1" value={auditProfileId} onChange={event => applyAuditProfile(event.target.value as AuditProfileId)}>
                  {AUDIT_PROFILES.map(profileConfig => (
                    <option key={profileConfig.id} value={profileConfig.id}>
                      {profileConfig.label} - {profileConfig.queryLimit} queries
                    </option>
                  ))}
                </Select>
              </label>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{auditProfile.description}</p>
                <p className="mt-1">{auditProfile.delivery}</p>
                <p className="mt-1">{auditProfile.manualCaptureGuidance}</p>
              </div>
              <label className="block text-sm font-medium">
                Common job-to-be-done
                <Input className="mt-1" value={jobToBeDone} onChange={event => setJobToBeDone(event.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useFullPack}
                  onChange={event => setUseFullPack(event.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Override profile limit and use every rendered question
              </label>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Selected questions</span>
                  <span className="font-semibold">{selectedQuestions.length}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Selected platforms</span>
                  <span className="font-semibold">{selectedProviders.length}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Batch runs</span>
                  <span className="font-semibold">{runCount}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Platforms</h2>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {DEFAULT_PROVIDERS.map(provider => {
                const selected = selectedProviders.includes(provider);
                return (
                  <button
                    key={provider}
                    onClick={() => toggleProvider(provider)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                      selected ? PROVIDER_ACCENTS[provider] : 'bg-background hover:bg-muted'
                    }`}
                  >
                    <span className="font-medium">{PROVIDER_LABELS[provider]}</span>
                    <span className="flex items-center gap-2 text-xs">
                      {keyStatus[provider] ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Key
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Missing
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <main className="space-y-6">
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <MetricCard label="Visibility" value={`${metrics.visibilityScore}`} helper={`Grade ${metrics.grade}`} icon={<BarChart3 className="h-4 w-4" />} />
            <MetricCard label="Workbook" value={`${metrics.workbookAverage}/5`} helper={`${metrics.dominantCount} dominant answers`} icon={<FileText className="h-4 w-4" />} />
            <MetricCard label="Mentions" value={formatPercent(metrics.mentionRate)} helper={`${metrics.brandMentionCount}/${metrics.capturedCount} captured`} icon={<Target className="h-4 w-4" />} />
            <MetricCard label="Citations" value={formatPercent(metrics.citationRate)} helper={`${metrics.citationCount} brand citations`} icon={<FileText className="h-4 w-4" />} />
            <MetricCard label="Competitors" value={formatPercent(metrics.competitorDominanceRatio)} helper="Dominance ratio" icon={<Zap className="h-4 w-4" />} />
            <MetricCard label="QA" value={`${metrics.approvedCount}/${metrics.capturedCount}`} helper={`${metrics.needsReviewCount + metrics.highImpactMissCount} need review`} icon={<ShieldCheck className="h-4 w-4" />} />
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">30-Minute Operator Workflow</h2>
                <p className="text-sm text-muted-foreground">
                  Intake, approve competitors, run the selected profile, paste manual AIO/Gemini evidence, approve QA, then send the report draft.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <WorkflowPill label="0-3 min" value="Intake" done={Boolean(profile.website && profile.brand)} />
                <WorkflowPill label="3-6 min" value="Competitors" done={profile.competitors.length > 0} />
                <WorkflowPill label="6-22 min" value="Capture" done={metrics.capturedCount > 0} />
                <WorkflowPill label="22-30 min" value="Report" done={Boolean(reportDraft.executiveSummary && metrics.capturedCount)} />
              </div>
            </div>
            {reAuditDelta && (
              <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-300">
                {reAuditDelta.summary} Mention rate delta: {formatSignedPercent(reAuditDelta.mentionRateDelta)}. Citation delta: {formatSignedPercent(reAuditDelta.citationRateDelta)}.
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-card">
            <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Report Writer</h2>
                <p className="text-sm text-muted-foreground">
                  Drafts the client narrative, competitor story, fix priorities, caveats, and sales follow-up from the approved evidence.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(reportToClipboardText(reportDraft)).then(() => addToast('Report draft copied', 'success'))}
                disabled={!metrics.capturedCount}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Report
              </Button>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <ReportBlock title="Executive Summary" body={reportDraft.executiveSummary} icon={<FileText className="h-4 w-4" />} />
              <ReportBlock title="What AI Says" body={reportDraft.aiVisibilityNarrative} icon={<Search className="h-4 w-4" />} />
              <ReportBlock title="Who Beats You" body={reportDraft.competitorStory} icon={<Users className="h-4 w-4" />} />
              <ReportBlock title="Why It Happens" body={reportDraft.whyItHappens} icon={<AlertCircle className="h-4 w-4" />} />
              <ReportBlock title="What To Fix Next" body={reportDraft.whatToFixNext} icon={<PenLine className="h-4 w-4" />} />
              <ReportBlock title="Client Email" body={reportDraft.clientEmail} icon={<Mail className="h-4 w-4" />} />
            </div>
          </section>

          <section className="rounded-xl border bg-card">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold">Action Plan Builder</h2>
              <p className="text-sm text-muted-foreground">
                Converts findings into scoped service packages with owners, hours, due dates, and price anchors.
              </p>
            </div>
            <div className="grid gap-3 p-5">
              {actionPlan.length ? (
                actionPlan.map(action => (
                  <ActionPlanCard key={action.id} action={action} />
                ))
              ) : (
                <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                  Action items appear after findings are generated.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card">
            <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Question Batch</h2>
                <p className="text-sm text-muted-foreground">
                  All visible questions are rendered with the current profile and selected by default.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedQuestionIds(renderedQuestions.map(question => question.id))}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedQuestionIds([])}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="max-h-[420px] divide-y overflow-y-auto">
              {renderedQuestions.map(question => (
                <label key={question.id} className="flex gap-3 p-4 hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={selectedQuestionIds.includes(question.id)}
                    onChange={() => toggleQuestion(question)}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{question.code}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{question.category}</span>
                      {question.competitor && (
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                          {question.competitor}
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{question.prompt}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Manual Capture</h2>
                <p className="text-sm text-muted-foreground">
                  Paste Google AI Overview or any browser-only answer into the same scoring model.
                </p>
              </div>
              <Button variant="outline" onClick={saveManualCapture} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Score Paste
              </Button>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <label className="block text-sm font-medium">
                Question
                <Select className="mt-1" value={manualQueryId} onChange={event => setManualQueryId(event.target.value)}>
                  {renderedQuestions.map(question => (
                    <option key={question.id} value={question.id}>
                      {question.code} - {question.prompt.slice(0, 80)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block text-sm font-medium">
                Platform
                <Select className="mt-1" value={manualProvider} onChange={event => setManualProvider(event.target.value as VisibilityProviderId)}>
                  {DEFAULT_PROVIDERS.map(provider => (
                    <option key={provider} value={provider}>
                      {PROVIDER_LABELS[provider]}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block text-sm font-medium">
                Citation URLs
                <Input className="mt-1" value={manualCitationText} onChange={event => setManualCitationText(event.target.value)} />
              </label>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-4">
              <label className="block text-sm font-medium">
                Screenshot / evidence URLs
                <Input className="mt-1" value={manualScreenshotText} onChange={event => setManualScreenshotText(event.target.value)} />
              </label>
              <label className="block text-sm font-medium">
                Scorer
                <Input className="mt-1" value={manualScorer} onChange={event => setManualScorer(event.target.value)} />
              </label>
              <label className="block text-sm font-medium">
                QA status
                <Select className="mt-1" value={manualQaStatus} onChange={event => setManualQaStatus(event.target.value as AuditQaStatus)}>
                  <option value="unreviewed">Unreviewed</option>
                  <option value="needs_review">Needs review</option>
                  <option value="approved">Approved</option>
                  <option value="high_impact_miss">High-impact miss</option>
                  <option value="excluded">Excluded</option>
                </Select>
              </label>
              <label className="block text-sm font-medium">
                Evidence note
                <Input className="mt-1" value={manualEvidenceNote} onChange={event => setManualEvidenceNote(event.target.value)} />
              </label>
            </div>
            <label className="mt-4 block text-sm font-medium">
              Caveat text
              <Input className="mt-1" value={manualCaveatText} onChange={event => setManualCaveatText(event.target.value)} />
            </label>
            <Textarea
              className="mt-4 min-h-[130px]"
              value={manualText}
              onChange={event => setManualText(event.target.value)}
              placeholder="Paste the raw LLM answer here..."
            />
          </section>

          <section className="rounded-xl border bg-card">
            <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Scorecard</h2>
                <p className="text-sm text-muted-foreground">
                  Client-ready metrics and evidence update as captures complete.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copyScorecard} disabled={!runs.length} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={!runs.length} className="gap-2">
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportJson} disabled={!runs.length} className="gap-2">
                  <Download className="h-4 w-4" />
                  JSON
                </Button>
                <Button variant="outline" size="sm" onClick={setCurrentAsPriorBaseline} disabled={!runs.length} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Set Baseline
                </Button>
                <Button variant="destructive" size="sm" onClick={clearResults} disabled={!runs.length} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <div className="rounded-lg border bg-muted/20 p-4">
                <h3 className="mb-3 font-semibold">Winning Queries</h3>
                <QueryPerformanceList items={winningQueries} emptyText="Run an audit to identify winning prompts." />
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <h3 className="mb-3 font-semibold">Losing Queries</h3>
                <QueryPerformanceList items={losingQueries} emptyText="Run an audit to identify gaps." />
              </div>
            </div>

            <div className="grid gap-5 border-t p-5 lg:grid-cols-2">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Competitor Share of Voice</h3>
                  <Button variant="outline" size="sm" onClick={addCandidatesFromRuns} className="gap-2">
                    <Users className="h-4 w-4" />
                    Extract
                  </Button>
                </div>
                {competitorMentionCounts.length ? (
                  <div className="space-y-2">
                    {competitorMentionCounts.slice(0, 6).map(item => (
                      <div key={item.name} className="flex items-center justify-between rounded-md bg-background p-3 text-sm">
                        <span>{item.name}</span>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Competitor mentions appear after scoring.</p>
                )}
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <h3 className="mb-3 font-semibold">Re-Audit Delta</h3>
                {reAuditDelta ? (
                  <div className="space-y-2 text-sm">
                    <ScoreRow label="Visibility" value={formatSignedNumber(reAuditDelta.visibilityScoreDelta)} />
                    <ScoreRow label="Mention rate" value={formatSignedPercent(reAuditDelta.mentionRateDelta)} />
                    <ScoreRow label="Citation rate" value={formatSignedPercent(reAuditDelta.citationRateDelta)} />
                    <ScoreRow label="Workbook" value={formatSignedNumber(reAuditDelta.workbookAverageDelta)} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Save a baseline, then rerun later to show before/after lift.</p>
                )}
              </div>
            </div>

            <div className="border-t p-5">
              <h3 className="mb-4 font-semibold">Findings and Fixes</h3>
              {findings.length ? (
                <div className="grid gap-3">
                  {findings.map(finding => (
                    <div key={finding.code} className="rounded-lg border p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${finding.severity === 3 ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>
                          Severity {finding.severity}
                        </span>
                        <span className="rounded bg-muted px-2 py-0.5 text-xs">{finding.code}</span>
                        <span className="text-sm font-semibold">{finding.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{finding.description}</p>
                      <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                        <p className="font-medium">{finding.recommendedFix.title}</p>
                        <p className="text-muted-foreground">
                          Effort: {finding.recommendedFix.effort} - Expected lift: {finding.recommendedFix.expectedLift}
                        </p>
                        <ol className="mt-2 list-decimal space-y-1 pl-5">
                          {finding.recommendedFix.steps.slice(0, 3).map(step => (
                            <li key={step.step}>
                              <span className="font-medium">{step.step}:</span> {step.detail}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                  Findings appear after responses have been captured and scored.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold">Run Evidence</h2>
              <p className="text-sm text-muted-foreground">
                Raw answers, citations, scoring fields, and provider errors for QA.
              </p>
            </div>
            <div className="divide-y">
              {runs.length ? (
                runs.map(run => (
                  <RunEvidenceDetails key={run.id} run={run} updateRunEvidence={updateRunEvidence} />
                ))
              ) : (
                <p className="p-5 text-sm text-muted-foreground">No runs yet. Configure the profile and run a batch.</p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; helper: string; icon: React.ReactNode }> = ({ label, value, helper, icon }) => (
  <div className="rounded-xl border bg-card p-4">
    <div className="mb-3 flex items-center justify-between text-muted-foreground">
      <span className="text-xs font-medium uppercase">{label}</span>
      {icon}
    </div>
    <p className="text-2xl font-bold">{value}</p>
    <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
  </div>
);

const WorkflowPill: React.FC<{ label: string; value: string; done: boolean }> = ({ label, value, done }) => (
  <div className={`rounded-lg border px-3 py-2 ${done ? 'border-emerald-500/30 bg-emerald-500/10' : 'bg-muted/30'}`}>
    <p className="text-muted-foreground">{label}</p>
    <p className="font-semibold">{value}</p>
  </div>
);

const ReportBlock: React.FC<{ title: string; body: string; icon: React.ReactNode }> = ({ title, body, icon }) => (
  <div className="rounded-lg border bg-muted/20 p-4">
    <div className="mb-3 flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <h3 className="font-semibold">{title}</h3>
    </div>
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{body}</p>
  </div>
);

const ActionPlanCard: React.FC<{ action: AuditActionPlanItem }> = ({ action }) => (
  <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto] md:items-center">
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{action.priority}</span>
        <span className="rounded bg-muted px-2 py-0.5 text-xs">{action.rootCauseCode}</span>
        <span className="text-sm font-semibold">{action.serviceLine}</span>
      </div>
      <p className="text-sm">{action.recommendedAction}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Owner: {action.owner} - Due in {action.dueInDays} days - Source: {action.sourceFindingTitle}
      </p>
    </div>
    <div className="rounded-md bg-muted/40 px-4 py-3 text-sm md:text-right">
      <p className="font-semibold">${action.estimatedPrice.toLocaleString()}</p>
      <p className="text-muted-foreground">{action.estimatedHours} hrs</p>
    </div>
  </div>
);

function reportToClipboardText(report: AuditReportDraft): string {
  return [
    'Executive Summary',
    report.executiveSummary,
    '',
    'What AI Says',
    report.aiVisibilityNarrative,
    '',
    'Who Beats You',
    report.competitorStory,
    '',
    'Why It Happens',
    report.whyItHappens,
    '',
    'What To Fix Next',
    report.whatToFixNext,
    '',
    'Client Email',
    report.clientEmail,
    '',
    'Caveats',
    ...report.caveats.map(caveat => `- ${caveat}`),
  ].join('\n');
}

const QueryPerformanceList: React.FC<{
  items: ReturnType<typeof summarizeQueryPerformance>;
  emptyText: string;
}> = ({ items, emptyText }) => {
  if (!items.length) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.query.id} className="rounded-md bg-background p-3 text-sm">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="font-semibold">{item.query.code}</span>
            <span className="text-muted-foreground">{formatPercent(item.mentionRate)}</span>
          </div>
          <p className="line-clamp-2 text-muted-foreground">{item.query.prompt}</p>
        </div>
      ))}
    </div>
  );
};

const RunStatusBadge: React.FC<{ run: VisibilityAuditRun }> = ({ run }) => {
  const classes: Record<VisibilityAuditRun['status'], string> = {
    pending: 'bg-muted text-muted-foreground',
    running: 'bg-blue-500/10 text-blue-600',
    captured: 'bg-green-500/10 text-green-600',
    error: 'bg-red-500/10 text-red-600',
    manual: 'bg-amber-500/10 text-amber-600',
  };
  return (
    <span className={`rounded px-2 py-1 text-xs font-semibold capitalize ${classes[run.status]}`}>
      {run.status}
    </span>
  );
};

const RunEvidenceDetails: React.FC<{
  run: VisibilityAuditRun;
  updateRunEvidence: (runId: string, updates: Partial<VisibilityAuditRun>) => void;
}> = ({ run, updateRunEvidence }) => {
  const evidence = buildRunEvidence(run);
  return (
    <details className="group p-4">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
        <span className={`rounded border px-2 py-1 text-xs font-semibold ${PROVIDER_ACCENTS[run.provider]}`}>
          {PROVIDER_LABELS[run.provider]}
        </span>
        <span className="rounded bg-muted px-2 py-1 text-xs font-semibold">{run.query.code}</span>
        <span className="min-w-0 flex-1 truncate text-sm">{run.query.prompt}</span>
        <span className="rounded bg-muted px-2 py-1 text-xs capitalize">{run.qaStatus || 'unreviewed'}</span>
        <RunStatusBadge run={run} />
      </summary>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/30 p-4">
            <div className="mb-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
              <span>Captured: {new Date(evidence.capturedAt).toLocaleString()}</span>
              <span>Mode: {run.captureMode || 'api'}</span>
              <span>Scorer: {evidence.scorer}</span>
              <span>Prompt: {evidence.exactPrompt}</span>
            </div>
            {run.errorMessage ? (
              <p className="text-sm text-red-600">{run.errorMessage}</p>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{evidence.rawResponse || 'No response yet.'}</p>
            )}
            {evidence.citations.length ? (
              <div className="mt-4 space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Citations</p>
                {evidence.citations.map(citation => (
                  <a
                    key={citation.url}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm text-primary hover:underline"
                  >
                    {citation.title || citation.url}
                  </a>
                ))}
              </div>
            ) : null}
            {evidence.screenshotUrls.length ? (
              <div className="mt-4 space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Screenshots / evidence files</p>
                {evidence.screenshotUrls.map(url => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-primary hover:underline">
                    {url}
                  </a>
                ))}
              </div>
            ) : null}
            <p className="mt-4 rounded-md border bg-background p-3 text-xs text-muted-foreground">{evidence.caveatText}</p>
          </div>
        </div>
        <div className="space-y-4 rounded-lg border p-4 text-sm">
          <div>
            <p className="mb-2 font-semibold">QA and Evidence Locker</p>
            <div className="space-y-3">
              <label className="block text-xs font-medium">
                QA status
                <Select
                  className="mt-1"
                  value={run.qaStatus || 'unreviewed'}
                  onChange={event => updateRunEvidence(run.id, { qaStatus: event.target.value as AuditQaStatus })}
                >
                  <option value="unreviewed">Unreviewed</option>
                  <option value="needs_review">Needs review</option>
                  <option value="approved">Approved</option>
                  <option value="high_impact_miss">High-impact miss</option>
                  <option value="excluded">Excluded</option>
                </Select>
              </label>
              <label className="block text-xs font-medium">
                Scorer
                <Input className="mt-1" value={run.scorer || ''} onChange={event => updateRunEvidence(run.id, { scorer: event.target.value })} />
              </label>
              <label className="block text-xs font-medium">
                Screenshot URLs
                <Textarea
                  className="mt-1 min-h-[70px]"
                  value={(run.screenshotUrls || []).join('\n')}
                  onChange={event => updateRunEvidence(run.id, { screenshotUrls: parseList(event.target.value) })}
                />
              </label>
              <label className="block text-xs font-medium">
                Evidence note
                <Textarea
                  className="mt-1 min-h-[70px]"
                  value={run.evidenceNote || ''}
                  onChange={event => updateRunEvidence(run.id, { evidenceNote: event.target.value })}
                />
              </label>
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2 font-semibold">Score</p>
            {run.score ? (
              <dl className="space-y-2">
                <ScoreRow label="Workbook" value={`${run.score.workbookScore}/5`} />
                <ScoreRow label="Confidence" value={formatPercent(run.score.confidence)} />
                <ScoreRow label="Mentioned" value={run.score.brandMentioned ? 'Yes' : 'No'} />
                <ScoreRow label="Position" value={run.score.brandPosition || 'None'} />
                <ScoreRow label="Sentiment" value={run.score.brandSentiment} />
                <ScoreRow label="Brand citation" value={run.score.brandWithCitation ? 'Yes' : 'No'} />
                <ScoreRow label="Competitors" value={run.score.competitorCount} />
                <ScoreRow label="Recency" value={run.score.recencySignal ? 'Yes' : 'No'} />
              </dl>
            ) : (
              <p className="text-muted-foreground">No score yet.</p>
            )}
          </div>
        </div>
      </div>
    </details>
  );
};

const ScoreRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="font-medium capitalize">{value}</dd>
  </div>
);

const ShareableScorecardView: React.FC<{
  scorecard: ShareableLeadScorecard;
  leadForm: { name: string; email: string; phone: string; business: string };
  setLeadForm: React.Dispatch<React.SetStateAction<{ name: string; email: string; phone: string; business: string }>>;
  submitShareLead: () => void;
}> = ({ scorecard, leadForm, setLeadForm, submitShareLead }) => (
  <div className="min-h-screen bg-background">
    <div className="border-b bg-muted/20">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          <Link2 className="h-3.5 w-3.5 text-primary" />
          AI Visibility Snapshot
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{scorecard.businessName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {scorecard.niche} in {scorecard.geo}
        </p>
      </div>
    </div>
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Visibility" value={`${scorecard.visibilityScore}`} helper={`Grade ${scorecard.grade}`} icon={<BarChart3 className="h-4 w-4" />} />
        <MetricCard label="Mentions" value={formatPercent(scorecard.mentionRate)} helper={`${scorecard.capturedCount} captured answers`} icon={<Target className="h-4 w-4" />} />
        <MetricCard label="Snapshot" value="Free" helper={new Date(scorecard.createdAt).toLocaleDateString()} icon={<CheckCircle2 className="h-4 w-4" />} />
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Top Visibility Gaps</h2>
        {scorecard.topFindings.length ? (
          <ul className="space-y-2 text-sm">
            {scorecard.topFindings.map(finding => (
              <li key={finding} className="rounded-md bg-muted/40 p-3">{finding}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">The full audit is needed to identify root causes.</p>
        )}
        <p className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">{scorecard.caveat}</p>
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Get The Full Evidence And Fix Plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">{scorecard.callToAction}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input placeholder="Name" value={leadForm.name} onChange={event => setLeadForm(current => ({ ...current, name: event.target.value }))} />
          <Input placeholder="Email" value={leadForm.email} onChange={event => setLeadForm(current => ({ ...current, email: event.target.value }))} />
          <Input placeholder="Phone" value={leadForm.phone} onChange={event => setLeadForm(current => ({ ...current, phone: event.target.value }))} />
          <Input placeholder="Business" value={leadForm.business} onChange={event => setLeadForm(current => ({ ...current, business: event.target.value }))} />
        </div>
        <Button className="mt-4 gap-2" onClick={submitShareLead}>
          <Mail className="h-4 w-4" />
          Request Review
        </Button>
      </section>
    </main>
  </div>
);

export default LLMVisibilityAuditPage;
