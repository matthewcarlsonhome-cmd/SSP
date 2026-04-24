/**
 * extractor.ts — two-pass extraction middleware.
 *
 * After a step runs and produces prose, the extractor makes a second
 * (cheap, fast-tier) LLM call to pull out the contract-declared fields as
 * structured JSON. Downstream steps then consume specific fields rather
 * than the entire prose blob — the design choice that lets long workflows
 * avoid context bloat.
 *
 * The extractor degrades gracefully:
 *  - No contract → returns { fields: {}, raw: <input> } untouched.
 *  - Extraction call fails → logs the error and returns empty fields so
 *    the run continues with prose-only handoffs (matching legacy behavior).
 *  - JSON parsing fails → tolerant repair: strip code fences, find the
 *    largest JSON object, then accept what parses.
 */

import { logger } from '../logger';
import { runPrompt, type AgenticProvider } from './providers';
import type { OutputContract } from './types';

export interface ExtractionResult {
  fields: Record<string, unknown>;
  raw: string;
  extractedWith: 'contract' | 'no-contract' | 'extraction-failed';
  errorMessage?: string;
}

interface ExtractArgs {
  rawOutput: string;
  contract?: OutputContract;
  provider: AgenticProvider;
  apiKey: string;
  signal?: AbortSignal;
}

/**
 * Build the extraction system prompt. Asks the model to return ONLY a JSON
 * object, no prose, no code fences.
 */
function buildExtractionSystem(contract: OutputContract): string {
  const fieldDocs = contract.fields
    .map(
      f =>
        `  "${f.key}": ${f.format === 'json' ? '{...}' : f.format === 'number' ? '0' : '"..."'} ` +
        `// ${f.description}`,
    )
    .join('\n');
  return (
    'You are an extraction engine. Read the provided text and return a JSON ' +
    'object containing the requested fields. If a field is not present in the ' +
    'text, set it to null. Return ONLY the JSON object — no prose, no markdown ' +
    'code fences, no commentary.\n\n' +
    'Schema:\n' +
    '{\n' +
    fieldDocs +
    '\n}'
  );
}

/**
 * Tolerant JSON parsing — strips markdown code fences, locates the outermost
 * JSON object, and parses what's there. Returns null if nothing parses.
 */
export function parseLooseJSON(text: string): Record<string, unknown> | null {
  if (!text) return null;
  let s = text.trim();

  // strip ```json ... ``` fences
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) s = fenceMatch[1].trim();

  // find first { and last }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) return null;
  const candidate = s.slice(first, last + 1);
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Run the extraction pass. Always returns an ExtractionResult — never throws
 * — so a failed extraction does not abort the agentic run.
 */
export async function extractStructured(args: ExtractArgs): Promise<ExtractionResult> {
  if (!args.contract || args.contract.fields.length === 0) {
    return { fields: {}, raw: args.rawOutput, extractedWith: 'no-contract' };
  }

  const systemInstruction = buildExtractionSystem(args.contract);
  const userPrompt =
    'Text to extract from:\n\n' +
    '---\n' +
    args.rawOutput +
    '\n---\n\n' +
    'Return the JSON object now.';

  try {
    const result = await runPrompt({
      provider: args.provider,
      apiKey: args.apiKey,
      systemInstruction,
      userPrompt,
      modelTier: 'fast',  // Haiku-class — extraction is cheap
      signal: args.signal,
    });
    const fields = parseLooseJSON(result.text);
    if (!fields) {
      logger.warn('agentic.extractor produced unparseable JSON', { sample: result.text.slice(0, 200) });
      return {
        fields: {},
        raw: args.rawOutput,
        extractedWith: 'extraction-failed',
        errorMessage: 'JSON parse failed',
      };
    }
    return { fields, raw: args.rawOutput, extractedWith: 'contract' };
  } catch (err) {
    logger.error('agentic.extractor LLM call failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      fields: {},
      raw: args.rawOutput,
      extractedWith: 'extraction-failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}
