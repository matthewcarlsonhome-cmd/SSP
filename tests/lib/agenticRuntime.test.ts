/**
 * Tests for the agentic runtime layer:
 *  - extractor.parseLooseJSON (tolerant JSON repair)
 *  - planner.staticPlan
 *  - planner normalization (via the public plan() function with mocked LLM)
 *  - skillTool.appendContractDirective
 *
 * The runner itself is not exercised end-to-end here because it requires a
 * real LLM call. Its building blocks are unit-tested individually.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { parseLooseJSON } from '../../lib/agentic/extractor';
import { staticPlan, plan } from '../../lib/agentic/planner';
import { appendContractDirective } from '../../lib/agentic/skillTool';
import { PPC_MASTER_WEEKLY_DAG } from '../../lib/agentic/contracts/ppcMasterWeekly';
import type { OutputContract } from '../../lib/agentic';

// Mock the providers module so plan() doesn't make real network calls.
vi.mock('../../lib/agentic/providers', () => ({
  runPrompt: vi.fn(),
}));

import { runPrompt } from '../../lib/agentic/providers';

describe('extractor.parseLooseJSON', () => {
  it('parses bare JSON', () => {
    expect(parseLooseJSON('{"a": 1}')).toEqual({ a: 1 });
  });

  it('strips ```json fences', () => {
    const text = '```json\n{"x": "y"}\n```';
    expect(parseLooseJSON(text)).toEqual({ x: 'y' });
  });

  it('extracts JSON embedded in surrounding prose', () => {
    const text = 'Here is the result:\n{"score": 0.9, "tag": "p1"}\n\nHope this helps.';
    expect(parseLooseJSON(text)).toEqual({ score: 0.9, tag: 'p1' });
  });

  it('returns null when no object is present', () => {
    expect(parseLooseJSON('plain text only')).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    expect(parseLooseJSON('{"a": not-valid}')).toBeNull();
  });
});

describe('skillTool.appendContractDirective', () => {
  it('returns the prompt unchanged when no contract is provided', () => {
    expect(appendContractDirective('hello', undefined)).toBe('hello');
  });

  it('appends a contract section when fields are present', () => {
    const c: OutputContract = {
      fields: [{ key: 'priority', format: 'text', description: 'P1/P2/P3' }],
    };
    const result = appendContractDirective('do the work', c);
    expect(result).toContain('do the work');
    expect(result).toContain('Structured Output');
    expect(result).toContain('priority');
    expect(result).toContain('P1/P2/P3');
  });
});

describe('planner.staticPlan', () => {
  it('produces one round per topo-level for the PPC DAG', () => {
    const p = staticPlan(PPC_MASTER_WEEKLY_DAG);
    expect(p.strategy).toBe('static');
    expect(p.rounds.length).toBeGreaterThan(0);
    expect(p.skipped).toEqual([]);
    // Every step should appear in exactly one round.
    const allStepIds = p.rounds.flatMap(r => r.stepIds);
    expect(new Set(allStepIds).size).toBe(PPC_MASTER_WEEKLY_DAG.steps.length);
  });
});

describe('planner.plan', () => {
  beforeEach(() => {
    vi.mocked(runPrompt).mockReset();
  });

  it('returns a normalized plan when the LLM emits a valid JSON plan', async () => {
    vi.mocked(runPrompt).mockResolvedValue({
      text: JSON.stringify({
        rounds: [
          { step_ids: ['step-1-triage'] },
          { step_ids: ['step-2-recommendations', 'step-3-search-terms', 'step-4-pmax', 'step-6-dashboard'] },
          { step_ids: ['step-5-deliverables'] },
          { step_ids: ['step-7-change-log'] },
        ],
        skipped: [],
        reasoning: 'parallelized fan-out from triage',
      }),
      durationMs: 100,
    });

    const result = await plan({
      dag: PPC_MASTER_WEEKLY_DAG,
      userInputs: {},
      provider: 'claude',
      apiKey: 'sk-test',
    });

    expect(result.strategy).toBe('planned');
    expect(result.rounds).toHaveLength(4);
    expect(result.rounds[1].stepIds.length).toBe(4);
    expect(result.reasoning).toContain('parallelized');
  });

  it('falls back to static plan when the LLM returns garbage', async () => {
    vi.mocked(runPrompt).mockResolvedValue({
      text: 'I am sorry but I cannot help with that.',
      durationMs: 10,
    });

    const result = await plan({
      dag: PPC_MASTER_WEEKLY_DAG,
      userInputs: {},
      provider: 'claude',
      apiKey: 'sk-test',
    });

    expect(result.strategy).toBe('static');
    expect(result.rounds.length).toBeGreaterThan(0);
  });

  it('falls back to static plan when the LLM call throws', async () => {
    vi.mocked(runPrompt).mockRejectedValue(new Error('429 rate limit'));

    const result = await plan({
      dag: PPC_MASTER_WEEKLY_DAG,
      userInputs: {},
      provider: 'claude',
      apiKey: 'sk-test',
    });

    expect(result.strategy).toBe('static');
  });

  it('falls back when the planner emits a plan that violates dependencies', async () => {
    // Place step-5-deliverables before its dependencies — invalid.
    vi.mocked(runPrompt).mockResolvedValue({
      text: JSON.stringify({
        rounds: [{ step_ids: ['step-5-deliverables'] }],
        skipped: [],
      }),
      durationMs: 10,
    });

    const result = await plan({
      dag: PPC_MASTER_WEEKLY_DAG,
      userInputs: {},
      provider: 'claude',
      apiKey: 'sk-test',
    });

    expect(result.strategy).toBe('static');
  });
});

describe('PPC_MASTER_WEEKLY_DAG', () => {
  it('has output contracts on every step', () => {
    PPC_MASTER_WEEKLY_DAG.steps.forEach(s => {
      expect(s.outputContract).toBeDefined();
      expect(s.outputContract!.fields.length).toBeGreaterThan(0);
    });
  });

  it('has a real merge point at deliverables', () => {
    const deliverables = PPC_MASTER_WEEKLY_DAG.steps.find(s => s.id === 'step-5-deliverables');
    expect(deliverables).toBeDefined();
    expect(deliverables!.dependsOn.length).toBeGreaterThanOrEqual(3);
  });

  it('places the dashboard step in parallel with the audits (depends only on triage)', () => {
    const dashboard = PPC_MASTER_WEEKLY_DAG.steps.find(s => s.id === 'step-6-dashboard');
    expect(dashboard).toBeDefined();
    expect(dashboard!.dependsOn).toEqual(['step-1-triage']);
  });
});
