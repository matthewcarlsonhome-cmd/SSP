/**
 * SkillRunnerPage - Skill Execution Page (Refactored)
 *
 * Uses shared layout components for consistent UI across all runners.
 * Features:
 * - RunnerLayout for standardized grid structure
 * - TestDataPanel with fixture metadata
 * - FormattedOutput for LLM response rendering
 * - useRequestTiming for performance observability
 * - Responsive design for demo presentation
 */

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SKILLS } from '../lib/skills';
import { Skill, FormInput as FormInputType, ApiProviderType } from '../types';
import { runSkillStream as runGeminiSkillStream } from '../lib/gemini';
import { runSkillStream as runClaudeSkillStream } from '../lib/claude';
import { runSkillStream as runChatGPTSkillStream, ChatGPTModelType } from '../lib/chatgpt';
import { callAIProxy, streamAIProxy } from '../lib/platformKeys';
import { useToast } from '../hooks/useToast';
import { useAppContext } from '../hooks/useAppContext';
import { useAuth } from '../hooks/useAuth';
import { useRequestTiming } from '../hooks/useRequestTiming';
import { usePortalMode } from '../hooks/usePortalMode';
import { streamPortalProxy, PORTAL_MODE_INFO } from '../lib/portalProxy';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { Progress } from '../components/ui/Progress';
import {
  RunnerLayout,
  InfoCard,
  ConfigPanel,
  OutputPanel,
  ActionFooter,
  FeatureList,
  SectionDivider,
} from '../components/RunnerLayout';
import { TestDataPanel } from '../components/TestDataPanel';
import { FormattedOutput, Citations } from '../components/FormattedOutput';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { SkeletonRunnerPage } from '../components/ui/Skeleton';
import { ProviderConfigStatus, useProviderConfig } from '../components/ProviderConfig';
import {
  Sparkles,
  AlertTriangle,
  Upload,
  Star,
  Code,
  ChevronDown,
  ChevronUp,
  FileCode,
  Download,
  Clipboard,
} from 'lucide-react';
import { db } from '../lib/storage/indexeddb';
import type { SavedOutput, FavoriteSkill, SkillExecution } from '../lib/storage/types';
import { trackSkillUsage } from '../lib/admin';
import { recordUsage, createUsageRecordFromExecution } from '../lib/usageLedger';
import { typography, cards, cn } from '../lib/theme';
import { ReadyToRunChecklist } from '../components/ReadyToRunChecklist';
import { ExecutionSummary } from '../components/ExecutionSummary';
import { SkillGrading } from '../components/SkillGrading';
import { InlineProviderSelector } from '../components/InlineProviderSelector';
import { checkPlatformStatus, type PlatformStatus } from '../lib/platformProxy';
import { hasStoredKey } from '../lib/apiKeyStorage';
import { calculateCost } from '../lib/billing';
import { logger } from '../lib/logger';

// ═══════════════════════════════════════════════════════════════════════════
// MEMOIZED FORM INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface FormFieldProps {
  input: FormInputType;
  value: string | boolean;
  onChange: (id: string, value: string | boolean) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>, inputId: string) => void;
  disabled?: boolean;
}

const FormField = memo<FormFieldProps>(({
  input,
  value,
  onChange,
  onFileChange,
  disabled = false,
}) => {
  const isUploadable = input.type === 'textarea' &&
    ['jobDescription', 'userBackground', 'additionalContext'].includes(input.id);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        {input.type !== 'checkbox' && (
          <label htmlFor={input.id} className={cn(typography.label)}>
            {input.label}
            {input.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {isUploadable && (
          <label className="text-sm font-medium text-primary hover:underline cursor-pointer flex items-center gap-1">
            <Upload className="h-3 w-3" />
            Upload File
            <input
              type="file"
              className="hidden"
              accept=".txt,.md"
              onChange={(e) => onFileChange(e, input.id)}
              disabled={disabled}
            />
          </label>
        )}
      </div>

      {input.type === 'text' && (
        <Input
          id={input.id}
          placeholder={input.placeholder}
          value={value as string}
          onChange={(e) => onChange(input.id, e.target.value)}
          required={input.required}
          disabled={disabled}
        />
      )}

      {input.type === 'textarea' && (
        <Textarea
          id={input.id}
          placeholder={input.placeholder}
          value={value as string}
          onChange={(e) => onChange(input.id, e.target.value)}
          required={input.required}
          rows={input.rows || 5}
          disabled={disabled}
        />
      )}

      {input.type === 'select' && (
        <Select
          id={input.id}
          value={value as string}
          onChange={(e) => onChange(input.id, e.target.value)}
          required={input.required}
          disabled={disabled}
        >
          {input.options?.map((opt) => {
            // Handle both string options and object options { value, label }
            const optValue = typeof opt === 'string' ? opt : (opt as { value: string; label: string }).value;
            const optLabel = typeof opt === 'string' ? opt : (opt as { value: string; label: string }).label;
            return (
              <option key={optValue} value={optValue}>{optLabel}</option>
            );
          })}
        </Select>
      )}

      {input.type === 'checkbox' && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={input.id}
            checked={!!value}
            onCheckedChange={(checked) => onChange(input.id, !!checked)}
            disabled={disabled}
          />
          <label
            htmlFor={input.id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {input.label}
          </label>
        </div>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const SkillRunnerPage: React.FC = () => {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const {
    resumeText,
    jobDescriptionText,
    additionalInfoText,
    refreshProfileFromStorage,
  } = useAppContext();
  const { user, appUser, isAdmin } = useAuth();
  const timing = useRequestTiming();

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

  // Provider configuration (unified key mode, provider, model selection)
  const {
    state: providerState,
    setProvider,
    setModel,
    setKeyMode,
    setApiKey,
    canRun,
    runStatus,
    availableModels,
  } = useProviderConfig();

  const skill: Skill | undefined = useMemo(
    () => (skillId ? SKILLS[skillId] : undefined),
    [skillId]
  );

  // Form state
  const [formState, setFormState] = useState<Record<string, any>>({});

  // Execution state
  const [output, setOutput] = useState('');
  const [citations, setCitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // UI state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [outputSaved, setOutputSaved] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);

  // Platform status for inline selector
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);

  // Execution summary data
  const [executionComplete, setExecutionComplete] = useState(false);
  const [executionDuration, setExecutionDuration] = useState<number | undefined>();
  const [executionTokens, setExecutionTokens] = useState<{ input: number; output: number } | undefined>();
  const [executionCost, setExecutionCost] = useState<number | undefined>();

  // Grading state
  const [showGrading, setShowGrading] = useState(false);
  const [executionIdForGrading, setExecutionIdForGrading] = useState<string>('');

  // Test data applied tracking
  const [testDataApplied, setTestDataApplied] = useState(false);

  // Initialize form state
  useEffect(() => {
    refreshProfileFromStorage();
  }, [refreshProfileFromStorage]);

  useEffect(() => {
    if (skill) {
      const initialFormState = skill.inputs.reduce((acc, input) => {
        if (input.id === 'userBackground') {
          acc[input.id] = resumeText;
        } else if (input.id === 'jobDescription') {
          acc[input.id] = jobDescriptionText;
        } else if (input.id === 'additionalContext') {
          acc[input.id] = additionalInfoText;
        } else if (input.type === 'select' && input.options && input.options.length > 0) {
          // Handle both string options and object options { value, label }
          const firstOpt = input.options[0];
          acc[input.id] = typeof firstOpt === 'string' ? firstOpt : (firstOpt as { value: string }).value;
        } else {
          acc[input.id] = input.type === 'checkbox' ? false : '';
        }
        return acc;
      }, {} as Record<string, any>);
      setFormState(initialFormState);
    }
  }, [skill, resumeText, jobDescriptionText, additionalInfoText]);

  // Check favorite status
  useEffect(() => {
    if (skillId) {
      db.isSkillFavorited(skillId).then(setIsFavorited);
    }
  }, [skillId]);

  // Reset saved state when output changes
  useEffect(() => {
    setOutputSaved(false);
  }, [output]);

  // Form handlers
  const handleInputChange = useCallback((id: string, value: string | boolean) => {
    setFormState((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleFileChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    inputId: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        handleInputChange(inputId, text);
        addToast(`File "${file.name}" loaded successfully.`, 'success');
      } else {
        addToast('Failed to read file content.', 'error');
      }
    };
    reader.onerror = () => {
      addToast(`Error reading file: ${reader.error}`, 'error');
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [handleInputChange, addToast]);

  // Fetch platform status on mount
  useEffect(() => {
    checkPlatformStatus().then(setPlatformStatus).catch((error) => {
      logger.error('Failed to check platform status', { error: error instanceof Error ? error.message : String(error) });
    });
  }, []);

  // Load test data
  const handleLoadTestData = useCallback((inputPayload: Record<string, string>) => {
    setFormState((prev) => ({ ...prev, ...inputPayload }));
    setTestDataApplied(true);
    addToast('Test data loaded into form fields', 'success');
  }, [addToast]);

  // Reset form
  const handleResetForm = useCallback(() => {
    if (skill) {
      const emptyState = skill.inputs.reduce((acc, input) => {
        acc[input.id] = input.type === 'checkbox' ? false : '';
        return acc;
      }, {} as Record<string, any>);
      setFormState(emptyState);
      setTestDataApplied(false);
      setExecutionComplete(false);
      addToast('Form reset to blank', 'success');
    }
  }, [skill, addToast]);

  // Validation
  const validateForm = useCallback((): boolean => {
    // Portal mode bypasses normal API key checks
    if (isPortalMode && isPortalAvailable) {
      // Portal mode is active, can run without personal key
    } else {
      // Check if we can run (either platform key or personal key available)
      if (!canRun && providerState.keyMode === 'personal' && !providerState.apiKey) {
        addToast('API Key is required.', 'error');
        return false;
      }
      if (!canRun && providerState.keyMode === 'platform') {
        addToast(runStatus.reason || 'Platform key not available.', 'error');
        return false;
      }
    }
    if (!skill) return false;
    for (const input of skill.inputs) {
      if (input.required && !formState[input.id]) {
        addToast(`${input.label} is required.`, 'error');
        return false;
      }
    }
    return true;
  }, [canRun, providerState, runStatus, skill, formState, addToast, isPortalMode, isPortalAvailable]);

  // Run skill
  const handleRunSkill = useCallback(async () => {
    if (!validateForm() || !skill) return;

    const { provider, model, keyMode, apiKey } = providerState;

    // Determine effective provider for portal mode
    const effectiveProvider = isPortalMode ? 'chatgpt' : provider;
    const effectiveModel = isPortalMode ? 'gpt-4o-mini' : model;

    // Start timing
    const requestId = timing.startRequest({
      skillId: skill.id,
      skillName: skill.name,
      provider: effectiveProvider,
    });

    setIsLoading(true);
    setOutput('');
    setCitations([]);
    setError(null);
    setProgress(0);
    setExecutionComplete(false);
    setExecutionDuration(undefined);
    setExecutionTokens(undefined);
    setExecutionCost(undefined);

    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 95));
    }, 200);

    try {
      const promptData = skill.generatePrompt(formState);
      let fullResponseText = '';
      const currentApiKey = apiKey;

      // Portal mode: Use portal proxy (no auth required)
      if (isPortalMode && isPortalAvailable) {
        const stream = streamPortalProxy({
          prompt: promptData.userPrompt,
          systemPrompt: promptData.systemInstruction,
          maxTokens: 2048, // Portal limit
          portalSlug: portalSlug || undefined,
        });

        for await (const chunk of stream) {
          timing.trackChunk(chunk.length);
          fullResponseText += chunk;
          setOutput(fullResponseText);
        }
      }
      // Platform key mode uses the AI proxy with streaming
      else if (keyMode === 'platform') {
        // Map provider and model to proxy model ID
        let proxyModel: string;
        if (provider === 'gemini') {
          proxyModel = 'gemini-2.0-flash';
        } else if (provider === 'claude') {
          proxyModel = model as string; // haiku, sonnet, opus
        } else {
          proxyModel = model as string; // gpt-4o-mini, gpt-4o, etc.
        }

        // Use streaming for real-time response
        const stream = streamAIProxy({
          model: proxyModel,
          prompt: promptData.userPrompt,
          systemPrompt: promptData.systemInstruction,
          maxTokens: 4096,
          temperature: 0.7,
        });

        for await (const chunk of stream) {
          timing.trackChunk(chunk.length);
          fullResponseText += chunk;
          setOutput(fullResponseText);
        }
      } else if (provider === 'gemini') {
        const result = await runGeminiSkillStream(currentApiKey, promptData, skill.useGoogleSearch);
        const stream = result && result.stream ? result.stream : result;
        if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') {
          throw new Error('Received an invalid response from the Gemini service.');
        }
        for await (const chunk of stream) {
          const text = typeof chunk.text === 'function' ? chunk.text() : chunk.text;
          if (text) {
            timing.trackChunk(text.length);
            fullResponseText += text;
            setOutput(fullResponseText);
          }
        }
        // Get citations
        try {
          const finalResponse = await result.response;
          if (finalResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            setCitations(finalResponse.candidates[0].groundingMetadata.groundingChunks);
          }
        } catch {
          // Citations may not be available
        }
      } else if (provider === 'claude') {
        const claudeModel = model as 'haiku' | 'sonnet' | 'opus';
        const response = await runClaudeSkillStream(currentApiKey, promptData, claudeModel);
        if (!response.body) throw new Error('Response body is null');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.substring(6);
              if (jsonStr.trim() === '[DONE]') break;
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.type === 'content_block_delta' && parsed.delta.type === 'text_delta') {
                  timing.trackChunk(parsed.delta.text.length);
                  fullResponseText += parsed.delta.text;
                  setOutput(fullResponseText);
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
        }
      } else if (provider === 'chatgpt') {
        const chatgptModel = model as ChatGPTModelType;
        const response = await runChatGPTSkillStream(currentApiKey, promptData, chatgptModel);
        if (!response.body) throw new Error('Response body is null');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.substring(6);
              if (jsonStr.trim() === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  timing.trackChunk(content.length);
                  fullResponseText += content;
                  setOutput(fullResponseText);
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
        }
      } else {
        throw new Error(`API provider "${provider}" is not supported yet.`);
      }

      // Complete timing
      const timingResult = timing.completeRequest();
      const durationMs = Date.now() - startTime;

      // Save execution to history
      const execution: SkillExecution = {
        id: crypto.randomUUID(),
        skillId: skill.id,
        skillName: skill.name,
        skillSource: 'static',
        createdAt: new Date().toISOString(),
        inputs: formState,
        output: fullResponseText,
        model: provider as 'gemini' | 'claude',
        durationMs,
      };
      await db.saveExecution(execution);

      // Record usage for billing
      const usageRecord = createUsageRecordFromExecution({
        userId: appUser?.id || user?.id || null,
        userEmail: appUser?.email || user?.email,
        skillId: skill.id,
        skillName: skill.name,
        provider,
        model,
        inputText: promptData.userPrompt,
        outputText: fullResponseText,
        billingMode: keyMode,
        durationMs,
        success: true,
      });
      await recordUsage(usageRecord);

      // Track usage
      if (appUser) {
        trackSkillUsage(appUser.id, appUser.email, skill.id, skill.name, 'static');
      } else if (user) {
        trackSkillUsage(user.id, user.email || 'anonymous', skill.id, skill.name, 'static');
      }

      // Populate execution summary
      const estimatedInputTokens = Math.ceil(promptData.userPrompt.length / 4);
      const estimatedOutputTokens = Math.ceil(fullResponseText.length / 4);
      const costEstimate = calculateCost(model, estimatedInputTokens, estimatedOutputTokens);
      setExecutionDuration(durationMs / 1000);
      setExecutionTokens({ input: estimatedInputTokens, output: estimatedOutputTokens });
      setExecutionCost(costEstimate.totalCost / 100); // Convert cents to dollars
      setExecutionComplete(true);

      // Enable grading
      setExecutionIdForGrading(crypto.randomUUID());
      setShowGrading(true);
    } catch (e: any) {
      timing.failRequest(e);
      setError(e.message || 'An unknown error occurred.');
      addToast(e.message || 'An unknown error occurred.', 'error');
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
      setIsLoading(false);
    }
  }, [
    validateForm,
    skill,
    timing,
    providerState,
    formState,
    appUser,
    user,
    addToast,
    isPortalMode,
    isPortalAvailable,
    portalSlug,
  ]);

  // Output actions
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(output);
    addToast('Copied to clipboard!', 'success');
  }, [output, addToast]);

  const downloadTextFile = useCallback(() => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill?.id || 'skill'}-output.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Text file downloaded.', 'success');
  }, [output, skill, addToast]);

  const handleSaveOutput = useCallback(async () => {
    if (!skill || !saveTitle.trim()) return;
    setIsSaving(true);
    try {
      const savedOutput: SavedOutput = {
        id: crypto.randomUUID(),
        title: saveTitle.trim(),
        skillId: skill.id,
        skillName: skill.name,
        skillSource: 'static',
        output: output,
        inputs: formState,
        model: providerState.provider as 'gemini' | 'claude',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
      };
      await db.saveOutput(savedOutput);
      setShowSaveDialog(false);
      setSaveTitle('');
      setOutputSaved(true);
      addToast('Output saved to dashboard!', 'success');
    } catch {
      addToast('Failed to save output', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [skill, saveTitle, output, formState, providerState.provider, addToast]);

  const handleToggleFavorite = useCallback(async () => {
    if (!skill) return;
    try {
      if (isFavorited) {
        await db.removeFavoriteBySkillId(skill.id);
        setIsFavorited(false);
        addToast('Removed from favorites', 'success');
      } else {
        const favorite: FavoriteSkill = {
          id: crypto.randomUUID(),
          skillId: skill.id,
          skillName: skill.name,
          skillDescription: skill.description,
          skillSource: 'static',
          category: skill.category,
          createdAt: new Date().toISOString(),
        };
        await db.addFavoriteSkill(favorite);
        setIsFavorited(true);
        addToast('Added to favorites!', 'success');
      }
    } catch {
      addToast('Failed to update favorite', 'error');
    }
  }, [skill, isFavorited, addToast]);

  // Prompt helpers
  const getCurrentPrompts = useCallback(() => {
    if (!skill) return { systemInstruction: '', userPrompt: '' };
    return skill.generatePrompt(formState);
  }, [skill, formState]);

  const copyPromptToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard!`, 'success');
  }, [addToast]);

  const downloadPrompts = useCallback(() => {
    if (!skill) return;
    const promptData = skill.generatePrompt(formState);
    const promptExport = {
      skillName: skill.name,
      skillDescription: skill.description,
      exportedAt: new Date().toISOString(),
      prompts: {
        systemInstruction: promptData.systemInstruction,
        userPrompt: promptData.userPrompt,
      },
      inputs: skill.inputs.map((input) => ({
        id: input.id,
        label: input.label,
        type: input.type,
        required: input.required || false,
        currentValue: formState[input.id] || '',
      })),
    };
    const blob = new Blob([JSON.stringify(promptExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill.id}-prompts.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Prompts exported!', 'success');
  }, [skill, formState, addToast]);

  // 404 state
  if (!skill) {
    return (
      <div className="container mx-auto max-w-4xl text-center py-20">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-3xl font-bold">Skill Not Found</h1>
        <p className="mt-2 text-muted-foreground">The skill you are looking for does not exist.</p>
        <Button onClick={() => navigate('/')} className="mt-6">
          Back to Home
        </Button>
      </div>
    );
  }

  const timingSummary = timing.getTimingSummary();

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <RunnerLayout
      backUrl="/"
      backLabel="Back to Home"
      sidebar={
        <>
          {/* Skill Info Card */}
          <InfoCard
            icon={skill.icon}
            iconBg={skill.theme.secondary}
            iconColor={skill.theme.primary}
            title={skill.name}
            description={skill.longDescription}
          >
            <FeatureList items={skill.whatYouGet} className="mt-4" />

            <SectionDivider />

            {/* Favorite button */}
            <Button
              variant={isFavorited ? 'secondary' : 'outline'}
              className="w-full"
              onClick={handleToggleFavorite}
            >
              <Star className={cn('h-4 w-4 mr-2', isFavorited && 'fill-current text-yellow-500')} />
              {isFavorited ? 'Favorited' : 'Add to Favorites'}
            </Button>

            {/* View Prompts Toggle - Admin Only */}
            {isAdmin && (
              <>
                <SectionDivider />
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
              </>
            )}
          </InfoCard>

          {/* Prompts Panel - Admin Only */}
          {isAdmin && showPrompts && (
            <div className={cn(cards.padded, 'space-y-4')}>
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
                    onClick={() => copyPromptToClipboard(getCurrentPrompts().systemInstruction, 'System instruction')}
                    className="h-6 text-xs"
                  >
                    <Clipboard className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                    {getCurrentPrompts().systemInstruction}
                  </pre>
                </div>
              </div>

              {/* User Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    User Prompt (with current inputs)
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyPromptToClipboard(getCurrentPrompts().userPrompt, 'User prompt')}
                    className="h-6 text-xs"
                  >
                    <Clipboard className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                    {getCurrentPrompts().userPrompt}
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground">
                  This prompt is generated based on your current form inputs.
                </p>
              </div>

              {/* Copy Both Button */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const prompts = getCurrentPrompts();
                    const fullPrompt = `=== SYSTEM INSTRUCTION ===\n\n${prompts.systemInstruction}\n\n=== USER PROMPT ===\n\n${prompts.userPrompt}`;
                    copyPromptToClipboard(fullPrompt, 'Full prompt');
                  }}
                >
                  <Clipboard className="h-4 w-4 mr-2" />
                  Copy Full Prompt (System + User)
                </Button>
              </div>
            </div>
          )}
        </>
      }
    >
      {/* Test Data Panel */}
      <TestDataPanel
        skillId={skillId}
        onLoadTestData={handleLoadTestData}
        onReset={handleResetForm}
        onExecute={handleRunSkill}
        isExecuting={isLoading}
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
        requiredInputs={skill.inputs
          .filter(input => input.required)
          .map(input => ({
            id: input.id,
            label: input.label,
            filled: !!formState[input.id],
          }))}
        hasTestData={true}
        testDataApplied={testDataApplied}
        onLoadTestData={() => {
          // This will trigger TestDataPanel load
        }}
        canRun={(isPortalMode && isPortalAvailable) || (canRun && skill.inputs.filter(i => i.required).every(i => !!formState[i.id]))}
      />

      {/* Form Inputs */}
      <div className="space-y-6">
        {skill.inputs.map((input) => (
          <FormField
            key={input.id}
            input={input}
            value={formState[input.id] || ''}
            onChange={handleInputChange}
            onFileChange={handleFileChange}
            disabled={isLoading}
          />
        ))}
      </div>

      {/* Run Button */}
      <ActionFooter>
        <Button
          size="lg"
          onClick={handleRunSkill}
          disabled={isLoading}
          className="min-w-[200px]"
        >
          {isLoading ? (
            <>
              <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Run Skill
            </>
          )}
        </Button>
      </ActionFooter>

      {/* Output Section */}
      {(isLoading || output || error) && (
        <OutputPanel
          title="Output"
          isLoading={isLoading}
          hasOutput={!!output}
          hasError={!!error}
        >
          <FormattedOutput
            output={output}
            isLoading={isLoading}
            progress={progress}
            error={error}
            onRetry={handleRunSkill}
            onCopy={copyToClipboard}
            onDownload={downloadTextFile}
            onSave={() => {
              setSaveTitle(`${skill.name} - ${new Date().toLocaleDateString()}`);
              setShowSaveDialog(true);
            }}
            isSaved={outputSaved}
            requestId={timingSummary?.requestId}
            timingInfo={timingSummary ? {
              timeToFirstToken: timingSummary.timeToFirstToken || undefined,
              totalDuration: timingSummary.totalDuration || undefined,
            } : undefined}
          />
        </OutputPanel>
      )}

      {/* Citations */}
      {citations.length > 0 && <Citations citations={citations} />}

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
          onDownload={downloadTextFile}
          onSave={() => {
            setSaveTitle(`${skill.name} - ${new Date().toLocaleDateString()}`);
            setShowSaveDialog(true);
          }}
          onRunAgain={handleRunSkill}
          isSaved={outputSaved}
        />
      )}

      {/* Skill Grading */}
      {showGrading && executionComplete && output && !error && skill && (
        <SkillGrading
          skillId={skill.id}
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

      {/* Save Output Dialog */}
      {showSaveDialog && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowSaveDialog(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-xl border shadow-lg p-6 z-50">
            <h3 className="text-lg font-semibold mb-4">Save Output to Dashboard</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="save-title" className={typography.label}>
                  Title
                </label>
                <Input
                  id="save-title"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Enter a title for this output"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveOutput} disabled={isSaving || !saveTitle.trim()}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </RunnerLayout>
  );
};

export default SkillRunnerPage;
