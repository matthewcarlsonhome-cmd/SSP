// Dynamic Skill Runner Page - Executes generated skills

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { executeDynamicSkill } from '../lib/skills/dynamic';
import type { ChatGPTModelType } from '../lib/chatgpt';
import { db } from '../lib/storage';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { publishSkillToCommunity, isSupabaseConfigured } from '../lib/supabase';
import type { DynamicSkill, SkillExecution, DynamicFormInput, Workspace } from '../lib/storage/types';
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
  Share2,
  Users
} from 'lucide-react';
import { TestDataPanel } from '../components/TestDataPanel';
import { SkillGrading } from '../components/SkillGrading';

const DynamicSkillRunnerPage: React.FC = () => {
  const { workspaceId, skillId } = useParams<{ workspaceId: string; skillId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { selectedApi, setSelectedApi } = useAppContext();
  const { user, isConfigured: isAuthConfigured, signInWithGoogle, isAdmin } = useAuth();

  const [skill, setSkill] = useState<DynamicSkill | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<Record<string, unknown>>({});
  const [apiKey, setApiKey] = useState('');
  const [chatgptModel, setChatgptModel] = useState<ChatGPTModelType>('gpt-4o-mini');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showPrompts, setShowPrompts] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Grading state
  const [showGrading, setShowGrading] = useState(false);
  const [executionIdForGrading, setExecutionIdForGrading] = useState<string>('');

  // Load skill and workspace
  useEffect(() => {
    const loadData = async () => {
      if (!skillId) return;

      try {
        const s = await db.getDynamicSkill(skillId);
        setSkill(s || null);

        if (s) {
          // Initialize form state with defaults
          const initial: Record<string, unknown> = {};
          s.inputs.forEach(input => {
            initial[input.id] = input.defaultValue ?? (input.type === 'checkbox' ? false : '');
          });
          setFormState(initial);

          // Load workspace for role info
          if (s.workspaceId) {
            const ws = await db.getWorkspace(s.workspaceId);
            setWorkspace(ws || null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [skillId]);

  // Load stored API key when provider changes
  useEffect(() => {
    const storedKey = getApiKey(selectedApi as 'gemini' | 'claude' | 'chatgpt');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setApiKey('');
    }
  }, [selectedApi]);

  const handleInputChange = (id: string, value: unknown) => {
    setFormState(prev => ({ ...prev, [id]: value }));
  };

  // Load test data into form
  const handleLoadTestData = (inputPayload: Record<string, string>) => {
    setFormState(prev => ({ ...prev, ...inputPayload }));
  };

  // Reset form to blank
  const handleResetForm = () => {
    if (skill) {
      const initial: Record<string, unknown> = {};
      skill.inputs.forEach(input => {
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
    if (!skill) return false;

    for (const input of skill.inputs) {
      if (input.validation?.required && !formState[input.id]) {
        addToast(`${input.label} is required`, 'error');
        return false;
      }
    }
    return true;
  };

  const handleRun = async () => {
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
        chatgptModel,
        keyMode: 'personal', // Dynamic runner uses personal keys
      })) {
        fullOutput += chunk;
        setOutput(fullOutput);
      }

      // Update execution count
      await db.updateSkillExecutionCount(skill.id);

      // Save execution to history
      const execution: SkillExecution = {
        id: crypto.randomUUID(),
        skillId: skill.id,
        skillSource: 'dynamic',
        workspaceId: skill.workspaceId,
        createdAt: new Date().toISOString(),
        inputs: formState,
        output: fullOutput,
        model: selectedApi as 'gemini' | 'claude',
        durationMs: Date.now() - (startTime || Date.now()),
      };
      await db.saveExecution(execution);

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
    a.download = `${skill?.name.toLowerCase().replace(/\s+/g, '-') || 'skill'}-output.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Downloaded!', 'success');
  };

  const downloadPrompts = () => {
    if (!skill) return;

    const promptExport = {
      skillName: skill.name,
      skillDescription: skill.description,
      category: skill.category,
      exportedAt: new Date().toISOString(),
      prompts: {
        systemInstruction: skill.prompts.systemInstruction,
        userPromptTemplate: skill.prompts.userPromptTemplate,
        outputFormat: skill.prompts.outputFormat,
      },
      config: skill.config,
      inputs: skill.inputs.map(input => ({
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
    a.download = `${skill.name.toLowerCase().replace(/\s+/g, '-')}-prompt.json`;
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

  const handleShareToCommunity = async () => {
    if (!skill) return;

    if (!isAuthConfigured) {
      addToast('Community features are not configured', 'error');
      return;
    }

    if (!user) {
      try {
        await signInWithGoogle();
        addToast('Please try sharing again after signing in', 'info');
      } catch {
        addToast('Failed to sign in', 'error');
      }
      return;
    }

    setIsSharing(true);
    try {
      await publishSkillToCommunity({
        name: skill.name,
        description: skill.description,
        longDescription: skill.longDescription,
        category: skill.category,
        estimatedTimeSaved: skill.estimatedTimeSaved,
        roleTitle: workspace?.jdAnalysis?.role?.title,
        roleDepartment: workspace?.jdAnalysis?.role?.department,
        roleLevel: workspace?.jdAnalysis?.role?.level,
        systemInstruction: skill.prompts.systemInstruction,
        userPromptTemplate: skill.prompts.userPromptTemplate,
        outputFormat: skill.prompts.outputFormat,
        recommendedModel: skill.config?.recommendedModel ?? 'any',
        maxTokens: skill.config?.maxTokens ?? 4096,
        temperature: skill.config?.temperature ?? 0.4,
        inputs: skill.inputs,
      });

      addToast('Skill shared to community!', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share skill';
      addToast(message, 'error');
    } finally {
      setIsSharing(false);
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

  if (!skill) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Skill Not Found</h1>
        <Button onClick={() => navigate(workspaceId ? `/workspace/${workspaceId}` : '/')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-1 lg:sticky lg:top-24 self-start">
          <div className="rounded-xl border bg-card p-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(workspaceId ? `/workspace/${workspaceId}` : '/')}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Workspace
            </Button>

            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${skill.theme.secondary}`}>
              <Sparkles className={`h-7 w-7 ${skill.theme.primary}`} />
            </div>

            <h1 className="text-2xl font-bold mt-4">{skill.name}</h1>
            <p className="text-muted-foreground text-sm mt-2">{skill.longDescription}</p>

            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Saves {skill.estimatedTimeSaved}</span>
            </div>

            {skill.executionCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Used {skill.executionCount} times
              </p>
            )}

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

            {/* Share to Community */}
            {isSupabaseConfigured() && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleShareToCommunity}
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 mr-2" />
                      {user ? 'Share to Community' : 'Sign in to Share'}
                    </>
                  )}
                </Button>
                {!user && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Help others by sharing this skill
                  </p>
                )}
              </div>
            )}
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
                    onClick={() => copyPromptToClipboard(skill.prompts.systemInstruction, 'System instruction')}
                    className="h-6 text-xs"
                  >
                    <Clipboard className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                    {skill.prompts.systemInstruction}
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
                    onClick={() => copyPromptToClipboard(skill.prompts.userPromptTemplate, 'User prompt template')}
                    className="h-6 text-xs"
                  >
                    <Clipboard className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                    {skill.prompts.userPromptTemplate}
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
                    <span className="text-muted-foreground">Output:</span> {skill.prompts.outputFormat}
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Model:</span> {skill.config?.recommendedModel ?? 'any'}
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Max Tokens:</span> {skill.config?.maxTokens ?? 4096}
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">Temperature:</span> {skill.config?.temperature ?? 0.4}
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
            skillId={skill.id}
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
              {selectedApi === 'chatgpt' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">ChatGPT Model</label>
                  <Select
                    value={chatgptModel}
                    onChange={(e) => setChatgptModel(e.target.value as ChatGPTModelType)}
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini (Fast)</option>
                    <option value="gpt-4o">GPT-4o (Most Capable)</option>
                    <option value="o1-mini">o1 Mini (Reasoning)</option>
                    <option value="o1-preview">o1 Preview (Advanced)</option>
                  </Select>
                </div>
              )}
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
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            {skill.inputs.map(renderInput)}
          </div>

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
                    <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={downloadOutput}>
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

          {/* Skill Grading */}
          {showGrading && output && !error && skill && !isRunning && (
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
        </div>
      </div>
    </div>
  );
};

export default DynamicSkillRunnerPage;
