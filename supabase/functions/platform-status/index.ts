/**
 * Platform Status Edge Function
 *
 * Returns which AI providers have platform keys configured.
 * This allows the frontend to show/hide the Platform Key option
 * based on whether the admin has set up the API keys.
 *
 * No authentication required - this is a public endpoint that just
 * reports which providers are available (not the keys themselves).
 *
 * Rate limited to prevent enumeration attacks.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════════════════
// INLINE RATE LIMITING (self-contained, no shared imports)
// ═══════════════════════════════════════════════════════════════════════════

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = { maxRequests: 60, windowSeconds: 60 }; // 60 req/min

function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = RATE_LIMIT.windowSeconds * 1000;
  const key = `platform-status:${identifier}`;

  let entry = rateLimitStore.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { count: 0, windowStart: now };
    rateLimitStore.set(key, entry);
  }

  if (entry.count >= RATE_LIMIT.maxRequests) {
    const windowEnd = entry.windowStart + windowMs;
    return { allowed: false, retryAfter: Math.ceil((windowEnd - now) / 1000) };
  }

  entry.count++;
  rateLimitStore.set(key, entry);
  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check rate limits
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check which API keys are configured
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const claudeKey = Deno.env.get('CLAUDE_API_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    // A key is considered "configured" if it exists and has a reasonable length
    const isConfigured = (key: string | undefined): boolean => {
      return !!key && key.length > 10 && !key.includes('your-') && !key.includes('YOUR_');
    };

    const providers = {
      gemini: isConfigured(geminiKey),
      claude: isConfigured(claudeKey),
      openai: isConfigured(openaiKey),
    };

    // Platform is available if at least one provider is configured
    const available = providers.gemini || providers.claude || providers.openai;

    return new Response(
      JSON.stringify({
        available,
        providers,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Platform status error:', error);
    return new Response(
      JSON.stringify({
        available: false,
        providers: { gemini: false, claude: false, openai: false },
        error: 'Failed to check platform status',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
