/**
 * usePortalMode Hook
 *
 * Provides portal mode detection and configuration for skill/workflow runners.
 * When in portal mode, uses the portal-proxy for anonymous access to GPT-4o-mini.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  shouldUsePortalMode,
  getCurrentPortalSlug,
  getPortalSession,
  setPortalSession,
  isPortalProxyAvailable,
  streamPortalProxy,
  callPortalProxy,
  PORTAL_MODE_INFO,
} from '../lib/portalProxy';
import { hasStoredKey } from '../lib/apiKeyStorage';
import { logger } from '../lib/logger';

export interface PortalModeState {
  /** Whether portal mode is active */
  isPortalMode: boolean;
  /** Whether portal mode is available (proxy configured) */
  isPortalAvailable: boolean;
  /** The current portal slug (if on portal) */
  portalSlug: string | null;
  /** Whether checking is in progress */
  isLoading: boolean;
  /** Model info for portal mode */
  modelInfo: typeof PORTAL_MODE_INFO;
  /** Whether user has their own API key configured */
  hasPersonalKey: boolean;
}

export interface UsePortalModeReturn extends PortalModeState {
  /** Force enable portal mode for this session */
  enablePortalMode: (slug?: string) => void;
  /** Disable portal mode */
  disablePortalMode: () => void;
  /** Execute a skill using portal proxy (streaming) */
  executeWithPortalProxy: (
    prompt: string,
    systemPrompt?: string,
    onChunk?: (chunk: string) => void
  ) => Promise<string>;
  /** Check if we can run (portal available OR personal key) */
  canRun: boolean;
  /** Reason why we can't run (if canRun is false) */
  cantRunReason: string | null;
}

/**
 * Hook for managing portal mode in skill/workflow runners
 */
export function usePortalMode(): UsePortalModeReturn {
  const [isPortalMode, setIsPortalMode] = useState(false);
  const [isPortalAvailable, setIsPortalAvailable] = useState(false);
  const [portalSlug, setPortalSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPersonalKey, setHasPersonalKey] = useState(false);

  // Check portal mode on mount and URL changes
  useEffect(() => {
    const checkPortalMode = async () => {
      setIsLoading(true);

      try {
        // Check if user has their own key
        const hasKey = hasStoredKey('chatgpt') || hasStoredKey('gemini') || hasStoredKey('claude');
        setHasPersonalKey(hasKey);

        // Check if portal mode should be enabled
        const shouldUsePortal = shouldUsePortalMode();
        const slug = getCurrentPortalSlug() || getPortalSession();
        setPortalSlug(slug);

        // Check if portal proxy is available
        const available = await isPortalProxyAvailable();
        setIsPortalAvailable(available);

        // Enable portal mode if:
        // 1. User should use portal mode (on portal page, came from portal, etc.)
        // 2. Portal proxy is available
        // 3. User doesn't have their own key (or prefers portal)
        if (shouldUsePortal && available) {
          setIsPortalMode(true);
          if (slug) {
            setPortalSession(slug);
          }
        } else if (!hasKey && available) {
          // Even if not on portal, enable portal mode if no personal key and proxy available
          setIsPortalMode(true);
        }
      } catch (error) {
        logger.error('Failed to check portal mode', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkPortalMode();
  }, []);

  const enablePortalMode = useCallback((slug?: string) => {
    setIsPortalMode(true);
    if (slug) {
      setPortalSlug(slug);
      setPortalSession(slug);
    }
  }, []);

  const disablePortalMode = useCallback(() => {
    setIsPortalMode(false);
  }, []);

  /**
   * Execute a skill using the portal proxy
   */
  const executeWithPortalProxy = useCallback(
    async (
      prompt: string,
      systemPrompt?: string,
      onChunk?: (chunk: string) => void
    ): Promise<string> => {
      const slug = portalSlug || 'anonymous';

      if (onChunk) {
        // Streaming mode
        let fullResponse = '';
        const stream = streamPortalProxy({
          prompt,
          systemPrompt,
          portalSlug: slug,
        });

        for await (const chunk of stream) {
          fullResponse += chunk;
          onChunk(chunk);
        }

        return fullResponse;
      } else {
        // Non-streaming mode
        const response = await callPortalProxy({
          prompt,
          systemPrompt,
          portalSlug: slug,
        });
        return response.output;
      }
    },
    [portalSlug]
  );

  // Determine if we can run
  const canRun = hasPersonalKey || (isPortalMode && isPortalAvailable);
  const cantRunReason = canRun
    ? null
    : isPortalAvailable
    ? 'Configure an API key in Settings to run skills'
    : 'No API key configured and portal mode not available';

  return {
    isPortalMode,
    isPortalAvailable,
    portalSlug,
    isLoading,
    modelInfo: PORTAL_MODE_INFO,
    hasPersonalKey,
    enablePortalMode,
    disablePortalMode,
    executeWithPortalProxy,
    canRun,
    cantRunReason,
  };
}

export default usePortalMode;
