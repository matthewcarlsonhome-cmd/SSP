import { describe, expect, it } from 'vitest';
import {
  applyMemoryCorrection,
  buildEntityGraph,
  buildMemoryContextEnvelope,
  extractFactsFromStepOutput,
  filterActiveFacts,
  memoryFactsToKeyValue,
  rankMemoryFactsForGoal,
  retrieveMemoryForGoal,
  type MemoryFact,
} from '../../lib/agentic';

describe('memory framework', () => {
  it('extracts PPC priority facts from structured output using policies', () => {
    const facts = extractFactsFromStepOutput({
      workflowId: 'ppc-master-weekly-workflow',
      stepId: 'step-1-triage',
      structuredFields: {
        p1_accounts: [{ account: 'Alpha Co', reason: 'Spend spike' }],
        p2_accounts: [{ account_name: 'Beta Co' }],
      },
      now: new Date('2026-04-29T00:00:00.000Z'),
    });

    expect(facts).toHaveLength(2);
    expect(facts[0]).toMatchObject({
      entity: { type: 'account', id: 'Alpha Co' },
      key: 'priority',
      value: 'P1',
    });
    expect(facts[0].validUntil).toBeTruthy();
  });

  it('filters expired facts and creates a memory context envelope', () => {
    const facts: MemoryFact[] = [
      {
        entity: { type: 'account', id: 'Alpha' },
        key: 'priority',
        value: 'P1',
        confidence: 0.9,
        validFrom: '2026-04-01T00:00:00.000Z',
        validUntil: '2026-05-01T00:00:00.000Z',
      },
      {
        entity: { type: 'account', id: 'Old' },
        key: 'priority',
        value: 'P3',
        confidence: 0.4,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2026-02-01T00:00:00.000Z',
      },
    ];
    const active = filterActiveFacts(facts, new Date('2026-04-29T00:00:00.000Z'));
    expect(active).toHaveLength(1);
    const envelope = buildMemoryContextEnvelope({ facts, now: new Date('2026-04-29T00:00:00.000Z') });
    expect(envelope.summary).toContain('1 active memory fact');
    expect(envelope.graph.nodes).toHaveLength(1);
  });

  it('builds graph nodes and applies corrections', () => {
    const fact: MemoryFact = {
      entity: { type: 'account', id: 'Alpha' },
      key: 'client_id',
      value: 'Client A',
      confidence: 0.6,
      validFrom: '2026-04-29T00:00:00.000Z',
    };
    const graph = buildEntityGraph([fact]);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges[0].relation).toBe('client');
    const corrected = applyMemoryCorrection({
      fact,
      correctedValue: 'Client B',
      correctedAt: '2026-04-29T12:00:00.000Z',
    });
    expect(corrected.value).toBe('Client B');
    expect(corrected.confidence).toBe(1);
    expect(memoryFactsToKeyValue([corrected])['account:Alpha:client_id']).toBe('Client B');
  });

  it('ranks high-confidence matching facts for goal planning', async () => {
    const facts: MemoryFact[] = [
      {
        entity: { type: 'account', id: 'Alpha' },
        key: 'priority',
        value: 'P1 wasted spend spike',
        confidence: 0.9,
        validFrom: '2026-04-28T00:00:00.000Z',
      },
      {
        entity: { type: 'account', id: 'Other' },
        key: 'note',
        value: 'Unrelated contract note',
        confidence: 0.4,
        validFrom: '2026-01-01T00:00:00.000Z',
      },
      {
        entity: { type: 'account', id: 'Alpha' },
        key: 'old_priority',
        value: 'P3',
        confidence: 1,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2026-02-01T00:00:00.000Z',
      },
    ];

    const ranked = rankMemoryFactsForGoal({
      facts,
      goal: 'Prepare a PPC packet for Alpha wasted spend',
      domainHints: ['ppc'],
      focusEntity: { type: 'account', id: 'Alpha' },
      now: new Date('2026-04-29T00:00:00.000Z'),
    });

    expect(ranked[0].fact.key).toBe('priority');
    expect(ranked.some((item) => item.fact.key === 'old_priority')).toBe(false);

    const envelope = await retrieveMemoryForGoal({
      facts,
      goal: 'Prepare a PPC packet for Alpha wasted spend',
      entity: { type: 'account', id: 'Alpha' },
      now: new Date('2026-04-29T00:00:00.000Z'),
    });
    expect(envelope.facts[0].key).toBe('priority');
  });
});
