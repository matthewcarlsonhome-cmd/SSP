/**
 * Library Skill Runner Page
 *
 * Executes skills from the unified Skill Library (role-template skills).
 * Built-in skills redirect to their dedicated SkillRunnerPage.
 *
 * Features:
 * - Skill explanation sidebar with description and "What you'll get"
 * - Add to Favorites functionality
 * - View Skill Prompts panel
 * - Form inputs for skill execution
 * - Streaming output with save/copy/download
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { executeDynamicSkill } from '../lib/skills/dynamic';
import type { ChatGPTModelType } from '../lib/chatgpt';
import { useToast } from '../hooks/useToast';
import { usePortalMode } from '../hooks/usePortalMode';
import type { DynamicSkill, DynamicFormInput, SavedOutput, SkillExecution, FavoriteSkill } from '../lib/storage/types';
import type { LibrarySkill } from '../lib/skillLibrary/types';
import { ROLE_DEFINITIONS, getLibrarySkill } from '../lib/skillLibrary';
import { db } from '../lib/storage/indexeddb';
import { streamPortalProxy } from '../lib/portalProxy';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { Progress } from '../components/ui/Progress';
import {
  ArrowLeft,
  Sparkles,
  Clipboard,
  Download,
  AlertTriangle,
  Loader2,
  Clock,
  Code,
  ChevronDown,
  ChevronUp,
  FileCode,
  Briefcase,
  Save,
  Check,
  BookOpen,
  Star,
  CheckCircle,
} from 'lucide-react';
import { TestDataPanel } from '../components/TestDataPanel';
import { ProviderConfigStatus, useProviderConfig } from '../components/ProviderConfig';
import { ReadyToRunChecklist } from '../components/ReadyToRunChecklist';
import { ExecutionSummary } from '../components/ExecutionSummary';
import { SkillGrading } from '../components/SkillGrading';
import { checkPlatformStatus, type PlatformStatus } from '../lib/platformProxy';
import { calculateCost } from '../lib/billing';
import { logger } from '../lib/logger';

const LibrarySkillRunnerPage: React.FC = () => {
  const navigate = useNavigate();
  const { skillId } = useParams<{ skillId: string }>();
  const { addToast } = useToast();

  // Portal mode detection (for anonymous portal visitors)
  const {
    isPortalMode,
    isPortalAvailable,
    portalSlug,
    isLoading: isPortalLoading,
    modelInfo: portalModelInfo,
    hasPersonalKey,
    canRun: canRunWithPortal,
  } = usePortalMode();

  // Provider configuration (centralized at /account)
  const {
    state: providerState,
    canRun,
    availableModels,
  } = useProviderConfig();

  // Skill state
  const [librarySkill, setLibrarySkill] = useState<LibrarySkill | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formState, setFormState] = useState<Record<string, unknown>>({});

  // Execution state
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // UI state
  const [showPrompts, setShowPrompts] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [outputSaved, setOutputSaved] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Platform status for inline selector
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);

  // Execution summary data
  const [executionComplete, setExecutionComplete] = useState(false);
  const [executionDuration, setExecutionDuration] = useState<number | undefined>();
  const [executionTokens, setExecutionTokens] = useState<{ input: number; output: number } | undefined>();
  const [executionCost, setExecutionCost] = useState<number | undefined>();

  // Test data applied tracking
  const [testDataApplied, setTestDataApplied] = useState(false);

  // Grading state
  const [showGrading, setShowGrading] = useState(false);
  const [executionIdForGrading, setExecutionIdForGrading] = useState<string>('');

  // Load skill from sessionStorage or URL parameter
  useEffect(() => {
    const loadSkill = () => {
      try {
        // First try sessionStorage
        const stored = sessionStorage.getItem('librarySkillToRun');
        let skill: LibrarySkill | undefined;

        if (stored) {
          skill = JSON.parse(stored) as LibrarySkill;
        } else if (skillId) {
          // If no sessionStorage, try to look up by URL param
          skill = getLibrarySkill(skillId);
        }

        if (skill) {
          // If it's a builtin skill, redirect to the proper page
          if (skill.source === 'builtin') {
            navigate(`/skill/${skill.id}`);
            return;
          }

          setLibrarySkill(skill);

          // Initialize form state with defaults
          const inputs = skill.inputs || [];
          const initial: Record<string, unknown> = {};
          inputs.forEach((input) => {
            initial[input.id] = input.defaultValue ?? (input.type === 'checkbox' ? false : '');
          });
          setFormState(initial);
        }
      } catch (e) {
        logger.error('Failed to load library skill', { error: e instanceof Error ? e.message : String(e) });
      } finally {
        setLoading(false);
      }
    };

    loadSkill();
  }, [navigate, skillId]);

  // Check if skill is favorited
  useEffect(() => {
    if (librarySkill?.id) {
      db.isSkillFavorited(librarySkill.id).then(setIsFavorited);
    }
  }, [librarySkill?.id]);

  // Fetch platform status on mount
  useEffect(() => {
    checkPlatformStatus().then(setPlatformStatus).catch((error) => {
      logger.error('Failed to check platform status', { error: error instanceof Error ? error.message : String(error) });
    });
  }, []);


  // Reset saved state when output changes
  useEffect(() => {
    setOutputSaved(false);
  }, [output]);

  // Convert library skill to format needed for execution
  const getExecutableSkill = (): DynamicSkill | null => {
    if (!librarySkill) return null;

    return {
      id: librarySkill.id,
      workspaceId: '',
      version: 1,
      createdAt: librarySkill.createdAt || new Date().toISOString(),
      updatedAt: librarySkill.createdAt || new Date().toISOString(),
      name: librarySkill.name,
      description: librarySkill.description,
      longDescription: librarySkill.longDescription || '',
      category: librarySkill.tags.category as DynamicSkill['category'],
      estimatedTimeSaved: librarySkill.estimatedTimeSaved || '',
      theme: {
        primary: librarySkill.theme.primary,
        secondary: librarySkill.theme.secondary,
        gradient: librarySkill.theme.gradient,
        iconName: librarySkill.theme.iconName || 'Sparkles',
      },
      inputs: librarySkill.inputs,
      prompts: librarySkill.prompts,
      config: librarySkill.config,
      executionCount: librarySkill.useCount,
    };
  };

  // Get role name for display
  const getRoleName = (): string | null => {
    if (!librarySkill?.sourceRoleId) return null;
    const role = ROLE_DEFINITIONS.find((r) => r.id === librarySkill.sourceRoleId);
    return role?.name || librarySkill.sourceRoleId.replace(/-/g, ' ');
  };

  // Generate "What you'll get" based on skill category and description
  const getWhatYouGet = (): string[] => {
    if (librarySkill?.whatYouGet && librarySkill.whatYouGet.length > 0) {
      return librarySkill.whatYouGet;
    }

    // Generate based on category if not provided
    const category = librarySkill?.tags.category;
    switch (category) {
      case 'analysis':
        return ['Detailed analysis report', 'Key insights and findings', 'Actionable recommendations'];
      case 'generation':
        return ['Professional content', 'Ready-to-use output', 'Customized to your inputs'];
      case 'automation':
        return ['Automated workflow output', 'Time-saving templates', 'Consistent results'];
      case 'optimization':
        return ['Optimized content', 'Improvement suggestions', 'Best practice recommendations'];
      case 'communication':
        return ['Professional messaging', 'Clear communication templates', 'Context-appropriate tone'];
      case 'research':
        return ['Comprehensive research findings', 'Key data points', 'Summary and analysis'];
      default:
        return ['Professional output', 'Tailored to your needs', 'Ready to use immediately'];
    }
  };

  const handleInputChange = (id: string, value: unknown) => {
    setFormState((prev) => ({ ...prev, [id]: value }));
  };

  // Load test data into form
  const handleLoadTestData = (inputPayload: Record<string, string>) => {
    setFormState((prev) => ({ ...prev, ...inputPayload }));
    setTestDataApplied(true);
  };

  // Reset form to blank
  const handleResetForm = () => {
    if (librarySkill) {
      const inputs = librarySkill.inputs || [];
      const initial: Record<string, unknown> = {};
      inputs.forEach((input) => {
        initial[input.id] = input.defaultValue ?? (input.type === 'checkbox' ? false : '');
      });
      setFormState(initial);
      setTestDataApplied(false);
      setExecutionComplete(false);
    }
  };

  const validateForm = (): boolean => {
    // Portal mode bypasses normal API key checks
    if (isPortalMode && isPortalAvailable) {
      // Portal mode is active, can run without personal key
    } else if (!canRun && !providerState.apiKey) {
      addToast('Please configure your API key in Account Settings', 'error');
      return false;
    }
    if (!librarySkill) return false;

    const inputs = librarySkill.inputs || [];
    for (const input of inputs) {
      if (input.validation?.required && !formState[input.id]) {
        addToast(`${input.label} is required`, 'error');
        return false;
      }
    }
    return true;
  };

  const handleRun = async () => {
    const skill = getExecutableSkill();
    if (!validateForm() || !skill) return;

    setIsRunning(true);
    setOutput('');
    setError(null);
    setProgress(0);
    setStartTime(Date.now());
    setExecutionComplete(false);
    setExecutionDuration(undefined);
    setExecutionTokens(undefined);
    setExecutionCost(undefined);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 95));
    }, 200);

    try {
      let fullOutput = '';

      // Portal mode: Use portal proxy (no auth required)
      if (isPortalMode && isPortalAvailable) {
        // Generate prompt from skill template
        let userPrompt = skill.prompts.userPromptTemplate;
        for (const [key, value] of Object.entries(formState)) {
          userPrompt = userPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
        }

        const stream = streamPortalProxy({
          prompt: userPrompt,
          systemPrompt: skill.prompts.systemInstruction,
          maxTokens: skill.config.maxTokens || 2048,
          portalSlug: portalSlug || undefined,
        });

        for await (const chunk of stream) {
          fullOutput += chunk;
          setOutput(fullOutput);
        }
      } else {
        // Standard execution with API key
        for await (const chunk of executeDynamicSkill({
          skill,
          formInputs: formState,
          apiKey: providerState.apiKey,
          provider: providerState.provider,
          claudeModel: providerState.model as 'haiku' | 'sonnet' | 'opus',
          chatgptModel: providerState.model as ChatGPTModelType,
          keyMode: providerState.keyMode,
        })) {
          fullOutput += chunk;
          setOutput(fullOutput);
        }
      }

      // Save execution to history
      const durationMs = Date.now() - (startTime || Date.now());
      if (librarySkill && startTime) {
        const execution: SkillExecution = {
          id: crypto.randomUUID(),
          skillId: librarySkill.id,
          skillName: librarySkill.name,
          skillSource: 'dynamic',
          createdAt: new Date().toISOString(),
          inputs: formState,
          output: fullOutput,
          model: providerState.provider,
          durationMs,
        };
        await db.saveExecution(execution);
      }

      // Populate execution summary
      const estimatedInputTokens = Math.ceil(JSON.stringify(formState).length / 4);
      const estimatedOutputTokens = Math.ceil(fullOutput.length / 4);
      const costEstimate = calculateCost(providerState.model, estimatedInputTokens, estimatedOutputTokens);
      setExecutionDuration(durationMs / 1000);
      setExecutionTokens({ input: estimatedInputTokens, output: estimatedOutputTokens });
      setExecutionCost(costEstimate.totalCost / 100);
      setExecutionComplete(true);

      // Enable grading
      setExecutionIdForGrading(crypto.randomUUID());
      setShowGrading(true);

      setProgress(100);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(message);
      addToast(message, 'error');
    } finally {
      clearInterval(progressInterval);
      setIsRunning(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!librarySkill) return;

    try {
      if (isFavorited) {
        await db.removeFavoriteBySkillId(librarySkill.id);
        setIsFavorited(false);
        addToast('Removed from favorites', 'success');
      } else {
        const favorite: FavoriteSkill = {
          id: crypto.randomUUID(),
          skillId: librarySkill.id,
          skillName: librarySkill.name,
          skillDescription: librarySkill.description,
          skillSource: 'dynamic',
          category: librarySkill.tags.category,
          createdAt: new Date().toISOString(),
        };
        await db.addFavoriteSkill(favorite);
        setIsFavorited(true);
        addToast('Added to favorites!', 'success');
      }
    } catch (error) {
      addToast('Failed to update favorite', 'error');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    addToast('Copied to clipboard!', 'success');
  };

  const downloadOutput = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${librarySkill?.name.toLowerCase().replace(/\s+/g, '-') || 'skill'}-output.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Downloaded!', 'success');
  };

  const downloadPrompts = () => {
    if (!librarySkill) return;

    const promptExport = {
      skillName: librarySkill.name,
      skillDescription: librarySkill.description,
      category: librarySkill.tags.category,
      role: getRoleName(),
      exportedAt: new Date().toISOString(),
      prompts: librarySkill.prompts,
      config: librarySkill.config,
      inputs: librarySkill.inputs.map((input) => ({
        id: input.id,
        label: input.label,
        type: input.type,
        placeholder: input.placeholder,
        required: input.validation?.required || false,
      })),
    };

    const blob = new Blob([JSON.stringify(promptExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${librarySkill.name.toLowerCase().replace(/\s+/g, '-')}-prompt.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Prompt exported!', 'success');
  };

  const copyPromptToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied!`, 'success');
  };

  const handleSaveOutput = async () => {
    if (!librarySkill || !saveTitle.trim()) return;

    setIsSaving(true);
    try {
      const savedOutput: SavedOutput = {
        id: crypto.randomUUID(),
        title: saveTitle.trim(),
        skillId: librarySkill.id,
        skillName: librarySkill.name,
        skillSource: 'dynamic',
        output: output,
        inputs: formState,
        model: providerState.provider,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
      };

      await db.saveOutput(savedOutput);
      addToast('Output saved to dashboard!', 'success');
      setShowSaveDialog(false);
      setSaveTitle('');
      setOutputSaved(true);
    } catch (e) {
      addToast('Failed to save output', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No skill found
  if (!librarySkill) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500" />
          <h1 className="mt-6 text-2xl font-bold">Skill Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            The skill you're looking for wasn't found. Please select a skill from the library.
          </p>
          <Button onClick={() => navigate('/library')} className="mt-6">
            <BookOpen className="h-4 w-4 mr-2" />
            Browse Skill Library
          </Button>
        </div>
      </div>
    );
  }

  const inputs = librarySkill.inputs || [];
  const roleName = getRoleName();
  const whatYouGet = getWhatYouGet();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ═══════════════════════════════════════════════════════════════════
            LEFT SIDEBAR - Skill Explanation
        ═══════════════════════════════════════════════════════════════════ */}
        <aside className="lg:col-span-1 lg:sticky lg:top-24 self-start">
          {/* Back Button */}
          <button
            onClick={() => navigate('/library')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Skill Library
          </button>

          {/* Skill Info Card */}
          <div className="rounded-xl border bg-card text-card-foreground p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${librarySkill.theme.secondary}`}>
                <Sparkles className={`h-6 w-6 ${librarySkill.theme.primary}`} />
              </div>
              <h1 className="text-2xl font-bold">{librarySkill.name}</h1>
            </div>

            {/* Description */}
            <p className="text-muted-foreground text-sm mb-4">
              {librarySkill.longDescription || librarySkill.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {roleName && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                  <Briefcase className="h-3 w-3" />
                  {roleName}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-muted text-xs capitalize">
                {librarySkill.tags.category}
              </span>
              {librarySkill.estimatedTimeSaved && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {librarySkill.estimatedTimeSaved}
                </span>
              )}
            </div>

            {/* What You'll Get */}
            <h3 className="font-semibold mb-2">What you'll get:</h3>
            <ul className="list-none text-sm text-muted-foreground space-y-1.5 mb-4">
              {whatYouGet.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Add to Favorites */}
            <div className="pt-4 border-t">
              <Button
                variant={isFavorited ? 'secondary' : 'outline'}
                className="w-full"
                onClick={handleToggleFavorite}
              >
                <Star className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current text-yellow-500' : ''}`} />
                {isFavorited ? 'Favorited' : 'Add to Favorites'}
              </Button>
            </div>

            {/* View Prompts Toggle */}
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowPrompts(!showPrompts)}
                className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  View Skill Prompts
                </span>
                {showPrompts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Prompts Panel */}
          {showPrompts && (
            <div className="mt-4 rounded-xl border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  Skill Prompts
                </h3>
                <Button variant="outline" size="sm" onClick={downloadPrompts}>
                  <Download className="h-3 w-3 mr-1" />
                  Export JSON
                </Button>
              </div>

              {/* System Instruction */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    System Instruction
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyPromptToClipboard(librarySkill.prompts.systemInstruction, 'System instruction')}
                    className="h-6 text-xs"
                  >
                    <Clipboard className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                    {librarySkill.prompts.systemInstruction}
                  </pre>
                </div>
              </div>

              {/* User Prompt Template */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    User Prompt Template
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyPromptToClipboard(librarySkill.prompts.userPromptTemplate, 'User prompt')}
                    className="h-6 text-xs"
                  >
                    <Clipboard className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                    {librarySkill.prompts.userPromptTemplate}
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground">
                  Variables like {"{{input}}"} are replaced with your form inputs when the skill runs.
                </p>
              </div>

              {/* Copy Full Prompt */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const fullPrompt = `=== SYSTEM INSTRUCTION ===\n\n${librarySkill.prompts.systemInstruction}\n\n=== USER PROMPT TEMPLATE ===\n\n${librarySkill.prompts.userPromptTemplate}`;
                    copyPromptToClipboard(fullPrompt, 'Full prompt');
                  }}
                >
                  <Clipboard className="h-4 w-4 mr-2" />
                  Copy Full Prompt (System + User)
                </Button>
              </div>
            </div>
          )}
        </aside>

        {/* ═══════════════════════════════════════════════════════════════════
            MAIN CONTENT - Form & Output
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Test Data Panel */}
          <TestDataPanel
            skillId={librarySkill.id}
            onLoadTestData={handleLoadTestData}
            onReset={handleResetForm}
            onExecute={handleRun}
            isExecuting={isRunning}
          />

          {/* AI Status - Portal mode or Provider config */}
          {isPortalMode && isPortalAvailable ? (
            <div className="rounded-lg border bg-blue-500/5 border-blue-500/20 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-blue-600">Portal Demo Mode</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      {portalModelInfo.provider} {portalModelInfo.model}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  No setup required
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 ml-8">
                Try this skill instantly. For full features, <Link to="/account" className="text-primary hover:underline">configure your own API key</Link>.
              </p>
            </div>
          ) : (
            <ProviderConfigStatus
              providerState={providerState}
              availableModels={availableModels}
              canRun={canRun}
            />
          )}

          {/* Ready to Run Checklist */}
          <ReadyToRunChecklist
            providerName={
              isPortalMode ? portalModelInfo.provider :
              providerState.provider === 'gemini' ? 'Gemini' :
              providerState.provider === 'claude' ? 'Claude' : 'ChatGPT'
            }
            modelName={
              isPortalMode ? portalModelInfo.model :
              availableModels.find(m => m.id === providerState.model)?.name || providerState.model
            }
            keyMode={isPortalMode ? 'platform' : providerState.keyMode}
            keyConfigured={
              isPortalMode ? isPortalAvailable :
              providerState.keyMode === 'platform'
                ? (platformStatus?.available ?? false)
                : !!providerState.apiKey
            }
            platformBalance={isPortalMode ? 100 : (platformStatus?.available ? 100 : undefined)}
            requiredInputs={inputs
              .filter(input => input.validation?.required)
              .map(input => ({
                id: input.id,
                label: input.label,
                filled: !!formState[input.id],
              }))}
            hasTestData={true}
            testDataApplied={testDataApplied}
            canRun={(isPortalMode && isPortalAvailable) || (canRun && inputs.filter(i => i.validation?.required).every(i => !!formState[i.id]))}
          />

          {/* Skill Inputs */}
          {inputs.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-semibold mb-4">Skill Inputs</h2>

              <div className="space-y-4">
                {inputs.map((input) => (
                  <div key={input.id}>
                    <label className="block text-sm font-medium mb-1">
                      {input.label}
                      {input.validation?.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {input.type === 'textarea' ? (
                      <Textarea
                        value={(formState[input.id] as string) || ''}
                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                        placeholder={input.placeholder}
                        rows={4}
                      />
                    ) : input.type === 'select' && input.options ? (
                      <Select
                        value={(formState[input.id] as string) || ''}
                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                      >
                        <option value="">Select...</option>
                        {input.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </Select>
                    ) : input.type === 'checkbox' ? (
                      <Checkbox
                        checked={(formState[input.id] as boolean) || false}
                        onChange={(e) => handleInputChange(input.id, e.target.checked)}
                        label={input.placeholder || ''}
                      />
                    ) : (
                      <Input
                        type={input.type === 'number' ? 'number' : 'text'}
                        value={(formState[input.id] as string) || ''}
                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                        placeholder={input.placeholder}
                      />
                    )}

                    {input.helpText && (
                      <p className="text-xs text-muted-foreground mt-1">{input.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Run Button */}
          <Button onClick={handleRun} disabled={isRunning} className="w-full" size="lg">
            {isRunning ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Run Skill
              </>
            )}
          </Button>

          {/* Progress */}
          {isRunning && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">Processing... {progress}%</p>
            </div>
          )}

          {/* Output Panel */}
          <div className="rounded-xl border bg-card min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">Output</h2>
              {output && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={copyToClipboard} title="Copy to clipboard">
                    <Clipboard className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadOutput} title="Download as text file">
                    <Download className="h-4 w-4" />
                  </Button>
                  {!outputSaved ? (
                    <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(true)} title="Save to dashboard">
                      <Save className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Saved
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 p-6 overflow-auto">
              {error ? (
                <div className="flex flex-col items-center justify-center h-full text-red-500">
                  <AlertTriangle className="h-12 w-12 mb-4" />
                  <p className="text-center">{error}</p>
                </div>
              ) : output ? (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Sparkles className="h-12 w-12 mb-4 opacity-50" />
                  <p>Fill in the inputs and click "Run Skill" to generate output</p>
                </div>
              )}
            </div>
          </div>

          {/* Execution Summary */}
          {executionComplete && output && (
            <ExecutionSummary
              success={!error}
              durationMs={executionDuration ? executionDuration * 1000 : undefined}
              inputTokens={executionTokens?.input}
              outputTokens={executionTokens?.output}
              costDollars={executionCost}
              modelName={availableModels.find(m => m.id === providerState.model)?.name || providerState.model}
              providerName={
                providerState.provider === 'gemini' ? 'Gemini' :
                providerState.provider === 'claude' ? 'Claude' : 'ChatGPT'
              }
              outputText={output}
              onCopy={copyToClipboard}
              onDownload={downloadOutput}
              onSave={() => setShowSaveDialog(true)}
              onRunAgain={handleRun}
              isSaved={outputSaved}
            />
          )}

          {/* Skill Grading */}
          {showGrading && executionComplete && output && !error && librarySkill && (
            <SkillGrading
              skillId={librarySkill.id}
              executionId={executionIdForGrading}
              userId="current-user"
              executedAt={new Date().toISOString()}
              onGradeSubmitted={() => {
                // Grade submitted successfully
              }}
              onDismiss={() => setShowGrading(false)}
              compact={false}
            />
          )}
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border shadow-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-semibold mb-4">Save Output</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Save this output to your dashboard for easy access later.
            </p>
            <Input
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              placeholder="Enter a title for this output..."
              className="mb-4"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveOutput} disabled={!saveTitle.trim() || isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibrarySkillRunnerPage;
