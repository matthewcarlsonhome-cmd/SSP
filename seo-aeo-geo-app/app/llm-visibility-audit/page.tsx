"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  ShieldCheck,
  Target,
  Trash2,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AUDIT_PROFILES,
  DEFAULT_AUDIT_CAVEAT,
  buildActionPlan,
  buildCompetitorDiscoveryPrompt,
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
  QUESTION_CATEGORY_META,
  QUESTION_CATEGORY_ORDER,
  renderVisibilityQuestions,
  runVisibilityPrompt,
  parseCompetitorDiscoveryResponse,
  sanitizeCompetitorSuggestions,
  saveVisibilityAudit,
  scoreAuditResponse,
  summarizeQueryPerformance,
  topCompetitorMentions,
  type AuditActionPlanItem,
  type AuditBusinessProfile,
  type AuditProfileId,
  type AuditQaStatus,
  type AuditReportDraft,
  type AuditReportSection,
  type Citation,
  type RenderedVisibilityQuery,
  type ShareableLeadScorecard,
  type SeoAuditSignals,
  type VisibilityAuditRun,
  type VisibilityMetrics,
  type VisibilityProviderId,
  type VisibilityQueryCategory,
} from '@/lib/llm-visibility-audit';

const DEFAULT_PROFILE: AuditBusinessProfile = {
  brand: 'Madison Home Services',
  website: 'https://example.com',
  niche: 'HVAC contractor',
  city: 'Madison',
  state: 'WI',
  country: 'US',
  aliases: ['Madison HVAC'],
  competitors: [],
  services: ['AC repair', 'furnace replacement', 'heat pumps', 'maintenance plans'],
  serviceRadiusMiles: 25,
  schemaStatus: 'unknown',
  gbpSignal: 'unknown',
  reviewSignal: 'unknown',
  seoAuditSignals: {
    technicalHealthScore: undefined,
    pagesAnalyzed: undefined,
    pagesWithSchema: undefined,
    thinContentPages: undefined,
    missingMetaCount: undefined,
    aiBotsBlocked: false,
    localLandingPages: undefined,
  },
  intakeNotes: [],
};

const DEFAULT_PROVIDERS: VisibilityProviderId[] = ['chatgpt', 'claude', 'gemini', 'perplexity'];
const PROVIDER_KEY_STORAGE = 'ssp_llm_visibility_provider_keys';
type AuditStepId = 'intake' | 'setup' | 'capture' | 'review' | 'report';

const PROVIDER_API_KEY_LABELS: Record<VisibilityProviderId, string> = {
  chatgpt: 'OpenAI API key for ChatGPT',
  claude: 'Anthropic API key for Claude',
  gemini: 'Google AI Studio key for Gemini',
  perplexity: 'Perplexity API key',
};

const AUDIT_STEPS: Array<{ id: AuditStepId; label: string; description: string }> = [
  { id: 'intake', label: 'Start', description: 'Business profile and competitors' },
  { id: 'setup', label: 'Questions', description: 'Profile, platforms, and query set' },
  { id: 'capture', label: 'Capture', description: 'Run APIs or paste browser evidence' },
  { id: 'review', label: 'Review', description: 'QA misses, errors, and scorecard' },
  { id: 'report', label: 'Send Report', description: 'Narrative, fixes, share link' },
];

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

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getQuestionCategoryMeta(category: VisibilityQueryCategory | string) {
  return QUESTION_CATEGORY_META[category as VisibilityQueryCategory] || {
    label: category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
    workbookBucket: category,
    description: 'Legacy or custom question category.',
    order: 99,
  };
}

function downloadTextFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  downloadBlob(filename, blob);
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportFilename(profile: AuditBusinessProfile, extension: string): string {
  return `${profile.brand || 'llm-visibility-audit'}-report.${extension}`.replace(/\s+/g, '-').toLowerCase();
}

const LLMVisibilityAuditPage: React.FC = () => {
  const mainContentRef = useRef<HTMLElement | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ message, type });
    window.setTimeout(() => setToastMessage(null), 2800);
  };
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
  const [isDiscoveringCompetitors, setIsDiscoveringCompetitors] = useState(false);
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
  const [activeStep, setActiveStep] = useState<AuditStepId>('intake');
  const [providerApiKeys, setProviderApiKeys] = useState<Record<VisibilityProviderId, string>>({
    chatgpt: '',
    claude: '',
    gemini: '',
    perplexity: '',
  });

  useEffect(() => {
    const shareParam = new URLSearchParams(window.location.hash.split('?')[1] || '').get('scorecard');
    if (shareParam) {
      setSharedScorecard(decodeShareableLeadScorecard(shareParam));
    }

    const stored = loadVisibilityAudit();
    if (!stored) return;
    const cleanedProfile = {
      ...stored.profile,
      aliases: stored.profile.aliases || [],
      competitors: sanitizeCompetitorSuggestions(stored.profile.competitors || [], stored.profile),
    };
    setProfile(cleanedProfile);
    setIntakeUrl(cleanedProfile.website || '');
    setAliasText(cleanedProfile.aliases.join('\n'));
    setCompetitorText(cleanedProfile.competitors.join('\n'));
    setServicesText((cleanedProfile.services || []).join('\n'));
    setPackId(stored.packId);
    const restoredAuditProfileId = stored.auditProfileId || 'madison-mvp';
    setAuditProfileId(restoredAuditProfileId);
    setSelectedProviders(
      restoredAuditProfileId === 'madison-mvp'
        ? [...DEFAULT_PROVIDERS]
        : stored.providers?.length
          ? stored.providers
          : getAuditProfileConfig(restoredAuditProfileId).providerDefaults
    );
    setRuns(stored.runs || []);
    setPriorMetrics(stored.priorMetrics);
    if (stored.runs?.length) setActiveStep('review');
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROVIDER_KEY_STORAGE);
      if (stored) setProviderApiKeys(current => ({ ...current, ...JSON.parse(stored) }));
    } catch {
      // Ignore malformed local key storage.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PROVIDER_KEY_STORAGE, JSON.stringify(providerApiKeys));
  }, [providerApiKeys]);

  const auditProfile = useMemo(() => getAuditProfileConfig(auditProfileId), [auditProfileId]);
  const industryPack = useMemo(() => INDUSTRY_QUESTION_PACKS.find(pack => pack.id === packId) || INDUSTRY_QUESTION_PACKS[0], [packId]);
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
  const questionsByCategory = useMemo(() => {
    const categories = Array.from(new Set([...QUESTION_CATEGORY_ORDER, ...renderedQuestions.map(question => question.category)]));
    return categories
      .map(category => ({
        category,
        meta: getQuestionCategoryMeta(category),
        questions: renderedQuestions.filter(question => question.category === category),
        selectedCount: renderedQuestions.filter(question => question.category === category && selectedQuestionIds.includes(question.id)).length,
      }))
      .filter(group => group.questions.length > 0)
      .sort((left, right) => left.meta.order - right.meta.order);
  }, [renderedQuestions, selectedQuestionIds]);

  const metrics = useMemo(() => computeVisibilityMetrics(runs), [runs]);
  const findings = useMemo(() => mapFindings(runs, metrics, profile), [metrics, profile, runs]);
  const actionPlan = useMemo(() => buildActionPlan(findings), [findings]);
  const reportDraft = useMemo(() => buildReportDraft(profile, metrics, findings, runs, actionPlan), [actionPlan, findings, metrics, profile, runs]);
  const competitorMentionCounts = useMemo(() => topCompetitorMentions(runs), [runs]);
  const reAuditDelta = useMemo(() => computeVisibilityDelta(metrics, priorMetrics), [metrics, priorMetrics]);
  const queryPerformance = useMemo(() => summarizeQueryPerformance(runs), [runs]);
  const winningQueries = queryPerformance.slice(0, 3);
  const losingQueries = [...queryPerformance].reverse().slice(0, 3);

  const runCount = selectedQuestions.length * selectedProviders.length;
  const errorCount = runs.filter(run => run.status === 'error').length;
  const reviewAttentionCount = metrics.needsReviewCount + metrics.highImpactMissCount + errorCount;
  const keyStatus = useMemo(
    () => ({
      chatgpt: Boolean(providerApiKeys.chatgpt.trim()),
      claude: Boolean(providerApiKeys.claude.trim()),
      gemini: Boolean(providerApiKeys.gemini.trim()),
      perplexity: Boolean(providerApiKeys.perplexity.trim()),
    }),
    [providerApiKeys]
  );
  const nextAction = useMemo(() => {
    if (!profile.brand.trim() || !profile.website?.trim()) {
      return {
        step: 'intake' as const,
        title: 'Finish intake first',
        detail: 'Add the website and business basics so prompts render correctly.',
        cta: 'Go to Start',
      };
    }
    if (!selectedQuestions.length || !selectedProviders.length) {
      return {
        step: 'setup' as const,
        title: 'Choose questions and platforms',
        detail: 'Confirm the audit profile, selected platforms, and query list.',
        cta: 'Go to Questions',
      };
    }
    if (!metrics.capturedCount) {
      return {
        step: 'capture' as const,
        title: 'Run the first capture',
        detail: `${runCount} runs are queued from the current profile. Run APIs or paste manual browser evidence.`,
        cta: 'Go to Capture',
      };
    }
    if (reviewAttentionCount > 0) {
      return {
        step: 'review' as const,
        title: 'Review exceptions',
        detail: `${reviewAttentionCount} run${reviewAttentionCount === 1 ? '' : 's'} need attention before this is client-ready.`,
        cta: 'Go to Review',
      };
    }
    return {
      step: 'report' as const,
      title: 'Draft the client handoff',
      detail: 'The scorecard is ready for a narrative, fix plan, and share link.',
      cta: 'Go to Send Report',
    };
  }, [metrics.capturedCount, profile.brand, profile.website, reviewAttentionCount, runCount, selectedProviders.length, selectedQuestions.length]);

  const activeStepMeta = AUDIT_STEPS.find(step => step.id === activeStep) || AUDIT_STEPS[0];

  const goToStep = (step: AuditStepId) => {
    setActiveStep(step);
    window.setTimeout(() => {
      mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const updateProfile = (updates: Partial<AuditBusinessProfile>) => {
    setProfile(current => ({ ...current, ...updates }));
  };

  const updateSeoSignals = (updates: Partial<SeoAuditSignals>) => {
    setProfile(current => ({
      ...current,
      seoAuditSignals: {
        ...(current.seoAuditSignals || {}),
        ...updates,
      },
    }));
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
    addToast(
      intake.suggestedCompetitors.length
        ? `Instant intake drafted ${intake.profile.brand} with ${intake.suggestedCompetitors.length} named competitor suggestions`
        : `Instant intake drafted ${intake.profile.brand}. Use Find Real Competitors to search for named local businesses.`,
      'success'
    );
  };

  const runCompetitorDiscovery = async () => {
    const providerPriority: VisibilityProviderId[] = ['perplexity', 'chatgpt', 'claude', 'gemini'];
    const provider =
      providerPriority.find(item => selectedProviders.includes(item) && providerApiKeys[item]?.trim()) ||
      providerPriority.find(item => providerApiKeys[item]?.trim());

    if (!provider) {
      addToast('Add a Perplexity, ChatGPT, Claude, or Gemini key before searching competitors', 'error');
      return;
    }

    setIsDiscoveringCompetitors(true);
    try {
      const response = await runVisibilityPrompt({
        provider,
        prompt: buildCompetitorDiscoveryPrompt(profile),
        apiKey: providerApiKeys[provider],
        business: profile,
        maxTokens: 1200,
      });
      const candidates = parseCompetitorDiscoveryResponse(response.rawText, profile).filter(
        candidate => !profile.competitors.some(existing => existing.toLowerCase() === candidate.toLowerCase())
      );
      setCompetitorSuggestions(candidates);
      addToast(
        candidates.length
          ? `${PROVIDER_LABELS[provider]} found ${candidates.length} named competitor candidates`
          : `${PROVIDER_LABELS[provider]} did not return usable named competitors`,
        candidates.length ? 'success' : 'info'
      );
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Competitor discovery failed', 'error');
    } finally {
      setIsDiscoveringCompetitors(false);
    }
  };

  const copyCompetitorDiscoveryPrompt = async () => {
    await navigator.clipboard.writeText(buildCompetitorDiscoveryPrompt(profile));
    addToast('Competitor discovery prompt copied', 'success');
  };

  const addCompetitor = (name: string) => {
    if (!name.trim()) return;
    const nextCompetitors = sanitizeCompetitorSuggestions([...profile.competitors, name.trim()], profile);
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
    addToast('API keys are stored locally on this browser for the audit runner', 'info');
  };

  const getProviderKeys = async (): Promise<Record<VisibilityProviderId, string>> => providerApiKeys;

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
    goToStep('capture');
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
      setActiveStep('review');
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
    setActiveStep('review');
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
      `0-5 audit average: ${metrics.workbookAverage}/5`,
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

  const exportReportDocx = async () => {
    const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');
    const children = [
      new Paragraph({ text: `${profile.brand} AI Visibility Audit`, heading: HeadingLevel.TITLE }),
      new Paragraph({ text: `${profile.niche} in ${[profile.city, profile.state].filter(Boolean).join(', ')}`, spacing: { after: 240 } }),
      new Paragraph({
        children: [
          new TextRun({ text: `Generated: ${new Date().toLocaleDateString()}`, bold: true }),
        ],
        spacing: { after: 240 },
      }),
      ...reportDraft.sections.flatMap(section => [
        new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }),
        new Paragraph({ text: section.body, spacing: { after: 120 } }),
        ...(section.bullets || []).map(bullet => new Paragraph({ text: bullet, bullet: { level: 0 }, spacing: { after: 80 } })),
      ]),
    ];
    const document = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(document);
    downloadBlob(exportFilename(profile, 'docx'), blob);
    addToast('DOCX report downloaded', 'success');
  };

  const exportReportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const textWidth = pageWidth - margin * 2;
    let y = margin;

    const addLines = (text: string, fontSize = 10, bold = false) => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text || '', textWidth);
      for (const line of lines) {
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += fontSize + 5;
      }
      y += 4;
    };

    addLines(`${profile.brand} AI Visibility Audit`, 18, true);
    addLines(`${profile.niche} in ${[profile.city, profile.state].filter(Boolean).join(', ')} | Generated ${new Date().toLocaleDateString()}`, 10);
    for (const section of reportDraft.sections) {
      addLines(section.title, 13, true);
      addLines(section.body, 10);
      for (const bullet of section.bullets || []) {
        addLines(`- ${bullet}`, 9);
      }
      y += 8;
    }
    pdf.save(exportFilename(profile, 'pdf'));
    addToast('PDF report downloaded', 'success');
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
                0-5 audit scoring, report writing, action plan pricing, and shareable lead scorecards.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={refreshKeyStatus} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Key Note
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
          {toastMessage && (
            <div
              className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
                toastMessage.type === 'error'
                  ? 'border-red-500/30 bg-red-500/10 text-red-700'
                  : toastMessage.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                    : 'border-blue-500/30 bg-blue-500/10 text-blue-700'
              }`}
            >
              {toastMessage.message}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 xl:grid-cols-[380px_1fr]">
        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <StepNavigation
            steps={AUDIT_STEPS}
            activeStep={activeStep}
            onStepChange={goToStep}
            completed={{
              intake: Boolean(profile.website && profile.brand),
              setup: selectedQuestions.length > 0 && selectedProviders.length > 0,
              capture: metrics.capturedCount > 0,
              review: metrics.capturedCount > 0 && reviewAttentionCount === 0,
              report: Boolean(metrics.capturedCount && reportDraft.executiveSummary),
            }}
          />

          <section className="rounded-xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Current Audit</p>
            <h2 className="mt-2 text-lg font-semibold">{profile.brand || 'Unnamed business'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{profile.niche} in {[profile.city, profile.state].filter(Boolean).join(', ')}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="font-semibold">{selectedQuestions.length}</p>
                <p className="text-muted-foreground">Questions</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="font-semibold">{selectedProviders.length}</p>
                <p className="text-muted-foreground">Platforms</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="font-semibold">{metrics.capturedCount}</p>
                <p className="text-muted-foreground">Captured</p>
              </div>
            </div>
          </section>

          {activeStep === 'intake' && (
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={runCompetitorDiscovery}
                  disabled={isDiscoveringCompetitors}
                  className="gap-2"
                >
                  {isDiscoveringCompetitors ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Find Real Competitors
                </Button>
                <Button type="button" variant="outline" onClick={copyCompetitorDiscoveryPrompt} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy Prompt
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Drafts the profile and service list, then uses a stricter competitor prompt that accepts named businesses only. Channels and generic services like Google Ads, Facebook Ads, Website Design, Pool Builders, or Spa Builders are filtered out.
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
          )}

          {activeStep === 'intake' && (
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
                    const nextCompetitors = sanitizeCompetitorSuggestions(parseList(competitorText), profile);
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
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">SEO/AEO/GEO Audit Context</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Paste the key outputs from the full SEO audit so the LLM report can explain whether visibility problems are caused by schema, crawlability, thin pages, reviews, or GBP issues.
                    </p>
                  </div>
                  <a href="/audits/new" className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted">
                    Run SEO Audit
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-medium">
                    Technical health
                    <Input
                      className="mt-1"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0-100"
                      value={profile.seoAuditSignals?.technicalHealthScore ?? ''}
                      onChange={event => updateSeoSignals({ technicalHealthScore: optionalNumber(event.target.value) })}
                    />
                  </label>
                  <label className="block text-xs font-medium">
                    Pages analyzed
                    <Input
                      className="mt-1"
                      type="number"
                      min="0"
                      value={profile.seoAuditSignals?.pagesAnalyzed ?? ''}
                      onChange={event => updateSeoSignals({ pagesAnalyzed: optionalNumber(event.target.value) })}
                    />
                  </label>
                  <label className="block text-xs font-medium">
                    Pages with schema
                    <Input
                      className="mt-1"
                      type="number"
                      min="0"
                      value={profile.seoAuditSignals?.pagesWithSchema ?? ''}
                      onChange={event => updateSeoSignals({ pagesWithSchema: optionalNumber(event.target.value) })}
                    />
                  </label>
                  <label className="block text-xs font-medium">
                    Thin pages
                    <Input
                      className="mt-1"
                      type="number"
                      min="0"
                      value={profile.seoAuditSignals?.thinContentPages ?? ''}
                      onChange={event => updateSeoSignals({ thinContentPages: optionalNumber(event.target.value) })}
                    />
                  </label>
                  <label className="block text-xs font-medium">
                    Missing metadata
                    <Input
                      className="mt-1"
                      type="number"
                      min="0"
                      value={profile.seoAuditSignals?.missingMetaCount ?? ''}
                      onChange={event => updateSeoSignals({ missingMetaCount: optionalNumber(event.target.value) })}
                    />
                  </label>
                  <label className="block text-xs font-medium">
                    Local pages
                    <Input
                      className="mt-1"
                      type="number"
                      min="0"
                      value={profile.seoAuditSignals?.localLandingPages ?? ''}
                      onChange={event => updateSeoSignals({ localLandingPages: optionalNumber(event.target.value) })}
                    />
                  </label>
                  <label className="block text-xs font-medium">
                    Reviews
                    <Input
                      className="mt-1"
                      type="number"
                      min="0"
                      value={profile.seoAuditSignals?.reviewCount ?? ''}
                      onChange={event => updateSeoSignals({ reviewCount: optionalNumber(event.target.value) })}
                    />
                  </label>
                  <label className="block text-xs font-medium">
                    Review gap
                    <Input
                      className="mt-1"
                      type="number"
                      min="0"
                      value={profile.seoAuditSignals?.competitorReviewGap ?? ''}
                      onChange={event => updateSeoSignals({ competitorReviewGap: optionalNumber(event.target.value) })}
                    />
                  </label>
                </div>
                <label className="mt-3 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(profile.seoAuditSignals?.aiBotsBlocked)}
                    onChange={event => updateSeoSignals({ aiBotsBlocked: event.target.checked })}
                    className="h-4 w-4 rounded border-input"
                  />
                  SEO audit flagged AI/search crawler blocking
                </label>
                <label className="mt-3 block text-xs font-medium">
                  Full SEO audit link or notes
                  <Input
                    className="mt-1"
                    value={profile.seoAuditSignals?.lastAuditUrl || ''}
                    onChange={event => updateSeoSignals({ lastAuditUrl: event.target.value })}
                    placeholder="/audits/{id}/report or client audit note"
                  />
                </label>
              </div>
            </div>
          </section>
          )}

          {activeStep === 'setup' && (
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
                {industryPack.targetNotes ? (
                  <p className="mt-2 rounded-md bg-background px-3 py-2 text-foreground">
                    <span className="font-semibold">{industryPack.label} target note:</span> {industryPack.targetNotes}
                  </p>
                ) : null}
                {industryPack.keywords?.length ? (
                  <p className="mt-2">Common local targets: {industryPack.keywords.join(', ')}.</p>
                ) : null}
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
          )}

          {activeStep === 'setup' && (
          <ProviderSetupPanel
            selectedProviders={selectedProviders}
            keyStatus={keyStatus}
            providerApiKeys={providerApiKeys}
            onToggleProvider={toggleProvider}
            onSelectProviders={setSelectedProviders}
            onApiKeyChange={(provider, value) => setProviderApiKeys(current => ({ ...current, [provider]: value }))}
          />
          )}
        </aside>

        <main ref={mainContentRef} className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">Current Step</p>
                <h2 className="mt-1 text-xl font-semibold">{activeStepMeta.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{activeStepMeta.description}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs md:min-w-[360px]">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="font-semibold">{selectedQuestions.length}</p>
                  <p className="text-muted-foreground">Questions</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="font-semibold">{selectedProviders.length}</p>
                  <p className="text-muted-foreground">Platforms</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="font-semibold">{runCount}</p>
                  <p className="text-muted-foreground">Runs</p>
                </div>
              </div>
            </div>
          </section>

          {metrics.capturedCount > 0 && (
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-6">
              <MetricCard label="Visibility" value={`${metrics.visibilityScore}`} helper={`Grade ${metrics.grade}`} icon={<BarChart3 className="h-4 w-4" />} />
              <MetricCard label="0-5 Audit Avg" value={`${metrics.workbookAverage}/5`} helper={`${metrics.dominantCount} dominant cited answers`} icon={<FileText className="h-4 w-4" />} />
              <MetricCard label="Mentions" value={formatPercent(metrics.mentionRate)} helper={`${metrics.brandMentionCount}/${metrics.capturedCount} captured`} icon={<Target className="h-4 w-4" />} />
              <MetricCard label="Citations" value={formatPercent(metrics.citationRate)} helper={`${metrics.citationCount} brand citations`} icon={<FileText className="h-4 w-4" />} />
              <MetricCard label="Competitors" value={formatPercent(metrics.competitorDominanceRatio)} helper="Dominance ratio" icon={<Zap className="h-4 w-4" />} />
              <MetricCard label="QA" value={`${metrics.approvedCount}/${metrics.capturedCount}`} helper={`${metrics.needsReviewCount + metrics.highImpactMissCount} need review`} icon={<ShieldCheck className="h-4 w-4" />} />
            </section>
          )}

          <NextActionBanner action={nextAction} onGo={() => goToStep(nextAction.step)} />

          <section className="rounded-xl border bg-card p-5">
            <details>
              <summary className="flex cursor-pointer list-none flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">30-Minute Operator Workflow</h2>
                  <p className="text-sm text-muted-foreground">Open this only when you need the timing checklist.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                  <WorkflowPill label="0-3 min" value="Intake" done={Boolean(profile.website && profile.brand)} />
                  <WorkflowPill label="3-6 min" value="Competitors" done={profile.competitors.length > 0} />
                  <WorkflowPill label="6-22 min" value="Capture" done={metrics.capturedCount > 0} />
                  <WorkflowPill label="22-30 min" value="Report" done={Boolean(reportDraft.executiveSummary && metrics.capturedCount)} />
                </div>
              </summary>
              <p className="mt-4 rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                Intake and approve competitors, confirm the query batch, run API captures, paste manual AIO/Gemini evidence, QA the misses, then copy the report draft.
              </p>
            </details>
            {reAuditDelta && (
              <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-300">
                {reAuditDelta.summary} Mention rate delta: {formatSignedPercent(reAuditDelta.mentionRateDelta)}. Citation delta: {formatSignedPercent(reAuditDelta.citationRateDelta)}.
              </div>
            )}
          </section>

          {activeStep === 'report' && (
          <>
          <section className="rounded-xl border bg-card">
            <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Client Report</h2>
                <p className="text-sm text-muted-foreground">
                  Evidence-based narrative, score explanation, platform/category findings, precise next steps, caveats, and client follow-up.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(reportToClipboardText(reportDraft)).then(() => addToast('Report draft copied', 'success'))}
                  disabled={!metrics.capturedCount}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={exportReportDocx} disabled={!metrics.capturedCount} className="gap-2">
                  <Download className="h-4 w-4" />
                  DOCX
                </Button>
                <Button variant="outline" size="sm" onClick={exportReportPdf} disabled={!metrics.capturedCount} className="gap-2">
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
            <div className="space-y-4 p-5">
              {reportDraft.sections.map(section => (
                <ReportSectionBlock key={section.title} section={section} />
              ))}
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
          </>
          )}

          {activeStep === 'setup' && (
          <section className="rounded-xl border bg-card">
            <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Question Batch</h2>
                <p className="text-sm text-muted-foreground">
                  Workbook-style buckets keep the audit readable: Brand Health, Competitors, Category + Geo, Service, Problem / Solutions, and Cost.
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
            <details className="border-t">
              <summary className="flex cursor-pointer list-none items-center justify-between p-5 text-sm font-semibold">
                <span>Review selected questions by category</span>
                <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{selectedQuestions.length}/{renderedQuestions.length}</span>
              </summary>
              <div className="max-h-[560px] overflow-y-auto border-t">
                {questionsByCategory.map(group => (
                  <details key={group.category} className="border-b" open={group.selectedCount > 0}>
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 bg-muted/20 p-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{group.meta.label}</span>
                          <span className="rounded bg-background px-2 py-0.5 text-xs text-muted-foreground">
                            Workbook: {group.meta.workbookBucket}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{group.meta.description}</p>
                      </div>
                      <span className="shrink-0 rounded bg-background px-2 py-1 text-xs font-semibold text-muted-foreground">
                        {group.selectedCount}/{group.questions.length}
                      </span>
                    </summary>
                    <div className="divide-y">
                      {group.questions.map(question => (
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
                              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{group.meta.label}</span>
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
                  </details>
                ))}
              </div>
            </details>
          </section>
          )}

          {activeStep === 'capture' && (
          <>
          <section className="rounded-xl border bg-card p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">API Capture</h2>
                <p className="text-sm text-muted-foreground">
                  Runs the selected questions across the selected LLMs. Missing keys create evidence rows with errors so nothing silently disappears.
                </p>
              </div>
              <Button onClick={runBatch} disabled={isRunning || runCount === 0} className="gap-2">
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run {runCount || 'Selected'} API Runs
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {DEFAULT_PROVIDERS.map(provider => {
                const selected = selectedProviders.includes(provider);
                return (
                  <div key={provider} className={`rounded-lg border p-3 text-sm ${selected ? PROVIDER_ACCENTS[provider] : 'bg-muted/30 text-muted-foreground'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{PROVIDER_LABELS[provider]}</span>
                      {selected ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    </div>
                    <p className="mt-1 text-xs">{selected ? (keyStatus[provider] ? 'Selected, key ready' : 'Selected, key missing') : 'Not selected'}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <ProviderSetupPanel
            selectedProviders={selectedProviders}
            keyStatus={keyStatus}
            providerApiKeys={providerApiKeys}
            onToggleProvider={toggleProvider}
            onSelectProviders={setSelectedProviders}
            onApiKeyChange={(provider, value) => setProviderApiKeys(current => ({ ...current, [provider]: value }))}
          />

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
                      {question.code} - {getQuestionCategoryMeta(question.category).label} - {question.prompt.slice(0, 70)}
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
          <CaptureStatusPanel runs={runs} />
          </>
          )}

          {(activeStep === 'review' || activeStep === 'report') && (
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

            <div className="border-b bg-muted/20 p-5 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">0-5 Audit Avg</span> is the simple workbook rubric:
                5 = dominant cited recommendation, 4 = top mention with citation, 3 = mentioned, 2 = category answer with the brand absent,
                1 = competitors appear instead, 0 = harmful or likely incorrect brand information.
              </p>
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
                    <ScoreRow label="0-5 audit avg" value={formatSignedNumber(reAuditDelta.workbookAverageDelta)} />
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
          )}

          {activeStep === 'review' && (
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
          )}
        </main>
      </div>
    </div>
  );
};

const StepNavigation: React.FC<{
  steps: typeof AUDIT_STEPS;
  activeStep: AuditStepId;
  onStepChange: (step: AuditStepId) => void;
  completed: Record<AuditStepId, boolean>;
}> = ({ steps, activeStep, onStepChange, completed }) => (
  <section className="rounded-xl border bg-card p-4">
    <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Audit Flow</p>
    <div className="space-y-2">
      {steps.map((step, index) => {
        const active = activeStep === step.id;
        const done = completed[step.id];
        return (
          <button
            key={step.id}
            onClick={() => onStepChange(step.id)}
            className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition ${
              active ? 'border-primary bg-primary/10' : 'bg-background hover:bg-muted/50'
            }`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{step.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{step.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  </section>
);

const NextActionBanner: React.FC<{
  action: { step: AuditStepId; title: string; detail: string; cta: string };
  onGo: () => void;
}> = ({ action, onGo }) => (
  <section className="rounded-xl border border-primary/25 bg-primary/5 p-5">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase text-primary">Next Best Action</p>
        <h2 className="mt-1 text-lg font-semibold">{action.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{action.detail}</p>
      </div>
      <Button onClick={onGo} className="shrink-0">
        {action.cta}
      </Button>
    </div>
  </section>
);

const CaptureStatusPanel: React.FC<{ runs: VisibilityAuditRun[] }> = ({ runs }) => {
  const byProvider = DEFAULT_PROVIDERS.map(provider => ({
    provider,
    total: runs.filter(run => run.provider === provider).length,
    captured: runs.filter(run => run.provider === provider && (run.status === 'captured' || run.status === 'manual')).length,
    errors: runs.filter(run => run.provider === provider && run.status === 'error').length,
  })).filter(item => item.total > 0);

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b p-5">
        <h2 className="text-lg font-semibold">Capture Status</h2>
        <p className="text-sm text-muted-foreground">A compact rollup of the current batch. Detailed evidence lives in Review.</p>
      </div>
      <div className="grid gap-3 p-5 md:grid-cols-2">
        {byProvider.length ? (
          byProvider.map(item => (
            <div key={item.provider} className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className={`rounded border px-2 py-1 text-xs font-semibold ${PROVIDER_ACCENTS[item.provider]}`}>
                  {PROVIDER_LABELS[item.provider]}
                </span>
                <span className="text-sm font-semibold">{item.captured}/{item.total}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${item.total ? (item.captured / item.total) * 100 : 0}%` }} />
              </div>
              {item.errors ? <p className="mt-2 text-xs text-red-600">{item.errors} error{item.errors === 1 ? '' : 's'}</p> : null}
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground md:col-span-2">
            No capture runs yet. Run the API batch or save a manual capture.
          </p>
        )}
      </div>
    </section>
  );
};

const ProviderSetupPanel: React.FC<{
  selectedProviders: VisibilityProviderId[];
  keyStatus: Record<VisibilityProviderId, boolean>;
  providerApiKeys: Record<VisibilityProviderId, string>;
  onToggleProvider: (provider: VisibilityProviderId) => void;
  onSelectProviders: (providers: VisibilityProviderId[]) => void;
  onApiKeyChange: (provider: VisibilityProviderId, value: string) => void;
}> = ({ selectedProviders, keyStatus, providerApiKeys, onToggleProvider, onSelectProviders, onApiKeyChange }) => (
  <section className="rounded-xl border bg-card p-5">
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-semibold">Platforms And API Keys</h2>
          <p className="text-sm text-muted-foreground">Select which LLMs to run and paste the matching provider keys.</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => onSelectProviders([...DEFAULT_PROVIDERS])}>
        Use All Four
      </Button>
    </div>
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {DEFAULT_PROVIDERS.map(provider => {
        const selected = selectedProviders.includes(provider);
        return (
          <button
            key={provider}
            type="button"
            onClick={() => onToggleProvider(provider)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
              selected ? PROVIDER_ACCENTS[provider] : 'bg-background hover:bg-muted'
            }`}
          >
            <span>
              <span className="block font-medium">{PROVIDER_LABELS[provider]}</span>
              <span className="text-xs text-muted-foreground">{PROVIDER_API_KEY_LABELS[provider]}</span>
            </span>
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
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {DEFAULT_PROVIDERS.map(provider => (
        <label key={provider} className="block text-xs font-medium">
          {PROVIDER_API_KEY_LABELS[provider]}
          <Input
            className="mt-1"
            type="password"
            placeholder={`Paste ${PROVIDER_LABELS[provider]} key`}
            value={providerApiKeys[provider]}
            onChange={event => onApiKeyChange(provider, event.target.value)}
          />
        </label>
      ))}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">
      Keys are stored locally in this browser for quick audits. Production team keys should move server-side later.
    </p>
  </section>
);

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

const ReportSectionBlock: React.FC<{ section: AuditReportSection }> = ({ section }) => (
  <section className="rounded-lg border bg-muted/15 p-5">
    <h3 className="text-base font-semibold">{section.title}</h3>
    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{section.body}</p>
    {section.bullets?.length ? (
      <ul className="mt-3 space-y-2 text-sm">
        {section.bullets.map((bullet, index) => (
          <li key={`${section.title}-${index}`} className="rounded-md bg-background px-3 py-2 text-muted-foreground">
            {bullet}
          </li>
        ))}
      </ul>
    ) : null}
  </section>
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
  return report.sections
    .flatMap(section => [
      section.title,
      section.body,
      ...(section.bullets || []).map(bullet => `- ${bullet}`),
      '',
    ])
    .join('\n');
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
        <span className="rounded bg-muted px-2 py-1 text-xs">{getQuestionCategoryMeta(run.query.category).label}</span>
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
                <ScoreRow label="0-5 audit score" value={`${run.score.workbookScore}/5`} />
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
