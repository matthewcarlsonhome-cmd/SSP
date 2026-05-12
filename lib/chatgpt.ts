// ChatGPT/OpenAI API configuration
// Supports streaming responses from OpenAI's chat completions API

import { logger } from './logger';

// Available ChatGPT models:
// - gpt-4o: Most capable model, best for complex tasks
// - gpt-4o-mini: Fast and cost-effective, good for most tasks
// - o1: Advanced reasoning model
// - o1-preview: Legacy reasoning model alias
// - o1-mini: Smaller reasoning model (experimental)
export const CHATGPT_MODELS = {
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'o1': 'o1',
  'o1-preview': 'o1-preview',
  'o1-mini': 'o1-mini',
} as const;

export type ChatGPTModelType = keyof typeof CHATGPT_MODELS;

// Human-readable names for error messages
const MODEL_NAMES: Record<ChatGPTModelType, string> = {
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'o1': 'o1',
  'o1-preview': 'o1 Preview',
  'o1-mini': 'o1 Mini',
};

// Default to gpt-4o-mini for balanced speed/quality
const DEFAULT_MODEL = CHATGPT_MODELS['gpt-4o-mini'];

export async function runSkillStream(
  apiKey: string,
  promptData: { systemInstruction: string; userPrompt: string },
  modelType: ChatGPTModelType = 'gpt-4o-mini'
): Promise<Response> {
  if (!apiKey) {
    throw new Error('API key is missing. Please provide a valid OpenAI API key.');
  }

  const API_URL = 'https://api.openai.com/v1/chat/completions';
  const MODEL_NAME = CHATGPT_MODELS[modelType] || DEFAULT_MODEL;

  // o1 models don't support system messages or streaming
  const isO1Model = modelType.startsWith('o1');

  try {
    const messages = isO1Model
      ? [
          // For o1 models, combine system instruction with user prompt
          {
            role: 'user' as const,
            content: `${promptData.systemInstruction}\n\n---\n\n${promptData.userPrompt}`,
          },
        ]
      : [
          { role: 'system' as const, content: promptData.systemInstruction },
          { role: 'user' as const, content: promptData.userPrompt },
        ];

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages,
        stream: !isO1Model, // o1 models don't support streaming
        stream_options: isO1Model ? undefined : { include_usage: true },
        max_completion_tokens: isO1Model ? 16384 : undefined,
        max_tokens: isO1Model ? undefined : 4096,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const modelDisplayName = MODEL_NAMES[modelType] || modelType;
      logger.error(`OpenAI API error (${modelDisplayName})`, { status: response.status, error: errorBody });

      // Provide specific error messages
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      }
      if (response.status === 403) {
        throw new Error(
          `Access denied for ${modelDisplayName}. Your API key may not have access to this model.`
        );
      }
      if (response.status === 404) {
        throw new Error(
          `Model ${modelDisplayName} not found. This model may not be available for your account.`
        );
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (response.status === 400) {
        throw new Error(
          `Bad request: ${errorBody.error?.message || 'Invalid request parameters'}`
        );
      }

      throw new Error(
        `OpenAI API Error (${modelDisplayName}): ${errorBody.error?.message || response.statusText}`
      );
    }

    // For o1 models (non-streaming), wrap the response in a streaming-like format
    if (isO1Model) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Create a fake streaming response for consistency
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send as a single SSE event
          const sseData = `data: ${JSON.stringify({
            choices: [{ delta: { content } }],
          })}\n\ndata: ${JSON.stringify({ choices: [], usage: data.usage })}\n\ndata: [DONE]\n\n`;
          controller.enqueue(encoder.encode(sseData));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }

    return response;
  } catch (error) {
    logger.error('OpenAI API call failed', { error: error instanceof Error ? error.message : String(error) });

    // CORS or network error
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(
        'Failed to connect to OpenAI API. Please check your internet connection ' +
          'and ensure no browser extensions are blocking the request.'
      );
    }

    if (error instanceof Error) {
      throw new Error(`Failed to get response from ChatGPT: ${error.message}`);
    }
    throw new Error('An unknown error occurred while calling the OpenAI API.');
  }
}
