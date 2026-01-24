// Community Skill Runner Page - Run skills directly from the community library

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { executeDynamicSkill } from '../lib/skills/dynamic';
import type { ChatGPTModelType } from '../lib/chatgpt';
import { incrementSkillUseCount, rateSkill, type CommunitySkill } from '../lib/supabase';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import type { DynamicSkill, DynamicFormInput, SavedOutput, SkillExecution } from '../lib/storage/types';
import { db } from '../lib/storage/indexeddb';
import { getApiKey } from '../lib/apiKeyStorage';
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
  KeyRound,
  Loader2,
  Clock,
  Code,
  ChevronDown,
  ChevronUp,
  FileCode,
  Users,
  Star,
  Briefcase,
  Save,
  Check,
} from 'lucide-react';
import { TestDataPanel } from '../components/TestDataPanel';
import { SkillGrading } from '../components/SkillGrading';
import { logger } from '../lib/logger';

// Theme palette for display
const THEME = {
  primary: 'text-purple-400',
  secondary: 'bg-purple-900/20',
  gradient: 'from-purple-500/20 to-transparent',
};

const CommunitySkillRunnerPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { selectedApi, setSelectedApi } = useAppContext();
  const { user, isAdmin } = useAuth();

  const [communitySkill, setCommunitySkill] = useState<CommunitySkill | null>(null);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<Record<string, unknown>>({});
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isRating, setIsRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [claudeModel, setClaudeModel] = useState<'haiku' | 'sonnet' | 'opus'>('haiku');
  const [chatgptModel, setChatgptModel] = useState<ChatGPTModelType>('gpt-4o-mini');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showPrompts, setShowPrompts] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [outputSaved, setOutputSaved] = useState(false);

  // Grading state
  const [showGrading, setShowGrading] = useState(false);
  const [executionIdForGrading, setExecutionIdForGrading] = useState<string>('');

  // Load skill from sessionStorage
  useEffect(() => {
    const loadSkill = () => {
      try {
        const stored = sessionStorage.getItem('communitySkillToRun');
        if (stored) {
          const skill = JSON.parse(stored) as CommunitySkill;
          setCommunitySkill(skill);

          // Initialize form state with defaults
          const inputs = (skill.inputs as DynamicFormInput[]) || [];
          const initial: Record<string, unknown> = {};
          inputs.forEach(input => {
            initial[input.id] = input.defaultValue ?? (input.type === 'checkbox' ? false : '');
          });
          setFormState(initial);
        }
      } catch (e) {
        logger.error('Failed to load community skill', { error: e instanceof Error ? e.message : String(e) });
      } finally {
        setLoading(false);
      }
    };

    loadSkill();
  }, []);

  // Load stored API key when provider changes
  useEffect(() => {
    const storedKey = getApiKey(selectedApi as 'gemini' | 'claude' | 'chatgpt');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setApiKey('');
    }
  }, [selectedApi]);

  // Convert community skill to format needed for execution
  const getExecutableSkill = (): DynamicSkill | null => {
    if (!communitySkill) return null;

    return {
      id: communitySkill.id,
      workspaceId: '',
      version: 1,
      createdAt: communitySkill.created_at || new Date().toISOString(),
      updatedAt: communitySkill.updated_at || new Date().toISOString(),
      name: communitySkill.name,
      description: communitySkill.description || '',
      longDescription: communitySkill.long_description || '',
      category: communitySkill.category as DynamicSkill['category'],
      estimatedTimeSaved: communitySkill.estimated_time_saved || '',
      theme: THEME,
      inputs: (communitySkill.inputs as DynamicFormInput[]) || [],
      prompts: {
        systemInstruction: communitySkill.system_instruction,
        userPromptTemplate: communitySkill.user_prompt_template,
        outputFormat: (communitySkill.output_format as 'markdown' | 'json' | 'table') || 'markdown',
      },
      config: {
        recommendedModel: (communitySkill.recommended_model as 'gemini' | 'claude' | 'any') || 'any',
        useWebSearch: false,
        maxTokens: communitySkill.max_tokens || 4096,
        temperature: communitySkill.temperature || 0.4,
      },
      executionCount: communitySkill.use_count || 0,
    };
  };

  const handleInputChange = (id: string, value: unknown) => {
    setFormState(prev => ({ ...prev, [id]: value }));
  };

  // Load test data into form
  const handleLoadTestData = (inputPayload: Record<string, string>) => {
    setFormState(prev => ({ ...prev, ...inputPayload }));
  };

  // Reset form to blank
  const handleResetForm = () => {
    if (communitySkill) {
      const inputs = (communitySkill.inputs as DynamicFormInput[]) || [];
      const initial: Record<string, unknown> = {};
      inputs.forEach(input => {
        initial[input.id] = input.defaultValue ?? (input.type === 'checkbox' ? false : '');
      });
      setFormState(initial);
    }
  };

  const validateForm = (): boolean => {
    if (!apiKey) {
      addToast('API Key is required', 'error');
      return false;
    }
    if (!communitySkill) return false;

    const inputs = (communitySkill.inputs as DynamicFormInput[]) || [];
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

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 95));
    }, 200);

    try {
      let fullOutput = '';

      for await (const chunk of executeDynamicSkill({
        skill,
        formInputs: formState,
        apiKey,
        provider: selectedApi as 'gemini' | 'claude' | 'chatgpt',
        claudeModel,
        chatgptModel,
        keyMode: 'personal', // Community runner uses personal keys only
      })) {
        fullOutput += chunk;
        setOutput(fullOutput);
      }

      // Increment use count in Supabase
      if (communitySkill) {
        await incrementSkillUseCount(communitySkill.id);
      }

      // Save execution to history
      if (communitySkill && startTime) {
        const execution: SkillExecution = {
          id: crypto.randomUUID(),
          skillId: communitySkill.id,
          skillName: communitySkill.name,
          skillSource: 'community',
          createdAt: new Date().toISOString(),
          inputs: formState,
          output: fullOutput,
          model: selectedApi as 'gemini' | 'claude',
          durationMs: Date.now() - startTime,
        };
        await db.saveExecution(execution);
      }

      setProgress(100);

      // Enable grading
      setExecutionIdForGrading(crypto.randomUUID());
      setShowGrading(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(message);
      addToast(message, 'error');
    } finally {
      clearInterval(progressInterval);
      setIsRunning(false);
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
    a.download = `${communitySkill?.name.toLowerCase().replace(/\s+/g, '-') || 'skill'}-output.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Downloaded!', 'success');
  };

  const downloadPrompts = () => {
    if (!communitySkill) return;

    const promptExport = {
      skillName: communitySkill.name,
      skillDescription: communitySkill.description,
      category: communitySkill.category,
      exportedAt: new Date().toISOString(),
      prompts: {
        systemInstruction: communitySkill.system_instruction,
        userPromptTemplate: communitySkill.user_prompt_template,
        outputFormat: communitySkill.output_format,
      },
      config: {
        recommendedModel: communitySkill.recommended_model,
        maxTokens: communitySkill.max_tokens,
        temperature: communitySkill.temperature,
      },
      inputs: ((communitySkill.inputs as DynamicFormInput[]) || []).map(input => ({
        id: input.id,
        label: input.label,
        type: input.type,
        placeholder: input.placeholder,
        required: input.validation?.required || false,
      })),
    };

    const blob = new Blob([JSON.stringify(promptExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${communitySkill.name.toLowerCase().replace(/\s+/g, '-')}-prompt.json`;
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
    if (!communitySkill || !saveTitle.trim()) return;

    setIsSaving(true);
    try {
      const savedOutput: SavedOutput = {
        id: crypto.randomUUID(),
        title: saveTitle.trim(),
        skillId: communitySkill.id,
        skillName: communitySkill.name,
        skillSource: 'community',
        output: output,
        inputs: formState,
        model: selectedApi as 'gemini' | 'claude',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false
      };
      await db.saveOutput(savedOutput);
      setShowSaveDialog(false);
      setSaveTitle('');
      setOutputSaved(true);
      addToast('Output saved to dashboard!', 'success');
    } catch (error) {
      addToast('Failed to save output', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getAverageRating = (): number => {
    if (!communitySkill || communitySkill.rating_count === 0) return 0;
    return communitySkill.rating_sum / communitySkill.rating_count;
  };

  const handleRate = async (rating: number) => {
    if (!communitySkill || !user) {
      addToast('Please sign in to rate skills', 'error');
      return;
    }

    setIsRating(true);
    try {
      await rateSkill(communitySkill.id, rating);
      setUserRating(rating);
      setHasRated(true);
      addToast('Rating submitted!', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rate skill';
      addToast(message, 'error');
    } finally {
      setIsRating(false);
    }
  };

  const renderInput = (input: DynamicFormInput) => {
    const value = formState[input.id];

    return (
      <div key={input.id} className="space-y-2">
        {input.type !== 'checkbox' && (
          <label htmlFor={input.id} className="text-sm font-medium">
            {input.label}
            {input.validation?.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {input.type === 'text' && (
          <Input
            id={input.id}
            placeholder={input.placeholder}
            value={String(value || '')}
            onChange={(e) => handleInputChange(input.id, e.target.value)}
          />
        )}

        {input.type === 'textarea' && (
          <Textarea
            id={input.id}
            placeholder={input.placeholder}
            value={String(value || '')}
            onChange={(e) => handleInputChange(input.id, e.target.value)}
            rows={5}
          />
        )}

        {input.type === 'select' && input.options && (
          <Select
            id={input.id}
            value={String(value || '')}
            onChange={(e) => handleInputChange(input.id, e.target.value)}
          >
            {input.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Select>
        )}

        {input.type === 'checkbox' && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={input.id}
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleInputChange(input.id, !!checked)}
            />
            <label htmlFor={input.id} className="text-sm font-medium">
              {input.label}
            </label>
          </div>
        )}

        {input.type === 'number' && (
          <Input
            id={input.id}
            type="number"
            placeholder={input.placeholder}
            value={String(value || '')}
            onChange={(e) => handleInputChange(input.id, Number(e.target.value))}
          />
        )}

        {input.helpText && (
          <p className="text-xs text-muted-foreground">{input.helpText}</p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Loading skill...</p>
      </div>
    );
  }

  if (!communitySkill) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Skill Not Found</h1>
        <p className="text-muted-foreground mt-2">
          The community skill could not be loaded. Please go back and try again.
        </p>
        <Button onClick={() => navigate('/community')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Community
        </Button>
      </div>
    );
  }

  const inputs = (communitySkill.inputs as DynamicFormInput[]) || [];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-1 lg:sticky lg:top-24 self-start">
          <div className="rounded-xl border bg-card p-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/community')}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Community
            </Button>

            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">Community Skill</span>
            </div>

            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${THEME.secondary}`}>
              <Sparkles className={`h-7 w-7 ${THEME.primary}`} />
            </div>

            <h1 className="text-2xl font-bold mt-4">{communitySkill.name}</h1>
            <p className="text-muted-foreground text-sm mt-2">
              {communitySkill.long_description || communitySkill.description}
            </p>

            {communitySkill.estimated_time_saved && (
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Saves {communitySkill.estimated_time_saved}</span>
              </div>
            )}

            {communitySkill.role_title && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span>{communitySkill.role_title}</span>
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span>{getAverageRating().toFixed(1)}</span>
                <span className="text-muted-foreground">({communitySkill.rating_count})</span>
              </div>
              <span className="text-muted-foreground">
                {communitySkill.use_count} uses
              </span>
            </div>

            {/* View Prompts Toggle - Admin Only */}
            {isAdmin && (
              <div className="mt-6 pt-4 border-t">
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
            )}

            {/* Rate This Skill */}
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-medium mb-2">Rate This Skill</h3>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={isRating}
                    className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= (hoverRating || userRating)
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {hasRated && (
                <p className="text-xs text-muted-foreground mt-2">
                  Thanks for rating!
                </p>
              )}
              {!user && (
                <p className="text-xs text-muted-foreground mt-2">
                  Sign in to rate this skill
                </p>
              )}
            </div>
          </div>

          {/* Prompts Panel - Admin Only */}
          {isAdmin && showPrompts && (
            <div className="mt-4 rounded-xl border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  Production Prompts
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
                    onClick={() => copyPromptToClipboard(communitySkill.system_instruction, 'System instruction')}
                    className="h-6 text-xs"
                  >
                    <Clipboard className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                    {communitySkill.system_instruction}
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
                    onClick={() => copyPromptToClipboard(communitySkill.user_prompt_template, 'User prompt template')}
                    className="h-6 text-xs"
                  >
                    <Clipboard className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                    {communitySkill.user_prompt_template}
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground">
                  Variables like <code className="bg-muted px-1 rounded">{'{{inputId}}'}</code> are replaced with form values at runtime.
                </p>
              </div>

              {/* Config */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Configuration
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Output:</span> {communitySkill.output_format}
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Model:</span> {communitySkill.recommended_model}
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Max Tokens:</span> {communitySkill.max_tokens}
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Temperature:</span> {communitySkill.temperature}
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Test Data Panel */}
          <TestDataPanel
            skillId={communitySkill.id}
            onLoadTestData={handleLoadTestData}
            onReset={handleResetForm}
            onExecute={handleRun}
            isExecuting={isRunning}
          />

          {/* Config */}
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold mb-4">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">AI Provider</label>
                <Select
                  value={selectedApi}
                  onChange={(e) => setSelectedApi(e.target.value as 'gemini' | 'claude' | 'chatgpt')}
                >
                  <option value="gemini">Gemini</option>
                  <option value="claude">Claude</option>
                  <option value="chatgpt">ChatGPT</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  API Key *
                </label>
                <Input
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              {selectedApi === 'claude' && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Claude Model</label>
                  <Select
                    value={claudeModel}
                    onChange={(e) => setClaudeModel(e.target.value as 'haiku' | 'sonnet' | 'opus')}
                  >
                    <option value="haiku">Haiku (Fastest, Most Cost-Effective)</option>
                    <option value="sonnet">Sonnet (Balanced Speed & Quality)</option>
                    <option value="opus">Opus (Most Capable, Slowest)</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {claudeModel === 'haiku' && 'Best for quick tasks and high-volume usage.'}
                    {claudeModel === 'sonnet' && 'Great balance of speed and intelligence for most tasks.'}
                    {claudeModel === 'opus' && 'Best for complex reasoning and nuanced outputs.'}
                  </p>
                </div>
              )}
              {selectedApi === 'chatgpt' && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">ChatGPT Model</label>
                  <Select
                    value={chatgptModel}
                    onChange={(e) => setChatgptModel(e.target.value as ChatGPTModelType)}
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini (Fast, Cost-Effective)</option>
                    <option value="gpt-4o">GPT-4o (Most Capable)</option>
                    <option value="o1-mini">o1 Mini (Reasoning)</option>
                    <option value="o1-preview">o1 Preview (Advanced Reasoning)</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {chatgptModel === 'gpt-4o-mini' && 'Best for quick tasks and high-volume usage.'}
                    {chatgptModel === 'gpt-4o' && 'Most capable model for complex tasks.'}
                    {chatgptModel === 'o1-mini' && 'Reasoning model for logic-intensive tasks.'}
                    {chatgptModel === 'o1-preview' && 'Advanced reasoning for complex problem-solving.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Form Inputs */}
          {inputs.length > 0 && (
            <div className="space-y-4">
              {inputs.map(renderInput)}
            </div>
          )}

          {/* Run Button */}
          <div className="text-center">
            <Button size="lg" onClick={handleRun} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
                  Running...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Run Skill
                </>
              )}
            </Button>
          </div>

          {/* Output */}
          {(isRunning || output || error) && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Output</h2>
              <div className="relative rounded-xl border bg-muted/50 min-h-[200px] p-1">
                {isRunning && (
                  <div className="p-4">
                    <Progress value={progress} className="w-full" />
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      AI is generating...
                    </p>
                  </div>
                )}

                {output && !isRunning && (
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSaveTitle(`${communitySkill.name} - ${new Date().toLocaleDateString()}`);
                        setShowSaveDialog(true);
                      }}
                      title="Save to Dashboard"
                      className={outputSaved ? 'text-green-500' : ''}
                    >
                      {outputSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={copyToClipboard} title="Copy">
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={downloadOutput} title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none p-4 overflow-x-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {output}
                  </ReactMarkdown>
                </div>

                {error && (
                  <div className="p-4 text-red-500 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    <p>Error: {error}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Skill Grading */}
      {showGrading && output && !error && communitySkill && !isRunning && (
        <SkillGrading
          skillId={communitySkill.id}
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
                <label htmlFor="save-title" className="text-sm font-medium">
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
    </div>
  );
};

export default CommunitySkillRunnerPage;
