/**
 * WorkflowRunnerPage.tsx - Multi-Step Workflow Execution
 *
 * This page runs pre-built workflows that chain multiple AI skills together.
 * Each workflow collects all inputs upfront, then executes skills in sequence,
 * passing outputs from one step as inputs to the next.
 *
 * WORKFLOW EXECUTION FLOW:
 * ========================
 * 1. User selects a workflow from HomePage or navigation
 * 2. All global inputs are collected in a single form
 * 3. Steps execute sequentially, with progress visualization
 * 4. Each step's output can feed into subsequent steps
 * 5. Final output package displays all results together
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Briefcase,
  MessageSquare,
  Mail,
  Play,
  CheckCircle,
  Circle,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Download,
  Clock,
  KeyRound,
  HelpCircle,
  GraduationCap,
  Search,
  Rocket,
  TrendingUp,
  Target,
  History,
  Star,
  Trash2,
  Import,
  X,
  Copy,
  Layers,
} from 'lucide-react';
import { WORKFLOWS } from '../lib/workflows';
import { SKILLS, interpolateTemplate } from '../lib/skills';
import { getAllLibrarySkills } from '../lib/skillLibrary';
import { db } from '../lib/storage/indexeddb';
import { buildExecutionGroups, hasParallelSteps } from '../lib/workflows/parallelExecutor';
import { evaluateCondition, describeCondition } from '../lib/workflows/conditions';
import type { Workflow, WorkflowStep, WorkflowGlobalInput, DynamicSkill, WorkflowExecution } from '../lib/storage/types';
import type { LibrarySkill } from '../lib/skillLibrary/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Progress } from '../components/ui/Progress';
import { useToast } from '../hooks/useToast';
import { useAppContext } from '../hooks/useAppContext';
import { runSkillStream as runGeminiSkillStream } from '../lib/gemini';
import { runSkillStream as runClaudeSkillStream } from '../lib/claude';
import { runSkillStream as runChatGPTSkillStream, ChatGPTModelType } from '../lib/chatgpt';
import type { ApiProviderType } from '../types';
import { TestDataBanner } from '../components/TestOutputButton';
import { ProviderConfigStatus, useProviderConfig } from '../components/ProviderConfig';
import { ReadyToRunChecklist } from '../components/ReadyToRunChecklist';
import { ExecutionSummary } from '../components/ExecutionSummary';
import { checkPlatformStatus, type PlatformStatus } from '../lib/platformProxy';
import { streamAIProxy } from '../lib/platformKeys';
import { calculateCost } from '../lib/billing';
import { recordUsage, createUsageRecordFromExecution } from '../lib/usageLedger';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../lib/logger';

// Icon mapping for workflows
const WORKFLOW_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Briefcase,
  MessageSquare,
  Mail,
  GraduationCap,
  Search,
  Rocket,
  TrendingUp,
  Target,
};

// Step status type
type StepStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped';

const WorkflowRunnerPage: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { resumeText, jobDescriptionText, refreshProfileFromStorage, userProfile } = useAppContext();
  const { user, appUser } = useAuth();

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

  // Get the workflow definition
  const workflow: Workflow | undefined = useMemo(() => {
    return workflowId ? WORKFLOWS[workflowId] : undefined;
  }, [workflowId]);

  // Form state for global inputs
  const [globalInputs, setGlobalInputs] = useState<Record<string, string>>({});

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
  const [stepOutputs, setStepOutputs] = useState<Record<string, string>>({});
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [overallProgress, setOverallProgress] = useState(0);

  // UI state
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showInputsSummary, setShowInputsSummary] = useState(false);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<WorkflowExecution[]>([]);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);

  // Platform status for ReadyToRunChecklist
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);

  // Execution summary data
  const [executionComplete, setExecutionComplete] = useState(false);
  const [executionDuration, setExecutionDuration] = useState<number | undefined>();
  const [executionTokens, setExecutionTokens] = useState<{ input: number; output: number } | undefined>();
  const [executionCost, setExecutionCost] = useState<number | undefined>();

  // Test data applied tracking
  const [testDataApplied, setTestDataApplied] = useState(false);

  // Load execution history for this workflow
  useEffect(() => {
    if (workflowId) {
      db.getWorkflowExecutionsByWorkflow(workflowId).then(setExecutionHistory);
    }
  }, [workflowId]);

  // Fetch platform status on mount
  useEffect(() => {
    checkPlatformStatus().then(setPlatformStatus).catch((error) => {
      logger.error('Failed to check platform status', { error: error instanceof Error ? error.message : String(error) });
    });
  }, []);

  // Refresh profile data on mount
  useEffect(() => {
    refreshProfileFromStorage();
  }, [refreshProfileFromStorage]);

  // Initialize form state with prefill values from user profile
  useEffect(() => {
    if (workflow) {
      const initialState: Record<string, string> = {};
      workflow.globalInputs.forEach((input) => {
        if (input.prefillFrom) {
          // Handle special cases first
          if (input.prefillFrom === 'resume' && resumeText) {
            initialState[input.id] = resumeText;
          } else if (input.prefillFrom === 'jobDescription' && jobDescriptionText) {
            initialState[input.id] = jobDescriptionText;
          } else {
            // Map prefillFrom to userProfile fields
            const profileFieldMap: Record<string, keyof typeof userProfile> = {
              fullName: 'fullName',
              email: 'email',
              phone: 'phone',
              location: 'location',
              linkedInUrl: 'linkedInUrl',
              portfolioUrl: 'portfolioUrl',
              professionalTitle: 'professionalTitle',
              yearsExperience: 'yearsExperience',
              targetRoles: 'targetRoles',
              targetIndustries: 'targetIndustries',
              currentCompany: 'currentCompany',
              currentTitle: 'currentTitle',
              keyAchievements: 'keyAchievements',
              highestDegree: 'highestDegree',
              university: 'university',
              certifications: 'certifications',
              technicalSkills: 'technicalSkills',
              softSkills: 'softSkills',
              languages: 'languages',
              careerGoals: 'careerGoals',
              salaryExpectations: 'salaryExpectations',
              workPreference: 'workPreference',
            };
            const profileField = profileFieldMap[input.prefillFrom];
            if (profileField && userProfile[profileField]) {
              initialState[input.id] = userProfile[profileField];
            } else {
              initialState[input.id] = '';
            }
          }
        } else {
          initialState[input.id] = '';
        }
      });
      setGlobalInputs(initialState);

      // Initialize step statuses
      const statuses: Record<string, StepStatus> = {};
      workflow.steps.forEach((step) => {
        statuses[step.id] = 'pending';
      });
      setStepStatuses(statuses);
    }
  }, [workflow, resumeText, jobDescriptionText, userProfile]);

  // Handle input changes
  const handleInputChange = (id: string, value: string) => {
    setGlobalInputs((prev) => ({ ...prev, [id]: value }));
  };

  // Load test data into form
  const handleLoadTestData = (inputPayload: Record<string, string>) => {
    setGlobalInputs((prev) => ({
      ...prev,
      ...inputPayload,
    }));
    setTestDataApplied(true);
    addToast('Test data loaded into form fields', 'success');
  };

  // Validate form before running
  const validateForm = (): boolean => {
    // Check if we can run (either platform key or personal key available)
    if (!canRun && providerState.keyMode === 'personal' && !providerState.apiKey) {
      addToast('API Key is required.', 'error');
      return false;
    }
    if (!canRun && providerState.keyMode === 'platform') {
      addToast(runStatus.reason || 'Platform key not available.', 'error');
      return false;
    }
    if (!workflow) return false;

    for (const input of workflow.globalInputs) {
      if (input.required && !globalInputs[input.id]?.trim()) {
        addToast(`${input.label} is required.`, 'error');
        return false;
      }
    }
    return true;
  };

  // Resolve input mapping to get actual value
  const resolveInputMapping = (
    step: WorkflowStep,
    inputId: string,
    currentOutputs: Record<string, string>
  ): string => {
    const mapping = step.inputMappings[inputId];
    if (!mapping) return '';

    switch (mapping.type) {
      case 'global':
        return globalInputs[mapping.inputId] || '';
      case 'previous':
        return currentOutputs[mapping.outputKey] || '';
      case 'static':
        return mapping.value;
      case 'computed':
        // Replace {{placeholders}} with actual values
        let template = mapping.template;
        // Replace global inputs
        Object.entries(globalInputs).forEach(([key, value]) => {
          template = template.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        });
        // Replace previous outputs
        Object.entries(currentOutputs).forEach(([key, value]) => {
          template = template.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        });
        return template;
      default:
        return '';
    }
  };

  // Execute a single step - supports both static skills and library skills
  const executeStep = async (
    step: WorkflowStep,
    currentOutputs: Record<string, string>
  ): Promise<string> => {
    // First try static skills
    const staticSkill = SKILLS[step.skillId];

    if (staticSkill) {
      // Execute static skill (original logic)
      const inputValues: Record<string, string> = {};
      staticSkill.inputs.forEach((input) => {
        inputValues[input.id] = resolveInputMapping(step, input.id, currentOutputs);
      });

      const promptData = staticSkill.generatePrompt(inputValues);
      let fullResponse = '';

      const { provider, model, keyMode, apiKey } = providerState;
      const currentApiKey = apiKey;

      // Handle platform key mode with streaming
      if (keyMode === 'platform') {
        let proxyModel: string;
        if (provider === 'gemini') {
          proxyModel = 'gemini-2.0-flash';
        } else if (provider === 'claude') {
          proxyModel = model as string;
        } else {
          proxyModel = model as string;
        }

        const stream = streamAIProxy({
          model: proxyModel,
          prompt: promptData.userPrompt,
          systemPrompt: promptData.systemInstruction,
          maxTokens: 4096,
          temperature: 0.7,
        });

        for await (const chunk of stream) {
          fullResponse += chunk;
        }
        return fullResponse;
      }

      if (provider === 'gemini') {
        const result = await runGeminiSkillStream(currentApiKey, promptData, staticSkill.useGoogleSearch);
        const stream = result && result.stream ? result.stream : result;
        if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') {
          throw new Error('Invalid response from Gemini service');
        }
        for await (const chunk of stream) {
          const text = typeof chunk.text === 'function' ? chunk.text() : chunk.text;
          if (text) {
            fullResponse += text;
          }
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
                  fullResponse += parsed.delta.text;
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
                  fullResponse += content;
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
        }
      }

      return fullResponse;
    }

    // Try library skill (role template skills)
    const allLibrarySkills = getAllLibrarySkills();
    const librarySkill = allLibrarySkills.find(s => s.id === step.skillId);

    if (librarySkill && librarySkill.source === 'role-template') {
      // Build input values from workflow mappings
      const inputValues: Record<string, string> = {};

      // Map workflow inputs to skill inputs
      Object.keys(step.inputMappings).forEach((inputId) => {
        inputValues[inputId] = resolveInputMapping(step, inputId, currentOutputs);
      });

      // Also include any skill inputs that might have defaults
      librarySkill.inputs?.forEach((input) => {
        if (!inputValues[input.id]) {
          inputValues[input.id] = resolveInputMapping(step, input.id, currentOutputs);
        }
      });

      // Interpolate the user prompt template
      const systemPrompt = librarySkill.prompts.systemInstruction;
      const userPrompt = interpolateTemplate(librarySkill.prompts.userPromptTemplate, inputValues);

      let fullResponse = '';

      const { provider, model, keyMode, apiKey } = providerState;
      const currentApiKey = apiKey;

      // Handle platform key mode with streaming
      if (keyMode === 'platform') {
        let proxyModel: string;
        if (provider === 'gemini') {
          proxyModel = 'gemini-2.0-flash';
        } else if (provider === 'claude') {
          proxyModel = model as string;
        } else {
          proxyModel = model as string;
        }

        const stream = streamAIProxy({
          model: proxyModel,
          prompt: userPrompt,
          systemPrompt: systemPrompt,
          maxTokens: 4096,
          temperature: 0.7,
        });

        for await (const chunk of stream) {
          fullResponse += chunk;
        }
        return fullResponse;
      }

      if (provider === 'gemini') {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(currentApiKey);
        const geminiModel = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          systemInstruction: systemPrompt,
        });

        const result = await geminiModel.generateContentStream({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: librarySkill.config?.temperature ?? 0.4,
            maxOutputTokens: Math.max(librarySkill.config?.maxTokens ?? 4096, 16384),
          },
        });

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            fullResponse += text;
          }
        }
      } else if (provider === 'claude') {
        const CLAUDE_MODELS = {
          haiku: 'claude-3-5-haiku-latest',
          sonnet: 'claude-3-5-sonnet-latest',
          opus: 'claude-3-opus-latest',
        };
        const claudeModel = model as 'haiku' | 'sonnet' | 'opus';

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': currentApiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: CLAUDE_MODELS[claudeModel],
            max_tokens: librarySkill.config?.maxTokens ?? 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
            stream: true,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Claude API error: ${error}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Response body is null');

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
                if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                  fullResponse += parsed.delta.text;
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
        }
      } else if (provider === 'chatgpt') {
        const chatgptModel = model as ChatGPTModelType;
        const response = await runChatGPTSkillStream(
          currentApiKey,
          { systemInstruction: systemPrompt, userPrompt },
          chatgptModel
        );
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
                  fullResponse += content;
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
        }
      }

      return fullResponse;
    }

    throw new Error(`Skill not found: ${step.skillId}`);
  };

  // Run the entire workflow
  const handleRunWorkflow = async () => {
    if (!validateForm() || !workflow) return;

    const executionId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    setCurrentExecutionId(executionId);

    setIsRunning(true);
    setCurrentStepIndex(0);
    setStepOutputs({});
    setStepErrors({});
    setOverallProgress(0);

    // Reset all step statuses
    const newStatuses: Record<string, StepStatus> = {};
    workflow.steps.forEach((step) => {
      newStatuses[step.id] = 'pending';
    });
    setStepStatuses(newStatuses);

    const outputs: Record<string, string> = {};
    const finalStatuses: Record<string, 'pending' | 'running' | 'completed' | 'skipped' | 'error'> = { ...newStatuses };
    const totalSteps = workflow.steps.length;
    let hasError = false;
    let completedCount = 0;

    // Build execution groups for parallel execution
    const executionGroups = buildExecutionGroups(workflow.steps);
    const stepMap = new Map<string, WorkflowStep>();
    workflow.steps.forEach((step) => stepMap.set(step.id, step));

    // Execute each group
    for (const group of executionGroups) {
      if (hasError) break;

      const groupSteps = group.stepIds.map((id) => stepMap.get(id)!).filter(Boolean);

      // Mark all steps in group as running
      groupSteps.forEach((step) => {
        setStepStatuses((prev) => ({ ...prev, [step.id]: 'running' }));
      });

      // Execute steps in parallel (with condition checking)
      const results = await Promise.allSettled(
        groupSteps.map(async (step) => {
          // Check condition if present
          if (step.condition) {
            const conditionMet = evaluateCondition(step.condition, outputs, workflow.steps);
            if (!conditionMet) {
              return { step, skipped: true, reason: describeCondition(step.condition) };
            }
          }

          try {
            const output = await executeStep(step, outputs);
            return { step, output, success: true };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { step, error: errorMessage, success: false };
          }
        })
      );

      // Process results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { step, output, success, error, skipped, reason } = result.value as {
            step: WorkflowStep;
            output?: string;
            success?: boolean;
            error?: string;
            skipped?: boolean;
            reason?: string;
          };

          if (skipped) {
            // Step was skipped due to condition
            setStepStatuses((prev) => ({ ...prev, [step.id]: 'skipped' }));
            finalStatuses[step.id] = 'skipped';
            completedCount++;
            addToast(`Skipped "${step.name}": ${reason}`, 'info');
          } else if (success && output) {
            outputs[step.outputKey] = output;
            setStepOutputs((prev) => ({ ...prev, [step.outputKey]: output }));
            setStepStatuses((prev) => ({ ...prev, [step.id]: 'completed' }));
            finalStatuses[step.id] = 'completed';
            setExpandedSteps((prev) => new Set([...prev, step.id]));
            completedCount++;
          } else {
            setStepErrors((prev) => ({ ...prev, [step.id]: error || 'Unknown error' }));
            setStepStatuses((prev) => ({ ...prev, [step.id]: 'error' }));
            finalStatuses[step.id] = 'error';
            hasError = true;
            addToast(`Step "${step.name}" failed: ${error}`, 'error');
          }
        } else {
          // Rejected promise
          const step = groupSteps.find((s) =>
            results.indexOf(result) === groupSteps.indexOf(s)
          );
          if (step) {
            setStepErrors((prev) => ({ ...prev, [step.id]: 'Execution failed' }));
            setStepStatuses((prev) => ({ ...prev, [step.id]: 'error' }));
            finalStatuses[step.id] = 'error';
            hasError = true;
          }
        }
      }

      // Update progress after each group
      setOverallProgress((completedCount / totalSteps) * 100);

      // Small delay between groups
      if (!hasError && group.groupIndex < executionGroups.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    setOverallProgress(100);
    setIsRunning(false);
    setCurrentStepIndex(-1);

    // Save execution to history
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: hasError ? 'error' : 'completed',
      currentStepIndex: workflow.steps.length - 1,
      globalInputs,
      stepOutputs: outputs,
      stepStatuses: finalStatuses,
      startedAt,
      completedAt: new Date().toISOString(),
      title: `${workflow.name} - ${new Date().toLocaleDateString()}`,
    };

    await db.saveWorkflowExecution(execution);
    setExecutionHistory((prev) => [execution, ...prev]);

    addToast(hasError ? 'Workflow completed with errors' : 'Workflow completed!', hasError ? 'warning' : 'success');
  };

  // Import execution from history
  const importExecution = (execution: WorkflowExecution) => {
    setGlobalInputs(execution.globalInputs);
    setStepOutputs(execution.stepOutputs);
    setStepStatuses(execution.stepStatuses);
    setCurrentExecutionId(execution.id);
    // Expand all completed steps
    const completedSteps = Object.entries(execution.stepStatuses)
      .filter(([, status]) => status === 'completed')
      .map(([stepId]) => stepId);
    setExpandedSteps(new Set(completedSteps));
    setShowHistory(false);
    setOverallProgress(100);
    addToast('Previous run imported!', 'success');
  };

  // Delete execution from history
  const deleteExecution = async (executionId: string) => {
    await db.deleteWorkflowExecution(executionId);
    setExecutionHistory((prev) => prev.filter((e) => e.id !== executionId));
    addToast('Run deleted from history', 'success');
  };

  // Toggle favorite on execution
  const toggleFavorite = async (execution: WorkflowExecution) => {
    const updated = { ...execution, isFavorite: !execution.isFavorite };
    await db.updateWorkflowExecution(execution.id, { isFavorite: updated.isFavorite });
    setExecutionHistory((prev) =>
      prev.map((e) => (e.id === execution.id ? updated : e))
    );
  };

  // Toggle step expansion
  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  // Copy all outputs to clipboard
  const copyAllOutputs = () => {
    if (!workflow) return;
    let fullOutput = `# ${workflow.name} Results\n\n`;
    workflow.steps.forEach((step) => {
      const output = stepOutputs[step.outputKey];
      if (output) {
        fullOutput += `## ${step.name}\n\n${output}\n\n---\n\n`;
      }
    });
    navigator.clipboard.writeText(fullOutput);
    addToast('All outputs copied to clipboard!', 'success');
  };

  // Download all outputs
  const downloadAllOutputs = () => {
    if (!workflow) return;
    let fullOutput = `# ${workflow.name} Results\n\n`;
    fullOutput += `Generated: ${new Date().toLocaleString()}\n\n`;
    workflow.steps.forEach((step) => {
      const output = stepOutputs[step.outputKey];
      if (output) {
        fullOutput += `## ${step.name}\n\n${output}\n\n---\n\n`;
      }
    });
    const blob = new Blob([fullOutput], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.id}-results.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Results downloaded!', 'success');
  };

  // Render input field
  const renderInput = (input: WorkflowGlobalInput) => {
    const value = globalInputs[input.id] || '';

    return (
      <div key={input.id} className="space-y-2">
        <label htmlFor={input.id} className="text-sm font-medium">
          {input.label}
          {input.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {input.helpText && (
          <p className="text-xs text-muted-foreground">{input.helpText}</p>
        )}
        {input.type === 'text' && (
          <Input
            id={input.id}
            placeholder={input.placeholder}
            value={value}
            onChange={(e) => handleInputChange(input.id, e.target.value)}
            required={input.required}
            disabled={isRunning}
          />
        )}
        {input.type === 'textarea' && (
          <Textarea
            id={input.id}
            placeholder={input.placeholder}
            value={value}
            onChange={(e) => handleInputChange(input.id, e.target.value)}
            required={input.required}
            rows={input.rows || 5}
            disabled={isRunning}
          />
        )}
        {input.type === 'select' && input.options && (
          <Select
            id={input.id}
            value={value}
            onChange={(e) => handleInputChange(input.id, e.target.value)}
            required={input.required}
            disabled={isRunning}
          >
            <option value="">Select an option...</option>
            {input.options.map((opt) => {
              // Handle both string options and object options { value, label }
              const optValue = typeof opt === 'string' ? opt : (opt as { value: string; label: string }).value;
              const optLabel = typeof opt === 'string' ? opt : (opt as { value: string; label: string }).label;
              return (
                <option key={optValue} value={optValue}>
                  {optLabel}
                </option>
              );
            })}
          </Select>
        )}
      </div>
    );
  };

  // Get step status icon
  const getStepStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'skipped':
        return <Circle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // 404 if workflow not found
  if (!workflow) {
    return (
      <div className="container mx-auto max-w-4xl text-center py-20">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-3xl font-bold">Workflow Not Found</h1>
        <p className="mt-2 text-muted-foreground">The workflow you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    );
  }

  const WorkflowIcon = WORKFLOW_ICONS[workflow.icon] || Briefcase;
  const hasCompletedSteps = Object.values(stepStatuses).some((s) => s === 'completed');

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-14 w-14 rounded-xl flex items-center justify-center bg-${workflow.color}-500/20`}>
              <WorkflowIcon className={`h-7 w-7 text-${workflow.color}-400`} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{workflow.name}</h1>
              <p className="text-muted-foreground">{workflow.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!workflow) return;
                const newName = `${workflow.name} (Copy)`;
                try {
                  await db.duplicateWorkflow(workflow, newName);
                  addToast(`Created custom workflow: ${newName}`, 'success');
                } catch {
                  addToast('Failed to duplicate workflow', 'error');
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Link to={`/workflow/${workflowId}/batch`}>
              <Button variant="outline">
                <Layers className="h-4 w-4 mr-2" />
                Batch Run
              </Button>
            </Link>
            {executionHistory.length > 0 && (
              <Button variant="outline" onClick={() => setShowHistory(true)}>
                <History className="h-4 w-4 mr-2" />
                History ({executionHistory.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Previous Runs</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {executionHistory.map((exec) => (
                <div
                  key={exec.id}
                  className="rounded-lg border bg-muted/30 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{exec.title || exec.workflowName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(exec.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(exec)}
                        className={exec.isFavorite ? 'text-yellow-500' : ''}
                      >
                        <Star className={`h-4 w-4 ${exec.isFavorite ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteExecution(exec.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      exec.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      exec.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {exec.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Object.values(exec.stepStatuses).filter(s => s === 'completed').length} / {Object.keys(exec.stepStatuses).length} steps
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => importExecution(exec)}
                  >
                    <Import className="h-4 w-4 mr-2" />
                    Load This Run
                  </Button>
                </div>
              ))}
              {executionHistory.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No previous runs yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Workflow Info & Inputs */}
        <div className="lg:col-span-1 space-y-6">
          {/* Workflow Details */}
          <div className="rounded-xl border bg-card p-6">
            <p className="text-sm text-muted-foreground mb-4">{workflow.longDescription}</p>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="h-4 w-4" />
              <span>Estimated time: {workflow.estimatedTime}</span>
            </div>

            <h3 className="font-semibold mb-2">What you'll get:</h3>
            <ul className="space-y-1">
              {workflow.outputs.map((output, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>{output}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Workflow Steps Overview */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4">Workflow Steps ({workflow.steps.length})</h3>
            <div className="space-y-3">
              {workflow.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    currentStepIndex === index
                      ? 'bg-blue-500/10 border border-blue-500/30'
                      : stepStatuses[step.id] === 'completed'
                      ? 'bg-green-500/5'
                      : 'bg-muted/30'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">{getStepStatusIcon(stepStatuses[step.id])}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{step.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Form & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Status - All configuration at /account */}
          <ProviderConfigStatus
            providerState={providerState}
            availableModels={availableModels}
            canRun={canRun}
          />

          {/* Test Data Banner */}
          <TestDataBanner
            workflowId={workflowId}
            onLoadTestData={handleLoadTestData}
          />

          {/* Ready to Run Checklist */}
          <ReadyToRunChecklist
            providerName={
              providerState.provider === 'gemini' ? 'Gemini' :
              providerState.provider === 'claude' ? 'Claude' : 'ChatGPT'
            }
            modelName={availableModels.find(m => m.id === providerState.model)?.name || providerState.model}
            keyMode={providerState.keyMode}
            keyConfigured={
              providerState.keyMode === 'platform'
                ? (platformStatus?.available ?? false)
                : !!providerState.apiKey
            }
            platformBalance={platformStatus?.available ? 100 : undefined}
            requiredInputs={workflow.globalInputs
              .filter(input => input.required)
              .map(input => ({
                id: input.id,
                label: input.label,
                filled: !!globalInputs[input.id]?.trim(),
              }))}
            hasTestData={true}
            testDataApplied={testDataApplied}
            canRun={canRun && workflow.globalInputs.filter(i => i.required).every(i => !!globalInputs[i.id]?.trim())}
          />

          {/* Global Inputs Form */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Workflow Inputs</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Fill in all required information below. This data will be used across all workflow steps.
            </p>
            <div className="space-y-6">
              {workflow.globalInputs.map((input) => renderInput(input))}
            </div>
          </div>

          {/* Run Button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleRunWorkflow}
              disabled={isRunning}
              className="px-12"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running Workflow...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Run Workflow
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          {(isRunning || hasCompletedSteps) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {isRunning
                    ? `Running Step ${currentStepIndex + 1} of ${workflow.steps.length}...`
                    : 'Workflow Complete'}
                </span>
                <span className="text-muted-foreground">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} />
            </div>
          )}

          {/* Results Section */}
          {hasCompletedSteps && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Results</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyAllOutputs}>
                    <Clipboard className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadAllOutputs}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Step Results */}
              <div className="space-y-4">
                {workflow.steps.map((step) => {
                  const status = stepStatuses[step.id];
                  const output = stepOutputs[step.outputKey];
                  const error = stepErrors[step.id];
                  const isExpanded = expandedSteps.has(step.id);

                  if (status !== 'completed' && status !== 'error') return null;

                  return (
                    <div key={step.id} className="rounded-xl border bg-card overflow-hidden">
                      <button
                        onClick={() => toggleStepExpansion(step.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getStepStatusIcon(status)}
                          <div className="text-left">
                            <p className="font-medium">{step.name}</p>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t p-4">
                          {error ? (
                            <div className="text-red-500 flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5" />
                              <p>Error: {error}</p>
                            </div>
                          ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {output || ''}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowRunnerPage;
