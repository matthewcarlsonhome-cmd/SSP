/**
 * SecurityScannerPanel - Admin panel for security scanning
 *
 * Features:
 * - Run security scans with real-time progress
 * - View findings by severity and category
 * - Security score with grade
 * - Scan history
 * - Export findings to CSV
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Play,
  Square,
  Loader2,
  ChevronDown,
  ChevronUp,
  Download,
  History,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Globe,
  MapPin,
  Layers,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Progress } from './ui/Progress';
import { Checkbox } from './ui/Checkbox';
import {
  runSecurityScan,
  runMultiPageScan,
  getRecentScans,
  getScanById,
  exportFindingsToCSV,
  calculateSecurityScore,
  clearScanHistory,
  ROUTE_MANIFEST,
  type ScanResult,
  type SecurityFinding,
  type ScanProgress,
  type ScanSeverity,
  type ScanCategory,
  type SecurityScannerOptions,
  type RouteEntry,
} from '../lib/admin/securityScanner';
import { cn } from '../lib/theme';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SecurityScannerPanelProps {
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SEVERITY_CONFIG: Record<
  ScanSeverity,
  { label: string; color: string; bgColor: string; icon: React.FC<{ className?: string }> }
> = {
  critical: {
    label: 'Critical',
    color: 'text-red-600',
    bgColor: 'bg-red-500/20',
    icon: ShieldAlert,
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/20',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/20',
    icon: AlertCircle,
  },
  low: {
    label: 'Low',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/20',
    icon: Info,
  },
  info: {
    label: 'Info',
    color: 'text-gray-600',
    bgColor: 'bg-gray-500/20',
    icon: Info,
  },
};

const CATEGORY_LABELS: Record<ScanCategory, string> = {
  api_keys: 'API Keys',
  storage: 'Storage',
  permissions: 'Permissions',
  session: 'Session',
  environment: 'Environment',
  configuration: 'Configuration',
  cookies: 'Cookies',
  headers: 'Headers',
  content: 'Content',
  forms: 'Forms',
  network: 'Network',
  scripts: 'Scripts',
};

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-600 bg-green-500/20',
  B: 'text-blue-600 bg-blue-500/20',
  C: 'text-yellow-600 bg-yellow-500/20',
  D: 'text-orange-600 bg-orange-500/20',
  F: 'text-red-600 bg-red-500/20',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const SecurityScannerPanel: React.FC<SecurityScannerPanelProps> = ({ className }) => {
  // Scan state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scan options
  const [scanOptions, setScanOptions] = useState<SecurityScannerOptions>({
    // Core checks
    includeApiKeys: true,
    includeStorage: true,
    includePermissions: true,
    includeSession: true,
    includeEnvironment: true,
    includeConfiguration: true,
    // High-priority checks
    includeCookies: true,
    includeHeaders: true,
    includeMixedContent: true,
    includeSRI: true,
    // Medium-priority checks
    includeForms: true,
    includeThirdPartyScripts: true,
    // Lower-priority checks
    includeNetwork: true,
    includeServiceWorkers: true,
    includeDOMSecurity: true,
  });

  // History state
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryScan, setSelectedHistoryScan] = useState<ScanResult | null>(null);

  // Multi-page scan state
  const [multiPageMode, setMultiPageMode] = useState(false);
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(
    new Set(ROUTE_MANIFEST.map(r => r.path))
  );
  const [showRouteSelection, setShowRouteSelection] = useState(false);

  // UI state
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<ScanSeverity | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ScanCategory | 'all'>('all');
  const [filterRoute, setFilterRoute] = useState<string>('all');

  // Load recent scans on mount
  useEffect(() => {
    loadRecentScans();
  }, []);

  const loadRecentScans = () => {
    const scans = getRecentScans(10);
    setRecentScans(scans);
  };

  // Route selection helpers
  const toggleRouteSelection = (path: string) => {
    setSelectedRoutes(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleRouteGroup = (group: string) => {
    const groupRoutes = ROUTE_MANIFEST.filter(r => r.group === group);
    const allSelected = groupRoutes.every(r => selectedRoutes.has(r.path));
    setSelectedRoutes(prev => {
      const next = new Set(prev);
      groupRoutes.forEach(r => {
        if (allSelected) {
          next.delete(r.path);
        } else {
          next.add(r.path);
        }
      });
      return next;
    });
  };

  const selectAllRoutes = () => setSelectedRoutes(new Set(ROUTE_MANIFEST.map(r => r.path)));
  const selectNoRoutes = () => setSelectedRoutes(new Set());

  // Start scan
  const handleStartScan = useCallback(async () => {
    setIsRunning(true);
    setProgress(null);
    setCurrentResult(null);
    setSelectedHistoryScan(null);

    abortControllerRef.current = new AbortController();

    try {
      let result: ScanResult;

      if (multiPageMode) {
        const routes = ROUTE_MANIFEST.filter(r => selectedRoutes.has(r.path));
        result = await runMultiPageScan(
          { ...scanOptions, routes },
          (prog) => setProgress(prog),
          abortControllerRef.current.signal
        );
      } else {
        result = await runSecurityScan(
          scanOptions,
          (prog) => setProgress(prog),
          abortControllerRef.current.signal
        );
      }

      setCurrentResult(result);
      loadRecentScans();
    } catch (error) {
      console.error('Security scan failed:', error);
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [scanOptions, multiPageMode, selectedRoutes]);

  // Stop scan
  const handleStopScan = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Toggle finding expansion
  const toggleFinding = (findingId: string) => {
    setExpandedFindings(prev => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  };

  // Export findings
  const handleExport = () => {
    const displayResult = selectedHistoryScan || currentResult;
    if (!displayResult) return;

    const csv = exportFindingsToCSV(displayResult.findings);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-scan-${displayResult.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear history
  const handleClearHistory = () => {
    if (confirm('Clear all scan history?')) {
      clearScanHistory();
      setRecentScans([]);
      setSelectedHistoryScan(null);
    }
  };

  // Select history scan
  const handleSelectHistoryScan = (scan: ScanResult) => {
    setSelectedHistoryScan(scan);
    setCurrentResult(null);
    setShowHistory(false);
  };

  // Get display result (selected history or current)
  const displayResult = selectedHistoryScan || currentResult;

  // Collect unique routes from findings for the route filter
  const availableRoutes = displayResult?.multiPage
    ? Array.from(new Set(displayResult.findings.map(f => f.route).filter(Boolean) as string[]))
    : [];

  // Filter findings
  const filteredFindings = displayResult?.findings.filter(f => {
    if (filterSeverity !== 'all' && f.severity !== filterSeverity) return false;
    if (filterCategory !== 'all' && f.category !== filterCategory) return false;
    if (filterRoute !== 'all') {
      if (filterRoute === 'global') {
        if (f.route) return false;
      } else {
        if (!f.route || !f.route.includes(filterRoute)) return false;
      }
    }
    return true;
  }) || [];

  // Calculate score for display
  const securityScore = displayResult ? calculateSecurityScore(displayResult.summary) : null;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Scanner
          </h2>
          <p className="text-sm text-muted-foreground">
            Scan for security vulnerabilities and configuration issues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 mr-2" />
            History ({recentScans.length})
          </Button>
          {displayResult && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Scan History</h3>
            {recentScans.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearHistory}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          {recentScans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No scan history</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentScans.map(scan => {
                const score = calculateSecurityScore(scan.summary);
                return (
                  <button
                    key={scan.id}
                    onClick={() => handleSelectHistoryScan(scan)}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-colors hover:bg-muted/50',
                      selectedHistoryScan?.id === scan.id && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-lg font-bold px-2 py-0.5 rounded', GRADE_COLORS[score.grade])}>
                          {score.grade}
                        </span>
                        <span className="text-sm font-medium">
                          {scan.status === 'completed' ? 'Completed' : scan.status === 'cancelled' ? 'Cancelled' : 'Failed'}
                        </span>
                        {scan.multiPage && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {scan.scannedRoutes?.length || 0}p
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(scan.completedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="text-red-600">{scan.summary.critical} critical</span>
                      <span className="text-orange-600">{scan.summary.high} high</span>
                      <span className="text-yellow-600">{scan.summary.medium} medium</span>
                      <span>{scan.summary.total} total</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Scan Options */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-medium mb-4">Scan Options</h3>

        {/* Core Security Checks */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Core Security</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'includeApiKeys', label: 'API Keys' },
              { key: 'includeStorage', label: 'Storage & IndexedDB' },
              { key: 'includePermissions', label: 'Permissions' },
              { key: 'includeSession', label: 'Session Security' },
              { key: 'includeEnvironment', label: 'Environment' },
              { key: 'includeConfiguration', label: 'Configuration' },
            ].map(option => (
              <label
                key={option.key}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={scanOptions[option.key as keyof SecurityScannerOptions]}
                  onCheckedChange={(checked) =>
                    setScanOptions(prev => ({ ...prev, [option.key]: checked }))
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* High Priority Checks */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">High Priority</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'includeCookies', label: 'Cookie Security' },
              { key: 'includeHeaders', label: 'Security Headers' },
              { key: 'includeMixedContent', label: 'Mixed Content' },
              { key: 'includeSRI', label: 'Subresource Integrity' },
            ].map(option => (
              <label
                key={option.key}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={scanOptions[option.key as keyof SecurityScannerOptions]}
                  onCheckedChange={(checked) =>
                    setScanOptions(prev => ({ ...prev, [option.key]: checked }))
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* Medium Priority Checks */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Medium Priority</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'includeForms', label: 'Form Security' },
              { key: 'includeThirdPartyScripts', label: 'Third-Party Scripts' },
            ].map(option => (
              <label
                key={option.key}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={scanOptions[option.key as keyof SecurityScannerOptions]}
                  onCheckedChange={(checked) =>
                    setScanOptions(prev => ({ ...prev, [option.key]: checked }))
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* Lower Priority Checks */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Defense in Depth</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'includeNetwork', label: 'Network & Redirects' },
              { key: 'includeServiceWorkers', label: 'Service Workers' },
              { key: 'includeDOMSecurity', label: 'DOM Security' },
            ].map(option => (
              <label
                key={option.key}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={scanOptions[option.key as keyof SecurityScannerOptions]}
                  onCheckedChange={(checked) =>
                    setScanOptions(prev => ({ ...prev, [option.key]: checked }))
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* Multi-Page Scan Mode */}
        <div className="mb-4 pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                <Checkbox
                  checked={multiPageMode}
                  onCheckedChange={(checked) => setMultiPageMode(!!checked)}
                />
                <Globe className="h-4 w-4" />
                Multi-Page Scan
              </label>
              <span className="text-xs text-muted-foreground">
                (Navigate to all routes and scan each page)
              </span>
            </div>
            {multiPageMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRouteSelection(!showRouteSelection)}
              >
                <Layers className="h-4 w-4 mr-1" />
                {selectedRoutes.size}/{ROUTE_MANIFEST.length} routes
                {showRouteSelection ? (
                  <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </Button>
            )}
          </div>

          {multiPageMode && (
            <div className="rounded-lg border bg-muted/30 p-3 mb-3">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <p>
                  Multi-page scan navigates to each route in the SPA, runs DOM-dependent checks
                  (forms, scripts, mixed content, SRI, DOM security) on every page, and aggregates findings.
                  Global checks (storage, cookies, session, headers) run once. The scanner will
                  return to this page when done.
                </p>
              </div>
            </div>
          )}

          {/* Route Selection */}
          {multiPageMode && showRouteSelection && (
            <div className="rounded-lg border bg-card p-3 max-h-80 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <Button variant="outline" size="sm" onClick={selectAllRoutes}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={selectNoRoutes}>
                  Select None
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  {selectedRoutes.size} of {ROUTE_MANIFEST.length} selected
                </span>
              </div>
              {(() => {
                const groups = Array.from(new Set(ROUTE_MANIFEST.map(r => r.group)));
                return groups.map(group => {
                  const groupRoutes = ROUTE_MANIFEST.filter(r => r.group === group);
                  const allGroupSelected = groupRoutes.every(r => selectedRoutes.has(r.path));
                  const someGroupSelected = groupRoutes.some(r => selectedRoutes.has(r.path));
                  return (
                    <div key={group} className="mb-3">
                      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer mb-1.5">
                        <Checkbox
                          checked={allGroupSelected}
                          onCheckedChange={() => toggleRouteGroup(group)}
                        />
                        {group}
                        <span className="text-xs text-muted-foreground font-normal">
                          ({groupRoutes.filter(r => selectedRoutes.has(r.path)).length}/{groupRoutes.length})
                        </span>
                      </label>
                      <div className="ml-6 grid grid-cols-2 md:grid-cols-3 gap-1.5">
                        {groupRoutes.map(route => (
                          <label
                            key={route.path}
                            className="flex items-center gap-2 text-xs cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedRoutes.has(route.path)}
                              onCheckedChange={() => toggleRouteSelection(route.path)}
                            />
                            <span className="truncate" title={route.path}>
                              {route.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Run/Stop Button */}
        <div className="mt-6 flex items-center gap-4">
          {isRunning ? (
            <Button variant="destructive" onClick={handleStopScan}>
              <Square className="h-4 w-4 mr-2" />
              Stop Scan
            </Button>
          ) : (
            <Button
              onClick={handleStartScan}
              disabled={multiPageMode && selectedRoutes.size === 0}
            >
              {multiPageMode ? (
                <Globe className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {multiPageMode ? `Scan ${selectedRoutes.size} Pages` : 'Run Security Scan'}
            </Button>
          )}

          {/* Progress */}
          {isRunning && progress && (
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground truncate mr-2">{progress.currentCheck}</span>
                <span className="flex-shrink-0">{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              {progress.currentRoute && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{progress.currentRoute}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {displayResult && (
        <>
          {/* Score Card */}
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn('h-20 w-20 rounded-2xl flex items-center justify-center', GRADE_COLORS[securityScore!.grade])}>
                  <span className="text-4xl font-bold">{securityScore!.grade}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Security Score: {securityScore!.score}/100</h3>
                  <p className="text-muted-foreground">{securityScore!.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scanned {new Date(displayResult.completedAt).toLocaleString()} • {displayResult.duration}ms
                    {displayResult.multiPage && displayResult.scannedRoutes && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {displayResult.scannedRoutes.length} pages scanned
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex gap-3">
                {(['critical', 'high', 'medium', 'low', 'info'] as ScanSeverity[]).map(severity => {
                  const config = SEVERITY_CONFIG[severity];
                  const count = displayResult.summary[severity];
                  return (
                    <div
                      key={severity}
                      className={cn('px-3 py-2 rounded-lg text-center', config.bgColor)}
                    >
                      <p className={cn('text-2xl font-bold', config.color)}>{count}</p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Severity:</span>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as ScanSeverity | 'all')}
                className="text-sm border rounded-md px-2 py-1 bg-background"
              >
                <option value="all">All</option>
                {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as ScanCategory | 'all')}
                className="text-sm border rounded-md px-2 py-1 bg-background"
              >
                <option value="all">All</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            {displayResult.multiPage && availableRoutes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Route:</span>
                <select
                  value={filterRoute}
                  onChange={(e) => setFilterRoute(e.target.value)}
                  className="text-sm border rounded-md px-2 py-1 bg-background max-w-[200px]"
                >
                  <option value="all">All Routes</option>
                  <option value="global">Global (no route)</option>
                  {availableRoutes.sort().map(route => (
                    <option key={route} value={route}>{route}</option>
                  ))}
                </select>
              </div>
            )}
            <span className="text-sm text-muted-foreground ml-auto">
              Showing {filteredFindings.length} of {displayResult.findings.length} findings
            </span>
          </div>

          {/* Findings List */}
          <div className="space-y-3">
            {filteredFindings.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center">
                <ShieldCheck className="h-12 w-12 mx-auto text-green-500 mb-3" />
                <p className="text-lg font-medium">No findings match your filters</p>
                <p className="text-sm text-muted-foreground">Try adjusting the filter criteria</p>
              </div>
            ) : (
              filteredFindings.map(finding => {
                const config = SEVERITY_CONFIG[finding.severity];
                const SeverityIcon = config.icon;
                const isExpanded = expandedFindings.has(finding.id);

                return (
                  <div
                    key={finding.id}
                    className={cn('rounded-xl border bg-card overflow-hidden', config.bgColor.replace('/20', '/5'))}
                  >
                    <button
                      onClick={() => toggleFinding(finding.id)}
                      className="w-full p-4 text-left flex items-start gap-3"
                    >
                      <div className={cn('p-2 rounded-lg', config.bgColor)}>
                        <SeverityIcon className={cn('h-4 w-4', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', config.bgColor, config.color)}>
                            {config.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {CATEGORY_LABELS[finding.category]}
                          </span>
                          {finding.route && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {finding.route}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium">{finding.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">{finding.description}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t space-y-3">
                        <div>
                          <h5 className="text-xs font-medium text-muted-foreground uppercase mb-1">Description</h5>
                          <p className="text-sm">{finding.description}</p>
                        </div>
                        {finding.location && (
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground uppercase mb-1">Location</h5>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{finding.location}</code>
                          </div>
                        )}
                        <div>
                          <h5 className="text-xs font-medium text-muted-foreground uppercase mb-1">Recommendation</h5>
                          <p className="text-sm">{finding.recommendation}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Detected: {new Date(finding.detectedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!displayResult && !isRunning && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <ShieldQuestion className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Scan Results</h3>
          <p className="text-muted-foreground mb-4">
            Run a security scan to check for vulnerabilities and configuration issues
          </p>
          <Button onClick={handleStartScan}>
            <Play className="h-4 w-4 mr-2" />
            Run Security Scan
          </Button>
        </div>
      )}
    </div>
  );
};

export default SecurityScannerPanel;
