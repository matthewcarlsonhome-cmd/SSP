/**
 * intake.ts — document-first input intake.
 *
 * The SSP team's reality on Monday morning is that the relevant context for
 * the PPC Master Weekly run already exists as: alert emails, Slack threads,
 * Looker exports, and the calendar. Asking them to re-key 15 fields by hand
 * is the friction the agentic redesign exists to remove.
 *
 * This module takes a single freeform text dump (paste anything: emails,
 * exports, screenshots-as-text) plus a set of expected input fields and
 * uses the same provider plumbing as the runner to extract structured
 * values. Caller can review and edit extracted values before submitting.
 *
 * Failure mode: if extraction fails, the dump is preserved verbatim so the
 * user can manually pull values from it.
 */

import { runPrompt, type AgenticProvider } from './providers';
import { parseLooseJSON } from './extractor';
import { logger } from '../logger';

export interface IntakeFieldSpec {
  id: string;
  label: string;
  description?: string;
  format?: 'text' | 'list' | 'number';
}

export interface IntakeResult {
  fields: Record<string, string>;
  unmatched: string[];        // ids of fields the model could not populate
  warnings: string[];
}

interface ExtractIntakeArgs {
  document: string;
  fields: IntakeFieldSpec[];
  provider: AgenticProvider;
  apiKey: string;
}

function buildSystemPrompt(): string {
  return (
    'You are an intake extractor. Read the user-provided document and pull out the requested ' +
    'fields. Each field has an id, a label, and a description. Return ONLY a JSON object ' +
    'mapping field id → string value. If a field is not present in the document, set it to ' +
    'an empty string. No prose, no code fences, just the JSON object.'
  );
}

function buildUserPrompt(document: string, fields: IntakeFieldSpec[]): string {
  const fieldDocs = fields
    .map(
      f =>
        `  "${f.id}": "..."   // ${f.label}${f.description ? ' — ' + f.description : ''}` +
        (f.format ? ` (format: ${f.format})` : ''),
    )
    .join('\n');
  return (
    'Fields to extract:\n{\n' +
    fieldDocs +
    '\n}\n\n' +
    'Document:\n---\n' +
    document.slice(0, 16000) +  // hard cap to keep prompts manageable
    '\n---\n\n' +
    'Return the JSON object now.'
  );
}

export async function extractIntake(args: ExtractIntakeArgs): Promise<IntakeResult> {
  if (!args.document.trim()) {
    return {
      fields: Object.fromEntries(args.fields.map(f => [f.id, ''])),
      unmatched: args.fields.map(f => f.id),
      warnings: ['Document is empty.'],
    };
  }

  try {
    const result = await runPrompt({
      provider: args.provider,
      apiKey: args.apiKey,
      systemInstruction: buildSystemPrompt(),
      userPrompt: buildUserPrompt(args.document, args.fields),
      modelTier: 'fast',
    });

    const parsed = parseLooseJSON(result.text);
    if (!parsed) {
      return {
        fields: Object.fromEntries(args.fields.map(f => [f.id, ''])),
        unmatched: args.fields.map(f => f.id),
        warnings: ['Extractor returned unparseable output. Document is preserved for manual entry.'],
      };
    }

    const out: Record<string, string> = {};
    const unmatched: string[] = [];
    for (const f of args.fields) {
      const v = parsed[f.id];
      if (typeof v === 'string' && v.trim()) {
        out[f.id] = v;
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        out[f.id] = String(v);
      } else {
        out[f.id] = '';
        unmatched.push(f.id);
      }
    }
    return { fields: out, unmatched, warnings: [] };
  } catch (err) {
    logger.warn('agentic.intake extractIntake failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      fields: Object.fromEntries(args.fields.map(f => [f.id, ''])),
      unmatched: args.fields.map(f => f.id),
      warnings: [`Extractor call failed: ${err instanceof Error ? err.message : 'unknown error'}.`],
    };
  }
}
