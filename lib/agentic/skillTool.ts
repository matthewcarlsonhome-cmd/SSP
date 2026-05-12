/**
 * skillTool.ts — adapts an existing Skill (lib/skills) into a callable tool
 * that the agentic runner can invoke. The Skill definition is read but never
 * mutated. New per-step concerns (output contract, context requirements) are
 * attached at the AgenticStep layer, not on the Skill itself.
 */

import { SKILLS } from '../skills';
import type { Skill } from '../../types';
import { runPrompt, type AgenticProvider, type ModelTier } from './providers';
import type { AgenticStep, OutputContract } from './types';
import type { ModelChoice } from './orchestrator';
import type { TokenUsage } from './costing';

export interface SkillToolInvocation {
  step: AgenticStep;
  skill: Skill;
  inputs: Record<string, unknown>;
  provider: AgenticProvider;
  apiKey: string;
  modelTier?: ModelTier;
  modelChoice?: ModelChoice;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

export interface SkillToolResult {
  stepId: string;
  skillId: string;
  rawOutput: string;
  durationMs: number;
  modelChoice?: ModelChoice;
  tokenUsage?: TokenUsage;
}

/**
 * Resolve a Skill from its id. Throws if not found so callers can surface the
 * misconfiguration loudly rather than silently no-op.
 */
export function resolveSkill(skillId: string): Skill {
  const skill = SKILLS[skillId];
  if (!skill) {
    throw new Error(
      `Agentic skillTool: skill "${skillId}" is not registered in lib/skills/. ` +
        'Either the workflow references an unknown skill, or the skill registry ' +
        'has not been imported yet.',
    );
  }
  return skill;
}

/**
 * Append a contract directive to a skill's userPrompt so the model is asked to
 * include the structured fields the downstream extractor will look for. The
 * primary skill prompt is unchanged — we add a tail instruction rather than
 * editing the original generatePrompt() output.
 */
export function appendContractDirective(userPrompt: string, contract?: OutputContract): string {
  if (!contract || contract.fields.length === 0) return userPrompt;

  const fields = contract.fields
    .map(f => `  - ${f.key} (${f.format}): ${f.description}`)
    .join('\n');

  return (
    `${userPrompt}\n\n` +
    `---\n` +
    `OUTPUT CONTRACT — In addition to your normal response, include a section ` +
    `at the end titled "## Structured Output" containing the following named ` +
    `fields. Use clear labels so the fields can be extracted programmatically:\n` +
    `${fields}`
  );
}

/**
 * Invoke a skill as a tool. Returns the raw text output. Structured extraction
 * is performed in a separate pass by lib/agentic/extractor.ts.
 */
export async function invokeSkill(args: SkillToolInvocation): Promise<SkillToolResult> {
  const { step, skill, inputs, provider, apiKey, modelTier, modelChoice, onChunk, signal } = args;
  const prompt = skill.generatePrompt(inputs);

  const userPrompt = appendContractDirective(prompt.userPrompt, step.outputContract);
  const routedTier = modelChoice?.selectedTier ?? modelTier;

  const result = await runPrompt({
    provider,
    apiKey,
    systemInstruction: prompt.systemInstruction,
    userPrompt,
    modelTier: routedTier,
    onChunk,
    signal,
  });

  return {
    stepId: step.id,
    skillId: step.skillId,
    rawOutput: result.text,
    durationMs: result.durationMs,
    modelChoice,
    tokenUsage: result.tokenUsage,
  };
}
