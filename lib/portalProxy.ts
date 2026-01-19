/**
 * Portal Proxy Client
 *
 * Handles communication with the portal-proxy Edge Function for anonymous
 * portal visitors. This allows prospective clients to try skills without
 * needing to configure API keys.
 *
 * Features:
 * - No authentication required
 * - Restricted to GPT-4o-mini model
 * - Automatic detection of portal context
 * - Streaming support
 */

import { supabase } from './supabase';
import { logger } from './logger';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PortalProxyRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  stream?: boolean;
  portalSlug?: string;
}

export interface PortalProxyResponse {
  output: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    costCents: number;
  };
  model: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTAL CONTEXT DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if the current page is a portal page
 */
export function isPortalPage(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/portal/');
}

/**
 * Get the current portal slug from the URL
 */
export function getCurrentPortalSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/portal\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Check if portal mode should be enabled
 * Portal mode is enabled when:
 * 1. User is on a portal page (URL starts with /portal/)
 * 2. User came from a portal page (referrer from portal)
 * 3. Portal mode was explicitly requested via URL param
 */
export function shouldUsePortalMode(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if we're on a portal page
  if (isPortalPage()) return true;

  // Check for portal referrer (user clicked a skill from portal page)
  const referrer = document.referrer;
  if (referrer && new URL(referrer).pathname.startsWith('/portal/')) {
    return true;
  }

  // Check for portal mode URL parameter
  const params = new URLSearchParams(window.location.search);
  if (params.get('portal') === 'true') return true;

  // Check sessionStorage for portal session
  const portalSession = sessionStorage.getItem('skillengine_portal_session');
  if (portalSession) return true;

  return false;
}

/**
 * Store portal slug in session storage for cross-page navigation
 */
export function setPortalSession(slug: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('skillengine_portal_session', slug);
}

/**
 * Get the stored portal slug from session
 */
export function getPortalSession(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('skillengine_portal_session');
}

/**
 * Clear the portal session
 */
export function clearPortalSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('skillengine_portal_session');
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get Supabase URL from environment or client
 */
function getSupabaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
    return import.meta.env.VITE_SUPABASE_URL;
  }
  return supabase?.supabaseUrl || '';
}

/**
 * Get Supabase anon key from environment
 * Required for Edge Function calls even without user auth
 */
function getSupabaseAnonKey(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTAL PROXY API CALLS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Make an AI API call through the portal proxy (no auth required)
 */
export async function callPortalProxy(request: PortalProxyRequest): Promise<PortalProxyResponse> {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  const anonKey = getSupabaseAnonKey();
  if (!anonKey) {
    throw new Error('Supabase configuration not available');
  }

  // Include portal slug if available
  const portalSlug = request.portalSlug || getCurrentPortalSlug() || getPortalSession() || 'anonymous';

  const response = await fetch(`${supabaseUrl}/functions/v1/portal-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'x-portal-slug': portalSlug,
    },
    body: JSON.stringify({
      ...request,
      portalSlug,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded. Please try again in ${data.retryAfter || 60} seconds.`);
    }
    throw new Error(data.error || `Portal proxy error: ${response.status}`);
  }

  return data as PortalProxyResponse;
}

/**
 * Stream AI response through the portal proxy (no auth required)
 * Returns an async generator that yields content chunks
 */
export async function* streamPortalProxy(request: PortalProxyRequest): AsyncGenerator<string, void, unknown> {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    throw new Error('Portal proxy error: Supabase URL not configured. Check VITE_SUPABASE_URL environment variable.');
  }

  const anonKey = getSupabaseAnonKey();
  if (!anonKey) {
    throw new Error('Portal proxy error: Supabase anon key not configured. Check VITE_SUPABASE_ANON_KEY environment variable.');
  }

  // Include portal slug if available
  const portalSlug = request.portalSlug || getCurrentPortalSlug() || getPortalSession() || 'anonymous';

  const functionUrl = `${supabaseUrl}/functions/v1/portal-proxy`;

  let response: Response;
  try {
    response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'x-portal-slug': portalSlug,
      },
      body: JSON.stringify({
        ...request,
        stream: true,
        portalSlug,
      }),
    });
  } catch (networkError) {
    throw new Error(`Portal proxy network error: ${networkError instanceof Error ? networkError.message : 'Failed to connect'}. URL: ${functionUrl}`);
  }

  if (!response.ok) {
    // Try to get detailed error information
    let errorDetails = '';
    let errorData: any = {};

    try {
      const responseText = await response.text();
      try {
        errorData = JSON.parse(responseText);
        errorDetails = errorData.error || errorData.message || responseText;
      } catch {
        errorDetails = responseText || 'No response body';
      }
    } catch {
      errorDetails = 'Could not read error response';
    }

    // Build detailed error message for diagnosis
    const diagnosticInfo = [
      `Status: ${response.status} ${response.statusText}`,
      `URL: ${functionUrl}`,
      `Response: ${errorDetails.substring(0, 500)}`,
      `Anon key present: ${anonKey ? 'Yes (length: ' + anonKey.length + ')' : 'No'}`,
    ].join(' | ');

    if (response.status === 401) {
      throw new Error(`Portal proxy auth error (401): ${diagnosticInfo}`);
    }
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded. Please try again in ${errorData.retryAfter || 60} seconds.`);
    }
    if (response.status === 404) {
      throw new Error(`Portal proxy not found (404): Edge function may not be deployed. ${diagnosticInfo}`);
    }
    if (response.status >= 500) {
      throw new Error(`Portal proxy server error (${response.status}): ${diagnosticInfo}`);
    }

    throw new Error(`Portal proxy error (${response.status}): ${diagnosticInfo}`);
  }

  // Check if we got a streaming response
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    // Non-streaming response (fallback)
    const data = await response.json();
    yield data.output;
    return;
  }

  // Process SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Ignore parse errors for partial chunks
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.startsWith('data: ')) {
      const jsonStr = buffer.slice(6).trim();
      if (jsonStr && jsonStr !== '[DONE]') {
        try {
          const data = JSON.parse(jsonStr);
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTAL STATUS CHECK
// ═══════════════════════════════════════════════════════════════════════════

let portalAvailableCache: boolean | null = null;

/**
 * Check if the portal proxy is available
 * This doesn't require authentication - just checks if the endpoint exists
 */
export async function isPortalProxyAvailable(): Promise<boolean> {
  // Return cached result if available
  if (portalAvailableCache !== null) {
    return portalAvailableCache;
  }

  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    portalAvailableCache = false;
    return false;
  }

  const anonKey = getSupabaseAnonKey();
  if (!anonKey) {
    portalAvailableCache = false;
    return false;
  }

  try {
    // Check platform status to see if OpenAI is configured
    const response = await fetch(`${supabaseUrl}/functions/v1/platform-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
    });

    if (!response.ok) {
      portalAvailableCache = false;
      return false;
    }

    const data = await response.json();
    // Portal proxy requires OpenAI to be configured
    portalAvailableCache = data.providers?.openai ?? false;
    return portalAvailableCache;
  } catch (error) {
    logger.warn('Failed to check portal proxy availability', {
      error: error instanceof Error ? error.message : String(error),
    });
    portalAvailableCache = false;
    return false;
  }
}

/**
 * Clear the portal availability cache (useful after config changes)
 */
export function clearPortalAvailabilityCache(): void {
  portalAvailableCache = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTAL MODE INFO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Information about portal mode for display
 */
export const PORTAL_MODE_INFO = {
  model: 'GPT-4o Mini',
  modelId: 'gpt-4o-mini',
  provider: 'OpenAI',
  maxTokens: 2048,
  description: 'Fast, cost-effective model perfect for trying out skills',
  restrictions: [
    'Limited to 2,048 output tokens per request',
    'Rate limited to 10 requests per minute',
    'Daily limit of 50 requests per visitor',
  ],
};
