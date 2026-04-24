/**
 * Tests for lib/agentic/dagAdapter.ts
 *
 * Validates that the adapter correctly infers DAG dependencies from existing
 * Workflow definitions without modifying them, and that the topological sort
 * produces correct execution rounds.
 */

import { describe, it, expect } from 'vitest';
import {
  adaptWorkflowToDAG,
  buildExecutionRounds,
  inferDependencies,
  summarizeParallelism,
} from '../../lib/agentic';
import type { Workflow } from '../../lib/storage/types';
import { WORKFLOWS } from '../../lib/workflows';

const SEQUENTIAL_FALLBACK_WORKFLOW: Workflow = {
  id: 'test-sequential',
  name: 'Sequential test',
  description: 'No previous mappings; should chain sequentially.',
  longDescription: '',
  icon: 'Workflow',
  color: 'blue',
  estimatedTime: '5 min',
  outputs: [],
  globalInputs: [],
  steps: [
    { id: 's1', skillId: 'k1', name: 'One', description: '', inputMappings: {}, outputKey: 'o1' },
    { id: 's2', skillId: 'k2', name: 'Two', description: '', inputMappings: {}, outputKey: 'o2' },
    { id: 's3', skillId: 'k3', name: 'Three', description: '', inputMappings: {}, outputKey: 'o3' },
  ],
};

const FAN_OUT_WORKFLOW: Workflow = {
  id: 'test-fan-out',
  name: 'Fan-out test',
  description: 'Steps 2/3/4 only depend on step 1.',
  longDescription: '',
  icon: 'Workflow',
  color: 'orange',
  estimatedTime: '10 min',
  outputs: [],
  globalInputs: [],
  steps: [
    { id: 's1', skillId: 'k1', name: 'Triage', description: '', inputMappings: {}, outputKey: 'o1' },
    {
      id: 's2',
      skillId: 'k2',
      name: 'A',
      description: '',
      inputMappings: { ctx: { type: 'previous', stepId: 's1', field: 'summary' } as any },
      outputKey: 'o2',
    },
    {
      id: 's3',
      skillId: 'k3',
      name: 'B',
      description: '',
      inputMappings: { ctx: { type: 'previous', stepId: 's1', field: 'summary' } as any },
      outputKey: 'o3',
    },
    {
      id: 's4',
      skillId: 'k4',
      name: 'C',
      description: '',
      inputMappings: { ctx: { type: 'previous', stepId: 's1', field: 'summary' } as any },
      outputKey: 'o4',
    },
  ],
};

describe('dagAdapter', () => {
  describe('inferDependencies', () => {
    it('chains steps sequentially when no explicit references exist', () => {
      const deps = inferDependencies(SEQUENTIAL_FALLBACK_WORKFLOW);
      expect(deps[0]).toEqual({ stepId: 's1', inferred: [], source: 'sequential-fallback' });
      expect(deps[1]).toEqual({ stepId: 's2', inferred: ['s1'], source: 'sequential-fallback' });
      expect(deps[2]).toEqual({ stepId: 's3', inferred: ['s2'], source: 'sequential-fallback' });
    });

    it('extracts dependencies from "previous" input mappings', () => {
      const deps = inferDependencies(FAN_OUT_WORKFLOW);
      expect(deps[0]).toEqual({ stepId: 's1', inferred: [], source: 'sequential-fallback' });
      expect(deps[1].source).toBe('explicit-previous-mapping');
      expect(deps[1].inferred).toEqual(['s1']);
      expect(deps[2].source).toBe('explicit-previous-mapping');
      expect(deps[2].inferred).toEqual(['s1']);
      expect(deps[3].source).toBe('explicit-previous-mapping');
      expect(deps[3].inferred).toEqual(['s1']);
    });
  });

  describe('adaptWorkflowToDAG', () => {
    it('preserves step identity and skillId without mutating the source workflow', () => {
      const before = JSON.stringify(FAN_OUT_WORKFLOW);
      const dag = adaptWorkflowToDAG(FAN_OUT_WORKFLOW);
      expect(JSON.stringify(FAN_OUT_WORKFLOW)).toBe(before);
      expect(dag.steps).toHaveLength(4);
      expect(dag.steps[0].skillId).toBe('k1');
      expect(dag.derivedFrom?.workflowId).toBe('test-fan-out');
    });

    it('records inference notes describing how dependencies were derived', () => {
      const dag = adaptWorkflowToDAG(FAN_OUT_WORKFLOW);
      expect(dag.derivedFrom?.inferenceNotes.some(n => n.includes('previous'))).toBe(true);
    });
  });

  describe('buildExecutionRounds', () => {
    it('returns one step per round for sequential chains', () => {
      const dag = adaptWorkflowToDAG(SEQUENTIAL_FALLBACK_WORKFLOW);
      const rounds = buildExecutionRounds(dag);
      expect(rounds).toHaveLength(3);
      rounds.forEach(r => expect(r.stepIds).toHaveLength(1));
    });

    it('groups fan-out steps into a single parallel round', () => {
      const dag = adaptWorkflowToDAG(FAN_OUT_WORKFLOW);
      const rounds = buildExecutionRounds(dag);
      expect(rounds).toHaveLength(2);
      expect(rounds[0].stepIds).toEqual(['s1']);
      expect(rounds[1].stepIds.sort()).toEqual(['s2', 's3', 's4']);
    });
  });

  describe('summarizeParallelism', () => {
    it('reports no speedup for purely sequential workflows', () => {
      const dag = adaptWorkflowToDAG(SEQUENTIAL_FALLBACK_WORKFLOW);
      const stats = summarizeParallelism(dag);
      expect(stats.totalSteps).toBe(3);
      expect(stats.rounds).toBe(3);
      expect(stats.maxParallel).toBe(1);
      expect(stats.speedupRatio).toBe(1);
    });

    it('reports speedup when steps fan out', () => {
      const dag = adaptWorkflowToDAG(FAN_OUT_WORKFLOW);
      const stats = summarizeParallelism(dag);
      expect(stats.totalSteps).toBe(4);
      expect(stats.rounds).toBe(2);
      expect(stats.maxParallel).toBe(3);
      expect(stats.speedupRatio).toBe(2);
    });
  });

  describe('against real PPC Master Weekly Workflow (the SSP pilot)', () => {
    const ppcWorkflow = WORKFLOWS['ppc-master-weekly-workflow'];

    it('is registered in the workflow catalog', () => {
      expect(ppcWorkflow).toBeDefined();
      expect(ppcWorkflow.steps.length).toBe(7);
    });

    it('compresses the 7-step linear chain into fewer rounds via inferred deps', () => {
      const dag = adaptWorkflowToDAG(ppcWorkflow);
      const stats = summarizeParallelism(dag);
      expect(stats.totalSteps).toBe(7);
      // Steps 2/3/4/5/6 all reference step-1-triage as their context source,
      // so they collapse into parallel rounds rather than running sequentially.
      expect(stats.rounds).toBeLessThan(7);
      expect(stats.maxParallel).toBeGreaterThan(1);
    });
  });
});
