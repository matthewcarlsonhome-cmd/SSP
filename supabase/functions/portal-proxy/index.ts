/**
 * Portal Proxy Edge Function
 *
 * This Supabase Edge Function provides anonymous access to AI capabilities
 * for portal visitors (prospective clients viewing skills/workflows).
 *
 * Features:
 * - NO authentication required (anonymous access for portal demos)
 * - RESTRICTED to GPT-4o-mini only (cost-effective for demos)
 * - STRICT rate limiting per IP (to prevent abuse)
 * - Portal slug validation (optional, for tracking)
 * - Logs usage for analytics
 *
 * Environment Variables Required:
 * - OPENAI_API_KEY: OpenAI API key (for GPT-4o-mini)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING (strict limits for anonymous access)
// ═══════════════════════════════════════════════════════════════════════════

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  endpoint: string;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // 10 requests per minute per IP for anonymous portal access
  'portal-proxy': { maxRequests: 10, windowSeconds: 60, endpoint: 'portal-proxy' },
  // Burst limit: 3 requests per 10 seconds
  'portal-proxy-burst': { maxRequests: 3, windowSeconds: 10, endpoint: 'portal-proxy-burst' },
  // Daily limit: 50 requests per day per IP
  'portal-proxy-daily': { maxRequests: 50, windowSeconds: 86400, endpoint: 'portal-proxy-daily' },
};

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `${config.endpoint}:${identifier}`;

  let entry = rateLimitStore.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { count: 0, windowStart: now };
    rateLimitStore.set(key, entry);
  }

  const windowEnd = entry.windowStart + windowMs;
  const resetAt = new Date(windowEnd);

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil((windowEnd - now) / 1000),
    };
  }

  entry.count++;
  rateLimitStore.set(key, entry);
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt };
}

function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-slug',
};

// Only GPT-4o-mini for portal access (cost-effective)
const PORTAL_MODEL = 'gpt-4o-mini';
const PORTAL_MAX_TOKENS = 2048; // Limited for portal demos
const PORTAL_TEMPERATURE = 0.7;

// Pricing for usage tracking
const MODEL_PRICING = {
  input: 15, // cents per 1M tokens
  output: 60, // cents per 1M tokens
};

// Streaming headers for SSE
const streamHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

interface RequestBody {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  stream?: boolean;
  portalSlug?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const clientIP = getClientIP(req);

    // 1. Apply rate limits (strict for anonymous access)
    for (const [name, config] of Object.entries(RATE_LIMITS)) {
      const result = checkRateLimit(clientIP, config);
      if (!result.allowed) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: result.retryAfter,
            limit: name,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Parse request body
    const body: RequestBody = await req.json();
    const {
      prompt,
      systemPrompt,
      maxTokens = PORTAL_MAX_TOKENS,
      stream = false,
      portalSlug,
    } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optional: Also accept portal slug from header
    const slugFromHeader = req.headers.get('x-portal-slug');
    const effectiveSlug = portalSlug || slugFromHeader || 'anonymous';

    // 3. Get the OpenAI API key
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Portal AI service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Enforce portal-specific limits
    const effectiveMaxTokens = Math.min(maxTokens, PORTAL_MAX_TOKENS);

    // 5. Handle streaming vs non-streaming
    if (stream) {
      return handleStreamingResponse(
        apiKey,
        prompt,
        systemPrompt,
        effectiveMaxTokens,
        PORTAL_TEMPERATURE,
        effectiveSlug,
        clientIP
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NON-STREAMING MODE
    // ═══════════════════════════════════════════════════════════════════════
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: PORTAL_MODEL,
        messages,
        max_tokens: effectiveMaxTokens,
        temperature: PORTAL_TEMPERATURE,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const outputText = data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
    const outputTokens = data.usage?.completion_tokens || Math.ceil(outputText.length / 4);

    // Calculate cost for logging
    const inputCost = (inputTokens / 1_000_000) * MODEL_PRICING.input;
    const outputCost = (outputTokens / 1_000_000) * MODEL_PRICING.output;
    const totalCostCents = Math.ceil((inputCost + outputCost) * 100);

    // Log portal usage (non-blocking)
    logPortalUsage(effectiveSlug, clientIP, inputTokens, outputTokens, totalCostCents);

    return new Response(
      JSON.stringify({
        output: outputText,
        usage: {
          inputTokens,
          outputTokens,
          costCents: totalCostCents,
        },
        model: PORTAL_MODEL,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Portal Proxy Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STREAMING HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handleStreamingResponse(
  apiKey: string,
  prompt: string,
  systemPrompt: string | undefined,
  maxTokens: number,
  temperature: number,
  portalSlug: string,
  clientIP: string
): Promise<Response> {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: PORTAL_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    return new Response(
      JSON.stringify({ error: 'AI service temporarily unavailable' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Track usage for logging after stream completes
  let inputTokens = 0;
  let outputTokens = 0;

  // Create a transform stream that forwards chunks and tracks usage
  const { readable, writable } = new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk);
    },
  });

  // Process the stream in the background
  (async () => {
    const reader = response.body!.getReader();
    const writer = writable.getWriter();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Forward the chunk
        await writer.write(value);

        // Parse for usage info (comes in final chunk)
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.usage) {
                inputTokens = data.usage.prompt_tokens || 0;
                outputTokens = data.usage.completion_tokens || 0;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      await writer.close();

      // Log portal usage after stream completes
      if (inputTokens > 0 || outputTokens > 0) {
        const inputCost = (inputTokens / 1_000_000) * MODEL_PRICING.input;
        const outputCost = (outputTokens / 1_000_000) * MODEL_PRICING.output;
        const totalCostCents = Math.ceil((inputCost + outputCost) * 100);
        logPortalUsage(portalSlug, clientIP, inputTokens, outputTokens, totalCostCents);
      }
    }
  })();

  return new Response(readable, {
    headers: streamHeaders,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE LOGGING (for analytics)
// ═══════════════════════════════════════════════════════════════════════════

async function logPortalUsage(
  portalSlug: string,
  clientIP: string,
  inputTokens: number,
  outputTokens: number,
  costCents: number
): Promise<void> {
  try {
    // Create Supabase client for logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('Portal usage (no DB):', { portalSlug, inputTokens, outputTokens, costCents });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to log to portal_usage table (create if needed)
    const { error } = await supabase.from('portal_usage').insert({
      portal_slug: portalSlug,
      client_ip: clientIP.substring(0, 45), // Truncate for privacy
      model: PORTAL_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_cents: costCents,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Table might not exist yet, just log to console
      console.log('Portal usage:', { portalSlug, inputTokens, outputTokens, costCents });
    }
  } catch (err) {
    // Non-blocking - don't fail the request if logging fails
    console.warn('Failed to log portal usage:', err);
  }
}
