/**
 * PortalTestPanel - Admin panel for automated portal testing
 *
 * Features:
 * - "Test All Portals" button to run smoke tests
 * - Real-time progress display
 * - Results summary with pass/fail counts
 * - Detailed failure view
 * - Test history
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Square,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  History,
  DollarSign,
  Zap,
  GitBranch,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Progress } from './ui/Progress';
import {
  runAllPortalTests,
  runSinglePortalTests,
  getRecentTestRuns,
  getTestResults,
  type TestRun,
  type TestResult,
  type TestProgress,
} from '../lib/portalTester';
import { getClientsAsync } from '../lib/clients';
import type { Client } from '../lib/storage/types';
import { cn } from '../lib/theme';
import { Select } from './ui/Select';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PortalTestPanelProps {
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const PortalTestPanel: React.FC<PortalTestPanelProps> = ({ className }) => {
  // Test run state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [currentRun, setCurrentRun] = useState<TestRun | null>(null);
  const [liveResults, setLiveResults] = useState<TestResult[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Single portal test state
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [loadingClients, setLoadingClients] = useState(false);

  // History state
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunResults, setSelectedRunResults] = useState<TestResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // UI state
  const [showHistory, setShowHistory] = useState(false);
  const [showFailuresOnly, setShowFailuresOnly] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  // Load recent runs and clients on mount
  useEffect(() => {
    loadRecentRuns();
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const allClients = await getClientsAsync();
      // Filter to only clients with portals enabled, sorted by name
      const portalClients = allClients
        .filter(c => c.portalEnabled)
        .sort((a, b) => a.companyName.localeCompare(b.companyName));
      setClients(portalClients);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadRecentRuns = async () => {
    setLoadingHistory(true);
    try {
      const runs = await getRecentTestRuns(10);
      setRecentRuns(runs);
    } catch (error) {
      console.error('Failed to load test history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load results for a specific run
  const loadRunResults = async (runId: string) => {
    setSelectedRunId(runId);
    try {
      const results = await getTestResults(runId);
      setSelectedRunResults(results);
    } catch (error) {
      console.error('Failed to load test results:', error);
    }
  };

  // Start test run for all portals
  const handleStartTests = useCallback(async () => {
    setIsRunning(true);
    setProgress(null);
    setLiveResults([]);
    setCurrentRun(null);

    abortControllerRef.current = new AbortController();

    try {
      const run = await runAllPortalTests(
        (prog) => setProgress(prog),
        (result) => setLiveResults(prev => [...prev, result]),
        abortControllerRef.current.signal
      );

      setCurrentRun(run);
      await loadRecentRuns(); // Refresh history
    } catch (error) {
      console.error('Test run failed:', error);
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, []);

  // Start test run for single portal
  const handleStartSinglePortalTests = useCallback(async () => {
    if (!selectedClientId) return;

    setIsRunning(true);
    setProgress(null);
    setLiveResults([]);
    setCurrentRun(null);

    abortControllerRef.current = new AbortController();

    try {
      const run = await runSinglePortalTests(
        selectedClientId,
        (prog) => setProgress(prog),
        (result) => setLiveResults(prev => [...prev, result]),
        abortControllerRef.current.signal
      );

      setCurrentRun(run);
      await loadRecentRuns(); // Refresh history
    } catch (error) {
      console.error('Single portal test run failed:', error);
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [selectedClientId]);

  // Stop test run
  const handleStopTests = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Toggle client expansion
  const toggleClient = (clientName: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientName)) {
        next.delete(clientName);
      } else {
        next.add(clientName);
      }
      return next;
    });
  };

  // Group results by client
  const resultsByClient = React.useMemo(() => {
    const results = selectedRunId ? selectedRunResults : liveResults;
    const filtered = showFailuresOnly ? results.filter(r => r.status === 'failed') : results;

    const byClient = new Map<string, TestResult[]>();
    for (const result of filtered) {
      const existing = byClient.get(result.clientName) || [];
      existing.push(result);
      byClient.set(result.clientName, existing);
    }
    return byClient;
  }, [liveResults, selectedRunResults, selectedRunId, showFailuresOnly]);

  // Calculate display stats
  const displayRun = selectedRunId ? recentRuns.find(r => r.id === selectedRunId) : currentRun;
  const displayResults = selectedRunId ? selectedRunResults : liveResults;

  const passCount = displayResults.filter(r => r.status === 'passed').length;
  const failCount = displayResults.filter(r => r.status === 'failed').length;
  const skipCount = displayResults.filter(r => r.status === 'skipped').length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Portal Testing</h3>
          <p className="text-sm text-muted-foreground">
            Verify client portals work correctly before outreach
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
          {isRunning ? (
            <Button variant="destructive" size="sm" onClick={handleStopTests}>
              <Square className="h-4 w-4 mr-2" />
              Stop Tests
            </Button>
          ) : (
            <Button onClick={handleStartTests}>
              <Play className="h-4 w-4 mr-2" />
              Test All Portals
            </Button>
          )}
        </div>
      </div>

      {/* Single Portal Test Section */}
      {!isRunning && (
        <div className="rounded-lg border bg-card p-4">
          <h4 className="font-medium mb-3">Test Single Portal</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-sm">
              <Select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                disabled={loadingClients}
              >
                <option value="">
                  {loadingClients ? 'Loading clients...' : 'Select a client...'}
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName} ({client.selectedSkillIds.length} skills, {client.selectedWorkflowIds.length} workflows)
                  </option>
                ))}
              </Select>
            </div>
            <Button
              onClick={handleStartSinglePortalTests}
              disabled={!selectedClientId || isRunning}
              variant="outline"
            >
              <Play className="h-4 w-4 mr-2" />
              Test One Portal
            </Button>
            {selectedClientId && (
              <a
                href={`/portal/${clients.find(c => c.id === selectedClientId)?.portalSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Test a specific client's portal skills and workflows before the full test run
          </p>
        </div>
      )}

      {/* Progress Section */}
      {isRunning && progress && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="font-medium">Testing in progress...</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {progress.completedTests} / {progress.totalTests}
            </span>
          </div>

          <Progress value={progress.percentComplete} className="h-2" />

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                Testing: <span className="font-medium text-foreground">{progress.currentClient}</span>
              </span>
              <span className="text-muted-foreground">
                {progress.currentItemType === 'skill' ? (
                  <Zap className="h-3 w-3 inline mr-1" />
                ) : (
                  <GitBranch className="h-3 w-3 inline mr-1" />
                )}
                {progress.currentItem}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {progress.passedTests}
              </span>
              <span className="text-red-600 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {progress.failedTests}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {(displayRun || displayResults.length > 0) && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">
              {selectedRunId ? 'Historical Run Results' : 'Current Run Results'}
            </h4>
            {selectedRunId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedRunId(null);
                  setSelectedRunResults([]);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Back to Live
              </Button>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{displayResults.length}</div>
              <div className="text-xs text-muted-foreground">Total Tests</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <div className="text-2xl font-bold text-green-600">{passCount}</div>
              <div className="text-xs text-muted-foreground">Passed</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-500/10">
              <div className="text-2xl font-bold text-red-600">{failCount}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-500/10">
              <div className="text-2xl font-bold text-yellow-600">{skipCount}</div>
              <div className="text-xs text-muted-foreground">Skipped</div>
            </div>
            {displayRun && (
              <div className="text-center p-3 rounded-lg bg-blue-500/10">
                <div className="text-2xl font-bold text-blue-600">
                  ${((displayRun.estimatedCostCents || 0) / 100).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">Est. Cost</div>
              </div>
            )}
          </div>

          {/* Success Rate Bar */}
          {displayResults.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium">
                  {Math.round((passCount / displayResults.length) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(passCount / displayResults.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Filter Toggle */}
          {failCount > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant={showFailuresOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFailuresOnly(!showFailuresOnly)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {showFailuresOnly ? 'Showing Failures Only' : 'Show Failures Only'}
              </Button>
            </div>
          )}

          {/* Results by Client */}
          {resultsByClient.size > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Array.from(resultsByClient.entries()).map(([clientName, results]) => {
                const clientPassCount = results.filter(r => r.status === 'passed').length;
                const clientFailCount = results.filter(r => r.status === 'failed').length;
                const isExpanded = expandedClients.has(clientName);
                const portalSlug = results[0]?.portalSlug;

                return (
                  <div key={clientName} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleClient(clientName)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {clientFailCount > 0 ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        <span className="font-medium">{clientName}</span>
                        <a
                          href={`/portal/${portalSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-green-600">{clientPassCount} passed</span>
                        {clientFailCount > 0 && (
                          <span className="text-sm text-red-600">{clientFailCount} failed</span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t bg-muted/30 p-3 space-y-2">
                        {results.map((result) => (
                          <div
                            key={result.id}
                            className={cn(
                              'flex items-start justify-between p-2 rounded text-sm',
                              result.status === 'failed' ? 'bg-red-500/10' : 'bg-background'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {result.testType === 'skill' ? (
                                <Zap className="h-4 w-4 text-blue-500 mt-0.5" />
                              ) : (
                                <GitBranch className="h-4 w-4 text-purple-500 mt-0.5" />
                              )}
                              <div>
                                <div className="font-medium">{result.itemName}</div>
                                {result.errorMessage && (
                                  <div className="text-xs text-red-600 mt-1 max-w-md truncate">
                                    {result.errorMessage}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {result.durationMs && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {(result.durationMs / 1000).toFixed(1)}s
                                </span>
                              )}
                              {result.status === 'passed' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : result.status === 'failed' ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="rounded-lg border bg-card p-4">
          <h4 className="font-medium mb-4">Test History</h4>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentRuns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No test runs yet. Click "Test All Portals" to start.
            </p>
          ) : (
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <button
                  key={run.id}
                  onClick={() => loadRunResults(run.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg border transition-colors',
                    selectedRunId === run.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {run.status === 'completed' && run.failedTests === 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : run.status === 'completed' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : run.status === 'running' ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div className="text-left">
                      <div className="font-medium">
                        {run.startedAt.toLocaleDateString()} {run.startedAt.toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {run.clientsTested} clients • {run.totalTests} tests
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-600">{run.passedTests} passed</span>
                    {run.failedTests > 0 && (
                      <span className="text-red-600">{run.failedTests} failed</span>
                    )}
                    <span className="text-muted-foreground">
                      ${((run.estimatedCostCents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isRunning && !currentRun && displayResults.length === 0 && !showHistory && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h4 className="font-medium mb-2">Ready to Test</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Run automated smoke tests on all client portals to verify skills and workflows
            are working correctly before sending outreach emails.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>~80 clients</span>
            <span>•</span>
            <span>9 skills + 3 workflows each</span>
            <span>•</span>
            <span>~$1.00 estimated cost</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalTestPanel;
