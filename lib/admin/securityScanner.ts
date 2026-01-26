/**
 * Security Scanner Library
 *
 * Provides security scanning capabilities for the admin panel:
 * - API key exposure detection
 * - Unsafe storage pattern detection
 * - Permission configuration audit
 * - Session security analysis
 * - Environment variable leak detection
 */

import { supabase } from '../supabase';
import { logger } from '../logger';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ScanSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ScanCategory =
  | 'api_keys'
  | 'storage'
  | 'permissions'
  | 'session'
  | 'environment'
  | 'configuration';

export interface SecurityFinding {
  id: string;
  category: ScanCategory;
  severity: ScanSeverity;
  title: string;
  description: string;
  location?: string;
  recommendation: string;
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface ScanResult {
  id: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  findings: SecurityFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  status: 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export interface ScanProgress {
  phase: string;
  currentCheck: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface SecurityScannerOptions {
  includeApiKeys?: boolean;
  includeStorage?: boolean;
  includePermissions?: boolean;
  includeSession?: boolean;
  includeEnvironment?: boolean;
  includeConfiguration?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'skillengine_security_scans';

function getScanHistory(): ScanResult[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.error('Error loading scan history', { error: e instanceof Error ? e.message : String(e) });
  }
  return [];
}

function saveScanHistory(scans: ScanResult[]): void {
  try {
    // Keep only last 20 scans
    const trimmed = scans.slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    logger.error('Error saving scan history', { error: e instanceof Error ? e.message : String(e) });
  }
}

export function getRecentScans(limit: number = 10): ScanResult[] {
  return getScanHistory().slice(0, limit);
}

export function getScanById(scanId: string): ScanResult | undefined {
  return getScanHistory().find(s => s.id === scanId);
}

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY CHECKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check for exposed API keys in localStorage
 */
function checkApiKeyExposure(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const sensitivePatterns = [
    { pattern: /^AIza[0-9A-Za-z_-]{35}$/, name: 'Google API Key' },
    { pattern: /^sk-[a-zA-Z0-9]{48,}$/, name: 'OpenAI API Key' },
    { pattern: /^sk-ant-[a-zA-Z0-9_-]{90,}$/, name: 'Anthropic API Key' },
    { pattern: /^ghp_[a-zA-Z0-9]{36}$/, name: 'GitHub Personal Access Token' },
    { pattern: /^gho_[a-zA-Z0-9]{36}$/, name: 'GitHub OAuth Token' },
    { pattern: /^xoxb-[0-9A-Za-z-]+$/, name: 'Slack Bot Token' },
    { pattern: /^xoxp-[0-9A-Za-z-]+$/, name: 'Slack User Token' },
  ];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key) || '';

      // Check if the key name suggests it contains sensitive data
      const keyLower = key.toLowerCase();
      const isSensitiveKey = keyLower.includes('api') ||
                            keyLower.includes('key') ||
                            keyLower.includes('secret') ||
                            keyLower.includes('token') ||
                            keyLower.includes('password') ||
                            keyLower.includes('credential');

      // Check for known API key patterns in values
      for (const { pattern, name } of sensitivePatterns) {
        if (pattern.test(value)) {
          // Check if it's stored encrypted (our apiKeyStorage uses encryption)
          const isEncrypted = key.includes('encrypted') ||
                              value.startsWith('U2FsdGVk'); // Base64 encrypted marker

          if (!isEncrypted) {
            findings.push({
              id: crypto.randomUUID(),
              category: 'api_keys',
              severity: 'critical',
              title: `Unencrypted ${name} Detected`,
              description: `A ${name} was found stored in plain text in localStorage under key "${key}".`,
              location: `localStorage["${key}"]`,
              recommendation: 'Use encrypted storage for API keys. Consider using the apiKeyStorage module which provides AES-GCM encryption.',
              detectedAt: new Date().toISOString(),
              resolved: false,
            });
          } else {
            findings.push({
              id: crypto.randomUUID(),
              category: 'api_keys',
              severity: 'info',
              title: `Encrypted ${name} Found`,
              description: `A ${name} is stored with encryption in localStorage under key "${key}".`,
              location: `localStorage["${key}"]`,
              recommendation: 'API key is properly encrypted. Consider server-side storage for production.',
              detectedAt: new Date().toISOString(),
              resolved: false,
            });
          }
        }
      }

      // Check for sensitive-looking keys with plain text values
      if (isSensitiveKey && value.length > 20 && !value.startsWith('{') && !value.startsWith('[')) {
        const isKnownSafe = key.includes('skillengine_');

        if (!isKnownSafe) {
          findings.push({
            id: crypto.randomUUID(),
            category: 'api_keys',
            severity: 'medium',
            title: 'Potentially Sensitive Data in LocalStorage',
            description: `Key "${key}" appears to contain sensitive data but storage method is unclear.`,
            location: `localStorage["${key}"]`,
            recommendation: 'Review this storage key and ensure sensitive data is properly encrypted.',
            detectedAt: new Date().toISOString(),
            resolved: false,
          });
        }
      }
    }
  } catch (e) {
    logger.error('Error checking API key exposure', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

/**
 * Check for unsafe storage patterns
 */
function checkStoragePatterns(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    // Check localStorage size
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        totalSize += key.length + value.length;
      }
    }

    const sizeInMB = totalSize / (1024 * 1024);
    if (sizeInMB > 4) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'storage',
        severity: 'medium',
        title: 'LocalStorage Approaching Limit',
        description: `LocalStorage is using ${sizeInMB.toFixed(2)}MB of approximately 5MB available.`,
        location: 'localStorage',
        recommendation: 'Consider moving large data to IndexedDB or server-side storage.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }

    // Check for potentially stale data
    const stalePatterns = ['_cache', '_temp', '_draft'];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const keyLower = key.toLowerCase();
      if (stalePatterns.some(p => keyLower.includes(p))) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (parsed.createdAt || parsed.timestamp) {
              const timestamp = parsed.createdAt || parsed.timestamp;
              const age = Date.now() - new Date(timestamp).getTime();
              const dayInMs = 24 * 60 * 60 * 1000;

              if (age > 30 * dayInMs) {
                findings.push({
                  id: crypto.randomUUID(),
                  category: 'storage',
                  severity: 'low',
                  title: 'Stale Cached Data Detected',
                  description: `Key "${key}" contains data older than 30 days.`,
                  location: `localStorage["${key}"]`,
                  recommendation: 'Consider implementing cache expiration or cleanup routines.',
                  detectedAt: new Date().toISOString(),
                  resolved: false,
                });
              }
            }
          }
        } catch {
          // Not JSON, skip
        }
      }
    }

    // Check for user data that might need protection
    const userDataKeys = ['user', 'profile', 'account', 'session'];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const keyLower = key.toLowerCase();
      if (userDataKeys.some(p => keyLower.includes(p))) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            // Check for PII
            if (parsed.email || parsed.phone || parsed.ssn || parsed.creditCard) {
              const hasSensitivePII = parsed.ssn || parsed.creditCard;
              findings.push({
                id: crypto.randomUUID(),
                category: 'storage',
                severity: hasSensitivePII ? 'critical' : 'medium',
                title: hasSensitivePII ? 'Sensitive PII in LocalStorage' : 'User PII in LocalStorage',
                description: `Key "${key}" contains user personally identifiable information.`,
                location: `localStorage["${key}"]`,
                recommendation: hasSensitivePII
                  ? 'Never store SSN, credit card, or other sensitive PII in client storage. Use server-side storage with proper encryption.'
                  : 'Consider minimizing PII storage on client side. Ensure compliance with privacy regulations.',
                detectedAt: new Date().toISOString(),
                resolved: false,
              });
            }
          } catch {
            // Not JSON, skip
          }
        }
      }
    }
  } catch (e) {
    logger.error('Error checking storage patterns', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

/**
 * Check permission configuration
 */
function checkPermissions(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    // Check admin configuration
    const adminEmailsKey = 'skillengine_admin_emails';
    const adminEmails = localStorage.getItem(adminEmailsKey);

    if (!adminEmails) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'permissions',
        severity: 'high',
        title: 'No Admin Users Configured',
        description: 'No admin email addresses are configured, which may allow unauthorized access in bootstrap mode.',
        location: adminEmailsKey,
        recommendation: 'Configure at least one admin email address in the Admin Settings.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    } else {
      try {
        const emails = JSON.parse(adminEmails);
        if (Array.isArray(emails)) {
          if (emails.length === 0) {
            findings.push({
              id: crypto.randomUUID(),
              category: 'permissions',
              severity: 'high',
              title: 'Empty Admin Email List',
              description: 'The admin email list is empty.',
              location: adminEmailsKey,
              recommendation: 'Add at least one admin email address.',
              detectedAt: new Date().toISOString(),
              resolved: false,
            });
          } else if (emails.length === 1) {
            findings.push({
              id: crypto.randomUUID(),
              category: 'permissions',
              severity: 'low',
              title: 'Single Admin User',
              description: 'Only one admin user is configured. Consider adding backup admin access.',
              location: adminEmailsKey,
              recommendation: 'Consider adding a backup admin email for redundancy.',
              detectedAt: new Date().toISOString(),
              resolved: false,
            });
          } else {
            findings.push({
              id: crypto.randomUUID(),
              category: 'permissions',
              severity: 'info',
              title: 'Admin Configuration OK',
              description: `${emails.length} admin users are configured.`,
              location: adminEmailsKey,
              recommendation: 'Periodically review admin access list.',
              detectedAt: new Date().toISOString(),
              resolved: false,
            });
          }
        }
      } catch {
        findings.push({
          id: crypto.randomUUID(),
          category: 'permissions',
          severity: 'medium',
          title: 'Invalid Admin Configuration',
          description: 'The admin email configuration is not valid JSON.',
          location: adminEmailsKey,
          recommendation: 'Reconfigure admin emails in the Admin Settings.',
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }
    }

    // Check role configurations
    const roleConfigsKey = 'skillengine_role_configs';
    const roleConfigs = localStorage.getItem(roleConfigsKey);
    if (roleConfigs) {
      try {
        const configs = JSON.parse(roleConfigs);
        if (Array.isArray(configs)) {
          // Check for overly permissive free tier
          const freeConfig = configs.find((c: { role: string }) => c.role === 'free');
          if (freeConfig?.limits) {
            const { skillRunsPerDay, skillRunsPerMonth } = freeConfig.limits;
            if (skillRunsPerDay === -1 || skillRunsPerMonth === -1) {
              findings.push({
                id: crypto.randomUUID(),
                category: 'permissions',
                severity: 'medium',
                title: 'Unlimited Free Tier Detected',
                description: 'Free tier users have unlimited skill runs, which may lead to abuse.',
                location: roleConfigsKey,
                recommendation: 'Consider setting reasonable limits for free tier users.',
                detectedAt: new Date().toISOString(),
                resolved: false,
              });
            }
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  } catch (e) {
    logger.error('Error checking permissions', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

/**
 * Check session security
 */
function checkSession(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    // Check for session data
    const currentUserKey = 'skillengine_current_user';
    const currentUser = localStorage.getItem(currentUserKey);

    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);

        // Check for stale sessions
        if (user.lastLoginAt) {
          const lastLogin = new Date(user.lastLoginAt).getTime();
          const daysSinceLogin = (Date.now() - lastLogin) / (1000 * 60 * 60 * 24);

          if (daysSinceLogin > 30) {
            findings.push({
              id: crypto.randomUUID(),
              category: 'session',
              severity: 'low',
              title: 'Stale Session Detected',
              description: `Current user session is ${Math.floor(daysSinceLogin)} days old.`,
              location: currentUserKey,
              recommendation: 'Consider implementing session expiration for security.',
              detectedAt: new Date().toISOString(),
              resolved: false,
            });
          }
        }

        // Check admin status consistency
        if (user.isAdmin) {
          const adminEmails = localStorage.getItem('skillengine_admin_emails');
          if (adminEmails) {
            try {
              const emails = JSON.parse(adminEmails);
              if (!emails.some((e: string) => e.toLowerCase() === user.email?.toLowerCase())) {
                findings.push({
                  id: crypto.randomUUID(),
                  category: 'session',
                  severity: 'high',
                  title: 'Admin Status Mismatch',
                  description: 'Current user has admin flag but email is not in admin list.',
                  location: currentUserKey,
                  recommendation: 'Review and correct admin status or add email to admin list.',
                  detectedAt: new Date().toISOString(),
                  resolved: false,
                });
              }
            } catch {
              // Invalid JSON, skip
            }
          }
        }
      } catch {
        findings.push({
          id: crypto.randomUUID(),
          category: 'session',
          severity: 'medium',
          title: 'Invalid Session Data',
          description: 'Current user session data is not valid JSON.',
          location: currentUserKey,
          recommendation: 'Clear session and re-authenticate.',
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }
    }

    // Check Supabase session
    const supabaseKeys = Object.keys(localStorage).filter(k =>
      k.startsWith('sb-') || k.includes('supabase')
    );

    if (supabaseKeys.length > 0) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'session',
        severity: 'info',
        title: 'Supabase Session Active',
        description: `Found ${supabaseKeys.length} Supabase-related storage entries.`,
        location: 'localStorage',
        recommendation: 'Supabase sessions are managed automatically. Ensure proper logout handling.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }
  } catch (e) {
    logger.error('Error checking session', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

/**
 * Check environment and configuration
 */
function checkEnvironment(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    // Check if running in development mode
    const isDev = process.env.NODE_ENV === 'development' ||
                  window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1';

    if (isDev) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'environment',
        severity: 'info',
        title: 'Development Environment',
        description: 'Application appears to be running in development mode.',
        location: 'window.location',
        recommendation: 'Ensure production deployments use proper environment configuration.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }

    // Check for HTTPS
    if (window.location.protocol !== 'https:' && !isDev) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'environment',
        severity: 'critical',
        title: 'Insecure Connection',
        description: 'Application is not using HTTPS in a production environment.',
        location: 'window.location.protocol',
        recommendation: 'Configure HTTPS for all production deployments.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }

    // Check for console exposure
    if (typeof window !== 'undefined') {
      // Check if sensitive functions are exposed
      const exposedGlobals = ['supabase', 'firebase', 'aws', 'stripe'];
      const foundExposed = exposedGlobals.filter(g => g in window);

      if (foundExposed.length > 0) {
        findings.push({
          id: crypto.randomUUID(),
          category: 'environment',
          severity: 'medium',
          title: 'SDK Objects Exposed Globally',
          description: `Found global window objects: ${foundExposed.join(', ')}`,
          location: 'window',
          recommendation: 'Consider avoiding global exposure of SDK objects in production.',
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }
    }

    // Check Content Security Policy
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!cspMeta && !isDev) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'configuration',
        severity: 'medium',
        title: 'No Content Security Policy',
        description: 'No CSP meta tag found. Application may be vulnerable to XSS attacks.',
        location: 'document head',
        recommendation: 'Implement a Content Security Policy to mitigate XSS risks.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }
  } catch (e) {
    logger.error('Error checking environment', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCANNER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run a full security scan
 */
export async function runSecurityScan(
  options: SecurityScannerOptions = {},
  onProgress?: (progress: ScanProgress) => void,
  abortSignal?: AbortSignal
): Promise<ScanResult> {
  const {
    includeApiKeys = true,
    includeStorage = true,
    includePermissions = true,
    includeSession = true,
    includeEnvironment = true,
    includeConfiguration = true,
  } = options;

  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const allFindings: SecurityFinding[] = [];

  const checks = [
    { enabled: includeApiKeys, name: 'API Keys', fn: checkApiKeyExposure },
    { enabled: includeStorage, name: 'Storage Patterns', fn: checkStoragePatterns },
    { enabled: includePermissions, name: 'Permissions', fn: checkPermissions },
    { enabled: includeSession, name: 'Session Security', fn: checkSession },
    { enabled: includeEnvironment || includeConfiguration, name: 'Environment', fn: checkEnvironment },
  ].filter(c => c.enabled);

  const totalChecks = checks.length;
  let completedChecks = 0;

  try {
    for (const check of checks) {
      if (abortSignal?.aborted) {
        throw new Error('Scan cancelled');
      }

      onProgress?.({
        phase: 'scanning',
        currentCheck: check.name,
        completed: completedChecks,
        total: totalChecks,
        percentage: Math.round((completedChecks / totalChecks) * 100),
      });

      // Add small delay to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 100));

      const findings = check.fn();
      allFindings.push(...findings);
      completedChecks++;
    }

    onProgress?.({
      phase: 'complete',
      currentCheck: 'Done',
      completed: totalChecks,
      total: totalChecks,
      percentage: 100,
    });

    const completedAt = new Date().toISOString();
    const duration = Date.now() - startTime;

    // Calculate summary
    const summary = {
      total: allFindings.length,
      critical: allFindings.filter(f => f.severity === 'critical').length,
      high: allFindings.filter(f => f.severity === 'high').length,
      medium: allFindings.filter(f => f.severity === 'medium').length,
      low: allFindings.filter(f => f.severity === 'low').length,
      info: allFindings.filter(f => f.severity === 'info').length,
    };

    const result: ScanResult = {
      id: crypto.randomUUID(),
      startedAt,
      completedAt,
      duration,
      findings: allFindings,
      summary,
      status: 'completed',
    };

    // Save to history
    const history = getScanHistory();
    history.unshift(result);
    saveScanHistory(history);

    return result;
  } catch (error) {
    const completedAt = new Date().toISOString();
    const duration = Date.now() - startTime;

    const result: ScanResult = {
      id: crypto.randomUUID(),
      startedAt,
      completedAt,
      duration,
      findings: allFindings,
      summary: {
        total: allFindings.length,
        critical: allFindings.filter(f => f.severity === 'critical').length,
        high: allFindings.filter(f => f.severity === 'high').length,
        medium: allFindings.filter(f => f.severity === 'medium').length,
        low: allFindings.filter(f => f.severity === 'low').length,
        info: allFindings.filter(f => f.severity === 'info').length,
      },
      status: abortSignal?.aborted ? 'cancelled' : 'failed',
      error: error instanceof Error ? error.message : String(error),
    };

    // Save to history even on failure
    const history = getScanHistory();
    history.unshift(result);
    saveScanHistory(history);

    return result;
  }
}

/**
 * Export findings to CSV
 */
export function exportFindingsToCSV(findings: SecurityFinding[]): string {
  const headers = ['Severity', 'Category', 'Title', 'Description', 'Location', 'Recommendation', 'Detected At', 'Resolved'];

  const rows = findings.map(f => [
    f.severity,
    f.category,
    f.title,
    f.description,
    f.location || '',
    f.recommendation,
    f.detectedAt,
    f.resolved ? 'Yes' : 'No',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Get security score based on findings
 */
export function calculateSecurityScore(summary: ScanResult['summary']): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  description: string;
} {
  // Weighted scoring: critical = 25, high = 15, medium = 5, low = 2, info = 0
  const deductions =
    summary.critical * 25 +
    summary.high * 15 +
    summary.medium * 5 +
    summary.low * 2;

  const score = Math.max(0, 100 - deductions);

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  let description: string;

  if (score >= 90) {
    grade = 'A';
    description = 'Excellent security posture';
  } else if (score >= 80) {
    grade = 'B';
    description = 'Good security with minor improvements needed';
  } else if (score >= 70) {
    grade = 'C';
    description = 'Acceptable security with notable concerns';
  } else if (score >= 60) {
    grade = 'D';
    description = 'Below average security, action recommended';
  } else {
    grade = 'F';
    description = 'Critical security issues require immediate attention';
  }

  return { score, grade, description };
}

/**
 * Clear scan history
 */
export function clearScanHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
