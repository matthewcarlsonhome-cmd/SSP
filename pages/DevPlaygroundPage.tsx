/**
 * DevPlaygroundPage.tsx - Developer Test Playground
 *
 * Unified testing interface for all skills and workflows with:
 * - Skill/workflow selection
 * - Test data loading and editing
 * - Execution and output viewing
 * - AI-powered grading
 * - Evaluation history
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { logger } from '../lib/logger';
import {
  getAllSkillSchemas,
  getAllWorkflowSchemas,
  getSkillSchema,
  getWorkflowSchema,
  generateSkillTestSuite,
  generateWorkflowTestSuite,
  getSkillTestSuite,
  getWorkflowTestSuite,
  saveSkillTestSuite,
  saveWorkflowTestSuite,
  saveEvalRecord,
  getEvalRecordsForSkill,
  getEvalRecordsForWorkflow,
  getSkillEvalStats,
  generateGradingPrompt,
  parseGradingResponse,
  createEvalRecord,
  validateOutputStructure,
  hasSkillDefaultTestData,
  hasWorkflowDefaultTestData,
  getSkillDefaultTestData,
  getWorkflowDefaultTestData,
  type SkillSchema,
  type WorkflowSchema,
  type TestCase,
  type EvalRecord,
  type SkillEvalStats,
} from '../lib/testing';
import { SKILLS } from '../lib/skills/static';
import { callGeminiAPI } from '../lib/testing/apiHelper';
import { getApiKey } from '../lib/apiKeyStorage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  ArrowLeft,
  Play,
  Award,
  History,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Loader2,
  FileText,
  Workflow,
  Sparkles,
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  FlaskConical,
  BadgeCheck,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type SelectionType = 'skill' | 'workflow';

interface ExecutionResult {
  output: string;
  executionTimeMs: number;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const DevPlaygroundPage: React.FC = () => {
  // Selection state
  const [selectionType, setSelectionType] = useState<SelectionType>('skill');
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Schema data
  const allSkills = useMemo(() => getAllSkillSchemas(), []);
  const allWorkflows = useMemo(() => getAllWorkflowSchemas(), []);

  // Current schema
  const currentSchema = useMemo(() => {
    if (!selectedId) return null;
    return selectionType === 'skill'
      ? getSkillSchema(selectedId)
      : getWorkflowSchema(selectedId);
  }, [selectedId, selectionType]);

  // Test cases state
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  // Grading state
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState<EvalRecord | null>(null);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [evalHistory, setEvalHistory] = useState<EvalRecord[]>([]);
  const [evalStats, setEvalStats] = useState<SkillEvalStats | null>(null);

  // Check if current selection has curated default test data
  const hasDefaultTestData = useMemo(() => {
    if (!selectedId) return false;
    return selectionType === 'skill'
      ? hasSkillDefaultTestData(selectedId)
      : hasWorkflowDefaultTestData(selectedId);
  }, [selectedId, selectionType]);

  // Load default test data directly
  const handleLoadDefaultTestData = useCallback(() => {
    if (!selectedId) return;

    const defaultData =
      selectionType === 'skill'
        ? getSkillDefaultTestData(selectedId)
        : getWorkflowDefaultTestData(selectedId);

    if (defaultData) {
      setInputValues(defaultData.inputPayload);
      // Find and select the matching happy-path test case
      const matchingTestCase = testCases.find(
        (tc) => tc.id === defaultData.defaultTestCaseId || tc.type === 'happy-path'
      );
      if (matchingTestCase) {
        setSelectedTestCase(matchingTestCase);
      }
      setExecutionResult(null);
      setGradingResult(null);
    }
  }, [selectedId, selectionType, testCases]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    const items = selectionType === 'skill' ? allSkills : allWorkflows;
    if (!searchQuery) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.id.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );
  }, [selectionType, allSkills, allWorkflows, searchQuery]);

  // Load test cases when selection changes
  useEffect(() => {
    if (!selectedId || !currentSchema) {
      setTestCases([]);
      setSelectedTestCase(null);
      return;
    }

    const loadTestCases = async () => {
      if (selectionType === 'skill') {
        let suite = await getSkillTestSuite(selectedId);
        if (!suite) {
          suite = generateSkillTestSuite(currentSchema as SkillSchema);
          await saveSkillTestSuite(suite);
        }
        setTestCases(suite.tests);
      } else {
        let suite = await getWorkflowTestSuite(selectedId);
        if (!suite) {
          suite = generateWorkflowTestSuite(currentSchema as WorkflowSchema);
          await saveWorkflowTestSuite(suite);
        }
        setTestCases(suite.tests);
      }
    };

    loadTestCases();
  }, [selectedId, currentSchema, selectionType]);

  // Load evaluation history and stats
  useEffect(() => {
    if (!selectedId) {
      setEvalHistory([]);
      setEvalStats(null);
      return;
    }

    const loadHistory = async () => {
      const records =
        selectionType === 'skill'
          ? await getEvalRecordsForSkill(selectedId)
          : await getEvalRecordsForWorkflow(selectedId);

      setEvalHistory(records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

      if (selectionType === 'skill') {
        const stats = await getSkillEvalStats(selectedId);
        setEvalStats(stats);
      }
    };

    loadHistory();
  }, [selectedId, selectionType, gradingResult]);

  // Handle test case selection
  const handleSelectTestCase = useCallback((testCase: TestCase) => {
    setSelectedTestCase(testCase);
    setInputValues(testCase.inputPayload);
    setExecutionResult(null);
    setGradingResult(null);
  }, []);

  // Handle input change
  const handleInputChange = useCallback((fieldId: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  // Reset inputs
  const handleResetInputs = useCallback(() => {
    if (selectedTestCase) {
      setInputValues(selectedTestCase.inputPayload);
    } else {
      setInputValues({});
    }
  }, [selectedTestCase]);

  // Run skill/workflow
  const handleRun = useCallback(async () => {
    if (!currentSchema) return;

    const apiKey = getApiKey('gemini');
    if (!apiKey) {
      alert('Please set your Gemini API key in Settings first.');
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    setGradingResult(null);

    const startTime = Date.now();

    try {
      let output: string;

      if (selectionType === 'skill') {
        const skill = SKILLS[selectedId];
        if (!skill) {
          throw new Error(`Skill not found: ${selectedId}`);
        }

        const { systemInstruction, userPrompt } = skill.generatePrompt(inputValues);
        const result = await callGeminiAPI(
          systemInstruction,
          userPrompt,
          apiKey,
          'gemini-1.5-flash-latest'
        );
        output = result.response;
      } else {
        // For workflows, we'd need to execute all steps
        // For now, show a placeholder
        output = `[Workflow execution not yet implemented in playground]\n\nWorkflow: ${currentSchema.name}\nSteps: ${(currentSchema as WorkflowSchema).stepCount}`;
      }

      setExecutionResult({
        output,
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setExecutionResult({
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsRunning(false);
    }
  }, [currentSchema, selectedId, selectionType, inputValues]);

  // Grade output
  const handleGrade = useCallback(async () => {
    if (!executionResult || !selectedTestCase || !currentSchema) return;

    const apiKey = getApiKey('gemini');
    if (!apiKey) {
      alert('Please set your Gemini API key in Settings first.');
      return;
    }

    setIsGrading(true);

    try {
      // Create test case with current inputs
      const testCaseWithCurrentInputs: TestCase = {
        ...selectedTestCase,
        inputPayload: inputValues,
      };

      const { systemPrompt, userPrompt } = generateGradingPrompt(
        testCaseWithCurrentInputs,
        executionResult.output,
        currentSchema.name
      );

      const result = await callGeminiAPI(
        systemPrompt,
        userPrompt,
        apiKey,
        'gemini-1.5-flash-latest'
      );

      const gradingResultParsed = parseGradingResponse(
        result.response,
        testCaseWithCurrentInputs,
        selectedId
      );

      const evalRecord = createEvalRecord(
        selectionType === 'skill' ? selectedId : undefined,
        selectionType === 'workflow' ? selectedId : undefined,
        testCaseWithCurrentInputs,
        executionResult.output,
        gradingResultParsed,
        {
          executionTimeMs: executionResult.executionTimeMs,
          modelUsed: 'gemini-1.5-flash-latest',
        }
      );

      await saveEvalRecord(evalRecord);
      setGradingResult(evalRecord);
    } catch (error) {
      logger.error('Grading failed', { error: error instanceof Error ? error.message : String(error) });
      alert(`Grading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGrading(false);
    }
  }, [executionResult, selectedTestCase, currentSchema, inputValues, selectedId, selectionType]);

  // Regenerate test cases
  const handleRegenerateTests = useCallback(async () => {
    if (!currentSchema) return;

    if (selectionType === 'skill') {
      const suite = generateSkillTestSuite(currentSchema as SkillSchema);
      await saveSkillTestSuite(suite);
      setTestCases(suite.tests);
    } else {
      const suite = generateWorkflowTestSuite(currentSchema as WorkflowSchema);
      await saveWorkflowTestSuite(suite);
      setTestCases(suite.tests);
    }

    setSelectedTestCase(null);
    setInputValues({});
  }, [currentSchema, selectionType]);

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              Developer Test Playground
            </h1>
            <p className="text-muted-foreground mt-2">
              Test, grade, and optimize AI skills and workflows
            </p>
          </div>
          {evalStats && evalStats.totalEvals > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Avg Score:</span>
                <span className={`text-2xl font-bold ${getScoreColor(evalStats.averageScore)}`}>
                  {evalStats.averageScore}
                </span>
                {getTrendIcon(evalStats.trend)}
              </div>
              <p className="text-xs text-muted-foreground">
                {evalStats.totalEvals} evaluations
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Selection */}
        <div className="space-y-6">
          {/* Type Toggle */}
          <div className="flex rounded-lg border bg-muted p-1">
            <button
              onClick={() => {
                setSelectionType('skill');
                setSelectedId('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectionType === 'skill'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-4 w-4" />
              Skills ({allSkills.length})
            </button>
            <button
              onClick={() => {
                setSelectionType('workflow');
                setSelectedId('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectionType === 'workflow'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Workflow className="h-4 w-4" />
              Workflows ({allWorkflows.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`Search ${selectionType}s...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Item List */}
          <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setSelectedTestCase(null);
                  setInputValues({});
                  setExecutionResult(null);
                  setGradingResult(null);
                }}
                className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors ${
                  selectedId === item.id
                    ? 'bg-primary/10 border-primary/20'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{item.name}</span>
                  {(selectionType === 'skill'
                    ? hasSkillDefaultTestData(item.id)
                    : hasWorkflowDefaultTestData(item.id)) && (
                    <FlaskConical className="h-3 w-3 text-amber-500" title="Curated test data available" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {item.description}
                </div>
                {'source' in item && (
                  <span
                    className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                      item.source === 'static'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}
                  >
                    {item.source === 'static' ? 'Core' : 'Role'}
                  </span>
                )}
              </button>
            ))}
            {filteredItems.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                No {selectionType}s found
              </div>
            )}
          </div>

          {/* Test Cases */}
          {selectedId && testCases.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Test Cases</h3>
                <Button variant="ghost" size="sm" onClick={handleRegenerateTests}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              </div>

              {/* Quick Load Default Data Button */}
              {hasDefaultTestData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadDefaultTestData}
                  className="w-full text-amber-600 border-amber-600/30 hover:bg-amber-600/10"
                >
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Load Curated Test Data
                </Button>
              )}

              <div className="space-y-2">
                {testCases.map((tc) => {
                  // Check if this test case is curated (matches default test data)
                  const defaultData =
                    selectionType === 'skill'
                      ? getSkillDefaultTestData(selectedId)
                      : getWorkflowDefaultTestData(selectedId);
                  const isCurated = defaultData && tc.id === defaultData.defaultTestCaseId;

                  return (
                    <button
                      key={tc.id}
                      onClick={() => handleSelectTestCase(tc)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedTestCase?.id === tc.id
                          ? 'border-primary bg-primary/5'
                          : isCurated
                          ? 'border-amber-500/30 hover:bg-amber-500/5'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            tc.type === 'happy-path'
                              ? 'bg-green-500/20 text-green-400'
                              : tc.type === 'edge-case'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {tc.type}
                        </span>
                        {isCurated && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-500">
                            <BadgeCheck className="h-3 w-3" />
                            Curated
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {tc.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Middle Column: Input Form */}
        <div className="space-y-6">
          {currentSchema ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{currentSchema.name}</h2>
                <Button variant="ghost" size="sm" onClick={handleResetInputs}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {(selectionType === 'skill'
                  ? (currentSchema as SkillSchema).inputs
                  : (currentSchema as WorkflowSchema).globalInputs
                ).map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'select' && field.options ? (
                      <select
                        value={inputValues[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                      >
                        <option value="">Select...</option>
                        {field.options.map((opt) => {
                          // Handle both string options and object options { value, label }
                          const optValue = typeof opt === 'string' ? opt : (opt as { value: string; label: string }).value;
                          const optLabel = typeof opt === 'string' ? opt : (opt as { value: string; label: string }).label;
                          return (
                            <option key={optValue} value={optValue}>
                              {optLabel}
                            </option>
                          );
                        })}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={inputValues[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        rows={field.rows || 4}
                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-y"
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <Input
                        type="text"
                        value={inputValues[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex-1"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run {selectionType === 'skill' ? 'Skill' : 'Workflow'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Select a {selectionType} from the list to get started
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Output & Grading */}
        <div className="space-y-6">
          {showHistory ? (
            // History View
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Evaluation History</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                  Hide
                </Button>
              </div>
              <div className="space-y-3 max-h-[700px] overflow-y-auto">
                {evalHistory.length > 0 ? (
                  evalHistory.map((record) => (
                    <div
                      key={record.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-2xl font-bold ${getScoreColor(
                            record.gradingResult.overallScore
                          )}`}
                        >
                          {record.gradingResult.overallScore}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(record.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          record.testType === 'happy-path'
                            ? 'bg-green-500/20 text-green-400'
                            : record.testType === 'edge-case'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {record.testType}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {record.gradingResult.summary}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No evaluations yet
                  </p>
                )}
              </div>
            </div>
          ) : (
            // Output View
            <>
              <h2 className="text-xl font-semibold">Output</h2>

              {executionResult ? (
                <div className="space-y-4">
                  {/* Execution metadata */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {executionResult.executionTimeMs}ms
                    </span>
                    <span>{new Date(executionResult.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {/* Quick validation */}
                  {(() => {
                    const validation = validateOutputStructure(executionResult.output);
                    return !validation.isValid ? (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-500">
                            Structural issues detected
                          </p>
                          <ul className="text-xs text-muted-foreground mt-1">
                            {validation.issues.map((issue, i) => (
                              <li key={i}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Output content */}
                  <div className="border rounded-lg p-4 bg-muted/30 max-h-[400px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {executionResult.output}
                    </pre>
                  </div>

                  {/* Grade button */}
                  {selectedTestCase && (
                    <Button
                      onClick={handleGrade}
                      disabled={isGrading}
                      className="w-full"
                      variant="outline"
                    >
                      {isGrading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Grading...
                        </>
                      ) : (
                        <>
                          <Award className="h-4 w-4 mr-2" />
                          Grade this Output
                        </>
                      )}
                    </Button>
                  )}

                  {/* Grading result */}
                  {gradingResult && (
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Grading Result</h3>
                        <span
                          className={`text-3xl font-bold ${getScoreColor(
                            gradingResult.gradingResult.overallScore
                          )}`}
                        >
                          {gradingResult.gradingResult.overallScore}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {gradingResult.gradingResult.summary}
                      </p>

                      {/* Criterion scores */}
                      <div className="space-y-2">
                        {gradingResult.gradingResult.criterionScores.map((cs) => (
                          <div
                            key={cs.criterionId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="font-medium">{cs.criterionId}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    cs.score >= 4
                                      ? 'bg-green-500'
                                      : cs.score >= 3
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${(cs.score / 5) * 100}%` }}
                                />
                              </div>
                              <span className="w-6 text-right">{cs.score}/5</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Strengths & Improvements */}
                      {gradingResult.gradingResult.strengths.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium flex items-center gap-1 text-green-500 mb-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Strengths
                          </h4>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {gradingResult.gradingResult.strengths.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {gradingResult.gradingResult.improvements.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium flex items-center gap-1 text-yellow-500 mb-1">
                            <AlertCircle className="h-4 w-4" />
                            Areas for Improvement
                          </h4>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {gradingResult.gradingResult.improvements.map((imp, i) => (
                              <li key={i}>• {imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Run a skill to see the output here
                  </p>
                  {selectedTestCase && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Test case loaded: {selectedTestCase.type}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevPlaygroundPage;
