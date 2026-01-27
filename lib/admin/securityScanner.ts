/**
 * Security Scanner Library
 *
 * Provides security scanning capabilities for the admin panel:
 * - API key exposure detection
 * - Unsafe storage pattern detection
 * - Permission configuration audit
 * - Session security analysis
 * - Environment variable leak detection
 * - Multi-page scanning across all SPA routes
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
  | 'configuration'
  | 'cookies'
  | 'headers'
  | 'content'
  | 'forms'
  | 'network'
  | 'scripts';

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
  /** Route where the finding was detected (multi-page scan only) */
  route?: string;
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
  /** Whether this was a multi-page scan */
  multiPage?: boolean;
  /** Routes scanned during a multi-page scan */
  scannedRoutes?: string[];
}

export interface ScanProgress {
  phase: string;
  currentCheck: string;
  completed: number;
  total: number;
  percentage: number;
  /** Current route being scanned (multi-page scan only) */
  currentRoute?: string;
}

export interface SecurityScannerOptions {
  includeApiKeys?: boolean;
  includeStorage?: boolean;
  includePermissions?: boolean;
  includeSession?: boolean;
  includeEnvironment?: boolean;
  includeConfiguration?: boolean;
  // New high-priority checks
  includeCookies?: boolean;
  includeHeaders?: boolean;
  includeMixedContent?: boolean;
  includeSRI?: boolean;
  // Medium-priority checks
  includeForms?: boolean;
  includeThirdPartyScripts?: boolean;
  // Lower-priority checks
  includeNetwork?: boolean;
  includeServiceWorkers?: boolean;
  includeDOMSecurity?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE MANIFEST
// Complete listing of all navigable SPA routes for multi-page scanning.
// Parameterized routes (e.g. /skill/:id) are excluded since they require
// dynamic data. Static routes cover all major pages and features.
// ═══════════════════════════════════════════════════════════════════════════

export interface RouteEntry {
  path: string;
  label: string;
  group: string;
}

export const ROUTE_MANIFEST: RouteEntry[] = [
  // Core pages
  { path: '/', label: 'Home', group: 'Core' },
  { path: '/dashboard', label: 'Dashboard', group: 'Core' },
  { path: '/welcome', label: 'Welcome', group: 'Core' },
  { path: '/profile', label: 'User Profile', group: 'Core' },

  // Skills & Library
  { path: '/skills', label: 'Browse Skills', group: 'Skills' },
  { path: '/role-templates', label: 'Role Templates', group: 'Skills' },
  { path: '/my-skills', label: 'My Skills', group: 'Skills' },
  { path: '/library', label: 'Skill Library', group: 'Skills' },
  { path: '/discover', label: 'Skill Discovery', group: 'Skills' },

  // Custom skill generation
  { path: '/analyze', label: 'Analyze Role', group: 'Custom Skills' },

  // Community
  { path: '/community', label: 'Community Skills', group: 'Community' },
  { path: '/community/import', label: 'Import Skill', group: 'Community' },

  // Batch & Export
  { path: '/batch', label: 'Batch Processing', group: 'Batch & Export' },
  { path: '/export-skills', label: 'Export Skills', group: 'Batch & Export' },

  // Workflows
  { path: '/workflows', label: 'Workflows', group: 'Workflows' },

  // Job search tools
  { path: '/job-tracker', label: 'Job Tracker', group: 'Job Tools' },
  { path: '/interview-bank', label: 'Interview Bank', group: 'Job Tools' },
  { path: '/salary-calculator', label: 'Salary Calculator', group: 'Job Tools' },
  { path: '/networking', label: 'Networking Templates', group: 'Job Tools' },
  { path: '/company-notes', label: 'Company Notes', group: 'Job Tools' },
  { path: '/skills-gap', label: 'Skills Gap', group: 'Job Tools' },
  { path: '/progress', label: 'Progress Report', group: 'Job Tools' },
  { path: '/achievements', label: 'Achievements', group: 'Job Tools' },
  { path: '/mock-interview', label: 'Mock Interview', group: 'Job Tools' },
  { path: '/follow-ups', label: 'Follow-ups', group: 'Job Tools' },
  { path: '/autofill-vault', label: 'AutoFill Vault', group: 'Job Tools' },
  { path: '/referral-network', label: 'Referral Network', group: 'Job Tools' },
  { path: '/market-insights', label: 'Market Insights', group: 'Job Tools' },
  { path: '/daily-planner', label: 'Daily Planner', group: 'Job Tools' },

  // Utility & Admin
  { path: '/api-keys', label: 'API Key Instructions', group: 'Utility' },
  { path: '/docs/platform-keys-setup', label: 'Platform Keys Setup', group: 'Utility' },
  { path: '/settings', label: 'Settings', group: 'Utility' },
  { path: '/pricing', label: 'Pricing', group: 'Utility' },
  { path: '/account', label: 'Account', group: 'Utility' },
  { path: '/admin', label: 'Admin Panel', group: 'Admin' },
  { path: '/admin/improvements', label: 'Admin Improvements', group: 'Admin' },
  { path: '/dev/playground', label: 'Dev Playground', group: 'Admin' },
];

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
// SERVER HEADER DETECTION
// Fetches the current page to inspect server-delivered HTTP headers.
// Many security headers (X-Frame-Options, CSP frame-ancestors, etc.) can
// only be set via server response headers and are invisible to meta-tag
// checks alone.
// ═══════════════════════════════════════════════════════════════════════════

interface ServerHeaders {
  csp: string | null;
  xFrameOptions: string | null;
  referrerPolicy: string | null;
  permissionsPolicy: string | null;
  strictTransportSecurity: string | null;
  xContentTypeOptions: string | null;
  fetched: boolean;
}

let cachedServerHeaders: ServerHeaders | null = null;

async function fetchServerHeaders(): Promise<ServerHeaders> {
  if (cachedServerHeaders) return cachedServerHeaders;

  const empty: ServerHeaders = {
    csp: null,
    xFrameOptions: null,
    referrerPolicy: null,
    permissionsPolicy: null,
    strictTransportSecurity: null,
    xContentTypeOptions: null,
    fetched: false,
  };

  try {
    // HEAD request to the current page to read server-delivered headers
    const response = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
    const result: ServerHeaders = {
      csp: response.headers.get('content-security-policy'),
      xFrameOptions: response.headers.get('x-frame-options'),
      referrerPolicy: response.headers.get('referrer-policy'),
      permissionsPolicy: response.headers.get('permissions-policy'),
      strictTransportSecurity: response.headers.get('strict-transport-security'),
      xContentTypeOptions: response.headers.get('x-content-type-options'),
      fetched: true,
    };
    cachedServerHeaders = result;
    return result;
  } catch (e) {
    logger.warn('Could not fetch server headers for security scan', { error: e instanceof Error ? e.message : String(e) });
    return empty;
  }
}

/**
 * Clear the cached server headers (useful between scans)
 */
export function clearServerHeadersCache(): void {
  cachedServerHeaders = null;
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

    // Check Content Security Policy (meta tag + server header)
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const serverHeaders = cachedServerHeaders;
    const hasServerCSP = !!serverHeaders?.csp;

    if (!cspMeta && !hasServerCSP && !isDev) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'configuration',
        severity: 'medium',
        title: 'No Content Security Policy',
        description: 'No CSP meta tag or server header found. Application may be vulnerable to XSS attacks.',
        location: 'document head',
        recommendation: 'Implement a Content Security Policy via meta tag or server headers to mitigate XSS risks.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    } else if (!cspMeta && hasServerCSP) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'configuration',
        severity: 'info',
        title: 'CSP Delivered via Server Header',
        description: 'Content Security Policy is set via server response header (not meta tag). This is the recommended approach.',
        location: 'Server HTTP headers',
        recommendation: 'Server-delivered CSP is preferred over meta tags. No action needed.',
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
// HIGH PRIORITY SECURITY CHECKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check cookie security (Secure, HttpOnly, SameSite flags)
 */
function checkCookieSecurity(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    const cookies = document.cookie.split(';').filter(c => c.trim());

    if (cookies.length === 0) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'cookies',
        severity: 'info',
        title: 'No Cookies Detected',
        description: 'No cookies are accessible via JavaScript (document.cookie is empty).',
        location: 'document.cookie',
        recommendation: 'This is expected if all cookies have HttpOnly flag set (good security practice).',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    } else {
      // If cookies are visible, they don't have HttpOnly
      cookies.forEach(cookie => {
        const [name] = cookie.trim().split('=');
        const nameLower = name.toLowerCase();

        // Check for sensitive-looking cookies without HttpOnly
        const isSensitive = nameLower.includes('session') ||
                           nameLower.includes('auth') ||
                           nameLower.includes('token') ||
                           nameLower.includes('jwt') ||
                           nameLower.includes('user');

        if (isSensitive) {
          findings.push({
            id: crypto.randomUUID(),
            category: 'cookies',
            severity: 'high',
            title: 'Sensitive Cookie Missing HttpOnly',
            description: `Cookie "${name}" appears to contain sensitive data but is accessible via JavaScript (missing HttpOnly flag).`,
            location: `Cookie: ${name}`,
            recommendation: 'Set HttpOnly flag on sensitive cookies to prevent XSS attacks from stealing session data.',
            detectedAt: new Date().toISOString(),
            resolved: false,
          });
        }
      });

      // General warning about JavaScript-accessible cookies
      findings.push({
        id: crypto.randomUUID(),
        category: 'cookies',
        severity: 'low',
        title: 'JavaScript-Accessible Cookies Found',
        description: `${cookies.length} cookie(s) are accessible via JavaScript. Ensure sensitive cookies have HttpOnly flag.`,
        location: 'document.cookie',
        recommendation: 'Review all cookies and ensure session/auth cookies have HttpOnly, Secure, and SameSite flags.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }

    // Check for SameSite in production (via meta tag hint or URL)
    const isProduction = window.location.protocol === 'https:';
    if (isProduction && cookies.length > 0) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'cookies',
        severity: 'medium',
        title: 'Cookie SameSite Attribute Review Recommended',
        description: 'Ensure cookies have SameSite=Strict or SameSite=Lax to prevent CSRF attacks.',
        location: 'Server Cookie Headers',
        recommendation: 'Set SameSite attribute on all cookies. Use "Strict" for sensitive cookies, "Lax" for general cookies.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }
  } catch (e) {
    logger.error('Error checking cookie security', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

/**
 * Check IndexedDB for sensitive data
 */
function checkIndexedDBSecurity(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    // List IndexedDB databases (if supported)
    if (window.indexedDB && 'databases' in window.indexedDB) {
      // Note: indexedDB.databases() is async but we can't await here
      // We'll check for common patterns in known app databases
      findings.push({
        id: crypto.randomUUID(),
        category: 'storage',
        severity: 'info',
        title: 'IndexedDB Available',
        description: 'IndexedDB is available for this application. Manual review recommended for sensitive data storage.',
        location: 'IndexedDB',
        recommendation: 'Review IndexedDB stores for API keys, tokens, or PII. Consider encryption for sensitive data.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }

    // Check for Supabase or Firebase local persistence
    const sensitiveDBNames = ['firebaseLocalStorage', 'supabase', 'auth', 'localforage'];
    sensitiveDBNames.forEach(dbName => {
      const request = window.indexedDB.open(dbName);
      request.onsuccess = () => {
        const db = request.result;
        if (db.objectStoreNames.length > 0) {
          // Database exists and has stores
          findings.push({
            id: crypto.randomUUID(),
            category: 'storage',
            severity: 'medium',
            title: `IndexedDB "${dbName}" Contains Data`,
            description: `Found IndexedDB database "${dbName}" with ${db.objectStoreNames.length} object stores.`,
            location: `IndexedDB: ${dbName}`,
            recommendation: 'Review stored data for sensitive information. Ensure proper encryption for credentials.',
            detectedAt: new Date().toISOString(),
            resolved: false,
          });
        }
        db.close();
      };
      request.onerror = () => {
        // Database doesn't exist or can't be opened, which is fine
      };
    });
  } catch (e) {
    logger.error('Error checking IndexedDB security', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

/**
 * Check for mixed content (HTTP resources on HTTPS pages)
 */
function checkMixedContent(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    const isHTTPS = window.location.protocol === 'https:';

    if (!isHTTPS) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'content',
        severity: 'info',
        title: 'Not Running Over HTTPS',
        description: 'Mixed content check skipped as page is not served over HTTPS.',
        location: 'window.location.protocol',
        recommendation: 'Deploy to HTTPS for production to enable full security checks.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
      return findings;
    }

    // Check all scripts
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = script.getAttribute('src') || '';
      if (src.startsWith('http://')) {
        findings.push({
          id: crypto.randomUUID(),
          category: 'content',
          severity: 'critical',
          title: 'Mixed Content: Insecure Script',
          description: `Script loaded over HTTP: ${src.substring(0, 100)}`,
          location: src,
          recommendation: 'Change to HTTPS or use protocol-relative URLs. Insecure scripts may be blocked by browsers.',
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }
    });

    // Check all stylesheets
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    stylesheets.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('http://')) {
        findings.push({
          id: crypto.randomUUID(),
          category: 'content',
          severity: 'high',
          title: 'Mixed Content: Insecure Stylesheet',
          description: `Stylesheet loaded over HTTP: ${href.substring(0, 100)}`,
          location: href,
          recommendation: 'Change to HTTPS. Insecure stylesheets may be blocked by browsers.',
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }
    });

    // Check images
    const images = document.querySelectorAll('img[src]');
    let insecureImages = 0;
    images.forEach(img => {
      const src = img.getAttribute('src') || '';
      if (src.startsWith('http://')) {
        insecureImages++;
      }
    });
    if (insecureImages > 0) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'content',
        severity: 'medium',
        title: 'Mixed Content: Insecure Images',
        description: `${insecureImages} image(s) loaded over HTTP.`,
        location: 'Document images',
        recommendation: 'Change image URLs to HTTPS to avoid browser warnings and potential content blocking.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }

    // Check iframes
    const iframes = document.querySelectorAll('iframe[src]');
    iframes.forEach(iframe => {
      const src = iframe.getAttribute('src') || '';
      if (src.startsWith('http://')) {
        findings.push({
          id: crypto.randomUUID(),
          category: 'content',
          severity: 'high',
          title: 'Mixed Content: Insecure IFrame',
          description: `IFrame loaded over HTTP: ${src.substring(0, 100)}`,
          location: src,
          recommendation: 'Change to HTTPS. Insecure iframes may be blocked and pose security risks.',
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }
    });

    if (findings.filter(f => f.category === 'content' && f.severity !== 'info').length === 0) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'content',
        severity: 'info',
        title: 'No Mixed Content Detected',
        description: 'All resources appear to be loaded over HTTPS.',
        location: 'Document resources',
        recommendation: 'Continue monitoring for mixed content during development.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }
  } catch (e) {
    logger.error('Error checking mixed content', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

/**
 * Check for clickjacking protection (X-Frame-Options, CSP frame-ancestors)
 */
function checkClickjackingProtection(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    // Check for CSP frame-ancestors in meta tag
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const cspContent = cspMeta?.getAttribute('content') || '';
    const hasMetaFrameAncestors = cspContent.toLowerCase().includes('frame-ancestors');

    // Check for X-Frame-Options meta tag (though server header is preferred)
    const xfoMeta = document.querySelector('meta[http-equiv="X-Frame-Options"]');

    // Check server-delivered headers (the authoritative source for clickjacking protection)
    const serverHeaders = cachedServerHeaders;
    const hasServerXFO = !!serverHeaders?.xFrameOptions;
    const hasServerFrameAncestors = !!serverHeaders?.csp?.toLowerCase().includes('frame-ancestors');
    const hasServerClickjackProtection = hasServerXFO || hasServerFrameAncestors;

    if (!hasMetaFrameAncestors && !xfoMeta && !hasServerClickjackProtection) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'headers',
        severity: 'high',
        title: 'Missing Clickjacking Protection',
        description: 'No X-Frame-Options or CSP frame-ancestors directive found in meta tags or server headers.',
        location: 'Document head / Server headers',
        recommendation: 'Add CSP frame-ancestors directive or X-Frame-Options via server headers to prevent clickjacking attacks. Note: frame-ancestors cannot be set via meta tags — server headers are required.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    } else if (hasServerClickjackProtection) {
      const sources: string[] = [];
      if (hasServerXFO) sources.push(`X-Frame-Options: ${serverHeaders!.xFrameOptions}`);
      if (hasServerFrameAncestors) sources.push('CSP frame-ancestors');
      findings.push({
        id: crypto.randomUUID(),
        category: 'headers',
        severity: 'info',
        title: 'Clickjacking Protection Enabled (Server)',
        description: `Clickjacking protection delivered via server headers: ${sources.join(', ')}.`,
        location: 'Server HTTP headers',
        recommendation: 'Server-delivered clickjacking protection is the correct approach. No action needed.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    } else if (hasMetaFrameAncestors) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'headers',
        severity: 'info',
        title: 'Clickjacking Protection Enabled (CSP)',
        description: 'CSP frame-ancestors directive found in meta tag, providing clickjacking protection.',
        location: 'CSP meta tag',
        recommendation: 'Ensure frame-ancestors is set to "none" or specific trusted origins only.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    } else if (xfoMeta) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'headers',
        severity: 'info',
        title: 'Clickjacking Protection Enabled (X-Frame-Options)',
        description: 'X-Frame-Options meta tag found. Note: Server header is more reliable.',
        location: 'X-Frame-Options meta tag',
        recommendation: 'Consider migrating to CSP frame-ancestors as X-Frame-Options is being deprecated.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }
  } catch (e) {
    logger.error('Error checking clickjacking protection', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

/**
 * Check for Subresource Integrity (SRI) on external scripts/styles
 */
function checkSRI(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    const externalScripts = document.querySelectorAll('script[src]');
    let scriptsWithoutSRI = 0;
    const externalScriptUrls: string[] = [];

    externalScripts.forEach(script => {
      const src = script.getAttribute('src') || '';
      const integrity = script.getAttribute('integrity');

      // Check if it's an external CDN script
      const isExternal = src.startsWith('http') && !src.includes(window.location.hostname);

      if (isExternal && !integrity) {
        scriptsWithoutSRI++;
        externalScriptUrls.push(src.substring(0, 80));
      }
    });

    if (scriptsWithoutSRI > 0) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'scripts',
        severity: 'medium',
        title: 'External Scripts Missing SRI',
        description: `${scriptsWithoutSRI} external script(s) lack Subresource Integrity hashes.`,
        location: externalScriptUrls.slice(0, 3).join(', ') + (externalScriptUrls.length > 3 ? '...' : ''),
        recommendation: 'Add integrity attributes with SHA-384 or SHA-512 hashes to external scripts to prevent CDN compromise attacks.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }

    const externalStyles = document.querySelectorAll('link[rel="stylesheet"]');
    let stylesWithoutSRI = 0;

    externalStyles.forEach(link => {
      const href = link.getAttribute('href') || '';
      const integrity = link.getAttribute('integrity');

      const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);

      if (isExternal && !integrity) {
        stylesWithoutSRI++;
      }
    });

    if (stylesWithoutSRI > 0) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'scripts',
        severity: 'low',
        title: 'External Stylesheets Missing SRI',
        description: `${stylesWithoutSRI} external stylesheet(s) lack Subresource Integrity hashes.`,
        location: 'Document stylesheets',
        recommendation: 'Add integrity attributes to external stylesheets for defense in depth.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }

    if (scriptsWithoutSRI === 0 && stylesWithoutSRI === 0) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'scripts',
        severity: 'info',
        title: 'SRI Check Passed',
        description: 'All external resources have SRI hashes or no external CDN resources detected.',
        location: 'External resources',
        recommendation: 'Continue using SRI for all CDN-hosted resources.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }
  } catch (e) {
    logger.error('Error checking SRI', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════════════════════
// MEDIUM PRIORITY SECURITY CHECKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check security headers via meta tags and document properties
 */
function checkSecurityHeaders(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    const serverHeaders = cachedServerHeaders;

    // Check Referrer Policy (meta tag + server header)
    const referrerMeta = document.querySelector('meta[name="referrer"]');
    const referrerPolicy = referrerMeta?.getAttribute('content');
    const serverReferrerPolicy = serverHeaders?.referrerPolicy;
    const effectiveReferrerPolicy = referrerPolicy || serverReferrerPolicy;

    if (!effectiveReferrerPolicy) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'headers',
        severity: 'medium',
        title: 'Missing Referrer Policy',
        description: 'No referrer-policy found in meta tags or server headers. URL information may leak to external sites.',
        location: 'Document head / Server headers',
        recommendation: 'Add <meta name="referrer" content="strict-origin-when-cross-origin"> or set the Referrer-Policy server header.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    } else if (effectiveReferrerPolicy === 'unsafe-url' || effectiveReferrerPolicy === 'no-referrer-when-downgrade') {
      findings.push({
        id: crypto.randomUUID(),
        category: 'headers',
        severity: 'medium',
        title: 'Weak Referrer Policy',
        description: `Referrer policy "${effectiveReferrerPolicy}" may leak sensitive URL information.`,
        location: referrerPolicy ? 'meta[name="referrer"]' : 'Server HTTP headers',
        recommendation: 'Use "strict-origin-when-cross-origin" or "no-referrer" for better privacy.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    } else {
      const source = referrerPolicy ? 'meta tag' : 'server header';
      findings.push({
        id: crypto.randomUUID(),
        category: 'headers',
        severity: 'info',
        title: 'Referrer Policy Configured',
        description: `Referrer policy set to "${effectiveReferrerPolicy}" via ${source}.`,
        location: referrerPolicy ? 'meta[name="referrer"]' : 'Server HTTP headers',
        recommendation: 'Referrer policy is configured. Review if it meets your privacy requirements.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }

    // Check Permissions/Feature Policy via meta tag, server header, or iframe allow attribute
    const permissionsMeta = document.querySelector('meta[http-equiv="Permissions-Policy"]') ||
                           document.querySelector('meta[http-equiv="Feature-Policy"]');
    const serverPermissionsPolicy = serverHeaders?.permissionsPolicy;

    if (!permissionsMeta && !serverPermissionsPolicy) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'headers',
        severity: 'low',
        title: 'No Permissions Policy',
        description: 'No Permissions-Policy found in meta tags or server headers. Browser features are not explicitly restricted.',
        location: 'Document head / Server headers',
        recommendation: 'Consider adding Permissions-Policy to restrict access to sensitive browser APIs (geolocation, camera, microphone).',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    } else if (!permissionsMeta && serverPermissionsPolicy) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'headers',
        severity: 'info',
        title: 'Permissions Policy Delivered via Server Header',
        description: `Permissions-Policy is set via server header: ${serverPermissionsPolicy}.`,
        location: 'Server HTTP headers',
        recommendation: 'Server-delivered Permissions-Policy is the recommended approach. No action needed.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }
  } catch (e) {
    logger.error('Error checking security headers', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

/**
 * Check form security (autocomplete, password fields)
 */
function checkFormSecurity(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    const forms = document.querySelectorAll('form');
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    const sensitiveInputs = document.querySelectorAll(
      'input[name*="password"], input[name*="secret"], input[name*="token"], ' +
      'input[name*="api"], input[name*="key"], input[name*="ssn"], input[name*="credit"]'
    );

    // Check password fields
    passwordInputs.forEach((input, index) => {
      const hasAutocomplete = input.hasAttribute('autocomplete');
      const autocompleteValue = input.getAttribute('autocomplete') || '';

      // Check for proper autocomplete hints
      if (!hasAutocomplete) {
        findings.push({
          id: crypto.randomUUID(),
          category: 'forms',
          severity: 'low',
          title: 'Password Field Missing Autocomplete',
          description: `Password field ${index + 1} doesn't have autocomplete attribute set.`,
          location: `Password input ${index + 1}`,
          recommendation: 'Set autocomplete="new-password" for registration or "current-password" for login fields.',
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }
    });

    // Check sensitive input fields
    sensitiveInputs.forEach((input) => {
      const name = input.getAttribute('name') || '';
      const autocomplete = input.getAttribute('autocomplete') || '';
      const type = input.getAttribute('type') || 'text';

      if (autocomplete !== 'off' && type !== 'password') {
        findings.push({
          id: crypto.randomUUID(),
          category: 'forms',
          severity: 'medium',
          title: 'Sensitive Field Without autocomplete="off"',
          description: `Input field "${name}" appears sensitive but allows browser autocomplete.`,
          location: `input[name="${name}"]`,
          recommendation: 'Add autocomplete="off" to prevent browser from caching sensitive data.',
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }
    });

    // Check forms for action security
    forms.forEach((form, index) => {
      const action = form.getAttribute('action') || '';
      const method = (form.getAttribute('method') || 'get').toLowerCase();

      // Check for forms submitting sensitive data via GET
      const hasSensitiveFields = form.querySelector('input[type="password"], input[name*="token"]');
      if (hasSensitiveFields && method === 'get') {
        findings.push({
          id: crypto.randomUUID(),
          category: 'forms',
          severity: 'high',
          title: 'Sensitive Form Using GET Method',
          description: `Form ${index + 1} contains sensitive fields but uses GET method, exposing data in URL.`,
          location: `Form ${index + 1}`,
          recommendation: 'Change form method to POST for forms containing passwords or sensitive data.',
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }

      // Check for insecure form action
      if (action.startsWith('http://') && window.location.protocol === 'https:') {
        findings.push({
          id: crypto.randomUUID(),
          category: 'forms',
          severity: 'critical',
          title: 'Form Submits to Insecure URL',
          description: `Form ${index + 1} action points to HTTP URL while page is HTTPS.`,
          location: action,
          recommendation: 'Change form action to HTTPS to prevent credential theft.',
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }
    });

    if (findings.filter(f => f.category === 'forms').length === 0) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'forms',
        severity: 'info',
        title: 'Form Security Check Passed',
        description: 'No major form security issues detected.',
        location: 'Document forms',
        recommendation: 'Continue following form security best practices.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }
  } catch (e) {
    logger.error('Error checking form security', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

/**
 * Inventory third-party scripts
 */
function checkThirdPartyScripts(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    const scripts = document.querySelectorAll('script[src]');
    const currentHost = window.location.hostname;
    const thirdPartyScripts: { domain: string; url: string }[] = [];
    const knownSafe = [
      'cdn.jsdelivr.net',
      'unpkg.com',
      'cdnjs.cloudflare.com',
      'fonts.googleapis.com',
      'www.googletagmanager.com',
      'www.google-analytics.com',
      'connect.facebook.net',
      'platform.twitter.com',
      'cdn.segment.com',
    ];

    scripts.forEach(script => {
      const src = script.getAttribute('src') || '';
      try {
        const url = new URL(src, window.location.href);
        if (url.hostname !== currentHost && url.hostname !== 'localhost') {
          thirdPartyScripts.push({
            domain: url.hostname,
            url: src,
          });
        }
      } catch {
        // Invalid URL, skip
      }
    });

    if (thirdPartyScripts.length > 0) {
      const unknownScripts = thirdPartyScripts.filter(s => !knownSafe.includes(s.domain));

      findings.push({
        id: crypto.randomUUID(),
        category: 'scripts',
        severity: 'info',
        title: 'Third-Party Scripts Detected',
        description: `Found ${thirdPartyScripts.length} third-party script(s) from ${new Set(thirdPartyScripts.map(s => s.domain)).size} domain(s).`,
        location: [...new Set(thirdPartyScripts.map(s => s.domain))].slice(0, 5).join(', '),
        recommendation: 'Regularly audit third-party scripts and ensure they are from trusted sources.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });

      if (unknownScripts.length > 0) {
        findings.push({
          id: crypto.randomUUID(),
          category: 'scripts',
          severity: 'medium',
          title: 'Unknown Third-Party Scripts',
          description: `${unknownScripts.length} script(s) from non-standard CDN domains require review.`,
          location: [...new Set(unknownScripts.map(s => s.domain))].slice(0, 5).join(', '),
          recommendation: 'Review unknown scripts for legitimacy. Consider self-hosting critical dependencies.',
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }
    }

    // Check for inline scripts with potential issues
    const inlineScripts = document.querySelectorAll('script:not([src])');
    if (inlineScripts.length > 10) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'scripts',
        severity: 'low',
        title: 'Many Inline Scripts',
        description: `${inlineScripts.length} inline scripts detected. This may complicate CSP implementation.`,
        location: 'Document scripts',
        recommendation: 'Consider moving inline scripts to external files for easier CSP management.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }
  } catch (e) {
    logger.error('Error checking third-party scripts', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════════════════════
// LOWER PRIORITY SECURITY CHECKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check WebSocket security
 */
function checkNetworkSecurity(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    const isHTTPS = window.location.protocol === 'https:';

    // We can't easily detect WebSocket usage, but we can provide guidance
    if (isHTTPS) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'network',
        severity: 'info',
        title: 'WebSocket Security Reminder',
        description: 'Ensure all WebSocket connections use wss:// instead of ws:// in production.',
        location: 'WebSocket connections',
        recommendation: 'Audit code for WebSocket usage and verify all connections use secure wss:// protocol.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }

    // Check for potential open redirect parameters
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParams = ['redirect', 'return', 'returnUrl', 'next', 'url', 'goto', 'destination', 'redir'];

    redirectParams.forEach(param => {
      const value = urlParams.get(param) || urlParams.get(param.toLowerCase());
      if (value) {
        // Check if it's an external URL
        try {
          const url = new URL(value, window.location.href);
          if (url.hostname !== window.location.hostname) {
            findings.push({
              id: crypto.randomUUID(),
              category: 'network',
              severity: 'high',
              title: 'Potential Open Redirect',
              description: `URL parameter "${param}" contains external URL: ${value.substring(0, 50)}`,
              location: `URL parameter: ${param}`,
              recommendation: 'Validate and whitelist redirect destinations. Never redirect to arbitrary external URLs.',
              detectedAt: new Date().toISOString(),
              resolved: false,
            });
          }
        } catch {
          // Not a valid URL, might be relative path which is safer
        }
      }
    });
  } catch (e) {
    logger.error('Error checking network security', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

/**
 * Check Service Worker registrations
 */
function checkServiceWorkers(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length > 0) {
          findings.push({
            id: crypto.randomUUID(),
            category: 'configuration',
            severity: 'info',
            title: 'Service Workers Registered',
            description: `${registrations.length} Service Worker(s) registered for this origin.`,
            location: 'navigator.serviceWorker',
            recommendation: 'Review Service Worker scripts for security. Ensure they don\'t cache sensitive data inappropriately.',
            detectedAt: new Date().toISOString(),
            resolved: false,
          });
        }
      }).catch(() => {
        // SW API not available or blocked
      });
    }
  } catch (e) {
    logger.error('Error checking Service Workers', { error: e instanceof Error ? e.message : String(e) });
  }

  return findings;
}

/**
 * Check for potential DOM clobbering vulnerabilities
 */
function checkDOMSecurity(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  try {
    // Check for elements with IDs that could clobber important globals
    const dangerousIds = [
      'document', 'window', 'location', 'navigator', 'history',
      'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest',
      'eval', 'Function', 'Array', 'Object', 'String', 'Number',
      'console', 'alert', 'confirm', 'prompt'
    ];

    const clobberedIds: string[] = [];
    dangerousIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        clobberedIds.push(id);
      }
      // Also check name attribute
      const namedElements = document.getElementsByName(id);
      if (namedElements.length > 0) {
        clobberedIds.push(`${id} (name)`);
      }
    });

    if (clobberedIds.length > 0) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'configuration',
        severity: 'medium',
        title: 'Potential DOM Clobbering',
        description: `Elements found with IDs/names that could shadow global objects: ${clobberedIds.join(', ')}`,
        location: 'Document elements',
        recommendation: 'Avoid using JavaScript global names as element IDs. This can cause unexpected behavior or security issues.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }

    // Check for dangerous attributes
    const dangerousElements = document.querySelectorAll('[onclick], [onerror], [onload], [onmouseover]');
    if (dangerousElements.length > 0) {
      findings.push({
        id: crypto.randomUUID(),
        category: 'configuration',
        severity: 'low',
        title: 'Inline Event Handlers Detected',
        description: `${dangerousElements.length} element(s) with inline event handlers found.`,
        location: 'Document elements',
        recommendation: 'Use addEventListener instead of inline handlers for better CSP compatibility and maintainability.',
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }
  } catch (e) {
    logger.error('Error checking DOM security', { error: e instanceof Error ? e.message : String(e) });
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
    // New high-priority checks (default enabled)
    includeCookies = true,
    includeHeaders = true,
    includeMixedContent = true,
    includeSRI = true,
    // Medium-priority checks (default enabled)
    includeForms = true,
    includeThirdPartyScripts = true,
    // Lower-priority checks (default enabled)
    includeNetwork = true,
    includeServiceWorkers = true,
    includeDOMSecurity = true,
  } = options;

  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const allFindings: SecurityFinding[] = [];

  // Pre-fetch server headers so check functions can reference them.
  // This detects security headers delivered via HTTP response (e.g., from Netlify)
  // that are invisible to meta-tag-only checks.
  clearServerHeadersCache();
  await fetchServerHeaders();

  const checks = [
    // Original checks
    { enabled: includeApiKeys, name: 'API Keys', fn: checkApiKeyExposure },
    { enabled: includeStorage, name: 'Storage Patterns', fn: checkStoragePatterns },
    { enabled: includeStorage, name: 'IndexedDB Security', fn: checkIndexedDBSecurity },
    { enabled: includePermissions, name: 'Permissions', fn: checkPermissions },
    { enabled: includeSession, name: 'Session Security', fn: checkSession },
    { enabled: includeEnvironment || includeConfiguration, name: 'Environment', fn: checkEnvironment },
    // High-priority checks
    { enabled: includeCookies, name: 'Cookie Security', fn: checkCookieSecurity },
    { enabled: includeHeaders, name: 'Security Headers', fn: checkSecurityHeaders },
    { enabled: includeHeaders, name: 'Clickjacking Protection', fn: checkClickjackingProtection },
    { enabled: includeMixedContent, name: 'Mixed Content', fn: checkMixedContent },
    { enabled: includeSRI, name: 'Subresource Integrity', fn: checkSRI },
    // Medium-priority checks
    { enabled: includeForms, name: 'Form Security', fn: checkFormSecurity },
    { enabled: includeThirdPartyScripts, name: 'Third-Party Scripts', fn: checkThirdPartyScripts },
    // Lower-priority checks
    { enabled: includeNetwork, name: 'Network Security', fn: checkNetworkSecurity },
    { enabled: includeServiceWorkers, name: 'Service Workers', fn: checkServiceWorkers },
    { enabled: includeDOMSecurity, name: 'DOM Security', fn: checkDOMSecurity },
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
  const hasRoutes = findings.some(f => f.route);
  const headers = hasRoutes
    ? ['Severity', 'Category', 'Route', 'Title', 'Description', 'Location', 'Recommendation', 'Detected At', 'Resolved']
    : ['Severity', 'Category', 'Title', 'Description', 'Location', 'Recommendation', 'Detected At', 'Resolved'];

  const rows = findings.map(f => {
    const base = [
      f.severity,
      f.category,
      ...(hasRoutes ? [f.route || 'global'] : []),
      f.title,
      f.description,
      f.location || '',
      f.recommendation,
      f.detectedAt,
      f.resolved ? 'Yes' : 'No',
    ];
    return base;
  });

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

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-PAGE SCANNING
// Navigates to every route in the SPA and runs DOM-dependent checks on each
// page, then aggregates all findings. Global checks (localStorage, cookies,
// session, etc.) only run once since they are page-independent.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DOM-dependent checks that may produce different results on different pages.
 * These inspect the actual rendered DOM (scripts, forms, iframes, etc.)
 */
function getPageSpecificChecks(options: SecurityScannerOptions) {
  const {
    includeMixedContent = true,
    includeSRI = true,
    includeForms = true,
    includeThirdPartyScripts = true,
    includeDOMSecurity = true,
  } = options;

  return [
    { enabled: includeMixedContent, name: 'Mixed Content', fn: checkMixedContent },
    { enabled: includeSRI, name: 'Subresource Integrity', fn: checkSRI },
    { enabled: includeForms, name: 'Form Security', fn: checkFormSecurity },
    { enabled: includeThirdPartyScripts, name: 'Third-Party Scripts', fn: checkThirdPartyScripts },
    { enabled: includeDOMSecurity, name: 'DOM Security', fn: checkDOMSecurity },
  ].filter(c => c.enabled);
}

/**
 * Global checks that are page-independent (they inspect localStorage,
 * cookies, headers — not the rendered DOM tree). These only need to run once.
 */
function getGlobalChecks(options: SecurityScannerOptions) {
  const {
    includeApiKeys = true,
    includeStorage = true,
    includePermissions = true,
    includeSession = true,
    includeEnvironment = true,
    includeConfiguration = true,
    includeCookies = true,
    includeHeaders = true,
    includeNetwork = true,
    includeServiceWorkers = true,
  } = options;

  return [
    { enabled: includeApiKeys, name: 'API Keys', fn: checkApiKeyExposure },
    { enabled: includeStorage, name: 'Storage Patterns', fn: checkStoragePatterns },
    { enabled: includeStorage, name: 'IndexedDB Security', fn: checkIndexedDBSecurity },
    { enabled: includePermissions, name: 'Permissions', fn: checkPermissions },
    { enabled: includeSession, name: 'Session Security', fn: checkSession },
    { enabled: includeEnvironment || includeConfiguration, name: 'Environment', fn: checkEnvironment },
    { enabled: includeCookies, name: 'Cookie Security', fn: checkCookieSecurity },
    { enabled: includeHeaders, name: 'Security Headers', fn: checkSecurityHeaders },
    { enabled: includeHeaders, name: 'Clickjacking Protection', fn: checkClickjackingProtection },
    { enabled: includeNetwork, name: 'Network Security', fn: checkNetworkSecurity },
    { enabled: includeServiceWorkers, name: 'Service Workers', fn: checkServiceWorkers },
  ].filter(c => c.enabled);
}

/**
 * Navigate to a hash route and wait for the page to render.
 * Uses a combination of hashchange event and timeout-based polling
 * to detect when navigation and rendering are complete.
 */
function navigateToRoute(path: string): Promise<void> {
  return new Promise((resolve) => {
    const targetHash = `#${path}`;

    // If already on this route, just wait a tick for any re-render
    if (window.location.hash === targetHash) {
      setTimeout(resolve, 200);
      return;
    }

    const onHashChange = () => {
      window.removeEventListener('hashchange', onHashChange);
      // Wait for React to render the new page content
      setTimeout(resolve, 500);
    };

    window.addEventListener('hashchange', onHashChange);

    // Set the hash to trigger navigation
    window.location.hash = targetHash;

    // Safety timeout in case hashchange doesn't fire (e.g. same route)
    setTimeout(() => {
      window.removeEventListener('hashchange', onHashChange);
      resolve();
    }, 2000);
  });
}

/**
 * Deduplicate findings that are identical across pages.
 * Two findings are considered duplicates if they have the same title,
 * category, severity, and description. When duplicates are found,
 * the route info is merged into a single finding.
 */
function deduplicateFindings(findings: SecurityFinding[]): SecurityFinding[] {
  const seen = new Map<string, SecurityFinding>();

  for (const finding of findings) {
    // Create a signature based on content (not id or route)
    const sig = `${finding.category}|${finding.severity}|${finding.title}|${finding.description}`;

    if (seen.has(sig)) {
      // Merge route info
      const existing = seen.get(sig)!;
      if (finding.route && existing.route && !existing.route.includes(finding.route)) {
        existing.route = `${existing.route}, ${finding.route}`;
      }
    } else {
      seen.set(sig, { ...finding });
    }
  }

  return Array.from(seen.values());
}

export interface MultiPageScanOptions extends SecurityScannerOptions {
  /** Specific routes to scan (defaults to full ROUTE_MANIFEST) */
  routes?: RouteEntry[];
}

/**
 * Run a multi-page security scan.
 *
 * This navigates to every route in the SPA and runs DOM-dependent checks
 * on each page, then runs global (page-independent) checks once.
 * Findings are aggregated and deduplicated across all pages.
 */
export async function runMultiPageScan(
  options: MultiPageScanOptions = {},
  onProgress?: (progress: ScanProgress) => void,
  abortSignal?: AbortSignal
): Promise<ScanResult> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const allFindings: SecurityFinding[] = [];

  // Save the current route so we can restore it after scanning
  const originalHash = window.location.hash;

  // Pre-fetch server headers once for all checks
  clearServerHeadersCache();
  await fetchServerHeaders();

  const routesToScan = options.routes || ROUTE_MANIFEST;
  const globalChecks = getGlobalChecks(options);
  const pageChecks = getPageSpecificChecks(options);

  // Total work = global checks + (page checks per route)
  const totalSteps = globalChecks.length + (routesToScan.length * pageChecks.length);
  let completedSteps = 0;
  const scannedRoutes: string[] = [];

  try {
    // ─── Phase 1: Run global (page-independent) checks once ───
    onProgress?.({
      phase: 'global',
      currentCheck: 'Running global checks...',
      completed: completedSteps,
      total: totalSteps,
      percentage: 0,
    });

    for (const check of globalChecks) {
      if (abortSignal?.aborted) throw new Error('Scan cancelled');

      onProgress?.({
        phase: 'global',
        currentCheck: check.name,
        completed: completedSteps,
        total: totalSteps,
        percentage: Math.round((completedSteps / totalSteps) * 100),
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      const findings = check.fn();
      // Global findings have no specific route
      allFindings.push(...findings);
      completedSteps++;
    }

    // ─── Phase 2: Navigate to each route and run DOM checks ───
    for (const route of routesToScan) {
      if (abortSignal?.aborted) throw new Error('Scan cancelled');

      onProgress?.({
        phase: 'multi-page',
        currentCheck: `Navigating to ${route.label}...`,
        completed: completedSteps,
        total: totalSteps,
        percentage: Math.round((completedSteps / totalSteps) * 100),
        currentRoute: route.path,
      });

      // Navigate to the route
      await navigateToRoute(route.path);
      scannedRoutes.push(route.path);

      // Run each page-specific check on this page
      for (const check of pageChecks) {
        if (abortSignal?.aborted) throw new Error('Scan cancelled');

        onProgress?.({
          phase: 'multi-page',
          currentCheck: `${route.label}: ${check.name}`,
          completed: completedSteps,
          total: totalSteps,
          percentage: Math.round((completedSteps / totalSteps) * 100),
          currentRoute: route.path,
        });

        await new Promise(resolve => setTimeout(resolve, 50));
        const findings = check.fn();
        // Tag each finding with the route where it was found
        const taggedFindings = findings.map(f => ({
          ...f,
          route: route.path,
          location: f.location ? `[${route.label}] ${f.location}` : `[${route.label}]`,
        }));
        allFindings.push(...taggedFindings);
        completedSteps++;
      }
    }

    // ─── Phase 3: Restore original route ───
    onProgress?.({
      phase: 'finalizing',
      currentCheck: 'Restoring original page...',
      completed: completedSteps,
      total: totalSteps,
      percentage: 99,
    });

    // Navigate back to the original route
    if (originalHash && originalHash !== window.location.hash) {
      window.location.hash = originalHash;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // ─── Phase 4: Deduplicate and finalize ───
    const deduplicatedFindings = deduplicateFindings(allFindings);

    onProgress?.({
      phase: 'complete',
      currentCheck: 'Done',
      completed: totalSteps,
      total: totalSteps,
      percentage: 100,
    });

    const completedAt = new Date().toISOString();
    const duration = Date.now() - startTime;

    const summary = {
      total: deduplicatedFindings.length,
      critical: deduplicatedFindings.filter(f => f.severity === 'critical').length,
      high: deduplicatedFindings.filter(f => f.severity === 'high').length,
      medium: deduplicatedFindings.filter(f => f.severity === 'medium').length,
      low: deduplicatedFindings.filter(f => f.severity === 'low').length,
      info: deduplicatedFindings.filter(f => f.severity === 'info').length,
    };

    const result: ScanResult = {
      id: crypto.randomUUID(),
      startedAt,
      completedAt,
      duration,
      findings: deduplicatedFindings,
      summary,
      status: 'completed',
      multiPage: true,
      scannedRoutes,
    };

    // Save to history
    const history = getScanHistory();
    history.unshift(result);
    saveScanHistory(history);

    return result;
  } catch (error) {
    // Restore original route on error
    if (originalHash) {
      window.location.hash = originalHash;
    }

    const completedAt = new Date().toISOString();
    const duration = Date.now() - startTime;

    // Deduplicate whatever we collected before the error
    const deduplicatedFindings = deduplicateFindings(allFindings);

    const result: ScanResult = {
      id: crypto.randomUUID(),
      startedAt,
      completedAt,
      duration,
      findings: deduplicatedFindings,
      summary: {
        total: deduplicatedFindings.length,
        critical: deduplicatedFindings.filter(f => f.severity === 'critical').length,
        high: deduplicatedFindings.filter(f => f.severity === 'high').length,
        medium: deduplicatedFindings.filter(f => f.severity === 'medium').length,
        low: deduplicatedFindings.filter(f => f.severity === 'low').length,
        info: deduplicatedFindings.filter(f => f.severity === 'info').length,
      },
      status: abortSignal?.aborted ? 'cancelled' : 'failed',
      error: error instanceof Error ? error.message : String(error),
      multiPage: true,
      scannedRoutes,
    };

    const history = getScanHistory();
    history.unshift(result);
    saveScanHistory(history);

    return result;
  }
}
